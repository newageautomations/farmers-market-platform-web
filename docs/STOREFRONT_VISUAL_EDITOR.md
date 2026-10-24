# Storefront visual editor

Implemented locally for vendor storefronts. No deployment, remote Git changes, persistent database migration, seed, account edit, or fixture adjustment was performed. The existing populated `vendure_demo_market_ops` database was not changed.

## Implementation and interface

`/vendor/storefront` now opens a visual settings editor inside the existing dashboard shell. It replaces the vendor sample preview and long administrative form. The market appearance editor retains its existing behavior.

The toolbar contains dashboard navigation, the storefront name, a page selector, draft status, Save draft, Publish saved changes, and View live storefront. Existing business and storefront selectors remain available. Editor entry and exit preserve the selected channel across full document navigation.

The sidebar shows the fixed homepage structure: Header, Hero, Featured products, About, Final shopping invitation, and Footer. Hidden About content is identified. Selecting a section opens its supported settings; Page sections and Collapse settings return to the structure. Theme settings has a separate view. Other page content is identified as read-only, with shared header, footer and theme settings available.

Inspection mode selects real sections and shows an outline and name. Sidebar selection scrolls the corresponding section into view. Browse mode follows supported storefront links while blocking purchases, account actions and unsupported destinations. Sidebar controls provide keyboard access independently of pointer inspection. Reduced motion is respected for selection scrolling.

Undo and Redo keep up to 50 local edit states and reset after a successful save or publish. Unsaved edits are guarded during navigation, refresh, browser back, business switching, storefront switching and logout, using the application's existing native-confirmation pattern. Expanded preview can be restored with its control or Escape.

## Actual-storefront rendering

The isolated iframe loads `/storefront-editor-preview/` on the vendor's canonical storefront origin. This bootstrap contains public identity and bridge code, without private draft data or credentials.

The authenticated admin API issues a random, 256-bit, five-minute preview capability for an owned, active vendor storefront. The editor sends that capability and its validated current configuration to the frame through exact-origin, exact-window `postMessage` messages. The frame submits a same-origin POST to `/storefront-editor-preview/render`.

The render endpoint validates the bounded body and configuration, verifies the capability through the configured backend admin API, and matches its storefront ID to normal hostname resolution. It then uses Astro's internal GET rewrite to the existing homepage, product listing, product detail or About route. Request-local configuration overrides the published configuration only for this authorized render. The original pages, SiteLayout, HarvestHeader, HarvestHero, VendorHome, ProductCards, ProductPurchase, HarvestFooter, CSS and public commerce reads remain authoritative. No React website imitation, alternate product-card markup, new data store or Astro rebuild is involved.

The initial POST navigation, rather than a copied HTML canvas, preserves Astro's actual styles, runtime scripts, islands and per-response CSP. The preview body is still SSR, with existing islands used where already appropriate.

## Unsaved live updates

Validated messages update actual text nodes, approved theme variables, button hover mode, typography, hero/About shapes and image alternative text in place. Stable `vendor.text` identifiers address individual labels without replacing button or section markup. The same shared text defaults and token generator are used by the public templates.

Product selections/order, image replacement, visibility, legacy story changes, full About content and page navigation use a 300 ms debounced POST to the actual Astro renderer. Initial rendering is immediate. Styling changes do not reload the catalog. Re-rendering retains the selected section and same-page scroll position where practical. The parent holds current unsaved state during navigation, so a render completed while the user continues typing receives the latest state on its ready handshake.

Invalid intermediate configurations remain editable and show validation feedback; the frame retains the last valid preview until the input is valid. Unsaved state and the capability are not stored in localStorage, public URLs, a database, analytics or public projections.

## Security and isolation

