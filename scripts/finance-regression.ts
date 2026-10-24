import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const backend = resolve('../farmers-market-platform'),
  directory = resolve('docs/financial-reporting/regression');
mkdirSync(directory, { recursive: true });
const jobs = [
  ['financial-refunds', 'paid-attribution-refund', 'run'],
  ['pos-payments', 'in-person', 'payments'],
  ['square', 'in-person', 'square'],
  ['clover', 'in-person', 'clover'],
  ['loyalty-discounts', 'in-person', 'stage-g'],
];
let next = 0;
const results: Array<{ name: string; exitCode: number }> = [];
async function worker() {
  while (next < jobs.length) {
    const [name, project, script] = jobs[next++]!,
      output = createWriteStream(resolve(directory, `${name}.log`));
    console.log(`Running guarded local ${name} regression`);
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
          APP_ENV: 'test',
          NODE_ENV: 'test',
          DB_HOST: '127.0.0.1',
          TS_NODE_TRANSPILE_ONLY: 'true',
          FRONTEND_NO_EVIDENCE: 'true',
          VENDURE_DISABLE_TELEMETRY: 'true',
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require="${resolve(backend, 'test/no-evidence.cjs').replaceAll('\\', '/')}"`,
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
await Promise.all([worker(), worker()]);
writeFileSync(
  resolve(directory, 'results.json'),
  JSON.stringify({ kind: 'CONTROLLED_LOCAL_REGRESSION', results }, null, 2) +
    '\n',
);
if (results.some((r) => r.exitCode !== 0)) process.exitCode = 1;
