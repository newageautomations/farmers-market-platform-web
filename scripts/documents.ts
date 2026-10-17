import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { localAccountEnvironment } from './local-account-environment';
const action = process.argv[2];
const scripts: Record<string, string> = {
  up: 'documents:scanner:up',
  stop: 'documents:scanner:stop',
  health: 'documents:scanner:health',
  logs: 'documents:scanner:logs',
  update: 'documents:scanner:update',
  configure: 'documents:configure',
  test: 'test:documents',
  unit: 'test:documents:unit',
  live: 'test:documents:live',
  demo: 'demo:documents',
  notifications: 'notifications:check',
};
if (!action || !scripts[action] || !process.env.npm_execpath)
  throw new Error('Use a documented documents npm command.');
const child = spawn(
  process.execPath,
  [
    process.env.npm_execpath,
    '--prefix',
    resolve('../farmers-market-platform'),
    'run',
    scripts[action],
    ...process.argv.slice(3),
  ],
  {
    stdio: 'inherit',
    windowsHide: true,
    env:
      action === 'demo'
        ? {
            ...process.env,
            ...localAccountEnvironment(
              loadEnv('development', process.cwd(), ''),
              process.env,
            ),
          }
        : process.env,
  },
);
child.on('error', () => {
  console.error('Could not start sibling backend document tooling.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
