'use client';

import { useState } from 'react';
import type { Goal, DayOfWeek, CalendarEvent } from '@/lib/types';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_ACCENT: Record<DayOfWeek, { color: string; headerBg: string; label: string }> = {
  Mon: { color: '#7C5CFC', headerBg: '#F5F0FF', label: 'Monday'    },
  Tue: { color: '#F59E0B', headerBg: '#FFFBEB', label: 'Tuesday'   },
  Wed: { color: '#06B6D4', headerBg: '#ECFEFF', label: 'Wednesday' },
  Thu: { color: '#10B981', headerBg: '#ECFDF5', label: 'Thursday'  },
  Fri: { color: '#F43F5E', headerBg: '#FFF1F2', label: 'Friday'    },
  Sat: { color: '#8B5CF6', headerBg: '#F5F3FF', label: 'Saturday'  },
  Sun: { color: '#F97316', headerBg: '#FFF7ED', label: 'Sunday'    },
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
  onQuickAdd?: (text: string) => void;
}

export default function WeeklyBoard({
  goals, weekNumber, year, onAdd, onToggle, onDelete,
  googleEvents = [], onGoogleToggle, onQuickAdd,
}: Props) {
  const [inputs, setInputs] = useState<Record<DayOfWeek, string>>({
    Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '',
  });
  const [quickText, setQuickText] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);

  const weekDates = getWeekDates(weekNumber, year);
  const today = new Date().toISOString().split('T')[0];

  function handleAdd(e: React.FormEvent, day: DayOfWeek) {
    e.preventDefault();
    const text = inputs[day].trim();
    if (!text) return;
    onAdd(text, day);
    setInputs(prev => ({ ...prev, [day]: '' }));
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = quickText.trim();
    if (!text || !onQuickAdd || quickAdding) return;
    setQuickAdding(true);
    try {
      await onQuickAdd(text);
      setQuickText('');
    } finally {
      setQuickAdding(false);
    }
  }

  /* ── Week overview stats ── */
  const totalTasks = goals.length + googleEvents.length;
  const doneTasks  = goals.filter(g => g.completed).length + googleEvents.filter(e => !!e.completed).length;
  const weekPct    = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const ringR      = 28;
  const ringCirc   = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - weekPct / 100);
  const ringColor  = weekPct >= 75 ? '#22C55E' : '#7C5CFC';

  return (
    <div className="flex gap-3 items-start">
      {/* ── Day cards grid ── */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
              <ul className="flex-1 flex flex-col gap-0.5 px-3 py-3 min-h-[120px]">
                {total === 0 && (
                  <li className="text-xs text-stone-300 italic py-2 px-1">No tasks yet</li>
                )}
                {dayItems.map(item =>
                  item.kind === 'goal' ? (
                    <TaskRow
                      key={item.data.id}
                      hoverBg={a.headerBg}
                      completed={item.data.completed}
                    >
                      <CircleCheckbox
                        checked={item.data.completed}
                        color={a.color}
                        onChange={() => onToggle(item.data.id)}
                      />
                      <span className={`flex-1 text-sm leading-snug break-words min-w-0 ${item.data.completed ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                        {item.data.text}
                      </span>
                      <button
                        onClick={() => onDelete(item.data.id)}
                        className="hidden shrink-0 text-stone-300 hover:text-rose-400 group-hover/row:block transition"
                        aria-label="Delete"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </TaskRow>
                  ) : (
                    <TaskRow
                      key={item.data.id}
                      hoverBg={a.headerBg}
                      completed={!!item.data.completed}
                    >
                      <CircleCheckbox
                        checked={!!item.data.completed}
                        color={a.color}
                        onChange={() => onGoogleToggle?.(item.data.id)}
                      />
                      <span className={`flex-1 text-sm leading-snug break-words min-w-0 ${item.data.completed ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                        {item.data.title}
                      </span>
                      <GoogleIcon />
                    </TaskRow>
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
                <button
                  type="submit"
                  disabled={!inputs[day].trim()}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition disabled:opacity-30"
                  style={{ background: a.color }}
                >
                  Add
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {/* ── Sidebar ── */}
      <div className="hidden xl:flex w-56 shrink-0 flex-col gap-3">

        {/* Week Overview */}
        <div
          className="rounded-2xl bg-white p-4"
          style={{ border: '1px solid #E4E4E7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <p className="text-xs font-bold text-stone-700 mb-4">Week Overview</p>

          {/* Progress ring + count */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={ringR} fill="none" stroke="#F4F4F5" strokeWidth="6"/>
                <circle
                  cx="32" cy="32" r={ringR}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 32 32)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-stone-800">
                {weekPct}%
              </span>
            </div>
            <div>
              <p className="text-xl font-bold text-stone-800 leading-none">
                {doneTasks}
                <span className="text-xs font-normal text-stone-400"> of {totalTasks}</span>
              </p>
              <p className="text-[11px] text-stone-400 mt-1 leading-tight">tasks completed</p>
            </div>
          </div>

          {/* Day dots */}
          <div className="flex items-end justify-between mb-4">
            {DAYS.map(day => {
              const dayGoals  = goals.filter(g => g.day === day);
              const dayGoog   = googleEvents.filter(e => e.date === weekDates[day]);
              const t = dayGoals.length + dayGoog.length;
              const d = dayGoals.filter(g => g.completed).length + dayGoog.filter(e => !!e.completed).length;
              const a = DAY_ACCENT[day];
              const dotColor = t === 0 ? '#E4E4E7' : d === t ? a.color : `${a.color}55`;
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: dotColor }}
                    title={`${a.label}: ${d}/${t}`}
                  />
                  <span className="text-[9px] text-stone-400">{day.charAt(0)}</span>
                </div>
              );
            })}
          </div>

          {/* View insights */}
          <button
            className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 transition"
            style={{ border: '1px solid #E4E4E7' }}
          >
            View insights
            <svg className="h-3.5 w-3.5 text-stone-400" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Quick Add */}
        <div
          className="rounded-2xl bg-white p-4"
          style={{ border: '1px solid #E4E4E7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <p className="text-xs font-bold text-stone-700 mb-3">Quick Add</p>
          <form onSubmit={handleQuickAdd} className="space-y-2">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ border: '1px solid #E4E4E7', background: '#FAFAFA' }}
            >
              <input
                value={quickText}
                onChange={e => setQuickText(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 bg-transparent text-xs text-stone-600 placeholder-stone-300 outline-none"
              />
              <svg className="h-4 w-4 shrink-0 text-stone-300" fill="none" viewBox="0 0 16 16">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 6h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <button
              type="submit"
              disabled={!quickText.trim() || quickAdding}
              className="w-full rounded-xl py-2 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: '#7C5CFC' }}
            >
              {quickAdding ? 'Adding…' : 'Add Task'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Inner components ─────────────────────────────────────────────── */

function TaskRow({
  children,
  hoverBg,
  completed,
}: {
  children: React.ReactNode;
  hoverBg: string;
  completed: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <li
      className="group/row flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors duration-100"
      style={{ background: hovered ? hoverBg : 'transparent', opacity: completed ? 0.7 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </li>
  );
}

function CircleCheckbox({
  checked,
  color,
  onChange,
}: {
  checked: boolean;
  color: string;
  onChange: () => void;
}) {
  return (
    <label className="relative mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <svg viewBox="0 0 16 16" className="h-full w-full" aria-hidden="true">
        {checked ? (
          <>
            <circle cx="8" cy="8" r="7.5" fill={color} />
            <path
              d="M5 8l2 2 4-4"
              stroke="white"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        ) : (
          <circle cx="8" cy="8" r="7" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
        )}
      </svg>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-1 opacity-70">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

/* ── Utilities ────────────────────────────────────────────────────── */

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
