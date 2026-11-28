# Market storefront themes

> **READ-ONLY REFERENCE.** This set of documents is the fixed specification for building market storefront themes. Do not edit, reformat, extend or "update" these files during feature work, and do not let an agent change them. If the code and these documents disagree, stop and ask the developer which one is right. Change these files only when the developer explicitly asks for it.
>
> Verified against `farmers-market-platform-web` (working tree based on commit `fb09982`) and `farmers-market-platform` (working tree based on commit `ea2c77a`) on November 27, 2026. Pasture (`pasture`, version 1) is the reference theme.

This folder explains everything needed to build a new market storefront theme: how a theme is put together, which pages a manager can edit, how the editor is organized, how styling is layered on top of shared markup, how checkout works, how the theme behaves on phones and how to register a new theme in both repositories.

Pasture was built to pave the way for later themes. Wherever a document says "for example" or "Pasture's choice", the point is the pattern, not the look. Wherever it says "must", every new theme follows it.

## Every market theme follows this standard

A market can choose Harvest, Editorial Market, Meadow, Hearth or Pasture. All five follow these documents. Harvest and Editorial Market are also vendor themes, but **on a market website each is a separate theme** that only shares its name and design format with the vendor theme:

| Market theme     | Theme folder                   | Stylesheet             | Site class               | Prefix |
| ---------------- | ------------------------------ | ---------------------- | ------------------------ | ------ |
| Harvest          | `components/market-harvest/`   | `market-harvest.css`   | `.market-harvest-site`   | `mh-`  |
| Editorial Market | `components/market-editorial/` | `market-editorial.css` | `.market-editorial-site` | `em-`  |
| Meadow           | `components/meadow/`           | `meadow.css`           | `.meadow-site`           | `mw-`  |
| Hearth           | `components/hearth/`           | `hearth.css`           | `.hearth-site`           | `hw-`  |
| Pasture          | `components/pasture/`          | `pasture.css`          | `.pasture-site`          | `pw-`  |

- The saved theme ID stays `harvest` or `editorial-market` for both kinds of website, so saved websites need no migration. The website's kind (`StorefrontContext.kind`) decides which theme's code runs.
- A change to a market theme's folder or stylesheet never reaches vendor websites, and a vendor theme change never reaches markets. Shared components (shop, product, cart, checkout, cards, section library) are still reused by both.
- Vendor websites have their own standard in [`docs/vendor-storefronts/`](../vendor-storefronts/README.md), which reuses the market storefront's shop, product page, checkout, contact form and footer structure.

## Structure and styling are kept apart

Every document is marked with the layer it covers.

- **Structure** is markup, components, data, routes, editor rows, saved settings and behaviour. It is shared by every theme, and a theme mostly reuses it.
- **Styling** is CSS: tokens, colors, type, spacing, motion and breakpoints. It belongs to one theme and lives in one stylesheet.

A structure document never describes colors or sizes. A styling document never describes data flow or editor logic. Checkout, mobile and Market Day each have both a structure part and a styling part, under separate headings.

## Reading order

| #   | Document                                         | Layer               | What it answers                                                                    |
| --- | ------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------- |
| 1   | [Architecture](01_ARCHITECTURE.md)               | Structure           | How a request becomes a themed page. What the theme owns and what is shared.       |
| 2   | [Pages](02_PAGES.md)                             | Structure           | Every route, whether it is editable, what a manager can place on it, where linked. |
| 3   | [Structure contract](03_STRUCTURE_CONTRACT.md)   | Structure           | The theme folder, required components, data attributes and reuse rules.            |
| 4   | [Styling](04_STYLING.md)                         | Styling             | The stylesheet, scoping, tokens, palettes and how to style new components.         |
| 5   | [Editor](05_EDITOR.md)                           | Structure           | How the website editor is organized and how to add a theme control.                |
| 6   | [Checkout](06_CHECKOUT.md)                       | Structure + Styling | Shop to cart to checkout to confirmation, and what a theme may restyle.            |
| 7   | [Mobile](07_MOBILE.md)                           | Structure + Styling | What changes on tablets and phones, and the breakpoints.                           |
| 8   | [Market Day](08_MARKET_DAY.md)                   | Structure + Styling | The homepage that replaces the normal one while a market is open.                  |
| 9   | [New theme checklist](09_NEW_THEME_CHECKLIST.md) | Both                | Every file to add or touch, in both repositories, in order.                        |
| 10  | [Testing and preview](10_TESTING_AND_PREVIEW.md) | Process             | How to preview, test and qualify a theme without harming the test data.            |

