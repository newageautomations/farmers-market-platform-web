import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const rb = createRequire(
  path.resolve(root, '../farmers-market-platform/package.json'),
);
const { Client } = rb('pg');
const env = rb('dotenv').parse(
  fs.readFileSync(
    path.resolve(
      root,
      '../farmers-market-platform/.env.demo-market-operations',
    ),
  ),
);
assert.equal(
  env.DB_NAME || 'vendure_demo_market_ops',
  'vendure_demo_market_ops',
);
assert.ok(
  ['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST || 'localhost'),
);
const db = new Client({
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT || 5432),
  database: 'vendure_demo_market_ops',
  user: env.DB_USERNAME || 'postgres',
  password: env.DB_PASSWORD || 'postgres',
});
await db.connect();
try {
  await db.query('BEGIN');
  const carts = (
    await db.query(
      `select c."originChannelId" from order_context c join "order" o on o.id=c."orderId" where o.id=283 and o.active=true and c."marketId"=2 and c.kind='MARKET_OCCURRENCE'`,
    )
  ).rows;
  assert.equal(carts.length, 1);
  const marketChannel = carts[0].originChannelId;
  assert.equal(marketChannel, 26);
  for (const [vendorId, name, code] of [
    [7, 'Manna Roots', 'demo-manna-roots-pickup'],
    [9, 'Norma Jean’s Greens', 'demo-norma-jeans-greens-pickup'],
    [18, 'Twice Baked Cafe', 'demo-twice-baked-cafe-pickup'],
  ]) {
    const vendor = (
      await db.query(
        'select name,"primaryChannelId" from platform_vendor where id=$1',
        [vendorId],
      )
    ).rows[0];
    assert.equal(vendor.name, name);
    let methods = (
      await db.query(
        'select id from shipping_method where "customFieldsPlatformownerid"=$1 and "deletedAt" is null',
        [vendorId],
      )
    ).rows;
    assert.ok(
      methods.length <= 1,
      'Do not choose between multiple configured pickup methods',
    );
    if (!methods.length) {
      methods = (
        await db.query(
          `insert into shipping_method (code,checker,calculator,"fulfillmentHandlerCode","customFieldsPlatformownerid") select $1,checker,calculator,"fulfillmentHandlerCode",$2 from shipping_method where id=1 and "customFieldsPlatformownerid"=7 returning id`,
          [code, vendorId],
        )
      ).rows;
      assert.equal(methods.length, 1);
      await db.query(
        `insert into shipping_method_translation ("languageCode",name,description,"baseId") values ('en',$1,$2,$3)`,
        [
          name + ' booth pickup',
          'Collect your preorder from the ' + name + ' booth at the market.',
          methods[0].id,
        ],
      );
    }
    for (const channelId of [1, vendor.primaryChannelId, marketChannel])
      await db.query(
        `insert into shipping_method_channels_channel ("shippingMethodId","channelId") values ($1,$2) on conflict do nothing`,
        [methods[0].id, channelId],
      );
    console.log(
      name + ': local pickup configured for vendor and market channels',
    );
  }
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
