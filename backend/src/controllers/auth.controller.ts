import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  sendSuccess(res, 201, 'Registration successful', data);
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  sendSuccess(res, 200, 'Login successful', data);
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user!.sub);
  sendSuccess(res, 200, 'Profile fetched', { user });
});
