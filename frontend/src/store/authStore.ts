import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';
import type { LoginPayload, RegisterPayload } from '@/types/auth.types';
import type { User } from '@/types/user.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hasHydrated: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  /** Used after a social login, where the token comes from the redirect. */
  completeSocialLogin: (token: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      hasHydrated: false,

      register: async (payload) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authApi.register(payload);
          set({ user, token });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (payload) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authApi.login(payload);
          set({ user, token });
        } finally {
          set({ isLoading: false });
        }
      },

      completeSocialLogin: async (token) => {
        const { user } = await authApi.me(token);
        set({ user, token });
      },

      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      // localStorage hydrates synchronously while the store is still being created, when
      // `useAuthStore` doesn't exist yet - so flip the flag on the next tick instead.
      onRehydrateStorage: () => () => queueMicrotask(() => useAuthStore.setState({ hasHydrated: true })),
    },
  ),
);
