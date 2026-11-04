/* Explicit local pickup fixtures. Preserves existing records; repeats reuse audit markers. */
/* eslint-disable @typescript-eslint/no-require-imports -- The decorated Vendure backend requires its CommonJS ts-node loader. */
const assert = require('node:assert/strict');
const { createRequire, Module } = require('node:module');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const backend = path.resolve(root, '../farmers-market-platform');
const rb = createRequire(path.join(backend, 'package.json'));
rb('ts-node').register({
  project: path.join(backend, 'scripts/market-operations-demo/tsconfig.json'),
  transpileOnly: false,
});
rb('reflect-metadata');
const environment = rb('./scripts/market-operations-demo/environment.ts');
const local = rb('dotenv').parse(readFileSync(path.join(root, '.env')));
const account = Object.fromEntries(
  [
    'PLATFORM_ACCOUNT_ORIGIN',
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'ADMIN_ORIGIN',
    'PLATFORM_STOREFRONT_LOCAL_PORT',
  ]
    .filter((k) => local[k])
    .map((k) => [k, local[k]]),
);
const env = environment.loadDemoEnvironment({
  ...process.env,
  ...account,
  LOCAL_TEST_PAYMENTS_ENABLED: 'true',
});
assert.equal(env.DB_NAME, 'vendure_demo_market_ops');
environment.installDemoEnvironment(env);
const restore = rb(
  './scripts/market-operations-demo/network.ts',
).blockDemoExternalNetwork();
const core = rb('@vendure/core');
const { config } = rb('./src/vendure-config.ts');
config.logger = new core.DefaultLogger({ level: core.LogLevel.Error });
config.dbConnectionOptions = {
  ...config.dbConnectionOptions,
  synchronize: false,
  migrationsRun: false,
};
config.apiOptions = { ...config.apiOptions, hostname: '127.0.0.1', port: 0 };
config.schedulerOptions = {
  ...config.schedulerOptions,
  runTasksInWorkerOnly: true,
};
config.jobQueueOptions = { ...config.jobQueueOptions, activeQueues: [] };
config.plugins = config.plugins.filter(
  (p) => (p.plugin ?? p).name !== 'EmailPlugin',
);
const load = (file, name) => rb('./src/plugins/' + file + '.ts')[name];
async function main() {
  const app = await core.bootstrap(config);
  try {
    const db = app.get(core.TransactionalConnection);
    const [target] = await db.rawConnection.query(
      'select current_database() as database,host(inet_server_addr()) as address',
    );
    assert.equal(target.database, 'vendure_demo_market_ops');
    assert.ok(['::1', '127.0.0.1'].includes(target.address));
    const platform = await rb(
      './scripts/market-operations-demo/seed.ts',
    ).demoContext(app);
    const entities = rb(
      './src/plugins/farmers-market/entities/market.entities.ts',
    );
    const owner = await db.getRepository(platform, core.User).findOneOrFail({
      where: { identifier: 'manna-roots@example.test' },
      relations: ['roles', 'roles.channels'],
    });
    const channel = await db
      .getRepository(platform, core.Channel)
      .findOneByOrFail({ id: 9 });
    const vendorCtx = await app
      .get(core.RequestContextService)
      .create({ apiType: 'admin', user: owner, channelOrToken: channel });
    const memberships = app.get(
      load(
        'farmers-market/services/market-vendor-membership.service',
        'MarketVendorMembershipService',
      ),
    );
    const occurrences = app.get(
      load('farmers-market/services/occurrence.service', 'OccurrenceService'),
    );
    const participation = app.get(
      load(
        'farmers-market/services/participation.service',
        'ParticipationService',
      ),
    );
    const listings = app.get(
      load(
        'farmers-market/services/market-listing.service',
        'MarketListingService',
      ),
    );
    const offerings = app.get(
      load(
        'farmers-market/services/occurrence-offering.service',
        'OccurrenceOfferingService',
      ),
    );
    const publishing = app.get(
      load(
        'marketplace-commerce/catalog-publishing.service',
        'CatalogPublishingService',
      ),
    );
    const repo = (t) => db.getRepository(platform, t);
    // Reuse the existing guarded checkout recipe, parameterized only for these fixture records.
    const filename = path.join(
      backend,
      'scripts/market-operations-demo/packing-preorders.ts',
    );
    let source = readFileSync(filename, 'utf8');
    source =
      source.slice(0, source.indexOf('const fixtures =')) +
      source.slice(source.indexOf('/** Explicit, idempotent'));
    source = source.replace(
      'populatePackingPreorders(app: INestApplication)',
      'populatePackingPreorders(app: INestApplication, plan: any)',
    );
    source = source.replace(
      '  assertDemoEnvironment(process.env);',
      '  const fixtures = plan.fixtures;\n  assertDemoEnvironment(process.env);',
    );
    source = source
      .replaceAll('homepage.vendor@example.test', 'manna-roots@example.test')
      .replace('vendorId: 26', 'vendorId: 7')
      .replace('Willow & Grain Farmstead', 'Manna Roots');
    source = source
      .replaceAll('id: 12', 'id: plan.id')
      .replace(
        'assert.equal(occurrence.startsAt.toISOString(), "2026-11-15T15:00:00.000Z");',
        'assert.equal(occurrence.startsAt.toISOString(), plan.startsAt);',
      );
    source = source
      .replaceAll('occurrenceId: 12', 'occurrenceId: plan.id')
      .replace('read(vendorCtx, 12)', 'read(vendorCtx, plan.id)');
    source = source
      .replaceAll('packing-nov15-v1', 'manna-pickup-v1')
      .replaceAll('PACKING_NOV15_V1', 'MANNA_PICKUP_V1');
    source = source.replace(
      'const emailAddress = `manna-pickup-v1.${fixture.name.toLowerCase()}@example.test`;',
      'const emailAddress = `manna-pickup-v1.${fixture.key}@example.test`;',
    );
    const mod = new Module(filename, module);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    mod._compile(
      rb('typescript').transpileModule(source, {
        compilerOptions: {
          module: rb('typescript').ModuleKind.CommonJS,
          target: rb('typescript').ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
    const names = [
      'Sarah',
      'James',
      'Emily',
      'Michael',
      'Lisa',
      'David',
      'Amanda',
    ];
    const results = [];
    for (const [marketId, date, count] of [
      [1, '2026-11-07', 7],
      [2, '2026-11-07', 7],
      [1, '2026-11-14', 5],
    ]) {
      const market = await repo(entities.Market).findOneByOrFail({
        id: marketId,
      });
      const marketChannel = await repo(core.Channel).findOneByOrFail({
        id: market.channelId,
      });
      // Existing platform provisioning context retains trusted admin authority in the actual Market channel.
      const TenantMembership = rb(
        './src/plugins/platform-identity/entities.ts',
      ).TenantMembership;
      const managerMembership = await repo(TenantMembership).findOneOrFail({
        where: { marketId, status: 'active' },
        order: { id: 'ASC' },
      });
      const manager = await repo(core.User).findOneOrFail({
        where: { id: managerMembership.principalId },
        relations: ['roles', 'roles.channels'],
      });
      const marketCtx = await app.get(core.RequestContextService).create({
        apiType: 'admin',
        user: manager,
        channelOrToken: marketChannel,
      });
      let member = await repo(entities.MarketVendorMembership).findOneBy({
        marketId,
        vendorId: 7,
      });
      if (!member || member.consentState !== 'VERIFIED')
        member = await memberships.request(
          vendorCtx,
          marketId,
          member?.version,
        );
      if (member.status !== 'approved')
        member = await memberships.set(
          marketCtx,
          marketId,
          7,
          'approved',
          member.version,
        );
      let occurrence = await repo(entities.MarketOccurrence).findOneBy({
        marketId,
        generationKey: `manual:manna-pickup-v1:${date}`,
      });
      if (!occurrence)
        occurrence = await occurrences.createManual(
          marketCtx,
          marketId,
          date,
          `manual:manna-pickup-v1:${date}`,
          {
            startsAt: `${date}T15:00:00Z`,
            endsAt: `${date}T20:00:00Z`,
            venue: market.venue,
            pickupInstructions:
              'Collect your preorder from the Manna Roots booth.',
            preorderOverride: {
              opensDaysBefore: 30,
              opensTime: '00:00',
              closesDaysBefore: 1,
              closesTime: '23:00',
            },
          },
        );
      let part = await repo(entities.OccurrenceParticipation).findOneBy({
        membershipId: member.id,
        occurrenceId: occurrence.id,
      });
      if (!part)
        part = await participation.configure(vendorCtx, {
          membershipId: member.id,
          occurrenceId: occurrence.id,
          status: 'confirmed',
          pickupInstructions: 'Collect from Manna Roots.',
        });
      for (const variantId of [6, 7, 8]) {
        let listing = await repo(entities.MarketListing).findOneBy({
          membershipId: member.id,
          variantId,
        });
        if (!listing)
          listing = await listings.request(vendorCtx, member.id, variantId);
        if (listing.status !== 'approved')
          listing = await listings.setStatus(
            marketCtx,
            listing.id,
            listing.version,
            'approved',
          );
        const prior = await repo(entities.OccurrenceOffering).findOneBy({
          participationId: part.id,
          variantId,
        });
        if (!prior)
          await offerings.configure(vendorCtx, {
            participationId: part.id,
            listingId: listing.id,
            variantId,
            enabled: true,
            preorderEnabled: true,
            salesCap: null,
          });
        const pub = await publishing.read(vendorCtx, listing.id);
        if (pub.state !== 'PUBLISHED')
          await publishing.publish(vendorCtx, listing.id);
      }
      const fixtures = Array.from({ length: count }, (_, i) => ({
        key: `${occurrence.id}-${i + 1}`,
        name: names[i],
        lines: [
          [6 + (i % 3), 1 + (i % 2)],
          ...(i % 2 === 0 ? [[6 + ((i + 1) % 3), 1]] : []),
        ],
      }));
      await mod.exports.populatePackingPreorders(app, {
        id: occurrence.id,
        startsAt: occurrence.startsAt.toISOString(),
        fixtures,
      });
      results.push({
        market: market.name,
        date,
        occurrenceId: occurrence.id,
        orders: count,
      });
    }
    console.log(
      'MANNA PICKUP FIXTURES VERIFIED',
      JSON.stringify({ database: target.database, groups: results }),
    );
  } finally {
    await app.close();
    restore();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
