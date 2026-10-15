/** Create an empty market only in the persistent, loopback demo database. */
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve, join } = require('node:path');
const { request } = require('node:http');
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
assert.equal(env.DB_NAME, 'vendure_demo_market_ops');
environment.installDemoEnvironment(env);
process.env.ASSET_UPLOAD_DIR = join(root, '.runtime/testing-vendors/assets');
const restoreNetwork = rb(
  './scripts/market-operations-demo/network.ts',
).blockDemoExternalNetwork();
const core = rb('@vendure/core');
const { config } = rb('./src/vendure-config.ts');
const { Market, MarketOccurrence, MarketVendorMembership } = rb(
  './src/plugins/farmers-market/entities/market.entities.ts',
);
const { TenantMembership, Storefront } = rb(
  './src/plugins/platform-identity/entities.ts',
);
const storefrontOnly = process.argv[2] === '--storefront-only';
assert.ok(!process.argv[2] || storefrontOnly, 'Unknown option.');
const operations = rb('./src/plugins/market-operations/entities.ts');
const { marketAdminPermissions, manageMarketStorefront } = rb(
  './src/plugins/platform-identity/permissions.ts',
);
const { TRANSACTION_MANAGER_KEY } = rb('@vendure/core/dist/common/constants');
const email = 'boerne.manager@example.test';
const key = 'demo-boerne-farmers-market';
config.logger = new core.DefaultLogger({ level: core.LogLevel.Error });
config.dbConnectionOptions = {
  ...config.dbConnectionOptions,
  synchronize: false,
  migrationsRun: false,
};
assert.equal(config.dbConnectionOptions.database, env.DB_NAME);
assert.ok(
  ['localhost', '127.0.0.1', '::1'].includes(config.dbConnectionOptions.host),
);
config.apiOptions = {
  ...config.apiOptions,
  hostname: '127.0.0.1',
  port: 0,
  csrfPrevention: true,
};
config.schedulerOptions = {
  ...config.schedulerOptions,
  runTasksInWorkerOnly: true,
};
config.jobQueueOptions = { ...config.jobQueueOptions, activeQueues: [] };
config.plugins = config.plugins.filter(
  (p) => (p.plugin ?? p).name !== 'EmailPlugin',
);

function graphql(port, query, variables, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/admin-api',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Apollo-Require-Preflight': 'true',
          ...headers,
        },
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('error', reject);
        res.on('end', () => {
          try {
            assert.equal(res.statusCode, 200, body);
            const value = JSON.parse(body);
            assert.ok(!value.errors, JSON.stringify(value.errors));
            resolve({ data: value.data, headers: res.headers });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () =>
      req.destroy(new Error('Local login verification timed out')),
    );
    req.end(JSON.stringify({ query, variables }));
  });
}

