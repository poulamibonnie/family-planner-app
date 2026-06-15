'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/lib/actions/auth';
import { getFamilyById } from '@/lib/actions/family';
import { getFamilyTodos, getFamilyAllTodos, addTodo, toggleTodo, deleteTodo } from '@/lib/actions/todos';
import { getFamilyGoals, getFamilyAllGoals, addGoal, toggleGoal, deleteGoal } from '@/lib/actions/goals';
import { getFamilyShoppingItems, addShoppingItem, toggleShoppingItem, deleteShoppingItem } from '@/lib/actions/shopping';
import { getFamilyEvents, toggleCalendarEvent } from '@/lib/actions/events';
import type { User, Family, TodoItem, Goal, ShoppingItem, CalendarEvent } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, DAYS, goalDayToISO } from '@/lib/utils';
import FamilyManager from '@/components/FamilyManager';
import GoalList from '@/components/GoalList';
import WeeklyBoard from '@/components/WeeklyBoard';
import ShoppingList from '@/components/ShoppingList';
import MealPlan from '@/components/MealPlan';
import Reminders from '@/components/Reminders';
import ProgressStats from '@/components/ProgressStats';

type Tab = 'tasks' | 'goals' | 'shopping' | 'meals' | 'reminders' | 'progress';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'tasks',     label: 'Tasks',     emoji: '🗒️' },
  { key: 'goals',     label: 'Goals',     emoji: '🎯' },
  { key: 'shopping',  label: 'Shopping',  emoji: '🛒' },
  { key: 'meals',     label: 'Meal Plan', emoji: '🍱' },
  { key: 'reminders', label: 'Reminders', emoji: '🔔' },
  { key: 'progress',  label: 'Progress',  emoji: '📊' },
];