- Grant issuance requires existing vendor storefront ownership and permission checks. Market grants and cross-vendor issuance are rejected.
- The backend stores only capability hashes and a request-context snapshot in a bounded, process-local map. Every server render rechecks current membership, permissions, active storefront scope, expiry, host and featured-product ownership/channel eligibility.
- Capability verification returns only the authorized storefront ID. It does not return a saved draft. Knowing a query flag or visiting the bootstrap cannot read unpublished content.
- The capability travels through trusted messages and a POST body, never a URL, referrer or rendered HTML. The server serializes only validated presentation state into escaped JSON.
- Parent and child check message origin, source window, protocol, page allowlist, section identities and configuration. Arbitrary HTML, CSS, script and external button destinations remain unsupported.
- Preview responses are private/no-store, noindex/nofollow and strict-origin referrers. Only preview responses permit the configured admin origin as a frame ancestor. Public responses retain `X-Frame-Options: DENY` and their original CSP.
- Production preview CSP blocks network connections and nested frames; development permits only the exact local HMR WebSocket, restricts form submission to the render endpoint, and permits the existing Astro scripts. Development responses hash their exact inline Astro runtime scripts because Astro development does not emit the production CSP hashes. Executable `unsafe-inline` is not enabled.
- The iframe sandbox allows scripts, same-origin rendering and the required preview POST form. It does not permit popups, top navigation or downloads. Browsing cannot leave the authorized route allowlist.
- Preview Shop API requests omit incoming customer cookies. Product detail preview skips customer/session bootstrap. Capture-phase inspection/browsing guards block business actions, the shared `shopCall` bridge rejects preview calls, and CSP blocks client API connections. Native preview commerce buttons keep their existing design and markup.
- Grants renew shortly before expiry through the authenticated editor session. An expired frame clears private HTML; reconnecting obtains a new capability. Backend restarts invalidate its process-local capabilities. A grant is a narrowly scoped bearer capability until expiry; logout removes the mounted frame, while existing issued grants expire within five minutes.

For the existing production admin wrapper, `STOREFRONT_PREVIEW_ORIGINS` is an explicit comma-separated list of exact HTTPS storefront origins. Only a full-document `/vendor/storefront` response receives those `frame-src` entries. Other admin responses retain `frame-src 'none'`. `ADMIN_ORIGIN` supplies the exact permitted parent origin on the storefront server. No hosting settings or deployment were changed. The local demo uses its existing origins and does not require this production allowlist.

## Supported settings

| Area                      | Editable settings                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header                    | Existing Shop and About navigation labels, on desktop and mobile. Business identity, account and cart behavior remain protected.                                        |
| Hero                      | Heading, introduction, image URL, image shape, primary Shop label and conditional About button label. Destinations remain `/products` and `/about`.                     |
| Featured products         | Heading, collection link label, automatic collection or up to three owned eligible products in ordered slots, with the existing product search and duplicate exclusion. |
| Homepage About            | Visibility, heading, short blurb, image URL, image shape, image description and conditional story link label.                                                           |
| Final shopping invitation | Heading, supporting copy and shopping button label, with the existing collection destination.                                                                           |
| Footer                    | Tagline, collection label and conditional story label. Business identity, account navigation and platform attribution remain shared and protected.                      |
| Theme                     | Harvest only, existing four palettes, five system-font pairings, button shape and hover effect. Card corners continue following the existing shape token.               |

Text uses bounded, backward-compatible optional `vendor.text` keys: labels are at most 80 characters, headings 160, footer tagline 200 and invitation copy 600. Blank values retain the previous template defaults. Existing safe-image validation is retained. No featured supporting-copy field is invented because that component has no existing supporting text.

Existing full About page enable/title/content controls remain in an explicitly named disclosure under Theme settings. This preserves the previous editor's capability without introducing a new About-page canvas. Homepage About and full About content remain independent.

Old documents without vendor settings or text keys retain their defaults. When adopting vendor settings for an older homepage story, optional `aboutUseLegacyStory` preserves the entire original story, including content longer than the newer 600-character short-blurb limit. Editing the dedicated short blurb opts into that content. Existing legacy text remains stored; automatic migration or truncation is not performed.

## Pages and viewports

- Homepage supports full section editing.
- Existing product listing and eligible product-detail examples use their original routes. An owned public product can be selected as the detail example, or opened from an actual product card.
- About is available when enabled in current editor state. Other page-specific content remains read-only apart from the preserved full About settings disclosure.
- Shared header/footer/theme edits apply while viewing every supported page.
- Desktop uses the available frame width with a 1024 px minimum, tablet uses 768 px, and mobile uses 390 px. The browser runs actual storefront media queries; no screenshot or scaled desktop page is used. Small editor areas can scroll horizontally to inspect wider viewports.
- Expanded preview provides more desktop space while retaining settings. At narrow admin widths the sidebar and preview stack.

## Draft and publish behavior

The existing storefront-owned JSON document, API and optimistic version remain authoritative. Opening or refreshing loads the saved private draft. Editing and previewing make no persistence calls. Save draft writes the validated current state using the current version. Publishing is disabled while unsaved edits exist and calls the existing publish operation with only the saved storefront ID and version. Successful publish feedback is explicit.

