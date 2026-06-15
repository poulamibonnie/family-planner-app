'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { calendarEvents } from '../schema';
import { generateId } from '../utils';
import type { CalendarEvent } from '../types';

export async function unshareEventFromFamily(eventId: string): Promise<void> {
  await db.delete(calendarEvents).where(eq(calendarEvents.sharedFromId, eventId));
  await db.update(calendarEvents).set({ sharedToFamilyAt: null }).where(eq(calendarEvents.id, eventId));
}

export async function shareEventToFamily(eventId: string, familyId: string): Promise<void> {
  const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId));
  if (!event) return;
  await db.insert(calendarEvents).values({
    id: generateId(),
    title: event.title,
    date: event.date,
    time: event.time,
    description: event.description,
    scope: 'family',
    userId: event.userId,
    familyId,
    notifyMinutesBefore: event.notifyMinutesBefore,
    notified: false,
    source: event.source ?? 'local',
    sharedFromId: event.id,
    createdAt: new Date().toISOString(),
  });
  await db
    .update(calendarEvents)
    .set({ sharedToFamilyAt: new Date().toISOString() })
    .where(eq(calendarEvents.id, eventId));
}

export async function addCalendarEvent(
  data: Omit<CalendarEvent, 'id' | 'createdAt' | 'notified' | 'source'>,
): Promise<CalendarEvent> {
  const event: CalendarEvent = {
    ...data,
    id: generateId(),
    notified: false,
    source: 'local',
    createdAt: new Date().toISOString(),
  };
  await db.insert(calendarEvents).values(event);
  return event;
}

export async function toggleCalendarEvent(id: string): Promise<void> {
  const [ev] = await db.select({ completed: calendarEvents.completed }).from(calendarEvents).where(eq(calendarEvents.id, id));
  if (!ev) return;
  await db.update(calendarEvents).set({ completed: !ev.completed }).where(eq(calendarEvents.id, id));
}

export async function markEventNotified(id: string): Promise<void> {
  await db.update(calendarEvents).set({ notified: true }).where(eq(calendarEvents.id, id));
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

export async function getSelfEvents(userId: string): Promise<CalendarEvent[]> {
  const rows = await db.select().from(calendarEvents).where(
    and(eq(calendarEvents.scope, 'self'), eq(calendarEvents.userId, userId)),
  );
  return rows as CalendarEvent[];
}

export async function getFamilyEvents(familyId: string): Promise<CalendarEvent[]> {
  const rows = await db.select().from(calendarEvents).where(
    and(eq(calendarEvents.scope, 'family'), eq(calendarEvents.familyId, familyId)),
  );
  return rows as CalendarEvent[];
}
