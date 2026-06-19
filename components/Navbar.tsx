'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { logout as logoutAction } from '@/lib/actions/auth';
import { updateUser } from '@/lib/actions/family';
import { getGoogleConnection, disconnectGoogle } from '@/lib/actions/google';

interface Props { user: User; }

export default function Navbar({ user }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const isSelf   = pathname.startsWith('/dashboard/self');
  const isFamily = pathname.startsWith('/dashboard/family');

  const [showMenu, setShowMenu]               = useState(false);
  const [editing, setEditing]                 = useState(false);
  const [nameInput, setNameInput]             = useState(user.name);
  const [displayName, setDisplayName]         = useState(user.name);
  const [googleConnected, setGoogleConnected] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGoogleConnection().then(conn => setGoogleConnected(!!conn?.connected));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setEditing(false);
        setNameInput(displayName);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/dashboard/self" className="flex items-center gap-2.5 shrink-0 group">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl text-base shadow-sm transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #9B7FFF 100%)' }}
          >
            🏠
          </div>
          <span className="hidden sm:block text-sm font-semibold text-stone-900 tracking-tight">Family Planner</span>
        </Link>

        {/* Mode Toggle — centre */}
        <div className="flex flex-1 justify-center">
          <nav className="flex items-center rounded-2xl bg-stone-100 p-1 gap-1">
            <Link
              href="/dashboard/self"
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isSelf ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
              style={isSelf ? { borderBottom: '2px solid #7C5CFC' } : {}}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/>
              </svg>
              <span>My Space</span>
            </Link>
            <Link
              href="/dashboard/family"
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isFamily ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
              style={isFamily ? { borderBottom: '2px solid #7C5CFC' } : {}}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z"/>
              </svg>
              <span>Family</span>
            </Link>
          </nav>
        </div>

        {/* Right — User */}
        <div className="relative flex shrink-0 items-center gap-3" ref={menuRef}>
          <button
            onClick={() => { setShowMenu(s => !s); setEditing(false); setNameInput(displayName); }}
            className="hidden md:flex items-center gap-1 text-sm font-medium text-stone-600 transition hover:text-stone-900"
          >
            <span>{displayName}</span>
            <svg className="h-3.5 w-3.5 text-stone-400" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8.5L1.5 4h9L6 8.5z"/>
            </svg>
          </button>

          <button
            onClick={() => { setShowMenu(s => !s); setEditing(false); setNameInput(displayName); }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #9B7FFF 100%)' }}
          >
            {initial}
          </button>

          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-50 hover:text-stone-700 active:scale-95"
          >
            Sign out
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div
              className="absolute right-0 top-12 w-72 rounded-2xl border border-stone-100 bg-white z-50"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <div className="p-4">
                {!editing ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #7C5CFC, #9B7FFF)' }}
                      >
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 leading-tight">{displayName}</p>
                        <p className="text-xs text-stone-400 mt-0.5 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditing(true); setNameInput(displayName); }}
                      className="w-full flex items-center gap-2.5 rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                        <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                      </svg>
                      Edit display name
                    </button>
                  </>
                ) : (
                  <form onSubmit={saveName} className="space-y-3">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Display name</p>
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditing(false); setNameInput(displayName); }}
                        className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #7C5CFC, #6B4EE6)' }}
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {googleConnected && !editing && (
                <div className="border-t border-stone-50 px-4 py-3">
                  <button
                    onClick={handleDisconnectGoogle}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition"
                  >
                    <GoogleIcon />
                    Disconnect Google Calendar
                  </button>
                </div>
              )}

              <div className="border-t border-stone-50 px-4 py-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-stone-500 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3H13a1 1 0 011 1v8a1 1 0 01-1 1H10M7 11l3-3-3-3M10 8H3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
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
