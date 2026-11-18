# Bloom theme

Bloom is a vendor website theme with template ID `bloom` and version `1`. It is offered to vendors only, beside Harvest, Editorial Market and Modern Farmhouse. It is the lively one: wavy section edges, photographs cut into hand-drawn shapes, coloured blobs peeking out behind pictures, and small doodles (a sprout, a squiggle, a spark, a loop, dots).

No schema migration, deployment or hosting change is part of this work.

## What Bloom shares and what it owns

Bloom is a presentation of the existing Harvest vendor website, the mirror image of Meadow and Hearth on the market side. It stores its content in the Harvest vendor contract, so the visual editor, the Add Section library and every commerce flow work exactly as they do for a Harvest vendor website.

| Area                                                       | Source                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Homepage order (hero, featured, about, closing + sections) | Harvest vendor contract: `harvestComposition`, `vendor`, `pageSections`                   |
| Add Section library                                        | Harvest section renderers, registered for `bloom` in the section manifest                 |
| Shop, product, cart, checkout, success                     | Shared routes and islands, unchanged. Cart and checkout stay outside the editor.          |
| Header, hero, homepage, footer markup                      | Shared Harvest components (`HarvestHeader`, `HarvestHero`, `VendorHome`, `HarvestFooter`) |
| Styles                                                     | `apps/storefront/src/styles/bloom.css`, linked only for Bloom                             |

Every rule in `bloom.css` is scoped to `html[data-storefront-theme='bloom']` or `.bloom-site`, so no other theme changes.

## Shapes

- **Photo shapes** are hand-authored closed bezier paths (pebble, dent, egg, lumpy, dome, round, leaf, flower) and three wobbly rectangles for cards. They are SVG data URIs applied as CSS masks, never `border-radius`, and siblings rotate through different shapes (`nth-child`) so neighbours never match. The paths live in the token block at the top of `bloom.css`; edit a path there to change a shape everywhere.
- **Section edges** are two wide, non-repeating waves per edge. A full-width band masks its own top and bottom, so the page paper shows through and no section needs to know its neighbour's colour.
- **Contained tinted sections** draw a hand-cut card on a background layer (`::after`) instead of masking the section, so content, focus rings and menus are never clipped.
- Photo and card masks sit on photographs, their frames or decorative layers. Full-width tinted bands mask their own wavy edges; their content is padded clear of the wave, and dialogs render in the top layer outside the mask. In the editor, a selected band draws its outline inside the solid part so the wave never hides it.
- Wide boxes (split and minimal banners, photo tiles, large image-with-text photos, galleries in landscape or portrait) use the wobbly cards; blob layouts are kept square so a drawn blob never stretches into an oval.
- Only tinted backgrounds get edges. A section left on the default paper background, contained or full, sits directly on the page and has no visible wave; choose Surface (a sky wash) or Ink (the leading colour) to get one.

The saved image-shape settings still work wherever an image carries one (hero, homepage About, Our Story, Find Us): square, rounded and the natural shapes become wobbly cards, circle the round blob, dome the dome, corner the leaf, star the flower. The shared radius and star polygon are replaced, not layered. No new appearance field was added.

## Colours

The Colors setting swaps Bloom's whole matched set: the page background, surfaces, text, the leading colour and all four accents, so washes, card backings behind product photos, chips, doodles and buttons all change together. Every leading colour carries cream text.

| Setting      | Bloom palette     | Leading | Pop     | Sunshine | Page    |
| ------------ | ----------------- | ------- | ------- | -------- | ------- |
| Sage         | Fern & sunshine   | #2F6B4A | #FF8A5C | #FFCD4F  | #FDF8EC |
| Terracotta   | Paprika & apricot | #B4432B | #F2A65A | #F4CF62  | #FFF6EE |
| Coastal blue | Lagoon & lemon    | #2457A0 | #FF8F6E | #FFD75E  | #F7F9FD |
| Charcoal     | Plum & blush      | #5B3A70 | #FF9EB5 | #F2C15A  | #FCF6F7 |

`bloomPalettes` in `packages/theme/src/storefront.ts` is the list of values. The editor's palette picker shows these names and swatches for Bloom (other themes keep the shared presets), and `styles/bloom.css` declares the same values per `data-theme-palette`. `tests/bloom-theme.test.ts` keeps the two identical and fails if any other colour literal appears in the stylesheet. Shared status colours (alerts, errors) stay shared.

New Bloom websites start with pill buttons. Button shape, typography, text sizes and section backgrounds keep working.

**Button hover is fixed for Bloom.** The editor does not show the Button hover effect field for Bloom (`themeOffersButtonHover`), Bloom pages render without the hover attribute, the preview does not add it back, and the backend stores the default (`lift`) for any Bloom save.

Motion (a slowly wobbling hero blob, floating doodles, a pop-in hero photo, hover tilts) stops under reduced motion and in the editor preview.

## Buttons, shop cards and navigation

- **Buttons.** Every text button is a sticker like the hero's primary button: a solid fill with a matching edge and a hard shadow underneath. Primary buttons use the leading colour; secondary and tertiary text buttons use the palette's sunshine colour with ink text. In the hero, which sits on a sunshine wash, the secondary button takes the palette's pop colour instead, matching the blob behind the hero photo. Hover and press follow Hearth's model whatever hover style is chosen: the button lifts 3px with a deeper shadow, then presses flat on click. Icon buttons, disclosures, calendar days, cart steppers, gallery thumbnails, account-menu actions and destructive actions keep their own presentation.
- **Shop cards** copy the homepage featured cards exactly: three columns (two below 850px, one below 580px), the same gap, title size, spacing, price chip and natural-width button. A product unavailable at the chosen market keeps its full-colour photo, here and in You might also like; its availability line and Unavailable button say so. Disabled text buttons are solid (a soft palette fill with deep lettering, no shadow) instead of the shared see-through look.
- **Category filters** use a soft rounded checkbox with a drawn check, and the selected pill keeps padding on both sides of the check.
- **Header.** Every page link (Shop, FAQ, Contact, Find Us, About) shows the selected shape on its own page; `HarvestHeader` now marks FAQ, Contact, Find Us and Policies with `aria-current`, which Harvest presents with its existing underline. Bloom lists Policies in its footer only, and only when the page is enabled.

