import { fileRepository } from '../repositories/file.repository';
import { folderRepository } from '../repositories/folder.repository';
import type { Breadcrumb, DriveContents, SearchResults, StorageUsage } from '../types/drive.types';
import { escapeLike } from '../utils/uniqueName';
import { toFileItem, toFolderItem } from './drive.mapper';
import { quotaBytes } from './file.service';
import { buildFolderIndex } from './folderIndex';
import { folderService } from './folder.service';

const MAX_DEPTH = 100;
const SEARCH_LIMIT = 50;

export const driveService = {
  /** Contents of a folder (or the top level when folderId is null) plus the path to it. */
  async getContents(userId: number, folderId: number | null): Promise<DriveContents> {
    const current = folderId === null ? null : await folderService.getOwned(userId, folderId);

    const breadcrumbs: Breadcrumb[] = [];
    for (let node = current, depth = 0; node && depth < MAX_DEPTH; depth++) {
      breadcrumbs.unshift({ id: node.id, name: node.name });
      node = node.parentId === null ? null : (await folderRepository.findOwned(userId, node.parentId)) ?? null;
    }

    const [folders, files] = await Promise.all([
      folderRepository.listByParent(userId, folderId),
      fileRepository.listByFolder(userId, folderId),
    ]);

    return {
      folder: current ? toFolderItem(current) : null,
      breadcrumbs,
      folders: folders.map(toFolderItem),
      files: files.map((f) => toFileItem(f, userId)),
    };
  },

  /** Finds the user's folders and files by name, skipping anything in the trash. */
  async search(userId: number, query: string): Promise<SearchResults> {
    const term = escapeLike(query.trim());
    if (!term) return { folders: [], files: [] };

    const allFolders = await folderRepository.listAll(userId);
    const { hidden, pathOf } = buildFolderIndex(allFolders);
    const needle = query.trim().toLowerCase();

    const folders = allFolders
      .filter((f) => !hidden.has(f.id) && f.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, SEARCH_LIMIT)
      .map((f) => ({ ...toFolderItem(f), path: pathOf(f.parentId) }));

    // Over-fetch because hits inside trashed folders are dropped below
    const fileRows = await fileRepository.search(userId, term, SEARCH_LIMIT * 4);
    const files = fileRows
      .filter((f) => f.folderId === null || !hidden.has(f.folderId))
      .slice(0, SEARCH_LIMIT)
      .map((f) => ({ ...toFileItem(f, userId), path: pathOf(f.folderId) }));

    return { folders, files };
  },

  async getStorage(userId: number): Promise<StorageUsage> {
    return { used: await fileRepository.totalSize(userId), quota: quotaBytes() };
  },
};
