/** Additive fixture for the explicitly requested Boerne rentals. Never resets records. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const backend = createRequire(
  resolve('..', 'farmers-market-platform/package.json'),
);
const { loadDemoEnvironment, assertDemoEnvironment } = backend(
  './scripts/market-operations-demo/environment.ts',
);
const env = loadDemoEnvironment();
assertDemoEnvironment(env);
const { Client } = backend('pg');
const db = new Client({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  database: env.DB_NAME,
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD,
});
const items = [
  [
    'Six-foot folding table',
    'A sturdy six-foot folding table for product displays.',
    1000,
    30,
    4,
    null,
  ],
  [
    'Folding chair',
    'A folding chair for vendors and booth staff.',
    300,
    80,
    8,
    null,
  ],
  [
    '10 x 10 canopy tent',
    'A pop-up canopy with a frame and weather-resistant cover. Reserve weights separately.',
    3000,
    15,
    2,
    null,
  ],
  [
    'Canopy weight set',
    'Four weights to secure one canopy, subject to market setup requirements.',
    1000,
    20,
    2,
    null,
  ],
  [
    'Six-foot tablecloth',
    'A clean fitted tablecloth for a standard six-foot table.',
    500,
    30,
    4,
    null,
  ],
  [
    'Outdoor extension cord',
    'A 25-foot outdoor-rated extension cord for an approved powered booth.',
    500,
    20,
    3,
    'ELECTRICITY',
  ],
  [
    'Power strip',
    'A grounded power strip for an approved powered booth.',
    400,
    20,
    2,
    'ELECTRICITY',
  ],
  [
    'Portable handwashing station',
    'A portable handwashing setup with fresh-water and wastewater containers.',
    2500,
    8,
    1,
    null,
  ],
  [
    'Insulated cooler',
    'A large insulated cooler. Ice and temperature monitoring are supplied by the vendor.',
    1500,
    12,
    2,
    null,
  ],
  [
    'Tiered display rack',
    'A freestanding tiered rack for packaged products and merchandise.',
    1200,
    12,
    2,
    null,
  ],
] as const;
await db.connect();
try {
  await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  await db.query("SET LOCAL statement_timeout='15s'");
  const target = (
    await db.query(
      'SELECT current_database() AS database, host(inet_server_addr()) AS address',
    )
  ).rows[0];
  assert.equal(target.database, 'vendure_demo_market_ops');
  assert.ok(['127.0.0.1', '::1'].includes(target.address));
  const markets = (
    await db.query(
      'SELECT id,name,"channelId" FROM farmers_market WHERE slug=$1 AND status=$2 FOR UPDATE',
      ['boerne-farmers-market', 'active'],
    )
  ).rows;
  assert.equal(markets.length, 1);
  const market = markets[0];
  assert.equal(market.id, 2);
  assert.equal(market.channelId, 26);
  const added: string[] = [],
    kept: string[] = [];
  for (const [
    index,
    [name, description, priceMinor, capacity, maxQuantity, requiredAmenity],
  ] of items.entries()) {
    const existing = await db.query(
      'SELECT id FROM market_rental_option WHERE "marketId"=$1 AND lower(details->>\'name\')=lower($2)',
      [market.id, name],
    );
    if (existing.rows.length) {
      kept.push(name);
      continue;
    }
    const details = {
      name,
      description,
      enabled: true,
      priceMinor,
      currency: 'USD',
      defaultQuantity: 0,
      maxQuantity,
      capacity,
      requiredAmenity,
      sortOrder: index,
      imageAssetId: null,
      image: null,
    };
    await db.query(
      'INSERT INTO market_rental_option ("createdAt","updatedAt","marketId",revision,details) VALUES (now(),now(),$1,1,$2::jsonb)',
      [market.id, JSON.stringify(details)],
    );
    added.push(name);
  }
  const total = (
    await db.query(
      'SELECT count(*)::int AS count FROM market_rental_option WHERE "marketId"=$1',
      [market.id],
    )
  ).rows[0].count;
  await db.query('COMMIT');
  console.log(
    JSON.stringify(
      {
        target,
        market,
        added,
        preservedMatchingItems: kept,
        totalRentalItems: total,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
