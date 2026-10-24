# Vendor homepage refinement

Implemented locally. No persistent migrations, fixture changes, deployments, account changes, or remote Git operations were performed.

## Implementation

Vendor pages using SiteLayout now share HarvestHeader and HarvestFooter, including conditional published About links and active Shop/About/Account navigation. Customer dashboard shells and market page layouts are retained. Vendor typography applies across those public pages.

The vendor hero now favors the text column, with a stable square image frame and six selectable shapes: square, rounded square, circle, dome, star, and a single rounded bottom-right corner. CSS clipping and object-fit preserve cropping without image processing.

Featured products reuse ProductCards, the shared Card surface, Button and existing Shop API bridge. Card and image radii derive from button roundness. A stretched product link covers the non-action surface while purchase controls remain independent keyboard targets. A single variant can be added directly with a pending lock, server inventory validation, feedback and a cart link. Products with multiple variants route to existing option selection. Inventory remains backend-authoritative; stock errors are reported on submission rather than represented by a new stock cache.

The vendor editor offers three ordered product slots, duplicate exclusion, removal/replacement, search, and an explicit automatic-collection toggle. Automatic preserves the previous first-three behavior. An explicitly empty selection stays empty. Public requests filter the existing public catalog by saved IDs and restore saved order; missing/unpublished products are omitted without substitution. Product search returns up to 100 matching owned enabled products in the current channel. Save and publish revalidate ownership/channel/public eligibility.

The homepage About section has a contrasting theme background, prominent heading, dedicated short vendor blurb, optional photograph and image description. Missing images use a deliberate text layout. A story link appears only when the full published About page is enabled. Existing legacy homepage stories remain visible until the vendor explicitly configures the new section. The full About page itself retains its basic layout.

The closing shopping invitation now groups heading, supporting copy and shopping action in a responsive composition. It uses the selected palette and card-corner token.

Five curated system-font pairings provide editorial serif, minimal sans, warm serif, friendly sans, and refined mixed typography. The current choice is shown in a type specimen and the existing preview. No font downloads or dependencies were added. Actual font availability follows the operating system and the declared fallback stack.

## Configuration and components

Updated: SiteLayout, HarvestHeader, HarvestHero, VendorHome, ProductCards, homepage CSS, StorefrontAppearance editor, API adapter, theme configuration/tokens and backend appearance validation/service/resolver. FeaturedAdd is a small purchase composition because ProductPurchase includes a detail-page variant/quantity form and fixed field identifiers unsuitable for repeated collection cards. It reuses shared Button and shopCall rather than adding a cart system.

The optional vendor configuration extends the existing JSON draft/published document. Old documents remain valid without rewriting stored content. Shape/font allowlists, unique maximum-three numeric product IDs, bounded text, required enabled blurb, image protocol/credential rules and existing tenant permissions remain server-enforced. Market writes cannot adopt vendor-only options. Existing optimistic versions and private draft/public published boundaries are retained. No database migration is required beyond the already installed Phase 1 schema.

Preview reflects fonts, actual image clipping, button shape and complementary card corners. It remains a sample rather than a live draft commerce page. The supplied prompt described the About reference composition; no reference photograph was included or copied.

## Verification

- 30 focused frontend tests passed. They cover six shapes, font defaults, legacy configuration, duplicate IDs, required blurb, existing appearance draft/publish controls, and locked cart submission through the existing bridge.
- Disposable backend qualification passed, including owned product search, cross-vendor featured-ID rejection, ordered persistence/publishing, existing draft isolation, permissions and fixture preservation. Its database was dropped by the existing guard.
- TypeScript/Astro, focused ESLint, package boundaries and local frontend/backend builds passed. Existing bundle-size advisories remain.
- HTTP SSR qualification could not start because Astro detected the existing development server at port 4321. It was left untouched. No browser automation, screenshots, or visual comparisons were performed.

## Manual review

Use the existing populated vendure_demo_market_ops environment and homepage.vendor@example.test. The existing local password reference is demoPassword in backend scripts/market-operations-demo/environment.ts. Do not reseed or reset. No new fixture accounts are needed.

Start the existing environment with the web directory's demo:market-operations:serve, :worker, :admin and :storefront scripts as needed. Restart existing processes normally to load changed backend schema/code. This phase requires no new persistent migration or fixture command.

1. Open http://localhost:4322/vendor/storefront in the dedicated vendor context. Try each shape and font, and each button roundness. Check the image sample, typography specimen, button and card corners.
2. Disable Automatic collection. Search/select up to three owned products, change their order using the slots, remove one, and save draft. Refresh http://homepage-vendor.localhost:4321/ and confirm it has not changed. Publish and confirm selection/order. Save an empty selection and confirm no unrelated products appear.
3. Add an authored short About blurb and optionally an allowed image URL/description. Enable the homepage section. Save/publish. Confirm the large section is visible independently from the full About page. Toggle the full page to verify the story CTA appears only when published and enabled. Hide the section, then re-enable to verify saved content remains.
4. Check the same header/footer and fonts on /, /products, a linked product detail, /about when enabled, and /cart. Check Shop active state, account/cart navigation, mobile Menu, Escape dismissal, keyboard focus and absence of horizontal overflow. Customer dashboards retain their own shell.
5. Click a product's image, name or non-action area to visit its detail page. Use Add to cart on a single-variant product, including a rapid second click. Expect one pending request and clear feedback. Check /cart for the correct variant. Multi-variant products must offer Choose options. Unavailable stock must produce safe feedback without adding incorrect inventory.
6. Review desktop, laptop, tablet and narrow-phone layouts: hero text wrapping and shapes, three aligned cards, About stacking, final CTA, navigation/footer spacing and reduced-motion behavior.
7. Use the existing dedicated market at http://homepage-market.localhost:4321/ to confirm its composition remains unchanged. Verify another vendor's settings and admin dashboard fonts remain independent.

## Limits

No full live draft preview, font upload/download infrastructure, media manager, stock cache, new theme, or non-homepage content redesign was added. Visual acceptance and the blocked HTTP rendering rerun remain for manual review. Existing catalog/session/cart authority is unchanged. If HTTP qualification is desired, run npm run test:storefront:homepage after the existing Astro dev server is stopped normally.

## Appearance editor follow-up

Typography and its font specimen now live in Appearance. Homepage content immediately follows Appearance. Hero and homepage About image shapes use the same shared SelectField, directly below their respective image URL fields, with a shape symbol beside each option. About image shape is an optional validated vendor setting; existing documents retain rounded About images. Both image shapes follow the existing draft/publish workflow and appear in the preview. No migration or fixture changes are required.
