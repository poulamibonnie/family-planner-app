'use server';

import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { families, users } from '../schema';
import { generateId } from '../utils';
import { requireUserId, assertFamilyMember } from '../auth-guard';
import type { Family, User } from '../types';

function toFamily(row: typeof families.$inferSelect): Family {
  return { ...row, memberIds: JSON.parse(row.memberIds) };
}

// Private helper — no auth check; used internally before membership is established.
async function fetchFamilyByIdInternal(id: string): Promise<Family | null> {
  const [row] = await db.select().from(families).where(eq(families.id, id));
  return row ? toFamily(row) : null;
}

export async function getFamilyById(id: string): Promise<Family | null> {
  await assertFamilyMember(id);
  const [row] = await db.select().from(families).where(eq(families.id, id));
  return row ? toFamily(row) : null;
}

export async function getFamilyByCode(code: string): Promise<Family | null> {
  const [row] = await db.select().from(families).where(eq(families.code, code.toUpperCase()));
  return row ? toFamily(row) : null;
}

// _userId kept for signature stability; session identity is used instead.
export async function createFamily(name: string, _userId: string): Promise<Family> {
  const userId = await requireUserId();
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

export async function joinFamily(code: string, _userId: string): Promise<Family | null> {
  const userId = await requireUserId();
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

export async function leaveFamily(familyId: string, _userId: string): Promise<void> {
  const userId = await requireUserId();
  const family = await fetchFamilyByIdInternal(familyId);
  if (!family) return;
  const memberIds = family.memberIds.filter(id => id !== userId);
  await db.update(families).set({ memberIds: JSON.stringify(memberIds) }).where(eq(families.id, familyId));
}

export async function getFamilyMembers(familyId: string): Promise<User[]> {
  await assertFamilyMember(familyId);
  const family = await fetchFamilyByIdInternal(familyId);
  if (!family || family.memberIds.length === 0) return [];
  const rows = await db
    .select({
      id:        users.id,
      name:      users.name,
      email:     users.email,
      familyId:  users.familyId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(inArray(users.id, family.memberIds));
  return rows as User[];
}

export async function updateFamilyPhoto(familyId: string, photoUrl: string | null): Promise<void> {
  await assertFamilyMember(familyId);
  await db.update(families).set({ photoUrl }).where(eq(families.id, familyId));
}

export async function updateFamilyEmergencyContacts(familyId: string, contacts: string): Promise<void> {
  await assertFamilyMember(familyId);
  await db.update(families).set({ emergencyContacts: contacts }).where(eq(families.id, familyId));
}

// _id kept for signature stability; restricted to the session user's own row.
export async function updateUser(_id: string, updates: { familyId?: string | null; name?: string }): Promise<void> {
  const userId = await requireUserId();
  const set: Partial<{ familyId: string | null; name: string }> = {};
  if ('familyId' in updates) set.familyId = updates.familyId ?? null;
  if (updates.name) set.name = updates.name;
  if (Object.keys(set).length > 0) {
    await db.update(users).set(set).where(eq(users.id, userId));
  }
}
