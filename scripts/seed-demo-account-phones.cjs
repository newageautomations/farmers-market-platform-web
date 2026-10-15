/** Assign verified fictional personal phones only to the documented local demo users. */
/* eslint-disable @typescript-eslint/no-require-imports -- Reuse the local backend's guarded demo environment. */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve, join } = require('node:path');
const { writeFileSync } = require('node:fs');
const { vendors } = require('./data/testing-vendors.cjs');

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
const environment = rb('./scripts/market-operations-demo/environment.ts');
const env = environment.loadDemoEnvironment();
assert.equal(env.DB_NAME, 'vendure_demo_market_ops');
const mode = process.argv[2] ?? '--dry-run';
assert.ok(
  ['--dry-run', '--apply', '--verify'].includes(mode),
  'Use --dry-run, --apply or --verify.',
);
const emails = [
  'demo.platform@example.test',
  environment.managerEmail,
  'boerne.manager@example.test',
  ...environment.vendorAccounts.map((row) => row.email),
  ...vendors.map((row) => row.email ?? `${row.slug}@example.test`),
];
assert.equal(emails.length, 23);
assert.equal(new Set(emails).size, 23);
const { Client } = rb('pg');

async function main() {
  const client = new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    database: env.DB_NAME,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  let transaction = false;
  try {
    await client.query(mode === '--apply' ? 'BEGIN' : 'BEGIN READ ONLY');
    transaction = true;
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const {
      rows: [connection],
    } = await client.query(
      'SELECT current_database() AS database, host(inet_server_addr()) AS address',
    );
    assert.equal(connection.database, 'vendure_demo_market_ops');
    assert.ok(['127.0.0.1', '::1'].includes(connection.address));
    if (mode === '--apply') {
      await client.query(
        'LOCK TABLE platform_phone_identity IN SHARE ROW EXCLUSIVE MODE',
      );
    }
    const { rows: users } = await client.query(
      `SELECT u.id, u.identifier AS email, u.verified,
              p.phone, p.country, p."verifiedAt"
       FROM "user" u LEFT JOIN platform_phone_identity p ON p."userId" = u.id
       WHERE u."deletedAt" IS NULL AND u.identifier = ANY($1::text[])
       ORDER BY u.id${mode === '--apply' ? ' FOR UPDATE OF u' : ''}`,
      [emails],
    );
    assert.equal(
      users.length,
      emails.length,
      'Every documented demo account must exist exactly once.',
    );
    for (const email of emails)
      assert.equal(users.filter((u) => u.email === email).length, 1);
    const { rows: identities } = await client.query(
      'SELECT "userId", phone FROM platform_phone_identity',
    );
    const occupied = new Set(identities.map((row) => row.phone));
    const assignments = emails.map((email) => {
      const user = users.find((row) => row.email === email);
      // Idempotent: preserve an existing fictional US identity, never take someone else's number.
      let phone =
        user.country === 'US' && /^\+121055501\d\d$/.test(user.phone ?? '')
          ? user.phone
          : null;
      if (!phone) {
        for (let number = 100; number <= 199; number++) {
          const candidate = `+1210555${String(number).padStart(4, '0')}`;
          if (!occupied.has(candidate)) {
            phone = candidate;
            occupied.add(phone);
            break;
          }
        }
      }
      assert.ok(phone, 'The reserved fictional number range is exhausted.');
      if (mode === '--verify') {
        assert.equal(user.phone, phone);
        assert.equal(user.country, 'US');
        assert.ok(user.verifiedAt, `Phone is not verified for ${email}`);
      }
      return {
        email,
        userId: String(user.id),
        phone,
        country: 'US',
        phoneVerified: !!user.verifiedAt,
      };
    });
    assert.equal(
      new Set(assignments.map((row) => row.phone)).size,
      assignments.length,
    );
    if (mode === '--apply') {
      for (const row of assignments) {
        await client.query(
          `INSERT INTO platform_phone_identity
             ("createdAt", "updatedAt", "userId", phone, country, "verifiedAt")
           VALUES (now(), now(), $1, $2, $3, now())
           ON CONFLICT ("userId") DO UPDATE
           SET phone = EXCLUDED.phone, country = EXCLUDED.country,
               "verifiedAt" = COALESCE(platform_phone_identity."verifiedAt", EXCLUDED."verifiedAt"),
               "updatedAt" = now()`,
          [row.userId, row.phone, row.country],
        );
      }
      const { rows: verified } = await client.query(
        `SELECT u.identifier AS email, p.phone, p.country, p."verifiedAt"
         FROM "user" u JOIN platform_phone_identity p ON p."userId" = u.id
         WHERE u.id = ANY($1::int[])`,
        [assignments.map((row) => Number(row.userId))],
      );
      assert.equal(verified.length, assignments.length);
      for (const row of assignments) {
        const saved = verified.find((value) => value.email === row.email);
        assert.equal(saved?.phone, row.phone);
        assert.equal(saved?.country, 'US');
        assert.ok(saved?.verifiedAt);
        row.phoneVerified = true;
      }
    }
    await client.query('COMMIT');
    transaction = false;
    const result = {
      database: env.DB_NAME,
      applied: mode === '--apply',
      accounts: assignments,
    };
    if (mode === '--apply')
      writeFileSync(
        join(root, 'docs/demo-account-phones.json'),
        JSON.stringify(result, null, 2) + '\n',
      );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (transaction) await client.query('ROLLBACK');
    await client.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
