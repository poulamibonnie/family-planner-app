export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { googleConnections } from '@/lib/schema';
import { sessionOptions, type SessionData } from '@/lib/session';
import { encrypt } from '@/lib/crypto';
import { exchangeCode, fetchPrimaryCalendarId } from '@/lib/google';
import { decodeOAuthState } from '@/lib/oauth-state';
import { generateId } from '@/lib/utils';

// Custom URL scheme the native iOS shell registers (Info.plist) so this callback
// can hand control back to the app after consent in the system browser.
const NATIVE_SCHEME = 'familyplanner://oauth';

function redirect(url: string): Response {
  // Built manually (not Response.redirect) so a custom-scheme Location like
  // familyplanner://… is emitted without URL-scheme validation getting in the way.
  return new Response(null, { status: 302, headers: { Location: url } });
}

function done(base: string, native: boolean, status: 'connected' | 'error'): string {
  return native
    ? `${NATIVE_SCHEME}?google=${status}`
    : `${base}/dashboard/self?google=${status}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Google echoes `state` on both success and error redirects, so we can learn
  // who/where even when the user denied consent.
  const state = searchParams.get('state');
  const decoded = state ? decodeOAuthState(state) : null;
  const native = decoded?.native ?? false;

  if (error || !code) {
    return redirect(done(base, native, 'error'));
  }

  try {
    // Identify the user from the signed state first (works without cookies, i.e.
    // in the native system browser); fall back to the session cookie for safety.
    let userId = decoded?.uid;
    if (!userId) {
      const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
      userId = session.userId;
    }
    if (!userId) {
      return native ? redirect(done(base, native, 'error')) : redirect(`${base}/login`);
    }

    const redirectUri = `${base}/api/google/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const accessToken = tokens.access_token;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const calendarId = await fetchPrimaryCalendarId(accessToken);

    const [existing] = await db
      .select({ id: googleConnections.id })
      .from(googleConnections)
      .where(eq(googleConnections.userId, userId));

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
        userId,
        accessToken: encrypt(accessToken),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt,
        calendarId,
        createdAt: new Date().toISOString(),
      });
    }

    return redirect(done(base, native, 'connected'));
  } catch {
    return redirect(done(base, native, 'error'));
  }
}
