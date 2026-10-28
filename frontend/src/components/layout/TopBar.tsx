'use client';

import { useRouter } from 'next/navigation';
import { ItemMenu } from '@/components/drive/ItemMenu';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { SearchBox } from './SearchBox';

export function TopBar({ showSearch }: { showSearch: boolean }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  return (
    // Right padding leaves room for the fixed theme toggle
    <header className="topbar sticky top-0 z-20 flex items-center gap-3 px-4 py-3 pr-[4.5rem] md:px-6 md:pr-[4.5rem]">
      <button type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)} className="icon-btn flex h-10 w-10 items-center justify-center rounded-full md:hidden">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex flex-1 justify-center md:justify-start">{showSearch && <SearchBox />}</div>

      <ItemMenu
        label="your account"
        buttonClassName="avatar flex h-10 w-10 items-center justify-center rounded-full text-base font-bold"
        trigger={user?.name.trim().charAt(0).toUpperCase() || '?'}
        header={
          <>
            <p className="text-body truncate text-sm font-semibold">{user?.name}</p>
            <p className="text-muted truncate text-xs">{user?.email}</p>
          </>
        }
        actions={[
          {
            label: 'Log out',
            onSelect: () => {
              logout();
              router.replace('/login');
            },
          },
        ]}
      />
    </header>
  );
}
