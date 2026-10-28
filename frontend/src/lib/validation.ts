import type { LoginPayload, RegisterPayload } from '@/types/auth.types';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(v: RegisterPayload): FieldErrors<RegisterPayload> {
  const e: FieldErrors<RegisterPayload> = {};
  if (v.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Invalid email address';
  if (v.password.length < 8) e.password = 'Password must be at least 8 characters';
  else if (!/[a-z]/.test(v.password)) e.password = 'Password must contain a lowercase letter';
  else if (!/[A-Z]/.test(v.password)) e.password = 'Password must contain an uppercase letter';
  else if (!/[0-9]/.test(v.password)) e.password = 'Password must contain a number';
  if (v.confirmPassword !== v.password) e.confirmPassword = 'Passwords do not match';
  return e;
}

export function validateLogin(v: LoginPayload): FieldErrors<LoginPayload> {
  const e: FieldErrors<LoginPayload> = {};
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Invalid email address';
  if (!v.password) e.password = 'Password is required';
  return e;
}

/** Takes the first message of each server-side field error. */
export function firstFieldErrors<T>(errors: Record<string, string[]>): FieldErrors<T> {
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(errors)) if (msgs[0]) out[key] = msgs[0];
  return out as FieldErrors<T>;
}
