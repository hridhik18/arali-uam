import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export type SessionPayload = { userId: string; orgId: string };

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): SessionPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (typeof decoded.userId !== 'string' || typeof decoded.orgId !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { userId: decoded.userId, orgId: decoded.orgId };
}
