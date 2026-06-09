'use client';

import { useState } from 'react';
import type { TodoItem, Goal } from '@/lib/types';
import { goalDayToISO, getWeekNumber, getYear } from '@/lib/utils';

type Period = 'day' | 'week' | 'month' | 'year';

interface Props {
  todos: TodoItem[];
  weeklyGoals: Goal[];
  yearlyGoals: Goal[];
}

const PERIODS: { key: Period; label: string; icon: string }[] = [
  { key: 'day',   label: 'Today',      icon: '☀️' },
  { key: 'week',  label: 'This Week',  icon: '📆' },
  { key: 'month', label: 'This Month', icon: '🗓️' },
  { key: 'year',  label: 'This Year',  icon: '📊' },
];

export default function ProgressStats({ todos, weeklyGoals, yearlyGoals }: Props) {
  const [active, setPeriod] = useState<Period>('week');

  const now          = new Date();
  const today        = now.toISOString().split('T')[0];
  const currentWeek  = getWeekNumber(now);
  const currentYear  = getYear(now);
  const currentMonth = now.getMonth();

  function inWeek(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    return getWeekNumber(d) === currentWeek && d.getFullYear() === currentYear;
  }
  function inMonth(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }
  function inYear(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').getFullYear() === currentYear;
  }

  const weeklyWithDate = weeklyGoals
    .filter(g => g.day && g.weekNumber !== undefined)
    .map(g => ({ goal: g, iso: goalDayToISO(g.weekNumber!, g.year, g.day!) }));

  function getSlice(period: Period): { todos: TodoItem[]; goals: Goal[] } {
    switch (period) {
      case 'day':
        return {
          todos: todos.filter(t => t.date === today),
          goals: weeklyWithDate.filter(g => g.iso === today).map(g => g.goal),
        };
      case 'week':
        return {
          todos: todos.filter(t => inWeek(t.date)),
          goals: weeklyGoals.filter(g => g.weekNumber === currentWeek && g.year === currentYear),
        };
      case 'month':
        return {
          todos: todos.filter(t => inMonth(t.date)),
          goals: weeklyWithDate.filter(g => inMonth(g.iso)).map(g => g.goal),
        };
      case 'year':
        return {
          todos: todos.filter(t => inYear(t.date)),
          goals: [
            ...weeklyGoals.filter(g => g.year === currentYear),
            ...yearlyGoals.filter(g => g.year === currentYear),
          ],
        };
    }
  }

  const slice       = getSlice(active);
  const totalTasks  = slice.todos.length;
  const doneTasks   = slice.todos.filter(t => t.completed).length;
  const pendingTasks = totalTasks - doneTasks;
  const totalGoals  = slice.goals.length;
  const doneGoals   = slice.goals.filter(g => g.completed).length;
  const pendingGoals = totalGoals - doneGoals;
  const grand       = totalTasks + totalGoals;
  const grandDone   = doneTasks + doneGoals;
  const grandPending = grand - grandDone;
  const pct         = grand === 0 ? 0 : Math.round((grandDone / grand) * 100);
  const progressColor = pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';

  const taskPct  = totalTasks === 0 ? 0 : Math.round((doneTasks  / totalTasks)  * 100);
  const goalPct  = totalGoals === 0 ? 0 : Math.round((doneGoals  / totalGoals)  * 100);

  // Mini summary for all 4 periods
  const summaries = PERIODS.map(p => {
    const s = getSlice(p.key);
    const t = s.todos.length + s.goals.length;
    const d = s.todos.filter(x => x.completed).length + s.goals.filter(x => x.completed).length;
    return { ...p, total: t, done: d, pct: t === 0 ? 0 : Math.round((d / t) * 100) };
  });

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 px-1 text-xs font-medium transition ${
              active === p.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span>{p.icon}</span>
            <span className="hidden sm:inline">{p.label}</span>
            <span className="sm:hidden capitalize">{p.key}</span>
          </button>
        ))}
      </div>

      {/* Main stats card */}
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        {grand === 0 ? (
          <div className="flex flex-col items-center py-8 text-stone-400">
            <span className="text-4xl mb-2 opacity-30">📊</span>
            <p className="text-sm">No tasks or goals for this period</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-8 items-center">
            {/* Circle */}
            <div className="relative flex-shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={progressColor} strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-stone-800">{pct}%</span>
                <span className="text-xs text-stone-400 font-medium">done</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex-1 w-full space-y-4">
              {/* Overall */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-bold text-stone-700">Overall Progress</span>
                  <span className="text-xs text-stone-500">{grandDone} / {grand}</span>
                </div>
                <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: progressColor }} />
                </div>
                <div className="flex justify-between mt-1 text-xs text-stone-400">
                  <span className="text-emerald-600 font-medium">{grandDone} completed</span>
                  <span className="text-red-500 font-medium">{grandPending} pending</span>
                </div>
              </div>

              {/* Tasks */}
              {totalTasks > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-2 text-sm text-stone-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block" />
                      Daily Tasks
                    </span>
                    <span className="text-xs text-stone-500">{doneTasks} / {totalTasks}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-2 rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${taskPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-stone-400">
                    <span className="text-blue-500 font-medium">{doneTasks} done</span>
                    <span className="text-red-400 font-medium">{pendingTasks} pending</span>
                  </div>
                </div>
              )}

              {/* Goals */}
              {totalGoals > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-2 text-sm text-stone-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                      Goals
                    </span>
                    <span className="text-xs text-stone-500">{doneGoals} / {totalGoals}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${goalPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-stone-400">
                    <span className="text-emerald-600 font-medium">{doneGoals} done</span>
                    <span className="text-red-400 font-medium">{pendingGoals} pending</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick summary — all 4 periods */}
      <div>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">All Periods At a Glance</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaries.map(s => {
            const color = s.pct >= 75 ? 'text-emerald-600 border-emerald-100 bg-emerald-50'
              : s.pct >= 40 ? 'text-amber-600 border-amber-100 bg-amber-50'
              : s.total === 0 ? 'text-stone-400 border-stone-100 bg-stone-50'
              : 'text-red-600 border-red-100 bg-red-50';
            const barColor = s.pct >= 75 ? 'bg-emerald-500' : s.pct >= 40 ? 'bg-amber-500' : s.total === 0 ? 'bg-stone-300' : 'bg-red-500';
            return (
              <button
                key={s.key}
                onClick={() => setPeriod(s.key)}
                className={`rounded-2xl border p-4 text-left transition hover:opacity-90 active:scale-95 ${color} ${active === s.key ? 'ring-2 ring-offset-1 ring-current' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-sm font-bold">{s.pct}%</span>
                </div>
                <p className="text-xs font-semibold mb-1">{s.label}</p>
                <div className="h-1.5 rounded-full bg-black/10 overflow-hidden mb-1.5">
                  <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${s.pct}%` }} />
                </div>
                <p className="text-[11px] opacity-75">{s.done}/{s.total} done</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