Concurrent edits continue producing the existing stale-version conflict. Failed saves retain local edits. The editor advises copying changes before reloading a newer saved draft. Public hostname resolution continues returning only the last published projection.

## Reuse and local files

The main feature composition is `apps/admin/src/VisualStorefrontEditor.tsx`, selected by the existing `StorefrontAppearance.tsx` entry point. Existing typography, image-shape and product controls are exported/reused. Its layout rules extend the existing appearance stylesheet. It introduces no UI library, design system, general DOM editor or shared primitive.

New Astro files are `components/EditorBridge.astro`, `lib/editor-preview-client.ts`, `lib/editor-preview-server.ts`, and `pages/storefront-editor-preview/{index.astro,render.ts}`. SiteLayout and middleware supply the protected context and response policy. Existing home/header/footer templates gain shared text bindings; ProductCards is reused unchanged. The common shop bridge and request-local Shop transport enforce preview safety, with product-detail bootstrap suppressed during preview.

`packages/theme/src/storefront.ts` defines the typed section/text contract and compatible validation. The API appearance adapter adds grant issuance and product example slugs. AdminApp/AdminShell/AccountModes preserve business context and unsaved-exit behavior; the normal shell View Storefront action remains a published URL. `scripts/serve-admin.ts` scopes the optional production frame allowlist. Admin schema/type snapshots were regenerated from backend source without database introspection.

Backend changes are narrowly scoped to the existing `storefront-appearance-config.ts`, `api/storefront-appearance.ts`, `services/storefront-appearance.service.ts`, and its targeted test. They add optional text/legacy compatibility, grant issuance/validation and eligible product slugs. No entity or database migration was added. Central component reuse guidance is updated in `COMPONENT_USAGE_GUIDE.md`.

## Automated verification

Completed without browser automation, screenshots, visual captures or external services:

- 40 focused DOM/unit tests across six files passed for appearance persistence, section selection, individual labels, global options, trusted-origin/window messaging, actual DOM text/token patches without replacing component markup, guarded script hoisting, debounced navigation, page examples, viewport state, undo/redo, unsaved exits, conflict retention, legacy story preservation and common commerce rejection, plus existing storefront/market boundaries.
- HTTP-only Astro qualification using temporary loopback servers and deterministic in-memory public data: real templates/cards, all editable labels, product ordering, unsaved configuration, consistent theme on homepage/listing/detail/About, large Unicode content, escaping, unchanged public output, no token in HTML, script hashes/CSP, private headers and invalid/cross-host/path/origin rejection. Existing market/homepage checks also pass.
- Existing guarded backend appearance qualification on a new disposable PostgreSQL database: persistence/publish, saved/public separation, stale versions, ownership, current/revoked permissions, featured-product validation, capability host scope/expiration and anonymous grant denial. The successful isolated database was dropped by its guard.
- Web TypeScript/Astro checks, focused ESLint/formatting, package boundaries, source schema extraction/code generation, local storefront/admin builds and backend dashboard/server/worker build.

Initial sandboxed loopback/database connections were denied by the execution sandbox. The same narrowly scoped checks subsequently passed with approved local execution. Existing bundle-size advisories and a PostgreSQL client deprecation warning remain; they were not expanded into unrelated work. Web TypeScript and Astro completed with zero errors/warnings/hints. Focused lint, formatting and package boundaries passed. Both repositories' local builds passed.

