/** Read-only persistent fixture audit. Never bootstraps Vendure or applies migrations. */
import { createRequire } from 'node:module';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
const backend = path.resolve('../farmers-market-platform');
const require = createRequire(path.join(backend, 'package.json'));
const file = path.join(backend, '.env.demo-market-operations');
const env = existsSync(file) ? require('dotenv').parse(readFileSync(file)) : {};
const host = env.DB_HOST ?? 'localhost';
if (
  !['localhost', '127.0.0.1', '::1'].includes(host) ||
  (env.DB_NAME && env.DB_NAME !== 'vendure_demo_market_ops')
)
  throw new Error('Unexpected local demo target');
const client = new (require('pg').Client)({
  host,
  port: Number(env.DB_PORT ?? 5432),
  database: 'vendure_demo_market_ops',
  user: env.DB_USERNAME ?? 'postgres',
  password: env.DB_PASSWORD ?? 'postgres',
  connectionTimeoutMillis: 5000,
});
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  console.log(
    JSON.stringify(
      (
        await client.query(
          'SELECT current_database() AS database, host(inet_server_addr()) AS address',
        )
      ).rows,
    ),
  );
  if (process.argv.includes('--migrations')) {
    const applied = new Set(
      (await client.query('SELECT name FROM migrations')).rows.map(
        (r: { name: string }) => r.name,
      ),
    );
    const pending = readdirSync(path.join(backend, 'src/migrations'))
      .filter((f) => f.endsWith('.ts'))
      .flatMap((f) => {
        const name = /export class (\w+)/.exec(
          readFileSync(path.join(backend, 'src/migrations', f), 'utf8'),
        )?.[1];
        return name && !applied.has(name) ? [name] : [];
      });
    console.log('Pending migration classes:', JSON.stringify(pending));
  } else if (process.argv.includes('--columns')) {
    console.log(
      JSON.stringify(
        (
          await client.query(
            "SELECT table_name,column_name FROM information_schema.columns WHERE table_name IN ('product','product_variant','facet_value','occurrence_offering','market_listing','occurrence_participation','market_occurrence') ORDER BY table_name,ordinal_position",
          )
        ).rows,
      ),
    );
  } else {
    for (const [label, sql] of Object.entries({
      products: `SELECT p.id, p.enabled, v.id AS variant_id,v.sku,v.enabled AS variant_enabled FROM product p JOIN product_variant v ON v."productId"=p.id WHERE v.sku LIKE 'SHOP-PAGE-%' ORDER BY v.sku`,
      categories: `SELECT j.*,t.name FROM product_facet_values_facet_value j JOIN facet_value_translation t ON t."baseId"=j."facetValueId" WHERE j."productId" IN (SELECT "productId" FROM product_variant WHERE sku LIKE 'SHOP-PAGE-%')`,
      occurrences: `SELECT * FROM market_occurrence WHERE "generationKey" LIKE 'shop-page-%' ORDER BY id`,
      stock: `SELECT s.* FROM stock_level s JOIN product_variant v ON v.id=s."productVariantId" WHERE v.sku LIKE 'SHOP-PAGE-%' ORDER BY v.sku`,
      offerings: `SELECT o.* FROM occurrence_offering o JOIN product_variant v ON v.id=o."variantId" WHERE v.sku LIKE 'SHOP-PAGE-%' ORDER BY o.id`,
      listings: `SELECT l.* FROM market_listing l JOIN product_variant v ON v.id=l."variantId" WHERE v.sku LIKE 'SHOP-PAGE-%' ORDER BY l.id`,
      participations: `SELECT p.* FROM occurrence_participation p JOIN market_occurrence o ON o.id=p."occurrenceId" WHERE o."generationKey" LIKE 'shop-page-%' ORDER BY p.id`,
      sources: `SELECT v.id,v.sku,v."customFieldsCanonicalsourceid" AS source_id,p."customFieldsPlatformownerid" AS owner_id,s."customFieldsPlatformownerid" AS source_owner_id FROM product_variant v JOIN product p ON p.id=v."productId" LEFT JOIN stock_location s ON s.id=v."customFieldsCanonicalsourceid" WHERE v.sku LIKE 'SHOP-PAGE-%' ORDER BY v.sku`,
      channels: `SELECT j.* FROM product_channels_channel j WHERE j."productId" IN (SELECT "productId" FROM product_variant WHERE sku LIKE 'SHOP-PAGE-%') ORDER BY j."productId"`,
    }))
      console.log(label, JSON.stringify((await client.query(sql)).rows));
  }
  await client.query('ROLLBACK');
} finally {
  await client.end();
}
