'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth';

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    getCurrentUser().then(user => {
      router.replace(user ? '/dashboard/self' : '/login');
    });
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );
}