Useful focused reruns from the web project:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/storefront-appearance.test.tsx tests/storefront-refinement.test.tsx tests/storefront-visual-editor.test.tsx tests/storefront-preview-bridge.test.ts tests/storefront.test.tsx tests/market-storefront.test.tsx
npm run test:storefront:homepage
npm run typecheck
```

Backend qualification from `E:\coding\farmers-market-platform`:

```powershell
$env:NODE_ENV = 'test'
npm run test:storefront:appearance
```

This command creates a guarded disposable database. Do not substitute the persistent demo database.

## Exact manual evaluation

No new migration or fixture command is needed for this feature. Do not reset, reseed or run migrations merely to try the editor. Restart existing development processes normally to load the backend GraphQL additions and frontend code. If processes are stopped, run each applicable command in its own terminal from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Sign in as `homepage.vendor@example.test` using the existing local-only `demoPassword` reference in backend `scripts/market-operations-demo/environment.ts`. Use the dedicated design account. Do not change Manna Roots or other established accounts.
2. Open `http://localhost:4322/vendor/storefront`. Confirm the selected business/storefront name and actual homepage match `http://homepage-vendor.localhost:4321/`. Record existing draft/published values before deliberately saving test changes.
3. In inspection mode click the real hero. Edit heading, introduction and each button label. Confirm text updates before saving. Use Theme settings to change palette, fonts, shape and hover. Change hero shape and image. Confirm real cards follow the existing corner tokens.
4. Select Featured products. Choose up to three dedicated eligible products, change ordered slots and try an explicit empty collection. Confirm the actual product names, prices, imagery and cards appear after the brief structural render.
5. Select About. Edit its short blurb, heading, image/shape/description and story button label. Enable/hide the section. If the draft uses a legacy story, confirm the full original text survives a font-only change. The full About page controls are separately disclosed in Theme settings.
6. Edit the final invitation and header/footer labels. Switch to listing, a product detail example and enabled About. Confirm the real shared header/footer and global styling across pages; other page content is read-only.
7. Try desktop, tablet, mobile and expanded preview. Use Browse pages to inspect the actual mobile Menu and product links. Try Add to cart, account and checkout destinations. Expect blocked-action feedback and no cart/order/payment mutation. Use View live storefront for deliberate purchasing tests.
8. With unsaved edits, inspect the public URL in another tab. It must still show the previous published configuration. Try Undo/Redo, another storefront/business and leaving the editor; cancel the discard prompt to retain edits.
9. Save draft. Refresh the editor and confirm that saved draft reloads while the public URL remains unchanged. Then, only when deliberately ready to change this dedicated account's published configuration, choose Publish saved changes and verify the public URL. Restore recorded test values through the UI if needed.
10. Open the same storefront in two editor tabs. Save in one, then attempt a save in the older tab. Expect conflict feedback with its edits retained. Copy those edits before reloading. Reconnect preview after a backend restart or failed connection. Normal grants renew while authenticated; expiry does not preserve a private frame indefinitely.
11. Confirm the dashboard shell's original View Storefront action still opens the published site and that business selection survives returning from the editor. Review keyboard focus, responsive layout and visual accuracy manually.

## Limits and deliberately deferred work

Visual acceptance is left to the developer, as requested. No browser automation or screenshot comparison was run. The HTTP test validates actual SSR output and policies; it is not a substitute for manually exercising browser layout and iframe interactions.

The initial composition stays fixed. There is no drag/drop, arbitrary section creation/reordering, extra theme, external destination editing, custom code, server revision history, media manager, market visual editor, product-page editor, or checkout/account redesign. Image replacement, product selection and other structural changes navigate the preview frame after debouncing; they can briefly show a loading transition. Browsing supports the listed page routes; collection filter/pagination submissions, cart, checkout, account and external navigation are blocked in the frame. Custom brand names/logos remain in existing business identity settings.

Preview capabilities are process-local. A multi-process production API requires sticky routing or a separately designed shared expiring capability store; that infrastructure was not added for the local integrated environment. Production HTTPS origin allowlists must be explicitly configured before using the existing wrapper there. No production environment was accessed or configured.

## Preview loading correction

The failed form POST was rejected by Astro's built-in origin checker before the render handler. Inspection of the installed Astro origin-check middleware confirms that form content types require Origin to equal the destination origin. The preview document's previous `Referrer-Policy: no-referrer` makes browser form POST Origin opaque (`null`). The cross-origin iframe parent does not itself change the frame's origin because its sandbox includes allow-same-origin. Browser-style Sec-Fetch-Site can still be cross-site due to the ancestor; Astro permits iframe navigation at that development fetch-metadata gate, then independently validates Origin. No browser network capture was performed; the supplied error was reproduced with these HTTP headers.

Preview responses now use strict-origin, preserving the storefront Origin for same-origin form submissions while disclosing no paths, drafts or capability values in referrers. The transport, short-lived capability validation, exact-window/origin messages and global security.checkOrigin setting remain intact. Requests with Origin:null or an unrelated origin remain forbidden. No public GET draft endpoint or CORS exception was added.

The blocked socket is Vite development HMR, not preview authorization or commerce. Only development preview responses on local hosts now allow the exact ws/wss destination matching the storefront host and port. HTTP API connections and other sockets remain disallowed. Production preview continues using connect-src 'none', and public storefront policy is unchanged.

