import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { teams, teamMemberships, users } from '../db/schema.js';
import { AppError } from '../lib/AppError.js';

export async function listTeams(orgId: string) {
  const teamRows = await db.select().from(teams).where(eq(teams.orgId, orgId));
  const result = [];
  for (const t of teamRows) {
    const members = await db.select({
      id: users.id, name: users.name, isManager: teamMemberships.isManager,
    }).from(teamMemberships)
      .innerJoin(users, eq(users.id, teamMemberships.userId))
      .where(eq(teamMemberships.teamId, t.id));
    result.push({ id: t.id, name: t.name, memberCount: members.length, members });
  }
  return result;
}

export async function createTeam(orgId: string, name: string) {
  try {
    const [team] = await db.insert(teams).values({ orgId, name }).returning();
    return team;
  } catch (e: any) {
    if (e?.code === '23505') throw AppError.conflict('CONFLICT_DUPLICATE_NAME', 'A team with that name already exists');
    throw e;
  }
}

export async function addMember(orgId: string, teamId: string, userId: string, isManager = false) {
  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.orgId, orgId))).limit(1);
  if (!team) throw AppError.notFound('Team not found');
  const [user] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.orgId, orgId))).limit(1);
  if (!user) throw AppError.notFound('User not found');
  try {
    await db.insert(teamMemberships).values({ teamId, userId, isManager });
  } catch (e: any) {
    if (e?.code === '23505') {
      return;
    }
    throw e;
  }
}

export async function removeMember(orgId: string, teamId: string, userId: string) {
  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.orgId, orgId))).limit(1);
  if (!team) throw AppError.notFound('Team not found');
  await db.delete(teamMemberships).where(and(eq(teamMemberships.teamId, teamId), eq(teamMemberships.userId, userId)));
}
