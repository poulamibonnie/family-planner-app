export interface User {
  id: string;
  name: string;
  email: string;
  // password intentionally omitted — never sent to the client
  familyId?: string;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  photoUrl?: string | null;
  emergencyContacts?: string | null; // JSON-encoded EmergencyContact[]
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  userId: string;
  scope: 'self' | 'family';
  familyId?: string;
  sharedFromId?: string;
  sharedToFamilyAt?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
  type: 'weekly' | 'yearly';
  weekNumber?: number;
  year: number;
  day?: DayOfWeek;
  userId: string;
  scope: 'self' | 'family';
  familyId?: string;
  sharedFromId?: string;
  sharedToFamilyAt?: string;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  text: string;
  quantity: string;
  completed: boolean;
  addedBy: string;
  addedByName: string;
  familyId: string;
  createdAt: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface MealEntry {
  id: string;
  day: DayOfWeek;
  mealType: MealType;
  meal: string;
  weekNumber: number;
  year: number;
  familyId: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  scope: 'self' | 'family';
  userId: string;
  familyId?: string;
  completed?: boolean;
  notifyMinutesBefore: number;
  notified: boolean;
  reminderEmail?: string;
  source?: 'local' | 'google';
  googleEventId?: string;
  sharedFromId?: string;
  sharedToFamilyAt?: string;
  createdAt: string;
}

export interface GoogleConnection {
  connected: boolean;
  calendarId: string;
}
