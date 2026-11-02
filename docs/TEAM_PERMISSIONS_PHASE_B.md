# Team permissions Phase B

Implemented locally on October 31, 2026, across the web and backend repositories. Existing uncommitted Phase A changes and later corrections were preserved. No migration, fixture command, or data write was performed against `vendure_demo_market_ops`. No deployment, external provider call, commit, push, browser automation, or screenshot test was performed.

## Implementation

Vendor and Market businesses share one employee invitation lifecycle. Owners can propose Staff, Lead, or Administrator access using the existing capability registry and presets. Authorized Administrators can propose and manage Staff/Lead access within their own current grants and Owner-defined ceiling. Invitation grants are stored in dedicated, unassigned native Vendure Roles. Accepted memberships use their own exact-Channel native Roles. There is no JSON permission store, employee credential store, or new authentication system.

The backend adds invitation creation, pending-list reads, resend, cancellation, recipient preview, explicit acceptance, safe member-list/detail reads, revision-checked role/grant/ceiling updates, and revocation. Acceptance reuses the platform User and its existing native Administrator, or creates only the missing Administrator record on that same User. Customer records, credentials, personal phone proof, other memberships, and customer history are preserved.

The frontend adds only `/account/invitation` on the central Astro account origin. It composes the existing SiteLayout, Astro Button, native forms, account-panel layout and shared alert presentation. A dedicated route is necessary because recovery, onboarding and workspace selection have different lifecycle and authority contracts. No new UI primitive, dashboard shell, permission checklist, employee list, management panel or design standard was created. Existing login/signup handling preserves this continuation without starting Vendor/Market onboarding.

## Database and rollout

Backend migration: `src/migrations/1795400000000-EmployeeInvitations.ts`.

- `platform_employee_invitation` stores the exact business and Channel, normalized recipient email, inviter User and membership, existing recipient User binding when available, proposed role/native Role/preset version, timestamps, status, digest/version, accepted User/membership and durable delivery state.
- Restrictive foreign keys preserve references. Checks constrain subject, status, roles and acceptance metadata. A partial unique index allows only one pending invitation for a Channel/email pair. The same email can have independent invitations to multiple businesses.
- `platform_employee_invitation_rate` stores hashed, purpose-specific hourly request counters. Rate writes commit independently of unsuccessful domain transactions.
- Down migration deliberately refuses to discard invitation history. No existing Owner constraints or Phase A grants are rewritten.

