'use client';

import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  /** Blocks closing (Esc / backdrop) while a request is running. */
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}

export function Modal({ title, onClose, busy, wide, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div
      className="modal-backdrop fixed inset-0 z-40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card-gold max-h-[90vh] w-full overflow-y-auto p-6 ${wide ? 'max-w-3xl' : 'max-w-md'}`}
      >
        <h2 className="text-gold mb-4 text-2xl font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
