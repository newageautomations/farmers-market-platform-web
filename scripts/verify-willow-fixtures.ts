/** Read-only persistent fixture audit. Never bootstraps Vendure or applies migrations. */
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
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
  const q = async (sql: string, args: unknown[] = []) =>
    (await client.query(sql, args)).rows;
  const [target] = await q(
    'SELECT current_database() AS database,host(inet_server_addr()) AS address',
  );
  if (
    target.database !== 'vendure_demo_market_ops' ||
    !['127.0.0.1', '::1'].includes(target.address)
  )
    throw new Error('Unexpected actual target');
  const [vendor] = await q(
    `SELECT v.id,v.name,v."primaryChannelId" AS channel FROM platform_vendor v WHERE v."provisioningKey"='homepage-phase1-vendor'`,
  );
  const products = await q(
    `SELECT p.id,p.enabled,p."featuredAssetId" AS asset, v.id AS variant,v.sku,v.enabled AS variant_enabled,price.price,stock."stockOnHand" AS stock, t.slug,t.name
 FROM product p JOIN product_variant v ON v."productId"=p.id JOIN product_translation t ON t."baseId"=p.id AND t."languageCode"='en'
 JOIN product_variant_price price ON price."variantId"=v.id AND price."channelId"=$2
 JOIN stock_level stock ON stock."productVariantId"=v.id AND stock."stockLocationId"=v."customFieldsCanonicalsourceid"
 WHERE p."customFieldsPlatformownerid"=$1 AND v.sku LIKE 'WILLOW-GRAIN-%' ORDER BY v.sku`,
    [vendor.id, vendor.channel],
  );
  if (
    products.length !== 8 ||
    products.some(
      (p: { asset: number; enabled: boolean; variant_enabled: boolean }) =>
        !p.asset || !p.enabled || !p.variant_enabled,
    )
  )
    throw new Error('Incomplete catalog');
  const [site] = await q(
    `SELECT id,hostname,"appearanceVersion" AS version,"appearancePublished" AS published FROM platform_storefront WHERE "vendorId"=$1 AND key='homepage-phase1-vendor'`,
    [vendor.id],
  );
  const assets = await q(
    `SELECT a.id,t.name FROM asset a JOIN asset_translation t ON t."baseId"=a.id JOIN asset_channels_channel c ON c."assetId"=a.id AND c."channelId"=$1 WHERE t.name LIKE 'willow-pexels-%' ORDER BY a.id`,
    [vendor.channel],
  );
  const categories = await q(
    `SELECT DISTINCT f.id,t.name FROM facet_value f JOIN facet_value_translation t ON t."baseId"=f.id JOIN product_facet_values_facet_value j ON j."facetValueId"=f.id JOIN product p ON p.id=j."productId" WHERE p.id=ANY($1::int[]) ORDER BY f.id`,
    [products.map((p: { id: number }) => p.id)],
  );
  const occurrences = await q(
    `SELECT o.id,o."scheduleDate",o."startsAt",o."endsAt",m.name,p.status AS participation,member.status AS membership FROM market_occurrence o JOIN farmers_market m ON m.id=o."marketId" JOIN occurrence_participation p ON p."occurrenceId"=o.id JOIN market_vendor_membership member ON member.id=p."membershipId" AND member."vendorId"=$1 WHERE o."generationKey" LIKE 'willow-visit-%' ORDER BY o."startsAt",o.id`,
    [vendor.id],
  );
  const offerings = await q(
    `SELECT o.id,o.enabled,o."preorderEnabled",o."salesCap",o."variantId",p."occurrenceId" FROM occurrence_offering o JOIN occurrence_participation p ON p.id=o."participationId" JOIN market_occurrence occurrence ON occurrence.id=p."occurrenceId" WHERE occurrence."generationKey" LIKE 'willow-visit-%' ORDER BY o.id`,
  );
  const shop = await q(
    `SELECT v.id,v.sku,v.enabled,v."productId",s."stockOnHand",p.enabled AS product_enabled FROM product_variant v JOIN product p ON p.id=v."productId" LEFT JOIN stock_level s ON s."productVariantId"=v.id AND s."stockLocationId"=v."customFieldsCanonicalsourceid" WHERE v.sku LIKE 'SHOP-PAGE-%' ORDER BY v.id`,
  );
  const state = {
    target,
    vendor,
    products,
    assets,
    categories,
    occurrences,
    offerings,
    shop,
    appearanceVersion: site.version,
    story: site.published.about.sections.map((s: { id: string }) => s.id),
  };
  const { writeFileSync } = await import('node:fs');
  const out = path.resolve('.runtime/willow-audit.json');
  if (process.argv.includes('--compare')) {
    const prior = JSON.parse(readFileSync(out, 'utf8'));
    if (JSON.stringify(prior) !== JSON.stringify(state))
      throw new Error('Persisted fixture state changed on rerun');
    console.log(
      'Idempotency verified: exact product, stock, asset, category, occurrence, offering, story, appearance version, and SHOP-PAGE fixture state unchanged.',
    );
  } else writeFileSync(out, JSON.stringify(state, null, 2));
  console.log(
    JSON.stringify({
      database: target.database,
      name: vendor.name,
      products: products.length,
      assets: assets.length,
      categories,
      occurrences: occurrences.length,
      offerings: offerings.length,
      appearanceVersion: site.version,
      stock: products.map(
        (p: { sku: string; stock: number; price: number }) => ({
          sku: p.sku,
          stock: p.stock,
          price: p.price,
        }),
      ),
      story: state.story,
    }),
  );
  await client.query('ROLLBACK');
} finally {
  await client.end();
}
