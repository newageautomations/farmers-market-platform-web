# Local storefront directory

Open `http://localhost:4321/test-storefronts` while the existing demo storefront server is running. No account, cookies, or login is required. This testing route is available only in Astro development mode and is marked noindex.

Market storefront names link to their configured local sites. Vendor links are grouped by existing market memberships or directory associations. Vendors without market associations appear at the end. All seven markets and 22 vendors are included; the three market storefronts and 18 vendor storefronts with configured hosts are clickable. Missing storefronts are labeled rather than given invented URLs.

The page reuses `SiteLayout`, the approved `cardClassName` native presentation adapter, existing theme tokens, and ordinary semantic lists and anchors. No UI primitive, authentication behavior, customer API, or database schema was added or changed.

The browser receives only names, local public URLs, and market associations from `apps/storefront/src/data/test-storefronts.json`. Database access stays in the separate local refresh helper. There are no credentials, account details, or channel tokens in the snapshot.

To refresh the link snapshot after changing local storefront configuration, run from the web project folder:

```powershell
node scripts/refresh-test-storefront-directory.cjs
```

The helper uses a read-only transaction and verifies that it is connected to loopback PostgreSQL database `vendure_demo_market_ops` before writing the local JSON file. It does not provision storefronts or modify the database.
