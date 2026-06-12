import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  email:     text('email').notNull().unique(),
  password:  text('password').notNull(),
  familyId:  text('family_id'),
  createdAt: text('created_at').notNull(),
});

export const families = sqliteTable('families', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  code:      text('code').notNull().unique(),
  memberIds: text('member_ids').notNull(), // JSON array
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
});

export const todos = sqliteTable('todos', {
  id:        text('id').primaryKey(),
  text:      text('text').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  date:      text('date').notNull(),
  userId:    text('user_id').notNull(),
  scope:     text('scope', { enum: ['self', 'family'] }).notNull(),
  familyId:  text('family_id'),
  createdAt: text('created_at').notNull(),
});

export const goals = sqliteTable('goals', {
  id:         text('id').primaryKey(),
  text:       text('text').notNull(),
  completed:  integer('completed', { mode: 'boolean' }).notNull().default(false),
  type:       text('type', { enum: ['weekly', 'yearly'] }).notNull(),
  weekNumber: integer('week_number'),
  year:       integer('year').notNull(),
  day:        text('day'),
  userId:     text('user_id').notNull(),
  scope:      text('scope', { enum: ['self', 'family'] }).notNull(),
  familyId:   text('family_id'),
  createdAt:  text('created_at').notNull(),
});

export const shoppingItems = sqliteTable('shopping_items', {
  id:          text('id').primaryKey(),
  text:        text('text').notNull(),
  quantity:    text('quantity').notNull(),
  completed:   integer('completed', { mode: 'boolean' }).notNull().default(false),
  addedBy:     text('added_by').notNull(),
  addedByName: text('added_by_name').notNull(),
  familyId:    text('family_id').notNull(),
  createdAt:   text('created_at').notNull(),
});

export const mealEntries = sqliteTable('meal_entries', {
  id:         text('id').primaryKey(),
  day:        text('day').notNull(),
  mealType:   text('meal_type').notNull(),
  meal:       text('meal').notNull(),
  weekNumber: integer('week_number').notNull(),
  year:       integer('year').notNull(),
  familyId:   text('family_id').notNull(),
});

export const calendarEvents = sqliteTable('calendar_events', {
  id:                  text('id').primaryKey(),
  title:               text('title').notNull(),
  date:                text('date').notNull(),
  time:                text('time').notNull(),
  description:         text('description').notNull(),
  scope:               text('scope', { enum: ['self', 'family'] }).notNull(),
  userId:              text('user_id').notNull(),
  familyId:            text('family_id'),
  notifyMinutesBefore: integer('notify_minutes_before').notNull(),
  notified:            integer('notified', { mode: 'boolean' }).notNull().default(false),
  reminderEmail:       text('reminder_email'),
  createdAt:           text('created_at').notNull(),
});
