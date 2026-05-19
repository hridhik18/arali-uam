import { z } from 'zod';
import { normalizeEmail } from '../lib/normalizeEmail.js';

export const createInvitationSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  role: z.enum(['org_admin', 'team_manager', 'member']),
  teamIds: z.array(z.string().uuid()).default([]),
});

export const acceptInvitationSchema = z.object({
  name: z.string().trim().min(1),
  password: z.string().min(8),
});
