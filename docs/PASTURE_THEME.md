# Pasture theme

Pasture is a market website theme with template ID `pasture` and version `1`. Like Meadow and Hearth, only markets can use it. Its look comes from the reference design for a bright green farmers market: a mint page, drifting clouds, curving leafy sprigs, striped fields with trees, a wooden sign of green slats behind the headline, and a hero photo that fills the right side of the hero inside a thick wavy green band.

The original theme work added no schema migration. Pasture now also follows the page structure standard in [THEME_PAGE_STRUCTURE_STANDARD.md](THEME_PAGE_STRUCTURE_STANDARD.md), whose market contact form adds migration `1798200000000-MarketStorefrontContact`.

## Skeleton and editing rules

Pasture follows the same model as Meadow and Hearth ([MEADOW_THEME.md](MEADOW_THEME.md), [HEARTH_THEME.md](HEARTH_THEME.md)). Pasture stores its content in the Harvest market contract, so the editing rules and the page list are the same:

- **Pages:** Pasture has the pages Meadow and Hearth have (Home, Shop, product, cart, checkout, Market Dates, Vendors, Become a Vendor, Our Story, FAQ, Policies and Contact) plus a market Terms & Conditions page. How each page is composed and linked is set out in [THEME_PAGE_STRUCTURE_STANDARD.md](THEME_PAGE_STRUCTURE_STANDARD.md).
- **Editable homepage parts:** the hero title, introduction, hero image, both button labels and destinations, every section heading and link label, the closing banner heading and button, and the footer tagline. Managers can reorder, hide and add homepage sections from the shared Add Section library.
- **Hidden supporting text:** as in Meadow and Hearth, section headings stand alone. `headingOnlyMarketText` hides the markets, vendors, categories and closing supporting text, and new websites start with empty market page descriptions.
- **Fixed parts:** the illustrations, fields, clouds and the wavy photo frame are decorative and cannot be edited.

| Area                                                   | Source                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Homepage order, market copy, market pages              | Harvest contract: `harvestComposition`, `market`, `pageSections`                |
| Add Section library                                    | Harvest section renderers, registered for `pasture` in the section manifest     |
| Market date selection, shop, product, cart, checkout   | Shared routes and islands, unchanged. Checkout uses the shared `StripeCheckout` |
| Market Day mode                                        | Shared `MarketDayHome`, countdown and live island, with Pasture's hero          |
| Header behaviour and navigation list                   | Shared: `lib/market-theme-header.ts`, `marketSiteNavigation`                    |
| Header, footer, hero, homepage sections, illustrations | `apps/storefront/src/components/pasture/`                                       |
| Styles                                                 | `apps/storefront/src/styles/pasture.css`, linked only for Pasture               |

## The hero photo

The photo in the hero (the farmer holding vegetables in the reference design) is the existing **Hero image** in the editor's Hero settings (`homepage.image`). No photo is included with the theme. The photo is not limited to the page width: it fills the right half of the hero out to the window edge, and its top and left sides follow a wavy curve with a thick band in the leading color and a thin loose line outside it. On screens narrower than 860px the photo moves below the copy, still meeting the right edge, and the fields run across its foot.

The curve is written once in `pasture/Hero.astro` in the photo box's own 0 to 1 units. It is used both as the photo's clip path and as the band, so the two always meet at any size. The band keeps an even thickness because it is drawn with `vector-effect: non-scaling-stroke`.

Pasture has no **Hero image shape** setting. The wavy frame replaces it, so the editor hides that control for Pasture, and Pasture's hero does not carry the shared `data-hero-shape` and `data-theme-hero-frame` hooks. A saved `market.heroShape` value is kept but has no effect.

Until a manager adds an image, the frame shows a placeholder: a sky-and-field drawing with an image badge in the open middle of the frame. Inside the editor preview it also says "Add a hero image in Hero settings". The shared `.harvest-photo-placeholder` is a single glyph sized for section images, so it could not fill a full hero frame. The hero placeholder is therefore part of `pasture/Hero.astro`.

The reference headline has two colors: a brown word above a green banner. The editor has one title field, and the live preview replaces its text as a whole, so Pasture puts the whole title on one wooden sign. The sign is a single panel sized to the title, however many lines it wraps to, with the text centered on green slats, nail heads at the corners and two slat ends sticking out past the sides.

## Bottom of the hero

