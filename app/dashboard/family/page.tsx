'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getFamilyById, getFamilyMembers, updateFamilyPhoto, updateFamilyEmergencyContacts } from '@/lib/actions/family';
import { getFamilyAllTodos, addTodo, toggleTodo, deleteTodo } from '@/lib/actions/todos';
import { getFamilyShoppingItems, addShoppingItem, toggleShoppingItem, deleteShoppingItem } from '@/lib/actions/shopping';
import { getFamilyEvents, toggleCalendarEvent } from '@/lib/actions/events';
import type { User, Family, TodoItem, ShoppingItem, CalendarEvent, EmergencyContact } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, DAYS, goalDayToISO, generateId } from '@/lib/utils';
import FamilyManager from '@/components/FamilyManager';
import ShoppingList from '@/components/ShoppingList';
import MealPlan from '@/components/MealPlan';
import Reminders from '@/components/Reminders';
import { useUser } from '@/lib/user-context';

type Tab = 'details' | 'tasks' | 'shopping' | 'meals' | 'reminders';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'details',   label: 'Details',   emoji: '🏠' },
  { key: 'tasks',     label: 'Tasks',     emoji: '🗒️' },
  { key: 'shopping',  label: 'Shopping',  emoji: '🛒' },
  { key: 'meals',     label: 'Meal Plan', emoji: '🍱' },
  { key: 'reminders', label: 'Reminders', emoji: '🔔' },
];

