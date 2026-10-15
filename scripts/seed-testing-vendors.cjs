/** Add the requested businesses through normal services, only in the local demo DB. */
/* eslint-disable @typescript-eslint/no-require-imports -- Vendure's decorated backend uses its CommonJS ts-node loader. */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve, dirname, join } = require('node:path');
const { mkdirSync, writeFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { request } = require('node:http');
const {
  categories,
  vendors: allVendors,
} = require('./data/testing-vendors.cjs');

const root = resolve(__dirname, '..');
assert.equal(
  resolve(process.cwd()),
  root,
  'Run from the frontend project folder.',
);
const backend = resolve(root, '../farmers-market-platform');
const rb = createRequire(join(backend, 'package.json'));
rb('ts-node').register({
  project: join(backend, 'scripts/market-operations-demo/tsconfig.json'),
  transpileOnly: false,
});
rb('reflect-metadata');
const environment = rb('./scripts/market-operations-demo/environment.ts');
const env = environment.loadDemoEnvironment();
const expectedDatabase = 'vendure_demo_market_ops';
assert.equal(env.DB_NAME, expectedDatabase);
const action = process.argv[2] ?? '--seed';
const vendorOption = process.argv.find((arg) => arg.startsWith('--vendor='));
const vendors = vendorOption
  ? allVendors.filter(
      (vendor) => vendor.slug === vendorOption.slice('--vendor='.length),
    )
  : allVendors;
assert.ok(vendors.length, 'Unknown vendor slug.');
assert.ok(
  ['--seed', '--dry-run', '--verify'].includes(action),
  'Unknown option.',
);

const keys = vendors.map((vendor) => `requested-vendors:${vendor.slug}`);
const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const skuFor = (vendor, index) =>
  `TEST-${vendor.slug.toUpperCase()}-${index + 1}`;
const productCount = vendors.reduce(
  (total, vendor) => total + vendor.products.length,
  0,
);

function connectionOptions() {
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: expectedDatabase,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    connectionTimeoutMillis: 10000,
  };
}

async function confirmConnection(query) {
  const [connection] = await query(
    'SELECT current_database() AS database, host(inet_server_addr()) AS address',
  );
  assert.equal(connection.database, expectedDatabase);
  assert.ok(['127.0.0.1', '::1'].includes(connection.address));
}

