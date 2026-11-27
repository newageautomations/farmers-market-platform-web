Market cart and checkout reuse the vendor Harvest presentation. `HarvestCartLine` extracts the existing vendor row because no shared product-row composition existed; both controllers supply their own authoritative prices, quantity rules and mutations. Market products stay grouped by vendor in the cart. Shoppers choose pickup for each vendor during checkout, where the order summary updates with the confirmed fees. `Checkout.marketLayout` opts into the vendor banner, contact grid and summary disclosure around the existing market stage controller. Market checkout combines the order summary, contact and pickup details, and payment controls in Review & Pay. Back and the completed progress steps use the existing Stripe checkout recovery before returning to an editable step. Confirmation continues using `PurchaseSuccess`, with the market shop destination passed explicitly. Existing Button, Input, Card, Dropdown, PhoneInput, calendar and design tokens are reused. No new primitive, styling system or commerce authority is introduced.

Theme page structure (November 21, 2026): market themes opt into one page-structure standard through `themePageStructure` (`packages/theme/src/theme-page-structure.ts`; Pasture first, see [docs/THEME_PAGE_STRUCTURE_STANDARD.md](docs/THEME_PAGE_STRUCTURE_STANDARD.md)). New shared pieces and why: `WebsiteRailList` (`apps/admin/src/WebsiteRailList.tsx`) is the Policies drag-to-reorder rail extracted unchanged so FAQ questions, market Terms and contact form fields reorder the same way instead of with up/down arrows; `SectionBackgroundField` (in `WebsiteEditorContext.tsx`) reuses the palette select's swatch presentation so section backgrounds show the theme's actual colors; `PolicyListPage.astro` is the Policies page body extracted unchanged so a market's Terms & Conditions page renders the same markup; `ui/NumberedPagination.astro` adds numbered first/previous/pages/next/last links on the shared button classes because `Pagination` and `WorkspacePagination` only offer Previous/Next with a summary. `ContactForm` gains an optional `fields` list for market forms, `PoliciesEditor` gains `labels`, `ContactEditor` gains `editableForm`, and `ContactSubmissions` is reused for the market's Website messages page through `createMarketContactApi`. Existing consumers are unchanged when the new props are absent. No new primitive library or styling system is introduced.

Pasture market theme (November 20, 2026): a third market-only theme beside Meadow and Hearth, on the Harvest market contract (see [docs/PASTURE_THEME.md](docs/PASTURE_THEME.md)). It adds theme-scoped `pasture/Header`, `Footer`, `Hero`, `MarketHome`, `Fields`, `Art` and `styles/pasture.css`, built the same way as Hearth's and reusing `Button`, `FarmstandIcon`, `MarketCartLink`, `HeaderAccountMenu`, `MarketDateList`, `MarketVendorCards`, `WebsiteSections` and `EmptyState`. The hero title text lives in an inner `.pw-plank` span that carries `data-home-text="title"`, so the live preview still replaces only text. The hero image is the existing editable `homepage.image`, shown in Pasture's own wavy corner frame at the window edge instead of the shared hero image shapes, so Pasture's hero does not carry `data-hero-shape` or `data-theme-hero-frame` and the editor hides the Hero image shape control for Pasture. The title sits on one sign panel however many lines it wraps to. With no image set, the frame shows a decorative placeholder. `MarketDayHome` now chooses the theme hero from a lookup instead of a two-way ternary. No new primitive, UI library, font or editable field was added.

Checkout follow-up (November 19, 2026): completed steps in `Checkout`'s progress list are now `checkout-progress-step` buttons. They call the same `back()` as the Back button, so leaving Payment still cancels or restarts an open Stripe attempt first. Later steps stay plain text and can't be skipped to. They use a native `<button>` reset to read as the step label, not the shared `Button`, because a filled button inside each step pill would compete with the theme's step styling. `CheckoutSummary` lines wrap the name and quantity in `checkout-summary-name` / `checkout-summary-quantity` spans, keeping the text "Name × 2". Hearth styles the quantity as a chip, each vendor's pickup fieldset as a card like Pickup details, and pickup choices with the theme's hover lift.

# UI component decision registry

Editorial Market is now offered to market websites alongside Harvest. A market's Editorial homepage (`editorial-market/MarketHome.astro`) keeps the market Harvest order (Hero, Upcoming markets, Vendors, Product categories, Call-to-action banner) followed by the theme's community impact artwork, stored as a market variant of the shared Editorial composition contract (`editorialMarketOriginalSections`; identical in the backend and web projects). New market Editorial websites import the platform Editorial theme assets exactly as vendor websites do. `editorial-market/Hero.astro` and `Impact.astro` were extracted unchanged from the vendor homepage so the vendor homepage, the market homepage and Market Day mode share one hero/impact presentation; Market Day passes fixed welcome copy and `marketDay`, which switches only the heading to the section serif, and places the existing `MarketDayCountdown`, venue and regular-storefront link beneath the hero. The market sections reuse `MarketDateList`, `MarketVendorCards`, `EmptyState`, `Button`, the Editorial category tiles/art and the Editorial callout classes; `ShopHeader` and the Editorial footer take market navigation, `/shop` search and a market-date selector when the storefront is a market. Market Dates, Vendors and Become a Vendor keep their routes, data and markup and opt into the Editorial content-page hero (`em-content-page`/`em-content-hero`) without page artwork. Editorial card, page and Market Day presentation lives in `editorial-market.css`, scoped to the Editorial site, on its existing tokens. The editor reuses `EditorialMarketEditor` (hero copy/artwork, header, footer, homepage design and section management) plus the existing market content controls (section copy, card themes, hero button destination and page settings); market Editorial homepages never offer product or category showcases, and the backend rejects vendor homepage natives or featured products on market websites. No new primitive, UI library or authority boundary is introduced.

Market public shells opt into the existing Farmstand left-to-right text-link underline via `market-text-links` in the shared canonical stylesheet. Media-card links animate their text spans so their whole-card hit areas stay intact. Vendor cards lift 4px on hover (reduced motion disables it) and always include a separate Shop offerings text link to the selected-date shop filtered by vendor; storefront links retain the card hit area. `WorkspaceSelect.astro` now emits the native selected-content button used by the React Select so its closed value centers vertically in customizable-picker browsers. The Vendors date separator uses a Unicode escape to avoid encoding corruption. No new primitive or styling system is introduced.

Market Harvest hero controls now reuse `WebsiteSectionDestination` with an optional destinations/label contract and `CategoryImageField` for library selection/upload. The hero renders exactly two actions: its existing primary label and default Market Dates target, and its secondary Meet the vendors label/default Vendors target using the outlined button variant. The former application action is removed from the hero; Applications remains available in navigation. Optional market settings persist the two internal destinations, selected image asset id and independent `standard`/`inverse`/`soft` color themes for dates and vendors. Existing records retain their defaults. `MarketDateList` and `MarketVendorCards` share the same variants across homepage/list pages, on existing palette tokens. Vendor name links stretch across the card to the public storefront; detailed cards retain separate offering actions, and vendors without a storefront remain informational. The local backend validates the new optional settings. No new component primitive, UI library, database migration or domain authority is introduced.

## Market-wide listing approvals, November 26, 2026

The developer asked for vendor listing approval (which gates preorders) to get its own simple Market page, with links from Market Operations, the occurrence page and the Overview, while the per-vendor Listing approvals tab stays as it is.

- `/market/listing-approvals` (`ListingApprovals`, `market/ListingApprovals.tsx`) is a feature composition of `WorkspaceFrame`, `FarmstandPanel`, the Applications filter row (`FarmstandSearch`, an Approval `FarmstandSelect` and a Sort `FarmstandSelect`: Sort by approval, pending first, or by vendor A to Z), `FarmstandTable wide`, `StatusBadge`, `FarmstandButton`, `MarketsPagination` and the existing `ListingReview` dialog for the preview. The product cell reuses the vendor tab's `catalog-product-identity` and `vendor-contact-cell` classes; `vendors.css` only adds `.listing-approvals-actions` (Approve and Review side by side). Pending rows from an approved vendor get a one-click Approve; it sends the same `approveMarketListing` command as the dialog. `?status=pending` opens on Pending review. Why new: the existing table lives inside one vendor's detail page and reads one membership at a time. Sorting uses the Applications sort select, not sortable headings, so no third copy of the heading sort button is made.
- Readiness: `listingItems` (`operations-data.ts`) adds a Market-wide "Listing approvals" item with a Review listings link to the Market Day Checklist (operations date page, Overview checklist) and the operations date list for managers with `ManageOwnMarketListings`. The Overview's Needs attention card shows "N items need approval to list on your storefront". The operations date page and the occurrence page add a Listing approvals quick action with the pending count.
- Backend: `ownMarketListings(options)` reads every vendor's listings at the Market (same scoping as the per-membership read), and `OwnMarketOverviewSummary.pendingListings` gives the count.

## Booth amenity override on assignment, November 25, 2026

