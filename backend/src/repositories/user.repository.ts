import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { users } from '../schemas/user.schema';
import type { NewUser, User } from '../types/user.types';

export const userRepository = {
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  },

  async findById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  },

  async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    if (!user) throw new Error('Failed to create user');
    return user;
  },
};
