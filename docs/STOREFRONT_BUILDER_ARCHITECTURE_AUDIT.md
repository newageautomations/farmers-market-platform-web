# Storefront Builder Architecture Audit

Read-only investigation, November 6, 2026. No application code, configuration, database state, tests, builds or browsers were run or changed. Scope: the web repository (`farmers-market-platform-web`) storefront, admin editor and shared theme package, plus the backend repository (`E:\coding\farmers-market-platform`) appearance, website, template, public-resolution and media code.

Existing reports reused as primary context: `docs/STOREFRONT_VISUAL_EDITOR.md`, `docs/STOREFRONT_WEBSITE_LIBRARY.md`, `docs/MODERN_FARMHOUSE_REBUILD.md`, `docs/EDITORIAL_MARKET_THEME.md`. Their claims were spot-checked against code. Where a report and the code disagree, the code is treated as authoritative and the drift is noted.

**Legend.** **[Confirmed]** = read in source. **[Doc]** = stated in an existing report and not independently re-verified. **[Inference]** = architectural conclusion drawn from the confirmed facts.

---

## Executive summary

- **The builder is custom-built, not a library.** It is a schema-driven *settings editor* over a fixed set of theme-specific Astro templates, with a live preview that renders the *real* storefront routes inside a capability-gated iframe. It is not a block/page builder. [Confirmed]
- **Configuration is structured JSON**, validated twice: Zod schemas in `packages/theme` (web) and hand-written, mirror-image validators in the backend. Stored in PostgreSQL `jsonb` columns on a per-tenant `platform_storefront_website` row, with separate draft/published snapshots, optimistic versions and an atomic publish. [Confirmed]
- **Three templates exist, each with its own model and renderer**: Harvest (flat appearance object, fixed homepage), Modern Farmhouse v2 (six fixed sections that can be reordered/hidden), Editorial Market v1 (fixed sections with visibility toggles). Plus a quarantined Modern Farmhouse v1 legacy renderer. Templates are immutable per website; "changing theme" means creating a new website. [Confirmed]
- **Commerce is well isolated from configuration.** Prices, inventory, variants, cart, checkout and orders come from Vendure via a host-resolved channel token; configuration can only reference IDs that the backend verifies against vendor ownership, and link destinations are enum/regex-restricted. Preview strips customer cookies and blocks all shop calls. [Confirmed]
- **Main weaknesses** for richer customization: no generic section/block model, per-template renderer branching in every route, duplicated validators across two languages/styles, no shared design-token layer beyond presets, market storefronts excluded from the Website Library/visual editor, and Harvest hero/About image URLs not bound to owned assets.
- **Recommendation:** refine the existing builder. Its hardest parts (tenant-safe persistence, publish lifecycle, real-route preview, commerce isolation) are already solved and would have to be rebuilt around Puck anyway. The highest-value change is a single, versioned, shared section schema (one source of truth for both repos) that a future section registry, AI generator and possibly a Puck-style canvas can all target.

---

## 1. Current website builder architecture

### 1.1 Where it lives

| Concern | Location | Notes |
| --- | --- | --- |
| Admin entry point | `apps/admin/src/StorefrontAppearance.tsx` | Line ~287: vendors get `VisualStorefrontEditor`; markets get `LegacyMarketAppearanceEditor` (form). [Confirmed] |
| Website Library (multi-site list) | `apps/admin/src/WebsiteLibrary.tsx`, `website-library.css` | Create / duplicate / rename / publish / delete websites. [Confirmed via doc + file present] |
| Visual editor shell | `apps/admin/src/VisualStorefrontEditor.tsx` (1,318 lines) | Toolbar, section sidebar, undo/redo history, viewport switcher, iframe bridge, save/publish. [Confirmed] |
| Template-specific editor panels | `FarmhouseEditor.tsx` (744), `EditorialMarketEditor.tsx` (414), `AboutStoryEditor.tsx` (561) | Each template contributes its own controls. [Confirmed] |
| Config contract (web) | `packages/theme/src/storefront.ts`, `modern-farmhouse.ts`, `editorial-market.ts`, `faq.ts`, `policies.ts`, `contact.ts` | Zod schemas, defaults, text-field registry, palettes, fonts, CSS-variable generator. [Confirmed] |
| API adapter (web) | `packages/api/src/storefront-appearance.ts` | GraphQL transport; splits the `template` envelope out of appearance JSON on save. [Doc] |
| Public renderer | `apps/storefront/src/layouts/SiteLayout.astro`, `pages/*.astro`, `components/{home,editorial-market,modern-farmhouse,legacy-modern-farmhouse}/`, `VendorHome.astro`, `MarketPublicHome.astro` | Astro SSR. [Confirmed] |
| Preview bridge | `apps/storefront/src/components/EditorBridge.astro`, `lib/editor-preview-client.ts`, `lib/editor-preview-server.ts`, `pages/storefront-editor-preview/{index.astro,render.ts}`, `middleware.ts` | [Confirmed] |
| Backend persistence/validation | `src/plugins/platform-identity/storefront-website.ts` (entity), `storefront-appearance-config.ts`, `storefront-website-templates.ts`, `modern-farmhouse-settings.ts`, `editorial-market-settings.ts` | [Confirmed] |
| Backend service + GraphQL | `src/plugins/farmers-market/services/storefront-appearance.service.ts`, `src/plugins/farmers-market/api/storefront-appearance.ts` | [Confirmed] |
| Public resolution | `src/plugins/platform-identity/public-storefront.controller.ts`, `storefront-host.ts` | Host → storefront → live website → published projection. [Confirmed] |

