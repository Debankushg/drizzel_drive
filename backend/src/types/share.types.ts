import type { DriveContents, FileItem, FolderItem } from './drive.types';

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
  breadcrumbs: DriveContents['breadcrumbs'];
  folders: (FolderItem & Partial<ShareMeta>)[];
  files: (FileItem & Partial<ShareMeta>)[];
  /** Owner of the folder being browsed (null at the top level). */
  owner: SharedBy | null;
}

/** A person an item is shared with, as seen by the owner. */
export interface ShareRecipient {
  shareId: number;
  userId: number;
  name: string;
  email: string;
  createdAt: Date;
}
