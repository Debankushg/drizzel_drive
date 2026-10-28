import type { ReactNode } from 'react';
import { FolderIcon } from './Icons';

interface EmptyStateProps {
  title: string;
  text: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, text, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <div className="empty-glow mb-5 flex h-28 w-28 items-center justify-center rounded-full">{icon ?? <FolderIcon size={64} />}</div>
      <h2 className="text-body text-xl font-bold">{title}</h2>
      <p className="text-muted mt-1 max-w-sm text-sm">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton h-44 rounded-2xl" />
      ))}
    </div>
  );
}