### 1.2 Library or custom?

Custom. No editor/page-builder dependency is used; the editor composes the project's own shared UI primitives (Field, SelectField, Button, Dialog, Tabs, etc.). [Confirmed / Doc]

### 1.3 How a vendor or market reaches the editor

- **Vendor:** Admin `/vendor/storefront` → Website Library → *Edit* on a website card → visual editor opened with explicit `storefront` and `website` selections (full document navigation, fresh mount per website). [Doc, consistent with `StorefrontAppearance.tsx` branching]
- **Market:** Same route family, but `StorefrontAppearance.tsx` renders `LegacyMarketAppearanceEditor`: a form with palette, button shape/hover, hero heading/intro/image URL/shape, story, About page enable/title/content. No Website Library, no visual iframe editor. Backend: markets use the older `saveOwnStorefrontAppearance` / `publishOwnStorefrontAppearance` mutations; the Website Library migration created no website rows for markets. [Confirmed]

### 1.4 End-to-end flow (vendor)

1. **Open library.** `ownStorefrontWebsites(storefrontId)` → `StorefrontAppearanceService.websites()`; on first open, `ensureWebsite()` lazily creates the initial website under a storefront row lock. [Confirmed]
2. **Open editor.** `ownStorefrontWebsite(storefrontId, id)` loads the saved private **draft** (falls back to published, then defaults). [Confirmed]
3. **Start preview.** `startStorefrontPreview(id, websiteId)` → `startPreview()` checks vendor scope with `storefront` write permission, ownership of the website, issues a random 256-bit token (`randomBytes(32)`), stores only its SHA-256 hash with a serialized `RequestContext`, host and 5-minute expiry in an **in-process `Map`** capped at 2,000 entries. [Confirmed]
4. **Live editing.** The editor holds draft state in React. It posts `{token, config}` to the iframe via exact-origin/exact-window `postMessage`. Text/style changes are patched into the DOM in place (Harvest); structural changes trigger a debounced (300 ms) POST to `/storefront-editor-preview/render`. [Doc; render endpoint Confirmed]
5. **Authorized render.** `render.ts` calls `authorizeEditorRender()`, which calls backend `authorizePreview(token, host, config)` (GraphQL `Permission.Public`, but token-gated). Backend re-checks membership, active storefront, non-deleted website, template id/version match, product and asset ownership. The endpoint then `context.rewrite()`s to the real GET route with the host preserved; middleware sets `locals.editorPreview` and substitutes the request-local config for the published appearance. [Confirmed]
6. **Save draft.** `changeStorefrontWebsite(action:'save', version, input, templateConfig)` → validates with `validateWebsiteDraft` + `validateWebsiteSettings`, checks assets/products, writes `draft` + `templateConfig`, increments `version`. Stale version → `STALE_DOMAIN_VERSION`. [Confirmed]
7. **Publish.** `action:'publish'` re-validates the *saved* draft (not the client copy), checks `publicationVersion` against `storefront.websitePublicationVersion`, then in one transaction: copies draft → `published`, settings → `publishedTemplateConfig`, sets `storefront.liveWebsiteId`, increments the publication generation, and writes the legacy `storefront.appearancePublished` projection. [Confirmed]
8. **Customer request.** Storefront middleware resolves the request Host via `GET /storefront-context/resolve`. `PublicStorefrontController.resolve()` normalizes the host (`normalizeStorefrontHost`), joins storefront + live website + channel token in one statement, runs `publicStorefrontAppearance()` (validation + strip disabled/hidden content), validates template settings, and returns `{storefrontId, kind, channelToken, appearance, …}`. Astro pages branch on that appearance to choose the renderer. [Confirmed]

### 1.5 Shared rendering, shared infrastructure

- **One renderer application** (`apps/storefront`) serves every vendor and market host. [Confirmed]
- **Vendor and market storefronts share** host resolution, layout, the shop API bridge and theme-variable generation, but **not** the editing infrastructure (markets have no Website Library, visual editor or template settings). [Confirmed]
- **Themes do not share homepage/header/footer components.** Each has its own directory. Modern Farmhouse v2 additionally owns its cart, checkout, purchase and success presentation. Shared non-visual controllers were extracted into `apps/storefront/src/lib/use-{product-purchase,vendor-cart,checkout,vendor-checkout,contact-form}.ts`. [Confirmed file presence; Doc for extraction]

---

## 2. Website configuration and data persistence

### 2.1 Format

Structured JSON. Two parts per website:

1. **Appearance document** (`draft` / `published`): shared shape for every template (theme id, palette, buttons, homepage, About/Our Story, FAQ, Policies, Contact, Find Us, text overrides, text sizes, category presentation, Harvest `vendor` block).
2. **Template settings** (`templateConfig` / `publishedTemplateConfig`): template-specific, versioned object; empty `{}` for Harvest v1. In transit and at render time it is carried as `appearance.template = {id, version, settings}`; it is not stored inside the appearance column. [Confirmed]

### 2.2 Storage

Backend entity `StorefrontWebsite` → table `platform_storefront_website` (`storefront-website.ts`):

