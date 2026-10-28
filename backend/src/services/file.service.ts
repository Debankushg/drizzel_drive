import { env } from '../config/env';
import { fileRepository } from '../repositories/file.repository';
import { folderRepository } from '../repositories/folder.repository';
import { shareRepository } from '../repositories/share.repository';
import type { FileItem, FileRow } from '../types/drive.types';
import { ApiError } from '../utils/ApiError';
import { ALLOWED_FILE_TYPES, decodeFileName, getExtension, withExtension } from '../utils/fileTypes';
import { uniqueName } from '../utils/uniqueName';
import type { UploadFileInput } from '../validators/drive.validator';
import { toFileItem } from './drive.mapper';
import { folderService } from './folder.service';

export const quotaBytes = () => env.USER_QUOTA_MB * 1024 * 1024;

export const fileService = {
  /** Loads an active (not trashed) file the user owns or throws 404. */
  async getOwned(userId: number, id: number): Promise<FileRow> {
    const file = await fileRepository.findOwned(userId, id);
    if (!file) throw new ApiError(404, 'File not found');
    return file;
  },

  /** Owner, or someone the file (or one of its parent folders) is shared with. Throws 404 otherwise. */
  async getViewable(userId: number, id: number): Promise<FileRow> {
    const file = await fileRepository.findById(id);
    if (!file || file.deletedAt) throw new ApiError(404, 'File not found');
    if (file.userId === userId) return file;

    if (await shareRepository.find(userId, 'file', id)) return file;
    if (file.folderId !== null) {
      const chain = await folderRepository.ancestorChain(file.folderId);
      if (!chain.some((f) => f.deletedAt)) {
        if ((await shareRepository.sharedFolderIds(userId, chain.map((f) => f.id))).length) return file;
      }
    }
    throw new ApiError(404, 'File not found');
  },

  /** `upload` is the file multer already wrote to disk; the caller deletes it if this throws. */
  async create(userId: number, upload: Express.Multer.File, { name, folderId, onConflict }: UploadFileInput): Promise<FileItem> {
    if (folderId !== null) await folderService.getOwned(userId, folderId);

    if ((await fileRepository.totalSize(userId)) + upload.size > quotaBytes()) {
      throw new ApiError(413, 'Storage quota exceeded. Delete some files (and empty the trash) to free up space.');
    }

    const originalName = decodeFileName(upload.originalname);
    const ext = getExtension(originalName);
    const wanted = withExtension(name ?? originalName, ext);

    let displayName = wanted;
    if (await fileRepository.nameExists(userId, folderId, wanted)) {
      if (onConflict !== 'rename') throw ApiError.conflict(`A file named "${wanted}" already exists here`);
      displayName = await uniqueName(wanted, (n) => fileRepository.nameExists(userId, folderId, n));
    }

    const row = await fileRepository.create({
      userId,
      folderId,
      name: displayName,
      storedName: upload.filename,
      mimeType: ALLOWED_FILE_TYPES[ext] ?? 'application/octet-stream',
      size: upload.size,
    });
    return toFileItem(row, userId);
  },

  async rename(userId: number, id: number, name: string): Promise<FileItem> {
    const file = await this.getOwned(userId, id);
    // The extension can't be changed, so a PDF always stays a PDF
    const displayName = withExtension(name, getExtension(file.name));
    if (await fileRepository.nameExists(userId, file.folderId, displayName, id)) {
      throw ApiError.conflict(`A file named "${displayName}" already exists here`);
    }
    return toFileItem(await fileRepository.update(id, { name: displayName }), userId);
  },

  async move(userId: number, id: number, folderId: number | null): Promise<FileItem> {
    const file = await this.getOwned(userId, id);
    if (folderId === file.folderId) return toFileItem(file, userId);
    if (folderId !== null) await folderService.getOwned(userId, folderId);
    if (await fileRepository.nameExists(userId, folderId, file.name, id)) {
      throw ApiError.conflict(`A file named "${file.name}" already exists in that location`);
    }
    return toFileItem(await fileRepository.update(id, { folderId }), userId);
  },

  /** Moves the file to the trash. */
  async trash(userId: number, id: number) {
    await this.getOwned(userId, id);
    await fileRepository.update(id, { deletedAt: new Date() });
  },
};
