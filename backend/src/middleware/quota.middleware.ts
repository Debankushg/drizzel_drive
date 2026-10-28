import type { RequestHandler } from 'express';
import { fileRepository } from '../repositories/file.repository';
import { quotaBytes } from '../services/file.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Rejects an upload before it is streamed to disk when the Content-Length already
 * exceeds the free space. (fileService.create re-checks with the exact file size.)
 */
export const checkQuota: RequestHandler = asyncHandler(async (req, _res, next) => {
  const incoming = Number(req.headers['content-length'] ?? 0);
  if (incoming && (await fileRepository.totalSize(req.user!.sub)) + incoming > quotaBytes()) {
    throw new ApiError(413, 'Storage quota exceeded. Delete some files (and empty the trash) to free up space.');
  }
  next();
});
