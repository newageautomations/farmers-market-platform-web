# Market invoice adjustments and refunds

Implemented locally on November 10, 2026. Stripe remains sandbox only. No real provider transaction, persistent migration, persistent fixture creation, deployment or remote Git change was performed. Earlier Stripe phase reports are unchanged.

## Functionality and lifecycle

The existing manager billing page supports signed invoice amendments with a reason, full/partial offline receipts, original-payment refund previews, explicit refund confirmation and invoice cancellation. Vendors review the original lines, amendments, payments, refunds, balance and final state through Vendor > Booths. Canceled market dates retain their invoice entry. New controls reuse Dialog, Button, Select, Check, Entry/Control, MinorPriceInput and InvoiceTable. InvoiceActions is a feature controller because existing primitives do not supply financial authorization; InvoiceHistory is a shared feature presentation, not a competing UI standard.

Original issued lines, recipient, currency and payment records remain immutable. Append-only `market_invoice_adjustment` rows preserve signed amounts, reasons, manager IDs, timestamps, request hashes and idempotency keys. `totalMinor` is the materialized current obligation, verified against original line totals plus all amendments. Original total is derived from unchanged lines. Adjustments below net reconciled settlements fail; the manager must explicitly refund/correct the excess first. Adjustments never move money automatically.

`market_invoice_refund` preserves the original payment/invoice/market, amount, method, currency, manager/channel, date, reason, frozen component allocation and request identity. Only reconciliation state and review code may advance. Original payment rows remain intact. `paidMinor` is original recorded settlements less COMPLETED refund principal. Pending or customer-confirmed/fee-unresolved refunds remain separately visible and block conflicting changes and collection until reconciliation.

A refund on an ordinary issued invoice is a payment correction and reopens the refunded principal as owed. `CANCEL_INVOICE` explicitly enters `CANCEL_PENDING`, stops collection and projects zero collectible balance. Managers then refund each original payment independently. Only after all principal is returned and every required application-fee refund reconciles does the server append the final obligation-forgiveness amendment and enter `CANCELED` with zero obligation/net settlement. No future account credit is created. `PAID` and `VOID` retain their existing meanings. Unpaid cancellations can finish immediately.

Original cash, check, external and other monetary receipt paths are reused. Offline receipts and refunds receive no Online payment fee. Offline refunds require an original payment, original monetary method, amount, manager, actual return date, reason, explicit confirmation and attestation that funds have already been returned. A preview cannot record a return or call Stripe. Waivers and complimentary settlements are not money-return operations; their cancellation requires a separately designed non-monetary correction and currently fails explicitly rather than entering an unfinishable workflow.

## Stripe and reconciliation

Invoice refunds reuse the Phase G invoice advisory lock and durable `stripe_invoice_step` journal, and the Phase F REFUND/FEE_REFUND SDK primitives. The customer refund runs on the original connected market account and original direct-charge PaymentIntent/charge. The application-fee refund runs on the platform against the original application fee and returns funds to that market. It never creates another customer refund. Original recipient/vendor, market, account row/generation, platform/application, mode, payment, amount and currency are checked. Historical refunds do not require current charge or payout readiness; disconnected or replaced historical authority fails closed.

All original fee components are frozen in the collection quote. For a component F, original principal B, previous refunded principal R and new principal A, its new share is:

```text
floor(F * (R + A) / B) - floor(F * R / B)
```

BigInt integer arithmetic and database validation enforce these shares. Cumulative partial refunds return every original cent when principal reaches B. Customer total is principal plus original platform, recovery and eligible fee-tax shares. The independent application-fee leg is exactly the platform share. Current settings never recalculate historical fees. The existing qualified invoice policy is USD with EXPLICIT_NO_FEE_TAX_TEST; no broader tax approval is inferred.

States are PENDING, CUSTOMER_RETURNED, COMPLETED and REVIEW. COMPLETED requires retrieved success for both required legs. Pending/failed/ambiguous or unmatched external refunds cannot release principal or finalize cancellation. Provider retrieval audits paginated customer/application-fee inventories and original charge identity. Unknown results reuse original keys; the existing 23-hour mutation replay boundary and bounded attempts remain. Expired ambiguity, failures or conflicting inventories require operational review. Signed webhook events remain hints to the existing worker, never money authority. Worker recovery resumes durable invoice refunds before collection audits.

The existing SuperAdmin `stripePaymentReconciliation(limit: 100)` report includes original invoice fee evidence and refund principal/platform/recovery/tax/gross separately, plus independent provider-leg keys, states and observations. Offline refunds have no Stripe legs. Manager billing summaries distinguish original principal, amendments, net collection, refunded principal and collectible balance. Recovery and unresolved-refund evidence also participate in the existing production preflight.

## Security and concurrency

