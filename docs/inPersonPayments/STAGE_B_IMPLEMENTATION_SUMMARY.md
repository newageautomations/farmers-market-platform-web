# Stage B implementation summary

Implemented locally across both authorized repositories on October 18, 2026. Existing uncommitted feature work was retained. No commit, remote Git action, deployment, production credential change, real card transaction, screenshot, video or trace was performed. Neither `vendure` nor `vendure_demo_market_ops` was migrated or modified.

## Backend and database

The new InPersonPaymentCoordinator extends Stage A with current vendor/cashier authority, locked quote/version/expiry/price/tax/publication/source checks, existing physical capacity acquisition, durable attempts and append-only state history. Cash and the isolated simulated provider share the existing provider intent/result, native placement, financial allocation and refund infrastructure. There is no second cart, order, monetary, inventory, customer or refund engine.

`1792900000000-InPersonPayments.ts` is additive and was applied only to fresh guarded disposable databases. It adds payment attempts/events, cash refund attestations and nonsecret merchant metadata, extends existing guarded context/provider vocabularies and supports anonymous in-person financial snapshots without inventing customer accounts. Identity, tender, change, evidence, original financial facts and payment-locked sale terms are immutable. A destructive downgrade refuses to discard payment history.

The original native transition barrier remains in force outside the private POS coordinator capability. The existing placement capability still authorizes native Payment/allocation. Explicit IN_PERSON context preserves independent or actual market occurrence provenance, using a single native Regular order and self-links. Physical sale capacity is not confused with preorder caps or windows.

## Cash, terminal and recovery

Cash checkout follows review, Cash, amount/Exact Amount, Confirm Cash Received and a persistent receipt. Currency parsing/formatting reuse existing exact BigInt helpers; change is integer subtraction. Insufficient/negative/decimal-minor-unit/unsafe inputs are rejected. Evidence is `CASHIER_ATTESTED_CASH`, with original cashier/vendor/order, expected total, tender, change and confirmation time. Duplicate confirmations reuse the original request and effect.

Simulated Terminal - Test Only exercises the same coordinator and native records. Success, decline, cancellation, timeout, interruption, delayed success/failure and duplicate success are backend-controlled durable scenarios. Simulated full/partial refunds, duplicate refund observations and failed-then-retried original refunds use the same original-unit infrastructure. Every simulated effect checks explicit test configuration, nonproduction process settings and the actual loopback/public/randomized POS test database. Protected and ordinary database names fail the guard. No fake-success callback or card form is exposed.

Payment evidence commits separately before native finalization. Uncertain/captured-but-unfinalized attempts retain canonical inventory holds; their operational deadline does not expire while an outcome is unresolved. Definitive decline/cancellation releases capacity. Successful placement, verified original financial units, hold conversion and native delivered handoff commit together. On-hand decrements and allocation release occur exactly once through the existing checked operational writer, labelled In-person handoff.

A paid finalization interruption retains the original evidence and capacity. Manual status checks and the bounded scheduled sweep retry that original order. A prepared attempt interrupted before the provider effect is also recoverable. Browser reload exposes unresolved attempts and the latest completed cashier-owned receipt. Dropping a real cash-success response in Chromium and then reloading restores that actual receipt without another payment. Original refund finalization is similarly recoverable from its independently committed reverse evidence.

## Customer and order integration

Optional Stage A exact email/phone lookup still requires no OTP and grants no customer-session access. Existing customer references survive native payment and financial allocation. Anonymous sales remain anonymous. Guest intent is converted through the current CustomerAccountService into its existing frozen checkout contact and secure purchase-linked invitation flow, only after committed sale completion. A successful per-purchase marker prevents duplicate invitations; failed delivery remains retryable without undoing payment. The disposable sender captures fictional recipients in memory and sends no real message.

Existing vendor Orders includes the in-person source/filter, delivered native state, backend receipt and refund controls. Detailed views retain payment method/evidence, cashier reference, optional customer, selling context, products, quantities, subtotal/discount/tax/total, cash/change and separate refund history. Existing customer purchase projections/relationship processing support the in-person self-link topology; anonymous orders create no customer relationship.

Cash refunds require current `RequestOwnVendorRefund`, existing owner membership, original units, reason and explicit physical cash-return confirmation. POS-only staff do not inherit this authority. Generic original-unit APIs cannot bypass the POS attestation scope. Full, partial, multiple partial and duplicate requests use original paid units and their original tax/discount shares. No refund rewrites the original payment or automatically restocks delivered merchandise. Pending/failed original refund controls remain available after reload.

Neither vendor loyalty nor market challenge progress is awarded by in-person placement, handoff or refunds. Stage G remains the final integration stage.

## Frontend quality and component reuse

