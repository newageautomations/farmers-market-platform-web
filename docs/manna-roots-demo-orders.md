# Manna Roots demo orders

The local `vendure_demo_market_ops` database contains 24 fictional direct storefront orders for Manna Roots. The demo customer is identified in the local `docs/demo-customer-account.json` manifest. The orders use the ten additional juices and shots, with one to three products per order and one or two units per product.

All 24 orders have simulated settled payments and await pickup. Normal checkout services create the order context, payment evidence, financial records, inventory allocation and vendor order links. No external provider is contacted. The script enables the local payment simulator only in its own temporary process; the running demo server configuration stays unchanged.

Sign in at `http://localhost:4322` with the Manna Roots owner credentials from the local `docs/testing-vendor-manna-roots.json` manifest. Open Orders and select All or Direct vendor.

Saved order IDs, codes, product quantities and totals are in `manna-roots-demo-orders.json`. Fixture codes are `DEMO-MANNA-ROOTS-1` through `DEMO-MANNA-ROOTS-24`.

Run from the frontend project folder:

```powershell
# Create missing fixture orders. Retrying preserves existing orders and avoids duplicates.
node scripts/seed-manna-roots-orders.cjs

# Check existing orders, local settled payments, vendor visibility and inventory.
node scripts/seed-manna-roots-orders.cjs --verify
```

The script requires the existing demo customer and Manna Roots catalog. It refuses other database names, non-loopback databases and production settings. It applies no schema changes or migrations. Orders proceed through normal checkout and consume available inventory; it does not invent stock or alter existing orders. Each checkout stage commits separately, and stable fixture codes allow an interrupted run to resume. Expired or invalidated checkout attempts require investigation rather than being silently reset.
