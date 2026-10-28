import { oauthRepository } from '../repositories/oauth.repository';
import { userRepository } from '../repositories/user.repository';
import type { AuthSession, LoginInput, RegisterInput } from '../types/auth.types';
import type { OAuthProfile, OAuthProviderName } from '../types/oauth.types';
import type { PublicUser, User } from '../types/user.types';
import { ApiError } from '../utils/ApiError';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';

const toPublic = ({ password: _password, ...rest }: User): PublicUser => rest;

const issueSession = (user: User): AuthSession => ({
  user: toPublic(user),
  token: signToken({ sub: user.id, email: user.email }),
});

export const authService = {
  async register({ name, email, password }: RegisterInput) {
    if (await userRepository.findByEmail(email)) {
      throw ApiError.conflict('Email is already registered');
    }
    const user = await userRepository.create({
      name,
      email,
      password: await hashPassword(password),
    });
    return issueSession(user);
  },

  async login({ email, password }: LoginInput) {
    const user = await userRepository.findByEmail(email);
    // Social-only accounts have no password, so they can't sign in this way
    if (!user || !user.password || !(await comparePassword(password, user.password))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    return issueSession(user);
  },

  async oauthLogin(provider: OAuthProviderName, profile: OAuthProfile): Promise<AuthSession> {
    const linked = await oauthRepository.findUserByAccount(provider, profile.providerId);
    if (linked) return issueSession(linked);

    if (!profile.email || !profile.emailVerified) {
      throw ApiError.badRequest('Your account has no verified email address');
    }
    const email = profile.email.toLowerCase();

    // Same verified email as an existing account -> link instead of duplicating
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      await oauthRepository.linkAccount(existing.id, provider, profile.providerId);
      return issueSession(existing);
    }

    const user = await oauthRepository.createUserWithAccount(
      { name: profile.name.slice(0, 100), email },
      provider,
      profile.providerId,
    );
    return issueSession(user);
  },

  async getProfile(userId: number): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.unauthorized('User no longer exists');
    return toPublic(user);
  },
};
