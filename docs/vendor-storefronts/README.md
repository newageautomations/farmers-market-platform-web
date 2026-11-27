# Vendor storefront standard

> **READ-ONLY REFERENCE.** This set of documents is the fixed specification for vendor storefront themes. Do not edit, reformat, extend or "update" these files during feature work, and do not let an agent change them. If the code and these documents disagree, stop and ask the developer which one is right. Change these files only when the developer explicitly asks for it.
>
> Verified against `farmers-market-platform-web` (working tree based on commit `b8503ea`) on November 27, 2026. No backend change is part of the vendor standard.

Vendor websites follow the same page standard as market websites. The market standard in [`docs/market-storefronts/`](../market-storefronts/README.md) is the base, and Pasture is still its reference theme. **This folder only records where vendor websites differ.** Anything not mentioned here works exactly as the market documents describe.

## Which websites this covers

Every theme a vendor website can use, on vendor websites only:

| Theme            | ID                 | Vendor shell                                                                            |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------- |
| Harvest          | `harvest`          | Shared Harvest vendor header, footer and pages                                          |
| Bloom            | `bloom`            | The Harvest vendor shell with `styles/bloom.css`                                        |
| Editorial Market | `editorial-market` | Its own header, footer, shop and content pages (`components/editorial-market/`)         |
| Modern Farmhouse | `modern-farmhouse` | Premium (template version 2, `components/modern-farmhouse/`) and the legacy `mf-` shell |

Harvest and Editorial Market are also market themes. **On a market website they keep their historical rules.** The vendor standard never reaches a market website, and the market standard never reaches a vendor website.

## Reading order

| #   | Document                                         | Layer               | What it answers                                                               |
| --- | ------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------- |
| 1   | [Rules](01_RULES.md)                             | Structure           | How a page rule is chosen for a vendor website, and every value that differs. |
| 2   | [Pages](02_PAGES.md)                             | Structure           | The vendor page matrix, links, and what a vendor can place on each page.      |
| 3   | [Find Us](03_FIND_US.md)                         | Structure + Styling | The one page that differs from the market standard.                           |
| 4   | [Themes](04_THEMES.md)                           | Structure + Styling | What each vendor theme does to meet the standard, and where.                  |
| 5   | [Testing and preview](05_TESTING_AND_PREVIEW.md) | Process             | How to check a vendor theme without harming the test data.                    |

## Rules that apply everywhere

1. **The market documents still apply.** Read [`docs/market-storefronts/`](../market-storefronts/README.md) first. Its rules on reuse, accessibility, motion, the editor preview and starter copy hold for vendor websites too.
2. **Code wins.** These documents describe the code at the version above. Older notes (`BLOOM_THEME.md`, `EDITORIAL_MARKET_THEME.md`, `MODERN_FARMHOUSE_PREMIUM_THEME.md`) are history where they conflict.
3. **Always pass the website kind.** `themePageStructure(theme, kind)`, `supportsWebsitePageHero(appearance, page, kind)` and `effectiveWebsitePageSections(appearance, page, region, kind)` take `'MARKET'` or `'VENDOR'`. Read it from `StorefrontContext.kind` in the storefront and from the editor's `market` flag (exposed as `WebsiteEditorContext.kind`) in the admin. Never guess it from the theme: Harvest and Editorial Market serve both.
4. **A rule is presentation.** No rule changes prices, stock, checkout, payment, vendor terms acceptance or any backend authority. The saved website format is unchanged, so websites saved before the standard keep working without a migration.
5. **Nothing saved is deleted.** Where the standard stops showing something (Find Us introduction, closing invitation and sections, a Policies page hero), the saved data is kept and simply not shown.

## Words used in these documents

| Term              | Meaning                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Vendor website    | The public website of a vendor. `StorefrontContext.kind === 'VENDOR'`.                                             |
| Vendor standard   | The `vendorStandard` rule set in `packages/theme/src/theme-page-structure.ts`.                                     |
| Market standard   | The `marketStandard` rule set: Pasture, Meadow and Hearth on market websites.                                      |
| Vendor site class | `vendor-site`, added by `SiteLayout` to the layout wrapper of every vendor website.                                |
| Fixed Find Us     | The vendor standard's Find Us page: the next market, then the upcoming markets, nothing else (rule `fixedFindUs`). |
