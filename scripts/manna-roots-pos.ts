import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mannaPosPlan, type PosAccessFacts } from './manna-roots-pos-plan';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert.equal(resolve(process.cwd()), root, 'Run from the web project root');
const args = process.argv.slice(2);
const apply = args[0] === '--apply';
assert.ok(
  args.length === 0 ||
    (args.length === 3 &&
      apply &&
      args[1] === '--approve-plan' &&
      /^[a-f0-9]{64}$/.test(args[2]!)),
  'Use no arguments for a dry-run, or --apply --approve-plan <reviewed SHA256> after explicit approval',
);
const backend = createRequire(
  resolve(root, '../farmers-market-platform/package.json'),
);
const { loadDemoEnvironment, assertDemoEnvironment } = backend(
  './scripts/market-operations-demo/environment.ts',
) as {
  loadDemoEnvironment: () => Record<string, string>;
  assertDemoEnvironment: (env: Record<string, string>) => void;
};
const env = loadDemoEnvironment();
assertDemoEnvironment(env);
interface Client {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<T = Record<string, unknown>>(
    sql: string,
    parameters?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
}
const { Client: PgClient } = backend('pg') as {
  Client: new (options: Record<string, unknown>) => Client;
};
const db = new PgClient({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  database: env.DB_NAME,
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD,
});
await db.connect();
try {
  await db.query(
    apply
      ? 'BEGIN ISOLATION LEVEL SERIALIZABLE'
      : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY',
  );
  await db.query("SET LOCAL statement_timeout='15s'");
  await db.query("SET LOCAL lock_timeout='5s'");
  const target = (
    await db.query<{ database: string; address: string; readonly: string }>(
      "SELECT current_database() AS database,host(inet_server_addr()) AS address,current_setting('transaction_read_only') AS readonly",
    )
  ).rows[0]!;
  assert.equal(target.database, 'vendure_demo_market_ops');
  assert.ok(['127.0.0.1', '::1'].includes(target.address));
  if (!apply) assert.equal(target.readonly, 'on');
  if (apply) {
    // Prevent a concurrent role assignment/channel expansion between inspection and update.
    await db.query(
      'LOCK TABLE role, user_roles_role, role_channels_channel, platform_tenant_membership, platform_vendor, "user" IN SHARE ROW EXCLUSIVE MODE',
    );
  }
  const user = (
    await db.query<PosAccessFacts['user']>(
      'SELECT id,identifier,"deletedAt",verified FROM "user" WHERE identifier=$1',
      ['manna-roots@example.test'],
    )
  ).rows;
  const vendor = (
    await db.query<PosAccessFacts['vendor']>(
      'SELECT id,slug,"provisioningKey",status,"primaryChannelId" FROM platform_vendor WHERE slug=$1',
      ['manna-roots'],
    )
  ).rows;
  const role = (
    await db.query<PosAccessFacts['role']>(
      `SELECT r.id,r.code,r.permissions,
    ARRAY(SELECT "userId" FROM user_roles_role WHERE "roleId"=r.id ORDER BY "userId") AS "userIds",
    ARRAY(SELECT "channelId" FROM role_channels_channel WHERE "roleId"=r.id ORDER BY "channelId") AS "channelIds"
    FROM role r WHERE r.code=$1`,
      ['testing-vendor:manna-roots'],
    )
  ).rows;
  assert.equal(user.length, 1);
  assert.equal(vendor.length, 1);
  assert.equal(role.length, 1);
  const memberships = (
    await db.query<PosAccessFacts['memberships'][number]>(
      'SELECT "principalId","vendorId","marketId",role,status FROM platform_tenant_membership WHERE "principalId"=$1 ORDER BY id',
      [user[0]!.id],
    )
  ).rows;
  const facts = {
    user: user[0]!,
    vendor: vendor[0]!,
    role: role[0]!,
    memberships,
  };
  const plan = mannaPosPlan(facts);
  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        target,
        facts,
        plan,
        runtime: {
          ENABLE_IN_PERSON_CHECKOUT: env.ENABLE_IN_PERSON_CHECKOUT,
          POS_ALLOW_NETWORK: env.POS_ALLOW_NETWORK,
        },
      },
      null,
      2,
    ),
  );
  const prerequisites = (
    await db.query(
      `SELECT
    to_regclass('public.pos_draft') IS NOT NULL AS pos_schema,
    to_regclass('public.vendor_tax_settings') IS NOT NULL AS vendor_tax_schema,
    to_regclass('public.vendor_product_tax') IS NOT NULL AS product_tax_schema,
    (SELECT count(*)::int FROM product WHERE "customFieldsPlatformownerid"=$1 AND "deletedAt" IS NULL AND enabled) AS enabled_products`,
      [facts.vendor.id],
    )
  ).rows;
  console.log('Prerequisites:', JSON.stringify(prerequisites));
  console.log(
    'Market participation:',
    JSON.stringify(
      (
        await db.query(
          `SELECT m."marketId",fm.name,m.status,m."consentState",p."occurrenceId",p.status AS participation,o.status AS occurrence,o."startsAt",o."endsAt",
    (p.status='confirmed' AND m.status='approved' AND m."consentState"='VERIFIED' AND o.status='scheduled' AND fm.status='active' AND o."endsAt">clock_timestamp() AND o."startsAt"<clock_timestamp()+interval '7 days') AS eligible
    FROM market_vendor_membership m JOIN farmers_market fm ON fm.id=m."marketId"
    LEFT JOIN occurrence_participation p ON p."membershipId"=m.id LEFT JOIN market_occurrence o ON o.id=p."occurrenceId"
    WHERE m."vendorId"=$1 ORDER BY m.id,o."startsAt"`,
          [facts.vendor.id],
        )
      ).rows,
      null,
      2,
    ),
  );
  if (prerequisites[0]?.vendor_tax_schema)
    console.log(
      'Existing tax settings:',
      JSON.stringify(
        (
          await db.query(
            'SELECT * FROM vendor_tax_settings WHERE vendor_id=$1',
            [facts.vendor.id],
          )
        ).rows,
      ),
    );
  if (apply) {
    assert.equal(
      args[2],
      plan.approval,
      'State changed or plan not approved. Review a fresh dry-run.',
    );
    if (plan.added.length) {
      const result = await db.query(
        'UPDATE role SET permissions=$1,"updatedAt"=clock_timestamp() WHERE id=$2 AND permissions=$3',
        [plan.after.join(','), plan.roleId, facts.role.permissions],
      );
      assert.equal(result.rowCount, 1);
    }
    await db.query('COMMIT');
    console.log(
      `Applied ${plan.added.length} permission addition(s) to one existing exclusive role. Sign out and sign back in.`,
    );
  } else {
    await db.query('ROLLBACK');
    console.log(
      'Dry-run complete. Zero writes. Explicit approval required before applying the displayed plan.',
    );
  }
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
