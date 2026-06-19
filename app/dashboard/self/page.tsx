'use client';

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSelfTodos, addTodo, toggleTodo, deleteTodo, shareTodoToFamily, unshareTodoFromFamily } from '@/lib/actions/todos';
import { getSelfGoals, addGoal, toggleGoal, deleteGoal, shareGoalToFamily, unshareGoalFromFamily } from '@/lib/actions/goals';
import { getSelfEvents, shareEventToFamily, unshareEventFromFamily, toggleCalendarEvent } from '@/lib/actions/events';
import { getGoogleConnection, getGoogleAuthUrl, syncGoogleCalendar } from '@/lib/actions/google';
import type { TodoItem, Goal, CalendarEvent, GoogleConnection } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, formatDisplayDate, getStartOfWeekISO, getEndOfWeekISO, dateToDayOfWeek, DAYS } from '@/lib/utils';
import GoalList from '@/components/GoalList';
import WeeklyBoard from '@/components/WeeklyBoard';
import Reminders from '@/components/Reminders';
import { useUser } from '@/lib/user-context';

type Tab = 'today' | 'weekly' | 'yearly' | 'reminders';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'today',     label: 'Today',      emoji: '☀️' },
  { key: 'weekly',    label: 'This Week',  emoji: '📅' },
  { key: 'yearly',    label: 'Year Goals', emoji: '🎯' },
  { key: 'reminders', label: 'Reminders',  emoji: '🔔' },
];