export default function FamilyPage() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | undefined>(undefined);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [allTodos, setAllTodos] = useState<TodoItem[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [allWeeklyGoals, setAllWeeklyGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  const today = todayISO();
  const week  = getWeekNumber();
  const year  = getYear();

  const load = useCallback(async () => {
    const u = await getCurrentUser();
    if (!u) return;
    setUser(u);
    const f = u.familyId ? await getFamilyById(u.familyId) : null;
    setFamily(f ?? undefined);
    if (f) {
      const [todayTodos, allTodosData, weekly, allWeekly, yearly, shopItems, eventsData] = await Promise.all([
        getFamilyTodos(f.id, today),
        getFamilyAllTodos(f.id),
        getFamilyGoals(f.id, 'weekly', week, year),
        getFamilyAllGoals(f.id, 'weekly'),
        getFamilyGoals(f.id, 'yearly', undefined, year),
        getFamilyShoppingItems(f.id),
        getFamilyEvents(f.id),
      ]);
      setTodos(todayTodos);
      setAllTodos(allTodosData);
      setWeeklyGoals(weekly);
      setAllWeeklyGoals(allWeekly);
      setYearlyGoals(yearly);
      setShopping(shopItems);
      setEvents(eventsData);
    }
  }, [today, week, year]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  if (!family) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Family Mode</h1>
          <p className="mt-1 text-sm text-stone-500">Create or join a family to get started</p>
        </div>
        <FamilyManager user={user} family={undefined} onFamilyChange={load} />
      </div>
    );
  }

  const tasksDone = todos.filter(t => t.completed).length;
  const weekDone  = weeklyGoals.filter(g => g.completed).length;
  const yearDone  = yearlyGoals.filter(g => g.completed).length;
  const shopDone  = shopping.filter(s => s.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{family.name} 🏮</h1>
          <p className="mt-1 text-sm text-stone-500">Shared family dashboard</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Tasks" value={`${tasksDone}/${todos.length}`}      color="red" />
          <StatBadge label="Week"  value={`${weekDone}/${weeklyGoals.length}`} color="rose" />
          <StatBadge label="Year"  value={`${yearDone}/${yearlyGoals.length}`} color="amber" />
          <StatBadge label="Shop"  value={`${shopDone}/${shopping.length}`}    color="emerald" />
        </div>
      </div>

      {/* Invite code bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
        <span className="text-lg">🔑</span>
        <p className="text-sm text-stone-700">
          Invite code: <span className="font-mono font-bold tracking-widest text-red-800">{family.code}</span>
          <span className="ml-2 text-stone-500">— share to invite family members</span>
        </p>
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
        {tab === 'tasks' && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-800">Shared Tasks</h2>
              <span className="rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-medium text-red-700">Week {week} · {year}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(DAYS as string[]).map(day => {
                const c = TASK_COLORS[day as keyof typeof TASK_COLORS];
                const dateStr = goalDayToISO(week, year, day);
                const isToday = dateStr === today;
                const dayTodos = allTodos.filter(t => t.date === dateStr);
                const dayEvents = events.filter(e => e.date === dateStr && e.source === 'google');
                const total = dayTodos.length + dayEvents.length;
                const done = dayTodos.filter(t => t.completed).length + dayEvents.filter(e => !!e.completed).length;
                type DayItem = { kind: 'todo'; data: TodoItem } | { kind: 'google'; data: CalendarEvent };
                const merged: DayItem[] = [
                  ...dayTodos.map(t => ({ kind: 'todo' as const, data: t })),
                  ...dayEvents.map(e => ({ kind: 'google' as const, data: e })),
                ].sort((a, b) => Number(!!a.data.completed) - Number(!!b.data.completed));
                return (
                  <div
                    key={day}
                    className={`flex flex-col rounded-2xl border ${c.border} ${c.bg} shadow-sm transition ${
                      isToday ? `ring-2 ring-offset-2 ${c.ring}` : ''
                    }`}
                  >
                    <div className="flex items-start justify-between px-4 pt-4 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${c.title}`}>{day}</p>
                          {isToday && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                              Today
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {total > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.badge}`}>
                          {done}/{total}
                        </span>
                      )}
                    </div>
                    <div className={`mx-4 border-t ${c.border}`} />
                    <ul className="flex-1 flex flex-col gap-1 px-4 py-3 min-h-[80px]">
                      {total === 0 && (
                        <li className="text-xs text-stone-400 italic py-1">No tasks — add one below</li>
                      )}
                      {merged.map(item =>
                        item.kind === 'todo' ? (
                          <li key={item.data.id} className="group flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={item.data.completed}
                              onChange={async () => { await toggleTodo(item.data.id); load(); }}
                              className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded ${c.check}`}
                            />
                            <span className={`flex-1 text-sm leading-snug break-words ${item.data.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                              {item.data.text}
                            </span>
                            <button
                              onClick={async () => { await deleteTodo(item.data.id); load(); }}
                              className="hidden shrink-0 text-stone-300 hover:text-red-500 group-hover:block transition mt-0.5"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </li>
                        ) : (
                          <li key={item.data.id} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={!!item.data.completed}
                              onChange={async () => { await toggleCalendarEvent(item.data.id); load(); }}
                              className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded ${c.check}`}
                            />
                            <span className={`flex-1 text-sm leading-snug break-words ${item.data.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                              {item.data.title}
                            </span>
                            <GoogleIcon />
                          </li>
                        )
                      )}
                    </ul>
                    <form
                      onSubmit={async e => {
                        e.preventDefault();
                        const text = (taskInputs[day] ?? '').trim();
                        if (!text) return;
                        await addTodo({ text, completed: false, date: dateStr, userId: user.id, scope: 'family', familyId: family.id });
                        setTaskInputs(prev => ({ ...prev, [day]: '' }));
                        load();
                      }}
                      className={`flex items-center gap-2 border-t ${c.border} px-4 py-2.5`}
                    >
                      <svg className="h-3.5 w-3.5 shrink-0 text-stone-400" fill="none" viewBox="0 0 16 16">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <input
                        value={taskInputs[day] ?? ''}
                        onChange={e => setTaskInputs(prev => ({ ...prev, [day]: e.target.value }))}
                        placeholder="Add a task…"
                        className="flex-1 bg-transparent text-xs text-stone-700 placeholder-stone-400 outline-none"
                      />
                      {(taskInputs[day] ?? '').trim() && (
                        <button
                          type="submit"
                          className={`shrink-0 text-xs font-semibold ${c.title} hover:opacity-70 transition`}
                        >
                          Add
                        </button>
                      )}
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'goals' && (
          <div className="space-y-8">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">Weekly Goals</h2>
                <span className="rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-medium text-rose-700">Week {week} · {year}</span>
              </div>
              <WeeklyBoard
                goals={weeklyGoals} weekNumber={week} year={year}
                onAdd={async (text, day) => { await addGoal({ text, completed: false, type: 'weekly', weekNumber: week, year, day, userId: user.id, scope: 'family', familyId: family.id }); load(); }}
                onToggle={async id => { await toggleGoal(id); load(); }}
                onDelete={async id => { await deleteGoal(id); load(); }}
              />
            </div>
            <div className="border-t border-stone-100 pt-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">Yearly Goals</h2>
                <span className="rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-medium text-amber-700">{year}</span>
              </div>
              <GoalList
                items={yearlyGoals} title={`Family goals for ${year}`} accentColor="amber"
                onAdd={async text => { await addGoal({ text, completed: false, type: 'yearly', year, userId: user.id, scope: 'family', familyId: family.id }); load(); }}
                onToggle={async id => { await toggleGoal(id); load(); }}
                onDelete={async id => { await deleteGoal(id); load(); }}
              />
            </div>
          </div>
        )}

        {tab === 'shopping' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">Shopping List</h2>
              <p className="text-sm text-stone-500 mt-1">Shared list for the whole family</p>
            </div>
            <ShoppingList
              items={shopping}
              onAdd={async (text, qty) => { await addShoppingItem({ text, quantity: qty, completed: false, addedBy: user.id, addedByName: user.name, familyId: family.id }); load(); }}
              onToggle={async id => { await toggleShoppingItem(id); load(); }}
              onDelete={async id => { await deleteShoppingItem(id); load(); }}
            />
          </div>
        )}

        {tab === 'meals' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">Meal Plan</h2>
              <p className="text-sm text-stone-500 mt-1">Plan your family&apos;s meals for the week</p>
            </div>
            <MealPlan familyId={family.id} />
          </div>
        )}

        {tab === 'reminders' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">Reminders</h2>
              <p className="text-sm text-stone-500 mt-1">Set shared reminders with browser notifications and email alerts</p>
            </div>
            <Reminders events={events} userId={user.id} familyId={family.id} scope="family" onRefresh={load} />
          </div>
        )}

        {tab === 'progress' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">Progress</h2>
              <p className="text-sm text-stone-500 mt-1">Track family completed and pending tasks across all time periods</p>
            </div>
            <ProgressStats todos={allTodos} weeklyGoals={allWeeklyGoals} yearlyGoals={yearlyGoals} />
          </div>
        )}
      </div>

      {/* Family settings */}
      <details className="rounded-2xl border border-stone-100 bg-white shadow-sm">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-stone-700 hover:text-stone-900 list-none flex items-center gap-2">
          <span>⚙️</span> Family Settings
        </summary>
        <div className="px-6 pb-6">
          <FamilyManager user={user} family={family} onFamilyChange={load} />
        </div>
      </details>
    </div>
  );
}

