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
  assert.equal(
    (await db.query('select current_database() as name')).rows[0].name,
    'vendure_demo_market_ops',
  );
  const channel = (await db.query('select token from channel where id=26'))
    .rows[0];
  if (process.argv.includes('--verify')) {
    const result = (
      await db.query(`SELECT o.id,o."localStartsAt",o."localEndsAt",p.state,
      (select count(*)::int from market_occurrence_space_assignment a where a."occurrenceId"=o.id and a."deletedAt" is null) as assignments,
      (select count(*)::int from occurrence_offering f join occurrence_participation t on t.id=f."participationId" join market_listing l on l.id=f."listingId" where t."occurrenceId"=o.id and f.enabled=true and l.status='approved' and t.status='confirmed') as offerings,
      (select count(*)::int from market_invoice i where i."occurrenceId"=o.id and i.status='OPEN') as invoices,
      (select sum(i."totalMinor")::int from market_invoice i where i."occurrenceId"=o.id and i.status='OPEN') as "totalMinor"
      FROM market_occurrence o JOIN market_occurrence_plan p ON p."occurrenceId"=o.id WHERE o.id=68 AND o."marketId"=2`)
    ).rows[0];
    assert.equal(result.assignments, 11);
    assert.equal(result.offerings, 202);
    assert.equal(result.invoices, 11);
    assert.equal(result.totalMinor, 49500);
    assert.equal(result.state, 'PUBLISHED');
    console.log('VERIFIED', JSON.stringify(result));
    const res = await fetch('http://127.0.0.1:3000/shop-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Apollo-Require-Preflight': 'true',
        'vendure-token': channel.token,
      },
      body: JSON.stringify({
        query: '{marketOccurrenceCatalog(occurrenceId:"68"){totalItems}}',
      }),
    });
    const publicCatalog = await res.json();
    assert.equal(publicCatalog.data?.marketOccurrenceCatalog.totalItems, 202);
    console.log('STOREFRONT', JSON.stringify(publicCatalog));
    const receipts = (
      await db.query(
        `select count(distinct e."eventId")::int as count from platform_consumer_receipt r join platform_outbox_record e on e."eventId"=r."eventId" join platform_inbox_event_progress p on p.event_id=e."eventId" and p.completed=true where r.consumer like 'platform-inbox-v1:%' and e.type='inbox.booth.invoice' and e.payload->>'resourceId' in (select id::text from market_invoice where "occurrenceId"=68)`,
      )
    ).rows[0].count;
    assert.equal(receipts, 11);
    console.log('INVOICE_INBOX_RECEIPTS', receipts);
    console.log(
      'INVOICE_EVENTS',
      JSON.stringify(
        (
          await db.query(
            `select type,state,count(*)::int from platform_outbox_record where type='inbox.booth.invoice' and payload->>'resourceId' in (select id::text from market_invoice where "occurrenceId"=68) group by type,state`,
          )
        ).rows,
      ),
    );
    process.exitCode = 0;
  } else {
    rb('ts-node').register({
      project: path.resolve(
        root,
        '../farmers-market-platform/scripts/market-operations-demo/tsconfig.json',
      ),
      transpileOnly: false,
    });
    rb('reflect-metadata');
    const environment = rb('./scripts/market-operations-demo/environment.ts');
    const local = Object.assign(
      {},
      ...['.env', '.env.local', '.env.development', '.env.development.local']
        .filter((f) => fs.existsSync(path.join(root, f)))
        .map((f) => rb('dotenv').parse(fs.readFileSync(path.join(root, f)))),
    );
    const accounts = Object.fromEntries(
      [
        'PLATFORM_ACCOUNT_ORIGIN',
        'ADMIN_ORIGIN',
        'PLATFORM_ACCOUNT_BRIDGE_KEY',
      ].map((k) => [k, local[k] || process.env[k]]),
    );
    environment.installDemoEnvironment(
      environment.loadDemoEnvironment({
        ...process.env,
        ...accounts,
        PLATFORM_STOREFRONT_LOCAL_PORT: '4321',
      }),
    );
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
    config.apiOptions = {
      ...config.apiOptions,
      hostname: '127.0.0.1',
      port: 0,
    };
    config.schedulerOptions = {
      ...config.schedulerOptions,
      runTasksInWorkerOnly: true,
    };
    config.jobQueueOptions = { ...config.jobQueueOptions, activeQueues: [] };
    config.plugins = config.plugins.filter(
      (p) => (p.plugin ?? p).name !== 'EmailPlugin',
    );
    const app = await core.bootstrap(config);
    try {
      const connection = app.get(core.TransactionalConnection);
      const user = await connection.rawConnection
        .getRepository(core.User)
        .findOneOrFail({
          where: { identifier: 'boerne.manager@example.test' },
          relations: ['roles', 'roles.channels'],
        });
      const ctx = await app
        .get(core.RequestContextService)
        .create({ apiType: 'admin', user, channelOrToken: channel.token });
      const ops = app.get(
        rb('./src/plugins/market-operations/service.ts')
          .MarketOperationsService,
      );
      if (process.argv.includes('--notify')) {
        const projector = app.get(
          rb('./src/plugins/platform-notifications/inbox-projector.ts')
            .InboxProjector,
        );
        const events = (
          await db.query(
            `select "eventId" from platform_outbox_record where type='inbox.booth.invoice' and payload->>'resourceId' in (select id::text from market_invoice where "occurrenceId"=68)`,
          )
        ).rows;
        for (const event of events) await projector.consume(event.eventId);
        console.log('INVOICE_NOTIFICATIONS_PROJECTED', events.length);
      }
      if (process.argv.includes('--apply')) {
        const entities = rb(
          './src/plugins/farmers-market/entities/market.entities.ts',
        );
        const identity = rb('./src/plugins/platform-identity/entities.ts');
        const operations = rb('./src/plugins/market-operations/entities.ts');
        const repo = (e) => connection.rawConnection.getRepository(e);
        const service = (file, name) =>
          app.get(rb(`./src/plugins/farmers-market/services/${file}.ts`)[name]);
        const members = await repo(entities.MarketVendorMembership).findBy({
          marketId: 2,
          status: 'approved',
          consentState: 'VERIFIED',
        });
        assert.equal(members.length, 11);
        const layout = await repo(
          operations.MarketLayoutVersion,
        ).findOneByOrFail({
          id: 38,
          marketId: 2,
          layoutId: 22,
          status: 'PUBLISHED',
        });
        assert.equal(layout.occurrenceId, null);
        const spaces = (
          await repo(operations.MarketSpace).findBy({
            marketId: 2,
            layoutVersionId: 38,
          })
        )
          .filter(
            (s) =>
              /^A\d{2}$/.test(s.details.label) && s.details.feeMinor === 4500,
          )
          .sort((a, b) => a.details.label.localeCompare(b.details.label));
        assert.ok(spaces.length >= members.length);
        let occurrence = await repo(entities.MarketOccurrence).findOneBy({
          marketId: 2,
          generationKey: 'manual:boerne:2026-11-13',
        });
        if (!occurrence)
          occurrence = await service(
            'occurrence.service',
            'OccurrenceService',
          ).createManual(ctx, 2, '2026-11-13', 'manual:boerne:2026-11-13', {
            startsAt: '2026-11-13T15:00:00.000Z',
            endsAt: '2026-11-13T20:00:00.000Z',
            venue: 'Main Plaza, 100 N Main St, Boerne, TX (fictional)',
            pickupInstructions:
              'Collect your preorder from the vendor booth shown on the market map.',
          });
        if (!occurrence.preorderOverride)
          occurrence = await service(
            'occurrence.service',
            'OccurrenceService',
          ).revise(ctx, occurrence.id, occurrence.version, {
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            venue: occurrence.venue,
            pickupInstructions: occurrence.pickupInstructions,
            preorderOverride: {
              opensDaysBefore: 6,
              opensTime: '08:00',
              closesDaysBefore: 1,
              closesTime: '23:00',
            },
          });
        const occurrenceId = Number(occurrence.id);
        console.log('OCCURRENCE', occurrenceId);
        const command = (action, data, id, expectedRevision) =>
          ops.command(ctx, {
            action,
            data,
            ...(id ? { id: Number(id), expectedRevision } : {}),
          });
        let plan = await repo(operations.MarketOccurrencePlan).findOneBy({
          marketId: 2,
          occurrenceId,
        });
        if (!plan)
          plan = await command('SET_PLAN', {
            occurrenceId,
            layoutVersionId: 38,
            publicInstructions: occurrence.pickupInstructions,
          });
        assert.equal(plan.layoutVersionId, 38);
        const report = [];
        for (const [index, member] of members
          .sort((a, b) => Number(a.id) - Number(b.id))
          .entries()) {
          const vendor = await repo(identity.Vendor).findOneByOrFail({
            id: member.vendorId,
          });
          const vendorUser = await repo(core.User).findOneOrFail({
            where: { id: member.consentedBy },
            relations: ['roles', 'roles.channels'],
          });
          const vendorChannel = await repo(core.Channel).findOneByOrFail({
            id: vendor.primaryChannelId,
          });
          const vctx = await app.get(core.RequestContextService).create({
            apiType: 'admin',
            user: vendorUser,
            channelOrToken: vendorChannel,
          });
          const prior = await repo(entities.OccurrenceParticipation).findOneBy({
            membershipId: member.id,
            occurrenceId,
          });
          const participation =
            prior?.status === 'confirmed'
              ? prior
              : await service(
                  'participation.service',
                  'ParticipationService',
                ).configure(vctx, {
                  membershipId: member.id,
                  occurrenceId,
                  status: 'confirmed',
                  expectedVersion: prior?.version,
                  pickupInstructions: occurrence.pickupInstructions,
                });
          const directory = await repo(
            operations.MarketVendorDirectoryEntry,
          ).findOneByOrFail({
            marketId: 2,
            linkedVendorId: Number(vendor.id),
            linkState: 'LINK_VERIFIED',
            status: 'ACTIVE',
          });
          await command('APPROVE_OCCURRENCE', {
            occurrenceId,
            directoryId: Number(directory.id),
          });
          let assignment = await repo(
            operations.MarketOccurrenceSpaceAssignment,
          ).findOneBy({
            marketId: 2,
            occurrenceId,
            directoryId: Number(directory.id),
          });
          if (!assignment)
            assignment = await command('ASSIGN', {
              occurrenceId,
              directoryId: Number(directory.id),
              spaceId: Number(spaces[index].id),
              rentals: [],
            });
          const variants = await repo(core.ProductVariant)
            .createQueryBuilder('v')
            .innerJoin('v.product', 'p')
            .where('p."customFieldsPlatformownerid" = :owner', {
              owner: vendor.id,
            })
            .andWhere(
              'p.deletedAt IS NULL AND v.deletedAt IS NULL AND p.enabled=true AND v.enabled=true',
            )
            .getMany();
          let count = 0;
          for (const variant of variants) {
            let listing = await service(
              'market-listing.service',
              'MarketListingService',
            ).request(vctx, member.id, variant.id);
            if (listing.status !== 'approved')
              listing = await service(
                'market-listing.service',
                'MarketListingService',
              ).setStatus(ctx, listing.id, listing.version, 'approved');
            const existing = await repo(entities.OccurrenceOffering).findOneBy({
              participationId: participation.id,
              variantId: variant.id,
            });
            if (
              !existing?.enabled ||
              existing.windowProvenance.occurrenceVersion !== occurrence.version
            )
              await service(
                'occurrence-offering.service',
                'OccurrenceOfferingService',
              ).configure(
                vctx,
                {
                  participationId: participation.id,
                  listingId: listing.id,
                  variantId: variant.id,
                  expectedVersion: existing?.version,
                  enabled: true,
                  preorderEnabled: true,
                  salesCap: null,
                },
                true,
              );
            if (Number(variant.productId) === 331) {
              const taxonomy = app.get(
                rb('./src/plugins/marketplace-commerce/taxonomy/service.ts')
                  .ProductTaxonomyService,
              );
              if (!(await taxonomy.classification(vctx, 331)).primaryCategory)
                await taxonomy.assign(vctx, 331, 147);
            }
            await app
              .get(
                rb(
                  './src/plugins/marketplace-commerce/catalog-publishing.service.ts',
                ).CatalogPublishingService,
              )
              .publish(vctx, listing.id);
            count++;
          }
          const invoice = await repo(operations.MarketInvoice).findOneByOrFail({
            marketId: 2,
            assignmentId: Number(assignment.id),
          });
          if (invoice.status === 'DRAFT')
            await command(
              'ISSUE_INVOICE',
              { online: false, dueAt: occurrence.startsAt.toISOString() },
              invoice.id,
              invoice.revision,
            );
          report.push({
            vendor: vendor.name,
            booth: assignment.spaceSnapshot.label,
            products: count,
            invoiceId: invoice.id,
            amount: invoice.totalMinor / 100,
          });
          console.log('VENDOR', JSON.stringify(report.at(-1)));
        }
        plan = await repo(operations.MarketOccurrencePlan).findOneByOrFail({
          marketId: 2,
          occurrenceId,
        });
        if (plan.state !== 'PUBLISHED')
          await command(
            'PUBLISH_MAP',
            { published: true },
            plan.id,
            plan.revision,
          );
        const result = {
          database: 'vendure_demo_market_ops',
          occurrenceId,
          date: '2026-11-13',
          hours: '09:00-14:00 America/Chicago',
          layout: 'Bulverde Market Day',
          vendors: report,
        };
        fs.writeFileSync(
          path.join(root, 'docs/boerne-november-13-2026.json'),
          JSON.stringify(result, null, 2) + '\n',
        );
        console.log('COMPLETE', JSON.stringify(result));
      }
    } finally {
      await app.close();
      restore();
    }
  }
} finally {
  await db.end();
}
