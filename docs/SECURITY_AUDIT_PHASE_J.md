# Phase J targeted backend dependency patches

November 18, 2026 · Private engineering report

The `linux/amd64` release contains Handlebars **4.7.10** and `follow-redirects` **1.16.2**, one production copy each. The account-email service, Vendure's checked-in receipt renderer, and the app's Twilio redirect policy passed focused checks in the release image. The production npm audit omitted both package entries and all six targeted advisories. [Phase G](SECURITY_AUDIT_PHASE_G.md) · [Phase I](SECURITY_AUDIT_PHASE_I.md)

## Handlebars

`@vendure/email-plugin@3.8.2 → handlebars@^4.7.9` resolves to `node_modules/handlebars`. The published parent range admits 4.7.10. This lock entry moved from 4.7.9 to 4.7.10, including the tarball URL and integrity. The patch manifest tightened its `minimist` range from `^1.2.5` to `^1.2.8`. The existing `node_modules/minimist@1.2.8` satisfies both ranges. The nested `node_modules/handlebars/node_modules/source-map@0.6.1` entry and other children required no changes. [Vendure email plugin manifest](https://registry.npmjs.org/@vendure%2Femail-plugin/3.8.2) · [Handlebars patch manifest](https://registry.npmjs.org/handlebars/4.7.10)

| Advisory | Affected range | First fix | Final audit |
| --- | --- | --- | --- |
| [GHSA-8r5x-fm3f-whwj](https://github.com/advisories/GHSA-8r5x-fm3f-whwj) | `>=4.0.0 <=4.7.9` | 4.7.10 | Cleared |
| [GHSA-p8wg-vrv2-v86f](https://github.com/advisories/GHSA-p8wg-vrv2-v86f) | `>=3.0.0 <=4.7.9` | 4.7.10 | Cleared |
| [GHSA-xw65-4hp5-5hc7](https://github.com/advisories/GHSA-xw65-4hp5-5hc7) | `>=4.0.0 <=4.7.9` | 4.7.10 | Cleared |

## Follow-redirects

The final Phase I dependency graph and release module resolution confirmed three branches. All use the same physical `node_modules/follow-redirects` entry and each parent admits 1.16.2.

| Resolved branch | Immediate parent range |
| --- | --- |
| `twilio@6.1.2 → axios@1.20.0 → follow-redirects` | `^1.16.0` |
| `square@46.0.0 → square-legacy (npm:square@39.1.1) → @apimatic/axios-client-adapter@0.3.21 → axios@1.20.0 → follow-redirects` | `^1.16.0` |
| `@vendure/core@3.8.2 → http-proxy-middleware@3.0.7 → http-proxy@1.18.1 → follow-redirects` | `^1.0.0` |

The shared lock entry moved from 1.16.0 to 1.16.2. Its version, tarball URL, and integrity were the only fields that changed. [Axios manifest](https://registry.npmjs.org/axios/1.20.0) · [HTTP proxy manifest](https://registry.npmjs.org/http-proxy/1.18.1) · [Follow-redirects patch manifest](https://registry.npmjs.org/follow-redirects/1.16.2)

| Advisory | Affected range | First fix | Final audit |
| --- | --- | --- | --- |
| [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8) | `>=1.16.0 <1.16.1` | 1.16.1 | Cleared |
| [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c) | `>=1.16.0 <1.16.1` | 1.16.1 | Cleared |
| [GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p) | `>=1.16.0 <=1.16.1` | 1.16.2 | Cleared |

## Lockfile and release

The two entries above account for the entire Phase J delta to the backend `package-lock.json`. I verified the parent ranges and public npm manifests, then refreshed the two records in place and compared the result with the Phase I working copy. The backend `package.json` and aligned Vendure 3.8.2 pins were preserved. The lockfile SHA-256 moved from `9fc232865a9a22344857a9c1972d64268478d196e5b8acd20dc80a73fa95bbab` to `4441ad1408bef7e926b66cdca7ab5ff71d0ec0a7fd4f5d939ecc14880e495066`.

The existing Dockerfile built the `release` target once after the lockfile stabilized. The temporary context contained 474 allowlisted files from the backend working tree, including the Phase I source changes, the two npm manifests, two TypeScript configs, the Dockerfile and its ignore file, and the checked-in Handlebars templates. The context contained no project secrets, environment files, registry credentials, database data, or host dependency tree. The pinned base supplied Node 24.22.3 and npm 11.19.1. The local `farmers-phase-j:candidate` image reports `linux/amd64` and ID `sha256:7bf78737da2f75243d30455909a7713d5db0339373c82bef143347f8583b9d8e`.

The inventory walked all installed package directories, including scoped and nested package directories. It checked **1,131** installed paths against npm's installed-tree metadata and the matching project lock, with zero version mismatches and zero dev-only paths. The complete inventory of the targeted packages was `node_modules/handlebars@4.7.10` and `node_modules/follow-redirects@1.16.2`. Node module resolution from the four branches above returned those same files.

The single production audit started at approximately **3:19 p.m. CST**. It used the final image and the matching lockfile mounted read-only. npm returned a complete version 2 audit report and exited 1 for remaining findings. Both targeted package entries and all six advisory IDs were absent.

## Behavior checks

| Check | Result and coverage |
| --- | --- |
| Account email | **Passed.** The compiled `CustomerAccountService.requestEmailProof()` called an in-memory sender once for `account-proof@fixture.invalid`. The harness asserted the subject `Verify your account email`, the HTML verification text, and the link to `https://accounts.fixture.invalid/account/email-verify` with the synthetic token. This ran the app's real message assembly and configured link handling, with session, persistence, and delivery stubbed. |
| Vendure template rendering | **Passed.** The release's actual `FileBasedTemplateLoader` and `HandlebarsMjmlGenerator` loaded `static/email/templates/order-confirmation/body.hbs` and its partials. With synthetic data, the patched renderer generated the expected sender, subject, receipt title, escaped customer name, order code, formatted total, and footer. This directly exercised the renderer because the account service generates its HTML separately. |
| Twilio redirect | **Passed.** The compiled `TwilioSmsAdapter.send()` constructed its usual SDK client. The harness changed only the SDK API origin to loopback and observed Axios configuration. A normal form-encoded message POST presented the synthetic Basic-auth marker and returned `ACCEPTED` with the expected SID. A second POST presented the same marker and received a 307 pointing at a second loopback origin. The app returned `FAILED / PROVIDER_REJECTED`, and the destination received zero requests. The real Twilio request inherited `allowRedirects` unset and set Axios `maxRedirects: 0` for both requests. Axios used native HTTP on this path, so this verified the existing production policy that blocks the redirect. Installed resolution and the audit verified the patched dependency separately. |

The Twilio test covers the communications SMS adapter. The phone-verification SMS transport uses the same Twilio SDK and its default redirect policy, but was not independently exercised over HTTP. The legacy Square and Vendure proxy branches were verified for installed resolution only. The current Square app path constructs the top-level `SquareClient`, which uses its fetch client. No database, migrations, real credentials, live provider traffic, email delivery, or provider setting changes were involved. A manual browser test would add no useful coverage for these checks.

The Phase J dependency findings and the Twilio redirect check no longer block the tested SMS path. Existing provider opt-in controls still govern enablement. Live delivery and callback qualification remain open.

## Commands and results

Run from the backend directory. `$context` was the temporary allowlisted build directory and `$lock` is the absolute backend lockfile path.

```powershell
npm ls axios follow-redirects handlebars --all --omit=dev --package-lock-only
docker build --platform linux/amd64 --target release --tag farmers-phase-j:candidate --progress plain $context
docker image inspect --format '{{.Id}} {{.Os}}/{{.Architecture}}' farmers-phase-j:candidate
$lock = (Resolve-Path -LiteralPath package-lock.json).ProviderPath
Get-Content -Raw test/production-hardening/phase-j-dependency-smoke.cjs | docker run --pull never --platform linux/amd64 --network none --rm -i farmers-phase-j:candidate node -
docker run --pull never --platform linux/amd64 --rm --mount "type=bind,source=$lock,target=/usr/src/app/package-lock.json,readonly" farmers-phase-j:candidate npm audit --omit=dev --json --registry=https://registry.npmjs.org/ --fetch-retries=0 --fetch-timeout=25000
node --check test/production-hardening/phase-j-dependency-smoke.cjs
git diff --check -- package-lock.json
```

The build passed `npm ci --no-audit` in the build stage, `npm ci --omit=dev --no-audit` in the runtime dependency stage, and `npm run build:server`. The separate inventory piped a Node manifest walker into `docker run --pull never --platform linux/amd64 --network none --rm -i --mount "type=bind,source=$lock,target=/phase-j-lock.json,readonly" farmers-phase-j:candidate node -` and exited 0. The focused behavior fixture exited 0 with three passes. The syntax and lockfile diff checks exited 0.
