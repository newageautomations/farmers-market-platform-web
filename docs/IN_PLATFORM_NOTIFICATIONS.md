# In-platform notifications

The notification catalog has 122 retained contracts. The minimalist delivery policy keeps **51 active types**, down from 82 integrated types. It stops 31 existing integrations from creating new inbox records. The [complete generated audit](NOTIFICATION_EVENT_CATALOG.md) assigns every contract KEEP, DISABLE, COVERED or FUTURE and lists the exact reasons and retained scope.

## Delivery policy

Generate an in-app notice for a meaningful required action, an important purchase/business/payment/security impact, or a time-sensitive operational problem. Entity creation, ordinary lifecycle changes, successful commands and discovery activity do not qualify on their own. Immediate success messages remain in the existing domain UI.

`inbox-delivery-policy.ts` is the central, fail-closed allowlist. `activeInboxTypes` is the sole delivery registry consumed by both projectors, sweep selection, preference validation and the final storage guard. `status: integrated` records that an adapter exists; only `delivery: KEEP` authorizes a new inbox row. Adding a source or restoring a personal preference cannot activate a disabled type.

Order placement/cancellation/completion, important partial fulfillment changes, payment failures/uncertainty, completed refunds and refund problems remain. Routine pending refunds are excluded. Vendor orders, payment/payout failures, inventory discrepancies, significant confirmed participation changes, application decisions, required booth invoices and lost integration access remain. Manager applications/listings/reviews, actionable required-document access loss, declined business links needing a replacement decision, generation failures and billing problems remain. Password/recovery, permission changes, membership removal/restoration and access-role changes retain security delivery, including to the actor.

Following/favorites, new occurrences, publications, preorder windows, stock depletion, successful payouts, submission/application receipts, approval/waiver confirmations, ordinary membership/exception activity, generic compliance updates and restored readiness no longer create inbox records. Successful link verification is reflected in the directory; a declined link remains actionable. See the catalog for every exact type ID.

## Document and policy lifecycle

| Operation                                     | Vendor inbox                                            | Manager inbox                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Request an outstanding required document      | One Document required                                   | No request confirmation                                                                                             |
| Submit a current document                     | No receipt; existing on-screen success remains          | One Document awaiting review, only if approval is actually required and the latest accessible submission is pending |
| Approve a submission                          | No routine approval or compliance message               | No routine confirmation                                                                                             |
| Reject a required submission                  | One Document rejected: action required                  | No routine confirmation                                                                                             |
| A required shared document expires            | One renewal per current obligation/file/expiration date | No individual expiry message; current reports and the daily actionable summary expose the issue                     |
| Assign a required policy                      | One required acknowledgment                             | No publication receipt                                                                                              |
| Publish a version requiring re-acknowledgment | One new required acknowledgment for that version        | No publication/acknowledgment receipt                                                                               |
| Acknowledge a policy                          | No receipt                                              | No acknowledgment receipt                                                                                           |

The in-app adapter reuses the source-owned recipient and current-state checks. It additionally requires active, unwaived required obligations for requests/rejections/expiration and required policies for acknowledgments. Optional requests, private unused library expiration and already-resolved requests are excluded. Library and Market-pinned expiration facts both resolve to the same current assignment, pinned file and expiration date. A file shared to independent obligations or businesses retains distinct receiving contexts. Latest submissions, available files, active sharing, source reminder thresholds and Market-local inclusive expiration rules remain authoritative.

Console delivery, Communications email/SMS, audit history, grants, scanning, immutable reviews, readiness calculations and domain publication remain independent. None consult the in-app allowlist. Existing expiration generation still uses the business-configured source opt-in and reminder eligibility. Personal inbox preferences do not start a source job. No marketing consent changed.

## Semantic identity and recovery

Notifications use a canonical intent family plus authoritative operation/transition, recipient, receiving role and business. Text equality and nearby timestamps are never identity. Required document request, review, rejection and renewal are different intents. Separate policy versions and separate required assignments remain independent actions. A human acting as both Vendor and Manager can receive a Vendor request and a Manager review for the same workflow, since these are different receiving responsibilities.

