'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { calendarEvents } from '../schema';
import { generateId } from '../utils';
import type { CalendarEvent } from '../types';

export async function addCalendarEvent(
  data: Omit<CalendarEvent, 'id' | 'createdAt' | 'notified'>,
): Promise<CalendarEvent> {
  const event: CalendarEvent = {
    ...data,
    id: generateId(),
    notified: false,
    createdAt: new Date().toISOString(),
  };
  await db.insert(calendarEvents).values(event);
  return event;
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
