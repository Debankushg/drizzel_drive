import { and, eq } from 'drizzle-orm';
import { db } from '../config/database';
import { oauthAccounts } from '../schemas/oauth-account.schema';
import { users } from '../schemas/user.schema';
import type { OAuthProviderName } from '../types/oauth.types';
import type { User } from '../types/user.types';

export const oauthRepository = {
  async findUserByAccount(provider: OAuthProviderName, providerAccountId: string): Promise<User | undefined> {
    const [row] = await db
      .select({ user: users })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerAccountId, providerAccountId)))
      .limit(1);
    return row?.user;
  },

  async linkAccount(userId: number, provider: OAuthProviderName, providerAccountId: string) {
    await db
      .insert(oauthAccounts)
      .values({ userId, provider, providerAccountId })
      .onConflictDoNothing();
  },

  /** Creates a password-less user and its provider link atomically. */
  async createUserWithAccount(
    data: { name: string; email: string },
    provider: OAuthProviderName,
    providerAccountId: string,
  ): Promise<User> {
    return db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(data).returning();
      if (!user) throw new Error('Failed to create user');
      await tx.insert(oauthAccounts).values({ userId: user.id, provider, providerAccountId });
      return user;
    });
  },
};
