'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push('/dashboard/self');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: '#FAFAF8' }}>
      <div className="w-full max-w-[400px]">

        {/* Brand mark */}
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
            style={{
              background: 'linear-gradient(135deg, #7C5CFC 0%, #9B7FFF 100%)',
              boxShadow: '0 8px 32px rgba(124,92,252,0.28)',
            }}
          >
            🏠
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-stone-500">Sign in to your family planner</p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-8 space-y-5"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)', border: '1px solid #E8E4DC' }}
        >
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-stone-700">Email</label>
            <input
              required type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 placeholder-stone-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-stone-700">Password</label>
            <input
              required type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #6B4EE6 100%)', boxShadow: '0 4px 16px rgba(124,92,252,0.35)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2"/>
                  <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-red-700 hover:text-red-800 transition">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