```ts
storefrontId, vendorId, channelId   // ownership tuple (composite FK in migration)
name            varchar(200)
templateId      varchar(80)          // 'harvest' | 'modern-farmhouse' | 'editorial-market'
templateVersion int                  // 1, or 2 for Modern Farmhouse rebuild
templateConfig           jsonb       // draft template settings
publishedTemplateConfig  jsonb null
draft                    jsonb null  // StorefrontAppearanceConfig
published                jsonb null
version         int                  // optimistic concurrency
publishedAt, deletedAt  timestamptz  // soft delete
```

`platform_storefront` additionally holds `liveWebsiteId`, `websitePublicationVersion`, and the legacy `appearance*` columns, which remain the public projection and (for markets) the only appearance store. Migration: backend `src/migrations/1794300000000-StorefrontWebsiteLibrary.ts`. [Confirmed entity; Doc for migration content]

Configurations are **tenant-specific**: every row carries the storefront/vendor/channel tuple, and every read/write goes through `scope()` → `requireVendor`/`requireMarket` with `read` or `storefront` permission. [Confirmed]

### 2.3 Representative examples (from real defaults)

Harvest appearance default (`defaultStorefrontAppearance`, identical in `packages/theme/src/storefront.ts` and backend `storefront-appearance-config.ts`):

```json
{
  "theme": "harvest",
  "palette": "sage",
  "buttonShape": "pill",
  "buttonHover": "lift",
  "homepage": { "title": "", "introduction": "", "image": "", "story": "" },
  "about": { "enabled": false, "title": "Our story", "content": "" }
}
```

Harvest optional `vendor` block (shape from `storefrontAppearanceSchema`, values from `vendorAppearanceDefaults`; `text` keys from `storefrontTextFields`):

```json
"vendor": {
  "heroShape": "dome",
  "typography": "editorial",
  "featuredIds": null,
  "aboutEnabled": false,
  "aboutBlurb": "",
  "aboutImage": "",
  "aboutAlt": "",
  "text": { "heroPrimaryLabel": "Shop the collection", "closingHeading": "Bring a little\ngoodness home." }
}
```

Our Story section element (`createAboutSection`):

```json
{ "id": "first-story", "layout": "text-image", "heading": "", "body": "",
  "imageAssetId": null, "image": "", "alt": "", "shape": "natural",
  "imagePosition": "right", "textAlign": "left", "imageSize": "medium", "visible": true }
```

Modern Farmhouse v2 template envelope (abridged from `farmhouseDefaults()`; there are always exactly six sections):

```json
{
  "id": "modern-farmhouse", "version": 2,
  "settings": {
    "version": 2, "palette": "evergreen", "typography": "literary",
    "header": { "overlay": true, "message": "…", "shopLabel": "The shop", "storyLabel": "Our story" },
    "footer": { "invitation": "…", "tagline": "…" },
    "pages": { "shopHeading": "The market table", "shopIntroduction": "…", "storyLayout": "alternating", "gallery": "mosaic" },
    "sections": [
      { "id": "cinematic", "visible": true, "heading": "Good food. A little closer.", "body": "…",
        "label": "Explore the shop", "destination": "/products",
        "photo": { "assetId": null, "url": "", "alt": "", "desktop": "center", "mobile": "center" },
        "tiles": [], "productIds": [] }
      /* discovery, products, story, collection, invitation */
    ]
  }
}
```

Editorial Market v1 (abridged from `editorialMarketStarterSettings()`):

```json
{
  "version": 1,
  "assets": { "desktopHero": { "assetId": null, "url": "", "alt": "" }, "mobileHero": {…}, "desktopFooter": {…}, "mobileFooter": {…} },
  "header": { "announcement": "Fresh, local food…", "shopLabel": "Shop", "storyLabel": "Our Story", "findUsLabel": "Find Us", "contactLabel": "Contact" },
  "hero": { "heading": "Good Food Grows Here", "introduction": "…", "buttonLabel": "Shop the Market" },
  "categories": { "visible": true, "heading": "Shop by Category", "linkLabel": "See all", "limit": 8, "images": {} },
  "products": { "visible": true, "heading": "Featured Products", "linkLabel": "See all", "productIds": [] },
  "impact": { "visible": true, "imageAlt": "…" },
  "footer": { "tagline": "…", "shopLabel": "Shop", "storyLabel": "Our Story" },
  "pages": { "shopHeading": "Shop the Market", "shopIntroduction": "…" }
}
```

### 2.4 How pages, sections, blocks, styles and properties are represented

- **Pages**: named, fixed top-level keys (`homepage`, `about`, `findUs`, `contact`, `faq`, `policies`, template `pages`). There is no `pages[]` collection and no user-created pages. [Confirmed]
- **Sections**: three different models.
  - Harvest homepage: implicit and fixed (hero, featured, about, closing, header, footer). Properties are scattered across `homepage.*`, `vendor.*` and `vendor.text.*`.
  - Our Story page: `about.sections[]` — a real ordered array (≤12) with id, `layout` enum and per-section presentation props.
  - Modern Farmhouse: `settings.sections[]` — fixed set of six kinds, reorderable, hideable, uniform property shape.
  - Editorial Market: fixed named objects (`hero`, `categories`, `products`, `impact`) with `visible` booleans.
- **Blocks**: none as a concept. Nearest equivalents are Farmhouse `tiles[]` (≤3) and FAQ/policy/contact entry arrays.
- **Styles**: enums only (`palette`, `buttonShape`, `buttonHover`, `typography`, image `shape`, `imageSize`, `textAlign`, crop `desktop`/`mobile`), plus bounded integer percentages in `textSizes` (heading 75–200, paragraph 75–150). No raw colors, CSS, fonts, spacing or HTML. [Confirmed]

