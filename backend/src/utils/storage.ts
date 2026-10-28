import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';

export const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

export const userUploadDir = (userId: number) => path.join(uploadRoot, String(userId));

export const filePath = (userId: number, storedName: string) =>
  path.join(userUploadDir(userId), path.basename(storedName));

/** Deletes files from disk; missing files are ignored. */
export const removeFiles = async (paths: string[]) => {
  await Promise.all(
    paths.map((p) =>
      fs.unlink(p).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== 'ENOENT') console.error('Failed to delete file', p, err.message);
      }),
    ),
  );
};

/** Where the cached thumbnail of a stored file lives. */
export const thumbnailPath = (userId: number, storedName: string) =>
  path.join(userUploadDir(userId), '.thumbs', `${path.basename(storedName)}.webp`);
