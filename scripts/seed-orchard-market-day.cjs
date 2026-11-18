// Idempotent local-only seed using the existing native preorder fixture flow.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { createRequire } = Module;
const backend = path.resolve(__dirname, '../../farmers-market-platform');
const rb = createRequire(path.join(backend, 'package.json'));
rb('ts-node').register({
  project: path.join(backend, 'scripts/market-operations-demo/tsconfig.json'),
  transpileOnly: false,
});
rb('reflect-metadata');
async function main() {
  const environment = rb('./scripts/market-operations-demo/environment');
  const fileEnv = rb('dotenv').parse(
    fs.readFileSync(path.join(backend, '.env.demo-market-operations')),
  );
  const overrides = { ...process.env };
  const webEnv = {};
  for (const name of [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local',
  ]) {
    const filename = path.join(__dirname, '..', name);
    if (fs.existsSync(filename))
      Object.assign(webEnv, rb('dotenv').parse(fs.readFileSync(filename)));
  }
  for (const key of [
    'PLATFORM_ACCOUNT_ORIGIN',
    'ADMIN_ORIGIN',
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
  ])
    overrides[key] ||= webEnv[key];
  overrides.PLATFORM_STOREFRONT_LOCAL_PORT = '4321';
  for (const key of new Set([
    ...Object.keys(fileEnv),
    ...Object.keys(process.env),
  ])) {
    if (key.startsWith('STRIPE_')) overrides[key] = '';
  }
  Object.assign(overrides, {
    DEMO_STRIPE_CONNECT_TEST: 'false',
    STRIPE_ENABLED: 'false',
    LOCAL_TEST_PAYMENTS_ENABLED: 'true',
    ENABLE_PAID_ATTRIBUTION: 'true',
    REFUND_POLICY_VERSION: 'local-demo-no-refunds-v1',
    ALLOW_VENDOR_REFUND_REQUESTS: 'false',
    ALLOW_REFUND_UNFULFILLED_CANCELLATION: 'false',
    REFUND_SHIPPING_SHARES: 'false',
  });
  for (const key of Object.keys(overrides))
    if (key.startsWith('STRIPE_') && key !== 'STRIPE_ENABLED')
      overrides[key] = undefined;
  const env = environment.loadDemoEnvironment(overrides);
  for (const key of Object.keys(env))
    if (env[key] === undefined || env[key] === '') delete env[key];
  environment.installDemoEnvironment(env);
  if (process.argv.includes('--verify')) {
    const db = new (rb('pg').Client)({
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      database: env.DB_NAME,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
    });
    await db.connect();
    try {
      const rows = (
        await db.query(`select o.id, o.state, c."occurrenceId", c."vendorId",
        coalesce((select sum(case when s.type='SALE' then -s.quantity when s.type='CANCELLATION' then -s.quantity else 0 end) from stock_movement s join order_line_link l on l."operationalLineId"=s."orderLineId" where l."operationalOrderId"=o.id),0)::int as fulfilled
        from market_operations_audit a join order_context c on c."customerOrderId"=(a.detail->>'orderId')::int join "order" o on o.id=c."orderId"
        where a.action like 'ORCHARD_MARKET78_V1_%' and c."vendorId"=52 order by o.id`)
      ).rows;
      const assert = require('node:assert/strict');
      assert.equal(rows.length, 8);
      for (const row of rows) {
        assert.equal(row.occurrenceId, 78);
        assert.equal(row.fulfilled, 0);
        assert.equal(row.state, 'PaymentSettled');
      }
      const old = (
        await db.query(
          `select o.state from market_operations_audit a join order_line_link l on l."customerOrderId"=(a.detail->>'orderId')::int join "order" o on o.id=l."operationalOrderId" where a.action like 'ORCHARD_MARKET64_V1_%'`,
        )
      ).rows;
      assert.equal(old.length, 8);
      for (const row of old) assert.equal(row.state, 'Cancelled');
      const occurrence = (
        await db.query(
          'select "localStartsAt","localEndsAt" from market_occurrence where id=78',
        )
      ).rows[0];
      assert.equal(occurrence.localStartsAt, '2026-11-13T12:00');
      assert.equal(occurrence.localEndsAt, '2026-11-13T15:00');
      console.log(
        JSON.stringify(
          { database: env.DB_NAME, uncollected: rows.length, orders: rows },
          null,
          2,
        ),
      );
    } finally {
      await db.end();
    }
    return;
  }
  rb('./scripts/market-operations-demo/network').blockDemoExternalNetwork();
  const { bootstrap, DefaultLogger, LogLevel, ConfigService } =
    rb('@vendure/core');
  const { config } = rb('./src/vendure-config');
  config.apiOptions.port = 0;
  config.logger = new DefaultLogger({ level: LogLevel.Warn });
  let source = fs.readFileSync(
    path.join(backend, 'scripts/market-operations-demo/packing-preorders.ts'),
    'utf8',
  );
  const begin = source.indexOf('const fixtures = [');
  const end = source.indexOf('/** Explicit', begin);
  source =
    source.slice(0, begin) +
    'const fixtures = ' +
    JSON.stringify(
      ['Ava', 'Ben', 'Casey', 'Dana', 'Eli', 'Fran', 'Gabe', 'Hope'].map(
        (name, i) => ({ key: String(i + 1), name, lines: [[436, 1]] }),
      ),
    ) +
    ';\n' +
    source.slice(end);
  source = source
    .replaceAll(
      'homepage.vendor@example.test',
      'stripe-fee-d-orchard@example.test',
    )
    .replaceAll('vendorId: 26', 'vendorId: 52')
    .replaceAll('Willow & Grain Farmstead', 'Preorder Fee D orchard')
    .replaceAll('id: 12', 'id: 78')
    .replaceAll('2026-11-15T15:00:00.000Z', '2026-11-13T18:00:00.000Z')
    .replaceAll('packing-nov15-v1', 'orchard-market78-v1')
    .replaceAll('PACKING_NOV15_V1', 'ORCHARD_MARKET78_V1')
    .replaceAll('occurrenceId: 12', 'occurrenceId: 78')
    .replaceAll('.read(vendorCtx, 12)', '.read(vendorCtx, 78)')
    .replaceAll('occurrence=12', 'occurrence=78');
  source = source.replace(
    '  const variants = [',
    `
  if (process.argv.includes('--cancel-wrong')) {
    const {OperationalInventoryService} = require('../../src/plugins/marketplace-commerce/inventory/operational-inventory.service');
    const rows = await db.rawConnection.query(\`select l."operationalOrderId",l."operationalLineId",o.state,c."occurrenceId" from market_operations_audit a join order_line_link l on l."customerOrderId"=(a.detail->>'orderId')::int join \"order\" o on o.id=l."operationalOrderId" join order_context c on c."orderId"=o.id where a.action like 'ORCHARD_MARKET64_V1_%' order by o.id\`);
    assert.equal(rows.length,8);
    for (const row of rows) {
      assert.equal(row.occurrenceId,64);
      if (row.state === 'Cancelled') continue;
      await app.get(OperationalInventoryService).apply(vendorCtx,'UNFULFILLED_CANCEL',{operationKey:require('node:crypto').randomUUID(),orderId:row.operationalOrderId,orderLineId:row.operationalLineId,quantity:1});
    }
    console.log('Cancelled the eight mistaken November 14 operational orders.');
    return;
  }
  if (!await db.getRepository(ctx,OccurrenceOffering).exists({where:{participationId:part.id,variantId:436}})) {
    const original=await db.getRepository(ctx,OccurrenceOffering).findOneByOrFail({id:403});
    await app.get(OccurrenceOfferingService).configure(vendorCtx,{participationId:part.id,listingId:original.listingId,variantId:436,enabled:true,preorderEnabled:true,salesCap:null});
  }
  const variants = [`,
  );
  const filename = path.join(
    backend,
    'scripts/market-operations-demo/orchard-requested-seed.ts',
  );
  const compiled = rb('typescript').transpileModule(source, {
    compilerOptions: {
      module: 1,
      target: 9,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
    },
  }).outputText;
  const fixture = new Module(filename, module);
  fixture.filename = filename;
  fixture.paths = Module._nodeModulePaths(path.dirname(filename));
  fixture._compile(compiled, filename);
  const app = await bootstrap(config);
  const drain = rb(
    './scripts/market-operations-demo/fixture-jobs',
  ).trackFixtureJobs(app.get(ConfigService).jobQueueOptions.jobQueueStrategy);
  try {
    // Historical preorder fixture time applies only to this isolated seed process.
    // The live server and persisted occurrence schedule retain their real clocks.
    if (!process.argv.includes('--cancel-wrong')) {
      const fixtureTime = new Date('2026-11-12T18:00:00.000Z');
      app.get(
        rb('./src/plugins/farmers-market/constants')
          .FARMERS_MARKET_PLUGIN_OPTIONS,
      ).clock = { now: () => new Date(fixtureTime) };
      app.get(
        rb('./src/plugins/marketplace-commerce/constants')
          .MARKETPLACE_COMMERCE_PLUGIN_OPTIONS,
      ).inventoryClock = { now: async () => new Date(fixtureTime) };
    }
    await fixture.exports.populatePackingPreorders(app);
  } finally {
    await drain();
    await app.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
