'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDriveStore } from '@/store/driveStore';
import { Sidebar } from './Sidebar';
import { Toaster } from './Toaster';
import { TopBar } from './TopBar';

/** Frame around every signed-in page: sidebar, top bar, toasts. Redirects to /login when signed out. */
export function AppShell({ children, showSearch = false }: { children: ReactNode; showSearch?: boolean }) {
  const router = useRouter();
  const { token, hasHydrated } = useAuthStore();
  const refreshStorage = useDriveStore((s) => s.refreshStorage);

  useEffect(() => {
    if (hasHydrated && !token) router.replace('/login');
  }, [hasHydrated, token, router]);

  useEffect(() => {
    if (hasHydrated && token) void refreshStorage();
  }, [hasHydrated, token, refreshStorage]);

  if (!hasHydrated || !token) return null;

  return (
    <div className="bg-royal flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar showSearch={showSearch} />
        <main className="flex-1 px-4 pb-10 md:px-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
