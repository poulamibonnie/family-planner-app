'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { setSession, updateUser } from '@/lib/store';

interface Props {
  user: User;
}

export default function Navbar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isSelf = pathname.startsWith('/dashboard/self');
  const isFamily = pathname.startsWith('/dashboard/family');

  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);
  const [displayName, setDisplayName] = useState(user.name);
  const menuRef = useRef<HTMLDivElement>(null);

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

  function logout() {
    setSession(null);
    router.push('/login');
  }

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    updateUser(user.id, { name: trimmed });
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
                isSelf
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
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
                isFamily
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Family
            </Link>
          </div>
        </div>

        {/* User info + avatar menu */}
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
            onClick={logout}
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
