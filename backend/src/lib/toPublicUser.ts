import type { User } from '../db/schema.js';

export type PublicUserTeam = { id: string; name: string; isManager: boolean };
export type PublicUserAccount = { id: string; name: string };

export type PublicUser = {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: 'org_admin' | 'team_manager' | 'member';
  deactivatedAt: string | null;
  teams: PublicUserTeam[];
  accountsOwned: PublicUserAccount[];
};

export function toPublicUser(
  u: User,
  teams: PublicUserTeam[] = [],
  accountsOwned: PublicUserAccount[] = [],
): PublicUser {
  return {
    id: u.id,
    orgId: u.orgId,
    email: u.email,
    name: u.name,
    role: u.role,
    deactivatedAt: u.deactivatedAt ? u.deactivatedAt.toISOString() : null,
    teams,
    accountsOwned,
  };
}
