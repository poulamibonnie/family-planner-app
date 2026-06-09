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
    setMode('idle'); setFamilyName('');
    onFamilyChange();
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const found = joinFamily(joinCode.trim(), user.id);
    if (!found) { setError('Invalid code. Check the code and try again.'); return; }
    updateUser(user.id, { familyId: found.id });
    setMode('idle'); setJoinCode('');
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
    navigator.clipboard.writeText(family.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
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
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const subject = encodeURIComponent(`You're invited to join ${family.name} on FamilyPlanner 🌸`);
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
    window.open(`mailto:${inviteEmails.join(',')}?subject=${subject}&body=${body}`, '_blank');
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
    setInviteEmails([]);
  }

  if (family) {
    const members = getFamilyMembers(family.id);
    return (
      <div className="space-y-4">
        {/* Family code card */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">{family.name}</h2>
              <p className="text-sm text-stone-600">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={handleLeave} className="text-xs text-red-600 hover:text-red-800 transition">
              Leave family
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5">
              <p className="text-xs text-stone-500 mb-0.5">Invite Code</p>
              <p className="font-mono text-lg font-bold tracking-widest text-red-800">{family.code}</p>
            </div>
            <button
              onClick={copyCode}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition active:scale-95 ${
                copied ? 'bg-red-700 text-white' : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Email invite section */}
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📨</span>
            <h3 className="text-sm font-semibold text-stone-700">Invite via Email</h3>
          </div>

          <form onSubmit={addInviteEmail} className="flex gap-2">
            <input
              type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="Enter email address…"
              className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            <button type="submit" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 active:scale-95">
              Add
            </button>
          </form>

          {inviteEmails.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-stone-500">Sending to:</p>
              <div className="flex flex-wrap gap-2">
                {inviteEmails.map(email => (
                  <span key={email} className="flex items-center gap-1.5 rounded-full bg-red-50 border border-red-100 pl-3 pr-2 py-1 text-xs text-red-700">
                    {email}
                    <button onClick={() => removeInviteEmail(email)} className="text-red-400 hover:text-red-700 transition">
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <button
                onClick={sendInvites}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}
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
              <span className="text-lg">✅</span>
              <p className="text-sm text-emerald-700">Email client opened — send it to bring them in!</p>
            </div>
          )}
          <p className="mt-3 text-xs text-stone-400">Opens your email client with a pre-filled invite containing the join code.</p>
        </div>

        {/* Members */}
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Members</h3>
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #4a5545, #2d3829)' }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">
                    {m.name} {m.id === user.id && <span className="text-xs text-stone-400">(you)</span>}
                  </p>
                  <p className="text-xs text-stone-400">{m.email}</p>
                </div>
                {m.id === family.createdBy && (
                  <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Admin</span>
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
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-4xl"
          style={{ background: 'linear-gradient(135deg, #4a5545, #2d3829)' }}>
          🏮
        </div>
        <h2 className="text-lg font-bold text-stone-800">Join or Create a Family</h2>
        <p className="mt-1 text-sm text-stone-500">Collaborate with your family on tasks, meals, and goals</p>

        {mode === 'idle' && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => setMode('create')}
              className="rounded-xl px-6 py-2.5 text-sm font-medium text-white shadow-sm transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}>
              Create a Family
            </button>
            <button onClick={() => setMode('join')}
              className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95">
              Join with Code
            </button>
          </div>
        )}
      </div>

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-red-100 bg-red-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-red-900">Create a New Family</h3>
          <input autoFocus required value={familyName} onChange={e => setFamilyName(e.target.value)}
            placeholder="Family name (e.g. The Smiths)"
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setMode('idle')} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition">Cancel</button>
            <button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium text-white transition active:scale-95" style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}>Create</button>
          </div>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-800">Join with Invite Code</h3>
          <input autoFocus required value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="Enter 6-character code"
            maxLength={6}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-mono uppercase tracking-widest text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setMode('idle'); setError(''); }} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition">Cancel</button>
            <button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium text-white transition active:scale-95" style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}>Join</button>
          </div>
        </form>
      )}
    </div>
  );
}
