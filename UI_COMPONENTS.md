# UI component decision registry

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
- **Admin sidebar:** Market, Vendor and Platform reuse AdminShell and DashboardFrame. The desktop collapse control lives inside the sidebar and uses the existing panel icon without a boxed background. Collapsed width is 76px, retaining the shared platform mark, active navigation, hierarchy and named icon destinations with tooltips. Content expands into the remaining grid space. At 767px and below, preserve DashboardMenu and the existing mobile navigation. Customer SSR retains its existing collapse behavior and native navigation adapter.
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
| Loading indicators           | LOD-01 Spinner        | LOD-01 Skeleton; separate read/error/retry controllers                         | Shared animated Spinner; Skeleton retained; migration complete                                  |
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

| Candidate ID | Implementation                     | Exact source path                                                                                                                                          | Existing scope/adoption                                                                                                                                   |
| ------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRD-01       | Card and native .card              | [packages/ui/src/index.tsx:129](E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx:129)                                                       | Shared plus markup counterpart. Card imported by 6 files; ProductCards, CustomerEvents/Follows/Orders, storefront carts use native semantic .card markup. |
| CRD-02       | Dashboard surface families         | [apps/admin/src/market/overview.tsx:27](E:/coding/farmers-market-platform-web/apps/admin/src/market/overview.tsx:27)                                       | Local pattern family. dashboard-card, command-section, record-details, ops-day-card, ops-invoice, ops-record-list li, filter-card; phase15b.css:88.       |
| CRD-03       | Operations editor/section surfaces | [apps/admin/src/market/phase14/Directory.tsx:88](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Directory.tsx:88)                     | Local pattern family. ops-editor/ops-section/ops-inspector; ApplicationFields sections; shared styles.css:878/888.                                        |
| CRD-04       | Saved layout cards and disclosures | [apps/admin/src/market/phase14/Layouts.tsx:109](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Layouts.tsx:109)                       | Local. layout-card and saved-layouts-card/AnimatedDisclosure; dashboard.css:391/453/469.                                                                  |
| CRD-05       | Application question cards         | [apps/admin/src/market/phase14/ApplicationBuilder.tsx:265](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/ApplicationBuilder.tsx:265) | Local. application-question and editing variant; phase15.css:245-ish rules; definition builder.                                                           |

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