### 2.5 Validation and updates

- **Web**: Zod, `.strict()` everywhere (unknown keys rejected), control-character rejection, length limits, safe-URL refinement (https, or http on loopback only, no credentials), ID regexes, uniqueness refinements, total serialized size ≤ 80,000 chars. [Confirmed]
- **Backend**: independent hand-written validators (no Zod dependency in the backend) mirroring the same rules — `validateStorefrontAppearance`, `validateFarmhouseSettings`, `validateEditorialMarketSettings`, dispatched by `validateWebsiteDraft` / `validateWebsiteSettings` on (templateId, templateVersion). Template identity is immutable (`WEBSITE_TEMPLATE_IMMUTABLE`). [Confirmed]
- **Referential validation** (backend, at save, publish and preview): featured/selected product IDs must be enabled, non-deleted, in the channel and owned by the vendor; category IDs must be active `farmstand_category` rows; story/Find Us/category/template image asset IDs must be PNG/JPEG in the vendor's channel or a platform theme asset tagged for *this* theme, and the stored URL must equal that asset's preview/source URL. [Confirmed]
- **Transport**: GraphQL `JSON` scalars (`input: JSON`, `templateConfig: JSON`). The GraphQL layer itself provides no shape checking; all checking is in the service. [Confirmed]
- **Concurrency**: per-website `version`, per-storefront `websitePublicationVersion`, pessimistic storefront row lock with a consistent lock order. [Confirmed]

### 2.6 Schema evolution and backward compatibility

- **No document-level schema version** on the shared appearance object. Evolution is by **additive optional fields** (`vendor.text`, `aboutUseLegacyStory`, `about.sectionsVersion`, `relatedEnabled`, `textSizes`, …) with read-time fallbacks such as `aboutSections()` (legacy `content` → synthetic `legacy-story` section) and `storefrontText()` (blank → template default). [Confirmed]
- **Template settings are versioned** (`templateVersion` + `settings.version`) and dispatched by exact version; Modern Farmhouse v1 records are kept and rendered by the quarantined `legacy-modern-farmhouse` renderer. [Confirmed]
- **No JSON migrations**: stored JSON is never rewritten in place. [Doc, consistent with code]
- **Consequence [Inference]**: because validators are strict, rolling application code back past an additive field will make newer stored JSON fail validation. On the public path, `PublicStorefrontController.resolve()` validates on every read and throws `Unsupported website template` for unknown template/version combinations, so a mismatch fails **closed** — the storefront becomes unavailable rather than rendering unvalidated content.

### 2.7 Could AI safely generate or modify it?

Mostly yes for the *content and preset* layer [Inference]: the space is fully enumerated, bounded and strictly validated on the server, IDs are ownership-checked, and nothing executable (HTML/CSS/JS/external links) is representable. See §7.

---

## 3. Sections and customization capabilities

### 3.1 Inventory by template (implemented)

| Area | Harvest (v1) | Modern Farmhouse (v2) | Editorial Market (v1) |
| --- | --- | --- | --- |
| Homepage sections | Fixed: Header, Hero, Featured products, About, Final invitation, Footer | Six fixed kinds: cinematic, discovery, products, story, collection, invitation | Fixed: Header (+announcement), Hero, Categories, Featured products, Community impact, Footer |
| Reorder | No | **Yes** (Move up/down in `FarmhouseEditor.tsx`) | No |
| Hide/show | About only | Every section | Categories, products, impact |
| Add / delete / duplicate sections | No | No (array length fixed at 6) | No |
| Text | Hero heading/intro, 15 bounded `vendor.text` labels | Heading, body, CTA label per section; header/footer copy | Header/hero/category/product/footer/shop copy |
| Link destinations | Fixed (`/products`, `/about`) | Regex allowlist of internal routes incl. `/products?category=` | Fixed |
| Products | Automatic or ≤3 chosen, ordered | ≤12 IDs per section | ≤8 chosen |
| Images | Hero/About as URL (see §5 risk); 6 shape masks | Authorized photo + desktop/mobile crop focus; ≤3 tiles | Theme-owned desktop/mobile hero & impact art; category image map |
| Colors | 4 palette presets | 7 palette presets | Fixed theme styling (shared appearance palette fields still exist) [Inference from schema] |
| Typography | 5 system font pairings; per-section heading/paragraph size % | 7 typography presets; text-size % on story/find pages | Not template-configurable [Inference] |
| Buttons | Shape (square/soft/pill) + hover (lift/darken/outline) | — | — |
| Other | Related products toggle | Scroll fade, header overlay, story layout, gallery mode | Category display limit (1–12) |

### 3.2 Shared page editors (all vendor templates)

- **Our Story** (`AboutStoryEditor.tsx`): up to 12 sections; three layouts (text / image / text-image); **add, delete (with confirmation), duplicate and reorder**; per-section alignment, image size, shape, position, alt text, visibility; closing CTA with `/products` or `/` destination. This is the only true add/remove/duplicate section list in the builder. [Confirmed]
- **FAQ** (≤30 questions), **Policies**, **Contact** (entries, form), **Find Us** (intro section + CTA; schedule data comes from market operations). Plain text plus a restricted internal-link set. [Confirmed for limits/routes in validator]

