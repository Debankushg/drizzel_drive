import type { z } from 'zod';
import type { loginSchema, registerSchema } from '../validators/auth.validator';
import type { PublicUser } from './user.types';

/** Validated body of POST /auth/register. */
export type RegisterInput = z.infer<typeof registerSchema>;

/** Validated body of POST /auth/login. */
export type LoginInput = z.infer<typeof loginSchema>;

/** Returned by register and login. */
export interface AuthSession {
  user: PublicUser;
  token: string;
}
