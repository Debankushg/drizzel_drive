'use client';

import { useToastStore } from '@/store/toastStore';

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'} className={`toast pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm ${t.type === 'error' ? 'toast-error' : ''}`}>
          <span className="flex-1">{t.message}</span>
          {t.onAction && (
            <button
              type="button"
              className="link-gold shrink-0"
              onClick={() => {
                t.onAction?.();
                dismiss(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="icon-btn flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
