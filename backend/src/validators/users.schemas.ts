import { z } from 'zod';
export const updateUserSchema = z.object({
  role: z.enum(['org_admin', 'team_manager', 'member']).optional(),
  teamIds: z.array(z.string().uuid()).optional(),
});
