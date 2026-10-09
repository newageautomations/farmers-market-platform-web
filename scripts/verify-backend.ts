import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
if (process.argv.includes('--read-only')) {
  await import('./verify-market-backend');
  process.exit(0);
}
type FileRecord = { path: string; sha256: string; bytes: number };
type Snapshot = {
  name: string;
  path: string;
  status: string | string[];
  statusAll: string | string[];
  files: FileRecord[];
  head: string;
};
type Plan = { files: string[]; directories: string[] };
const evidence = resolve(
  process.env.BACKEND_EVIDENCE_DIR ?? 'docs/evidence/phase13b5',
);
const intended = JSON.parse(
  readFileSync(join(evidence, 'intended-changes.json'), 'utf8'),
) as { backend: Plan; frontend: Plan };
const outputs = [
  'backend-after.json',
  'frontend-after.json',
  'backend-status-after.txt',
  'frontend-status-after.txt',
  'diff-classification.json',
  'backend-verification.json',
];
for (const name of outputs)
  if (!existsSync(join(evidence, name)))
    writeFileSync(join(evidence, name), '');
function git(root: string, args: string[]) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
}
function inspect(name: 'backend' | 'frontend', root: string) {
  const before = JSON.parse(
    readFileSync(join(evidence, `${name}-before.json`), 'utf8').replace(
      /^\uFEFF/,
      '',
    ),
  ) as Snapshot;
  if (resolve(before.path).toLowerCase() !== resolve(root).toLowerCase())
    throw new Error(`Wrong ${name} baseline root`);
  const paths = [
    ...new Set(
      git(root, [
        'ls-files',
        '--cached',
        '--others',
        '--exclude-standard',
        '-z',
      ])
        .split('\0')
        .filter(Boolean),
    ),
  ].sort();
  const self = new Set(
    name === 'frontend'
      ? outputs.map((file) => `docs/evidence/phase13b5/${file}`)
      : [],
  );
  const files: FileRecord[] = paths
    .filter((path) => !self.has(path))
    .map((path) => {
      const bytes = readFileSync(join(root, path));
      return {
        path,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length,
      };
    });
  const old = new Map(
      before.files.map((file) => [file.path.replaceAll('\\', '/'), file]),
    ),
    current = new Map(files.map((file) => [file.path, file]));
  const all = [...new Set([...old.keys(), ...paths])].sort(),
    plan = intended[name];
  const changes = all
    .filter(
      (path) =>
        self.has(path) || old.get(path)?.sha256 !== current.get(path)?.sha256,
    )
    .map((path) => ({
      path,
      classification:
        plan.files.includes(path) ||
        plan.directories.some((directory) => path.startsWith(directory))
          ? 'INTENTIONAL'
          : 'UNEXPECTED',
      kind: !old.has(path)
        ? 'ADDED'
        : !current.has(path)
          ? 'DELETED'
          : 'MODIFIED',
      before: old.get(path) ?? null,
      after: current.get(path) ?? null,
      ...(self.has(path)
        ? {
            afterHashNote:
              'Audit output is intentionally excluded from its own recursive hash manifest.',
          }
        : {}),
    }));
  const statusLines = Array.isArray(before.statusAll)
    ? before.statusAll
    : before.statusAll.split(/\r?\n/);
  const preExistingDirty = statusLines.filter(Boolean).map((line) => ({
    status: line.slice(0, 2),
    path: line.slice(3).replaceAll('\\', '/'),
    classification: 'PRE-EXISTING',
  }));
  const after = {
    name,
    path: root,
    head: git(root, ['rev-parse', 'HEAD']).trim(),
    status: git(root, ['status', '--porcelain=v1']).trimEnd(),
    statusAll: git(root, [
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
    ]).trimEnd(),
    files,
    selfReferentialAuditOutputs: [...self],
  };
  if (after.head !== before.head)
    throw new Error(`${name} HEAD changed unexpectedly`);
  const migrations = before.files.filter((file) =>
    file.path.startsWith('src/migrations/'),
  );
  if (migrations.some((file) => current.get(file.path)?.sha256 !== file.sha256))
    throw new Error('An existing migration changed');
  writeFileSync(
    join(evidence, `${name}-after.json`),
    JSON.stringify(after, null, 2) + '\n',
  );
  writeFileSync(
    join(evidence, `${name}-status-after.txt`),
    after.status + '\n',
  );
  return {
    root,
    beforeFiles: before.files.length,
    afterFiles: paths.length,
    headUnchanged: true,
    existingMigrationsVerified: migrations.length,
    changes,
    preExistingDirty,
    unexpected: changes.filter(
      (change) => change.classification === 'UNEXPECTED',
    ),
    unchangedBaselineFiles: before.files.filter(
      (file) => current.get(file.path)?.sha256 === file.sha256,
    ).length,
  };
}
const backend = inspect(
  'backend',
  resolve(process.env.BACKEND_REFERENCE_PATH ?? '../farmers-market-platform'),
);
const frontend = inspect('frontend', process.cwd());
const result = {
  phase: '13B.5',
  backend,
  frontend,
  unexpectedCount: backend.unexpected.length + frontend.unexpected.length,
  note: 'Expected local API and integration changes are authorized. Pre-existing work is preserved and classified separately. This phase does not claim that the backend is unchanged.',
};
writeFileSync(
  join(evidence, 'diff-classification.json'),
  JSON.stringify(result, null, 2) + '\n',
);
writeFileSync(
  join(evidence, 'backend-verification.json'),
  JSON.stringify(
    {
      expectedDiffOnly: result.unexpectedCount === 0,
      unexpectedCount: result.unexpectedCount,
      backendChanges: backend.changes.length,
      frontendChanges: frontend.changes.length,
      existingMigrationsUnchanged: true,
      headsUnchanged: true,
    },
    null,
    2,
  ) + '\n',
);
if (result.unexpectedCount)
  throw new Error(
    `Unexpected changes: ${[...backend.unexpected, ...frontend.unexpected].map((change) => change.path).join(', ')}`,
  );
console.log(
  `Expected local diffs verified: ${backend.changes.length} backend files, ${frontend.changes.length} frontend files; zero unexpected changes.`,
);