// Use only SELECT statements for preflight and independent verification.
async function inspect(query, complete = false) {
  await confirmConnection(query);
  const [market] = await query(
    'SELECT id, name, "channelId" FROM farmers_market WHERE "provisioningKey"=$1',
    ['demo-market-operations'],
  );
  assert.ok(market, 'The persistent demo baseline must already exist.');
  const occurrences = await query(
    'SELECT id, "startsAt", "endsAt" FROM market_occurrence WHERE "marketId"=$1 AND status=$2 AND "startsAt">now() ORDER BY "startsAt"',
    [market.id, 'scheduled'],
  );
  const existing = await query(
    'SELECT id, name, slug FROM platform_vendor WHERE "provisioningKey"=ANY($1::text[]) ORDER BY id',
    [keys],
  );
  if (!complete)
    return {
      database: expectedDatabase,
      market,
      occurrences,
      existing,
      requestedVendors: vendors.length,
      requestedProducts: productCount,
      categories: Object.values(categories),
    };

  assert.equal(
    existing.length,
    vendors.length,
    'All requested vendors must exist.',
  );
  const rows = await query(
    `SELECT v.id, v.name, v.slug, v."primaryChannelId" AS "channelId",
    a."emailAddress" AS email, d.id AS "directoryId", d.contact, s.hostname,
    (SELECT count(*)::int FROM product p WHERE p."customFieldsPlatformownerid"=v.id AND p."deletedAt" IS NULL) AS products,
    (SELECT count(*)::int FROM product_variant pv JOIN product p ON p.id=pv."productId" WHERE p."customFieldsPlatformownerid"=v.id AND pv."deletedAt" IS NULL) AS variants
    FROM platform_vendor v JOIN platform_tenant_membership tm ON tm."vendorId"=v.id AND tm.status='active' AND tm.role='owner'
    JOIN administrator a ON a."userId"=tm."principalId" AND a."deletedAt" IS NULL
    JOIN market_vendor_directory_entry d ON d."linkedVendorId"=v.id AND d."marketId"=$2
    JOIN market_vendor_membership m ON m."vendorId"=v.id AND m."marketId"=$2 AND m.status='approved'
    JOIN platform_storefront s ON s."vendorId"=v.id AND s."channelId"=v."primaryChannelId" AND s.status='active'
    WHERE v."provisioningKey"=ANY($1::text[]) ORDER BY v.id`,
    [keys, market.id],
  );
  assert.equal(
    rows.length,
    vendors.length,
    'Each vendor needs an owner, directory entry, market membership and storefront.',
  );
  const skuList = vendors.flatMap((vendor) =>
    vendor.products.map((_, index) => skuFor(vendor, index)),
  );
  const products = await query(
    `SELECT pv.id, pv.sku, pv.enabled, p.enabled AS "productEnabled", p."customFieldsPlatformownerid" AS "vendorId",
    cp.price, cp."currencyCode", mp.price AS "marketPrice", sl."stockOnHand", sl."stockAllocated", loc."customFieldsPlatformownerid" AS "stockOwnerId",
    (SELECT count(*)::int FROM product_facet_values_facet_value f WHERE f."productId"=p.id) AS categories,
    (SELECT count(*)::int FROM market_listing l JOIN market_vendor_membership m ON m.id=l."membershipId" WHERE l."variantId"=pv.id AND m."marketId"=$2 AND l.status='approved') AS listings
    FROM product_variant pv JOIN product p ON p.id=pv."productId"
    JOIN platform_vendor v ON v.id=p."customFieldsPlatformownerid"
    JOIN product_variant_price cp ON cp."variantId"=pv.id AND cp."channelId"=v."primaryChannelId"
    JOIN product_variant_price mp ON mp."variantId"=pv.id AND mp."channelId"=$3
    JOIN stock_location loc ON loc.id=pv."customFieldsCanonicalsourceid"
    JOIN stock_level sl ON sl."productVariantId"=pv.id AND sl."stockLocationId"=loc.id
    WHERE pv.sku=ANY($1::text[]) ORDER BY pv.id`,
    [skuList, market.id, market.channelId],
  );
  assert.equal(
    products.length,
    productCount,
    'All variants need prices and canonical inventory.',
  );
  for (const product of products) {
    assert.ok(product.enabled && product.productEnabled);
    assert.equal(
      product.price,
      product.marketPrice,
      'Market pricing must match vendor pricing.',
    );
    assert.equal(product.currencyCode, 'USD');
    assert.equal(product.vendorId, product.stockOwnerId);
    assert.ok(
      product.stockOnHand >= product.stockAllocated &&
        product.stockAllocated >= 0,
    );
    assert.ok(product.categories > 0);
    assert.equal(product.listings, 1);
  }
  for (const vendor of vendors) {
    const row = rows.find((record) => record.slug === vendor.slug);
    assert.equal(row.name, vendor.name);
    assert.equal(row.email, vendor.email);
    assert.equal(
      row.contact.firstName + ' ' + row.contact.lastName,
      vendor.owner,
    );
    assert.equal(row.contact.branding.primary.hex, vendor.primary[1]);
    assert.equal(row.contact.branding.secondary.hex, vendor.secondary[1]);
    assert.deepEqual(row.contact.categories, vendor.categories);
    for (const [index, item] of vendor.products.entries()) {
      const seeded = products.find(
        (record) => record.sku === skuFor(vendor, index),
      );
      assert.equal(seeded.vendorId, row.id);
      assert.ok(seeded.categories >= item.categories.length);
    }
  }
  const categoryRows = await query(
    `SELECT fv.code, fvt.name, count(DISTINCT p."customFieldsPlatformownerid")::int AS vendors,
    count(DISTINCT p.id)::int AS products FROM facet_value fv JOIN facet f ON f.id=fv."facetId" AND f.code='market-category'
    JOIN facet_value_translation fvt ON fvt."baseId"=fv.id AND fvt."languageCode"='en'
    JOIN product_facet_values_facet_value pf ON pf."facetValueId"=fv.id JOIN product p ON p.id=pf."productId"
    JOIN platform_vendor v ON v.id=p."customFieldsPlatformownerid" AND v."provisioningKey"=ANY($1::text[])
    GROUP BY fv.id, fv.code, fvt.name ORDER BY fvt.name`,
    [keys],
  );
  assert.equal(
    categoryRows.length,
    new Set(vendors.flatMap((vendor) => vendor.categories)).size,
  );
  if (!vendorOption)
    assert.ok(
      categoryRows.filter((category) => category.vendors > 1).length >= 8,
      'Categories must overlap across vendors.',
    );
  const offerings = await query(
    `SELECT o.id AS "occurrenceId", count(DISTINCT offer.id)::int AS offerings,
    count(DISTINCT m."vendorId")::int AS vendors FROM market_occurrence o
    JOIN occurrence_participation p ON p."occurrenceId"=o.id AND p.status='confirmed'
    JOIN market_vendor_membership m ON m.id=p."membershipId"
    JOIN platform_vendor v ON v.id=m."vendorId" AND v."provisioningKey"=ANY($1::text[])
    JOIN occurrence_offering offer ON offer."participationId"=p.id AND offer.enabled AND offer."preorderEnabled"
    WHERE o.id=ANY($2::int[]) GROUP BY o.id ORDER BY o.id`,
    [keys, occurrences.map((o) => o.id)],
  );
  assert.equal(offerings.length, occurrences.length);
  for (const offering of offerings) {
    assert.equal(offering.offerings, productCount);
    assert.equal(offering.vendors, vendors.length);
  }
  return {
    status: 'PASS',
    database: expectedDatabase,
    market: market.name,
    vendors: rows,
    productCount,
    variantCount: products.length,
    categories: categoryRows,
    offerings,
  };
}

