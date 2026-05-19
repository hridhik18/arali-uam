import { z } from 'zod';
export const createAccountSchema = z.object({ name: z.string().trim().min(1) });
export const addOwnerSchema = z.object({ userId: z.string().uuid() });