All new manager commands use existing ManageOwnMarketBilling permission and current market/channel authority. Vendor financial reads retain original ownership checks; vendors cannot amend, attest or refund. Recovery revalidates the original manager's current authority. Market row locks serialize adjustments, receipts and refund reservations with collection preparation/commit. Per-invoice advisory locks serialize provider work. Database guards enforce append-only identities, original-payment limits, frozen shares, pending-operation exclusions and two-leg completion. Replayed requests return their original record; conflicting payloads with the same key fail. Stale invoice revisions fail. Provider I/O occurs outside financial transactions.

## Local verification

- `npm run test:stripe-connect:invoice-lifecycle`: 14 disposable-database groups pass. Covers additive/idempotent fixtures, positive/negative adjustments, partial cash settlement, mixed Stripe settlement, overpayment rejection, duplicate adjustments/refunds, authorization, full/repeated partial refunds, original fee rounding, offline attestation/limits, lost responses, failed customer refunds, pending customer/fee legs, worker recovery, simultaneous adjustment/collection, external ambiguity, cancellation versus correction, restricted/disconnected original accounts.
- `npm run test:stripe-connect:invoices`: existing 15 Phase G groups plus Phase H invoice checks pass.
- `npm run test:stripe-connect:refunds`: installed SDK checks and all 24 existing checkout/preorder refund groups pass. No external provider transport is used.
- `npx vitest run tests/invoice-adjustments-refunds.test.tsx tests/stripe-connect-phase-g.test.tsx tests/market-c5.test.tsx --reporter=dot`: 26 focused component tests pass.
- Backend scoped `npx tsc --noEmit --project test/payments-stripe/phase-g.tsconfig.json` passes. Frontend `npm run typecheck:stripe-connect:invoices` reports only the pre-existing `packages/ui/src/table-navigation.ts:29` possibly-undefined target error.
- Admin build and backend dashboard/server/worker builds pass. Backend all-build requires APP_ENV=dev and NODE_ENV=development in the build shell; no environment file was edited. The initial unconfigured all-build correctly rejected missing explicit APP_ENV. Existing bundle-size and pg queued-client warnings remain.

Successful database runs remove only databases created by the guarded harness. Failed development runs retain their own `vendure_test_*` databases under existing policy. No full repository suite or browser automation ran.

## Migration and manual setup

`InvoiceAdjustmentsRefunds1797200000000` adds the two ledgers, recovery index, cancellation states and extended financial guards. It performs no reset, reseed, historical payment update or original-line rewrite. Financial rollback is forward-only.

