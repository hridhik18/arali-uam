import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { verifyToken } from '../auth/jwt.js';
import { COOKIE_NAME } from '../auth/cookies.js';
import { AppError } from '../lib/AppError.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw AppError.unauthorized();
  let payload;
  try { payload = verifyToken(token); }
  catch { throw AppError.unauthorized(); }
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || user.deactivatedAt) throw AppError.unauthorized();
  req.user = user;
  req.orgId = user.orgId;
  next();
});
