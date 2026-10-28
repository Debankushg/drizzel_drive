import type { OAuthProvider, OAuthProviderName } from '../../types/oauth.types';
import { githubProvider } from './github.provider';
import { googleProvider } from './google.provider';
import { linkedinProvider } from './linkedin.provider';

const providers: Record<OAuthProviderName, OAuthProvider> = {
  google: googleProvider,
  github: githubProvider,
  linkedin: linkedinProvider,
};

export const getOAuthProvider = (name: string): OAuthProvider | undefined =>
  Object.prototype.hasOwnProperty.call(providers, name)
    ? providers[name as OAuthProviderName]
    : undefined;