Run these commands only when choosing to prepare the populated local test environment. Stop the demo server and worker first. Run from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:inspect
npm run demo:market-operations:migrate
npm run demo:market-operations:inspect
```

Inspect must identify the local `vendure_demo_market_ops` database and its pending migrations. The guarded migration command applies required pending migrations without resetting, truncating, reseeding or replacing data. This implementation did not run those commands against that database.

## Invitation security and delivery

Links contain 32 cryptographically random bytes, expire after seven days, and are purpose-separated from login, recovery, purchase claims, account email proof and handoffs. The database stores a purpose-prefixed SHA-256 digest. Opening or previewing a link does not authenticate, create membership, consume it, or mark the general account email verified.

The central page immediately redirects to a clean URL, moving the token into an HttpOnly, host-only, SameSite=Lax cookie. Secure is enabled on HTTPS. Initial token handling sends no-referrer; clean account pages use the existing strict-origin policy so native form submissions retain their Origin. Responses are private/no-store and noindex. The acceptance POST checks the central origin, a separate random SameSite=Strict CSRF cookie/form proof, the displayed principal, the existing central session, current verified personal phone and the exact invited email. The emailed capability supplies invitation-specific mailbox proof. Existing recipients are additionally pinned to the same User recorded at invitation creation. Email matching without the capability cannot grant access. Wrong-account users can use existing global sign-out, preserving the invitation, then sign into the correct identity.

Resend rotates the digest, increments its version and starts a new seven-day window. Old links fail immediately. Resending explicitly re-endorses the proposal under the resender's current authority. Pending or expired invitations can be resent, subject to policy; accepted/revoked invitations cannot. Repeated acceptance fails and cannot restore revoked access. A rejoin needs a newly created authorized invitation and explicit acceptance. An existing revoked membership is reactivated with exactly the new grants and an empty previous delegation ceiling.

Creation and resend each allow 20 attempts per actor/Channel/hour. Central preview allows 120 per client boundary/hour and acceptance allows 30 per boundary/hour. Authenticated Shop preview and acceptance have separate per-User limits. Existing HTTP/account limits remain in force. Counters include failed attempts after the relevant authentication gate.

Delivery uses existing `sendAccountEmail` configuration, including provider sender/suppression/idempotency safeguards or development file output. A scheduled worker processes pending invitation deliveries each minute. AES-256-GCM protects the capability in a delivery-only envelope until successful delivery; ordinary invitation queries exclude both this envelope and the digest. The envelope key is purpose-derived from the existing server bridge key. Retry backoff persists in the invitation row, with a maximum one-hour delay. Successful delivery deletes the envelope. A retry of the same version has the same email body and provider idempotency key. A crash after provider delivery but before database commit can cause repeated local file delivery; provider delivery uses its existing idempotency convention.

Keep the bridge key stable across API/worker processes. If it changes while email is pending, an authorized resend regenerates that pending delivery with the current key. Tokens never enter audit/outbox metadata, ordinary GraphQL DTOs, frontend HTML, request form fields or operational logs. The local email files intentionally contain usable invitation links and must stay local and ignored by Git.

## APIs and authorization

All Admin team operations resolve the authenticated User's current active business membership and exact selected Channel. There is no client-supplied business ID that confers authority. Safe projections expose only business-team facts and effective grants, without unrestricted Users, native Role graphs or capabilities.

| Admin API                              | Behavior                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ownBusinessTeam(skip)`                | Up to 100 business-scoped members, including current role/status/effective grants/revision. Owner can see delegation ceilings. |
| `ownBusinessTeamMember(id)`            | Scoped member details, or null for an out-of-scope identifier.                                                                 |
| `ownBusinessEmployeeInvitations(skip)` | Up to 100 live pending invitations; no secret fields.                                                                          |
| `inviteBusinessEmployee(input)`        | Email, employee role, optional explicit permission array. Omitting permissions copies the current preset once.                 |
| `resendBusinessEmployeeInvitation(id)` | Revalidate, assume inviter responsibility and rotate the link.                                                                 |
| `cancelBusinessEmployeeInvitation(id)` | Revoke a pending invitation and discard queued delivery material.                                                              |
| `changeBusinessEmployee(input)`        | Full proposed role/grants, optional ceiling/revoke, mandatory `expectedRevision`; stale updates fail.                          |

Authenticated Shop API roots `employeeInvitation(token)` and `acceptEmployeeInvitation(token)` use the same service. The central account frontend uses the existing server-only account bridge for preview, recipient checks and acceptance, so it does not need a merchant session or a pre-existing business membership. The bridge verifies its existing shared server credential and account origin; browsers cannot invoke it directly. Shop's existing context/session safeguards remain intact.

Owners cannot edit, revoke, demote or remove their protected ownership through these APIs. Administrators cannot assign Administrator, manage an Owner/Administrator, edit themselves, configure ceilings, or propose grants beyond either their own current grants or ceiling. Existing target grants must also fit that authority for employee updates. Lead/Staff do not gain team authority from their labels or arbitrary grants.

Team writers and invitation lifecycle writers take the same per-Channel transaction lock before membership/invitation locks. Acceptance rechecks invitation digest/status/expiry, exact identity, active business, the original inviter membership, current delegation policy and the unassigned proposal Role. Membership assignment, single-use consumption, audit and lifecycle events commit together. Concurrent revocation linearizes with acceptance and grant changes. Existing live membership authorization prevents stale native sessions from continuing protected work after revocation. Revocation clears the dedicated membership Role, removes its User assignment, clears its ceiling and preserves identity and other business access. Already rendered controls refresh through the existing authority-refresh behavior; there is no new push channel.

Invitation audit/outbox facts include EmployeeInvited, EmployeeInvitationResent, EmployeeInvitationCanceled and EmployeeInvitationAccepted. Existing BusinessEmployeeAuthorityChanged audit and MembershipChanged events carry actor/resource references, before/after role/status/revision/grants/ceiling and Market attribution. No duplicate employee email or in-app notification type was introduced.

