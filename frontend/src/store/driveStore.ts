import { create } from 'zustand';
import { ApiRequestError } from '@/lib/api';
import { driveApi } from '@/lib/driveApi';
import type { DriveContents, SearchResults, StorageUsage } from '@/types/drive.types';

interface DriveState {
  contents: DriveContents | null;
  folderId: number | null;
  isLoading: boolean;
  error: string;
  storage: StorageUsage | null;

  query: string;
  results: SearchResults | null;
  isSearching: boolean;

  load: (folderId: number | null) => Promise<void>;
  refreshStorage: () => Promise<void>;
  setQuery: (query: string) => void;

  createFolder: (name: string) => Promise<void>;
  renameFolder: (id: number, name: string) => Promise<void>;
  renameFile: (id: number, name: string) => Promise<void>;
  moveFolder: (id: number, parentId: number | null) => Promise<void>;
  moveFile: (id: number, folderId: number | null) => Promise<void>;
  trashFolder: (id: number) => Promise<void>;
  trashFile: (id: number) => Promise<void>;
  /** Re-fetches the open folder (and search / storage) after something changed elsewhere. */
  refresh: () => Promise<void>;
}

let latestLoad = 0;
let latestSearch = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

export const useDriveStore = create<DriveState>((set, get) => {
  const runSearch = async () => {
    const query = get().query.trim();
    const requestId = ++latestSearch;
    if (!query) return set({ results: null, isSearching: false });
    set({ isSearching: true });
    try {
      const results = await driveApi.search(query);
      if (requestId === latestSearch) set({ results, isSearching: false });
    } catch {
      if (requestId === latestSearch) set({ results: { folders: [], files: [] }, isSearching: false });
    }
  };

  const refresh = async () => {
    await Promise.all([get().load(get().folderId), get().refreshStorage(), get().query.trim() ? runSearch() : undefined]);
  };

  return {
    contents: null,
    folderId: null,
    isLoading: false,
    error: '',
    storage: null,
    query: '',
    results: null,
    isSearching: false,

    load: async (folderId) => {
      const requestId = ++latestLoad;
      set({ folderId, isLoading: true, error: '' });
      try {
        const contents = await driveApi.getContents(folderId);
        if (requestId === latestLoad) set({ contents, isLoading: false });
      } catch (err) {
        if (requestId !== latestLoad) return;
        set({
          contents: null,
          isLoading: false,
          error: err instanceof ApiRequestError ? err.message : 'Could not load your files',
        });
      }
    },

    refreshStorage: async () => {
      try {
        set({ storage: await driveApi.getStorage() });
      } catch {
        /* the meter just keeps its last value */
      }
    },

    /** Search runs 300ms after the user stops typing. */
    setQuery: (query) => {
      set({ query, isSearching: !!query.trim() });
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 300);
    },

    createFolder: async (name) => {
      await driveApi.createFolder(name, get().folderId);
      await refresh();
    },
    renameFolder: async (id, name) => {
      await driveApi.renameFolder(id, name);
      await refresh();
    },
    renameFile: async (id, name) => {
      await driveApi.renameFile(id, name);
      await refresh();
    },
    moveFolder: async (id, parentId) => {
      await driveApi.moveFolder(id, parentId);
      await refresh();
    },
    moveFile: async (id, folderId) => {
      await driveApi.moveFile(id, folderId);
      await refresh();
    },
    trashFolder: async (id) => {
      await driveApi.trashFolder(id);
      await refresh();
    },
    trashFile: async (id) => {
      await driveApi.trashFile(id);
      await refresh();
    },
    refresh,
  };
});
