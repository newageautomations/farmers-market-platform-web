// Keep the persistent demo's database and network guards in the backend runner.
// Its environment allowlist omits ENABLE_LOYALTY, so prepare the validated
// configuration before that runner loads it again from the module cache.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const backendRoot = path.resolve(__dirname, '../../farmers-market-platform');
const backend = createRequire(path.join(backendRoot, 'package.json'));
assert.ok(['serve', 'worker'].includes(process.argv[2]));
backend('ts-node').register({
  project: path.join(backendRoot, 'scripts/market-operations-demo/tsconfig.json'),
});
const environment = backend('./scripts/market-operations-demo/environment.ts');
const env = environment.loadDemoEnvironment();
environment.assertDemoEnvironment(env);
assert.equal(env.DB_NAME, 'vendure_demo_market_ops');
assert.equal(env.ENABLE_PAID_ATTRIBUTION, 'true', 'Loyalty requires local account attribution');
environment.installDemoEnvironment(env);
process.env.ENABLE_LOYALTY = 'true';
backend('./src/vendure-config.ts');
const { MarketplaceCommercePlugin } = backend('./src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts');
assert.equal(MarketplaceCommercePlugin.options.loyalty, true);
console.log('Vendor loyalty enabled for the guarded local demo runtime.');
backend('./scripts/market-operations-demo/run.ts');
