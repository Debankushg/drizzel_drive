import { create } from 'zustand';
import { ApiRequestError } from '@/lib/api';
import { driveApi } from '@/lib/driveApi';
import type { TrashContents } from '@/types/drive.types';
import { useDriveStore } from './driveStore';

interface TrashState {
  contents: TrashContents | null;
  isLoading: boolean;
  error: string;
  load: () => Promise<void>;
  restoreFolder: (id: number) => Promise<void>;
  restoreFile: (id: number) => Promise<void>;
  deleteFolderForever: (id: number) => Promise<void>;
  deleteFileForever: (id: number) => Promise<void>;
  empty: () => Promise<void>;
}

export const useTrashStore = create<TrashState>((set, get) => {
  /** Reload the list and the storage meter (permanent deletes free up space). */
  const refresh = async () => {
    await Promise.all([get().load(), useDriveStore.getState().refreshStorage()]);
  };

  return {
    contents: null,
    isLoading: false,
    error: '',

    load: async () => {
      set({ isLoading: true, error: '' });
      try {
        set({ contents: await driveApi.getTrash(), isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: err instanceof ApiRequestError ? err.message : 'Could not load the trash' });
      }
    },
    restoreFolder: async (id) => {
      await driveApi.restoreFolder(id);
      await refresh();
    },
    restoreFile: async (id) => {
      await driveApi.restoreFile(id);
      await refresh();
    },
    deleteFolderForever: async (id) => {
      await driveApi.deleteFolderForever(id);
      await refresh();
    },
    deleteFileForever: async (id) => {
      await driveApi.deleteFileForever(id);
      await refresh();
    },
    empty: async () => {
      await driveApi.emptyTrash();
      await refresh();
    },
  };
});
