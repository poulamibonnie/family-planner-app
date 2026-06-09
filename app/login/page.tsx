'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserByEmail, setSession } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const user = getUserByEmail(email);
    if (!user || user.password !== password) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }
    setSession(user.id);
    router.push('/dashboard/self');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg text-3xl"
            style={{ background: 'linear-gradient(135deg, #4a5545, #2d3829)' }}>
            🌸
          </div>
          <h1 className="text-2xl font-bold text-stone-900">FamilyPlanner</h1>
          <p className="mt-1 text-sm text-stone-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Email</label>
            <input
              required type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Password</label>
            <input
              required type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-red-700 hover:text-red-800">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
