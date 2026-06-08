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

export default function GoalList({ items, title, onAdd, onToggle, onDelete, accentColor = 'violet' }: Props) {
  const [text, setText] = useState('');

  const colors = {
    violet: {
      btn: 'bg-violet-600 hover:bg-violet-700',
      check: 'border-violet-500 bg-violet-500',
      checkHover: 'hover:border-violet-400',
      ring: 'focus:border-violet-400 focus:ring-violet-100',
    },
    amber: {
      btn: 'bg-amber-500 hover:bg-amber-600',
      check: 'border-amber-500 bg-amber-500',
      checkHover: 'hover:border-amber-400',
      ring: 'focus:border-amber-400 focus:ring-amber-100',
    },
  }[accentColor] ?? {
    btn: 'bg-violet-600 hover:bg-violet-700',
    check: 'border-violet-500 bg-violet-500',
    checkHover: 'hover:border-violet-400',
    ring: 'focus:border-violet-400 focus:ring-violet-100',
  };

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
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">{title}</h3>
        {items.length > 0 && (
          <span className="text-xs text-slate-400">{done}/{items.length}</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a goal…"
          className={`flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:ring-2 ${colors.ring}`}
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
          <li
            key={goal.id}
            className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
          >
            <span className="mt-0.5 text-xs font-bold text-slate-300 w-5 shrink-0 text-center">
              {i + 1}
            </span>
            <button
              onClick={() => onToggle(goal.id)}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                goal.completed ? colors.check : `border-slate-300 ${colors.checkHover}`
              }`}
            >
              {goal.completed && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm leading-relaxed ${goal.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {goal.text}
            </span>
            <button
              onClick={() => onDelete(goal.id)}
              className="hidden shrink-0 text-slate-300 transition hover:text-red-400 group-hover:block mt-0.5"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <div className="flex flex-col items-center py-8 text-slate-400">
          <svg className="mb-2 h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <p className="text-sm">No goals yet — set one above</p>
        </div>
      )}
    </div>
  );
}
