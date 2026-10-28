import fs from 'node:fs/promises';
import { env } from '../config/env';
import { fileService } from '../services/file.service';
import { thumbnailService } from '../services/thumbnail.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { signFileToken, verifyFileToken, verifyThumbToken } from '../utils/jwt';
import { parseId } from '../utils/parseId';
import { filePath } from '../utils/storage';
import { uploadFileSchema } from '../validators/drive.validator';

export const uploadFile = asyncHandler(async (req, res) => {
  const upload = req.file;
  try {
    if (!upload) throw ApiError.badRequest('No file uploaded (use the "file" field)');
    const parsed = uploadFileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Validation failed', parsed.error.flatten().fieldErrors);
    }
    const file = await fileService.create(req.user!.sub, upload, parsed.data);
    sendSuccess(res, 201, 'File uploaded', { file });
  } catch (err) {
    // Don't leave an orphan on disk when validation or the DB insert fails
    if (upload) await fs.unlink(upload.path).catch(() => undefined);
    throw err;
  }
});

export const renameFile = asyncHandler(async (req, res) => {
  const file = await fileService.rename(req.user!.sub, parseId(req.params.id), req.body.name);
  sendSuccess(res, 200, 'File renamed', { file });
});

export const moveFile = asyncHandler(async (req, res) => {
  const file = await fileService.move(req.user!.sub, parseId(req.params.id), req.body.folderId);
  sendSuccess(res, 200, 'File moved', { file });
});

/** DELETE /files/:id moves the file to the trash. */
export const trashFile = asyncHandler(async (req, res) => {
  await fileService.trash(req.user!.sub, parseId(req.params.id));
  sendSuccess(res, 200, 'File moved to trash');
});

/** Returns a temporary URL that can be used directly in <img>, <video> or a download link. */
export const getFileUrl = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const file = await fileService.getViewable(userId, parseId(req.params.id));
  const token = signFileToken({ fileId: file.id, userId });
  sendSuccess(res, 200, 'File URL created', {
    url: `${env.BACKEND_URL}/api/files/${file.id}/content?token=${encodeURIComponent(token)}`,
  });
});

/** Streams the file (supports Range requests for video). Authorised by the ?token= in the URL. */
export const streamFile = asyncHandler(async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  let payload;
  try {
    payload = verifyFileToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired link');
  }
  if (payload.fileId !== parseId(req.params.id)) throw ApiError.unauthorized('Invalid link');

  // Re-check access on every request: shares can be revoked while a link is still valid
  const file = await fileService.getViewable(payload.userId, payload.fileId);
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';

  // Helmet blocks cross-origin embedding by default; the frontend (another origin) must display these
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  await new Promise<void>((resolve, reject) =>
    res.sendFile(filePath(file.userId, file.storedName), (err) => (err ? reject(err) : resolve())),
  );
});

/** Small preview image of an image or PDF. Authorised by the ?token= in the URL; cached by the browser. */
export const streamThumbnail = asyncHandler(async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  let payload;
  try {
    payload = verifyThumbToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired link');
  }
  if (payload.fileId !== parseId(req.params.id)) throw ApiError.unauthorized('Invalid link');

  const file = await fileService.getViewable(payload.userId, payload.fileId);

  let thumbnail: string;
  try {
    thumbnail = await thumbnailService.ensure(file);
  } catch (err) {
    // Corrupt or unsupported file: the frontend falls back to the file-type icon
    console.error(`Thumbnail failed for file ${file.id}:`, err instanceof Error ? err.message : err);
    throw new ApiError(404, 'No thumbnail available');
  }

  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.type('image/webp');
  await new Promise<void>((resolve, reject) => res.sendFile(thumbnail, { dotfiles: 'allow' }, (err) => (err ? reject(err) : resolve())));
});
