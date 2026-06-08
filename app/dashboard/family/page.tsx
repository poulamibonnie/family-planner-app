'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentUser, getFamilyById, getFamilyTodos, getFamilyAllTodos, addTodo, toggleTodo, deleteTodo,
  getFamilyGoals, addGoal, toggleGoal, deleteGoal, getFamilyShoppingItems,
  addShoppingItem, toggleShoppingItem, deleteShoppingItem, getFamilyEvents, updateUser,
} from '@/lib/store';
import type { User, Family, TodoItem, Goal, ShoppingItem, CalendarEvent } from '@/lib/types';
import { todayISO, getWeekNumber, getYear } from '@/lib/utils';
import FamilyManager from '@/components/FamilyManager';
import TodoList from '@/components/TodoList';
import GoalList from '@/components/GoalList';
import WeeklyBoard from '@/components/WeeklyBoard';
import ShoppingList from '@/components/ShoppingList';
import MealPlan from '@/components/MealPlan';
import CalendarEvents from '@/components/CalendarEvents';

type Tab = 'tasks' | 'goals' | 'shopping' | 'meals' | 'calendar';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'tasks',    label: 'Tasks',     emoji: '🗒️' },
  { key: 'goals',    label: 'Goals',     emoji: '🎯' },
  { key: 'shopping', label: 'Shopping',  emoji: '🛒' },
  { key: 'meals',    label: 'Meal Plan', emoji: '🍱' },
  { key: 'calendar', label: 'Calendar',  emoji: '📅' },
];

export default function FamilyPage() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | undefined>(undefined);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [allTodos, setAllTodos] = useState<TodoItem[]>([]);
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
      setAllTodos(getFamilyAllTodos(f.id));
      setEvents(getFamilyEvents(f.id));
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
              <span className="rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-medium text-red-700">Week {week}</span>
            </div>
            <TodoList
              items={todos}
              onAdd={text => { addTodo({ text, completed: false, date: today, userId: user.id, scope: 'family', familyId: family.id }); load(); }}
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
                <h2 className="text-lg font-semibold text-stone-800">Weekly Goals</h2>
                <span className="rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-medium text-rose-700">Week {week} · {year}</span>
              </div>
              <WeeklyBoard
                goals={weeklyGoals}
                weekNumber={week}
                year={year}
                onAdd={(text, day) => { addGoal({ text, completed: false, type: 'weekly', weekNumber: week, year, day, userId: user.id, scope: 'family', familyId: family.id }); load(); }}
                onToggle={id => { toggleGoal(id); load(); }}
                onDelete={id => { deleteGoal(id); load(); }}
              />
            </div>
            <div className="border-t border-stone-100 pt-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-800">Yearly Goals</h2>
                <span className="rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-medium text-amber-700">{year}</span>
              </div>
              <GoalList
                items={yearlyGoals} title={`Family goals for ${year}`} accentColor="amber"
                onAdd={text => { addGoal({ text, completed: false, type: 'yearly', year, userId: user.id, scope: 'family', familyId: family.id }); load(); }}
                onToggle={id => { toggleGoal(id); load(); }}
                onDelete={id => { deleteGoal(id); load(); }}
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
              onAdd={(text, qty) => { addShoppingItem({ text, quantity: qty, completed: false, addedBy: user.id, addedByName: user.name, familyId: family.id }); load(); }}
              onToggle={id => { toggleShoppingItem(id); load(); }}
              onDelete={id => { deleteShoppingItem(id); load(); }}
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

        {tab === 'calendar' && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-stone-800">Family Calendar</h2>
              <p className="text-sm text-stone-500 mt-1">Shared events with browser notifications</p>
            </div>
            <CalendarEvents events={events} todos={allTodos} goals={weeklyGoals} userId={user.id} familyId={family.id} scope="family" onRefresh={load} />
          </div>
        )}
      </div>

      {/* Family settings collapsible */}
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