### 3.3 Cross-cutting capabilities

| Capability | Status |
| --- | --- |
| Layout/alignment controls | Limited to enums: `textAlign`, `imagePosition`, `imageSize`, story layout. No grid/column/width/spacing control. [Confirmed] |
| Spacing, sizing, borders, backgrounds | **Not implemented** beyond button/card radius derived from `buttonShape` and image shape masks. [Confirmed] |
| Responsive behavior | Template CSS media queries; separate desktop/mobile *assets* (Editorial) and *crop focus* (Farmhouse). No per-breakpoint editing. Editor has desktop (≥1024)/tablet (768)/mobile (390) preview widths. [Confirmed/Doc] |
| Uploads | `uploadOwnStorefrontImage`: PNG/JPEG only, ≤10 MB, magic-byte check, stored as Vendure Asset in vendor channel. [Confirmed] |
| Theme image assets | Platform assets tagged `platform-theme-asset` + `theme:<id>` + placement; read-only "Theme Images" tab. [Confirmed] |
| Product/category display | Featured selections, category presentation map (position/visible/image), Editorial category grid. Product cards are template-owned components. [Confirmed] |
| Header/nav/footer | Label text only. Navigation structure, logo/brand name, account and cart are fixed (brand identity lives in business settings). [Doc + schema] |
| Theme selection | Chosen at website creation; immutable afterward. No conversion. [Confirmed] |
| Presets/templates | Template starters only (`websiteStarter()`); palette/type presets. No reusable saved sections or section presets. [Confirmed] |
| Multiple websites | Website Library: many drafts, one live, duplicate, soft delete (no restore UI). [Confirmed/Doc] |
| Undo/redo | Client-only, ≤50 states, reset on save/publish (`VisualStorefrontEditor.tsx` `history`). [Confirmed] |
| Server revision history | **None.** Only last draft + last published per website; duplicates act as manual snapshots. [Confirmed] |

### 3.4 Documentation drift / partially implemented

- `STOREFRONT_VISUAL_EDITOR.md` says theme settings are "Harvest only" and the composition is "fixed"; this predates Modern Farmhouse v2 and Editorial Market. [Confirmed drift]
- `STOREFRONT_WEBSITE_LIBRARY.md` says `modern-farmhouse` is "reserved and unavailable"; `storefrontThemes` now marks it `available: true` (v2) and the backend starter accepts it. Superseded by `MODERN_FARMHOUSE_REBUILD.md`. [Confirmed drift]
- Modern Farmhouse `header.overlay`/`message` remain in the schema but their editor controls were retired. [Doc]
- Theme `premium` flag is presentation metadata only; there is no billing/entitlement enforcement. [Confirmed comment in `storefront.ts`; Doc]
- `themeAssetRows()` accepts `harvest` and `modern-farmhouse` theme IDs, but only Editorial Market assets are documented as imported. [Confirmed code; asset contents not inspected]

---

## 4. Rendering and frontend architecture

### 4.1 From saved config to HTML

1. `middleware.ts` resolves `locals.storefront` (including `appearance`) from the backend; in preview it overrides `appearance` with the authorized request-local config.
2. `SiteLayout.astro` derives flags (`premium = isFarmhouse(appearance)`, `editorial = isEditorialMarket(appearance)`, legacy farmhouse), emits theme CSS variables via `storefrontThemeStyle()` (palette/fonts/radius presets only), injects bounded text-size CSS, sets `data-storefront-theme`, and picks the header/footer component pair. [Confirmed]
3. Each route (e.g. `pages/index.astro`) re-branches: market → `MarketPublicHome`; Editorial → `editorial-market/Home.astro`; Farmhouse v2 → `modern-farmhouse/Home.astro`; Farmhouse v1 → `legacy-modern-farmhouse/Home.astro`; else Harvest `VendorHome.astro`. The same pattern repeats in `products/index.astro`, `products/[slug].astro`, `cart.astro`, `checkout/index.astro`, etc. [Confirmed]
4. Within a template, sections are hard-coded JSX. Modern Farmhouse is the only one that iterates a section array (`settings.sections.map` with an `id ===` switch). [Confirmed]

### 4.2 Component selection

No registry. Selection is `if/else` on theme predicates in each route and in the layout. Sections inside templates are selected by literal `section.id` comparisons. [Confirmed]

### 4.3 Dynamic vs hard-coded layouts

Hard-coded per template, with data-driven content, visibility and (Farmhouse) order. [Confirmed]

### 4.4 Desktop/mobile

Native CSS media queries in theme stylesheets; `<picture>` sources for Editorial artwork; crop-focus enums for Farmhouse. The editor preview runs the real media queries at fixed iframe widths. [Confirmed/Doc]

### 4.5 Extensibility

| Question | Answer |
| --- | --- |
| Add a new section type? | Requires coordinated edits in: web Zod schema, backend hand-written validator, backend referential checks (if it references assets/products), editor panel, template Astro component, preview bridge allowlist (`isStorefrontEditorSection` regex), public projection rules, and tests. Substantial. [Confirmed by the touch points above] |
| Nesting/composition? | Not supported. One level of sections; Farmhouse tiles are a fixed nested list, not general composition. |
| Multiple independently editable pages? | Fixed set of named pages, each with its own editor. No arbitrary page creation; editor browsing is limited by `storefrontPreviewPath()` to `/`, `/about`, `/find-us`, `/contact`, `/faq`, `/policies`, `/products[/slug]`. |

