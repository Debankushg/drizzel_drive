import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    // Toasts with an action (e.g. Undo) stay a little longer
    setTimeout(() => get().dismiss(id), toast.onAction ? 8000 : 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string, action?: { label: string; onClick: () => void }) =>
    useToastStore.getState().push({ message, type: 'success', actionLabel: action?.label, onAction: action?.onClick }),
  error: (message: string) => useToastStore.getState().push({ message, type: 'error' }),
};
