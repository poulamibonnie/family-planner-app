'use server';

import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { db } from '../db';
import { googleConnections, calendarEvents } from '../schema';
import { sessionOptions, type SessionData } from '../session';
import { encrypt, decrypt } from '../crypto';
import {
  buildAuthUrl,
  refreshAccessToken,
  fetchCalendarEvents,
} from '../google';
import { generateId } from '../utils';
import type { GoogleConnection } from '../types';

function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/api/google/callback`;
}

export async function getGoogleAuthUrl(): Promise<string> {
  return buildAuthUrl(redirectUri());
}

export async function getGoogleConnection(): Promise<GoogleConnection | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) return null;
  const [conn] = await db
    .select({ calendarId: googleConnections.calendarId })
    .from(googleConnections)
    .where(eq(googleConnections.userId, session.userId));
  return conn ? { connected: true, calendarId: conn.calendarId } : null;
}

export async function disconnectGoogle(): Promise<void> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) return;
  await db.delete(googleConnections).where(eq(googleConnections.userId, session.userId));
  await db
    .delete(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, session.userId),
        eq(calendarEvents.source, 'google'),
      ),
    );
}

export async function syncGoogleCalendar(): Promise<{ synced: number } | { error: string }> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) return { error: 'Not authenticated' };

  const [conn] = await db
    .select()
    .from(googleConnections)
    .where(eq(googleConnections.userId, session.userId));
  if (!conn) return { error: 'No Google connection. Please connect first.' };

  let accessToken = decrypt(conn.accessToken);

  // Refresh access token if it expires within 60 seconds
  if (conn.refreshToken && new Date(conn.expiresAt).getTime() < Date.now() + 60_000) {
    try {
      const refreshed = await refreshAccessToken(decrypt(conn.refreshToken));
      accessToken = refreshed.access_token;
      await db
        .update(googleConnections)
        .set({
          accessToken: encrypt(accessToken),
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .where(eq(googleConnections.id, conn.id));
    } catch {
      return { error: 'Failed to refresh Google token. Please reconnect.' };
    }
  }

  // Fetch past 30 days + next 90 days
  const timeMin = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 86_400_000).toISOString();

  let events: Awaited<ReturnType<typeof fetchCalendarEvents>>;
  try {
    events = await fetchCalendarEvents(accessToken, conn.calendarId, timeMin, timeMax);
  } catch {
    return { error: 'Failed to fetch events. Please reconnect Google Calendar.' };
  }

  for (const ge of events) {
    const [existing] = await db
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.googleEventId, ge.googleEventId),
          eq(calendarEvents.userId, session.userId),
        ),
      );

    if (existing) {
      await db
        .update(calendarEvents)
        .set({ title: ge.title, date: ge.date, time: ge.time, description: ge.description })
        .where(eq(calendarEvents.id, existing.id));
    } else {
      await db.insert(calendarEvents).values({
        id: generateId(),
        title: ge.title,
        date: ge.date,
        time: ge.time,
        description: ge.description,
        scope: 'self',
        userId: session.userId,
        notifyMinutesBefore: 15,
        notified: false,
        source: 'google',
        googleEventId: ge.googleEventId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { synced: events.length };
}