The developer asked that a missing requested amenity no longer block a booth assignment. `AssignmentCard` (`market/phase14/Assignments.tsx`, also inside the Assignments page's Assign booth dialog) now opens a shared `MarketDialog` ("Booth is missing requested amenities", listing them, with Cancel and Assign booth) when the chosen booth lacks an amenity the vendor or its rentals need; Assign booth sends `allowMissingAmenities` and the backend records a `BOOTH_AMENITY_OVERRIDE` audit entry. Booth size stays a hard rule; layout saves tolerate accepted gaps; copying a previous date still reports amenity conflicts. A "Required amenities" row (same `assignment-rentals-summary` presentation) sits above Rentals in the booth panel and the assignment card. Amenity helpers live in `market/phase14/booth-amenities.ts`; `OccurrenceApproval` gains the optional `requirements` the backend already returned.

## Submitted application review and requested dates, November 25, 2026

The developer asked for the long requested-dates list on a submitted application to become a full-width, scrollable table with a select-all checklist and one bulk decision, sortable by date and status with pending dates on top, the side panel holding actions, and the rest of the page organized sensibly. They also asked for the builder's Market dates list to scroll instead of compressing, and for Primary category to be required.

- `/market/application-submissions/:id` (`ApplicationReview` with `page`): the main column holds the submitted answers, Requested dates and rentals and Application history. The Applicant information panel was removed (follow-up): its contact rows repeated the answers, so `SubmittedInformation` gained an optional `lead` slot (default none) that shows a `{platformName} account` fact first, either No or a success `Badge` with a check icon reading Verified user (applicants who applied signed in: account-only or authorized vendor); the side panel (`aria-label="Application actions"`) holds Application decision, Private manager notes, Documents and compliance, information requests and Next steps. The side-by-side Tabs presentation keeps every panel, in the previous order. The page read keeps its data while it refreshes (`useRead` `retainPreviousData`), so action results stay on screen.
- `RequestedDates` (`market/phase14/RequestedDates.tsx`) is a feature composition of `FarmstandTable selectionColumn`, `Checkbox`, `FarmstandSelect`, `Input`, `FarmstandButton`, `Alert`, `StatusBadge` and the operations `Check`. Upcoming pending dates are always first; the Market date heading is a sort button following the Attendance sort pattern (local class `requested-dates-sort`, `aria-sort` through `DataTable`), and a `FarmstandSelect` Status filter (only statuses present, with counts) narrows the rows (follow-up, same day: Status was a sort; the developer asked for a filter). Changing the filter clears the selection, and select all covers only the upcoming dates shown. Past dates are shown but not selectable. A bulk decision sends one existing `REVIEW_OCCURRENCE` per date that can change (a confirmed date only moves to Cancelled), then refreshes once; failed dates stay selected and are named in a warning. Rentals are listed once ("Rentals for each date") instead of under every date. The table scrolls inside a 440px region with a sticky header, uses auto table layout (the shared fixed layout collapses the selection column) and lets cells other than the date wrap, so it fits a tablet without horizontal scrolling. Why new: Billing's selectable table is invoice-specific and no shared table has sortable headings.
- Documents and compliance actions (follow-up): Review compliance and Request documents sit on one centered row that wraps with a 10px gap (`submission-document-actions`); Request uses the primary (green) button.
- Application decision (follow-up): the Application status select is replaced by a full-width primary Accept application button above Waitlist (secondary) and Deny (`destructive-outline`) on one row. Each opens the existing `MarketDialog` confirmation, which now holds, for Accept, conditional acceptance (only while required documents are outstanding, naming them in parentheses) and the Existing Market Business `SearchSelect` (its explanation above it, label visually hidden through a new optional `hideLabel` prop that defaults to visible, placeholder Existing Market Business). The dialog has no Keep reviewing button; the header X dismisses it and the reviewed-dates acknowledgement when changing an accepted application. Managers can no longer choose Under review or Withdrawn (backend `REVIEW_APPLICATION` accepts only Accepted, Waitlisted and Declined, or the current status for a notes-only save); those statuses still arise from information requests and applicant withdrawal, so list filters keep them.
- `DataTable` gains an optional `renderHeading(heading)` for header cell content (sort buttons, a select-all checkbox); without it the output is unchanged. It is not used with `recordDetails`.
- Builder Market dates and Rentals lists (`.application-builder-choices`): `grid-auto-rows: max-content`. The rows opt out of their minimum height, so inside the 320px scrolling box the grid shrank them to about 8px each; they now keep their 30px height and the list scrolls.
- The Primary category question is a protected field (always included, required, always shown), like the identity fields. The backend makes it required in every application: older definitions are upgraded when read or saved, and the question is added to the business section if missing. Submitted snapshots are unchanged.

## Dashboard sidebar scrollbar, November 20, 2026

The developer asked for the vendor sidebar's scrollbar to be a custom one that disappears. The shared shell sidebar (`packages/ui/src/shell.css`, used by Vendor, Market Manager and Customer) keeps `scrollbar-width: thin` and now paints only a rounded thumb (`--brand-muted` at 40%) while the sidebar is hovered or holds keyboard focus; the track is never painted, and the reserved space keeps the links from shifting. WebKit pseudo-elements cover Safari. Touch devices scroll unchanged without a visible thumb. Follow-up (same day): only the navigation scrolls. From 768px the sidebar is a flex column with `overflow: hidden`; the brand row (logo and collapse toggle) stays fixed and the sidebar's `nav` takes the remaining height and scrolls (`align-content: start`, `overscroll-behavior: contain`), spanning the sidebar's full width so the thumb sits on its edge. Phones still hide the sidebar. No markup changes; no new primitive.

## Vendor Booth assignments list, November 20, 2026

The developer asked for `/vendor/booths` to use the table format of the other pages, open on booths awaiting payment, and filter by market and payment status with a newest/oldest sort. `VendorBooths` (`vendor/booths.tsx`) replaces its per-date `Dropdown` disclosures with the Upcoming Dates composition: `WorkspaceFrame`, a payment notice, the Applications filters (`FarmstandSelect` Market, Payment status, Market date: Newest/Oldest), `FarmstandTable` row selection (Market, Booth, Market date, Amount due, Payment), `MarketsPagination`, and the side details panel (`market-application-facts`, `dd` centered, verified 0px offset) inside `DetailSheet phoneOnly`, with phone record cards through `usePhoneRecords`. The panel keeps the booth facts, rentals, instructions, the cancellation notice and each invoice's existing `BoothInvoicePayment`; the selected date's `MarketMap` moves to a Market map panel under the table. Follow-up (same day, developer request): the page has no summary cards. While any booth is awaiting payment, a notice leads the page instead: the ALT-01 `Alert` (`warning`, `error` once a fee is past due) with a credit-card icon tile, the total due as its heading, the soonest booth, market and date, and a `FarmstandButton` (Pay invoice / Pay next invoice) that selects that booth and opens its invoice through the existing `BoothInvoicePayment` (`initialOpen`; on phones it also opens the details sheet). `booths.css` only lays out the notice row; severity colors and border stay the shared Alert's. Why not `MarketsSummary`: the developer asked for a notification rather than a statistic card. No new primitive. When the selected booth's map is published, the details panel ends with a secondary View market map button that scrolls the Market map panel into view (smooth unless reduced motion) and focuses it; on phones it first closes the details sheet. Payment status follows the Overview's booth-fee rule (an `OPEN`/`PAST_DUE` invoice with a balance is awaiting payment). The selected booth resolves from every booth, so paying an invoice keeps its dialog and booth in place after the refreshed balance moves it out of Awaiting payment. Links with `?occurrence=` (and `&invoice=`) open with All payment statuses and that booth selected. The table's minimum width is 660px for its five compact columns instead of the Applications list's 800px. The backend booth read additively returns `marketId` and `marketName`; without them the page shows "Market" and disables the market filter. No new primitive or styling system is introduced.

## Layout editor phone presentation, November 18, 2026

The developer asked for a phone layout editor that feels native, with slide-up panels and icon toolbar buttons, and for the desktop editor to stay exactly as it is. This extends the TAB-02 layout-editor specialist only.

- **Gate.** `useLayoutEditorMobile()` in `apps/admin/src/market/phase14/LayoutEditorMobile.tsx` matches `(max-width: 767px), (max-height: 500px) and (pointer: coarse)`. That covers phones in portrait (the shell's hamburger breakpoint) and phones in landscape. While it matches, `LayoutEditor` adds `is-mobile` to `.designer`. Rules in `designer-mobile.css` are scoped to `.designer.is-mobile` or to classes that only the phone presentation renders. Desktop and tablet editors never carry the class or render those elements. The desktop header, rail, drawer, inspector sidebar, floating selection toolbar and footer render only when it does not match. Their JSX is unchanged apart from the drawer and inspector content moving into shared variables, so desktop markup and computed geometry are identical at 1440, 1024 and 800px.
- **Phone shell.** The editor is full screen and takes safe-area insets into account. The top bar holds Exit, an editable layout name with its save state, Undo, Redo, Save and a Layout options button. The map fills the rest of the screen and has floating Select, Pan and Fit controls. A bottom tool bar of icons with short labels opens Add, Layers, Smart, Assets, Settings and Details. When something is selected, the bar switches to contextual commands: Done (clears the selection), Edit, Duplicate, Delete, Lock, Arrange, Align and More. Preview, Paste, Copy layout, Publish, Area and zoom live in the Layout options sheet. Drawing a path or editing points shows a banner with a Done button.
- **`MobileSheet`** (new, editor-only). A non-modal bottom sheet over the map, with half and full detents. You can drag its grip or the inspector's title row to resize or dismiss it. The handle is also a button that toggles between the detents. Escape closes the sheet and leaves the selection in place. One sheet is open at a time.
  - Adding an element or choosing a drawing tool closes the sheet.
  - In portrait, a half-height sheet shrinks the map to the space above it, and Edit brings an off-screen selection back into view.
  - Focusing a text field expands the sheet to full height, so the field isn't hidden under the on-screen keyboard.
  - The open sheet survives a save.
  - In landscape the sheets dock at the side instead.
  - On the map, one finger drags a selection box (the touch route to multi-select), and two fingers pan and zoom. Why the shared DLG-02 `Dialog drawer` / `DetailSheet` was not reused: they are modal, and the map has to stay interactive while a panel is open. A top-layer dialog would also switch the dark editor to the light dialog tokens (`.designer-chrome dialog`), and the editor's keyboard handler skips dialogs. Contents are the existing `LayoutTools`, `LayoutLayers`, `LayoutSmartTools`, `LayoutAssets`, `LayoutCanvasSettings`, `LayoutInspector` and `MenuItem`, plus the shared Button, IconButton, Input and Select.
- **`MobileToolbar`** (new, editor-only). The bottom icon bar. Why `EditorRail` was not reused: the rail is a vertical desktop navigation tied to the drawer. The phone bar also carries the contextual selection commands and the pinned Done button, and scrolls sideways when the commands don't fit.
- **Not changed.** `packages/ui`, `MapCanvas` (two-finger pinch and pan already worked), the desktop and tablet editor, and editor state, commands and permissions. Bottom-bar tools and sheet rows are 50–56px, other touch targets are at least 40px, and fields are 16px so iOS does not zoom in. Tablets from 768 to 900px wide keep the existing stacked layout. Verified in Chromium at 375×812 and 667×375. Real touch gestures, iOS safe areas, the iOS keyboard and the coarse-pointer landscape match above 767px can't be confirmed in Chromium emulation.

## Skeleton loaders for content loading, November 17, 2026

The developer selected animated skeleton loaders as the standard for content that is loading on a page, replacing the LOD-01 Spinner there, with one generic skeleton per category of load rather than a skeleton per screen. Content loading inside dialogs and action progress (saving, paying, uploading, verifying, approval or error outcomes) keep the LOD-01 Spinner. This supersedes the 2026-10-13 "LOD-01 Spinner as the standard loading indicator" selection for page content only.

- **Shared contract.** `LoadingSkeleton` in `packages/ui/src/index.tsx` with a `variant` of `table` (header bar and rows), `stats` (KPI tiles and a chart block), `cards` (a card grid), `detail` (label/value rows and form fields), `shell` (header, sidebar and content, for app boot) or `checkout` (summary lines, payment fields and a button). Optional `rows` sets the row or card count. `InlineSkeleton` is a text-height block for a single value still loading inside a tile, cell or sentence. Both are built from the existing `Skeleton` block and its `ui-skeleton-pulse` opacity animation (the Website Library thumbnail's), which is off under reduced motion. Styles are the `.ui-skeleton-*` rules in `packages/ui/src/styles.css`; `.skeleton` now takes its colour from the brand foreground/surface tokens (overridable through `--ui-skeleton-color`) instead of a hardcoded grey.
- **Announcements.** Skeleton blocks are hidden from assistive technology. `LoadingSkeleton` is a polite `role="status"` region with a visually hidden label (default "Loading"), so existing loading copy such as "Loading current records" is still announced. `label={null}` makes it decorative when a nearby live region already announces the load (Stripe checkout).
- **Read states.** LOD-02 and LOD-03 `ReadState` take `skeleton` (default `table`), `rows` and `label`. All 134 call sites choose the layout that matches the content they wrap; the 14 inside dialogs pass `skeleton="spinner"`. Error and retry behaviour, request keys and fetching are unchanged.
- **Direct consumers.** App boot (`shell`), AdminShell module fallbacks (`detail`), and page/section loads in documents, applications, attendance, booth schedule, operations, compliance, storefront appearance and categories, team, application continuation, Clover/Square integrations, packing, POS products and payment details, Website Library, notifications inbox/menu/preferences, applicant applications and storefront application documents. Inline "Loading…"/"Checking…" values in dashboard KPI hints, overview facts, customer, loyalty, compliance, booth, readiness and packing cells use `InlineSkeleton`.
- **Loaded-content reveal.** When a `LoadingSkeleton` or `InlineSkeleton` unmounts, `revealContentAfterSkeleton` (`packages/ui/src/skeleton-reveal.ts`) watches for two animation frames and fades in the elements React inserted in its place (`.ui-reveal`, 220ms opacity). Table rows, list items and grid cards inside that content settle in one after another from the top (`.ui-reveal-item`, from 4px above, 35ms stagger capped at 12 steps; starting above rather than below keeps the animation from overflowing scroll containers or the page and flashing a scrollbar). Text that replaced an inline skeleton fades with its parent element. Content already on the page, dialog content, elements with their own animation and other skeletons are untouched; reduced motion and runtimes without `matchMedia` skip it. It changes no data, focus or request state.
- **One skeleton per page load (2026-11-18).** A page's first load shows a single `page` skeleton (title, toolbar fields and a table panel) instead of a skeleton per section. It fills the visible page area: `PageLoad` measures its top and the dashboard spacing below it, and the skeleton's table panel takes the remaining height with its rows spread evenly; it is a minimum, so it never adds a scrollbar and taller pages are unaffected. `PageLoad` (`packages/ui/src/index.tsx`) renders the page beneath it hidden, inert and clipped to the skeleton's height, so every section starts loading at once. The page is revealed when the `LoadGate` is idle: no tracked read in flight and no `LoadingSkeleton`/`InlineSkeleton` mounted inside it (each one holds the gate), which also covers lazily loaded modules, untracked loaders and reads that start after another read's data arrives. It then fades in as a whole, each table body and list filling from the top (`revealLoadedPage`). AdminShell wraps the dashboard content in `PageLoad` keyed by `pageLoadKey`: the route workspace key, with settings and notifications each counting as one page. A new page starts a new loading phase. Filter, sort, paging and tab changes inside a loaded page never show the page skeleton: only the section that re-fetches shows its own skeleton, and the controls stay mounted in place. The 8-second hold limit also reveals a page whose loading has not finished.
- **Coordinated loading.** Sections on one page finish loading together. `LoadGate` (`packages/ui/src/load-gate.tsx`) holds each finished content read until every other read tracked by the same gate has settled, then releases them all in one task, so React replaces every skeleton and the reveal animates every section in a single render. AdminShell wraps the dashboard content in `LoadGateProvider`; the shared vendor/market `useRead` (every `ReadState` consumer) and the Booth schedule, Market operations, Website Library and storefront categories loaders read through `useLoadGate()`. Outside a provider (storefront islands, header and login) reads are unchanged. Requests start, fail and refresh exactly as before; only the moment their results are applied moves. A 40ms settle window lets sections that mount a moment later join; finished reads are released after 8 seconds if another read is still unsettled; a read that only starts after another read's data arrives loads on its own. Writes and commands are never gated.
- **Website preview.** The storefront editor's preview reuses the Website Library thumbnail skeleton through the extracted `WebsitePreviewSkeleton` (`apps/admin/src/WebsiteThumbnail.tsx`).
- **Checkout.** `StripeCheckout` shows the `checkout` skeleton while the secure payment status loads. Customer checkout mounts Stripe's Payment Element in the existing card entry section. The saved checkout name, email and phone populate billing details, so Stripe can collect any missing details there. Market checkout uses the existing card-only SetupIntent. Orders originating on vendor storefronts use the same Payment Element with a vendor-scoped PaymentIntent. Stripe displays eligible methods that support manual capture. The backend supplies the vendor account and frozen platform fee. The static `CheckoutPaymentPlaceholder` blocks (shown when payments are not connected) are not a loading state and stay unanimated.
- **Retained.** The Spinner stays for dialog content (document preview, booth invoice, expense, wizards, listing review, notification unsubscribe, theme images and other dialog reads), action progress (Saving changes/stock, Processing your order, Uploading and scanning, Preparing secure payment, Clover/Square verification, Checking Square, POS payment busy), button `loading` states, form `aria-busy`, the `generate-creating-ring` and the mobile companion's `ActivityIndicator`. Native `<option>` text ("Loading market dates...") and the finance/farmhouse/pickup refresh dims are unchanged. Finance keeps its 500ms delay, now applied to skeletons too.

Why no existing component sufficed: the shared `Skeleton` was a single 100px block with one app consumer; the layouts compose it rather than introduce a new primitive or animation. No UI library, backend or request-lifecycle change is introduced.

## Website Library cards, November 17, 2026

The developer asked for each Website Library card (vendor and market `/…/storefront`) to show a thumbnail of the website and for its actions to be compact icons. Cards now open with `WebsiteThumbnail` (`apps/admin/src/WebsiteThumbnail.tsx`): the saved draft's homepage rendered at 1280px and scaled into a 16:10 frame. It reuses the storefront editor's preview grant (`library.preview`, one short-lived grant per card, requested only once the card scrolls into view) and the existing `storefront-editor-v1` handshake in `browse` mode, with the same origin checks, sandbox and referrer policy; the frame is `inert`, unfocusable and ignores the pointer. Why not reuse `PreviewFrame`: it is the editor's interactive controller (section selection, navigation, reconnect status) and stays editor-internal. Until the draft renders (however long that takes), a generic skeleton (the same layout for every theme: a bar, a hero block and three cards) built from the shared LOD-01 `Skeleton` covers the frame; it stops pulsing when the preview is unavailable (no grant, storefront offline, expired grant). `Skeleton` gains an optional `className` and a gentle opacity pulse that is off under reduced motion; it had no app consumers before this, so existing presentation is unchanged. The Live card's thumbnail spans the card at 16:6, showing the top of the homepage. Actions reuse shared `IconButton`, borderless (Rename as a small 24px `text` glyph beside the name; Duplicate `copy`; Delete `trash`, destructive outline), an icon-only Farmstand link in `Tooltip` for Edit, and compact (32px) Farmstand buttons for Publish (with the `upload` icon) and Visit Website. Accessible names are unchanged. No new primitive, API or backend change is introduced.

## Farmstand workspace standard on remaining legacy pages, November 17, 2026

The developer asked to finalize a consistent UI by migrating every page that still used the legacy presentation (22px pill BTN-01 buttons, pill tertiary buttons and the narrow `PageHeader`/1050px `.admin-content` container) to the current standard. **For dashboard, admin-session and platform account screens, the Farmstand workspace presentation now supersedes the 2026-10-16 site-wide 22px button geometry**: `WorkspaceFrame` (`.markets-workspace` 1320px container and `.markets-heading`), `farmstand-controls` (42px buttons, 8px radius, 16px padding, text-style tertiary actions, 40px fields), `SettingsPanel`/`FarmstandPanel` surfaces and `MarketsSummary` KPI tiles. Tenant storefront themes (Harvest, Editorial Market, Farmhouse, Hearth, Meadow, Pasture, Bloom) are out of scope and keep their own button geometry; `--ui-button-radius` in `styles.css` is unchanged for them.

- **Admin pages migrated.** Vendor Website library and Market Website library (`WebsiteLibrary`, exported `WebsiteWorkspace` heading, also used by the desktop-only notice, which is mounted only while restricted so the editor never inherits the workspace width), Vendor and Market Subscription (`management/billing.tsx`, `SettingsPanel` sections), Market Layouts list (`Layouts`, "Create layout" moved to the heading; the CRD-04 saved/archived disclosures keep their behavior with a Farmstand surface; the layout editor screen is unchanged), Market Loyalty (`WorkspaceFrame` tabs replace the `ui-tabs` nav, `SettingsPanel` program card, `MarketsSummary` metrics), Vendor In-Person Checkout (`VendorPos`), and Platform Overview, Tenants, Tenant detail and Billing catalog (`PlatformFrame` in `ManagementRoutes`). AdminShell no longer renders the legacy `PageHeader` for these routes (Platform only when `ManagementRoutes` renders them). Vendor Market Preparation also drops the duplicate `PageHeader` above its own heading, matching the Market version.
- **POS touch geometry retained.** Under `.vendor-pos` the register, cart, variant and payment-dialog buttons keep the 44px touch height with Farmstand radius; product tiles stay full-card triggers; category filters stay bordered chips (pressed chip uses the border/fill, without the shared pressed underline); paging keeps 44px targets. The toolbar shows "Selling as {vendor}" with View Completed Sale and Saved drafts on one row.
- **Partial leftovers.** QuickBooks (`farmstand-controls` root, Farmstand buttons, Farmstand card surface; "Learn how automatic sync works" is a tertiary text action), Order refunds ("Refund items"), and the light dialogs inside the layout editor (`designer.css` `.designer-chrome dialog` now 42px/8px/16px).
- **Session and account screens.** Admin pre-shell screens (`main.login` in `AdminApp`/`FixtureAdmin`: signed out, connection error, personal account, workspace unavailable, loading) are a Farmstand panel with `farmstand-controls`; `main.tsx` loads `farmstand.css`. Platform account pages on the central host (`.account-panel`: login, signup, recover, reset, verify, phone, email-verify, workspaces, invitation, onboarding, vendor-applications, auth claim/logout/signed-out) add `farmstand-controls` and keep their form-width column. `404.astro` opts in only on the platform host (no tenant storefront), so tenant 404 pages keep their theme.
- **Shared change.** `workspace.css` gains a zero-specificity default for `WorkspaceFrame` `actions` (title fills, actions end-aligned and wrapping, 16px icons); workspaces with their own heading-action rules are unaffected.
- **Platform shell (follow-up, same day).** At the developer's request, Platform now uses the same compact `ui-shell` as Market and Vendor (completing the November 16 "Platform is unchanged" note): `AdminShell` sets `compactShell` for PLATFORM, the sidebar is flat and sectioned (`platformSections`: Overview and Notifications, then Administration with Tenants and Billing catalog, then Workspace with Settings), and the topbar is the shared 56px bar with the compact bell and account menu ("Platform administrator", Account mode, Sign out). `AdminApp` no longer adds Refresh or "Your account" for Platform, so every role's account menu is identical; Customer mode still reaches the personal account. `MarketCompactProvider` stays limited to Market and Vendor.
- **Not changed.** Vendor application help/return pages and tenant storefront commerce pages are tenant-themed and out of scope. No new primitive, UI library, API or database change is introduced.

## Vendor phone and tablet presentation, November 16, 2026

The developer asked for the Vendor dashboard (`/vendor`) to follow the Market Manager phone presentation, with a shorter gap above page titles, no zoom when a field takes focus, no page scrolling behind an open modal, the keyboard focus ring only during Tab navigation, and the top information cards as a short, wide, swipeable carousel with position dots. The Market Manager, desktop, customer and platform presentations are unchanged.

- **Scope.** `AdminShell` adds the `.vendor-admin` root class for `scope === 'VENDOR'`, tracks `data-input-mode` (pointer or keyboard) for vendors as it does for managers, and enables `MarketCompactProvider` for vendors. `market/market-mobile.css` selectors now read `:is(.market-dashboard, .vendor-admin)` (single-class specificity, so manager results are identical). Its card-row rule also covers the Vendor Orders and Pickup tables (`.orders-table-panel`, `.pickup-queue`). Vendor-only deviations live in `apps/admin/src/vendor/vendor-mobile.css`, which loads after it.
- **Behavior now on for vendors.** `DetailSheet` and `CompactLabel` are active for vendors on compact viewports (1200px and below), so the shared Finances and Documents workspaces open selected records in the drawer/bottom sheet, and labelled actions that use `CompactLabel` collapse to icons, for vendors as they do for managers. Vendor Pickup now wraps its Pickup details panel in `DetailSheet` (in place on desktop; a sheet once a row is tapped on compact viewports). The 768-1200px tablet tier of `market-mobile.css` applies to vendors as well.
- **`SummaryCarouselDots`** (new, `market/mobile.tsx`). Decorative (`aria-hidden`) position dots rendered as the next sibling of a summary track; they appear only while the track overflows sideways and follow the card nearest the leading edge. The admin `vendor/MarketsSummary.tsx` adds them in the Vendor shell (`useSummaryCarousel`), and Loyalty adds them after its stat panels (wrapped in `.loyalty-stats`, which is `display: contents` outside the phone carousel so the desktop grid is unchanged). Why not reuse something: the storefront carousels are Astro-only previous/next button controls and `Pagination` pages data, not a scroll track.
- **Vendor-only CSS (`vendor-mobile.css`).** Phones: a 56px top bar with a compact notifications button whose dropdown spans the viewport, 14px above the page title and 12px side gutters, the `.markets-heading` presentation for the Orders, Customers, Pickup, Contact Submissions, Products & Inventory and Loyalty headings, Products & Inventory rows as cards, and summary cards as a scroll-snap carousel of 86%-wide short cards. Phones and touch screens: form controls at 16px or larger (`!important`, because iOS zooms on anything smaller; the shared viewport meta is not changed). Compact or touch: no tap highlight, the focus outline hidden in pointer mode (text fields keep their focus fill, and plain fields get a soft brand ring), and `html` scrolling locked while a vendor `dialog` is modal (and, on phones, while the navigation menu is open). The pointer-mode outline rule is `!important` and also lists the rings components draw on a parent or sibling (`:has()`, `:focus-within`, switch track).
- **Donut charts and finance detail dialogs (follow-up, same day).** Vendor-scoped CSS at every width: donut slices draw no tap highlight or focus outline on click (keyboard users keep the drop-shadow ring), and legend rows wrap the value and share under the name instead of squeezing the name out. `FinanceDonut`'s info card now slides back inside the viewport when it would cross an edge (a measured `translate` that stays 0 when the card fits, so the manager's charts are unaffected), and on vendor phones it docks centred under the ring without the leader line. Finances' product, Daily values and Expense categories dialogs carry `finance-detail-dialog`. The product facts read as label-left/value-right rows with Estimated contribution highlighted last, and the two tables add `data-label` to their cells so vendor phones show one card per row. Vendor dialogs on phones never scroll sideways. The slice tap/focus and legend-wrapping rules were then extended to the Market Manager (`:is(.market-dashboard, .vendor-admin)`, still in `vendor-mobile.css`); the docked phone card, dialog styling and sideways-scroll rules stay Vendor-only.
- **Phone tables (follow-up, same day).** Vendor tables with more than three columns use TBL-02 `DataTable recordDetails` on phones only, through `usePhoneRecords()` in `market/mobile.tsx`, which returns the settings on a Vendor phone (767px or less) and `undefined` everywhere else, so desktop, tablets and the Market Manager render the full tables unchanged. Each row shows its name, one chosen column and any row actions; a tap opens every column as label/value rows in a bottom sheet. `RecordDetailsColumns` gained two optional fields, defaulting to the previous behaviour: `action` keeps one column (row actions) in the row, and `sheet` opens the details as a `Dialog` drawer (`ui-record-sheet`, styled as the Market Manager bottom sheet). Lists that already open a detail panel pass `onOpen` and wrap that panel in `DetailSheet phoneOnly` (new optional prop), so the tap opens the existing panel as a sheet on phones and the panel stays in place on tablets. Converted: Loyalty rewards (Reward / Status / Actions), Leaderboard (Customer / Net lifetime points, existing panel), Redemptions (Customer / Discount, existing panel), Upcoming Dates (Market / Attendance, existing panel), market detail Upcoming market dates (Date / Attendance / Action), Customers (Customer / Total spent), Contact submissions (Sender / Status, existing message preview), product Owned variants (Variant / Status / Actions), order Operational order lines (Variant / Remaining), Existing fulfillments (Fulfillment / State / Actions), QuickBooks records (Activity / Status, existing details dialog) and application Requested rental items (Rental item / Status). On phones every record row is a separated card (Orders card presentation: 12px radius, 1px border, 8px apart) with its name, one value and any actions on one line, wrapping to a second line inside the card when they do not fit, and a chevron when it opens. A second pass converted the lists that had been full-content cards: Orders and the customer page's orders (#code · customer / Pickup status), Pickup (Customer / Fulfillment, existing Pickup details sheet), Products & Inventory (Product / On hand / Manage stock; the raw desktop table is unchanged and a `DataTable` renders the same rows on phones only), Your markets (Market / Membership / Actions), Markets accepting applications (Market / Application deadline / Actions), Your applications (Market / Status, existing details panel), Transactions (Order / Payment or Transaction / Gross, existing details sheet), Expenses (Expense / Amount), and Items for preordering on the market and market-date pages (selection checkbox leading the card, product name, Enable preorder switch). Tables inside dialogs keep their labelled cards. Products & Inventory no longer repeats its title or the "Keep your harvest up to date" line inside the products panel at any width (the panel opens with the product count and keeps an `aria-label`); on phones the products panel loses its frame so each product is its own card, "A little stock check" moves to the top, and Categories is hidden. The Adjust stock dialog (`StockAdjustmentDialog`, every width) no longer focuses the quantity field: focus goes to the dialog title on open and to the new step's title on a step change. It uses the standard dialog size with the product and SKU, current stock as bordered label/value rows (as in the Finances and Documents details), a full-width stepper and full-width actions, the confirm step showing the change as a highlighted row; on Vendor phones it is a bottom sheet (`usePhoneSheet()` in `market/mobile.tsx`). The step and size animations are unchanged. Panels that were stacked below a list on phones now open as bottom sheets too: Customers (tap a card for its existing preview, `DetailSheet phoneOnly`) and Notifications, where `NotificationCenter` (and `NotificationSettings`) gained an optional `detailSheet` prop, defaulting to false, that renders the selected notification's or rule's panel inside a drawer `Dialog` (`DetailSlot`); the admin passes it through the `PhoneSheet` render prop in `market/mobile.tsx`, so it is on for Vendor phones only and customers, managers, tablets and desktop keep the panel beside the list.
- **Not changed.** The viewport meta and the vendor desktop top bar markup. `packages/ui` changes are limited to the optional `RecordDetailsColumns.action`/`sheet` fields, the optional `NotificationCenter`/`NotificationSettings` `detailSheet` prop, and the donut info-card edge shift. No new primitive, UI library, API or database change is introduced. The input zoom, tap highlight and scroll lock need confirmation on a real iPhone; Chromium cannot reproduce them.

## Market Manager phone and tablet presentation, November 15, 2026

The developer asked for the Market Manager dashboard (`/market`) to be usable on phones and tablets (iPad): no stacks of full-width information cards ahead of the page's content, controls placed deliberately instead of wrapping, simple worded buttons replaced by icons, and secondary information moved behind a button. Desktop, the other roles and the layout and website editors are out of scope and unchanged.

- **Scope.** Everything is in `apps/admin/src/market/market-mobile.css` and `apps/admin/src/market/mobile.tsx`. Every rule is under `.market-dashboard` (the Market Manager shell root) and a width query: compact is 1200px and below (phones and tablets up to iPad landscape), phone is 767px and below (the shell's existing hamburger breakpoint, which is not changed). Layout inside a workspace follows the `.markets-workspace` container width, because a tablet with the sidebar open has less room than its viewport. `AdminShell` wraps its content in `MarketCompactProvider`, enabled only for `scope === 'MARKET'`, so shared workspaces (Finances, Documents, Market Day, Preparation) behave as before for vendors.
- **`DetailSheet`** (new, `mobile.tsx`). A list's selected-record side panel renders in place on desktop. On a compact Market Manager viewport it would sit below the whole table, so it opens in the shared `Dialog` `drawer` when a row is chosen: a right drawer on tablets and a bottom sheet on phones. Why not reuse something: `Dialog` alone cannot render its content inline on desktop, and each page would have had to duplicate the same media check. It adds no modal primitive. Used by Occurrences, Operations, Vendors, Applications, Submitted Applications, Market Day attendance, Finances transactions, Vendor compliance and Readiness reports. Selection, reads and commands stay with each page.
- **`CompactLabel`** (new, `mobile.tsx`). Button content whose label collapses to its icon on a compact Market Manager viewport and stays in the accessibility tree. Desktop shows the label exactly as before. Why not reuse something: `IconButton` is icon-only at every width, and these actions keep their words on desktop. Used for row actions (Manage, View, Open, Edit), panel actions (Edit layout, Copy from an earlier date, Manage booths, Edit occurrence, Edit private notes, Invoices and payments) and checklist task actions (Edit, Move up, Move down, Delete).
- **CSS-only presentation.** Workspace headings drop their static description on phones; one icon action joins the title row as an icon button, and several actions or a date select get one evenly divided row. `MarketsSummary` cards become compact tiles (two per row on phones, one row on tablets) without the hint line. List tables become cards once the workspace is 640px or narrower: the row name with its action on the first line, the remaining cells below. Filters put search on its own row and selects two to a row. Workspace tabs with four or five entries share one row with the icon above the label. Overview sections take their content's height in the one-column layout instead of fixed grid rows (charts keep their cell). Record pages (`application-detail`) turn "Back to ..." into a back arrow beside the title and lay overview facts two to a row. Read-only booth maps keep a one-row toolbar where Fit map and Reset zoom show icons, and are shorter on phones so the page can scroll past them. Notifications clamp the message to two lines and show the row menu as a more button.
- **Not changed.** Shared components in `packages/ui` are untouched; the map toolbar and notification adjustments are scoped CSS over their existing markup, selected through the read-only `.map-read-surface`, so the layout editor's canvas is unaffected. Breakpoints of the shell (MOB-01) are not harmonized. No new primitive, UI library, API or database change is introduced.

## Compact shell for Vendor and Customer, November 16, 2026

The developer asked for the Market Manager sidebar and topbar on the Vendor and Customer dashboards too, with an identical topbar in all three (controls the manager topbar lacks are removed). This completes the "other roles to follow later" note in the November 13 entry.

- **Shared stylesheet.** The shell rules moved from `apps/admin/src/market/dashboard.css` to `packages/ui/src/shell.css` (`@market/ui/shell.css`), scoped by a `ui-shell` root class instead of `.market-dashboard`. AdminShell adds it for MARKET and VENDOR; CustomerLayout adds it to `<body>`. It loads after `styles.css` and carries the sidebar/topbar surface, link and current-page colors, so it works without the `.admin-dashboard` root. Platform is unchanged.
- **Rail.** Collapsing fades labels over 100ms and then removes them. Rows keep the expanded 34px height and 13px icon inset, so icons do not move. Follow-up (same day): the Vendor sidebar no longer uses dropdowns. Every page, subpages included, is listed flat in sections: an untitled main group (Dashboard, Notifications, Market Preparation when due), then Selling, Markets, Customers, Business and Workspace (`vendorSections` in `AdminShell.tsx`, through the shared `navigationSections` helper). Route permissions and active-page matching are unchanged.
- **Topbar.** It is the same 56px bar in all three roles: workspace name, View Storefront (compact), the compact bell and the account menu. AdminShell's `compactShell` (MARKET or VENDOR) selects it and the sectioned `flatNavigation`. AdminApp keeps Refresh and the "Your account" link for PLATFORM only. On Customer, "Explore markets" is removed because it duplicates the Followed Markets nav item. The merchant-mode storefront link becomes the compact View Storefront. Customer account mode and the POST sign-out form move into the account menu.
- **Adapters.** `HeaderMenu`'s close/outside-press/Escape behavior moved to `installHeaderMenu` and `closeHeaderMenu` in `presentation.ts`, shared by the React component and the new `apps/storefront/src/components/ui/HeaderMenu.astro`. The Astro adapter emits the same markup without hydrating the header. `AccountIcon` moved from AdminShell to `@market/ui`. `installDashboardSidebarToggle` takes `{ rail: true }`, which keeps the collapsed sidebar interactive instead of inert. Customer nav links gain `aria-label` and `.ui-nav-label` so rail icons keep their names. `CustomerNotifications` passes `compactBell` through.

## Market Manager shell refresh, November 13, 2026

The developer asked for a tidier Market Manager shell (other roles to follow later): a tighter sidebar without subsection dropdowns, a shorter topbar with smaller Farmstand buttons, no Refresh or "Your account" controls, account mode and sign-out behind a person icon, and a cleaner notifications dropdown.

- **Scope.** `AdminShell` sets `flatNavigation` only for `scope === 'MARKET'`. Vendor, Platform and Customer shells are unchanged. Sidebar and topbar styles are scoped under `.market-dashboard` in `apps/admin/src/market/dashboard.css`. The topbar is 56px, and the sidebar brand row matches it. Nav rows are 36px with 2px gaps, and the sidebar is sticky.
- **Navigation.** Only top-level items are listed (no chevrons or subpages). Subsections are still reachable from inside their workspaces. Route permissions and active-page matching are unchanged.
- **`HeaderMenu`** (`packages/ui/src/dashboard.tsx`, exported from `@market/ui`) is new. It is a native details/summary with a Farmstand icon trigger, a floating panel, and closing on outside pointer or Escape. Why not reuse something: the DDN-03 `Dropdown` is an inline bordered disclosure and `DashboardMenu` is the mobile hamburger, and neither gives a floating header menu. The account menu and the compact bell both use it.
- **Account menu.** Shows the workspace name, the existing `AccountModes` (mode and business selects) and Sign out / Sign out everywhere as menu rows. These keep the `storefront-editor:before-exit` guard. `AccountModes` gains `personalLink` (default true), and AdminApp passes false and leaves out Refresh for MARKET. Customer mode still reaches the personal account.
- **Notifications.** `NotificationCenter` gains opt-in `compactBell`, which renders a header with the unread count, a scrolling list (unread dot, title, preview, business · time, and a hover-revealed Mark read/unread), and a "View all notifications" footer. Read, detail dialog and unsubscribe behavior are shared with the default bell, which is unchanged for other consumers.
- **Buttons.** View Storefront takes an opt-in `compact` Farmstand presentation in this topbar.
- **Follow-up (same day).** The sidebar groups pages into sections: an untitled main group, then Market days, Vendors, Business and Workspace (`marketSections` in `AdminShell.tsx`; unlisted pages go to Workspace). Collapsing fades the labels and then removes them, so each rail row is a 40px icon-only button. Icons keep their horizontal position in both states. The logo fades, the toggle slides to the rail centre, and section titles become divider lines. `HeaderMenu` animates closing as well as opening and skips the animation for reduced motion. The compact View Storefront label is trimmed to cap height (`text-box: trim-both cap alphabetic`) so the letters sit on the button's centre line. The account trigger and avatar use the Lucide `user` glyph (local `AccountIcon`). The shared `user` UtilityIcon is unchanged.

## Market Harvest shop and product details, November 11, 2026

Follow-up: public date pagination uses `take: 50`, respecting Vendure�s bound. Without an explicit, saved or cart date, `/shop` renders the requested choose-date empty state and a Choose market variant of the existing `ShopMarketSelection`, with the regular Change Market banner retained. Catalog content is withheld until selection. No new primitive is introduced.

The developer requested a `/shop` entry for market Harvest websites that matches the regular Harvest shop and product details, adding vendor names to cards and vendor name/profile portrait to product details.

- `apps/storefront/src/components/home/HarvestShop.astro` is the existing vendor shop composition extracted for both consumers. It reuses the approved card/button/select contracts, `TaxonomyFilters`, `VendorPreorderBanner` and its protected `ShopMarketSelection` calendar, plus `ProductCards`. Optional seller/link maps extend the existing card rather than create a parallel card. The existing Harvest layout and CSS remain shared.
- `/shop/products/:variantId?occurrence=:id` uses the existing Harvest `ProductLayout`, `ProductGallery`, `ProductPurchase` and `useProductPurchase`. `ProductInformation.astro` extracts the regular vendor disclosures for both pages. The portrait/name link uses the existing market vendor image/initial presentation and filters the selected-date shop to that vendor. Related products use the existing card and theme heading setting.
- `/shop` is available in market header/footer navigation and the visual editor. Category/vendor/date/cart links now target it; old occurrence catalog and product routes redirect while preserving filters/date. Market detail preview hides the vendor-only example-product chooser.
- The market server controller reads dates/catalog under the current market channel and validates requested dates. Optional native Shop product reads provide public gallery/information content, while occurrence catalog eligibility and prices still control the offered options. The catalog itself makes no stock claim. Since November 26, 2026 the server refines its eligibility with the advisory `marketOccurrenceAvailability` read (the vendor storefront's `vendorPreorderAvailability` facts, capped at 20 variants per call), falling back to eligibility alone if that read fails. Backend add-to-cart keeps inventory, pricing, context-switch and quantity authority. The existing market selection preference cookie is saved after successful market selections/adds. Editor preview performs no commerce selection or cart bootstrap.
- Stock states (developer request, November 26, 2026), on vendor and market storefronts: a product or option with nothing left (capacity reason "Out of stock" or "Sold out for this market") shows a disabled "Out of Stock" button instead of "Unavailable" on the shared `ProductCards` (Harvest family and modern-farmhouse) and in `ProductPurchase`. Ineligible or unconfirmed products keep "Unavailable". With 1 to 5 left, the card availability line and the purchase form status say "N left in stock" in red, whatever the theme's `shopAvailabilityNote` setting. A rejected add re-reads that variant and says "This item is out of stock." or "Only N left in stock" (`lib/add-failure-message.ts`), otherwise the shared `cartMessage`. The rules live in `@market/storefront-core`: `productPreorder` for cards, and `isOutOfStock`, `lowStock` and `stockMessage` in the client-safe `@market/storefront-core/stock` subpath that React islands must import (the package root also exports server-only request code that breaks island hydration). Why no new component: the existing button, card and status line carry the new text. The only new style is `.stock-low` in `vendor.css`, colored with the existing `--status-danger-fg` token on its own span so a theme's `.shop-availability` color cannot override it.
- Why extracted components: the shop and information markup were inline in vendor routes. Extraction preserves one implementation of the requested presentation. These are feature compositions of existing shared primitives, with no new UI standard, UI library, database migration or backend change.
- Verification: focused unit tests, Astro typecheck, real vendor/market SSR against local synthetic Shop API fixtures, plus Chromium desktop/mobile checks of layout, date/category navigation, portrait/options, add-to-cart badge updates, nonempty-cart date protection and horizontal overflow. The persistent test database is untouched.

## Market website editor (Harvest), November 11, 2026

The developer requested the vendor website editor in the market manager suite: the same Website Library and visual editor, Harvest theme only, with a market homepage (Hero, Upcoming markets, Vendors, Product categories, CTA banner), all content pages, plus Market Dates, Vendors (per occurrence, chosen with the market-date selector) and Applications pages. Styling may differ from the vendor site.

- **Admin.** `/market/storefront` (nav label now Website) renders the existing `WebsiteLibrary` and `VisualStorefrontEditor` with a `market` prop instead of the legacy single-record appearance form. The library offers only Harvest. The editor reuses its page selector, section management, page-section regions, Our Story/Contact/FAQ/Policies editors and theme controls; market natives and page settings render through the same disclosure rows. Find Us and product pages are vendor-only. `WebsiteSectionManagement` gains an optional `allowSection` filter (market sites hide the vendor-catalog Product and Category showcases); `ContactEditor` gains `formAvailable` (markets have no contact inbox, so they edit contact information only). `VendorTypography` is now generic over any value with a `typography` key. The palette, button and hero copy controls were lifted into shared constants inside the editor rather than duplicated.
- **Storefront.** Market sites now use the Harvest shell on every page. `MarketPublicHome` renders the market composition. `market/MarketDateList` (Harvest date stamps) and `market/MarketVendorCards` (Harvest vendor cards plus a profile image, offering count, Browse offerings and Visit storefront) are shared by the homepage and the new pages because no existing component lists market dates or occurrence vendors. `ui/WorkspaceSelect` is the Astro adapter of `FarmstandSelect` (the admin market-date selector) for the server-rendered Vendors page, like the existing `WorkspaceSearch` adapter; the form works without JavaScript and submits on change when it runs. Styles live in `styles/market-website.css` on existing tokens and Harvest classes.
  - Follow-up (November 19, 2026): the Vendors page date selector is now the shop's market picker (`ShopMarketSelection` with `MarketPickupCalendar` in the shared `Dialog`), not a dropdown. `ShopMarketSelection` gains an optional `navigate: { path, param }` prop. In that browse-only mode it opens `/vendors?date=<id>` without the `select-occurrence` cart call, so viewing vendors never changes the shopper's pickup market. Existing consumers are unchanged. The `WorkspaceSelect` form stays as the `<noscript>` fallback. Hearth and Meadow give the picker button the same styling they use for the shop banner's Change Market button.
- No new primitive, UI library or competing standard is introduced.

## Vendor Settings › Payments presentation, November 11, 2026

- Square and Clover panels are hidden from `/vendor/settings/payments` via `showInPersonProviders` in `settings/SettingsWorkspace.tsx`. Their components, services, Clover OAuth return route and backend capabilities are unchanged.
- Online payment fee settings: recovery modes are bordered native `Radio` options with a visible legend and hints (RAD remains pending; no new radio primitive). The $100 example reuses `.provider-facts` label/value rows (`dd` centered, verified 0px offset) with right-aligned amounts and a ruled total row.
- Stripe Connect: Refresh uses the existing `FarmstandButton` + `UtilityIcon name="refresh"` refresh pattern. Open Stripe Dashboard uses the shared `external` utility icon with an sr-only "(opens in a new tab)" and opens the validated Stripe login link in a new tab (placeholder tab opened on click so popup blockers allow it; closed when no link is returned).

## Market Booth invoices presentation, November 10, 2026

November 12 follow-up: occurrence side panels open payments for their market date, and occurrence detail quick actions open that date's draft invoices. Bulk issuing uses the existing preorder checklist interaction with shared Checkbox controls and an optional common due date. `FarmstandTable.selectionColumn` opts into a compact checkbox column without changing other tables; form actions reuse the shared `ui-control-row` alignment. Each selected draft uses the existing issue command, with partial-result feedback and failed selections retained for retry. No new primitive, library or authority boundary is introduced.

The developer requested that the market manager's Finances › Booth invoices tab match the other Finances tabs: invoices in a table, a modal (not a side panel) showing the full invoice, an easy-to-read collapsible history (date and time, message, red or green balance change), paid and outstanding always visible, a clearer refund flow and animations confirming success or failure.

- **List.** `Billing` (`market/phase14/Billing.tsx`) composes `MarketsSummary` (Outstanding, Collected, Expected, Past due from the existing `billingSummary`), a Farmstand panel with `FarmstandSearch` and `FarmstandSelect` filters (search, market date, status), `FarmstandTable` rows like Transactions/Expenses, `StatusBadge` and `MarketsPagination`. The market-date select moved from the operations controller's card into this filter row for the Billing section only; Day keeps its control. Billing command errors and the "Saving changes" spinner are reported inside the modal instead of above the page.
- **Modal.** New `InvoiceDialog` (`market/phase14/InvoiceDialog.tsx`) on the shared DLG-02 `Dialog` (wide). It shows status, due date and contact, a three-tile Total / Paid / Outstanding balance, the retained TBL-03 `InvoiceTable` line items (its 640px natural width and scroll region are unchanged; `styles.css` now also applies those rules under `.booth-invoice-lines`), money rows and the history. Manager actions (record payment, adjust, refund, cancel, issue, void and replace) open as views inside the same modal, each with Back and a Farmstand submit button, instead of nested dialogs and inline forms. `Invoice` (used by Assignments) is now a compact balance summary with an Open invoice button that opens the same modal.
- **History.** `InvoiceHistory` renders the shared `Dropdown` (DDN-03 `.ui-disclosure`) with one newest-first list of adjustments, payments, refunds and online card attempts. Each row has the date and time, the message and a pill showing the change in balance due: green when it falls (payments, reductions), red when it rises (charges, refunds), neutral for card attempts whose payment is recorded separately. Fee breakdowns and "pending verification"/"requires reconciliation" wording are kept. The vendor invoice page also uses this component.
- **Refund flow.** Two steps with the shared `WizardProgress` and `useWizardDialogHeight`: choose payment (with paid, already refunded and available amounts, a Refund all shortcut and an over-limit message), then review the server-calculated preview and the paid/outstanding result before attesting. Command payloads, idempotency keys, revision checks and permissions are unchanged.
- **Feedback animations.** Results reuse the wizards' `reward-published-check` pop (green check) and add a failure variant (red cross with a shake) with Try again, which resends the same idempotency key, and Edit details, which keeps the draft. The balance values replay a short highlight when they change; all motion respects reduced motion.
- **Why new components.** No shared invoice modal, ledger history or result view existed: Expenses' history is plain text and its dialog is expense-specific, and the wizards' completion screen has no failure state. `MoneyRows` and the history rows follow the facts-list label/value rule (`dd` margin 0, centered). Styles live in `market/phase14/booth-invoices.css` with existing brand and status tokens; no new primitive or library. Radio cards were not used for payment choice because RAD is pending developer selection.

## Market Overview dashboard, November 9, 2026

The developer requested a Market manager Overview (`/market`) like the vendor Dashboard, with the same layout editing, showing the next market, its booth availability, invoices awaiting payment, urgent items such as expired documents, and new application submissions.

- **Composition.** `MarketOverview` (`apps/admin/src/market/overview.tsx`) composes `WorkspaceFrame` (heading only; the AdminShell heading is skipped for `/market`), the shared dashboard grid and `DashboardLayoutEditor` from `@market/ui/dashboard-layout`, `MarketsSummary`, Farmstand panels/links/buttons, the Markets next-date panel, the vendor Dashboard's urgent cards, task list, facts list and compact table, `FinanceDonut` (booth counts, `units`), the occurrence booth meter and `StatusBadge`. Nine sections live in `market/dashboard-layout.ts`: Needs attention (band, shown only when needed), Key metrics (band), Next market, Booth availability, Market day checklist, New applications, Invoices awaiting payment, Vendor documents and Vendor requests.
- **Shared extraction, unchanged in output.** The vendor Dashboard's grid renderer, panel header, in-app link, urgent request band and date tile moved to `apps/admin/src/DashboardWidgets.tsx` (`DashboardCells`, `PanelHeader`, `DashboardLink`, `UrgentRequests` with an optional `title`, `DateTile` taking `startsAt`/`timezone`) so both dashboards render them instead of a copy. Its `navigate` keeps in-app routing for `/vendor/` and `/market/` links. The vendor Dashboard renders identically.
- **Data.** Every section reads under its own grant and is omitted without it: the existing overview summary and occurrence page, the booth schedule read (`readDateOperations`) and the next date's Assignments read for booth counts and paid booths, the Billing read for open and past-due invoices, the Applications `PAGE` read (`quickView: REVIEW`, newest first), the compliance summary, the Market Day Checklist (`dateReadiness`) and pending vendor memberships. The Applications page projection additively returns `createdAt` and `category`.
- **Preference.** The arrangement is a per-user settings-store value `managerDashboard.layout` (backend `managerDashboardLayoutField`, sharing `validateDashboardLayout` without a period), read and saved through `createMarketDashboardLayoutApi`. No migration is required.
- `market/overview.css` only fills gaps between the reused styles: a muted second line in table rows, and centered `dd` values (the Market workspace's app-wide `dd` margin otherwise pushes them 2.8px below their labels; verified 0px).

No new primitive, UI library or competing standard is introduced. The previous Overview (Next Scheduled Occurrence card, compliance KPIs and relationship table) is replaced; its facts now appear in the sections above.

## Business profile pictures, November 9, 2026

The developer requested profile pictures for Markets and Vendors, edited in dashboard Settings and independent of the storefront website (previously the only picture was the market's published homepage image).

- **Settings.** A new `profile` Settings tab (VENDOR after Preferences, MARKET after Market) composes the existing `SettingsPanel` with `ProfileImageSettings` (`apps/admin/src/settings/`). It reuses `CategoryImageField` (library presentation: upload and My Images) with the profile-picture media API; choosing or removing saves at once. Owners and Administrators edit; other members see the picture read-only. The tab shows only when the service supplies `profileImage`, so fixtures are unchanged.
- **`IdentityIcon`** (`@market/ui/workspace`) is the existing `markets-identity-icon` (table rows) or `markets-next-art` (detail panels) tile with the picture covering the icon (`markets-identity-photo`), generalizing the Rentals thumbnail pattern. The icon stays underneath, so a missing or blocked image still reads as the icon. Created because no shared component rendered an image in the identity tile; Rentals keeps its own local class.
- **Tables.** `useProfileImages` (`apps/admin/src/profile-images.ts`) batch-reads pictures for the rows on the current page. Wired: manager Vendors table; vendor Markets table and Next upcoming market panel; Find markets results, Your applications and Application details; Upcoming market dates table and Date details. Tables whose rows carry no Market/Vendor id (application submissions, booth assignments) keep their icon.
- **Customer discovery and vendor Find Us** now read the business profile picture instead of the storefront's published homepage image (backend only; markup unchanged).

## Customer dashboard workspace presentation, November 8, 2026

The developer requested that every customer page follow the newer vendor and market workspaces (Products, Loyalty, Settings, Pickup, Market Settings and Occurrences), using the new buttons, dropdowns, tables and side panels, with animated modals, and that the Overview gain a layout editor like the vendor Dashboard that shows upcoming markets, placed orders and similar facts instead of stat graphs.

- **Shared extraction, unchanged in output.** The customer dashboard is Astro SSR and may only import `@market/ui`, so the workspace presentation moved there instead of being copied: `markets-workspace.css` is now `@market/ui/workspace.css`, `market-applications.css` is `@market/ui/workspace-records.css` (now also carrying the `markets-stat-danger` tone from `market-dates.css`), `settings-panel.css` and `workspace-menu.css` keep their names under `@market/ui`. `MarketsSummary` and `SettingsPanel` moved to `@market/ui/workspace` (admin files re-export them; `SettingsPanel.module` accepts `customer-workspace`). The dashboard grid engine moved to `@market/ui/dashboard-grid`, and the layout editor to `@market/ui/dashboard-layout`, where it takes the widget registry, default layout, normalizer, conditional sections and an optional `title`; it also exports `normalizeGridLayout`, `settleGrid`, `defaultGridLayout` and `dashboardSections`. The vendor dashboard keeps a thin `DashboardLayoutEditor` wrapper with its registry. Grid, band, editor and Next upcoming market panel rules moved from `vendor-dashboard.css` to `@market/ui/dashboard-layout.css` with their class names kept, so the vendor Dashboard renders identically.
- **Astro adapters** (`apps/storefront/src/components/ui/`): `FarmstandIcon`, `WorkspaceSummary` (MarketsSummary, optional linked cards), `WorkspacePanel` (SettingsPanel), `WorkspaceTable` (FarmstandTable/TBL-02 markup), `WorkspacePagination` (FarmstandPagination with real links), `WorkspaceSearch` (FarmstandSearch) and `WorkspaceMenu` (TAB-03 route links in the segmented menu). They emit the same classes as their React counterparts; no second presentation exists.
- **Pages.** `CustomerLayout` renders the workspace heading (icon, title, description, `actions` slot) inside `markets-workspace farmstand-controls`. Order History, Followed Markets and Favorite Vendors compose summary cards, the Applications list (row selection, side panel, pagination) and discovery classes; selection is server-rendered with a real `?order=`/`?date=` link per row and `lib/row-selection.ts` skipping the reload when JavaScript runs. Order detail uses the detail layout (per-vendor panels with a line table, Payment and Order side panels). Account Settings and Communication preferences use `WorkspacePanel` sections with unchanged forms, actions and field names; Notifications uses `WorkspaceMenu` with the inbox `tabs={false}`, as Admin does; Loyalty adds `MarketsSummary`, the `workspace-menu` Tabs variant (as on Packing) and `SettingsPanel` sections around the unchanged wallet and challenge controllers.
- **Overview** (`CustomerOverview.tsx`, one React island; data is read on the server under the customer's own session) composes the shared dashboard grid and editor with seven sections in `lib/customer-overview.ts`: At a glance (band), Next market (the vendor next-date panel with date tile and Also coming up), Ready for pickup, Recent orders, Loyalty rewards (progress toward the next reward, no charts), Followed markets and Favorite vendors. The arrangement is a per-user preference in the new `customerDashboard.layout` settings-store field (backend `customerDashboardLayoutField`, sharing `validateDashboardLayout` with the vendor field), read and saved through the bridge actions `customerDashboardLayout`/`saveCustomerDashboardLayout` and the Shop API `customerDashboardLayout`/`saveCustomerDashboardLayout`, via the same-origin `POST /api/customer-dashboard-layout`. No migration is required.
- **Modals** keep the shared DLG-02 Dialog, whose open/close animation applies to the layout editor, loyalty and challenge dialogs and the notification dialogs; selected side-panel content fades in with the existing `markets-view-enter` motion. Reduced motion disables both.
- Follow-up (November 8): the layout editor dialog keeps Reset to default and Save layout in view as a footer pinned to the dialog's bottom edge while a tall arrangement scrolls (`dashboard-layout.css`, scoped to `vendor-dashboard-editor-dialog`, so other DLG-02 dialogs are unchanged). This applies to the vendor and customer editors alike.
- Follow-up (November 9): Find markets/vendors to follow uses the same list-and-side-panel composition (`?discover=` selection). The panel shows the storefront image over the store icon tile (the icon shows when there is no image or the CSP blocks it), the market's city and region or the vendor's next market, the next date, time and venue, and Follow/Unfollow and Visit storefront. The Shop `CustomerFollowSubject` and the bridge discovery read add optional `image` (now the business profile picture from Settings, see Business profile pictures), `city`, `region`, `venue` and `nextDate`. Loyalty drops the Vendor wallets card, and empty states inside `markets-next` panels take the panel content padding.
- The Farmstand icon set adds Lucide `heart`, `gift` and `clock` under the existing license. The former `CustomerOrders`, `CustomerEvents`, `CustomerFollows` and `PurchaseDetail` Astro components were replaced by these compositions and removed.

No new UI library, primitive standard or pending-category approval is introduced; this extends the Farmstand presentation to the customer dashboard only.

## Market Assignments presentation, November 8, 2026

The developer requested that Market Assignments (`/market/assignments` and `/market/assignments/:id`) follow the Rentals, Vendors and Operations presentation with the same functionality, and that the Review documentation link be removed from this page.

- `AssignmentsWorkspace` (`market/phase14/AssignmentsWorkspace.tsx`) composes `WorkspaceFrame` (the AdminShell heading is skipped; the `/edit-layout` editor keeps it) with the market-date `FarmstandSelect` in the heading actions, a four-card `MarketsSummary` (booths assigned, expected vendors, accepted rentals, paid invoices or map state), a `SettingsPanel` for the booth map with compact `OccurrenceLayoutActions` and Publish/Unpublish map in its actions, and the Vendors list layout (`markets-columns`, `FarmstandSearch`/`FarmstandSelect` filters, `FarmstandTable`, `MarketsPagination`, `EmptyState`). The sidebar holds Approve a business and Copy from an earlier date as `SettingsPanel` forms; copy suggestions are reviewed and confirmed there.
- It is a feature composition because no shared component owns date approval, assignment copying or the booth map with its dialogs. `BoothMap` and `occurrenceBooths` were extracted from `Assignments` so the workspace and Market Day render the same map; `AssignmentCard` is exported unchanged and opens from a row's Manage action in the shared `MarketDialog`. `BoothAssignmentDialog` is unchanged.
- Commands (`APPROVE_OCCURRENCE`, `COPY_ASSIGNMENTS`, `ASSIGN`, `PUBLISH_MAP`, `SET_PLAN`) and permission gates are unchanged. Without Manage permission the list shows View actions and the approval and copy panels are omitted.
- Follow-up (November 8): the Assignments read adds `platformEligibility` (additive, read-only) for verified platform Vendors on the selected date. The approve dropdowns label vendors without an approved membership or confirmed attendance, and selecting one shows a shared `Alert` with the reason and disables Approve, in both the sidebar form and `BoothAssignmentDialog`. `CONFIRMED_CANONICAL_PARTICIPATION_REQUIRED`, `APPROVED_PLATFORM_MEMBERSHIP_REQUIRED` and `PLATFORM_PARTICIPATION_CANCELLED` gained friendly error messages.
- Follow-up (November 8, later): the booth dialog has an Edit booth header action that swaps the body for `BoothDetailsFields` (extracted unchanged in behavior from the layout editor inspector's Booth details section, which now renders it) and saves through the existing occurrence `SAVE_LAYOUT`, so changes apply to that date and keep assignments and rentals. The dialog eases between heights with the shared `useWizardDialogHeight`; the body fades in. `PriceInput`/`MinorPriceInput` (`apps/admin/src/PriceInput.tsx`) extract the vendor product price entry (currency symbol, two-decimal typing, cents filled on blur); the product form, booth fee and rental unit price now use it instead of minor-unit number fields. Its CSS moved from `vendor/product-editor.css` to `price-input.css` with the same class.
- Follow-up (November 8, latest): on the Assignments page the map hides its own Search booth list (`MarketMap`'s existing `showBoothList`, passed through `BoothMap`) and `AssignmentBooths` shows the booths as a `FarmstandTable` (search, status filter, `MarketsPagination`, the Applications row-selection class) beside a wider side panel (2fr/3fr; stacked at 900px). Selecting a row or a map booth opens it in the panel: `BoothAssignmentDialog` gains `presentation="panel"`, rendering the same assignment and Edit booth views inline. `useWizardDialogHeight` also eases an inline container marked `data-height-ease` (dialog callers unchanged). The occurrence map and Market Day keep the dialog.
- `Assignments` now renders only the Market Day map, vendor list and closeout; Market Day keeps its Review documentation link and occurrence control.
- Only assignment arrangements live in `market/phase14/assignments.css`, including spacing for the shared assignment card inside this page's dialogs (its usual spacing comes from Market Day styles that this route does not load).

No new primitive, UI library, API, migration or database change is introduced, and this does not approve the Farmstand presentation for other features.

## Rental equipment presentation, November 7, 2026

The requested rental list and creation flow reuse `WorkspaceFrame`, `MarketsSummary`, Farmstand controls/table/pagination and the existing reward/occurrence wizard presentation. `RentalWizard` and `Rentals` in `apps/admin/src/market/phase14/` are bounded feature compositions because existing primitives do not own rental pricing, availability, allocation reads or revision-aware persistence. Both create and edit use shared `Dialog`, `WizardProgress` and `useWizardDialogHeight`; `CategoryImageField` supplies the existing image library/upload interaction. Optional image metadata uses the existing rental JSON. No new UI primitive, styling system, pending-category selection or unrelated migration is introduced. See the usage guide for permission boundaries.

## Market Applications presentation, November 7, 2026

The developer asked for the Market Applications page to follow the vendor Applications view, for a more intuitive application flow, for reordering that works like the vendor Dashboard organizer (without resizing), for drafts to be saved only after an edit, and for applications to be archivable.

- `/market/applications` (`market/phase14/Applications.tsx`) composes `WorkspaceFrame` (heading with the Create application action), `MarketsSummary`, the vendor Applications list classes (filters, `FarmstandTable` row selection, `MarketsPagination`) and the side details panel (`market-application-facts`, `dd` centered, verified 0px offset). Archive uses the shared `Dialog` and the approved `destructive-outline` button; archived applications move to an Archived filter where Restore is available.
- `/market/applications/new` and `/market/applications/:id` open `ApplicationBuilder`, which reuses the vendor application detail page layout (`application-detail` heading, back link, columns and `Panel`), shared `Alert`, `Badge`, `Dialog`, `Radio`, `Checkbox`, `IconButton`, `UtilityIcon` and `ApplicationFields` for previews. The expanded question form is unchanged in behavior and now lives in `ApplicationQuestionEditor.tsx`.
- Reordering (`application-drag.ts`) is feature code on pointer events, like `DashboardLayoutEditor`: the grabbed card follows the pointer, a dashed placeholder marks where it lands and neighbours slide aside. Questions move within and between sections; sections collapse to rows while one is dragged. The handle supports arrow keys with live announcements. No drag-and-drop library is introduced. The ghost is portaled to the body because the workspace entry animation leaves a transform that would offset a fixed element.
- `UtilityIcon` gains `grip`, `eye` and `link` paths; existing icons are unchanged.
- Sectioned vendor application (November 18, 2026, developer sketch): the public form at `/apply/:slug` (`MarketApplication.tsx`) and the builder Preview both render `ApplicationFlow` from `@market/ui` (`packages/ui/src/ApplicationFlow.tsx`, styles in `@market/ui/application-flow.css`). A side panel lists the steps with completion markers (filled with a check once a step is passed and its visible required answers are present) and lets applicants jump back to any step they have reached; one section shows at a time with Back/Next, and Next runs native validation on that section. Steps are the account question (skipped when signed in with one business or resuming a draft), Market dates (date cards), each definition section via `ApplicationFields`' new optional `section` prop (default output unchanged), rentals inside the section holding the electricity/vehicle questions (or their own step), then Documents (rendered through the step's `extra` slot, outside the step's `<form>`, so document dialogs never submit the application; Back/Next sit outside it too and submit through `form=`). Submitting from the last step first returns to any earlier step whose required answers became incomplete. Sections slide in subtly and submission ends on an animated check; the builder preview passes `animate={false}`. Colors come only from `--brand-*` tokens so each storefront theme carries through; scoped resets keep `.ops-public button`, `.application-detail ul` and capitalized dashboard headings from restyling it. Why new: the only stepper (STP-01 checkout progress) is commerce-specific and pending selection, and `WizardProgress`/the reward success check are admin-only dialog compositions not loaded on the storefront, so the success check mirrors `reward-published-check`. This does not approve the STP category. Submission, drafts, sign-in progress and account authority stay in `MarketApplication`. Published applications show a live link (`ApplicationLiveLink`, `liveApplicationUrl` in `application-status.tsx`) on the Applications list and details panel and after publishing, built from the server-owned `storefrontOrigin` on the APPLICATIONS read and the `templateSlug` returned by `PUBLISH_APPLICATION`; several applications can be published at once, only advertising is exclusive. New applications default to Contact information, Business, Booth needs and Social sections (backend `defaultDefinition`); existing applications are unchanged. Follow-up (November 18, later): the last step shows the shared `ApplicationAcknowledgement` (a required checkbox in `ApplicationFlow`'s `beforeSubmit` slot, linking the Market's Policies page when published); submissions record `acknowledgedAt` and the wording version (`applicationAcknowledgementVersion`, kept equal in `@market/api` and the backend). On phones the step row scrolls the current step into view. Applicants without an account can choose Create an account from the account question and the Documents step (`/vendor/application-continue?signup=1`), which saves their answers first. `MetadataFields` takes `expirationRequired`, so uploads for a request that needs an expiration date no longer offer "does not expire" (the backend now answers `DOCUMENT_EXPIRATION_REQUIRED`). Primary category and Business type are fixed dropdowns in new applications: category uses the platform's top-level product categories.
- Follow-up (November 7, later): the redundant Review submissions heading action and the visible Actions column headings were removed (row Edit/View/Open links remain, with their accessible names). Submitted Applications puts the All/To review/Awaiting vendor quick view in a `FarmstandSelect` beside search, the Filters trigger uses the `sliders-horizontal` icon, and search, select and Filters share a 40px height aligned to the table edges. The builder drops the informational banners (new-application and published-draft notices; error and validation alerts remain), sections collapse from a header chevron `IconButton` (a dragged question keeps its section open and a drop opens it), and the operations `Check` gains an opt-in `animated` prop that reuses the shared `notification-option` row and `replayCheck`; date and rental lists use a tighter row spacing. No new primitive is introduced.

The operations workspace styles every plain `button` at high specificity, so the card overlay and drag handles opt out with scoped `!important` resets, as the former `question-edit-overlay` did. No new primitive or UI library is introduced, and this does not approve the Farmstand presentation for other operations pages.

## Market Operations presentation, November 7, 2026

The developer requested that Market Operations (`/market/operations` and `/market/operations/:id`) take the Market Occurrences presentation, make items needing the manager easy to find, hide preorders without removing them from the backend, and remove page refresh buttons (the AdminShell top bar refresh remains).

- The list composes `WorkspaceFrame` (the AdminShell heading is skipped), `MarketsSummary` (Next market, Needs attention, Vendors without booths, Pending vendors), the occurrence filters, `FarmstandTable` with a Readiness column, the selected-date side panel (attention list and shortcuts) and `MarketsPagination`. `BoothCell`, `BoothMeter`, `periods` and `periodRange` are exported from `occurrences.tsx` rather than copied.
- `operations-data.ts` builds per-date facts from the existing booth schedule read (`readScheduleWindows` and `boothCounts` were extracted from `readOccurrenceBooths`, which is unchanged in behavior) and one Market Day Checklist read per active date. Attention items are the checklist items with a count plus No layout selected, Vendors without a booth and, on the day with Market Day permission, Vendors not checked in. Reads are bounded to the dates on the page and the next 10 upcoming dates.
- The date page reuses the vendor detail layout: header with Manage occurrence and Open market day, summary cards, `ReadinessChecklistPanel` (Needs attention first, then On track) and sidebar panels for vendors and booths, date details and quick actions. Ended, cancelled and unavailable dates are never shown as ready.
- Preorder purchases are not rendered. `OperationalPurchases` moved unchanged to `OperationalPurchases.tsx` (re-exported from `operations.tsx`) and `MarketService.operations` remains, so the view can return without backend work. The occurrence page's Orders and readiness shortcut is now Operations and readiness.
- The checklist's Refresh checklist button was removed. Read errors keep the existing Try Again recovery.
- Only operations-specific arrangements live in `market/market-operations.css`.

No new primitive, UI library, API, migration or database change is introduced.

## Market Occurrences presentation, November 6, 2026

The developer requested that Market Occurrences (`/market/occurrences` and `/market/occurrences/:id`) use the Farmstand presentation already applied to the vendor dashboard, with a multi-step Generate occurrences dialog like the loyalty reward wizard. Existing capabilities were kept.

- The list composes `WorkspaceFrame` (heading only; the AdminShell heading is skipped), `MarketsSummary`, and the vendor Upcoming Dates panel, filter, table, row-selection, side-panel and pagination classes. Range presets and a custom range reuse `FarmstandSelect` and the existing `OrdersDateRange` dialog; search and status filter the full range read client-side. Booth counts come from the existing booth schedule read (60-day windows) and the occupancy chart reuses `FinanceDonut`. The workspace root carries `farmstand-controls`.
- `/market/occurrences/generate` and `/market/occurrences/new` stay routable and open dialogs over the mounted list (shared AdminShell workspace key). Generate uses `GenerateOccurrencesWizard` (Repeating schedule, Date range, Review & generate). Schedule save and removal keep the versioned `CommandForm`; generation calls the same synchronous or queued commands. The single date dialog keeps the `CommandForm`/`SessionFields` command.
- `WizardProgress` and `useWizardDialogHeight` (`apps/admin/src/WizardProgress.tsx`) were extracted from `LoyaltyRewardWizard` so both wizards share one stepper and dialog-height animation; the reward wizard renders identically. The progress grid follows a `--wizard-steps` variable (default 4).
- The detail page composes the vendor detail layout (`Panel`, `Fact`, overview strip, columns, quick actions). Edit and Cancel open shared Dialogs around the existing `CommandForm` commands; the cancel dialog is the single confirmation. `OccurrenceMap` now renders inside a detail `Panel` with its Manage booths link in the header.
- Follow-up (November 7): Generate runs the synchronous command only (no execution choice) and shows a Creating ring that gives way to the published check. Its Dates & address stage takes one required Market address (prefilled from the market venue) for every new date, sent as the new optional `venue` argument of `generateMarketOccurrences`; existing dates and the worker path are unchanged. The occupancy key and rate card sit beside the ring through `FinanceDonut`'s existing `legend` and `controls` slots. The occurrence map opens `BoothAssignmentDialog`, extracted unchanged from the Assignments workspace, when a booth is chosen on the map or from the booth list.
- Follow-up (November 7, later): a Market can keep several repeating schedules, each with its own address (`schedules` on the Market, with `saveMarketSchedule`, `deleteMarketSchedule` and `scheduleIds` on generation; migration `MarketSchedules1796000000000` copies the existing single rule into the list). This replaces the single-address field added earlier. The wizard's first step lists the schedules as selectable cards with Edit, Delete (an in-place `CommandForm` confirmation) and New schedule. On the occurrence page, `OccurrenceLayoutActions` takes an opt-in `compact` variant so Change layout and Edit layout sit in the Market layout heading at the Manage booths size; the Assignments page keeps its original buttons.
- Only the occurrence-specific arrangements live in `market/market-occurrences.css`: the booth meter (native `progress`), the Next 7 days list and date chip, the occupancy layout and wizard spacing.

No new primitive, UI library, API, migration or database change is introduced, and this does not approve the Farmstand presentation for other features.

## Documents workspace presentation, November 6, 2026

The developer requested that Documents (`/vendor/documents`, `/market/documents`) look like the other workspaces: the same menu bar, new modal styling, new buttons and tables, and a refreshed design for the existing document cards (cards are kept).

- The page composes `WorkspaceFrame` (heading only; the AdminShell heading is skipped) with Upload document in the heading actions. Views stay in-page TAB-01 `Tabs` given the `workspace-menu` variant and Farmstand icons, as Packing does, so tab roles, keyboard behavior and the `?view=` deep links are unchanged.
- Sections reuse `SettingsPanel`. Its styles moved from `settings-workspace.css` into `settings/settings-panel.css` (imported by the component), and it gains an optional, default-off `actions` heading slot. Settings renders identically.
- The workspace root carries `farmstand-controls`, so its buttons, inputs, selects and every dialog inside it (including the shared `DocumentUploadDialog`, `DocumentShareDialog` and RecordCard dialogs) take the Farmstand control presentation without changing those shared components for their other consumers. Buttons use `FarmstandButton` (Delete, Reject, Revoke and Archive use the approved `destructive-outline` variant; their confirmations stay filled `destructive`). Tables use `FarmstandTable` and paging `FarmstandPagination`. Shared `DataTable` now passes its `className` through the `recordDetails` path (previously dropped), so `FarmstandTable` keeps its presentation on record-detail tables; no existing caller combined the two. `UpcomingReadiness`, which also renders on the overview, keeps its original table.
- `DocumentCard` (`documents/DocumentCard.tsx`) arranges the existing RecordCard as an icon tile, title, subtitle, chevron and a status/date footer for library, request and agreement cards. RecordCard already owns the single keyboard target and details dialog; no existing composition provided this card layout. `DocumentFacts` is the dialog label/value list (`dd` centered, verified 0px offset) and `DocumentSection` a titled dialog group.
- Reports reuse `MarketsSummary` for readiness counts. The Farmstand icon set adds Lucide `file-text`, `file-image`, `file-check`, `folder-open`, `clipboard-list`, `shield-check`, `chart-column`, `book-open`, `upload` and `download` under the existing license.

No new primitive, UI library, API, migration or database change is introduced, and this does not approve the Farmstand presentation for other features.

## Vendor Dashboard, November 6, 2026

The developer requested that the vendor Overview become a comprehensive, customizable Dashboard (sidebar label `Dashboard`, route `/vendor`), following a supplied rough outline. `VendorDashboard` (`apps/admin/src/vendor/VendorDashboard.tsx`) is a feature composition, not a new primitive or standard: it reuses `WorkspaceFrame` (heading only, no tabs), `MarketsSummary`, Farmstand panels/selects/buttons/links/table, the Markets `markets-next` panel, `AttendanceBadge`, shared Badge, Dialog, Checkbox, IconButton, Alert and read states, and the finance `FinancialGraph` and `FinanceDonut`. `FinanceDonut` gains two optional, default-off props (`unitLabel` for counted slices such as customers, and `legend` for a value/share key); existing finance consumers are unchanged. The dashboard-specific pieces (urgent request cards, date tile, weekly task list, top-product list) are needed because no shared composition combines these authorized reads; they use existing status and brand tokens only. No new UI library or competing standard is introduced. The later drag-and-drop layout editor (`DashboardLayoutEditor`) and its grid engine (`dashboard-grid.ts`) are likewise feature code built on pointer events, not a grid or drag-and-drop library, so no library approval is implied.

## Settings and Integrations consolidation, November 5, 2026

The developer requested that Settings and Integrations become one Settings workspace per role, following the Farmstand presentation of Finances, Markets, Customers, Orders and Products, with the shared workspace frame extracted first. See [the consolidation plan](docs/SETTINGS_INTEGRATIONS_CONSOLIDATION_PLAN.md).

- **`WorkspaceFrame`** (`apps/admin/src/WorkspaceFrame.tsx`) is the Markets heading (icon, `h1`, subtitle, optional actions) plus `WorkspaceMenu` route tabs, extracted from the identical markup in Finances and vendor Markets. Both now consume it with unchanged output; it sets `--workspace-tabs` (menu columns) and `--workspace-tabs-narrow` (at most three, for opt-in narrow wrapping). Loyalty keeps its own heading and `loyalty-menu`. It owns presentation only; callers own views, routes and reads.
- **`SettingsWorkspace`** (`apps/admin/src/settings/SettingsWorkspace.tsx`) composes `WorkspaceFrame` with role tabs: Vendor Preferences, Notifications, Taxes, Payments, POS; Market Market, Preferences, Notifications; Platform Preferences, Integrations. Tab visibility uses `settingsViewAllowed` from `@market/admin-core` plus the services present; all reads and commands stay backend-authorized.
- **`SettingsPanel`** is the section composition: a `FarmstandPanel` with the `markets-stat-icon` tile, an `h2` and an optional muted description. Existing section controllers render inside with a new opt-in `embedded` prop (Card `surface="embedded"`, heading omitted): `DashboardAppearanceSettings`, `AccountTimezoneSettings`, `NotificationPreferences`, `VendorTaxSettings`, `MarketSettings`, Stripe `Payments`, `SquarePaymentIntegration` and `CloverPaymentIntegration`. Market `CommandForm` gains an optional `hideTitle`, matching the vendor `CommandForm`. Defaults are unchanged for every other consumer. Panel bodies keep the owning module's existing layout wrapper (`vendor-workspace`, `market-workspace`, `management-workspace`) instead of new form rules.
- **`farmstand-controls`** is a new opt-in container class in `@market/ui/farmstand.css`. Ordinary shared `Button`, `Input`, `Textarea` and `Select` controls inside it take the Farmstand control values: the `FarmstandButton` selectors are extended to match it, and inputs and selects use the Finances expense-form values (1px Farmstand border, 8px radius, 40px height, 14px text, 12px muted labels). Settings panel bodies use it so the existing section controllers match Finances, Markets, Customers, Orders and Products without rewriting each controller. `FarmstandSelect`, the SEL-02 status-select specialist and the native picker surfaces are unchanged, and nothing changes outside an opted-in container.
- Workspace pages reserve the page scrollbar gutter (`html:has(.markets-workspace)`) so centered content does not shift when a short tab drops the scrollbar.
- **Provider identity** (`apps/admin/src/settings/providers.tsx`): `providerName` (backend code to display name, e.g. `lightspeed-x` to "Lightspeed X-Series"), `codeLabel` (enum codes such as `NOT_CONFIGURED` to "Not configured") and `ProviderLogo`, a 44px tile matching `markets-stat-icon`. Square, Stripe and Shopify marks are Simple Icons SVGs (CC0, `settings/brands/LICENSE.md`) on a white chip; Clover, Toast and Lightspeed use developer-supplied full-color PNG marks in `settings/brands/`; any provider without a mark falls back to a brand-colored lettered tile. POS provider and connection cards and the Payments panels use it. `SettingsPanel` gains an optional `media` slot for the logo.
- `farmstand-controls` also sets the native DDN-03 disclosure geometry variables (Farmstand border, 8px radius, compact summary) without changing disclosure behavior.
- Notification preferences are grouped into Document requests, Submissions and reviews, Expiration and compliance (with reminder timing) and Agreements, in packed columns. Option rows tint on hover, and the native checkbox scales on press and plays a short pop only after a user change (never on first render), with reduced-motion support.
- The Preferences color editor uses a compact one-row color grid (`ui-palette-fields-row`, embedded mode only), and Sales tax rate labels are 15px semibold in a responsive grid.
- The Farmstand icon set adds Lucide `settings`, `palette`, `bell`, `percent` and `plug` glyphs under the existing license.
- Why existing components were not enough: no shared component owned the heading-plus-route-tabs frame (Finances and Markets each inlined it), and no Farmstand composition titled a settings section while hosting an existing card-based controller without nesting card outlines.

No new primitive, tab standard or form standard is introduced, and the Farmstand presentation is not approved for other features by this entry.

## Finances workspace consolidation, November 5, 2026

The developer requested one Finances workspace in the Farmstand presentation used by vendor Products, Pickup, Customers, Loyalty and Markets, with Analytics folded into the finance overview. Vendor and market Finances now compose the Markets heading, `WorkspaceMenu` route tabs (Overview, Transactions, Expenses, market Booth invoices, QuickBooks), `MarketsSummary` cards, Farmstand panels/tables/selects, `MarketsPagination` and the Applications row-selection and detail-panel classes. `MarketsSummary` accepts caller-formatted string values and node hints without changing existing consumers. The finance SVG chart adapter, shared `ExpenseDialog` and QuickBooks controller are unchanged in behavior. No new primitive, tab standard or chart standard is introduced; this does not approve the Farmstand presentation for other features.

## Packing tabs workspace-menu presentation, November 4, 2026

The developer explicitly requested that Packing & Fulfillment's Master List / Individual Lists tabs look like the Markets workspace menu while keeping in-page tab behavior. Shared TAB-01 `Tabs` gains an optional tablist `className` and decorative per-item `icon`; roles, ids, keyboard navigation and panels are unchanged, and existing consumers render identically. `apps/admin/src/workspace-menu.css` now styles `.workspace-menu.ui-tabs` tabs through the same rules as its route links, so no second visual standard exists. This does not convert tabs to route links or approve the variant for other tab consumers without a separate request.

## Vendor catalog Figma presentation, November 1, 2026

The developer explicitly requested the Farmstand vendor products and inventory design, including its new control appearance. `@market/ui/farmstand` provides opt-in reusable adapters over the existing primitives, using 8px control corners, 42px main actions, 32px compact actions, 16px panels and the original local Figma icons. This exception is scoped to the requested catalog composition, preserves the current AdminShell and account palette tokens, and does not replace the site-wide standard or approve other pending categories. Existing category and product editors and guarded stock commands remain authoritative. [Implementation and reuse rationale](docs/VENDOR_CATALOG_DESIGN.md).

Developer-approved BTN-01 extension, October 23, 2026: `destructive-outline` is the reusable red-text/red-outline variant for exit/remove/cancel actions, filling danger red with white text on hover/focus without translation. React Button, the Astro adapter and action links share its presentation. It uses existing danger and geometry tokens, preserves disabled/loading and accessible semantics, and is independent of storefront hover-effect settings. Cart Remove adopts it; other consumers migrate only when separately requested. The filled `destructive` variant remains available. The button gallery and playground include the new variant.

## Financial reporting composition, 2026-10-20

Subsequent UI-only refinement: finance gross/expense series use diverging bars while profit retains its line. Donut hover cards stay outside the circle in a reserved row; selectors sit between the plot and legend. Expense category details use the existing RecordCard surface/hidden-native-trigger contract instead of a separate visible details button. No shared primitive changes or new design standard are introduced. Browser and backend tests for this refinement are deferred to the developer as requested.

Developer-requested interaction update: finance uses the existing searchable multiselect, left-aligned secondary controls, independently visible series, mounted-chart refreshes, and hover/focus value cards. Its three analytics cards use signed-aware donut adapters and the approved tooltip surface, retaining shared drilldown dialogs. SVG virtual anchors require feature-owned positioning instead of an HTML tooltip wrapper. Account timezone forms reuse SearchSelect/native Astro select contracts and the existing personal settings store. See [dashboard update](docs/financial-reporting/dashboard-update.md). No pending component category or competing styling standard is approved.

Finances reuses the existing approved Card, KPI-01 `ui-kpi-grid`, DLG-02 Dialog, form controls, Button, Tooltip, Badge, Pagination and TBL-02 record-detail contracts. The shared vendor/manager finance feature adapter supplies signed monetary SVG plots, expense classification and owned record controllers. Existing projection and loyalty chart controllers do not express this report model, so the adapter remains feature-owned. No new library, primitive, chart approval, or pending-category selection is introduced. Product cost fields extend the current variant forms; customer price and checkout authority remain unchanged. See [implementation architecture](docs/financial-reporting/architecture.md).

Stage C Square settings and mobile return are feature compositions in `apps/admin/src/vendor/square.tsx`. They reuse approved Card, Dialog, Button, Badge and form controls plus existing Alert/Spinner/RouteLink and POS receipt/refund views inside AdminShell. Existing primitives do not supply OAuth/pairing or transaction-return business state, which warrants the feature composition; no new shared primitive or category approval is introduced. The settings use the existing POS 44px control-height token, 24px section/footer separation, shared action gaps and native responsive Dialog. [Stage C qualification](docs/inPersonPayments/STAGE_C_TESTING.md) records DOM/a11y/geometry tests at 1280, 768 and 390px without images or recordings.

Stage B payment compositions in `apps/admin/src/vendor/pos-payments.tsx` reuse the existing register/dashboard and approved shared Dialog, Button, Card, Badge and form controls. PosPaymentDialog owns method selection, cashier tender/attestation and uncertainty; PosSaleDetails owns the immutable backend receipt; PosOrderPayment/PosRefundDialog integrate existing Orders and original-unit refunds. No existing composition supplied this payment-specific lifecycle, which warrants these feature adapters. They introduce no primitive or pending-category approval. Keep 1.5rem section/footer separation, shared action gaps, scoped 44px touch-height token and native Dialog responsive padding/focus. No screenshots, videos or traces are used. [Usage](COMPONENT_USAGE_GUIDE.md#in-person-checkout-composition), [architecture](docs/inPersonPayments/STAGE_B_ARCHITECTURE.md) and [qualification](docs/inPersonPayments/STAGE_B_IMPLEMENTATION_SUMMARY.md) document their boundaries.

## In-person checkout feature composition, 2026-10-18

Stage D extension, 2026-10-19: Clover connection/device settings and OAuth return are feature controllers composed from the same approved shared primitives. They retain merchant/protocol authority in the backend and use existing payment-dialog spacing. Clover adds no competing primitive, styling library, heading pattern or newly approved category. Existing POS receipts, payment/refund dialogs and Orders remain the shared feature surfaces. DOM geometry and accessibility qualification are recorded in [Stage D testing](docs/inPersonPayments/STAGE_D_TESTING.md).

Developer-requested exception: only product-card favorite Buttons use a 35.2px circle and a 6% Grow hover/focus effect through the shared control-height and hover-transform tokens. Existing disabled and reduced-motion rules apply. This does not enable Grow on other icon controls or change the category-bar heart button.

Requested register refinements reuse the shared control-row/action alignment tracks, icon-only Buttons and UtilityIcon. UtilityIcon now offers heart and horizontal chevron paths plus an optional `filled` presentation, preserving existing outline consumers. Favorites selection fills the heart without underline; its fixed control is divided from a native overflow category strip with responsive arrow controls. The shared customizable Select centers its selected content within the existing inner button. No new primitive or design-category approval is introduced. Empty checkout UI is local until the first atomic native product addition, and empty snapshots are excluded from Saved drafts.

`PosRegister` and `PosProductTile` live in `apps/admin/src/vendor/pos.tsx`, with layout in `pos.css` and request serialization in `pos-queue.ts`. Their inputs are the typed `InPersonApi`, selected vendor name and existing backend catalog/draft projections. States cover initial selection, loading/search/empty/unavailable products, saving quantities, interrupted mutation retry, optional customer dialogs, open cart, expiring review and cancelled/expired draft rejection.

These feature compositions reuse AdminShell, Button, Card, Field, Input, SelectField, Dialog/drawer, Badge, Alert, EmptyState, Spinner and UtilityIcon. No existing shared composition supplied cashier-owned native drafts, immediate multi-product addition and an uninterrupted operational register. Existing Astro product cards and storefront cart controllers retain their renderer and business authority boundaries. This addition does not approve the pending product-card, cart, quantity-selector or summary categories and creates no parallel primitive or styling system.

Tiles use recognizable bounded images or the existing store icon, separate favorite controls, native keyboard buttons and an efficient variant dialog. The desktop/tablet cart remains visible; mobile uses a sticky total/control and the existing shared Dialog drawer. Touch compositions use the existing control-height token at 44px. Shared focus, dialog dismissal, theme colors and reduced-motion contracts are preserved. Geometry and functional checks use DOM assertions only; no screenshots are authorized. Details and exact verification results are in [Stage A documentation](docs/inPersonPayments/STAGE_A_IMPLEMENTATION_SUMMARY.md).

## Market challenge extension, 2026-10-18

This requested feature composes existing shared designs and does not select a pending category or create a competing UI standard.

| Component                                                        | Props and states                                                                                                                                                                                | Reuse and accessibility                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoyaltyProgressRing` optional `display`                         | `{ value, caption, detail }` changes objective text; `available` is finalized quantity and `milestones` contains one target. Omit to preserve vendor cumulative milestones.                     | Same capped arc, numeric SVG title, theme tokens, responsive centering and reduced-motion behavior. Pending progress is shown separately.                                                                                                                                     |
| `MarketChallengeCard` from `@market/ui/loyalty`                  | Backend `challenge: MarketChallenge`, optional action `children` and `onOpen`. Discovery, visits and spending; pending, completed, claimed, fulfilled, paused, expired and needs-review states. | Reuses RecordCard surface activation and a visually hidden native keyboard target when `onOpen` is supplied, without a visible View button. Spaced challenge title and right-side status share a row. Embedded Claim Reward remains independent. Static previews retain Card. |
| `MarketChallengeTermsView` from `@market/ui/loyalty`             | `terms: MarketChallengeTerms`, optional frozen `window` rows. Includes custom reward, pickup instructions, requirements and qualification policy.                                               | Shared by manager review and customer confirmation. Escaped multiline text; canonical occurrence IDs and cancellation labels. No raw HTML or guessed money totals.                                                                                                            |
| `challengeAmount`, `challengeRequirement`, `challengeKindLabels` | Pure USD/count formatting and objective text helpers.                                                                                                                                           | Consistent presentation across manager preview and customer details. They do not validate progress or create currency value for rewards.                                                                                                                                      |

Role-owned wizard, customer tab and fulfillment-dialog controllers reuse AdminShell/SSR customer shell, Tabs, DataTable record details, Dialog, Field, existing Textarea, Input, SelectField, Button and LoyaltyRedeemButton. No existing controller combined these campaign requirements, which warrants the new feature compositions. Existing primitive approvals and pending selections remain unchanged. See [usage guide](COMPONENT_USAGE_GUIDE.md#market-challenge-compositions) and [architecture](docs/MARKET_LOYALTY_CHALLENGES.md).

## Loyalty foundation extension, 2026-10-17

These requested feature additions compose the approved primitives. They do not select any pending design category or introduce another button, card, form, chart or dashboard standard.

| Component / export                              | Purpose and interface                                                  | States, data and behavior                                                                                                                                                                                                                                                                                                                                   | Reuse and accessibility                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoyaltyProgressRing` from `@market/ui/loyalty` | `available: number`, `milestones: readonly number[]`, optional `label` | Uses distinct positive thresholds and the next strictly higher milestone. The primary arc shows total available progress; after a milestone is achieved the entire empty track changes from 12% to 38% primary tint against the current surface. No old-color fragment remains. Highest milestone is complete; zero, debt and missing rewards are explicit. | Centered accessible SVG with one numeric title, responsive 200px maximum and theme tokens. The arc animates from zero to its actual position on load; reduced motion renders its final state immediately. Pass available points only. No extra chart dependency.       |
| `loyaltyProgress` from `@market/ui/loyalty`     | Pure helper for available points and milestone arrays                  | Returns target, previous milestone, completion and completed/current proportions. Equal-cost rewards share a milestone. Recalculates after spending.                                                                                                                                                                                                        | Use the same semantics for related accessible labels and future native adapters. It has no API or balance-changing authority.                                                                                                                                          |
| `LoyaltyRedeemButton` from `@market/ui/loyalty` | Existing `Button` props plus required `eligible: boolean`              | Composes the approved Button. Ineligible is disabled. Eligible, enabled, non-loading controls add the requested gentle bounce and slow glow/brightness flash. Labels stay readable; busy/disabled controls do not animate.                                                                                                                                  | New wrapper because the existing Button had no reward-eligibility presentation. Reuse for dashboard and checkout reward actions. Keeps native button, focus, loading and hover semantics. `prefers-reduced-motion` removes the pulse. Import `@market/ui/loyalty.css`. |

`CustomerLoyalty`, `CheckoutLoyalty`, `VendorLoyalty`, `LoyaltyRewardWizard`, the compact trend composition and leaderboard/detail views are feature controllers, not new shared primitives. They compose Card, UtilityIcon, Badge, Button, Dialog, DataTable/recordDetails, Pagination, Field/Input, SelectField, SearchSelect, SearchableMultiSelect, EmptyState, ReadState, route tabs and existing dashboard adapters. They keep current authentication, order, inventory and monetary authority on the backend. Ordinary records retain minimal visible columns and shared detail dialogs. Vendor identities use the existing store UtilityIcon as a logo fallback. Existing primitives did not provide the domain-specific multi-step wizard, lifecycle reads or reward checkout review, which is why those feature compositions were necessary.

The vendor shell supplies the page heading and navigation. Customer dashboard remains Astro SSR with one loyalty interaction island. No dashboard-wide hydration, independent modal/field styling or admin service import into customer code is permitted. See [feature architecture](docs/LOYALTY_REWARDS_FOUNDATION.md) and [manual qualification](docs/LOYALTY_REWARDS_TESTING.md).

Wallet cards reuse `RecordCard.header` for a plain left-aligned store icon/name, and `renderTrigger(props)` for one native eligible Redeem button below the ring. Only next-reward copy remains below the graphic; pending/reserved/debt facts live in details. These optional props preserve the default RecordCard trigger for existing consumers. Customer history keeps DDN-03 Dropdown but contains a semantic list of shared disclosure Buttons, each with an activity label and a green/red signed-point Badge. Clicking opens the existing detail dialog; no history table or extra columns are rendered.

Both carts reuse `CheckoutLoyalty` and shared Dialog/radio controls. Dashboard preferences use a short-lived HTTP-only cookie. Use Rewards stays visible after application, allowing explicit removal or atomic replacement while the cart is editable. Reserved/paid choices stay locked. Vendor View daily values Buttons open date-range Dialogs with real scoped graphs and every daily value, including zeros, bounded to 366 days. Top customers use full gold/silver/bronze tinted RecordCards, a top-right UtilityIcon trophy for first place and medals for second/third, accessible place labels, and shared detail dialogs. Visible rank numbers remain in the full table only. These are bounded refinements, not competing primitives.

## Notification Phase 2 extension, 2026-10-17

This bounded feature request extends the implemented notification compositions and existing SID-01/DSH-01 adapters. Notifications stays visible in Customer, Vendor and Market Manager navigation, with the existing bell icon, active state across all three notification routes, mobile drawer and collapsed Admin icon rail. The header bell and global unread store remain shared. This does not approve an unrelated pending component category.

`NotificationRole` reuses BDG-02 geometry through the existing Badge export with notification context tokens. Customer is blue, Vendor amber, Market Manager green and Account purple. Paired foreground/background tokens include dark equivalents and retain text plus a decorative context icon. Severity is a separate status indicator. Reuse this exact composition in notification previews, rows, detail, filters and subscription scopes rather than adding local role-color rules.

Destination-specific labels are backend-owned presentation metadata after current authority checks. The shared UI renders only an authorized usable target and its truthful page/list label. Unavailable links have an explicit safe state. Customer handoff and Admin channel selection remain their existing controllers.

The Market Day Checklist is an occurrence-operations feature composition of existing Card, Badge, Button, RouteLink and read/error primitives. It displays live domain facts, resolution links and an as-of time, never mutable checked flags. Existing readiness/compliance projections retain authority. Daily readiness notifications reuse the ordinary shared inbox/detail. See [the usage guide](COMPONENT_USAGE_GUIDE.md#notification-context-and-operational-readiness) and [notification architecture](docs/IN_PLATFORM_NOTIFICATIONS.md).

## Shared notification specialist, 2026-10-17

The requested notification center composes the existing BTN-01, DLG-02, DDN-03, HDR-01/DSH-01, BDG-02, ALT-01, EMP-02, LOD-01, TAB-01 and PAG-01 contracts through `@market/ui/notifications`. Its email-style rows retain an independent main reading button, checkbox and small inline actions, with native disclosure actions on mobile. This purpose-built inbox is excluded from the ordinary administration-table summary-only migration. No UI library, replacement primitive or additional pending-category approval is introduced. Customer and Admin use shared compositions and renderer-specific authenticated adapters. See [usage](COMPONENT_USAGE_GUIDE.md#shared-notification-inbox) and [implementation report](docs/NOTIFICATIONS_IMPLEMENTATION_REPORT.md).

## Site-wide button standard, 2026-10-16

The developer selected this standard from the button playground and explicitly authorized implementation on all site buttons. It supersedes the prior 44px button geometry and earlier hover designs.

- Use BTN-01 Button, the native Astro Button adapter or buttonClassName for every action button and button-styled link. Primary, secondary, tertiary, destructive and disclosure are supported semantic variants. Utility/help controls, dialog dismiss buttons, editor tools and map controls share this presentation while retaining their existing behavior. Horizontal view navigation uses TAB-01 underline styling, independently of button styling.
- Ordinary buttons use 40px height, 18px horizontal padding and at least 22px corner radius. The shared defaults are --ui-control-height: 40px, --ui-button-padding-inline: 18px and --ui-button-radius: 22px. Compact is a compatible API, not a competing smaller geometry. Single-line fields/selects match 40px and keep rectangular corners. Long labels can wrap and grow beyond the minimum height to remain readable. Icon-only controls use a 40px square with no text padding and fully rounded corners; their icons remain borderless. The modal X retains its translucent circle.
- Every enabled action button has a soft hover/focus shadow (0 5px 16px, primary color at 26% opacity), with 180ms ease transitions. Tertiary, icon-only and disclosure controls stay in place on hover and keyboard focus, regardless of their fill variant. This includes sidebar collapse, refresh, modal X and record names such as Vendor X. Ordinary primary/secondary/destructive actions translate upward by 4px. Primary fills use the Stronger color choice: primary mixed with black at 28%. Secondary, tertiary, icon and disclosure fills use the softer primary-at-10% surface mix. Hovering any extra effect must preserve these semantic fill and motion rules. Destructive actions retain red and darken by the same amount.
- Horizontal navigation such as Documents Library, Agreements and Requirements uses shared Tabs or real RouteLink tabs inside `.ui-tabs`, without BTN-01 classes. The current view has a solid 3px primary-colored underline. Other entries animate a lighter underline at 35% opacity on hover or keyboard focus, using 180ms ease. Keep transparent backgrounds, square corners and no shadow or movement. Active underlines stay solid while hovered. Reduced motion disables underline transitions. Preserve native tab keyboard/panel semantics, disabled entries and real route href/current-page behavior.
- Preserve keyboard focus indicators, native submit/name/value/form behavior, real hrefs, permissions, selection/drag state and disabled/busy protection. Disabled controls do not lift or shadow; reduced motion disables movement. Shared variants and variables own presentation, not ancestor overrides.
- Keep Grow in the isolated playground for possible future use. It grows actual font size and its decorative surface together by 6%; it is not automatically enabled in production.
- Full-row/card record activation delegates surface clicks to the native named button, focuses it and activates it once. This preserves full-surface clicking while the visible button moves, without a stretched pseudo-element changing its click bounds. Existing embedded interactive descendants keep their own behavior. Browser-owned native select internals and the invisible application-editor hit target retain their required structural geometry.

## Shared UI refinement, 2026-10-16

An isolated [button playground](http://127.0.0.1:4343/buttons) is available through the existing local gallery launcher for developer experimentation. It composes BTN-01 and the existing form/Card primitives, with page-scoped sample overrides for roundness, height, horizontal padding, a tertiary text-button comparison and nine hover effects. Secondary hover fills match the corresponding tertiary fills, Grow animates real text size at the same rate as its decorative surface, and the primary Inset edge sample omits an outer border. The selected geometry, semantic hover fills, soft shadow and slide up for ordinary primary/secondary actions are now the production standard above. Tertiary samples also stay in place across every effect. The remaining experimental effects, including Grow, stay local to the playground. See the [implementation report](docs/UI_DESIGN_REFINEMENT.md#isolated-button-playground) for startup and verification.

The developer's Shared UI Design Refinement request authorizes the following bounded extensions. They supersede conflicting historical descriptions of admin sidebar collapse, record-management table density and document-card actions below. Existing category selections, specialist boundaries and unrelated pending decisions remain in force. Implementation is complete for the coverage listed in [UI_DESIGN_REFINEMENT.md](docs/UI_DESIGN_REFINEMENT.md); developer visual acceptance remains pending.

- **Management records:** use TBL-02 `DataTable recordDetails={{ status: columnIndex }}` for ordinary record lists. Render only the primary identifier and meaningful status. The whole row delegates pointer activation to one native named button, with hover and keyboard focus. The original cells, links and command controls are grouped by their existing headings inside DLG-02. Supply `labels` or `statuses` when an existing cell mixes summary data with other detail. Supply `onOpen(index)` to reuse a complete existing feature dialog. No visible action column or nested interactive summary targets. Sorting, filters and pagination remain caller-owned. Refreshed rows update open detail content by stable row key.
- **Table boundary:** the adapter accepts keyed native `tr`/cell children, including fragments. It preserves colspan empty rows. Stateful row components must first expose ordinary cells and retain their controllers within those cells. Unknown row component shapes retain the original full table rather than losing content. Do not use this opt-in for financial, analytics, invoice, stock-reconciliation or operational quantity comparisons. Audit/history tables inside a detail dialog may retain meaningful columns. Keep native Astro tables and domain-specific renderers unless a separately reviewed equivalent adapter is needed.
- **Document summaries:** `RecordCard` composes CRD-02, BTN-01 and DLG-02. The summary contains only its title, existing safe file placeholder, category, statuses and applicable expiry. The card has one keyboard-accessible target. Metadata, timestamps, versions, access grants and existing actions live in its detail dialog. Agreement/request cards reuse the same composition. Product/storefront merchandising cards are excluded. `DocumentVersionPicker` from `@market/ui/documents` uses SEL-07, shows the selected file's original metadata and scan status, and downloads that exact available version. Selection never publishes, replaces or persists a version.
- **Dropdowns:** SEL-03 and SEL-07 closed selections stay on one line, truncate with ellipsis and retain a consistent control height. Reserve 3rem at the inline end. React SEL-03 supplies the native customizable picker button and a constrained `selectedcontent` region when supported, with an SSR-safe native fallback. Place the decorative arrow 0.75rem from that edge. Native searchable/card-style picker presentation and native selection semantics remain intact; option text may wrap inside the popup. Do not use the closed-control truncation rule to hide important option text in the popup.
- **Multiple selection:** `SearchableMultiSelect` from `@market/ui` shares the SearchSelect search, popup, card styling, active-descendant keyboard navigation and Escape/blur behavior. Selected options sort first; each group uses a case-insensitive locale-aware collator and a stable value tie-breaker. Searching filters within that ordering. Options reuse the ordinary native Checkbox, vertically centered beside the label, with no extra indicator box or independently styled checkbox. The option owns keyboard/selection semantics; its decorative checkbox is read-only and out of the tab order. `name` serializes repeated hidden form values; `required` validates the combobox without changing API payloads. Support controlled `value/onChange` or `defaultValue`, native form reset, loading and empty results. Internal popup scrolling is permitted. Use it instead of a permanently visible multi-selection list when choices perform the same job.
- **Utility actions:** `IconButton` extends BTN-01 with `icon="refresh" | "edit" | "panel"`, a required full `label`, shared 40px geometry, loading/disabled behavior and Tooltip. Utility icons are borderless standalone SVGs with transparent backgrounds at rest and the approved soft fill and shadow on hover. All icon-only controls stay in place, including secondary icons and tertiary help controls. Refresh uses two curved arrows; Edit uses paper and pencil. Preserve submit and navigation semantics. Keep meaningful labels for less recognizable actions. Prefer short contextual verbs such as Save, Download, Open, Remove and Assign, while confirmation text identifies the record and consequence.
- **Tooltips:** `Tooltip` accepts an existing native interactive child, supports hover/focus and Escape, and positions a fixed tooltip immediately beside the hovered/focused control within viewport margins. Use the native manual popover top layer to escape dialog transforms, scrolling ancestors and stacking contexts without moving any content. Measure the actual surface, flip sides only when needed and reserve the highest fallback z-index. Shared `.ui-tooltip-surface` supplies the same body font, rounded secondary-color surface, automatically derived readable text and shadow to utility/navigation tooltips and the retained InfoTip button specialist, which now composes Tooltip. Accessible names remain on the actual control. Tooltip text is supplementary. Touch users can expand the sidebar to see all names.
- **Admin sidebar:** Market, Vendor and Platform reuse AdminShell and DashboardFrame. The desktop collapse control lives inside the sidebar and uses the existing panel icon without a boxed background. Collapsed width is 76px, retaining the shared platform mark, active navigation, hierarchy and named icon destinations with tooltips. Content expands into the remaining grid space. At 767px and below, preserve DashboardMenu and the existing mobile navigation. Market, Vendor and Customer use the compact `ui-shell` rail (`@market/ui/shell.css`, 64px collapsed); Customer SSR keeps its native navigation adapter.
- **Platform mark:** `MarketPlatformLogo` from `@market/ui` centralizes the existing shared market-stall icon and platform name. `compact` hides only the visible name. Use for placeholder platform branding; preserve actual tenant/storefront logos. Current consumers are the admin sidebar/session screen and customer sidebar, with server rendering retained for Astro.
- **Account colors:** the admin Settings palette exposes the existing `primary`, `secondary`, `background` and `surface` groups, corresponding to `--brand-*`. Both frontend and backend validate six-digit HEX values and the exact four-token allowlist. Contrast tips are advisory and must never disable Save or reject a valid palette on the server. Derive suitable foreground/muted colors from the surface and readable primary-button/tooltip text from their backgrounds. Status colors retain their semantic meaning. Secondary hover borders, tooltip surfaces and inactive sidebar icons must consume the chosen secondary token. No arbitrary CSS values or extra keys.
- **Palette coverage:** shared table backgrounds use surface, alternating rows mix primary at 3%, and row hover/keyboard focus mixes primary at 7%. Native and searchable dropdown hover/active fills mix primary at 6%, with selected options at 12%; popup surfaces, readable text, borders and shadows derive from existing palette tokens. The platform mark/name uses primary; Account mode labels use secondary. Sidebar hover also follows the primary/surface mix. Preserve semantic status colors and the existing Save-only application flow.
- **Preset sizing:** the Theme preset field and its native popup occupy half the available Settings form width at 768px and above. Below that breakpoint, use the full width to keep the name, four swatches and chevron usable. Other selects retain their existing widths.
- **Control geometry and focus:** ordinary BTN-01 buttons and action anchors use at least 22px rounded edges, 18px horizontal padding and the shared 40px control height, superseding the previous 50px and 44px references. Matching single-line inputs/selects use the same height and retain their existing rectangular radius. Multiline/specialist controls retain their required geometry. Row/card outlines use `:has(:focus-visible)` so pointer selection does not leave a keyboard ring; retain visible keyboard focus.
- **Dialog dismissal:** DLG-02/Drawer always supplies a named X SVG in a circular, translucent filled background at the top right. Remove footer Close actions; keep feature submit/confirm actions. The X uses the existing guarded dismissal path, busy protection, draft veto, animation and trigger-focus restoration. Legacy `showClose` is accepted for compatibility and no longer removes the header X.
- **Preference scope:** reuse Vendure's durable settings store field `marketDashboard.palette`, authorized by Authenticated and scoped exclusively to the server's active user ID. The same user's scopes/channels share the saved palette. Accounts without a saved palette retain their existing adminTheme/workspace defaults, including the approved branding accent. No client-supplied account scope, browser-storage authority, tenant branding writes, new entity or migration. A fresh authenticated provider loads the palette; switching identity immediately drops the previous account's colors. Public storefront/customer commerce pages never consume the preference.
- **Preset swatches:** Theme preset options and their selected name show four decorative 14px squares with 4px rounded corners, ordered primary, secondary, dashboard background and card surface. Reuse SEL-03's customizable native picker and selectedcontent cloning; theme-specific styling stays scoped to `.ui-palette-select`. Give light swatches a subtle token-based outline. Names remain accessible, swatches are hidden from assistive technology, and the closed label truncates before the chevron without shrinking its colors. Workspace default uses the current workspace palette; Custom colors uses the valid draft or saved fallback. Browsers without customizable native select retain text labels and ordinary selection behavior.
- **Color editing:** named picker/HEX fields, swatches and a compact live preview compose the existing form/Card/Button/Badge contracts. The preview includes primary, secondary and tertiary buttons, normal text, a card and status. Theme preset uses SEL-03 SelectField with Workspace default, Forest, Ocean, Clay, Plum and Slate choices; preset palettes are defined in `@market/theme`. Choosing one updates all four draft tokens and the local preview until Save. Matching is case-insensitive; manual edits outside a preset display Custom colors. Persist only the four palette values, not a preset ID. Cancel restores the saved draft; Restore defaults previews the workspace default palette and requires Save to persist it. Preset selection and fields follow existing busy protection. Failed loads offer Retry; failed saves preserve the saved palette.

Example, using caller-owned records and commands:

```tsx
<DataTable label="Records" headings={['Name', 'Status', 'Details', 'Actions']}
  recordDetails={{ status: 1 }}>
  {records.map(record => <tr key={record.id}>
    <td>{record.name}</td><td><Badge tone={record.tone}>{record.status}</Badge></td>
    <td>{record.description}</td><td><Button onClick={() => act(record)}>Save</Button></td>
  </tr>)}
</DataTable>
<SearchableMultiSelect label="Vendors" name="vendorIds" required
  options={vendors.map(v => ({ value: String(v.id), label: v.name }))} />
<IconButton icon="refresh" label="Refresh records" onClick={refresh} loading={busy} />
```

Retain each caller's loading/error/empty state, permissions, domain validation, confirmation and refresh handling. These compositions add no new business authority and do not approve unrelated pending UI categories.

Audit date: 2026-10-12. First-round developer design decisions: 2026-10-12. Second-round approvals: 2026-10-13. This registry is the mandatory approved-design reference for selected categories. Design decisions remain authoritative. Phase A shared foundations now exist, with bounded consumer migration tracked below.

Second manual remediation, 2026-10-13: the permanent signup-reference alignment contract now constrains ordinary field outer geometry, natural-width lookup actions and wrapping modal pairs. The canonical Admin entry uses one in-page authentication-method presentation; legacy native credentials and secure central email handoff remain supported. Product/occurrence SSR cookie forwarding and development account configuration are corrected. Real authentication/cart acceptance remains pending: the API is stopped and its current development database has no storefronts or enabled products. Targeted early DDN-03/BDG-02 adoption is limited to the requested Vendor detail surfaces and directly required shared presentation. Universal Phase B/C/D migrations and developer manual acceptance remain pending. See the [second manual review remediation](docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md#phase-a-second-manual-review-remediation-2026-10-13).

**20 of 47 categories have approved designs; all 20 have implementation complete; Phase B has developer-reported visual acceptance and Phase A/C/D retain developer manual review pending. 27 remain PENDING DEVELOPER SELECTION, including PGH.** The audit inventory remains 37 competing and 10 single/complementary categories, with 155 category-specific candidate records indexing overlapping concerns. Stable IDs and every historical candidate record are preserved. Existing adoption and earlier Codex recommendations are evidence, not approval.

| Approved category            | Developer standard    | Retained specialist IDs                                                        | Existing implementation kind                                                                    |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Buttons and action links     | BTN-01                | Specialist interactions and anchors preserve semantics under BTN-01 appearance | Shared React Button and native Astro adapter; coverage complete, manual review pending          |
| Text inputs                  | INP-02                | INP-03 OTP                                                                     | Shared INP-02 presentation; INP-01 behavior preserved; coverage complete, manual review pending |
| Select controls              | SEL-03                | SEL-02 color-coded selection; SEL-07 searchable combobox                       | Shared Select/SelectField and native class contract; coverage complete, manual review pending   |
| Cards and dashboard cards    | CRD-02                | CRD-04 expandable saved-layout/disclosure cards                                | Shared semantic Card and native surface contract; coverage complete, manual review pending      |
| Modals, dialogs and drawers  | DLG-02                | Necessary drawer/confirmation capabilities, not a separate DLG-01 foundation   | Shared Dialog/Drawer; complete ordinary coverage, developer-reported visual acceptance          |
| Dashboard shells             | DSH-01                | React SPA and Astro SSR role adapters                                          | Shared React/Astro frame; migration complete, manual review pending                             |
| Dashboard sidebars           | SID-01                | Role-specific navigation and renderer adapters                                 | Shared sidebar presentation; migration complete, manual review pending                          |
| Dashboard headers            | HDR-01                | Specialized editor controls conform to HDR-01 presentation                     | Shared topbar presentation; migration complete, manual review pending                           |
| Dropdowns and disclosures    | DDN-03                | CRD-04/DDN-02 saved-layout specialist                                          | Shared native disclosure contract; ordinary migration complete                                  |
| Badges and status indicators | BDG-02                | BDG-03 booth states; BDG-04 card/content adaptation                            | Shared tone/text; feature-owned maps and retained booth specialist                              |
| Alerts and notifications     | ALT-01                | Feature-owned outcomes, safe errors and retry flows                            | Shared severity variants and native feedback; migration complete                                |
| Empty states                 | EMP-02                | Optional feature-owned BTN-01 action                                           | Shared React/native EMP-02; migration complete                                                  |
| Loading indicators           | LOD-01 Skeleton       | LOD-01 Spinner for dialogs and action progress; read/error/retry controllers   | One page skeleton per first load; section skeletons for in-page reloads                         |
| Tables and data tables       | TBL-02                | TBL-03 invoice-specific presentation                                           | Shared DataTable; invoice and wide-data specialists retained                                    |
| Statistics and KPI displays  | KPI-01                | Linked/static variants; authoritative supplementary data                       | Shared KPI tiles with visible supporting facts; migration complete                              |
| Filtering controls and bars  | FIL-01 through FIL-05 | All five feature forms/query models                                            | All five adapters retained; shared control alignment complete                                   |
| Tabs and view selectors      | TAB-01                | TAB-02 layout editor; TAB-03 real route links                                  | Shared Tabs and real-link appearance; editor specialist retained                                |
| Pagination                   | PAG-01                | PAG-03 count/range; cursor/offset/native link adapters                         | Shared Pagination with supplied counts; paging adapters retained                                |
| Mobile dashboard navigation  | MOB-01                | Role-specific React/Astro navigation and secure logout                         | Shared native hamburger and single toolbar; role adapters complete                              |
| Section headings             | SCH-03 / SCH-01       | Dashboard / consumer-facing variants; CRD-02                                   | Shared dashboard/consumer heading variants; migration complete                                  |

The eight first-round category entries and their specialist decisions are preserved unchanged. Their references to then-pending DDN, MOB and SCH record the 2026-10-12 decision boundary; the dated second-round entries below now govern those categories. Ordinary DDN-03 disclosures do not supersede the retained CRD-04 saved-layout specialist. Mobile hamburger work requires its own scoped batch and does not change the earlier desktop shell/sidebar/header approvals.

All other categories remain undecided, including page headings (PGH), navigation/links (NAV), search fields (SRH) and dashboard/mutation form controllers (FRM). PGH has no new developer selection or requested change: do not refactor its typography, functionality or candidates. Retaining SEL-07 does not select SRH-02 as canonical; approving BDG-02 presentation does not approve OST/FTR domain mappings; retaining all five FIL forms does not merge their controllers.

Read the [detailed audit](docs/UI_COMPONENT_AUDIT.md), [gallery review guide](docs/UI_COMPONENT_GALLERY.md), [migration plan](docs/UI_COMPONENT_MIGRATION_PLAN.md) and [second-round decision summary](docs/UI_COMPONENT_SECOND_ROUND_DECISIONS.md). The unchanged audit/gallery are historical review evidence; their recommendations or pending-language do not override these developer decisions. Apply existing AGENTS.md reuse rules to unapproved categories.

Developer approval takes precedence over earlier Codex recommendations, which remain recorded as historical rationale. Each selected entry distinguishes existing reusable code from a visual pattern or shell region requiring extraction. Design approval does not authorize implementation, wholesale replacement of category members, controller consolidation or changes to security/business contracts.

For future decisions, record the selected stable ID/source, scope, permitted renderer/theme/density/semantic variants, specialist exceptions, requested corrections, date and evidence. Keep unresolved categories pending. Change implementation status only after a separately instructed bounded migration and verified consumer coverage.

Canonical source descriptions below preserve the original approval record. Current Phase A extraction, specialist verification and consumer progress are recorded in each Implementation state paragraph and the linked report. Phase B is implemented with developer-reported visual acceptance; Phase C/D implementation tracking is recorded below and in the [combined report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). Their manual review remains pending.

### Buttons and action links

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-btn)

Boundary: Universal. Competing implementations/contracts: yes.

| Candidate ID | Implementation                     | Exact source path                                                                                                                                      | Existing scope/adoption                                                                                                                                                                  |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BTN-01       | Button                             | [packages/ui/src/index.tsx:43](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:43)                                                     | Shared. 25 direct importing files; AdminApp, AdminShell, vendor and management forms, market forms, CommunicationPreferences, OccurrencePreview. React native props; className variants. |
| BTN-02       | Native .button controls            | [apps/storefront/src/components/Checkout.tsx:209](E:/coding/farmers-market-platform-web/apps/storefront/src/components/Checkout.tsx:209)               | Local pattern family. Checkout, VendorCart:122, MarketCart:162, ProductPurchase:91, MarketPurchase:117, PurchaseSuccess:34; Astro account and catalog forms. Existing shared CSS.        |
| BTN-03       | Operations buttons                 | [apps/admin/src/market/phase14/Applications.tsx:42](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Applications.tsx:42)           | Local pattern family. ApplicationBuilder, ApplicationReview, Assignments, Billing, Directory, Layouts, LayoutInspector and LayoutLayers. Shared ops CSS; parent Phase14Routes fieldset.  |
| BTN-04       | Plain account and checkout buttons | [apps/storefront/src/components/CentralAccount.astro:28](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CentralAccount.astro:28) | Local pattern family. CentralAccount:161/193/218/223/234, account/settings:158, Checkout:259/281/388/402/413, MarketApplication:190/301/311. Native submission or handlers.              |
| BTN-05       | Password and resend buttons        | [apps/storefront/src/components/SignupPasswords.tsx:54](E:/coding/farmers-market-platform-web/apps/storefront/src/components/SignupPasswords.tsx:54)   | Local. SignupPasswords; account/verify.astro:99 .resend-button. Password policy or phone-verification script.                                                                            |

Codex recommendation (historical): **BTN-01**.

Historical rationale: Broad adoption, native props and existing tokens make Button the safest foundation; explicitly design an Astro markup counterpart and action-link semantics before migration.

Developer selection: **BTN-01** as the universal button implementation and presentation standard.

Canonical implementation: **BTN-01 Button**, existing reusable React export in `packages/ui/src/index.tsx:43`, with existing `.button` styling in `packages/ui/src/styles.css`. Shared variants and equivalent Astro SSR presentation are implementation work still pending.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: All ordinary buttons across admin, vendor, market, customer and storefront interfaces. Preserve primary, secondary, destructive, icon, compact and other necessary semantic variants; native submit behavior; disabled/loading behavior and accessible names. Navigation actions retain anchor semantics. React uses the shared component where appropriate; Astro consumes the same shared presentation without unnecessary React hydration.

Decision date/evidence: **2026-10-12**. Explicit developer approval in the task "Record Approved UI Standards and Prepare Component Consolidation", following the developer's audit and visual gallery review. This records design approval only; implementation and its verification remain pending.

Required variants/improvements: Establish the approved shared button contract and necessary variants, migrate native/local appearances, and remove unintended contextual CSS overrides. Specialized visibility, resend, designer, disclosure and other controls retain their interaction semantics while adopting BTN-01 appearance. A button used to submit an existing form must remain a submit control; do not change every Button default to submit.

Migration notes: Changing default submit behavior can break account, invoice and checkout forms; ops specificity can overwrite selected styles.

Retained specialists and boundaries: No independently competing button appearance was approved. Specialized interaction semantics and navigation anchors are retained within the BTN-01 contract.

Future supersession: BTN-02, BTN-03, BTN-04 and BTN-05 independent presentation patterns will be superseded by the shared contract. Legitimate Astro/native markup and specialist behavior remain as compatible adapters, not separate visual standards.

Implementation state (2026-10-13): **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**. 200 ordinary sites migrated: 114 native buttons and 86 native action anchors. 80 source sites were already compliant. Seven specialized button sites remain intentionally retained. All ordinary BTN-01 coverage is complete; native submit identity, real hrefs and editor selection states are preserved. Shared-foundation developer approval is preserved. Lightweight verification passes: typecheck, 94 focused tests and nine-workspace boundaries. No new visual or live functional acceptance is claimed. See the [Phase A completion pass](docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md#phase-a-completion-pass-remaining-consumer-migration).

Historical implementation refinement (second manual review, 2026-10-13), superseded for ordinary control geometry by the latest 2026-10-16 40px button standard above: developer-approved `/account/signup` password/Show geometry is `calc(3rem + 2px)` (50px at a 16px root), with border-box, a 1.6rem line and 0.7rem block padding. Reuse `.ui-inline-controls`, `.ui-control-row`, `.ui-field-action`, `.ui-control-row-lookup` and `.ui-actions.ui-modal-actions` as documented in the [Permanent Form Control Alignment Contract](docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md#c-permanent-form-control-alignment-contract). Primary/secondary appearance and specialist geometry remain distinct. Manual visual acceptance is pending.

### Text inputs

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-inp)

Boundary: Universal. Competing implementations/contracts: yes.

| Candidate ID | Implementation           | Exact source path                                                                                                                                        | Existing scope/adoption                                                                                                                                                   |
| ------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INP-01       | Input                    | [packages/ui/src/form-controls.tsx:4](E:/coding/farmers-market-platform-web/packages/ui/src/form-controls.tsx:4)                                         | Shared. 18 direct importing files plus TextField, Entry and ApplicationFields. Calls inputContract in input-validation.ts:59.                                             |
| INP-02       | Astro native text fields | [apps/storefront/src/components/CentralAccount.astro:137](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CentralAccount.astro:137) | Local pattern family. account/login, sign-in, recover, reset, signup, phone, admin-phone, email-verify, onboarding, settings and auth/claim. HTML props and /api/account. |
| INP-03       | OTP digit inputs         | [apps/storefront/src/pages/account/verify.astro:60](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/verify.astro:60)             | Local. Central registration challenge; phone-verification.ts handles paste, arrows and focus. checkout.css:165.                                                           |

Codex recommendation (historical): **INP-01**.

Historical rationale: Central bounds and overrideable native props already serve React controls; retain SSR-native fields and OTP specialization.

Developer selection: **INP-02** for ordinary text input appearance; **INP-03** retained as the OTP specialist.

Canonical implementation: **INP-02 visual standard**, native `.field`/input markup represented by `apps/storefront/src/components/CentralAccount.astro:137` and existing shared/account CSS. This is a local markup pattern, not a standalone shared React component. Renderer-compatible shared presentation must be extracted; preserve INP-01 Input/inputContract behavior from `packages/ui/src/form-controls.tsx` and `packages/ui/src/input-validation.ts`.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Ordinary text inputs throughout the application, compatible with React and Astro SSR. Preserve validation, native attributes, controlled/uncontrolled values and existing field-specific constraints. Retain INP-03 six-digit OTP implementation and verification semantics.

Decision date/evidence: **2026-10-12**. Explicit developer approval in the task "Record Approved UI Standards and Prepare Component Consolidation", following the developer's audit and visual gallery review. This records design approval only; implementation and its verification remain pending.

Required variants/improvements: Extract INP-02 appearance into reusable styling/components. Remove the extra gray focus border/outline from ordinary text inputs and OTP digits. Do not add a visible border or ring on mouse focus; preserve the ordinary unfocused field appearance unless necessary for the approved design. Provide a non-border keyboard focus-visible treatment, such as background or label indication. Do not globally remove focus cues from unrelated controls.

Migration notes: Automatically inferred type, pattern or maxLength may change accepted values, names and serialization.

Retained specialists and boundaries: **INP-03** is an explicitly retained OTP specialist. Preserve complete-code paste, keyboard navigation, digit aggregation, autofill, validation and verification. Only its unwanted gray focus outline is to change under this decision.

Future supersession: INP-01's competing visual treatment will be aligned to INP-02. Its reusable validation/native-prop behavior remains a foundation, not a competing approved appearance. Individual Astro field copies should adopt the extracted contract. INP-03 will not be replaced by an ordinary text-field component.

Implementation state (2026-10-13): **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**. 19 remaining ordinary native fields migrated through inputClassName, including PhoneInput presentation without inputContract inference. 26 ordinary source sites were already compliant. INP-03 remains the retained OTP digit grid. All ordinary INP-02 coverage is complete; explicit native constraints and the latest approved focus treatment are preserved. Shared-foundation developer approval is preserved. Lightweight verification passes: typecheck, 94 focused tests and nine-workspace boundaries. No new visual or live functional acceptance is claimed. See the [Phase A completion pass](docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md#phase-a-completion-pass-remaining-consumer-migration).

### Textareas

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-txt)

Boundary: Universal. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation | Exact source path                                                                                                | Existing scope/adoption                                                   |
| ------------ | -------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| TXT-01       | Textarea       | [packages/ui/src/form-controls.tsx:7](E:/coding/farmers-market-platform-web/packages/ui/src/form-controls.tsx:7) | Shared. vendor/catalog.tsx:59 and ApplicationFields.tsx:77; native props. |

Codex recommendation: **TXT-01**.

Rationale: One textarea definition was found; both usages reuse it.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Description/long-answer limits and read-only answer presentation. See the linked state profile and category table for specific gaps.

Migration notes: Retain definition-specific maxLength; do not change long answers to single-line Entry.

### Search fields

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-srh)

Boundary: Universal with feature adapters. Competing implementations/contracts: yes.

| Candidate ID | Implementation                  | Exact source path                                                                                                                                      | Existing scope/adoption                                                                                                        |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| SRH-01       | TextField search usage          | [apps/admin/src/vendor/common.tsx:148](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/common.tsx:148)                                     | Shared within admin. vendor/catalog:120, customers:37, markets:514; management/platform:111. Field + Input.                    |
| SRH-02       | SearchSelect                    | [apps/admin/src/market/presentation.tsx:206](E:/coding/farmers-market-platform-web/apps/admin/src/market/presentation.tsx:206)                         | Shared within market. ApplicationReview:12; Input + React state; options supplied by caller.                                   |
| SRH-03       | Customer discovery search       | [apps/storefront/src/pages/account/\[section\].astro:112](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/[section].astro:112) | Local. /account/markets and /account/vendors; GET search/skip; customerApi.subjects.                                           |
| SRH-04       | Public catalog and map searches | [apps/storefront/src/pages/products/index.astro:67](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/products/index.astro:67)           | Local pattern family. Vendor catalog GET search; MarketMap.tsx:225 Input booth search. Public catalog helper / map projection. |

Codex recommendation: **SRH-01**.

Rationale: Reuse the input/label foundation through TextField for admin; SearchSelect is a separate searchable-selector variant, not a replacement for server search.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: GET URLs, server paging, local map filtering and combobox keyboard contract. See the linked state profile and category table for specific gaps.

Migration notes: Do not replace server searches with client filtering over partial pages; preserve each query limit.

### Select controls

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-sel)

Boundary: Universal. Competing implementations/contracts: yes.

| Candidate ID | Implementation                    | Exact source path                                                                                                                                    | Existing scope/adoption                                                                                                                                                                |
| ------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEL-01       | Select                            | [packages/ui/src/index.tsx:63](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:63)                                                   | Shared. 4 direct importing files; market/common Choice and SelectField, vendor analytics/markets/orders. Native props.                                                                 |
| SEL-02       | Market Choice                     | [apps/admin/src/market/common.tsx:60](E:/coding/farmers-market-platform-web/apps/admin/src/market/common.tsx:60)                                     | Shared within market. Settings, recurrence, analytics, occurrences and vendor relationships; Field + Select, statusTone/friendlyLabel.                                                 |
| SEL-03       | Market SelectField                | [apps/admin/src/market/common.tsx:388](E:/coding/farmers-market-platform-web/apps/admin/src/market/common.tsx:388)                                   | Shared within market. Relationship forms in market/vendors.tsx; Field + Select.                                                                                                        |
| SEL-04       | Management Choice                 | [apps/admin/src/management/common.tsx:5](E:/coding/farmers-market-platform-web/apps/admin/src/management/common.tsx:5)                               | Shared within management. Platform tenant/catalog, payments, POS; Field + native select.                                                                                               |
| SEL-05       | Operations Control selects        | [apps/admin/src/market/phase14/common.tsx:4](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/common.tsx:4)                       | Local pattern family. Applications/Directory/Assignments/Billing/LayoutInspector/Layouts/OperationsRoutes and ApplicationFields:95/171. Control labels native selects.                 |
| SEL-06       | Public and account native selects | [apps/storefront/src/components/ProductPurchase.tsx:52](E:/coding/farmers-market-platform-web/apps/storefront/src/components/ProductPurchase.tsx:52) | Local pattern family. Vendor variant, products/index:77, occurrences/[occurrenceId]/index:119, MarketApplication:279, CentralAccount:54; AdminApp:271 and AccountModes:93 also native. |
| SEL-07       | SearchSelect combobox             | [apps/admin/src/market/presentation.tsx:206](E:/coding/farmers-market-platform-web/apps/admin/src/market/presentation.tsx:206)                       | Shared within market. Same definition as SRH-02; ApplicationReview imports it.                                                                                                         |

Codex recommendation (historical): **SEL-01**.

Historical rationale: Keep native Select as foundation, with one future labeled adapter retaining controlled/uncontrolled/required/status options; preserve combobox as an optional specialized control.

Developer selection: **SEL-03** for ordinary select presentation; **SEL-02** and **SEL-07** retained as specialists.

Canonical implementation: **SEL-03 Market SelectField**, existing market-local React wrapper in `apps/admin/src/market/common.tsx:388`, composing Field and Select. Its presentation is approved for universal ordinary-select use; a shared abstraction and compatible Astro adapter are not yet extracted.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Ordinary select controls across the application. Preserve required/optional behavior, native selection, validation, exact stored values, controlled/uncontrolled state and form submission. Retain SEL-02 only for its specific color-coded selection functionality and SEL-07 only for searchable comboboxes. Do not replace native selects with comboboxes unless a feature requires search.

Decision date/evidence: **2026-10-12**. Explicit developer approval in the task "Record Approved UI Standards and Prepare Component Consolidation", following the developer's audit and visual gallery review. This records design approval only; implementation and its verification remain pending.

Required variants/improvements: Generalize SEL-03 presentation without imposing its current always-required wrapper on optional fields. For SEL-07, instructional placeholder rows such as "Choose a business" must be non-selectable and receive neither selection nor hover highlighting. Ordinary option hover must use SEL-03's neutral slightly darker white/off-white appearance, not green. Reserve green for the committed selected option. Keep keyboard-active indication visible and distinct from committed selection; preserve filtering, keyboard navigation, combobox accessibility and screen-reader behavior.

Developer-approved indicator correction (2026-10-13): All select dropdowns use the sidebar-style outlined V chevron, with the same 16px viewBox, 1.8 rounded stroke and path m4 6 4 4 4-4. Native dropdowns rotate the indicator 180 degrees over 180ms using their actual open state; SEL-07 reuses the existing Chevron and follows aria-expanded. Reduced motion removes the transition. The shared indicator applies to React and Astro native selects, including retained color-coded and legacy dropdowns. Inline multiple/size listboxes keep their native structure. Older engines retain the V fallback; smooth native rotation requires base-select/picker-icon support. No selection, submission, validation or controller behavior changes.

Developer-approved indicator alignment (2026-10-13): Center the chevron vertically with the selected text in every select dropdown. The shared native `::picker-icon` uses `align-self: center` and zero block margins so the 16px icon stays centered within the text row rather than following baseline alignment. Background-image fallbacks and SEL-07 already use vertical center positioning. Open/close rotation is preserved. This alignment correction was made without running tests or taking screenshots, as requested.

Migration notes: Native values must remain backend identifiers; changing required or default selection can submit unintended commands.

Retained specialists and boundaries: **SEL-02** is an approved color-coded selection specialist. **SEL-07** is an approved searchable combobox specialist with the requested placeholder/hover/selected/keyboard-active corrections still pending.

Future supersession: SEL-01 as an independent default presentation and the ordinary appearances in SEL-04, SEL-05 and SEL-06 will align to SEL-03. Native Select remains a reusable low-level foundation. Feature options, identifiers, validation and label adapters are not replaced merely by category membership.

Implementation state (2026-10-13): **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**. 43 remaining native select sites migrated through Select or selectClassName, including account, catalog, operations, editor, phone-country, timezone and application-field controls. 16 ordinary source sites were already compliant. SEL-02 and SEL-07 remain two retained implementations. The approved V chevron, open rotation, vertical alignment and option treatments are preserved. Shared-foundation developer approval is preserved. Lightweight verification passes: typecheck, 94 focused tests and nine-workspace boundaries. No new visual or live functional acceptance is claimed. See the [Phase A completion pass](docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md#phase-a-completion-pass-remaining-consumer-migration).

### Dropdowns and disclosures

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-ddn)

Boundary: Universal and feature variants. Competing implementations/contracts: yes.

| Candidate ID | Implementation             | Exact source path                                                                                                                            | Existing scope/adoption                                                                                                                                |
| ------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DDN-01       | Dropdown                   | [packages/ui/src/index.tsx:275](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:275)                                         | Shared, currently unadopted. No direct app imports; native details/summary and children.                                                               |
| DDN-02       | AnimatedDisclosure         | [apps/admin/src/market/presentation.tsx:5](E:/coding/farmers-market-platform-web/apps/admin/src/market/presentation.tsx:5)                   | Shared within market. Layouts and OccurrenceLayoutActions; Chevron, React state.                                                                       |
| DDN-03       | Native feature disclosures | [apps/admin/src/market/phase14/Assignments.tsx:510](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Assignments.tsx:510) | Local pattern family. MarketMap:251 booth-list-item; Assignments:851, LayoutInspector:463, LayoutLayers:9, vendor/catalog:219, CentralAccount:163/199. |

Codex recommendation (historical): **DDN-02**.

Historical rationale: AnimatedDisclosure has the richest reusable appearance contract; retain native Dropdown/details as a simpler variant and do not label either a menu.

Developer selection: **DDN-03** for ordinary expandable disclosure sections, including nested disclosures.

Canonical implementation: **DDN-03 visual foundation**, represented by native feature disclosures in `apps/admin/src/market/phase14/Assignments.tsx:510` and their actual shared/feature CSS. This is a local markup family requiring a reusable disclosure/card styling contract, not an already universal shared component.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Ordinary expandable sections throughout the platform, with compatible React and native Astro details/summary adapters. Every nested disclosure uses the same DDN-03 appearance on its own clearly distinguishable card/surface, with appropriate padding, spacing, borders and hierarchy. Disclosure, native select and searchable combobox contracts remain separate.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Extract the actual DDN-03 presentation; give each nested disclosure an independent surface and expand/collapse state. Preserve keyboard accessibility, native expanded semantics, existing lazy mounting/inertness where present, appropriate animation and reduced motion. Do not merge nested contents or states.

Migration notes: Lazy mounting can reset drafts and map dimensions; menu interaction requires a separate future design.

Implementation risks: Flattened nested surfaces/state can obscure hierarchy or change behavior; remounting may lose drafts or map dimensions; collapse must not strand focus in hidden content. Native disclosures and animated React disclosures need compatible presentation without replacing their feature logic.

Retained specialists and boundaries: **CRD-04/DDN-02** saved-layout and related approved specialist disclosure/card scope remains governed by the unchanged first-round CRD decision. DDN-02 behavior may be reused beneath DDN-03 ordinary presentation; it is not the universal visual foundation. Feature-specific contents/controllers remain feature-owned.

Future supersession: DDN-01 and ordinary DDN-02 appearances will align with DDN-03 after separately scoped migration. Native details/summary and suitable animated mechanics remain valid adapters. This does not supersede CRD-04's retained specialist appearance or SEL-03/SEL-07 controls.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Targeted early adoption (2026-10-13): Vendor order management and product variant native disclosures use the minimal shared `disclosureClassName` / `.ui-disclosure` DDN-03 surface and padded-content contract. Saved-layout specialists are retained. Universal migration remains pending; manual acceptance is pending.

Implementation state (2026-10-14, combined Phase C/D): **DDN-03 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Shared native disclosure/content surfaces throughout ordinary account, map, operations and vendor disclosures; saved-layout CRD-04/DDN-02 remains. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Checkboxes

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-chk)

Boundary: Universal. Competing implementations/contracts: yes.

| Candidate ID | Implementation                                | Exact source path                                                                                                                | Existing scope/adoption                                                                                                                                               |
| ------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CHK-01       | Checkbox                                      | [packages/ui/src/index.tsx:66](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:66)                               | Shared. 3 importing files: market/common, vendor/catalog and vendor/markets. Native props.                                                                            |
| CHK-02       | Operations Check                              | [apps/admin/src/market/phase14/common.tsx:87](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/common.tsx:87) | Shared within operations. Builder, ApplicationReview, Directory, Assignments, inspector and layers; Input type=checkbox + InfoTip.                                    |
| CHK-03       | Application and public native choice patterns | [packages/ui/src/ApplicationFields.tsx:126](E:/coding/farmers-market-platform-web/packages/ui/src/ApplicationFields.tsx:126)     | Shared domain renderer and local pattern family. ApplicationFields multi-select; MarketApplication:337, occurrences/[occurrenceId]/index:149/169; CentralAccount:208. |

Codex recommendation: **CHK-01**.

Rationale: Minimal native wrapper is reusable; consolidate labeled presentation without losing definition groups or SSR checkboxes.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Grouped legends, multi-select constraints, consent wording and form names. See the linked state profile and category table for specific gaps.

Migration notes: Unchecked values are absent in FormData; keep explicit boolean adapters and consent semantics.

### Radio buttons

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-rad)

Boundary: Universal. Competing implementations/contracts: yes.

| Candidate ID | Implementation                  | Exact source path                                                                                                                        | Existing scope/adoption                                                                                                 |
| ------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| RAD-01       | Radio                           | [packages/ui/src/index.tsx:69](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:69)                                       | Shared, currently unadopted. No direct app imports; native radio wrapper.                                               |
| RAD-02       | ApplicationFields single-select | [packages/ui/src/ApplicationFields.tsx:126](E:/coding/farmers-market-platform-web/packages/ui/src/ApplicationFields.tsx:126)             | Shared domain renderer. Builder preview, admin review and public application; Input type=radio, fieldset/legend.        |
| RAD-03       | Checkout and applicant radios   | [apps/storefront/src/components/Checkout.tsx:237](E:/coding/farmers-market-platform-web/apps/storefront/src/components/Checkout.tsx:237) | Local pattern family. Pickup options per vendor; MarketApplication:252 existing/new applicant choice. Input type=radio. |

Codex recommendation: **RAD-01**.

Rationale: Use native Radio foundation with group presentation, preserving domain adapters rather than treating each usage as a new style.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Legends, checked defaults, unique group names, required selection and fee labels. See the linked state profile and category table for specific gaps.

Migration notes: Combining names across vendors changes pickup selection and purchasing behavior.

### Switches and state toggles

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-tgl)

Boundary: Universal and feature variants. Competing implementations/contracts: yes.

| Candidate ID | Implementation             | Exact source path                                                                                                                                        | Existing scope/adoption                                                                                                              |
| ------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| TGL-01       | Market Toggle              | [apps/admin/src/market/common.tsx:99](E:/coding/farmers-market-platform-web/apps/admin/src/market/common.tsx:99)                                         | Shared within market. RuleFields/settings/relationship controls; Checkbox + InfoTip.                                                 |
| TGL-02       | Operations Check as toggle | [apps/admin/src/market/phase14/common.tsx:87](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/common.tsx:87)                         | Shared within operations. Same CHK-02 definition used for flags in builder/designer/assignments.                                     |
| TGL-03       | Pressed button groups      | [apps/admin/src/market/phase14/ApplicationReview.tsx:121](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/ApplicationReview.tsx:121) | Local pattern family. Review status; Layouts:849/903/928 tools/panels; LayoutLayers:42 selection; SignupPasswords:54/102 visibility. |

Codex recommendation: **TGL-01**.

Rationale: Market Toggle offers a labeled boolean foundation; preserve pressed tool/visibility controls as a different variant. No existing visual switch was found.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Checkbox semantics, pressed buttons, destructive state tones and visibility labels. See the linked state profile and category table for specific gaps.

Migration notes: Do not convert command/status selectors into uncontrolled boolean inputs.

### Labels, help and validation messages

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-fld)

Boundary: Universal. Competing implementations/contracts: yes.

| Candidate ID | Implementation                   | Exact source path                                                                                                                                      | Existing scope/adoption                                                                                                  |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| FLD-01       | Field and FormError              | [packages/ui/src/index.tsx:72](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:72)                                                     | Shared. Field imported by 8 app files; FormError called by Field at :96, no direct app imports. InfoTip optional.        |
| FLD-02       | Control and Entry                | [apps/admin/src/market/phase14/common.tsx:4](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/common.tsx:4)                         | Shared within operations. Control id render-prop + Entry Input/PhoneInput; common.tsx:24.                                |
| FLD-03       | Native .field markup             | [apps/storefront/src/components/Checkout.tsx:163](E:/coding/farmers-market-platform-web/apps/storefront/src/components/Checkout.tsx:163)               | Local pattern family. Cart quantities, purchase controls and Astro account/catalog forms; global .field styles.          |
| FLD-04       | Account form feedback controller | [apps/storefront/src/lib/account-form.ts:1](E:/coding/farmers-market-platform-web/apps/storefront/src/lib/account-form.ts:1)                           | Shared script in SiteLayout. SiteLayout imports script at :114; selected /api/account forms; dynamic feedback paragraph. |
| FLD-05       | Password and phone feedback      | [apps/storefront/src/components/SignupPasswords.tsx:115](E:/coding/farmers-market-platform-web/apps/storefront/src/components/SignupPasswords.tsx:115) | Local plus shared specialization. Password mismatch; PhoneInput.tsx:169/273 live feedback; custom validity.              |

Codex recommendation: **FLD-01**.

Rationale: Field is the existing cross-admin label primitive; improve caller-error association in a later phase and preserve native SSR adapters.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Help text, InfoTip, generated ids, field and form errors, password/phone custom validity. See the linked state profile and category table for specific gaps.

Migration notes: Moving feedback can detach accessible descriptions or change validation timing and retained form values.

### Badges and status indicators

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-bdg)

Boundary: Universal presentation with domain mapping. Competing implementations/contracts: yes.

| Candidate ID | Implementation                              | Exact source path                                                                                                              | Existing scope/adoption                                                                                                                                         |
| ------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BDG-01       | Badge and native .badge                     | [packages/ui/src/index.tsx:138](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:138)                           | Shared, component unadopted. CustomerEvents.astro:43 uses span.badge without importing Badge; no direct imports.                                                |
| BDG-02       | StatusBadge                                 | [apps/admin/src/market/presentation.tsx:106](E:/coding/farmers-market-platform-web/apps/admin/src/market/presentation.tsx:106) | Shared within market. Market overview/occurrences/vendors/operations, generation, applications, layouts, billing and directory. statusTone:60/friendlyLabel:52. |
| BDG-03       | Booth state pills                           | [packages/ui/src/MarketMap.tsx:201](E:/coding/farmers-market-platform-web/packages/ui/src/MarketMap.tsx:201)                   | Shared domain rendering. MarketMap:278 and KonvaElement status; booth-state CSS styles available/assigned/paid.                                                 |
| BDG-04       | Plain readiness and operational status text | [apps/admin/src/management/common.tsx:129](E:/coding/farmers-market-platform-web/apps/admin/src/management/common.tsx:129)     | Shared and local family. Readiness:145, Entitlements:77; vendor and platform tables; PurchaseDetail and CustomerOrders for financial states.                    |

Codex recommendation (historical): **BDG-02**.

Historical rationale: StatusBadge is the strongest existing tone presentation, but extract generic tone/text separately from statusTone and retain Badge for simple tags.

Developer selection: **BDG-02** as the universal status badge presentation foundation; **BDG-03** retained for booth states; **BDG-04** retains its card/content structure with BDG-02 status presentation.

Canonical implementation: **BDG-02 StatusBadge appearance**, currently market-local in `apps/admin/src/market/presentation.tsx:106` with tone CSS in `apps/admin/src/market/dashboard.css`. Extract renderer-compatible tone/text presentation without making `statusTone`/`friendlyLabel` a universal domain authority.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Color-coded status indicators across the platform, with semantic colors and understandable accessible text. Booth states use BDG-03. Readiness/capability/operational status cards keep their existing structure and information while adopting BDG-02 color-coded labels.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Retain exact status meanings, readable labels and appropriate semantic colors; never communicate status through color alone. Remove only the decorative dot to the left of each BDG-03 booth status. Replace BDG-04's plain status treatment with BDG-02 visual styling while preserving card structure and informational content.

Migration notes: A common string-to-tone map can mislabel payment, publication or attendance status.

Implementation risks: A generic enum-to-tone map can misrepresent readiness, payment, publication or attendance. Keep unknown states neutral where appropriate; verify contrast/long labels and isolate shared colors from market ancestry. Dot removal must not remove map state cues, actual text or functionality.

Retained specialists and boundaries: **BDG-03** booth pills retain text, colors, state mapping and map functionality, with the dot removed. **BDG-04** is a specialized adaptation preserving readiness calculations, capabilities and authoritative facts; no controller or calculation rewrite. Non-status tags are outside universal status mapping.

Future supersession: Competing BDG-01 status appearances and BDG-04 plain status text will adopt BDG-02 presentation in declared batches. BDG-03 remains distinct. Approval does not select the OST/FTR domain categories or make market mappings authoritative for other domains.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Targeted early adoption (2026-10-13): Vendor OrderDetail uses shared `statusBadgeClassName` / `.ui-status` BDG-02 tone/text styling; `vendor/order-presentation.ts` independently maps order, financial, pickup and fulfillment states. Unknown values stay neutral. Existing Market presentation shares compatibility selectors without changing its domain mappings. Universal migration and developer manual acceptance remain pending.

Implementation state (2026-10-14, combined Phase C/D): **BDG-02 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Shared tone/text styling with separate vendor, customer purchase and management maps; market mappings remain local; booth dot removed and readiness labels adapted. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Tooltips

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-tip)

Boundary: Universal and map-specific. Competing implementations/contracts: yes.

| Candidate ID | Implementation      | Exact source path                                                                                            | Existing scope/adoption                                                                                                       |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| TIP-01       | InfoTip             | [packages/ui/src/index.tsx:107](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:107)         | Shared. Field info and Control/Toggle info; two direct importing app files plus Field internal.                               |
| TIP-02       | Booth hover tooltip | [packages/ui/src/MarketMap.tsx:183](E:/coding/farmers-market-platform-web/packages/ui/src/MarketMap.tsx:183) | Shared domain rendering. MarketMap fed by map hover events; boothTooltipPosition:18; MapCanvas. shared CSS .booth-hover-card. |

Codex recommendation: **TIP-01**.

Rationale: InfoTip is reusable explanatory help; map tooltip must retain positional geometry and a keyboard/touch alternative.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Hover/focus parity, readable descriptions, positioning bounds and mobile alternatives. See the linked state profile and category table for specific gaps.

Migration notes: 20px triggers and CSS-only dismissal need manual accessibility review; never make critical map facts hover-only.

### Cards and dashboard cards

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-crd)

Boundary: Universal surface with internal variants. Competing implementations/contracts: yes.

| Candidate ID | Implementation                     | Exact source path                                                                                                                                  | Existing scope/adoption                                                                                                                                   |
| ------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRD-01       | Card and native .card              | [packages/ui/src/index.tsx:129](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:129)                                               | Shared plus markup counterpart. Card imported by 6 files; ProductCards, CustomerEvents/Follows/Orders, storefront carts use native semantic .card markup. |
| CRD-02       | Dashboard surface families         | [apps/admin/src/market/overview.tsx:27](E:/coding/farmers-market-platform-web/apps/admin/src/market/overview.tsx:27)                               | Local pattern family. dashboard-card, command-section, record-details, ops-day-card, ops-invoice, ops-record-list li, filter-card; phase15b.css:88.       |
| CRD-03       | Operations editor/section surfaces | [apps/admin/src/market/phase14/Directory.tsx:88](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Directory.tsx:88)             | Local pattern family. ops-editor/ops-section/ops-inspector; ApplicationFields sections; shared styles.css:878/888.                                        |
| CRD-04       | Saved layout cards and disclosures | [apps/admin/src/market/phase14/Layouts.tsx:109](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Layouts.tsx:109)               | Local. layout-card and saved-layouts-card/AnimatedDisclosure; dashboard.css:391/453/469.                                                                  |
| CRD-05       | Application question cards         | [apps/admin/src/market/phase14/ApplicationBuilder.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/ApplicationBuilder.tsx) | Local. application-question-card with editing, placeholder and ghost states; applications.css; see Market Applications presentation (Nov 7, 2026).        |

Codex recommendation (historical): **CRD-01**.

Historical rationale: Card provides token-backed base surface; add approved internal surface and semantic-element variants before converting .dashboard-card wrappers.

Developer selection: **CRD-02** for ordinary card surfaces; **CRD-04** retained for expandable saved-layout cards and comparable approved disclosure use cases.

Canonical implementation: **CRD-02 visual contract**, represented by `apps/admin/src/market/overview.tsx:27` and the `.admin-content` surface-family rules in `apps/admin/src/phase15b.css:76-110`. This is a local CSS/markup family chosen for its padding, spacing and surface presentation, not an extracted shared component. Reusable components/styles are implementation work still pending.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Canonical ordinary card surface presentation throughout the application, preserving semantic elements, responsive behavior, feature content and theme boundaries. Specialized cards adopt the surface where appropriate without losing functionality. Retain the approved CRD-04 expandable/disclosure use cases.

Decision date/evidence: **2026-10-12**. Explicit developer approval in the task "Record Approved UI Standards and Prepare Component Consolidation", following the developer's audit and visual gallery review. This records design approval only; implementation and its verification remain pending.

Required variants/improvements: Establish reusable CRD-02 components/styles rather than copying its markup/CSS into more files. For CRD-04, extend the Saved layouts hover background across the complete clickable heading region, including text and chevron, with comfortable horizontal spacing on both sides. The highlight must not stop against the first letter or chevron, and hover must not cause layout shifts. Buttons within CRD-04 must use BTN-01. Preserve animation, accessibility, expanded state and layout functionality.

Migration notes: Changing wrapper elements can affect headings, CSS descendant selectors, lists, fieldsets and nested card margins.

Retained specialists and boundaries: **CRD-04** is explicitly retained for expandable saved-layout cards and comparable approved disclosure use cases. This does not approve DDN-02 as the canonical implementation for the separately audited dropdown/disclosure category.

Future supersession: CRD-01's competing ordinary surface and the ordinary-card portions of CRD-03/CRD-05 will align to CRD-02 where appropriate. Reuse/extend Card's API and preserve section/article/li/fieldset semantics and specialized editor/question content; do not replace feature controllers or every wrapper blindly.

Implementation state (2026-10-13): **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**. 51 ordinary surface sites migrated through semantic Card or cardClassName; 13 were already compliant. 18 specialist or later-phase surface sites remain retained in eight files. All ordinary CRD-02 coverage is complete. An explicit embedded surface preserves borderless content inside existing cards, dialogs and disclosures; CRD-04 saved-layout geometry, hover and expansion remain unchanged. Shared-foundation developer approval is preserved. Lightweight verification passes: typecheck, 94 focused tests and nine-workspace boundaries. No new visual or live functional acceptance is claimed. See the [Phase A completion pass](docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md#phase-a-completion-pass-remaining-consumer-migration).

### Modals, dialogs and drawers

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-dlg)

Boundary: Universal presentation. Competing implementations/contracts: yes.

| Candidate ID | Implementation    | Exact source path                                                                                                              | Existing scope/adoption                                                                                                                                            |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DLG-01       | Dialog and Drawer | [packages/ui/src/index.tsx:222](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:222)                           | Shared. 3 direct Dialog importing files: vendor/common, inventory, OccurrencePreview. Drawer:272 wraps Dialog; no direct app imports.                              |
| DLG-02       | MarketDialog      | [apps/admin/src/market/presentation.tsx:139](E:/coding/farmers-market-platform-web/apps/admin/src/market/presentation.tsx:139) | Shared within market. Imported as Dialog by market/vendors, CommandForm, applications, assignments, LayoutInspector; Directory and OccurrenceLayoutActions direct. |

Codex recommendation (historical): **DLG-01**.

Historical rationale: Dialog has wider scope and a simpler native lifecycle; merge approved animation/veto/title-focus features from MarketDialog into a future variant only after lifecycle characterization.

Developer selection: **DLG-02** as the universal dialog foundation, replacing DLG-01's independent foundation.

Canonical implementation: **DLG-02 MarketDialog**, existing market-local reusable implementation in `apps/admin/src/market/presentation.tsx:139`. Extract/move the reusable foundation to an appropriate shared UI location; that shared implementation does not yet exist. Shared UI must never import admin feature code.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / DEVELOPER-REPORTED VISUAL ACCEPTANCE (2026-10-14)**.

Approved scope/variants: Universal native dialog foundation, preserving accessibility, focus management/restoration, DLG-02 animation and close veto, busy-state protections and appropriate close callbacks. Preserve necessary DLG-01 capabilities, including drawer presentation. Dialog child buttons, inputs, selects and ordinary cards must use the newly approved standards.

Decision date/evidence: **2026-10-12**. Explicit developer approval in the task "Record Approved UI Standards and Prepare Component Consolidation", following the developer's audit and visual gallery review. This records design approval only; implementation and its verification remain pending.

Required variants/improvements: Characterize both lifecycles and fix inconsistencies before broad consumer migration. Cover native/programmatic close, controlled close, Escape/Close, unmount/reopen, callback timing, title focus, trigger restoration, reduced motion, busy guards and draft veto. Current DLG-02 declares but does not consume focusTitle and has no native onClose hook; resolve these in the shared contract rather than copying the gaps into every caller.

Migration notes: Two implementations differ in close callback timing and native close handling; delayed unmount must not lose focus or retained drafts.

Retained specialists and boundaries: Drawer presentation and specialized confirmation/draft policies are necessary capabilities of the DLG-02-based foundation. DLG-01 is not retained as an independently approved competing foundation.

Future supersession: DLG-01's separate Dialog/Drawer implementation will be superseded after its necessary capabilities are preserved. Existing exports and consumer APIs need compatibility during incremental migration; feature runners, confirmation policy and business intent remain with callers.

Implementation state (2026-10-14): **DLG-02 IMPLEMENTATION COMPLETE / DEVELOPER-REPORTED VISUAL ACCEPTANCE (2026-10-14)**. Shared `packages/ui/src/dialog.tsx` now owns the approved presentation, native lifecycle, title/description focus, guarded dismissal, once-only callbacks and animation. Existing Dialog/Drawer exports remain compatible; MarketDialog delegates to shared Dialog. All 15 ordinary production dialog sites are covered, including the former browser Archive confirmation. Drawer and the route editor's synchronous unsaved-navigation guards remain specialists. Parent-controlled closure is authoritative without an echoed callback; programmatic dismissal, Escape and opt-in backdrop obey busy/beforeClose. Existing feature commands and Phase A action rows remain intact. Required lightweight verification is recorded in the [Phase B implementation report](docs/UI_COMPONENTS/Phase-B-Dialog-Consolidation.md); the developer reported that Phase B looks good in this combined task. This records manual visual acceptance only; no additional native focus, dismissal or runtime verification was performed. Historical source/approval descriptions above describe the pre-extraction decision and are preserved.

### Tables and data tables

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-tbl)

Boundary: Universal and internal adapter. Competing implementations/contracts: yes.

| Candidate ID | Implementation                 | Exact source path                                                                                                                  | Existing scope/adoption                                                                                                                             |
| ------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| TBL-01       | Table, TableHead and TableBody | [packages/ui/src/index.tsx:345](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:345)                               | Shared. Table directly imported only by vendor/common; TableHead:356/TableBody:359 have zero app imports.                                           |
| TBL-02       | DataTable                      | [apps/admin/src/vendor/common.tsx:117](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/common.tsx:117)                 | Shared across admin. Market common re-exports same definition, management imports directly; headings, caption, column scope and optional aria-sort. |
| TBL-03       | Invoice native table           | [apps/admin/src/market/phase14/Billing.tsx:73](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Billing.tsx:73) | Local. Booth Invoice line items; moneyLabel; shared table CSS and mobile cells at styles.css:985.                                                   |

Codex recommendation (historical): **TBL-02**.

Historical rationale: DataTable already composes the shared Table and is used across roles; prefer it for internal heading-based tables and Table for custom invoice columns.

Developer selection: **TBL-02** for ordinary general-purpose table presentation, replacing TBL-01's competing appearance; **TBL-03** retained as the distinct invoice table.

Canonical implementation: **DataTable** in `apps/admin/src/vendor/common.tsx:117`, re-exported by market common and used by management, currently composes TBL-01 Table in `packages/ui/src/index.tsx:345`. Extract/generalize its selected presentation with compatible semantic native table markup; a low-level Table delegate may remain.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Ordinary tables with smaller/lighter body and line-item text, readable striping, intact headers/captions/scopes and accessible narrow-screen presentation. Invoice-specific TBL-03 is exempt from TBL-02 restyling.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Reduce body/line-item font size and weight; alternate white and a very slightly darker off-white row background with sufficient contrast. Adopt useful TBL-01 text wrapping and prefer all information visible on mobile without horizontal scrolling, using controlled wrapping/responsive layouts. Do not truncate, hide, semantically reorder or omit important information. Document exceptional accessible overflow rather than render unreadable columns.

Migration notes: Wrapping invoice tables can alter print/width/scroll; sorting remains backend-owned and must not be fabricated.

Implementation risks: Role CSS currently imposes 640px/580px minimum widths; wrapping must preserve header/cell associations, sorting metadata, actions, exact money and readability. Invoice column allocation is content-driven in current source, so measure before changing it; print and responsive behavior require separate checks.

Retained specialists and boundaries: **TBL-03** in `apps/admin/src/market/phase14/Billing.tsx:73` retains its invoice design, data, calculations, formatting, printing and column semantics. Reduce the description column's occupied width by approximately 20% relative to its measured current allocation (about 0.8 times that width), giving other headings more room without truncating descriptions. This is not a 20 percentage-point table-width reduction.

Future supersession: TBL-01's independent ordinary appearance yields to TBL-02; its semantic low-level wrapper can remain as a delegate. TBL-03 is not superseded or forced into TBL-02. Feature sorting/paging/data and invoice controllers remain unchanged.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **TBL-02 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. DataTable moved to shared UI; semantic wrapping tables use smaller/lighter bodies and subtle striping. TBL-03 measures natural invoice columns and applies the 0.8 description target; wide projections retain accessible scrolling. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

Post-implementation refinement (2026-10-14): The shared TBL-02 even-row stripe changes from `#fafbf9` to `#f2f4f2`, providing slightly stronger neutral contrast against white. Text, borders, hover/focus, selection, row actions, sorting, paging and wrapping remain unchanged. TBL-03 invoice/print rules, wide-table scrolling and unrelated surfaces are unchanged. Developer manual review of these refinements remains pending.

### Tabs and view selectors

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-tab)

Boundary: Universal interaction plus route variants. Competing implementations/contracts: yes.

| Candidate ID | Implementation                 | Exact source path                                                                                                                    | Existing scope/adoption                                                                                                              |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| TAB-01       | Tabs                           | [packages/ui/src/index.tsx:289](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:289)                                 | Shared, currently unadopted. No direct app imports; tested by tests/admin.test.tsx. React state and generated ids.                   |
| TAB-02       | Designer panel buttons         | [apps/admin/src/market/phase14/Layouts.tsx:927](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Layouts.tsx:927) | Local. Inspector/layers panel state; designer-tabs CSS.                                                                              |
| TAB-03       | Route-based section navigation | [apps/admin/src/management/catalog.tsx:195](E:/coding/farmers-market-platform-web/apps/admin/src/management/catalog.tsx:195)         | Local pattern family. Billing catalog RouteLink sections; market vendor detail route sections, management and vendor overview links. |

Codex recommendation (historical): **TAB-01**.

Historical rationale: Tabs is strongest for true in-page tab panels; route navigation must remain links and designer view selectors need an explicit semantic decision.

Developer selection: **TAB-01** as the main tab presentation; **TAB-02** exclusively retained for the layout editor; **TAB-03** adopts TAB-01 appearance through a route-navigation variant.

Canonical implementation: Shared **Tabs** in `packages/ui/src/index.tsx:289` with tab rules in `packages/ui/src/styles.css`. A compatible shared route-tab/navigation styling contract is still required; React in-page state must not replace real route links.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: In-page tabs and visually compatible route navigation have distinct semantic adapters. Layout-editor tools/panel selection retain TAB-02. Selected/active states remain clearly distinguishable from hover and keyboard focus.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Increase tab-label font weight and add a subtle bottom hover underline less opaque than the active underline. Preserve keyboard navigation, selected panels, focus handling and in-page state. Restyle TAB-03 links while preserving hrefs, URLs, deep linking, browser history, modifier clicks and route semantics.

Migration notes: Tabs default button submit risk inside forms; hidden panels remain mounted unlike conditional designer panels.

Implementation risks: Using tab roles/state for route anchors breaks navigation; mounted versus conditional panels can change drafts. Current Tabs buttons lack explicit type, so preserve non-submitting behavior when used inside forms. Long labels and mobile overflow/focus need review.

Retained specialists and boundaries: **TAB-02** in `apps/admin/src/market/phase14/Layouts.tsx:927` remains only for the layout editor, with its specialized tools and panel functionality. **TAB-03** route mechanics/RouteLink remain a compatible navigation adapter, not client-only tab state.

Future supersession: TAB-03's competing appearance yields to TAB-01; real anchor/router behavior stays. TAB-02 is not superseded within its exclusive editor scope. This does not canonically approve every NAV category implementation.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **TAB-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Heavier labels and subdued hover underline; non-submitting roving tabs, disabled navigation and real route-link adapter; TAB-02 editor panels remain. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Alerts, notifications and safe errors

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-alt)

Boundary: Universal presentation. Competing implementations/contracts: yes.

| Candidate ID | Implementation                      | Exact source path                                                                                                                        | Existing scope/adoption                                                                                                                                              |
| ------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ALT-01       | Alert, ErrorState and ErrorBoundary | [packages/ui/src/index.tsx:141](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:141)                                     | Shared. Alert 6 importing files; ErrorState:213 22; ErrorBoundary:15 2; ResilientSurfaces.tsx composes it for 5 commerce/preference surfaces.                        |
| ALT-02       | Unavailable capability notice       | [apps/admin/src/vendor/common.tsx:110](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/common.tsx:110)                       | Shared across admin. Market re-export and vendor/management uses; .capability-note role=status.                                                                      |
| ALT-03       | Native contextual feedback          | [apps/storefront/src/components/Checkout.tsx:132](E:/coding/farmers-market-platform-web/apps/storefront/src/components/Checkout.tsx:132) | Local pattern family. Cart/purchase status and errors, MarketApplication, account pages; CustomerLayout.astro:53/58 follow outcome .alert; Phase14Routes:158 saving. |
| ALT-04       | Analytics projection notices        | [apps/admin/src/vendor/analytics.tsx:63](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/analytics.tsx:63)                   | Shared feature components. Metadata .projection-status; market/analytics.tsx:36 Projection; generation-status.tsx:12.                                                |

Codex recommendation (historical): **ALT-01**.

Historical rationale: Shared safe errors and live-region primitives already span apps; use explicit severity variants later, with safeError kept at the correct boundary.

Developer selection: **ALT-01** as the standard visual presentation for alerts and notifications.

Canonical implementation: **ALT-01 shared Alert/safe-state family** in `packages/ui/src/index.tsx:141` (ErrorState:213; ErrorBoundary:15) and `packages/ui/src/styles.css`. The existing Alert lacks the requested severity API; extending its shared presentation is pending.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Compatible React and Astro inline feedback with clear success, partial success, warning, error and informational/neutral severity variants. Visual severity is supplied from authoritative feature outcomes; announcement urgency and business outcome handling remain separate.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Add appropriately distinct, readable severity color treatments. Preserve live-region behavior, accessibility, focused failures, safe error messages, retry flows and request state. Preserve partial/uncertain outcomes and domain-specific messages rather than replacing them with generic success copy.

Migration notes: A generic toast must not hide uncertain checkout or command outcomes; success/failure colors need distinct meaning.

Implementation risks: A success-colored alert can falsely imply completion of an uncertain checkout/command; role=status versus role=alert affects announcements; duplicated/focused messages can regress accessibility. Do not bypass safeError sanitization, error boundaries or retries.

Retained specialists and boundaries: ALT-02 capability meaning, ALT-03 native/server feedback handling and ALT-04 projection freshness/generation facts remain feature-owned under the ALT-01 presentation contract. Their separate outcome/controller behavior is retained, not approved competing alert appearance.

Future supersession: ALT-02/03/04 independent alert appearances will align with ALT-01 in bounded consumer batches; their messages, safety boundaries, capabilities, retry and request controllers remain intact. No generic toast system or business outcome invention is authorized.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **ALT-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Shared success, partial, warning, error, info and neutral variants; native feedback and safe errors retain their original announcements and outcomes. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Empty states

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-emp)

Boundary: Universal. Competing implementations/contracts: yes.

| Candidate ID | Implementation              | Exact source path                                                                                                                                      | Existing scope/adoption                                                                                                                                              |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EMP-01       | EmptyState                  | [packages/ui/src/index.tsx:187](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:187)                                                   | Shared. 6 importing app files, mainly AdminShell and market modules; h3 title + children.                                                                            |
| EMP-02       | Native empty-state markup   | [apps/storefront/src/components/CustomerOrders.astro:46](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CustomerOrders.astro:46) | Local pattern family. CustomerEvents:48, account/index:69/87 and [section]:60/126; VendorCart:57, MarketCart:89, ProductCards page empty; VendorHome and MarketHome. |
| EMP-03       | Plain no-results paragraphs | [apps/admin/src/management/platform.tsx:160](E:/coding/farmers-market-platform-web/apps/admin/src/management/platform.tsx:160)                         | Local pattern family. TenantDirectory, public MarketPublicHome:48; billing/operations branches and account/settings purchase fallback.                               |

Codex recommendation (historical): **EMP-01**.

Historical rationale: Reuse a shared empty-state contract with an Astro counterpart and explicit heading level; keep feature copy and safe empty/error distinction.

Developer selection: **EMP-02 visual design**, enhanced with an optional contextual call to action using **BTN-01**.

Canonical implementation: **EMP-02 native empty-state visual family**, represented by `apps/storefront/src/components/CustomerOrders.astro:46` and shared `.empty-state` styling. Extend/reuse EMP-01 EmptyState (`packages/ui/src/index.tsx:187`) with the selected appearance and semantic renderer adapters rather than creating a competing foundation.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Ordinary genuine empty collections/states across React and Astro, with a clear title, explanation, accessible heading hierarchy and optional action. Copy, action destination and behavior belong to the feature; pages may omit an action.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Provide the optional contextual action through BTN-01, preserving real links where navigation is intended. An empty cart may offer "Browse products" when appropriate; do not insert that action universally. Preserve heading level and explanatory copy.

Migration notes: Cart refresh failures currently clear cart to null, which can resemble empty; do not erase the accompanying error.

Implementation risks: Loading, API errors and unavailable data can resemble emptiness, especially after cart refresh failure; do not erase accompanying errors or change empty/error detection. Fixed heading levels, copied CTA destinations or unnecessary hydration can regress semantics.

Retained specialists and boundaries: Feature-specific empty-state meaning/copy/actions and native SSR markup remain compatible adapters. Existing error, unavailable and loading controllers stay separate; no separate competing empty-state visual specialist is selected.

Future supersession: EMP-01's appearance and genuine EMP-03 no-results presentations will align with EMP-02 after scoped migration. EMP-01's reusable API can remain beneath the chosen visual contract; error/unavailable branches are not automatically reclassified as empty states.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **EMP-02 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Shared EmptyState plus native Astro adapter and native class contract; clear headings/explanations and existing contextual actions; genuine empty branches only. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Loading indicators, skeletons and read states

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-lod)

