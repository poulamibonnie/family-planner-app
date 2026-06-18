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

const ACCENT: Record<string, { primary: string; soft: string; softBorder: string }> = {
  rose:    { primary: '#F43F5E', soft: '#FFF1F2', softBorder: '#FFE4E6' },
  amber:   { primary: '#F59E0B', soft: '#FFFBEB', softBorder: '#FDE68A' },
  emerald: { primary: '#10B981', soft: '#ECFDF5', softBorder: '#A7F3D0' },
  violet:  { primary: '#7C5CFC', soft: '#F5F0FF', softBorder: '#D9C8FF' },
};

export default function GoalList({ items, title, onAdd, onToggle, onDelete, accentColor = 'violet' }: Props) {
  const [text, setText] = useState('');
  const a = ACCENT[accentColor] ?? ACCENT.violet;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  }

  const done    = items.filter(i => i.completed).length;
  const pending = items.filter(i => !i.completed);
  const checked = items.filter(i => i.completed);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-widest">{title}</h3>
        </div>
        {items.length > 0 && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: a.soft, color: a.primary, border: `1px solid ${a.softBorder}` }}
          >
            {done} / {items.length} done
          </span>
        )}
      </div>

      {/* Add form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
          style={{ background: a.primary }}
        >
          +
        </div>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a goal…"
          className="flex-1 bg-transparent text-sm text-stone-800 placeholder-stone-400 outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
          style={{ background: a.primary }}
        >
          Add
        </button>
      </form>

      {/* Pending goals */}
      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((goal, i) => (
            <li
              key={goal.id}
              className="group flex items-start gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-4 transition-all duration-200 hover:shadow-sm hover:border-stone-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: a.soft, color: a.primary }}
              >
                {items.indexOf(goal) + 1}
              </span>
              <button
                onClick={() => onToggle(goal.id)}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110"
                style={{ borderColor: '#E4E4E7' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = a.primary)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7')}
              />
              <span className="flex-1 text-sm leading-relaxed text-stone-700">{goal.text}</span>
              <button
                onClick={() => onDelete(goal.id)}
                className="hidden shrink-0 text-stone-300 transition hover:text-rose-400 group-hover:block mt-0.5"
                aria-label="Delete"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Completed goals */}
      {checked.length > 0 && (
        <ul className="space-y-2 opacity-55">
          {checked.map((goal) => (
            <li
              key={goal.id}
              className="group flex items-start gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-4"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-stone-100 text-stone-400">
                {items.indexOf(goal) + 1}
              </span>
              <button
                onClick={() => onToggle(goal.id)}
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition"
                style={{ borderColor: '#22C55E', background: '#22C55E' }}
              >
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span className="flex-1 text-sm leading-relaxed text-stone-400 line-through">{goal.text}</span>
              <button
                onClick={() => onDelete(goal.id)}
                className="hidden shrink-0 text-stone-300 transition hover:text-rose-400 group-hover:block mt-0.5"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && (
        <div className="flex flex-col items-center py-12">
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
            style={{ background: a.soft }}
          >
            🎯
          </div>
          <p className="text-sm font-medium text-stone-400">No goals yet</p>
          <p className="text-xs text-stone-300 mt-1">Set a goal above to get started</p>
        </div>
      )}
    </div>
  );
}