const TASK_COLORS = {
  Mon: { bg: 'bg-red-50',     border: 'border-red-200',     title: 'text-red-800',     badge: 'bg-red-100 text-red-800',        ring: 'ring-red-400',     check: 'accent-red-600' },
  Tue: { bg: 'bg-amber-50',   border: 'border-amber-200',   title: 'text-amber-800',   badge: 'bg-amber-100 text-amber-800',    ring: 'ring-amber-400',   check: 'accent-amber-600' },
  Wed: { bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800',ring: 'ring-emerald-400', check: 'accent-emerald-600' },
  Thu: { bg: 'bg-stone-50',   border: 'border-stone-200',   title: 'text-stone-700',   badge: 'bg-stone-100 text-stone-700',    ring: 'ring-stone-400',   check: 'accent-stone-600' },
  Fri: { bg: 'bg-zinc-50',    border: 'border-zinc-200',    title: 'text-zinc-800',    badge: 'bg-zinc-100 text-zinc-800',      ring: 'ring-zinc-400',    check: 'accent-zinc-600' },
  Sat: { bg: 'bg-rose-50',    border: 'border-rose-200',    title: 'text-rose-800',    badge: 'bg-rose-100 text-rose-800',      ring: 'ring-rose-400',    check: 'accent-rose-600' },
  Sun: { bg: 'bg-slate-50',   border: 'border-slate-200',   title: 'text-slate-700',   badge: 'bg-slate-100 text-slate-700',    ring: 'ring-slate-400',   check: 'accent-slate-600' },
};

function avatarInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function parseContacts(json?: string | null): EmergencyContact[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 480;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FamilyPage() {
  const user = useUser();

  const [tab,         setTab]         = useState<Tab>('details');
  const [family,      setFamily]      = useState<Family | undefined>(undefined);
  const [allTodos,    setAllTodos]    = useState<TodoItem[]>([]);
  const [shopping,    setShopping]    = useState<ShoppingItem[]>([]);
  const [events,      setEvents]      = useState<CalendarEvent[]>([]);
  const [taskInputs,  setTaskInputs]  = useState<Record<string, string>>({});
  const [members,     setMembers]     = useState<User[]>([]);
  const [codeCopied,  setCodeCopied]  = useState(false);

  /* Details tab state */
  const [contacts,       setContacts]       = useState<EmergencyContact[]>([]);
  const [addingContact,  setAddingContact]  = useState(false);
  const [contactForm,    setContactForm]    = useState({ name: '', relationship: '', phone: '' });
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = todayISO();
  const week  = getWeekNumber();
  const year  = getYear();

  const load = useCallback(async () => {
    if (!user) return;
    const f = user.familyId ? await getFamilyById(user.familyId) : null;
    setFamily(f ?? undefined);
    if (f) {
      const [allTodosData, shopItems, eventsData, membersData] = await Promise.all([
        getFamilyAllTodos(f.id),
        getFamilyShoppingItems(f.id),
        getFamilyEvents(f.id),
        getFamilyMembers(f.id),
      ]);
      setAllTodos(allTodosData);
      setShopping(shopItems);
      setEvents(eventsData);
      setMembers(membersData);
      setContacts(parseContacts(f.emergencyContacts));
    }
  }, [user, today, week, year]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  if (!family) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-2xl px-8 py-10 text-center shadow-md"
          style={{ background: 'linear-gradient(135deg, #2F4F3E 0%, #6E8B6B 100%)' }}
        >
          <div className="mb-3 text-5xl">🏮</div>
          <h1 className="text-3xl font-bold text-white">Family Mode</h1>
          <p className="mt-2 text-base text-white/70">Create or join a family to get started</p>
        </div>
        <FamilyManager user={user} family={undefined} onFamilyChange={load} />
      </div>
    );
  }

  /* ── photo upload ── */
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const base64 = await compressImage(file);
      await updateFamilyPhoto(family!.id, base64);
      load();
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  /* ── emergency contacts ── */
  async function saveContacts(updated: EmergencyContact[]) {
    setContacts(updated);
    await updateFamilyEmergencyContacts(family!.id, JSON.stringify(updated));
  }

  async function addContact() {
    if (!contactForm.name.trim()) return;
    const updated = [...contacts, { id: generateId(), ...contactForm }];
    await saveContacts(updated);
    setContactForm({ name: '', relationship: '', phone: '' });
    setAddingContact(false);
  }

  async function removeContact(id: string) {
    await saveContacts(contacts.filter(c => c.id !== id));
  }

  /* ─────────────────────────────────────── RENDER ────────────────────────── */
  return (
    <div className="space-y-5">

      {/* FAMILY HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900 leading-tight">
          Welcome, {family.name}
        </h1>
      </div>

      {/* ══════════════════════════════════
          TAB NAVIGATION
      ══════════════════════════════════ */}
      <div className="flex gap-1.5 rounded-xl bg-stone-100 p-1.5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 min-w-max items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
              tab === t.key
                ? 'bg-white text-red-800 shadow-sm ring-1 ring-red-200'
                : 'text-stone-500 hover:text-stone-700 hover:bg-white/70'
            }`}
          >
            <span className="text-base">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          CONTENT
      ══════════════════════════════════ */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">

        {/* ── Details tab ── */}
        {tab === 'details' && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-stone-800">Family Details</h2>

            {/* Family Photo */}
            <Section label="Family Photo">
              <div className="flex items-center gap-5">
                <div className="h-24 w-24 shrink-0 rounded-2xl overflow-hidden border-2 border-stone-200 bg-stone-100 flex items-center justify-center text-4xl">
                  {family.photoUrl
                    ? <img src={family.photoUrl} alt={family.name} className="h-full w-full object-cover" />
                    : '📷'
                  }
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">
                    Add a photo that represents your family. It will be visible to all members.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoUploading}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition disabled:opacity-50"
                    >
                      {photoUploading ? 'Uploading…' : family.photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {family.photoUrl && (
                      <button
                        onClick={async () => { await updateFamilyPhoto(family.id, null); load(); }}
                        className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </Section>

            {/* Members */}
            <Section label={`Members · ${members.length}`}>
              <ul className="space-y-2">
                {members.map(m => {
                  const isMe = m.id === user.id;
                  return (
                    <li key={m.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isMe ? 'bg-red-100 text-red-800 ring-2 ring-red-200' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {avatarInitials(m.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800 leading-none">
                          {m.name}
                          {isMe && (
                            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">You</span>
                          )}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5 truncate">{m.email}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>

            {/* Emergency Contacts */}
            <Section label="Emergency Contacts">
              {contacts.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {contacts.map(c => (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-lg">
                        🚨
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800 leading-none">{c.name}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {c.relationship && <span className="mr-2">{c.relationship}</span>}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="font-medium text-red-700 hover:underline">
                              {c.phone}
                            </a>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500 transition"
                        aria-label="Remove contact"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {addingContact ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-stone-700">New emergency contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      autoFocus
                      placeholder="Full name *"
                      value={contactForm.name}
                      onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                    <input
                      placeholder="Relationship (e.g. Father)"
                      value={contactForm.relationship}
                      onChange={e => setContactForm(p => ({ ...p, relationship: e.target.value }))}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                    <input
                      placeholder="Phone number"
                      value={contactForm.phone}
                      onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addContact}
                      disabled={!contactForm.name.trim()}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #2F4F3E, #6E8B6B)' }}
                    >
                      Save Contact
                    </button>
                    <button
                      onClick={() => { setAddingContact(false); setContactForm({ name: '', relationship: '', phone: '' }); }}
                      className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingContact(true)}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm font-medium text-stone-500 hover:border-red-300 hover:text-red-700 hover:bg-red-50 transition w-full"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Add emergency contact
                </button>
              )}
            </Section>

            {/* Invite Code */}
            <Section label="Invite Code">
              <p className="mb-3 text-sm text-stone-500">
                Share this code to invite people to <span className="font-semibold text-stone-700">{family.name}</span>.
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-5 py-4">
                <span className="text-xl">🔑</span>
                <span className="flex-1 font-mono text-2xl font-bold tracking-[0.3em] text-red-800">
                  {family.code}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(family.code);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    codeCopied
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  {codeCopied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </Section>
          </div>
        )}

        {/* ── Tasks tab ── */}
        {tab === 'tasks' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-800">Shared Tasks</h2>
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                Week {week} · {year}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(DAYS as string[]).map(day => {
                const c       = TASK_COLORS[day as keyof typeof TASK_COLORS];
                const dateStr = goalDayToISO(week, year, day);
                const isToday = dateStr === today;
                const dayTodos  = allTodos.filter(t => t.date === dateStr);
                const dayEvents = events.filter(e => e.date === dateStr && e.source === 'google');
                const total = dayTodos.length + dayEvents.length;
                const done  = dayTodos.filter(t => t.completed).length + dayEvents.filter(e => !!e.completed).length;

                type DayItem = { kind: 'todo'; data: TodoItem } | { kind: 'google'; data: CalendarEvent };
                const merged: DayItem[] = [
                  ...dayTodos.map(t  => ({ kind: 'todo'   as const, data: t })),
                  ...dayEvents.map(e => ({ kind: 'google' as const, data: e })),
                ].sort((a, b) => Number(!!a.data.completed) - Number(!!b.data.completed));

                return (
                  <div
                    key={day}
                    className={`group flex flex-col rounded-2xl border-2 ${c.border} ${c.bg} shadow-sm transition-all duration-200 hover:shadow-md ${
                      isToday ? `ring-2 ring-offset-2 ${c.ring}` : ''
                    }`}
                  >
                    <div className="flex items-start justify-between px-5 pt-5 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-base font-bold ${c.title}`}>{day}</p>
                          {isToday && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white leading-none" style={{ background: '#E07A5F' }}>
                              Today
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-stone-500 mt-0.5">
                          {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {total > 0 && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.badge}`}>{done}/{total}</span>
                      )}
                    </div>
                    <div className={`mx-5 border-t ${c.border}`} />
                    <ul className="flex-1 flex flex-col gap-1.5 px-5 py-3 min-h-[90px]">
                      {total === 0 && <li className="text-sm text-stone-400 italic py-2">No tasks yet</li>}
                      {merged.map(item =>
                        item.kind === 'todo' ? (
                          <li key={item.data.id} className="group/item flex items-start gap-2.5">
                            <input type="checkbox" checked={item.data.completed}
                              onChange={async () => { await toggleTodo(item.data.id); load(); }}
                              className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded ${c.check}`} />
                            <span className={`flex-1 text-sm leading-snug break-words ${item.data.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                              {item.data.text}
                            </span>
                            <button onClick={async () => { await deleteTodo(item.data.id); load(); }}
                              className="hidden shrink-0 text-stone-300 hover:text-red-500 group-hover/item:block transition mt-0.5" aria-label="Delete">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </li>
                        ) : (
                          <li key={item.data.id} className="flex items-start gap-2.5">
                            <input type="checkbox" checked={!!item.data.completed}
                              onChange={async () => { await toggleCalendarEvent(item.data.id); load(); }}
                              className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded ${c.check}`} />
                            <span className={`flex-1 text-sm leading-snug break-words ${item.data.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                              {item.data.title}
                            </span>
                            <GoogleIcon />
                          </li>
                        )
                      )}
                    </ul>
                    <form
                      onSubmit={async e => {
                        e.preventDefault();
                        const text = (taskInputs[day] ?? '').trim();
                        if (!text) return;
                        await addTodo({ text, completed: false, date: dateStr, userId: user.id, scope: 'family', familyId: family.id });
                        setTaskInputs(prev => ({ ...prev, [day]: '' }));
                        load();
                      }}
                      className={`flex items-center gap-2 border-t-2 ${c.border} px-5 py-3`}
                    >
                      <svg className="h-3.5 w-3.5 shrink-0 text-stone-400" fill="none" viewBox="0 0 16 16">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <input value={taskInputs[day] ?? ''}
                        onChange={e => setTaskInputs(prev => ({ ...prev, [day]: e.target.value }))}
                        placeholder="Add a task…"
                        className="flex-1 bg-transparent text-sm text-stone-700 placeholder-stone-400 outline-none" />
                      {(taskInputs[day] ?? '').trim() && (
                        <button type="submit" className={`shrink-0 text-xs font-bold ${c.title} hover:opacity-70 transition`}>Add</button>
                      )}
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Shopping tab ── */}
        {tab === 'shopping' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-800">Shopping List</h2>
              <p className="mt-1 text-sm text-stone-500">Shared list for the whole family</p>
            </div>
            <ShoppingList
              items={shopping}
              onAdd={async (text, qty) => { await addShoppingItem({ text, quantity: qty, completed: false, addedBy: user.id, addedByName: user.name, familyId: family.id }); load(); }}
              onToggle={async id => { await toggleShoppingItem(id); load(); }}
              onDelete={async id => { await deleteShoppingItem(id); load(); }}
            />
          </div>
        )}

        {/* ── Meals tab ── */}
        {tab === 'meals' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-800">Meal Plan</h2>
              <p className="mt-1 text-sm text-stone-500">Plan your family&apos;s meals for the week</p>
            </div>
            <MealPlan familyId={family.id} />
          </div>
        )}

        {/* ── Reminders tab ── */}
        {tab === 'reminders' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-800">Reminders</h2>
              <p className="mt-1 text-sm text-stone-500">Set shared reminders with browser notifications and email alerts</p>
            </div>
            <Reminders events={events} userId={user.id} familyId={family.id} scope="family" onRefresh={load} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── helpers ──────────────────────────────────────────────────────────────── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">{label}</p>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5 opacity-75">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
