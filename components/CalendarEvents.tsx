'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent, TodoItem, Goal } from '@/lib/types';
import { addCalendarEvent, deleteCalendarEvent, markEventNotified, toggleTodo, toggleGoal } from '@/lib/store';
import { goalDayToISO } from '@/lib/utils';

interface Props {
  events: CalendarEvent[];
  todos?: TodoItem[];
  goals?: Goal[];
  userId: string;
  familyId?: string;
  scope: 'self' | 'family';
  onRefresh: () => void;
}

type AgendaItem =
  | { kind: 'event'; date: string; data: CalendarEvent }
  | { kind: 'todo';  date: string; data: TodoItem }
  | { kind: 'goal';  date: string; data: Goal };

export default function CalendarEvents({ events, todos = [], goals = [], userId, familyId, scope, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [notifyBefore, setNotifyBefore] = useState('15');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission);
  }, []);

  const checkNotifications = useCallback(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const now = Date.now();
    events.forEach(ev => {
      if (ev.notified) return;
      const eventMs = new Date(`${ev.date}T${ev.time || '00:00'}`).getTime();
      const notifyAt = eventMs - ev.notifyMinutesBefore * 60 * 1000;
      if (now >= notifyAt && now < eventMs + 60_000) {
        new Notification(ev.title, {
          body: `${ev.time ? `at ${ev.time} — ` : ''}${ev.description || 'Upcoming event'}`,
          icon: '/favicon.ico',
        });
        markEventNotified(ev.id);
        onRefresh();
      }
    });
  }, [events, onRefresh]);

  useEffect(() => {
    checkNotifications();
    const timer = setInterval(checkNotifications, 60_000);
    return () => clearInterval(timer);
  }, [checkNotifications]);

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    addCalendarEvent({ title: title.trim(), date, time, description, scope, userId, familyId, notifyMinutesBefore: parseInt(notifyBefore) || 15 });
    setTitle(''); setDate(''); setTime(''); setDescription(''); setNotifyBefore('15');
    setShowForm(false);
    onRefresh();
  }

  // Build unified agenda items
  const agendaItems: AgendaItem[] = [
    ...events.map(ev => ({ kind: 'event' as const, date: ev.date, data: ev })),
    ...todos.map(td => ({ kind: 'todo' as const, date: td.date, data: td })),
    ...goals
      .filter(g => g.day && g.weekNumber !== undefined)
      .map(g => ({
        kind: 'goal' as const,
        date: goalDayToISO(g.weekNumber!, g.year, g.day!),
        data: g,
      })),
  ];

  const today = new Date().toISOString().split('T')[0];
  agendaItems.sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = agendaItems.filter(i => i.date >= today);
  const past     = agendaItems.filter(i => i.date < today);

  // Group by date
  function groupByDate(items: AgendaItem[]): Map<string, AgendaItem[]> {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      const arr = map.get(item.date) ?? [];
      arr.push(item);
      map.set(item.date, arr);
    }
    return map;
  }

  const upcomingGroups = groupByDate(upcoming);
  const pastGroups     = groupByDate(past);

  function formatGroupDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    if (dateStr === today) return 'Today';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-4">
      {notifPermission !== 'granted' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-xl">🔔</span>
          <p className="flex-1 text-sm text-amber-800">Enable notifications to get event reminders</p>
          <button onClick={requestPermission} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition">
            Enable
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-red-100 bg-red-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-red-900">New Event</h3>
          <input
            required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Date</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Time (optional)</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Notify before</label>
            <select value={notifyBefore} onChange={e => setNotifyBefore(e.target.value)}
              className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400"
            >
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="1440">1 day</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition">Cancel</button>
            <button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium text-white transition active:scale-95" style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)' }}>Save</button>
          </div>
        </form>
      )}

      {/* Legend */}
      {agendaItems.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Event</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block" />Daily Task</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />Weekly Goal</span>
        </div>
      )}

      {/* Upcoming agenda */}
      {upcomingGroups.size > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Upcoming</h3>
          {[...upcomingGroups.entries()].map(([dateStr, items]) => (
            <DayGroup key={dateStr} dateStr={dateStr} label={formatGroupDate(dateStr)} items={items} isToday={dateStr === today} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {/* Past agenda */}
      {pastGroups.size > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Past</h3>
          {[...pastGroups.entries()].reverse().map(([dateStr, items]) => (
            <DayGroup key={dateStr} dateStr={dateStr} label={formatGroupDate(dateStr)} items={items} isToday={false} past onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {agendaItems.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-10 text-stone-400">
          <span className="mb-2 text-4xl opacity-30">📅</span>
          <p className="text-sm">No items — add an event or create tasks and goals</p>
        </div>
      )}
    </div>
  );
}

function DayGroup({ dateStr, label, items, isToday, past, onRefresh }: {
  dateStr: string; label: string; items: AgendaItem[]; isToday: boolean; past?: boolean; onRefresh: () => void;
}) {
  return (
    <div className={`rounded-2xl border ${isToday ? 'border-red-200 bg-red-50/40' : 'border-stone-100 bg-white'} shadow-sm overflow-hidden ${past ? 'opacity-60' : ''}`}>
      {/* Date header */}
      <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${isToday ? 'border-red-100 bg-red-50' : 'border-stone-100 bg-stone-50'}`}>
        <div className={`flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg text-center ${isToday ? 'bg-red-600 text-white' : 'bg-stone-200 text-stone-700'}`}>
          <p className="text-[9px] font-bold uppercase leading-none">
            {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
          </p>
          <p className="text-sm font-bold leading-none">
            {new Date(dateStr + 'T12:00:00').getDate()}
          </p>
        </div>
        <p className={`text-sm font-semibold ${isToday ? 'text-red-800' : 'text-stone-700'}`}>{label}</p>
      </div>

      {/* Items */}
      <ul className="divide-y divide-stone-50">
        {items.map((item, idx) => (
          <li key={idx} className="px-4 py-2.5">
            {item.kind === 'event' && <EventRow event={item.data} onDelete={() => { deleteCalendarEvent(item.data.id); onRefresh(); }} past={past} />}
            {item.kind === 'todo'  && <TodoRow  todo={item.data}  onToggle={() => { toggleTodo(item.data.id);  onRefresh(); }} past={past} />}
            {item.kind === 'goal'  && <GoalRow  goal={item.data}  onToggle={() => { toggleGoal(item.data.id);  onRefresh(); }} past={past} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventRow({ event, onDelete, past }: { event: CalendarEvent; onDelete: () => void; past?: boolean }) {
  return (
    <div className="group flex items-center gap-3">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate">{event.title}</p>
        {event.time && <p className="text-xs text-stone-500">{event.time}</p>}
        {event.description && <p className="text-xs text-stone-400 truncate">{event.description}</p>}
      </div>
      <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">Event</span>
      {!past && (
        <button onClick={onDelete} className="hidden shrink-0 text-stone-300 hover:text-red-400 group-hover:block transition">
          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function TodoRow({ todo, onToggle, past }: { todo: TodoItem; onToggle: () => void; past?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        disabled={!!past}
        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-blue-500"
      />
      <p className={`flex-1 text-sm truncate ${todo.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
        {todo.text}
      </p>
      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">Task</span>
    </div>
  );
}

function GoalRow({ goal, onToggle, past }: { goal: Goal; onToggle: () => void; past?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={goal.completed}
        onChange={onToggle}
        disabled={!!past}
        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-emerald-500"
      />
      <p className={`flex-1 text-sm truncate ${goal.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
        {goal.text}
      </p>
      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Goal</span>
    </div>
  );
}
