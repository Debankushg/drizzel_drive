import { and, asc, eq, ilike, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { files } from '../schemas/file.schema';
import type { FileRow } from '../types/drive.types';

const folderFilter = (folderId: number | null) =>
  folderId === null ? isNull(files.folderId) : eq(files.folderId, folderId);

export const fileRepository = {
  /** A file the user owns that is not in the trash. */
  async findOwned(userId: number, id: number): Promise<FileRow | undefined> {
    const [row] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, userId), isNull(files.deletedAt)))
      .limit(1);
    return row;
  },

  async findOwnedAny(userId: number, id: number): Promise<FileRow | undefined> {
    const [row] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .limit(1);
    return row;
  },

  /** No ownership check - callers must authorise (used for shared access). */
  async findById(id: number): Promise<FileRow | undefined> {
    const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
    return row;
  },

  listByFolder(userId: number, folderId: number | null): Promise<FileRow[]> {
    return db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), folderFilter(folderId), isNull(files.deletedAt)))
      .orderBy(asc(files.name));
  },

  listTrashed(userId: number): Promise<FileRow[]> {
    return db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), isNotNull(files.deletedAt)))
      .orderBy(asc(files.name));
  },

  /** Active files whose name contains `term` (already LIKE-escaped). */
  search(userId: number, term: string, limit: number): Promise<FileRow[]> {
    return db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), isNull(files.deletedAt), ilike(files.name, `%${term}%`)))
      .orderBy(asc(files.name))
      .limit(limit);
  },

  async nameExists(userId: number, folderId: number | null, name: string, excludeId?: number) {
    const [row] = await db
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          folderFilter(folderId),
          isNull(files.deletedAt),
          sql`lower(${files.name}) = lower(${name})`,
          excludeId ? ne(files.id, excludeId) : undefined,
        ),
      )
      .limit(1);
    return !!row;
  },

  /** Bytes used by all of the user's files, including those in the trash. */
  async totalSize(userId: number): Promise<number> {
    const [row] = await db
      .select({ total: sql<string>`coalesce(sum(${files.size}), 0)` })
      .from(files)
      .where(eq(files.userId, userId));
    return Number(row?.total ?? 0);
  },

  async create(data: typeof files.$inferInsert): Promise<FileRow> {
    const [row] = await db.insert(files).values(data).returning();
    if (!row) throw new Error('Failed to save file');
    return row;
  },

  async update(id: number, data: Partial<Pick<FileRow, 'name' | 'folderId' | 'deletedAt'>>): Promise<FileRow> {
    const [row] = await db
      .update(files)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    if (!row) throw new Error('Failed to update file');
    return row;
  },

  async delete(id: number) {
    await db.delete(files).where(eq(files.id, id));
  },
};
