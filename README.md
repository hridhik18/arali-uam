# Arali — User & Access Management

A small multi-tenant user/access management app. An **organization admin** can sign up to create a new org, invite teammates via single-use email links, organize them into **teams**, and assign them as **owners of customer accounts**. Users that own accounts can never be hard-deleted; they are soft-deactivated to preserve history.

Two surfaces are wired up end-to-end:

- a typed JSON HTTP API (`/api/*`) with cookie-based sessions
- a React UI for sign-up, invite acceptance, an admin dashboard, and a per-user profile page

## Tech stack

- **Backend:** Node 20, Express 4, TypeScript (ESM), Drizzle ORM, Postgres 16, bcrypt, JSON Web Tokens (HttpOnly cookie), Zod validators.
- **Frontend:** React 18 + Vite, TypeScript, React Router v6, Tailwind CSS, `fetch` with `credentials: 'include'`.
- **Database:** Postgres 16. Schema is managed by Drizzle migrations.
- **Tooling:** pnpm, Docker Compose (for Postgres), tsx for dev/seed.

## How to run

```bash
# 1. start postgres
docker compose up -d

# 2. backend
cd backend
cp .env.example .env
pnpm install
pnpm db:push
pnpm seed
pnpm dev          # http://localhost:4000

# 3. frontend (new terminal)
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

> No Docker? Any Postgres 16 reachable at `postgres://arali:arali@localhost:5432/arali` will do. The repo was developed against a local Homebrew Postgres on macOS when Docker wasn't available; the schema is identical.

## Seeded credentials

After `pnpm seed`, the `Spyne` org has 8 users. All passwords are `Password123!`.

| Email | Role | Notes |
|---|---|---|
| admin@spyne.test | org_admin | Admin of Spyne |
| alice@spyne.test | member | Owns Acme Corp + Hooli; on Sales & Account Management |
| bob@spyne.test | team_manager | Manages Customer Success; owns Acme Corp |
| frank@spyne.test | member | On Sales; useful target for "deactivate this user" demos |

…and `carol`, `dan`, `eve`, `grace` complete the set.

## Three key schema decisions

**1. Per-org email uniqueness via normalized lowercase, not `citext`.**
The `users.email` column is plain `text` with a composite unique index on `(org_id, email)`. Every email value passes through `normalizeEmail()` (trim + lowercase) at the Zod-validator layer before storage or lookup. Global email uniqueness is wrong for a multi-tenant product — the same person legitimately can be `hridhik@acme.com` in two different orgs. `citext` would also have worked, but it pins us to a Postgres extension, makes diffs less obvious, and surprises tooling that expects `text`. Doing normalization in the application layer keeps the data canonical and the SQL boring.

**2. Soft-deactivation via `deactivated_at`, plus `ON DELETE RESTRICT` on `account_owners.user_id`.**
Customer-account ownership has historical and operational value (audits, attribution, handovers) so we never hard-delete a user. `deactivated_at` is the single source of truth: nullable means "active", a timestamp means "deactivated". The auth middleware refuses sessions for deactivated users; the API blocks new ownership assignments to them. The FK uses `ON DELETE RESTRICT` so a stray `DELETE FROM users` cannot orphan ownership rows — it forces the operator to think.

**3. Hashed, time-bound, single-use invitation tokens with pre-baked team assignments.**
We store `token_hash = sha256(plain)`, never the plaintext token. The client sees the plain token exactly once, in the success modal after creation. The invite carries `team_ids uuid[]`, `expires_at`, and `accepted_at`. Acceptance is transactional with `FOR UPDATE` on the invite row, blocking double-accept races. Creating a second invite for the same `(org, email)` invalidates the prior pending one by setting its `expires_at` to `now()`, which keeps the lookup query simple (`accepted_at IS NULL AND expires_at > now()`).

## One trade-off considered and rejected

**Postgres Row-Level Security for tenant isolation.** RLS is the textbook answer for hard tenant boundaries and is genuinely strong. I rejected it for this take-home because the cognitive overhead — `SET LOCAL app.current_org = …` plumbed through every transaction, policies in SQL that reviewers must read separately from the app, and harder-to-debug error modes ("did the policy hide my row?") — would have outweighed the benefit at this size. Instead, every service function takes `orgId` as its first parameter and includes it in every `WHERE` clause; cross-tenant access returns `404`, never `403`. If/when we have many tenants in production and we start running ad-hoc SQL or sharing DB access with analysts, I'd revisit and adopt RLS as a defense-in-depth layer *on top of* this application-layer filtering.

## API surface

