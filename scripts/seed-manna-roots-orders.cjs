/** Persistent fictional orders using normal local checkout and inventory services. */
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve, join } = require('node:path');
const { writeFileSync } = require('node:fs');
const root = resolve(__dirname, '..');
assert.equal(resolve(process.cwd()), root);
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
// Enable only the built-in simulated payment adapter in this short-lived process.
process.env.ENABLE_LOCAL_VERIFIED_CHECKOUT = 'true';
process.env.ENABLE_PAID_ATTRIBUTION = 'true';
process.env.REFUND_POLICY_VERSION = 'manna-roots-local-demo-v1';
process.env.ASSET_UPLOAD_DIR = join(root, '.runtime/manna-roots-orders/assets');
const restoreNetwork = rb(
  './scripts/market-operations-demo/network.ts',
).blockDemoExternalNetwork();
const core = rb('@vendure/core');
const { config } = rb('./src/vendure-config.ts');
assert.equal(config.dbConnectionOptions.database, env.DB_NAME);
assert.equal(config.dbConnectionOptions.synchronize, false);
config.dbConnectionOptions = {
  ...config.dbConnectionOptions,
  migrationsRun: false,
};
config.logger = new core.DefaultLogger({ level: core.LogLevel.Error });
config.apiOptions = { ...config.apiOptions, hostname: '127.0.0.1', port: 0 };
config.schedulerOptions = {
  ...config.schedulerOptions,
  runTasksInWorkerOnly: true,
};
config.jobQueueOptions = { ...config.jobQueueOptions, activeQueues: [] };
config.plugins = config.plugins.filter(
  (plugin) => (plugin.plugin ?? plugin).name !== 'EmailPlugin',
);
const action = process.argv[2] ?? '--seed';
assert.ok(['--seed', '--verify'].includes(action));
const codes = Array.from(
  { length: 24 },
  (_, index) => `DEMO-MANNA-ROOTS-${index + 1}`,
);
const { Vendor } = rb('./src/plugins/platform-identity/entities.ts');
const { OrderLineLink } = rb(
  './src/plugins/marketplace-commerce/commerce/entities.ts',
);
const { CheckoutAttempt } = rb(
  './src/plugins/marketplace-commerce/inventory/entities.ts',
);

function checked(result) {
  assert.ok(!core.isGraphQlErrorResult(result), JSON.stringify(result));
  return result;
}

