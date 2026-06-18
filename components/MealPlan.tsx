'use client';

import { useState, useEffect } from 'react';
import { getFamilyMeals, setMeal as saveMeal } from '@/lib/actions/meals';
import type { MealEntry, DayOfWeek, MealType } from '@/lib/types';
import { getWeekNumber, getYear } from '@/lib/utils';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MEAL_TYPES: { key: MealType; label: string; icon: string; bg: string; text: string; border: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '☀️', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  { key: 'lunch',     label: 'Lunch',     icon: '🥗', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙', bg: '#F5F3FF', text: '#5A3FD0', border: '#D9C8FF' },
];

const DAY_ACCENT: Record<DayOfWeek, string> = {
  Mon: '#7C5CFC', Tue: '#F59E0B', Wed: '#06B6D4',
  Thu: '#10B981', Fri: '#F43F5E', Sat: '#8B5CF6', Sun: '#F97316',
};

interface Props { familyId: string; }

export default function MealPlan({ familyId }: Props) {
  const now = new Date();
  const [week, setWeek]     = useState(getWeekNumber(now));
  const [year, setYear]     = useState(getYear(now));
  const [meals, setMeals]   = useState<MealEntry[]>([]);
  const [editing, setEditing] = useState<{ day: DayOfWeek; type: MealType } | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    getFamilyMeals(familyId, week, year).then(setMeals);
  }, [familyId, week, year]);

  function getMeal(day: DayOfWeek, type: MealType): string {
    return meals.find(m => m.day === day && m.mealType === type)?.meal ?? '';
  }

  function startEdit(day: DayOfWeek, type: MealType) {
    setEditing({ day, type });
    setEditValue(getMeal(day, type));
  }

  async function commitEdit() {
    if (!editing) return;
    await saveMeal(familyId, editing.day, editing.type, editValue, week, year);
    getFamilyMeals(familyId, week, year).then(setMeals);
    setEditing(null);
    setEditValue('');
  }

  function prevWeek() {
    if (week === 1) { setWeek(52); setYear(y => y - 1); }
    else setWeek(w => w - 1);
  }

  function nextWeek() {
    if (week === 52) { setWeek(1); setYear(y => y + 1); }
    else setWeek(w => w + 1);
  }

  const isCurrentWeek = week === getWeekNumber(new Date()) && year === new Date().getFullYear();

  return (
    <div className="space-y-5">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevWeek}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-stone-800">Week {week}, {year}</p>
          {isCurrentWeek && (
            <span className="text-xs font-medium" style={{ color: '#7C5CFC' }}>This Week</span>
          )}
        </div>
        <button
          onClick={nextWeek}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-2xl bg-white"
        style={{ border: '1px solid #E4E4E7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <table className="w-full min-w-[640px] text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid #F4F4F5' }}>
              <th className="w-28 px-5 py-4 text-left text-xs font-semibold text-stone-400 uppercase tracking-widest">
                Meal
              </th>
              {DAYS.map(day => (
                <th key={day} className="px-2 py-4 text-center">
                  <span
                    className="inline-block text-xs font-bold uppercase tracking-wider"
                    style={{ color: DAY_ACCENT[day] }}
                  >
                    {day}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map(({ key, label, icon, bg, text, border }, rowIdx) => (
              <tr
                key={key}
                style={{ borderBottom: rowIdx < MEAL_TYPES.length - 1 ? '1px solid #F4F4F5' : 'none' }}
              >
                {/* Meal label */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: bg, color: text, border: `1px solid ${border}` }}
                    >
                      {label}
                    </span>
                  </div>
                </td>
                {/* Cells */}
                {DAYS.map(day => {
                  const isActive = editing?.day === day && editing?.type === key;
                  const value    = getMeal(day, key);
                  return (
                    <td key={day} className="px-2 py-3">
                      {isActive ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                          className="w-full rounded-xl border bg-white px-2 py-1.5 text-center text-xs text-stone-800 outline-none transition"
                          style={{ borderColor: '#7C5CFC', boxShadow: '0 0 0 2px #F5F0FF' }}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(day, key)}
                          className={`w-full min-h-[36px] rounded-xl px-2 py-1.5 text-xs transition-all duration-150 ${
                            value
                              ? 'font-medium text-stone-700 hover:bg-stone-50'
                              : 'text-stone-300 hover:bg-stone-50 hover:text-stone-500'
                          }`}
                        >
                          {value || '+'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-stone-400">Click any cell to edit · Press Enter to save · Esc to cancel</p>
    </div>
  );
}
