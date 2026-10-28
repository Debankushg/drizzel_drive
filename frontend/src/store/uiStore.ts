import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'grid' | 'list';

interface UiState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Mobile sidebar drawer. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      setViewMode: (viewMode) => set({ viewMode }),
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: 'ui', partialize: (s) => ({ viewMode: s.viewMode }) },
  ),
);
