import { and, eq, inArray, isNull, gt, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { invitations, organizations, teams, teamMemberships, users } from '../db/schema.js';
import { AppError } from '../lib/AppError.js';
import { generateInviteToken, hashInviteToken } from '../auth/tokens.js';
import { hashPassword } from '../auth/password.js';
import { toPublicUser, type PublicUser } from '../lib/toPublicUser.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInvitation(params: {
  orgId: string; invitedBy: string;
  email: string; role: 'org_admin' | 'team_manager' | 'member';
  teamIds: string[];
}): Promise<{ invitation: any; token: string }> {
  return db.transaction(async (tx) => {
    if (params.teamIds.length > 0) {
      const valid = await tx.select({ id: teams.id }).from(teams)
        .where(and(eq(teams.orgId, params.orgId), inArray(teams.id, params.teamIds)));
      if (valid.length !== params.teamIds.length) {
        throw AppError.badRequest('One or more team IDs are invalid');
      }
    }

    const [existingUser] = await tx.select({ id: users.id }).from(users)
      .where(and(eq(users.orgId, params.orgId), eq(users.email, params.email), isNull(users.deactivatedAt)))
      .limit(1);
    if (existingUser) {
      throw AppError.conflict('CONFLICT_DUPLICATE_NAME', 'A user with that email already exists in this org');
    }

    // Invalidate prior pending invites for the same (org, email)
    await tx.update(invitations).set({ expiresAt: new Date() })
      .where(and(
        eq(invitations.orgId, params.orgId),
        eq(invitations.email, params.email),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      ));

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

    const [invitation] = await tx.insert(invitations).values({
      orgId: params.orgId,
      email: params.email,
      role: params.role,
      tokenHash,
      invitedBy: params.invitedBy,
      teamIds: params.teamIds,
      expiresAt,
    }).returning();

    const { tokenHash: _, ...invitationPublic } = invitation;
    return { invitation: invitationPublic, token };
  });
}

export async function listInvitations(orgId: string) {
  const rows = await db.select().from(invitations)
    .where(and(
      eq(invitations.orgId, orgId),
      isNull(invitations.acceptedAt),
      gt(invitations.expiresAt, new Date()),
    ));
  return rows.map(({ tokenHash, ...rest }) => rest);
}

export async function getInvitationByToken(plainToken: string) {
  const tokenHash = hashInviteToken(plainToken);
  const [inv] = await db.select().from(invitations)
    .where(and(
      eq(invitations.tokenHash, tokenHash),
      isNull(invitations.acceptedAt),
      gt(invitations.expiresAt, new Date()),
    )).limit(1);
  if (!inv) throw AppError.notFound('Invitation not found or expired');

  const [org] = await db.select().from(organizations).where(eq(organizations.id, inv.orgId)).limit(1);
  const teamRows = inv.teamIds.length > 0
    ? await db.select({ id: teams.id, name: teams.name }).from(teams)
        .where(and(eq(teams.orgId, inv.orgId), inArray(teams.id, inv.teamIds)))
    : [];

  return {
    orgName: org!.name,
    email: inv.email,
    role: inv.role,
    teams: teamRows,
  };
}

export async function acceptInvitation(plainToken: string, body: { name: string; password: string }): Promise<PublicUser> {
  const tokenHash = hashInviteToken(plainToken);
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(invitations)
      .where(and(
        eq(invitations.tokenHash, tokenHash),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      )).limit(1).for('update');
    if (!inv) throw AppError.notFound('Invitation not found or expired');

    const [existing] = await tx.select({ id: users.id }).from(users)
      .where(and(eq(users.orgId, inv.orgId), eq(users.email, inv.email), isNull(users.deactivatedAt)))
      .limit(1);
    if (existing) throw AppError.notFound('Invitation not found or expired');

    const passwordHash = await hashPassword(body.password);
    const [user] = await tx.insert(users).values({
      orgId: inv.orgId,
      email: inv.email,
      passwordHash,
      name: body.name,
      role: inv.role,
    }).returning();

    if (inv.teamIds.length > 0) {
      await tx.insert(teamMemberships).values(
        inv.teamIds.map((teamId) => ({ teamId, userId: user.id, isManager: false }))
      );
    }

    await tx.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inv.id));

    const teamRows = inv.teamIds.length > 0
      ? await tx.select({ id: teams.id, name: teams.name, isManager: sql<boolean>`false` }).from(teams)
          .where(inArray(teams.id, inv.teamIds))
      : [];
    return toPublicUser(user, teamRows, []);
  });
}
