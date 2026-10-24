# Stage C implementation plan

Written before implementation on October 18, 2026. Both repositories contain substantial existing uncommitted work; retain it. Work is local only. Neither protected database is an implementation target. Use the existing fresh, loopback PostgreSQL harness and no-evidence preload for qualification. No screenshots, recordings, traces, real charges, deployment or remote Git writes.

## Existing integration points

Stage A owns cashier-scoped native drafts, exact optional customer association, authoritative two-minute quotes and market authorization. Stage B's InPersonPaymentCoordinator revalidates those quotes, acquires canonical capacity, commits ProviderOperation before effects, records ProviderResultFact independently and converts capacity through the existing native placement/financial/handoff boundary. Its private payment scope supplies CustomerProviderPort and VerifiedCheckoutPort. RefundCoordinator reserves original financial units and only settles on independently verified reverse evidence. Customer invitations and both loyalty exclusions remain in those existing paths.

The current InPersonPaymentAdapter owns the shared native Payment handlers and cash/simulator evidence. Extend its method dispatch with a Square transport service rather than duplicate placement, inventory, refunds or customer workflows. Add immutable Square operation references in separate processor tables. Existing metadata explicitly prohibits plaintext credentials. Document storage uses Node/OpenSSL AES-256-GCM but is file oriented; introduce a dedicated authenticated token envelope using the same standard primitive, separate environment keys, context binding and key IDs.

## Sequence

- C1: review official SDK/API, write this plan and architecture. Pin official square 46.0.0, API 2026-09-16, confirm Node/TypeScript support and license.
- C2: vendor-owner OAuth initiation and authenticated completion, hashed one-use state bound to user/session/channel/vendor/environment, encrypted tokens, refresh serialization, revocation and merchant uniqueness. Backend validates merchant identity and selected active USD location.
- C3: production Devices API code creation/polling, multiple local device registrations/defaults, separate allowlisted Sandbox virtual devices. Never label fixtures physically paired.
- C4/C5: freeze merchant/location/device in committed payment preparation; durable device lease and stable operation keys; SDK Terminal checkout and optional exact ad-hoc itemization. Retrieve actual payments before recording success. Cancellation and lost-response recovery reuse the same operation.
- C6/C7: raw-body SDK signature validation, durable webhook receipts, merchant/environment/resource matching, reconciliation triggers and existing recovery sweep. Refunds use Refunds API and original-unit coordinator; PENDING never settles native refunds.
- C8: supported Android/iOS handoff URL and one-use correlation infrastructure; fail closed where legacy transaction evidence cannot prove the original operation. No Sandbox card handoff or physical qualification claims.
- C9: vendor settings payment integration composition and existing register/payment dialog extensions. Reuse approved shared controls and shell, section/action spacing and responsive dialog. No new UI standard.
- C10: credential-free SDK fixtures, guarded PostgreSQL integration, DOM/a11y/geometry checks, Stage A/B and commerce/identity/inventory/loyalty regressions, builds/typechecks/lint/boundaries. Real Sandbox is opt-in only with external prerequisites; hardware remains unverified.

## Deliberate policies

USD only. No platform fees, split tender, tips, offline completion, catalog/inventory sync or new loyalty. One merchant per environment may belong to only one vendor. Settings changes cannot mutate an initiated payment. Disconnect/reconnect/location or device removal must preserve unresolved obligations. Ad-hoc itemization is enabled only when exact original line arithmetic reconciles; otherwise use a documented amount-only request. Captured mismatches remain unresolved with capacity retained. Never infer success from a browser callback.
