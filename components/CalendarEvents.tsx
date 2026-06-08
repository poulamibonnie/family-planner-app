'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent } from '@/lib/types';
import { addCalendarEvent, deleteCalendarEvent, markEventNotified } from '@/lib/store';

interface Props {
  events: CalendarEvent[];
  userId: string;
  familyId?: string;
  scope: 'self' | 'family';
  onRefresh: () => void;
}

export default function CalendarEvents({ events, userId, familyId, scope, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [notifyBefore, setNotifyBefore] = useState('15');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const checkNotifications = useCallback(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const now = Date.now();
    events.forEach(ev => {
      if (ev.notified) return;
      const eventMs = new Date(`${ev.date}T${ev.time || '00:00'}`).getTime();
      const notifyAt = eventMs - ev.notifyMinutesBefore * 60 * 1000;
      if (now >= notifyAt && now < eventMs + 60_000) {
        new Notification(`📅 ${ev.title}`, {
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
    addCalendarEvent({
      title: title.trim(),
      date,
      time,
      description,
      scope,
      userId,
      familyId,
      notifyMinutesBefore: parseInt(notifyBefore) || 15,
    });
    setTitle(''); setDate(''); setTime(''); setDescription(''); setNotifyBefore('15');
    setShowForm(false);
    onRefresh();
  }

  const sorted = [...events].sort((a, b) => {
    const da = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const db = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return da - db;
  });

  const today = new Date().toISOString().split('T')[0];
  const upcoming = sorted.filter(e => e.date >= today);
  const past = sorted.filter(e => e.date < today);

  function formatEventDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  return (
    <div className="space-y-4">
      {notifPermission !== 'granted' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="flex-1 text-sm text-amber-800">Enable notifications to get event reminders</p>
          <button onClick={requestPermission} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition">
            Enable
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-indigo-800">New Event</h3>
          <input
            required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input
                required type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Time (optional)</label>
              <input
                type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)" rows={2}
            className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none resize-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notify me (minutes before)</label>
            <select
              value={notifyBefore} onChange={e => setNotifyBefore(e.target.value)}
              className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
            >
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="1440">1 day</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition active:scale-95">
              Save
            </button>
          </div>
        </form>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming</h3>
          {upcoming.map(ev => <EventCard key={ev.id} event={ev} formatDate={formatEventDate} onDelete={() => { deleteCalendarEvent(ev.id); onRefresh(); }} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Past</h3>
          {past.map(ev => <EventCard key={ev.id} event={ev} formatDate={formatEventDate} past onDelete={() => { deleteCalendarEvent(ev.id); onRefresh(); }} />)}
        </div>
      )}

      {events.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-10 text-slate-400">
          <svg className="mb-2 h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm">No events — add one above</p>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, formatDate, past, onDelete }: {
  event: CalendarEvent;
  formatDate: (d: string) => string;
  past?: boolean;
  onDelete: () => void;
}) {
  return (
    <div className={`group flex items-start gap-4 rounded-2xl border px-4 py-3 shadow-sm transition ${past ? 'border-slate-100 bg-white opacity-60' : 'border-indigo-100 bg-white'}`}>
      <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center min-w-[52px] ${past ? 'bg-slate-100' : 'bg-indigo-50'}`}>
        <p className={`text-xs font-bold uppercase ${past ? 'text-slate-500' : 'text-indigo-600'}`}>
          {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className={`text-xl font-bold leading-none ${past ? 'text-slate-600' : 'text-indigo-700'}`}>
          {new Date(event.date + 'T00:00:00').getDate()}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{event.title}</p>
        {event.time && <p className="text-xs text-slate-500">{event.time}</p>}
        {event.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{event.description}</p>}
        <p className="text-xs text-slate-400 mt-1">Notify {event.notifyMinutesBefore} min before</p>
      </div>
      <button onClick={onDelete} className="hidden shrink-0 text-slate-300 hover:text-red-400 group-hover:block transition mt-0.5">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
