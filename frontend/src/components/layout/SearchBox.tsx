'use client';

import { useDriveStore } from '@/store/driveStore';

export function SearchBox() {
  const query = useDriveStore((s) => s.query);
  const setQuery = useDriveStore((s) => s.setQuery);

  return (
    <div className="search-box relative w-full max-w-xl">
      <svg className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search files and folders"
        aria-label="Search files and folders"
        maxLength={100}
        className="input-field w-full rounded-full py-2.5 pr-10 pl-10 outline-none"
      />
      {query && (
        <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="icon-btn absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full">
          ✕
        </button>
      )}
    </div>
  );
}
