import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

// Local fixture only. All Shop and Stripe responses are simulated; no DB/provider writes.
const server = await createServer({
  configFile: false,
  server: { host: '127.0.0.1', port: 0 },
  appType: 'custom',
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'react',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      'graphql',
      'konva',
      'libphonenumber-js/max',
      'react-konva',
      'zod',
    ],
  },
});
server.middlewares.use((request, response, next) => {
  if (request.url?.split('?')[0] !== '/') return next();
  response.setHeader('Content-Type', 'text/html');
  response.end(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/preparation-preview.tsx"></script></body></html>',
  );
});
await server.listen();
const address = server.httpServer!.address();
if (!address || typeof address === 'string')
  throw new Error('Local fixture unavailable');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({
  headless: true,
  channel: existsSync(chromium.executablePath()) ? undefined : 'msedge',
});
try {
  await mkdir('docs/evidence/market-preparation', { recursive: true });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  for (const manager of [false, true]) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/${manager ? '?manager' : ''}`);
      await page.getByRole('region', { name: 'Boerne market' }).waitFor();
      assert.equal(
        await page.getByRole('link', { name: 'Back to market date' }).count(),
        0,
      );
      const checklist = page.getByRole('region', {
        name: manager
          ? 'Market preparation checklist'
          : 'Your preparation checklist',
      });
      await checklist
        .getByRole('button', { name: 'Create template' })
        .waitFor();
      const layout = await page.evaluate(() => {
        const cards = [
          ...document.querySelectorAll<HTMLElement>('.preparation-card'),
        ];
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlap: cards.some((c, i) =>
            cards.slice(i + 1).some((other) => {
              const a = c.getBoundingClientRect(),
                b = other.getBoundingClientRect();
              return (
                a.left < b.right &&
                b.left < a.right &&
                a.top < b.bottom &&
                b.top < a.bottom
              );
            }),
          ),
          padding: cards.map((c) =>
            parseFloat(getComputedStyle(c).paddingLeft),
          ),
          alignment: [
            ...document.querySelectorAll('.preparation-facts > div'),
          ].map((row) => {
            const dt = row.querySelector('dt')!.getBoundingClientRect();
            const dd = row.querySelector('dd')!.getBoundingClientRect();
            return Math.abs(dt.top + dt.height / 2 - (dd.top + dd.height / 2));
          }),
        };
      });
      assert.equal(layout.overflow, false);
      assert.equal(layout.overlap, false);
      assert(layout.padding.every((p) => p >= 16));
      assert(layout.alignment.every((offset) => offset < 1));
      await page.screenshot({
        path: `docs/evidence/market-preparation/${manager ? 'manager' : 'vendor'}-${width}.png`,
        fullPage: true,
      });
      console.log(JSON.stringify({ manager, width, ...layout }));
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
