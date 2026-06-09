'use client';

import { useState } from 'react';
import type { Goal, DayOfWeek } from '@/lib/types';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COLORS: Record<DayOfWeek, { bg: string; border: string; title: string; badge: string; ring: string; check: string }> = {
  Mon: { bg: 'bg-red-50',     border: 'border-red-200',     title: 'text-red-800',     badge: 'bg-red-100 text-red-700',     ring: 'ring-red-400',     check: 'accent-red-600' },
  Tue: { bg: 'bg-amber-50',   border: 'border-amber-200',   title: 'text-amber-800',   badge: 'bg-amber-100 text-amber-700',   ring: 'ring-amber-400',   check: 'accent-amber-600' },
  Wed: { bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-400', check: 'accent-emerald-600' },
  Thu: { bg: 'bg-stone-50',   border: 'border-stone-200',   title: 'text-stone-700',   badge: 'bg-stone-100 text-stone-600',   ring: 'ring-stone-400',   check: 'accent-stone-600' },
  Fri: { bg: 'bg-zinc-50',    border: 'border-zinc-200',    title: 'text-zinc-800',    badge: 'bg-zinc-100 text-zinc-700',    ring: 'ring-zinc-400',    check: 'accent-zinc-600' },
  Sat: { bg: 'bg-rose-50',    border: 'border-rose-200',    title: 'text-rose-800',    badge: 'bg-rose-100 text-rose-700',    ring: 'ring-rose-400',    check: 'accent-rose-600' },
  Sun: { bg: 'bg-slate-50',   border: 'border-slate-200',   title: 'text-slate-700',   badge: 'bg-slate-100 text-slate-600',   ring: 'ring-slate-400',   check: 'accent-slate-600' },
};

interface Props {
  goals: Goal[];
  weekNumber: number;
  year: number;
  onAdd: (text: string, day: DayOfWeek) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function WeeklyBoard({ goals, weekNumber, year, onAdd, onToggle, onDelete }: Props) {
  const [inputs, setInputs] = useState<Record<DayOfWeek, string>>({
    Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '',
  });

  const weekDates = getWeekDates(weekNumber, year);
  const today = new Date().toISOString().split('T')[0];

  function handleAdd(e: React.FormEvent, day: DayOfWeek) {
    e.preventDefault();
    const text = inputs[day].trim();
    if (!text) return;
    onAdd(text, day);
    setInputs(prev => ({ ...prev, [day]: '' }));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {DAYS.map(day => {
        const c = COLORS[day];
        const dateStr = weekDates[day];
        const isToday = dateStr === today;
        const dayGoals = goals.filter(g => g.day === day);
        const done = dayGoals.filter(g => g.completed).length;

        return (
          <div
            key={day}
            className={`flex flex-col rounded-2xl border ${c.border} ${c.bg} shadow-sm transition ${
              isToday ? `ring-2 ring-offset-2 ${c.ring}` : ''
            }`}
          >
            {/* Card header */}
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
                <p className="text-xs text-stone-400 mt-0.5">{formatDate(dateStr)}</p>
              </div>
              {dayGoals.length > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.badge}`}>
                  {done}/{dayGoals.length}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className={`mx-4 border-t ${c.border}`} />

            {/* Goals */}
            <ul className="flex-1 flex flex-col gap-1 px-4 py-3 min-h-[80px]">
              {dayGoals.length === 0 && (
                <li className="text-xs text-stone-400 italic py-1">No goals — add one below</li>
              )}
              {dayGoals.map(goal => (
                <li key={goal.id} className="group flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={goal.completed}
                    onChange={() => onToggle(goal.id)}
                    className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded ${c.check}`}
                  />
                  <span
                    className={`flex-1 text-sm leading-snug break-words ${
                      goal.completed ? 'line-through text-stone-400' : 'text-stone-700'
                    }`}
                  >
                    {goal.text}
                  </span>
                  <button
                    onClick={() => onDelete(goal.id)}
                    className="hidden shrink-0 text-stone-300 hover:text-red-500 group-hover:block transition mt-0.5"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            {/* Add input */}
            <form
              onSubmit={e => handleAdd(e, day)}
              className={`flex items-center gap-2 border-t ${c.border} px-4 py-2.5`}
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-stone-400" fill="none" viewBox="0 0 16 16">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                value={inputs[day]}
                onChange={e => setInputs(prev => ({ ...prev, [day]: e.target.value }))}
                placeholder="Add a goal…"
                className="flex-1 bg-transparent text-xs text-stone-700 placeholder-stone-400 outline-none"
              />
              {inputs[day].trim() && (
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
  );
}

function getWeekDates(weekNumber: number, year: number): Record<DayOfWeek, string> {
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNumber - 1) * 7);

  const result = {} as Record<DayOfWeek, string>;
  DAYS.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result[day] = d.toISOString().split('T')[0];
  });
  return result;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
