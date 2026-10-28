import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

interface ThemeState {
  theme: Theme;
  mounted: boolean;
  /** Reads the theme that the inline script in layout.tsx already applied. */
  init: () => void;
  toggle: () => void;
}

const apply = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable */
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  mounted: false,
  init: () => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    set({ theme: current, mounted: true });
  },
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    apply(next);
    set({ theme: next });
  },
}));
