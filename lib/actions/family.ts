'use server';

import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { families, users } from '../schema';
import { generateId } from '../utils';
import type { Family, User } from '../types';

function toFamily(row: typeof families.$inferSelect): Family {
  return { ...row, memberIds: JSON.parse(row.memberIds) };
}

export async function getFamilyById(id: string): Promise<Family | null> {
  const [row] = await db.select().from(families).where(eq(families.id, id));
  return row ? toFamily(row) : null;
}

export async function getFamilyByCode(code: string): Promise<Family | null> {
  const [row] = await db.select().from(families).where(eq(families.code, code.toUpperCase()));
  return row ? toFamily(row) : null;
}

export async function createFamily(name: string, userId: string): Promise<Family> {
  const family: Family = {
    id: generateId(),
    name,
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    memberIds: [userId],
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
  await db.insert(families).values({ ...family, memberIds: JSON.stringify(family.memberIds) });
  return family;
}

export async function joinFamily(code: string, userId: string): Promise<Family | null> {
  const family = await getFamilyByCode(code);
  if (!family) return null;
  if (!family.memberIds.includes(userId)) {
    family.memberIds = [...family.memberIds, userId];
    await db.update(families)
      .set({ memberIds: JSON.stringify(family.memberIds) })
      .where(eq(families.id, family.id));
  }
  return family;
}

export async function leaveFamily(familyId: string, userId: string): Promise<void> {
  const family = await getFamilyById(familyId);
  if (!family) return;
  const memberIds = family.memberIds.filter(id => id !== userId);
  await db.update(families).set({ memberIds: JSON.stringify(memberIds) }).where(eq(families.id, familyId));
}

export async function getFamilyMembers(familyId: string): Promise<User[]> {
  const family = await getFamilyById(familyId);
  if (!family || family.memberIds.length === 0) return [];
  const rows = await db.select().from(users).where(inArray(users.id, family.memberIds));
  return rows as User[];
}

export async function updateFamilyPhoto(familyId: string, photoUrl: string | null): Promise<void> {
  await db.update(families).set({ photoUrl }).where(eq(families.id, familyId));
}

export async function updateFamilyEmergencyContacts(familyId: string, contacts: string): Promise<void> {
  await db.update(families).set({ emergencyContacts: contacts }).where(eq(families.id, familyId));
}

export async function updateUser(id: string, updates: { familyId?: string | null; name?: string }): Promise<void> {
  const set: Partial<{ familyId: string | null; name: string }> = {};
  if ('familyId' in updates) set.familyId = updates.familyId ?? null;
  if (updates.name) set.name = updates.name;
  if (Object.keys(set).length > 0) {
    await db.update(users).set(set).where(eq(users.id, id));
  }
}
