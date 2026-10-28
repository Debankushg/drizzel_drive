import { ApiRequestError } from '@/lib/api';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { driveApi } from '@/lib/driveApi';
import { getExtension, stripExtension } from '@/lib/format';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'skipped' | 'failed';

/** A picked or dropped file and the folders it sits in, e.g. ["Photos", "2026"]. */
export interface RawUpload {
  file: File;
  dirs: string[];
}

/** Everything the user picked: files plus every folder (including empty ones). */
export interface UploadSelection {
  files: RawUpload[];
  dirs: string[][];
}

export interface UploadItem extends RawUpload {
  id: number;
  /** Name the file will get (differs from file.name for duplicates or a custom name). */
  name: string;
  status: UploadStatus;
  progress: number;
  message?: string;
}

/** Selection from <input type="file"> - with `webkitdirectory` each file carries its relative path. */
export function selectionFromInput(list: FileList | null): UploadSelection {
  const files = Array.from(list ?? []).map((file) => ({
    file,
    dirs: (file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0, -1) : []).filter(Boolean),
  }));
  return { files, dirs: [] };
}

/** Every folder path to create: all the listed ones plus the parents of each file's folder. */
export function allDirs(selection: UploadSelection): string[][] {
  const seen = new Map<string, string[]>();
  const add = (dirs: string[]) => {
    for (let i = 1; i <= dirs.length; i++) seen.set(dirs.slice(0, i).join('/'), dirs.slice(0, i));
  };
  selection.dirs.forEach(add);
  selection.files.forEach((f) => add(f.dirs));
  return [...seen.values()].sort((a, b) => a.length - b.length);
}

/** Checks each file against the allowed types and size, and renames duplicates within the same folder. */
export function buildItems(files: RawUpload[]): UploadItem[] {
  const taken = new Set<string>();
  return files.map(({ file, dirs }, id) => {
    const base: UploadItem = { id, file, dirs, name: file.name, status: 'pending', progress: 0 };

    if (!ALLOWED_EXTENSIONS.includes(getExtension(file.name))) return { ...base, status: 'skipped', message: 'File type not allowed' };
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return { ...base, status: 'skipped', message: `Larger than ${MAX_FILE_SIZE_MB} MB` };
    if (file.size === 0) return { ...base, status: 'skipped', message: 'File is empty' };

    // Two picked files can share a name (from different places): keep both
    const ext = getExtension(file.name);
    const stem = stripExtension(file.name);
    let name = file.name;
    for (let n = 1; taken.has(`${dirs.join('/')}/${name.toLowerCase()}`); n++) name = `${stem} (${n})${ext}`;
    taken.add(`${dirs.join('/')}/${name.toLowerCase()}`);
    return { ...base, name };
  });
}

interface RunOptions {
  items: UploadItem[];
  /** Folder the upload goes into (null = top level). */
  rootFolderId: number | null;
  /** Folders to create, from allDirs(). */
  dirs: string[][];
  signal: AbortSignal;
  update: (id: number, patch: Partial<UploadItem>) => void;
  concurrency?: number;
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';
const isQuotaError = (err: unknown) => err instanceof ApiRequestError && err.status === 413 && /quota/i.test(err.message);

/**
 * Creates the folder structure, then uploads the pending items a few at a time.
 * Problems are recorded per item, so one bad file never stops the rest -
 * except a full storage, which stops everything.
 */
export async function runUploads({ items, rootFolderId, dirs, signal, update, concurrency = 3 }: RunOptions): Promise<void> {
  const todo = items.filter((i) => i.status === 'pending');

  // 1) Folders first, one at a time (parents before children)
  const folderIds = new Map<string, number | null>([['', rootFolderId]]);
  const folderErrors = new Map<string, string>();
  for (const path of dirs) {
    if (signal.aborted) break;
    const key = path.join('/');
    try {
      const { folder } = await driveApi.ensureFolderPath(rootFolderId, path);
      folderIds.set(key, folder.id);
    } catch (err) {
      folderErrors.set(key, err instanceof ApiRequestError ? err.message : 'Could not create the folder');
    }
  }

  // 2) Files
  let next = 0;
  let stopReason: string | null = null;

  const worker = async () => {
    while (!signal.aborted && !stopReason) {
      const item = todo[next++];
      if (!item) return;

      const key = item.dirs.join('/');
      const failedDir = item.dirs.map((_, i) => item.dirs.slice(0, i + 1).join('/')).find((k) => folderErrors.has(k));
      if (failedDir !== undefined) {
        update(item.id, { status: 'failed', message: folderErrors.get(failedDir) });
        continue;
      }

      update(item.id, { status: 'uploading', progress: 0, message: undefined });
      try {
        await driveApi.uploadFile({
          file: item.file,
          name: item.name !== item.file.name ? item.name : undefined,
          folderId: folderIds.get(key) ?? rootFolderId,
          onConflict: 'rename',
          signal,
          onProgress: (progress) => update(item.id, { progress }),
        });
        update(item.id, { status: 'done', progress: 100 });
      } catch (err) {
        if (isAbort(err)) update(item.id, { status: 'skipped', message: 'Cancelled' });
        else if (isQuotaError(err)) {
          stopReason = 'Storage is full';
          update(item.id, { status: 'failed', message: stopReason });
        } else update(item.id, { status: 'failed', message: err instanceof ApiRequestError ? err.message : 'Upload failed' });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));

  // Anything that never started
  for (const item of todo.slice(next)) {
    update(item.id, signal.aborted ? { status: 'skipped', message: 'Cancelled' } : { status: 'failed', message: stopReason ?? 'Not uploaded' });
  }
}