Boundary: Universal presentation. Competing implementations/contracts: yes.

| Candidate ID | Implementation              | Exact source path                                                                                                                          | Existing scope/adoption                                                                                                                                             |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOD-01       | Spinner and Skeleton        | [packages/ui/src/index.tsx:179](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:179)                                       | Shared. Spinner 6 importing files; Skeleton:176 zero app imports. Spinner composes .progress and .spinner.                                                          |
| LOD-02       | Vendor ReadState            | [apps/admin/src/vendor/common.tsx:90](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/common.tsx:90)                           | Shared across vendor/management. Spinner + ErrorState + Refresh records Button; vendor/management consumers import it.                                              |
| LOD-03       | Market ReadState            | [apps/admin/src/market/common.tsx:435](E:/coding/farmers-market-platform-web/apps/admin/src/market/common.tsx:435)                         | Shared within market. Same visual composition as vendor ReadState, Try Again label.                                                                                 |
| LOD-04       | Inline busy/status patterns | [apps/storefront/src/components/VendorCart.tsx:51](E:/coding/farmers-market-platform-web/apps/storefront/src/components/VendorCart.tsx:51) | Local pattern family. MarketCart:75, ProductPurchase, MarketPurchase, Checkout:117, MarketApplication; CustomerLayout:70/82; account-form.ts:43; Phase14Routes:156. |

