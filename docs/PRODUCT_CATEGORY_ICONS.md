# Product category icons

All 90 category illustrations have been replaced: 52 use the developer-supplied SVG geometry and 38 are new drawings matching its 24 by 24 outline style, currentColor, 2-unit strokes and rounded caps/joins. Supplied Lucide and Tabler geometry is preserved, including separate paths, circles, rectangles and explicit fills. The invisible Tabler canvas paths and preview-only CSS classes are omitted. No icon dependency or raster generation is used.

The supplied list was matched to the existing canonical codes by category meaning. Abbreviations such as Cookies, Cakes, Spiecs, Flowers, Bath, Home and Farm and Garden do not rename categories. Each repeated Other entry belongs to its corresponding parent. The category names, permanent codes, ordering and classification remain unchanged.

`packages/ui/src/category-icons.ts` owns the trusted shape registry, keyed by permanent taxonomy codes including the full parent prefix for children. `CategoryIcon` in `@market/ui`, the native Astro adapter and standalone SVG/data URL exports all consume this registry and its shared viewBox. Each supplied shape renders independently so multi-shape geometry and fills survive. Unknown codes have no generic substitute.

The existing CategoryIcon components were extended in place to support multiple SVG shapes. No new UI component, icon library, button, card, dashboard shell or styling system was introduced. Utility/control icons remain in their existing components. The vendor catalog and Editorial Market consumers keep the existing shared artwork integration and explicit editor-selected image precedence.

## Newly drawn icons

These are the 38 categories without supplied SVGs, using their existing names. Turkey follows the supplied chicken/drumstick motif; Lamb & Goat and Other Meats follow the supplied beef cut; Clothing follows the supplied shirt.

- Meat & Poultry
- Turkey
- Lamb & Goat
- Other Meats
- Dairy & Eggs
- Yogurt & Cultured Dairy
- Pantry & Preserves
- Honey & Syrups
- Jams & Jellies
- Pickles & Fermented Foods
- Sauces & Condiments
- Oils & Vinegars
- Spices & Seasonings
- Nuts & Seeds
- Dried Foods
- Sweets & Confections
- Chocolates
- Candy & Confections
- Frozen Treats
- Other Sweets
- Prepared Foods
- Prepared Meals
- Dips & Spreads
- Frozen Meals
- Beverages
- Tea
- Juices & Cider
- Kombucha & Fermented Drinks
- Other Nonalcoholic Beverages
- Vegetable & Herb Starts
- Seeds & Bulbs
- Haircare
- Candles
- Clothing
- Textiles
- Farm & Garden Supplies
- Soil & Compost
- Farm & Livestock Supplies

## Local preview

Run `npm run demo:market-operations:storefront` from the web project and open `http://127.0.0.1:4321/category-icons`. Every parent appears with its complete child list, including categories without products. Select an icon to download its standalone SVG. The page reuses SiteLayout, shared card/button presentation and theme tokens. It requires no login or database query of its own, has no navigation entry, sends no-store/noindex headers and returns 404 outside development.

`category-icon-reference.ts` is an unchanged review-only vocabulary snapshot from November 2, 2026. It does not supply live taxonomy or category navigation. The backend remains the category authority.

## Verification

- All 90 categories have distinct, nonempty artwork. All 52 supplied SVGs were compared to the source attachment and preserve every visible shape and attribute exactly.
- 21 focused tests passed across category artwork, the vendor catalog and Editorial Market. Coverage includes React/standalone SVG shape and attribute parity, unknown codes and explicit image precedence.
- Astro checked all 194 files with no errors, warnings or hints. Focused ESLint passed. The full repository TypeScript check still reports unrelated errors in the unchanged application-review, phase15 and occurrence-layout test fixtures; no category icon errors were reported.
- The local review route returned 200 and rendered all 90 SVGs without browser errors or geometry outside the viewBox. All 90 Astro icons matched their standalone download geometry and attributes, and an SVG download completed. The complete desktop page was visually inspected. Desktop at 1360 pixels and mobile at 390 pixels had no horizontal overflow.

No database changes or migrations are required.
