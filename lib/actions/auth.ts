'use server';

import { randomBytes, createHash } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { getIronSession } from 'iron-session';
import { db } from '../db';
import { users, passwordResetTokens } from '../schema';
import { sessionOptions, type SessionData } from '../session';
import { generateId } from '../utils';
import { hashPassword, verifyPassword } from '../password';
import type { User } from '../types';

export async function login(
  email: string,
  password: string,
): Promise<{ error: string } | { success: true }> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (!user) return { error: 'Invalid email or password.' };

  const ok = await verifyPassword(password, user.password);
  if (!ok) return { error: 'Invalid email or password.' };

  // Upgrade legacy plaintext rows to scrypt on first successful login.
  if (!user.password.startsWith('scrypt$')) {
    await db.update(users)
      .set({ password: await hashPassword(password) })
      .where(eq(users.id, user.id));
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.userId = user.id;
  await session.save();
  return { success: true };
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<{ error: string } | { success: true }> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
  if (existing.length > 0) return { error: 'An account with this email already exists.' };

  const id = generateId();
  await db.insert(users).values({
    id,
    name: name.trim(),
    email: email.toLowerCase(),
    password: await hashPassword(password),
    createdAt: new Date().toISOString(),
  });

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.userId = id;
  await session.save();
  return { success: true };
}

export async function logout(): Promise<void> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.destroy();
}

export async function requestPasswordReset(
  email: string,
): Promise<{ status: 'sent' | 'not_found' | 'send_error'; error?: string }> {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  if (!user) return { status: 'not_found' };

  // Invalidate any existing unused tokens for this user
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.used, false)));

  const rawToken  = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await db.insert(passwordResetTokens).values({
    id: generateId(),
    userId:    user.id,
    tokenHash,
    expiresAt,
    used:      false,
    createdAt: new Date().toISOString(),
  });

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { status: 'send_error', error: 'Email service is not configured.' };

  const reqHeaders = await headers();
  const host       = reqHeaders.get('host') ?? 'localhost:3000';
  const proto      = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const appUrl     = `${proto}://${host}`;
  const resetLink  = `${appUrl}/reset-password?token=${rawToken}`;
  const text      = `Hi ${user.name},\n\nWe received a request to reset your Family Planner password.\n\nClick the link below to set a new password (valid for 1 hour):\n\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.\n\nFamily Planner`;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: 'Family Planner', email: 'familyplanner.notify@gmail.com' },
        to:          [{ email: user.email }],
        subject:     'Reset your Family Planner password',
        textContent: text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[password-reset] Brevo error', res.status, body);
      return { status: 'send_error', error: 'Failed to send the reset email. Please try again.' };
    }
    return { status: 'sent' };
  } catch (err) {
    console.error('[password-reset] fetch error', err);
    return { status: 'send_error', error: 'Failed to send the reset email. Please try again.' };
  }
}

export async function resetPassword(
  token:       string,
  newPassword: string,
): Promise<{ error?: string }> {
  if (!token || newPassword.length < 6) return { error: 'Invalid request.' };

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now       = new Date().toISOString();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      eq(passwordResetTokens.used, false),
      gt(passwordResetTokens.expiresAt, now),
    ));

  if (!record) return { error: 'This reset link is invalid or has expired. Please request a new one.' };

  await db.update(users)
    .set({ password: await hashPassword(newPassword) })
    .where(eq(users.id, record.userId));

  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, record.id));

  return {};
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) return null;
  const [user] = await db
    .select({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      familyId:  users.familyId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId));
  return (user as User) ?? null;
}
