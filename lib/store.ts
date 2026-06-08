import type {
  User, Family, TodoItem, Goal, ShoppingItem, MealEntry, CalendarEvent, DayOfWeek, MealType,
} from './types';
import { generateId } from './utils';

const K = {
  USERS: 'fp_users',
  SESSION: 'fp_session',
  FAMILIES: 'fp_families',
  TODOS: 'fp_todos',
  GOALS: 'fp_goals',
  SHOPPING: 'fp_shopping',
  MEALS: 'fp_meals',
  EVENTS: 'fp_events',
};

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

function write<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Auth ──────────────────────────────────────────────────────────────
export function getUsers(): User[] { return read<User>(K.USERS); }

export function getUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function createUser(name: string, email: string, password: string): User {
  const user: User = { id: generateId(), name, email, password, createdAt: new Date().toISOString() };
  const users = getUsers();
  users.push(user);
  write(K.USERS, users);
  return user;
}

export function updateUser(id: string, updates: Partial<User>): void {
  const users = getUsers();
  const i = users.findIndex(u => u.id === id);
  if (i >= 0) { users[i] = { ...users[i], ...updates }; write(K.USERS, users); }
}

export function getSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(K.SESSION);
}

export function setSession(userId: string | null): void {
  if (typeof window === 'undefined') return;
  if (userId) localStorage.setItem(K.SESSION, userId);
  else localStorage.removeItem(K.SESSION);
}

export function getCurrentUser(): User | undefined {
  const id = getSession();
  return id ? getUserById(id) : undefined;
}

// ── Families ──────────────────────────────────────────────────────────
export function getFamilies(): Family[] { return read<Family>(K.FAMILIES); }

export function getFamilyById(id: string): Family | undefined {
  return getFamilies().find(f => f.id === id);
}

export function getFamilyByCode(code: string): Family | undefined {
  return getFamilies().find(f => f.code.toUpperCase() === code.toUpperCase());
}

function saveFamily(family: Family): void {
  const list = getFamilies();
  const i = list.findIndex(f => f.id === family.id);
  if (i >= 0) list[i] = family; else list.push(family);
  write(K.FAMILIES, list);
}