export default function SelfPage() {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get('google');
  const user = useUser();

  const [tab, setTab]                   = useState<Tab>('today');
  const [todoInput, setTodoInput]       = useState('');
  const [shareOpen, setShareOpen]       = useState(false);
  const [checkedOpen, setCheckedOpen]   = useState(false);
  const [todos, setTodos]             = useState<TodoItem[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [events, setEvents]             = useState<CalendarEvent[]>([]);
  const [googleConn, setGoogleConn]     = useState<GoogleConnection | null>(null);
  const [banner, setBanner]             = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, startSync]          = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const today       = todayISO();
  const week        = getWeekNumber();
  const year        = getYear();
  const startOfWeek = getStartOfWeekISO();
  const endOfWeek   = getEndOfWeekISO();

  const load = useCallback(async () => {
    if (!user) return;
    const [todayTodos, weekly, yearly, eventsData, connData] = await Promise.all([
      getSelfTodos(user.id, today),
      getSelfGoals(user.id, 'weekly', week, year),
      getSelfGoals(user.id, 'yearly', undefined, year),
      getSelfEvents(user.id),
      getGoogleConnection(),
    ]);
    setTodos(todayTodos);
    setWeeklyGoals(weekly);
    setYearlyGoals(yearly);
    setEvents(eventsData);
    setGoogleConn(connData);
  }, [user, today, week, year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (googleStatus === 'connected') showBanner('success', 'Google Calendar connected! Sync to import your events.');
    else if (googleStatus === 'error') showBanner('error', 'Google Calendar connection failed. Please try again.');
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
      if ('error' in result) showBanner('error', result.error);
      else { showBanner('success', `Synced ${result.synced} event${result.synced !== 1 ? 's' : ''}.`); load(); }
    });
  }

  useEffect(() => {
    if (!googleConn?.connected) return;
    if (sessionStorage.getItem('fp_google_synced')) return;
    sessionStorage.setItem('fp_google_synced', '1');
    startSync(async () => {
      const result = await syncGoogleCalendar();
      if ('error' in result) showBanner('error', result.error);
      else { if (result.synced > 0) showBanner('success', `Auto-synced ${result.synced} event${result.synced !== 1 ? 's' : ''}.`); load(); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleConn]);

  if (!user) return null;

  const localEvents       = events.filter(e => e.source !== 'google');
  const todayGoogleEvents = events.filter(e => e.source === 'google' && e.date === today);
  const weekGoogleEvents  = events.filter(e => e.source === 'google' && e.date >= startOfWeek && e.date <= endOfWeek);

  /* ── Today tab helpers ── */
  type TodayItem = { kind: 'todo'; data: TodoItem } | { kind: 'google'; data: CalendarEvent };
  const allTodayItems: TodayItem[] = [
    ...todos.map(t => ({ kind: 'todo' as const, data: t })),
    ...todayGoogleEvents.map(e => ({ kind: 'google' as const, data: e })),
  ];
  const upcomingItems  = allTodayItems.filter(i => !i.data.completed);
  const completedItems = allTodayItems.filter(i => !!i.data.completed);
  const totalCount     = allTodayItems.length;
  const doneCount      = completedItems.length;
  const sharedCount    = todos.filter(t => !!t.sharedToFamilyAt).length + todayGoogleEvents.filter(e => !!e.sharedToFamilyAt).length;
  const progress       = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const r          = 30;
  const circ       = 2 * Math.PI * r;
  const dashOffset = circ * (1 - progress / 100);
  const ringColor  = progress >= 75 ? '#22C55E' : '#7C5CFC';

  async function handleShareToggle(item: TodayItem) {
    if (!user?.familyId) return;
    const isShared = !!item.data.sharedToFamilyAt;
    if (item.kind === 'todo') {
      isShared ? await unshareTodoFromFamily(item.data.id) : await shareTodoToFamily(item.data.id, user.familyId);
    } else {
      isShared ? await unshareEventFromFamily(item.data.id) : await shareEventToFamily(item.data.id, user.familyId);
    }
    load();
  }

  return (
    <div className="space-y-5">
      {/* Banner */}
      {banner && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
          banner.type === 'success'
            ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
            : 'border-red-100 bg-red-50 text-red-800'
        }`}>
          <span>{banner.type === 'success' ? '✅' : '⚠️'}</span>
          {banner.text}
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 leading-tight tracking-tight">
            {greeting()}, {user.name.split(' ')[0]} 🌸
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-400">{formatDisplayDate(today)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {user.familyId && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-sm transition hover:bg-stone-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M11 8a3 3 0 100-6 3 3 0 000 6zM5 10a3 3 0 100-6 3 3 0 000 6zM1.5 15a5 5 0 019-.5M10 12a5.002 5.002 0 014.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Share with Family
            </button>
          )}
          {googleConn?.connected ? (
            <button
              onClick={handleGoogleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-60"
            >
              {isSyncing ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5"/>
                  <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : <GoogleIcon />}
              {isSyncing ? 'Syncing…' : 'Google Calendar'}
            </button>
          ) : (
            <button
              onClick={handleGoogleConnect}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-sm transition hover:bg-stone-50"
            >
              <GoogleIcon />
              Connect Calendar
            </button>
          )}
        </div>
      </div>

      {/* ── Share panel ── */}
      {shareOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setShareOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">Share with Family</h2>
                <p className="text-xs text-stone-400 mt-0.5">Toggle items to share this week</p>
              </div>
              <button onClick={() => setShareOpen(false)} className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {weeklyGoals.length === 0 && weekGoogleEvents.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: '#F5F0FF' }}>👨‍👩‍👧</div>
                  <p className="text-sm text-stone-400">No tasks this week to share</p>
                </div>
              ) : (
                DAYS.filter(day =>
                  weeklyGoals.some(g => g.day === day) ||
                  weekGoogleEvents.some(e => dateToDayOfWeek(e.date) === day)
                ).map(day => (
                  <div key={day}>
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-stone-400">{day}</p>
                    <div className="space-y-2">
                      {weeklyGoals.filter(g => g.day === day).map(goal => (
                        <label key={goal.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 transition hover:bg-stone-100">
                          <input
                            type="checkbox"
                            checked={!!goal.sharedToFamilyAt}
                            onChange={async e => {
                              e.target.checked ? await shareGoalToFamily(goal.id, user.familyId!) : await unshareGoalFromFamily(goal.id);
                              load();
                            }}
                            className="h-4 w-4 shrink-0 cursor-pointer accent-red-600"
                          />
                          <span className={`flex-1 text-sm ${goal.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>{goal.text}</span>
                        </label>
                      ))}
                      {weekGoogleEvents.filter(e => dateToDayOfWeek(e.date) === day).map(ev => (
                        <label key={ev.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 transition hover:bg-stone-100">
                          <input
                            type="checkbox"
                            checked={!!ev.sharedToFamilyAt}
                            onChange={async e => {
                              e.target.checked ? await shareEventToFamily(ev.id, user.familyId!) : await unshareEventFromFamily(ev.id);
                              load();
                            }}
                            className="h-4 w-4 shrink-0 cursor-pointer accent-red-600"
                          />
                          <GoogleIcon />
                          <span className={`flex-1 text-sm ${ev.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>{ev.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-2xl p-1 overflow-x-auto" style={{ background: '#F4F4F5' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 min-w-max items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none ${
              tab === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span className="text-base">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TODAY TAB
      ══════════════════════════════════ */}
      {tab === 'today' && (
        <div className="relative space-y-4 pb-24">
          {/* Main card */}
          <div
            className="rounded-3xl bg-white p-8"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
          >
            {/* Card header */}
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#1F2937' }}>Today&apos;s Tasks</h2>
                <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>Manage today&apos;s priorities and family activities</p>
              </div>
              <span
                className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: '#F5F0FF', color: '#7C5CFC', border: '1px solid #D9C8FF' }}
              >
                Week {week}
              </span>
            </div>

            {/* Progress + Stats */}
            {totalCount > 0 && (
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                {/* Left: circular + bar */}
                <div
                  className="flex flex-1 items-center gap-5 rounded-2xl p-5"
                  style={{ border: '1px solid #E5E7EB' }}
                >
                  <div className="relative shrink-0">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6"/>
                      <circle
                        cx="40" cy="40" r={r} fill="none"
                        stroke={ringColor} strokeWidth="6"
                        strokeDasharray={circ}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: '#1F2937' }}>
                      {progress}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>Today&apos;s Progress</p>
                    <p className="mt-0.5 text-xs" style={{ color: '#6B7280' }}>
                      {doneCount} of {totalCount} tasks completed
                    </p>
                    <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, background: ringColor }}
                      />
                    </div>
                  </div>
                  <div
                    className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                    style={{ background: '#F5F0FF' }}
                  >
                    ✅
                  </div>
                </div>

                {/* Right: 2x2 stats */}
                <div className="grid grid-cols-2 gap-3 sm:w-52 shrink-0">
                  {[
                    { label: 'Total',     value: totalCount,                  icon: '📋', color: '#7C5CFC', bg: '#F5F0FF' },
                    { label: 'Done',      value: doneCount,                   icon: '✓',  color: '#22C55E', bg: '#ECFDF5' },
                    { label: 'Shared',    value: sharedCount,                 icon: '👥',  color: '#F59E0B', bg: '#FFFBEB' },
                    { label: 'Events',    value: todayGoogleEvents.length,    icon: '📅', color: '#06B6D4', bg: '#ECFEFF' },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className="flex flex-col items-center justify-center rounded-2xl p-3 text-center"
                      style={{ background: stat.bg }}
                    >
                      <span className="text-lg mb-1">{stat.icon}</span>
                      <span className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
                      <span className="text-[10px] font-medium text-stone-500 mt-0.5">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task composer */}
            <div className="mb-6 rounded-2xl p-5 space-y-2" style={{ border: '1.5px solid #E5E7EB' }}>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition"
                style={{ border: '1.5px solid #E5E7EB', background: '#FAFAFA' }}
                onFocus={e => ((e.currentTarget as HTMLElement).style.borderColor = '#7C5CFC')}
                onBlur={e => ((e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB')}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                  style={{ background: '#7C5CFC' }}
                >
                  +
                </div>
                <input
                  ref={inputRef}
                  value={todoInput}
                  onChange={e => setTodoInput(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key !== 'Enter' || !todoInput.trim()) return;
                    e.preventDefault();
                    await addTodo({ text: todoInput.trim(), completed: false, date: today, userId: user.id, scope: 'self' });
                    setTodoInput('');
                    load();
                  }}
                  placeholder="Add today's task…"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: '#1F2937' }}
                />
                <button
                  disabled={!todoInput.trim()}
                  onClick={async () => {
                    if (!todoInput.trim()) return;
                    await addTodo({ text: todoInput.trim(), completed: false, date: today, userId: user.id, scope: 'self' });
                    setTodoInput('');
                    load();
                  }}
                  className="shrink-0 flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-40"
                  style={{ background: '#7C5CFC' }}
                >
                  Add Task
                </button>
              </div>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>Press Enter to add task</p>
            </div>

            {/* ── Upcoming tasks ── */}
            {upcomingItems.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
                    Upcoming
                  </p>
                  <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
                  <span
                    className="text-xs font-semibold rounded-full px-2 py-0.5"
                    style={{ background: '#F5F0FF', color: '#7C5CFC' }}
                  >
                    {upcomingItems.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {upcomingItems.map(item => (
                    <TodayTaskCard
                      key={item.data.id}
                      item={item}
                      user={user}
                      onToggle={async () => {
                        item.kind === 'todo' ? await toggleTodo(item.data.id) : await toggleCalendarEvent(item.data.id);
                        load();
                      }}
                      onDelete={item.kind === 'todo' ? async () => { await deleteTodo(item.data.id); load(); } : undefined}
                      onShareToggle={user.familyId ? () => handleShareToggle(item) : undefined}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* ── Empty state ── */}
            {totalCount === 0 && (
              <div className="flex flex-col items-center py-14 text-center">
                <div
                  className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                  style={{ background: '#F5F0FF' }}
                >
                  ☀️
                </div>
                <p className="text-base font-semibold" style={{ color: '#1F2937' }}>All clear for today</p>
                <p className="text-sm" style={{ color: '#6B7280' }}>Add a task above to get started</p>
              </div>
            )}

            {/* ── Completed tasks ── */}
            {completedItems.length > 0 && (
              <div>
                <button
                  onClick={() => setCheckedOpen(o => !o)}
                  className="flex w-full items-center gap-2 py-2 text-sm transition-colors"
                  style={{ color: '#6B7280' }}
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                    style={{ transform: checkedOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    viewBox="0 0 12 12" fill="none"
                  >
                    <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="font-medium">{completedItems.length} completed task{completedItems.length > 1 ? 's' : ''}</span>
                  <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
                </button>
                {checkedOpen && (
                  <ul className="mt-2 space-y-2 opacity-60">
                    {completedItems.map(item => (
                      <TodayTaskCard
                        key={item.data.id}
                        item={item}
                        user={user}
                        onToggle={async () => {
                          item.kind === 'todo' ? await toggleTodo(item.data.id) : await toggleCalendarEvent(item.data.id);
                          load();
                        }}
                        onDelete={item.kind === 'todo' ? async () => { await deleteTodo(item.data.id); load(); } : undefined}
                        onShareToggle={user.familyId ? () => handleShareToggle(item) : undefined}
                        dim
                      />
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-center text-xs" style={{ color: '#9CA3AF' }}>
                  Great work — completed tasks are at the bottom
                </p>
              </div>
            )}
          </div>

          {/* FAB */}
          <button
            onClick={() => { inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
            aria-label="Add task"
            className="fixed bottom-8 right-8 flex h-16 w-16 items-center justify-center rounded-full text-white transition-all duration-200 hover:scale-110 active:scale-95 z-30"
            style={{
              background: '#7C5CFC',
              boxShadow: '0 4px 12px rgba(124,92,252,0.4), 0 8px 32px rgba(124,92,252,0.2)',
            }}
          >
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════
          WEEKLY TAB
      ══════════════════════════════════ */}
      {tab === 'weekly' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">This Week&apos;s Tasks</h2>
              <p className="text-sm text-stone-400 mt-0.5">Plan and track your week, day by day</p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: '#F5F0FF', color: '#7C5CFC', border: '1px solid #D9C8FF' }}
            >
              Week {week} · {year}
            </span>
          </div>
          <WeeklyBoard
            goals={weeklyGoals} weekNumber={week} year={year}
            onAdd={async (text, day) => { await addGoal({ text, completed: false, type: 'weekly', weekNumber: week, year, day, userId: user.id, scope: 'self' }); await load(); }}
            onToggle={async id => { await toggleGoal(id); await load(); }}
            onDelete={async id => { await deleteGoal(id); await load(); }}
            googleEvents={weekGoogleEvents}
            onGoogleToggle={async id => { await toggleCalendarEvent(id); await load(); }}
          />
        </div>
      )}

      {/* ══════════════════════════════════
          YEARLY GOALS TAB
      ══════════════════════════════════ */}
      {tab === 'yearly' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">Year Goals</h2>
              <p className="text-sm text-stone-400 mt-0.5">Your ambitious goals for {year}</p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}
            >
              {year}
            </span>
          </div>
          <div
            className="rounded-3xl bg-white p-8"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
          >
            <GoalList
              items={yearlyGoals} title={`Goals for ${year}`} accentColor="amber"
              onAdd={async text => { await addGoal({ text, completed: false, type: 'yearly', year, userId: user.id, scope: 'self' }); await load(); }}
              onToggle={async id => { await toggleGoal(id); await load(); }}
              onDelete={async id => { await deleteGoal(id); await load(); }}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          REMINDERS TAB
      ══════════════════════════════════ */}
      {tab === 'reminders' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Reminders</h2>
            <p className="text-sm text-stone-400 mt-0.5">Browser notifications and email alerts for important events</p>
          </div>
          <div
            className="rounded-3xl bg-white p-8"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
          >
            <Reminders events={localEvents} userId={user.id} scope="self" onRefresh={load} />
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Today task card ─────────────────────────────────────────────── */

type TodayItem = { kind: 'todo'; data: TodoItem } | { kind: 'google'; data: CalendarEvent };

function TodayTaskCard({
  item, user, onToggle, onDelete, onShareToggle, dim,
}: {
  item: TodayItem;
  user: { familyId?: string | null };
  onToggle: () => void;
  onDelete?: () => void;
  onShareToggle?: () => void;
  dim?: boolean;
}) {
  const isDone   = !!item.data.completed;
  const isShared = !!item.data.sharedToFamilyAt;
  const title    = item.kind === 'todo' ? item.data.text : item.data.title;
  const subtitle = item.kind === 'google' && (item.data as CalendarEvent).time
    ? (item.data as CalendarEvent).time
    : undefined;

  const badge = item.kind === 'google'
    ? { icon: '📅', label: 'Event',    bg: '#ECFEFF', color: '#0E7490' }
    : isShared
    ? { icon: '👥', label: 'Shared',   bg: '#ECFDF5', color: '#065F46' }
    : { icon: '🌸', label: 'Personal', bg: '#F5F0FF', color: '#5A3FD0' };

  return (
    <li
      className="group flex items-center gap-3 rounded-2xl px-4 transition-all duration-200"
      style={{
        height: '72px',
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        opacity: dim ? 0.6 : 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { if (!dim) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
        style={{ borderColor: isDone ? '#22C55E' : '#D1D5DB', background: isDone ? '#22C55E' : 'transparent' }}
      >
        {isDone && (
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: isDone ? '#9CA3AF' : '#1F2937', textDecoration: isDone ? 'line-through' : 'none' }}
        >
          {title}
        </p>
        {subtitle && <p className="text-xs" style={{ color: '#9CA3AF' }}>{subtitle}</p>}
      </div>

      {/* Badge — clicking toggles share for todos */}
      <button
        onClick={item.kind === 'todo' && onShareToggle ? onShareToggle : undefined}
        className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
          item.kind === 'todo' && onShareToggle ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
        }`}
        style={{ background: badge.bg, color: badge.color }}
      >
        <span>{badge.icon}</span>
        <span className="hidden sm:inline">{badge.label}</span>
      </button>

      {/* Google badge */}
      {item.kind === 'google' && <GoogleIcon />}

      {/* Delete */}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-red-50"
          style={{ color: '#D1D5DB' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#F43F5E')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#D1D5DB')}
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </li>
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
