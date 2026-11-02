/* Read-only qualification of the populated local catalog. */
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const backend = path.resolve('../farmers-market-platform');
const r = require('node:module').createRequire(
  path.join(backend, 'package.json'),
);
const e = r('dotenv').parse(
  fs.readFileSync(path.join(backend, '.env.demo-market-operations')),
);
assert.ok(['localhost', '127.0.0.1', '::1'].includes(e.DB_HOST ?? 'localhost'));
assert.ok(!e.DB_NAME || e.DB_NAME === 'vendure_demo_market_ops');
const c = new (r('pg').Client)({
  host: e.DB_HOST ?? 'localhost',
  port: Number(e.DB_PORT ?? 5432),
  database: 'vendure_demo_market_ops',
  user: e.DB_USERNAME ?? 'postgres',
  password: e.DB_PASSWORD ?? 'postgres',
});
(async () => {
  await c.connect();
  try {
    await c.query('BEGIN READ ONLY');
    const target = (
      await c.query(
        'SELECT current_database() AS database,host(inet_server_addr()) AS address',
      )
    ).rows[0];
    assert.equal(target.database, 'vendure_demo_market_ops');
    assert.ok(['127.0.0.1', '::1'].includes(target.address));
    const vendors = (
      await c.query(
        'SELECT id,name,"primaryChannelId" AS "channelId" FROM platform_vendor ORDER BY id',
      )
    ).rows;
    assert.equal(vendors.length, 22);
    const products = (
      await c.query(`SELECT p.id,p.enabled,p."featuredAssetId",p."customFieldsPlatformownerid" AS "vendorId",p."customFieldsProductinformation" AS information,t.name,t.description,a.source,a.preview,a."mimeType",a.width,a.height,
    EXISTS(SELECT 1 FROM asset_channels_channel ac JOIN platform_vendor v ON v.id=p."customFieldsPlatformownerid" WHERE ac."assetId"=a.id AND ac."channelId"=v."primaryChannelId") AS "assetInChannel",
    (SELECT count(*)::int FROM product_facet_values_facet_value j JOIN facet_value fv ON fv.id=j."facetValueId" JOIN facet f ON f.id=fv."facetId" LEFT JOIN vendor_category_metadata m ON m.facet_value_id=fv.id WHERE j."productId"=p.id AND (m.vendor_id=p."customFieldsPlatformownerid" OR (m.vendor_id IS NULL AND NOT f."isPrivate" AND EXISTS(SELECT 1 FROM facet_translation ft WHERE ft."baseId"=f.id AND ft.name ~* '^(product[[:space:]]+)?categor(y|ies)$') AND EXISTS(SELECT 1 FROM facet_channels_channel fc JOIN platform_vendor owner ON owner.id=p."customFieldsPlatformownerid" AND owner."primaryChannelId"=fc."channelId" WHERE fc."facetId"=f.id) AND NOT EXISTS(SELECT 1 FROM facet_channels_channel fc JOIN platform_vendor other ON other."primaryChannelId"=fc."channelId" AND other.id<>p."customFieldsPlatformownerid" WHERE fc."facetId"=f.id)))) AS "vendorCategories",
    (SELECT count(*)::int FROM product_facet_values_facet_value j JOIN facet_value fv ON fv.id=j."facetValueId" JOIN facet f ON f.id=fv."facetId" AND f.code='market-category' WHERE j."productId"=p.id) AS "marketCategories"
    FROM product p JOIN product_translation t ON t."baseId"=p.id AND t."languageCode"='en' LEFT JOIN asset a ON a.id=p."featuredAssetId" WHERE p."deletedAt" IS NULL ORDER BY p.id`)
    ).rows;
    assert.equal(products.length, 396);
    const variants = (
      await c.query(`SELECT pv.id,pv."productId",pv.enabled,pv.sku,p."customFieldsPlatformownerid" AS "vendorId",sl."stockOnHand",sl."stockAllocated",loc."customFieldsPlatformownerid" AS "sourceOwnerId",price.price,price."currencyCode",
    EXISTS(SELECT 1 FROM product_variant_channels_channel vc JOIN platform_vendor v ON v.id=p."customFieldsPlatformownerid" WHERE vc."productVariantId"=pv.id AND vc."channelId"=v."primaryChannelId") AS "variantInChannel"
    FROM product_variant pv JOIN product p ON p.id=pv."productId" AND p."deletedAt" IS NULL JOIN platform_vendor v ON v.id=p."customFieldsPlatformownerid"
    LEFT JOIN stock_location loc ON loc.id=pv."customFieldsCanonicalsourceid" LEFT JOIN stock_level sl ON sl."stockLocationId"=loc.id AND sl."productVariantId"=pv.id
    LEFT JOIN product_variant_price price ON price."variantId"=pv.id AND price."channelId"=v."primaryChannelId" WHERE pv."deletedAt" IS NULL ORDER BY pv.id`)
    ).rows;
    for (const p of products) {
      assert(
        p.enabled &&
          p.featuredAssetId &&
          p.assetInChannel &&
          p.vendorCategories > 0 &&
          p.marketCategories > 0,
        `Missing catalog association: ${p.id} ${p.name}`,
      );
      assert(
        !/\bdemo\b|fixture|\bsample\b|taxable product/i.test(
          p.name + ' ' + p.description,
        ),
        `Placeholder copy: ${p.name}`,
      );
      const info = JSON.parse(p.information);
      assert(
        info.storage.content &&
          info.allergens.content &&
          info.pickup.content &&
          info.custom.some((c) => c.title === 'Package size' && c.content),
      );
      assert(p.mimeType === 'image/jpeg' && p.width > 0 && p.height > 0);
      for (const file of [p.source, p.preview])
        assert(
          fs.existsSync(
            path.join(backend, '.demo-market-operations/assets', file),
          ),
          `Missing local asset: ${file}`,
        );
      const own = variants.filter((v) => v.productId === p.id);
      assert(own.length > 0);
      for (const v of own) {
        assert(
          v.enabled &&
            v.variantInChannel &&
            v.price > 0 &&
            v.currencyCode === 'USD',
        );
        assert.equal(v.sourceOwnerId, p.vendorId);
        assert(v.stockOnHand >= v.stockAllocated && v.stockAllocated >= 0);
        assert(!/TEST|DEMO|FIXTURE|SHOP-PAGE/i.test(v.sku));
      }
    }
    const rows = vendors.map((v) => {
      const own = products.filter((p) => p.vendorId === v.id);
      assert.equal(own.length, 18);
      assert.equal(new Set(own.map((p) => p.name)).size, 18);
      return { vendor: v.name, products: own.length };
    });
    const state = (
      await c.query(
        `SELECT (SELECT count(*)::int FROM farmers_market) AS markets,(SELECT count(*)::int FROM market_occurrence) AS occurrences,(SELECT count(*)::int FROM "order") AS orders,(SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND t.tgenabled='D') AS "disabledTriggers"`,
      )
    ).rows[0];
    assert.equal(state.disabledTriggers, 0);
    const sources = require('./data/vendor-catalog-photos.cjs');
    const report = {
      status: 'PASS',
      database: target.database,
      checkedAt: new Date().toISOString(),
      vendors: rows,
      products: products.length,
      variants: variants.length,
      uniqueProductPhotos: new Set(products.map((p) => p.featuredAssetId)).size,
      state,
      sourcePages: sources.map((p) => ({ key: p.key, page: p.page })),
    };
    if (process.argv.includes('--http')) {
      report.storefronts = [];
      for (const vendor of vendors) {
        const [{ token }] = (
          await c.query('SELECT token FROM channel WHERE id=$1', [
            vendor.channelId,
          ])
        ).rows;
        const sites = (
          await c.query(
            'SELECT hostname FROM platform_storefront WHERE "vendorId"=$1 AND status=$2',
            [vendor.id, 'active'],
          )
        ).rows;
        if (!sites.length) {
          report.storefronts.push({
            vendor: vendor.name,
            status:
              'Not provisioned for public shopping; catalog verified in database',
          });
          continue;
        }
        const headers = {
          'content-type': 'application/json',
          'apollo-require-preflight': 'true',
          'vendure-token': token,
        };
        if (sites[0]?.hostname) headers.Host = sites[0].hostname + ':4321';
        const response = await fetch('http://127.0.0.1:3000/shop-api', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query:
              'query { products(options:{take:100}) { totalItems items { id name featuredAsset { preview } } } }',
          }),
          signal: AbortSignal.timeout(15000),
        });
        const body = await response.text();
        assert.equal(response.status, 200, `${vendor.name}: ${body}`);
        const data = JSON.parse(body);
        assert(!data.errors, JSON.stringify(data.errors));
        assert.equal(
          data.data.products.totalItems,
          18,
          `Wrong public catalog: ${vendor.name}`,
        );
        for (const p of data.data.products.items) {
          assert(p.featuredAsset?.preview);
          const photo = await fetch(p.featuredAsset.preview, {
            signal: AbortSignal.timeout(15000),
          });
          assert.equal(photo.status, 200, `Image unavailable: ${p.name}`);
          assert(photo.headers.get('content-type')?.startsWith('image/'));
          await photo.arrayBuffer();
        }
        report.storefronts.push({
          vendor: vendor.name,
          products: 18,
          photos: 'PASS',
        });
      }
    }
    fs.writeFileSync(
      '.runtime/vendor-catalog/verification.json',
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
    await c.query('ROLLBACK');
  } finally {
    await c.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
