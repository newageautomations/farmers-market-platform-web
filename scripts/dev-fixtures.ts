import { spawn } from 'node:child_process';
const child = spawn(
  process.execPath,
  [
    'node_modules/concurrently/dist/bin/index.js',
    '-k',
    '-n',
    'storefront,admin',
    'npm run dev:storefront',
    'npm run dev:admin',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      FRONTEND_FIXTURE_MODE: 'true',
      NODE_ENV: 'development',
    },
  },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
