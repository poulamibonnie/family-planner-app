'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentUser, getSelfTodos, addTodo, toggleTodo, deleteTodo,
  getSelfGoals, addGoal, toggleGoal, deleteGoal, getSelfEvents,
} from '@/lib/store';
import type { User, TodoItem, Goal, CalendarEvent } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, formatDisplayDate } from '@/lib/utils';
import TodoList from '@/components/TodoList';
import GoalList from '@/components/GoalList';
import CalendarEvents from '@/components/CalendarEvents';

type Tab = 'today' | 'weekly' | 'yearly' | 'calendar';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'today',    label: 'Today',        emoji: '🗒️' },
  { key: 'weekly',   label: 'Weekly Goals', emoji: '🌸' },
  { key: 'yearly',   label: 'Yearly Goals', emoji: '⛩️' },
  { key: 'calendar', label: 'Calendar',     emoji: '📅' },
];

export default function SelfPage() {
  const [tab, setTab] = useState<Tab>('today');
  const [user, setUser] = useState<User | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const today = todayISO();
  const week = getWeekNumber();
  const year = getYear();

  const load = useCallback(() => {
    const u = getCurrentUser();
    if (!u) return;
    setUser(u);
    setTodos(getSelfTodos(u.id, today));
    setWeeklyGoals(getSelfGoals(u.id, 'weekly', week, year));
    setYearlyGoals(getSelfGoals(u.id, 'yearly', undefined, year));
    setEvents(getSelfEvents(u.id));
  }, [today, week, year]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const todayDone  = todos.filter(t => t.completed).length;
  const weekDone   = weeklyGoals.filter(g => g.completed).length;
  const yearDone   = yearlyGoals.filter(g => g.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {greeting()}, {user.name.split(' ')[0]} 🌸
          </h1>
          <p className="mt-1 text-sm text-stone-500">{formatDisplayDate(today)}</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <StatBadge label="Today" value={`${todayDone}/${todos.length}`}      color="red" />
          <StatBadge label="Week"  value={`${weekDone}/${weeklyGoals.length}`} color="rose" />
          <StatBadge label="Year"  value={`${yearDone}/${yearlyGoals.length}`} color="amber" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 min-w-max items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        {tab === 'today' && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-800">Today&apos;s Tasks</h2>
              <span className="rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-medium text-red-700">Week {week}</span>
            </div>
            <TodoList
              items={todos}
              onAdd={text => { addTodo({ text, completed: false, date: today, userId: user.id, scope: 'self' }); load(); }}
              onToggle={id => { toggleTodo(id); load(); }}
              onDelete={id => { deleteTodo(id); load(); }}
              placeholder="Add a task for today…"
            />
          </div>
        )}

        {tab === 'weekly' && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-800">Weekly Goals</h2>
              <span className="rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-medium text-rose-700">Week {week} · {year}</span>
            </div>
            <GoalList
              items={weeklyGoals} title="This week's goals" accentColor="rose"
              onAdd={text => { addGoal({ text, completed: false, type: 'weekly', weekNumber: week, year, userId: user.id, scope: 'self' }); load(); }}
              onToggle={id => { toggleGoal(id); load(); }}
              onDelete={id => { deleteGoal(id); load(); }}
            />
          </div>
        )}

        {tab === 'yearly' && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-800">Yearly Goals</h2>
              <span className="rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-medium text-amber-700">{year}</span>
            </div>
            <GoalList
              items={yearlyGoals} title={`Goals for ${year}`} accentColor="amber"
              onAdd={text => { addGoal({ text, completed: false, type: 'yearly', year, userId: user.id, scope: 'self' }); load(); }}
              onToggle={id => { toggleGoal(id); load(); }}
              onDelete={id => { deleteGoal(id); load(); }}
            />
          </div>
        )}

        {tab === 'calendar' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">My Calendar</h2>
              <p className="text-sm text-stone-500 mt-1">Personal events with browser notifications</p>
            </div>
            <CalendarEvents events={events} userId={user.id} scope="self" onRefresh={load} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: 'red' | 'rose' | 'amber' }) {
  const cls = { red: 'bg-red-50 text-red-800 border-red-100', rose: 'bg-rose-50 text-rose-800 border-rose-100', amber: 'bg-amber-50 text-amber-800 border-amber-100' }[color];
  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${cls}`}>
      <p className="text-xs font-bold">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
