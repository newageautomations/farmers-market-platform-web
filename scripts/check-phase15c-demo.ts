/** Existing demo compatibility audit. Strict loopback/name guard and READ ONLY transaction. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import type { MapDefinition } from '@market/api';
const requireBackend = createRequire(
  resolve('../farmers-market-platform/package.json'),
);
const { loadDemoEnvironment } = requireBackend(
  './scripts/market-operations-demo/environment.ts',
) as { loadDemoEnvironment: () => Record<string, string> };
const env = loadDemoEnvironment();
assert.equal(env.DB_NAME, 'vendure_demo_market_ops');
assert.ok(['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST!));
interface LocalClient {
  connect: () => Promise<void>;
  end: () => Promise<void>;
  query: (text: string) => Promise<{ rows: Record<string, unknown>[] }>;
}
const { Client } = requireBackend('pg') as {
  Client: new (options: Record<string, string | number>) => LocalClient;
};
const { validateLayout } = requireBackend(
  './src/plugins/market-operations/model.ts',
) as { validateLayout: (definition: MapDefinition) => MapDefinition };
const client = new Client({
  host: env.DB_HOST!,
  port: Number(env.DB_PORT),
  database: env.DB_NAME,
  user: env.DB_USERNAME!,
  password: env.DB_PASSWORD!,
});
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const connection = (
    await client.query(
      "SELECT current_database() AS database, current_setting('transaction_read_only') AS readonly, host(inet_server_addr()) AS address",
    )
  ).rows[0]!;
  assert.equal(connection.database, 'vendure_demo_market_ops');
  assert.equal(connection.readonly, 'on');
  assert.ok(['127.0.0.1', '::1'].includes(String(connection.address)));
  const versions = (
    await client.query(
      'SELECT id, status, definition FROM market_layout_version ORDER BY id',
    )
  ).rows;
  for (const v of versions) validateLayout(v.definition as MapDefinition);
  const counts = (
    await client.query(
      'SELECT (SELECT count(*) FROM market_layout_version) AS versions, (SELECT count(*) FROM market_space) AS spaces, (SELECT count(*) FROM market_occurrence_plan) AS plans, (SELECT count(*) FROM market_occurrence_space_assignment) AS assignments, (SELECT count(*) FROM market_invoice) AS invoices',
    )
  ).rows[0];
  const digest = createHash('sha256')
    .update(JSON.stringify(versions))
    .digest('hex');
  const evidence = resolve('docs/evidence/phase15c');
  mkdirSync(evidence, { recursive: true });
  writeFileSync(
    resolve(evidence, 'demo-compatibility.json'),
    JSON.stringify(
      {
        status: 'PASS',
        database: connection.database,
        readOnly: true,
        existingVersionsValidated: versions.length,
        counts,
        geometryDigest: digest,
        workflowWrites: 0,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS existing persistent demo definitions validate. READ ONLY transaction; zero workflow writes. Counts:',
    JSON.stringify(counts),
  );
  await client.query('ROLLBACK');
} finally {
  await client.end();
}