## Verification

Only focused checks were run. All backend database tests use newly created, guarded loopback `vendure_test_*` databases. Successful databases are dropped; failed intermediate databases are retained by the existing harness policy.

| Check                                                                          | Result                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend `npm run test:team-invitations`                                        | 15 security groups passed. Covers fixture idempotency, inert preview, duplicate races, exact recipient identity, existing/new account acceptance, ordinary SMS signup, multiple businesses, expiry/cancellation/resend, replay, Owner protection, ceilings/self-escalation, inviter authority loss, concurrency, delivery retry, HTTP GraphQL/central bridge, revisions, safe DTOs, immediate revocation and audit integrity. |
| Backend `npm run test:team-permissions`                                        | 13 Phase A security groups passed, including HTTP product/inventory mutations, protected ownership, live sessions, cross-business isolation and queued billing authorization.                                                                                                                                                                                                                                                 |
| Backend development `npm run build` with `APP_ENV=dev`, `NODE_ENV=development` | Dashboard, server and worker passed.                                                                                                                                                                                                                                                                                                                                                                                          |
| Backend `npm run demo:market-operations:types`                                 | Passed, including guarded setup/API/SMS helpers.                                                                                                                                                                                                                                                                                                                                                                              |
| Web focused Vitest                                                             | 9 invitation tests passed. Existing unified-authentication and account-switching tests passed all 22 tests.                                                                                                                                                                                                                                                                                                                   |
| Web `npm run typecheck --workspace @market/storefront`                         | Zero errors, warnings or hints.                                                                                                                                                                                                                                                                                                                                                                                               |
| Web `npm run graphql:schema` and `npm run graphql:codegen`                     | Passed offline, without application bootstrap or database access.                                                                                                                                                                                                                                                                                                                                                             |

The initial sandboxed database connection was denied. Focused test commands were then run with local PostgreSQL access. Intermediate failures exposed a delivery SQL quoting error and test-only history/status/mocking assumptions; these were corrected and affected checks rerun. No broad repository suite, browser automation or screenshot sweep was run. The Phase A run retains its existing pg concurrent-query deprecation warning and expected denied-native-graph log during negative tests.

## Dedicated local fixtures

After applying migrations yourself, run from the web directory:

```powershell
npm run demo:market-operations:team-invitations-fixtures
```

This explicit command creates only dedicated Phase B identities, Cedar Creek Produce (`phase-b-cedar-creek`) and Riverbend Saturday Market (`phase-b-riverbend`). It prints their dynamic business/Channel IDs. It creates protected Owners through existing provisioning services and pending invitations through the actual authorized invitation service. It emits local test email, then makes narrowly scoped expired/canceled scenarios. It never inserts accepted employee memberships or bypasses acceptance. Retry preserves existing passwords, memberships, permissions and invitation history. It does not re-invite someone whose scenario has already been accepted/canceled. No Manna Roots, Boerne, Phase A or other established accounts are changed.

All pre-created accounts use `Local-Team-Phase-B-2026!`. Their local fixture phones are synthetic, verified fixture identities; general account email verification remains unset.

| Account                                   | Name and scenario                                                                                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `team-phase-b-owner@test.invalid`         | Mara Sullivan, protected Owner of both new businesses.                                                                                                                                                      |
| `team-phase-b-existing@test.invalid`      | Jordan Rivera, existing Customer invited as Staff to both businesses.                                                                                                                                       |
| `team-phase-b-lead@test.invalid`          | Lucia Morales, Market Lead invitation.                                                                                                                                                                      |
| `team-phase-b-administrator@test.invalid` | Reed Bennett, Vendor Administrator invitation. Ceiling is initially empty.                                                                                                                                  |
| `team-phase-b-revoked@test.invalid`       | Evelyn Brooks, canceled Vendor invitation.                                                                                                                                                                  |
| `team-phase-b-expired@test.invalid`       | Noah Foster, expired Market invitation.                                                                                                                                                                     |
| `isabel.chen.phase-b@test.invalid`        | Isabel Chen, invited Vendor Staff. Account is deliberately absent until ordinary signup. Use personal fixture phone `+12105550879` and choose `Local-Team-Phase-B-2026!` during signup for the steps below. |

