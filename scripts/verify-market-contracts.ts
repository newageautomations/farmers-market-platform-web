import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const files = [
  'packages/api/schema/admin.graphql',
  'packages/api/schema/shop.graphql',
  'packages/api/schema/provenance.json',
  'packages/api/src/generated/admin.ts',
  'packages/api/src/generated/shop.ts',
];
function hashes() {
  return Object.fromEntries(
    files.map((path) => [
      path,
      createHash('sha256').update(readFileSync(path)).digest('hex'),
    ]),
  );
}
const before = hashes();
function generate() {
  for (const args of [
    ['node_modules/tsx/dist/cli.mjs', 'scripts/extract-schema.ts'],
    ['node_modules/@graphql-codegen/cli/cjs/bin.js', '--config', 'codegen.ts'],
  ])
    execFileSync(process.execPath, args, { stdio: 'inherit' });
  return hashes();
}
const first = generate();
const second = generate();
const unchanged = files.every(
  (file) => before[file] === first[file] && first[file] === second[file],
);
mkdirSync('docs/evidence/phase13c', { recursive: true });
writeFileSync(
  'docs/evidence/phase13c/contract-reproducibility.json',
  JSON.stringify(
    {
      unchanged,
      before,
      first,
      second,
      backendBootstrap: false,
      databaseUse: false,
    },
    null,
    2,
  ) + '\n',
);
if (!unchanged)
  throw new Error('Market schema/codegen reproducibility failed.');
console.log('Two schema/codegen runs reproduced all five current artifacts.');
