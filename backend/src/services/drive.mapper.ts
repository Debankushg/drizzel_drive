import { env } from '../config/env';
import type { FileItem, FileRow, FolderItem, FolderRow } from '../types/drive.types';
import { hasThumbnail } from '../utils/fileTypes';
import { signThumbToken } from '../utils/jwt';

export const toFolderItem = (f: FolderRow): FolderItem => ({
  id: f.id,
  name: f.name,
  parentId: f.parentId,
  createdAt: f.createdAt,
  updatedAt: f.updatedAt,
  deletedAt: f.deletedAt,
});

/** `viewerId` is the user the response is for; it is needed to sign the thumbnail URL. */
export const toFileItem = (f: FileRow, viewerId?: number): FileItem => ({
  id: f.id,
  name: f.name,
  mimeType: f.mimeType,
  size: f.size,
  folderId: f.folderId,
  createdAt: f.createdAt,
  updatedAt: f.updatedAt,
  deletedAt: f.deletedAt,
  thumbnailUrl:
    viewerId !== undefined && !f.deletedAt && hasThumbnail(f.name)
      ? `${env.BACKEND_URL}/api/files/${f.id}/thumbnail?token=${encodeURIComponent(signThumbToken({ fileId: f.id, userId: viewerId }))}`
      : null,
});
