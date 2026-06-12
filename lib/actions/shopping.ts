'use server';

import { eq } from 'drizzle-orm';
import { db } from '../db';
import { shoppingItems } from '../schema';
import { generateId } from '../utils';
import type { ShoppingItem } from '../types';

export async function addShoppingItem(data: Omit<ShoppingItem, 'id' | 'createdAt'>): Promise<ShoppingItem> {
  const item: ShoppingItem = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.insert(shoppingItems).values(item);
  return item;
}

export async function toggleShoppingItem(id: string): Promise<void> {
  const [item] = await db.select({ completed: shoppingItems.completed }).from(shoppingItems).where(eq(shoppingItems.id, id));
  if (item) await db.update(shoppingItems).set({ completed: !item.completed }).where(eq(shoppingItems.id, id));
}

export async function deleteShoppingItem(id: string): Promise<void> {
  await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
}

export async function getFamilyShoppingItems(familyId: string): Promise<ShoppingItem[]> {
  const rows = await db.select().from(shoppingItems).where(eq(shoppingItems.familyId, familyId));
  return rows as ShoppingItem[];
}
