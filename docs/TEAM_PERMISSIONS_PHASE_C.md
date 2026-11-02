# Team permissions Phase C

Implemented locally on October 31, 2026. The existing admin shell, topbar, and workspace selector are preserved. A subsequent requested refinement adds an authorized Team sidebar entry for each business, changes its route from Settings to /vendor/team or /market/team, and removes the content width cap for this page only. No migrations, seeding, fixture writes, deployments, commits, browser automation, screenshots, or visual sweeps were performed.

## Implementation

One shared TeamWorkspace serves Vendor and Market Team routes. It implements the team directory, initials, backend names/emails, role/status badges, search by name/email, role filtering, pending invitations, inline invitation form, suggested role presets, grouped editable capabilities, employee detail/edit dialog, Owner-defined Administrator ceilings, resend, cancellation confirmation, and access-revocation confirmation. Loading, no-results, empty-invitation, success, validation, access-denied, retry, and revision-conflict states are included.

Directory and invitation reads fetch all 100-record API pages. Employee detail is loaded on demand before editing. Counts reflect backend records, including revoked memberships. Revoked membership status remains distinct from pending invitations. Invitation delivery state and expiry come from the API. Acceptance continues through the unchanged central `/account/invitation` flow.

## Figma reference and layout decisions

Read through the connected Figma MCP, following the figma-design-to-code skill:

- File `z0E5gETA4imgDzAzRaA0Zh`, Dashboard page `0:1`.
- Only `Farmstand team management`, frame `5:1998`.
- Implemented content `5:2104`, page heading `5:2105`, directory/invitation layout `5:2113`, directory `5:2114` / current team `5:2115`, controls `5:2124`, employee rows `5:2135` onward, role presets `5:2257`, permissions `5:2275`, invitation footer `5:2320`.

The content follows the design's 24px column gap, 22px directory padding, 36px initial avatars, restrained member rows, right-hand invitation form, and serif page message. It uses a flexible 1.28:1 column ratio. Below 1100px, the invitation form stacks beneath the directory; below 480px, filters and role options stack. Long identities and permissions wrap.

The Figma sidebar, utility bar, breadcrumb, and business eyebrow were excluded. The unrelated design layer was not implemented. The shell titles these routes Team. Team appears in the authorized workspace sidebar; the old Settings content links were removed. Permission groups reuse the approved native disclosure presentation with one open group per checklist.

## Reused components

Reused approved `Button`, `Card`, `Input`, `Field`, `SelectField`, `Radio`, `Checkbox`, `Badge`, `Alert`, `ErrorState`, `EmptyState`, `Spinner`, and `Dialog`, plus existing `RouteLink`, dashboard palette/font tokens, and native disclosure semantics. Dialog supplies the existing focus, Escape, focus restoration, busy-dismissal guard, animation, and reduced-motion contracts.

TeamWorkspace, AccessForm, and Permissions are feature compositions rather than new UI primitives. No existing component supplied the team lifecycle, capability registry presentation, revision drafts, or business-specific delegation behavior. Their CSS controls feature layout only. No shared UI primitive or design-category approval was added.

## API integration and authorization

Generated operations cover:

- `ownBusinessTeam`, `ownBusinessTeamMember`, `ownBusinessEmployeeInvitations`.
- `inviteBusinessEmployee`, `resendBusinessEmployeeInvitation`, `cancelBusinessEmployeeInvitation`, `changeBusinessEmployee`.
- New read-only `ownBusinessTeamPolicy`.

The narrow backend additions expose authoritative presets, grantable permissions intersected with the actor's grants and ceiling, required base capability, current membership ID, Owner status, per-member `canManage`, invitation `canManage`, and scoped member email. These are necessary because Phase B did not expose the actor ceiling or preset registry. They reuse BusinessTeamService authority and businessPreset rather than copying policy into frontend code. No new schema migration or writer was introduced.

Owners can manage eligible employees. Administrators see only Staff/Lead presets and permissions within their actual ceiling and grants. Owner, self, peer Administrator, inactive, and beyond-ceiling employee edits remain unavailable according to the backend projection. Staff/Lead role labels do not grant team authority. Protected provider/ownership capabilities are absent from delegable choices. Required workspace access cannot be unchecked. Presets populate drafts only on intentional selection; ordinary form edits preserve customization.

