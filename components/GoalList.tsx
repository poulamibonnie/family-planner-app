'use client';

import { useState } from 'react';
import type { Goal } from '@/lib/types';

interface Props {
  items: Goal[];
  title: string;
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  accentColor?: string;
}

const ACCENTS: Record<string, { btn: string; check: string; ring: string; tag: string }> = {
  rose: {
    btn: 'bg-rose-600 hover:bg-rose-700',
    check: 'border-rose-500 bg-rose-500',
    ring: 'focus:border-rose-400 focus:ring-2 focus:ring-rose-100',
    tag: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  amber: {
    btn: 'bg-amber-600 hover:bg-amber-700',
    check: 'border-amber-500 bg-amber-500',
    ring: 'focus:border-amber-400 focus:ring-2 focus:ring-amber-100',
    tag: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  emerald: {
    btn: 'bg-emerald-700 hover:bg-emerald-800',
    check: 'border-emerald-600 bg-emerald-600',
    ring: 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100',
    tag: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
};

export default function GoalList({ items, title, onAdd, onToggle, onDelete, accentColor = 'rose' }: Props) {
  const [text, setText] = useState('');
  const colors = ACCENTS[accentColor] ?? ACCENTS.rose;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  }

  const done = items.filter(i => i.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">{title}</h3>
        {items.length > 0 && (
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors.tag}`}>
            {done}/{items.length}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a goal…"
          className={`flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 shadow-sm outline-none ${colors.ring}`}
        />
        <button
          type="submit"
          className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition active:scale-95 ${colors.btn}`}
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {items.map((goal, i) => (
          <li key={goal.id} className="group flex items-start gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3 shadow-sm">
            <span className="mt-0.5 text-xs font-bold text-stone-300 w-5 shrink-0 text-center">{i + 1}</span>
            <button
              onClick={() => onToggle(goal.id)}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                goal.completed ? colors.check : `border-stone-300 hover:border-stone-400`
              }`}
            >
              {goal.completed && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm leading-relaxed ${goal.completed ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
              {goal.text}
            </span>
            <button
              onClick={() => onDelete(goal.id)}
              className="hidden shrink-0 text-stone-300 transition hover:text-red-400 group-hover:block mt-0.5"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <div className="flex flex-col items-center py-8 text-stone-400">
          <span className="mb-2 text-4xl opacity-30">🎯</span>
          <p className="text-sm">No goals yet — set one above</p>
        </div>
      )}
    </div>
  );
}
