/** Create a customer through Vendure services, only in the guarded persistent local demo. */
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
rb('./scripts/market-operations-demo/network.ts').blockDemoExternalNetwork();
const { config } = rb('./src/vendure-config.ts');
assert.equal(config.dbConnectionOptions.database, 'vendure_demo_market_ops');
assert.equal(config.dbConnectionOptions.synchronize, false);
config.dbConnectionOptions = {
  ...config.dbConnectionOptions,
  migrationsRun: false,
};
config.apiOptions = { ...config.apiOptions, hostname: '127.0.0.1', port: 0 };
config.schedulerOptions = {
  ...config.schedulerOptions,
  runTasksInWorkerOnly: true,
};
config.jobQueueOptions = { ...config.jobQueueOptions, activeQueues: [] };
const core = rb('@vendure/core');
const { AccountPhoneIdentity } = rb(
  './src/plugins/platform-identity/phone-identity.ts',
);
const email = 'demo.customer@example.test';
async function main() {
  const { Client } = rb('pg');
  const probe = new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
  });
  await probe.connect();
  try {
    const {
      rows: [target],
    } = await probe.query(
      'SELECT current_database() AS database, host(inet_server_addr()) AS address',
    );
    assert.equal(target.database, 'vendure_demo_market_ops');
    assert.ok(['127.0.0.1', '::1'].includes(target.address));
  } finally {
    await probe.end();
  }
  config.logger = new core.DefaultLogger({ level: core.LogLevel.Error });
  const app = await core.bootstrap(config);
  try {
    const db = app.get(core.TransactionalConnection);
    const ctx = await rb(
      './scripts/market-operations-demo/seed.ts',
    ).demoContext(app);
    const result = await db.withTransaction(ctx, async (tx) => {
      await db
        .getRepository(tx, core.User)
        .query(
          "SELECT pg_advisory_xact_lock(hashtext('demo-customer-account-seed'))",
        );
      let customer = await db.getRepository(tx, core.Customer).findOne({
        where: { emailAddress: email },
        relations: ['user', 'user.roles', 'user.authenticationMethods'],
      });
      if (!customer) {
        assert.equal(
          await db
            .getRepository(tx, core.User)
            .count({ where: { identifier: email } }),
          0,
          'Email belongs to an existing non-customer account.',
        );
        const created = await app
          .get(core.CustomerService)
          .create(
            tx,
            { firstName: 'Demo', lastName: 'Customer', emailAddress: email },
            environment.demoPassword,
          );
        assert.ok(
          !core.isGraphQlErrorResult(created),
          'Customer creation failed.',
        );
        customer = await db.getRepository(tx, core.Customer).findOneOrFail({
          where: { id: created.id },
          relations: ['user', 'user.roles', 'user.authenticationMethods'],
        });
      }
      assert.ok(
        customer.user && !customer.deletedAt && !customer.user.deletedAt,
      );
      assert.equal(
        await db
          .getRepository(tx, core.Administrator)
          .count({ where: { user: { id: customer.user.id } } }),
        0,
      );
      assert.ok(
        customer.user.roles.every((role) => role.code === '__customer_role__'),
        'Customer must not have privileged roles.',
      );
      const repo = db.getRepository(tx, AccountPhoneIdentity);
      let identity = await repo.findOneBy({ userId: customer.user.id });
      if (!identity) {
        let phone;
        for (let suffix = 123; suffix <= 199; suffix++) {
          const candidate = `+1210555${String(suffix).padStart(4, '0')}`;
          if (!(await repo.exists({ where: { phone: candidate } }))) {
            phone = candidate;
            break;
          }
        }
        assert.ok(phone, 'Fictional phone range is exhausted.');
        identity = await repo.save(
          new AccountPhoneIdentity({
            userId: customer.user.id,
            phone,
            country: 'US',
            verifiedAt: new Date(),
            emailVerifiedAt: new Date(),
            emailVerifiedAddress: email,
          }),
        );
      }
      assert.ok(identity.verifiedAt && customer.user.verified);
      const native = await db
        .getRepository(tx, core.NativeAuthenticationMethod)
        .createQueryBuilder('a')
        .addSelect('a.passwordHash')
        .where('a.userId = :id', { id: customer.user.id })
        .getOneOrFail();
      assert.ok(
        await app
          .get(core.PasswordCipher)
          .check(environment.demoPassword, native.passwordHash),
        'Existing customer has a different password; it was preserved.',
      );
      return {
        database: env.DB_NAME,
        email,
        phone: identity.phone,
        phoneVerified: true,
        emailVerified: !!identity.emailVerifiedAt,
        userId: String(customer.user.id),
        customerId: String(customer.id),
        password: environment.demoPassword,
      };
    });
    writeFileSync(
      join(root, 'docs/demo-customer-account.json'),
      JSON.stringify(result, null, 2) + '\n',
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
