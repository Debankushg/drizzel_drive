import { check, index, integer, pgTable, serial, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { files } from './file.schema';
import { folders } from './folder.schema';
import { users } from './user.schema';

/** A file or folder the owner shared (view-only) with another user. Exactly one of fileId/folderId is set. */
export const shares = pgTable(
  'shares',
  {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: integer('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fileId: integer('file_id').references(() => files.id, { onDelete: 'cascade' }),
    folderId: integer('folder_id').references(() => folders.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('shares_recipient_file_idx').on(t.recipientId, t.fileId),
    uniqueIndex('shares_recipient_folder_idx').on(t.recipientId, t.folderId),
    index('shares_owner_idx').on(t.ownerId),
    check('shares_one_target', sql`(${t.fileId} IS NULL) <> (${t.folderId} IS NULL)`),
  ],
);
