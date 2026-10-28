'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/store/uiStore';
import { StorageMeter } from './StorageMeter';

const nav = [
  {
    href: '/drive',
    label: 'My Drive',
    match: (p: string) => p.startsWith('/drive'),
    icon: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  },
  {
    href: '/shared',
    label: 'Shared with me',
    match: (p: string) => p.startsWith('/shared'),
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
        <circle cx="17.5" cy="9" r="2.4" />
        <path d="M17 14.2a5 5 0 0 1 4.5 4.8" />
      </>
    ),
  },
  {
    href: '/trash',
    label: 'Trash',
    match: (p: string) => p.startsWith('/trash'),
    icon: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6" />
        <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
      </>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <>
      {sidebarOpen && <div className="modal-backdrop fixed inset-0 z-30 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />}
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 p-4 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link href="/drive" className="flex items-center gap-2 px-2 pt-1" onClick={() => setSidebarOpen(false)}>
          <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden>
            <defs>
              <linearGradient id="logoGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff1b8" />
                <stop offset="0.5" stopColor="#e8b923" />
                <stop offset="1" stopColor="#8a6508" />
              </linearGradient>
            </defs>
            <path d="M24 4 42 14v20L24 44 6 34V14z" fill="url(#logoGold)" />
            <path d="M24 4v40M6 14l36 20M42 14 6 34" stroke="#2a0f4d" strokeOpacity=".25" />
          </svg>
          <span className="text-gold text-2xl font-extrabold tracking-tight">Drive</span>
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Main">
          {nav.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                aria-current={active ? 'page' : undefined}
                onClick={() => setSidebarOpen(false)}
                className="nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <StorageMeter />
        </div>
      </aside>
    </>
  );
}
