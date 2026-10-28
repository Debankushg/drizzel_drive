import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { FileTokenPayload, JwtPayload, ThumbTokenPayload } from '../types/jwt.types';

export const signToken = (payload: JwtPayload): string =>
  jwt.sign({ email: payload.email }, env.JWT_SECRET, {
    subject: String(payload.sub),
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  // File-access tokens must not work as login tokens
  if (!decoded.sub || decoded.purpose) throw new Error('Invalid token');
  return { sub: Number(decoded.sub), email: decoded.email as string };
};

export const signFileToken = ({ fileId, userId }: FileTokenPayload): string =>
  jwt.sign({ purpose: 'file', fid: fileId, uid: userId }, env.JWT_SECRET, { expiresIn: '1h' });

export const verifyFileToken = (token: string): FileTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (decoded.purpose !== 'file') throw new Error('Invalid token');
  return { fileId: Number(decoded.fid), userId: Number(decoded.uid) };
};

const THUMB_WINDOW_SECONDS = 12 * 60 * 60;

/**
 * Thumbnail tokens expire at the end of a 12h window and carry no issue time, so the same
 * file always gets the same URL within that window - which lets the browser cache the image.
 */
export const signThumbToken = ({ fileId, userId }: ThumbTokenPayload): string => {
  const now = Math.floor(Date.now() / 1000);
  const exp = (Math.floor(now / THUMB_WINDOW_SECONDS) + 2) * THUMB_WINDOW_SECONDS;
  return jwt.sign({ purpose: 'thumb', fid: fileId, uid: userId, exp }, env.JWT_SECRET, { noTimestamp: true });
};

export const verifyThumbToken = (token: string): ThumbTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (decoded.purpose !== 'thumb') throw new Error('Invalid token');
  return { fileId: Number(decoded.fid), userId: Number(decoded.uid) };
};
