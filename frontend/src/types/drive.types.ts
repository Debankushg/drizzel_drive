export interface FolderItem {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FileItem {
  id: number;
  name: string;
  mimeType: string;
  size: number;
  folderId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Small preview image for images and PDFs. */
  thumbnailUrl?: string | null;
}

export interface Breadcrumb {
  id: number;
  name: string;
}

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

/** Search hit plus its location, e.g. "My Drive / Work". */
export type WithPath<T> = T & { path: string };

export interface SearchResults {
  folders: WithPath<FolderItem>[];
  files: WithPath<FileItem>[];
}

export interface TrashContents {
  folders: FolderItem[];
  files: FileItem[];
}
