# Stage C testing

Qualification date: October 18, 2026, America/Chicago. All reports/logs are stored here. No screenshots, image snapshots, videos, browser traces or visual evidence were generated. Local fixtures and constructed SDK responses do not qualify an external account or physical device.

## Results by layer

The existing POS DOM browser regression also passed all 15 groups on separate ports 4372/4590 with its own .pos-browser-test manifest, including cash, original-unit refunds, simulator timeout/reload recovery and optional customer association. See STAGE_C_POS_BROWSER_REGRESSION.log. Existing manual Stage B instances were not stopped or overwritten.

| Layer                                | Actual result                                                                                     | Evidence                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| A: Stage B local simulator and cash  | PASS, 27 integration groups; Stage A also passed 22 checks                                        | STAGE_C_REGRESSION_POS_2.log, STAGE_C_REGRESSION_POS_1.log |
| B: Square adapter contracts          | PASS, 28 integration groups in a fresh guarded PostgreSQL database; zero Square API calls         | STAGE_C_SQUARE_FIXTURES.log                                |
| B: Square UI                         | PASS, 12 focused React tests                                                                      | STAGE_C_SQUARE_UI_TESTS.log                                |
| B: Square browser workflow           | PASS, five groups using real local auth/bridge, native commerce and controlled SDK fixture        | STAGE_C_BROWSER.log                                        |
| C: Actual Square Sandbox             | SKIPPED, prerequisites absent; zero provider calls and no database creation by the skipped runner | STAGE_C_SANDBOX.log                                        |
| D: Physical Terminal or phone/reader | NOT TESTED, no hardware and no authorized physical pilot                                          | STAGE_C_HARDWARE_QUALIFICATION.md                          |

Layer C is blocked by missing SQUARE_SANDBOX_OPT_IN=true, SQUARE_APPLICATION_ID, SQUARE_SANDBOX_ACCESS_TOKEN, SQUARE_ACTIVE_KEY_ID and SQUARE_ENCRYPTION_KEYS. OAuth additionally requires the application's secret and configured exact redirect. External webhook delivery requires an authorized reachable HTTPS notification URL and its subscription key. No real credentials were invented, inspected from production stores or embedded. The implemented runner is opt-in, Sandbox-only, and uses the guarded disposable database and captured test sender.

## Square contract coverage

The actual SquareClient serialization test replaces fetch locally and refuses every non-Sandbox URL. It checks confidential OAuth request serialization without ambient SQUARE_TOKEN and authenticated Terminal request/header/BigInt encoding. The remaining integration suite injects controlled SDK-schema clients directly into the actual Square adapter, services and existing native coordinators. These constructed responses are not recordings from Square and are not an external sandbox pass.

The 28 groups cover authenticated encryption/context/key rotation/missing-key failure; unpredictable one-use vendor/session OAuth state and replay; invalid/expired authorization; merchant isolation and wrong-vendor denial; refresh and revoked authorization; active USD locations; allowlisted/default/multiple devices; real native sale and original financial units; exact itemization/fallback; pending/completed/failed and lost-response original-unit refunds; stable checkout retries; exact amount/currency/location/application/reference/payment correlation; tips/split rejection; SDK webhook signatures, wrong URL/key/body/environment/merchant/resource, duplicates and out-of-order delivery; busy terminals and concurrent registers; verified cancellation and capacity release; paid-native-finalization fault recovery; multiple partial refunds; immutable SQL guards; mocked Production pairing, expiry and location rejection; mobile URLs, session return, forged/expired/replayed callbacks and server transaction/Payment verification; unresolved mismatches retaining capacity.

The production-pairing fixture switches the configured environment but supplies an injected client throughout. It makes no Production API requests. Fixture evidence is SQUARE_SDK_FIXTURE / CONTROLLED_SDK_FIXTURE, distinct from actual provider retrieval. Existing Stage A/B regressions exercise price/stock drift, customer invitations, authorization revocation and no in-person loyalty through the common boundary.

Missing app and cancellation returns are parsed without treating them as payment proof. On Android a fallback returns to the original browser route without usable evidence; iOS has no general browser confirmation that an installed app opened. The UI retains the pending operation and status check. Actual app availability prompts, OS routing, user interaction, cancellation/decline screens and correlation availability are physical qualification items, not a simulated end-to-end app pass.

## Regression results

Production bundle marker verification also passed for all 125 generated artifacts (STAGE_C_BUNDLE_CHECK.log). The Square fixture demo's guarded stop/reset was exercised successfully, removing only its own prior disposable database. A fresh fixture instance remains running for manual review; see the implementation summary for its current database and URLs.

