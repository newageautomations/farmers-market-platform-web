import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backend = resolve('../farmers-market-platform'),
  logs = resolve('docs/inPersonPayments/stageGTestLogs');
mkdirSync(logs, { recursive: true });
const mode = process.argv[2] ?? 'backend';
const jobs =
  mode === 'providers'
    ? [
        ['stage-g-final', 'in-person', 'stage-g'],
        ['stage-c-loyalty', 'in-person', 'square'],
        ['stage-d-loyalty', 'in-person', 'clover'],
        ['stage-e-loyalty', 'in-person', 'mobile'],
      ]
    : mode === 'regression'
      ? [
          ['stage-g', 'in-person', 'stage-g'],
          ['stage-a', 'in-person', 'run'],
          ['stage-b', 'in-person', 'payments'],
          ['stage-c', 'in-person', 'square'],
          ['stage-d', 'in-person', 'clover'],
          ['stage-e', 'in-person', 'mobile'],
          ['financial-refunds', 'paid-attribution-refund', 'run'],
          ['inventory-capacity', 'inventory-capacity', 'run'],
          ['native-commerce', 'marketplace-commerce', 'run'],
          ['identity', 'platform-identity', 'run'],
          ['vendor-loyalty', 'loyalty', 'run'],
          ['market-loyalty', 'market-loyalty', 'run'],
        ]
      : [['backend-loyalty', 'in-person', 'stage-g']];
if (!['backend', 'regression', 'providers'].includes(mode))
  throw new Error('Use backend or regression');
const results: Array<{ name: string; exitCode: number }> = [];
let index = 0;
async function worker() {
  while (index < jobs.length) {
    const [name, project, script] = jobs[index++]!;
    console.log(`Running ${name} with a guarded disposable database`);
    const output = createWriteStream(resolve(logs, `${name}.log`));
    const child = spawn(
      process.execPath,
      [
        '--require',
        './test/no-evidence.cjs',
        'node_modules/ts-node/dist/bin.js',
        '--project',
        `test/${project}/tsconfig.json`,
        `test/${project}/${script}.ts`,
      ],
      {
        cwd: backend,
        windowsHide: true,
        env: {
          ...process.env,
          TS_NODE_TRANSPILE_ONLY: 'true',
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require="${resolve(backend, 'test/no-evidence.cjs').replaceAll('\\', '/')}"`,
          DB_HOST: '127.0.0.1',
          FRONTEND_NO_EVIDENCE: 'true',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    const exitCode = await new Promise<number>((r, reject) => {
      child.once('error', reject);
      child.once('exit', (code) => r(code ?? 1));
    });
    await new Promise<void>((r) => output.end(r));
    results.push({ name: name!, exitCode });
    console.log(`${exitCode === 0 ? 'PASS' : 'FAIL'} ${name}`);
  }
}
await Promise.all(
  Array.from(
    { length: mode === 'regression' || mode === 'providers' ? 2 : 1 },
    worker,
  ),
);
writeFileSync(
  resolve(
    logs,
    mode === 'providers'
      ? 'providers-results.json'
      : mode === 'regression'
        ? 'regression-results.json'
        : 'backend-results.json',
  ),
  JSON.stringify({ kind: 'CONTROLLED_LOCAL_TESTS', results }, null, 2) + '\n',
);
if (results.some((r) => r.exitCode !== 0)) process.exitCode = 1;
