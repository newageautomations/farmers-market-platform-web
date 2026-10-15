import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { galleryUrl } from './ui-gallery-policy';

if (
  process.argv.length !== 3 ||
  process.argv[2] !== '--enable-local-gallery' ||
  (process.env.NODE_ENV && process.env.NODE_ENV !== 'development')
) {
  throw new Error(
    'Run: npx tsx scripts/dev-ui-gallery.ts --enable-local-gallery in a development environment.',
  );
}
process.env.NODE_ENV = 'development';
process.env.UI_COMPONENT_GALLERY = 'local-only';
const root = new URL(
  '../tests/fixtures/ui-component-gallery/',
  import.meta.url,
);
// A native child keeps the launcher's tsx loader out of Astro's module runner.
const server = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL('../node_modules/astro/bin/astro.mjs', import.meta.url),
    ),
    'dev',
    '--root',
    fileURLToPath(root),
  ],
  { stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } },
);
console.log(`UI component comparison gallery: ${galleryUrl}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.kill(signal));
}
server.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
