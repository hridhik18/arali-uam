import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { customerAccounts, accountOwners, users } from '../db/schema.js';
import { AppError } from '../lib/AppError.js';

export async function listAccounts(orgId: string) {
  const accounts = await db.select().from(customerAccounts).where(eq(customerAccounts.orgId, orgId));
  const result = [];
  for (const a of accounts) {
    const owners = await db.select({
      id: users.id, name: users.name, deactivatedAt: users.deactivatedAt,
    }).from(accountOwners)
      .innerJoin(users, eq(users.id, accountOwners.userId))
      .where(eq(accountOwners.accountId, a.id));
    result.push({
      id: a.id, name: a.name,
      owners: owners.map((o) => ({
        id: o.id, name: o.name,
        deactivatedAt: o.deactivatedAt ? o.deactivatedAt.toISOString() : null,
      })),
    });
  }
  return result;
}

export async function createAccount(orgId: string, name: string) {
  try {
    const [a] = await db.insert(customerAccounts).values({ orgId, name }).returning();
    return a;
  } catch (e: any) {
    if (e?.code === '23505') throw AppError.conflict('CONFLICT_DUPLICATE_NAME', 'An account with that name already exists');
    throw e;
  }
}

export async function addOwner(orgId: string, accountId: string, userId: string) {
  const [acc] = await db.select().from(customerAccounts)
    .where(and(eq(customerAccounts.id, accountId), eq(customerAccounts.orgId, orgId))).limit(1);
  if (!acc) throw AppError.notFound('Account not found');
  const [user] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.orgId, orgId))).limit(1);
  if (!user) throw AppError.notFound('User not found');
  if (user.deactivatedAt) {
    throw AppError.conflict('CONFLICT_DEACTIVATED_USER', 'Cannot assign a deactivated user as an owner');
  }
  try {
    await db.insert(accountOwners).values({ accountId, userId });
  } catch (e: any) {
    if (e?.code === '23505') return;
    throw e;
  }
}

export async function removeOwner(orgId: string, accountId: string, userId: string) {
  const [acc] = await db.select().from(customerAccounts)
    .where(and(eq(customerAccounts.id, accountId), eq(customerAccounts.orgId, orgId))).limit(1);
  if (!acc) throw AppError.notFound('Account not found');
  await db.delete(accountOwners).where(and(eq(accountOwners.accountId, accountId), eq(accountOwners.userId, userId)));
}
