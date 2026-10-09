/** Phase 13C audit. Reads backend bytes only, including ignored runtime/build/env files. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(
  process.env.BACKEND_REFERENCE_PATH ?? '../farmers-market-platform',
);
const evidence = resolve('docs/evidence/phase13c');
mkdirSync(evidence, { recursive: true });
function git(args: string[]) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
}
function walk(
  relative = '',
): { path: string; bytes: number; sha256: string }[] {
  return readdirSync(join(root, relative), { withFileTypes: true }).flatMap(
    (entry) => {
      // Installed dependencies are read-only references, never command working directories.
      if (entry.name === 'node_modules') return [];
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return walk(path);
      if (!entry.isFile()) throw new Error(`Unsupported audit entry: ${path}`);
      const bytes = readFileSync(join(root, path));
      return [
        {
          path,
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        },
      ];
    },
  );
}
const snapshot = {
  root,
  head: git(['rev-parse', 'HEAD']).trim(),
  status: git(['status', '--porcelain=v1']),
  statusAll: git(['status', '--porcelain=v1', '--untracked-files=all']),
  files: walk().sort((a, b) => a.path.localeCompare(b.path)),
};
const baseline = process.argv.includes('--baseline');
const name = baseline ? 'before' : 'after';
writeFileSync(
  join(evidence, `backend-${name}.json`),
  JSON.stringify(snapshot, null, 2) + '\n',
);
writeFileSync(join(evidence, `backend-status-${name}.txt`), snapshot.status);
if (!baseline) {
  const before = JSON.parse(
    readFileSync(join(evidence, 'backend-before.json'), 'utf8'),
  ) as typeof snapshot;
  const old = new Map(before.files.map((file) => [file.path, file.sha256]));
  const current = new Map(
    snapshot.files.map((file) => [file.path, file.sha256]),
  );
  const changed = [...new Set([...old.keys(), ...current.keys()])].filter(
    (path) => old.get(path) !== current.get(path),
  );
  const result = {
    phase: '13C',
    unchanged:
      before.root === root &&
      before.head === snapshot.head &&
      before.status === snapshot.status &&
      before.statusAll === snapshot.statusAll &&
      changed.length === 0,
    headUnchanged: before.head === snapshot.head,
    statusUnchanged: before.status === snapshot.status,
    statusAllUnchanged: before.statusAll === snapshot.statusAll,
    beforeFiles: before.files.length,
    afterFiles: snapshot.files.length,
    changed,
    coverage:
      'All backend files including .git and ignored env/build/runtime/evidence; excludes installed node_modules directories. No backend writes or Git index refresh.',
  };
  writeFileSync(
    join(evidence, 'backend-verification.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  if (!result.unchanged)
    throw new Error(
      'Backend read-only verification FAILED. Preserve pre-existing work and inspect the evidence.',
    );
  console.log(
    `Backend unchanged: ${snapshot.files.length} SHA-256 records, identical HEAD and porcelain statuses.`,
  );
} else
  console.log(
    `Backend baseline: ${snapshot.files.length} SHA-256 records; status preserved in frontend evidence.`,
  );
