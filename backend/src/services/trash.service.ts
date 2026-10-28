import { fileRepository } from '../repositories/file.repository';
import { folderRepository } from '../repositories/folder.repository';
import type { FileItem, FolderItem, TrashContents } from '../types/drive.types';
import { ApiError } from '../utils/ApiError';
import { filePath, removeFiles, thumbnailPath } from '../utils/storage';
import { uniqueName } from '../utils/uniqueName';
import { toFileItem, toFolderItem } from './drive.mapper';
import { buildFolderIndex } from './folderIndex';

const notFound = () => new ApiError(404, 'Item not found in trash');

export const trashService = {
  /** Items the user trashed directly (items that were inside a trashed folder are not listed separately). */
  async list(userId: number): Promise<TrashContents> {
    const [allFolders, trashedFolders, trashedFiles] = await Promise.all([
      folderRepository.listAll(userId),
      folderRepository.listTrashed(userId),
      fileRepository.listTrashed(userId),
    ]);
    const { hidden } = buildFolderIndex(allFolders);
    return {
      folders: trashedFolders.filter((f) => f.parentId === null || !hidden.has(f.parentId)).map(toFolderItem),
      files: trashedFiles.filter((f) => f.folderId === null || !hidden.has(f.folderId)).map(toFileItem),
    };
  },

  /** Restores to the original location, or to the top level if that folder is gone or trashed. */
  async restoreFolder(userId: number, id: number): Promise<FolderItem> {
    const folder = await folderRepository.findOwnedAny(userId, id);
    if (!folder?.deletedAt) throw notFound();

    const parent = folder.parentId === null ? undefined : await folderRepository.findOwned(userId, folder.parentId);
    const parentId = parent ? folder.parentId : null;
    const name = await uniqueName(folder.name, (n) => folderRepository.nameExists(userId, parentId, n, id));
    return toFolderItem(await folderRepository.update(id, { parentId, name, deletedAt: null }));
  },

  async restoreFile(userId: number, id: number): Promise<FileItem> {
    const file = await fileRepository.findOwnedAny(userId, id);
    if (!file?.deletedAt) throw notFound();

    const parent = file.folderId === null ? undefined : await folderRepository.findOwned(userId, file.folderId);
    const folderId = parent ? file.folderId : null;
    const name = await uniqueName(file.name, (n) => fileRepository.nameExists(userId, folderId, n, id));
    return toFileItem(await fileRepository.update(id, { folderId, name, deletedAt: null }));
  },

  /** Permanently deletes a trashed folder, everything inside it, and the files on disk. */
  async deleteFolderForever(userId: number, id: number) {
    const folder = await folderRepository.findOwnedAny(userId, id);
    if (!folder?.deletedAt) throw notFound();
    const storedNames = await folderRepository.collectStoredNames(userId, id);
    await folderRepository.delete(id);
    await removeFiles(storedNames.flatMap((n) => [filePath(userId, n), thumbnailPath(userId, n)]));
  },

  async deleteFileForever(userId: number, id: number) {
    const file = await fileRepository.findOwnedAny(userId, id);
    if (!file?.deletedAt) throw notFound();
    await fileRepository.delete(id);
    await removeFiles([filePath(userId, file.storedName), thumbnailPath(userId, file.storedName)]);
  },

  async empty(userId: number) {
    const { folders } = await this.list(userId);
    for (const f of folders) await this.deleteFolderForever(userId, f.id);
    // Re-read: files inside the folders above are already gone
    const { files } = await this.list(userId);
    for (const f of files) await this.deleteFileForever(userId, f.id);
  },
};
