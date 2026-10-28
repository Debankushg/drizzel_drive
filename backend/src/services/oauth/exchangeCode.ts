import { fetchJson } from '../../utils/http';

interface TokenResponse {
  access_token?: string;
  error?: string;
}

/** Exchanges an authorization code for an access token (standard OAuth 2.0). */
export async function exchangeCode(
  tokenUrl: string,
  params: Record<string, string>,
): Promise<string> {
  const data = await fetchJson<TokenResponse>(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params),
  });
  if (!data.access_token) throw new Error(data.error ?? 'No access token returned');
  return data.access_token;
}