Codex recommendation (historical): **LOD-01**.

Historical rationale: Keep Spinner as presentation foundation and unify ReadState copy through props; preserve caller request locks and SSR behavior.

Developer selection: **LOD-01 Spinner** as the standard loading indicator, including the matching spinner inside **LOD-02**; retain **LOD-01 Skeleton** as a separate placeholder presentation.

Canonical implementation: Existing shared **Spinner** in `packages/ui/src/index.tsx:179` with `.progress`/`.spinner` styles in `packages/ui/src/styles.css`. Skeleton:176 remains separate. The gallery's current ring is static; approval does not claim rotation or a completed consolidation.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Shared spinner presentation in appropriate React/SSR loading contexts. LOD-02 and LOD-03 read-state adapters may retain different error/retry controllers and copy; meaningful skeleton layouts and text-only progress are not automatically replaced.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Use the same shared Spinner for LOD-02's matching presentation and eventually consolidate competing spinner appearances. Preserve Skeleton, its placeholder purpose and necessary separate loading announcements. Preserve request lifecycles, guards, retries and fetching.

Migration notes: Do not turn loading presentation into shared caches or automatic mutation retries; always keep tenant-bound request keys.

Implementation risks: Replacing content/skeletons indiscriminately can lose layout context or make refreshes noisy. Shared visual work must not introduce caches, automatic retries, changed tenant request keys, premature unlocks or new loading/error state transitions.

