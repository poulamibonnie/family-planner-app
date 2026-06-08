'use client';

import { useState } from 'react';
import type { User, Family } from '@/lib/types';
import { createFamily, joinFamily, updateUser, leaveFamily, getFamilyMembers } from '@/lib/store';

interface Props {
  user: User;
  family: Family | undefined;
  onFamilyChange: () => void;
}

export default function FamilyManager({ user, family, onFamilyChange }: Props) {
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailSent, setEmailSent] = useState(false);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) return;
    const newFamily = createFamily(familyName.trim(), user.id);
    updateUser(user.id, { familyId: newFamily.id });
    setMode('idle');
    setFamilyName('');
    onFamilyChange();
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const found = joinFamily(joinCode.trim(), user.id);
    if (!found) { setError('Invalid code. Check the code and try again.'); return; }
    updateUser(user.id, { familyId: found.id });
    setMode('idle');
    setJoinCode('');
    onFamilyChange();
  }

  function handleLeave() {
    if (!family) return;
    leaveFamily(family.id, user.id);
    updateUser(user.id, { familyId: undefined });
    onFamilyChange();
  }

  function copyCode() {
    if (!family) return;
    navigator.clipboard.writeText(family.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function addInviteEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed || inviteEmails.includes(trimmed)) return;
    setInviteEmails(prev => [...prev, trimmed]);
    setInviteEmail('');
  }

  function removeInviteEmail(email: string) {
    setInviteEmails(prev => prev.filter(e => e !== email));
  }

  function sendInvites() {
    if (!family || inviteEmails.length === 0) return;
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const subject = encodeURIComponent(`You're invited to join ${family.name} on FamilyPlanner`);
    const body = encodeURIComponent(
      `Hi there!\n\n` +
      `${user.name} has invited you to join "${family.name}" on FamilyPlanner — a shared space for family tasks, goals, meal planning, and more.\n\n` +
      `To join:\n` +
      `1. Go to ${appUrl}/register and create a free account\n` +
      `2. Switch to Family mode\n` +
      `3. Click "Join with Code" and enter: ${family.code}\n\n` +
      `See you there!\n` +
      `— ${user.name}`
    );
    const mailto = `mailto:${inviteEmails.join(',')}?subject=${subject}&body=${body}`;
    window.open(mailto, '_blank');
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
    setInviteEmails([]);
  }

  if (family) {
    const members = getFamilyMembers(family.id);
    return (
      <div className="space-y-4">
        {/* Family code card */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-emerald-900">{family.name}</h2>
              <p className="text-sm text-emerald-700">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={handleLeave} className="text-xs text-red-500 hover:text-red-700 transition">
              Leave family
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Invite Code</p>
              <p className="font-mono text-lg font-bold tracking-widest text-emerald-700">{family.code}</p>
            </div>
            <button
              onClick={copyCode}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition active:scale-95 ${
                copied ? 'bg-emerald-600 text-white' : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Email invite section */}
        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-700">Invite via Email</h3>
          </div>

          <form onSubmit={addInviteEmail} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Enter email address…"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="submit"
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 active:scale-95"
            >
              Add
            </button>
          </form>

          {inviteEmails.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500">Sending to:</p>
              <div className="flex flex-wrap gap-2">
                {inviteEmails.map(email => (
                  <span key={email} className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 pl-3 pr-2 py-1 text-xs text-indigo-700">
                    {email}
                    <button onClick={() => removeInviteEmail(email)} className="text-indigo-400 hover:text-indigo-700 transition">
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <button
                onClick={sendInvites}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Send {inviteEmails.length} Invite{inviteEmails.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {emailSent && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-emerald-700">Your email client opened with the invite — send it to bring them in!</p>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Opens your email client with a pre-filled invite containing the join code.
          </p>
        </div>

        {/* Members list */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Members</h3>
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {m.name} {m.id === user.id && <span className="text-xs text-slate-400">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </div>
                {m.id === family.createdBy && (
                  <span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Admin</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Join or Create a Family</h2>
        <p className="mt-1 text-sm text-slate-500">Collaborate on shared tasks, meals, and goals with your family.</p>

        {mode === 'idle' && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => setMode('create')}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
            >
              Create a Family
            </button>
            <button
              onClick={() => setMode('join')}
              className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              Join with Code
            </button>
          </div>
        )}
      </div>

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-indigo-800">Create a New Family</h3>
          <input
            autoFocus required value={familyName} onChange={e => setFamilyName(e.target.value)}
            placeholder="Family name (e.g. The Smiths)"
            className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setMode('idle')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition active:scale-95">Create</button>
          </div>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="rounded-2xl border border-violet-100 bg-violet-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-violet-800">Join with Invite Code</h3>
          <input
            autoFocus required value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="Enter 6-character code"
            maxLength={6}
            className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-mono uppercase tracking-widest text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setMode('idle'); setError(''); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition active:scale-95">Join</button>
          </div>
        </form>
      )}
    </div>
  );
}
