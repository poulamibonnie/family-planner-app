'use client';

import { useState, useRef, useEffect } from 'react';
import type { ShoppingItem } from '@/lib/types';
import { sendShoppingListEmail } from '@/lib/actions/shopping';

const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'loaf', 'dozen', 'pack', 'box', 'bottle'];

interface Props {
  items: ShoppingItem[];
  userName: string;
  familyName: string;
  onAdd: (text: string, quantity: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onClearCompleted: () => void;
}

export default function ShoppingList({ items, userName, familyName, onAdd, onToggle, onDelete, onClearAll, onClearCompleted }: Props) {
  const [text, setText] = useState('');
  const [qtyNum, setQtyNum] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [checkedOpen, setCheckedOpen] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [exportEmail, setExportEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'sent' | 'error' | null>(null);
  const [sendError, setSendError] = useState('');
  const [shareLabel, setShareLabel] = useState('Copy');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editQty, setEditQty] = useState('');
  const textRef = useRef<HTMLInputElement>(null);

  const pending = items.filter(i => !i.completed);
  const checked = items.filter(i => i.completed);
  const progress = items.length ? Math.round((checked.length / items.length) * 100) : 0;
  const emailList = exportEmail.split(',').map(e => e.trim()).filter(Boolean);

  const r = 30;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - progress / 100);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const qty = qtyNum ? `${qtyNum} ${unit}` : '';
    onAdd(text.trim(), qty.trim());
    setText('');
    setQtyNum('');
    setUnit('pcs');
    textRef.current?.focus();
  }

  function handleShare() {
    const lines = pending.map(i => `• ${i.text}${i.quantity ? ` (${i.quantity})` : ''}`).join('\n');
    navigator.clipboard.writeText(`Shopping List\n\n${lines || '(empty)'}`);
    setShareLabel('Copied!');
    setTimeout(() => setShareLabel('Copy'), 2000);
  }

  async function handleExport() {
    if (!emailList.length || !pending.length) return;
    setSending(true);
    setSendResult(null);
    const result = await sendShoppingListEmail(
      emailList,
      pending.map(i => ({ text: i.text, quantity: i.quantity })),
      familyName,
    );
    setSending(false);
    if (result.ok) { setSendResult('sent'); setTimeout(() => setSendResult(null), 5000); }
    else { setSendResult('error'); setSendError(result.error); }
  }

  function startEdit(item: ShoppingItem) {
    setEditingId(item.id);
    setEditText(item.text);
    setEditQty(item.quantity ?? '');
  }

  function saveEdit() {
    if (!editText.trim() || !editingId) return;
    onDelete(editingId);
    onAdd(editText.trim(), editQty.trim());
    setEditingId(null);
  }

  return (
    <div className="relative space-y-4 pb-24">

      {/* ── Main card ─────────────────────────────────────────────── */}
      <div
        className="rounded-3xl bg-white p-8"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
      >

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#1F2937' }}>
              Shopping List
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
              Shared list for the whole family
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Clear All */}
            {items.length > 0 && (
              <button
                onClick={onClearAll}
                className="flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-95"
                style={{ background: '#4F7CFF' }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M6 4V2.5h4V4M5 4l.5 9.5h5L11 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Clear All
              </button>
            )}
            <div className="h-5 w-px" style={{ background: '#E5E7EB' }} />
            {/* Copy */}
            <button
              onClick={handleShare}
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-95"
              style={{ background: shareLabel === 'Copied!' ? '#22C55E' : '#4F7CFF' }}
            >
              {shareLabel === 'Copied!' ? (
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5 6.5-7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <rect x="5.5" y="1.5" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M10.5 4.5H3A1.5 1.5 0 001.5 6v8A1.5 1.5 0 003 15.5h7.5A1.5 1.5 0 0012 14v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              )}
              <span>{shareLabel}</span>
            </button>
            {/* Email List */}
            <button
              onClick={() => { setEmailOpen(o => !o); setSendResult(null); }}
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-95"
              style={{ background: emailOpen ? '#3F6BE8' : '#4F7CFF' }}
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M1.5 6l6.5 3.5L14.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Email List
            </button>
          </div>
        </div>

        {/* Email panel */}
        {emailOpen && (
          <div
            className="mb-6 rounded-2xl p-5 space-y-3"
            style={{ background: '#F0F4FF', border: '1px solid #C7D7FF' }}
          >
            <p className="text-sm font-medium" style={{ color: '#1F2937' }}>
              Send pending items to
            </p>
            <input
              type="text"
              value={exportEmail}
              onChange={e => { setExportEmail(e.target.value); setSendResult(null); }}
              placeholder="email1@gmail.com, email2@gmail.com"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
              style={{
                border: '1.5px solid #C7D7FF',
                color: '#1F2937',
                background: '#fff',
              }}
              onFocus={e => (e.target.style.borderColor = '#4F7CFF')}
              onBlur={e => (e.target.style.borderColor = '#C7D7FF')}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                {emailList.length > 1 && <p className="text-xs" style={{ color: '#6B7280' }}>{emailList.length} recipients</p>}
                {pending.length === 0 && <p className="text-xs font-medium" style={{ color: '#22C55E' }}>Nothing left to send 🎉</p>}
                {sendResult === 'sent' && <p className="text-xs font-medium" style={{ color: '#22C55E' }}>✓ Sent successfully</p>}
                {sendResult === 'error' && <p className="text-xs" style={{ color: '#EF4444' }}>{sendError}</p>}
              </div>
              <button
                disabled={!emailList.length || !pending.length || sending}
                onClick={handleExport}
                className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#4F7CFF' }}
              >
                {sending ? 'Sending…' : `Send${pending.length ? ` · ${pending.length}` : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Progress card ───────────────────────────────────────── */}
        {items.length > 0 && (
          <div
            className="mb-6 flex items-center gap-6 rounded-2xl p-6"
            style={{ border: '1px solid #E5E7EB' }}
          >
            {/* Circular progress */}
            <div className="relative shrink-0">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r={r} fill="none"
                  stroke="#22C55E" strokeWidth="6"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                style={{ color: '#1F2937' }}
              >
                {progress}%
              </span>
            </div>

            {/* Text + bar */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>Shopping Progress</p>
              <p className="mt-0.5 text-xs" style={{ color: '#6B7280' }}>
                {checked.length} of {items.length} item{items.length > 1 ? 's' : ''} completed
              </p>
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: '#22C55E',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>

            {/* Grocery bag illustration */}
            <div
              className="shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ background: '#F0F4FF' }}
            >
              🛒
            </div>
          </div>
        )}

        {/* ── Add item card ────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl p-5 space-y-3"
          style={{ border: '1.5px solid #E5E7EB' }}
        >
          {/* Item name row */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition"
            style={{ border: '1.5px solid #E5E7EB', background: '#FAFAFA' }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
              style={{ background: '#4F7CFF' }}
            >
              +
            </div>
            <input
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add an item…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#1F2937' }}
              onFocus={e => {
                const parent = e.target.closest('div') as HTMLElement;
                if (parent) parent.style.borderColor = '#4F7CFF';
              }}
              onBlur={e => {
                const parent = e.target.closest('div') as HTMLElement;
                if (parent) parent.style.borderColor = '#E5E7EB';
              }}
            />
          </div>

          {/* Qty + unit + button row */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{ border: '1.5px solid #E5E7EB', background: '#FAFAFA' }}
            >
              <input
                type="number"
                min="0"
                value={qtyNum}
                onChange={e => setQtyNum(e.target.value)}
                placeholder="Qty"
                className="w-16 bg-transparent px-3 py-2.5 text-sm outline-none text-center"
                style={{ color: '#1F2937' }}
              />
              <div className="h-5 w-px" style={{ background: '#E5E7EB' }} />
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="bg-transparent px-3 py-2.5 text-sm outline-none cursor-pointer"
                style={{ color: '#6B7280' }}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#4F7CFF' }}
            >
              Add Item
            </button>
          </div>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Press Enter to add item</p>
        </form>

        {/* ── Pending items ─────────────────────────────────────────── */}
        {pending.length > 0 && (
          <ul className="space-y-2">
            {pending.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                editing={editingId === item.id}
                editText={editText}
                editQty={editQty}
                onEditText={setEditText}
                onEditQty={setEditQty}
                onStartEdit={() => startEdit(item)}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingId(null)}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ background: '#F0F4FF' }}
            >
              🛒
            </div>
            <p className="mt-2 text-base font-semibold" style={{ color: '#1F2937' }}>Nothing here yet</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>Add your first item above to get started.</p>
          </div>
        )}

        {/* ── Checked items ─────────────────────────────────────────── */}
        {checked.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setCheckedOpen(o => !o)}
              className="flex w-full items-center gap-2 py-2 text-sm transition-colors duration-150"
              style={{ color: '#6B7280' }}
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                style={{ transform: checkedOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                viewBox="0 0 12 12" fill="none"
              >
                <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-medium">{checked.length} completed item{checked.length > 1 ? 's' : ''}</span>
              <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
            </button>
            {checkedOpen && (
              <ul className="mt-2 space-y-2">
                {checked.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    editing={false}
                    editText=""
                    editQty=""
                    onEditText={() => {}}
                    onEditQty={() => {}}
                    onStartEdit={() => {}}
                    onSaveEdit={() => {}}
                    onCancelEdit={() => {}}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    dim
                  />
                ))}
              </ul>
            )}
            <p className="mt-3 text-center text-xs" style={{ color: '#9CA3AF' }}>
              Completed items are moved to the bottom
            </p>
          </div>
        )}
      </div>

      {/* ── Clear Completed (fixed bottom-centre) ─────────────────── */}
      {checked.length > 0 && (
        <button
          onClick={onClearCompleted}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex h-10 items-center gap-1.5 rounded-xl px-5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-95 z-30"
          style={{
            background: '#4F7CFF',
            boxShadow: '0 4px 12px rgba(79,124,255,0.35)',
          }}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5 6.5-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Clear Completed
        </button>
      )}

      {/* ── FAB ───────────────────────────────────────────────────── */}
      <button
        onClick={() => textRef.current?.focus()}
        aria-label="Add item"
        className="fixed bottom-8 right-8 flex h-16 w-16 items-center justify-center rounded-full text-white transition-all duration-200 hover:scale-110 active:scale-95 z-30"
        style={{
          background: '#4F7CFF',
          boxShadow: '0 4px 12px rgba(79,124,255,0.4), 0 8px 32px rgba(79,124,255,0.2)',
        }}
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/* ── Item row ──────────────────────────────────────────────────────── */

interface ItemRowProps {
  item: ShoppingItem;
  editing: boolean;
  editText: string;
  editQty: string;
  onEditText: (v: string) => void;
  onEditQty: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  dim?: boolean;
}

function ItemRow({ item, editing, editText, editQty, onEditText, onEditQty, onStartEdit, onSaveEdit, onCancelEdit, onToggle, onDelete, dim }: ItemRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!editing) return;
    function handler(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) onCancelEdit();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing, onCancelEdit]);

  return (
    <li
      ref={rowRef}
      className="group flex items-center gap-3 rounded-2xl px-4 transition-all duration-200"
      style={{
        height: '72px',
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        opacity: dim ? 0.6 : 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { if (!dim) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        aria-label={item.completed ? 'Uncheck' : 'Check'}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
        style={{
          borderColor: item.completed ? '#22C55E' : '#D1D5DB',
          background: item.completed ? '#22C55E' : 'transparent',
        }}
      >
        {item.completed && (
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      {editing ? (
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <input
            autoFocus
            value={editText}
            onChange={e => onEditText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
            className="flex-1 rounded-lg border px-2 py-1 text-sm outline-none"
            style={{ borderColor: '#4F7CFF', color: '#1F2937' }}
          />
          <input
            value={editQty}
            onChange={e => onEditQty(e.target.value)}
            placeholder="Qty"
            className="w-20 rounded-lg border px-2 py-1 text-sm outline-none"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          />
          <button onClick={onSaveEdit} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white" style={{ background: '#4F7CFF' }}>Save</button>
          <button onClick={onCancelEdit} className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}>Cancel</button>
        </div>
      ) : (
        <div className="flex flex-1 items-center min-w-0">
          <span
            className="flex-1 text-sm font-medium truncate"
            style={{
              color: item.completed ? '#9CA3AF' : '#1F2937',
              textDecoration: item.completed ? 'line-through' : 'none',
            }}
          >
            {item.text}
          </span>
        </div>
      )}

      {/* Qty badge */}
      {!editing && item.quantity && (
        <span
          className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium"
          style={{
            background: item.completed ? '#F3F4F6' : '#F0F4FF',
            color: item.completed ? '#9CA3AF' : '#4F7CFF',
          }}
        >
          {item.quantity}
        </span>
      )}

      {/* Completed badge */}
      {item.completed && !editing && (
        <span
          className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold"
          style={{ background: '#DCFCE7', color: '#16A34A' }}
        >
          Done
        </span>
      )}

      {/* Actions — appear on hover */}
      {!editing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
          <button
            onClick={onStartEdit}
            aria-label="Edit"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-100"
            style={{ color: '#6B7280' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(item.id)}
            aria-label="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-red-50"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#EF4444')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#9CA3AF')}
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}
