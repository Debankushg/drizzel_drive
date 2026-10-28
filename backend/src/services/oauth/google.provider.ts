import { env } from '../../config/env';
import type { OAuthProvider } from '../../types/oauth.types';
import { fetchJson } from '../../utils/http';
import { exchangeCode } from './exchangeCode';

const redirectUri = `${env.BACKEND_URL}/api/auth/google/callback`;

interface GoogleUserInfo {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
}

export const googleProvider: OAuthProvider = {
  name: 'google',
  isConfigured: () => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),

  getAuthUrl: (state) =>
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }),

  async getProfile(code) {
    const token = await exchangeCode('https://oauth2.googleapis.com/token', {
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const info = await fetchJson<GoogleUserInfo>('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      providerId: info.sub,
      email: info.email ?? null,
      emailVerified: info.email_verified === true,
      name: info.name ?? info.email ?? 'Google user',
    };
  },
};
