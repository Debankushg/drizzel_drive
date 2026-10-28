'use client';

import { formatBytes } from '@/lib/format';
import { useDriveStore } from '@/store/driveStore';

export function StorageMeter() {
  const storage = useDriveStore((s) => s.storage);
  if (!storage) return null;

  const percent = Math.min(100, (storage.used / storage.quota) * 100);
  const almostFull = percent >= 90;

  return (
    <div className="px-1">
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-label font-semibold">Storage</span>
        <span className={almostFull ? 'error-text font-semibold' : 'text-muted'}>{Math.round(percent)}% used</span>
      </div>
      <div className="progress-track h-2 overflow-hidden rounded-full" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
        <div className={almostFull ? 'progress-bar-danger h-full' : 'progress-bar h-full'} style={{ width: `${Math.max(percent, storage.used ? 2 : 0)}%` }} />
      </div>
      <p className="text-muted mt-1.5 text-xs">
        {formatBytes(storage.used)} of {formatBytes(storage.quota)}
      </p>
    </div>
  );
}
