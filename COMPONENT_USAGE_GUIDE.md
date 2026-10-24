# Component usage guide

Use `Button variant="destructive-outline"` for the approved red-outline exit/remove/cancel presentation. It has transparent fill, danger-red text/border, and solid danger-red fill with white text on hover or keyboard focus. It stays in place and retains shared radius, disabled/loading, focus and reduced-motion behavior. Native Astro buttons and links use the same variant through `buttonClassName`. This is an opt-in presentation; it does not imply a destructive business action or replace existing consumers automatically.

## Storefront visual editor composition

Vendor `/vendor/storefront` composes the existing AdminShell, Button/link presentation, Badge, SelectField, Field/Input/Textarea/Checkbox, Spinner and error states. The section sidebar, viewport surface and preview bridge are feature compositions because existing forms and the market layout designer cannot render a securely authorized Astro website. They introduce no new UI primitive or approval of pending categories. Existing typography, image-shape and ordered product controls are reused. The market appearance form remains unchanged.

`storefrontEditorSections` and `storefrontTextFields` in `@market/theme/storefront` define fixed section identities and bounded text settings. Actual Astro templates call `storefrontText` and mark their real elements with `data-storefront-text` or the small existing content bindings. Add developer-created settings to this contract and backend validation; do not create another preview renderer. Preview selection styling is scoped to preview attributes and never activates on public storefront pages. Preserve each component's existing wrapper hierarchy, semantic destinations and approved CSS contracts.

The iframe uses actual Astro routes with short-lived, host-scoped authorization. Its bridge applies validated text/theme tokens directly and submits debounced structural changes to the real SSR pipeline. Account and commerce actions remain blocked. Keep draft/save/publish versions authoritative and protect unsaved edits during navigation, business switching and logout. Editor entry/exit uses full document navigation with the selected channel retained so production embedding permissions stay confined to the editor route. See [the implementation report](docs/STOREFRONT_VISUAL_EDITOR.md).

## Financial reporting compositions

Finance layout refinement: gross sales render as upward bars, expenses as downward bars with negative display values, and profit as a line drawn above the bars. This sign conversion is presentation only. Donut tooltips overlay the area immediately below the plot without reserving space. Donut cards omit legends and empty control rows; existing arc focus, touch selection and record dialogs remain available. Expenses by category reuses `RecordCard` surface activation with a visually hidden native trigger and the existing details dialog; its selector remains an independent control.

Finance refinements reuse the existing feature controllers, shared Button, Badge, native DDN-03 disclosure contract, Dropdown, SearchableMultiSelect and form fields. No new UI primitive is introduced. Weekly KPI changes compare the latest seven account-local dates (including today) with the preceding seven, under the same market and currency scope, independently of the report period. A zero prior-week baseline with new activity is labelled rather than presented as a fabricated percentage; expense decreases are favorable. Finance actions sit at the top, with existing navigation hover/focus disclosure exposing QuickBooks, add expense, transactions and expenses, excluding report export. Expense forms use two columns between full-width description and notes, collapsing on small screens.

QuickBooks company-account mappings use the shared native disclosure/card contract and load accounts on first opening. All mapping fields are available regardless of source selection; ordinary mappings use three columns, with other mappings in the existing advanced Dropdown. All supported export sources are included in saved account connections, without a source-selection control; duplicate-export acknowledgment and backend validation remain required. Activation and Save settings stay inside the account disclosure. Record previews load automatically after both dates are valid and after subsequent date changes, with stale responses discarded and unsaved account changes requiring a save before loading. Connection and record states reuse toned Badge pills. Collected sales tax help uses the existing Field/SelectField InfoTip action extension to open the shared Dialog; ordinary InfoTip consumers retain tooltip behavior. Shared native disclosure hover/focus uses the active primary/surface theme tokens. History shows plain-language actions, dates, amounts and statuses; technical identifiers and retained payloads are inside Advanced details. Automatic sync explains its behavior in a linked shared Dialog and keeps consent and actionable warnings intact.

Finance charts use `SearchableMultiSelect` for independently visible gross, expense, and profit series. Keep period, sales scope, metric, grouping and daily values together in one row at desktop widths, with wrapping on narrower screens and for extra date/currency fields. The report read explicitly opts into `useRead`'s retained-data mode, preserving the mounted chart and one consistent previous report while a new range loads; ordinary readers retain their existing behavior. Errors clear the report instead of presenting old numbers as current.

The finance SVG adapter supports focus/hover value cards using the approved `.ui-tooltip-surface` presentation. SVG points and arcs need virtual anchors and cannot contain the HTML `Tooltip` wrapper. Preserve keyboard/touch access, Escape dismissal and existing record dialogs. Donuts include every nonzero item; negative distributions use absolute slice sizes with signed values and an explicit absolute-total label. This introduces no general chart standard.

Account time zone is a personal preference under `platformAccount.timezone`, shared across business roles. Reuse `SearchSelect` in dashboard settings and native Astro select presentation in personal settings. Finance uses account-local calendar dates and browser detection when no preference is saved. Market scheduling time zones remain independent business settings.

`apps/admin/src/finance/` composes the existing dashboard shell, approved `ui-kpi-grid`, Card, Dialog, Button, Tooltip, Field, Input, Textarea, SelectField, DataTable record details, Badge and Pagination. ProductionCost extends the existing variant workflow. Transaction and expense lists display an identifier and status, with secondary facts and actions inside shared dialogs. Preserve native focus management, optimistic expense versions and role-owned service authority.

The finance SVG adapter is a feature composition because existing analytics and loyalty charts have private domain controllers and cannot supply signed money, a zero baseline and shared finance scopes. It adds no chart library or universal chart standard. Use the same report result for cards, graphs, logs and exports. Missing costs and fees remain visibly unknown; production cost never enters customer APIs or pricing. See [financial architecture](docs/financial-reporting/architecture.md). No pending design category is approved by this feature.

## In-person checkout composition

Stage E extends the existing payment dialog, receipt and Square connection composition with native companion handoff and explicit unavailable states. It adds no browser reader controls or dashboard shell. The isolated React Native companion cannot render DOM Button, Input, Card or Alert components; its small native adapters reuse their semantic roles, spacing and touch contracts. `scripts/native-tokens.ts` derives the native color contract from the existing shared stylesheet, with a drift test. These adapters are scoped to this new renderer and do not approve a competing web standard. Native device interaction and account lifecycle stay in mobile feature controllers; cart, amount, order, inventory and refunds remain backend owned. See [Stage E architecture](docs/inPersonPayments/STAGE_E_MOBILE_ARCHITECTURE.md).

