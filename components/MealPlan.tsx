'use client';

import { useState, useEffect } from 'react';
import { getFamilyMeals, setMeal } from '@/lib/store';
import type { MealEntry, DayOfWeek, MealType } from '@/lib/types';
import { getWeekNumber, getYear } from '@/lib/utils';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEAL_TYPES: { key: MealType; label: string; color: string }[] = [
  { key: 'breakfast', label: 'Breakfast', color: 'bg-amber-50 text-amber-700' },
  { key: 'lunch',     label: 'Lunch',     color: 'bg-emerald-50 text-emerald-700' },
  { key: 'dinner',    label: 'Dinner',    color: 'bg-red-50 text-red-700' },
];

interface Props { familyId: string; }

export default function MealPlan({ familyId }: Props) {
  const now = new Date();
  const [week, setWeek] = useState(getWeekNumber(now));
  const [year, setYear] = useState(getYear(now));
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [editing, setEditing] = useState<{ day: DayOfWeek; type: MealType } | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    setMeals(getFamilyMeals(familyId, week, year));
  }, [familyId, week, year]);

  function getMeal(day: DayOfWeek, type: MealType): string {
    return meals.find(m => m.day === day && m.mealType === type)?.meal ?? '';
  }

  function startEdit(day: DayOfWeek, type: MealType) {
    setEditing({ day, type });
    setEditValue(getMeal(day, type));
  }

  function commitEdit() {
    if (!editing) return;
    setMeal(familyId, editing.day, editing.type, editValue, week, year);
    setMeals(getFamilyMeals(familyId, week, year));
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-100 transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-stone-700">Week {week}, {year}</p>
          {isCurrentWeek && <span className="text-xs text-red-700 font-medium">今週 · This Week</span>}
        </div>
        <button onClick={nextWeek} className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-100 transition">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-100 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Meal</th>
              {DAYS.map(day => (
                <th key={day} className="px-2 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map(({ key, label, color }, rowIdx) => (
              <tr key={key} className={rowIdx < MEAL_TYPES.length - 1 ? 'border-b border-stone-50' : ''}>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
                    {label}
                  </span>
                </td>
                {DAYS.map(day => {
                  const isActive = editing?.day === day && editing?.type === key;
                  const value = getMeal(day, key);
                  return (
                    <td key={day} className="px-2 py-2 text-center">
                      {isActive ? (
                        <input
                          autoFocus value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                          className="w-full rounded-lg border border-red-300 bg-white px-2 py-1 text-center text-xs text-stone-700 outline-none focus:ring-2 focus:ring-red-100"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(day, key)}
                          className={`w-full rounded-lg px-2 py-1.5 text-xs transition ${
                            value ? 'text-stone-700 hover:bg-stone-50' : 'text-stone-300 hover:bg-stone-50 hover:text-stone-500'
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
      <p className="text-xs text-stone-400 text-center">Click any cell to edit · クリックして編集</p>
    </div>
  );
}
