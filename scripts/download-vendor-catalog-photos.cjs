/* eslint-disable @typescript-eslint/no-require-imports -- Uses the existing CommonJS backend image dependencies. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const r = createRequire(
  path.resolve('../farmers-market-platform/package.json'),
);
const sharp = r('sharp');
const photos = require('./data/vendor-catalog-photos.cjs');
const folder = path.resolve('.runtime/vendor-catalog/photos');
fs.mkdirSync(folder, { recursive: true });
async function download(row) {
  const file = path.join(folder, row.filename);
  if (!fs.existsSync(file)) {
    const response = await fetch(row.download, {
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw Error(`${row.key}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 10000000 || bytes[0] !== 255 || bytes[1] !== 216)
      throw Error(`Invalid JPEG: ${row.key}`);
    await sharp(bytes).metadata();
    fs.writeFileSync(file, bytes);
  }
  const metadata = await sharp(file).metadata();
  return {
    ...row,
    width: metadata.width,
    height: metadata.height,
    bytes: fs.statSync(file).size,
  };
}
(async () => {
  const rows = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < photos.length) {
        const row = photos[next++];
        rows.push(await download(row));
        console.log(`Downloaded ${row.key}`);
      }
    }),
  );
  rows.sort((a, b) => a.key.localeCompare(b.key));
  fs.writeFileSync(
    path.join(folder, 'manifest.json'),
    JSON.stringify(rows, null, 2),
  );
  console.log(`Verified ${rows.length} Pexels JPEGs`);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