The bottom of the hero is one drawing, `pasture/Fields.astro`: three layers of fields with curved crop rows, a pine, two leafy trees and a scattering of small swaying flowers. The trees stand part way down the slope at different heights, not on the crest, so their ground shadows fall on the hillside. They are placed inside the field drawing, so they stay planted at every width. The drawing keeps its proportions and is cropped from the right on narrow screens, so the trees on the left stay in view. The footer draws the same fields with its own row of trees and pines and more swaying flowers, crops the sky off the top and adds a deep green strip that runs into the footer band.

Each tree and flower is listed in `Fields.astro` by its centre, the height it stands on and its size, so it is easy to move one.

## Header

The header has no background at the top of the page. When the hero opens the homepage, the hero slides up under the header (by `--pw-header-height`), so its sky, clouds and leaf run to the top of the window and the leaf looks like it is hanging in from above. The photo and the top-right sprig move down by the same amount. Once the page scrolls, the header turns cream with a shadow. The Market Day hero slides under the header the same way.

The three hero clouds drift across the whole hero and come back round, each at its own pace. With reduced motion they stay still.

## Colors and buttons

The Colors setting sets Pasture's leading color. Every option is dark enough for white button text:

| Setting      | Pasture color |
| ------------ | ------------- |
| Sage         | Field green   |
| Terracotta   | Tomato red    |
| Coastal blue | Sky blue      |
| Charcoal     | Slate         |

Sunflower yellow stays the accent. New Pasture websites start with pill buttons. Button hover style, typography, card color themes and text sizes keep working.

On market day the hero keeps its everyday colors and adds a red Market day tag. The countdown is painted on a wooden sign like the headline. See the Market Day section of [THEME_PAGE_STRUCTURE_STANDARD.md](THEME_PAGE_STRUCTURE_STANDARD.md).

## New components and why

These notes follow the component reuse rules.

- `pasture/Header.astro`, `pasture/Footer.astro`: the theme needs its own shell, as Meadow and Hearth do. They reuse the shared `MarketCartLink`, `HeaderAccountMenu`, navigation lists, header behaviour and `FarmstandIcon` unchanged.
- `pasture/Hero.astro`, `pasture/MarketHome.astro`: Pasture's homepage layout differs from the other themes'. They keep the same data, links and `data-editor-section`, `data-home-text` and `data-market-text` identities, and reuse `MarketDateList`, `MarketVendorCards`, `WebsiteSections`, `EmptyState` and `Button`. The title text sits in an inner `.pw-plank` span that carries `data-home-text="title"`, so the wooden sign stays one panel around the title while the live preview still replaces only text.
- `pasture/Fields.astro`: the field scene shared by the hero and the footer, so the two match.
- `pasture/Art.astro`, `pasture/art.ts`: an illustration set made for this theme, all decorative (`aria-hidden`). Categories without a photograph get the closest drawing. Sprigs, flowers and the potted sprout grow on curved stems, with leaves set along the curve. Trees have a forked trunk and a layered, lobed canopy, and a `pine` drawing adds a conifer.

No new UI primitive, UI library, font or external image was added. The customer account area keeps the shared dashboard shell and is not themed.

## Other touched files

- **Theme contract:** `packages/theme/src/storefront.ts` (`isPasture`, theme lists, schema enum), `packages/theme/src/website-section-contract.ts`, `packages/api/src/storefront-appearance.ts`
- **Storefront wiring:** `SiteLayout.astro`, `pages/index.astro`, `MarketDayHome.astro` (theme heroes are now looked up by theme instead of chosen by a two-way ternary), `ProductCards.astro`
- **Admin:** `VisualStorefrontEditor.tsx` hides the Hero image shape control for Pasture. The Website Library and the rest of the editor read the theme lists.
- **Backend (sibling repository):** `storefront-appearance-config.ts`, `storefront-website-templates.ts` (the pill button default), `website-section-contract.ts` (a byte-identical copy), `storefront-appearance.service.ts`, `public-storefront.controller.ts`, and `test/farmers-market/market-website-library.ts`
- **Tests:** `tests/pasture.test.ts`

## Manual testing

Restart the demo backend first so it accepts the new template. Do not reset or reseed the persistent test database.

1. Open `http://localhost:4322/market`, sign in as the market manager and open the Website Library.
2. Choose New Website, select Pasture, name it and create it. This creates a draft and does not replace the live website.
3. In the editor, confirm the hero shows the placeholder inside the wavy frame and that Hero settings has no Hero image shape control. Add a hero image in Hero settings and confirm the photo fills the frame out to the right edge.
4. Edit the hero title and introduction, change Colors, reorder homepage sections and add a section from the library. Confirm the preview updates.
5. Browse the preview: Shop, a product, Market Dates, Vendors, Become a Vendor and Our Story.
6. Publish when ready, then open the market's public address and go through to the Stripe card form.
