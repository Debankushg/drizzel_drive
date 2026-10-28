import { create } from 'zustand';
import { ApiRequestError } from '@/lib/api';
import { driveApi } from '@/lib/driveApi';
import type { SharedContents } from '@/types/share.types';

interface SharedState {
  contents: SharedContents | null;
  folderId: number | null;
  isLoading: boolean;
  error: string;
  load: (folderId: number | null) => Promise<void>;
  /** Removes a share from "Shared with me" (the owner's file is untouched). */
  removeShare: (shareId: number) => Promise<void>;
}

let latestLoad = 0;

export const useSharedStore = create<SharedState>((set, get) => ({
  contents: null,
  folderId: null,
  isLoading: false,
  error: '',

  load: async (folderId) => {
    const requestId = ++latestLoad;
    set({ folderId, isLoading: true, error: '' });
    try {
      const contents = await driveApi.getShared(folderId);
      if (requestId === latestLoad) set({ contents, isLoading: false });
    } catch (err) {
      if (requestId !== latestLoad) return;
      set({ contents: null, isLoading: false, error: err instanceof ApiRequestError ? err.message : 'Could not load shared items' });
    }
  },

  removeShare: async (shareId) => {
    await driveApi.revokeShare(shareId);
    await get().load(get().folderId);
  },
}));
