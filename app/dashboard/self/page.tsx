'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, getSelfTodos, addTodo, toggleTodo, deleteTodo, getSelfGoals, addGoal, toggleGoal, deleteGoal, getSelfEvents, addCalendarEvent, deleteCalendarEvent, markEventNotified } from '@/lib/store';
import type { User, TodoItem, Goal, CalendarEvent } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, formatDisplayDate } from '@/lib/utils';
import TodoList from '@/components/TodoList';
import GoalList from '@/components/GoalList';
import CalendarEvents from '@/components/CalendarEvents';

type Tab = 'today' | 'weekly' | 'yearly' | 'calendar';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'today',
    label: "Today",
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
  {
    key: 'weekly',
    label: "Weekly Goals",
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
  {
    key: 'yearly',
    label: "Yearly Goals",
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    key: 'calendar',
    label: "Calendar",
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
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

  const weekDone = weeklyGoals.filter(g => g.completed).length;
  const yearDone = yearlyGoals.filter(g => g.completed).length;
  const todayDone = todos.filter(t => t.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good {greeting()}, {user.name.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">{formatDisplayDate(today)}</p>
        </div>
        {/* Quick stats */}
        <div className="hidden sm:flex gap-3">
          <StatBadge label="Today" value={`${todayDone}/${todos.length}`} color="indigo" />
          <StatBadge label="Week" value={`${weekDone}/${weeklyGoals.length}`} color="violet" />
          <StatBadge label="Year" value={`${yearDone}/${yearlyGoals.length}`} color="amber" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 min-w-max items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {tab === 'today' && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Today&apos;s Tasks</h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Week {week}</span>
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
              <h2 className="text-lg font-semibold text-slate-800">Weekly Goals</h2>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">Week {week} · {year}</span>
            </div>
            <GoalList
              items={weeklyGoals}
              title="This week's goals"
              accentColor="violet"
              onAdd={text => { addGoal({ text, completed: false, type: 'weekly', weekNumber: week, year, userId: user.id, scope: 'self' }); load(); }}
              onToggle={id => { toggleGoal(id); load(); }}
              onDelete={id => { deleteGoal(id); load(); }}
            />
          </div>
        )}

        {tab === 'yearly' && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Yearly Goals</h2>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{year}</span>
            </div>
            <GoalList
              items={yearlyGoals}
              title={`Goals for ${year}`}
              accentColor="amber"
              onAdd={text => { addGoal({ text, completed: false, type: 'yearly', year, userId: user.id, scope: 'self' }); load(); }}
              onToggle={id => { toggleGoal(id); load(); }}
              onDelete={id => { deleteGoal(id); load(); }}
            />
          </div>
        )}

        {tab === 'calendar' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800">My Calendar</h2>
              <p className="text-sm text-slate-500 mt-1">Personal events with browser notifications</p>
            </div>
            <CalendarEvents
              events={events}
              userId={user.id}
              scope="self"
              onRefresh={load}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: 'indigo' | 'violet' | 'amber' }) {
  const cls = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[color];
  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${cls}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
