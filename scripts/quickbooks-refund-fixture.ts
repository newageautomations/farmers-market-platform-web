import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { localAccountEnvironment } from './local-account-environment';
const args = process.argv.slice(2);
if (
  args.some(
    (a) => !['--correct-expenses', '--inspect', '--automatic'].includes(a),
  )
)
  throw new Error('Unknown fixture option');
const child = spawn(
  process.execPath,
  [
    'node_modules/ts-node/dist/bin.js',
    '--project',
    'scripts/market-operations-demo/tsconfig.json',
    'scripts/market-operations-demo/quickbooks-fixture.ts',
    ...args,
  ],
  {
    cwd: resolve('../farmers-market-platform'),
    env: {
      ...process.env,
      ...localAccountEnvironment(
        loadEnv('development', resolve('.'), ''),
        process.env,
      ),
    },
    stdio: 'inherit',
    windowsHide: true,
  },
);
child.on('error', (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
