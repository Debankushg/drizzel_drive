import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api.types';
import type { AuthSession, LoginPayload, RegisterPayload } from '@/types/auth.types';
import type { User } from '@/types/user.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly status = 0,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiRequestError('Cannot reach the server. Please try again.');
  }

  const json = (await res.json().catch(() => null)) as
    | ApiSuccessResponse<T>
    | ApiErrorResponse
    | null;

  if (!res.ok || !json || !json.success) {
    const err = json && !json.success ? json : null;
    throw new ApiRequestError(err?.message ?? 'Something went wrong', err?.errors, res.status);
  }
  return json.data;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const authApi = {
  register: (payload: RegisterPayload) => post<AuthSession>('/auth/register', payload),
  login: (payload: LoginPayload) => post<AuthSession>('/auth/login', payload),
  me: (token: string) =>
    request<{ user: User }>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
};
