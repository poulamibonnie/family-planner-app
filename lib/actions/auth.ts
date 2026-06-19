'use server';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { db } from '../db';
import { users } from '../schema';
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
