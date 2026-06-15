'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth';
import { getSelfTodos, getSelfAllTodos, addTodo, toggleTodo, deleteTodo } from '@/lib/actions/todos';
import { getSelfGoals, getSelfAllGoals, addGoal, toggleGoal, deleteGoal } from '@/lib/actions/goals';
import { getSelfEvents } from '@/lib/actions/events';
import { getGoogleConnection } from '@/lib/actions/google';
import type { User, TodoItem, Goal, CalendarEvent, GoogleConnection } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, formatDisplayDate } from '@/lib/utils';
import TodoList from '@/components/TodoList';
import GoalList from '@/components/GoalList';
import WeeklyBoard from '@/components/WeeklyBoard';
import Reminders from '@/components/Reminders';
import ProgressStats from '@/components/ProgressStats';
import GoogleCalendarSync from '@/components/GoogleCalendarSync';

type Tab = 'today' | 'weekly' | 'yearly' | 'reminders' | 'progress' | 'google';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'today',     label: 'Today',        emoji: '🗒️' },
  { key: 'weekly',    label: 'Weekly Goals', emoji: '🌸' },
  { key: 'yearly',    label: 'Yearly Goals', emoji: '⛩️' },
  { key: 'reminders', label: 'Reminders',    emoji: '🔔' },
  { key: 'progress',  label: 'Progress',     emoji: '📊' },
  { key: 'google',    label: 'Google Cal',   emoji: '📅' },
];

export default function SelfPage() {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get('google');

  const [tab, setTab] = useState<Tab>('today');
  const [user, setUser] = useState<User | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [allTodos, setAllTodos] = useState<TodoItem[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [allWeeklyGoals, setAllWeeklyGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleConn, setGoogleConn] = useState<GoogleConnection | null>(null);
  const [googleBanner, setGoogleBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const today = todayISO();
  const week  = getWeekNumber();
  const year  = getYear();

  const load = useCallback(async () => {
    const u = await getCurrentUser();
    if (!u) return;
    setUser(u);
    const [todayTodos, allTodosData, weekly, allWeekly, yearly, eventsData, connData] = await Promise.all([
      getSelfTodos(u.id, today),
      getSelfAllTodos(u.id),
      getSelfGoals(u.id, 'weekly', week, year),
      getSelfAllGoals(u.id, 'weekly'),
      getSelfGoals(u.id, 'yearly', undefined, year),
      getSelfEvents(u.id),
      getGoogleConnection(),
    ]);
    setTodos(todayTodos);
    setAllTodos(allTodosData);
    setWeeklyGoals(weekly);
    setAllWeeklyGoals(allWeekly);
    setYearlyGoals(yearly);
    setEvents(eventsData);
    setGoogleConn(connData);
  }, [today, week, year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (googleStatus === 'connected') {
      setGoogleBanner({ type: 'success', text: 'Google Calendar connected! Click Sync Now to import your events.' });
      setTab('google');
      const t = setTimeout(() => setGoogleBanner(null), 6000);
      return () => clearTimeout(t);
    }
    if (googleStatus === 'error') {
      setGoogleBanner({ type: 'error', text: 'Google Calendar connection failed. Please try again.' });
      setTab('google');
      const t = setTimeout(() => setGoogleBanner(null), 6000);
      return () => clearTimeout(t);
    }
  }, [googleStatus]);

  if (!user) return null;

  const todayDone   = todos.filter(t => t.completed).length;
  const weekDone    = weeklyGoals.filter(g => g.completed).length;
  const yearDone    = yearlyGoals.filter(g => g.completed).length;
  const googleEvents = events.filter(e => e.source === 'google');
  const localEvents  = events.filter(e => e.source !== 'google');

  return (
    <div className="space-y-6">
      {googleBanner && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
          googleBanner.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          <span>{googleBanner.type === 'success' ? '✅' : '⚠️'}</span>
          {googleBanner.text}
        </div>
      )}

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
            className={`flex flex-1 min-w-max items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
            {t.key === 'google' && googleConn?.connected && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
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
              onAdd={async text => { await addTodo({ text, completed: false, date: today, userId: user.id, scope: 'self' }); load(); }}
              onToggle={async id => { await toggleTodo(id); load(); }}
              onDelete={async id => { await deleteTodo(id); load(); }}
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
            <WeeklyBoard
              goals={weeklyGoals} weekNumber={week} year={year}
              onAdd={async (text, day) => { await addGoal({ text, completed: false, type: 'weekly', weekNumber: week, year, day, userId: user.id, scope: 'self' }); load(); }}
              onToggle={async id => { await toggleGoal(id); load(); }}
              onDelete={async id => { await deleteGoal(id); load(); }}
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
              onAdd={async text => { await addGoal({ text, completed: false, type: 'yearly', year, userId: user.id, scope: 'self' }); load(); }}
              onToggle={async id => { await toggleGoal(id); load(); }}
              onDelete={async id => { await deleteGoal(id); load(); }}
            />
          </div>
        )}

        {tab === 'reminders' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">Reminders</h2>
              <p className="text-sm text-stone-500 mt-1">Set reminders with browser notifications and email alerts</p>
            </div>
            <Reminders events={localEvents} userId={user.id} scope="self" onRefresh={load} />
          </div>
        )}

        {tab === 'progress' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">Progress</h2>
              <p className="text-sm text-stone-500 mt-1">Track completed and pending tasks across all time periods</p>
            </div>
            <ProgressStats todos={allTodos} weeklyGoals={allWeeklyGoals} yearlyGoals={yearlyGoals} />
          </div>
        )}

        {tab === 'google' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">Google Calendar</h2>
              <p className="text-sm text-stone-500 mt-1">
                Import events from Google Calendar. Share individual events with your family on request.
              </p>
            </div>
            <GoogleCalendarSync
              connected={!!googleConn?.connected}
              calendarId={googleConn?.calendarId ?? null}
              events={googleEvents}
              familyId={user.familyId}
              onRefresh={load}
            />
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