### 4.6 Constraints for more sophisticated customization [Inference]

1. **Three incompatible section models** (implicit Harvest fields, Farmhouse fixed array, Editorial named objects) — no common abstraction for the editor, renderer or an AI to target.
2. **Renderer branching is spread across routes**; every new template multiplies conditionals in layout and route files.
3. **Validators are duplicated** (Zod vs hand-written TS) and text limits are listed twice (`storefrontTextFields` vs `storefrontTextLimits`); drift is caught only by tests.
4. **Styling is preset-only**, with CSS variables generated from palette tables; there is no per-section style token model to extend.
5. **Harvest live-patching** relies on DOM selectors (`data-home-text`, `data-storefront-text`, `.ui-section-heading h2`) coupling editor, CSS generator and markup.
6. **Preview capabilities are process-local**; horizontal scaling needs a shared store or sticky routing. [Doc + Confirmed `Map`]

---

## 5. Commerce integration and safety boundaries

### 5.1 How the storefront reaches commerce

- **Tenant binding**: Host → `PublicStorefrontController.resolve()` returns the channel token for that host's storefront. All Shop API calls from Astro use that token via `requestShop()` (`lib/shop.ts`); Vendure owns session, prices, active order. [Confirmed]
- **Browser → `/api/shop`**: checks `Origin === storefront.canonicalOrigin` and `input.storefrontId === storefront.storefrontId` before proxying actions (cart, occurrence selection, etc.). [Confirmed]
- **Catalog/products/variants/pricing/stock**: Vendure Shop API queries; config contributes only *which* product IDs to request (`filter: { id: { in: selected } }`) and their order. The query is channel-scoped by the token, so a foreign ID would simply not resolve. [Confirmed]
- **Cart/checkout/payment/orders/accounts**: existing routes and hooks; appearance is consulted only to choose presentation (`isFarmhouse(...)` in `cart.astro`, `checkout/index.astro`), the related-products toggle, and label text. [Confirmed]
- **Market data**: Find Us and preorder use market-operations queries; config only toggles/labels the page. [Confirmed for schema; Doc for behavior]

### 5.2 Customizable vs fixed

| Customizable (presentation) | Fixed (authoritative) |
| --- | --- |
| Copy, labels, headings | Prices, tax, totals, discounts, loyalty |
| Preset palette/fonts/shapes/hover | Inventory, availability, market eligibility |
| Which owned products/categories to feature, order | Cart rules, checkout steps, payment provider |
| Owned/theme images, alt text, crops | Customer auth, accounts, orders, contact delivery |
| Section visibility/order (Farmhouse) | Link destinations (enum/regex internal only) |
| Optional page enablement and content | Hostname, channel, business identity |

### 5.3 Can configuration influence business logic?

No evidence that it can. [Confirmed for paths read] Configuration never reaches Vendure mutations; it selects components and supplies text/IDs that are ownership-checked. Preview cannot transact: Shop API requests drop incoming cookies when `locals.editorPreview` is set, `shopCall()` throws `forbidden` when `data-editor-preview="true"`, and preview CSP blocks network connections (`connect-src 'none'` in production). [Confirmed]

### 5.4 Is commerce logic inside editable components?

Not in the *configuration*, but **theme components do contain commerce presentation**. Modern Farmhouse v2 owns `Cart.tsx`, `Checkout.tsx`, `Purchase.tsx`, `Success.tsx`; Editorial owns `Product.astro`/`ProductMarketSelector.tsx`. Business rules were extracted into shared `use-*` hooks, so the risk is presentation bugs per theme, not rule divergence. [Confirmed files; Doc for extraction] Any future third-party or AI-authored *component* work would touch this surface; configuration-only work would not.

### 5.5 Authorization and isolation

- All admin queries/mutations: `@Allow(Permission.Authenticated)` + service-level `scope()` → `requireVendor/requireMarket` with `storefront` (write) or `read` permission, scoped to `ctx.channelId`. [Confirmed]
- Website access: `ownedWebsite()` filters by storefront and ownership; composite FK enforces storefront/vendor/channel consistency at the database level. [Confirmed entity comment; Doc for FK]
- Public path accepts no website ID; only the host-resolved live website is served. [Confirmed]
- Preview: `authorizeStorefrontPreview` is `Permission.Public` but requires a 43-char token whose hash exists, unexpired, matching host, and rechecks the stored request context's current permissions. [Confirmed]

### 5.6 Concrete risks found (evidence-based)

1. **Harvest hero/About images are not bound to owned assets.** `homepage.image` and `vendor.aboutImage` are validated only as safe URLs (https or loopback http); `validateStoryAssets()` covers only `categoryPresentation`, `about.sections` and `findUs.introduction`. Public CSP allows `img-src … https:`. A vendor can therefore hotlink any external HTTPS image on their storefront (content moderation and customer-IP disclosure to third parties). Not a commerce risk; a content/privacy gap. The market form also exposes a free "Hero image URL" field. [Confirmed]
2. **Validator drift between repos.** Web Zod and backend hand-written validators must stay identical. If the web accepts something the backend rejects, saves fail (safe). If the backend accepts something the web schema rejects, `storefrontThemeVariables()` calls `storefrontAppearanceSchema.parse()` and would throw during SSR — rendering failure, not a commerce bypass. [Confirmed parse call; Inference on impact]
3. **Fail-closed public resolution.** A published config that no longer validates (code rollback, schema tightening) makes `resolve()` throw, taking down that host's storefront — including cart and checkout pages. This is the safe failure direction but an availability risk for schema evolution. [Confirmed]
4. **Process-local preview capabilities.** Restart revokes all grants; multi-instance deploy needs sticky sessions or shared storage. Already documented. [Confirmed]
5. **No server-side size cap on template settings specifically** was observed beyond per-field limits and array bounds; the 80,000-char cap applies to the appearance document. [Confirmed for appearance; Inference for settings — not fully read]

