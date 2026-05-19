import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createAccountSchema, addOwnerSchema } from '../validators/accounts.schemas.js';
import * as svc from '../services/accounts.service.js';

export const accountsRouter = Router();

accountsRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const accounts = await svc.listAccounts(req.orgId!);
  res.json({ accounts });
}));

accountsRouter.post('/', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const input = createAccountSchema.parse(req.body);
  const account = await svc.createAccount(req.orgId!, input.name);
  res.status(201).json({ account });
}));

accountsRouter.post('/:id/owners', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const input = addOwnerSchema.parse(req.body);
  await svc.addOwner(req.orgId!, req.params.id, input.userId);
  res.status(204).end();
}));

accountsRouter.delete('/:id/owners/:userId', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  await svc.removeOwner(req.orgId!, req.params.id, req.params.userId);
  res.status(204).end();
}));
