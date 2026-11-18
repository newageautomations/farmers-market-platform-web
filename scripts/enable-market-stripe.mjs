// Repair existing local market owners created before Stripe support was added.
// New owners already receive these grants through backend ownerPermissions().
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRequire = createRequire(
  path.resolve(scriptDirectory, '../../farmers-market-platform/package.json'),
);
const { Client } = backendRequire('pg');
const { parse } = backendRequire('dotenv');

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== '--apply'))
    throw new Error(
      'Use no arguments to inspect, or --apply to add missing grants.',
    );
  const file = path.resolve(
    scriptDirectory,
    '../../farmers-market-platform/.env.demo-market-operations',
  );
  const env = {
    ...(fs.existsSync(file) ? parse(fs.readFileSync(file)) : {}),
    ...process.env,
  };
  const host = env.DB_HOST || '127.0.0.1';
  const database = env.DB_NAME || 'vendure_demo_market_ops';
  if (
    !['localhost', '127.0.0.1', '::1'].includes(host) ||
    database !== 'vendure_demo_market_ops' ||
    (env.DB_SCHEMA && env.DB_SCHEMA !== 'public') ||
    ['DATABASE_URL', 'DB_URL', 'PGHOST', 'PGSERVICE', 'PGOPTIONS'].some(
      (key) => env[key],
    )
  )
    throw new Error(
      'Only the persistent loopback demo database with the public schema is allowed.',
    );
  const client = new Client({
    host,
    database,
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    const actual = (await client.query('SELECT current_database() AS name'))
      .rows[0];
    if (actual.name !== database)
      throw new Error('Unexpected database connection.');
    const owners = (
      await client.query(`
      SELECT tm.id, tm."managedRoleId", m.name, r.permissions,
        r.code = 'business-member:' || tm.id::text
        AND tm."vendorId" IS NULL
        AND EXISTS (SELECT 1 FROM platform_business_ownership o
          WHERE o."membershipId"=tm.id AND o."marketId"=m.id AND o."vendorId" IS NULL)
        AND (SELECT count(*) FROM role_channels_channel rc WHERE rc."roleId"=r.id)=1
        AND EXISTS (SELECT 1 FROM role_channels_channel rc WHERE rc."roleId"=r.id AND rc."channelId"=m."channelId")
        AND EXISTS (SELECT 1 FROM user_roles_role ur WHERE ur."roleId"=r.id AND ur."userId"=tm."principalId")
        AND EXISTS (SELECT 1 FROM "user" u JOIN administrator a ON a."userId"=u.id
          WHERE u.id=tm."principalId" AND u."deletedAt" IS NULL AND a."deletedAt" IS NULL)
        AND (SELECT count(*) FROM platform_tenant_membership other WHERE other."managedRoleId"=r.id)=1
        AS verified
      FROM platform_tenant_membership tm
      JOIN farmers_market m ON m.id=tm."marketId"
      LEFT JOIN role r ON r.id=tm."managedRoleId"
      WHERE tm.status='active' AND tm.role='owner'
      ORDER BY tm.id FOR UPDATE OF tm
    `)
    ).rows;
    if (owners.some((owner) => !owner.verified))
      throw new Error(
        'An owner has an unexpected ownership or role boundary; no grants changed.',
      );
    const grants = ['ReadOwnPaymentAccount', 'ManageOwnPaymentAccount'];
    const changed = [];
    for (const owner of owners) {
      const role = (
        await client.query(
          'SELECT permissions FROM role WHERE id=$1 FOR UPDATE',
          [owner.managedRoleId],
        )
      ).rows[0];
      const permissions = role.permissions.split(',').filter(Boolean);
      const missing = grants.filter((grant) => !permissions.includes(grant));
      if (!missing.length) continue;
      changed.push({ market: owner.name, added: missing });
      if (process.argv.includes('--apply')) {
        await client.query(
          'UPDATE role SET permissions=$1, "updatedAt"=now() WHERE id=$2',
          [[...permissions, ...missing].join(','), owner.managedRoleId],
        );
        await client.query(
          'UPDATE platform_tenant_membership SET "grantRevision"="grantRevision"+1, "updatedAt"=now() WHERE id=$1',
          [owner.id],
        );
      }
    }
    await client.query(
      process.argv.includes('--apply') ? 'COMMIT' : 'ROLLBACK',
    );
    console.log(
      JSON.stringify(
        {
          database,
          applied: process.argv.includes('--apply'),
          verifiedOwners: owners.length,
          changed,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