Writes retain Phase B backend enforcement and use `expectedRevision`. The transport recognizes only Phase B's exact revision-conflict sentinel under BAD_USER_INPUT as a conflict. A conflict blocks repeat saves and revocation until reloading current data. Owner ceiling input is submitted only for Administrator targets. Revocation clears grants through the existing writer and preserves unrelated memberships.

Workspace service instances bind the selected Channel token. The screen remounts by business and guards late reads with request generations. Authority failures clear private data and call the existing authority refresh hook. Successful mutations reload policy, team, and invitations. No client business ID supplies authority. No additional polling or push channel was introduced.

## Local files changed

Web feature files:

- `apps/admin/src/team/TeamWorkspace.tsx`, `team.css`, `service.ts`.
- Vendor and Market service adapters, route components, and Settings content links in `management/ManagementRoutes.tsx` and `market/settings.tsx`.
- `packages/admin-core/src/index.ts`: permission-aware dedicated Team routes and sidebar entries.
- `packages/api/src/team.ts`, API exports, generated Admin operations, Admin schema/provenance, and transport conflict mapping.
- `tests/team-management.test.tsx` and this report.

Backend changes are limited to `src/plugins/platform-identity/business-team.service.ts`, `src/plugins/marketplace-commerce/customer-account/employee-invitations.api.ts`, `employee-invitations.service.ts`, and focused assertions in `test/market-operations/team-invitations.ts`. Existing uncommitted Phase A/B changes were preserved.

## Verification

- Offline `npm run graphql:schema` and `npm run graphql:codegen`: passed without bootstrap or DB access.
- Focused Vitest: 28 tests passed across team-management, team-permissions, and team-invitations. Covers both business types, search/filter, current identities, editable presets, real submitted capabilities, invitation validation/create/resend/cancel, revision-bound employee saves, ceiling configuration, protected Owner controls, restricted presets, revocation confirmation, conflicts, empty lists, stale workspace requests, authority errors, and Channel-scoped transport.
- Scoped ESLint for the team feature, route/Settings integration, API, and tests: passed.
- Scoped TypeScript compilation of Admin and shared packages using the existing compiler options: passed.
- Admin production build: passed with existing large-chunk warnings.
- Backend development build: dashboard, server, and worker passed.
- Backend guarded team-invitation suite: all 15 security groups passed, including new policy/identity/ceiling/eligibility assertions. The successful disposable DB was dropped. One intermediate test compared permission ordering instead of sets; corrected and rerun successfully. Its failed disposable database was retained by the existing harness: `vendure_test_team_invites_1793491241933_33c5b3`.
- Full `npx tsc --noEmit`: blocked by 11 existing test-fixture errors in application-phase-d, application-review-workspace, fixtures/application-review-api, market-dashboard, occurrence-layouts, and phase15 tests. No remaining diagnostics in changed feature/API files. These unrelated fixtures were not modified.
- No automated browser navigation, screenshots, or responsive visual comparisons were run. Native dialog behavior, visual fidelity, and mobile layout require manual evaluation.

## Current persistent fixture state

Read-only inspection verified `localhost:5432/vendure_demo_market_ops`, no pending migrations, and the following current state. A dedicated read-only SQL transaction inspected only the Phase B businesses and their memberships/invitations. No password, role, ceiling, invitation, membership, or other saved data was changed.

| Workspace | Business                             | Channel | Current team                                               |
| --------- | ------------------------------------ | ------- | ---------------------------------------------------------- |
| Vendor    | Cedar Creek Produce, Vendor 44       | 59      | Mara Owner, Jordan Staff, Isabel Staff, Reed Administrator |
| Market    | Riverbend Saturday Market, Market 15 | 60      | Mara Owner, Jordan Staff, Lucia Lead                       |

All listed memberships are active. The five original invitations for these employees are accepted. Evelyn's invitation is revoked and Noah's is expired. There are currently no live pending invitations. Reed has no delegation ceiling, so he initially cannot invite anyone with required base access. The UI should display an explanation and disabled submission until an Owner explicitly grants an appropriate ceiling.

