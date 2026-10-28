import { ApiRequestError } from '@/lib/api';

/** User-facing text for any error thrown by the API layer. */
export const errorMessage = (err: unknown, fallback = 'Something went wrong') =>
  err instanceof ApiRequestError ? err.message : fallback;
