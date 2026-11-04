throw new Error('Retired category seed: use the guarded taxonomy migration. This script must be migrated before reuse.');
/* Populate only the explicitly requested persistent local catalog through normal services. */
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
assert.equal(path.resolve(process.cwd()), root);
const backend = path.resolve(root, '../farmers-market-platform');
const rb = createRequire(path.join(backend, 'package.json'));
const { buildCatalog, categories } = require('./data/vendor-catalog.cjs');
const folder = path.join(root, '.runtime/vendor-catalog');
fs.mkdirSync(folder, { recursive: true });
rb('ts-node').register({
  project: path.join(backend, 'scripts/market-operations-demo/tsconfig.json'),
  transpileOnly: false,
});
rb('reflect-metadata');
const environment = rb('./scripts/market-operations-demo/environment.ts');
const configured = {};
for (const name of [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
]) {
  const file = path.join(root, name);
  if (fs.existsSync(file))
    Object.assign(configured, rb('dotenv').parse(fs.readFileSync(file)));
}
const settings = { ...configured, ...process.env };
const account = Object.fromEntries(
  [
    'PLATFORM_ACCOUNT_ORIGIN',
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'ADMIN_ORIGIN',
  ].map((k) => [k, settings[k]]),
);
account.PLATFORM_STOREFRONT_LOCAL_PORT = '4321';
assert.equal(
  account.PLATFORM_ACCOUNT_ORIGIN,
  'http://auth.platform.localhost:4321',
);
assert.equal(account.ADMIN_ORIGIN, 'http://localhost:4322');
assert.ok(
  account.PLATFORM_ACCOUNT_BRIDGE_KEY?.length >= 32,
  'Existing local account configuration required',
);
const env = environment.loadDemoEnvironment({ ...process.env, ...account });
assert.equal(env.DB_NAME, 'vendure_demo_market_ops');
assert.ok(['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST));
const action = process.argv[2] ?? '--plan';
assert.ok(['--plan', '--apply', '--verify', '--index'].includes(action));
async function audit(client) {
  const [target] = (
    await client.query(
      'SELECT current_database() AS database,host(inet_server_addr()) AS address',
    )
  ).rows;
  assert.equal(target.database, 'vendure_demo_market_ops');
  assert.ok(['127.0.0.1', '::1'].includes(target.address));
  const vendors = (
    await client.query(
      `SELECT v.*,(SELECT json_agg(json_build_object('role',tm.role,'userId',tm."principalId")) FROM platform_tenant_membership tm WHERE tm."vendorId"=v.id AND tm.status='active') AS members FROM platform_vendor v ORDER BY v.id`,
    )
  ).rows;
  assert.equal(vendors.length, 22);
  const products = (
    await client.query(
      `SELECT p.id,p.enabled,p."featuredAssetId",p."customFieldsPlatformownerid" AS "vendorId",p."customFieldsProductinformation" AS information,t.name,t.slug,t.description,(SELECT json_agg(json_build_object('id',v.id,'sku',v.sku,'sourceId',v."customFieldsCanonicalsourceid")) FROM product_variant v WHERE v."productId"=p.id AND v."deletedAt" IS NULL) AS variants FROM product p JOIN product_translation t ON t."baseId"=p.id AND t."languageCode"='en' WHERE p."deletedAt" IS NULL ORDER BY p.id`,
    )
  ).rows;
  return { target, vendors, products };
}
async function readAudit() {
  const client = new (rb('pg').Client)({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
  });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const a = await audit(client);
    await client.query('ROLLBACK');
    return a;
  } finally {
    await client.end();
  }
}
async function main() {
  const before = await readAudit();
  const vendorOption = process.argv.find((value) =>
    value.startsWith('--vendor='),
  );
  const definitions = buildCatalog(before).filter(
    (vendor) =>
      !vendorOption ||
      String(vendor.id) === vendorOption.slice('--vendor='.length),
  );
  assert.ok(definitions.length, 'Unknown vendor ID');
  const summary = definitions.map((v) => ({
    vendor: v.name,
    existing: v.products.filter((p) => p.existingId).length,
    added: v.products.filter((p) => !p.existingId).length,
    total: v.products.length,
  }));
  if (action === '--plan') {
    console.log(
      JSON.stringify(
        {
          database: env.DB_NAME,
          summary,
          total: definitions.reduce((n, v) => n + v.products.length, 0),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (action === '--verify') {
    assert.equal(before.products.length, 396);
    for (const v of definitions)
      for (const p of v.products) {
        const row = before.products.find((x) => x.id === p.existingId);
        assert(
          row?.enabled && row.featuredAssetId && row.information,
          `Incomplete product ${p.name}`,
        );
        assert.equal(row.name, p.name);
        assert(
          !/\bdemo\b|fixture|\bsample\b|taxable product/i.test(
            row.name + ' ' + row.description,
          ),
        );
      }
    console.log(
      'PASS: 22 vendors each have 18 enabled products, images and structured information.',
    );
    return;
  }
  const downloaded = JSON.parse(
    fs.readFileSync(path.join(folder, 'photos/manifest.json'), 'utf8'),
  );
  for (const v of definitions)
    for (const p of v.products) {
      const photo = downloaded.find((x) => x.key === p.image);
      assert(
        photo &&
          fs.statSync(path.join(folder, 'photos', photo.filename)).size > 1000,
      );
    }
  const backupPath = path.join(folder, 'before-' + Date.now() + '.json');
  fs.writeFileSync(backupPath, JSON.stringify(before, null, 2));
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
  assert.equal(config.dbConnectionOptions.database, env.DB_NAME);
  config.apiOptions = { ...config.apiOptions, hostname: '127.0.0.1', port: 0 };
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
    const db = app.get(core.TransactionalConnection);
    const { TRANSACTION_MANAGER_KEY } = rb(
      '@vendure/core/dist/common/constants',
    );
    const identity = rb('./src/plugins/platform-identity/entities.ts');
    const catalog = app.get(
      rb('./src/plugins/marketplace-commerce/vendor-catalog.service.ts')
        .VendorCatalogService,
    );
    const media = app.get(
      rb('./src/plugins/marketplace-commerce/vendor-categories.ts')
        .VendorCategoryService,
    );
    const ownership = app.get(
      rb('./src/plugins/platform-identity/protected-ownership.service.ts')
        .ProtectedOwnershipService,
    );
    const inventory = app.get(
      rb(
        './src/plugins/marketplace-commerce/inventory/inventory-coordinator.ts',
      ).InventoryCoordinator,
    );
    const contexts = app.get(core.RequestContextService),
      channels = app.get(core.ChannelService);
    const repo = (ctx, entity) => db.getRepository(ctx, entity);
    async function context(tx, user, channel) {
      const ctx = await contexts.create({
        apiType: 'admin',
        user,
        channelOrToken: channel,
        req: {
          protocol: 'http',
          get: (n) =>
            n.toLowerCase() === 'host' ? 'localhost:3000' : undefined,
          headers: { host: 'localhost:3000' },
        },
      });
      const manager = tx && Reflect.get(tx, TRANSACTION_MANAGER_KEY);
      if (manager)
        Object.defineProperty(ctx, TRANSACTION_MANAGER_KEY, {
          value: manager,
          enumerable: true,
        });
      return ctx;
    }
    const platformUser = await db.rawConnection
      .getRepository(core.User)
      .findOneOrFail({
        where: { identifier: env.SUPERADMIN_USERNAME },
        relations: ['roles', 'roles.channels'],
      });
    const platform = await context(null, platformUser);
    async function refreshSearch() {
      const ids = (
        await db.rawConnection.query(
          'SELECT v.id FROM product_variant v JOIN product p ON p.id=v."productId" WHERE v."deletedAt" IS NULL AND p."deletedAt" IS NULL AND p."customFieldsPlatformownerid"=ANY($1::int[])',
          [before.vendors.map((v) => v.id)],
        )
      ).map((v) => v.id);
      const { IndexerController } = rb(
        '@vendure/core/dist/plugin/default-search-plugin/indexer/indexer.controller',
      );
      await rb('rxjs').lastValueFrom(
        app.get(IndexerController).updateVariantsById(
          new core.Job({
            queueName: 'update-search-index',
            data: {
              type: 'update-variants-by-id',
              ctx: platform.serialize(),
              ids,
            },
          }),
        ),
      );
      console.log(
        `PASS: Refreshed search entries for ${ids.length} catalog variants.`,
      );
    }
    if (action === '--index') {
      await refreshSearch();
      return;
    }
    await media.scanner.health();
    const unchangedTables = [
      'farmers_market',
      'platform_vendor',
      'market_occurrence',
      'order',
      'order_line',
      'payment',
      'refund',
      'market_vendor_membership',
      'market_listing',
      'occurrence_participation',
      'occurrence_offering',
      'market_invoice',
      'market_payment',
    ];
    async function snapshot(ctx) {
      const result = {};
      for (const t of unchangedTables)
        result[t] = await repo(ctx, core.Product).query(
          `SELECT * FROM "${t}" ORDER BY id`,
        );
      return result;
    }
    const protectedSnapshot = await snapshot(platform);
    const assetMap = new Map();
    let processed = 0;
    for (const vendor of definitions) {
      await db.withTransaction(platform, async (tx) => {
        await repo(tx, identity.Vendor).query(
          "SELECT pg_advisory_xact_lock(hashtext('curated-vendor-catalog'))",
        );
        const owner = await repo(tx, core.User).findOneOrFail({
          where: { id: vendor.ownerId },
          relations: ['roles', 'roles.channels'],
        });
        const channel = await repo(tx, core.Channel).findOneOrFail({
          where: { id: vendor.channelId },
          relations: ['defaultTaxZone', 'defaultShippingZone'],
        });
        const ctx = await context(tx, owner, channel);
        let location = await repo(tx, core.StockLocation)
          .createQueryBuilder('l')
          .leftJoin('l.customFields.platformOwner', 'owner')
          .where('owner.id=:id', { id: vendor.id })
          .getOne();
        if (!location) {
          location = await app.get(core.StockLocationService).create(ctx, {
            name: `${vendor.name.replace(/ Demo$/, '')} inventory`,
            description: 'Stock available for local pickup.',
          });
          await ownership.assign(
            tx,
            'stockLocation',
            location.id,
            vendor.id,
            'Requested local catalog inventory',
          );
        }
        let marketplaceFacet = await repo(tx, core.Facet).findOneByOrFail({
          code: 'market-category',
        });
        await channels.assignToChannels(tx, core.Facet, marketplaceFacet.id, [
          channel.id,
        ]);
        const globalCategories = new Map();
        for (const code of [
          ...new Set(vendor.products.flatMap((p) => p.globalCategories)),
        ]) {
          let value = await repo(tx, core.FacetValue).findOneBy({
            facet: { id: marketplaceFacet.id },
            code,
          });
          if (!value)
            value = await app
              .get(core.FacetValueService)
              .create(tx, marketplaceFacet, {
                facetId: marketplaceFacet.id,
                code,
                translations: [
                  {
                    languageCode: core.LanguageCode.en,
                    name: categories[code],
                  },
                ],
              });
          await channels.assignToChannels(tx, core.FacetValue, value.id, [
            channel.id,
          ]);
          globalCategories.set(code, value.id);
        }
        const vendorCategories = new Map(
          (await media.list(ctx)).map((c) => [c.name, c.id]),
        );
        for (const name of new Set(vendor.products.map((p) => p.categoryName)))
          if (!vendorCategories.has(name))
            vendorCategories.set(name, (await media.save(ctx, { name })).id);
        for (const item of vendor.products) {
          const photo = downloaded.find((p) => p.key === item.image);
          let assetId = assetMap.get(photo.id);
          if (!assetId) {
            const existing = await repo(tx, core.Asset)
              .createQueryBuilder('a')
              .innerJoin('a.translations', 't', 't.name=:name', {
                name: photo.filename,
              })
              .getOne();
            if (existing) assetId = existing.id;
            else {
              const bytes = fs.readFileSync(
                path.join(folder, 'photos', photo.filename),
              );
              const uploaded = await media.upload(
                ctx,
                Promise.resolve({
                  filename: photo.filename,
                  mimetype: 'image/jpeg',
                  encoding: '7bit',
                  createReadStream: () => Readable.from(bytes),
                }),
              );
              assetId = uploaded.id;
            }
            assetMap.set(photo.id, assetId);
          }
          await channels.assignToChannels(tx, core.Asset, assetId, [
            channel.id,
          ]);
          const slug =
            item.slug ??
            `${vendor.slug.replace(/-demo$/, '')}-${item.name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')}`;
          if (
            item.name === 'Baby Spinach Bag' &&
            item.existingVariants?.length > 1
          ) {
            item.productInformation.custom.find(
              (entry) => entry.title === 'Package size',
            ).content = 'Choose a 6 oz bag or a 12 oz family bag.';
          }
          const input = {
            name: item.name,
            slug,
            description: `${item.description} Includes ${item.unit}.`,
            enabled: true,
            categoryIds: [vendorCategories.get(item.categoryName)],
            assetIds: [assetId],
            productInformation: JSON.stringify(item.productInformation),
          };
          let productId = item.existingId;
          if (productId) await catalog.updateProduct(ctx, productId, input);
          else productId = (await catalog.createProduct(ctx, input)).id;
          const product = await repo(tx, core.Product).findOneOrFail({
            where: { id: productId },
            relations: ['facetValues'],
          });
          const ownedFacetIds = new Set(
            (
              await repo(tx, core.FacetValue).find({
                where: { facet: { id: marketplaceFacet.id } },
              })
            ).map((f) => String(f.id)),
          );
          const retained = product.facetValues
            .filter((f) => !ownedFacetIds.has(String(f.id)))
            .map((f) => f.id);
          await app.get(core.ProductService).update(ctx, {
            id: productId,
            facetValueIds: [
              ...new Set([
                ...retained,
                ...item.globalCategories.map((c) => globalCategories.get(c)),
              ]),
            ],
          });
          let variants = await repo(tx, core.ProductVariant).find({
            where: { productId },
            order: { id: 'ASC' },
          });
          const skuPrefix =
            { 26: 'WILLOW-GRAIN', 44: 'CEDAR-CREEK' }[vendor.id] ??
            vendor.slug.replace(/-demo$/, '').toUpperCase();
          const skuBase = `${skuPrefix}-${String(vendor.products.indexOf(item) + 1).padStart(3, '0')}`;
          if (!variants.length) {
            const created = await catalog.createVariant(ctx, {
              productId,
              name: `${item.name} (${item.unit})`,
              sku: skuBase,
              price: item.price,
            });
            variants = [
              await repo(tx, core.ProductVariant).findOneByOrFail({
                id: created.id,
              }),
            ];
          }
          for (const [index, variant] of variants.entries()) {
            const familyBag = item.name === 'Baby Spinach Bag' && index > 0;
            await catalog.updateVariant(ctx, variant.id, {
              name: `${item.name} (${familyBag ? '12 oz family bag' : item.unit})`,
              sku: variants.length > 1 ? `${skuBase}-${index + 1}` : skuBase,
              enabled: true,
            });
            // Keep genuine existing prices and tax policies. Replace placeholder-item prices.
            if (
              !item.existingId ||
              item.previousName !== item.name ||
              familyBag
            )
              await catalog.updatePrice(
                ctx,
                variant.id,
                familyBag ? 1200 : item.price,
              );
            if (!variant.customFields.canonicalSourceId) {
              const source = await repo(tx, core.ProductVariant).findOneOrFail({
                where: { id: variant.id },
                relations: ['customFields.canonicalSource'],
              });
              if (!source.customFields.canonicalSource)
                await ownership.setCanonicalSource(
                  tx,
                  variant.id,
                  location.id,
                  'Requested local catalog inventory',
                );
            }
            const source = (
              await repo(tx, core.ProductVariant).findOneOrFail({
                where: { id: variant.id },
                relations: ['customFields.canonicalSource'],
              })
            ).customFields.canonicalSource;
            assert(source);
            let level = await repo(tx, core.StockLevel).findOneBy({
              productVariantId: variant.id,
              stockLocationId: source.id,
            });
            if (!level) {
              level = await repo(tx, core.StockLevel).save(
                new core.StockLevel({
                  productVariantId: variant.id,
                  stockLocationId: source.id,
                  stockOnHand: 0,
                  stockAllocated: 0,
                }),
              );
            }
            if (!item.existingId)
              await inventory.restockPhysical(ctx, {
                operationKey: randomUUID(),
                variantId: variant.id,
                quantity: item.stock,
              });
          }
          processed++;
        }
        const ownCategories = await media.list(ctx);
        assert(
          vendor.products.every((p) =>
            ownCategories.some(
              (c) => c.name === p.categoryName && c.productIds.length > 0,
            ),
          ),
        );
      });
      console.log(`Ready: ${vendor.name}, 18 products (${processed}/396).`);
    }
    assert.deepEqual(
      await snapshot(platform),
      protectedSnapshot,
      'Market schedules, purchases and billing must remain unchanged',
    );
    const after = await readAudit();
    assert.equal(after.products.length, 396);
    for (const vendor of definitions) {
      const products = after.products.filter((p) => p.vendorId === vendor.id);
      assert.equal(products.length, 18);
      for (const p of products) {
        assert(p.enabled && p.featuredAssetId && p.information);
        assert(
          !/\bdemo\b|fixture|\bsample\b|taxable product/i.test(
            p.name + ' ' + p.description,
          ),
        );
      }
    }
    fs.writeFileSync(
      path.join(
        folder,
        vendorOption
          ? `vendor-${definitions[0].id}-report.json`
          : 'report.json',
      ),
      JSON.stringify(
        {
          database: env.DB_NAME,
          completedAt: new Date().toISOString(),
          backup: backupPath,
          summary,
          products: after.products,
          photos: downloaded,
        },
        null,
        2,
      ),
    );
    if (process.argv.includes('--refresh-index')) await refreshSearch();
    console.log(
      'PASS: 396 products across 22 vendors. Existing schedules, orders and billing preserved. Report: .runtime/vendor-catalog/report.json',
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
