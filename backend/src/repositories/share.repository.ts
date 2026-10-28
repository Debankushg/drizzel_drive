import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../config/database';
import { files } from '../schemas/file.schema';
import { folders } from '../schemas/folder.schema';
import { shares } from '../schemas/share.schema';
import { users } from '../schemas/user.schema';
import type { FileRow, FolderRow } from '../types/drive.types';
import type { ShareItemType, SharedBy } from '../types/share.types';

type ShareRow = typeof shares.$inferSelect;

export const shareRepository = {
  async findById(id: number): Promise<ShareRow | undefined> {
    const [row] = await db.select().from(shares).where(eq(shares.id, id)).limit(1);
    return row;
  },

  async find(recipientId: number, type: ShareItemType, itemId: number): Promise<ShareRow | undefined> {
    const target = type === 'file' ? eq(shares.fileId, itemId) : eq(shares.folderId, itemId);
    const [row] = await db
      .select()
      .from(shares)
      .where(and(eq(shares.recipientId, recipientId), target))
      .limit(1);
    return row;
  },

  async create(ownerId: number, recipientId: number, type: ShareItemType, itemId: number): Promise<ShareRow> {
    const [row] = await db
      .insert(shares)
      .values({
        ownerId,
        recipientId,
        fileId: type === 'file' ? itemId : null,
        folderId: type === 'folder' ? itemId : null,
      })
      .returning();
    if (!row) throw new Error('Failed to create share');
    return row;
  },

  async delete(id: number) {
    await db.delete(shares).where(eq(shares.id, id));
  },

  /** People a given item is shared with. */
  listRecipients(ownerId: number, type: ShareItemType, itemId: number) {
    const target = type === 'file' ? eq(shares.fileId, itemId) : eq(shares.folderId, itemId);
    return db
      .select({ shareId: shares.id, userId: users.id, name: users.name, email: users.email, createdAt: shares.createdAt })
      .from(shares)
      .innerJoin(users, eq(users.id, shares.recipientId))
      .where(and(eq(shares.ownerId, ownerId), target))
      .orderBy(desc(shares.createdAt));
  },

  /** Folders shared with the user that still exist outside the trash. */
  async listFoldersForRecipient(recipientId: number): Promise<{ shareId: number; folder: FolderRow; owner: SharedBy }[]> {
    const rows = await db
      .select({ shareId: shares.id, folder: folders, owner: { name: users.name, email: users.email } })
      .from(shares)
      .innerJoin(folders, eq(folders.id, shares.folderId))
      .innerJoin(users, eq(users.id, shares.ownerId))
      .where(and(eq(shares.recipientId, recipientId), isNull(folders.deletedAt)));
    return rows;
  },

  async listFilesForRecipient(recipientId: number): Promise<{ shareId: number; file: FileRow; owner: SharedBy }[]> {
    const rows = await db
      .select({ shareId: shares.id, file: files, owner: { name: users.name, email: users.email } })
      .from(shares)
      .innerJoin(files, eq(files.id, shares.fileId))
      .innerJoin(users, eq(users.id, shares.ownerId))
      .where(and(eq(shares.recipientId, recipientId), isNull(files.deletedAt)));
    return rows;
  },

  /** IDs (out of `folderIds`) that are shared with the recipient. */
  async sharedFolderIds(recipientId: number, folderIds: number[]): Promise<number[]> {
    if (!folderIds.length) return [];
    const rows = await db
      .select({ folderId: shares.folderId })
      .from(shares)
      .where(and(eq(shares.recipientId, recipientId), inArray(shares.folderId, folderIds)));
    return rows.map((r) => r.folderId as number);
  },
};
