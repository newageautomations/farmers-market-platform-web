# Automatic Stripe returns and shared accounts

Implemented locally on November 10, 2026. Changes to the paired backend were explicitly authorized.

OAuth return parameters now trigger the existing authenticated completion mutation automatically once payment management configuration has loaded. The manual Check Stripe authorization button is removed. An in-memory attempt guard prevents effect replay from submitting the code twice. The original member, channel, organization, membership and state checks remain on the backend. Completion refreshes authoritative account status and removes the return credentials while preserving other query parameters and the hash. Unmounting or changing services prevents an old completion from updating another workspace. Hosted onboarding's separate return and expired-link controls are unchanged.

The reported error has a concrete code path: OAuth exchange succeeds, then attachment rejects an account already mapped to another organization with `ACCOUNT_ALREADY_MAPPED`. The broad attachment catch translates that failure into `OAUTH_RECONCILIATION_REQUIRED`. A separate condition also rejected fresh authorizations for an already connected account in the same organization. These restrictions are removed. Genuine uncertain exchanges still require a fresh authorization because a Stripe code cannot safely be replayed.

Each organization retains its own immutable payment account row, permission boundary, generation, readiness and financial references. A new forward-only migration replaces global Stripe account uniqueness with organization/account uniqueness, adds a nonunique account lookup index, and retains the existing one-active-account-per-organization index. It does not change or delete populated rows. OAuth and hosted attachment look up the current organization's association. Checkout and historical refund routing include the original vendor and connection generation rather than selecting the first row sharing a Stripe ID. Disputes resolve the original account association from checkout obligations or invoice collection journals, including historical generations, before recording organization attribution.

Disconnect now revokes only the workspace association for both connection methods. It does not call Stripe's platform-wide OAuth deauthorization endpoint. This avoids revoking another workspace's access, including during concurrent attachment, and retains provider access for historical reconciliation. Pending-operation disconnect checks use the original workspace and account generation, so another business's unfinished checkout or invoice cannot block the local disconnect. Revocation from Stripe itself is still corroborated and applied to every linked organization. Account lifecycle webhooks refresh every linked association and ignore historical disconnected rows. Financial webhooks bound to existing checkout or invoice operations continue to use those operations. Unallocated account-level financial events, such as payouts spanning multiple organizations, require reconciliation rather than arbitrary vendor attribution (`SHARED_ACCOUNT_FINANCIAL_ATTRIBUTION_REQUIRED`). This change does not implement allocation of an account-wide payout across businesses.

The existing Payments controller reuses Alert, Button, Dialog, Card, ErrorState and ReadState. No new component, styling standard or database reset was introduced. The component guide and approved registry were consulted.

Web files changed:

- `apps/admin/src/management/payments.tsx`
- `tests/stripe-connect-phase-c.test.tsx`
- This document

Paired backend files changed:

- `src/plugins/payments/account.service.ts`
- `src/plugins/payments/entities.ts`
- `src/plugins/payments/onboarding.service.ts`
- `src/plugins/payments/webhook.service.ts`
- `src/plugins/payments/checkout.service.ts`
- `src/plugins/payments/refunds.service.ts`
- `src/migrations/1797300000000-SharedStripeAccounts.ts`
- `test/payments-stripe/phase-c.ts`
- `test/payments-stripe/phase-e.ts`

Before manual testing, from the web project run `npm run demo:market-operations:migrate`, then restart the API and worker through `demo:market-operations:serve` and `demo:market-operations:worker`. Use `demo:market-operations:admin` for the admin frontend. The migration command targets `vendure_demo_market_ops`. The persistent database has not been migrated by this change. Old consumed OAuth attempts remain consumed; start a new connection after migration.

Verification commands:

- Web: `npx vitest run tests/stripe-connect-phase-c.test.tsx tests/stripe-connect-phase-d.test.tsx tests/management.test.tsx --reporter=dot`
- Backend: `npm run test:stripe-connect:accounts`
- Backend: `npm run test:stripe-connect:checkout`
- Backend: `npx tsc --noEmit --project test/payments-stripe/phase-e.tsconfig.json`
- Backend PowerShell build: `$env:APP_ENV='dev'; $env:NODE_ENV='development'; npm run build`

The focused web tests passed (34 tests). The backend build and scoped compiler checks passed. Database qualification uses the existing guarded disposable database harness and controlled provider transports, with no real Stripe requests. Account qualification passed all 15 groups. Checkout qualification passed all 25 groups, including a new two-vendor shared-account charge/refund scenario, wrong-vendor refund rejection, independent disconnect while another vendor has an unfinished checkout, and the existing dispute regression after a shared association has been disconnected. The web scoped compiler check remains blocked by the existing possibly undefined `target` in `packages/ui/src/table-navigation.ts:29`. Focused ESLint reports the two existing controller patterns: updating a ref during render and resetting state in the service-change effect. Neither pattern was introduced by this change. Browser and live Stripe authorization testing were not performed.
