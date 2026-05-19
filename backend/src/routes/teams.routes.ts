import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createTeamSchema, addMemberSchema } from '../validators/teams.schemas.js';
import * as svc from '../services/teams.service.js';

export const teamsRouter = Router();

teamsRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const teams = await svc.listTeams(req.orgId!);
  res.json({ teams });
}));

teamsRouter.post('/', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const input = createTeamSchema.parse(req.body);
  const team = await svc.createTeam(req.orgId!, input.name);
  res.status(201).json({ team });
}));

teamsRouter.post('/:id/members', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  const input = addMemberSchema.parse(req.body);
  await svc.addMember(req.orgId!, req.params.id, input.userId, input.isManager);
  res.status(204).end();
}));

teamsRouter.delete('/:id/members/:userId', requireAuth, requireRole('org_admin'), asyncHandler(async (req, res) => {
  await svc.removeMember(req.orgId!, req.params.id, req.params.userId);
  res.status(204).end();
}));
