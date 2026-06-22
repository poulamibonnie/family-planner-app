'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth';
import type { User } from '@/lib/types';
import Navbar from '@/components/Navbar';
import { UserContext } from '@/lib/user-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getCurrentUser().then(u => {
      if (!u) { router.replace('/login'); return; }
      setUser(u);
      setReady(true);
    });
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-700 border-t-transparent" />
      </div>
    );
  }

  function handleNameChange(name: string) {
    setUser(prev => prev ? { ...prev, name } : prev);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} onNameChange={handleNameChange} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <UserContext.Provider value={user}>
          {children}
        </UserContext.Provider>
      </main>
    </div>
  );
}