| Method | Path | Who | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | public | Create a new org + first admin; sets session cookie. |
| POST | `/api/auth/login` | public | Email + password. Sets session cookie. |
| POST | `/api/auth/logout` | any | Clears session cookie. |
| GET  | `/api/auth/me` | authed | Current user with teams + owned accounts. |
| GET  | `/api/invitations/:token` | public | Preview an invite (org name, email, role, teams). |
| POST | `/api/invitations/:token/accept` | public | Accept and create the user account. Sets session cookie. |
| POST | `/api/invitations` | org_admin | Create an invite. Returns `{ invitation, token }` once. |
| GET  | `/api/invitations` | org_admin | List pending invites for the org. |
| GET  | `/api/users` | org_admin | List users in the org. |
| GET  | `/api/users/me` | authed | Same as `/auth/me`. |
| PATCH | `/api/users/:id` | org_admin | Update role and/or team memberships. |
| POST | `/api/users/:id/deactivate` | org_admin | Soft-deactivate. Idempotent. |
| GET  | `/api/teams` | authed | List teams with members. |
| POST | `/api/teams` | org_admin | Create a team. |
| POST | `/api/teams/:id/members` | org_admin | Add a user to a team. Idempotent on duplicate. |
| DELETE | `/api/teams/:id/members/:userId` | org_admin | Remove a user from a team. |
| GET  | `/api/customer-accounts` | authed | List accounts with owners. |
| POST | `/api/customer-accounts` | org_admin | Create an account. |
| POST | `/api/customer-accounts/:id/owners` | org_admin | Add an owner. Rejects deactivated users. |
| DELETE | `/api/customer-accounts/:id/owners/:userId` | org_admin | Remove an owner. |

Error responses are always `{ error: { message, code } }`. Common codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT_LAST_ADMIN`, `CONFLICT_SELF_DEACTIVATE`, `CONFLICT_DEACTIVATED_USER`, `CONFLICT_DUPLICATE_NAME`.

## Auth approach

- Passwords are hashed with **bcrypt cost 10**, on every signup/accept/invite.
- Sessions are **JWTs** signed with `JWT_SECRET` (Zod-validated at boot to be at least 32 chars). The JWT carries `{ userId, orgId }` and expires in 7 days.
- The JWT is delivered as an **`HttpOnly` cookie** named `arali_session`, `SameSite=Lax`, `path=/`, `secure` only in `NODE_ENV=production`. No tokens in localStorage — they are unreachable from JavaScript.
- `requireAuth` re-fetches the user every request so deactivated users are kicked immediately, not at token expiry.

**What I would change for production:**

- Add short-lived **access tokens + refresh tokens**, so a stolen cookie can't outlive a deactivation by 7 days.
- If we ever loosen `SameSite=Lax` (e.g., for a separate marketing domain), add a **CSRF token** to state-changing requests.
- Rotate `JWT_SECRET` via a key-ID header on the JWT so we can flip secrets without a global logout.
- Add **rate limiting** on `/auth/login` and `/auth/signup`, and **email verification** before signup-as-admin is fully active.

## Role design today and tomorrow

Today the three roles (`org_admin`, `team_manager`, `member`) have a deliberate spread:

- `org_admin` can do everything in the dashboard.
- `team_manager` and `member` currently have the same API permissions: both can read `/teams` and `/customer-accounts` and read their own profile via `/users/me`. **`team_manager` does not yet have any elevated abilities at the API layer.**

The plan is that a `team_manager` should be able to manage memberships and details *only within team(s) they personally manage*. The data model already supports this: `team_memberships.is_manager` is the lever. The needed work is API-side — a `requireTeamManager(teamId)` middleware that checks `team_memberships.is_manager = true` for the current user and the target team — plus mirroring UI controls. I kept this out of scope to avoid half-shipping a permission model that isn't well-defined yet.

## Production hardening list

1. Rate limiting on `/auth/login`, `/auth/signup`, `/invitations/:token/accept`.
2. Email verification (signup + invite preview links shouldn't be the only signal).
3. Password reset flow with the same hashed-token pattern used for invites.
4. Refresh tokens + short-lived access tokens.
5. CSRF tokens if cookies ever go cross-site.
6. **Audit log** on every state-changing admin action (`audit_events` table).
7. SSO (OIDC / SAML) for org_admins; SCIM for provisioning.
8. Structured JSON logging + correlation IDs; an APM (Sentry / Datadog).
9. Bcrypt cost auto-tuning + secret rotation.
10. **Transfer-ownership-on-deactivation** flow (today, ownerships remain in place and the user simply can't be assigned new ones — that's deliberate but minimal).

## What I'd build next if I had another day

- **Transfer-ownership-on-deactivation**: a modal where the admin reassigns the deactivated user's accounts to specific replacement owners in one transaction.
- **Bulk invite** via CSV upload (`email,role,team1|team2`), with per-row errors.
- **Audit log UI** showing the last N admin actions.
- **Scoped team_manager permissions** as described above.
- **Automated access-control tests** — every endpoint × every role × {own-org, other-org} combination, in a single matrix.

## Known limitations

- No automated tests yet. There is a `backend/scripts/smoke-test.sh` that exercises the API end-to-end, plus per-phase verification scripts.
- The frontend re-fetches lists after every mutation; there's no client cache layer (React Query, SWR). For this size that is fine.
- A team can have managers but the UI doesn't yet promote/demote within a team — only the edit-user flow exposes the role-level lever.
- ER diagram is at `er-diagram.png` in repo root (when present). Generated from dbdiagram.io.
