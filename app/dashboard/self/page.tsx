'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth';
import { getSelfTodos, getSelfAllTodos, addTodo, toggleTodo, deleteTodo, shareTodoToFamily, unshareTodoFromFamily } from '@/lib/actions/todos';
import { getSelfGoals, getSelfAllGoals, addGoal, toggleGoal, deleteGoal, shareGoalToFamily, unshareGoalFromFamily } from '@/lib/actions/goals';
import { getSelfEvents, shareEventToFamily, unshareEventFromFamily, toggleCalendarEvent } from '@/lib/actions/events';
import { getGoogleConnection, getGoogleAuthUrl, syncGoogleCalendar } from '@/lib/actions/google';
import type { User, TodoItem, Goal, CalendarEvent, GoogleConnection } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, formatDisplayDate, getStartOfWeekISO, getEndOfWeekISO, dateToDayOfWeek, DAYS } from '@/lib/utils';
import GoalList from '@/components/GoalList';
import WeeklyBoard from '@/components/WeeklyBoard';
import Reminders from '@/components/Reminders';
import ProgressStats from '@/components/ProgressStats';

type Tab = 'today' | 'weekly' | 'yearly' | 'reminders' | 'progress';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'today',     label: 'Today',        emoji: '🗒️' },
  { key: 'weekly',    label: "Week's Tasks",  emoji: '🌸' },
  { key: 'yearly',    label: 'Yearly Goals', emoji: '⛩️' },
  { key: 'reminders', label: 'Reminders',    emoji: '🔔' },
  { key: 'progress',  label: 'Progress',     emoji: '📊' },
];

