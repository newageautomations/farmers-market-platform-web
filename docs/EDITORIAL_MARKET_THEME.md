# Editorial Market theme

Editorial Market is an independent Website Library theme with template ID `editorial-market` and settings version `1`. It does not inherit Harvest or Modern Farmhouse layout, styles, defaults, or editor configuration. It reuses the platform's existing commerce, authentication, contact, policy, FAQ, preview, asset authorization, and Website Library lifecycle contracts.

No deployment, hosting integration, remote Git change, or schema migration is part of this work.

## Theme assets

The four supplied PNG files were scanned and imported once into the existing local Vendure asset storage for `vendure_demo_market_ops`. The guarded import verified the loopback PostgreSQL server, exact database name, current migrations, PNG signatures, malware scan, tags, and default platform channel ownership.

| Placement               | Original filename       | Vendure asset ID | Source key                            | Preview key                                     |
| ----------------------- | ----------------------- | ---------------: | ------------------------------------- | ----------------------------------------------- |
| Desktop homepage hero   | `desktopHomeHero.png`   |             `18` | `source\61\desktophomehero.png`       | `preview\a6\desktophomehero__preview.png`       |
| Mobile homepage hero    | `mobileHomeHero.png`    |             `19` | `source\3f\mobilehomehero.png`        | `preview\75\mobilehomehero__preview.png`        |
| Desktop homepage impact | `desktopHomeFooter.png` |             `20` | `source\aa\desktophomefooter__02.png` | `preview\fb\desktophomefooter__02__preview.png` |
| Mobile homepage impact  | `mobileHomeFooter.png`  |             `21` | `source\15\mobilehomefooter.png`      | `preview\11\mobilehomefooter__preview.png`      |

Every asset has these platform metadata tags:

- `platform-theme-asset`
- `theme:editorial-market`
- one `theme-placement:<placement>` tag
- one `theme-filename:<original filename>` tag

The assets stay outside vendor channels. Vendors can read them only through the authorized theme-image query, cannot upload over them, and cannot edit or delete them through the vendor image library. Re-running the import command resolves the existing placement records instead of creating duplicates.

The desktop impact artwork was replaced with the revised supplied PNG on October 26, 2026. Asset ID `20` was retained, saved website references were updated, and the superseded source and preview files were permanently deleted through Vendure. The importer verified that the replacement source matches the supplied bytes and that both old files no longer exist. An explicit `--replace-desktop-footer` flag performs this replacement; ordinary imports remain idempotent.

## Editable configuration

The category image library also includes these scanned platform-owned illustrations, imported into `vendure_demo_market_ops` on October 26, 2026. Choose them from Product categories, then the image picker's Theme Images tab. They are optional selections and do not overwrite existing category choices.

| Filename          | Asset ID | Placement               |
| ----------------- | -------- | ----------------------- |
| `ribeyeSteak.png` | `23`     | `category-ribeye-steak` |
| `eggTrio.png`     | `24`     | `category-egg-trio`     |
| `milkGlasses.png` | `25`     | `category-milk-glasses` |
| `honeyJar.png`    | `26`     | `category-honey-jar`    |
| `loafBread.png`   | `27`     | `category-loaf-bread`   |
| `tomato.png`      | `28`     | `category-tomato`       |

The guarded asset importer supports `--category-images` with those five source files in the listed order. It reuses existing placement records on repeated imports. Category images use contained sizing and retain their transparent edges. The hero and impact artwork have zero outer padding, including the adjacent section edges.

The tomato illustration can be imported independently with `--tomato-image <path>`. Website image validation also accepts legacy vendor categories without metadata rows when their facet is exclusive to the current vendor and their products and variants satisfy the existing ownership checks. A disposable-database regression verifies successful legacy-category saves and rejection when a category facet is shared with another vendor. Restart the demo backend after applying this validator fix.

Each Editorial Market website draft owns its own validated copy of:

- Announcement and header navigation labels
- Hero heading, introduction, button label, desktop artwork, and mobile artwork
- Category section visibility, heading, link label, display limit, and image mapping
- Featured product section visibility, heading, link label, and up to eight selected products
- Community impact visibility, alternative text, desktop artwork, and mobile artwork
- Footer tagline and navigation labels
- Shop page heading and introduction

Category image mappings use the real Vendure category or facet-value ID as the key. The editor loads the current vendor's categories from the catalog service. The backend rejects nonexistent or foreign category IDs, foreign products, foreign vendor assets, and theme assets from another theme. Duplicated websites receive an independent deep copy, so changing one draft's category image does not alter another draft.

The shared image-library control now has `My Images` and `Theme Images` tabs. Theme images are read-only reusable references. Choosing one stores its existing asset ID and delivery URL in the current website draft. It does not duplicate the asset.

## Storefront pages

The homepage has an Editorial Market renderer with its own header, illustrated hero, live category section, featured product section, supplied impact artwork, and footer. Desktop and mobile artwork use responsive `<picture>` sources. Product images and Vendure-generated previews retain the existing lazy-loading and safe-asset behavior.

About, FAQ, and Policies use a shared Editorial Market content adapter over their existing editable schemas and editor panels. About preserves ordered story sections and optional user-selected images, FAQ preserves the approved native disclosure behavior, and Policies adds an in-page section index without changing policy content or publication authority. No page-specific illustration assets are bundled for these routes.