Retained specialists and boundaries: **LOD-01 Skeleton** remains a distinct presentation. LOD-02/03 read-state/error/retry behavior and LOD-04 feature busy/locking/text semantics remain when needed; approval is for spinner appearance, not a single request controller.

Future supersession: Only competing spinner presentations are to consolidate around LOD-01 in bounded batches. LOD-02/03 compositions may delegate shared presentation without merging data fetching; LOD-04 text/busy feedback and meaningful skeleton layouts are not universally superseded.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **LOD-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Shared animated Spinner with reduced motion; read-state/retry wrappers and Skeleton remain separate. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

Developer selection (2026-11-17, supersedes the Spinner selection for page content): **LOD-01 Skeleton** through `LoadingSkeleton` (`table`, `stats`, `cards`, `detail`, `shell`, `checkout`) and `InlineSkeleton` is the standard for content loading on pages and sections. **LOD-01 Spinner** remains the standard inside dialogs and for action progress. LOD-02/03 `ReadState` select a layout with `skeleton`/`rows`, or `skeleton="spinner"` in dialogs. See [Skeleton loaders for content loading](#skeleton-loaders-for-content-loading-november-17-2026).

Implementation state (2026-11-17): **SKELETON MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Layouts were checked in the browser at desktop and 375px (no horizontal overflow, 0px label/field centre offset in `detail` rows); typecheck and the vitest suite show no new failures. Loading states are transient, so each consumer's skeleton has not been individually inspected against its loaded content.

### Pagination

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-pag)

