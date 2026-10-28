'use client';

import { useUiStore, type ViewMode } from '@/store/uiStore';

const icons: Record<ViewMode, React.ReactNode> = {
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  list: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="4" width="18" height="3" rx="1.5" />
      <rect x="3" y="10.5" width="18" height="3" rx="1.5" />
      <rect x="3" y="17" width="18" height="3" rx="1.5" />
    </svg>
  ),
};

export function ViewToggle() {
  const { viewMode, setViewMode } = useUiStore();
  return (
    <div className="view-toggle flex rounded-lg p-0.5" role="group" aria-label="View mode">
      {(['grid', 'list'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={viewMode === mode}
          aria-label={`${mode} view`}
          data-active={viewMode === mode}
          onClick={() => setViewMode(mode)}
          className="view-toggle-btn flex h-8 w-9 items-center justify-center rounded-md transition"
        >
          {icons[mode]}
        </button>
      ))}
    </div>
  );
}
