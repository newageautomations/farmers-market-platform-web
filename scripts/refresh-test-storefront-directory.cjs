/* eslint-disable @typescript-eslint/no-require-imports -- Read-only local PostgreSQL helper using existing backend dependencies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
assert.equal(path.resolve(process.cwd()), root);
const backend = path.resolve(root, '../farmers-market-platform');
const r = require('node:module').createRequire(
  path.join(backend, 'package.json'),
);
const env = r('dotenv').parse(
  fs.readFileSync(path.join(backend, '.env.demo-market-operations')),
);
assert.ok(!env.DB_NAME || env.DB_NAME === 'vendure_demo_market_ops');
assert.ok(
  ['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST ?? 'localhost'),
);
const client = new (r('pg').Client)({
  host: env.DB_HOST ?? 'localhost',
  port: Number(env.DB_PORT ?? 5432),
  database: 'vendure_demo_market_ops',
  user: env.DB_USERNAME ?? 'postgres',
  password: env.DB_PASSWORD ?? 'postgres',
});
(async () => {
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const [target] = (
      await client.query(
        'SELECT current_database() AS database, host(inet_server_addr()) AS address',
      )
    ).rows;
    assert.equal(target.database, 'vendure_demo_market_ops');
    assert.ok(['127.0.0.1', '::1'].includes(target.address));
    const markets = (
      await client.query('SELECT id,name FROM farmers_market ORDER BY name')
    ).rows;
    const vendors = (
      await client.query('SELECT id,name FROM platform_vendor ORDER BY name')
    ).rows;
    const sites = (
      await client.query(
        'SELECT "marketId", "vendorId", hostname FROM platform_storefront WHERE status=$1',
        ['active'],
      )
    ).rows;
    const memberships = (
      await client.query(
        `SELECT "marketId", "vendorId" FROM market_vendor_membership WHERE status='approved' UNION SELECT "marketId", "linkedVendorId" AS "vendorId" FROM market_vendor_directory_entry WHERE "linkedVendorId" IS NOT NULL`,
      )
    ).rows;
    function urls(kind, id) {
      return [
        ...new Set(
          sites
            .filter((s) => s[kind] === id && s.hostname)
            .map((s) => {
              assert.ok(
                s.hostname === 'localhost' ||
                  /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.localhost$/.test(s.hostname),
                'Unexpected nonlocal storefront host: ' + s.hostname,
              );
              return `http://${s.hostname}:4321/`;
            }),
        ),
      ];
    }
    const directory = {
      database: target.database,
      updatedAt: new Date().toISOString(),
      markets: markets.map((m) => ({
        ...m,
        urls: urls('marketId', m.id),
        vendorIds: [
          ...new Set(
            memberships
              .filter((link) => link.marketId === m.id)
              .map((link) => link.vendorId),
          ),
        ].filter((id) => vendors.some((v) => v.id === id)),
      })),
      vendors: vendors.map((v) => ({ ...v, urls: urls('vendorId', v.id) })),
    };
    const file = path.join(
      root,
      'apps/storefront/src/data/test-storefronts.json',
    );
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(directory, null, 2) + '\n');
    await client.query('ROLLBACK');
    console.log(JSON.stringify(directory, null, 2));
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