PosPaymentDialog, PosSaleDetails, PosOrderPayment and PosRefundDialog are feature compositions of the existing dashboard, Dialog, Button, Card, Badge, Field, Input, Textarea, Checkbox, SelectField and RouteLink. Existing components did not provide payment evidence/uncertainty/original-unit cash returns, so these feature compositions were necessary. No shared primitive, UI library, pending design approval or competing styling system was introduced. Existing cart serialization, catalog quick-add and backend pricing remain intact.

DOM/computed-style tests verify cash input, receipt and refund layout at 1280, 768 and 390px. Sections/footer separation is 24px; shared action gaps are 12.8px; touch controls are at least 44px. Shared Dialog padding remains its responsive clamp: 32px desktop, 23.04px tablet and 16px mobile. Keyboard focus, Exact Amount keyboard activation, native dismissal, serious/critical accessibility findings and horizontal overflow are checked without screenshots. Payment uncertainty preserves the original operation rather than showing a success receipt or a charge-again action.

## Qualification results

The subsequent register refinement keeps Start checkout and coupon Apply aligned with their controls, including mobile, through the shared field/action grid. The shared customizable Select centers its selected text at both ordinary and touch control heights. Favorites and product favorites use large outline/filled heart UtilityIcons in existing icon-only Buttons; their selected state has no underline. A vertical divider separates fixed Favorites from a native horizontal category strip. Width/content observation controls desktop/tablet arrows; mobile uses native horizontal swiping.

Products now start a checkout directly when none is active. Start checkout alone and closing a variant choice make no draft write. The first variant and its native draft commit atomically, reuse the same receipt key after interruption and roll back together on rejected input. Further additions retain the existing serialized queue. Saved draft reads omit empty snapshots, including carts emptied by removing the last item, without deleting native or audit history. No migration was needed for this refinement.

Follow-up qualification passed 22 POS backend groups, all 27 payment groups, 58 POS/payment/shared UI unit tests, web TypeScript/Astro, backend and synthetic production web builds, source-only schema generation, targeted ESLint and all nine package boundaries. Chromium checks cover setup alignment and selected text centering at 1280, 768 and 390px, coupon alignment, filled hearts, fixed Favorites, arrow navigation, native touch events, responsive overflow and the existing sale/refund/recovery walkthrough. The existing dashboard limits its content width, so the fit/overflow assertions use actual catalog content and its available space rather than assuming unlimited desktop expansion.

| Check                                                    | Result                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Stage B real PostgreSQL integration                      | PASS, 27 groups; successful database removed                                                                    |
| Stage A POS regression                                   | PASS, 22 groups after the register refinement; successful database removed                                      |
| Real Chromium register/payment/refund/reload walkthrough | PASS, 15 groups, including category navigation and real dropped-response recovery                               |
| Related frontend unit suites                             | PASS, 95 tests across six suites, including 20 payment cases                                                    |
| Existing paid attribution/refund                         | PASS, 62 groups, including its nested full native commerce, inventory, catalog, market and identity regressions |
| Existing vendor loyalty                                  | PASS, 33 groups; successful database removed                                                                    |
| Existing market loyalty                                  | PASS, 38 groups; successful database removed                                                                    |
| Web TypeScript and Astro                                 | PASS; 95 Astro files, zero errors/warnings/hints                                                                |
| Web storefront and Admin builds                          | PASS                                                                                                            |
| Local synthetic production builds and bundle markers     | PASS; 125 artifacts checked, no deployment or database bootstrap                                                |
| Backend dashboard/server/worker build                    | PASS                                                                                                            |
| Source-only GraphQL extraction/code generation           | PASS; no bootstrap or database access                                                                           |
| Targeted ESLint and package boundaries                   | PASS; nine workspace boundaries valid                                                                           |
| Full web lint                                            | Existing unrelated Prettier failure in `packages/ui/package.json`; ESLint/boundary stages completed             |
| Disposable demo start/stop                               | PASS; graceful guarded stop removed only its own fresh database                                                 |

The existing PostgreSQL driver emits a concurrent-query deprecation notice in fixtures. Web builds retain existing bundle-size warnings. Full lint also prints the existing JSX AST resolver diagnostic before its successful boundary phase. No check was weakened to suppress these outputs. The unrelated already-modified UI package manifest was left intact. Early harness JSON decoding, disposable hostname/account-bridge setup, recovery channel hydration and geometry assertions were corrected before the passing runs. Geometry assertions use the approved responsive padding instead of changing the shared Dialog.

Failed diagnostic databases are retained by the existing harness, rather than dropped through an unguarded cleanup. Successful test databases are removed by their creating process. All new Stage B documentation remains here. Existing regression runners retain their own ignored diagnostic artifacts; no screenshot artifacts were generated.

## Local file inventory

Backend, `E:/coding/farmers-market-platform`:

