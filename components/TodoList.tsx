'use client';

import { useState } from 'react';
import type { TodoItem } from '@/lib/types';

interface Props {
  items: TodoItem[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  placeholder?: string;
}

export default function TodoList({ items, onAdd, onToggle, onDelete, placeholder = 'Add a task…' }: Props) {
  const [text, setText] = useState('');

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
    <div className="space-y-4">
      {/* Add form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
          style={{ background: '#7C5CFC' }}
        >
          +
        </div>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-stone-800 placeholder-stone-400 outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
          style={{ background: '#7C5CFC' }}
        >
          Add
        </button>
      </form>

      {/* Progress */}
      {items.length > 0 && (
        <p className="text-xs font-medium text-stone-400">
          <span className="text-stone-600 font-semibold">{done}</span> of {items.length} completed
        </p>
      )}

      {/* Pending items */}
      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map(item => (
            <li
              key={item.id}
              className="group flex items-center gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-3.5 transition-all duration-200 hover:shadow-sm hover:border-stone-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <button
                onClick={() => onToggle(item.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110"
                style={{ borderColor: '#D1D5DB' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#7C5CFC')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB')}
              />
              <span className="flex-1 text-sm text-stone-700">{item.text}</span>
              <button
                onClick={() => onDelete(item.id)}
                className="hidden shrink-0 text-stone-300 transition hover:text-rose-400 group-hover:block"
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

      {/* Checked items */}
      {checked.length > 0 && (
        <ul className="space-y-2 opacity-60">
          {checked.map(item => (
            <li
              key={item.id}
              className="group flex items-center gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-3.5 transition-all duration-200"
            >
              <button
                onClick={() => onToggle(item.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
                style={{ borderColor: '#22C55E', background: '#22C55E' }}
              >
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span className="flex-1 text-sm text-stone-400 line-through">{item.text}</span>
              <button
                onClick={() => onDelete(item.id)}
                className="hidden shrink-0 text-stone-300 transition hover:text-rose-400 group-hover:block"
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

      {items.length === 0 && (
        <div className="flex flex-col items-center py-12 text-stone-300">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: '#F5F0FF' }}>
            🗒️
          </div>
          <p className="text-sm font-medium text-stone-400">No tasks yet</p>
          <p className="text-xs text-stone-300 mt-1">Add one above to get started</p>
        </div>
      )}
    </div>
  );
}
