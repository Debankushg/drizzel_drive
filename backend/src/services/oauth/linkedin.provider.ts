import { env } from '../../config/env';
import type { OAuthProvider } from '../../types/oauth.types';
import { fetchJson } from '../../utils/http';
import { exchangeCode } from './exchangeCode';

const redirectUri = `${env.BACKEND_URL}/api/auth/linkedin/callback`;

interface LinkedinUserInfo {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
}

export const linkedinProvider: OAuthProvider = {
  name: 'linkedin',
  isConfigured: () => !!(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET),

  getAuthUrl: (state) =>
    'https://www.linkedin.com/oauth/v2/authorization?' +
    new URLSearchParams({
      client_id: env.LINKEDIN_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
    }),

  async getProfile(code) {
    const token = await exchangeCode('https://www.linkedin.com/oauth/v2/accessToken', {
      code,
      client_id: env.LINKEDIN_CLIENT_ID ?? '',
      client_secret: env.LINKEDIN_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const info = await fetchJson<LinkedinUserInfo>('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      providerId: info.sub,
      email: info.email ?? null,
      emailVerified: info.email_verified === true,
      name: info.name ?? info.email ?? 'LinkedIn user',
    };
  },
};
