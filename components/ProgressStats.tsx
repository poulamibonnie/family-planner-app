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

const PERIODS: { key: Period; label: string; icon: string; shortLabel: string }[] = [
  { key: 'day',   label: 'Today',      icon: '☀️',  shortLabel: 'Today' },
  { key: 'week',  label: 'This Week',  icon: '📆',  shortLabel: 'Week'  },
  { key: 'month', label: 'This Month', icon: '🗓️', shortLabel: 'Month' },
  { key: 'year',  label: 'This Year',  icon: '📊',  shortLabel: 'Year'  },
];

function pctColor(pct: number, hasData: boolean): string {
  if (!hasData) return '#A1A1AA';
  if (pct >= 75) return '#22C55E';
  if (pct >= 40) return '#F59E0B';
  return '#F43F5E';
}

export default function ProgressStats({ todos, weeklyGoals, yearlyGoals }: Props) {
  const [active, setPeriod] = useState<Period>('week');

  const now          = new Date();
  const today        = now.toISOString().split('T')[0];
  const currentWeek  = getWeekNumber(now);
  const currentYear  = getYear(now);
  const currentMonth = now.getMonth();

  function inWeek(d: string)  { const dt = new Date(d + 'T12:00:00'); return getWeekNumber(dt) === currentWeek && dt.getFullYear() === currentYear; }
  function inMonth(d: string) { const dt = new Date(d + 'T12:00:00'); return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear; }
  function inYear(d: string)  { return new Date(d + 'T12:00:00').getFullYear() === currentYear; }

  const weeklyWithDate = weeklyGoals
    .filter(g => g.day && g.weekNumber !== undefined)
    .map(g => ({ goal: g, iso: goalDayToISO(g.weekNumber!, g.year, g.day!) }));

  function getSlice(period: Period): { todos: TodoItem[]; goals: Goal[] } {
    switch (period) {
      case 'day':   return { todos: todos.filter(t => t.date === today), goals: weeklyWithDate.filter(g => g.iso === today).map(g => g.goal) };
      case 'week':  return { todos: todos.filter(t => inWeek(t.date)),   goals: weeklyGoals.filter(g => g.weekNumber === currentWeek && g.year === currentYear) };
      case 'month': return { todos: todos.filter(t => inMonth(t.date)),  goals: weeklyWithDate.filter(g => inMonth(g.iso)).map(g => g.goal) };
      case 'year':  return { todos: todos.filter(t => inYear(t.date)),   goals: [...weeklyGoals.filter(g => g.year === currentYear), ...yearlyGoals.filter(g => g.year === currentYear)] };
    }
  }

  const slice        = getSlice(active);
  const totalTasks   = slice.todos.length;
  const doneTasks    = slice.todos.filter(t => t.completed).length;
  const totalGoals   = slice.goals.length;
  const doneGoals    = slice.goals.filter(g => g.completed).length;
  const grand        = totalTasks + totalGoals;
  const grandDone    = doneTasks + doneGoals;
  const grandPending = grand - grandDone;
  const pct          = grand === 0 ? 0 : Math.round((grandDone / grand) * 100);
  const taskPct      = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const goalPct      = totalGoals === 0 ? 0 : Math.round((doneGoals / totalGoals) * 100);
  const mainColor    = pctColor(pct, grand > 0);

  const r          = 50;
  const circ       = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct / 100);

  const summaries = PERIODS.map(p => {
    const s = getSlice(p.key);
    const t = s.todos.length + s.goals.length;
    const d = s.todos.filter(x => x.completed).length + s.goals.filter(x => x.completed).length;
    return { ...p, total: t, done: d, pct: t === 0 ? 0 : Math.round((d / t) * 100) };
  });

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-1 rounded-2xl p-1" style={{ background: '#F4F4F5' }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-sm font-medium transition-all duration-200 ${
              active === p.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span className="text-base">{p.icon}</span>
            <span className="hidden sm:inline">{p.label}</span>
            <span className="sm:hidden">{p.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Main stats card */}
      <div
        className="rounded-2xl bg-white p-6"
        style={{ border: '1px solid #E4E4E7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {grand === 0 ? (
          <div className="flex flex-col items-center py-10">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: '#F5F0FF' }}>
              📊
            </div>
            <p className="text-sm font-medium text-stone-400">Nothing tracked yet for this period</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-8 items-center">
            {/* Circular progress */}
            <div className="relative shrink-0">
              <svg width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={r} fill="none" stroke="#F4F4F5" strokeWidth="10"/>
                <circle
                  cx="64" cy="64" r={r} fill="none"
                  stroke={mainColor} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 64 64)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-stone-900">{pct}%</span>
                <span className="text-xs text-stone-400 font-medium">done</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex-1 w-full space-y-4">
              {/* Overall */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-stone-800">Overall Progress</span>
                  <span className="text-xs text-stone-400">{grandDone} / {grand}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F4F4F5' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: mainColor }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs">
                  <span className="font-medium" style={{ color: '#22C55E' }}>{grandDone} completed</span>
                  <span className="text-stone-400">{grandPending} remaining</span>
                </div>
              </div>

              {/* Tasks */}
              {totalTasks > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm text-stone-600">
                      <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: '#7C5CFC' }}/>
                      Daily Tasks
                    </span>
                    <span className="text-xs text-stone-400">{doneTasks} / {totalTasks}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F4F4F5' }}>
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${taskPct}%`, background: '#7C5CFC' }}/>
                  </div>
                </div>
              )}

              {/* Goals */}
              {totalGoals > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm text-stone-600">
                      <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: '#22C55E' }}/>
                      Goals
                    </span>
                    <span className="text-xs text-stone-400">{doneGoals} / {totalGoals}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F4F4F5' }}>
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${goalPct}%`, background: '#22C55E' }}/>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* All-periods glance */}
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">All Periods</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaries.map(s => {
            const c = pctColor(s.pct, s.total > 0);
            const isActive = active === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setPeriod(s.key)}
                className="rounded-2xl bg-white text-left transition-all duration-200 hover:shadow-md active:scale-[0.98] p-4"
                style={{
                  border: isActive ? `2px solid ${c}` : '1px solid #E4E4E7',
                  boxShadow: isActive ? `0 0 0 4px ${c}20` : '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-base font-bold" style={{ color: c }}>{s.pct}%</span>
                </div>
                <p className="text-xs font-semibold text-stone-700 mb-1.5">{s.label}</p>
                <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: '#F4F4F5' }}>
                  <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, background: c }}/>
                </div>
                <p className="text-[11px] text-stone-400">{s.done}/{s.total} done</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