async function readDatabase(complete = false) {
  const db = new (rb('pg').Client)(connectionOptions());
  await db.connect();
  try {
    await db.query('BEGIN READ ONLY');
    const result = await inspect(
      async (sql, parameters) => (await db.query(sql, parameters)).rows,
      complete,
    );
    await db.query('ROLLBACK');
    return result;
  } finally {
    await db.end();
  }
}

async function verifyAccess(app, records, db) {
  const port = app.getHttpServer().address().port;
  async function json(path, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Apollo-Require-Preflight': 'true',
            ...headers,
          },
          timeout: 10000,
        },
        (res) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            text += chunk;
          });
          res.on('error', reject);
          res.on('end', () => {
            try {
              assert.equal(res.statusCode, 200, text);
              resolve({ data: JSON.parse(text), headers: res.headers });
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () =>
        req.destroy(new Error('Local API verification timed out')),
      );
      req.end(body ? JSON.stringify(body) : undefined);
    });
  }
  const checks = [];
  for (const vendor of records) {
    const [{ token }] = await db.rawConnection.query(
      'SELECT token FROM channel WHERE id=$1',
      [vendor.channelId],
    );
    const headers = { 'vendure-token': token };
    const login = await json(
      '/admin-api',
      {
        query: `mutation($username:String!,$password:String!) {
      login(username:$username,password:$password) { __typename ... on CurrentUser { id } }
    }`,
        variables: {
          username: vendor.email,
          password: environment.demoPassword,
        },
      },
      headers,
    );
    assert.ok(!login.data.errors, JSON.stringify(login.data.errors));
    assert.equal(
      login.data.data.login.__typename,
      'CurrentUser',
      `Owner login failed: ${vendor.name}`,
    );
    const sessionToken = login.headers['vendure-auth-token'];
    assert.ok(sessionToken, 'Expected a native bearer session token.');
    const authenticated = {
      ...headers,
      Authorization: `Bearer ${sessionToken}`,
    };
    try {
      const admin = await json(
        '/admin-api',
        {
          query: `query {
        ownVendorIdentity { id name }
        ownVendorCatalog(options:{take:20}) { totalItems items { id } }
        ownOperationalInventory(take:20) { totalItems items { sku stockOnHand stockAllocated } }
      }`,
        },
        authenticated,
      );
      assert.ok(!admin.data.errors, JSON.stringify(admin.data.errors));
      assert.equal(admin.data.data.ownVendorIdentity.id, String(vendor.id));
      assert.equal(
        admin.data.data.ownVendorCatalog.totalItems,
        vendor.products,
      );
      assert.equal(
        admin.data.data.ownOperationalInventory.totalItems,
        vendor.variants,
      );
    } finally {
      await json(
        '/admin-api',
        { query: 'mutation { logout { success } }' },
        authenticated,
      );
    }
    const publicHeaders = { ...headers, Host: `${vendor.hostname}:4321` };
    const resolved = await json(
      '/storefront-context/resolve',
      undefined,
      publicHeaders,
    );
    assert.equal(resolved.data.subject.id, String(vendor.id));
    const shop = await json(
      '/shop-api',
      {
        query:
          'query { products(options:{take:100}) { totalItems items { id name } } }',
      },
      publicHeaders,
    );
    assert.ok(!shop.data.errors, JSON.stringify(shop.data.errors));
    assert.equal(shop.data.data.products.totalItems, vendor.products);
    checks.push({
      vendor: vendor.name,
      ownerLogin: 'PASS',
      adminCatalog: 'PASS',
      inventory: 'PASS',
      storefront: 'PASS',
    });
  }
  return checks;
}

