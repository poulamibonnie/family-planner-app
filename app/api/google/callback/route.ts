import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { googleConnections } from '@/lib/schema';
import { sessionOptions, type SessionData } from '@/lib/session';
import { encrypt } from '@/lib/crypto';
import { exchangeCode, fetchPrimaryCalendarId } from '@/lib/google';
import { generateId } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (error || !code) {
    return Response.redirect(`${base}/dashboard/self?google=error`);
  }

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.userId) {
      return Response.redirect(`${base}/login`);
    }

    const redirectUri = `${base}/api/google/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const accessToken = tokens.access_token;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const calendarId = await fetchPrimaryCalendarId(accessToken);

    const [existing] = await db
      .select({ id: googleConnections.id })
      .from(googleConnections)
      .where(eq(googleConnections.userId, session.userId));

    if (existing) {
      await db.update(googleConnections).set({
        accessToken: encrypt(accessToken),
        ...(tokens.refresh_token ? { refreshToken: encrypt(tokens.refresh_token) } : {}),
        expiresAt,
        calendarId,
      }).where(eq(googleConnections.id, existing.id));
    } else {
      await db.insert(googleConnections).values({
        id: generateId(),
        userId: session.userId,
        accessToken: encrypt(accessToken),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt,
        calendarId,
        createdAt: new Date().toISOString(),
      });
    }

    return Response.redirect(`${base}/dashboard/self?google=connected`);
  } catch {
    return Response.redirect(`${base}/dashboard/self?google=error`);
  }
}
