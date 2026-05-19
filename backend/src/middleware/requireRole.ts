import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError.js';

type Role = 'org_admin' | 'team_manager' | 'member';

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowed.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