async function main() {
  if (action === '--verify') {
    const result = await readDatabase(true);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const preflight = await readDatabase();
  if (action === '--dry-run') {
    console.log(JSON.stringify({ ...preflight, writes: 0 }, null, 2));
    return;
  }
  assert.ok(
    preflight.occurrences.length,
    'No future demo dates. Seed will not rewrite existing schedules.',
  );
  environment.installDemoEnvironment(env);
  process.env.ASSET_UPLOAD_DIR = join(root, '.runtime/testing-vendors/assets');
  const restoreNetwork = rb(
    './scripts/market-operations-demo/network.ts',
  ).blockDemoExternalNetwork();
  const core = rb('@vendure/core');
  const permissions = rb('./src/plugins/platform-identity/permissions.ts');
  const identityEntities = rb('./src/plugins/platform-identity/entities.ts');
  const marketEntities = rb(
    './src/plugins/farmers-market/entities/market.entities.ts',
  );
  const operationsEntities = rb('./src/plugins/market-operations/entities.ts');
  const { TRANSACTION_MANAGER_KEY } = rb('@vendure/core/dist/common/constants');
  const { config } = rb('./src/vendure-config.ts');
  config.logger = new core.DefaultLogger({ level: core.LogLevel.Error });
  config.dbConnectionOptions = {
    ...config.dbConnectionOptions,
    synchronize: false,
    migrationsRun: false,
  };
  assert.equal(config.dbConnectionOptions.database, expectedDatabase);
  assert.ok(
    ['localhost', '127.0.0.1', '::1'].includes(config.dbConnectionOptions.host),
  );
  config.apiOptions = {
    ...config.apiOptions,
    hostname: '127.0.0.1',
    port: 0,
    cors: { origin: 'http://localhost:4322', credentials: true },
    csrfPrevention: true,
  };
  config.schedulerOptions = {
    ...config.schedulerOptions,
    runTasksInWorkerOnly: true,
  };
  config.jobQueueOptions = { ...config.jobQueueOptions, activeQueues: [] };
  // No email plugin output or mail transport is needed to create native Administrators.
  config.plugins = config.plugins.filter(
    (plugin) => (plugin.plugin ?? plugin).name !== 'EmailPlugin',
  );
  console.log(
    `Adding ${vendors.length} vendors and ${productCount} products to local ${expectedDatabase}.`,
  );
  const app = await core.bootstrap(config);
  try {
    const db = app.get(core.TransactionalConnection);
    await confirmConnection((sql, params) =>
      db.rawConnection.query(sql, params),
    );
    const service = (path, name) => app.get(rb(path)[name]);
    const provision = service(
      './src/plugins/platform-identity/vendor-provisioning.service.ts',
      'VendorProvisioningService',
    );
    const identity = service(
      './src/plugins/platform-identity/identity.service.ts',
      'IdentityService',
    );
    const ownership = service(
      './src/plugins/platform-identity/protected-ownership.service.ts',
      'ProtectedOwnershipService',
    );
    const catalog = service(
      './src/plugins/marketplace-commerce/vendor-catalog.service.ts',
      'VendorCatalogService',
    );
    const publishing = service(
      './src/plugins/marketplace-commerce/catalog-publishing.service.ts',
      'CatalogPublishingService',
    );
    const inventory = service(
      './src/plugins/marketplace-commerce/inventory/inventory-coordinator.ts',
      'InventoryCoordinator',
    );
    const memberships = service(
      './src/plugins/farmers-market/services/market-vendor-membership.service.ts',
      'MarketVendorMembershipService',
    );
    const participation = service(
      './src/plugins/farmers-market/services/participation.service.ts',
      'ParticipationService',
    );
    const listingService = service(
      './src/plugins/farmers-market/services/market-listing.service.ts',
      'MarketListingService',
    );
    const offeringService = service(
      './src/plugins/farmers-market/services/occurrence-offering.service.ts',
      'OccurrenceOfferingService',
    );
    const operations = service(
      './src/plugins/market-operations/service.ts',
      'MarketOperationsService',
    );
    const channels = app.get(core.ChannelService);
    const contexts = app.get(core.RequestContextService);
    const repo = (ctx, entity) => db.getRepository(ctx, entity);
    async function context(ctx, user, channel) {
      const result = await contexts.create({
        apiType: 'admin',
        user,
        channelOrToken: channel,
      });
      const manager = ctx && Reflect.get(ctx, TRANSACTION_MANAGER_KEY);
      if (manager)
        Object.defineProperty(result, TRANSACTION_MANAGER_KEY, {
          value: manager,
          enumerable: true,
        });
      return result;
    }
    const platformUser = await db.rawConnection
      .getRepository(core.User)
      .findOneOrFail({
        where: { identifier: env.SUPERADMIN_USERNAME },
        relations: ['roles', 'roles.channels'],
      });
    const platform = await context(null, platformUser);
    const untouchedTables = [
      'market_layout',
      'market_layout_version',
      'market_space',
      'market_occurrence_plan',
      'market_occurrence_space_assignment',
      'market_invoice',
      'market_payment',
      'market_application_template',
      'market_application_template_version',
      'market_application_submission',
      'market_occurrence',
    ];
    async function snapshot(ctx) {
      const result = {};
      for (const table of untouchedTables)
        result[table] = await repo(ctx, identityEntities.Vendor).query(
          `SELECT * FROM ${table} ORDER BY id`,
        );
      return result;
    }
    let created = 0;
    const result = await db.withTransaction(platform, async (tx) => {
      await repo(tx, identityEntities.Vendor).query(
        "SELECT pg_advisory_xact_lock(hashtext('requested-testing-vendors'))",
      );
      const before = await snapshot(tx);
      const market = await repo(tx, marketEntities.Market).findOneByOrFail({
        provisioningKey: 'demo-market-operations',
      });
      const manager = await repo(tx, core.User).findOneOrFail({
        where: { identifier: environment.managerEmail },
        relations: ['roles', 'roles.channels'],
      });
      const marketChannel = await repo(tx, core.Channel).findOneOrFail({
        where: { id: market.channelId },
        relations: ['defaultTaxZone', 'defaultShippingZone'],
      });
      const marketCtx = await context(tx, manager, marketChannel);
      const occurrences = preflight.occurrences;
      let facet = await repo(tx, core.Facet).findOneBy({
        code: 'market-category',
      });
      if (!facet)
        facet = await app.get(core.FacetService).create(tx, {
          code: 'market-category',
          isPrivate: false,
          translations: [
            { languageCode: core.LanguageCode.en, name: 'Category' },
          ],
        });
      const facetValues = new Map();
      for (const [code, name] of Object.entries(categories)) {
        let value = await repo(tx, core.FacetValue).findOneBy({
          facet: { id: facet.id },
          code,
        });
        if (!value)
          value = await app.get(core.FacetValueService).create(tx, facet, {
            facetId: facet.id,
            code,
            translations: [{ languageCode: core.LanguageCode.en, name }],
          });
        facetValues.set(code, value);
      }

      for (const input of vendors) {
        const existed = await repo(tx, identityEntities.Vendor).exists({
          where: { provisioningKey: `requested-vendors:${input.slug}` },
        });
        const vendor = await provision.provision(tx, {
          provisioningKey: `requested-vendors:${input.slug}`,
          name: input.name,
          slug: input.slug,
        });
        if (!existed) created++;
        const channel = await repo(tx, core.Channel).findOneOrFail({
          where: { id: vendor.primaryChannelId },
          relations: ['defaultTaxZone', 'defaultShippingZone'],
        });
        // Native RoleService caches grants per context. Reload after each new Channel.
        const currentPlatformUser = await repo(tx, core.User).findOneOrFail({
          where: { id: platformUser.id },
          relations: ['roles', 'roles.channels'],
        });
        const trusted = await context(tx, currentPlatformUser);
        const [firstName, ...lastNames] = input.owner.split(' ');
        const ownerPermissions = [
          ...permissions.marketVendorOwnerPermissions,
          permissions.manageOwnCatalog.Permission,
          permissions.manageCatalogPublication.Permission,
          permissions.manageOwnInventory.Permission,
          permissions.manageOwnCoupon.Permission,
          permissions.readOwnCRM.Permission,
          permissions.readOwnVendorFinance.Permission,
        ];
        let role = await repo(tx, core.Role).findOneBy({
          code: `testing-vendor:${input.slug}`,
        });
        if (!role)
          role = await app.get(core.RoleService).create(trusted, {
            code: `testing-vendor:${input.slug}`,
            description: `Owner of ${input.name}`,
            channelIds: [channel.id],
            permissions: ownerPermissions,
          });
        let owner = await repo(tx, core.User).findOne({
          where: { identifier: input.email },
          relations: ['roles', 'roles.channels'],
        });
        if (!owner) {
          const admin = await app
            .get(core.AdministratorService)
            .create(trusted, {
              firstName,
              lastName: lastNames.join(' '),
              emailAddress: input.email,
              password: environment.demoPassword,
              roleIds: [role.id],
            });
          owner = await repo(tx, core.User).findOneOrFail({
            where: { id: admin.user.id },
            relations: ['roles', 'roles.channels'],
          });
        }
        if (
          !(await repo(tx, identityEntities.TenantMembership).exists({
            where: { principalId: owner.id, vendorId: vendor.id },
          }))
        )
          await identity.setMembership(trusted, {
            vendorId: vendor.id,
            principalId: owner.id,
            role: 'owner',
            status: 'active',
          });
        const ownerCtx = await context(tx, owner, channel);
        let directory = await repo(
          tx,
          operationsEntities.MarketVendorDirectoryEntry,
        ).findOneBy({
          marketId: Number(market.id),
          linkedVendorId: Number(vendor.id),
        });
        if (!directory)
          directory = await operations.command(marketCtx, {
            action: 'SAVE_DIRECTORY',
            data: {
              linkedVendorId: Number(vendor.id),
              confirmLink: true,
              contact: {
                businessName: input.name,
                firstName,
                lastName: lastNames.join(' '),
                email: input.email,
                phone: input.phone,
                address: input.address,
                description: input.description,
                category: input.categories
                  .map((code) => categories[code])
                  .join(', '),
                categories: input.categories,
                branding: {
                  primary: { name: input.primary[0], hex: input.primary[1] },
                  secondary: {
                    name: input.secondary[0],
                    hex: input.secondary[1],
                  },
                  ...(input.accent
                    ? {
                        accent: { name: input.accent[0], hex: input.accent[1] },
                      }
                    : {}),
                },
                website: `http://${input.slug}.localhost:4321`,
                seedKey: `requested-vendors:${input.slug}`,
              },
              managerNotes: `Fictional testing contact. Brand: ${input.primary[0]} ${input.primary[1]} / ${input.secondary[0]} ${input.secondary[1]}${input.accent ? `; accent ${input.accent[0]} ${input.accent[1]}` : ''}.`,
            },
          });
        let storefront = await repo(tx, identityEntities.Storefront).findOneBy({
          key: `testing-${input.slug}`,
        });
        if (!storefront) {
          const record = await identity.provisionStorefront(
            trusted,
            vendor.id,
            channel.id,
            {
              key: `testing-${input.slug}`,
              routeKey: input.slug,
              displayName: input.name,
              status: 'active',
            },
          );
          storefront = await repo(
            tx,
            identityEntities.Storefront,
          ).findOneByOrFail({ id: record.id });
          await repo(tx, identityEntities.Storefront).query(
            'UPDATE platform_storefront SET hostname=$1 WHERE id=$2 AND "vendorId"=$3 AND hostname IS NULL',
            [`${input.slug}.localhost`, storefront.id, vendor.id],
          );
        }
        let membership = await repo(
          tx,
          marketEntities.MarketVendorMembership,
        ).findOneBy({ marketId: market.id, vendorId: vendor.id });
        if (!membership)
          membership = await memberships.set(
            marketCtx,
            market.id,
            vendor.id,
            'approved',
          );
        assert.equal(
          membership.status,
          'approved',
          'Existing membership is not approved; do not overwrite manual decisions.',
        );
        let location = await repo(tx, core.StockLocation).findOneBy({
          name: `Testing stock: ${input.slug}`,
        });
        if (!location) {
          location = await app.get(core.StockLocationService).create(ownerCtx, {
            name: `Testing stock: ${input.slug}`,
            description: `${input.name} market pickup stock`,
          });
          await ownership.assign(
            trusted,
            'stockLocation',
            location.id,
            vendor.id,
            'Requested local testing vendor inventory',
          );
        }
        await channels.assignToChannels(tx, core.Facet, facet.id, [channel.id]);
        for (const value of facetValues.values())
          await channels.assignToChannels(tx, core.FacetValue, value.id, [
            channel.id,
          ]);
        const dates = [];
        for (const occurrence of occurrences) {
          let attendance = await repo(
            tx,
            marketEntities.OccurrenceParticipation,
          ).findOneBy({
            membershipId: membership.id,
            occurrenceId: occurrence.id,
          });
          if (!attendance)
            attendance = await participation.configure(ownerCtx, {
              membershipId: membership.id,
              occurrenceId: occurrence.id,
              status: 'confirmed',
              pickupInstructions: `Collect from the ${input.name} booth during market hours.`,
            });
          dates.push(attendance);
          if (
            !(await repo(
              tx,
              operationsEntities.MarketOccurrenceApproval,
            ).exists({
              where: {
                occurrenceId: Number(occurrence.id),
                directoryId: Number(directory.id),
              },
            }))
          )
            await operations.command(marketCtx, {
              action: 'APPROVE_OCCURRENCE',
              data: {
                occurrenceId: Number(occurrence.id),
                directoryId: Number(directory.id),
              },
            });
        }
        for (const [index, item] of input.products.entries()) {
          const sku = skuFor(input, index);
          let variant = await repo(tx, core.ProductVariant).findOneBy({ sku });
          if (!variant) {
            const product = await catalog.createProduct(ownerCtx, {
              name: item.name,
              slug: `${input.slug}-${slugify(item.name)}`,
              description: `${item.description} Package: ${item.unit}.`,
              enabled: true,
            });
            const createdVariant = await catalog.createVariant(ownerCtx, {
              productId: product.id,
              name: `${item.name} (${item.unit})`,
              sku,
              price: item.price,
            });
            variant = await repo(tx, core.ProductVariant).findOneByOrFail({
              id: createdVariant.id,
            });
            await app.get(core.ProductService).update(ownerCtx, {
              id: product.id,
              facetValueIds: item.categories.map(
                (code) => facetValues.get(code).id,
              ),
            });
            await ownership.setCanonicalSource(
              trusted,
              variant.id,
              location.id,
              'Requested local testing vendor inventory',
            );
            if (
              !(await repo(tx, core.StockLevel).exists({
                where: {
                  productVariantId: variant.id,
                  stockLocationId: location.id,
                },
              }))
            )
              await repo(tx, core.StockLevel).save(
                new core.StockLevel({
                  productVariantId: variant.id,
                  stockLocationId: location.id,
                  stockOnHand: 0,
                  stockAllocated: 0,
                }),
              );
            await inventory.restockPhysical(ownerCtx, {
              operationKey: randomUUID(),
              variantId: variant.id,
              quantity: item.stock,
            });
          }
          let listing = await repo(tx, marketEntities.MarketListing).findOneBy({
            membershipId: membership.id,
            variantId: variant.id,
          });
          if (!listing) {
            listing = await listingService.request(
              ownerCtx,
              membership.id,
              variant.id,
            );
            listing = await listingService.setStatus(
              marketCtx,
              listing.id,
              listing.version,
              'approved',
            );
          }
          for (const attendance of dates) {
            if (
              !(await repo(tx, marketEntities.OccurrenceOffering).exists({
                where: {
                  participationId: attendance.id,
                  variantId: variant.id,
                },
              }))
            )
              await offeringService.configure(ownerCtx, {
                participationId: attendance.id,
                listingId: listing.id,
                variantId: variant.id,
                enabled: true,
                preorderEnabled: true,
                salesCap: item.stock,
              });
          }
          const publication = await publishing.read(ownerCtx, listing.id);
          if (publication.state !== 'PUBLISHED')
            await publishing.publish(ownerCtx, listing.id);
        }
        console.log(`Ready: ${input.name} (${input.products.length} products)`);
      }
      assert.deepEqual(
        await snapshot(tx),
        before,
        'Existing schedules, layouts, applications and billing must be preserved.',
      );
      return inspect(
        (sql, parameters) =>
          repo(tx, identityEntities.Vendor).query(sql, parameters),
        true,
      );
    });
    const verified = await readDatabase(true);
    assert.equal(verified.productCount, result.productCount);
    const accessChecks = await verifyAccess(app, verified.vendors, db);
    const report = {
      ...verified,
      createdVendors: created,
      accessChecks,
      loginPassword: environment.demoPassword,
      note: 'Brand colors are stored in directory contact.branding and manager notes. The existing storefront theme contract does not render per-vendor colors. Existing preorder windows are preserved.',
    };
    const reportPath = join(
      root,
      vendorOption
        ? `docs/testing-vendor-${vendors[0].slug}.json`
        : 'docs/testing-vendors.json',
    );
    mkdirSync(dirname(reportPath), { recursive: true });
    const prettier = require('prettier');
    writeFileSync(
      reportPath,
      await prettier.format(JSON.stringify(report), {
        ...(await prettier.resolveConfig(reportPath)),
        filepath: reportPath,
      }),
    );
    console.log(
      `PASS: ${verified.vendors.length} vendors, ${verified.productCount} products, ${verified.categories.length} shared categories; ${created} newly created vendors. Report: ${reportPath}`,
    );
  } finally {
    await app.close();
    restoreNetwork();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
