import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { organizations, users, teams, teamMemberships, customerAccounts, accountOwners } from '../db/schema.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { AppError } from '../lib/AppError.js';
import { toPublicUser, type PublicUser, type PublicUserTeam, type PublicUserAccount } from '../lib/toPublicUser.js';
import type { SignupInput, LoginInput } from '../validators/auth.schemas.js';

export async function signup(input: SignupInput): Promise<PublicUser> {
  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({ name: input.orgName }).returning();
    const passwordHash = await hashPassword(input.password);
    const [user] = await tx.insert(users).values({
      orgId: org.id,
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'org_admin',
    }).returning();
    return toPublicUser(user, [], []);
  });
}

export async function login(input: LoginInput): Promise<PublicUser> {
  const candidates = await db.select().from(users).where(eq(users.email, input.email));
  for (const user of candidates) {
    if (user.deactivatedAt) continue;
    if (await verifyPassword(input.password, user.passwordHash)) {
      const ctx = await loadUserContext(user.orgId, user.id);
      return toPublicUser(user, ctx.teams, ctx.accounts);
    }
  }
  throw AppError.unauthorized('Invalid email or password');
}

export async function getMe(userId: string, orgId: string): Promise<PublicUser> {
  const [user] = await db.select().from(users)
    .where(and(eq(users.id, userId), eq(users.orgId, orgId))).limit(1);
  if (!user) throw AppError.unauthorized();
  const ctx = await loadUserContext(orgId, userId);
  return toPublicUser(user, ctx.teams, ctx.accounts);
}

export async function loadUserContext(orgId: string, userId: string): Promise<{ teams: PublicUserTeam[]; accounts: PublicUserAccount[] }> {
  const userTeams = await db.select({
    id: teams.id, name: teams.name, isManager: teamMemberships.isManager,
  }).from(teamMemberships)
    .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
    .where(and(eq(teamMemberships.userId, userId), eq(teams.orgId, orgId)));

  const userAccounts = await db.select({
    id: customerAccounts.id, name: customerAccounts.name,
  }).from(accountOwners)
    .innerJoin(customerAccounts, eq(customerAccounts.id, accountOwners.accountId))
    .where(and(eq(accountOwners.userId, userId), eq(customerAccounts.orgId, orgId)));

  return { teams: userTeams, accounts: userAccounts };
}
