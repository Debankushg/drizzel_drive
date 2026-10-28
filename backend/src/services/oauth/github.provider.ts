import { env } from '../../config/env';
import type { OAuthProvider } from '../../types/oauth.types';
import { fetchJson } from '../../utils/http';
import { exchangeCode } from './exchangeCode';

const redirectUri = `${env.BACKEND_URL}/api/auth/github/callback`;

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export const githubProvider: OAuthProvider = {
  name: 'github',
  isConfigured: () => !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),

  getAuthUrl: (state) =>
    'https://github.com/login/oauth/authorize?' +
    new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    }),

  async getProfile(code) {
    const token = await exchangeCode('https://github.com/login/oauth/access_token', {
      code,
      client_id: env.GITHUB_CLIENT_ID ?? '',
      client_secret: env.GITHUB_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
    });
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'drive-app',
    };
    const [user, emails] = await Promise.all([
      fetchJson<GithubUser>('https://api.github.com/user', { headers }),
      fetchJson<GithubEmail[]>('https://api.github.com/user/emails', { headers }),
    ]);
    // The public profile email can be unverified/empty, so use the verified primary one.
    const primary = emails.find((e) => e.primary && e.verified);
    return {
      providerId: String(user.id),
      email: primary?.email ?? null,
      emailVerified: !!primary,
      name: user.name ?? user.login,
    };
  },
};