const TASK_COLORS = {
  Mon: { bg: 'bg-red-50',     border: 'border-red-200',     title: 'text-red-800',     badge: 'bg-red-100 text-red-700',       ring: 'ring-red-400',     check: 'accent-red-600' },
  Tue: { bg: 'bg-amber-50',   border: 'border-amber-200',   title: 'text-amber-800',   badge: 'bg-amber-100 text-amber-700',   ring: 'ring-amber-400',   check: 'accent-amber-600' },
  Wed: { bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700',ring: 'ring-emerald-400', check: 'accent-emerald-600' },
  Thu: { bg: 'bg-stone-50',   border: 'border-stone-200',   title: 'text-stone-700',   badge: 'bg-stone-100 text-stone-600',   ring: 'ring-stone-400',   check: 'accent-stone-600' },
  Fri: { bg: 'bg-zinc-50',    border: 'border-zinc-200',    title: 'text-zinc-800',    badge: 'bg-zinc-100 text-zinc-700',     ring: 'ring-zinc-400',    check: 'accent-zinc-600' },
  Sat: { bg: 'bg-rose-50',    border: 'border-rose-200',    title: 'text-rose-800',    badge: 'bg-rose-100 text-rose-700',     ring: 'ring-rose-400',    check: 'accent-rose-600' },
  Sun: { bg: 'bg-slate-50',   border: 'border-slate-200',   title: 'text-slate-700',   badge: 'bg-slate-100 text-slate-600',   ring: 'ring-slate-400',   check: 'accent-slate-600' },
};

function GoogleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" className="shrink-0 opacity-70">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: 'red' | 'rose' | 'amber' | 'emerald' }) {
  const cls = {
    red:     'bg-red-50 text-red-800 border-red-100',
    rose:    'bg-rose-50 text-rose-800 border-rose-100',
    amber:   'bg-amber-50 text-amber-800 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  }[color];
  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${cls}`}>
      <p className="text-xs font-bold">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}
