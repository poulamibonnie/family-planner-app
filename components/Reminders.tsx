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

export default function Reminders({ events, userId, familyId, scope, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [notifyBefore, setNotifyBefore] = useState('15');
  const [reminderEmail, setReminderEmail] = useState('');
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
          body: `${ev.time ? `at ${ev.time} — ` : ''}${ev.description || 'Upcoming reminder'}`,
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

  function buildMailto(ev: CalendarEvent): string {
    const email = ev.reminderEmail ?? '';
    const subject = encodeURIComponent(`Reminder: ${ev.title}`);
    const dateStr = new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const body = encodeURIComponent(
      `Hi,\n\nThis is a reminder for: ${ev.title}\n` +
      `Date: ${dateStr}${ev.time ? `\nTime: ${ev.time}` : ''}\n` +
      `${ev.description ? `\nNotes: ${ev.description}\n` : ''}` +
      `\nCreated in FamilyPlanner.`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    const email = reminderEmail.trim();
    addCalendarEvent({
      title: title.trim(), date, time, description, scope, userId, familyId,
      notifyMinutesBefore: parseInt(notifyBefore) || 15,
      reminderEmail: email || undefined,
    });
    // If email provided, open mailto immediately ("send when set")
    if (email) {
      const subject = encodeURIComponent(`Reminder: ${title.trim()}`);
      const dateStr = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const body = encodeURIComponent(
        `Hi,\n\nThis is a reminder for: ${title.trim()}\n` +
        `Date: ${dateStr}${time ? `\nTime: ${time}` : ''}\n` +
        `${description ? `\nNotes: ${description}\n` : ''}` +
        `\nCreated in FamilyPlanner.`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    }
    setTitle(''); setDate(''); setTime(''); setDescription(''); setNotifyBefore('15'); setReminderEmail('');
    setShowForm(false);
    onRefresh();
  }

  const today = new Date().toISOString().split('T')[0];
  const sorted = [...events].sort((a, b) =>
    new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime()
  );
  const upcoming = sorted.filter(e => e.date >= today);
  const past     = sorted.filter(e => e.date <  today);

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="space-y-5">
      {notifPermission !== 'granted' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-xl">🔔</span>
          <p className="flex-1 text-sm text-amber-800">Enable browser notifications to receive reminder alerts</p>
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
          New Reminder
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-red-100 bg-red-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-red-900">Create Reminder</h3>

          <input
            required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Reminder title"
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

          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes (optional)" rows={2}
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Email reminder (optional)</label>
              <input type="email" value={reminderEmail} onChange={e => setReminderEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          {reminderEmail.trim() && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <span>📧</span>
              An email reminder will be sent to <strong>{reminderEmail.trim()}</strong> when you save.
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition">
              Cancel
            </button>
            <button type="submit"
              className="rounded-xl px-4 py-2 text-sm font-medium text-white transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)' }}>
              Save{reminderEmail.trim() ? ' & Send Email' : ''}
            </button>
          </div>
        </form>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Upcoming</h3>
          {upcoming.map(ev => (
            <ReminderCard key={ev.id} event={ev} formatDate={formatDate} mailto={buildMailto(ev)}
              onDelete={() => { deleteCalendarEvent(ev.id); onRefresh(); }} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Past</h3>
          {past.map(ev => (
            <ReminderCard key={ev.id} event={ev} formatDate={formatDate} mailto={buildMailto(ev)} past
              onDelete={() => { deleteCalendarEvent(ev.id); onRefresh(); }} />
          ))}
        </div>
      )}

      {events.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-10 text-stone-400">
          <span className="mb-2 text-4xl opacity-30">🔔</span>
          <p className="text-sm">No reminders yet — create one above</p>
        </div>
      )}
    </div>
  );
}

function ReminderCard({ event, formatDate, mailto, past, onDelete }: {
  event: CalendarEvent; formatDate: (d: string) => string; mailto: string; past?: boolean; onDelete: () => void;
}) {
  return (
    <div className={`group rounded-2xl border px-4 py-3 shadow-sm transition ${past ? 'border-stone-100 bg-white opacity-60' : 'border-red-100 bg-white'}`}>
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center min-w-[52px] ${past ? 'bg-stone-100' : 'bg-red-50'}`}>
          <p className={`text-xs font-bold uppercase ${past ? 'text-stone-500' : 'text-red-700'}`}>
            {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
          </p>
          <p className={`text-xl font-bold leading-none ${past ? 'text-stone-600' : 'text-red-800'}`}>
            {new Date(event.date + 'T12:00:00').getDate()}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800">{event.title}</p>
          <p className="text-xs text-stone-500 mt-0.5">{formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}</p>
          {event.description && <p className="text-xs text-stone-400 mt-0.5 truncate">{event.description}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-stone-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 16 16"><path d="M8 3v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/></svg>
              {event.notifyMinutesBefore < 60
                ? `${event.notifyMinutesBefore} min before`
                : event.notifyMinutesBefore === 60 ? '1 hour before' : '1 day before'}
            </span>
            {event.reminderEmail && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <span>📧</span>{event.reminderEmail}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-1.5 items-end">
          {event.reminderEmail && (
            <a href={mailto} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition">
              <span>📧</span> Send Email
            </a>
          )}
          <button onClick={onDelete}
            className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-400 hover:border-red-200 hover:text-red-500 transition">
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