Stage D's `clover.tsx` adds a processor-owned connection/device controller and OAuth return composition. Existing Square settings cannot express Clover's v2 refresh/recovery lifecycle or merchant-provisioned serials, so this controller is separate while its presentation reuses Card with contained spacing, Badge, Button, Field, Input, Alert and the shared Dialog. Clover dialogs reuse `pos-payment-dialog`, including its 44px controls and 24px footer separation. The existing payment and original-unit refund dialogs, receipt and dashboard shell are extended in place. No new primitive or pending category is approved. See [Clover architecture](docs/inPersonPayments/STAGE_D_CLOVER_ARCHITECTURE.md).

Vendor `/vendor/pos` uses the existing AdminShell and its single page heading. `PosRegister` and `PosProductTile` in `apps/admin/src/vendor/pos.tsx` are operational feature compositions, not new UI primitives or approval of pending product/cart categories. Existing storefront product cards are Astro navigation/purchase specialists and could not supply React register quick-add, serialized draft writes and cashier-specific context. Reuse Button (including disclosure and tertiary), Card, Dialog/drawer, Field, Input, SelectField, Badge, Alert, EmptyState, Spinner and UtilityIcon. Shared presentation, keyboard focus and reduced-motion behavior remain authoritative.

The register sets the existing `--ui-control-height` token to 44px within its touch composition, including the cart content when rendered in the shared mobile Dialog. Layout CSS controls the product grid, bounded image area, cart placement and quantity input width. Do not replace button colors, borders, hover/focus contracts or dialog behavior. Tiles immediately add only an unambiguous variant; multiple variants use a shared Dialog. Favorites remain separate controls, without nesting buttons. One mounted cart content is rendered at a time so its form controls do not duplicate across desktop and mobile.

Official totals come from the backend draft; pending quantities are explicitly marked while saving. Keep the serialized queue, exact retry keys and vendor/cashier remount boundary. Customer association supplies no customer directory or login capability. Stage B enables payment through the protected backend coordinator. See [Stage A architecture](docs/inPersonPayments/STAGE_A_ARCHITECTURE.md) and [current manual testing](docs/inPersonPayments/STAGE_B_TESTING.md).

Register setup and coupon actions reuse `.ui-control-row` with `.ui-field-action` so labels, controls and feedback have independent alignment tracks. Their feature layout keeps one flexible field and one natural-width action beside each other at mobile widths too. Start checkout opens only local empty checkout UI; selecting the first variant creates the native draft and adds that variant atomically. Empty carts are excluded from Saved drafts, while existing native audit/idempotency records remain intact. Product selection also starts checkout directly when there is no active sale.

Favorites reuse icon-only Button and the shared UtilityIcon heart with optional `filled`; selection fills the heart rather than underlining it. The developer-supplied heart path uses a 2px SVG stroke. Product hearts are 28.5px (25% smaller than the previous 38px); the category-bar heart is 19px (50% smaller). At the developer's request, product-card heart buttons use a 35.2px circle (20% smaller than 44px) and the playground's 6% Grow effect through the shared hover-transform token. Shared disabled and reduced-motion guards remain authoritative. The category-bar circle remains 44px. A token-colored divider separates the fixed Favorites control from the native horizontal category scroller. Existing icon-only Buttons show overflow arrows on wider screens; mobile uses native touch scrolling. ResizeObserver updates overflow as the available width and category content change. This is register layout/controller behavior, not a new category-navigation primitive. Shared customizable Select keeps its selected content centered using its existing inner button, including at the register's touch height.

`pos-payments.tsx` adds role-owned PosPaymentDialog, PosSaleDetails, PosOrderPayment and PosRefundDialog compositions because no existing feature supplied cashier attestation, provider uncertainty, immutable receipt facts or original-unit cash returns. They reuse the existing Dialog, Button, Card, Badge, Field, Input, Textarea, Checkbox, SelectField and RouteLink. Existing Orders remains the history surface. No new primitive, design category, UI library or styling system is introduced. Preserve native dialog focus/dismissal and shared footer actions; unresolved payment/refund responses veto dismissal and retain their original operation keys. Payment sections use the established 1.5rem composition gap, shared action groups retain 0.8rem gaps, touch controls use the existing height token at 44px and Dialog retains its responsive padding clamp. These are feature layout choices, not approval of pending commerce/form categories. Geometry/accessibility qualification uses DOM/computed styles only at 1280, 768 and 390px. See [Stage B architecture](docs/inPersonPayments/STAGE_B_ARCHITECTURE.md).

## Market challenge compositions

Import `MarketChallengeCard`, `MarketChallengeTermsView`, `challengeRequirement`, `challengeAmount` and `challengeKindLabels` from `@market/ui/loyalty`. Load the existing loyalty stylesheet. These compositions combine the existing Card, Badge, UtilityIcon and ring because vendor point wallets do not express occurrence objectives and manager-described promises. Pass backend `MarketChallenge` facts, including finalized/pending progress, window provenance and issued claim state. Pass `onOpen` to use shared RecordCard surface activation and a visually hidden native keyboard target, without a visible View button. Preview cards omit `onOpen` and remain static. Challenge names have spacing above them and share a row with the status at the right. Keep Claim Reward as an independent action in card children; it must not also trigger card details. Render promised multiline text as ordinary escaped text, preserving line breaks.

The manager wizard has a padded action row. Its underlined See common rewards link opens a shared Dialog containing plain-text reward ideas; suggestions are not buttons and do not overwrite the custom description. Manager occurrence activity uses three cards for customers, orders and eligible spending, following the existing vendor graph and values-dialog presentation. Customers are counted once per occurrence, so a cross-occurrence sum is labelled customer participations. `MarketOccurrenceActivityCard` is a market feature adapter because the vendor graph controller is private and tied to daily point metrics and vendor API filtering; it reuses shared Card, Button, Dialog and loyalty chart styles without importing a vendor controller.

