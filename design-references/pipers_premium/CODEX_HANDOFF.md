# CODEX HANDOFF — Premium Modern Farmhouse theme

## Intent
Create an **original**, visibly premium, "Modern Farmhouse" vendor storefront theme, strongly inspired by the photographic and editorial *design principles* in P01–P06. References C01–C03 only fill gaps for footer/cart/shop UI. Do not duplicate third-party logos, copyrighted photography, branded language, distinctive layouts pixel for pixel, or editorial content.

**Important:** Do not confuse this with making small CSS changes to Harvest. A paid theme warrants clear, independent visual composition, consistent typography/components and compelling image treatments, while continuing to reuse all shared commerce/authorization/appearance functionality.

## Design concept
- Mood: refined rural, artisan, warm, photogenic, credible; not shabby-chic, cluttered, cartoonish, or ultra-minimal sterile.
- Palette (proposed, not sampled from Pipers): warm parchment `#F6F3EA`, ivory `#FFFEFA`, deep evergreen `#253C30`, text charcoal `#262824`, sage `#8E9D85`, restrained russet `#A46046`, fine border `#DFDBCF`.
- Typography: editorial serif headlines plus readable understated sans-serif UI; reuse current font infrastructure and licensed fonts; no proprietary font files.
- Space: ample outer padding, breathing room between rich images, consistent type scale, 1px borders and subtle dividers, no heavy shadow stacks.
- Controls: rectangular/pill hybrid with restrained radius, contrasting filled primary button, bordered secondary button, underlined text link with arrow, circular outline arrow affordance for cards, high-contrast focus states.
- Motion: subtle entrance/hover motions (150–350ms), photo scale only inside clipped frame, content-opacity fades, optional header transition; reduced-motion compliant; no expensive scroll animation libraries unless already present and necessary.
- Photo rules: Vendure-owned/approved media from the business, real photographic crop compositions, elegant fixed-aspect frames, no stock screenshots as runtime assets, no hotlinking original Pipers design imagery.

## Reference map
| UI or page | Primary reference | Supplemental | Adaptation details |
|---|---|---|---|
| Header + hero | P01, P02 | P07 | Large cinematic photograph, credible contrast overlays; maintain functional nav and user/cart affordances |
| Promotional/category tiles | P03 | P04, P08 | Editorial photo panels, offset typographic labels, arrow-in-circle; mobile stacked |
| Mobile layout | P04 | P01 | Real responsive component hierarchy, no unusable hidden actions |
| Product gallery/detail | P05, P06 | — | Large hero product photo and supporting thumbnails, purchase panel with slim controls and accordion dividers |
| Shop grid/filter | P03 | C03 | Photo-forward product grid and calm controls, preserve backend categories and eligibility |
| Cart + checkout | P05 for controls | C02 | Functional hierarchy, order summary, status/validation; do not copy delivery model |
| Footer | P01 for overall color mood | C01 | Structured navigation, brand identity, legal/contact; links conditional on live page availability |
| Content pages | P03 and P05 for typography | C01 for tone | Editorial serif headings, text measure; respect existing page-specific width limits |

## Page coverage — implement all existing vendor-storefront routes

1. **Homepage `/`** — dramatic farm image hero, layered CTA, optional announcement strip only if truthful/controlled; simple brand intro; 2–3 category or shopping features from existing content; gorgeous featured product cards; existing About preview; closing CTA; responsive header/footer. Use existing homepage settings, not hardcoded vendor text or additional content fields unless truly required.
2. **Shop `/products`** — restrained title/header, product category controls, sort/pagination, premium image cards (name, price, category, availability), appropriate hover/focus, subtle borders. **Keep the authoritative market selection banner and occurrence behavior**; do not equate visible with purchasable.
3. **Product Details `/products/[slug]`** — P05 inspiration: visual image gallery on left, refined quantity/variation/price and market context at right, clear Buy action, product-information accordion, optional related-product editorial row. Keep existing BFF/Vendure cart and stock validation.
4. **Cart `/cart`** — preserved two-column cart/order summary and selected-market heading, improved typography/dividers, quantity/remove, totals, upsells if already present; no invented discounts/charges.
5. **Checkout `/checkout`** — restrained form and right summary consistent with premium theme; field errors/focus, guest and account state, market pickup, disabled/payment-placeholder states unchanged; do not activate Stripe or replace checkout architecture.
6. **Success `/checkout/success`** — premium but minimal confirmation, actual authorized order data, no fabricated receipt/payment state.
7. **Our Story `/about`** — retain **68rem editorial width**, existing repeatable sections, image shapes/sizes, alignments, legacy handling and closing invitation. Only change presentation.
8. **Find Us `/find-us`** — normal storefront width, dominant featured next market imagery, elegant chronological dates/disclosures, actual saved addresses/directions, authoritative occurrence preorder action.
9. **Contact `/contact`** — normal storefront width, existing ~62/38 form/public-info split, configurable public email/phone/address/social, form validation/success and real backend submission; never add response hours or create in-app replies.
10. **FAQ `/faq`** — **68rem editorial width**, calm list of native accessible accordions, safe internal links and existing Contact invitation.
11. **Policies `/policies`** — **68rem editorial width**, clean long-form typography, publication date when authoritative, Contact invitation; policy editing remains in visual editor modal.
12. **Shared footer/navigation, empty/unavailable/error/loading states** — apply the theme consistently; don't add dead links or invent navigation destinations.

