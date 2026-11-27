// Build the checked-in release fixture from curated definitions, without database access.
/* eslint-disable @typescript-eslint/no-require-imports -- Uses the existing CommonJS catalog generator. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildFixtureProducts } = require('./data/vendor-catalog.cjs');

// The first column is for operator review only. It is never serialized to the package.
const identities = [
  ['Manna Roots', 'fern-furrow', 'Fern & Furrow Farm', 'juice'],
  ['9-1 Produce Farm', 'golden-acre', 'Golden Acre Produce', 'produce'],
  ['Anna’s Kimchi', 'red-jar', 'Red Jar Ferments', 'kimchi'],
  ['Canyon Bakery Demo', 'morning-hearth', 'Morning Hearth Bakery', 'bakery'],
  ['Cedar Creek Produce', 'copperleaf', 'Copperleaf Produce', 'produce'],
  ['Grammies Crackers', 'little-mill', 'Little Mill Crackers', 'crackers'],
  ['Hill Country Honey Demo', 'amber-meadow', 'Amber Meadow Honey', 'honey'],
  ['Hisco Apparel', 'oakthread', 'Oakthread Goods', 'apparel'],
  ['Jake n Bake', 'butterfield', 'Butterfield Bakes', 'cookies'],
  ['Last Watch Coffee', 'early-finch', 'Early Finch Coffee', 'coffee'],
  ['Manna Tallow', 'meadowcraft', 'Meadowcraft Naturals', 'skin'],
  ['Mummy’s Macarons', 'sugar-finch', 'Sugar Finch Macarons', 'macarons'],
  ['Norma Jean’s Greens', 'greenhaven', 'Greenhaven Gardens', 'greens'],
  ['Priceless Honey', 'honeycrest', 'Honeycrest Apiary', 'honey'],
  ['Pucker Up!', 'citrus-sprig', 'Citrus & Sprig', 'pickles'],
  [
    'Showbread Catering',
    'gathered-table',
    'Gathered Table Kitchen',
    'catering',
  ],
  ['Smith Pastures', 'briarfield', 'Briarfield Ranch', 'poultry'],
  ['Sunflour & Crumb', 'wildgrain', 'Wildgrain Bakery', 'bakery'],
  ['Tamales De Reina', 'luna-masa', 'Luna Masa Kitchen', 'tamales'],
  ['Texas Wild Seafood Demo', 'blue-heron', 'Blue Heron Seafood', 'seafood'],
  ['Twice Baked Cafe', 'second-sunrise', 'Second Sunrise Cafe', 'cafe'],
  [
    'Willow & Grain Farmstead',
    'lark-grain',
    'Lark & Grain Farmstead',
    'farmstead',
  ],
  ['Cedar Bend Farm', 'briarstone', 'Briarstone Farm', 'stand'],
  ['', 'silver-meadow', 'Silver Meadow Farm', 'clean'],
  [
    'Juniper Grove Farmers Market',
    'orchard-lantern-market',
    'Orchard Lantern Market',
    'market_manager',
  ],
  [
    'Boerne Farmers Market',
    'foxglove-market',
    'Foxglove Community Market',
    'market_manager',
  ],
  [
    'Bulverde Market Day Demo',
    'stonebrook-market',
    'Stonebrook Farmers Market',
    'market_manager',
  ],
  ['', 'trial-customer-01', undefined, 'customer'],
  ['', 'trial-customer-02', undefined, 'customer'],
];

const given = [
  'Ari',
  'Maren',
  'Jules',
  'Rowan',
  'Iris',
  'Blair',
  'Ellis',
  'Nico',
];
const surnames = ['Vale', 'Reed', 'Bramwell', 'Hale'];
const taxonomy = {
  Shrimp: 'seafood.shellfish',
  Fish: 'seafood.fish',
  Shellfish: 'seafood.shellfish',
  'Honey & Spreads': 'pantry-preserves.honey-syrups',
  'Artisan Bread': 'bread-baked-goods.bread-rolls',
  Pastries: 'bread-baked-goods.pastries',
  'Baking Pantry': 'pantry-preserves.grains-flour-beans',
  'Cold-Pressed Juice': 'beverages.juices-cider',
  Coffee: 'beverages.coffee',
  'Prepared Foods': 'prepared-foods.prepared-meals',
  'Meals & Grazing': 'prepared-foods.prepared-meals',
  Microgreens: 'produce.microgreens-sprouts',
  Salsas: 'pantry-preserves.sauces-condiments',
  Tamales: 'prepared-foods.prepared-meals',
  Macarons: 'bread-baked-goods.cookies-bars',
  Chicken: 'meat-poultry.chicken',
  Eggs: 'dairy-eggs.eggs',
  'Crackers & Treats': 'bread-baked-goods.savory-baked-goods',
  'Pickled Vegetables': 'pantry-preserves.pickles-fermented-foods',
  'Fermented Vegetables': 'pantry-preserves.pickles-fermented-foods',
  Cookies: 'bread-baked-goods.cookies-bars',
  Brownies: 'bread-baked-goods.cookies-bars',
  Muffins: 'bread-baked-goods.pastries',
  'Sweet Loaves': 'bread-baked-goods.cakes-pies',
  Biscotti: 'bread-baked-goods.cookies-bars',
  'T-Shirts': 'clothing-accessories.clothing',
  Hats: 'clothing-accessories.clothing',
  Sweatshirts: 'clothing-accessories.clothing',
  'Bags & Accessories': 'clothing-accessories.bags-accessories',
  'Balms & Body Care': 'bath-body.skincare',
  'Lip Care': 'bath-body.skincare',
  Soap: 'bath-body.soaps',
  'Fresh Vegetables': 'produce.vegetables',
  'Fresh Herbs': 'produce.herbs',
  'Leafy Greens': 'produce.vegetables',
  Kimchi: 'pantry-preserves.pickles-fermented-foods',
  'Meal Kits': 'prepared-foods.prepared-meals',
  Pantry: 'pantry-preserves.jams-jellies',
};

const key = (text) =>
  text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function products(family) {
  if (family === 'clean') return [];
  if (family === 'stand') {
    return [
      {
        name: 'Seasonal Vegetable Box',
        description:
          'A mixed box of garden vegetables for roasting and salads.',
        unit: 'one 2 lb box',
        categoryName: 'Fresh Vegetables',
        price: 1250,
        stock: 24,
      },
    ];
  }
  return buildFixtureProducts(family);
}

function catalogProduct(vendorKey, family, item) {
  const id = key(item.name);
  const category = taxonomy[item.categoryName];
  assert(category, `Unreviewed taxonomy mapping for ${item.categoryName}`);
  const variant = (variantId, name, price, stock) => ({
    id: variantId,
    name,
    sku: `TRIAL-${vendorKey}-${id}-${variantId}`.toUpperCase(),
    price,
    stock,
  });
  const variants = [variant(key(item.unit), item.unit, item.price, item.stock)];
  if (family === 'farmstead' && id === 'baby-spinach-bag') {
    variants.push(variant('family-bag', '12 oz family bag', 1100, 24));
  }
  const tags =
    /kimchi|sauerkraut/i.test(item.name) &&
    category === 'pantry-preserves.pickles-fermented-foods'
      ? ['fermented']
      : [];
  return {
    id,
    slug: `${vendorKey}-${id}`,
    name: item.name,
    description: item.description,
    category,
    tags,
    collectTaxes: family === 'apparel' || family === 'skin',
    variants,
    ...(item.image && { assetKey: item.image }),
  };
}

function buildStagingCatalog() {
  const accounts = identities.map(([, id, workspaceName, family], index) => {
    const type = ['market_manager', 'customer'].includes(family)
      ? family
      : 'vendor';
    return {
      id,
      type,
      email: `${id}@fixtures.invalid`,
      firstName: given[index % given.length],
      lastName: surnames[Math.floor(index / given.length)],
      ...(workspaceName && { workspaceName }),
      ...(type === 'vendor' && {
        defaultTaxRate: family === 'clean' ? null : 0,
        products: products(family).map((item) =>
          catalogProduct(id, family, item),
        ),
      }),
    };
  });
  const fixture = {
    schemaVersion: 1,
    namespace: 'farmerlane-fictional-trial',
    revision: '2026-11-r1',
    accounts,
    cohorts: {
      trial: [
        'morning-hearth',
        'lark-grain',
        'orchard-lantern-market',
        'trial-customer-01',
      ],
      curated: accounts
        .filter((account) => account.products?.length === 18)
        .map((account) => account.id),
      scenario: ['briarstone', 'orchard-lantern-market'],
      markets: [
        'orchard-lantern-market',
        'foxglove-market',
        'stonebrook-market',
      ],
      onboarding: ['silver-meadow', 'trial-customer-02'],
    },
  };
  for (const account of accounts)
    for (const product of account.products ?? []) {
      const copy = key(JSON.stringify(product));
      assert(
        !identities.some(([source]) => source && copy.includes(key(source))),
        `Review identity text in ${product.id}`,
      );
      assert(
        !/https?:|www\.|@|\b(?:boerne|bulverde)\b/i.test(
          JSON.stringify(product),
        ),
        `Review contact or venue text in ${product.id}`,
      );
    }
  return fixture;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const bundle = `${JSON.stringify(buildStagingCatalog(), null, 2)}\n`;
  const fixture = path.resolve(
    __dirname,
    '../../farmers-market-platform/fixtures/staging-catalog-v1.json',
  );
  if (!args.length) process.stdout.write(bundle);
  else if (args.length === 1 && args[0] === '--check') {
    assert(
      fs.readFileSync(fixture, 'utf8').replace(/\r\n/g, '\n') === bundle,
      'Release fixture differs from the generated catalog',
    );
    console.log('Release fixture matches the generated catalog');
  } else if (args.length === 1 && args[0] === '--write')
    fs.writeFileSync(fixture, bundle);
  else throw new Error('Expected --check, --write, or no argument');
}

module.exports = { buildStagingCatalog };
