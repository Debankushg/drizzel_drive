import { API_URL, ApiRequestError, request } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api.types';
import type { DriveContents, FileItem, FolderItem, SearchResults, StorageUsage, TrashContents } from '@/types/drive.types';
import type { ShareItemType, ShareRecipient, SharedContents } from '@/types/share.types';

/** Same as request() but sends the JWT and signs the user out when it is rejected. */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  try {
    return await request<T>(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) useAuthStore.getState().logout();
    throw err;
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

interface UploadParams {
  file: File;
  name?: string;
  folderId: number | null;
  /** "rename" keeps both files when the name is taken ("a (1).png") instead of failing. */
  onConflict?: 'rename';
  onProgress?: (percent: number) => void;
  /** Aborting cancels the request; the promise then rejects with an AbortError. */
  signal?: AbortSignal;
}

export const driveApi = {
  getContents: (folderId: number | null) =>
    authed<DriveContents>(folderId === null ? '/drive' : `/drive?folderId=${folderId}`),

  search: (q: string) => authed<SearchResults>(`/drive/search?q=${encodeURIComponent(q)}`),
  getStorage: () => authed<StorageUsage>('/drive/storage'),

  getTrash: () => authed<TrashContents>('/trash'),
  restoreFolder: (id: number) => authed<{ folder: FolderItem }>(`/trash/folders/${id}/restore`, { method: 'POST' }),
  restoreFile: (id: number) => authed<{ file: FileItem }>(`/trash/files/${id}/restore`, { method: 'POST' }),
  deleteFolderForever: (id: number) => authed<void>(`/trash/folders/${id}`, { method: 'DELETE' }),
  deleteFileForever: (id: number) => authed<void>(`/trash/files/${id}`, { method: 'DELETE' }),
  emptyTrash: () => authed<void>('/trash', { method: 'DELETE' }),

  getShared: (folderId: number | null) =>
    authed<SharedContents>(folderId === null ? '/shares/with-me' : `/shares/with-me?folderId=${folderId}`),
  getRecipients: async (type: ShareItemType, id: number) =>
    (await authed<{ shares: ShareRecipient[] }>(`/shares/item?type=${type}&id=${id}`)).shares,
  shareItem: async (itemType: ShareItemType, itemId: number, email: string) =>
    (await authed<{ share: ShareRecipient }>('/shares', json('POST', { itemType, itemId, email }))).share,
  revokeShare: (shareId: number) => authed<void>(`/shares/${shareId}`, { method: 'DELETE' }),

  /** Find-or-create nested folders (e.g. ["Photos","2026"]) under `parentId`; returns the last one. */
  ensureFolderPath: (parentId: number | null, path: string[]) =>
    authed<{ folder: FolderItem }>('/folders/ensure-path', json('POST', { parentId, path })),
  createFolder: (name: string, parentId: number | null) =>
    authed<{ folder: FolderItem }>('/folders', json('POST', { name, parentId })),
  renameFolder: (id: number, name: string) =>
    authed<{ folder: FolderItem }>(`/folders/${id}`, json('PATCH', { name })),
  moveFolder: (id: number, parentId: number | null) =>
    authed<{ folder: FolderItem }>(`/folders/${id}/move`, json('PATCH', { parentId })),
  /** Moves to the trash (not permanent). */
  trashFolder: (id: number) => authed<void>(`/folders/${id}`, { method: 'DELETE' }),

  renameFile: (id: number, name: string) =>
    authed<{ file: FileItem }>(`/files/${id}`, json('PATCH', { name })),
  moveFile: (id: number, folderId: number | null) =>
    authed<{ file: FileItem }>(`/files/${id}/move`, json('PATCH', { folderId })),
  /** Moves to the trash (not permanent). */
  trashFile: (id: number) => authed<void>(`/files/${id}`, { method: 'DELETE' }),
  /** Temporary URL usable in <img>, <video> and download links. */
  getFileUrl: async (id: number) => (await authed<{ url: string }>(`/files/${id}/url`)).url,

  /** Uses XMLHttpRequest because fetch can't report upload progress. */
  uploadFile({ file, name, folderId, onConflict, onProgress, signal }: UploadParams): Promise<FileItem> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
      const form = new FormData();
      if (name) form.append('name', name);
      if (folderId !== null) form.append('folderId', String(folderId));
      if (onConflict) form.append('onConflict', onConflict);
      form.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/files`);
      xhr.setRequestHeader('Authorization', `Bearer ${useAuthStore.getState().token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.onabort = () => reject(new DOMException('Cancelled', 'AbortError'));
      xhr.onerror = () => reject(new ApiRequestError('Cannot reach the server. Please try again.'));
      xhr.onload = () => {
        let body: ApiSuccessResponse<{ file: FileItem }> | ApiErrorResponse | null = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* non-JSON response */
        }
        if (xhr.status >= 200 && xhr.status < 300 && body?.success) return resolve(body.data.file);
        if (xhr.status === 401) useAuthStore.getState().logout();
        const err = body && !body.success ? body : null;
        reject(new ApiRequestError(err?.message ?? 'Upload failed', err?.errors, xhr.status));
      };
      xhr.send(form);
    });
  },
};
