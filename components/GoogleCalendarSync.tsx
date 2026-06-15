'use client';

import { useState, useTransition } from 'react';
import { getGoogleAuthUrl, disconnectGoogle, syncGoogleCalendar } from '@/lib/actions/google';

interface Props {
  connected: boolean;
  calendarId: string | null;
  onRefresh: () => void;
}

export default function GoogleCalendarSync({ connected, calendarId, onRefresh }: Props) {
  const [isPending, startTransition] = useTransition();
  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        setSyncMsg({
          type: 'success',
          text: `Synced ${result.synced} event${result.synced !== 1 ? 's' : ''} — check Today and Weekly Goals tabs.`,
        });
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

  if (!connected) {
    return (
      <div className="flex flex-col items-center py-10 text-center space-y-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-100 text-4xl">
          📅
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-800">Connect Google Calendar</h3>
          <p className="mt-1 text-sm text-stone-500 max-w-sm">
            Today&apos;s events will appear in the <strong>Today</strong> tab. This week&apos;s events will appear in the <strong>Weekly Goals</strong> tab.
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
        <p className="text-xs text-stone-400">Read-only — we never modify your Google Calendar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connected card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-stone-200 shadow-sm">
            <GoogleIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Connected</p>
            <p className="text-xs text-stone-400 font-mono truncate max-w-[200px]">{calendarId}</p>
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
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                  <path d="M13.5 8A5.5 5.5 0 112.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M13.5 4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sync Now
              </>
            )}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={isPending}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-60"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Result message */}
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

      {/* How it works */}
      <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">How it works</p>
        <div className="flex items-start gap-3">
          <span className="text-lg">🗒️</span>
          <div>
            <p className="text-sm font-medium text-stone-700">Today tab</p>
            <p className="text-xs text-stone-400">Google Calendar events for today appear below your tasks.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-lg">🌸</span>
          <div>
            <p className="text-sm font-medium text-stone-700">Weekly Goals tab</p>
            <p className="text-xs text-stone-400">This week&apos;s events appear below your goals, grouped by day.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-lg">🏮</span>
          <div>
            <p className="text-sm font-medium text-stone-700">Share with family</p>
            <p className="text-xs text-stone-400">Each event has a &quot;Share with family&quot; button to copy it to your family dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
