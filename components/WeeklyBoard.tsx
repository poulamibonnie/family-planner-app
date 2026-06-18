'use client';

import { useState } from 'react';
import type { Goal, DayOfWeek, CalendarEvent } from '@/lib/types';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_ACCENT: Record<DayOfWeek, { color: string; headerBg: string; label: string; checkColor: string }> = {
  Mon: { color: '#7C5CFC', headerBg: '#F5F0FF', label: 'Monday',    checkColor: 'accent-violet-600' },
  Tue: { color: '#F59E0B', headerBg: '#FFFBEB', label: 'Tuesday',   checkColor: 'accent-amber-600'  },
  Wed: { color: '#06B6D4', headerBg: '#ECFEFF', label: 'Wednesday', checkColor: 'accent-cyan-600'   },
  Thu: { color: '#10B981', headerBg: '#ECFDF5', label: 'Thursday',  checkColor: 'accent-emerald-600'},
  Fri: { color: '#F43F5E', headerBg: '#FFF1F2', label: 'Friday',    checkColor: 'accent-rose-600'   },
  Sat: { color: '#8B5CF6', headerBg: '#F5F3FF', label: 'Saturday',  checkColor: 'accent-purple-600' },
  Sun: { color: '#F97316', headerBg: '#FFF7ED', label: 'Sunday',    checkColor: 'accent-orange-600' },
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {DAYS.map(day => {
        const a       = DAY_ACCENT[day];
        const dateStr = weekDates[day];
        const isToday = dateStr === today;

        const dayGoals  = goals.filter(g => g.day === day);
        const dayGoogle = googleEvents.filter(e => e.date === dateStr);
        const total     = dayGoals.length + dayGoogle.length;
        const done      = dayGoals.filter(g => g.completed).length + dayGoogle.filter(e => !!e.completed).length;

        type DayItem = { kind: 'goal'; data: Goal } | { kind: 'google'; data: CalendarEvent };
        const dayItems: DayItem[] = [
          ...dayGoals.map(g  => ({ kind: 'goal'   as const, data: g })),
          ...dayGoogle.map(e => ({ kind: 'google' as const, data: e })),
        ].sort((a, b) => Number(!!a.data.completed) - Number(!!b.data.completed));

        return (
          <div
            key={day}
            className="flex flex-col rounded-2xl bg-white transition-all duration-200 hover:shadow-md"
            style={{
              border: '1px solid #E4E4E7',
              borderLeft: `4px solid ${a.color}`,
              boxShadow: isToday
                ? `0 0 0 2px ${a.color}40, 0 2px 8px rgba(0,0,0,0.06)`
                : '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            {/* Card header */}
            <div
              className="flex items-start justify-between px-4 pt-4 pb-3 rounded-t-xl"
              style={{ background: a.headerBg }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: a.color }}>{day}</p>
                  {isToday && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white leading-none"
                      style={{ background: a.color }}
                    >
                      Today
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-0.5 font-medium">{formatDate(dateStr)}</p>
              </div>
              {total > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: `${a.color}18`, color: a.color }}
                >
                  {done}/{total}
                </span>
              )}
            </div>

            {/* Task list */}
            <ul className="flex-1 flex flex-col gap-1.5 px-4 py-3 min-h-[88px]">
              {total === 0 && (
                <li className="text-xs text-stone-300 italic py-1.5">No tasks yet</li>
              )}
              {dayItems.map(item =>
                item.kind === 'goal' ? (
                  <li key={item.data.id} className="group/item flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={item.data.completed}
                      onChange={() => onToggle(item.data.id)}
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded ${a.checkColor}`}
                    />
                    <span className={`flex-1 text-sm leading-snug break-words ${item.data.completed ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                      {item.data.text}
                    </span>
                    <button
                      onClick={() => onDelete(item.data.id)}
                      className="hidden shrink-0 text-stone-300 hover:text-rose-400 group-hover/item:block transition mt-0.5"
                      aria-label="Delete"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </li>
                ) : (
                  <li key={item.data.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={!!item.data.completed}
                      onChange={() => onGoogleToggle?.(item.data.id)}
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded ${a.checkColor}`}
                    />
                    <span className={`flex-1 text-sm leading-snug break-words ${item.data.completed ? 'line-through text-stone-300' : 'text-stone-700'}`}>
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
              className="flex items-center gap-2 border-t border-stone-100 px-4 py-3"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-stone-300" fill="none" viewBox="0 0 16 16">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                value={inputs[day]}
                onChange={e => setInputs(prev => ({ ...prev, [day]: e.target.value }))}
                placeholder="Add a task…"
                className="flex-1 bg-transparent text-xs text-stone-600 placeholder-stone-300 outline-none"
              />
              {inputs[day].trim() && (
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition"
                  style={{ background: a.color }}
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
  const jan4   = new Date(year, 0, 4);
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