Boundary: Universal presentation with cursor/offset adapters. Competing implementations/contracts: yes.

| Candidate ID | Implementation              | Exact source path                                                                                                                                    | Existing scope/adoption                                                                                                                  |
| ------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| PAG-01       | Pagination                  | [packages/ui/src/index.tsx:362](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:362)                                                 | Shared. 10 direct importing files; generic booleans/callbacks and accessible label.                                                      |
| PAG-02       | Management Pager            | [apps/admin/src/management/common.tsx:35](E:/coding/farmers-market-platform-web/apps/admin/src/management/common.tsx:35)                             | Shared within management. Platform tenant directory and catalog; Button; fixed take=20.                                                  |
| PAG-03       | Market PageControls         | [apps/admin/src/market/vendors.tsx:183](E:/coding/farmers-market-platform-web/apps/admin/src/market/vendors.tsx:183)                                 | Local. Relationship detail/page views; composes Pagination.                                                                              |
| PAG-04       | Public catalog paging links | [apps/storefront/src/pages/products/index.astro:97](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/products/index.astro:97)         | Local pattern family. occurrences/[occurrenceId]/index:228 and MarketPublicHome:66; GET page/occurrencePage and preserved query options. |
| PAG-05       | Customer paging links       | [apps/storefront/src/pages/account/\[section\].astro:69](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/[section].astro:69) | Local pattern family. Follow pages, event pages:94, discover:128; account/orders/index:29. customer-pagination CSS.                      |

