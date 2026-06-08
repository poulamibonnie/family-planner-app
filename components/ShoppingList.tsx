'use client';

import { useState } from 'react';
import type { ShoppingItem } from '@/lib/types';

interface Props {
  items: ShoppingItem[];
  onAdd: (text: string, quantity: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ShoppingList({ items, onAdd, onToggle, onDelete }: Props) {
  const [text, setText] = useState('');
  const [qty, setQty] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), qty.trim());
    setText('');
    setQty('');
  }

  const done = items.filter(i => i.completed).length;
  const pending = items.filter(i => !i.completed);
  const checked = items.filter(i => i.completed);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Item name…"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <input
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder="Qty"
          className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
        >
          Add
        </button>
      </form>

      {items.length > 0 && (
        <p className="text-xs text-slate-500">{done}/{items.length} items picked up</p>
      )}

      <ul className="space-y-2">
        {[...pending, ...checked].map(item => (
          <li
            key={item.id}
            className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition"
          >
            <button
              onClick={() => onToggle(item.id)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                item.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-emerald-400'
              }`}
            >
              {item.completed && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <span className={`text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {item.text}
              </span>
              {item.quantity && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {item.quantity}
                </span>
              )}
              <p className="text-xs text-slate-400 mt-0.5">Added by {item.addedByName}</p>
            </div>

            <button
              onClick={() => onDelete(item.id)}
              className="hidden text-slate-300 transition hover:text-red-400 group-hover:block shrink-0"
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
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm">Shopping list is empty</p>
        </div>
      )}
    </div>
  );
}
