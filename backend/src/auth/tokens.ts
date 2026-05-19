import { randomBytes, createHash } from 'crypto';
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}
export function hashInviteToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}
