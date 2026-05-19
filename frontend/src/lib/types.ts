export type Role = 'org_admin' | 'team_manager' | 'member';

export type UserTeam = { id: string; name: string; isManager: boolean };
export type UserAccount = { id: string; name: string };

export type User = {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: Role;
  deactivatedAt: string | null;
  teams: UserTeam[];
  accountsOwned: UserAccount[];
};

export type Team = {
  id: string; name: string; memberCount: number;
  members: { id: string; name: string; isManager: boolean }[];
};

export type AccountOwnerRef = { id: string; name: string; deactivatedAt: string | null };
export type CustomerAccount = { id: string; name: string; owners: AccountOwnerRef[] };

export type Invitation = {
  id: string; orgId: string; email: string; role: Role;
  teamIds: string[]; expiresAt: string; acceptedAt: string | null; createdAt: string;
};

export type InvitationPublic = {
  orgName: string; email: string; role: Role;
  teams: { id: string; name: string }[];
};
