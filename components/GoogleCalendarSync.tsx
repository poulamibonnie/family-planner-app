'use client';

import { useState, useTransition } from 'react';
import type { CalendarEvent } from '@/lib/types';
import { getGoogleAuthUrl, disconnectGoogle, syncGoogleCalendar } from '@/lib/actions/google';
import { shareEventToFamily } from '@/lib/actions/events';

interface Props {
  connected: boolean;
  calendarId: string | null;
  events: CalendarEvent[];
  familyId: string | undefined;
  onRefresh: () => void;
}

export default function GoogleCalendarSync({ connected, calendarId, events, familyId, onRefresh }: Props) {
  const [isPending, startTransition] = useTransition();
  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  async function handleConnect() {
    const url = await getGoogleAuthUrl();
    window.location.href = url;
  }

  function handleSync() {
    startTransition(async () => {
      setSyncMsg(null);
      const result = await syncGoogleCalendar();
      if ('error' in result) {
        setSyncMsg({ type: 'error', text: result.error });
      } else {
        setSyncMsg({ type: 'success', text: `Synced ${result.synced} event${result.synced !== 1 ? 's' : ''} from Google Calendar` });
        onRefresh();
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectGoogle();
      setSyncMsg(null);
      onRefresh();
    });
  }

  async function handleShare(eventId: string) {
    if (!familyId) return;
    setSharingId(eventId);
    await shareEventToFamily(eventId, familyId);
    onRefresh();
    setSharingId(null);
  }

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const past = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  if (!connected) {
    return (
      <div className="flex flex-col items-center py-10 text-center space-y-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-100 text-4xl">
          📅
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-800">Connect Google Calendar</h3>
          <p className="mt-1 text-sm text-stone-500 max-w-sm">
            Sync your Google Calendar events into Self mode. You can then share individual events with your family on request.
          </p>
        </div>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}
        >
          <GoogleIcon />
          Connect Google Calendar
        </button>
        <p className="text-xs text-stone-400">Read-only access — we never modify your Google Calendar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connected header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 border border-red-100">
            <GoogleIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Google Calendar connected</p>
            <p className="text-xs text-stone-400 font-mono">{calendarId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}
          >
            {isPending ? (
              <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Syncing…</>
            ) : (
              <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16"><path d="M13.5 8A5.5 5.5 0 112.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M13.5 4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Sync Now</>
            )}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={isPending}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncMsg && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          syncMsg.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          <span>{syncMsg.type === 'success' ? '✅' : '⚠️'}</span>
          {syncMsg.text}
        </div>
      )}

      {/* No family notice */}
      {!familyId && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>💡</span>
          Join or create a family to share events with them.
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-stone-400">
          <span className="mb-2 text-3xl opacity-30">📅</span>
          <p className="text-sm">No events yet — click Sync Now to import from Google Calendar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Upcoming ({upcoming.length})</h3>
              {upcoming.map(ev => (
                <EventRow key={ev.id} event={ev} familyId={familyId} sharingId={sharingId} onShare={handleShare} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Past ({past.length})</h3>
              {past.map(ev => (
                <EventRow key={ev.id} event={ev} familyId={familyId} sharingId={sharingId} onShare={handleShare} past />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventRow({ event, familyId, sharingId, onShare, past }: {
  event: CalendarEvent;
  familyId: string | undefined;
  sharingId: string | null;
  onShare: (id: string) => void;
  past?: boolean;
}) {
  const shared = !!event.sharedToFamilyAt;
  const isSharing = sharingId === event.id;

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm transition ${past ? 'border-stone-100 bg-white opacity-60' : 'border-stone-100 bg-white'}`}>
      {/* Date badge */}
      <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center min-w-[48px] ${past ? 'bg-stone-100' : 'bg-red-50'}`}>
        <p className={`text-[10px] font-bold uppercase ${past ? 'text-stone-500' : 'text-red-700'}`}>
          {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className={`text-lg font-bold leading-none ${past ? 'text-stone-600' : 'text-red-800'}`}>
          {new Date(event.date + 'T12:00:00').getDate()}
        </p>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate">{event.title}</p>
        <p className="text-xs text-stone-500 mt-0.5">
          {formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}
        </p>
        {event.description && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{event.description}</p>
        )}
      </div>

      {/* Google badge + Share button */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
          <GoogleIcon size={10} /> Google
        </span>
        {!past && familyId && (
          shared ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              ✓ Shared
            </span>
          ) : (
            <button
              onClick={() => onShare(event.id)}
              disabled={isSharing || !!sharingId}
              className="flex items-center gap-1 rounded-xl border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              {isSharing ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 16 16">
                  <path d="M11 5.5a2.5 2.5 0 110-1 2.5 2.5 0 010 1zm-6 3a2.5 2.5 0 110-1 2.5 2.5 0 010 1zm6 3a2.5 2.5 0 110-1 2.5 2.5 0 010 1zM5.5 8.5l5-3M5.5 8.5l5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              )}
              Share with family
            </button>
          )
        )}
      </div>
    </div>
  );
}

function GoogleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
