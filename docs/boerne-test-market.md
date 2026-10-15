# Boerne Farmers Market local test account

Created in the persistent local `vendure_demo_market_ops` database.

- Admin: http://localhost:4322
- Storefront: http://boerne-farmers-market.localhost:4321
- Manager email: `boerne.manager@example.test`
- Password: `local-identity-regression-only-password`
- Workspace/channel: `market:boerne-farmers-market`
- Time zone: `America/Chicago`

The market starts with no vendors, products, dates, directory businesses,
applications, rentals, layouts, assignments, invoices, or payments. Its venue and
pickup instructions are blank, and no repeating schedule is configured. Configure
these in Settings and Occurrences when you are ready. The public storefront uses
its own local hostname; `localhost:4321` continues to show Bulverde.

Create and publish an application while signed in as the Boerne manager at
`http://localhost:4322/market/applications`. The application displays its actual
`/apply/<slug>` path. Open that path on `http://boerne-farmers-market.localhost:4321`.
The existing published application, **Boerne Market v1**, is available at:
http://boerne-farmers-market.localhost:4321/apply/4ce9824a-6053-4a15-bfcc-0258e7e90884
It is a private direct-link application. Share its link explicitly.

If the normal demo servers are not running, start these commands in separate
terminals from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
```

```powershell
npm run demo:market-operations:admin
```

The market has already been created. For restoring it after a deliberate demo
database reset, run:

```powershell
node scripts/seed-boerne-test-market.cjs
```

This guarded script targets only the approved loopback demo database. It preserves
an existing market, checks that it remains empty, and verifies its manager login.
Do not reset the database merely to sign in; resetting erases manual test data.
