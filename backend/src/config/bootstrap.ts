import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import { db } from './database';
import { env } from './env';

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

/** Creates the target database if it does not exist yet. */
const ensureDatabase = async () => {
  const url = new URL(env.DATABASE_URL);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  if (!dbName) throw new Error('DATABASE_URL must include a database name');

  // Connect to the maintenance database to be able to run CREATE DATABASE
  url.pathname = '/postgres';
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!rowCount) {
      await admin.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
      console.log(`Database "${dbName}" created`);
    }
  } finally {
    await admin.end();
  }
};

/** Creates the database (if missing) and applies pending Drizzle migrations. */
export const setupDatabase = async () => {
  await ensureDatabase();
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  console.log('Database migrations applied');
};