export function createFamily(name: string, userId: string): Family {
  const family: Family = {
    id: generateId(),
    name,
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    memberIds: [userId],
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
  saveFamily(family);
  return family;
}

export function joinFamily(code: string, userId: string): Family | null {
  const family = getFamilyByCode(code);
  if (!family) return null;
  if (!family.memberIds.includes(userId)) {
    family.memberIds = [...family.memberIds, userId];
    saveFamily(family);
  }
  return family;
}

export function leaveFamily(familyId: string, userId: string): void {
  const family = getFamilyById(familyId);
  if (!family) return;
  family.memberIds = family.memberIds.filter(id => id !== userId);
  saveFamily(family);
}

export function getFamilyMembers(familyId: string): User[] {
  const family = getFamilyById(familyId);
  if (!family) return [];
  return getUsers().filter(u => family.memberIds.includes(u.id));
}

// ── Todos ─────────────────────────────────────────────────────────────
export function getTodos(): TodoItem[] { return read<TodoItem>(K.TODOS); }

export function addTodo(data: Omit<TodoItem, 'id' | 'createdAt'>): TodoItem {
  const todo: TodoItem = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  const list = getTodos();
  list.push(todo);
  write(K.TODOS, list);
  return todo;
}

export function toggleTodo(id: string): void {
  const list = getTodos();
  const i = list.findIndex(t => t.id === id);
  if (i >= 0) { list[i].completed = !list[i].completed; write(K.TODOS, list); }
}

export function deleteTodo(id: string): void {
  write(K.TODOS, getTodos().filter(t => t.id !== id));
}

export function getSelfTodos(userId: string, date: string): TodoItem[] {
  return getTodos().filter(t => t.scope === 'self' && t.userId === userId && t.date === date);
}

export function getSelfAllTodos(userId: string): TodoItem[] {
  return getTodos().filter(t => t.scope === 'self' && t.userId === userId);
}

export function getFamilyTodos(familyId: string, date: string): TodoItem[] {
  return getTodos().filter(t => t.scope === 'family' && t.familyId === familyId && t.date === date);
}

export function getFamilyAllTodos(familyId: string): TodoItem[] {
  return getTodos().filter(t => t.scope === 'family' && t.familyId === familyId);
}

// ── Goals ─────────────────────────────────────────────────────────────
export function getGoals(): Goal[] { return read<Goal>(K.GOALS); }

export function addGoal(data: Omit<Goal, 'id' | 'createdAt'>): Goal {
  const goal: Goal = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  const list = getGoals();
  list.push(goal);
  write(K.GOALS, list);
  return goal;
}

export function toggleGoal(id: string): void {
  const list = getGoals();
  const i = list.findIndex(g => g.id === id);
  if (i >= 0) { list[i].completed = !list[i].completed; write(K.GOALS, list); }
}

export function deleteGoal(id: string): void {
  write(K.GOALS, getGoals().filter(g => g.id !== id));
}

export function getSelfGoals(userId: string, type: 'weekly' | 'yearly', week?: number, year?: number): Goal[] {
  return getGoals().filter(g =>
    g.scope === 'self' && g.userId === userId && g.type === type &&
    (type === 'yearly' ? g.year === year : g.weekNumber === week && g.year === year)
  );
}

export function getFamilyGoals(familyId: string, type: 'weekly' | 'yearly', week?: number, year?: number): Goal[] {
  return getGoals().filter(g =>
    g.scope === 'family' && g.familyId === familyId && g.type === type &&
    (type === 'yearly' ? g.year === year : g.weekNumber === week && g.year === year)
  );
}

// ── Shopping ──────────────────────────────────────────────────────────
export function getShoppingItems(): ShoppingItem[] { return read<ShoppingItem>(K.SHOPPING); }

export function addShoppingItem(data: Omit<ShoppingItem, 'id' | 'createdAt'>): ShoppingItem {
  const item: ShoppingItem = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  const list = getShoppingItems();
  list.push(item);
  write(K.SHOPPING, list);
  return item;
}

export function toggleShoppingItem(id: string): void {
  const list = getShoppingItems();
  const i = list.findIndex(s => s.id === id);
  if (i >= 0) { list[i].completed = !list[i].completed; write(K.SHOPPING, list); }
}

export function deleteShoppingItem(id: string): void {
  write(K.SHOPPING, getShoppingItems().filter(s => s.id !== id));
}

export function getFamilyShoppingItems(familyId: string): ShoppingItem[] {
  return getShoppingItems().filter(s => s.familyId === familyId);
}

// ── Meals ─────────────────────────────────────────────────────────────
export function getMeals(): MealEntry[] { return read<MealEntry>(K.MEALS); }

export function setMeal(familyId: string, day: DayOfWeek, mealType: MealType, meal: string, week: number, year: number): void {
  const list = getMeals();
  const i = list.findIndex(m =>
    m.familyId === familyId && m.day === day && m.mealType === mealType && m.weekNumber === week && m.year === year
  );
  if (i >= 0) {
    if (meal.trim()) list[i].meal = meal;
    else list.splice(i, 1);
  } else if (meal.trim()) {
    list.push({ id: generateId(), day, mealType, meal, weekNumber: week, year, familyId });
  }
  write(K.MEALS, list);
}

export function getFamilyMeals(familyId: string, week: number, year: number): MealEntry[] {
  return getMeals().filter(m => m.familyId === familyId && m.weekNumber === week && m.year === year);
}

// ── Calendar Events ───────────────────────────────────────────────────
export function getCalendarEvents(): CalendarEvent[] { return read<CalendarEvent>(K.EVENTS); }

export function addCalendarEvent(data: Omit<CalendarEvent, 'id' | 'createdAt' | 'notified'>): CalendarEvent {
  const event: CalendarEvent = { ...data, id: generateId(), notified: false, createdAt: new Date().toISOString() };
  const list = getCalendarEvents();
  list.push(event);
  write(K.EVENTS, list);
  return event;
}

export function markEventNotified(id: string): void {
  const list = getCalendarEvents();
  const i = list.findIndex(e => e.id === id);
  if (i >= 0) { list[i].notified = true; write(K.EVENTS, list); }
}

export function deleteCalendarEvent(id: string): void {
  write(K.EVENTS, getCalendarEvents().filter(e => e.id !== id));
}

export function getSelfEvents(userId: string): CalendarEvent[] {
  return getCalendarEvents().filter(e => e.scope === 'self' && e.userId === userId);
}

export function getFamilyEvents(familyId: string): CalendarEvent[] {
  return getCalendarEvents().filter(e => e.scope === 'family' && e.familyId === familyId);
}
