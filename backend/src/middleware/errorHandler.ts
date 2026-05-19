import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/AppError.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
  }
  if (err instanceof ZodError) {
    const message = err.errors[0]?.message ?? 'Invalid input';
    return res.status(400).json({ error: { message, code: 'BAD_REQUEST' } });
  }
  console.error('[unhandled]', err);
  return res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL' } });
}