export default function SelfPage() {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get('google');

  const [tab, setTab] = useState<Tab>('today');
  const [todoInput, setTodoInput] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
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
  const startOfWeek = getStartOfWeekISO();
  const endOfWeek   = getEndOfWeekISO();

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

  useEffect(() => {
    if (!googleConn?.connected) return;
    if (sessionStorage.getItem('fp_google_synced')) return;
    sessionStorage.setItem('fp_google_synced', '1');
    startSync(async () => {
      const result = await syncGoogleCalendar();
      if ('error' in result) {
        showBanner('error', result.error);
      } else {
        if (result.synced > 0) showBanner('success', `Auto-synced ${result.synced} event${result.synced !== 1 ? 's' : ''} from Google Calendar.`);
        load();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleConn]);

  if (!user) return null;

  const localEvents       = events.filter(e => e.source !== 'google');
  const todayGoogleEvents = events.filter(e => e.source === 'google' && e.date === today);
  const weekGoogleEvents  = events.filter(e => e.source === 'google' && e.date >= startOfWeek && e.date <= endOfWeek);

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

            {/* Add form */}
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!todoInput.trim()) return;
                await addTodo({ text: todoInput.trim(), completed: false, date: today, userId: user.id, scope: 'self' });
                setTodoInput('');
                load();
              }}
              className="flex gap-2 mb-4"
            >
              <input
                value={todoInput}
                onChange={e => setTodoInput(e.target.value)}
                placeholder="Add a task for today…"
                className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 shadow-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
              <button
                type="submit"
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}
              >
                Add
              </button>
            </form>

            {/* Progress */}
            {(todos.length + todayGoogleEvents.length) > 0 && (
              <p className="mb-3 text-xs text-stone-500">
                {todos.filter(t => t.completed).length + todayGoogleEvents.filter(e => !!e.completed).length}/
                {todos.length + todayGoogleEvents.length} completed
              </p>
            )}

            {/* Merged + sorted — incomplete first; share toggle on each row */}
            {(() => {
              type TodayItem = { kind: 'todo'; data: TodoItem } | { kind: 'google'; data: CalendarEvent };
              const items: TodayItem[] = [
                ...todos.map(t => ({ kind: 'todo' as const, data: t })),
                ...todayGoogleEvents.map(e => ({ kind: 'google' as const, data: e })),
              ].sort((a, b) => Number(!!a.data.completed) - Number(!!b.data.completed));

              return (
                <ul className="space-y-2">
                  {items.map(item => {
                    const isShared = !!item.data.sharedToFamilyAt;
                    const title = item.kind === 'todo' ? item.data.text : item.data.title;
                    const isDone = !!item.data.completed;

                    async function handleShareToggle() {
                      if (!user!.familyId) return;
                      if (item.kind === 'todo') {
                        isShared ? await unshareTodoFromFamily(item.data.id) : await shareTodoToFamily(item.data.id, user!.familyId!);
                      } else {
                        isShared ? await unshareEventFromFamily(item.data.id) : await shareEventToFamily(item.data.id, user!.familyId!);
                      }
                      load();
                    }

                    return (
                      <li key={item.data.id} className="group flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3 shadow-sm transition hover:border-red-100">
                        {/* Completion checkbox */}
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={async () => {
                            item.kind === 'todo'
                              ? await toggleTodo(item.data.id)
                              : await toggleCalendarEvent(item.data.id);
                            load();
                          }}
                          className="h-4 w-4 shrink-0 cursor-pointer rounded accent-red-600"
                        />

                        {/* Title */}
                        <span className={`flex-1 text-sm ${isDone ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                          {title}
                        </span>

                        {/* Google badge */}
                        {item.kind === 'google' && <GoogleIcon />}

                        {/* Share toggle switch — only if user belongs to a family */}
                        {user.familyId && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className={`text-xs font-medium ${isShared ? 'text-emerald-600' : 'text-stone-400'}`}>
                              Share with Fam
                            </span>
                            <button
                              role="switch"
                              aria-checked={isShared}
                              onClick={handleShareToggle}
                              title={isShared ? 'Unshare from family' : 'Share with family'}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                                isShared ? 'bg-emerald-500' : 'bg-stone-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                                  isShared ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        )}

                        {/* Delete — todos only */}
                        {item.kind === 'todo' && (
                          <button
                            onClick={async () => { await deleteTodo(item.data.id); load(); }}
                            className="hidden shrink-0 text-stone-300 transition hover:text-red-400 group-hover:block"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              );
            })()}

            {todos.length === 0 && todayGoogleEvents.length === 0 && (
              <div className="flex flex-col items-center py-10 text-stone-400">
                <span className="mb-2 text-4xl opacity-40">🗒️</span>
                <p className="text-sm">No tasks yet — add one above</p>
              </div>
            )}
          </div>
        )}

        {tab === 'weekly' && (
          <div className="space-y-8">
            {/* Week's Tasks */}
            <div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">Week&apos;s Tasks</h2>
                <span className="rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-medium text-rose-700">Week {week} · {year}</span>
              </div>
              <WeeklyBoard
                goals={weeklyGoals} weekNumber={week} year={year}
                onAdd={async (text, day) => { await addGoal({ text, completed: false, type: 'weekly', weekNumber: week, year, day, userId: user.id, scope: 'self' }); load(); }}
                onToggle={async id => { await toggleGoal(id); load(); }}
                onDelete={async id => { await deleteGoal(id); load(); }}
                googleEvents={weekGoogleEvents}
                onGoogleToggle={async id => { await toggleCalendarEvent(id); load(); }}
              />
            </div>

            {/* Share with family — collapsible */}
            {(weeklyGoals.length > 0 || weekGoogleEvents.length > 0) && (
              <div className="rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden">
                {/* Collapsible header */}
                <button
                  onClick={() => setShareOpen(o => !o)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-stone-50 transition"
                >
                  <h2 className="text-lg font-semibold text-stone-800">Share with family</h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {weeklyGoals.length + weekGoogleEvents.length} task{weeklyGoals.length + weekGoogleEvents.length !== 1 ? 's' : ''}
                    </span>
                    <svg
                      className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${shareOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 16 16"
                    >
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {/* Collapsible body */}
                {shareOpen && (
                  <div className="border-t border-stone-100 px-6 py-5 space-y-5">
                    {DAYS.filter(day =>
                      weeklyGoals.some(g => g.day === day) ||
                      weekGoogleEvents.some(e => dateToDayOfWeek(e.date) === day)
                    ).map(day => (
                      <div key={day}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">{day}</p>
                        <div className="space-y-2">
                          {/* Manual goals */}
                          {weeklyGoals.filter(g => g.day === day).map(goal => (
                            <label
                              key={goal.id}
                              className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 transition hover:bg-stone-100"
                            >
                              <input
                                type="checkbox"
                                checked={!!goal.sharedToFamilyAt}
                                disabled={!user.familyId}
                                onChange={async e => {
                                  if (e.target.checked) {
                                    await shareGoalToFamily(goal.id, user.familyId!);
                                  } else {
                                    await unshareGoalFromFamily(goal.id);
                                  }
                                  load();
                                }}
                                className="h-4 w-4 shrink-0 cursor-pointer accent-red-600"
                              />
                              <span className={`flex-1 text-sm ${goal.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                                {goal.text}
                              </span>
                            </label>
                          ))}
                          {/* Google Calendar events */}
                          {weekGoogleEvents.filter(e => dateToDayOfWeek(e.date) === day).map(ev => (
                            <label
                              key={ev.id}
                              className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 transition hover:bg-stone-100"
                            >
                              <input
                                type="checkbox"
                                checked={!!ev.sharedToFamilyAt}
                                disabled={!user.familyId}
                                onChange={async e => {
                                  if (e.target.checked) {
                                    await shareEventToFamily(ev.id, user.familyId!);
                                  } else {
                                    await unshareEventFromFamily(ev.id);
                                  }
                                  load();
                                }}
                                className="h-4 w-4 shrink-0 cursor-pointer accent-red-600"
                              />
                              <GoogleIcon />
                              <span className={`flex-1 text-sm ${ev.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                                {ev.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!user.familyId && (
                      <p className="text-xs text-stone-400 text-center pt-1">Join a family to share tasks</p>
                    )}
                  </div>
                )}
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
  const [toggling, setToggling] = useState(false);
  const completed = !!event.completed;
  const shared = !!event.sharedToFamilyAt;

  async function handleToggle() {
    setToggling(true);
    await toggleCalendarEvent(event.id);
    onRefresh();
    setToggling(false);
  }

  async function handleShare() {
    if (!familyId) return;
    setSharing(true);
    await shareEventToFamily(event.id, familyId);
    onRefresh();
    setSharing(false);
  }

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3 shadow-sm transition hover:border-red-100">
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition disabled:opacity-50 ${
          completed ? 'border-red-700 bg-red-700' : 'border-stone-300 hover:border-red-400'
        }`}
      >
        {completed && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title + time */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${completed ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
          {event.title}
        </p>
        {event.time && <p className="text-xs text-stone-400">{event.time}</p>}
      </div>

      {/* Google badge */}
      <GoogleIcon />

      {/* Share button */}
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


function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
