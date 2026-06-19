'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { goals } from '../schema';
import { generateId } from '../utils';
import { requireUserId, assertFamilyMember, assertOwnership } from '../auth-guard';
import type { Goal } from '../types';

export async function shareGoalToFamily(goalId: string, familyId: string): Promise<void> {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!goal) return;
  await assertOwnership(goal);
  await assertFamilyMember(familyId);
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
  const [goal] = await db
    .select({ userId: goals.userId, scope: goals.scope, familyId: goals.familyId })
    .from(goals)
    .where(eq(goals.id, goalId));
  if (!goal) return;
  await assertOwnership(goal);
  await db.delete(goals).where(eq(goals.sharedFromId, goalId));
  await db.update(goals).set({ sharedToFamilyAt: null }).where(eq(goals.id, goalId));
}

export async function addGoal(data: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
  const userId = await requireUserId();
  if (data.scope === 'family' && data.familyId) {
    await assertFamilyMember(data.familyId);
  }
  const goal: Goal = { ...data, userId, id: generateId(), createdAt: new Date().toISOString() };
  await db.insert(goals).values(goal);
  return goal;
}

export async function toggleGoal(id: string): Promise<void> {
  const [goal] = await db
    .select({ userId: goals.userId, scope: goals.scope, familyId: goals.familyId, completed: goals.completed })
    .from(goals)
    .where(eq(goals.id, id));
  if (!goal) return;
  await assertOwnership(goal);
  await db.update(goals).set({ completed: !goal.completed }).where(eq(goals.id, id));
}

export async function deleteGoal(id: string): Promise<void> {
  const [goal] = await db
    .select({ userId: goals.userId, scope: goals.scope, familyId: goals.familyId })
    .from(goals)
    .where(eq(goals.id, id));
  if (!goal) return;
  await assertOwnership(goal);
  await db.delete(goals).where(eq(goals.id, id));
}

// _userId kept for signature stability; session identity is used instead.
export async function getSelfGoals(
  _userId: string,
  type: 'weekly' | 'yearly',
  week?: number,
  year?: number,
): Promise<Goal[]> {
  const userId = await requireUserId();
  const rows = await db.select().from(goals).where(
    type === 'yearly'
      ? and(eq(goals.scope, 'self'), eq(goals.userId, userId), eq(goals.type, 'yearly'), eq(goals.year, year!))
      : and(eq(goals.scope, 'self'), eq(goals.userId, userId), eq(goals.type, 'weekly'), eq(goals.weekNumber, week!), eq(goals.year, year!)),
  );
  return rows as Goal[];
}

export async function getSelfAllGoals(_userId: string, type: 'weekly' | 'yearly'): Promise<Goal[]> {
  const userId = await requireUserId();
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
  await assertFamilyMember(familyId);
  const rows = await db.select().from(goals).where(
    type === 'yearly'
      ? and(eq(goals.scope, 'family'), eq(goals.familyId, familyId), eq(goals.type, 'yearly'), eq(goals.year, year!))
      : and(eq(goals.scope, 'family'), eq(goals.familyId, familyId), eq(goals.type, 'weekly'), eq(goals.weekNumber, week!), eq(goals.year, year!)),
  );
  return rows as Goal[];
}

export async function getFamilyAllGoals(familyId: string, type: 'weekly' | 'yearly'): Promise<Goal[]> {
  await assertFamilyMember(familyId);
  const rows = await db.select().from(goals).where(
    and(eq(goals.scope, 'family'), eq(goals.familyId, familyId), eq(goals.type, type)),
  );
  return rows as Goal[];
}