Verification: 11 focused tests passed for development/production socket policy, bridge initialization, trusted messaging, live DOM edits, structural rendering debounce and editor state. HTTP-only Astro qualification passed with POST, application/x-www-form-urlencoded, Origin, Sec-Fetch-Site:cross-site, Sec-Fetch-Mode:navigate and Sec-Fetch-Dest:iframe. It reproduces Origin:null rejection, derives the corrected Origin from the document response policy, checks successful real Astro rendering and executable script hashes, and verifies ordinary /api/shop CSRF rejection, unauthorized/cross-tenant rejection, private headers and unchanged public output. The harness uses --ignore-lock on an OS-selected temporary port so it does not replace the existing demo server. Production socket behavior is unit-tested; no production environment or browser automation was used. The populated database and preview grant API were not changed.

Restart `npm run demo:market-operations:storefront` from the web directory, then fully reload `http://localhost:4322/vendor/storefront` (or reconnect the preview). Existing frames retain their old document policy until reloaded. No backend, worker, migration or fixture restart/change is required for this correction. Confirm the actual homepage appears, select Hero and edit its heading without saving; check font/color/shape controls and other viewport sizes, then confirm the public site remains unchanged. Browser visual acceptance remains manual.

## Remaining 403 correction: rewrite tenant authority

Confirmed against the running integrated local services using the dedicated vendor account, without saving or publishing. The browser-style same-origin form POST passed Astro's origin check and form parsing. Direct backend capability verification returned storefront ID 24. The response body was `Preview denied.`, identifying the custom storefront middleware rather than Astro's CSRF response or the render handler's generic error. Temporary development diagnostics showed the rewritten request retained URL origin `http://homepage-vendor.localhost:4321` but had no Host header; hostname resolution returned storefront ID 1 while the authorized preview expected 24. No capabilities, cookies or private configuration were logged. The temporary diagnostics were removed.

Root cause: constructing the internal GET with `new Request(URL)` does not populate Host. Middleware uses that header for authoritative tenant resolution, so the internal rewrite resolved the backend's default host context. The earlier mock resolver always returned the vendor context for an unknown host and hid this error. The previous referrer correction fixed a separate Origin:null rejection, but could not repair the lost tenant authority.

The render handler now explicitly preserves `context.url.host` on its internal GET after capability and storefront verification. It forwards no customer cookies or other credentials. CSRF, capability, tenant ID matching, CSP and messaging validation are unchanged. The HTTP fixture now resolves an absent/unknown Host to a different storefront and uses the reported Sec-Fetch-Site:same-origin iframe navigation headers.

Live verification: the original request returned 403 before the change, with matching browser Origin and URL. After the change, a newly issued real grant returned HTTP 200, actual vendor Astro markup and an unsaved verification heading. A separate public homepage GET returned 200 without that private heading. The focused HTTP suite also passed real homepage/listing/detail/About rendering, script initialization policy, invalid grants, mismatched tenants, cross-origin rejection and published-content isolation. Focused bridge/editor tests and type/build checks are recorded with the completion response. No populated configuration, fixtures or database schema were changed. No browser automation was performed.

Restart only the storefront development process through `npm run demo:market-operations:storefront` if it has not hot-reloaded. Reload the editor or choose Reconnect preview to obtain a fresh grant after any backend restart. Verify the rendering POST is 200, click Hero and edit its heading without saving, then check the separate public homepage. No backend or worker change is needed. Browser layout and pointer interaction remain manual checks.

## Editor control refinements

Saved/published status uses the shared green success tone; unsaved status uses red danger. Reconnect, expand/restore and viewport controls use shared icons with accessible labels. Pressed tools opt into shared fill-only selection without underlines. Undo/Redo sit above the left-panel disclosure cards. The page selector sits in the preview tools row with an inline label, and the public storefront action uses the primary presentation with an external-link icon at the right. Palette options reuse the dashboard theme swatches.

Only the open section mounts settings controls; closing unmounts them while parent-owned draft state preserves edits. Opening mounts the content before its restrained animation, with reduced-motion support. Product example reads wait for page-selector interaction; About controls do not request product choices. This defers rendering and data requests, not module download of the entire editor bundle. No preview transport, persistence, public configuration or database behavior changed. Refresh the admin editor to review these changes.
