'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFamilyById, getFamilyMembers, updateFamilyName, updateFamilyEmergencyContacts } from '@/lib/actions/family';
import { getFamilyAllTodos, addTodo, toggleTodo, deleteTodo } from '@/lib/actions/todos';
import { getFamilyShoppingItems, addShoppingItem, toggleShoppingItem, deleteShoppingItem, clearAllShoppingItems, clearCompletedShoppingItems } from '@/lib/actions/shopping';
import { getFamilyEvents, toggleCalendarEvent } from '@/lib/actions/events';
import type { User, Family, TodoItem, ShoppingItem, CalendarEvent, EmergencyContact } from '@/lib/types';
import { todayISO, getWeekNumber, getYear, generateId } from '@/lib/utils';
import FamilyManager from '@/components/FamilyManager';
import FamilyWeeklyBoard from '@/components/FamilyWeeklyBoard';
import ShoppingList from '@/components/ShoppingList';
import MealPlan from '@/components/MealPlan';
import Reminders from '@/components/Reminders';
import { useUser } from '@/lib/user-context';

type Tab = 'tasks' | 'shopping' | 'meals' | 'reminders';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'tasks',     label: 'Tasks',     emoji: '📋' },
  { key: 'shopping',  label: 'Shopping',  emoji: '🛒' },
  { key: 'meals',     label: 'Meal Plan', emoji: '🍽️' },
  { key: 'reminders', label: 'Reminders', emoji: '🔔' },
];

function avatarInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function parseContacts(json?: string | null): EmergencyContact[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}