async function main() {
  const probe = new (rb('pg').Client)({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    connectionTimeoutMillis: 10000,
  });
  await probe.connect();
  let app;
  try {
    const {
      rows: [target],
    } = await probe.query(
      'SELECT current_database() AS database, host(inet_server_addr()) AS address',
    );
    assert.equal(target.database, env.DB_NAME);
    assert.ok(['127.0.0.1', '::1'].includes(target.address));
    // Session lock serializes retries; closing this connection releases it.
    await probe.query(
      "SELECT pg_advisory_lock(hashtext('manna-roots-demo-orders'))",
    );
    app = await core.bootstrap(config);
    const db = app.get(core.TransactionalConnection);
    const platform = await rb(
      './scripts/market-operations-demo/seed.ts',
    ).demoContext(app);
    const vendor = await db
      .getRepository(platform, Vendor)
      .findOneByOrFail({ provisioningKey: 'requested-vendors:manna-roots' });
    assert.equal(vendor.status, 'active');
    const channel = await db
      .getRepository(platform, core.Channel)
      .findOneOrFail({
        where: { id: vendor.primaryChannelId },
        relations: ['defaultTaxZone', 'defaultShippingZone'],
      });
    const ctx = platform.copy(channel);
    const customer = await db.getRepository(ctx, core.Customer).findOneOrFail({
      where: { emailAddress: 'demo.customer@example.test' },
      relations: ['user'],
    });
    assert.ok(
      !customer.deletedAt && customer.user.verified && !customer.user.deletedAt,
    );
    const owner = await db.getRepository(ctx, core.User).findOneOrFail({
      where: { identifier: 'manna-roots@example.test' },
      relations: ['roles', 'roles.channels'],
    });
    const ownerCtx = await app
      .get(core.RequestContextService)
      .create({ apiType: 'admin', user: owner, channelOrToken: channel });
    const service = (path, name) => app.get(rb(path)[name]);
    const contexts = service(
      './src/plugins/marketplace-commerce/commerce/order-context.service.ts',
      'OrderContextService',
    );
    const inventory = service(
      './src/plugins/marketplace-commerce/inventory/inventory-coordinator.ts',
      'InventoryCoordinator',
    );
    const local = service(
      './src/plugins/marketplace-commerce/commerce/local-verified-payment.adapter.ts',
      'LocalVerifiedPaymentAdapter',
    );
    const topology = service(
      './src/plugins/marketplace-commerce/commerce/topology.api.ts',
      'CommerceTopologyService',
    );
    const native = app.get(core.OrderService);
    const variants = [];
    for (let number = 5; number <= 14; number++) {
      const variant = await db
        .getRepository(ctx, core.ProductVariant)
        .findOneOrFail({
          where: { sku: `TEST-MANNA-ROOTS-${number}` },
          relations: ['product', 'translations'],
        });
      assert.ok(
        variant.enabled &&
          variant.product.enabled &&
          !variant.deletedAt &&
          !variant.product.deletedAt,
      );
      await contexts.owners.requireOwnedResource(
        ctx,
        vendor.id,
        'variant',
        variant.id,
      );
      variants.push(variant);
    }
    let created = 0;
    if (action === '--seed') {
      await app
        .get(core.ChannelService)
        .assignToChannels(ctx, core.Customer, customer.id, [channel.id]);
      let shipping = await db
        .getRepository(ctx, core.ShippingMethod)
        .findOneBy({ code: 'demo-manna-roots-pickup' });
      if (!shipping) {
        shipping = await db.withTransaction(ctx, async (tx) => {
          const method = await app.get(core.ShippingMethodService).create(tx, {
            code: 'demo-manna-roots-pickup',
            fulfillmentHandler: 'manual-fulfillment',
            checker: {
              code: 'default-shipping-eligibility-checker',
              arguments: [{ name: 'orderMinimum', value: '0' }],
            },
            calculator: {
              code: 'default-shipping-calculator',
              arguments: [
                { name: 'rate', value: '0' },
                { name: 'taxRate', value: '0' },
                { name: 'includesTax', value: 'exclude' },
              ],
            },
            translations: [
              {
                languageCode: core.LanguageCode.en,
                name: 'Manna Roots pickup',
                description: 'Fictional local demo vendor pickup.',
              },
            ],
          });
          await service(
            './src/plugins/platform-identity/protected-ownership.service.ts',
            'ProtectedOwnershipService',
          ).assign(
            tx,
            'shippingMethod',
            method.id,
            vendor.id,
            'Local demo order pickup',
          );
          return method;
        });
      }
      const pickup = await contexts.pickupMethod(ctx, shipping.id);
      assert.equal(String(pickup.vendor.id), String(vendor.id));
      for (const [index, code] of codes.entries()) {
        let order = await db.getRepository(ctx, core.Order).findOneBy({ code });
        if (!order) {
          order = await db.withTransaction(ctx, async (tx) => {
            const cart = await native.create(tx);
            // Stable fixture identifier makes interrupted runs resumable without duplicates.
            await db.getRepository(tx, core.Order).update(cart.id, { code });
            checked(
              await native.updateOrderCustomer(tx, {
                orderId: cart.id,
                customerId: customer.id,
              }),
            );
            await contexts.selectOrder(tx, cart.id, null);
            for (let item = 0; item < 1 + (index % 3); item++) {
              const variant = variants[(index * 3 + item) % variants.length];
              checked(
                await native.addItemToOrder(
                  tx,
                  cart.id,
                  variant.id,
                  1 + ((index + item) % 2),
                ),
              );
            }
            await contexts.selectPickupOrder(tx, cart.id, [shipping.id]);
            return db
              .getRepository(tx, core.Order)
              .findOneByOrFail({ id: cart.id });
          });
          created++;
        }
        const full = await contexts.ownedOrder(ctx, order.id);
        assert.equal(String(full.customerId), String(customer.id));
        const context = await contexts.context(ctx, order.id);
        assert.equal(context.kind, 'DIRECT_VENDOR');
        assert.equal(String(context.vendorId), String(vendor.id));
        if (full.state !== 'PaymentSettled') {
          if (full.state === 'AddingItems')
            checked(
              await native.transitionToState(ctx, order.id, 'ArrangingPayment'),
            );
          else assert.equal(full.state, 'ArrangingPayment');
          let attempt = await db
            .getRepository(ctx, CheckoutAttempt)
            .findOneBy({ orderId: order.id });
          if (!attempt)
            attempt = await inventory.acquireAttemptCapacity(ctx, {
              attemptKey: context.correlationId,
              orderId: order.id,
              occurrenceId: null,
              lines: full.lines.map((line) => ({
                variantId: line.productVariantId,
                offeringId: null,
                quantity: line.quantity,
              })),
            });
          assert.equal(attempt.state, 'HELD');
          await local.accept(ctx, attempt.id);
          const committed = await inventory.commitAttemptCapacity(
            ctx,
            attempt.id,
          );
          assert.equal(committed.state, 'COMMITTED');
        }
        console.log(`Ready: ${code}`);
      }
    }
    const orders = [];
    for (const code of codes) {
      const saved = await db
        .getRepository(ctx, core.Order)
        .findOneByOrFail({ code });
      const order = await contexts.ownedOrder(ctx, saved.id);
      assert.equal(order.state, 'PaymentSettled');
      assert.equal(order.active, false);
      assert.equal(String(order.customerId), String(customer.id));
      assert.equal(order.payments.length, 1);
      assert.equal(order.payments[0].state, 'Settled');
      assert.ok(order.payments[0].transactionId.startsWith('local:'));
      assert.equal(order.payments[0].amount, order.totalWithTax);
      const attempt = await db
        .getRepository(ctx, CheckoutAttempt)
        .findOneByOrFail({ orderId: order.id });
      assert.equal(attempt.state, 'COMMITTED');
      const links = await db
        .getRepository(ctx, OrderLineLink)
        .findBy({ operationalOrderId: order.id });
      assert.equal(links.length, order.lines.length);
      const portion = await topology.vendor(ownerCtx, order.id);
      assert.equal(portion.pickupStatus, 'PENDING');
      assert.ok(portion.placedAt && portion.quantity > 0);
      for (const line of order.lines)
        assert.ok(
          variants.some(
            (variant) => String(variant.id) === String(line.productVariantId),
          ),
        );
      orders.push({
        id: String(order.id),
        code,
        state: order.state,
        pickupStatus: portion.pickupStatus,
        total: order.totalWithTax / 100,
        currency: order.currencyCode,
        lines: portion.lines.map((line) => ({
          sku: line.sku,
          name: line.variantName,
          quantity: line.quantity,
        })),
      });
    }
    const visible = new Set();
    for (let skip = 0; ; skip += 20) {
      const page = await topology.vendorList(ownerCtx, {
        take: 20,
        skip,
        kind: 'DIRECT_VENDOR',
      });
      for (const item of page.items)
        visible.add(String(item.operationalOrderId));
      if (skip + page.items.length >= page.totalItems) break;
      assert.ok(page.items.length);
    }
    assert.ok(
      orders.every((order) => visible.has(order.id)),
      'Every demo order must appear in the vendor order list.',
    );
    const [{ invalid }] = await db.rawConnection.query(
      'SELECT count(*)::int AS invalid FROM stock_level sl JOIN product_variant pv ON pv.id=sl."productVariantId" WHERE pv.sku=ANY($1::text[]) AND (sl."stockAllocated" < 0 OR sl."stockAllocated" > sl."stockOnHand")',
      [variants.map((variant) => variant.sku)],
    );
    assert.equal(invalid, 0);
    const report = {
      status: 'PASS',
      database: env.DB_NAME,
      vendor: vendor.name,
      customerEmail: customer.emailAddress,
      orderCount: orders.length,
      createdOrders: created,
      payment: 'Simulated local settled payment; no external provider',
      orders,
    };
    if (action === '--seed')
      writeFileSync(
        join(root, 'docs/manna-roots-demo-orders.json'),
        JSON.stringify(report, null, 2) + '\n',
      );
    console.log(
      `PASS: ${orders.length} settled orders visible to Manna Roots, ${created} newly created.`,
    );
  } finally {
    if (app) await app.close();
    await probe.end();
    restoreNetwork();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
