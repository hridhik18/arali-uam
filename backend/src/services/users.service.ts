import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, teams, teamMemberships, customerAccounts, accountOwners } from '../db/schema.js';
import { AppError } from '../lib/AppError.js';
import { toPublicUser, type PublicUser } from '../lib/toPublicUser.js';

export async function listUsers(orgId: string): Promise<PublicUser[]> {
  const rows = await db.select().from(users).where(eq(users.orgId, orgId));
  const result: PublicUser[] = [];
  for (const u of rows) {
    const userTeams = await db.select({
      id: teams.id, name: teams.name, isManager: teamMemberships.isManager,
    }).from(teamMemberships)
      .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
      .where(and(eq(teamMemberships.userId, u.id), eq(teams.orgId, orgId)));
    const userAccounts = await db.select({
      id: customerAccounts.id, name: customerAccounts.name,
    }).from(accountOwners)
      .innerJoin(customerAccounts, eq(customerAccounts.id, accountOwners.accountId))
      .where(and(eq(accountOwners.userId, u.id), eq(customerAccounts.orgId, orgId)));
    result.push(toPublicUser(u, userTeams, userAccounts));
  }
  return result;
}

export async function updateUser(
  orgId: string,
  targetUserId: string,
  patch: { role?: 'org_admin' | 'team_manager' | 'member'; teamIds?: string[] },
): Promise<PublicUser> {
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(users)
      .where(and(eq(users.id, targetUserId), eq(users.orgId, orgId))).limit(1);
    if (!target) throw AppError.notFound('User not found');

    // Last-admin demote guard
    if (patch.role && patch.role !== 'org_admin' && target.role === 'org_admin') {
      const activeAdmins = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.orgId, orgId), eq(users.role, 'org_admin'), isNull(users.deactivatedAt)))
        .for('update');
      if (activeAdmins.length === 1 && activeAdmins[0].id === targetUserId) {
        throw AppError.conflict('CONFLICT_LAST_ADMIN', 'Cannot demote the last active admin');
      }
    }

    if (patch.role && patch.role !== target.role) {
      await tx.update(users).set({ role: patch.role }).where(eq(users.id, targetUserId));
    }

    if (patch.teamIds) {
      if (patch.teamIds.length > 0) {
        const valid = await tx.select({ id: teams.id }).from(teams)
          .where(and(eq(teams.orgId, orgId), inArray(teams.id, patch.teamIds)));
        if (valid.length !== patch.teamIds.length) {
          throw AppError.badRequest('One or more team IDs are invalid');
        }
      }
      const current = await tx.select({ teamId: teamMemberships.teamId }).from(teamMemberships)
        .where(eq(teamMemberships.userId, targetUserId));
      const currentIds = new Set(current.map((r) => r.teamId));
      const nextIds = new Set(patch.teamIds);
      const toAdd = [...nextIds].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
      if (toRemove.length > 0) {
        await tx.delete(teamMemberships).where(and(
          eq(teamMemberships.userId, targetUserId),
          inArray(teamMemberships.teamId, toRemove),
        ));
      }
      if (toAdd.length > 0) {
        await tx.insert(teamMemberships).values(
          toAdd.map((teamId) => ({ teamId, userId: targetUserId }))
        );
      }
    }

    const [updated] = await tx.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    const userTeams = await tx.select({
      id: teams.id, name: teams.name, isManager: teamMemberships.isManager,
    }).from(teamMemberships)
      .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
      .where(and(eq(teamMemberships.userId, targetUserId), eq(teams.orgId, orgId)));
    const userAccounts = await tx.select({
      id: customerAccounts.id, name: customerAccounts.name,
    }).from(accountOwners)
      .innerJoin(customerAccounts, eq(customerAccounts.id, accountOwners.accountId))
      .where(and(eq(accountOwners.userId, targetUserId), eq(customerAccounts.orgId, orgId)));
    return toPublicUser(updated, userTeams, userAccounts);
  });
}

export async function deactivateUser(
  orgId: string, requesterId: string, targetUserId: string,
): Promise<PublicUser> {
  if (requesterId === targetUserId) {
    throw AppError.conflict('CONFLICT_SELF_DEACTIVATE', 'You cannot deactivate yourself');
  }
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(users)
      .where(and(eq(users.id, targetUserId), eq(users.orgId, orgId))).limit(1);
    if (!target) throw AppError.notFound('User not found');
    if (target.deactivatedAt) {
      const ctx = await loadUserContext(tx, orgId, targetUserId);
      return toPublicUser(target, ctx.teams, ctx.accounts);
    }
    if (target.role === 'org_admin') {
      const activeAdmins = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.orgId, orgId), eq(users.role, 'org_admin'), isNull(users.deactivatedAt)))
        .for('update');
      if (activeAdmins.length === 1 && activeAdmins[0].id === targetUserId) {
        throw AppError.conflict('CONFLICT_LAST_ADMIN', 'Cannot deactivate the last active admin');
      }
    }
    await tx.update(users).set({ deactivatedAt: new Date() }).where(eq(users.id, targetUserId));
    const [updated] = await tx.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    const ctx = await loadUserContext(tx, orgId, targetUserId);
    return toPublicUser(updated, ctx.teams, ctx.accounts);
  });
}

async function loadUserContext(tx: any, orgId: string, userId: string) {
  const teamsList = await tx.select({
    id: teams.id, name: teams.name, isManager: teamMemberships.isManager,
  }).from(teamMemberships)
    .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
    .where(and(eq(teamMemberships.userId, userId), eq(teams.orgId, orgId)));
  const accounts = await tx.select({
    id: customerAccounts.id, name: customerAccounts.name,
  }).from(accountOwners)
    .innerJoin(customerAccounts, eq(customerAccounts.id, accountOwners.accountId))
    .where(and(eq(accountOwners.userId, userId), eq(customerAccounts.orgId, orgId)));
  return { teams: teamsList, accounts };
}
