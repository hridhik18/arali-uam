import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { setAuthCookie } from '../auth/cookies.js';
import { signToken } from '../auth/jwt.js';
import { createInvitationSchema, acceptInvitationSchema } from '../validators/invitations.schemas.js';
import * as svc from '../services/invitations.service.js';

export const invitationsRouter = Router();

invitationsRouter.post('/', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const input = createInvitationSchema.parse(req.body);
  const result = await svc.createInvitation({
    orgId: req.orgId!,
    invitedBy: req.user!.id,
    ...input,
  });
  res.status(201).json(result);
}));

invitationsRouter.get('/', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const invitations = await svc.listInvitations(req.orgId!);
  res.json({ invitations });
}));

invitationsRouter.get('/:token', asyncHandler(async (req, res) => {
  const info = await svc.getInvitationByToken(req.params.token);
  res.json(info);
}));

invitationsRouter.post('/:token/accept', asyncHandler(async (req, res) => {
  const input = acceptInvitationSchema.parse(req.body);
  const user = await svc.acceptInvitation(req.params.token, input);
  setAuthCookie(res, signToken({ userId: user.id, orgId: user.orgId }));
  res.status(201).json({ user });
}));