- New `src/migrations/1792900000000-InPersonPayments.ts`.
- New `src/plugins/marketplace-commerce/in-person/payment-{contracts,scope,adapter,coordinator,api}.ts`; existing in-person `service.ts` and `order-process.ts` extend the quote/transition boundary. Existing `api.ts` also accepts the optional first variant for atomic register creation.
- `marketplace-commerce.plugin.ts` and `types.ts`: optional handlers/API and bounded recovery scheduling/configuration.
- `commerce/entities.ts`, `order-context.service.ts`, `strategies.ts`, `native-commerce.adapter.ts`, `topology.api.ts`: scoped native placement and existing in-person order history.
- `inventory/capacity.service.ts`, `inventory-coordinator.ts`, `hold.service.ts`, `operational-inventory.service.ts`: source-checked capacity, protected unresolved holds and checked native handoff.
- `financial/entities.ts`, `provider-facts.service.ts`, `financial-attribution.service.ts`, `refund-coordinator.ts`, `refund-writer.service.ts`: provider evidence/mode, anonymous original allocations, attested refunds and loyalty exclusion.
- `customer-account/service.ts`, `customer-relationships/purchase-relationship-consumer.ts`, `customer-relationships/projections.ts`: existing guest/customer and purchase-history integration.
- New `test/in-person/payments.ts`; existing `fixture.ts`, `demo.ts`, `run.ts`: guarded qualifications, real seeded sales, fake message sender and updated review expectation.

Web, `E:/coding/farmers-market-platform-web`:

- New `apps/admin/src/vendor/pos-payments.tsx` and `tests/pos-payments.test.tsx`.
- Shared `packages/ui/src/utility.tsx` and `styles.css`: heart/chevron icon vocabulary with optional fill, and vertically centered native selected content. Existing consumers retain outline defaults.
- Existing `pos.tsx`, `pos.css`, `orders.tsx`, `tests/in-person.test.tsx`: register/payment/history/refund composition and Stage A regression integration.
- `packages/api/src/in-person.ts`, generated Admin/Shop contracts, `packages/api/schema/{admin,shop}.graphql`, `packages/api/schema/provenance.json`, `scripts/extract-schema.ts`: typed payment clients and reproducible source contracts.
- `scripts/in-person.ts`, `scripts/in-person-browser.ts`, `package.json`, `.gitignore`: isolated disposable supervision, DOM-only walkthrough, payment qualification and guarded stop command/runtime directory.
- Root `COMPONENT_USAGE_GUIDE.md` and `UI_COMPONENTS.md`: component reuse and existing spacing/dialog contracts.
- This directory's `STAGE_B_IMPLEMENTATION_PLAN.md`, `STAGE_B_ARCHITECTURE.md`, `STAGE_B_IMPLEMENTATION_SUMMARY.md`, `STAGE_B_TESTING.md` and updated `IN_PERSON_PAYMENTS_ROADMAP.md`.

These lists identify Stage B work, not ownership of the repositories' unrelated existing diffs. The older Stage A demo's manifest/ports and its database are preserved separately.

## Disposable handoff and remaining work

Run `npm run demo:pos` from the web directory and sign in at `http://auth.platform.localhost:4368/account/login`. The vendor dashboard is `http://localhost:4586`; credentials and all cash/customer/simulator/refund steps are in [STAGE_B_TESTING.md](STAGE_B_TESTING.md). The dedicated ignored `.pos-stage-b-demo/ready.json` supplies dynamic API endpoints and real seeded sale references. `npm run demo:pos:stop` requests graceful teardown from the owning supervisor; restart for fresh data. No persistent database migration is required or authorized.

The fresh manual instance left running after the register refinements on October 18, 2026 uses `vendure_test_pos_demo_1792376600645_e49623`, Admin API `http://127.0.0.1:51957/admin-api`, account storefront port 4368 and vendor dashboard port 4586. The previous disposable instance was stopped through its guarded command, and only its own database was removed. Existing browser sessions must sign in again to this fresh fixture. Chromium's account login and bridge were qualified by the real browser suite. Node's system resolver requires the loopback address with a Host header for the browser's `.localhost` aliases.

Seeded legitimate completed sales are Hill Country Honey cash order `99HUDM9PS51EY76N` (1), Green Acres Farm simulated order `Y5KTFU5XVWXW15H4` (2) and Wildflower Bakery cash order `R27JTHCHYZ9HF3ST` (3). They provide immediate refund examples. The current manifest is authoritative after any restart. The guarded stop command was exercised successfully before creating this fresh instance.

Square/Clover merchant authorization, approved secure credential storage, external verified status/cancellation/refund adapters, physical terminal/mobile-reader integration, hardware/provider qualification and production readiness remain Stages C through F. Merchant connection metadata contains no stored credentials. Revoked-actor, contradictory-evidence and canonical-source incidents retain their audit/capacity for reviewed reconciliation; no new platform remediation console or authorization bypass is introduced. Real email delivery/reliability remains subject to the existing account transport's guarantees and is not externally qualified by this disposable test sender. Weighted quantities, split tender, hardware, offline cards and all Stage G loyalty integration remain out of scope.
