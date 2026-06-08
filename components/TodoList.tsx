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

  const done = items.filter(i => i.completed).length;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
        >
          Add
        </button>
      </form>

      {items.length > 0 && (
        <p className="text-xs text-slate-500">
          {done}/{items.length} completed
        </p>
      )}

      <ul className="space-y-2">
        {items.map(item => (
          <li
            key={item.id}
            className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-100"
          >
            <button
              onClick={() => onToggle(item.id)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                item.completed
                  ? 'border-indigo-500 bg-indigo-500'
                  : 'border-slate-300 hover:border-indigo-400'
              }`}
            >
              {item.completed && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {item.text}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              className="hidden text-slate-300 transition hover:text-red-400 group-hover:block"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <div className="flex flex-col items-center py-10 text-slate-400">
          <svg className="mb-2 h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm">No tasks yet — add one above</p>
        </div>
      )}
    </div>
  );
}