Read-only `npm run demo:market-operations:inspect` confirmed localhost:5432/**vendure_demo_market_ops**, with only this migration pending. It was not applied. Do not start the new API/worker or fixture command against that populated database until explicit migration authorization, because existing bootstrap runs pending migrations.

After explicit authorization only, from `E:/coding/farmers-market-platform-web`:

```powershell
npm run demo:market-operations:migrate
npm run demo:market-operations:invoice-refund-fixtures
```

The new fixture command reuses the existing dedicated Fee D Market/Orchard owners and adds a separate February 20, 2027 occurrence/layout and seven invoice slots. It prints actual invoice IDs, manager route and vendor route. It is deterministic and idempotent, preserves all original Phase G invoices and never resets previously completed follow-up payments. It was qualified in disposable databases only. Keep the printed slot/ID mapping. Existing Manna Roots, Boerne and Phase D-H records must remain unchanged.

Start four separate web-directory terminals with the established sandbox configuration:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use saved credentials: manager `stripe-fee-d-manager@example.test`, payer `stripe-fee-d-orchard@example.test`, restricted member `stripe-fee-d-staff@example.test`. The documented dedicated fixture password is `Local-Fee-D-2026!`; do not reset existing credentials. Admin is `http://localhost:4322`; use the printed `/market/booth-billing/<occurrenceId>` route (also available through Finances > Booth invoices) and `/vendor/booths`. Preserve existing test keys/accounts and all invoice/test authorization and no-fee-tax flags. Do not enable any LIVE flag.

## Manual scenarios

Use untouched dedicated slots. A rerun preserves changed invoices; it is not a reset. Sandbox payments/refunds in these scenarios are deliberate manual actions, not automated test effects.

| Scenario                       | Actions and expected result                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial cash receipt           | On `unpaid` ($100), Record payment, CASH, $40, actual date and optional reference. History retains $40 and remaining is $60; no online fee.                                                                                                                                                                                                                                                                                              |
| Downward adjustment            | On that invoice, Adjust invoice, reduce $20, reason "Remove table", confirm. Original $80 booth/$20 table lines remain; obligation $80, paid $40, remaining $40. Reducing below $40 must fail.                                                                                                                                                                                                                                           |
| Remaining Stripe collection    | Open that invoice as Orchard and pay with existing sandbox card details. Remaining principal $40, original platform $2, recovery $1.57, card total $43.57. PAID requires verified capture; cash remains in history.                                                                                                                                                                                                                      |
| Upward adjustment              | Issue untouched `draft`, add $15 electricity with a reason and confirmation. Obligation $115, remaining $115. If paid online, platform $5.75, recovery $3.92, card charge $124.67.                                                                                                                                                                                                                                                       |
| Full online refund             | Pay untouched `decline` invoice with a successful sandbox card ($100 principal, $5 platform, $3.45 recovery, $108.45 card charge). Select its Stripe payment and refund $100 principal. Preview $108.45 customer return and $5 independent application-fee return. After reconciliation, correction reopens $100. Cancel first when no debt should remain.                                                                               |
| Partial online refund          | Pay untouched `authentication` with a successful card. Refund $25 principal: $1.25 original platform and $0.86 recovery, $27.11 customer return, $1.25 application-fee return. The remaining $75 principal refund returns $81.34 customer/$3.75 application fee. Total refunds exactly $108.45/$5.                                                                                                                                       |
| Physical cash refund           | `partial` starts with $40 cash. Physically return $40 first, select that cash payment, enter $40, actual return date and reason, review and attest. Only then confirm. History keeps the original cash payment plus the manual refund; ordinary correction reopens $100. No Stripe object is created.                                                                                                                                    |
| Mixed cancellation             | On untouched `interrupted`, record $40 cash and pay remaining $60 online: platform $3, recovery $2.20, card $65.20. Cancel invoice explicitly. It stays CANCEL_PENDING with zero collectible balance. Physically return/record $40 cash and refund $60 Stripe principal. Final CANCELED requires $65.20 customer and $3 application-fee reconciliation, then obligation/net settled/collectible all zero. Both original payments remain. |
| Provider verification          | In the original market's sandbox Dashboard inspect the exact original charge and customer refund. In platform sandbox inspect its original Connect application fee and independent fee refund. Match the component amounts above and the SuperAdmin reconciliation evidence. Never issue a second customer refund for the application fee.                                                                                               |
| Permissions and check receipts | Vendor and restricted staff must have no manager financial actions; direct unauthorized/cross-market commands must fail. On another untouched $100 invoice, record CHECK $25 and verify $75 remaining, then optionally collect that remainder by Stripe. Do not alter the established Boerne/Manna identities for negative checks.                                                                                                       |

## Limits and readiness

This is the existing gated USD, card-only, sandbox invoice model. Live collection remains disabled. Actual Stripe processing fees may remain payable by the market even after full customer recovery-component reversal. No production fee-tax/legal approval, insufficient-balance funding policy, arbitrary reconciliation override, account credit, accounting integration or deployment is introduced. Non-monetary waiver/complimentary cancellation requires a separate audited correction design. Provider failures, expired ambiguity, revoked original manager/account authority or external unmatched refunds require operational review; they cannot be resolved by fabricating completion or deleting journals. Real manual sandbox execution and visual browser verification remain to be performed after migration authorization.

## Changed local files

Backend: market-operations `entities.ts`, `service.ts`, `api.ts`; payments `invoice.service.ts`, `invoice-policy.ts`, new `invoice-refund-policy.ts`, `payments.plugin.ts`, `account.service.ts`, `reconciliation.service.ts`, `production-preflight.ts`; the additive migration; `scripts/market-operations-demo/invoice-fixtures.ts` and `run.ts`; `test/payments-stripe/invoice-lifecycle.ts` and scoped config; `package.json`.

Web: existing billing and vendor invoice detail, new `InvoiceActions.tsx`/`InvoiceHistory.tsx`, billing route refresh behavior, API invoice types/errors, locally regenerated schema/provenance/generated bindings, focused tests/config, demo command forwarding, `package.json`, and this report. Existing unrelated local edits were retained.

## Refund confirmation transaction fix

The reported MARKET_OPERATIONS_UNAVAILABLE on invoice 33 was reproduced through the real business GraphQL interceptor. BusinessApiBoundary wrapped REFUND_PAYMENT in an outer transaction, so the invoice service committed only its nested savepoint. Independent provider recovery could not see the uncommitted refund row and raised EntityNotFoundError; the outer request then rolled the reservation back.

Only MarketOperationsAdminResolver.marketOperationsCommand with action REFUND_PAYMENT now follows the existing specialist payment exception to that request-wide wrapper. The invoice service still owns its short reservation/audit transaction, current manager authorization, membership/market locks and independent provider/reconciliation stages. Other invoice commands retain the outer membership transaction. No schema or financial-data repair is required. Restart the API with `npm run demo:market-operations:serve` and retry the intended refund. This investigation performed no actual Stripe refund and made no persistent financial changes.

The regression invokes the real interceptor and resolver, verifies successful committed refund recovery, idempotent replay without more provider calls, continued transaction wrapping of ordinary invoice commands and rejection of vendor attempts. The matching adjustment/cash-refund history also has dedicated coverage. Safe failure diagnostics retain only error types, database codes and actual stack-frame lines, excluding multiline entity criteria and provider/request payloads.
