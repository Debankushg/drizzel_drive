import { ApiError } from './ApiError';

export const parseId = (value: unknown, label = 'id'): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label}`);
  return id;
};
