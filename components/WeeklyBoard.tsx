'use client';

import { useState } from 'react';
import type { Goal, DayOfWeek, CalendarEvent } from '@/lib/types';

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
  googleEvents?: CalendarEvent[];
  onGoogleToggle?: (id: string) => void;
}

export default function WeeklyBoard({ goals, weekNumber, year, onAdd, onToggle, onDelete, googleEvents = [], onGoogleToggle }: Props) {
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
        const dayGoogle = googleEvents.filter(e => e.date === dateStr);
        const totalItems = dayGoals.length + dayGoogle.length;
        const done = dayGoals.filter(g => g.completed).length + dayGoogle.filter(e => !!e.completed).length;

        type DayItem = { kind: 'goal'; data: Goal } | { kind: 'google'; data: CalendarEvent };
        const dayItems: DayItem[] = [
          ...dayGoals.map(g => ({ kind: 'goal' as const, data: g })),
          ...dayGoogle.map(e => ({ kind: 'google' as const, data: e })),
        ].sort((a, b) => Number(!!a.data.completed) - Number(!!b.data.completed));

        return (
          <div
            key={day}
            className={`group flex flex-col rounded-2xl border-2 ${c.border} ${c.bg} shadow-sm transition-all duration-200 hover:shadow-md ${
              isToday ? `ring-2 ring-offset-2 ${c.ring}` : ''
            }`}
          >
            {/* Card header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-base font-bold ${c.title}`}>{day}</p>
                  {isToday && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white leading-none"
                      style={{ background: '#E07A5F' }}
                    >
                      Today
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-stone-500 mt-0.5">{formatDate(dateStr)}</p>
              </div>
              {totalItems > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.badge}`}>
                  {done}/{totalItems}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className={`mx-5 border-t ${c.border}`} />

            {/* Goals + Google events (no time shown) */}
            <ul className="flex-1 flex flex-col gap-1.5 px-5 py-3 min-h-[90px]">
              {totalItems === 0 && (
                <li className="text-xs text-stone-400 italic py-1">No tasks — add one below</li>
              )}
              {dayItems.map(item =>
                item.kind === 'goal' ? (
                  <li key={item.data.id} className="group flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={item.data.completed}
                      onChange={() => onToggle(item.data.id)}
                      className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded ${c.check}`}
                    />
                    <span className={`flex-1 text-sm leading-snug break-words ${item.data.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                      {item.data.text}
                    </span>
                    <button
                      onClick={() => onDelete(item.data.id)}
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
                      onChange={() => onGoogleToggle?.(item.data.id)}
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

            {/* Add input */}
            <form
              onSubmit={e => handleAdd(e, day)}
              className={`flex items-center gap-2 border-t-2 ${c.border} px-5 py-3`}
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-stone-400" fill="none" viewBox="0 0 16 16">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                value={inputs[day]}
                onChange={e => setInputs(prev => ({ ...prev, [day]: e.target.value }))}
                placeholder="Add a task…"
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

function GoogleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5 opacity-70">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
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
