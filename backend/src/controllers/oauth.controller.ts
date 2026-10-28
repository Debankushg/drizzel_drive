import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { env } from '../config/env';
import { authService } from '../services/auth.service';
import { getOAuthProvider } from '../services/oauth';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const STATE_COOKIE = 'oauth_state';

/** Sends the browser back to the frontend with an error message. */
const failRedirect = (res: Response, message: string) =>
  res.redirect(`${env.FRONTEND_URL}/auth/callback#error=${encodeURIComponent(message)}`);

/** Step 1: redirect the user to the provider's consent screen. */
export const startOAuth = asyncHandler(async (req, res) => {
  const provider = getOAuthProvider(String(req.params.provider));
  if (!provider) throw new ApiError(404, 'Unknown provider');
  if (!provider.isConfigured()) return failRedirect(res, `${provider.name} login is not configured`);

  // Random value bound to this browser (cookie) and echoed back by the provider (CSRF protection)
  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
    path: '/api/auth',
  });
  res.redirect(provider.getAuthUrl(state));
});

/** Step 2: provider redirects back here with ?code=...&state=... */
export const finishOAuth = asyncHandler(async (req, res) => {
  const provider = getOAuthProvider(String(req.params.provider));
  if (!provider) throw new ApiError(404, 'Unknown provider');

  const { code, state, error } = req.query;
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: '/api/auth' });

  if (error) return failRedirect(res, 'Login was cancelled');
  if (typeof code !== 'string' || typeof state !== 'string' || !expectedState || state !== expectedState) {
    return failRedirect(res, 'Invalid login request, please try again');
  }

  try {
    const profile = await provider.getProfile(code);
    const { token } = await authService.oauthLogin(provider.name, profile);
    // Token goes in the URL fragment so it is never sent to a server or logged
    res.redirect(`${env.FRONTEND_URL}/auth/callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error(`${provider.name} login failed:`, err);
    failRedirect(res, err instanceof ApiError ? err.message : 'Social login failed, please try again');
  }
});
