import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { setAuthCookie, clearAuthCookie } from '../auth/cookies.js';
import { signToken } from '../auth/jwt.js';
import { signupSchema, loginSchema } from '../validators/auth.schemas.js';
import * as authService from '../services/auth.service.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

authRouter.post('/signup', asyncHandler(async (req, res) => {
  const input = signupSchema.parse(req.body);
  const user = await authService.signup(input);
  setAuthCookie(res, signToken({ userId: user.id, orgId: user.orgId }));
  res.status(201).json({ user });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await authService.login(input);
  setAuthCookie(res, signToken({ userId: user.id, orgId: user.orgId }));
  res.json({ user });
}));

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user!.id, req.orgId!);
  res.json({ user });
}));
