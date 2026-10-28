import { folderRepository } from '../repositories/folder.repository';
import type { FolderItem, FolderRow } from '../types/drive.types';
import { ApiError } from '../utils/ApiError';
import type { CreateFolderInput, EnsurePathInput } from '../validators/drive.validator';
import { toFolderItem } from './drive.mapper';

export const folderService = {
  /** Loads an active (not trashed) folder the user owns or throws 404. */
  async getOwned(userId: number, id: number): Promise<FolderRow> {
    const folder = await folderRepository.findOwned(userId, id);
    if (!folder) throw new ApiError(404, 'Folder not found');
    return folder;
  },

  async create(userId: number, { name, parentId }: CreateFolderInput): Promise<FolderItem> {
    if (parentId !== null) await this.getOwned(userId, parentId);
    if (await folderRepository.nameExists(userId, parentId, name)) {
      throw ApiError.conflict(`A folder named "${name}" already exists here`);
    }
    return toFolderItem(await folderRepository.create(userId, parentId, name));
  },

  /**
   * Walks down `path` from `parentId`, reusing folders that already exist and creating the
   * missing ones. Returns the last folder. Used when uploading a whole folder.
   */
  async ensurePath(userId: number, { parentId, path }: EnsurePathInput): Promise<FolderItem> {
    if (parentId !== null) await this.getOwned(userId, parentId);

    let current: FolderRow | undefined;
    let parent = parentId;
    for (const name of path) {
      current =
        (await folderRepository.findByName(userId, parent, name)) ??
        (await folderRepository.create(userId, parent, name));
      parent = current.id;
    }
    return toFolderItem(current as FolderRow);
  },

  async rename(userId: number, id: number, name: string): Promise<FolderItem> {
    const folder = await this.getOwned(userId, id);
    if (await folderRepository.nameExists(userId, folder.parentId, name, id)) {
      throw ApiError.conflict(`A folder named "${name}" already exists here`);
    }
    return toFolderItem(await folderRepository.update(id, { name }));
  },

  async move(userId: number, id: number, parentId: number | null): Promise<FolderItem> {
    const folder = await this.getOwned(userId, id);
    if (parentId === folder.parentId) return toFolderItem(folder);

    if (parentId !== null) {
      await this.getOwned(userId, parentId);
      // Walking up from the destination must never reach the folder being moved
      const chain = await folderRepository.ancestorChain(parentId);
      if (chain.some((f) => f.id === id)) {
        throw ApiError.badRequest("A folder can't be moved into itself or one of its sub-folders");
      }
    }
    if (await folderRepository.nameExists(userId, parentId, folder.name, id)) {
      throw ApiError.conflict(`A folder named "${folder.name}" already exists in that location`);
    }
    return toFolderItem(await folderRepository.update(id, { parentId }));
  },

  /** Moves the folder (and everything in it) to the trash. */
  async trash(userId: number, id: number) {
    await this.getOwned(userId, id);
    await folderRepository.update(id, { deletedAt: new Date() });
  },
};
