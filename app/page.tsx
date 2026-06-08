'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/store';

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const id = getSession();
    router.replace(id ? '/dashboard/self' : '/login');
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );
}
