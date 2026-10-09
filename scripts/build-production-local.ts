import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { syntheticProductionEnvironment } from './production-hardening-environment';
if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
  throw new Error('FRONTEND_NO_EVIDENCE=true required');
const environment = syntheticProductionEnvironment();
for (const cwd of [process.cwd(), resolve('../farmers-market-platform')]) {
  const child = spawn(
    process.execPath,
    [process.env.npm_execpath!, 'run', 'build'],
    {
      cwd,
      windowsHide: true,
      env: { ...process.env, ...environment },
      stdio: 'inherit',
    },
  );
  if ((await new Promise((resolve) => child.once('exit', resolve))) !== 0) {
    process.exitCode = 1;
    break;
  }
}
