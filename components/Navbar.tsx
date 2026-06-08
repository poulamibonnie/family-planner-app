'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { setSession } from '@/lib/store';

interface Props {
  user: User;
}

export default function Navbar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isSelf = pathname.startsWith('/dashboard/self');
  const isFamily = pathname.startsWith('/dashboard/family');

  function logout() {
    setSession(null);
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 shadow-lg" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #7f1d1d 60%, #991b1b 100%)' }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">

        {/* Logo */}
        <Link href="/dashboard/self" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-base">
            🌸
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-white tracking-wide">FamilyPlanner</span>
            <span className="ml-2 text-xs text-red-300 font-medium">家族</span>
          </div>
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

        {/* User info + logout */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-white leading-none">{user.name}</p>
            <p className="text-xs text-red-300">{user.email}</p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-800/60 border border-red-600/40 text-sm font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
