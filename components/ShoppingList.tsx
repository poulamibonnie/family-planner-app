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
          className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <input
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder="Qty"
          className="w-20 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
        >
          Add
        </button>
      </form>

      {items.length > 0 && (
        <p className="text-xs text-stone-500">{done}/{items.length} items picked up</p>
      )}

      <ul className="space-y-2">
        {[...pending, ...checked].map(item => (
          <li key={item.id} className="group flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3 shadow-sm transition">
            <button
              onClick={() => onToggle(item.id)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                item.completed ? 'border-emerald-600 bg-emerald-600' : 'border-stone-300 hover:border-emerald-500'
              }`}
            >
              {item.completed && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <span className={`text-sm ${item.completed ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                {item.text}
              </span>
              {item.quantity && (
                <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                  {item.quantity}
                </span>
              )}
              <p className="text-xs text-stone-400 mt-0.5">Added by {item.addedByName}</p>
            </div>

            <button
              onClick={() => onDelete(item.id)}
              className="hidden text-stone-300 transition hover:text-red-400 group-hover:block shrink-0"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <div className="flex flex-col items-center py-10 text-stone-400">
          <span className="mb-2 text-4xl opacity-30">🛒</span>
          <p className="text-sm">Shopping list is empty</p>
        </div>
      )}
    </div>
  );
}
