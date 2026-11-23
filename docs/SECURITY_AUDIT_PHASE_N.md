# Phase N Stripe recovery job coalescing

**A-06 is ready to close.** Before the fix, one signed delivery and five genuine retries left one durable receipt and six pending sweep jobs. With the fix, the same sequence left one receipt and one pending sweep job. This finding concerns queued work and worker capacity. The financial fixture exercised reconciliation of existing provider facts.

## Recovery behavior

The webhook still verifies the Stripe signature against the original bytes, routes by endpoint scope, and commits or finds the receipt in its own transaction. For a `RECEIVED` receipt, it passes the receipt ID to the recovery service as a best-effort wakeup. The response remains HTTP 200 with `{"received":true}` when the receipt commits and queue insertion fails. [Phase A finding](SECURITY_AUDIT_PHASE_A.md#a-06-duplicate-pending-stripe-receipts-can-enqueue-redundant-recovery-sweeps) · [Receipt and wakeup](../../farmers-market-platform/src/plugins/payments/webhook.service.ts#L192) · [HTTP handler](../../farmers-market-platform/src/plugins/payments/api.ts#L282)

All webhook producers that share the PostgreSQL queue acquire the same queue-name-based advisory lock in a short read-committed transaction. Under the lock, the producer checks Vendure's persisted queue records for a pending, running, or retrying sweep. If none exists, it checks that this receipt is still `RECEIVED` and calls the existing Vendure queue with the same transaction context. The SQL queue insert commits before the lock is released. The next producer can then see the job or see that a fast sweep already processed its receipt. The worker's processor, receipt claims, and reconciliation rules remain the existing implementation. This uses the configured Vendure SQL queue without a schema migration. [Webhook queue coordination](../../farmers-market-platform/src/plugins/payments/recovery.service.ts#L54) · [SQL queue configuration](../../farmers-market-platform/src/vendure-config.ts#L163)

- **Queue insert fails after receipt commit.** A genuine retry can enqueue recovery as soon as no active sweep covers the wakeup and the queue can accept writes. If Stripe sends no retry, the existing `stripe-provider-recovery` scheduled task independently attempts to enqueue a normal sweep every minute. A scheduler enqueue failure leaves the receipt available for a later tick.
- **A distinct receipt misses an active sweep.** If the sweep has already exhausted its receipt selection, the new receipt stays eligible for the next sweep. The periodic task still enqueues even if another job is marked running, so it also provides recovery if an abandoned running row suppresses webhook wakeups. Periodic jobs retain their independent cadence.
- **Expected delay.** In a healthy environment with capacity, periodic fallback runs at the next one-minute tick, plus scheduler and queue polling and time for the worker to reach the receipt stage. A signed retry can wake the queue sooner. Outages, backlogs, receipt retry backoff, or disabled recovery can extend the delay. [Every-minute task](../../farmers-market-platform/src/plugins/payments/payments.plugin.ts#L169) · [Worker receipt loop](../../farmers-market-platform/src/plugins/payments/recovery.service.ts#L109)

## Focused checks

The runner used PostgreSQL 17.5 and Vendure 3.8.2. The repository guard created a fresh `vendure_test_stripe_queue_*` database. The fixture checked the connected database name and verified the public schema was empty before creating its tables. Two loopback HTTP listeners used independent webhook services, connection pools, and SQL queue strategy instances against that database. The fixture used the production HTTP handler with Express raw-body middleware, the actual Vendure queue worker, and a Stripe transport stub. A test-only SQL constraint forced real queue inserts to fail. The scheduler task's real callback was invoked directly, with its persisted jobs then consumed by the worker. The baseline and final passing databases were dropped by the guard. [Focused fixture](../../farmers-market-platform/test/payments-stripe/recovery-queue.ts) · [Disposable database guard](../../farmers-market-platform/test/test-database.ts)

Counts are cumulative within each run. Job totals include completed jobs.

| Checkpoint | Durable receipts | SQL sweep jobs | Observed outcome |
| --- | ---: | ---: | --- |
| Baseline first valid delivery | 1 | 1 pending | HTTP 200. Receipt was `RECEIVED`. |
| Baseline after one serial and four concurrent retries | 1 | 6 pending | All five retries were acknowledged. |
| Fixed invalid signatures on both scopes | 0 | 0 | Altering the signed raw bytes returned HTTP 400 with `INVALID_WEBHOOK` on both endpoints. |
| Fixed first delivery and five retries | 1 | 1 pending | The stored payload hash matched the exact signed bytes. All valid requests returned HTTP 200. |
| Separate connected event and two retries while the first sweep was running | 2 | 1 running | The first sweep had claimed its sole batch item. The new receipt remained `RECEIVED` after that sweep completed. |
| Periodic callback after the late arrival | 2 | 2 completed | The added sweep processed the distinct connected receipt. |
| First forced queue insert failure | 3 | 2 completed | HTTP 200. The newly committed receipt stayed `RECEIVED`. |
| Periodic callback with no webhook retry | 3 | 3 completed | The added sweep processed the failed-wakeup receipt. |
| Second forced queue insert failure | 4 | 3 completed | HTTP 200. The newly committed receipt stayed `RECEIVED`. |
| Signed retry after queue writes recovered | 4 | 4 completed | The retry queued recovery and the worker processed the receipt. |
| New platform event after completion, with two competing deliveries | 5 | 4 completed, 1 pending | PostgreSQL showed the peer waiting on the advisory lock while the first insert was uncommitted. Both requests returned HTTP 200 and only one new job persisted. |
| Final worker run and retry of the processed event | 5 | 5 completed | All five receipts reached `PROCESSED` in one attempt each. The retry added no job. |

Each completed job reported one processed receipt and zero failed stages. The platform path retrieved the existing transfer with no connected-account routing and reconciled it to `SUCCEEDED`. The first and later distinct platform receipts for that transfer produced one durable transfer observation total. The connected path retrieved three distinct payouts under the original synthetic account and wrote one payout fact per event. There were five stubbed provider retrievals and zero provider mutations.

## Commands and verification limits

Commands ran from `E:\coding\farmers-market-platform`. The sandbox denied an initial loopback PostgreSQL probe with `EACCES`. Reviewed execution allowed the focused local runs over loopback without a native PostgreSQL or network configuration change. During fixture development, one disposable run stopped before delivery because Vendure entity IDs were uninitialized and its database was removed. Another stopped before delivery on the full payments composition prerequisite. The database guard retained that disposable database, `vendure_test_stripe_queue_1795040639593_6978a9`, for diagnosis. The fixture correction applied Vendure's entity ID setup and used the real task definition directly.

```powershell
# Pre-edit baseline using the temporary baseline assertion, exit 0
node node_modules/ts-node/dist/bin.js --transpile-only --project test/payments-stripe/recovery-queue.tsconfig.json test/payments-stripe/recovery-queue.ts --baseline

# Focused regression against the final code, exit 0
node node_modules/ts-node/dist/bin.js --transpile-only --project test/payments-stripe/recovery-queue.tsconfig.json test/payments-stripe/recovery-queue.ts

# Focused typecheck, exit 0
node node_modules/typescript/bin/tsc --project test/payments-stripe/recovery-queue.tsconfig.json

# Backend production diff whitespace check, exit 0
git diff --check -- src/plugins/payments/webhook.service.ts src/plugins/payments/recovery.service.ts
```

The baseline option was removed after recording the pre-edit result. The final two Node commands are the local repeat checks. They use the existing loopback database credentials and a newly created disposable database. The persistent test database, saved accounts, and Stripe were outside the test. The fixture exercised separate HTTP and database paths within one Node process. Full Nest bootstrap, wall-clock cron dispatch, deployed topology, and live payment mutations remain unverified. No browser test is useful for this server-side queue behavior.
