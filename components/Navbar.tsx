'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { logout as logoutAction } from '@/lib/actions/auth';
import { updateUser } from '@/lib/actions/family';
import { getGoogleConnection, disconnectGoogle } from '@/lib/actions/google';

interface Props {
  user: User;
}

export default function Navbar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isSelf   = pathname.startsWith('/dashboard/self');
  const isFamily = pathname.startsWith('/dashboard/family');

  const [showMenu, setShowMenu]       = useState(false);
  const [editing, setEditing]         = useState(false);
  const [nameInput, setNameInput]     = useState(user.name);
  const [displayName, setDisplayName] = useState(user.name);
  const [googleConnected, setGoogleConnected] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGoogleConnection().then(conn => setGoogleConnected(!!conn?.connected));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setEditing(false);
        setNameInput(displayName);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [displayName]);

  async function handleLogout() {
    sessionStorage.removeItem('fp_google_synced');
    await logoutAction();
    router.push('/login');
  }

  async function handleDisconnectGoogle() {
    await disconnectGoogle();
    setGoogleConnected(false);
    setShowMenu(false);
    window.location.reload();
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    await updateUser(user.id, { name: trimmed });
    setDisplayName(trimmed);
    setEditing(false);
    setShowMenu(false);
  }

  return (
    <header className="sticky top-0 z-30 shadow-lg" style={{ background: 'linear-gradient(135deg, #2d3829 0%, #4a5545 60%, #606C5A 100%)' }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/dashboard/self" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-base">
            🌸
          </div>
          <span className="hidden sm:block font-bold text-white tracking-wide">FamilyPlanner</span>
        </Link>

        {/* Mode Toggle */}
        <div className="flex flex-1 justify-center">
          <div className="flex rounded-xl bg-white/10 border border-white/15 p-1 gap-1">
            <Link
              href="/dashboard/self"
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                isSelf ? 'bg-white text-stone-800 shadow-sm' : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Self
            </Link>
            <Link
              href="/dashboard/family"
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                isFamily ? 'bg-white text-stone-800 shadow-sm' : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Family
            </Link>
          </div>
        </div>

        {/* User avatar + dropdown */}
        <div className="relative flex shrink-0 items-center gap-3" ref={menuRef}>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-white leading-none">{displayName}</p>
            <p className="text-xs text-red-300">{user.email}</p>
          </div>

          <button
            onClick={() => { setShowMenu(s => !s); setEditing(false); setNameInput(displayName); }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-800/60 border border-red-600/40 text-sm font-bold text-white hover:bg-red-700/70 transition"
          >
            {displayName.charAt(0).toUpperCase()}
          </button>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Logout
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-11 w-64 rounded-2xl border border-stone-200 bg-white shadow-xl z-50">
              <div className="p-4">
                {!editing ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{displayName}</p>
                      <p className="text-xs text-stone-400">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setEditing(true); setNameInput(displayName); }}
                      className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
                    >
                      Edit name
                    </button>
                  </div>
                ) : (
                  <form onSubmit={saveName} className="space-y-2">
                    <label className="block text-xs font-medium text-stone-600">Display name</label>
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setEditing(false); setNameInput(displayName); }}
                        className="flex-1 rounded-xl border border-stone-200 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 rounded-xl py-2 text-xs font-medium text-white transition active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Google disconnect */}
              {googleConnected && !editing && (
                <div className="border-t border-stone-100 px-4 py-3">
                  <button
                    onClick={handleDisconnectGoogle}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-stone-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <svg width="13" height="13" viewBox="0 0 18 18" fill="none" className="shrink-0">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Disconnect Google Calendar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
