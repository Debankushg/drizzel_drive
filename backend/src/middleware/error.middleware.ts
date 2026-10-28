import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ success: false, message: err.message, errors: err.errors });
    return;
  }
  if (err instanceof MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge ? `File is too large (max ${env.MAX_FILE_SIZE_MB} MB)` : err.message,
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.NODE_ENV !== 'production' && { error: String(err?.message ?? err) }),
  });
};
