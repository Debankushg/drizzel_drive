import type { users } from '../schemas/user.schema';

/** A full user row as stored in the database (includes the password hash). */
export type User = typeof users.$inferSelect;

/** Data required to insert a new user row. */
export type NewUser = typeof users.$inferInsert;

/** A user that is safe to send to clients (no password). */
export type PublicUser = Omit<User, 'password'>;
