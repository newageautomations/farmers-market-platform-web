# Stage G testing

All database qualification uses the existing loopback-only randomized disposable database guard. Screenshots, video, visual snapshots and browser traces are disabled. Neither protected database is targeted. Stage F physical devices are explicitly deferred.

## Commands

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run test:pos:loyalty
npm run test:pos:loyalty:providers
npm run test:pos:loyalty:regression
npm run test:pos:loyalty:browser
npm run typecheck
npm run build
npx vitest run --reporter=default
```

The provider suite adds the same real commerce earning, native discounted quote, redemption completion and original-unit full-refund contract to the existing Square, Clover and two controlled native suites. It makes no external provider calls. The regression command runs Stage A through E, Stage G, financial attribution/refunds, inventory/capacity, native commerce, identity, vendor loyalty and market loyalty.

For the backend:

```powershell
Set-Location E:\coding\farmers-market-platform
npx tsc --noEmit --project test/in-person/tsconfig.json
$env:APP_ENV = 'test'
$env:NODE_ENV = 'development'
npm run build
```

Both values explicitly select a local build. Vite otherwise sets `NODE_ENV=production`, which requires matching production configuration. Omitting or mixing these modes fails with `APP_ENV_EXPLICIT_MODE_REQUIRED`; no security setting was weakened to bypass that guard.

## Controlled qualification

The Stage G database suite checks US formatting, exact names, relevant balances, privacy, missing names, unknown accounts, vendor/cashier authorization, verbal consent, server-only discount amounts, customer switching, automatic earning and all three challenge types. It exercises $25 merchandise with a $20 minimum, $4 then $6 returns, full return, preservation of other purchases, challenge reversal, failed refunds, duplicate processing, durable reservation contention, uncertain capture/recovery, debt after spending and a real backend restart. A real short occurrence also closes between independently recorded cash capture and recovered local finalization; the original purchase still qualifies under its frozen time/context.

Pure time checks cover canonical instants across midnight, multi-day intervals and the repeated DST hour, end-exclusive boundaries, old provider timestamps and absent timestamp rejection. Native occurrence creation and time-zone interpretation retain the existing market-domain implementation. Live provider timestamp differences and hardware behavior are not established by these pure checks.

The browser suite logs in through the real local account flow, associates Casey's formatted phone, inspects available rewards, applies one reward, checks native cart output, and measures DOM overflow, contained padding, 44px reward controls and accessibility at 1280, 768 and 390 pixels. Color contrast is excluded from automated axe evaluation; no visual acceptance is inferred. It also runs the read-only original-record audit before destroying its disposable environment.

## Evidence

Retained logs and machine-readable results are in `stageGTestLogs/`. The final execution status and any failures are recorded in `STAGE_G_IMPLEMENTATION_SUMMARY.md`. Existing Stage A through E assertions are retained. Stage B's former assertion that all associated POS loyalty is excluded is replaced by positive shared-ledger reconciliation and an explicit zero-earning assertion for anonymous purchases, because associated earning is now required behavior.

No production readiness, new live Sandbox authorization, physical Clover Go SDK transaction, iOS runtime, hardware pairing or external webhook delivery is claimed from this run.
