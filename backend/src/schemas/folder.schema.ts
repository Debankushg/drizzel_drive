import { index, integer, pgTable, serial, timestamp, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const folders = pgTable(
  'folders',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // null = top level ("My Drive"). Deleting a folder deletes its sub-folders.
    parentId: integer('parent_id').references((): AnyPgColumn => folders.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    /** Set when moved to trash; null = active. */
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [index('folders_user_parent_idx').on(t.userId, t.parentId)],
);