The supplied `footer.png` is packaged as the Editorial Market footer presentation asset and appears on every route through the shared theme footer. Desktop uses the full wide composition. Narrow layouts use cover sizing and center cropping so the footer retains enough vertical space without requiring a separate mobile image.

The following routes retain their established business behavior inside the Editorial Market shell and scoped presentation:

- Shop
- Product details
- Cart
- Checkout and checkout success
- Our Story
- Find Us
- Contact
- FAQ
- Policies

The Shop heading and introduction are template-owned and editable. Story, Find Us, Contact, FAQ, and Policies continue using their existing editors and backend-owned behavior. The theme does not import admin services or controllers into customer code.

## Local file map

- Theme contract and starter settings: `packages/theme/src/editorial-market.ts`
- Shared API and image-library contract: `packages/api/src/storefront-appearance.ts`, `packages/api/src/vendor-categories.ts`
- Visual editor: `apps/admin/src/EditorialMarketEditor.tsx`, `apps/admin/src/VisualStorefrontEditor.tsx`
- Shared image picker extension: `apps/admin/src/vendor/categories.tsx`
- Astro renderer: `apps/storefront/src/components/editorial-market/`
- Footer artwork: `apps/storefront/public/assets/editorial-market/footer.png`
- Scoped theme styles: `apps/storefront/src/styles/editorial-market.css`
- Route integration: `apps/storefront/src/layouts/SiteLayout.astro`, homepage and product routes
- Backend validation and authorization: the sibling backend's storefront appearance service, resolver, public projection, and template validators
- Guarded local import: the sibling backend's `scripts/market-operations-demo/editorial-market-assets.ts`

No new shared UI primitive or styling system was needed. The editor reuses the approved Button, Checkbox, Dialog, Field, Input, SelectField, Tabs, Textarea, and existing CategoryImageField contracts. The storefront reuses the existing Button, FeaturedAdd, cart, checkout, catalog, preview, and public-content behavior.

## Verification completed

The following targeted checks passed:

```powershell
# From E:\coding\farmers-market-platform-web
npm run typecheck
npm run test:storefront:websites

# From E:\coding\farmers-market-platform
npm run demo:market-operations:types
npm run test:farmers-market:types
npm run test:storefront:websites
```

The web suite covers template availability, strict settings validation, real category ID mapping, read-only theme-image selection, and no upload during theme selection. The backend suite uses a disposable PostgreSQL database and covers cross-vendor rejection, anonymous rejection, theme-only asset authorization, category ownership validation, website draft isolation, preview authorization, publication, and public projection.

The initial backend test attempt was blocked by the execution sandbox's local database restriction. It was rerun with approved local PostgreSQL access. Subsequent failed disposable test databases were retained by the existing harness. The final successful database was removed automatically. No automated browser run or screenshot comparison was performed.

## Exact manual testing

Do not reset or reseed the persistent test database. From `E:\coding\farmers-market-platform-web`, start these commands in separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Open `http://localhost:4322/vendor/storefront`, sign in with an existing vendor owner account, and select that vendor's channel if prompted.
2. Confirm the current live website is unchanged. For Willow & Grain, also open `http://homepage-vendor.localhost:4321/` in a separate ordinary tab and keep it open as the public comparison.
3. Choose New Website, select Editorial Market, give the website a distinct name, and create it. Confirm this creates a draft and does not replace the live website.
4. In the actual Astro preview, open Hero. Confirm the desktop or mobile hero artwork is already assigned from the Theme Images library. Edit the heading, introduction, and button label, then confirm the preview updates while the ordinary public tab does not.
5. Open Product categories. Confirm the list comes from the selected vendor's real catalog categories. Open one category image control, switch between My Images and Theme Images, choose a theme image, and save the draft.
6. Reload the editor. Confirm the chosen category ID and image remain on this website. Create or duplicate another Editorial Market draft, change the same category image there, and confirm the first draft remains unchanged.
7. Open Featured products, load products, select up to eight, and save. Confirm the homepage uses current catalog names, prices, product routes, and add-to-cart behavior rather than placeholder product data.
8. Open Community impact. Confirm the desktop and mobile footer artwork are present, their alternative text is editable, and hiding the section removes it only from this draft.
9. Open the Shop preview. Edit Shop settings and confirm the heading and introduction update. Visit a product, cart, checkout, Our Story, Find Us, Contact, FAQ, and Policies to confirm they remain functional inside the Editorial Market shell.
10. Return to the Website Library. Confirm the existing live card and every other draft are unchanged. Publish Editorial Market only when ready, then reload the public hostname and confirm it now serves the saved Editorial Market version.
11. Sign in as another vendor and confirm Theme Images are readable but the first vendor's My Images and category mappings are not visible. A guessed website ID, category ID, product ID, or vendor asset ID must be rejected.
12. Confirm theme-image cards have no upload, rename, replace, or delete action. Vendor-uploaded images retain their normal upload, selection, and isolation behavior.

To verify the idempotent asset registration again without creating copies, run the same guarded command with the four original files in this exact order:

```powershell
npm run demo:market-operations:editorial-assets -- "C:\Users\jake_\Downloads\desktopHomeHero.png" "C:\Users\jake_\Downloads\mobileHomeHero.png" "C:\Users\jake_\Downloads\desktopHomeFooter.png" "C:\Users\jake_\Downloads\mobileHomeFooter.png"
```

This command is only for the approved persistent local test database and must not be redirected to another database.
