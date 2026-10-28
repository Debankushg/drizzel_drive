import type { Breadcrumb, FileItem, FolderItem } from './drive.types';

export type ShareItemType = 'file' | 'folder';

export interface SharedBy {
  name: string;
  email: string;
}

/** Extra data on the top-level items in "Shared with me". */
export interface ShareMeta {
  shareId: number;
  sharedBy: SharedBy;
}

export interface SharedContents {
  folder: FolderItem | null;
  breadcrumbs: Breadcrumb[];
  folders: (FolderItem & Partial<ShareMeta>)[];
  files: (FileItem & Partial<ShareMeta>)[];
  owner: SharedBy | null;
}

export interface ShareRecipient {
  shareId: number;
  userId: number;
  name: string;
  email: string;
  createdAt: string;
}
