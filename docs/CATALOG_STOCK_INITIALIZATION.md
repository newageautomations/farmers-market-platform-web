# Catalog stock initialization

Product creation ensures an owned vendor stock location exists. Ordinary variant creation assigns that location as the canonical source and ensures a native stock level with stockOnHand=0 and stockAllocated=0, in the same transaction as creation. A vendor's single owned location is reused; when there are multiple locations, a dedicated `Catalog stock (vendorId)` location is reused or created. Vendor locking serializes source selection before the product lock. Provider imports retain their explicit source-assignment flow.

The helper only fills missing setup. It never replaces an existing canonical source or resets a balance. Existing source ownership must match the product owner; missing source links with any nonzero stock or allocations require review instead of automatic assignment.

Local backend changes:

- `src/plugins/marketplace-commerce/catalog-stock.ts`: shared source selection and initialization.
- `src/plugins/marketplace-commerce/vendor-catalog.service.ts`: transaction-bound creation calls.
- `test/product-taxonomy/variant-details.ts`: integration checks for zero stock, inventory visibility, adjustment and balance preservation on repeat initialization.
- `scripts/market-operations-demo/initialize-catalog-stock.ts`: guarded inspection and explicitly selected repair, with actual database/loopback checks and preservation assertions.
- Backend and web `package.json`, plus web `scripts/demo-market-operations.ts`: demo launcher command.

From the web directory, `npm run demo:market-operations:initialize-stock` inspects missing setup without changing it. Repair requires both `--apply` and explicit inspected IDs through `--variant-ids`. The command targets only the persistent local `vendure_demo_market_ops` database, never resets data and does not run migrations. On Windows, if the npm PowerShell shim strips the argument separator, invoke npm's `npm-cli.js` with Node to forward flags intact.

The authorized repair linked Manna Roots variants 432/433 (`WATERMELON-12`, `WATERMELON-16`) and 434/435 (`LEMON-12`, `LEMON-16`) to their existing owned stock location 4. All four already had zero stock records there. All 405 existing stock records and quantities were preserved, with no new stock records required. Catalog audit facts record the initialization.

Backend dashboard/server/worker build passed. The guarded disposable integration suite passed seven groups and removed its successful test database. No schema migration is required. Restart the existing backend using `npm run demo:market-operations:serve` from the web folder to activate the new creation behavior; refresh Products & Inventory to see repaired existing variants.