Start in separate web-directory terminals:

```powershell
npm run demo:market-operations:serve -- --team-invitation-sms
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

The optional `--team-invitation-sms` flag is accepted only by the guarded demo server. It uses existing phone signup validation, challenge expiry, hashing and rate budgets, with a local delivery sink restricted to `+12105550879`. It refuses every other number and makes no external call. Omit the flag for normal demo serving. It does not change the persistent dataset at startup or replace real identities' verification state.

Email files: `E:\coding\farmers-market-platform\static\email\test-emails`. Local viewer: `http://localhost:3000/mailbox`. Open the link in the invitation email, rather than reconstructing a token. Two messages to Jordan correspond to the two independent businesses. Links lead to `http://auth.platform.localhost:4321/account/invitation?token=...` and immediately become `/account/invitation`.

During Isabel's signup, read the current local SMS code in `E:\coding\farmers-market-platform\.demo-market-operations\team-invitation-sms\isabel.json`. Enter it in the ordinary `/account/verify` form. A resend replaces the saved message; normal challenge expiry and attempt limits still apply. This file is ignored local runtime data, has no HTTP retrieval endpoint, and must not be committed.

## Manual API client

There is no Phase C management screen yet. Use the guarded local helper with a JSON GraphQL request file. It starts an ephemeral local API process against the guarded demo database, signs in the selected dedicated fixture actor through normal password login and Admin handoff, sends the actual authorized HTTP GraphQL operation on the requested Channel, prints only the safe response, then ends its own session. It accepts only the dedicated Phase B actor names. It cannot accept invitations or insert memberships on their behalf. Invalid authority fails either at workspace handoff or at the real resolver.

From the web directory, replace `<vendor-channel>` with the fixture's printed Channel ID:

```powershell
@'
{"query":"query { ownBusinessTeam { id name role status permissions delegationCeiling grantRevision } ownBusinessEmployeeInvitations { id email role status expiresAt deliveredAt } }"}
'@ | Set-Content -LiteralPath phase-b-request.local.json
npm run demo:market-operations:team-invitations-api -- --actor owner --channel <vendor-channel> --request phase-b-request.local.json
```

Replace the file content with any following request and rerun the same command. Change `--actor` to `administrator`, `lead` or `existing` to test actual authority. Use the Market Channel for Market operations. New or resent invitations created by the helper are delivered by the running demo worker, normally within a minute.

Create another Staff invitation, optionally customize its grants:

```json
{
  "query": "mutation($i:InviteBusinessEmployeeInput!){inviteBusinessEmployee(input:$i){id email role status expiresAt}}",
  "variables": {
    "i": {
      "email": "additional.employee.phase-b@test.invalid",
      "role": "staff",
      "permissions": ["ReadOwnVendorIdentity", "ReadOwnCatalog"]
    }
  }
}
```

Resend or cancel, substituting a returned invitation ID:

```json
{
  "query": "mutation($id:ID!){resendBusinessEmployeeInvitation(id:$id){id status expiresAt}}",
  "variables": { "id": "<invitation-id>" }
}
```

```json
{
  "query": "mutation($id:ID!){cancelBusinessEmployeeInvitation(id:$id){id status}}",
  "variables": { "id": "<invitation-id>" }
}
```

Update grants/role using the current member ID and revision from `ownBusinessTeam`. This Owner example explicitly limits Reed's authority to delegate base Vendor and catalog reads:

```json
{
  "query": "mutation($i:ChangeBusinessEmployeeInput!){changeBusinessEmployee(input:$i)}",
  "variables": {
    "i": {
      "id": "<reed-membership-id>",
      "role": "administrator",
      "permissions": [
        "ReadOwnVendorIdentity",
        "ReadOwnCatalog",
        "ManageOwnVendorMembership"
      ],
      "delegationCeiling": ["ReadOwnVendorIdentity", "ReadOwnCatalog"],
      "expectedRevision": 1
    }
  }
}
```

Use the actual revision, which may be greater than 1. Omitted ceiling preserves it for an Administrator; an empty ceiling clears it. Demotion or revocation clears it. Revision mismatches fail without writing.

