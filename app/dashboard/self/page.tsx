'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth';
import { getSelfTodos, getSelfAllTodos, addTodo, toggleTodo, deleteTodo } from '@/lib/actions/todos';
import { getSelfGoals, getSelfAllGoals, addGoal, toggleGoal, deleteGoal } from '@/lib/actions/goals';
import { getSelfEvents, shareEventToFamily } from '@/lib/actions/events';
import { getGoogleConnection, getGoogleAuthUrl, syncGoogleCalendar, disconnectGoogle } from '@/lib/actions/google';
import type { User, TodoItem, Goal, CalendarEvent, GoogleConnection } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, formatDisplayDate, dateToDayOfWeek, getEndOfWeekISO, DAYS } from '@/lib/utils';
import TodoList from '@/components/TodoList';
import GoalList from '@/components/GoalList';
import WeeklyBoard from '@/components/WeeklyBoard';
import Reminders from '@/components/Reminders';
import ProgressStats from '@/components/ProgressStats';

type Tab = 'today' | 'weekly' | 'yearly' | 'reminders' | 'progress';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'today',     label: 'Today',        emoji: '🗒️' },
  { key: 'weekly',    label: 'Weekly Goals', emoji: '🌸' },
  { key: 'yearly',    label: 'Yearly Goals', emoji: '⛩️' },
  { key: 'reminders', label: 'Reminders',    emoji: '🔔' },
  { key: 'progress',  label: 'Progress',     emoji: '📊' },
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
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, startSync] = useTransition();

  const today      = todayISO();
  const week       = getWeekNumber();
  const year       = getYear();
  const endOfWeek  = getEndOfWeekISO();

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
      showBanner('success', 'Google Calendar connected! Click "Sync Google Cal" to import your events.');
    } else if (googleStatus === 'error') {
      showBanner('error', 'Google Calendar connection failed. Please try again.');
    }
  }, [googleStatus]);

  function showBanner(type: 'success' | 'error', text: string) {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  }

  async function handleGoogleConnect() {
    const url = await getGoogleAuthUrl();
    window.location.href = url;
  }

  function handleGoogleSync() {
    startSync(async () => {
      const result = await syncGoogleCalendar();
      if ('error' in result) {
        showBanner('error', result.error);
      } else {
        showBanner('success', `Synced ${result.synced} event${result.synced !== 1 ? 's' : ''} from Google Calendar.`);
        load();
      }
    });
  }

  async function handleGoogleDisconnect() {
    await disconnectGoogle();
    setGoogleConn(null);
    load();
  }

  if (!user) return null;

  const todayDone  = todos.filter(t => t.completed).length;
  const weekDone   = weeklyGoals.filter(g => g.completed).length;
  const yearDone   = yearlyGoals.filter(g => g.completed).length;
  const localEvents       = events.filter(e => e.source !== 'google');
  const todayGoogleEvents = events.filter(e => e.source === 'google' && e.date === today);
  const weekGoogleEvents  = events.filter(e => e.source === 'google' && e.date > today && e.date <= endOfWeek);

  return (
    <div className="space-y-6">
      {banner && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
          banner.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          <span>{banner.type === 'success' ? '✅' : '⚠️'}</span>
          {banner.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {greeting()}, {user.name.split(' ')[0]} 🌸
          </h1>
          <p className="mt-1 text-sm text-stone-500">{formatDisplayDate(today)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="hidden sm:flex gap-2">
            <StatBadge label="Today" value={`${todayDone}/${todos.length}`}      color="red" />
            <StatBadge label="Week"  value={`${weekDone}/${weeklyGoals.length}`} color="rose" />
            <StatBadge label="Year"  value={`${yearDone}/${yearlyGoals.length}`} color="amber" />
          </div>
          {/* Google sync button */}
          <div className="flex items-center gap-2">
            {googleConn?.connected ? (
              <>
                <button
                  onClick={handleGoogleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-60"
                >
                  {isSyncing ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                  ) : (
                    <GoogleIcon />
                  )}
                  {isSyncing ? 'Syncing…' : 'Sync Google Cal'}
                  {!isSyncing && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </button>
                <button
                  onClick={handleGoogleDisconnect}
                  className="text-xs text-stone-400 hover:text-red-500 transition"
                >
                  disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleGoogleConnect}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition hover:bg-stone-50"
              >
                <GoogleIcon />
                Connect Google Calendar
              </button>
            )}
          </div>
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
            {todayGoogleEvents.length > 0 && (
              <div className="mt-6 border-t border-stone-100 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <GoogleIcon />
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">From Google Calendar</p>
                </div>
                <div className="space-y-2">
                  {todayGoogleEvents.map(ev => (
                    <GoogleEventRow key={ev.id} event={ev} familyId={user.familyId} onRefresh={load} />
                  ))}
                </div>
              </div>
            )}
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
            {weekGoogleEvents.length > 0 && (
              <div className="mt-6 border-t border-stone-100 pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <GoogleIcon />
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">From Google Calendar</p>
                </div>
                <div className="space-y-4">
                  {DAYS.filter(day => weekGoogleEvents.some(e => dateToDayOfWeek(e.date) === day)).map(day => (
                    <div key={day}>
                      <p className="mb-2 text-xs font-semibold text-stone-500">{day}</p>
                      <div className="space-y-2">
                        {weekGoogleEvents
                          .filter(e => dateToDayOfWeek(e.date) === day)
                          .map(ev => (
                            <GoogleEventRow key={ev.id} event={ev} familyId={user.familyId} onRefresh={load} />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
      </div>
    </div>
  );
}

function GoogleEventRow({ event, familyId, onRefresh }: {
  event: CalendarEvent;
  familyId: string | undefined;
  onRefresh: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const shared = !!event.sharedToFamilyAt;

  async function handleShare() {
    if (!familyId) return;
    setSharing(true);
    await shareEventToFamily(event.id, familyId);
    onRefresh();
    setSharing(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5">
      <GoogleIcon />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-700 truncate">{event.title}</p>
        {event.time && <p className="text-xs text-stone-400">{event.time}</p>}
      </div>
      {familyId && (
        shared ? (
          <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            ✓ Shared
          </span>
        ) : (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="shrink-0 rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            {sharing ? '…' : 'Share with family'}
          </button>
        )
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
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