No evidence was found of HTML/CSS/script injection from configuration: `set:html` is used only for the generated text-size CSS, whose keys are regex-constrained and whose values are bounded integers. [Confirmed]

---

## 6. Themes and design assets

### 6.1 Existing themes

| Theme | ID / version | Implementation | Status |
| --- | --- | --- | --- |
| Harvest | `harvest` v1 | `components/home/Harvest*.astro`, `VendorHome.astro`, `ProductCards.astro`, shared `@market/theme/storefront.css` | Default, only theme with in-place DOM-patch preview |
| Modern Farmhouse | `modern-farmhouse` v2 | `components/modern-farmhouse/*` (~19 files incl. cart/checkout), `styles/farmhouse-v2.css`, `FarmhouseEditor.tsx` | Selectable, flagged premium (no billing) |
| Editorial Market | `editorial-market` v1 | `components/editorial-market/*`, `styles/editorial-market.css`, `EditorialMarketEditor.tsx`, packaged `public/assets/editorial-market/footer.png` | Selectable |
| Modern Farmhouse (legacy) | `modern-farmhouse` v1 | `components/legacy-modern-farmhouse/*`, `styles/legacy-modern-farmhouse.css` | Quarantined compatibility only |
| Market storefront | n/a | `MarketPublicHome.astro` + shared palette variables | Form-edited, not templated |

### 6.2 Configuration-driven or component-driven?

Component-driven. Each theme is a separate set of Astro/React components and a scoped stylesheet; configuration supplies content and preset choices. Palette/typography presets for Harvest are shared tables in `storefront.ts`; Farmhouse has its own presets (`farmhouse-presentation.ts`). [Confirmed]

### 6.3 Do theme changes preserve content?

There is no theme change on an existing website — the template is immutable. A new website starts from that template's starter (`websiteStarter()`), not the live site's content; Duplicate requires the same template (`WEBSITE_DUPLICATION_TEMPLATE_MISMATCH`). Shared-page content (Story/FAQ/Policies/Contact/Find Us) lives in the per-website appearance document, so it is **not** carried to a new-theme website automatically. [Confirmed]

### 6.4 Image assets

- **Vendor uploads**: `uploadOwnStorefrontImage` → Vendure `AssetService` in the vendor channel; listed via `ownStorefrontImages` (paginated). [Confirmed]
- **Theme images**: imported by guarded backend scripts (e.g. `scripts/market-operations-demo/editorial-market-assets.ts`), stored as Vendure assets on the default channel, tagged `platform-theme-asset`, `theme:<id>`, `theme-placement:<placement>`, `theme-filename:<name>`; discovered with `ownStorefrontThemeAssets(themeId)`; read-only for vendors. [Confirmed tags/query; Doc for import]
- **Selection**: stores both `assetId` and delivery URL; backend verifies the URL equals the asset's preview/source URL. [Confirmed]

### 6.5 Category images

Two mechanisms: shared `categoryPresentation` map in the appearance (`{ [facetValueId]: { position, visible, imageAssetId, image } }`, ≤200 entries) and Editorial's own `settings.categories.images` (≤100). Both are validated against active categories and owned/theme assets. [Confirmed]

### 6.6 Could themes support more flexible styling without major changes? [Inference]