Revoke Jordan's Vendor membership with its current revision:

```json
{
  "query": "mutation($i:ChangeBusinessEmployeeInput!){changeBusinessEmployee(input:$i)}",
  "variables": {
    "i": {
      "id": "<jordan-vendor-membership-id>",
      "role": "staff",
      "permissions": [],
      "revoke": true,
      "expectedRevision": 1
    }
  }
}
```

## Manual sequence and expected results

1. Sign in as Mara at `http://auth.platform.localhost:4321/account/login`. Open `/account/workspaces`: only Mara has the two protected business workspaces before acceptance. Use the API client to see pending invitations and Owner membership.
2. Open Isabel's emailed invitation while anonymous. Expect Cedar Creek Produce, Vendor type, Staff, access summary and expiry. The token disappears from the address bar. Reloading does not add a membership. Create her ordinary account, use the restricted local SMS code, then sign in. Expect a return to the invitation with an explicit Accept action, without business onboarding. Accept and follow Choose your workspace. Vendor access appears. Reopening the old link cannot add another membership.
3. Open Lucia's email and sign in as Lucia. Accept the Market Lead invitation. Expect Riverbend Saturday Market in the chooser and no Cedar Creek workspace. Her Market operational grants follow the existing Lead preset.
4. Sign in as Jordan and open each of Jordan's two emails. Explicitly accept each. Both businesses appear under the same platform User, with independent Staff grants. Customer account access remains available. Open a link while signed in as someone else: expect a different-account message, no acceptance, and a safe sign-in-switch action.
5. Sign in as Reed and accept the Administrator email. Expect Vendor access, but delegation initially fails because the ceiling is empty. Mara can apply the API example above. As Reed, inviting Staff with only `ReadOwnVendorIdentity` and `ReadOwnCatalog` now succeeds. Inviting Administrator or default Lead, granting finance/team authority, editing himself, or editing Mara fails. Use `ownBusinessTeam` as Mara to verify no unauthorized change.
6. Open Evelyn's canceled link and Noah's expired link. Both show their unavailable status and cannot grant access. Mara can resend Noah's expired invitation through the Market API; the old link becomes invalid and only the new link can be accepted. Repeated create for a pending business/email fails. An invitation to the same email in another business remains independent.
7. As Mara, revoke Jordan's Vendor membership through the API. Reload the chooser: Vendor disappears while Market and Customer remain. Existing Vendor protected requests immediately fail. An accepted old invitation cannot restore it. Create a fresh Vendor invitation to Jordan, then explicitly accept it as Jordan to rejoin with the new grants.
8. To test inviter authority loss, let authorized Reed create an invitation to an additional dedicated email; then Mara reduces Reed's grants/ceiling or revokes him before acceptance. The invitation cannot be accepted under his old authority. An Owner may explicitly resend a still-pending proposal under current Owner authority. Wrong-Channel invitation IDs and employee IDs must fail or return no scoped member detail.
9. Use `http://localhost:4322/vendor?channel=<vendor-channel>` and `http://localhost:4322/market?channel=<market-channel>` after acceptance. Workspace switching uses the existing central handoffs. Domain entitlements still apply; these new businesses intentionally have no unrelated catalog, orders, billing or provider fixtures.

## Local file scope and Phase C

Backend additions: invitation entity/rate model, migration, shared invitation service, Admin/Shop resolvers, disposable integration suite, guarded fixture module and API client. Existing team service, API boundary, identity/commerce plugin registration, account bridge, demo dispatcher and npm scripts were extended. Web changes: central invitation route, existing login/signup/POST continuation handling, initial-link referrer policy, fixed safe-return route, focused acceptance tests, guarded demo commands, offline schema extraction and generated Admin/Shop contracts, plus this single report.

Phase C still owns the full Team & Permissions management interface, employee lists, permission checklists, animated panels and richer employee-management affordances. Ownership transfer/deletion and onboarding-wide email verification remain outside this phase. There is no general local SMS bypass, ownership transfer API, background permission push, or business provisioning as part of employee signup. Frontend verification used focused request tests and Astro diagnostics, not a browser-based end-to-end run.