async function main() {
  const app = await core.bootstrap(config);
  try {
    const db = app.get(core.TransactionalConnection);
    const [connection] = await db.rawConnection.query(
      'SELECT current_database() AS database, host(inet_server_addr()) AS address',
    );
    assert.equal(connection.database, env.DB_NAME);
    assert.ok(['127.0.0.1', '::1'].includes(connection.address));
    const contexts = app.get(core.RequestContextService);
    async function context(tx, user, channel) {
      const ctx = await contexts.create({
        apiType: 'admin',
        user,
        channelOrToken: channel,
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
    const result = await db.withTransaction(platform, async (tx) => {
      const repo = (entity) => db.getRepository(tx, entity);
      const existed = await repo(Market).findOneBy({ provisioningKey: key });
      if (storefrontOnly) assert.ok(existed, 'Create the test market first.');
      const market =
        existed ??
        (await app
          .get(
            rb(
              './src/plugins/farmers-market/services/market-provisioning.service.ts',
            ).MarketProvisioningService,
          )
          .provision(tx, {
            provisioningKey: key,
            slug: 'boerne-farmers-market',
            name: 'Boerne Farmers Market',
            timezone: 'America/Chicago',
            venue: '',
            pickupInstructions: '',
            recurrence: null,
            defaultPreorderRule: {
              opensDaysBefore: 6,
              opensTime: '08:00',
              closesDaysBefore: 2,
              closesTime: '20:00',
            },
            overridePolicy: {
              membershipAllowed: true,
              participationAllowed: true,
              vendorWindowMode: 'withinBoundary',
              closeMinutesBeforeStart: 60,
            },
          }));
      assert.equal(market.name, 'Boerne Farmers Market');
      const currentPlatform = await repo(core.User).findOneOrFail({
        where: { id: platformUser.id },
        relations: ['roles', 'roles.channels'],
      });
      const trusted = await context(tx, currentPlatform);
      const channel = await repo(core.Channel).findOneByOrFail({
        id: market.channelId,
      });
      let storefront = await repo(Storefront).findOneBy({ key });
      if (!storefront)
        storefront = await repo(Storefront).save(
          new Storefront({
            key,
            routeKey: 'boerne-farmers-market',
            displayName: market.name,
            status: 'active',
            marketId: market.id,
            vendorId: null,
            channelId: channel.id,
          }),
        );
      assert.equal(String(storefront.marketId), String(market.id));
      assert.equal(String(storefront.channelId), String(channel.id));
      await repo(Storefront).query(
        'UPDATE platform_storefront SET hostname=$1 WHERE id=$2 AND "marketId"=$3 AND hostname IS NULL',
        ['boerne-farmers-market.localhost', storefront.id, market.id],
      );
      let role = await repo(core.Role).findOneBy({ code: key });
      if (!role)
        role = await app.get(core.RoleService).create(trusted, {
          code: key,
          description: 'Boerne Farmers Market local test manager',
          channelIds: [channel.id],
          permissions: [
            ...marketAdminPermissions,
            manageMarketStorefront.Permission,
          ],
        });
      let user = await repo(core.User).findOne({
        where: { identifier: email },
        relations: ['roles', 'roles.channels'],
      });
      if (!user) {
        const admin = await app.get(core.AdministratorService).create(trusted, {
          firstName: 'Boerne',
          lastName: 'Manager',
          emailAddress: email,
          password: environment.demoPassword,
          roleIds: [role.id],
        });
        user = await repo(core.User).findOneByOrFail({ id: admin.user.id });
      }
      if (
        !(await repo(TenantMembership).exists({
          where: {
            principalId: user.id,
            marketId: market.id,
            status: 'active',
          },
        }))
      )
        await app
          .get(
            rb('./src/plugins/farmers-market/services/market.service.ts')
              .MarketService,
          )
          .setAdminMembership(trusted, market.id, user.id, 'active');
      const empty = {};
      for (const [label, entity] of Object.entries({
        vendors: MarketVendorMembership,
        occurrences: MarketOccurrence,
        directory: operations.MarketVendorDirectoryEntry,
        applications: operations.MarketApplicationTemplate,
        submissions: operations.MarketApplicationSubmission,
        rentals: operations.MarketRentalOption,
        layouts: operations.MarketLayout,
        assignments: operations.MarketOccurrenceSpaceAssignment,
        invoices: operations.MarketInvoice,
        payments: operations.MarketPayment,
      })) {
        empty[label] = await repo(entity).countBy({ marketId: market.id });
        if (!storefrontOnly)
          assert.equal(empty[label], 0, `Market is not empty: ${label}`);
      }
      empty.products = await repo(core.Product)
        .createQueryBuilder('p')
        .innerJoin('p.channels', 'c', 'c.id = :id', { id: channel.id })
        .getCount();
      if (!storefrontOnly) assert.equal(empty.products, 0);
      return {
        marketId: market.id,
        market: market.name,
        channel: channel.code,
        channelToken: channel.token,
        created: !existed,
        empty,
      };
    });
    const publicContext = await app
      .get(
        rb('./src/plugins/platform-identity/public-storefront.controller.ts')
          .PublicStorefrontService,
      )
      .resolve('boerne-farmers-market.localhost:4321');
    assert.ok(publicContext, 'Boerne storefront must resolve.');
    assert.equal(publicContext.kind, 'MARKET');
    assert.equal(publicContext.subject.id, String(result.marketId));
    result.storefront = publicContext.canonicalOrigin;
    const port = app.getHttpServer().address().port;
    const headers = { 'vendure-token': result.channelToken };
    const login = await graphql(
      port,
      'mutation($username:String!,$password:String!){login(username:$username,password:$password){__typename ... on CurrentUser{id}}}',
      { username: email, password: environment.demoPassword },
      headers,
    );
    assert.equal(
      login.data.login.__typename,
      'CurrentUser',
      'Manager login failed',
    );
    const authenticated = {
      ...headers,
      Authorization: `Bearer ${login.headers['vendure-auth-token']}`,
    };
    try {
      const identity = await graphql(
        port,
        'query { ownMarketIdentity { id name } }',
        {},
        authenticated,
      );
      assert.equal(identity.data.ownMarketIdentity.name, result.market);
      assert.equal(
        String(identity.data.ownMarketIdentity.id),
        String(result.marketId),
      );
    } finally {
      await graphql(port, 'mutation { logout { success } }', {}, authenticated);
    }
    delete result.channelToken;
    console.log(
      JSON.stringify(
        {
          ...result,
          email,
          password: environment.demoPassword,
          login: 'PASS',
          database: env.DB_NAME,
        },
        null,
        2,
      ),
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
