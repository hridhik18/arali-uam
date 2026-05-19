# Decisions

A running log of secondary decisions made during this build that aren't worth crowding into the README.

## Invitations

- A new invite for the same `(org, email)` invalidates the prior pending invite by setting its `expires_at` to `now()`. The lookup query already filters `expires_at > now()`, so no second WHERE clause is needed. This keeps the most-recent invite as the only valid one and avoids "which token does the user have?" support questions.
- The invitation API returns the plaintext token **once**, in the create-invite response. The DB stores only `sha256(token)`. There is no "get my plaintext token back" endpoint by design.

## Concurrency

- The last-admin guard (both demote and deactivate) runs inside a transaction that takes `FOR UPDATE` row locks on the active-admin set. In a high-concurrency production setting we'd additionally use `SERIALIZABLE` isolation; for this take-home, row locking on the admin set is sufficient and clearer to read.
- Invitation acceptance also takes `FOR UPDATE` on the invitation row to prevent double-accept races.

## Idempotency

- Adding an already-existing team member or account owner returns `204` (no-op) instead of `409`. The intent is "ensure this owner exists," not "create a new ownership."
- Deactivating an already-deactivated user is a no-op that returns the user — easier UX than asking the caller to check first.

## Frontend data flow

- Pages and sections fetch their own data inside `useEffect`. No shared cache (React Query / SWR / Redux). After every mutation the local section calls `load()` again. This is verbose but obvious; we'd revisit if the dashboard grew much past three sections.
- Inviting a user pops a modal that surfaces the **plaintext invite URL** with a Copy button. There is no email sending in scope — sharing the link is the admin's job.

## Tenant isolation

- Cross-tenant resource access returns `404`, never `403`. A 403 leaks the existence of the resource; 404 doesn't.
- Every service function takes `orgId` as its first parameter and filters by it on every read. This is enforced by code review and by the smoke tests, not by RLS. See README for the rationale.

## Testing

- No unit tests in scope. The first thing to add would be an access-control matrix: every endpoint × every role × {own-org, other-org}, asserting the right status code.
- `backend/scripts/smoke-test.sh` covers the critical happy and unhappy paths end-to-end against the running server.

## Tooling notes

- The backend is ESM (`"type": "module"`). All relative imports use the `.js` extension even though source files are `.ts` — this is required by the Node ESM resolver under `moduleResolution: Bundler` once the code is compiled with `tsc`.
- Dependency versions are pinned. They were chosen to be a known-good set that compiles and runs on Node 20.x with no warnings.