For fixed objectives, `LoyaltyProgressRing` accepts optional `display: { value, caption, detail }`. Supply one positive target in `milestones`, the finalized quantity in `available`, and accessible numeric detail such as `2 / 3 vendors` or `$75.00 / $150.00 spent`. The arc caps at 100%; the actual achieved total stays visible. Omitting `display` retains the vendor cumulative milestone behavior. Reuse LoyaltyRedeemButton eligibility and reduced-motion styling for Claim Reward; pending progress never authorizes it.

MarketChallengeWizard, CustomerMarketChallenges and manager fulfillment details are role-owned feature controllers built from existing forms, Tabs, Dialog and DataTable record details. No existing composition supplied this objective/occurrence/promise workflow, which is why they were added. Do not reuse their admin services in customer UI. The feature introduces no new primitive, design approval, notification stream, point currency or monetary accounting rule. See [market loyalty architecture](docs/MARKET_LOYALTY_CHALLENGES.md).

## Loyalty progress and redemption

Import `LoyaltyProgressRing`, `loyaltyProgress` and `LoyaltyRedeemButton` from `@market/ui/loyalty`, and load `@market/ui/loyalty.css` alongside the existing shared stylesheet. The ring receives the actual available balance and configured point costs. At 3,500 with 2,000/5,000 milestones, the primary arc covers 70%; the entire remaining track uses a slightly stronger translucent primary tint after a milestone is achieved. Do not overlay an old-color segment. The arc animates from zero to the current position on load, with reduced motion showing its final position immediately. Center the SVG in its card. Equal-cost rewards share a milestone. Preserve the single interpolated SVG title for SSR hydration and numeric accessibility.

`LoyaltyRedeemButton eligible={reward.available}` composes Button. Its requested eligibility attention state combines a gentle bounce with a slow brightness/glow flash, keeping the label continuously readable. Loading and disabled remove this state; reduced motion removes both animations. Dashboard review never spends points. Keep request locks and uncertainty handling in the feature controller.

