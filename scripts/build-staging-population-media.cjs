/* eslint-disable @typescript-eslint/no-require-imports -- Shares the curated CommonJS inventory. */
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const catalog = require('../../farmers-market-platform/fixtures/staging-catalog-v1.json');
const inventory = require('./data/vendor-catalog-photos.cjs');
const marketPhotos = require('./willow-pexels.json');
const root = path.resolve(__dirname, '..');
const output = path.resolve(
  root,
  '../farmers-market-platform/fixtures/staging-population-media-v1.json',
);

const knownSubstitutions = {
  cap: 'tote',
  shirt: 'shirt-sage',
  sweatshirt: 'shirt-sage',
  'chicken-breast': 'chicken',
  'lip-balm': 'balm',
  cheese: 'cheese-board',
  'cinnamon-buns': 'croissant',
  'honey-light': 'honey-trio',
  'pickled-mixed': 'pickles',
};
const marketKeys = ['market-cedar'];
const keys = [
  ...new Set([
    ...marketKeys,
    ...catalog.accounts.flatMap((account) =>
      (account.products ?? []).map(
        (row) => knownSubstitutions[row.assetKey] ?? row.assetKey ?? 'greens',
      ),
    ),
  ]),
].sort();

const photos = keys.map((key) => {
  const market = marketKeys.includes(key);
  const { filename, page } = (market ? marketPhotos : inventory).find(
    (photo) => photo.key === key,
  );
  const folder = market ? 'willow' : 'catalog';
  const bytes = fs.readFileSync(
    path.join(
      root,
      '.runtime',
      market ? 'willow-photos' : 'vendor-catalog/photos',
      filename,
    ),
  );
  if (
    bytes.length > 10_000_000 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes[2] !== 255
  ) {
    throw new Error(`Invalid reviewed JPEG for ${key}`);
  }
  return {
    key,
    filename,
    folder,
    page,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    ...(key === 'shirt-sage' && {
      crop: { left: 190, top: 850, width: 760, height: 570 },
    }),
  };
});
const serialized = JSON.stringify(photos, null, 2) + '\n';
if (process.argv[2] === '--write') fs.writeFileSync(output, serialized);
else if (
  process.argv[2] !== '--check' ||
  fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== serialized
) {
  throw new Error(
    'Reviewed fixture photo files do not match the release manifest',
  );
}
console.log(`Validated ${photos.length} reviewed source photos.`);
