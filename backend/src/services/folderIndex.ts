import type { FolderRow } from '../types/drive.types';

type FolderNode = Pick<FolderRow, 'id' | 'name' | 'parentId' | 'deletedAt'>;

const MAX_DEPTH = 100;

/**
 * In-memory view of a user's folder tree. Used to find items hidden by a trashed
 * ancestor and to build readable paths for search results.
 */
export function buildFolderIndex(all: FolderNode[]) {
  const byId = new Map(all.map((f) => [f.id, f]));

  /** Folders from the top level down to `id` (inclusive). */
  const chain = (id: number): FolderNode[] => {
    const out: FolderNode[] = [];
    let cur = byId.get(id);
    for (let depth = 0; cur && depth < MAX_DEPTH; depth++) {
      out.unshift(cur);
      cur = cur.parentId === null ? undefined : byId.get(cur.parentId);
    }
    return out;
  };

  /** Folders that are trashed or sit inside a trashed folder. */
  const hidden = new Set<number>();
  for (const f of all) if (chain(f.id).some((c) => c.deletedAt)) hidden.add(f.id);

  const pathOf = (folderId: number | null) =>
    ['My Drive', ...(folderId === null ? [] : chain(folderId).map((c) => c.name))].join(' / ');

  return { hidden, pathOf };
}
