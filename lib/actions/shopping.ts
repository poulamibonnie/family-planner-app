'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { shoppingItems, users } from '../schema';
import { generateId, getWeekNumber, getYear } from '../utils';
import { requireUserId, assertFamilyMember } from '../auth-guard';
import type { ShoppingItem } from '../types';

export async function addShoppingItem(data: Omit<ShoppingItem, 'id' | 'createdAt'>): Promise<ShoppingItem> {
  const userId = await requireUserId();
  await assertFamilyMember(data.familyId);
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  const item: ShoppingItem = {
    ...data,
    addedBy: userId,
    addedByName: user?.name ?? 'Unknown',
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.insert(shoppingItems).values(item);
  return item;
}

export async function toggleShoppingItem(id: string): Promise<void> {
  const [item] = await db
    .select({ familyId: shoppingItems.familyId, completed: shoppingItems.completed })
    .from(shoppingItems)
    .where(eq(shoppingItems.id, id));
  if (!item) return;
  await assertFamilyMember(item.familyId);
  await db.update(shoppingItems).set({ completed: !item.completed }).where(eq(shoppingItems.id, id));
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const [item] = await db
    .select({ familyId: shoppingItems.familyId })
    .from(shoppingItems)
    .where(eq(shoppingItems.id, id));
  if (!item) return;
  await assertFamilyMember(item.familyId);
  await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
}

export async function getFamilyShoppingItems(familyId: string): Promise<ShoppingItem[]> {
  await assertFamilyMember(familyId);
  const rows = await db.select().from(shoppingItems).where(eq(shoppingItems.familyId, familyId));
  return rows as ShoppingItem[];
}

export async function clearAllShoppingItems(familyId: string): Promise<void> {
  await assertFamilyMember(familyId);
  await db.delete(shoppingItems).where(eq(shoppingItems.familyId, familyId));
}

export async function clearCompletedShoppingItems(familyId: string): Promise<void> {
  await assertFamilyMember(familyId);
  await db.delete(shoppingItems).where(
    and(eq(shoppingItems.familyId, familyId), eq(shoppingItems.completed, true))
  );
}

export async function sendShoppingListEmail(
  toEmails: string[],
  pendingItems: Pick<ShoppingItem, 'text' | 'quantity'>[],
  familyName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUserId();

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { ok: false, error: 'Email service not configured.' };

  const week = getWeekNumber();
  const year = getYear();
  const subject = `🛒 Shopping List · Week ${week} · ${year}`;
  const count = pendingItems.length;
  const separator = '──────────────────';
  const lines = pendingItems.map((i, idx) => `    ${idx + 1}. ${i.text}${i.quantity ? ` (${i.quantity})` : ''}`).join('\n');
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const textContent = `Hi ${familyName},\n\nHere's your shopping list for this week.\n\nItems (${count})\n${separator}\n${lines}\n${separator}\n\nGenerated on ${date}\n\nFamily Planner\nHelping families stay organized`;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Family Planner', email: 'familyplanner.notify@gmail.com' },
        to: toEmails.map(email => ({ email })),
        subject,
        textContent,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as { message?: string }).message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to send email.' };
  }
}