The same expired file/date obligation reached through two source facts has one semantic key. Repeated failed payment observations use their provider operation and outcome. Whole-order terminal notices take precedence over overlapping quantity notices in the same operation. Payment-account deauthorization takes precedence over the overlapping generic capability problem. Specific document actions replace generic compliance/readiness notices through the allowlist. An explicit membership request and an application form remain distinct authoritative workflows.

The existing unique `(user_id, logical_key)` constraint remains the final guard. New semantic identities also check the former logical key under the existing per-user transaction lock, so historical rows and prior replay identities remain effective. Soft-deleted rows still participate in uniqueness. No historical rows, consumer receipts or preferences are rewritten.

The existing committed outbox, `DurableWorkService.consume`, per-page receipts, atomic cursor advancement, locks, rollback and bounded retry recovery remain. Sweeps select at most 50 eligible events and fanout pages contain at most 200 recipients. Cursor keys include context/entity so multiple required obligations for one human/business cannot be skipped at a page boundary. Recipient permissions and memberships are evaluated when projecting and again when reading or acting.

Participation adapters use the prior confirmed state and the material transition. Planned/initial confirmation and no-op changes stay quiet. A significant withdrawal/pickup change reaches the affected receiving context. Only the actor's matching receiving context is omitted; sharing a human identity never suppresses a different business responsibility. Financial/security notices are exempt from that actor rule.

## Daily readiness and the live checklist

The existing bounded operational sweeps, Market/occurrence timezones, DST handling and deterministic daily/occurrence identities remain. Daily Market Readiness Summary projects only when the next eligible scheduled Market within seven days has actual outstanding document/policy/readiness or planned-confirmation items. An applicable exception alone does not create an all-clear summary. Delayed projection uses current source counts and skips resolved or obsolete facts. Summary cadence remains one Market-local daily fact, not a new intraday escalation schedule.

Market Day Checklist retains its once-per-occurrence/local-date reminder and its existing unsubscribe policy. The live checklist remains in Market Operations regardless of any inbox delivery, subscription or daily summary. It refreshes authoritative documents, policies, participation, warnings and exceptions, with current links and an as-of time. Canceled, ended, past and unavailable contexts never claim completion. No local completion flags or attendance targets were introduced.

## Existing inbox and preferences

The unified inbox belongs to the authenticated Vendure User and includes every currently authorized Customer, Vendor, Market Manager and Account context. Selected account mode does not narrow it. Bell, sidebar entry, context badges, descriptive authorized destinations, filters/search, read/unread, stars, soft deletion and responsive layouts remain.

Settings receives active delivery definitions only. Its optional categories are derived from supported optional types. Type-specific inactive preference records remain stored and are labeled Inactive notification type with History preserved. They are not selectable subscriptions and cannot be re-enabled through the API. Historical inactive messages retain their content and read/star/delete controls, with no misleading unsubscribe offer. Existing broad suppression rules continue to apply to optional active types. Required notices continue to bypass optional suppression, and broader-rule precedence, revisions and mute instants remain unchanged. Source-owned console preferences are a separate existing channel and remain explicitly labeled.

Every list, detail and mutation derives the current principal. Private business rows require active membership, active business, current channel-scoped native permissions and existing owner requirements for private Vendor operations. Billing staff retain their separate read policy. Revocation hides private history from counts, lists, details and actions; bulk mutations remain atomic. Customer Astro SSR, small notification islands, same-origin BFF/Origin checks, HttpOnly credentials and existing channel/account handoff are unchanged. Labels/URLs grant no authority.

## Migration and local verification

This cleanup adds no migration and edits no historical migration. Existing additive inbox/sweep migrations remain prerequisites. The persistent `vendure_demo_market_ops` database was not migrated, reset, seeded, purged or otherwise changed by this cleanup.

Restart the demo services from `E:\coding\farmers-market-platform-web`, each in its own terminal:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use new operations when testing. Older noisy messages intentionally remain. Follow the document/policy table above, allow the existing minute worker sweep and bell polling (or refresh), and inspect both receiving roles/businesses. Check that approval and all-clear days stay quiet, while rejection, expiration, purchase cancellation and security/financial problems remain. The [implementation report](NOTIFICATIONS_IMPLEMENTATION_REPORT.md) records disposable automated qualification and limitations. Any future explicitly requested schema upgrade uses the guarded demo migration command; no migration command is required for this cleanup.
