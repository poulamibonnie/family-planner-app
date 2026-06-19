'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { mealEntries } from '../schema';
import { generateId } from '../utils';
import { assertFamilyMember } from '../auth-guard';
import type { MealEntry, DayOfWeek, MealType } from '../types';

export async function setMeal(
  familyId: string,
  day: DayOfWeek,
  mealType: MealType,
  meal: string,
  week: number,
  year: number,
): Promise<void> {
  await assertFamilyMember(familyId);

  const [existing] = await db.select().from(mealEntries).where(
    and(
      eq(mealEntries.familyId, familyId),
      eq(mealEntries.day, day),
      eq(mealEntries.mealType, mealType),
      eq(mealEntries.weekNumber, week),
      eq(mealEntries.year, year),
    ),
  );

  if (existing) {
    if (meal.trim()) {
      await db.update(mealEntries).set({ meal }).where(eq(mealEntries.id, existing.id));
    } else {
      await db.delete(mealEntries).where(eq(mealEntries.id, existing.id));
    }
  } else if (meal.trim()) {
    await db.insert(mealEntries).values({
      id: generateId(), day, mealType, meal, weekNumber: week, year, familyId,
    });
  }
}

export async function getFamilyMeals(familyId: string, week: number, year: number): Promise<MealEntry[]> {
  await assertFamilyMember(familyId);
  const rows = await db.select().from(mealEntries).where(
    and(eq(mealEntries.familyId, familyId), eq(mealEntries.weekNumber, week), eq(mealEntries.year, year)),
  );
  return rows as MealEntry[];
}
