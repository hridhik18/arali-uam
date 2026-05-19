import { z } from 'zod';
import { normalizeEmail } from '../lib/normalizeEmail.js';

export const signupSchema = z.object({
  orgName: z.string().trim().min(1, 'Organization name is required'),
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email().transform(normalizeEmail),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  password: z.string().min(1, 'Password is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