export default function FamilyPage() {
  const user = useUser();

  const [tab,         setTab]         = useState<Tab>('tasks');
  const [infoOpen,    setInfoOpen]    = useState(false);
  const [family,      setFamily]      = useState<Family | undefined>(undefined);
  const [allTodos,    setAllTodos]    = useState<TodoItem[]>([]);
  const [shopping,    setShopping]    = useState<ShoppingItem[]>([]);
  const [events,      setEvents]      = useState<CalendarEvent[]>([]);
  const [members,     setMembers]     = useState<User[]>([]);
  const [codeCopied,        setCodeCopied]        = useState(false);
  const [dismissedTip,      setDismissedTip]      = useState(false);
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [familyNameInput,   setFamilyNameInput]   = useState('');
  const [contacts,          setContacts]          = useState<EmergencyContact[]>([]);
  const [addingContact,     setAddingContact]     = useState(false);
  const [contactForm,       setContactForm]       = useState({ name: '', relationship: '', phone: '' });

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
          className="rounded-3xl px-8 py-12 text-center"
          style={{
            background: 'linear-gradient(135deg, #7C5CFC 0%, #9B7FFF 100%)',
            boxShadow: '0 8px 32px rgba(124,92,252,0.25)',
          }}
        >
          <div className="mb-4 text-5xl">🏠</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Family Mode</h1>
          <p className="mt-2 text-base text-white/70">Create or join a family to get started</p>
        </div>
        <FamilyManager user={user} family={undefined} onFamilyChange={load} />
      </div>
    );
  }

  async function saveFamilyName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = familyNameInput.trim();
    if (!trimmed || trimmed === family!.name) { setEditingFamilyName(false); return; }
    await updateFamilyName(family!.id, trimmed);
    setFamily(prev => prev ? { ...prev, name: trimmed } : prev);
    setEditingFamilyName(false);
  }

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

  return (
    <div className="space-y-5">

      {/* ── Family header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Member avatar cluster */}
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m, i) => (
              <div
                key={m.id}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white"
                style={{
                  background: MEMBER_COLORS[i % MEMBER_COLORS.length],
                  zIndex: members.length - i,
                }}
                title={m.name}
              >
                {avatarInitials(m.name)}
              </div>
            ))}
            {members.length > 4 && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-stone-600 ring-2 ring-white"
                style={{ background: '#F4F4F5', zIndex: 0 }}
              >
                +{members.length - 4}
              </div>
            )}
          </div>
          <div>
            {editingFamilyName ? (
              <form onSubmit={saveFamilyName} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={familyNameInput}
                  onChange={e => setFamilyNameInput(e.target.value)}
                  className="text-2xl font-bold text-stone-900 leading-tight tracking-tight border-b-2 bg-transparent outline-none w-44"
                  style={{ borderColor: '#7C5CFC' }}
                />
                <button
                  type="submit"
                  className="rounded-lg p-1.5 text-white transition active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #7C5CFC, #6B4EE6)' }}
                  title="Save"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFamilyName(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
                  title="Cancel"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5 group">
                <h1 className="text-2xl font-bold text-stone-900 leading-tight tracking-tight">{family.name}</h1>
                <button
                  onClick={() => { setFamilyNameInput(family.name); setEditingFamilyName(true); }}
                  className="opacity-0 group-hover:opacity-100 transition rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                  title="Edit family name"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
            <p className="text-xs text-stone-400 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setInfoOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 active:scale-95"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Family Info
        </button>
      </div>

      {/* ══════════════════════════════════
          INFO PANEL
      ══════════════════════════════════ */}
      {infoOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setInfoOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">{family.name}</h2>
                <p className="text-xs text-stone-400 mt-0.5">Family information & settings</p>
              </div>
              <button onClick={() => setInfoOpen(false)} className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7">
              {/* Members */}
              <PanelSection label={`Members · ${members.length}`}>
                <ul className="space-y-2">
                  {members.map((m, i) => {
                    const isMe = m.id === user.id;
                    return (
                      <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2.5">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: isMe ? '#7C5CFC' : MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                        >
                          {avatarInitials(m.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-stone-900 leading-none">{m.name}</p>
                            {isMe && (
                              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: '#F5F0FF', color: '#7C5CFC' }}>
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5 truncate">{m.email}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </PanelSection>

              {/* Emergency Contacts */}
              <PanelSection label="Emergency Contacts">
                {contacts.length > 0 && (
                  <ul className="space-y-2 mb-3">
                    {contacts.map(c => (
                      <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base" style={{ background: '#FFF1F2' }}>🚨</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-900 leading-none">{c.name}</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {c.relationship && <span className="mr-2">{c.relationship}</span>}
                            {c.phone && <a href={`tel:${c.phone}`} className="font-semibold hover:underline" style={{ color: '#7C5CFC' }}>{c.phone}</a>}
                          </p>
                        </div>
                        <button
                          onClick={() => removeContact(c.id)}
                          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-stone-300 hover:bg-red-50 hover:text-red-400 transition"
                          aria-label="Remove"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {addingContact ? (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">New contact</p>
                    {(['name', 'relationship', 'phone'] as const).map((field, i) => (
                      <input
                        key={field}
                        autoFocus={i === 0}
                        placeholder={field === 'name' ? 'Full name *' : field === 'relationship' ? 'Relationship' : 'Phone number'}
                        value={contactForm[field]}
                        onChange={e => setContactForm(p => ({ ...p, [field]: e.target.value }))}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={addContact}
                        disabled={!contactForm.name.trim()}
                        className="rounded-xl px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
                        style={{ background: '#7C5CFC' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setAddingContact(false); setContactForm({ name: '', relationship: '', phone: '' }); }}
                        className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingContact(true)}
                    className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-stone-300 px-3 py-3 text-sm font-medium text-stone-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Add emergency contact
                  </button>
                )}
              </PanelSection>

              {/* Invite Code */}
              <PanelSection label="Invite Code">
                <p className="mb-3 text-xs text-stone-400">Share this code to invite people to <span className="font-semibold text-stone-600">{family.name}</span></p>
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: '#F5F0FF', border: '1px solid #D9C8FF' }}
                >
                  <span>🔑</span>
                  <span className="flex-1 font-mono text-xl font-bold tracking-[0.3em]" style={{ color: '#7C5CFC' }}>{family.code}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(family.code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                    className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                    style={codeCopied
                      ? { background: '#ECFDF5', color: '#065F46' }
                      : { background: '#7C5CFC', color: '#FFFFFF' }
                    }
                  >
                    {codeCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </PanelSection>
            </div>
          </div>
        </>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-2xl p-1 overflow-x-auto" style={{ background: '#F4F4F5' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 min-w-max items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none ${
              tab === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span className="text-base">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TASKS TAB
      ══════════════════════════════════ */}
      {tab === 'tasks' && (
        <div className="space-y-5">
          <FamilyWeeklyBoard
            allTodos={allTodos}
            events={events}
            onAdd={async (text, date) => { await addTodo({ text, completed: false, date, userId: user.id, scope: 'family', familyId: family.id }); load(); }}
            onToggle={async id => { await toggleTodo(id); load(); }}
            onDelete={async id => { await deleteTodo(id); load(); }}
            onGoogleToggle={async id => { await toggleCalendarEvent(id); load(); }}
            onQuickAdd={async (text, dates) => { await Promise.all(dates.map(date => addTodo({ text, completed: false, date, userId: user.id, scope: 'family', familyId: family.id }))); load(); }}
          />
          {!dismissedTip && (
            <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">
              <span className="shrink-0">💡</span>
              <span><strong className="font-semibold text-stone-700">Tip:</strong> Click the day cards to add tasks, or use Quick Add in the sidebar</span>
              <button
                onClick={() => setDismissedTip(true)}
                className="ml-auto shrink-0 text-stone-300 transition hover:text-stone-500"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Shopping tab ── */}
      {tab === 'shopping' && (
        <div style={{ background: '#F8F6F2', borderRadius: '24px', padding: '24px' }}>
          <ShoppingList
            items={shopping}
            userName={user.name}
            familyName={family.name}
            onAdd={async (text, qty) => { await addShoppingItem({ text, quantity: qty, completed: false, addedBy: user.id, addedByName: user.name, familyId: family.id }); load(); }}
            onToggle={async id => { await toggleShoppingItem(id); load(); }}
            onDelete={async id => { await deleteShoppingItem(id); load(); }}
            onClearAll={async () => { await clearAllShoppingItems(family.id); load(); }}
            onClearCompleted={async () => { await clearCompletedShoppingItems(family.id); load(); }}
          />
        </div>
      )}

      {/* ── Meals tab ── */}
      {tab === 'meals' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Meal Plan</h2>
            <p className="text-sm text-stone-400 mt-0.5">Plan your family&apos;s meals for the week</p>
          </div>
          <MealPlan familyId={family.id} />
        </div>
      )}

      {/* ── Reminders tab ── */}
      {tab === 'reminders' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Reminders</h2>
            <p className="text-sm text-stone-400 mt-0.5">Shared reminders with browser notifications and email alerts</p>
          </div>
          <div
            className="rounded-3xl bg-white p-8"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)' }}
          >
            <Reminders events={events} userId={user.id} familyId={family.id} scope="family" onRefresh={load} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

const MEMBER_COLORS = ['#7C5CFC', '#F59E0B', '#10B981', '#F43F5E', '#06B6D4', '#8B5CF6', '#F97316'];

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">{label}</p>
      {children}
    </div>
  );
}

