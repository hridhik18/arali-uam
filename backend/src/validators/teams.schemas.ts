import { z } from 'zod';
export const createTeamSchema = z.object({ name: z.string().trim().min(1) });
export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  isManager: z.boolean().optional().default(false),
});