Reuse the existing dashboard shell/navigation adapters and the approved Card, Badge, UtilityIcon, Dialog, DataTable record details, Pagination and form/search controls for loyalty compositions. The wizard uses SearchSelect for its required free-product variant and SearchableMultiSelect for optional discount restrictions. Free products already exist in the real cart and require additional paid merchandise from that vendor. Native inventory and paid-unit accounting remain authoritative. Do not build a second cart, payment flow, coupon engine, notification stream or balance cache for a visual preview. See [the registry](UI_COMPONENTS.md#loyalty-foundation-extension-2026-10-17).

Customer wallet summaries use `RecordCard` with optional `header` and `renderTrigger(props)` adapters. Its header is a left-aligned icon and plain heading. Render exactly one eligible `LoyaltyRedeemButton` with the supplied trigger props; the only copy below the ring is the next-reward caption. Pending/reserved/debt explanations belong in details. Ordinary RecordCard triggers remain unchanged for other consumers.

`Dropdown` supplies the history disclosure. Its content is a semantic list of shared disclosure Buttons with activity labels and success/danger Badges showing signed points. Details retain vendor, date, pending amount, original items and order link. There is no customer history table. Vendor leaders reuse RecordCard with full gold/silver/bronze tinted surfaces and top-right UtilityIcon trophy/medal variants. Visible rank numbers remain in the full table, not these cards; accessible place labels and card dialogs retain meaning.

`CheckoutLoyalty` is reused in both carts and checkout. Dashboard choices travel to `/cart?loyalty=<version>` and are remembered by a short-lived HTTP-only same-storefront cookie, never web storage or a reservation. `Use Rewards` remains after application: its dialog can remove the choice or atomically replace it. It is disabled without an available option or an editable current choice, and once payment locks the cart. Invalid replacements preserve the original selection. Native coupon removal also cancels an unreserved loyalty choice. Vendor View daily values Buttons open shared Dialogs with UTC date fields, real scoped graphs and every daily value including zeros; ranges are limited to 366 days.

## Notification context and operational readiness

Notifications is a permanent entry in the existing Customer navigation adapter and AdminShell navigation for Vendor and Market Manager modes. Keep the bell and its shared global unread store. `/notifications`, `/notifications/settings` and `/notifications/unsubscribed` share one sidebar active state. Reuse the shared bell icon, icon rail, Tooltip and mobile drawer contracts; do not add a second unread query or a role-specific inbox.

Use `NotificationRole` and `NotificationContext` from `@market/ui/notifications`. The context pairs in `notifications.css` use blue for Customer, amber for Vendor, green for Market Manager and purple for Account. Each has a readable foreground/background pair and a dark-mode equivalent. Keep the text and icon. These are context variants of the existing Badge composition, independent from critical/operational/informational severity. The same composition is used in previews, rows, details, role picker options and subscription scopes. Native select fallbacks keep their text labels.

Action labels come from backend destination metadata after current inbox authority checks. Render `action_label` only with a usable authorized destination. The destination may be a list, so preserve accurate labels such as View Market Relationships, View Orders and View Payment Settings. Unknown or revoked destinations use an unavailable state. Do not restore a generic Open related record fallback or derive labels by matching notification prose.

`ReadinessChecklist` in the Market occurrence operations page is a feature composition of Card, Badge, Button, RouteLink and the existing read/error lifecycle. No existing component combined live occurrence, participation, document, policy and exception facts, which is why this composition was necessary. It adds no new primitive or approved design category. It has no completion checkbox or local completion state. Show current source counts, explanation, resolution links and an as-of timestamp. Canceled, past and unavailable sources must never appear completed. The daily summary remains compact in the inbox and links to existing date-specific readiness reports.

## Shared notification inbox

Use `NotificationCenter` from `@market/ui/notifications` and `@market/ui/notifications.css` for every role's bell, inbox, settings and unsubscribed view. These feature compositions reuse the approved primitives and shared dashboard adapters. Customer SSR uses a small CustomerNotifications island and a same-origin API adapter, without importing an Admin controller. The bell stays outside the mobile dashboard menu. See [notification architecture](docs/IN_PLATFORM_NOTIFICATIONS.md).

The explicitly requested email-style inbox is a specialist list. Its row button, selection checkbox and compact independent inline actions intentionally coexist; the ordinary DataTable record-name-only pattern does not apply. Mobile actions reuse DDN-03 and details/confirmation reuse DLG-02. Button, Tooltip, Checkbox, Badge, form controls and Pagination retain their existing contracts. Existing primitives did not provide recipient inbox state, cross-context filters or scoped unsubscribe behavior, which is why these reusable feature compositions were added. No pending design category or competing primitive is approved by this addition.

Read this before implementing or significantly changing frontend UI. Reuse approved components before introducing feature-local replacements. [UI_COMPONENTS.md](UI_COMPONENTS.md) is the authoritative design-decision registry; this guide describes current imports and practical usage, not new approvals.

The UI foundation from Phases A through D is established for feature development. Final design polishing may happen later. There are **20 approved and implemented categories**, retained specialists with intentional interactions, and **27 categories pending developer selection**. Implementation does not establish manual visual acceptance. Historical source descriptions in the registry record the approval baseline; use the current implementations below.

## Shared UI refinement

Theme preset options in Settings include four small rounded color squares beside their name, also retained in the selected value. Their order is primary, secondary, dashboard background and card surface. Use the existing SelectField customizable picker, with `.ui-palette-select` styles, decorative swatches hidden from assistive technology and the native text fallback. Preset selection still previews until Save.

The preset field and popup use half the available form width on desktop and tablet, and full width below 768px. Shared table striping/hover, native and searchable dropdown highlights, popup surfaces, the platform mark/name and Account mode labels consume the current palette tokens. Reuse those shared rules rather than adding fixed green fills or feature-specific overrides. Semantic status colors remain unchanged.

The 2026-10-16 [registry refinement](UI_COMPONENTS.md#shared-ui-refinement-2026-10-16) governs the new `DataTable.recordDetails` opt-in, `RecordCard`, `SearchableMultiSelect`, `IconButton`, `Tooltip` and `MarketPlatformLogo` exports. It also documents `DocumentVersionPicker` from `@market/ui/documents`. Reuse a feature's complete existing dialog through `recordDetails.onOpen` when possible. Ordinary native keyed rows can retain all original cells and move those cells into the shared detail dialog. Financial/comparison and in-dialog history tables remain specialists.

AdminShell now keeps a 76px desktop icon rail, with its panel control inside the sidebar and a separate preserved mobile menu. Customer SSR keeps its existing navigation adapter. Dashboard colors belong to the authenticated user through the existing durable backend settings store, and are edited in admin Settings. The preview includes primary, secondary and tertiary buttons. The shared SelectField offers Workspace default plus Forest, Ocean, Clay, Plum and Slate palettes from `dashboardPalettePresets` in `@market/theme`. Choosing a preset changes the draft and preview until Save; further color edits are identified as Custom colors. Cancel returns to the saved palette, and Restore defaults previews the workspace defaults. These are explicitly requested bounded extensions, with developer visual review pending. See the [implementation, coverage and manual verification report](docs/UI_DESIGN_REFINEMENT.md).

The selected site-wide standard uses 40px buttons, at least 22px roundness and 18px horizontal padding, rectangular matching inputs, borderless utility icons, a guarded circular header X for dialogs, top-layer Tooltip/InfoTip and native centered multi-select checkboxes. Reserve 3rem before select chevrons. Contrast tips are optional; only invalid HEX/token data blocks saving. Pointer selection does not show keyboard focus rings. All enabled action buttons use the shared soft shadow; tertiary, icon-only and disclosure controls stay in place on hover and keyboard focus, while ordinary primary/secondary/destructive actions slide up 4px. This includes stationary sidebar collapse, refresh, modal X and record-name controls regardless of their fill variant. Primary hover fills darken the primary by 28%, while secondary/tertiary fills use the soft 10% primary/surface mix. Disabled controls and reduced motion retain their safeguards. Grow remains in the playground for later use. These rules supersede historical 50px/44px geometry and footer Close examples.

Horizontal view navigation uses TAB-01, independently of BTN-01 effects. Reuse `Tabs` for in-page views and `RouteLink variant="tab"` inside `.ui-tabs` for real routes. The current view has a solid 3px primary underline; other entries animate a 35%-opacity underline on hover or keyboard focus. Keep transparent backgrounds, square corners, no shadow and no movement. Do not add Button or buttonClassName classes. In-page tabs retain native non-submitting controls, tab roles, panel associations, arrow/Home/End navigation and disabled handling; route links retain hrefs and current-page state. Reduced motion disables underline animation.

## Quick reference

Phase 3 adds feature compositions inside the existing Documents workspace for versioned agreements, date-specific readiness, exceptions, reports and source-backed guidance. They reuse the documented Card, Dialog, form controls, SEL-03, DDN-03 native disclosure, DataTable, Tabs, Pagination and document status contracts. The shared upload/share compositions accept the narrower `DocumentFileApi`, allowing the Shop adapter to retain only file operations. No new UI primitive or design-category approval was introduced. See [Phase 3 implementation](docs/DOCUMENTS_COMPLIANCE_PHASE_3.md) for controllers, limits and verification.

Phase 2A reuses the existing document domain compositions through `@market/ui/documents`: `DocumentUploadWarning`, `MetadataFields`, `DocumentUploadDialog`, `DocumentShareDialog`, `DocumentStatus` and `DocumentFeedback`. Admin Documents and the public application use role-specific API adapters, without importing an Admin controller into the application island. Ordinary document choices use SEL-03 `SelectField`; document tones are centralized in `@market/ui/document-status`. `Tabs` accepts optional `initialTab` by label, retaining its first-enabled-tab default. These compatible reuse extensions do not approve another design category. See [Phase 2A integration](docs/DOCUMENTS_PHASE_2A_APPLICATION_INTEGRATION.md).

The Vendor/Market Documents feature in `apps/admin/src/documents/` composes the existing dashboard, Card, Alert, Dialog, form controls, Badge, Tabs, DataTable and Pagination. Its upload warning and metadata forms are shared within that feature because no existing component supplies the document policy and scan lifecycle. It uses safe file-type placeholders. This feature does not approve an upload-design category or introduce new shared primitives. See [Documents and compliance](docs/DOCUMENTS_AND_COMPLIANCE.md).

React symbols below are named exports from `@market/ui`, implemented in [packages/ui/src/index.tsx](packages/ui/src/index.tsx), with form controls in [form-controls.tsx](packages/ui/src/form-controls.tsx), dashboards in [dashboard.tsx](packages/ui/src/dashboard.tsx), and dialogs in [dialog.tsx](packages/ui/src/dialog.tsx). Pure helpers are named exports from `@market/ui/presentation`, implemented in [presentation.ts](packages/ui/src/presentation.ts). All approved presentation uses `@market/ui/styles.css`, already loaded by the application entry/layout.

Astro adapters are default imports from `apps/storefront/src/components/ui/`; use the relative path appropriate to the caller. CSS classes are presentation contracts, not exported React components.

| Category              | Approved component                                           | Source/import                                                                                                                                                                                 | Important variants                                                                                                                                             |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BTN-01                | `Button`; native Button adapter; action anchors              | `@market/ui`; `components/ui/Button.astro`; `buttonClassName` from `@market/ui/presentation`                                                                                                  | `variant`: primary, secondary, tertiary, destructive, destructive-outline, disclosure; `size`: default, compact; `iconOnly`, `loading`; explicit native submit |
| INP-02                | `Input` with existing `inputContract`; native input classes  | `@market/ui`; `inputClassName` from `@market/ui/presentation`                                                                                                                                 | Ordinary text-like inputs; native constraints and controlled/default values; OTP is INP-03                                                                     |
| SEL-03                | `Select`, `SelectField`; native select classes               | `@market/ui`; `selectClassName` from `@market/ui/presentation`                                                                                                                                | Ordinary or status presentation; optional/required; native multiple/size semantics; SEL-07 remains separate                                                    |
| CRD-02                | `Card`; native semantic card classes                         | `@market/ui`; `cardClassName` from `@market/ui/presentation`                                                                                                                                  | `as`: div, article, section, li, fieldset; `spacing`: block/contained; `padding`: default/none; `surface`: card/embedded                                       |
| DLG-02                | `Dialog`, `Drawer`, `DialogProps`                            | `@market/ui`                                                                                                                                                                                  | Wide 900px default; standard 480px; Drawer defaults standard; `busy`, `beforeClose`, `focusTitle`, description, actions, render-prop dismissal                 |
| DSH-01                | `DashboardFrame`; native frame adapter                       | `@market/ui`; `components/ui/DashboardFrame.astro`; `dashboardClasses`                                                                                                                        | React sidebar/header/children and `collapsed`; Astro sidebar/header/default slots; role controllers remain separate                                            |
| SID-01                | Shared sidebar classes and icon paths                        | `dashboardClasses`, `navigationIconPaths`, `installDashboardSidebarToggle` from `@market/ui/presentation`; AdminShell and CustomerNavigation adapters                                         | Role-owned links, active/grouped navigation, collapse/inert state; desktop `panel-left` icon; no standalone Sidebar export                                     |
| HDR-01                | Shared topbar presentation                                   | `dashboardClasses.header`; AdminShell; `layouts/CustomerLayout.astro`                                                                                                                         | Context/title beside desktop toggle, one action toolbar; existing account controls; specialist editor header retained                                          |
| DDN-03                | `Dropdown`; native details presentation                      | `@market/ui`; `disclosureClassName` from `@market/ui/presentation`; `.ui-disclosure-content`                                                                                                  | Native ordinary/nested disclosures; feature-owned expansion/drafts; saved-layout animation remains DDN-02                                                      |
| BDG-02                | `Badge` with supplied tone; native status classes            | `@market/ui`; `statusBadgeClassName` from `@market/ui/presentation`                                                                                                                           | success, warning, danger, info, neutral; without `tone`, Badge retains non-status tag appearance                                                               |
| ALT-01                | `Alert`, `ErrorState`, `ErrorBoundary`; native alert classes | `@market/ui`; `alertClassName` from `@market/ui/presentation`                                                                                                                                 | success, partial, warning, error, info, neutral; live urgency is separate from severity                                                                        |
| EMP-02                | `EmptyState`; native empty-state adapter                     | `@market/ui`; `components/ui/EmptyState.astro`; `.empty-state`                                                                                                                                | Title, explanation, contextual action; React `level` defaults 3, Astro defaults 2; choose hierarchy explicitly                                                 |
| LOD-01                | `Spinner`, separate `Skeleton`                               | `@market/ui`; `.progress`, `.spinner`, `.skeleton` in shared CSS                                                                                                                              | Spinner `label`; reduced motion; retain read/retry and request-lock controllers                                                                                |
| TBL-02                | `DataTable`, `Table`, `TableHead`, `TableBody`               | `@market/ui`; vendor/market common re-export DataTable; `.ui-table`, `.table-scroll` for native adapters                                                                                      | Caption/scopes, supplied `sort` announcement, ordinary wrapping; `wide` opt-in only for justified accessible overflow                                          |
| KPI-01                | CSS tile contract on native markup                           | `.ui-kpi-grid` in shared CSS; existing `pages/account/index.astro` and `vendor/overview.tsx` patterns                                                                                         | Static/linked tiles, dl/dt/dd, visible supplementary facts; no KPI React export                                                                                |
| FIL-01 through FIL-05 | Existing five feature forms, composed from approved controls | FIL-01 `RangeForm` in `apps/admin/src/market/common.tsx`; FIL-02 vendor/management forms; FIL-03 public catalog GET forms; FIL-04 operations toolbars; FIL-05 `pages/account/[section].astro` | `.ui-control-row`, `.ui-control-row-lookup`, `.ui-field-action`; no universal FilterBar export or query controller                                             |
| TAB-01                | `Tabs`; real route links with shared presentation            | `@market/ui`; `.ui-tabs` and `.ui-route-tab`; admin `RouteLink` in `vendor/common.tsx`                                                                                                        | In-page items with label/content/disabled; route links keep href/current-page state; TAB-02 editor retained                                                    |
| PAG-01                | `Pagination`; existing native paging links                   | `@market/ui`; `.ui-pagination`; admin management `Pager` and existing customer/catalog adapters                                                                                               | Supplied summary, callbacks, Previous/Next labels and availability; actual counts/ranges retained                                                              |
| MOB-01                | `DashboardMenu`; native menu adapter                         | `@market/ui`; `components/ui/DashboardMenu.astro`; `installDashboardMenu` from `@market/ui/presentation`                                                                                      | One right-aligned hamburger at 767px and below; desktop toolbar at 768px and above; same mounted actions                                                       |
| SCH-03 / SCH-01       | `SectionHeader`; native heading classes                      | `@market/ui`; `sectionHeadingClassName` from `@market/ui/presentation`; `.ui-section-title-dashboard`, `.ui-section-title-consumer`                                                           | `variant`: dashboard/consumer; `level`: 2/3/4; `id`, action/content children; page headings remain pending                                                     |

FIL source families: `apps/admin/src/vendor/{catalog,customers,orders,analytics,markets}.tsx`, `apps/admin/src/management/{platform,catalog}.tsx`, `apps/storefront/src/pages/products/index.astro`, `apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro`, and `apps/admin/src/market/phase14/{Directory,Assignments}.tsx`. They retain separate query models; reuse the applicable form rather than importing a controller across role or renderer boundaries.

## React examples

These examples use current APIs. Callback and data props belong to the calling feature. Import the shared stylesheet once through the existing entry, not per control. Form labels and native semantics are retained even though the broader FLD category is pending.

Ordinary buttons, form fields, selects, cards, section headings and aligned filters:

```tsx
import type { FormEvent } from 'react';
import {
  Button,
  Card,
  Field,
  Input,
  SelectField,
  SectionHeader,
} from '@market/ui';

export function SearchFilters({
  onApply,
}: {
  onApply: (query: string, visibility: string) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onApply(String(data.get('q') ?? ''), String(data.get('visibility') ?? ''));
  }
  return (
    <Card as="section" aria-labelledby="filter-title">
      <SectionHeader title="Filter records" id="filter-title" />
      <form className="ui-control-row" onSubmit={submit}>
        <Field id="record-query" label="Search records">
          <Input id="record-query" name="q" type="search" />
        </Field>
        <SelectField
          id="record-visibility"
          name="visibility"
          label="Visibility"
        >
          <option value="">All visibility</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </SelectField>
        <div className="ui-field-action">
          <Button type="submit">Search</Button>
        </div>
        <div className="ui-field-action">
          <Button type="reset" variant="secondary">
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

The sample option values are owned by this example's callback. Real features must keep their existing backend identifiers, allowed values, validation and paging resets. `SelectField` is optional by default; set `required` only when the feature requires it. `Field` does not automatically associate errors for arbitrary children: supply `aria-invalid` and `aria-describedby` on `Input` when needed. `SelectField` supplies its error association. `Input` applies the existing name-based `inputContract`; inspect that contract before choosing field names or overriding native constraints.

Dialogs preserve native submit validation and form association. Pass existing save/pending/close policies from the feature:

```tsx
import { useId, type FormEventHandler } from 'react';
import { Button, Dialog, Field, Input } from '@market/ui';

export function EditNameDialog({
  open,
  busy,
  onClose,
  onSave,
  beforeClose,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: FormEventHandler<HTMLFormElement>;
  beforeClose?: () => boolean;
}) {
  const formId = useId();
  const nameId = useId();
  return (
    <Dialog
      open={open}
      title="Edit name"
      onClose={onClose}
      busy={busy}
      beforeClose={beforeClose}
      actions={
        <Button type="submit" form={formId} loading={busy}>
          Save
        </Button>
      }
    >
      <form id={formId} onSubmit={onSave}>
        <Field id={nameId} label="Name">
          <Input id={nameId} name="name" required disabled={busy} />
        </Field>
      </form>
    </Dialog>
  );
}
```

`onSave` keeps the existing command handling and prevents default navigation when appropriate. Dialog adds the secondary Close after `actions`. Avoid an extra independent Close footer. Use `children={(dismiss) => ...}` for embedded dismissal and preserve `showClose={false}` only when the caller already provides the whole action row.

Status, table, empty-state and pagination presentation uses caller-owned facts:

```tsx
import { Badge, DataTable, EmptyState, Pagination } from '@market/ui';
import type { StatusTone } from '@market/ui/presentation';

type Row = { id: string; name: string; statusLabel: string; tone: StatusTone };
export function Records({
  rows,
  summary,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  rows: readonly Row[];
  summary: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <>
      {rows.length ? (
        <DataTable label="Records" headings={['Name', 'Status']}>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.name}</th>
              <td>
                <Badge tone={row.tone}>{row.statusLabel}</Badge>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No records match" level={3}>
          <p>Try another search.</p>
        </EmptyState>
      )}
      <Pagination
        label="Record pages"
        summary={summary}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </>
  );
}
```

Render this branch only after a successful read; loading, denied, unavailable and failed requests retain their own states. Supply truthful `summary` from the current page/count. `sort={{ heading: 'Name', direction: 'ascending' }}` announces existing sorting; DataTable does not implement sorting. Keep status labels and tones in the existing feature mapping; approval of BDG-02 does not approve a universal enum map. An EmptyState action can be a real anchor styled with `buttonClassName({ variant: 'secondary' })` or an existing Button callback.

## Astro SSR examples

Use native adapters and pure helpers. Do not import AdminShell/AdminApp or administrative services, or hydrate a whole page just to share styles. Keep each route's existing authentication, verification, private/no-store headers, data reads, URLs and session authority outside presentation examples.

The following markup fits a file under `apps/storefront/src/pages/account/`, after its existing authenticated route setup. It demonstrates native forms and presentation; preserve the actual route's query names and values:

```astro
---
import Button from '../../components/ui/Button.astro';
import CustomerLayout from '../../layouts/CustomerLayout.astro';
import {
  buttonClassName,
  inputClassName,
  cardClassName,
  sectionHeadingClassName,
} from '@market/ui/presentation';
---

<CustomerLayout title="Followed Markets" path="/account/markets">
  <section class={cardClassName()} aria-labelledby="market-search-title">
    <header class={sectionHeadingClassName('dashboard')}>
      <h2 id="market-search-title">Find markets</h2>
    </header>
    <form method="get" action="/account/markets" class="ui-control-row">
      <div class="field">
        <label for="market-search">Search markets</label>
        <input
          id="market-search"
          name="search"
          type="search"
          maxlength="100"
          class={inputClassName('search')}
        />
      </div>
      <div class="ui-field-action">
        <Button type="submit">Search</Button>
      </div>
    </form>
    <a
      class={buttonClassName({ variant: 'secondary' })}
      href="/account/settings"
    >
      Account settings
    </a>
  </section>
</CustomerLayout>
```

Additional native snippets use these imports. Place feedback and empty-state snippets only in the existing truthful outcome branches; these are presentation examples, not unconditional success or empty-data logic:

```astro
---
import EmptyState from '../../components/ui/EmptyState.astro';
import {
  buttonClassName,
  selectClassName,
  alertClassName,
} from '@market/ui/presentation';
---

<div class="field">
  <label for="page-size">Results per page</label>
  <select id="page-size" name="take" class={selectClassName()}>
    <option value="10">10</option>
    <option value="20">20</option>
  </select>
</div>
<p role="status" class={alertClassName('success')}>
  Preferences updated.
</p>
<p role="alert" class={alertClassName('error')}>
  The request could not be completed.
</p>
<EmptyState title="No followed markets" level={3}>
  <p>Explore markets to find an upcoming event.</p>
  <a
    slot="action"
    href="/account/markets"
    class={buttonClassName({ variant: 'secondary' })}
  >
    Explore markets
  </a>
</EmptyState>
```

The select demonstrates markup only; retain the feature's supported choices and query handling. `sectionHeadingClassName('consumer')` is for consumer sections; use `.ui-section-title-dashboard` or `.ui-section-title-consumer` on an existing h2/h3/h4 when no action header wrapper is needed. Native helpers add presentation only, so preserve constraints, associated feedback IDs, names/values and autocomplete explicitly. Import only helpers actually used in the final file.

CustomerLayout composes the native DashboardFrame sidebar/header slots and DashboardMenu navigation/default slots. Keep CustomerNavigation's established role links. Its desktop sidebar enhancement does not hydrate React. The header loads authorized affiliations through the existing server-side customer account API and hydrates only the shared `AccountModeSelect` island. Admin `AccountModes` uses that same select presentation with its existing controller. Customer choices navigate to the existing purpose-bound Admin handoff; no Admin API or controller is imported into customer UI. Native links remain available without JavaScript. See [account switching and authentication](docs/ACCOUNT_SWITCHING_AUTH_ARCHITECTURE.md).

CustomerLayout already contains secure logout. Do not add a second header logout or change `POST /api/account` with hidden `action=logout` into a GET link. Native customer GET search, follow POST actions and existing account forms keep their original destinations and authority.

## Dashboard development rules

- Reuse DSH-01 DashboardFrame, SID-01 sidebar presentation and HDR-01 topbar structure. Administrative Platform/Market/Vendor dashboards remain React AdminShell consumers; customers remain Astro CustomerLayout consumers.
- Use SCH-03 ordinary internal section headings, CRD-02 cards, KPI-01 `.ui-kpi-grid`, TBL-02 ordinary tables and BDG-02 status presentation. Keep semantic heading levels and dl/table/list structures.
- Desktop sidebar controls use `navigationIconPaths['panel-left']`, BTN-01 icon sizing and `dashboardClasses.sidebarToggle`. Labels describe Collapse sidebar or Expand sidebar, with `aria-controls`, `aria-expanded` and inert collapsed navigation.
- Preserve role-specific authorization/navigation sources. Shared presentation must not import admin services or act as tenant, role, entitlement or session authority.
- Keep MOB-01: one right-aligned hamburger at 767px and below, desktop sidebar control at 768px and above. Keep the single toolbar mounted and native details/summary behavior. Do not duplicate account controls or create a second mobile menu.
- Customer account switching is available inside the same mounted toolbar on desktop and the existing mobile menu. Administrative account/workspace controls keep their existing placement and controller.
- Preserve the full-screen editor header, layout tools, dirty/save/version policies and canvas geometry. Do not force these specialists into ordinary dashboard markup.

## Permanent control alignment contract

The ordinary reference is `--ui-control-height: 40px`, superseding the historical 50px signup reference. Buttons use at least 22px roundness and 18px horizontal padding; inputs/selects retain their existing rectangular shape. Use border-box sizing, shared font metrics and native border/padding. Inputs and ordinary single-value selects have this outer height; ordinary buttons have the same minimum and can grow for wrapped labels. Compact and disclosure buttons share the selected ordinary geometry. Icon-only buttons use a 40px circle with zero text padding. OTP, textarea and native listboxes retain their own geometry.

| Existing class                 | Use                                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.ui-inline-controls`          | Unlabelled adjacent input/action row, 0.5rem gap; flexible zero-minimum-width input and natural-width button. Labels/feedback outside the row.            |
| `.ui-control-row`              | Labelled search/filter form; Field, SelectField or compatible `.field`/`.ops-field` wrappers share label/control/feedback tracks and responsive wrapping. |
| `.ui-field-action`             | Action inside a control row, aligned to the control track; never put it in a label/helper paragraph.                                                      |
| `.ui-control-row-lookup`       | Add to `.ui-control-row` for one flexible lookup field and one natural-width action. Uses `minmax(0, 1fr) max-content`; stacks below 600px.               |
| `.ui-actions.ui-modal-actions` | Modal submit/confirm actions; flex wrapping, equal stretched heights, 0.8rem horizontal and vertical gaps. Dismissal belongs to the header X.             |

Keep action widths natural, `min-width: 0` on flexible fields, correct horizontal/vertical gaps and feedback associations. Outside the shared intentional hover lift, do not add arbitrary negative margins, layout translations, full-width lookup buttons, equal-width action columns or competing contextual height rules. Semantic primary/secondary/destructive appearance is separate from geometry. See the [Phase A alignment contract](docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md#c-permanent-form-control-alignment-contract).

## Dialog construction rules

Use shared Dialog/Drawer or the existing delegating MarketDialog adapter. There is no separate native Astro dialog adapter today. Reuse an existing appropriate React island for interactive dialog behavior; do not invent another lifecycle or hydrate the entire Astro page.

Keep DLG-02 native showModal, focus behavior/restoration, enter/exit animation, reduced motion, callbacks, busy protection and existing `beforeClose` veto policy. Backdrop dismissal is false by default. `focusTitle` defaults true. Parent `open=false` is authoritative; changing parent state directly bypasses guarded user dismissal, so any feature-owned discard control must use the supplied `dismiss` render callback. Every dialog includes the shared guarded circular header X.

Use `actions` for the primary submit/confirm action, or the existing composed `.ui-actions.ui-modal-actions` pattern when the body owns its action row. Do not add a footer Close button; the shared header X supplies dismissal. Maintain equal ordinary heights, natural widths and 0.8rem gaps. Footer submitters preserve `type="submit"`, `form={formId}`, native validation, names/values and feature callbacks. Preserve existing pending and draft-discard/veto semantics rather than inventing new policy for presentation. See [Phase B](docs/UI_COMPONENTS/Phase-B-Dialog-Consolidation.md).

## Retained specialists

| Specialist                                 | Preserve                                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INP-03 OTP in `pages/account/verify.astro` | Six digits, paste, keyboard navigation, aggregation, autofill, verification and approved focus cue.                                                                                               |
| SEL-02 status selects                      | Exact values/labels and domain colors; shared Select `variant="status"` or `selectClassName('', 'status')` retains specialist appearance.                                                         |
| SEL-07 `SearchSelect`                      | Searchable combobox selection/keyboard/active-descendant/blur and clear behavior; placeholder is not an option. Shared export is in `@market/ui`; Market presentation re-exports it.              |
| CRD-04 / DDN-02 saved layouts              | `AnimatedDisclosure` in `apps/admin/src/market/presentation.tsx`, heading hover, animation, lazy mounting, inert state and existing operations.                                                   |
| Drawer                                     | Shared Dialog lifecycle with retained edge placement, scrolling and compact default; do not replace with a competing modal.                                                                       |
| BDG-03 booth status                        | Existing text, mapping, colors and map cues; approved decorative dot removal does not remove actual state information.                                                                            |
| TBL-03 invoice                             | `InvoiceTable` in `apps/admin/src/market/phase14/InvoiceTable.tsx`, original data/money formatting, measured description allocation, printing and accessible scrolling. Do not apply `.ui-table`. |
| Wide financial tables                      | Existing `DataTable wide` only where many independent columns require readable, labelled keyboard-accessible scrolling; do not hide or truncate data.                                             |
| TAB-02 layout editor                       | Tool/panel state, specialized tabs and route editor interactions.                                                                                                                                 |
| Map/canvas presentation                    | Existing viewport/coordinates, ResizeObserver, text alternatives, keyboard/touch controls, tooltip bounds and read/edit distinction. MAP remains pending selection.                               |
| Native Astro account/forms                 | SSR, original form actions, submitters, session/verification authority and secure POST logout.                                                                                                    |

Do not destroy specialist functionality to force reuse. Approval of a surface does not approve domain mappings, merge controllers or authorize a migration. Document why an existing primitive/adapter cannot serve a new reusable pattern before creating one; preserve the same approved presentation contract where renderer differences require native markup.

## Pending categories

**27 UI categories remain pending developer selection.** Do not choose or canonicalize them automatically. Examples include page headings, checkbox/radio behavior, quantity controls, commerce UI and account-switching controllers. Existing shared exports in these categories are reusable code, not proof of design approval. Reuse relevant existing implementations and preserve their behavior; consult the developer before introducing a competing design standard. The registry's recommendations and the migration plan do not authorize implementation.

## New feature checklist

Square Payment Integrations in `apps/admin/src/vendor/square.tsx` is a domain composition of existing Card, Dialog, Button, Badge, Field, Input, SelectField, Alert, Spinner and route controls. Reuse the existing AdminShell/settings navigation and POS payment/receipt/refund compositions. Keep processor state and verification on the backend; never treat a browser return as payment evidence. Its `.square-integration` scope reuses the established POS touch-height token and layout spacing. No new primitive, pending-category approval or renderer-wide migration is implied. See [Stage C UI and qualification](docs/inPersonPayments/STAGE_C_TESTING.md).

1. Read this guide and consult UI_COMPONENTS.md.
2. Search for relevant existing approved components and consumers.
3. Use shared imports, classes and appropriate renderer adapters.
4. Preserve specialist interactions and domain logic.
5. Avoid duplicate CSS and ancestor overrides of approved variants.
6. Preserve React/Astro boundaries and backend/session authority.
7. Add only necessary focused tests and perform task-required checks.
8. Document new reusable patterns, deviations or API changes without silently approving pending categories.

## Vendor homepage options

Harvest vendor homepage shapes and typography are validated options within the existing theme. Reuse the brand font tokens and --storefront-card-radius derived from button shape for the featured Card composition. ProductCards remains the catalog renderer; its featured variant uses the approved Card/Button presentations, a stretched native link and independent purchase controls. Market compositions and pending registry categories retain their current scope. Vendor Homepage About is feature-owned authored content, separate from the optional full About page.

Storefront editor tools extend the existing UtilityIcon/IconButton with desktop, tablet, mobile, expand, restore and external-link glyphs. The shared `button-selection-fill` opt-in retains pressed semantics and selected fill without an underline; other consumers retain their current selection presentation. Vendor section settings use the existing native DDN-03 disclosure card contract, mounting only the open card's controls and animating that mounted content with reduced-motion support. Undo/Redo precede the cards. Page/example product reads are deferred until the page selector is used, and About settings do not load product choices. Color palettes reuse the existing ui-palette-select/swatch presentation. No new primitive or competing styling system is introduced.

## Find Us schedule disclosures

Find Us uses the shared native `.ui-disclosure` surface/content and size-animation contract in a two-column month grid. The opt-in `data-disclosure-icon="plus"` presentation changes the existing masked disclosure icon from a chevron to a plus, rotating to close on expansion. Other consumers retain their existing icons. Reduced-motion behavior remains shared. Market website actions reuse `buttonClassName({ variant: 'secondary' })` and validated public market storefront origins; no competing button or disclosure component is introduced.

Storefront text-size controls compose existing Field/Input with native range inputs. Keep sizing in the bounded appearance `textSizes` presentation contract and use `storefrontTextSizeCss` for both SSR and preview. Scale existing responsive theme font bases, preserving font families and independent section identities. Do not resize product-card content or commerce controls through an editable section heading setting. Text-bearing story duplicates copy percentages independently; removed sections discard their size entries. Find Us cards use color-only feedback and theme typography with the disclosure icon anchored to the padded right edge.