## Component states Codex should style intentionally
- Header: default, home-photo overlay, scrolled/sticky (only if architecture supports), mobile open, focus, unread/cart badges.
- Buttons: primary, secondary, tertiary/text, arrow-circle, disabled, pending/loading, hover, focus.
- Inputs: text, select, country-code phone, multiline, checkbox, focus, invalid, disabled, with restrained success animation.
- Product cards: photo, image loading/fallback, unavailable, price, hover/focus, correct link area.
- Gallery: thumbnails, image crop, images missing, variation changes.
- Accordion/disclosure: open/closed, focus/keyboard, long text.
- Notice/toast: market-switch blocked, empty schedule, form submitted, API error, cart conflict.
- Mobile: top nav, category controls, product gallery, cart summary, Checkout contact controls, modal and table/disclosure sizes.

## Architecture and editing expectations
- Before implementing, inspect only known theme, route, editor and shared component paths in `farmers-market-platform-web` and directly related API/appearance contracts in `farmers-market-platform`. Use existing docs; no broad search.
- Determine how Harvest theme is currently selected and rendered. Add a separate identifiable premium theme without changing default trial/free Harvest. Do not blindly duplicate all business logic into the new theme.
- Prefer theme-specific **presentational** components and CSS/design tokens; reuse shared business components and API/SSR client. Introduce small adapters only where needed.
- Preserve current appearance fields and content when switching between Harvest and premium theme. Do not delete sections/FAQ/policy settings or rewrite vendor media references. If premium-only options truly need storage, use backward-compatible validated settings.
- Theme switching must remain reversible and isolated per authorized vendor/channel. **Do not implement billing/entitlement enforcement now**, unless existing theme selection already enforces it; don't open premium selection to unrelated vendors by accident.
- Existing visual editor must preview the *actual Astro premium theme* with unsaved changes; preserve origin, capability, CSP, draft/public separation and commerce blocking.
- Test with Willow & Grain in `vendure_demo_market_ops` using already imported real Pexels photos/product fixtures. Never reset/reseed database, overwrite Manna Roots, or mutate unrelated accounts. Prefer user-driven theme selection and documented manual steps over modifying production data.
- No new payment methods, identity changes, policy/notification rewrites, or cross-app UI design changes. No Photoshop-like component builder or general-purpose layout CMS.

## Quality and verification
- Implement a complete pass through shared theme tokens/controls + actual page coverage in one cohesive feature; don't call it done after only the homepage.
- Focused unit/SSR/preview tests on theme registration, route coverage, component behavior, accessibility semantics, and isolation, plus targeted type/lint/build checks. No default screenshot automation or browser sweeps; user will do manual UI testing.
- Ensure no broken public links, missing icons, layout shift from photos, or horizontal mobile overflow.
- Document in **one** file: `farmers-market-platform-web/docs/STOREFRONT_PREMIUM_MODERN_FARMHOUSE.md` with implementation and intentional deferrals, focused test results, **exact** integrated-database manual test account/URL, selection steps, each route to review and expected behavior.
- If an external screenshot cannot be opened, say which reference ID is unavailable, use the detailed written spec, and do not claim visual inspection.

## Acceptance
- Harvest is unchanged by default and remains viable as the free trial theme.
- Premium theme has a cohesive and *visibly different* composition beyond token recoloring, covering all existing vendor storefront routes and UI states.
- The same catalog/cart/order/market/pickup/contact/FAQ/policy behavior works in both themes using shared authority.
- Appearance draft/save/publish/real preview, responsive behavior and authorization are preserved.
- All changes are focused and documented once; manual testing is left to the user.
