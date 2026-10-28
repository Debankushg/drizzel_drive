'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface ItemMenuProps {
  actions: MenuAction[];
  /** Accessible name, e.g. the file name. */
  label: string;
  /** Custom button content; defaults to a three-dots icon. */
  trigger?: ReactNode;
  buttonClassName?: string;
  /** Shown above the actions (e.g. the signed-in user). */
  header?: ReactNode;
  /** Lets the parent raise itself above its neighbours while the menu is open. */
  onOpenChange?: (open: boolean) => void;
}

/** Button with a dropdown of actions. Closes on outside click and Escape. */
export function ItemMenu({ actions, label, trigger, buttonClassName, header, onOpenChange }: ItemMenuProps) {
  const [open, setOpenState] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const setOpen = (value: boolean) => {
    setOpenState(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) {
        setOpenState(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={buttonClassName ?? 'icon-btn flex h-8 w-8 items-center justify-center rounded-full transition'}
      >
        {trigger ?? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        )}
      </button>
      {open && (
        <div role="menu" className="menu-panel absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl py-1">
          {header && <div className="border-b border-current/10 px-3 py-2">{header}</div>}
          {actions.map((a) => (
            <button
              key={a.label}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                a.onSelect();
              }}
              className={`${a.danger ? 'menu-item-danger' : 'menu-item'} block w-full px-3 py-2 text-left text-sm`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
