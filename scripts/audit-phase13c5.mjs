import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const evidence = resolve('docs/evidence/phase13c5');
const normalize = (path) => path.replaceAll('\\', '/');
const hash = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
const expected = {
  backend: {
    files: [
      'README.md',
      'package.json',
      'src/gql/graphql-env.d.ts',
      'src/plugins/farmers-market/api/admin-api.ts',
      'src/plugins/farmers-market/farmers-market.plugin.ts',
      'src/plugins/farmers-market/services/market-organizer-read.service.ts',
      'src/plugins/farmers-market/services/occurrence-generation-worker.service.ts',
      'src/plugins/marketplace-commerce/catalog-publishing.service.ts',
      'src/plugins/marketplace-commerce/owned-admin-reads.ts',
      'src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts',
      'test/frontend-integration/harness.ts',
      'test/frontend-integration/run.ts',
      'test/frontend-integration/cookie-client.ts',
      'test/frontend-integration/market-fixture.ts',
      'test/frontend-integration/market-large-fixture.ts',
      'test/frontend-integration/market-run.ts',
      'docs/frontend-api-gap-closure-phase13c5.md',
    ],
    generatedPrefixes: [
      'dist/',
      '.vendure/',
      'test/frontend-integration/.runtime/',
    ],
    generatedTestRuntime: true,
  },
  frontend: {
    files: [
      'README.md',
      'docs/frontend-architecture.md',
      'docs/backend-contract.md',
      'docs/frontend-phase13c-capabilities.md',
      'docs/frontend-phase13c5-integration-implementation.md',
      'package.json',
      'packages/api/operations/market.graphql',
      'packages/api/src/market.ts',
      'packages/api/schema/admin.graphql',
      'packages/api/schema/shop.graphql',
      'packages/api/schema/provenance.json',
      'packages/api/src/generated/admin.ts',
      'packages/api/src/generated/shop.ts',
      'packages/ui/src/index.tsx',
      'apps/admin/src/market/MarketRoutes.tsx',
      'apps/admin/src/market/fixture.ts',
      'apps/admin/src/market/service.ts',
      'apps/admin/src/market/overview.tsx',
      'apps/admin/src/market/occurrences.tsx',
      'apps/admin/src/market/vendors.tsx',
      'apps/admin/src/market/operations.tsx',
      'apps/admin/src/market/generation-status.tsx',
      'scripts/test-live.ts',
      'scripts/check-bundles.ts',
      'vitest.config.ts',
      'tests/e2e/urls.ts',
      'scripts/audit-phase13c5.mjs',
      'playwright.config.ts',
      'playwright.live.config.ts',
      'playwright.live-market.config.ts',
      'playwright.phase13c.config.ts',
      'tests/market.test.tsx',
      'tests/market-c5.test.tsx',
      'tests/e2e/market.spec.ts',
      'tests/e2e/market-live-mock.spec.ts',
      'tests/e2e/market-live.spec.ts',
    ],
    generatedPrefixes: [
      'docs/evidence/phase13c5/',
      'apps/admin/dist/',
      'apps/storefront/dist/',
      'apps/storefront/.astro/',
      'test-results/',
    ],
  },
};
const auditOutputs = new Set([
  'backend-after.json',
  'frontend-after.json',
  'backend-diff-classification.json',
  'frontend-diff-classification.json',
  'audit-summary.json',
  'backend-status-after.txt',
  'frontend-status-after.txt',
  'backend-expected-intentional.json',
  'frontend-expected-intentional.json',
  'old-migration-hashes.json',
]);
function snapshot(name, root) {
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    });
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const absolute = join(directory, entry.name),
        path = normalize(relative(root, absolute));
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) {
        if (
          name === 'frontend' &&
          path.startsWith('docs/evidence/phase13c5/') &&
          auditOutputs.has(entry.name)
        )
          continue;
        files.push({
          path,
          bytes: statSync(absolute).size,
          sha256: hash(absolute),
        });
      }
    }
  }
  walk(root);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    name,
    path: root,
    head: git('rev-parse', 'HEAD').trim(),
    status: git('status', '--porcelain'),
    statusAll: git('status', '--porcelain', '--untracked-files=all'),
    files,
    coverage:
      'All files, including dirty/untracked/ignored/build/runtime/.git; node_modules excluded. Audit output files excluded to avoid self-reference.',
  };
}
const summary = {};
for (const name of ['backend', 'frontend']) {
  const before = JSON.parse(
    readFileSync(join(evidence, name + '-before.json'), 'utf8'),
  );
  const after = snapshot(name, before.path),
    prior = new Map(before.files.map((f) => [normalize(f.path), f]));
  const current = new Map(after.files.map((f) => [f.path, f]));
  const dirty = new Set(
    before.statusAll
      .trimEnd()
      .split('\n')
      .filter(Boolean)
      .map((line) => normalize(line.slice(3).replaceAll('"', ''))),
  );
  const afterDirty = new Set(
    after.statusAll
      .trimEnd()
      .split('\n')
      .filter(Boolean)
      .map((line) => normalize(line.slice(3).replaceAll('"', ''))),
  );
  const changed = [...new Set([...prior.keys(), ...current.keys()])]
    .filter((path) => {
      if (
        name === 'frontend' &&
        auditOutputs.has(path.split('/').at(-1)) &&
        path.startsWith('docs/evidence/phase13c5/')
      )
        return false;
      return prior.get(path)?.sha256 !== current.get(path)?.sha256;
    })
    .sort();
  const isExpected = (path) =>
    expected[name].files.includes(path) ||
    expected[name].generatedPrefixes.some((prefix) =>
      path.startsWith(prefix),
    ) ||
    (expected[name].generatedTestRuntime &&
      /^test\/[^/]+\/\.runtime\//.test(path));
  const changedSet = new Set(changed);
  const paths = [...new Set([...dirty, ...afterDirty, ...changed])].sort();
  const classification = paths.map((path) => ({
    path,
    classification: changedSet.has(path)
      ? isExpected(path)
        ? 'INTENTIONAL_PHASE13C5'
        : 'UNEXPECTED'
      : dirty.has(path)
        ? 'PRE-EXISTING'
        : isExpected(path)
          ? 'INTENTIONAL_PHASE13C5'
          : 'UNEXPECTED',
    preExistingDirty: dirty.has(path),
    change: !prior.has(path)
      ? 'added'
      : !current.has(path)
        ? 'removed'
        : changedSet.has(path)
          ? 'modified'
          : 'unchanged',
    beforeSha256: prior.get(path)?.sha256 ?? null,
    afterSha256: current.get(path)?.sha256 ?? null,
  }));
  const unexpected = classification.filter(
    (row) => row.classification === 'UNEXPECTED',
  );
  writeFileSync(
    join(evidence, name + '-after.json'),
    JSON.stringify(after, null, 2) + '\n',
  );
  writeFileSync(join(evidence, name + '-status-after.txt'), after.status);
  writeFileSync(
    join(evidence, name + '-expected-intentional.json'),
    JSON.stringify(expected[name], null, 2) + '\n',
  );
  writeFileSync(
    join(evidence, name + '-diff-classification.json'),
    JSON.stringify(
      {
        headUnchanged: before.head === after.head,
        beforeStatus: before.status,
        afterStatus: after.status,
        changedPaths: changed,
        classification,
        unexpected,
      },
      null,
      2,
    ) + '\n',
  );
  summary[name] = {
    head: after.head,
    headUnchanged: before.head === after.head,
    changedPaths: changed.length,
    counts: Object.fromEntries(
      ['PRE-EXISTING', 'INTENTIONAL_PHASE13C5', 'UNEXPECTED'].map((c) => [
        c,
        classification.filter((r) => r.classification === c).length,
      ]),
    ),
    unexpected: unexpected.map((r) => r.path),
  };
  if (name === 'backend') {
    const migrations = before.files
      .filter((f) => normalize(f.path).startsWith('src/migrations/'))
      .map((f) => ({
        path: normalize(f.path),
        beforeSha256: f.sha256,
        afterSha256: current.get(normalize(f.path))?.sha256 ?? null,
        unchanged: f.sha256 === current.get(normalize(f.path))?.sha256,
      }));
    const additions = after.files.filter(
      (f) => f.path.startsWith('src/migrations/') && !prior.has(f.path),
    );
    writeFileSync(
      join(evidence, 'old-migration-hashes.json'),
      JSON.stringify(
        {
          migrations,
          newMigrations: additions,
          allUnchanged:
            migrations.every((f) => f.unchanged) && additions.length === 0,
        },
        null,
        2,
      ) + '\n',
    );
    summary.backend.oldMigrationsUnchanged =
      migrations.every((f) => f.unchanged) && additions.length === 0;
  }
}
summary.zeroUnexpected = Object.values(summary).every(
  (v) => v.unexpected.length === 0,
);
summary.allHeadsUnchanged = Object.values(summary)
  .filter((v) => typeof v === 'object')
  .every((v) => v.headUnchanged);
mkdirSync(evidence, { recursive: true });
writeFileSync(
  join(evidence, 'audit-summary.json'),
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
if (
  !summary.zeroUnexpected ||
  !summary.allHeadsUnchanged ||
  !summary.backend.oldMigrationsUnchanged
)
  process.exitCode = 1;
