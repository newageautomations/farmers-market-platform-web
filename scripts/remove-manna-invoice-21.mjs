// One-time removal of the untouched dashboard demo invoice requested by the developer.
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
      'Use no arguments to inspect, or --apply to remove invoice 21.',
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
    const invoice = (
      await client.query(`SELECT i.id, i.status, i.revision, i."paidMinor", i."providerReference", i."totalMinor", i."assignmentId", d.contact->>'businessName' AS business,
      a."spaceSnapshot", (SELECT count(*)::int FROM market_payment p WHERE p."invoiceId"=i.id) AS payments,
      (SELECT count(*)::int FROM stripe_invoice_collection c WHERE c."invoiceId"=i.id) AS collections,
      (SELECT count(*)::int FROM market_invoice_adjustment j WHERE j."invoiceId"=i.id) AS adjustments,
      (SELECT count(*)::int FROM market_invoice_refund r WHERE r."invoiceId"=i.id) AS refunds
      FROM market_invoice i JOIN market_vendor_directory_entry d ON d.id=i."directoryId"
      JOIN market_occurrence_space_assignment a ON a.id=i."assignmentId" WHERE i.id=21 FOR UPDATE OF i`)
    ).rows[0];
    console.log(
      JSON.stringify(invoice ?? { state: 'already removed' }, null, 2),
    );
    if (process.argv.includes('--apply') && invoice) {
      if (
        invoice.business !== 'Manna Roots' ||
        invoice.spaceSnapshot.label !== 'A01' ||
        invoice.status !== 'OPEN' ||
        invoice.paidMinor !== 0 ||
        invoice.totalMinor !== 4500 ||
        invoice.providerReference !== 'dashboard-demo-booth-fee' ||
        invoice.payments ||
        invoice.collections ||
        invoice.adjustments ||
        invoice.refunds
      )
        throw new Error(
          'Invoice identity or untouched demo financial history did not match. Nothing removed.',
        );
      const replacement = await client.query(
        'SELECT id FROM market_invoice WHERE "replacesInvoiceId"=21',
      );
      if (replacement.rowCount)
        throw new Error('Invoice has a replacement. Nothing removed.');
      await client.query(
        'DELETE FROM stripe_invoice_recipient WHERE "invoiceId"=21',
      );
      const removed = await client.query(
        'DELETE FROM market_invoice WHERE id=21 AND revision=$1 RETURNING id',
        [invoice.revision],
      );
      if (removed.rowCount !== 1)
        throw new Error('Invoice changed. Nothing removed.');
      await client.query('COMMIT');
      console.log('Removed only Manna Roots invoice 21 for booth A01.');
      return;
    }
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}
await main();
