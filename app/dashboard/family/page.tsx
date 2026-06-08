'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentUser, getFamilyById, getFamilyTodos, addTodo, toggleTodo, deleteTodo,
  getFamilyGoals, addGoal, toggleGoal, deleteGoal, getFamilyShoppingItems,
  addShoppingItem, toggleShoppingItem, deleteShoppingItem, getFamilyEvents,
  updateUser,
} from '@/lib/store';
import type { User, Family, TodoItem, Goal, ShoppingItem, CalendarEvent } from '@/lib/types';
import { todayISO, getWeekNumber, getYear } from '@/lib/utils';
import FamilyManager from '@/components/FamilyManager';
import TodoList from '@/components/TodoList';
import GoalList from '@/components/GoalList';
import ShoppingList from '@/components/ShoppingList';
import MealPlan from '@/components/MealPlan';
import CalendarEvents from '@/components/CalendarEvents';

type Tab = 'tasks' | 'goals' | 'shopping' | 'meals' | 'calendar';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'tasks',
    label: 'Tasks',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
  {
    key: 'goals',
    label: 'Goals',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke="currentColor" strokeWidth="1.5" /></svg>,
  },
  {
    key: 'shopping',
    label: 'Shopping',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  {
    key: 'meals',
    label: 'Meal Plan',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  },
];

export default function FamilyPage() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | undefined>(undefined);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const today = todayISO();
  const week = getWeekNumber();
  const year = getYear();

  const load = useCallback(() => {
    const u = getCurrentUser();
    if (!u) return;
    setUser(u);
    const f = u.familyId ? getFamilyById(u.familyId) : undefined;
    setFamily(f);
    if (f) {
      setTodos(getFamilyTodos(f.id, today));
      setWeeklyGoals(getFamilyGoals(f.id, 'weekly', week, year));
      setYearlyGoals(getFamilyGoals(f.id, 'yearly', undefined, year));
      setShopping(getFamilyShoppingItems(f.id));
      setEvents(getFamilyEvents(f.id));
    }
  }, [today, week, year]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  if (!family) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Mode</h1>
          <p className="mt-1 text-sm text-slate-500">Create or join a family to get started</p>
        </div>
        <FamilyManager user={user} family={undefined} onFamilyChange={load} />
      </div>
    );
  }

  const weekDone = weeklyGoals.filter(g => g.completed).length;
  const yearDone = yearlyGoals.filter(g => g.completed).length;
  const tasksDone = todos.filter(t => t.completed).length;
  const shopDone = shopping.filter(s => s.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{family.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Shared family dashboard</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Tasks" value={`${tasksDone}/${todos.length}`} color="emerald" />
          <StatBadge label="Week Goals" value={`${weekDone}/${weeklyGoals.length}`} color="violet" />
          <StatBadge label="Year Goals" value={`${yearDone}/${yearlyGoals.length}`} color="amber" />
          <StatBadge label="Shopping" value={`${shopDone}/${shopping.length}`} color="sky" />
        </div>
      </div>

      {/* Family info bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
        <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24">
          <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-emerald-800">
          Invite code: <span className="font-mono font-bold tracking-widest">{family.code}</span>
          <span className="ml-2 text-emerald-600">— share with family to join</span>
        </p>
        <button
          onClick={load}
          className="ml-auto text-xs text-emerald-600 hover:text-emerald-800 transition underline"
        >
          Manage
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 min-w-max items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'bg-white text-emerald-700 shadow-sm'
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
        {tab === 'tasks' && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Today&apos;s Shared Tasks</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Week {week}</span>
            </div>
            <TodoList
              items={todos}
              onAdd={text => {
                addTodo({ text, completed: false, date: today, userId: user.id, scope: 'family', familyId: family.id });
                load();
              }}
              onToggle={id => { toggleTodo(id); load(); }}
              onDelete={id => { deleteTodo(id); load(); }}
              placeholder="Add a shared task for today…"
            />
          </div>
        )}

        {tab === 'goals' && (
          <div className="space-y-8">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Weekly Goals</h2>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">Week {week} · {year}</span>
              </div>
              <GoalList
                items={weeklyGoals}
                title="This week"
                accentColor="violet"
                onAdd={text => {
                  addGoal({ text, completed: false, type: 'weekly', weekNumber: week, year, userId: user.id, scope: 'family', familyId: family.id });
                  load();
                }}
                onToggle={id => { toggleGoal(id); load(); }}
                onDelete={id => { deleteGoal(id); load(); }}
              />
            </div>
            <div className="border-t border-slate-100 pt-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Yearly Goals</h2>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{year}</span>
              </div>
              <GoalList
                items={yearlyGoals}
                title={`Family goals for ${year}`}
                accentColor="amber"
                onAdd={text => {
                  addGoal({ text, completed: false, type: 'yearly', year, userId: user.id, scope: 'family', familyId: family.id });
                  load();
                }}
                onToggle={id => { toggleGoal(id); load(); }}
                onDelete={id => { deleteGoal(id); load(); }}
              />
            </div>
          </div>
        )}

        {tab === 'shopping' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800">Shopping List</h2>
              <p className="text-sm text-slate-500 mt-1">Shared list for the whole family</p>
            </div>
            <ShoppingList
              items={shopping}
              onAdd={(text, qty) => {
                addShoppingItem({ text, quantity: qty, completed: false, addedBy: user.id, addedByName: user.name, familyId: family.id });
                load();
              }}
              onToggle={id => { toggleShoppingItem(id); load(); }}
              onDelete={id => { deleteShoppingItem(id); load(); }}
            />
          </div>
        )}

        {tab === 'meals' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800">Weekly Meal Plan</h2>
              <p className="text-sm text-slate-500 mt-1">Plan your family&apos;s meals for the week</p>
            </div>
            <MealPlan familyId={family.id} />
          </div>
        )}

        {tab === 'calendar' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800">Family Calendar</h2>
              <p className="text-sm text-slate-500 mt-1">Shared events with browser notifications</p>
            </div>
            <CalendarEvents
              events={events}
              userId={user.id}
              familyId={family.id}
              scope="family"
              onRefresh={load}
            />
          </div>
        )}
      </div>

      {/* Family manager section at bottom */}
      <details className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-slate-700 hover:text-slate-900">
          Family Settings & Members
        </summary>
        <div className="px-6 pb-6">
          <FamilyManager user={user} family={family} onFamilyChange={load} />
        </div>
      </details>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: 'emerald' | 'violet' | 'amber' | 'sky' }) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
  }[color];
  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${cls}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
