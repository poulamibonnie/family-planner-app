'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/actions/auth';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const result = await resetPassword(token, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/login'), 3000);
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-stone-600">This reset link is missing a token.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-red-700 hover:text-red-800 transition">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={{ background: 'linear-gradient(135deg, #7C5CFC22 0%, #9B7FFF22 100%)' }}
        >
          ✅
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">
          Your password has been updated. Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
          </svg>
          <span>
            {error}{' '}
            {error.includes('expired') && (
              <Link href="/forgot-password" className="underline font-semibold">
                Request a new one
              </Link>
            )}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-stone-700">New password</label>
        <input
          required type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-stone-700">Confirm new password</label>
        <input
          required type="password" value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Re-enter your new password"
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
            Updating…
          </span>
        ) : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: '#FAFAF8' }}>
      <div className="w-full max-w-[400px]">

        {/* Brand mark */}
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
            style={{
              background: 'linear-gradient(135deg, #7C5CFC 0%, #9B7FFF 100%)',
              boxShadow:  '0 8px 32px rgba(124,92,252,0.28)',
            }}
          >
            🏠
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Set a new password</h1>
          <p className="mt-2 text-sm text-stone-500">Choose something you&apos;ll remember</p>
        </div>

        <div
          className="rounded-3xl bg-white p-8"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)', border: '1px solid #E8E4DC' }}
        >
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          Back to{' '}
          <Link href="/login" className="font-semibold text-red-700 hover:text-red-800 transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
