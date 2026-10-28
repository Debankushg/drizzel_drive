import { ApiError } from './ApiError';

/** fetch + JSON parse that throws a 502 ApiError when the upstream call fails. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || body === null) {
    throw new ApiError(502, `Request to identity provider failed (${res.status})`);
  }
  return body;
}
