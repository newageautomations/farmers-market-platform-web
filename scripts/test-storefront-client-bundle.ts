import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'vite';

async function verifyClientBundle() {
  const builtins = new Set(
    builtinModules.map((name) => name.replace(/^node:/, '')),
  );
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'reject-server-dependencies-in-hydrated-cart',
        enforce: 'pre',
        resolveId(source, importer) {
          if (source.startsWith('node:') || builtins.has(source))
            throw new Error(
              `Server-only dependency ${source} imported by ${importer}`,
            );
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve('apps/storefront/src/components/ResilientSurfaces.tsx'),
        formats: ['es'],
      },
    },
  });
  const bundles = (Array.isArray(result) ? result : [result]).flatMap(
    (bundle) => ('output' in bundle ? bundle.output : []),
  );
  const chunks = bundles.filter((output) => output.type === 'chunk');
  assert.ok(chunks.length > 0);
  assert.ok(chunks.some((chunk) => chunk.code.includes('VendorCart')));
  for (const chunk of chunks)
    assert.ok(!chunk.code.includes('__vite-browser-external'));
}
await verifyClientBundle();
console.log(
  'Cart hydration bundle contains no Node builtins or browser externalization stubs.',
);
