import { db } from './db/client.js';
import { organizations, users, teams, teamMemberships, customerAccounts, accountOwners } from './db/schema.js';
import { hashPassword } from './auth/password.js';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`TRUNCATE invitations, account_owners, customer_accounts, team_memberships, teams, users, organizations CASCADE`);

  const [org] = await db.insert(organizations).values({ name: 'Spyne' }).returning();

  const [sales] = await db.insert(teams).values({ orgId: org.id, name: 'Sales' }).returning();
  const [cs] = await db.insert(teams).values({ orgId: org.id, name: 'Customer Success' }).returning();
  const [am] = await db.insert(teams).values({ orgId: org.id, name: 'Account Management' }).returning();

  const passwordHash = await hashPassword('Password123!');
  const make = (email: string, name: string, role: 'org_admin' | 'team_manager' | 'member') => ({
    orgId: org.id, email, name, role, passwordHash,
  });

  const [admin, alice, bob, carol, dan, eve, frank, grace] = await db.insert(users).values([
    make('admin@spyne.test', 'Admin', 'org_admin'),
    make('alice@spyne.test', 'Alice', 'member'),
    make('bob@spyne.test',   'Bob',   'team_manager'),
    make('carol@spyne.test', 'Carol', 'member'),
    make('dan@spyne.test',   'Dan',   'member'),
    make('eve@spyne.test',   'Eve',   'member'),
    make('frank@spyne.test', 'Frank', 'member'),
    make('grace@spyne.test', 'Grace', 'member'),
  ]).returning();

  await db.insert(teamMemberships).values([
    { teamId: sales.id, userId: alice.id }, { teamId: am.id, userId: alice.id },
    { teamId: cs.id,    userId: bob.id, isManager: true },
    { teamId: sales.id, userId: carol.id },
    { teamId: cs.id,    userId: dan.id },
    { teamId: am.id,    userId: eve.id }, { teamId: cs.id, userId: eve.id },
    { teamId: sales.id, userId: frank.id },
    { teamId: am.id,    userId: grace.id },
  ]);

  const [acme]    = await db.insert(customerAccounts).values({ orgId: org.id, name: 'Acme Corp' }).returning();
  const [globex]  = await db.insert(customerAccounts).values({ orgId: org.id, name: 'Globex' }).returning();
  const [initech] = await db.insert(customerAccounts).values({ orgId: org.id, name: 'Initech' }).returning();
  const [umbrella]= await db.insert(customerAccounts).values({ orgId: org.id, name: 'Umbrella' }).returning();
  const [hooli]   = await db.insert(customerAccounts).values({ orgId: org.id, name: 'Hooli' }).returning();

  await db.insert(accountOwners).values([
    { accountId: acme.id,     userId: alice.id }, { accountId: acme.id,     userId: bob.id },
    { accountId: globex.id,   userId: carol.id },
    { accountId: initech.id,  userId: eve.id },   { accountId: initech.id,  userId: dan.id },
    { accountId: umbrella.id, userId: grace.id },
    { accountId: hooli.id,    userId: alice.id }, { accountId: hooli.id,    userId: eve.id }, { accountId: hooli.id, userId: grace.id },
  ]);

  // suppress unused-var TS errors on bound destructuring vars
  void admin; void frank;

  console.log('\n==============================');
  console.log(' Seed complete.');
  console.log('   Org: Spyne');
  console.log('   Users: 8 (1 admin, 1 team_manager, 6 members)');
  console.log('   Teams: 3   Accounts: 5');
  console.log('');
  console.log(' Login as:');
  console.log('   admin@spyne.test  / Password123!  (org_admin)');
  console.log('   alice@spyne.test  / Password123!  (member)');
  console.log('   bob@spyne.test    / Password123!  (team_manager)');
  console.log('==============================\n');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
