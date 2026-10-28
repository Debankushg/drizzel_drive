import type { JwtPayload } from './jwt.types';

// Adds `req.user` (set by the authenticate middleware) to Express requests.
declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}