## Corners, phones and menus

- Photo shapes (product cards, galleries, banners) use cards with generously rounded corners, and the hero's dome has rounded lower corners. Wide panels (the market banner, tinted section panels, feature cards, banner copy cards, framed text and full-photo panels) use soft, uneven corner radii (`--bl-panel`, `--bl-panel-2`) instead of a stretched drawing, so their corners stay soft at any width.
- The coloured blob behind the hero photo is drawn by the photo's own frame, so the two stay together at every width.
- On phones (700px and below) the shop is two columns; every other product row (Featured, product showcases, You might also like) is a swipeable carousel that snaps card by card and peeks at the next card. Showcases set to the Carousel layout keep their own controls.
- From 1050px down the header shows a lone hamburger in the top-right corner, in the header's colour, which turns into a close mark while open. The navigation and account menus open as matching cream panels with a short drop animation (none under reduced motion); the current page is highlighted in the navigation menu.

## New components and why

No new component was created. Bloom reuses the Harvest vendor header, hero, homepage composition, footer, `ProductCards` and all eight section renderers unchanged; the theme is a stylesheet plus registration. `ProductCards` shows Harvest's placeholder artwork for Bloom too.

## Touched files

- Theme contract: `packages/theme/src/storefront.ts` (`storefrontThemes`, `vendorOnlyStorefrontThemes`, `isBloom`, `usesHarvestContract`, schema enum and market-content refusal), `packages/theme/src/website-section-contract.ts`, `packages/api/src/storefront-appearance.ts`
- Storefront: `layouts/SiteLayout.astro` (stylesheet, `bloom-site` class, palette attribute), `components/ProductCards.astro`, `components/home/HarvestHeader.astro` (active link state, Bloom keeps Policies out of the header), `lib/editor-preview-client.ts` (does not add a hover attribute to Bloom), `styles/bloom.css`; tests `tests/bloom-theme.test.ts` and `tests/bloom-editor.test.tsx`
- Admin: `VisualStorefrontEditor.tsx` (Bloom palette names and swatches, no hover field for Bloom). The Website Library offers Bloom to vendors because it is not market-only; markets never see it because it is not in `marketStorefrontThemes`.
- Backend (sibling repository): `storefront-appearance-config.ts`, `storefront-website-templates.ts` (Bloom starter with pill buttons), `website-section-contract.ts` (byte-identical copy), `storefront-appearance.service.ts`, `public-storefront.controller.ts`, and `test/farmers-market/market-website-library.ts`

## Verification

- Backend `npm run test:storefront:market-websites` passed in a disposable `vendure_test_*` database, including new Bloom checks: refused for markets, created for vendors with pill buttons, reorderable Harvest vendor homepage, market natives refused, theme immutable.
- Astro check: 0 errors. `tsc --noEmit` reports nothing mentioning Bloom (the repository has unrelated pre-existing test type errors). Prettier passes on touched files.
- Web `test:storefront:websites` passed. The section-contract parity test passes.
- Pre-existing failures unrelated to Bloom (they fail the same with Bloom removed): `storefront-appearance.test.tsx` cannot find the "Color palette" label, and `website-sections.test.tsx` "accepts explicit page regions" expects 5 sections where 6 are now offered. `npm run test:storefront:homepage` fails on a Harvest editor-preview `/products` render returning 503 from its mock backend. The backend `test:storefront:websites` fixture fails on a missing `customFieldsCatalogdetails` column before any theme code runs; its harness may have retained the failed `vendure_test_websites_*` databases.
- Browser: reviewed on the Manna Roots storefront with a temporary dev-only hook (since removed) that swapped in Bloom and a synthetic homepage, without any database write. Covered: hero first and not first, homepage About with the star shape, every addable section (banner photo-overlay/split/minimal, gallery grid/mosaic/strip/carousel, feature grid standard/highlighted/beside/bordered, product and category showcases, text featured/framed, image with text, call to action) on paper, surface and ink, contained and full; Shop, product, Our Story, FAQ, Contact, Policies, Find Us, empty cart and empty checkout; desktop and phone widths; two palettes; the editor selection outline on a band.
- Not viewed: a populated cart and checkout (the demo market has no shoppable products for this vendor) and the live editor itself (creating a Bloom website writes to the database). Cart and checkout use the shared light-surface layouts with Bloom's rounded controls.

## Manual testing

Restart the demo backend first so it accepts the new template. Do not reset or reseed the persistent test database.

1. Open `http://localhost:4322/vendor/storefront` as a vendor and open the Website Library.
2. Choose New Website, select **Bloom · Free**, name it and create it. This creates a draft and does not replace the live website.
3. In the editor, change Colors, reorder the homepage sections and add each section type from the library (Image Banner, Image Gallery, Feature Grid, Product Showcase, Category Showcase, Text, Image with Text, Call-to-Action Banner). Try contained and full backgrounds in paper, surface and ink.
4. Browse the preview: Shop, a product and Our Story. Cart and checkout stay outside the editor.
5. Publish when ready, then add a product to the cart and continue through checkout.
