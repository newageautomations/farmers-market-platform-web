# Stage G refund reconciliation

Only settled `RefundCoordinator` operations reach loyalty reversal. The services also check settlement themselves, so a pending, failed or voided refund ID cannot prematurely deduct points or progress.

## Original-unit recalculation

The financial refund writer reserves original units, independently verifies the provider effect, creates the native settled refund, and writes immutable refund allocations. In that same transaction it now calls both existing loyalty services for associated POS purchases. Product net, tax, discounts and quantities come from original unit allocations. Delivered inventory is not restocked by a financial refund.

Vendor points reverse the refunded original units from available or pending points, recording immutable ledger entries linked to their original entries. The award projection becomes refunded. Refund replay cannot insert the same unit reversal twice. The existing policy restores spent reward points only after every original vendor unit is refunded; a partial return does not restore a fraction of the reward cost.

Market reconciliation marks the refunded units and recomputes progress from all remaining final contributions. Discovery groups each vendor/order portion and then counts distinct qualifying vendors. Visits groups each occurrence/order before counting qualifying occurrences. Spending sums remaining eligible original merchandise. Another qualifying order at the same vendor or occurrence preserves its credit.

| Original merchandise | Purchase minimum | Settled returned merchandise | Remaining | Purchase contribution |
| -------------------- | ---------------- | ---------------------------- | --------- | --------------------- |
| $25                  | $20              | $4                           | $21       | Retained              |
| $25                  | $20              | $10 total                    | $15       | Removed               |
| $25                  | $20              | $25 total                    | $0        | Removed               |

The controlled suite exercises $4 followed by $6 and then the remaining original units. It explicitly verifies the original order's threshold result and preserves another qualifying order. Tax is excluded from these existing minimum rules. When a reward discounted the order, the remaining eligible amount follows the original allocated discount, rather than pretending each returned unit had its undiscounted value.

## Completion and spent rewards

A lost threshold changes completion validity to false. Unclaimed rewards can no longer be claimed. Existing claimed or fulfilled market rewards retain their history and receive `review='REQUIRED'`; no settled payment is changed. Fulfillment review and resolution remain the established market-manager process.

Spent vendor points can leave a negative available balance after the original earning purchase is refunded. The deficit is auditable, prevents further spending and is reduced by future legitimate earning. Completed redemption history is retained. There is no automatic charge, deleted history, silent point grant or invented reimbursement.

## Replays and interruptions

The purchase snapshot, original unit IDs, refund-operation IDs, unique refund allocations, point-ledger idempotency keys and market event keys are durable identities. Duplicate polling/webhooks and browser retries converge on those records. The transaction either commits the native refund and both loyalty reversals or leaves the original independently committed provider evidence for recovery. Refund observations may arrive in a different order; eligibility derives from the set of settled original units, rather than event counters.

The Stage G suite checks repeated reconciliation, multiple returns, failed-return retry, no restock, deficit policy and a real service restart against the same disposable database. Existing provider suites cover pending, voided and lost-response refund boundaries.
