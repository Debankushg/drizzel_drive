import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from './env';
import * as fileSchema from '../schemas/file.schema';
import * as folderSchema from '../schemas/folder.schema';
import * as oauthSchema from '../schemas/oauth-account.schema';
import * as shareSchema from '../schemas/share.schema';
import * as userSchema from '../schemas/user.schema';

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema: { ...userSchema, ...oauthSchema, ...folderSchema, ...fileSchema, ...shareSchema } });
