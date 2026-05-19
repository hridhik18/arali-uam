import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { updateUserSchema } from '../validators/users.schemas.js';
import * as svc from '../services/users.service.js';
import * as authService from '../services/auth.service.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user!.id, req.orgId!);
  res.json({ user });
}));

usersRouter.get('/', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const users = await svc.listUsers(req.orgId!);
  res.json({ users });
}));

usersRouter.patch('/:id', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const input = updateUserSchema.parse(req.body);
  const user = await svc.updateUser(req.orgId!, req.params.id, input);
  res.json({ user });
}));

usersRouter.post('/:id/deactivate', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const user = await svc.deactivateUser(req.orgId!, req.user!.id, req.params.id);
  res.json({ user });
}));
