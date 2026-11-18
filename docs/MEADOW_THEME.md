# Meadow theme

Meadow is a market website theme with template ID `meadow` and version `1`. It is offered to markets only, beside Harvest and Editorial Market. It is friendly and bright: illustrated produce, bees, honey and farm animals on a warm cream page, with a sticky icon header and an illustrated footer on every storefront page.

No schema migration, deployment or hosting change is part of this work.

## What Meadow shares and what it owns

Meadow is a presentation of the existing market website. It stores its content in the Harvest market contract, so the visual editor, the Add Section library, market pages and every commerce flow work exactly as they do for a Harvest market website.

| Area                                                   | Source                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Homepage order, market copy, market pages              | Harvest contract: `harvestComposition`, `market`, `pageSections`                 |
| Add Section library                                    | Harvest section renderers, registered for `meadow` in the section manifest       |
| Market date selection, shop, product, cart, checkout   | Shared routes and islands, unchanged. Checkout uses the shared `StripeCheckout`. |
| Market Day mode                                        | Shared `MarketDayHome`, countdown and live island, with Meadow's hero            |
| Header, footer, hero, homepage sections, illustrations | `apps/storefront/src/components/meadow/`                                         |
| Styles                                                 | `apps/storefront/src/styles/meadow.css`, linked only for Meadow                  |

The Colors setting chooses Meadow's leading color (Sage is leaf green, Terracotta is tomato, Coastal blue is blueberry, Charcoal is aubergine). Honey stays the accent. Button shape, button hover style, typography, hero image, hero shape, card color themes and text sizes keep working.

## Copy rules

Meadow shows headings without supporting lines.

- The markets, vendors, categories and closing-banner supporting text fields are not shown, and the editor hides those fields for Meadow (`meadowHiddenText`).
- New Meadow websites start with empty market page descriptions. A manager can still add one.
- The market date banner, cart and checkout accept an opt-in `concise` flag that omits general guidance (how preordering works, that Stripe is secure). Market-specific pickup instructions, vendor charge disclosures, the purchase authorization line, statuses and errors always stay. Other themes do not pass the flag and are unchanged.

## New components and why

Documented per the component reuse rules.

- `meadow/Header.astro`, `meadow/Footer.astro`: the theme needs its own shell. They reuse the shared `MarketCartLink`, `HeaderAccountMenu`, `marketNavigation` and `FarmstandIcon` unchanged.
- `meadow/Hero.astro`, `meadow/MarketHome.astro`: the homepage layout differs from Harvest's. They keep the same data, links and `data-editor-section`, `data-home-text` and `data-market-text` identities, and reuse `MarketDateList`, `MarketVendorCards`, `WebsiteSections`, `EmptyState` and `Button`.
- `meadow/Art.astro`, `meadow/Scene.astro`, `meadow/art.ts`: the illustration set is original to this theme and decorative only (`aria-hidden`).

No new UI primitive, UI library or styling system was added. The customer account area keeps the shared dashboard shell and is not themed.

## Other touched files

- Theme contract: `packages/theme/src/storefront.ts`, `packages/theme/src/website-section-contract.ts`, `packages/api/src/storefront-appearance.ts`
- Admin: `apps/admin/src/WebsiteLibrary.tsx`, `apps/admin/src/VisualStorefrontEditor.tsx`
- Storefront wiring: `SiteLayout.astro`, `pages/index.astro`, `pages/cart.astro`, `pages/checkout/index.astro`, `pages/shop/products/[variantId].astro`, `MarketDayHome.astro`, `WebsitePageRegion.astro`, `ProductCards.astro`, `VendorPreorderBanner`, `MarketCart.tsx`, `Checkout.tsx`, `StripeCheckout.tsx`
- Backend (sibling repository): `storefront-appearance-config.ts`, `storefront-website-templates.ts`, `website-section-contract.ts`, `storefront-appearance.service.ts`, `public-storefront.controller.ts`, and `test/farmers-market/market-website-library.ts`

## Manual testing

Restart the demo backend first so it accepts the new template. Do not reset or reseed the persistent test database.

1. Open `http://localhost:4322/market`, sign in as the market manager and open the Website Library.
2. Choose New Website, select Meadow, name it and create it. This creates a draft and does not replace the live website.
3. In the editor, edit the hero, reorder homepage sections and add a section from the library. Confirm the preview updates.
4. Browse the preview: Shop, a product, Market Dates, Vendors, Become a Vendor and Our Story.
5. Publish when ready, then open the market's public address. Choose a market date, add a product to the cart, and continue through checkout to the Stripe card form.
6. On a market date, open the homepage to see Market Day mode. `/?storefront=regular` shows the regular homepage.
