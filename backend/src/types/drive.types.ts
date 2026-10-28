import type { files } from '../schemas/file.schema';
import type { folders } from '../schemas/folder.schema';

export type FolderRow = typeof folders.$inferSelect;
export type FileRow = typeof files.$inferSelect;

/** Folder as sent to clients. */
export interface FolderItem {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  /** Only set for items in the trash. */
  deletedAt: Date | null;
}

/** File as sent to clients (no disk path or owner). */
export interface FileItem {
  id: number;
  name: string;
  mimeType: string;
  size: number;
  folderId: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  /** Signed URL of a small preview image (images and PDFs only). */
  thumbnailUrl: string | null;
}

export interface Breadcrumb {
  id: number;
  name: string;
}

/** Everything shown when opening a folder (or the root). */
export interface DriveContents {
  folder: FolderItem | null;
  breadcrumbs: Breadcrumb[];
  folders: FolderItem[];
  files: FileItem[];
}

export interface StorageUsage {
  used: number;
  quota: number;
}

/** Search hit: the item plus a readable location, e.g. "My Drive / Work / 2026". */
export type WithPath<T> = T & { path: string };

export interface SearchResults {
  folders: WithPath<FolderItem>[];
  files: WithPath<FileItem>[];
}

export interface TrashContents {
  folders: FolderItem[];
  files: FileItem[];
}
