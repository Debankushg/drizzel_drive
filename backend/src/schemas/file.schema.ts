import { bigint, index, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { folders } from './folder.schema';
import { users } from './user.schema';

export const files = pgTable(
  'files',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // null = top level. Deleting a folder deletes the files inside it.
    folderId: integer('folder_id').references(() => folders.id, { onDelete: 'cascade' }),
    /** Name shown to the user (always includes the extension). */
    name: varchar('name', { length: 255 }).notNull(),
    /** Random file name on disk, never user-controlled. */
    storedName: varchar('stored_name', { length: 255 }).notNull().unique(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    /** Set when moved to trash; null = active. */
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [index('files_user_folder_idx').on(t.userId, t.folderId)],
);
