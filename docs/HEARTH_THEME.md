# Hearth theme

Hearth is a market website theme with template ID `hearth` and version `1`. It is offered to markets only, beside Harvest, Editorial Market and Meadow. It is the rustic one: kraft paper, roast-brown ink, postmarked dates, stitched labels and chalkboards, with a bakehouse illustration set of loaves, croissants, jam, coffee, pie and wheat.

No schema migration, deployment or hosting change is part of this work.

## What Hearth shares and what it owns

Hearth follows the same model as Meadow ([MEADOW_THEME.md](MEADOW_THEME.md)). It stores its content in the Harvest market contract, so the visual editor, the Add Section library, market pages and every commerce flow work exactly as they do for a Harvest market website.

| Area                                                   | Source                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Homepage order, market copy, market pages              | Harvest contract: `harvestComposition`, `market`, `pageSections`                 |
| Add Section library                                    | Harvest section renderers, registered for `hearth` in the section manifest       |
| Market date selection, shop, product, cart, checkout   | Shared routes and islands, unchanged. Checkout uses the shared `StripeCheckout`. |
| Market Day mode                                        | Shared `MarketDayHome`, countdown and live island, with Hearth's hero            |
| Header behaviour and navigation list                   | Shared with Meadow: `lib/market-theme-header.ts`, `marketSiteNavigation`         |
| Header, footer, hero, homepage sections, illustrations | `apps/storefront/src/components/hearth/`                                         |
| Styles                                                 | `apps/storefront/src/styles/hearth.css`, linked only for Hearth                  |

The Colors setting chooses Hearth's leading color. Every choice is dark enough for cream text:

| Setting      | Hearth color |
| ------------ | ------------ |
| Sage         | Roast brown  |
| Terracotta   | Brick red    |
| Coastal blue | Blueberry    |
| Charcoal     | Olive        |

Sage is the platform default, so a new Hearth website starts in roast brown. Caramel stays the accent. Button shape, button hover style, typography, hero image, hero shape, card color themes and text sizes keep working. New Hearth websites start with the Soft button shape.

Market Day mode turns the hero into a chalkboard sign. The countdown, booth map, pickups and the Stripe card field stay on light surfaces.

## Copy rules

Hearth uses Meadow's copy rules: headings stand alone, new websites start with empty market page descriptions, and the market date banner, cart and checkout omit general guidance. Market-specific pickup instructions, vendor charge disclosures, the purchase authorization line, statuses and errors always stay.

## Shared with Meadow

Adding a second market-only theme replaced Meadow-specific switches with shared ones in `packages/theme/src/storefront.ts`:

- `marketOnlyStorefrontThemes` and `marketOnlyTheme(appearance)` identify Meadow or Hearth.
- `usesHarvestContract(theme)` covers Harvest, Meadow and Hearth.
- `headingOnlyMarketText(theme)` lists the market text a theme does not show.

The header's mobile menu, scrolled state and cart highlight moved from Meadow's header into `lib/market-theme-header.ts`. Both themes read the Colors setting from one `data-theme-palette` attribute, which the editor preview now updates live.

## New components and why

Documented per the component reuse rules.

- `hearth/Header.astro`, `hearth/Footer.astro`: the theme needs its own shell. They reuse the shared `MarketCartLink`, `HeaderAccountMenu`, navigation list, header behaviour and `FarmstandIcon` unchanged.
- `hearth/Hero.astro`, `hearth/MarketHome.astro`: the homepage layout differs from Harvest's and Meadow's. They keep the same data, links and `data-editor-section`, `data-home-text` and `data-market-text` identities, and reuse `MarketDateList`, `MarketVendorCards`, `WebsiteSections`, `EmptyState` and `Button`.
- `hearth/Art.astro`, `hearth/Scene.astro`, `hearth/art.ts`: the illustration set is original to this theme and decorative only (`aria-hidden`). Categories without a photograph get the closest drawing; produce, meat and plants share a crate.

No new UI primitive, UI library, font or external texture was added. Paper grain and gingham are CSS and data URIs. The customer account area keeps the shared dashboard shell and is not themed.

## Other touched files

- Theme contract: `packages/theme/src/storefront.ts`, `packages/theme/src/website-section-contract.ts`, `packages/api/src/storefront-appearance.ts`
- Admin: `apps/admin/src/WebsiteLibrary.tsx`, `apps/admin/src/VisualStorefrontEditor.tsx`
- Storefront wiring: `SiteLayout.astro`, `pages/index.astro`, `pages/cart.astro`, `pages/checkout/index.astro`, `pages/shop/products/[variantId].astro`, `MarketDayHome.astro`, `ProductCards.astro`, `VendorPreorderBanner.astro`, `StripeCheckout.tsx`, `lib/editor-preview-client.ts`, `lib/market-website.ts`
- Meadow: `meadow/Header.astro`, `meadow/Hero.astro` and `styles/meadow.css` use the shared header behaviour and palette attribute
- Backend (sibling repository): `storefront-appearance-config.ts`, `storefront-website-templates.ts`, `website-section-contract.ts`, `storefront-appearance.service.ts`, `public-storefront.controller.ts`, and `test/farmers-market/market-website-library.ts`

## Manual testing

Restart the demo backend first so it accepts the new template. Do not reset or reseed the persistent test database.

1. Open `http://localhost:4322/market`, sign in as the market manager and open the Website Library.
2. Choose New Website, select Hearth, name it and create it. This creates a draft and does not replace the live website.
3. In the editor, edit the hero, change Colors, reorder homepage sections and add a section from the library. Confirm the preview updates.
4. Browse the preview: Shop, a product, Market Dates, Vendors, Become a Vendor and Our Story.
5. Publish when ready, then open the market's public address. Choose a market date, add a product to the cart, and continue through checkout to the Stripe card form.
6. On a market date, open the homepage to see Market Day mode. `/?storefront=regular` shows the regular homepage.
