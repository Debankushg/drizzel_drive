import { and, asc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { folders } from '../schemas/folder.schema';
import type { FolderRow } from '../types/drive.types';

const parentFilter = (parentId: number | null) =>
  parentId === null ? isNull(folders.parentId) : eq(folders.parentId, parentId);

export const folderRepository = {
  /** A folder the user owns that is not in the trash. */
  async findOwned(userId: number, id: number): Promise<FolderRow | undefined> {
    const [row] = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, id), eq(folders.userId, userId), isNull(folders.deletedAt)))
      .limit(1);
    return row;
  },

  /** Same, but also finds folders in the trash (used by trash actions). */
  async findOwnedAny(userId: number, id: number): Promise<FolderRow | undefined> {
    const [row] = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, id), eq(folders.userId, userId)))
      .limit(1);
    return row;
  },

  /** No ownership check - callers must authorise (used for shared access). */
  async findById(id: number): Promise<FolderRow | undefined> {
    const [row] = await db.select().from(folders).where(eq(folders.id, id)).limit(1);
    return row;
  },

  /** Every folder of the user, trashed or not. */
  listAll(userId: number): Promise<FolderRow[]> {
    return db.select().from(folders).where(eq(folders.userId, userId));
  },

  listByParent(userId: number, parentId: number | null): Promise<FolderRow[]> {
    return db
      .select()
      .from(folders)
      .where(and(eq(folders.userId, userId), parentFilter(parentId), isNull(folders.deletedAt)))
      .orderBy(asc(folders.name));
  },

  listTrashed(userId: number): Promise<FolderRow[]> {
    return db
      .select()
      .from(folders)
      .where(and(eq(folders.userId, userId), isNotNull(folders.deletedAt)))
      .orderBy(asc(folders.name));
  },

  /** Case-insensitive duplicate check among active siblings. */
  async nameExists(userId: number, parentId: number | null, name: string, excludeId?: number) {
    const [row] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(
        and(
          eq(folders.userId, userId),
          parentFilter(parentId),
          isNull(folders.deletedAt),
          sql`lower(${folders.name}) = lower(${name})`,
          excludeId ? ne(folders.id, excludeId) : undefined,
        ),
      )
      .limit(1);
    return !!row;
  },

  /** An active sub-folder with this name (case-insensitive), if any. */
  async findByName(userId: number, parentId: number | null, name: string): Promise<FolderRow | undefined> {
    const [row] = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.userId, userId),
          parentFilter(parentId),
          isNull(folders.deletedAt),
          sql`lower(${folders.name}) = lower(${name})`,
        ),
      )
      .limit(1);
    return row;
  },

  async create(userId: number, parentId: number | null, name: string): Promise<FolderRow> {
    const [row] = await db.insert(folders).values({ userId, parentId, name }).returning();
    if (!row) throw new Error('Failed to create folder');
    return row;
  },

  async update(id: number, data: Partial<Pick<FolderRow, 'name' | 'parentId' | 'deletedAt'>>): Promise<FolderRow> {
    const [row] = await db
      .update(folders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    if (!row) throw new Error('Failed to update folder');
    return row;
  },

  /** Folder `id` followed by its parents up to the top level (no ownership check). */
  async ancestorChain(id: number): Promise<FolderRow[]> {
    const result = await db.execute(sql`
      WITH RECURSIVE up AS (
        SELECT id FROM folders WHERE id = ${id}
        UNION
        SELECT f.parent_id FROM folders f JOIN up ON f.id = up.id WHERE f.parent_id IS NOT NULL
      )
      SELECT id FROM up
    `);
    const ids = (result.rows as { id: number }[]).map((r) => r.id);
    if (!ids.length) return [];
    const rows = await db.select().from(folders).where(inArray(folders.id, ids));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered: FolderRow[] = [];
    for (let cur = byId.get(id); cur && ordered.length <= ids.length; cur = cur.parentId === null ? undefined : byId.get(cur.parentId)) {
      ordered.push(cur);
    }
    return ordered;
  },

  /** Stored names of every file inside the folder and all of its sub-folders. */
  async collectStoredNames(userId: number, folderId: number): Promise<string[]> {
    const result = await db.execute(sql`
      WITH RECURSIVE tree AS (
        SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${userId}
        UNION ALL
        SELECT f.id FROM folders f JOIN tree t ON f.parent_id = t.id
      )
      SELECT stored_name FROM files WHERE folder_id IN (SELECT id FROM tree)
    `);
    return (result.rows as { stored_name: string }[]).map((r) => r.stored_name);
  },

  /** Sub-folders, files and shares are removed by the ON DELETE CASCADE foreign keys. */
  async delete(id: number) {
    await db.delete(folders).where(eq(folders.id, id));
  },
};