Partly. Adding more *presets* (palettes, fonts, radii) is cheap because `storefrontThemeVariables()` already maps enums to CSS variables. Free-form tokens (custom colors, spacing scales) would need: a validated color/spacing token type, contrast checks, per-theme variable contracts (each theme's CSS consumes different variables), and extending both validators. Moderate effort; no architectural rewrite.

---

## 7. AI-readiness assessment

### 7.1 Already supported

| Capability | Status |
| --- | --- |
| Produce a valid config from the data model | **Yes.** Schemas are strict, fully enumerated and bounded; Zod schemas can be converted to JSON Schema for structured output. |
| Configure text, presets, images, products | **Yes**, via existing fields. Referenced IDs are validated server-side for ownership. |
| Reorder / hide sections | **Farmhouse only** (and Our Story sections). |
| Add / remove / duplicate sections | **Our Story page only.** Homepage composition is fixed in all templates. |
| Server validation of AI output | **Yes.** `validateWebsiteDraft` + `validateWebsiteSettings` + referential checks run on save, publish and preview, independent of the client. |
| Safe preview before publish | **Yes.** AI output could be rendered through the existing private preview and saved as a non-live draft or a separate library website. |
| No executable code | **Yes.** No field accepts HTML, CSS, scripts, external links or raw style values. |

### 7.2 Required changes / safeguards before accepting AI-generated configurations

1. **Single machine-readable schema** shared by web and backend (e.g. JSON Schema generated from Zod and validated in the backend), so the AI, editor and server agree exactly.
2. **Write AI output only to drafts or new websites**, never publish; keep human Publish as the gate (already the lifecycle).
3. **Server-side revision history** so AI edits are reversible after save (today only client undo exists).
4. **Asset binding for Harvest `homepage.image`/`vendor.aboutImage`** so generated configs cannot point at arbitrary external images.
5. **Content safeguards**: moderation of generated copy, claims (e.g. "organic", health claims) and alt text quality; these are not represented anywhere today.
6. **Context tools**: a read-only API giving the model the vendor's products, categories, available assets and theme images (existing `ownStorefrontProducts`, `ownStorefrontImages`, `ownStorefrontThemeAssets`, vendor categories could back this).
7. **Accessibility/contrast checks** if free-form color is ever introduced.
8. **Rate/size limits** on AI-triggered saves and previews (preview store caps at 2,000 grants process-wide).

### 7.3 Limitations constraining AI design quality [Inference]

- The design space is small: fixed homepages, preset palettes/fonts, no spacing/layout control. AI could write good copy and pick good products/images, but could not produce meaningfully different *layouts*.
- Three section models force template-specific prompts and generators.
- No arbitrary pages and no nested composition.
- Template immutability means "redesign in another theme" requires generating a whole new website, including shared pages.

---

## 8. Recommendation

### 8.1 Options compared

| Criterion | A. Refine existing builder | B. Embed Puck (or similar) | C. Replace builder extensively |
| --- | --- | --- | --- |
| Reuse of existing architecture | Keeps persistence, Website Library, publish/version locks, real-route preview, asset/product authorization, commerce isolation | Puck would replace the editor canvas only; its data (`{content, root, zones}`) must still be validated, stored, authorized and rendered by Farmstand. Its React render model conflicts with the Astro-SSR, non-hydrated storefront, and its in-editor rendering would duplicate the current "render the real route" preview. | Discards working, heavily tested security and lifecycle code |
| Implementation complexity | Low–moderate, incremental | Moderate–high: new block model, server validators for Puck JSON, Astro renderers for every Puck component, migration of three template models | High |
| Vendor usability | Already guided, low-risk; needs better layout freedom and history | Drag-and-drop is familiar but exposes more ways to make poor/unsafe layouts | Depends on design |
| Design flexibility | Limited today; grows with a section registry and tokens | High | High |
| AI integration | Good: strict bounded JSON is an ideal AI target | Good if Puck JSON is wrapped in a strict server schema; Puck's own data is loosely typed | Unknown |
| Commerce safety | Strong today | Must be re-established for every block; risk of commerce UI inside free-form blocks | Must be re-established |
| Maintainability | Improves if validators are unified and branching is replaced by a registry | Adds third-party dependency and a second component model alongside Astro | Resets maturity |

**Conclusion [Inference]:** **Refine the existing builder.** The parts that are expensive and risky — tenant-scoped persistence, atomic publication, private preview of real Astro routes, commerce isolation, asset/product ownership — are implemented and tested. Puck would solve only the editing canvas, which is the least of the current constraints; the real limitations are the data model (no shared section abstraction) and duplicated validation. Fix those first. A Puck-style drag-and-drop canvas could later be evaluated as a *front end* to a Farmstand-owned section schema, but it should not own the data model or render the storefront.

### 8.2 Highest-value improvements (ranked)

1. **One source of truth for configuration schemas.** Generate the backend validator (or JSON Schema) from the `packages/theme` Zod schemas, remove duplicated limit tables. Prerequisite for safe evolution, new sections and AI.
2. **A shared, versioned section model and registry.** Define `sections: [{ type, id, version, visible, props }]` with per-type schemas, editor panels and Astro renderers registered in one place, replacing per-route `if/else` theme branching. Lets templates declare which section types they allow and in what order, and lets Harvest/Editorial gain reorder/add/remove without bespoke code.
3. **Document-level schema version + explicit migrations.** Add a version to the appearance document and read-time upgraders; avoid the strict-validator rollback trap and fail-closed public outages.
4. **Server-side revision history** per website (save snapshots, restore), plus a restore UI for soft-deleted websites.
5. **Bind all images to authorized assets** (Harvest hero/About, market hero), retiring free-form image URLs.
6. **Design tokens per theme**: extend presets to a bounded token set (accent colors from a vetted list, spacing density, section background variants) that each theme's CSS consumes consistently.
7. **Bring markets onto the Website Library and visual editor**, reusing the same lifecycle and preview pipeline.
8. **Content portability between templates**: carry shared pages (Story, FAQ, Policies, Contact, Find Us) into a new-template website on creation, so theme changes do not discard content.
9. **Shared preview-capability store** (database or cache) before multi-instance deployment.

---

## Open questions (not resolvable from the code read)

1. Market storefront rendering: how much of `MarketPublicHome.astro` is driven by the legacy appearance versus fixed; not read in detail.
2. Whether production storage uses an asset strategy whose `toAbsoluteUrl` output is stable across hosts; URL equality checks in `validateStoryAssets` depend on it.
3. Exact backend checks inside `validateFarmhouseReferences` / `validateEditorialReferences` for photo URLs (only their ownership/count queries were seen).
4. Whether any non-local database environment still contains Modern Farmhouse v1 references (documented audit covered only the local demo DB).
5. Whether "premium" templates are intended to be entitlement-gated; no enforcement exists today.
6. Intended product direction for arbitrary pages and nested layouts — determines whether improvement #2 needs zones/nesting from the start.
