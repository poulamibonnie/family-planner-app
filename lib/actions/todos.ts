'use server';

import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { todos } from '../schema';
import { generateId } from '../utils';
import type { TodoItem } from '../types';

export async function shareTodoToFamily(todoId: string, familyId: string): Promise<void> {
  const [todo] = await db.select().from(todos).where(eq(todos.id, todoId));
  if (!todo) return;
  await db.insert(todos).values({
    id: generateId(),
    text: todo.text,
    completed: false,
    date: todo.date,
    userId: todo.userId,
    scope: 'family',
    familyId,
    sharedFromId: todo.id,
    createdAt: new Date().toISOString(),
  });
  await db.update(todos).set({ sharedToFamilyAt: new Date().toISOString() }).where(eq(todos.id, todoId));
}

export async function unshareTodoFromFamily(todoId: string): Promise<void> {
  await db.delete(todos).where(eq(todos.sharedFromId, todoId));
  await db.update(todos).set({ sharedToFamilyAt: null }).where(eq(todos.id, todoId));
}

export async function addTodo(data: Omit<TodoItem, 'id' | 'createdAt'>): Promise<TodoItem> {
  const todo: TodoItem = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.insert(todos).values(todo);
  return todo;
}

export async function toggleTodo(id: string): Promise<void> {
  const [todo] = await db.select({ completed: todos.completed }).from(todos).where(eq(todos.id, id));
  if (todo) await db.update(todos).set({ completed: !todo.completed }).where(eq(todos.id, id));
}

export async function deleteTodo(id: string): Promise<void> {
  await db.delete(todos).where(eq(todos.id, id));
}

export async function getSelfTodos(userId: string, date: string): Promise<TodoItem[]> {
  const rows = await db.select().from(todos).where(
    and(eq(todos.scope, 'self'), eq(todos.userId, userId), eq(todos.date, date)),
  );
  return rows as TodoItem[];
}

export async function getSelfAllTodos(userId: string): Promise<TodoItem[]> {
  const rows = await db.select().from(todos).where(
    and(eq(todos.scope, 'self'), eq(todos.userId, userId)),
  );
  return rows as TodoItem[];
}

export async function getFamilyTodos(familyId: string, date: string): Promise<TodoItem[]> {
  const rows = await db.select().from(todos).where(
    and(eq(todos.scope, 'family'), eq(todos.familyId, familyId), eq(todos.date, date)),
  );
  return rows as TodoItem[];
}

export async function getFamilyAllTodos(familyId: string): Promise<TodoItem[]> {
  const rows = await db.select().from(todos).where(
    and(eq(todos.scope, 'family'), eq(todos.familyId, familyId)),
  );
  return rows as TodoItem[];
}
