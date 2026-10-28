'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/** Entry point: send people to their drive, or to the login page. */
export default function HomePage() {
  const router = useRouter();
  const { token, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated) router.replace(token ? '/drive' : '/login');
  }, [hasHydrated, token, router]);

  return null;
}
