'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/actions/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const result = await register(name.trim(), email, password);
    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
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
          <h1 className="text-2xl font-bold text-stone-900">Create Account</h1>
          <p className="mt-1 text-sm text-stone-500">Join FamilyPlanner today</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Full Name</label>
            <input
              required value={name} onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>

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
              placeholder="Min. 6 characters"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #606C5A, #4a5545)' }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-red-700 hover:text-red-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