## Rules that apply everywhere

1. **Code wins.** These documents describe the code at the commits above. Older notes in `docs/` (for example `PASTURE_THEME.md`, `THEME_PAGE_STRUCTURE_STANDARD.md`, `MEADOW_THEME.md`, `HEARTH_THEME.md`) are history. Where they conflict with the code, the code is right.
2. **Read the project rules first.** `AGENTS.md`, `COMPONENT_USAGE_GUIDE.md` and `UI_COMPONENTS.md` at the repository root still govern all UI work. This folder applies them to storefront themes; it does not replace them.
3. **A theme is presentation.** It never changes prices, inventory, eligibility, payment, sign-in or any other backend authority. It never imports admin services into customer pages.
4. **Reuse before you build.** A theme adds its own header, footer, hero and homepage layout. Everything else (shop, product, cart, checkout, forms, section library, Market Day) is shared markup that the theme styles but does not rebuild.
5. **Every new setting is optional.** Websites saved before a setting existed must keep working without migration.

## Words used in these documents

| Term                 | Meaning                                                                                                                                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market storefront    | The public website of a market (as opposed to a vendor's website). `StorefrontContext.kind === 'MARKET'`.                                                                                                                                                                                            |
| Theme                | A presentation of the website, chosen when the website is created. Stored as `appearance.theme`.                                                                                                                                                                                                     |
| Market theme         | Any theme on a market website: Harvest, Editorial Market, Meadow, Hearth, Pasture (`marketStorefrontThemes`). Each follows the market standard.                                                                                                                                                      |
| Market-only theme    | A theme that only markets can use. Today: Meadow, Hearth and Pasture (`marketOnlyStorefrontThemes`).                                                                                                                                                                                                 |
| Market standard      | The `marketStandard` page rule set in `packages/theme/src/theme-page-structure.ts`, used by every market theme.                                                                                                                                                                                      |
| Harvest contract     | The saved content shape shared by Harvest and every market-only theme: `harvestComposition`, `market`, `pageSections` and the page settings. Market Editorial keeps its homepage order in its Editorial template settings and uses the shared page settings and `pageSections` for every other page. |
| Native section       | A section the theme draws itself, such as the homepage hero. It can be reordered but not deleted.                                                                                                                                                                                                    |
| Library section      | A section a manager adds from Add Section: Text, Image with Text, Call-to-Action Banner, Image Banner, Image Gallery, Feature Grid.                                                                                                                                                                  |
| Page region          | The `before` and `after` slots around a page's own content where library sections can sit.                                                                                                                                                                                                           |
| Page structure rules | The per-theme switches in `themePageStructure` (`packages/theme/src/theme-page-structure.ts`).                                                                                                                                                                                                       |
| Site class           | The class on the layout wrapper that scopes a theme's CSS, for example `.pasture-site`.                                                                                                                                                                                                              |
| Theme prefix         | The short class prefix a theme uses for its own markup, for example `pw-` for Pasture, `mw-` for Meadow, `hw-` for Hearth.                                                                                                                                                                           |
| Editor preview       | The website editor's iframe, which renders the real Astro pages with the unsaved draft. `Astro.locals.editorPreview` is set.                                                                                                                                                                         |