Codex recommendation (historical): **PAG-01**.

Historical rationale: Generic Pagination fits React paging; create a link variant that preserves SSR URLs and range text rather than forcing callbacks into Astro.

Developer selection: **PAG-01** as the general pagination presentation, retaining **PAG-03** record-count/range information.

Canonical implementation: Shared **Pagination** in `packages/ui/src/index.tsx:362`, composing BTN-01. Extend compatible callback and native link/SSR presentation while keeping count/range data supplied by feature paging authorities.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: General pagination with Previous/Next controls, truthful record totals/current ranges and uniquely labelled independent regions. Cursor, offset and native link navigation remain caller-owned adapters.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Use approved secondary/alternate BTN-01 appearance for "Previous". Preserve PAG-03's actual backend record count and current item range, for example "45 records. Showing 1 to 20." as illustrative copy only. Never hardcode example counts; handle empty/final pages from actual feature data.

Migration notes: Cursor generations, two independently paged customer collections and server totals must remain authoritative.

Implementation risks: Count/range arithmetic can be wrong for empty pages, cursors, stale generations or partial results; do not invent totals. Preserve disabled boundaries, query parameters, cursor/offset behavior, native navigation and independently paged collections. Anchors need valid native boundary handling rather than a fake disabled prop.

Retained specialists and boundaries: PAG-03 count/range content and PAG-02 management, PAG-04 public catalog and PAG-05 customer paging mechanisms remain compatible feature adapters. Preserve region labels, page sizes and query builders.

Future supersession: Competing PAG-02/03/04/05 presentation aligns with PAG-01 in bounded batches, with PAG-03 range text carried forward. Their paging controllers, URL builders and count authority are not superseded.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **PAG-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Secondary Previous, common spacing and actual supplied totals/ranges/page counts; cursor/offset/native link adapters and independent pagers remain. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Page headings

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-pgh)

Boundary: Universal typography with context variants. Competing implementations/contracts: yes.

| Candidate ID | Implementation               | Exact source path                                                                                                                                          | Existing scope/adoption                                                                                                    |
| ------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| PGH-01       | PageHeader                   | [packages/ui/src/index.tsx:148](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:148)                                                       | Shared. 1 app import in AdminShell:263; title h1 + children.                                                               |
| PGH-02       | Customer layout h1           | [apps/storefront/src/layouts/CustomerLayout.astro:51](E:/coding/farmers-market-platform-web/apps/storefront/src/layouts/CustomerLayout.astro:51)           | Local. 5 page files use CustomerLayout; global admin heading CSS plus customer CSS.                                        |
| PGH-03       | Public and authentication h1 | [apps/storefront/src/components/MarketPublicHome.astro:21](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketPublicHome.astro:21) | Local pattern family. VendorHome, MarketHome, products and occurrence pages, account/auth forms and 404. SiteLayout slots. |
| PGH-04       | Designer screen heading      | [apps/admin/src/market/phase14/Layouts.tsx:643](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Layouts.tsx:643)                       | Local. LayoutEditor header and LayoutScreen:232; dashboard.css hides outer PageHeader on full-screen designer.             |

Codex recommendation: **PGH-01**.

Rationale: PageHeader is simplest existing internal title contract; define actions/description/semantic variants for customer and preserve public hero typography.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: One visible h1, focusable checkout h2, full-screen editor and intentional brand heading fonts. See the linked state profile and category table for specific gaps.

Migration notes: CSS hides shell headings for designer; moving headings can expose duplicates or break focus targets.

### Section headings

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-sch)

Boundary: Universal typography with semantic context. Competing implementations/contracts: yes.

| Candidate ID | Implementation           | Exact source path                                                                                                                                          | Existing scope/adoption                                                                                             |
| ------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| SCH-01       | SectionHeader            | [packages/ui/src/index.tsx:162](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:162)                                                       | Shared, currently unadopted. No direct app imports; header/h2/children.                                             |
| SCH-02       | Customer section header  | [apps/storefront/src/pages/account/index.astro:41](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/index.astro:41)                 | Local pattern family. Recent orders, events, markets and vendors; customer-section > header CSS:40.                 |
| SCH-03       | Dashboard section titles | [apps/admin/src/market/overview.tsx:28](E:/coding/farmers-market-platform-web/apps/admin/src/market/overview.tsx:28)                                       | Local pattern family. dashboard-card h2; vendor overview:57/76; forms title in CommandForm; admin CSS font/body h2. |
| SCH-04       | Public section titles    | [apps/storefront/src/components/MarketPublicHome.astro:44](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketPublicHome.astro:44) | Local pattern family. MarketHome/VendorHome, product/occurrence catalog sections; sometimes aria-labelledby.        |

Codex recommendation (historical): **SCH-02**.

Historical rationale: Customer header has the strongest existing title/action layout; extend SectionHeader with that structure and configurable level in a future phase.

Developer selection: **SCH-03** for internal dashboard section headings with ordinary card surfaces aligned to **CRD-02**; **SCH-01** for storefront/consumer-facing section headings.

Canonical implementation: Two approved scoped variants: dashboard title/card markup in `apps/admin/src/market/overview.tsx:28` with existing dashboard CSS; shared SectionHeader in `packages/ui/src/index.tsx:162` for the consumer-facing presentation. Reusable variants and native Astro styling/markup adapters remain pending.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Internal dashboards use SCH-03 and associated ordinary CRD-02 surfaces. Public storefront and consumer-facing interfaces, including customer sections, use SCH-01 without forcing dashboard-card structure onto every public section. These are documented variants of one category.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Preserve heading hierarchy, optional actions and contextual content. Extract/share the actual selected presentations using existing tokens. For Astro SSR, use compatible styling/markup without unnecessary React hydration. Keep specialist CRD-04 surfaces in their existing scope.

Migration notes: Fixed h2 children can flatten hierarchy below customer sections; require semantic review during migration.

Implementation risks: Fixed h2 implementations and nested customer sections can flatten heading hierarchy; variant CSS must not leak between internal/consumer contexts. Preserve aria-labelledby/region relationships and action wrapping. Do not change PGH page-heading typography or declare a PGH candidate canonical.

Retained specialists and boundaries: The approved **SCH-03 dashboard / SCH-01 consumer** distinction is intentional. Feature-owned titles/actions/content, semantic native SSR markup and previously retained card specialists remain. SCH-02's useful action/hierarchy behavior may remain beneath the consumer variant without preserving competing appearance.

Future supersession: Competing SCH-02 consumer and SCH-04 public appearances align with SCH-01 in scoped batches; ordinary internal section titles align with SCH-03/CRD-02. PGH stays entirely pending and unchanged, and public sections are not universally wrapped in dashboard cards.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **SCH-03 / SCH-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Shared dashboard/consumer classes and SectionHeader variant/level slots; section actions and nested customer heading hierarchy; PGH unchanged. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Navigation and links

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-nav)

Boundary: Universal link safety with router-specific adapters. Competing implementations/contracts: yes.

| Candidate ID | Implementation                  | Exact source path                                                                                                                                            | Existing scope/adoption                                                                                                                      |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| NAV-01       | Link                            | [packages/ui/src/index.tsx:46](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:46)                                                           | Shared, currently unadopted. No direct app imports; rejects unsafe internal schemes and sets external rel.                                   |
| NAV-02       | RouteLink and go                | [apps/admin/src/vendor/common.tsx:28](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/common.tsx:28)                                             | Shared across admin. Market re-exports; management imports; history pushState/popstate, #main focus; AdminShell navigate at :114 separately. |
| NAV-03       | CustomerNavigation              | [apps/storefront/src/components/CustomerNavigation.astro:6](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CustomerNavigation.astro:6) | Shared within storefront. CustomerLayout sidebar/mobile; customerNavigation lib:16 provides role-specific routes.                            |
| NAV-04       | Public main navigation          | [apps/storefront/src/layouts/SiteLayout.astro:79](E:/coding/farmers-market-platform-web/apps/storefront/src/layouts/SiteLayout.astro:79)                     | Local layout region. Vendor/market/account links; MarketCartLink hydrated only for live market context.                                      |
| NAV-05       | AdminShell workspace navigation | [apps/admin/src/AdminShell.tsx:128](E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx:128)                                                 | Shared shell region. visibleNavigation/routeAllowed from admin-core; NavigationIcon:23/Chevron:49.                                           |

Codex recommendation: **NAV-02**.

Rationale: Keep RouteLink as internal navigation adapter and Link as safe anchor foundation; preserve SSR customer/public navigation instead of merging routers.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Modifier clicks, actual URLs, scope-specific permissions, active state, cart count and visible focus. See the linked state profile and category table for specific gaps.

Migration notes: Do not use Link checks to replace hostname trust or context resolution; active-route semantics differ for detail paths.

### Responsive containers and page wrappers

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-cnt)

Boundary: Universal sizing with context variants. Competing implementations/contracts: yes.

| Candidate ID | Implementation                      | Exact source path                                                                                                                                      | Existing scope/adoption                                                                                                                      |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| CNT-01       | Container and native .container     | [packages/ui/src/index.tsx:120](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:120)                                                   | Shared, component unadopted. SiteLayout.astro:70 uses class directly; no app imports; styles.css:87.                                         |
| CNT-02       | Admin content wrapper               | [apps/admin/src/AdminShell.tsx:255](E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx:255)                                           | Shared region plus customer markup. CustomerLayout:50 copies admin-content; styles.css:481, 800px/600px breakpoints; customer max-width1150. |
| CNT-03       | Operations/public and form wrappers | [apps/admin/src/market/phase14/OperationsRoutes.tsx:156](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/OperationsRoutes.tsx:156) | Local pattern family. ops-workspace/ops-public/ops-columns/map columns; checkout-shell/account-panel; styles.css:597/677; checkout.css:1.    |

Codex recommendation: **CNT-01**.

Rationale: Reuse shared container rules and name intentional width variants rather than a single universal page width.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Dashboard caps, public theme layout, checkout readable width, full-screen designer and mobile gutters. See the linked state profile and category table for specific gaps.

Migration notes: Ancestor classes alter controls and typography; moving a wrapper can change behavior visually without changing JSX.

### Dashboard shells

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-dsh)

Boundary: Internal presentation with isolated controllers. Competing implementations/contracts: yes.

| Candidate ID | Implementation | Exact source path                                                                                                                              | Existing scope/adoption                                                                                                            |
| ------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| DSH-01       | AdminShell     | [apps/admin/src/AdminShell.tsx:49](E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx:49)                                     | Shared across admin scopes. AdminApp and FixtureAdmin; PLATFORM/VENDOR/MARKET; admin-core navigation/grants, role services, theme. |
| DSH-02       | CustomerLayout | [apps/storefront/src/layouts/CustomerLayout.astro:1](E:/coding/farmers-market-platform-web/apps/storefront/src/layouts/CustomerLayout.astro:1) | Shared within customer pages. account/index, [section], orders/index, orders/[id], settings; Astro SSR + platformTheme.            |

Codex recommendation (historical): **DSH-01**.

Historical rationale: AdminShell is strongest operational foundation and already satisfies admin/vendor/market shell reuse. Extract presentation slots/styles for React and Astro, not an Admin service bundle in customer pages.

Developer selection: **DSH-01** as the shared dashboard presentation standard.

Canonical implementation: **DSH-01 AdminShell**, existing shared React shell in `apps/admin/src/AdminShell.tsx:49`. Reusable shell presentation/styles/layout contracts must be extracted for React SPA and Astro SSR consumption. The existing AdminShell is not a renderer-neutral customer component, and extraction is pending.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Consistent shared dashboard appearance across platform/admin, vendor, market and customer roles. Preserve customer SSR, normal navigation, authentication/logout behavior and customer-specific content. Shell atoms must use the newly approved UI standards.

Decision date/evidence: **2026-10-12**. Explicit developer approval in the task "Record Approved UI Standards and Prepare Component Consolidation", following the developer's audit and visual gallery review. This records design approval only; implementation and its verification remain pending.

Required variants/improvements: Replace independently recreated DSH-02 presentation through renderer-appropriate adapters. Do not import the administrative application, administrative services, role privileges or admin-specific controllers into the customer dashboard. Keep routing, auth/session authority, grants and domain services in their current role-specific layers. Preserve current responsive/mobile behavior while MOB remains pending.

Migration notes: Auth, channel switching and service lifecycles cannot migrate with appearance; avoid loading Admin privileges or services into customer pages.

Retained specialists and boundaries: React SPA and Astro SSR are approved renderer boundaries for the same shell presentation, not competing dashboard designs. No independent mobile navigation standard is approved by this shell decision.

Future supersession: DSH-02's independent shell appearance will be superseded. CustomerLayout remains an Astro SSR role adapter with existing customer content and security behavior; it is not replaced by the admin application.

Implementation state: **Not migrated by this documentation task.** Follow the bounded phases in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); preserve behavior/security contracts and pending-category decisions.

Implementation state (2026-10-14, combined Phase C/D): **DSH-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Shared DashboardFrame and renderer-neutral class contract; AdminShell retains routing/permissions; native Astro DashboardFrame serves CustomerLayout. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

Post-implementation refinement (2026-10-14): DSH-01 retains React/SSR boundaries while desktop collapse now works for Platform, Market, Vendor and Customer. CustomerLayout uses the existing native Button adapter and a renderer-neutral sidebar enhancer; no React hydration or identity/data changes. Practical imports and construction rules are in the root [COMPONENT_USAGE_GUIDE.md](COMPONENT_USAGE_GUIDE.md). Developer manual review of these refinements remains pending.

### Dashboard sidebars

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-sid)

Boundary: Internal. Competing implementations/contracts: yes.

| Candidate ID | Implementation     | Exact source path                                                                                                                                | Existing scope/adoption                                                                                       |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| SID-01       | AdminShell sidebar | [apps/admin/src/AdminShell.tsx:193](E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx:193)                                     | Shared region. PLATFORM/VENDOR/MARKET; workspace navigation, hierarchy and icons; market collapse uses inert. |
| SID-02       | Customer sidebar   | [apps/storefront/src/layouts/CustomerLayout.astro:27](E:/coding/farmers-market-platform-web/apps/storefront/src/layouts/CustomerLayout.astro:27) | Local shell region. CustomerNavigation native anchors; same .admin-sidebar base CSS.                          |

Codex recommendation (historical): **SID-01**.

Historical rationale: Reuse AdminShell sidebar structure/presentation slots while feeding a separate SSR customer navigation list.

Developer selection: **SID-01** as the shared dashboard sidebar standard.

Canonical implementation: **SID-01 sidebar region**, existing inside `apps/admin/src/AdminShell.tsx:193`. Extract reusable presentation/structure with renderer-compatible adapters; no standalone universal sidebar implementation has been created.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Consistent sidebar appearance, structure, spacing, interaction states and responsive behavior across dashboard roles, preserving each role's navigation items and permission boundaries. Customer navigation remains functional without the administrative SPA.

Decision date/evidence: **2026-10-12**. Explicit developer approval in the task "Record Approved UI Standards and Prepare Component Consolidation", following the developer's audit and visual gallery review. This records design approval only; implementation and its verification remain pending.

Required variants/improvements: Replace SID-02's independent presentation, retain role-specific links and current-page semantics, and preserve collapse/inert behavior, keyboard access and responsive visibility. Sidebar controls and fields must use the approved UI standards. Do not merge permission models or make customer navigation depend on admin controllers.

Migration notes: Hover-based nested navigation and collapsed focus need characterization; do not require JS for customer navigation.

Retained specialists and boundaries: Separate role navigation sources and React/Astro adapters are retained architectural boundaries. MOB-01/MOB-02 remain pending as the independently audited mobile navigation category.

Future supersession: SID-02's independent appearance will be superseded by the SID-01 presentation contract. CustomerNavigation's SSR links/data source and role-specific permissions remain separate.

Implementation state: **Not migrated by this documentation task.** Follow the bounded phases in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); preserve behavior/security contracts and pending-category decisions.

Implementation state (2026-10-14, combined Phase C/D): **SID-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Common sidebar widths, padding, icons, grouping, active/hover/focus and collapse animation; customer-only native navigation shares the icon paths. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

Post-implementation refinement (2026-10-14): All desktop sidebar controls use the shared Lucide `panel-left` SVG path and BTN-01 icon presentation at 768px and above. Collapse/expand retains inert navigation, transition, focus, action-based labels and expanded state. Customer uses a small native SSR enhancement; its sidebar stays available without JavaScript. Role-owned links and active state are unchanged. Developer manual review of these refinements remains pending.

### Dashboard headers

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-hdr)

Boundary: Internal. Competing implementations/contracts: yes.

| Candidate ID | Implementation    | Exact source path                                                                                                                                | Existing scope/adoption                                                                                       |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| HDR-01       | AdminShell topbar | [apps/admin/src/AdminShell.tsx:208](E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx:208)                                     | Shared region. Tenant name/logo; controls slot; AccountModes and refresh supplied by AdminApp; Button logout. |
| HDR-02       | Customer topbar   | [apps/storefront/src/layouts/CustomerLayout.astro:34](E:/coding/farmers-market-platform-web/apps/storefront/src/layouts/CustomerLayout.astro:34) | Local shell region. Customer name, storefront/discovery link and POST logout form.                            |
| HDR-03       | Designer header   | [apps/admin/src/market/phase14/Layouts.tsx:643](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Layouts.tsx:643)             | Local feature region. Full-screen layout editor name/dirty status/area/save/version controls; designer.css.   |

Codex recommendation (historical): **HDR-01**.

Historical rationale: Topbar controls slot is an existing extensible base; preserve customer native form and designer full-screen header.

Developer selection: **HDR-01** as the universal dashboard topbar/header presentation standard.

Canonical implementation: **HDR-01 topbar region**, existing inside `apps/admin/src/AdminShell.tsx:208`. Shared header presentation/slots and renderer-compatible integration still need extraction. This selection does not approve ordinary page or section headings.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: All dashboard headers, including the customer topbar and full-screen designer/editor header visual language. Preserve specialized editor controls, layout, saving/version status and workflows. Shared shell/sidebar/header atoms must use approved button/input/select/card standards.

Decision date/evidence: **2026-10-12**. Explicit developer approval in the task "Record Approved UI Standards and Prepare Component Consolidation", following the developer's audit and visual gallery review. This records design approval only; implementation and its verification remain pending.

Required variants/improvements: Align other dashboard headers to HDR-01 appearance while preserving tenant/name/branding constraints and action wrapping. Preserve native customer POST logout and existing admin logout callbacks. Designer/editor screens must conform visually without losing their editing controls or specialized layout. Do not conflate this work with PGH/SCH canonical selection.

Migration notes: Logout callbacks and POST navigation are separate security flows; header extraction must not switch them.

Retained specialists and boundaries: Designer/editor controls and layout remain specialized functionality conforming to HDR-01 visual language; HDR-03 is not approved as a competing header standard. Page headings, section headings and mobile navigation remain undecided.

Future supersession: HDR-02's independent topbar appearance will be superseded. HDR-03's independent visual treatment will conform to HDR-01, retaining editor-specific state/actions and workflows.

Implementation state: **Not migrated by this documentation task.** Follow the bounded phases in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); preserve behavior/security contracts and pending-category decisions.

Implementation state (2026-10-14, combined Phase C/D): **HDR-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Common topbar slots and layout; one mounted account toolbar; full-screen editor keeps its own header and canvas geometry. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

Post-implementation refinement (2026-10-14): Customer desktop HDR-01 now includes the same left sidebar control and shared account-mode presentation in its right action group. The single disabled Customer option states the current mode; this layout has no authorized affiliation data, so existing settings-page workspace handoffs remain the switching mechanism. Shared account-control CSS is renderer-neutral. No new roles, API, switching controller or session behavior. Developer manual review of these refinements remains pending.

### Mobile dashboard navigation

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-mob)

Boundary: Internal. Competing implementations/contracts: yes.

| Candidate ID | Implementation             | Exact source path                                                                                                                                | Existing scope/adoption                                                              |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| MOB-01       | Admin mobile disclosure    | [apps/admin/src/AdminShell.tsx:251](E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx:251)                                     | Shared region. Same workspace links variable as desktop; native details/summary.     |
| MOB-02       | Customer mobile disclosure | [apps/storefront/src/layouts/CustomerLayout.astro:46](E:/coding/farmers-market-platform-web/apps/storefront/src/layouts/CustomerLayout.astro:46) | Local shell region. Same CustomerNavigation as sidebar, summary Customer navigation. |

Codex recommendation (historical): **MOB-01**.

Historical rationale: Both already use the same styling and native disclosure pattern; share markup contracts and slots across renderers.

Developer selection: **MOB-01** presentation foundation, with a **right-aligned hamburger menu** replacing the separate mobile header controls/workspace-navigation dropdown; **MOB-02** independent appearance is superseded.

Canonical implementation: Existing AdminShell mobile region in `apps/admin/src/AdminShell.tsx:251` and shared/market shell CSS is the presentation source, not the finished hamburger design. React and native Astro role adapters must share the approved mobile header/menu contract.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Compact mobile dashboard headers for admin/vendor/market/customer roles. Place the hamburger on the right and move relevant navigation and necessary actions into its appropriate menu content. Preserve desktop navigation presentation and role/workspace/authorization boundaries.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Remove the separate mobile workspace-navigation dropdown and standalone local/account controls and Sign Out from the compact header. Keep all necessary actions reachable inside the menu, including secure logout and active navigation. Inspect actual production controls before relocation. Preserve keyboard/screen-reader access and native navigation/no-JavaScript behavior where feasible, especially Astro customers; verify transitions around 600px and 767px.

Migration notes: 600/767 breakpoint mismatch needs a developer decision; do not create duplicate visible landmarks at intermediate widths.

Implementation risks: Moving controls can lose account/business switching, refresh, logout or current context; customer menus must never expose unauthorized admin/vendor/market options. Preserve React callback logout and customer POST logout, focus/visibility rules, permission-filtered links and desktop/editor behavior. Gallery synthetic controls are not production functionality.

Retained specialists and boundaries: Role-specific navigation/controller sources and React/Astro adapters remain architectural specialists. Read-only source inspection found AdminApp-supplied Refresh workspace and AccountModes (Your account, Account mode, conditional Business), AdminShell callback Sign out, and CustomerLayout Visit storefront/Explore markets plus POST `/api/account` logout. Keep applicable real actions, existing conditional availability and mechanisms; do not invent a local control from the gallery.

Future supersession: MOB-02's independent appearance and both shells' separate mobile workspace disclosures/header-action arrangement yield to the MOB-01-based hamburger contract. Desktop DSH/SID/HDR approvals and specialist editor behavior remain intact. Approval does not authorize breakpoint harmonization, new privileges or account/session/controller rewrites.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **MOB-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. One right-aligned native hamburger disclosure at 767px and below; one mounted toolbar, role-owned menu actions and secure logout; native Astro fallback remains usable without JS. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

Post-implementation refinement (2026-10-14): MOB-01 keeps the existing right-aligned hamburger path, native disclosure, actions and secure logout at 767px and below. Desktop panel controls and the customer read-only mode are hidden on mobile; one mounted toolbar remains. Resizing from a focused desktop toggle returns focus to the mobile summary. No breakpoint or mobile menu replacement. Developer manual review of these refinements remains pending.

### Statistics and KPI displays

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-kpi)

Boundary: Internal data-neutral presentation. Competing implementations/contracts: yes.

| Candidate ID | Implementation           | Exact source path                                                                                                                            | Existing scope/adoption                                                                                         |
| ------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| KPI-01       | Customer stat links      | [apps/storefront/src/pages/account/index.astro:28](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/index.astro:28)   | Local. order/market/vendor count projection; customer-stats CSS:20.                                             |
| KPI-02       | Occurrence summary tiles | [apps/admin/src/market/phase14/Assignments.tsx:114](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Assignments.tsx:114) | Local. dl.ops-day-summary aria-live; scheduled assignments/day operations, business-derived counts and details. |
| KPI-03       | Platform facts summary   | [apps/admin/src/management/platform.tsx:42](E:/coding/farmers-market-platform-web/apps/admin/src/management/platform.tsx:42)                 | Local. PlatformOverview tenant count projections; dl.facts and Readiness.                                       |
| KPI-04       | Booth billing summary    | [apps/admin/src/market/phase14/Billing.tsx:21](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Billing.tsx:21)           | Local. billingSummary paid/open/pastDue/complimentary, currency-separated amounts; moneyLabel.                  |

Codex recommendation (historical): **KPI-02**.

Historical rationale: Occurrence summary offers the richest responsive stat presentation; support a link variant from customer stats and retain platform/simple text variants.

Developer selection: **KPI-01** for dashboard statistic/KPI tile presentation, with optional supporting detail comparable to KPI-02.

Canonical implementation: **KPI-01 customer stat visual pattern** in `apps/storefront/src/pages/account/index.astro:28` and `.customer-stats` rules in `apps/storefront/src/styles/customer-dashboard.css:20`. It is native local markup, not an existing shared StatCard; extract compatible React/Astro presentation.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Dashboard statistics using KPI-01 typography, spacing and card appearance, as either genuine navigation links or noninteractive statistics. Optional supporting details are available on hover, keyboard focus and an appropriate touch-accessible interaction.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: Support feature-supplied details such as an actual assignments breakdown. Use BDG-02 color conventions where domain meaning supports them: green for healthy/positive and red for problem/negative states. High/low values alone do not determine tone. Preserve primary totals/labels and make supporting information accessible beyond hover.

Migration notes: Never derive stock, earnings or financial totals from presentational counts; aria-live may be noisy for large summaries.

Implementation risks: Generic presentation must not invent/recalculate counts, derive stock/earnings, combine currencies or decide business health. Avoid hover-only information, nested interactive elements in linked tiles and noisy live announcements. KPI-02 comparison supplies a detail-content model, not proof of an existing hover API.

Retained specialists and boundaries: Authoritative KPI-02 occurrence detail/count data, KPI-03 platform facts and KPI-04 currency-separated financial summaries remain feature-owned. Linked/static semantic variants and necessary currency/detail grouping are retained under KPI-01 presentation; no competing KPI visual standard is approved.

Future supersession: Competing ordinary KPI-02/03/04 statistic presentations align with KPI-01 where scoped, preserving all data, grouping and semantics. FCT/SUM/OST calculations and independent category choices remain pending; this does not authorize deriving new metrics.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **KPI-01 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. Shared linked/static KPI classes for customer, platform, vendor and occurrence/invoice summaries; supporting facts remain visible and accessible; totals stay feature-owned. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Filtering controls and bars

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-fil)

