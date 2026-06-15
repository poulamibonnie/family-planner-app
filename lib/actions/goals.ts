'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { goals } from '../schema';
import { generateId } from '../utils';
import type { Goal } from '../types';

export async function shareGoalToFamily(goalId: string, familyId: string): Promise<void> {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!goal) return;
  await db.insert(goals).values({
    id: generateId(),
    text: goal.text,
    completed: false,
    type: goal.type,
    weekNumber: goal.weekNumber ?? undefined,
    year: goal.year,
    day: goal.day ?? undefined,
    userId: goal.userId,
    scope: 'family',
    familyId,
    sharedFromId: goal.id,
    createdAt: new Date().toISOString(),
  });
  await db.update(goals).set({ sharedToFamilyAt: new Date().toISOString() }).where(eq(goals.id, goalId));
}

export async function unshareGoalFromFamily(goalId: string): Promise<void> {
  await db.delete(goals).where(eq(goals.sharedFromId, goalId));
  await db.update(goals).set({ sharedToFamilyAt: null }).where(eq(goals.id, goalId));
}

export async function addGoal(data: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
  const goal: Goal = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.insert(goals).values(goal);
  return goal;
}

export async function toggleGoal(id: string): Promise<void> {
  const [goal] = await db.select({ completed: goals.completed }).from(goals).where(eq(goals.id, id));
  if (goal) await db.update(goals).set({ completed: !goal.completed }).where(eq(goals.id, id));
}

export async function deleteGoal(id: string): Promise<void> {
  await db.delete(goals).where(eq(goals.id, id));
}

export async function getSelfGoals(
  userId: string,
  type: 'weekly' | 'yearly',
  week?: number,
  year?: number,
): Promise<Goal[]> {
  const rows = await db.select().from(goals).where(
    type === 'yearly'
      ? and(eq(goals.scope, 'self'), eq(goals.userId, userId), eq(goals.type, 'yearly'), eq(goals.year, year!))
      : and(eq(goals.scope, 'self'), eq(goals.userId, userId), eq(goals.type, 'weekly'), eq(goals.weekNumber, week!), eq(goals.year, year!)),
  );
  return rows as Goal[];
}

export async function getSelfAllGoals(userId: string, type: 'weekly' | 'yearly'): Promise<Goal[]> {
  const rows = await db.select().from(goals).where(
    and(eq(goals.scope, 'self'), eq(goals.userId, userId), eq(goals.type, type)),
  );
  return rows as Goal[];
}

export async function getFamilyGoals(
  familyId: string,
  type: 'weekly' | 'yearly',
  week?: number,
  year?: number,
): Promise<Goal[]> {
  const rows = await db.select().from(goals).where(
    type === 'yearly'
      ? and(eq(goals.scope, 'family'), eq(goals.familyId, familyId), eq(goals.type, 'yearly'), eq(goals.year, year!))
      : and(eq(goals.scope, 'family'), eq(goals.familyId, familyId), eq(goals.type, 'weekly'), eq(goals.weekNumber, week!), eq(goals.year, year!)),
  );
  return rows as Goal[];
}

export async function getFamilyAllGoals(familyId: string, type: 'weekly' | 'yearly'): Promise<Goal[]> {
  const rows = await db.select().from(goals).where(
    and(eq(goals.scope, 'family'), eq(goals.familyId, familyId), eq(goals.type, type)),
  );
  return rows as Goal[];
}
