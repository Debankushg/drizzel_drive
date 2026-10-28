export const OAUTH_PROVIDERS = ['google', 'github', 'linkedin'] as const;

export type OAuthProviderName = (typeof OAUTH_PROVIDERS)[number];

/** Normalised user profile returned by every provider. */
export interface OAuthProfile {
  providerId: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
}

export interface OAuthProvider {
  readonly name: OAuthProviderName;
  isConfigured(): boolean;
  getAuthUrl(state: string): string;
  getProfile(code: string): Promise<OAuthProfile>;
}