| Suite                                                    | Result                                                                  | Log                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| Paid attribution/refunds including nested regressions    | PASS, 62 PASS groups                                                    | STAGE_C_REGRESSION_COMMERCE_1.log  |
| Native marketplace commerce including nested regressions | PASS, 47 PASS lines                                                     | STAGE_C_REGRESSION_COMMERCE_2.log  |
| Inventory capacity including nested regression checks    | PASS, 42 PASS lines                                                     | STAGE_C_REGRESSION_COMMERCE_3.log  |
| Platform identity including nested checks                | PASS, 19 PASS lines                                                     | STAGE_C_REGRESSION_IDENTITY_1.log  |
| Vendor loyalty                                           | PASS, 33 groups                                                         | STAGE_C_REGRESSION_IDENTITY_2.log  |
| Market loyalty                                           | PASS, 38 groups                                                         | STAGE_C_REGRESSION_IDENTITY_3.log  |
| Full frontend component suite                            | PASS, 43 files / 546 tests                                              | STAGE_C_FRONTEND_TESTS.log         |
| Frontend TypeScript/Astro                                | PASS, 95 Astro files, zero errors/warnings/hints                        | STAGE_C_TYPECHECK.log              |
| Backend source and in-person test TypeScript             | PASS                                                                    | STAGE_C_BACKEND_TYPES.log          |
| Frontend development-envelope build                      | PASS                                                                    | STAGE_C_FRONTEND_BUILD.log         |
| Both repositories' synthetic production builds           | PASS, frontend Astro/Vite and backend dashboard/server/worker           | STAGE_C_PRODUCTION_BUILD.log       |
| ESLint and workspace boundaries                          | PASS, nine workspace boundaries                                         | STAGE_C_LINT.log                   |
| Stage C formatting                                       | PASS                                                                    | STAGE_C_FORMAT.log                 |
| Full repository formatting                               | Existing unrelated packages/ui/package.json warning                     | STAGE_C_LINT.log                   |
| Backend production dependency audit                      | 33 findings outside the Square closure: 3 critical, 24 high, 6 moderate | STAGE_C_DEPENDENCY_AUDIT.json      |
| Resolved Square dependency closure review                | 66 nodes, no matching advisory nodes in this audit                      | STAGE_C_SDK_DEPENDENCY_REVIEW.json |

PASS-line totals include nested regression groups where stated and are not independent individual test counts. Successful disposable databases were dropped by their creating harness. Failed diagnostic databases may be retained by existing harness policy. No test targeted vendure or vendure_demo_market_ops.

The PostgreSQL fixture driver emits its existing concurrent-query deprecation warning. Builds retain the existing large-chunk warning. ESLint emits the existing JSX AST resolver diagnostic while completing successfully. Full lint's only remaining formatting warning belongs to the already-modified shared UI manifest, which this feature leaves intact. No tests were weakened to suppress diagnostics or change native authority. The SDK audit is advisory-only; no automatic broad dependency upgrade was attempted.

An initial direct backend build under APP_ENV=test was correctly refused because dashboard builds set production NODE_ENV. The existing build:production-local helper was then used with strong ephemeral synthetic keys, a build-only database name and disabled external effects. Both full builds passed without bootstrapping a database. Earlier browser harness failures were corrected to use existing management settings navigation, Stage C's separate ports, the native select outer control and the checkbox's complete clickable label. The passing tests measure the existing shared contracts without changing shared component styling.

## DOM, accessibility and spacing

The browser suite signs in through the real account page/bridge, follows Settings to Payment Integrations, adds a virtual failure device, completes a fixture Square sale and refunds an original unit in existing Orders. At 1280, 768 and 390 pixels it inspects settings, add-terminal, payment, receipt and refund layouts. Assertions cover shared Card padding, at least 24px section/footer separation, shared action gaps of 12.8px, 44px clickable controls including checkbox labels, responsive Dialog padding (32px desktop, about 23px tablet, 16px mobile), focus inside the modal, reduced-motion preference, no page/dialog horizontal overflow, and zero serious/critical axe violations. No browser image, video or trace configuration is enabled. Human visual acceptance remains manual.

## Reproduce locally

From E:\coding\farmers-market-platform-web with local PostgreSQL available:

```powershell
$env:APP_ENV = 'test'
$env:NODE_ENV = 'test'
$env:FRONTEND_FIXTURE_MODE = 'false'
$env:FRONTEND_NO_EVIDENCE = 'true'
npm run test:pos:square
npm run test:pos:square-browser
npm run test:pos:backend
npm run test:pos:payments
npm test
npm run typecheck
npm run lint
npm run build:production-local
```

The Stage A/B DOM browser regression can be run separately with npm run test:pos:browser. If a manual Stage B session occupies its default ports, set POS_DEMO_ADMIN_PORT=4590 and POS_DEMO_STOREFRONT_PORT=4372 in the test process environment, then run the command. It uses an independent .pos-browser-test runtime manifest. Do not stop an existing user's manual session. Clear those port overrides before starting a normal demo. The Square browser suite uses separate default ports 4370/4588.

Backend regression commands from E:\coding\farmers-market-platform, with DB_HOST=127.0.0.1 and the same no-evidence environment:

```powershell
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/paid-attribution-refund/tsconfig.json test/paid-attribution-refund/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/marketplace-commerce/tsconfig.json test/marketplace-commerce/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/inventory-capacity/tsconfig.json test/inventory-capacity/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/platform-identity/tsconfig.json test/platform-identity/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/loyalty/tsconfig.json test/loyalty/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/market-loyalty/tsconfig.json test/market-loyalty/run.ts
npx tsc --noEmit
npx tsc --noEmit --project test/in-person/tsconfig.json
```

Actual Sandbox instructions and credentials are intentionally separate in [setup](STAGE_C_SQUARE_SETUP.md). Run npm run test:pos:square-sandbox only with the documented explicit opt-in. Physical testing must follow [hardware qualification](STAGE_C_HARDWARE_QUALIFICATION.md), with separate authorization before any Production financial effects.
