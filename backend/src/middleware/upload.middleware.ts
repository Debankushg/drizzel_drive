import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { ALLOWED_FILE_TYPES, decodeFileName, getExtension } from '../utils/fileTypes';
import { userUploadDir } from '../utils/storage';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = userUploadDir(req.user!.sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${getExtension(file.originalname)}`),
});

/** Expects one file in the "file" field of a multipart/form-data request. */
export const uploadSingle = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_FILE_TYPES[getExtension(file.originalname)]) {
      const allowed = Object.keys(ALLOWED_FILE_TYPES).join(', ');
      return cb(ApiError.badRequest(`"${decodeFileName(file.originalname)}" is not allowed. Allowed types: ${allowed}`));
    }
    cb(null, true);
  },
}).single('file');