## Manual testing

From `E:\coding\farmers-market-platform-web`, start or restart the local API so it loads the new read-only fields. Use separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

No migration or fixture command is needed. Do not reset or seed the DB. If these processes already run, restart API/worker for backend code changes and use the existing frontend dev server.

Sign in at `http://auth.platform.localhost:4321/account/login`. Fixture password for the pre-created accounts is `Local-Team-Phase-B-2026!`; existing manually changed passwords were preserved.

| Account                                   | Intended verification                                |
| ----------------------------------------- | ---------------------------------------------------- |
| `team-phase-b-owner@test.invalid`         | Mara: team management in both businesses             |
| `team-phase-b-administrator@test.invalid` | Reed: Vendor Administrator, currently empty ceiling  |
| `team-phase-b-existing@test.invalid`      | Jordan: Staff in both businesses, no team management |
| `team-phase-b-lead@test.invalid`          | Lucia: Market Lead, no team management               |

Open `http://localhost:4322/vendor/team?channel=59` or `http://localhost:4322/market/team?channel=60` after selecting the corresponding workspace. Alternatively choose Team in the side panel. The existing shell remains in use.

1. As Mara, check current names, emails, roles, status, search/filter, and read-only protected Owner details. Initial pending lists should be empty. Switch workspaces and verify that directory contents change without exposing the previous business.
2. Invite a dedicated new test address you control, such as `phase-c-manual-staff@test.invalid`. Choose Lead, customize a checkbox, edit the email, and confirm the custom permission stays selected. Submit once. Check success, pending status, expiry, and queued/delivered email state. Resend, then explicitly cancel if this is only a temporary test. These manual actions intentionally change that dedicated invitation.
3. Local email is available at `http://localhost:3000/mailbox` or the existing backend `static/email/test-emails` directory. Acceptance uses the actual emailed link and existing account flow. After acceptance, Refresh team should move the recipient into active memberships. Existing accepted Phase B links cannot be reused.
4. Open Jordan's details and inspect grants. If deliberately testing saves, note his existing grants first and choose the intended change. For destructive checks, use the newly accepted dedicated employee rather than altering an established account. Revocation requires confirmation and should affect only the selected business.
5. As Mara, inspect Reed's Administrator ceiling. To exercise delegated management, explicitly save a ceiling including required Vendor identity plus desired operational capabilities. Sign in as Reed afterward: no Administrator invitation preset, Owner/self/peer edits unavailable, and only ceiling-intersected permissions offered. This manual ceiling change is optional and was not applied automatically.
6. Use two Mara sessions to open the same employee. Save in one, then save the stale draft in the other. Expect a conflict, disabled save, and an explicit reload that discards the stale draft. Reopen details to see the latest revision.
7. Sign in as Jordan or Lucia and verify the sidebar Team link is absent and direct team routes are restricted. Check narrow viewports, keyboard focus, native email validation, dialog Escape/Close, and reduced-motion settings manually.

## Intentional departures and remaining limits

The approved shared palette, fonts, button geometry, inputs, badges, radio/checkbox controls, and dialog presentation take precedence over Figma's fixed colors, 8px button corners, drawn icons, and small text. Figma utility icons were not introduced as a separate asset set. Capability labels and grouping use actual registry permissions rather than the mockup's seven broad example permissions. Avatar initials and summaries derive from real records. No static employee examples are rendered.

The primary content frame does not define a separate employee-edit or mobile frame. Editing therefore uses the existing animated Dialog, not a redesigned shell or a new sidebar. No cropped screen images or temporary Figma asset URLs are used. The Figma file itself was not edited.

Expired/canceled/accepted invitation history is intentionally absent from the pending list because Phase B's list endpoint returns only unexpired pending records. No invitation-history API, ownership transfer, business deletion, bulk employee actions, or push-based permission updates were added. Visual fidelity and browser/mobile behavior await manual review; no claim of pixel-perfect validation is made.

## Team page refinement verification

The requested Team navigation, full content width, and exclusive permission disclosures were verified with 21 focused frontend tests, scoped ESLint, Admin/shared-package TypeScript, and the Admin production build. The build retains the existing chunk-size warning. No backend or database changes were needed for this refinement.