Boundary: Internal and storefront adapters. Competing implementations/contracts: yes.

| Candidate ID | Implementation                     | Exact source path                                                                                                                                                                    | Existing scope/adoption                                                                                                                                   |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIL-01       | RangeForm                          | [apps/admin/src/market/common.tsx:156](E:/coding/farmers-market-platform-web/apps/admin/src/market/common.tsx:156)                                                                   | Shared within market. Occurrences/relationships/operations, dateBounds + TextField + Button.                                                              |
| FIL-02       | Vendor and management filter forms | [apps/admin/src/vendor/catalog.tsx:120](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/catalog.tsx:120)                                                                 | Local pattern family. Vendor catalog/customers/orders/analytics/markets; management/platform:95/catalog query controls. TextField/Select/Choice + Button. |
| FIL-03       | Public catalog filters             | [apps/storefront/src/pages/occurrences/\[occurrenceId\]/index.astro:115](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro:115) | Local. Vendor products/index:64 and market occurrence filters; GET fields, facets/vendor checkboxes.                                                      |
| FIL-04       | Operations toolbar                 | [apps/admin/src/market/phase14/Directory.tsx:281](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Directory.tsx:281)                                             | Local pattern family. Stock occurrence selector; Assignments toolbar/search and MarketMap booth search; Control/Entry; ops-toolbar CSS.                   |
| FIL-05       | Customer discovery toolbar         | [apps/storefront/src/pages/account/\[section\].astro:112](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/[section].astro:112)                               | Local. Same SRH-03; searches independent discover pagination.                                                                                             |

Codex recommendation (historical): **FIL-01**.

Historical rationale: RangeForm is strongest existing reusable filter adapter, but a shared FilterBar presentation is still missing; compose it from existing fields and keep each query model.

Developer selection: **FIL-01, FIL-02, FIL-03, FIL-04 and FIL-05** retained for their distinct use cases, composed from approved **BTN-01**, **INP-02** and **SEL-03** presentations.

Canonical implementation: Existing separate filter adapters: RangeForm in `apps/admin/src/market/common.tsx:156`; vendor/management forms represented by `apps/admin/src/vendor/catalog.tsx:120`; public GET filters in `apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro:115`; operations toolbar in `apps/admin/src/market/phase14/Directory.tsx:281`; customer discovery in `apps/storefront/src/pages/account/[section].astro:112`. A shared layout/control-height contract is pending, not a universal filter controller.

Decision status: **APPROVED DESIGN**. Implementation status: **IMPLEMENTATION COMPLETE / MANUAL REVIEW PENDING**.

Approved scope/variants: Retain all five feature forms and their query models. Standardize constituent controls through earlier approved primitives without merging filtering logic. Specialized SEL-02/SEL-07 controls keep their separately approved scope.

Decision date/evidence: **2026-10-13**. Explicit developer decisions in "Record Second-Round Approved UI Component Decisions", following manual inspection in the development-only comparison gallery. Visual approval only; implementation and verification remain pending.

Required variants/improvements: FIL-01: match "Apply dates" button height to adjacent date inputs. FIL-02: match "Search" and "Search tenants" button heights to fields and use SEL-03 for ordinary selects. FIL-03: equalize "Apply", "Sort products" native select and "Search products" input heights, using SEL-03 sort appearance. FIL-04: use BTN-01 and SEL-03 with aligned heights. FIL-05: correct the entire Search button's vertical alignment beside its input on mobile and desktop through shared layout, with no hardcoded negative offsets or viewport-specific positioning hacks.

Migration notes: Query normalization, bounded time ranges and tenant service keys must stay in feature code.

Implementation risks: Height fixes can interact with labels, helper/error text, field margins and wrapped actions. Preserve date range validation; search semantics/limits; native GET submission; sort values; query state/serialization/parameters; server/client filtering; paging resets/pagination; permissions, routes and discovery behavior.

Retained specialists and boundaries: **All five FIL candidates** remain distinct feature adapters. Operations-specific filter state, native public/customer forms, market date validation and vendor/management querying remain unchanged. Approval of common controls does not select SRH as a category or FRM business logic.

Future supersession: Only competing constituent control appearance and misaligned layout/height treatments are superseded. No FIL-01 through FIL-05 form or feature filtering controller is retired or merged.

Implementation state: **Not migrated by this documentation task.** Use the bounded future batches in [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md); no application code, CSS, gallery implementation or production behavior changes are authorized here.

Implementation state (2026-10-14, combined Phase C/D): **FIL-01 through FIL-05 FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**. All five existing query models use Phase A controls and field/action tracks; native customer discovery and catalog GET forms retain their query semantics and natural-width primary actions. Source-level inventory, retained specialists, verification and manual checks are in the [combined implementation report](docs/UI_COMPONENTS/Phase-C-D-UI-Consolidation.md). No additional design selection or visual acceptance is claimed. Historical approval descriptions above remain the original decision record.

### Dashboard and mutation forms

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-frm)

Boundary: Internal presentation; keep controllers separate. Competing implementations/contracts: yes.

| Candidate ID | Implementation                      | Exact source path                                                                                                                                      | Existing scope/adoption                                                                                                                                         |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRM-01       | Vendor CommandForm                  | [apps/admin/src/vendor/common.tsx:204](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/common.tsx:204)                                     | Shared across vendor/management. Catalog, inventory, orders, markets and management commands. Alert/Button/Dialog/ErrorState; safeError/AppError.               |
| FRM-02       | Market CommandForm                  | [apps/admin/src/market/CommandForm.tsx:5](E:/coding/farmers-market-platform-web/apps/admin/src/market/CommandForm.tsx:5)                               | Shared within market. market/common.tsx:39 wraps it with danger class and dirty status; Settings/occurrences/relationships/schedule.                            |
| FRM-03       | Operations forms and run controller | [apps/admin/src/market/phase14/OperationsRoutes.tsx:113](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/OperationsRoutes.tsx:113) | Shared feature controller plus local forms. ApplicationBuilder/Review, Directory/Rentals, Invoice, Assignments and LayoutEditor; api.command OperationsCommand. |
| FRM-04       | Commerce and account forms          | [apps/storefront/src/components/Checkout.tsx:87](E:/coding/farmers-market-platform-web/apps/storefront/src/components/Checkout.tsx:87)                 | Local feature controllers. Checkout, MarketApplication, CommunicationPreferences, central Astro /api/account and FLD-04 feedback script.                        |

Codex recommendation: **FRM-01**.

Rationale: Vendor CommandForm has the richest existing safety/recovery contract and wider cross-admin adoption; reconcile intended validation behavior with FRM-02 before extracting only approved presentation.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Confirmation, UUID lifetime, uncertain outcome, validation recovery, dirty drafts, revision/permission guards and beforeClose policy. See the linked state profile and category table for specific gaps.

Migration notes: Do not normalize different command APIs, add automatic write retry or make accepted pending jobs look completed; forms are high risk.

### Product cards

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-prd)

Boundary: Storefront-specific with themed surface. Competing implementations/contracts: yes.

| Candidate ID | Implementation           | Exact source path                                                                                                                                                                    | Existing scope/adoption                                                                                                         |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| PRD-01       | ProductCards             | [apps/storefront/src/components/ProductCards.astro:14](E:/coding/farmers-market-platform-web/apps/storefront/src/components/ProductCards.astro:14)                                   | Shared within vendor storefront. VendorHome and products/index import it; PublicCatalog, safeAsset/plainDescription/priceLabel. |
| PRD-02       | Occurrence offering card | [apps/storefront/src/pages/occurrences/\[occurrenceId\]/index.astro:197](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro:197) | Local. MarketCatalog items in occurrence page; safeAsset + formatMoney.                                                         |

Codex recommendation: **PRD-01**.

Rationale: ProductCards provides existing reusable media/card scaffolding; preserve a market-offering variant with explicit URL, fields and heading level.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Price range vs exact price, Vendor attribution, variant/occurrence routes, image fallback and tenant branding. See the linked state profile and category table for specific gaps.

Migration notes: Do not replace variant URLs with product slugs or detach offerings from their approved occurrence; asset accessibility differs.

### Vendor identity and directory cards

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-vnd)

Boundary: Customer/storefront and internal variants. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation                       | Exact source path                                                                                                                                        | Existing scope/adoption                                                                                                            |
| ------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| VND-01       | CustomerFollows for VENDOR           | [apps/storefront/src/components/CustomerFollows.astro:16](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CustomerFollows.astro:16) | Shared customer component. /account overview and /account/vendors follows/discovery; CustomerFollow + POST customer-follow.        |
| VND-02       | Directory business record            | [apps/admin/src/market/phase14/Directory.tsx:52](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Directory.tsx:52)                   | Local. Organizer applicant directory; run OperationsCommand, modal Entry/Control editor.                                           |
| VND-03       | AssignmentCard and vendor disclosure | [apps/admin/src/market/phase14/Assignments.tsx:570](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Assignments.tsx:570)             | Local. Assignments/day uses AssignmentCard inside booth-list-item disclosure at :510; API plan/assignment/invoice/directory facts. |

Codex recommendation: **VND-01**.

Rationale: CustomerFollows is the clearest existing reusable public Vendor identity card; internal directory and assignment records remain specialized.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Optional controls, unavailable storefront text, public-safe URLs and internal record density. See the linked state profile and category table for specific gaps.

Migration notes: Never expose directory contacts or private manager notes through a generic public Vendor card.

### Market identity and event cards

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-mkt)

Boundary: Customer and storefront variants. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation             | Exact source path                                                                                                                                          | Existing scope/adoption                                                                                              |
| ------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| MKT-01       | CustomerFollows for MARKET | [apps/storefront/src/components/CustomerFollows.astro:16](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CustomerFollows.astro:16)   | Shared customer component. Same definition as VND-01, kind=MARKET in overview, followed markets/discovery.           |
| MKT-02       | CustomerEvents             | [apps/storefront/src/components/CustomerEvents.astro:10](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CustomerEvents.astro:10)     | Shared customer component. account/index and [section] appearance lists; eventDate/eventTime helpers, CustomerEvent. |
| MKT-03       | Public occurrence card     | [apps/storefront/src/components/MarketPublicHome.astro:50](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketPublicHome.astro:50) | Local. Live market home; occurrenceLabel and projected total; occurrence-list CSS.                                   |

Codex recommendation: **MKT-01 for identity; MKT-02 for events**.

Rationale: Identity and occurrence/event cards have different purposes. Keep their adapters and reuse a surface; compare event layout with MKT-03 without forcing one template.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Explicit timezone, optional URLs, Vendor appearance grouping and branded public occurrence actions. See the linked state profile and category table for specific gaps.

Migration notes: A market identity is not an occurrence; do not substitute one id/URL or merge central customer projections into a storefront context.

### Quantity selectors

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-qty)

Boundary: Commerce presentation with caller-owned validation. Competing implementations/contracts: yes.

| Candidate ID | Implementation            | Exact source path                                                                                                                                    | Existing scope/adoption                                                                 |
| ------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| QTY-01       | ProductPurchase quantity  | [apps/storefront/src/components/ProductPurchase.tsx:76](E:/coding/farmers-market-platform-web/apps/storefront/src/components/ProductPurchase.tsx:76) | Local. Direct Vendor product option purchase; controlled quantity string, shopCall add. |
| QTY-02       | MarketPurchase quantity   | [apps/storefront/src/components/MarketPurchase.tsx:100](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketPurchase.tsx:100) | Local. Occurrence offering purchase; uncontrolled FormData field name=quantity.         |
| QTY-03       | Vendor cart line quantity | [apps/storefront/src/components/VendorCart.tsx:103](E:/coding/farmers-market-platform-web/apps/storefront/src/components/VendorCart.tsx:103)         | Local. Cart adjustment; Input keyed by backend quantity, name=quantity; change action.  |
| QTY-04       | Market cart line quantity | [apps/storefront/src/components/MarketCart.tsx:143](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketCart.tsx:143)         | Local. Grouped Market lines; Input keyed by backend quantity; editable guard.           |

Codex recommendation: **QTY-01 as field foundation; preserve QTY-03 refresh pattern**.

Rationale: All four already reuse Input; extract label/constraints as a controlled or uncontrolled presentation adapter with caller-owned disabled state.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Required integer bounds, inputMode, backend quantity reset, line-specific accessible labels and mismatch guards. See the linked state profile and category table for specific gaps.

Migration notes: Do not infer availability from the UI maximum; preserve validation by backend and avoid silently changing controlled/uncontrolled state.

### Cart and purchase controls

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-crt)

Boundary: Commerce feature controllers with shared presentation. Competing implementations/contracts: yes.

| Candidate ID | Implementation  | Exact source path                                                                                                                                  | Existing scope/adoption                                                                                          |
| ------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| CRT-01       | VendorCart      | [apps/storefront/src/components/VendorCart.tsx:7](E:/coding/farmers-market-platform-web/apps/storefront/src/components/VendorCart.tsx:7)           | Local feature. cart.astro -> ResilientSurfaces:15 -> VendorCart; PublicCart, shopCall, cartMessage, formatMoney. |
| CRT-02       | MarketCart      | [apps/storefront/src/components/MarketCart.tsx:12](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketCart.tsx:12)         | Local feature. cart.astro -> ResilientSurfaces:22 -> MarketCart; MarketCart DTO, occurrenceLabel.                |
| CRT-03       | ProductPurchase | [apps/storefront/src/components/ProductPurchase.tsx:7](E:/coding/farmers-market-platform-web/apps/storefront/src/components/ProductPurchase.tsx:7) | Local feature. products/[slug]; PublicVariant selection, formatMoney + shopCall.                                 |
| CRT-04       | MarketPurchase  | [apps/storefront/src/components/MarketPurchase.tsx:11](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketPurchase.tsx:11) | Local feature. occurrences/[occurrenceId] and products/[variantId]; Shop coordinator and market-cart-updated.    |
| CRT-05       | MarketCartLink  | [apps/storefront/src/components/MarketCartLink.tsx:4](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketCartLink.tsx:4)   | Shared in storefront layout. SiteLayout:85; shopCall bootstrap and market-cart-updated event.                    |

Codex recommendation: **CRT-01 for line controls, with CRT-02 grouping adapter**.

Rationale: VendorCart line edit presentation is simplest foundation; preserve MarketCart as separate controller and compose grouped/coupon variants later.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Backend rereads, pending locks, unknown counts, event notifications, occurrence mismatch and direct/grouped totals. See the linked state profile and category table for specific gaps.

Migration notes: Do not unify cart domain state, cross-store sessions or coordinators; purchase and quantity changes need commerce regression coverage.

### Order summaries and money rows

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-sum)

Boundary: Commerce and internal display adapters. Competing implementations/contracts: yes.

| Candidate ID | Implementation     | Exact source path                                                                                                                                      | Existing scope/adoption                                                                        |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| SUM-01       | CheckoutSummary    | [apps/storefront/src/components/Checkout.tsx:8](E:/coding/farmers-market-platform-web/apps/storefront/src/components/Checkout.tsx:8)                   | Shared within checkout. Used at Review and Payment; CheckoutView, formatMoney.                 |
| SUM-02       | Vendor cart totals | [apps/storefront/src/components/VendorCart.tsx:142](E:/coding/farmers-market-platform-web/apps/storefront/src/components/VendorCart.tsx:142)           | Local. PublicCart exact projections; .cart-totals .card.                                       |
| SUM-03       | Market cart totals | [apps/storefront/src/components/MarketCart.tsx:186](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketCart.tsx:186)           | Local. MarketCart projections and coupon controls.                                             |
| SUM-04       | PurchaseDetail     | [apps/storefront/src/components/PurchaseDetail.astro:36](E:/coding/farmers-market-platform-web/apps/storefront/src/components/PurchaseDetail.astro:36) | Shared customer detail. account/orders/[id] imports; CustomerPurchase financial/portion facts. |
| SUM-05       | Booth Invoice      | [apps/admin/src/market/phase14/Billing.tsx:50](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Billing.tsx:50)                     | Local feature. BoothInvoice + moneyLabel; TBL-03, manual invoice/payment commands.             |

Codex recommendation: **SUM-01 for checkout; common money rows need future extraction**.

Rationale: CheckoutSummary is already reused and reads authoritative projections. Extract only a neutral labelled-money row from existing dl structure for carts/history.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Shipping vs pickup, surcharges, coupons, refunds, currency grouping and exact formatMoney path. See the linked state profile and category table for specific gaps.

Migration notes: Historical original-paid is not current checkout total; invoice moneyLabel divides by100 and cannot be silently substituted without contract tests.

### Order, financial and pickup status

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-ost)

Boundary: Domain-specific mappings with universal badge surface. Competing implementations/contracts: yes.

| Candidate ID | Implementation                     | Exact source path                                                                                                                                      | Existing scope/adoption                                                                                           |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| OST-01       | PurchaseDetail status names        | [apps/storefront/src/components/PurchaseDetail.astro:8](E:/coding/farmers-market-platform-web/apps/storefront/src/components/PurchaseDetail.astro:8)   | Shared customer feature. financialNames and pickupNames:15; shopper purchase detail.                              |
| OST-02       | CustomerOrders status text         | [apps/storefront/src/components/CustomerOrders.astro:31](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CustomerOrders.astro:31) | Shared customer feature. Purchase history; lowercases/replaces financial enum string.                             |
| OST-03       | Vendor order status text           | [apps/admin/src/vendor/orders.tsx:57](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/orders.tsx:57)                                       | Local. Orders list/detail; operational order/portion, fulfillment and financial projections; DataTable.           |
| OST-04       | Market operational purchase badges | [apps/admin/src/market/operations.tsx:17](E:/coding/farmers-market-platform-web/apps/admin/src/market/operations.tsx:17)                               | Local adapter. OperationalPurchases imports StatusBadge as Badge in the import block; organizer-safe projections. |

Codex recommendation: **OST-01 for customer labels; BDG-02 for surface only**.

Rationale: Explicit PurchaseDetail maps are clearer than enum string formatting; preserve vendor/market operational mappings and never treat badge color as domain truth.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Refund required/failed, collected/partial/pending, order lifecycle and organizer-safe facts. See the linked state profile and category table for specific gaps.

Migration notes: A single status enum map can hide reconciliation or confuse payment confirmation with fulfillment.

### Phone inputs

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-phn)

Boundary: Universal specialist. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation | Exact source path                                                                                            | Existing scope/adoption                                                                                                    |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| PHN-01       | PhoneInput     | [packages/ui/src/PhoneInput.tsx:41](E:/coding/farmers-market-platform-web/packages/ui/src/PhoneInput.tsx:41) | Shared. 6 direct app importing files plus Entry tel branch and ApplicationFields; libphonenumber-js/max and country-names. |

Codex recommendation: **PHN-01**.

Rationale: One phone input implementation already serves account, checkout, directory and dynamic applications; preserve it as a specialist.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: SSR hydration guard, valid country, complete paste, nontruncation, E.164 form names and optional pickup contact. See the linked state profile and category table for specific gaps.

Migration notes: Generic Input replacement loses canonical phone submission and validation; PhoneInput disabled/hydration must continue working inside forms.

### Timezone controls

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-tz)

Boundary: Universal specialist with constrained contract. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation | Exact source path                                                                                                  | Existing scope/adoption                                                                                                                              |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| TZ-01        | TimezoneField  | [packages/ui/src/TimezoneField.tsx:13](E:/coding/farmers-market-platform-web/packages/ui/src/TimezoneField.tsx:13) | Shared. Re-exported, not reimplemented, by admin/market/timezones.tsx:3; market RuleFields/SessionFields/ScheduleForm and account/onboarding use it. |

Codex recommendation: **TZ-01**.

Rationale: Only one control exists; keep exact IANA values and US-zone limitation unless the developer expands product requirements.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Required blank state, chosen timezone and separate DST rejection helper. See the linked state profile and category table for specific gaps.

Migration notes: Generalizing option labels must not change IANA ids or shift stored local dates/times.

### Password fields and visibility controls

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-pwd)

Boundary: Account-specific. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation                   | Exact source path                                                                                                                                        | Existing scope/adoption                                                                                                                  |
| ------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| PWD-01       | SignupPasswords                  | [apps/storefront/src/components/SignupPasswords.tsx:4](E:/coding/farmers-market-platform-web/apps/storefront/src/components/SignupPasswords.tsx:4)       | Shared within signup. account/signup.astro imports; passwordChecks/validPassword/passwordMaximum from UI password-policy.ts.             |
| PWD-02       | Native login/reset/change fields | [apps/storefront/src/components/CentralAccount.astro:169](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CentralAccount.astro:169) | Local pattern family. account/login.astro, sign-in.astro, reset.astro and AdminApp:228; current password and replacement password props. |

Codex recommendation: **PWD-01 for new account creation**.

Rationale: SignupPasswords is richest creation behavior; do not impose creation policy on existing-password login. Use shared native field styling for all.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Current vs new autocomplete, mismatch, visibility accessibility, server policy and explicit clearing lifecycle. See the linked state profile and category table for specific gaps.

Migration notes: Blindly using Input can infer a different maximum; failed signup intentionally clears passwords while other values remain.

### Maps, canvas and layout visualization

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-map)

Boundary: Domain-specific shared behavior. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation                      | Exact source path                                                                                                  | Existing scope/adoption                                                                                                                                  |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAP-01       | MarketMap                           | [packages/ui/src/MarketMap.tsx:38](E:/coding/farmers-market-platform-web/packages/ui/src/MarketMap.tsx:38)         | Shared. 5 direct app imports: OccurrenceMap, Assignments, Layouts, VendorBooths and occurrence map page; imports MapCanvas.                              |
| MAP-02       | MapCanvas, MapGrid and KonvaElement | [packages/ui/src/map/MapCanvas.tsx:49](E:/coding/farmers-market-platform-web/packages/ui/src/map/MapCanvas.tsx:49) | Shared lower layer. MapCanvas used by MarketMap and LayoutEditor; MapGrid.tsx:4, KonvaElement.tsx:75/SafeImage:16, model.ts geometry; Konva/react-konva. |

Codex recommendation: **MAP-01 for public/read maps, MAP-02 for editing**.

Rationale: These compose one another; they are not competing map engines. Preserve the distinction between reusable canvas and projected read/assignment adapters.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Text alternatives, keyboard controls, coordinate bounds, image safety, status overlays, touch/pan and readOnly. See the linked state profile and category table for specific gaps.

Migration notes: Moving canvas wrappers affects ResizeObserver and coordinate/tooltip calculations; keep layout revisions, paid assignments and tenant-filtered projections.

### Definition-driven application fields

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-app)

Boundary: Shared domain renderer. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation    | Exact source path                                                                                                        | Existing scope/adoption                                                                                                                                                  |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| APP-01       | ApplicationFields | [packages/ui/src/ApplicationFields.tsx:6](E:/coding/farmers-market-platform-web/packages/ui/src/ApplicationFields.tsx:6) | Shared. 3 direct imports: ApplicationBuilder preview, ApplicationReview read-only and public MarketApplication; Input/Textarea/PhoneInput and API ApplicationDefinition. |

Codex recommendation: **APP-01**.

Rationale: All three areas already reuse one renderer; builder/review/public controllers are consumers, not duplicate field renderers.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Read-only optional blank omission, server definition limits, answer types, help descriptions and phone normalization. See the linked state profile and category table for specific gaps.

Migration notes: Dynamic definition answers remain feature-owned; form library migration could change question id/name or required group semantics.

### Facts and detail definition lists

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-fct)

Boundary: Internal and commerce typography. Competing implementations/contracts: yes.

| Candidate ID | Implementation                   | Exact source path                                                                                                                      | Existing scope/adoption                                                                                   |
| ------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| FCT-01       | Vendor facts                     | [apps/admin/src/vendor/orders.tsx:130](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/orders.tsx:130)                     | Local pattern family. Product/Variant/order/CRM/market detail uses dl.facts; vendor.css:37.               |
| FCT-02       | Market facts                     | [apps/admin/src/market/occurrences.tsx:30](E:/coding/farmers-market-platform-web/apps/admin/src/market/occurrences.tsx:30)             | Local pattern family. OccurrenceFacts and other market details; market.css:29; same general dl structure. |
| FCT-03       | Management facts                 | [apps/admin/src/management/common.tsx:79](E:/coding/farmers-market-platform-web/apps/admin/src/management/common.tsx:79)               | Local pattern family. Entitlements, PlatformOverview, catalog/payment/POS details; management.css:14.     |
| FCT-04       | Commerce totals definition lists | [apps/storefront/src/components/Checkout.tsx:43](E:/coding/farmers-market-platform-web/apps/storefront/src/components/Checkout.tsx:43) | Local pattern family. Same SUM-01/SUM-02/03/04 row markup; checkout-totals and cart-totals CSS.           |

Codex recommendation: **FCT-02 as wrapping detail foundation**.

Rationale: Market facts adds explicit wrapping to the common existing structure; formalize a semantic facts layout plus separate monetary-row variant using current CSS.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Native dl/dt/dd, value wrapping, precision, explicit dates and field-specific labels. See the linked state profile and category table for specific gaps.

Migration notes: Undefined tokens and mobile long values need correction in a future phase; avoid introducing data formatting into a surface wrapper.

### Feature availability and entitlement presentation

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-ftr)

Boundary: Feature-specific business boundaries. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation                          | Exact source path                                                                                                        | Existing scope/adoption                                                                                           |
| ------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| FTR-01       | FeaturePanel                            | [apps/admin/src/FeaturePanel.tsx:5](E:/coding/farmers-market-platform-web/apps/admin/src/FeaturePanel.tsx:5)             | Shared admin feature. Tests exercise optionalFeature from admin-core; no app import outside tests found.          |
| FTR-02       | Vendor AvailabilityNotice and Metadata  | [apps/admin/src/vendor/analytics.tsx:47](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/analytics.tsx:47)   | Shared vendor feature. Overview and Analytics; availability and source/generation/freshness metadata.             |
| FTR-03       | Market AvailabilityState and Projection | [apps/admin/src/market/analytics.tsx:36](E:/coding/farmers-market-platform-web/apps/admin/src/market/analytics.tsx:36)   | Local market feature. MarketAnalytics; capability neutral result and projection metadata; Alert/ReadState.        |
| FTR-04       | Management Readiness and Entitlements   | [apps/admin/src/management/common.tsx:66](E:/coding/farmers-market-platform-web/apps/admin/src/management/common.tsx:66) | Shared management feature. Readiness:129 and Entitlements serve billing, platform integrations and tenant detail. |

Codex recommendation: **FTR-02/FTR-03/FTR-04 within their existing domains**.

Rationale: These are intentionally distinct policy adapters. Reuse alerts/cards/loading presentation; no single existing implementation should become universal access authority.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Denied vs unknown vs unconfigured, source freshness, quota vs readiness and safety workflows always available. See the linked state profile and category table for specific gaps.

Migration notes: Do not consolidate policy logic or gate inventory correction, history, unsubscribe or reconciliation behind optional features.

### Account mode and business switching

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-amc)

Boundary: Feature-specific controllers with shareable presentation. Competing implementations/contracts: yes.

| Candidate ID | Implementation              | Exact source path                                                                                                                                      | Existing scope/adoption                                                                                                                          |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| AMC-01       | AccountModes                | [apps/admin/src/AccountModes.tsx:8](E:/coding/farmers-market-platform-web/apps/admin/src/AccountModes.tsx:8)                                           | Shared within live admin. AdminApp controls; createPlatformAccountApi.contexts, AdminContext, onSwitch, customer/account origin.                 |
| AMC-02       | CentralAccount mode picker  | [apps/storefront/src/components/CentralAccount.astro:35](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CentralAccount.astro:35) | Local. Central account settings embedded or standalone; role affiliations, native select and linked business target; inline script updates href. |
| AMC-03       | Merchant account mode links | [apps/storefront/src/pages/account/settings.astro:83](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/settings.astro:83)       | Local. Merchant Customer profile accountContexts + ADMIN_ORIGIN; channel query links.                                                            |

Codex recommendation: **AMC-01 presentation, with AMC-02 SSR adapter**.

Rationale: AccountModes has the clearest selection controls; retain central and merchant native handoff adapters and session authority.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Affiliation choice, unavailable fallback, multi-business options and central vs merchant origins. See the linked state profile and category table for specific gaps.

Migration notes: Never cache role names as authority or combine Shop/Admin sessions; preserve channel clearing and rebootstrap before content.

### Checkout progress and stage navigation

[Detailed comparison and visual review](docs/UI_COMPONENT_AUDIT.md#category-stp)

Boundary: Commerce-specific. Single implementation or intentionally complementary adapters.

| Candidate ID | Implementation    | Exact source path                                                                                                                        | Existing scope/adoption                                                                                                      |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| STP-01       | Checkout progress | [apps/storefront/src/components/Checkout.tsx:118](E:/coding/farmers-market-platform-web/apps/storefront/src/components/Checkout.tsx:118) | Local. Checkout stages Contact/Pickup/Review/Payment/Confirmation; aria-current=step and focusable stage h2; checkout.css:6. |

Codex recommendation: **STP-01**.

Rationale: One progress implementation exists; retain the staged model and improve presentation only after commerce decisions.

Developer selection: **PENDING DEVELOPER SELECTION**.

Canonical implementation: **NOT YET APPROVED**.

Decision status: **PENDING DEVELOPER SELECTION**.

Approved scope/variants: **NOT YET APPROVED**.

Decision date/evidence: **PENDING DEVELOPER SELECTION**.

Required variants/improvements: Focus after stage, pending messages, uncertainty warnings and confirmation based on committed backend state. See the linked state profile and category table for specific gaps.

Migration notes: Do not turn labels into arbitrary clickable stages or imply confirmation from frontend progression.

### Recording a future decision

A future approved entry should specify the selected stable ID and actual source/export, allowed renderer/theme/density/semantic variants, required improvements, approval date/evidence and migration scope. Keep alternative candidates documented as retained specialist, superseded or deferred. Existing import count alone must not change status. Use the source/route guide to compare hover/focus/disabled/loading/validation/responsiveness and role prerequisites, then request the bounded implementation phase separately.
