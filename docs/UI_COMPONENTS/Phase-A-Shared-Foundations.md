# Phase A: Shared foundations

Implementation date: 2026-10-13. Current status: **IMPLEMENTATION COMPLETE: MANUAL REMEDIATION REVIEW PENDING**. Ordinary Phase A coverage is preserved. Functional acceptance and legacy route retirement have the outstanding dependencies listed in the manual remediation section below. Phase A is not manually accepted. Earlier evidence and completion records are historical.

## Overview

This task implements only BTN-01, INP-02 (retaining INP-03), SEL-03
(retaining SEL-02 and SEL-07), and CRD-02 (retaining CRD-04). Phases B,
C and D, feature controllers, authentication, API/backend, payment,
database, dependencies, build configuration and deployment are excluded.

The approved sources are `packages/ui/src/index.tsx` and `styles.css`
(buttons), `apps/storefront/src/components/CentralAccount.astro`
(inputs), `apps/admin/src/market/common.tsx` (selects), and
`apps/admin/src/market/overview.tsx` with `phase15b.css` (cards).
Existing shared primitives are extended. One renderer-neutral class
contract in the existing UI package will serve React and native Astro
markup. Astro remains SSR; no hydration is added for presentation.

The mandatory audit, gallery, migration plan and second-round decisions
actually exist under `docs/UI_COMPONENTS/`. Historical links pointing to
`docs/` are stale. Those documents and AGENTS.md will remain unchanged.

## Baseline

The workspace is already extensively modified. The complete initial Git
status is recorded below. Existing work, including untracked files, is
preserved. No clean-HEAD reset, commit, push or PR is permitted.

Approved source implementations, imports, raw markup and contextual CSS
were inventoried before production edits. The declarations below record
the files selected for each batch; the final inventory records current callers.

Baseline: typecheck and both builds pass. Build reports the existing 500 kB
chunk warning. ESLint and package boundaries pass; root lint reaches
Prettier and fails on the newly initialized report plus the pre-existing
`docs/vendor-application-account-identity-audit.md`. This report is now
formatted; the unrelated document was not edited. Of 194 baseline
unit tests, 193 pass. The gallery inventory test fails because it still
reads the relocated audit at `docs/UI_COMPONENT_AUDIT.md`.

The first gallery launch/browser attempt is blocked by sandbox loopback
access (EACCES, then timeout). Restarting the unchanged launcher and
browser harness with approved local execution resolves this. The existing
Edge harness passes all 77 IDs and 19 categories, including isolation.
Its fresh screenshots are in
`tests/fixtures/ui-component-gallery/review/expanded-2026-10-13T20-20-56-141Z/`.
Because the running dev server can update during work, these images are
not asserted to be immutable pre-change visual snapshots.

## Implementation log

### A1: Buttons

Planned shared files: `packages/ui/src/index.tsx`, `styles.css`, a pure
`presentation.ts`, and the package export needed for native Astro access.
Pilot consumers: `apps/admin/src/vendor/common.tsx` (action anchors),
`apps/storefront/src/pages/products/index.astro` (native GET submit).
CSS ownership: `apps/admin/src/phase15.css`, `phase15b.css`, and
`apps/storefront/src/styles/checkout.css`. Focused tests:
`tests/ui-foundations.test.tsx`, existing admin/vendor/gallery tests.
Further consumer batches will be declared before editing. Button default
remains `button`; native submissions require explicit `submit`.

A1 expansion inventory: `apps/storefront/src/components/SignupPasswords.tsx`
(two non-submitting toggles), `CentralAccount.astro` (six POST button sites),
`apps/storefront/src/pages/account/verify.astro` (verify/resend submitters).
Their controllers, names, values, validation and URLs stay unchanged.
`apps/admin/src/market/CommandForm.tsx` receives only an optional button
presentation prop, passed from its existing danger wrapper in
`market/common.tsx`. `market/phase14/designer.css` excludes approved
buttons from its independent shape rules. `dashboard.css` excludes
approved buttons from its contextual primary/danger appearance.
Protected authentication/checkout/operations behavior is not edited.

Implemented: `Button` keeps its native props/ref and `type="button"`
default. Typed `variant` values are primary, secondary, destructive and
disclosure; `size="compact"` reduces padding and `iconOnly` supplies a
44px square. Loading disables the control and exposes aria-busy. Existing
className="secondary" consumers remain compatible. `buttonClassName`
also styles real anchors without changing their href/navigation behavior.
The only new Astro renderer is `components/ui/Button.astro`: the existing
React component cannot supply native Astro slot/form markup, and SSR does
not need an island. It delegates all presentation to the pure helper.

Legacy operations/designer/admin/password rules now explicitly exclude
opted-in shared buttons. Layout-only spacing remains feature-owned.
The market danger wrapper passes the existing semantic intent to the
submit variant. No confirmation, request locking, grant, UUID or submit
controller is rewritten. Remaining raw buttons/action links retain their
legacy rules until independently reviewed; BTN-02/03/04/05 are superseded
only at the declared migrated sites.

### A2: Inputs

Planned shared files: `packages/ui/src/form-controls.tsx`, `styles.css`,
`presentation.ts`. Native pilot: `CentralAccount.astro` and catalog input.
OTP correction: `apps/storefront/src/pages/account/verify.astro` and
`apps/storefront/src/styles/checkout.css`. `phone-verification.ts` and
`input-validation.ts` are read/test references only. Textarea, checkbox,
radio and other categories are excluded from the focus correction.

A2 scope additions: the two native password fields in
`SignupPasswords.tsx`; a selector exclusion in `phase14/designer.css`;
the native INP-02 gallery specimen in
`tests/fixtures/ui-component-gallery/src/components/Sample.astro`.
The specimen now uses the extracted class contract, with no state/ID or
gallery isolation changes. The stale audit path in
`tests/ui-component-gallery.test.ts` is corrected to its existing location;
the baseline failure is resolved without changing audit content.

A1 verification: 81 pilot tests and 103 expansion tests pass; root
TypeScript passes. Focused Edge checks pass across all seven requested
widths and base/admin/storefront/customer styles. Actual compiled Astro
Button HTML preserves default type, native GET validation/submitter
name/value, disabled loading and anchor navigation. Evidence:
`docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-28-48-593Z/`.
Test harness setup failures (compiler name, runtime options and specimen
selector) were fixed without application/config/dependency changes.

A2 initial verification: 23 tests pass covering native attributes,
controlled/default values, required validation, actual OTP controller
paste/navigation/aggregation, phone formatting and password verification.
No `phone-verification.ts` behavior is changed.

Implemented: `Input` still applies `inputContract` before adding its shared
class. Native hidden, checkbox/radio and other non-text controls do not
acquire the ordinary field treatment. CentralAccount's four ordinary
fields, SignupPasswords' two native password fields and the catalog search
field use the renderer-neutral helper without new validation inference.
The standard is white, a 4px radius, existing muted border, 0.7rem padding
and 44px minimum height. Focus keeps that border/geometry and removes
additional outline/shadow. A background and associated-label underline
provide the non-border cue; forced colors use Highlight/HighlightText.
Screenshot review identified underline propagation from wrapping native
labels into the input text. Wrapping labels use the background focus cue;
separate associated labels retain the underline. Input text-decoration is
also reset explicitly. This avoids changing the entered text's appearance.
OTP changes are CSS-only and keep the six digits' original size/border.

A2 browser verification passes in Edge for seven widths and four stylesheet
contexts. Mouse/keyboard focus keeps borders, radius and geometry, removes
outline/shadow and gives the keyboard background cue. Forced colors
preserve a Highlight/HighlightText fill. Browsers can match focus-visible
for mouse-focused text fields too; no JavaScript input-mode tracker is
added. The same non-border cue can appear in that native browser case.
OTP focus correction passes. Evidence:
`docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-31-45-961Z/`.
The geometry assertion uses a 0.01px tolerance for browser float rounding;
the first strict comparison differed by less than 0.00001px.
Gallery isolation/inventory: all eight unit checks now pass.
Two test-only TypeScript issues (compiler options and importing the
non-module OTP controller) were corrected without changing the controller.

### A3: Selects

Planned shared files: `packages/ui/src/index.tsx`, `styles.css`,
`presentation.ts`. Delegates: `apps/admin/src/market/common.tsx`,
`apps/admin/src/management/common.tsx`,
`apps/admin/src/market/phase14/common.tsx`; native catalog/account selects.
SEL-07: `apps/admin/src/market/presentation.tsx` and `dashboard.css`.
SEL-02 status mappings/values remain unchanged. No ordinary select becomes
a combobox. Existing required defaults stay in compatibility wrappers.

A3 concrete scope: shared `Select` and new shared `SelectField`; delegate
market SelectField and management Choice. Existing phase14 Control is
retained unchanged since its render callback supports unrelated controls.
Operations native-select pilot: the three native selects in
`phase14/Directory.tsx`; their option values and callbacks are preserved.
Catalog and CentralAccount use the pure class helper. `phase15b.css`,
`dashboard.css` and `phase14/designer.css` exclude opted-in selects from
competing appearance. SEL-07's only production consumer is
ApplicationReview: blank directory is meaningful (create a business).
An explicit non-option clear button preserves that optional relationship.
No review payload/controller changes.

Implemented: lower-level native `Select` uses `selectClassName` and adds an
explicit status specialist variant. Shared `SelectField` composes existing
Field/Select, native props, caller/generator IDs and merged error/hint
associations. This wrapper is necessary because the existing lower-level
Select had no label/error API; no independent select renderer is created.
Its default is optional. The old market adapter and management Choice keep
their former required defaults while accepting explicit optional behavior.
Directory's three native selects become Select with unchanged option
identifiers, empty/null mappings and change handlers.

SEL-03's original native-control geometry and chevron are now shared. The
existing base-select native picker enhancement is transferred to the
shared contract, with neutral #f6f9f6 option hover where supported. Native
fallback popup rendering remains browser-dependent. SEL-02's feature-owned
colors, labels and option values are retained with an explicit status variant.

SEL-07 remains market-local and retains filtering, controlled selection,
Enter/Escape, aria-selected, active-descendant and blur handling. Instruction
text is only a placeholder, never an option. Neutral hover/keyboard-active
backgrounds and an inset active stripe differ from committed green.
Arrow-active options scroll into view. The optional ApplicationReview
consumer receives a separate clear action, labeled by its feature, that
preserves its meaningful empty directory relationship. Native disabled
fieldset state also guards custom-option commits.

A3 checks: 117 tests and root TypeScript pass. Edge verifies the ordinary
contract in all seven widths/four CSS contexts, native selection and actual
picker hover, retained status colors and combobox committed/active/hover
states. Harness-only wrong fixture values/labels and reopen assumptions
were corrected to the existing synthetic values and keyboard behavior.
Evidence: `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-38-41-534Z/`.

### A4: Cards

Planned shared files: `packages/ui/src/index.tsx`, `styles.css`,
`presentation.ts`. Pilot: `apps/admin/src/market/overview.tsx`.
CRD-04: `apps/admin/src/market/presentation.tsx`, `dashboard.css`, and
saved-layout action presentation in `phase14/Layouts.tsx` if necessary.
No universal disclosure migration or editor/controller rewrite.

A4 declared consumer expansion: shared Card's six existing importing files
(`AdminShell.tsx`, management `billing.tsx`, `catalog.tsx`, `payments.tsx`,
`platform.tsx`, `pos.tsx`) inherit CRD-02 without changing their contents.
`apps/storefront/src/components/CustomerOrders.astro` uses the pure surface
contract on its existing semantic list items, with contained spacing.
`phase15b.css` excludes migrated overview sections from legacy surface
rules. Gallery CRD-01's native article gains the shared surface class to
match its React counterpart; CRD-02 historical family samples remain.
No operation-editor or application-builder cards are migrated in this
bounded surface batch. Tests include management, market, customer boundary
and saved-layout suites plus focused semantic/nesting/geometry tests.

Implemented: existing `Card` now accepts native props plus `as` values div,
article, section, li and fieldset. The pure `cardClassName` contract supplies
the Astro counterpart on CustomerOrders' original list items. Its geometry
comes directly from CRD-02: 10px radius, clamp(1rem, 2.5vw, 1.5rem) padding,
1.25rem block spacing, #d5dfd8 border, original subtle shadow and min-width:0.
The surface retains the established brand-surface token (white in the
platform theme). Contained and nested cards suppress extra block margins;
the flush variant supports feature-owned media/table padding.

Market overview's two sections use Card as section. Existing Card users
inherit the surface; native card copies remain separately inventoried.
No content, heading, amount, status, map/editor or invoice logic changes.
CRD-04 retains its 14px specialist surface and existing animation/lazy mount.
Its toggle now uses BTN-01's disclosure variant with 12px horizontal padding
on each side. Separate action buttons stay independent. Layouts' actions
already imported Button, so no edit to Layouts.tsx was necessary.

A4 checks: 109 tests and root TypeScript pass. Edge compares actual shared
React/native surfaces in seven widths/four contexts, nested margins and
long content at 200% CSS zoom, saved-title padding, hover geometry,
keyboard expansion, inertness and reduced motion. Geometry is measured
in document coordinates to account for Playwright hover scrolling, with a
0.01px float tolerance. The initial viewport-coordinate assertion failed
because the page scrolled, not because hover changed the layout.

## Testing evidence

Results for each independently checked batch are above. Existing
Vitest runs use `FRONTEND_NO_EVIDENCE=true`. Live mutation, seed, reset,
purchase, SMS and account-creation harnesses are excluded.

| Check                  | Exact command                                                                                                                                                                                                                                                                                    | Result                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Baseline focused units | `npx vitest run tests/admin.test.tsx tests/vendor.test.tsx tests/management.test.tsx tests/market.test.tsx tests/signup-passwords.test.tsx tests/phone-input.test.tsx tests/market-application.test.tsx tests/phase15.test.tsx tests/layout-library.test.tsx tests/ui-component-gallery.test.ts` | 193 passed, one stale-path failure; corrected       |
| A1 pilot               | `npx vitest run tests/ui-foundations.test.tsx tests/admin.test.tsx tests/vendor.test.tsx tests/management.test.tsx tests/layout-library.test.tsx`                                                                                                                                                | 81 passed                                           |
| A1 expansion           | `npx vitest run tests/ui-foundations.test.tsx tests/signup-passwords.test.tsx tests/market.test.tsx tests/market-application.test.tsx tests/phase15.test.tsx`                                                                                                                                    | 103 passed                                          |
| A2                     | `npx vitest run tests/ui-foundations.test.tsx tests/phone-input.test.tsx tests/signup-passwords.test.tsx tests/market-application.test.tsx`                                                                                                                                                      | 23 passed                                           |
| A3                     | `npx vitest run tests/ui-foundations.test.tsx tests/management.test.tsx tests/market.test.tsx tests/market-operations.test.tsx tests/phase15.test.tsx`                                                                                                                                           | 117 passed                                          |
| A4                     | `npx vitest run tests/ui-foundations.test.tsx tests/layout-library.test.tsx tests/management.test.tsx tests/market.test.tsx tests/customer-dashboard.test.ts`                                                                                                                                    | 109 passed                                          |
| Gallery isolation      | `npx vitest run tests/ui-component-gallery.test.ts`                                                                                                                                                                                                                                              | Eight passed                                        |
| Complete unit suite    | `npx vitest run`                                                                                                                                                                                                                                                                                 | 328 passed across 26 files                          |
| TypeScript batches     | `npx tsc --noEmit`                                                                                                                                                                                                                                                                               | Pass after test-only setup corrections              |
| Project diagnostics    | `npm run typecheck`                                                                                                                                                                                                                                                                              | Pass; 78 Astro files, zero errors/warnings/hints    |
| Production build       | `npm run build`                                                                                                                                                                                                                                                                                  | Both workspaces pass; existing large-chunk warnings |
| Local gallery browser  | `npx tsx scripts/test-ui-gallery.ts`                                                                                                                                                                                                                                                             | Pass; 77 IDs, 19 categories; isolation unchanged    |
| Phase A browser        | `npx tsx scripts/test-ui-foundations.ts`                                                                                                                                                                                                                                                         | Pass; detailed evidence below                       |

Final `npm run lint` passes ESLint and package boundaries, then fails only
the pre-existing formatting issue in
`docs/vendor-application-account-identity-audit.md`. That unrelated report
is left unchanged. `npx tsx scripts/check-boundaries.ts` also passes
independently for all nine workspaces. The changed files are formatted.
The final focused foundation/gallery rerun passes all 20 tests, and
`git diff --check` finds no whitespace errors in the tracked task files.
Registry checks preserve 155 candidate rows, 20 approved categories and
27 pending selections, including the two-letter TZ candidate prefix.

All unit commands set `$env:FRONTEND_NO_EVIDENCE = 'true'`. Unit suites
use mocked services or static source contracts, with no live mutations.
The focused browser script compiles the actual Astro Button and
CentralAccount sources with the installed Astro compiler/container. Native
profile and logout POSTs are intercepted locally; exact hidden actions and
profile FormData are verified. No real account request is sent.

Browser coverage is desktop Edge only, at 390, 600, 601, 767, 768, 1280
and 1440px in the existing base/admin/storefront/customer CSS contexts.
Native picker interaction, focus-visible, forced colors and reduced motion
are real browser checks. CSS zoom at 200% checks nested containment; this
does not claim browser-toolbar zoom or device/touch coverage. Other engines,
assistive technologies, tenant palettes, long labels in every feature and
real authentication/payment workflows remain unverified.

Final inspected screenshots and computed styles:
`docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/` contains
`shared-cards-390.png`, `shared-cards-1440.png`, `saved-layout-hover.png`,
`native-select-picker.png`, `combobox-selected-active.png`,
`native-input-focus.png`, `input-forced-colors.png`,
`native-astro-buttons.png` and `computed-styles.json`.
Earlier successful batch evidence remains in the timestamped directories
cited above. Latest full-gallery images exist at
`tests/fixtures/ui-component-gallery/review/expanded-2026-10-13T20-46-17-468Z/`.
Historical evidence is preserved.

## Manual testing guide

From the repository root:

```powershell
npx tsx scripts/dev-ui-gallery.ts --enable-local-gallery
```

Open `http://127.0.0.1:4343/` and inspect BTN, INP, SEL and CRD, including
INP-03, SEL-02, SEL-07 and CRD-04. The gallery blocks all submissions;
passing gallery checks cannot establish application workflow parity.
In a second terminal:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/ui-foundations.test.tsx tests/ui-component-gallery.test.ts
npx tsx scripts/test-ui-gallery.ts
npx tsx scripts/test-ui-foundations.ts
```

The browser scripts require the installed Edge browser and loopback access.
They need no account, backend, credentials or seed data. The focused script
intercepts its synthetic form/account responses and preserves gallery guards.

| Route / category                                           | Inspect / interact                                                   | Expected result                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/sample/admin?id=BTN-01`, BTN                             | Hover, Tab, disabled/loading state                                   | Canonical 44px Button, brand primary/secondary, visible focus; disabled actions do not activate       |
| `/sample/storefront?id=BTN-05`                             | Show/hide each password                                              | Native password types toggle, confirmation validation stays, BTN-01 secondary appearance              |
| `/sample/storefront?id=INP-02`, INP-01 context comparisons | Click, then keyboard focus; enable forced colors                     | No extra gray outline/shadow, unchanged border/size; tint and label cue; readable system highlight    |
| `/sample/storefront?id=INP-03`                             | Focus each digit                                                     | Six original digit boxes with corrected focus; gallery intentionally omits OTP controller             |
| `/sample/admin?id=SEL-03`, SEL-04                          | Select an actual business with keyboard/pointer                      | Native selection, shared geometry, off-white hover where base-select is supported                     |
| `/sample/admin?id=SEL-02`                                  | Change Pending/Approved/Declined                                     | Existing status text/value/color meaning stays                                                        |
| `/sample/admin?id=SEL-07`                                  | Type, ArrowDown/Up, Enter, Escape, hover                             | Instruction never becomes an option; active neutral stripe differs from committed green               |
| `/sample/admin?id=CRD-01`, CRD-02                          | Compare shared React/native surface with historical dashboard source | 10px ordinary radius, clamped padding, proper spacing/containment                                     |
| `/sample/admin?id=CRD-04`                                  | Hover heading edges, Enter/Space, child actions, reduced motion      | Comfortable text/chevron padding, stable hover geometry, independent actions and preserved disclosure |

Sample URLs are relative to `http://127.0.0.1:4343`. Gallery CRD-02 and
other historical raw-family samples remain useful comparisons; they do not
imply those source families were all migrated.

For the existing application fixture, run `npm run dev:fixtures` from the
root. Admin is `http://127.0.0.1:4322`; storefront is
`http://127.0.0.1:4321`. Existing validated local environment configuration
may still be required by the app launcher. Read-only fixture routes include
`/vendor/products`, `/market`, `/market/settings`, `/market/vendors` and
storefront `/products` in the Vendor fixture context. The catalog Apply
button must remain a GET submit with unchanged q/sort parameters.

Actual `/account/settings` (CentralAccount), `/account/verify`,
`/market/application-submissions` (optional Directory business clear) and
`/market/layouts` require appropriate account/challenge/grant/service state;
the ordinary app fixture does not supply every operations/account scenario.
Use existing mocks or already available isolated state for functional
review. Verify profile/logout hidden action fields, OTP paste/autofill and
saved-layout actions without live transactions or operational mutations.
The automated synthetic tests verify relevant form/controller behavior;
they do not establish live auth, SMS, commerce or command integration.

## Final migration status from the initial foundation pass

| Category | Approved design            | Implemented foundation                          | Migrated consumers                                                                                                | Remaining consumers                                                | Verification status                                              |
| -------- | -------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| BTN      | BTN-01                     | COMPLETE foundation                             | Existing Button callers, RouteLink, catalog, password toggles, CentralAccount/verify buttons, retained disclosure | Raw operations/commerce/account controls and action anchors        | PARTIAL migration; unit/Edge checks pass                         |
| INP      | INP-02; INP-03 retained    | COMPLETE foundation and OTP focus correction    | Input callers, four CentralAccount fields, two SignupPasswords fields, catalog                                    | Remaining raw ordinary account fields, specialists listed below    | PARTIAL migration; native/OTP/focus/forced-colors checks pass    |
| SEL      | SEL-03; SEL-02/07 retained | COMPLETE foundation and specialist corrections  | Select callers, market/management wrappers, Directory, catalog/account pilots                                     | Remaining native operations/editor/account/domain selects          | PARTIAL migration; native/required/optional/combobox checks pass |
| CRD      | CRD-02; CRD-04 retained    | COMPLETE foundation and saved-layout correction | Existing Card callers, two overview sections, CustomerOrders list surfaces                                        | Legacy native cards and operation/editor/question/invoice surfaces | PARTIAL migration; semantic/nesting/Edge/disclosure checks pass  |

None of the four categories claims complete platform-wide migration.
Remaining consumers need separately declared behavior and visual coverage;
many authentication, commerce, editor and operation consumers lack an
isolated full-workflow browser fixture under this task's no-mutation rules.
No category is BLOCKED. The bounded verified foundation work is complete.

Relative to the pre-edit inventory, twelve raw button markup sites were
individually replaced (catalog one, passwords two, CentralAccount six,
verification two, disclosure one). Four raw select sites now delegate
(management one, Directory three). The ordinary native input count is
unchanged, with seven sites adopting the shared class. Two native overview
sections become semantic Card; CustomerOrders keeps its native li. Existing
shared consumers inherit the updated exports without controller changes.
The final inventory below includes exact current paths and remaining sites.

## Exact files changed by this task

Pre-existing changes in these files are retained. Changes outside production
presentation are limited to the pure UI export, focused tests, minimal gallery
specimen compatibility and documentation/evidence. The UI package previously
exposed only its React/API-bearing root and stylesheet; the new presentation
subpath is needed for native Astro imports without runtime/controller coupling.
No dependency or lockfile is changed.

| Files                                                             | Batches / purpose                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/ui/src/presentation.ts` (added)                         | A1-A4 pure class/variant contract                                                 |
| `packages/ui/src/index.tsx`                                       | A1 Button; A3 Select/SelectField; A4 semantic Card                                |
| `packages/ui/src/form-controls.tsx`                               | A2 Input class, unchanged inputContract                                           |
| `packages/ui/src/styles.css`                                      | A1-A4 canonical styles, focus and retained OTP                                    |
| `packages/ui/package.json`                                        | A1 presentation export only                                                       |
| `apps/admin/src/vendor/common.tsx`                                | A1 RouteLink presentation                                                         |
| `apps/admin/src/market/common.tsx`                                | A1 danger submit variant; A3 SelectField delegate/status variant                  |
| `apps/admin/src/market/CommandForm.tsx`                           | A1 optional submit presentation prop only                                         |
| `apps/admin/src/management/common.tsx`                            | A3 Choice delegates to shared SelectField                                         |
| `apps/admin/src/market/phase14/Directory.tsx`                     | A3 three Select atoms, existing handlers untouched                                |
| `apps/admin/src/market/phase14/ApplicationReview.tsx`             | A3 explicit optional combobox clear presentation                                  |
| `apps/admin/src/market/presentation.tsx`                          | A3 retained SearchSelect corrections; A4 retained disclosure Button               |
| `apps/admin/src/market/overview.tsx`                              | A4 two semantic Card sections                                                     |
| `apps/admin/src/phase15.css`                                      | A1 exclude shared buttons from legacy hover                                       |
| `apps/admin/src/phase15b.css`                                     | A1/A3/A4 exclude canonical controls/surfaces from legacy overrides                |
| `apps/admin/src/market/dashboard.css`                             | A1 button exclusions, A3 combobox/select appearance, A4 toggle geometry ownership |
| `apps/admin/src/market/phase14/designer.css`                      | A1-A3 canonical controls excluded from independent shapes                         |
| `apps/storefront/src/components/ui/Button.astro` (added)          | A1 native SSR adapter                                                             |
| `apps/storefront/src/components/SignupPasswords.tsx`              | A1 buttons; A2 native input classes                                               |
| `apps/storefront/src/components/CentralAccount.astro`             | A1 native submitters; A2/A3 presentation helpers                                  |
| `apps/storefront/src/components/CustomerOrders.astro`             | A4 existing li surface contract                                                   |
| `apps/storefront/src/pages/products/index.astro`                  | A1 native GET Button; A2/A3 native classes                                        |
| `apps/storefront/src/pages/account/verify.astro`                  | A1 native verify/resend submitters                                                |
| `apps/storefront/src/styles/checkout.css`                         | A1 legacy password/resend exclusions                                              |
| `tests/ui-foundations.test.tsx` (added)                           | Native, input, OTP, select/specialist, card/disclosure regressions                |
| `scripts/test-ui-foundations.ts` (added)                          | Isolated Edge/style/geometry/actual Astro/native-form checks                      |
| `tests/ui-component-gallery.test.ts`                              | Existing audit file path only                                                     |
| `tests/fixtures/ui-component-gallery/src/components/Sample.astro` | A2 input and A4 native-card specimen compatibility                                |
| `UI_COMPONENTS.md`                                                | Only four category implementation tracking plus Phase A summary                   |
| `docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md` (added)        | This primary implementation report                                                |

The browser helper is necessary because the unchanged gallery deliberately
blocks submission. It verifies actual native/SSR semantics in synthetic
Playwright responses without changing gallery routes, CSP, launcher or guards.
Evidence files are inventoried below. Existing gallery harness screenshots
use fresh timestamped review directories; previous evidence is untouched.

Scope verification: no Phase B/C/D implementation, unrelated source cleanup,
authentication/authorization/API/backend/payment/domain changes, dependency
installation, deployment, commit, push or PR. No backend repository edits,
seed/reset scripts or live mutation harnesses were run.

## Initial Git status

```text
 M apps/admin/src/AdminApp.tsx
 M apps/admin/src/AdminShell.tsx
 M apps/admin/src/main.tsx
 M apps/admin/src/management/ManagementRoutes.tsx
 M apps/admin/src/management/catalog.tsx
 M apps/admin/src/management/platform.tsx
 M apps/admin/src/market/analytics.tsx
 M apps/admin/src/market/common.tsx
 M apps/admin/src/market/generation-status.tsx
 M apps/admin/src/market/occurrences.tsx
 M apps/admin/src/market/operations.tsx
 M apps/admin/src/market/overview.tsx
 M apps/admin/src/market/phase14/ApplicationBuilder.tsx
 M apps/admin/src/market/phase14/Applications.tsx
 M apps/admin/src/market/phase14/Assignments.tsx
 M apps/admin/src/market/phase14/Billing.tsx
 M apps/admin/src/market/phase14/Directory.tsx
 M apps/admin/src/market/phase14/Layouts.tsx
 M apps/admin/src/market/phase14/OperationsRoutes.tsx
 M apps/admin/src/market/phase14/common.tsx
 M apps/admin/src/market/schedule.tsx
 M apps/admin/src/market/settings.tsx
 M apps/admin/src/market/timezones.tsx
 M apps/admin/src/market/vendors.tsx
 M apps/admin/src/vendor/common.tsx
 M apps/admin/src/vendor/markets.tsx
 M apps/admin/src/vendor/service.ts
 M apps/admin/vite.config.ts
 M apps/storefront/src/components/Checkout.tsx
 M apps/storefront/src/components/CommunicationPreferences.tsx
 M apps/storefront/src/components/MarketApplication.tsx
 M apps/storefront/src/components/MarketCart.tsx
 M apps/storefront/src/components/MarketPublicHome.astro
 M apps/storefront/src/components/MarketPurchase.tsx
 M apps/storefront/src/components/ProductPurchase.tsx
 M apps/storefront/src/components/PurchaseSuccess.tsx
 M apps/storefront/src/components/ShopSignIn.tsx
 M apps/storefront/src/components/VendorCart.tsx
 M apps/storefront/src/layouts/SiteLayout.astro
 M apps/storefront/src/lib/account.ts
 M apps/storefront/src/lib/shop.ts
 M apps/storefront/src/pages/account/communications.astro
 M apps/storefront/src/pages/account/index.astro
 M apps/storefront/src/pages/account/orders/[id].astro
 M apps/storefront/src/pages/account/orders/index.astro
 M apps/storefront/src/pages/account/sign-in.astro
 M apps/storefront/src/pages/api/account.ts
 M apps/storefront/src/pages/api/market-application.ts
 M apps/storefront/src/pages/auth/callback.ts
 M apps/storefront/src/pages/index.astro
 M apps/storefront/src/styles/checkout.css
 M codegen.ts
 M docs/phase14-manual-testing.md
 M package-lock.json
 M package.json
 M packages/admin-core/src/index.ts
 M packages/api/operations/checkout.graphql
 M packages/api/operations/market-operations.graphql
 M packages/api/operations/public-market-operations.graphql
 M packages/api/operations/shop.graphql
 M packages/api/schema/admin.graphql
 M packages/api/schema/provenance.json
 M packages/api/schema/shop.graphql
 M packages/api/src/checkout.ts
 M packages/api/src/generated/admin.ts
 M packages/api/src/generated/shop.ts
 M packages/api/src/index.ts
 M packages/api/src/management.ts
 M packages/api/src/market-operations.ts
 M packages/api/src/market.ts
 M packages/config/src/index.ts
 M packages/ui/package.json
 M packages/ui/src/ApplicationFields.tsx
 M packages/ui/src/MarketMap.tsx
 M packages/ui/src/index.tsx
 M packages/ui/src/styles.css
 M scripts/extract-schema.ts
 M scripts/production-hardening-environment.ts
 M scripts/test-checkout-account.ts
 M scripts/test-phase14.ts
 M scripts/test-phase15b.ts
 M tests/e2e/checkout-account-live.spec.ts
 M tests/e2e/market.spec.ts
 M tests/market-c5.test.tsx
 M tests/market-operations.test.tsx
 M tests/market.test.tsx
 M tests/phase15.test.tsx
 M tests/phase15b.test.tsx
 M tests/setup.ts
 M tests/vendor.test.tsx
 M tsconfig.json
?? AGENTS.md
?? UI_COMPONENTS.md
?? apps/admin/src/AccountModes.tsx
?? apps/admin/src/account-env.d.ts
?? apps/admin/src/account-login.ts
?? apps/admin/src/account-modes.css
?? apps/admin/src/management/AccountOnboardingReview.tsx
?? apps/admin/src/market/CommandForm.tsx
?? apps/admin/src/market/OccurrenceMap.tsx
?? apps/admin/src/market/dashboard.css
?? apps/admin/src/market/phase14/ApplicationReview.tsx
?? apps/admin/src/market/phase14/LayoutInspector.tsx
?? apps/admin/src/market/phase14/LayoutLayers.tsx
?? apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx
?? apps/admin/src/market/phase14/designer.css
?? apps/admin/src/market/presentation.tsx
?? apps/storefront/src/components/CentralAccount.astro
?? apps/storefront/src/components/CustomerEvents.astro
?? apps/storefront/src/components/CustomerFollows.astro
?? apps/storefront/src/components/CustomerNavigation.astro
?? apps/storefront/src/components/CustomerOrders.astro
?? apps/storefront/src/components/SignupPasswords.tsx
?? apps/storefront/src/layouts/CustomerLayout.astro
?? apps/storefront/src/lib/account-form.ts
?? apps/storefront/src/lib/application-progress.ts
?? apps/storefront/src/lib/customer-dashboard.ts
?? apps/storefront/src/lib/phone-verification.ts
?? apps/storefront/src/pages/account/[section].astro
?? apps/storefront/src/pages/account/admin-phone.astro
?? apps/storefront/src/pages/account/email-verify.astro
?? apps/storefront/src/pages/account/login.astro
?? apps/storefront/src/pages/account/onboarding/
?? apps/storefront/src/pages/account/phone.astro
?? apps/storefront/src/pages/account/recover.astro
?? apps/storefront/src/pages/account/reset.astro
?? apps/storefront/src/pages/account/settings.astro
?? apps/storefront/src/pages/account/signup.astro
?? apps/storefront/src/pages/account/verify.astro
?? apps/storefront/src/pages/api/application-applicant.ts
?? apps/storefront/src/pages/api/application-progress.ts
?? apps/storefront/src/pages/api/customer-follow.ts
?? apps/storefront/src/styles/customer-dashboard.css
?? docs/CUSTOMER_DASHBOARD.md
?? docs/UI_COMPONENTS/
?? docs/boerne-test-market.md
?? docs/evidence/customer-dashboard/
?? docs/evidence/market-dashboard/
?? docs/evidence/market-fixes/
?? docs/evidence/occurrence-layouts/
?? docs/evidence/phase15c/
?? docs/evidence/signup-onboarding-2026-10-12/
?? docs/evidence/sms-signup-ux/
?? docs/implementation-phase-15C.md
?? docs/occurrence-layouts.md
?? docs/phone-verified-accounts-platform-input-validation.md
?? docs/sms-verification-signup-ux-fixes.md
?? docs/testing-vendors.json
?? docs/testing-vendors.md
?? docs/unified-account-signup-onboarding-implementation.md
?? docs/unified-platform-identity-implementation.md
?? docs/vendor-application-account-identity-audit.md
?? packages/api/operations/customer-dashboard.graphql
?? packages/api/src/customer-dashboard.ts
?? packages/ui/src/PhoneInput.tsx
?? packages/ui/src/TimezoneField.tsx
?? packages/ui/src/form-controls.tsx
?? packages/ui/src/input-validation.ts
?? packages/ui/src/map/
?? packages/ui/src/password-policy.ts
?? packages/ui/src/phone-countries.ts
?? playwright.customer-dashboard.config.ts
?? playwright.market-dashboard.config.ts
?? scripts/check-phase15c-demo.ts
?? scripts/customer-dashboard.ts
?? scripts/data/
?? scripts/dev-ui-gallery.ts
?? scripts/konva-pointer.ts
?? scripts/seed-boerne-test-market.cjs
?? scripts/seed-testing-vendors.cjs
?? scripts/test-account-signup-onboarding.ts
?? scripts/test-market-dashboard.ts
?? scripts/test-market-fixes.ts
?? scripts/test-occurrence-layouts.ts
?? scripts/test-operations-live.ts
?? scripts/test-phase15c.ts
?? scripts/test-ui-gallery.ts
?? scripts/test-unified-account.ts
?? scripts/ui-gallery-policy.ts
?? sms-mobile-verification.png
?? tests/account-rate-feedback.test.ts
?? tests/application-progress.test.ts
?? tests/customer-dashboard.test.ts
?? tests/e2e/customer-dashboard-live.spec.ts
?? tests/fixtures/market-dashboard-data.ts
?? tests/fixtures/market-dashboard-preview.tsx
?? tests/fixtures/occurrence-layout-preview.tsx
?? tests/fixtures/phase15c-preview.tsx
?? tests/fixtures/ui-component-gallery/
?? tests/layout-library.test.tsx
?? tests/market-application.test.tsx
?? tests/market-dashboard.test.tsx
?? tests/market-operations-contract.test.ts
?? tests/occurrence-layouts.test.tsx
?? tests/phase15c.test.ts
?? tests/phone-input.test.tsx
?? tests/signup-passwords.test.tsx
?? tests/ui-component-gallery.test.ts
```

## Final consumer inventory

Historical initial-pass inventory. The completion pass below supersedes these remaining review counts.

This inventory was rerun after all four batches. Counts are markup sites, not distinct business workflows. Shared implementation files are listed alongside application callers. Retained specialized native controls appear among remaining review sites where they still have independent presentation. Hidden inputs, checkboxes/radios and OTP digits are excluded from ordinary input migration counts.

### BTN shared React / Astro Button callers

- `packages/ui/src/index.tsx` (4 sites)
- `apps/storefront/src/pages/products/index.astro` (1 sites)
- `apps/storefront/src/pages/account/verify.astro` (2 sites)
- `apps/storefront/src/components/SignupPasswords.tsx` (2 sites)
- `apps/storefront/src/components/OccurrencePreview.tsx` (1 sites)
- `apps/storefront/src/components/CommunicationPreferences.tsx` (2 sites)
- `apps/storefront/src/components/CentralAccount.astro` (6 sites)
- `apps/admin/src/AdminShell.tsx` (2 sites)
- `apps/admin/src/AdminApp.tsx` (6 sites)
- `apps/admin/src/vendor/orders.tsx` (1 sites)
- `apps/admin/src/vendor/markets.tsx` (3 sites)
- `apps/admin/src/vendor/inventory.tsx` (2 sites)
- `apps/admin/src/vendor/customers.tsx` (1 sites)
- `apps/admin/src/vendor/common.tsx` (4 sites)
- `apps/admin/src/vendor/catalog.tsx` (1 sites)
- `apps/admin/src/vendor/analytics.tsx` (1 sites)
- `apps/admin/src/market/vendors.tsx` (7 sites)
- `apps/admin/src/market/presentation.tsx` (3 sites)
- `apps/admin/src/market/generation-status.tsx` (1 sites)
- `apps/admin/src/market/common.tsx` (2 sites)
- `apps/admin/src/market/CommandForm.tsx` (2 sites)
- `apps/admin/src/market/analytics.tsx` (1 sites)
- `apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx` (5 sites)
- `apps/admin/src/market/phase14/Layouts.tsx` (5 sites)
- `apps/admin/src/FixtureAdmin.tsx` (2 sites)
- `apps/admin/src/management/pos.tsx` (2 sites)
- `apps/admin/src/management/platform.tsx` (1 sites)
- `apps/admin/src/management/payments.tsx` (3 sites)
- `apps/admin/src/management/common.tsx` (2 sites)
- `apps/admin/src/management/billing.tsx` (4 sites)

### INP shared Input callers

- `packages/ui/src/MarketMap.tsx` (1 sites)
- `packages/ui/src/ApplicationFields.tsx` (2 sites)
- `apps/storefront/src/components/VendorCart.tsx` (1 sites)
- `apps/storefront/src/components/ProductPurchase.tsx` (1 sites)
- `apps/storefront/src/components/MarketPurchase.tsx` (1 sites)
- `apps/storefront/src/components/MarketCart.tsx` (2 sites)
- `apps/storefront/src/components/MarketApplication.tsx` (3 sites)
- `apps/storefront/src/components/CommunicationPreferences.tsx` (1 sites)
- `apps/storefront/src/components/Checkout.tsx` (4 sites)
- `apps/admin/src/AdminApp.tsx` (2 sites)
- `apps/admin/src/vendor/common.tsx` (1 sites)
- `apps/admin/src/vendor/catalog.tsx` (1 sites)
- `apps/admin/src/market/schedule.tsx` (1 sites)
- `apps/admin/src/market/presentation.tsx` (1 sites)
- `apps/admin/src/market/common.tsx` (1 sites)
- `apps/admin/src/market/phase14/Directory.tsx` (1 sites)
- `apps/admin/src/market/phase14/common.tsx` (2 sites)
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx` (1 sites)
- `apps/admin/src/management/platform.tsx` (2 sites)
- `apps/admin/src/management/catalog.tsx` (2 sites)

### SEL shared Select / SelectField callers

- `packages/ui/src/index.tsx` (1 sites)
- `apps/admin/src/vendor/orders.tsx` (1 sites)
- `apps/admin/src/vendor/markets.tsx` (4 sites)
- `apps/admin/src/vendor/analytics.tsx` (1 sites)
- `apps/admin/src/market/vendors.tsx` (3 sites)
- `apps/admin/src/market/common.tsx` (2 sites)
- `apps/admin/src/market/phase14/Directory.tsx` (3 sites)
- `apps/admin/src/management/common.tsx` (1 sites)

### CRD shared Card callers

- `apps/admin/src/AdminShell.tsx` (1 sites)
- `apps/admin/src/market/overview.tsx` (2 sites)
- `apps/admin/src/management/pos.tsx` (2 sites)
- `apps/admin/src/management/platform.tsx` (2 sites)
- `apps/admin/src/management/payments.tsx` (2 sites)
- `apps/admin/src/management/catalog.tsx` (1 sites)
- `apps/admin/src/management/billing.tsx` (2 sites)

### Remaining native button presentation review sites

- `packages/ui/src/MarketMap.tsx:213`
- `packages/ui/src/MarketMap.tsx:307`
- `packages/ui/src/map/MapCanvas.tsx:482`
- `packages/ui/src/map/MapCanvas.tsx:500`
- `packages/ui/src/map/MapCanvas.tsx:515`
- `packages/ui/src/map/MapCanvas.tsx:518`
- `packages/ui/src/index.tsx:176`
- `packages/ui/src/index.tsx:377`
- `apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro:184`
- `apps/storefront/src/pages/auth/logout.astro:16`
- `apps/storefront/src/pages/auth/logout.astro:17`
- `apps/storefront/src/pages/auth/claim.astro:17`
- `apps/storefront/src/pages/account/[section].astro:117`
- `apps/storefront/src/pages/account/signup.astro:73`
- `apps/storefront/src/pages/account/sign-in.astro:117`
- `apps/storefront/src/pages/account/settings.astro:117`
- `apps/storefront/src/pages/account/reset.astro:36`
- `apps/storefront/src/pages/account/recover.astro:33`
- `apps/storefront/src/pages/account/phone.astro:70`
- `apps/storefront/src/pages/account/phone.astro:97`
- `apps/storefront/src/pages/account/onboarding/[role].astro:108`
- `apps/storefront/src/pages/account/onboarding/[role].astro:116`
- `apps/storefront/src/pages/account/login.astro:110`
- `apps/storefront/src/pages/account/email-verify.astro:21`
- `apps/storefront/src/pages/account/admin-phone.astro:43`
- `apps/storefront/src/pages/account/admin-phone.astro:73`
- `apps/storefront/src/layouts/CustomerLayout.astro:42`
- `apps/storefront/src/components/VendorCart.tsx:122`
- `apps/storefront/src/components/VendorCart.tsx:128`
- `apps/storefront/src/components/PurchaseSuccess.tsx:34`
- `apps/storefront/src/components/ProductPurchase.tsx:91`
- `apps/storefront/src/components/MarketPurchase.tsx:117`
- `apps/storefront/src/components/MarketCart.tsx:162`
- `apps/storefront/src/components/MarketCart.tsx:168`
- `apps/storefront/src/components/MarketCart.tsx:233`
- `apps/storefront/src/components/MarketCart.tsx:245`
- `apps/storefront/src/components/MarketApplication.tsx:190`
- `apps/storefront/src/components/MarketApplication.tsx:301`
- `apps/storefront/src/components/MarketApplication.tsx:311`
- `apps/storefront/src/components/MarketApplication.tsx:375`
- `apps/storefront/src/components/CustomerFollows.astro:33`
- `apps/storefront/src/components/Checkout.tsx:209`
- `apps/storefront/src/components/Checkout.tsx:259`
- `apps/storefront/src/components/Checkout.tsx:266`
- `apps/storefront/src/components/Checkout.tsx:281`
- `apps/storefront/src/components/Checkout.tsx:284`
- `apps/storefront/src/components/Checkout.tsx:346`
- `apps/storefront/src/components/Checkout.tsx:388`
- `apps/storefront/src/components/Checkout.tsx:402`
- `apps/storefront/src/components/Checkout.tsx:413`
- `apps/admin/src/vendor/markets.tsx:85`
- `apps/admin/src/market/phase14/Layouts.tsx:669`
- `apps/admin/src/market/phase14/Layouts.tsx:676`
- `apps/admin/src/market/phase14/Layouts.tsx:685`
- `apps/admin/src/market/phase14/Layouts.tsx:693`
- `apps/admin/src/market/phase14/Layouts.tsx:705`
- `apps/admin/src/market/phase14/Layouts.tsx:727`
- `apps/admin/src/market/phase14/Layouts.tsx:734`
- `apps/admin/src/market/phase14/Layouts.tsx:741`
- `apps/admin/src/market/phase14/Layouts.tsx:748`
- `apps/admin/src/market/phase14/Layouts.tsx:757`
- `apps/admin/src/market/phase14/Layouts.tsx:764`
- `apps/admin/src/market/phase14/Layouts.tsx:827`
- `apps/admin/src/market/phase14/Layouts.tsx:839`
- `apps/admin/src/market/phase14/Layouts.tsx:849`
- `apps/admin/src/market/phase14/Layouts.tsx:856`
- `apps/admin/src/market/phase14/Layouts.tsx:876`
- `apps/admin/src/market/phase14/Layouts.tsx:901`
- `apps/admin/src/market/phase14/Layouts.tsx:928`
- `apps/admin/src/market/phase14/Layouts.tsx:935`
- `apps/admin/src/market/phase14/LayoutLayers.tsx:39`
- `apps/admin/src/market/phase14/LayoutLayers.tsx:64`
- `apps/admin/src/market/phase14/LayoutInspector.tsx:105`
- `apps/admin/src/market/phase14/LayoutInspector.tsx:122`
- `apps/admin/src/market/phase14/LayoutInspector.tsx:188`
- `apps/admin/src/market/phase14/LayoutInspector.tsx:520`
- `apps/admin/src/market/phase14/Directory.tsx:55`
- `apps/admin/src/market/phase14/Directory.tsx:193`
- `apps/admin/src/market/phase14/Directory.tsx:304`
- `apps/admin/src/market/phase14/Directory.tsx:470`
- `apps/admin/src/market/phase14/Directory.tsx:472`
- `apps/admin/src/market/phase14/Billing.tsx:120`
- `apps/admin/src/market/phase14/Billing.tsx:187`
- `apps/admin/src/market/phase14/Billing.tsx:190`
- `apps/admin/src/market/phase14/Assignments.tsx:194`
- `apps/admin/src/market/phase14/Assignments.tsx:335`
- `apps/admin/src/market/phase14/Assignments.tsx:413`
- `apps/admin/src/market/phase14/Assignments.tsx:453`
- `apps/admin/src/market/phase14/Assignments.tsx:471`
- `apps/admin/src/market/phase14/Assignments.tsx:551`
- `apps/admin/src/market/phase14/Assignments.tsx:640`
- `apps/admin/src/market/phase14/Assignments.tsx:683`
- `apps/admin/src/market/phase14/Assignments.tsx:825`
- `apps/admin/src/market/phase14/Assignments.tsx:831`
- `apps/admin/src/market/phase14/Applications.tsx:42`
- `apps/admin/src/market/phase14/Applications.tsx:58`
- `apps/admin/src/market/phase14/Applications.tsx:96`
- `apps/admin/src/market/phase14/Applications.tsx:105`
- `apps/admin/src/market/phase14/Applications.tsx:149`
- `apps/admin/src/market/phase14/ApplicationReview.tsx:123`
- `apps/admin/src/market/phase14/ApplicationReview.tsx:140`
- `apps/admin/src/market/phase14/ApplicationReview.tsx:281`
- `apps/admin/src/market/phase14/ApplicationReview.tsx:326`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:132`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:136`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:141`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:172`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:214`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:222`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:231`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:270`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:346`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:362`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:453`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:468`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:478`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:488`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:510`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:524`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:553`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:636`

Total conservative review sites: 121. Some are retained specialists or native adapters; this count does not assert every site is an ordinary control.

### Remaining native input presentation review sites

- `packages/ui/src/PhoneInput.tsx:159`
- `apps/storefront/src/pages/account/[section].astro:115`
- `apps/storefront/src/pages/account/signup.astro:40`
- `apps/storefront/src/pages/account/signup.astro:49`
- `apps/storefront/src/pages/account/signup.astro:58`
- `apps/storefront/src/pages/account/sign-in.astro:108`
- `apps/storefront/src/pages/account/reset.astro:22`
- `apps/storefront/src/pages/account/recover.astro:25`
- `apps/storefront/src/pages/account/phone.astro:47`
- `apps/storefront/src/pages/account/phone.astro:60`
- `apps/storefront/src/pages/account/phone.astro:84`
- `apps/storefront/src/pages/account/onboarding/[role].astro:66`
- `apps/storefront/src/pages/account/onboarding/[role].astro:75`
- `apps/storefront/src/pages/account/onboarding/[role].astro:87`
- `apps/storefront/src/pages/account/login.astro:92`
- `apps/storefront/src/pages/account/login.astro:102`
- `apps/storefront/src/pages/account/admin-phone.astro:33`
- `apps/storefront/src/pages/account/admin-phone.astro:50`
- `apps/storefront/src/pages/account/admin-phone.astro:59`

Total conservative review sites: 19. Some are retained specialists or native adapters; this count does not assert every site is an ordinary control.

### Remaining native select presentation review sites

- `packages/ui/src/TimezoneField.tsx:26`
- `packages/ui/src/PhoneInput.tsx:146`
- `packages/ui/src/MarketMap.tsx:145`
- `packages/ui/src/ApplicationFields.tsx:95`
- `packages/ui/src/ApplicationFields.tsx:171`
- `apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro:119`
- `apps/storefront/src/components/ProductPurchase.tsx:52`
- `apps/storefront/src/components/MarketApplication.tsx:279`
- `apps/admin/src/AdminApp.tsx:271`
- `apps/admin/src/AccountModes.tsx:81`
- `apps/admin/src/AccountModes.tsx:113`
- `apps/admin/src/vendor/catalog.tsx:269`
- `apps/admin/src/market/schedule.tsx:71`
- `apps/admin/src/market/phase14/OperationsRoutes.tsx:144`
- `apps/admin/src/market/phase14/Layouts.tsx:653`
- `apps/admin/src/market/phase14/Layouts.tsx:776`
- `apps/admin/src/market/phase14/Layouts.tsx:799`
- `apps/admin/src/market/phase14/LayoutInspector.tsx:228`
- `apps/admin/src/market/phase14/LayoutInspector.tsx:320`
- `apps/admin/src/market/phase14/LayoutInspector.tsx:396`
- `apps/admin/src/market/phase14/LayoutInspector.tsx:493`
- `apps/admin/src/market/phase14/Billing.tsx:145`
- `apps/admin/src/market/phase14/Assignments.tsx:311`
- `apps/admin/src/market/phase14/Assignments.tsx:394`
- `apps/admin/src/market/phase14/Assignments.tsx:429`
- `apps/admin/src/market/phase14/Assignments.tsx:653`
- `apps/admin/src/market/phase14/Assignments.tsx:710`
- `apps/admin/src/market/phase14/Assignments.tsx:737`
- `apps/admin/src/market/phase14/ApplicationReview.tsx:249`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:293`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx:419`
- `apps/admin/src/FixtureAdmin.tsx:145`
- `apps/admin/src/FixtureAdmin.tsx:157`
- `apps/admin/src/FixtureAdmin.tsx:168`
- `apps/admin/src/FixtureAdmin.tsx:188`
- `apps/admin/src/FixtureAdmin.tsx:208`
- `apps/admin/src/FixtureAdmin.tsx:224`
- `apps/admin/src/FixtureAdmin.tsx:247`
- `apps/admin/src/FixtureAdmin.tsx:256`
- `apps/admin/src/FixtureAdmin.tsx:273`
- `apps/admin/src/FixtureAdmin.tsx:286`
- `apps/admin/src/FixtureAdmin.tsx:298`
- `apps/admin/src/management/AccountOnboardingReview.tsx:61`

Total conservative review sites: 43. Some are retained specialists or native adapters; this count does not assert every site is an ordinary control.

### Remaining native card/surface families

These still require bounded surface review. Domain/editor wrappers and theme-specific native markup are not declared migrated.

- `packages/ui/src/ApplicationFields.tsx`
- `packages/ui/src/MarketMap.tsx`
- `apps/storefront/src/pages/account/orders/[id].astro`
- `apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro`
- `apps/storefront/src/components/CustomerFollows.astro`
- `apps/storefront/src/components/CommunicationPreferences.tsx`
- `apps/admin/src/vendor/booths.tsx`
- `apps/storefront/src/components/CustomerEvents.astro`
- `apps/admin/src/vendor/common.tsx`
- `apps/admin/src/vendor/orders.tsx`
- `apps/storefront/src/components/MarketCart.tsx`
- `apps/admin/src/vendor/catalog.tsx`
- `apps/storefront/src/components/MarketApplication.tsx`
- `apps/storefront/src/components/ProductCards.astro`
- `apps/storefront/src/components/MarketPublicHome.astro`
- `apps/admin/src/market/CommandForm.tsx`
- `apps/admin/src/market/analytics.tsx`
- `apps/admin/src/market/occurrences.tsx`
- `apps/admin/src/market/OccurrenceMap.tsx`
- `apps/admin/src/market/operations.tsx`
- `apps/admin/src/management/AccountOnboardingReview.tsx`
- `apps/storefront/src/components/VendorCart.tsx`
- `apps/admin/src/market/settings.tsx`
- `apps/admin/src/market/vendors.tsx`
- `apps/admin/src/market/phase14/ApplicationReview.tsx`
- `apps/admin/src/management/common.tsx`
- `apps/admin/src/market/phase14/Billing.tsx`
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx`
- `apps/admin/src/market/phase14/Assignments.tsx`
- `apps/admin/src/market/phase14/Directory.tsx`
- `apps/admin/src/market/phase14/Layouts.tsx`

### Remaining native action anchors

These retain real navigation but have not yet adopted buttonClassName. Ordinary NAV semantics remain feature-owned; this is a BTN presentation inventory.

- `apps/storefront/src/pages/account/[section].astro:71`
- `apps/storefront/src/pages/account/[section].astro:79`
- `apps/storefront/src/pages/account/[section].astro:96`
- `apps/storefront/src/pages/account/[section].astro:104`
- `apps/storefront/src/pages/account/[section].astro:130`
- `apps/storefront/src/pages/account/[section].astro:138`
- `apps/storefront/src/pages/account/verify.astro:103`
- `apps/storefront/src/pages/account/verify.astro:106`
- `apps/storefront/src/pages/account/signup.astro:76`
- `apps/storefront/src/pages/account/signup.astro:79`
- `apps/storefront/src/pages/account/sign-in.astro:77`
- `apps/storefront/src/pages/account/sign-in.astro:88`
- `apps/storefront/src/pages/account/settings.astro:64`
- `apps/storefront/src/pages/account/settings.astro:73`
- `apps/storefront/src/pages/account/settings.astro:77`
- `apps/storefront/src/pages/account/settings.astro:87`
- `apps/storefront/src/pages/account/settings.astro:96`
- `apps/storefront/src/pages/account/settings.astro:111`
- `apps/storefront/src/pages/account/reset.astro:40`
- `apps/storefront/src/pages/account/recover.astro:36`
- `apps/storefront/src/pages/account/recover.astro:42`
- `apps/storefront/src/pages/account/phone.astro:100`
- `apps/admin/src/market/phase14/ApplicationReview.tsx:176`
- `apps/storefront/src/components/VendorHome.astro:24`
- `apps/storefront/src/components/VendorCart.tsx:60`
- `apps/storefront/src/components/VendorCart.tsx:178`
- `apps/storefront/src/components/VendorCart.tsx:181`
- `apps/storefront/src/pages/account/orders/[id].astro:41`
- `apps/storefront/src/pages/account/orders/index.astro:31`
- `apps/storefront/src/pages/account/orders/index.astro:36`
- `apps/admin/src/AccountModes.tsx:41`
- `apps/admin/src/AccountModes.tsx:73`
- `apps/storefront/src/pages/account/onboarding/[role].astro:129`
- `apps/storefront/src/pages/account/login.astro:113`
- `apps/storefront/src/pages/account/login.astro:116`
- `apps/storefront/src/pages/account/login.astro:122`
- `apps/storefront/src/pages/account/communications.astro:44`
- `apps/storefront/src/pages/account/admin-phone.astro:77`
- `apps/storefront/src/components/MarketCart.tsx:92`
- `apps/storefront/src/components/MarketCart.tsx:259`
- `apps/storefront/src/components/MarketCart.tsx:262`
- `apps/storefront/src/components/MarketApplication.tsx:187`
- `apps/storefront/src/components/Checkout.tsx:136`
- `apps/storefront/src/components/Checkout.tsx:325`
- `apps/storefront/src/components/CentralAccount.astro:37`
- `apps/storefront/src/components/CentralAccount.astro:69`
- `apps/storefront/src/components/CentralAccount.astro:79`
- `apps/storefront/src/components/CentralAccount.astro:93`
- `apps/storefront/src/components/CentralAccount.astro:114`
- `apps/storefront/src/components/CentralAccount.astro:165`
- `apps/storefront/src/components/CentralAccount.astro:247`
- `apps/storefront/src/components/ShopSignIn.tsx:9`
- `apps/storefront/src/components/PurchaseSuccess.tsx:22`
- `apps/storefront/src/components/PurchaseSuccess.tsx:55`
- `apps/storefront/src/components/ProductPurchase.tsx:103`
- `apps/storefront/src/components/MarketPurchase.tsx:95`
- `apps/storefront/src/components/MarketPurchase.tsx:128`
- `apps/storefront/src/components/MarketPublicHome.astro:27`
- `apps/storefront/src/components/MarketPublicHome.astro:33`
- `apps/storefront/src/components/MarketPublicHome.astro:59`
- `apps/storefront/src/components/MarketHome.astro:33`
- `apps/storefront/src/components/MarketHome.astro:37`

### Generated Phase A evidence files

A concurrent lint attempt scanned task-generated Astro compilation output left by an interrupted browser test. That folder was removed after verifying its resolved workspace path. Compilation now uses the existing ignored fixture .astro cache and cleans its unique scratch folder in finally; lint configuration is unchanged.

- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-28-48-593Z/computed-styles.json`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-28-48-593Z/native-astro-buttons.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-31-45-961Z/computed-styles.json`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-31-45-961Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-31-45-961Z/native-astro-buttons.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-31-45-961Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-36-56-433Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-36-56-433Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-37-34-342Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-37-34-342Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-38-41-534Z/combobox-selected-active.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-38-41-534Z/computed-styles.json`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-38-41-534Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-38-41-534Z/native-astro-buttons.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-38-41-534Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/combobox-selected-active.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/computed-styles.json`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/native-astro-buttons.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/native-select-picker.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/saved-layout-hover.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/shared-cards-1440.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-43-52-274Z/shared-cards-390.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/combobox-selected-active.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/computed-styles.json`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/native-astro-buttons.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/native-select-picker.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/saved-layout-hover.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/shared-cards-1440.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-48-39-488Z/shared-cards-390.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/combobox-selected-active.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/computed-styles.json`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/native-astro-buttons.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/native-select-picker.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/saved-layout-hover.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/shared-cards-1440.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-56-35-231Z/shared-cards-390.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/combobox-selected-active.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/computed-styles.json`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/native-astro-buttons.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/native-select-picker.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/saved-layout-hover.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/shared-cards-1440.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T20-59-09-204Z/shared-cards-390.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/combobox-selected-active.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/computed-styles.json`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/input-forced-colors.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/native-astro-buttons.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/native-input-focus.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/native-select-picker.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/saved-layout-hover.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/shared-cards-1440.png`
- `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-01-53-062Z/shared-cards-390.png`

## Select chevron follow-up: 2026-10-13

Developer request: replace filled triangles in all select dropdowns with the
sidebar's stroked V (`m4 6 4 4 4-4`, 16px, 1.8 stroke, rounded ends),
rotating upward as each dropdown opens. This is indicator presentation only.
Native React/Astro selects, color-coded selects and the retained searchable
combobox are in scope. Multiple and size-based inline listboxes are not
collapsed dropdowns and must not acquire a misleading arrow.

Declared files: `packages/ui/src/styles.css` (shared native indicator and
open/reduced-motion/forced-colors states), `apps/admin/src/phase15b.css`
(remove competing legacy indicator), `apps/admin/src/market/presentation.tsx`
(reuse its existing Chevron in SearchSelect), `apps/admin/src/market/dashboard.css`
(combobox icon geometry), `scripts/test-ui-foundations.ts` and
`tests/ui-foundations.test.tsx` (focused native/combobox regressions),
`UI_COMPONENTS.md` (select design correction), and this report. No controller,
option value, validation, dependency, routing or hydration changes are planned.

Baseline source: the sidebar Chevron already uses the desired stroked path.
Shared select fallback CSS also uses it, but base-select supplies an unstyled
native `::picker-icon`, producing the filled triangle. Legacy admin select
CSS owns a second fallback image. SearchSelect currently has no indicator.
All pre-existing local work, including the preceding Phase A changes, is retained.
Verification results and browser support limits are recorded below.

Implemented: one shared native indicator contract uses the exact sidebar
stroked path. The default native picker triangle is replaced with a 16px
currentColor SVG mask and a 180ms rotate transition from 0 to 180 degrees
when :open matches. The SVG fallback keeps the V in older engines and
switches orientation where :open is available; those engines cannot animate
the native picker icon smoothly without base-select/::picker-icon support.
Single selects with omitted size or size 0/1 are covered. Multiple/size>1
listboxes receive no added dropdown indicator. Forced colors use CanvasText
for the mask; reduced motion removes the rotation transition.

SearchSelect reuses the existing Chevron component inside a presentation-only
input wrapper. Its arrow follows aria-expanded, is aria-hidden and ignores
pointer events. Existing selection, filtering, focus, Enter/Escape, disabled
fieldset handling and clear actions are unchanged. Legacy admin arrow CSS
was removed so it cannot override the shared native indicator.

Checks run for this follow-up:

- With FRONTEND_NO_EVIDENCE=true, `npx vitest run tests/ui-foundations.test.tsx tests/phone-input.test.tsx tests/market.test.tsx tests/management.test.tsx tests/ui-component-gallery.test.ts`: 112 tests pass.
- `npm run typecheck`: pass, 78 Astro files and zero errors/warnings/hints.
- `npm run build`: both workspaces pass with the existing large-chunk warnings.
- `npx eslint apps/admin/src/market/presentation.tsx tests/ui-foundations.test.tsx scripts/test-ui-foundations.ts`: pass.
- `npx tsx scripts/check-boundaries.ts`: pass, nine workspaces.
- `npx tsx scripts/test-ui-foundations.ts`: pass. In Edge, all six native select specimens were checked in four CSS contexts at 390/1280px, including actual open/close rotation, SVG path/stroke dimensions, unchanged values on Escape and stable field geometry. SearchSelect V/rotation/pointer transparency, reduced motion and forced-colors icon contrast pass. Existing Phase A checks at all seven widths also pass.

Final evidence is in `docs/UI_COMPONENTS/evidence/phase-a-2026-10-13T21-32-28-179Z/`,
including `select-chevron-native-mobile.png`, `native-select-picker.png`,
`combobox-selected-active.png`, `select-chevron-forced-colors.png` and
`computed-styles.json`. Screenshots were visually inspected. The forced-colors
screenshot disables the gallery's existing entrance animation so the field and
indicator are captured at full opacity. Browser coverage is Edge; fallback
behavior in other engines remains a manual verification.

Manual review: use the existing gallery launcher and inspect SEL-01 through
SEL-07. Closed indicators point down; opened indicators point up; selection
or Escape closes native menus and rotates down. Try status choices, ordinary
selects and searchable filtering, then reduced motion/high contrast. Native
forms and submitted values retain their existing behavior. This follow-up
does not mark the broader ordinary-select consumer migration complete.

## Phase A Completion Pass: Remaining Consumer Migration

### Summary

Date: 2026-10-13. Status: **PHASE A: IMPLEMENTATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**.

All five requested groups are complete, including final source coverage and presentation cleanup. This pass migrated **313 applicable source presentation sites** across ordinary admin/vendor/market controls, native Astro account/storefront controls, operations/editor controls and separate Direct Vendor/Market commerce controls. There are no blocked ordinary consumers. Developer manual acceptance of these migrations remains pending.

The already reviewed foundations and later developer adjustments are the baseline. Default BTN-01/INP-02/SEL-03/CRD-02 designs were preserved, including the input/OTP focus treatment, outlined 16px V with 1.8 rounded stroke, actual-open rotation, centered native picker icon, neutral option hover, SEL-07 behavior and CRD-04 hover/expansion. No historical screenshots were used to restore earlier styling.

Reused Button, Input, Select, SelectField, Card, the existing native Button.astro adapter and renderer-neutral buttonClassName/inputClassName/selectClassName/cardClassName. No new primitive implementation, UI library, dependency or renderer was created. Astro remains SSR with its existing islands only.

### Category results

Counts are source presentation sites, not rendered instances, workflows or independent components. Parent surfaces and their child controls are different sites. Scans cover apps/admin/src, apps/storefront/src and packages/ui/src; fixture/gallery code and the underlying native primitive definitions are excluded. Existing shared caller sites are counted once, rather than multiplied by their consumers. Dynamic field types exclude checkbox/radio/hidden/file controls.

| Category | Historical remaining review                             | Current native review remainder                             |        Ordinary sites migrated |                  Already compliant at baseline |                         Retained cases | Blocked ordinary sites |
| -------- | ------------------------------------------------------- | ----------------------------------------------------------- | -----------------------------: | ---------------------------------------------: | -------------------------------------: | ---------------------: |
| BTN      | 121 native button sites; anchors inventoried separately | 7 native specialist button sites; 0 legacy action anchors   | 200 (114 buttons + 86 anchors) | 80 (79 Button sites + 1 RouteLink anchor site) |                                      7 |                      0 |
| INP      | 19 native ordinary input sites                          | 0 ordinary sites; OTP remains outside that historical count |                             19 |                                             26 | 1 OTP markup site rendering six digits |                      0 |
| SEL      | 43 native select sites                                  | 0 legacy ordinary sites                                     |                             43 |                                             16 |           2 specialist implementations |                      0 |
| CRD      | 31 native surface-family files                          | 8 files containing 18 retained surface sites                |                             51 |                                             13 |                                     18 |                      0 |

BTN action coverage includes the 62 historical styled action anchors plus 24 additional ordinary CTAs/paging/filter actions found during the current scan. Inline content links, brand links, sidebar navigation and linked KPI tiles keep their native feature presentation and are outside BTN action counts.

SEL's mixed ordinary/status Choice markup is assigned once to retained SEL-02; its ordinary branch already delegates to SEL-03. SearchSelect is counted once as the retained SEL-07 implementation, rather than counting every option. Neither is counted again among the 16 already compliant ordinary sites. Both already matched their approved specialist standards and were preserved.

The CRD inventory now identifies individual surfaces, including CSS-owned filter forms and operations record-list items. Two additional CSS-owned surfaces were found beyond the initial explicit inventory: the operations occurrence Control and central account-mode nav. The original dialog review wrapper also adopted the shared embedded contract. These account for the 51 migrations, 13 already compliant sites and 18 retained sites in a total of 82 reviewed surface sites. The old 31 figure counts files, so it cannot be subtracted from site totals.

All remaining ordinary source sites are MIGRATE (completed) or ALREADY COMPLIANT. The retained cases below have concrete geometry, interaction or later-phase boundaries; there are no BLOCKED ordinary sites.

### Implementation changes

- React ordinary native buttons/selects now use shared Button/Select. Shared package internals use pure helpers to avoid barrel-import cycles. Native buttons with omitted type explicitly retain submit when migrated; existing explicit button/submit types, handlers, disabled states, names and values are preserved. Selected editor tools/layers use existing primary/secondary variants while keeping aria-pressed and handlers.
- Astro buttons use the existing native adapter with explicit original submit defaults. Inputs/selects/action anchors/cards use pure presentation helpers. Form methods/actions, formnovalidate, GET parameters, query URLs, native labels/constraints and SSR frontmatter remain unchanged. PhoneInput keeps its native ref, formatting/caret/hydration/validation and hidden E.164 payload; only presentation classes change.
- Cards retain article/section/li/fieldset semantics and grid containment. Native form/nav surfaces use cardClassName because Card's approved semantic API does not include those tags. Contained list/grid cards do not add block margins; cart totals retain their feature-owned alignment and mobile placement.
- Necessary compatibility extension: Card and cardClassName accept surface="embedded". This adds no border, background, shadow, padding or margin, allowing content to inherit an existing dialog/card/disclosure surface. The default card appearance is unchanged. CommandForm and AssignmentCard gain optional presentation-only embedded props; the existing operations Control gains an optional className. These reuse the approved foundation instead of introducing a parallel card implementation. Nested management/vendor forms, directory dialogs, application review and assignment disclosure content use the explicit contract.
- Legacy styles in shared styles.css, admin phase15/phase15b, role CSS, dashboard/designer CSS and storefront checkout/vendor CSS now exclude migrated controls/surfaces or retain only layout constraints. Removed the contextual dialog command-section override and account-mode nav's independent border/padding. Narrowed ordinary input/select/surface overrides, kept specialist legacy rules, and preserved composite select widths, editor tool/layer layouts, cart alignment and reduced-motion behavior. No unrelated stylesheet cleanup was performed.

Exact consumer files were identified before each group's edits. The initial declared groups were:

- Group 1: `apps/admin/src/AccountModes.tsx`, `apps/admin/src/AdminApp.tsx`, `apps/admin/src/FixtureAdmin.tsx`, `apps/admin/src/management/AccountOnboardingReview.tsx`, `apps/admin/src/management/common.tsx`, `apps/admin/src/management/platform.tsx`, `apps/admin/src/market/analytics.tsx`, `apps/admin/src/market/CommandForm.tsx`, `apps/admin/src/market/common.tsx`, `apps/admin/src/market/OccurrenceMap.tsx`, `apps/admin/src/market/occurrences.tsx`, `apps/admin/src/market/operations.tsx`, `apps/admin/src/market/schedule.tsx`, `apps/admin/src/market/settings.tsx`, `apps/admin/src/market/vendors.tsx`, `apps/admin/src/vendor/analytics.tsx`, `apps/admin/src/vendor/booths.tsx`, `apps/admin/src/vendor/catalog.tsx`, `apps/admin/src/vendor/common.tsx`, `apps/admin/src/vendor/customers.tsx`, `apps/admin/src/vendor/markets.tsx`, `apps/admin/src/vendor/orders.tsx`.

- Group 2: `apps/storefront/src/components/CentralAccount.astro`, `apps/storefront/src/components/CustomerEvents.astro`, `apps/storefront/src/components/CustomerFollows.astro`, `apps/storefront/src/components/CustomerOrders.astro`, `apps/storefront/src/components/MarketHome.astro`, `apps/storefront/src/components/MarketPublicHome.astro`, `apps/storefront/src/components/ProductCards.astro`, `apps/storefront/src/components/VendorHome.astro`, `apps/storefront/src/layouts/CustomerLayout.astro`, `apps/storefront/src/pages/404.astro`, `apps/storefront/src/pages/account/admin-phone.astro`, `apps/storefront/src/pages/account/communications.astro`, `apps/storefront/src/pages/account/email-verify.astro`, `apps/storefront/src/pages/account/index.astro`, `apps/storefront/src/pages/account/login.astro`, `apps/storefront/src/pages/account/onboarding/[role].astro`, `apps/storefront/src/pages/account/orders/index.astro`, `apps/storefront/src/pages/account/orders/[id].astro`, `apps/storefront/src/pages/account/phone.astro`, `apps/storefront/src/pages/account/recover.astro`, `apps/storefront/src/pages/account/reset.astro`, `apps/storefront/src/pages/account/settings.astro`, `apps/storefront/src/pages/account/sign-in.astro`, `apps/storefront/src/pages/account/signup.astro`, `apps/storefront/src/pages/account/verify.astro`, `apps/storefront/src/pages/account/[section].astro`, `apps/storefront/src/pages/auth/claim.astro`, `apps/storefront/src/pages/auth/logout.astro`, `apps/storefront/src/pages/checkout/index.astro`, `apps/storefront/src/pages/checkout/success.astro`, `apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro`, `apps/storefront/src/pages/occurrences/[occurrenceId]/products/[variantId].astro`, `apps/storefront/src/pages/products/index.astro`, `apps/storefront/src/pages/products/[slug].astro`.

- Group 3: `apps/admin/src/market/phase14/ApplicationBuilder.tsx`, `apps/admin/src/market/phase14/ApplicationReview.tsx`, `apps/admin/src/market/phase14/Applications.tsx`, `apps/admin/src/market/phase14/Assignments.tsx`, `apps/admin/src/market/phase14/Billing.tsx`, `apps/admin/src/market/phase14/Directory.tsx`, `apps/admin/src/market/phase14/LayoutInspector.tsx`, `apps/admin/src/market/phase14/LayoutLayers.tsx`, `apps/admin/src/market/phase14/Layouts.tsx`, `apps/admin/src/market/phase14/OperationsRoutes.tsx`, `packages/ui/src/ApplicationFields.tsx`, `packages/ui/src/map/MapCanvas.tsx`, `packages/ui/src/MarketMap.tsx`, `packages/ui/src/PhoneInput.tsx`, `packages/ui/src/TimezoneField.tsx`.

- Group 4: `apps/storefront/src/components/Checkout.tsx`, `apps/storefront/src/components/CommunicationPreferences.tsx`, `apps/storefront/src/components/MarketApplication.tsx`, `apps/storefront/src/components/MarketCart.tsx`, `apps/storefront/src/components/MarketPurchase.tsx`, `apps/storefront/src/components/ProductPurchase.tsx`, `apps/storefront/src/components/PurchaseSuccess.tsx`, `apps/storefront/src/components/ShopSignIn.tsx`, `apps/storefront/src/components/VendorCart.tsx`.

The bounded compatibility/cleanup files were `tests/ui-foundations.test.tsx`, `packages/ui/src/styles.css`, `packages/ui/src/presentation.ts`, `packages/ui/src/index.tsx`, `apps/admin/src/vendor.css`, `apps/storefront/src/styles/vendor.css`, `apps/storefront/src/styles/checkout.css`, `apps/admin/src/vendor/inventory.tsx`, `apps/admin/src/phase15b.css`, `apps/admin/src/phase15.css`, `apps/admin/src/market.css`, `apps/admin/src/market/phase14/designer.css`, `apps/admin/src/market/phase14/common.tsx`, `apps/admin/src/market/dashboard.css`, `apps/admin/src/management.css`, `apps/admin/src/management/pos.tsx`, `apps/admin/src/management/catalog.tsx`, `apps/admin/src/AdminShell.tsx`. Additional presentation props were passed in existing management catalog/POS cards and vendor inventory dialogs; no command, authentication, payment, scheduling, layout geometry or application submission logic changed. The single existing foundation fieldset test now also covers embedded disabling semantics.

### Remaining exceptions

| File/component                                          | Retained sites / reason                                                                                                                                           | Approved appearance and next work                                                                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| packages/ui/src/index.tsx, InfoTip / Tabs               | 2 BTN sites: inline circular tooltip trigger and roving in-page tab selector                                                                                      | Keep existing TIP and TAB contracts; TAB appearance belongs to Phase D.                                                                                       |
| apps/admin/src/market/phase14/ApplicationBuilder.tsx    | 3 BTN sites: two draggable handles and transparent whole-question edit target; 6 CRD sites: authoring shell/title/question/publishing/nested publishing fieldsets | Retain CRD-05 authoring hierarchy, selected editing edge and hit-target geometry. Ordinary child controls migrated. No competing ordinary card is introduced. |
| apps/admin/src/market/phase14/Layouts.tsx               | 2 BTN panel selectors and 5 CRD sites: two saved-layout disclosures, two thumbnail/action cards and editor shell                                                  | CRD-04 approved padding/hover/expansion and TAB-02 retained editor panels preserved; canvas shell keeps fixed containment.                                    |
| apps/storefront/src/pages/account/verify.astro          | 1 INP-03 source site rendering six OTP inputs                                                                                                                     | Approved non-border focus correction preserved with aggregation/paste/keyboard logic. No ordinary-input replacement needed.                                   |
| apps/admin/src/market/common.tsx, Choice                | SEL-02 conditional status implementation                                                                                                                          | Approved colors/labels/values preserved. Ordinary branch uses SEL-03. No work required here.                                                                  |
| apps/admin/src/market/presentation.tsx, SearchSelect    | SEL-07 searchable combobox implementation                                                                                                                         | Approved chevron, instructional placeholder exclusion, neutral hover, selected/active distinction and clear action preserved. No work required here.          |
| apps/admin/src/market/phase14/Assignments.tsx           | 1 CRD disclosure surface                                                                                                                                          | Native summary/content hierarchy belongs to Phase D DDN. Embedded child AssignmentCard now uses the shared surface contract.                                  |
| apps/admin/src/market/phase14/Billing.tsx               | 1 CRD invoice surface                                                                                                                                             | Retain TBL-03 invoice/print geometry, table/content/totals. Ordinary buttons/select migrated. Invoice redesign belongs to Phase D.                            |
| apps/admin/src/vendor/catalog.tsx and vendor/orders.tsx | 2 CRD native record disclosure surfaces                                                                                                                           | Preserve native disclosure mechanics and selected DDN boundary; child command forms use embedded Card. DDN migration remains Phase D.                         |
| packages/ui/src/ApplicationFields.tsx                   | 1 CRD definition-driven fieldset source                                                                                                                           | Also used in borderless question previews; retain section/legend geometry. Native ordinary selects migrated without changing answers/validation.              |
| packages/ui/src/MarketMap.tsx                           | 2 CRD sites: positioned booth tooltip and native booth disclosure                                                                                                 | Transient tooltip bounds and summary/content map hierarchy remain specialized. Area select and ordinary map actions migrated.                                 |

Other feature geometry outside the explicit card-site inventory, including map viewports, layer rows, invoice line tables, checkout summary rows, account KPI links and day/billing supporting-data tiles, remains in its existing MAP/TBL/SUM/KPI scope. These are specialized interaction/data layouts or later-phase presentations, not unresolved ordinary Phase A cards. Their data, wrapping, containment and semantics remain intact. Account-panel/checkout-shell wrappers are page-width containers, not card surfaces.

### Verification

- FRONTEND_NO_EVIDENCE=true for all check execution.
- npm run typecheck: pass, TypeScript plus 78 Astro files with zero errors, warnings or hints. The initial attempt found runtime components merged into LayoutInspector's type-only import. Fixed that import and reran only the failed typecheck.
- One targeted Vitest invocation: tests/ui-foundations.test.tsx, tests/vendor.test.tsx, tests/market-operations.test.tsx, tests/phone-input.test.tsx, tests/market-application.test.tsx, tests/storefront.test.tsx and tests/market-storefront.test.tsx. **7 files / 94 tests passed**. No passing test check was repeated.
- npx tsx scripts/check-boundaries.ts: pass, nine workspaces, run once because shared UI imports/API changed.
- Final Git/scope inspection uses a snapshot of the pre-existing working tree rather than treating HEAD as the task baseline. Presentation markup/native attributes, non-presentation JSX expressions, non-markup React code and Astro SSR frontmatter were compared; only declared presentation imports/props/markup changed. Protected files/configuration/dependencies and pre-existing work remain preserved.
- No build, full test suite, browser automation, gallery harness, screenshots, visual evidence images or evidence directories were generated in this completion pass. Historical evidence above remains unchanged. No live authentication, commerce or operations testing occurred. Nothing was committed, pushed, published or deployed.

These lightweight checks do not establish computed-style geometry, cross-browser/native picker behavior, live functional acceptance or manual visual approval. The developer performs the final review. Phases B, C and D, all 20 approved selections and all 27 pending categories retain their previous implementation/design boundaries.

### Developer manual review checklist

Use existing local development servers: npm run dev:admin and npm run dev:storefront. Select available local fixture/authorized test contexts and actual IDs. These routes were not manually tested by Codex in this pass.

- Admin/vendor/market: /vendor/products, /vendor/inventory, /vendor/orders, /market/settings, /market/vendors, /platform/tenants. Inspect primary/secondary/destructive controls, ordinary selects, disabled/pending state, field labels and card spacing. Check forms embedded in existing cards/dialogs.
- Account forms: /account/login, /account/signup, /account/recover, /account/reset, /account/phone, /account/admin-phone, /account/settings and /account/onboarding/vendor or /account/onboarding/market with suitable state. Inspect native submit buttons, Save progress versus Finish, passwords, phone-country widths, OTP and approved focus cues.
- Public/customer: /products, /products/{slug}, /occurrences/{actualId}, /account, /account/markets, /account/vendors and /account/orders/{actualId}. Inspect native filter/paging action links, product/list surfaces, keyboard navigation, themes and narrow-screen wrapping.
- Operations/editor: /market/directory, /market/rentals, /market/application-submissions, /market/applications, /market/assignments/{actualOccurrenceId}, /market/day/{actualOccurrenceId}, /market/layouts and /market/layouts/{actualLayoutId}/edit. Inspect compact actions, selected tools/layers, inspector select widths, nested content padding, native form submitters, retained drag handles and saved-layout behavior.
- Commerce: separate Vendor and Market /cart, product purchase pages, /apply, /checkout and /checkout/success with existing suitable local test state. Inspect quantity/coupon actions, totals alignment, disabled/busy controls, review/edit actions and success links. Keep the two commerce contexts distinct.
- Specialists: review SEL-02 colors, SEL-07 keyboard/placeholder/clear behavior, INP-03 digits, CRD-04 thumbnails/expansion, question preview hit targets, editor panel selectors, map content and invoice/print layouts. Check keyboard focus, long labels, responsiveness and theme consistency. This checklist is for developer review and does not authorize real purchases, publishing or operational mutations.

## Phase A Manual Review Remediation: 2026-10-13

Status: **IMPLEMENTATION COMPLETE: MANUAL REMEDIATION REVIEW PENDING** for ordinary Phase A presentation coverage. **Customer/cart runtime acceptance and legacy admin-phone retirement remain outstanding.** No manual acceptance is claimed.

The initially dirty and untracked working tree was inspected before edits. Existing work was preserved through targeted local edits. No other migration phase was started.

| Issue                       | Root cause                                                                                                                                                                | Files changed                                                                                                                                       | Resolution                                                                                                                                                                                                                                                                                                                         | Manual test                                                                                                | Status                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1. Objective                | Manual regressions after atom migration                                                                                                                                   | Files listed below                                                                                                                                  | Bounded remediation, preserved 313-site coverage                                                                                                                                                                                                                                                                                   | Actual application routes                                                                                  | Manual review pending                                    |
| 2. Baseline/reading         | Shared atoms did not own row geometry                                                                                                                                     | Shared UI styles, registry                                                                                                                          | Read root guidance, Phase A report, plan/audit and account/frontend/commerce docs; inspect dirty tree                                                                                                                                                                                                                              | Compare retained specialists                                                                               | Preserved                                                |
| 3. Customer login           | Native Admin form used for customers; central origin/key absent locally; Admin handoff rejects customer-only identities                                                   | AdminApp.tsx; storefront lib/account.ts; account/login.astro; api/account.ts                                                                        | Primary configured platform sign-in enters existing central login. Denied Admin return requires a valid central profile and phone proof before routing to personal /account. Successful authorized handoffs stay unchanged. A validated session without workspace grants gets personal navigation, not Workspace unavailable       | Platform sign-in, merchant /account/login and central /account; multi-role switching, expiry/logout        | Mock outcomes pass; real configuration blocked           |
| 4. Guest carts              | No UI authentication gate found; misleading forbidden message; SSR bootstrap discarded newly issued cookies; backend guest ownership requires configured customerAccounts | packages/api/src/storefront.ts; storefront cart.astro; products/[slug].astro; occurrences/[occurrenceId]/index.astro and products/[variantId].astro | Forward existing backend session cookies through SSR response; retain existing server-owned cart, IDs, scope/quantity checks and authoritative prices. Remove false sign-in-required error                                                                                                                                         | Logged-out vendor and market add/view/adjust/remove; revisit each cart separately                          | Mock outcomes pass; real acceptance unresolved           |
| 5. Admin sign-in cleanup    | Obsolete alternate entry button and missing inline navigation                                                                                                             | AdminApp.tsx; account/login.astro                                                                                                                   | Remove Use my platform account. Existing /account/recover and /account/signup links use configured central origin in Admin. Central form places recovery above submit and signup below. Existing native Admin submission/errors/loading remain available via ?native=1, or as the unconfigured fallback; no fabricated destination | Platform and central sign-in pages                                                                         | Implemented; configured runtime retest required          |
| 6. Legacy admin-phone       | Only existing enrollment route for unverified native-username administrators; unifiedLogin accepts email only                                                             | AdminApp.tsx                                                                                                                                        | General workspace-error link now points to canonical /account/phone. Retain legacy route and its API handlers until safe retirement is authorized; no verification or grant bypass                                                                                                                                                 | Verify normal email-account /account/phone; audit native-username legacy accounts                          | Retirement blocked by security contract                  |
| 7. Control heights          | Buttons used 0.65rem block padding versus 0.7rem fields; a 44px minimum did not equal actual height                                                                       | packages/ui/src/styles.css; vendor/orders.tsx; management/platform.tsx; designer.css                                                                | Shared ordinary minimum derives from INP-02 text/padding/borders. Compact specialists retain 44px; adjacent designer commands inherit the ordinary height. Explicit control rows place labels, controls and feedback separately                                                                                                    | Vendor order lookup and similar filters/editor commands, desktop and narrow screen                         | Manual review pending                                    |
| 8. Adjacent/wrapped buttons | Global sibling inline margins and separate dialog CTA placement                                                                                                           | Shared styles/index.tsx; phase15.css/phase15b.css; vendor/common.tsx; market CommandForm/presentation; affected editor/review consumers             | Structural ui-actions gap supplies both axes; remove sibling margins; secondary Close; use existing dialog action slots without changing lifecycle                                                                                                                                                                                 | Wrap action pairs and inspect confirmation/cancel states                                                   | Manual review pending                                    |
| 9. Suspension modal         | CRD-02 last-child margin-bottom:0 overrode native dialog centering inside CommandForm                                                                                     | Shared styles; phase15.css; market/CommandForm.tsx                                                                                                  | Exclude dialogs from card spacing; scoped fixed inset/auto margins, viewport gutters and scrolling; existing native trap, busy veto and close callback retained                                                                                                                                                                    | /market/settings suspension confirmation, Escape, focus return and small viewport; cancel without mutation | Manual review pending                                    |
| 10. Phone country           | Native select had one shared menu/selected label                                                                                                                          | Shared SearchSelect.tsx, PhoneInput.tsx, styles.css; admin presentation/dashboard CSS                                                               | Reuse SEL-07 with separate committed display: prefix only; expanded country names and ISO values retained. Same phone parsing/E.164/caret controller; full country announced via description                                                                                                                                       | /account/signup or /account/phone: US/Canada both +1, UK +44; keyboard and pasted numbers                  | Focused tests pass; manual review pending                |
| 11. Add Vendor              | Separate directory search/paging/native selection                                                                                                                         | market/vendors.tsx; shared SearchSelect.tsx; CommandForm/presentation                                                                               | One debounced authoritative eligibleVendors search, take 20 per query. Existing ID/permission/relationship command retained; loading suppresses stale options, selection survives search, clear/empty/error supported. Create/Close share one wrapping row                                                                         | /market/vendors, type a business outside the initial page; clear and cancel                                | Focused remote-search test passes; manual review pending |
| 12. Tenant filters          | Field block margins shifted controls above the bottom-aligned button                                                                                                      | Shared styles; management/platform.tsx                                                                                                              | Shared control-row label/control/feedback slots, matching height and wrapping                                                                                                                                                                                                                                                      | /platform/tenants                                                                                          | Manual review pending                                    |
| 13. Layout cards            | Long labels/default density crowded cards                                                                                                                                 | phase14/Layouts.tsx                                                                                                                                 | Compact Edit/Copy/Archive with layout-specific accessible names; retained CRD-04 disclosure and commands                                                                                                                                                                                                                           | /market/layouts                                                                                            | Focused command tests pass; manual review pending        |
| 14. Layout editor           | Heavy default tool labels, mismatched compact actions, sibling margins; Canvas settings is actually native details/summary                                                | designer.css; LayoutInspector.tsx; shared styles                                                                                                    | Normal tool weight; aligned command controls; gap-based area actions. Canvas settings retains disclosure semantics with the approved centered V/open rotation; existing ordinary selects already use SEL-03. TAB-02 and canvas model retained                                                                                      | /market/layouts/{id}/edit: tools, command wrapping, Canvas settings and select open state                  | Manual review pending                                    |
| 15. Application actions     | Generic secondary/primary status choices; Save separate from dialog Close                                                                                                 | ApplicationReview.tsx; Applications.tsx; dashboard.css; dialog presentation                                                                         | Feature BTN-01 outline uses existing status-tone tokens, white-text filled hover, pressed underline/inset border. Primary Save and Close beside secondary Close through existing dismissal/busy handling                                                                                                                           | /market/application-submissions: status hover/focus/pressed; close during request                          | Focused tests pass; manual review pending                |
| 16. Boundaries              | Cross-renderer reuse must keep controllers separate                                                                                                                       | Shared SearchSelect export and thin retained admin re-export                                                                                        | No backend, schema/generated code, dependency/lockfile, payment/operation command, canvas model or deployment changes                                                                                                                                                                                                              | Existing grant/scope behavior                                                                              | Preserved                                                |
| 17. Verification            | Full evidence runs explicitly excluded                                                                                                                                    | Three focused test files (two existing updated, one new)                                                                                            | 8 files / 80 tests passed in one invocation; package boundaries pass (9 workspaces); typecheck passes after correcting synthetic fixture fields                                                                                                                                                                                    | Developer performs visual/workflow checks                                                                  | Passed lightweight checks                                |
| 18. Documentation/status    | Remediation must not imply acceptance                                                                                                                                     | This report; root UI_COMPONENTS.md                                                                                                                  | Record actual causes, implementation and blockers; preserve approval decisions                                                                                                                                                                                                                                                     | Review outstanding items                                                                                   | Updated; acceptance pending                              |
| 19. Manual guide            | Functional blockers precede visual review                                                                                                                                 | This report and final response                                                                                                                      | Test order below uses real routes                                                                                                                                                                                                                                                                                                  | Follow ordered guide                                                                                       | Pending developer                                        |
| 20. Final scope             | Local work only                                                                                                                                                           | Declared files only                                                                                                                                 | No screenshots/evidence folders/browser automation/full-suite runs/builds/commit/push/PR/deployment                                                                                                                                                                                                                                | Review local diff                                                                                          | Preserved                                                |

### Functional findings and exact dependencies

A read-only GET of the existing local server at http://localhost:4321/account/login returned HTTP 200 with “Account sign-in is temporarily unavailable.” Root .env contains neither PLATFORM_ACCOUNT_ORIGIN nor PLATFORM_ACCOUNT_BRIDGE_KEY. isCentral therefore treats this as a merchant route, while centralSignIn cannot construct the configured central destination. The missing central origin/key is a supported configuration cause, not a guessed callback or password failure. The main Admin login previously called native Admin authentication and then workspace resolution for every account. The configured entry now uses the existing central capability and purpose-bound handoff architecture. **Real customer platform sign-in has not been demonstrated working in this environment.**

Local configuration must supply a matching PLATFORM_ACCOUNT_ORIGIN and server-only PLATFORM_ACCOUNT_BRIDGE_KEY to the existing storefront and backend, plus the actual ADMIN_ORIGIN for Admin return routing. No secret was generated, copied or exposed. No backend/environment files were changed. Native username Admin login remains available via the inline Administrator sign-in link (?native=1), and remains the default when central entry is unconfigured. This reuses the existing native form and session checks; the query selects presentation only. The existing central recovery route is implemented; actual delivery depends on its existing backend configuration.

Guest purchase components and /api/shop already permit anonymous add/read/adjust/remove and use the native active Order, not browser-stored prices or a second cart. OrderContextService.ownedOrder explicitly requires customerAccounts and the persisted anonymous Session ownership when activeUserId is absent. Backend vendure-config enables customerAccounts only with its matching account origin/key. Those keys are absent from the backend root .env as well; process overrides were not verified. Read-only resolution of localhost:4321, manna-roots.localhost:4321 and boerne-farmers-market.localhost:4321 against the current local API returned 404. **The reported real add-to-cart failure was not reproduced with a usable authoritative product/context, so guest cart acceptance remains unresolved.** Synthetic BFF tests verify anonymous cookies, separate vendor/market scope, edit/remove/revisit and no login request. Current backend source already supports the required guest contract when configured; no missing API schema was identified. Matching configuration and valid active storefront/product/occurrence records are required before attributing any further failure or proposing backend changes.

Legacy native-username Admin identities cannot use unifiedLogin's email validation to enter /account/phone. requestAdministratorPhone validates real native credentials and existing Administrator identity, then proves SMS without manufacturing grants. Deleting its sole page/handlers would strand those identities behind the authoritative phone requirement. This route is retained under task section 6's security-contract exception. Safe retirement requires an explicit decision about these existing identities and an authorized supported backend transition or trusted remediation; customers were not given Admin access.

### Reuse and verification limits

The new shared SearchSelect file extracts the existing SEL-07 implementation rather than creating a competing picker. Its previous admin path re-exports it. Remote-query, loading and separate selected-label props are required by vendor directory search and cross-browser country presentation; native select cannot reliably provide both labels. No phone-number controller was replaced. Dialog action slots only arrange existing controls; lifecycle consolidation remains deferred. Native Canvas settings is a disclosure, not a select; its current behavior was preserved.

Checks: FRONTEND_NO_EVIDENCE=true. One focused Vitest invocation covered phase-a-remediation, phone-input, ui-foundations, layout-library, market-dashboard, admin, storefront and market-storefront: **80 passed**. Boundary check: **9 workspaces valid**. npm run typecheck initially found missing slug/status properties in the new synthetic vendor fixture; corrected those fields and reran only the failed check: **TypeScript and Astro pass, 78 Astro files, zero errors/warnings/hints**. No automated check establishes computed heights, visual centering, browser picker geometry or real authenticated/cart acceptance. No live signup, SMS, purchase, payment or operations mutation occurred. The brief owned sandbox server attempt was stopped; existing local servers were left running.

### Manual retest order

Use npm run dev:admin and npm run dev:storefront only as needed after the matching local account configuration is available. Existing local Admin is http://localhost:4322; the storefront is http://localhost:4321. Use the configured central account hostname and currently valid storefront IDs/hosts, not the gallery.

1. Platform sign-in: customer reaches /account; authorized multi-role accounts retain workspace/account switching; expired sessions and logout remain enforced.
2. Storefront /account/login: central handoff and personal dashboard; required phone enrollment remains enforced.
3. Logged-out Direct Vendor /products/{slug}: choose variant/quantity, add, open /cart, adjust/remove, navigate away and return.
4. Logged-out Market /occurrences/{id}/products/{variantId}: add to that occurrence, edit /cart, return; vendor and market carts stay separate and nonempty occurrence switching stays guarded.
5. Admin and central login: recovery above Sign in, inline Sign up here below, obsolete alternate button absent.
6. /vendor/orders: lookup edges align with the reference input; check narrow layout.
7. /market/settings: suspension confirmation centered, scrollable, focus/dismissal correct; cancel for visual review.
8. Central /account/signup or /account/phone: closed prefix only, full countries when expanded, keyboard selection, same-prefix country validation and caret behavior.
9. /market/vendors: one searched selector, actual ID, beyond-initial-page search, clear/empty/loading/error; Create relationship/Close spaced and wrapping.
10. /platform/tenants: all control edges align; labels and narrow wrapping remain correct.
11. /market/layouts and /market/layouts/{id}/edit: compact names, wrapping gaps, lighter tool labels, matching command/select heights and Canvas settings V/open state.
12. /market/application-submissions: status outline/hover/pressed/focus, primary Save and Close beside secondary Close, busy dismissal veto and retained drafts.

## Phase A Second Manual Review Remediation: 2026-10-13

### A. Summary

Local presentation and entry-point corrections are implemented. Developer manual acceptance is pending. The root Admin app uses one sign-in presentation with an explicit in-page choice of supported authentication mechanism, rather than a query-selected alternate page. Existing central email authentication and native administrator username authentication remain separate backend mechanisms. Email credentials continue to be collected on the existing central account origin, preserving the existing cookie and handoff boundaries.

The reported real cart 403 is **not marked resolved**. Source inspection identified a concrete disabled guest-ownership configuration condition and three product/occurrence SSR calls that still discarded issued cookies despite the previous report. Those frontend calls are corrected and the ignored frontend environment now contains the supported local account settings. However, the configured backend API is stopped and its current development database contains **zero storefront records and zero enabled products**. No valid Vendor or Market add request, signed-in account, or completed cart flow could be exercised. No backend source, tracked backend environment, migration, schema, grant, inventory, payment, checkout, or order command was changed.

The initially dirty/untracked tree was inspected and preserved. Earlier report sections remain historical records; the findings below supersede their claims about product-page cookie forwarding and retaining `?native=1` as an alternate entry.

### B. Issue table

| Issue                                 | Actual root cause                                                                                                                                                                                                                                                                                                                                        | Files changed                                                                                                                                                                                                        | Fix implemented                                                                                                                                                                                                                              | Status                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Guest cart 403                        | Reported HTTP failure cannot be reproduced against a stopped API and empty storefront/catalog database. `OrderContextService.ownedOrder` separately rejects anonymous ownership when `customerAccounts` is disabled; both local environments lacked its origin/key configuration. Product/occurrence SSR bootstrap calls still omitted response headers. | Ignored root `.env`; storefront `config.ts`; Vendor product and both Market occurrence/product Astro routes; `pages/api/shop.ts`                                                                                     | Supply development account settings to frontend SSR; provide the supported backend process startup command below; persist issued SSR cookies; add bounded development-only failure-stage diagnostics. No security gate removed.              | Configuration/frontend corrections implemented; real 403 source and acceptance unresolved |
| Root 4322 sign-in                     | Configured root used a redirect-only presentation while `?native=1` selected a distinct native form, with an Administrator sign-in detour. Missing account configuration also made the central path unavailable.                                                                                                                                         | `AdminApp.tsx`; `account-login.ts`; storefront `config.ts`; ignored `.env`                                                                                                                                           | One root form and method selector. Central email entry uses the existing account flow; administrator usernames expose the native credential fields within the same page. Remove detour and normalize the old query.                          | Static/unit and HTTP entry checks pass; live sign-in pending                              |
| Customer versus workspace routing     | Customer identity is not administrative authority. Central login requires actual phone proof; an Admin handoff requires an Administrator identity.                                                                                                                                                                                                       | Existing routing retained; focused auth tests in `phase-a-remediation.test.tsx`; stale revoked-grant expectation corrected in `vendor.test.tsx`                                                                      | Retain validated personal-account fallback and existing authorized channel/workspace resolution; never probe identity existence or retry another mechanism based on failed credentials.                                                      | Mock routing checks pass; real identity/backend required                                  |
| Signup/recovery navigation            | Distinct sign-in branches duplicated placement and route handling.                                                                                                                                                                                                                                                                                       | `AdminApp.tsx`                                                                                                                                                                                                       | One recovery link immediately above the primary submit; one signup sentence below, with only Sign up here linked to the configured central origin. Existing central pages retained.                                                          | Manual navigation/delivery acceptance pending                                             |
| Permanent control geometry            | The earlier 50px minimum did not constrain intrinsic/native outer height, inherited font metrics, or grid width. Generic legacy fields and ordinary controls had different sizing authorities.                                                                                                                                                           | UI `styles.css`; `SignupPasswords.tsx`                                                                                                                                                                               | Explicit ordinary field outer height, shared font/line/padding geometry, border-box, reusable inline/control/action rows, separate feedback slots.                                                                                           | Implemented; rendered visual acceptance pending                                           |
| Vendor lookup width                   | Auto-fit grid gave the action a flexible column like the input, and its grid item stretched horizontally.                                                                                                                                                                                                                                                | UI `styles.css`; vendor `orders.tsx`                                                                                                                                                                                 | Lookup variant uses flexible input plus max-content action column; button start alignment and natural width. Deliberate one-column narrow layout.                                                                                            | Manual review pending                                                                     |
| Tenant filter heights                 | `min-height` plus native select/inherited text sizing did not guarantee the reference height. Setting one button minimum and removing field margins did not establish common outer geometry.                                                                                                                                                             | UI `styles.css`; existing `management/platform.tsx` control-row markup reused unchanged                                                                                                                              | Ordinary inputs and single-value selects use exact reference outer height; actions use the same line/border/padding geometry. Existing label/control/feedback subgrid retained.                                                              | Manual review pending; query logic unchanged                                              |
| Application Save and Close / Close    | Save used compact 44px sizing; Close used ordinary 50px sizing.                                                                                                                                                                                                                                                                                          | `phase14/ApplicationReview.tsx`; UI `styles.css`                                                                                                                                                                     | Ordinary primary Save and Close, secondary Close on its right; shared modal action row and wrap gaps.                                                                                                                                        | Manual review pending; save/draft/dismiss behavior retained                               |
| Modal action rows                     | Shared footer slots alone did not include primary buttons embedded in form bodies. Compact/default heights also remained mixed.                                                                                                                                                                                                                          | UI `index.tsx` / `styles.css`; market `presentation.tsx` / `CommandForm.tsx`; vendor `common.tsx` / `inventory.tsx`; market `vendors.tsx`; phase14 `Directory.tsx` / `LayoutInspector.tsx` / `ApplicationReview.tsx` | Shared wrapping action geometry. Put simple pairs together through existing action slots or CommandForm secondary actions; Directory Save keeps native submit via its form id. Use the existing MarketDialog dismiss callback and busy veto. | Bounded action-layout migration implemented; manual lifecycle/wrap review pending         |
| Vendor order statuses/cards           | Native order, pickup, fulfillment and existing financial projection were plain text with no vendor-specific presentation mapping.                                                                                                                                                                                                                        | Vendor `orders.tsx`; new `order-presentation.ts`; UI `presentation.ts` / `styles.css`; market `dashboard.css`                                                                                                        | BDG-02 shared tone/text presentation with vendor-owned domain mappings. Show financial status only when returned; group existing status/context and pickup facts in CRD-02. Unknown/domain-mismatched states remain neutral.                 | Targeted early adoption; manual review pending                                            |
| Vendor ordinary selects               | Inspection found the Orders context select already uses shared Select; OrderDetail has no ordinary select. Product option selects also already use shared Select.                                                                                                                                                                                        | Existing selectors retained; shared sizing refined                                                                                                                                                                   | Preserve values, events, outlined V and existing supported native open-state rotation. Do not fabricate selectors or claim nonexistent old markup was replaced.                                                                              | Existing SEL-03 coverage retained; manual geometry review pending                         |
| Vendor order/product disclosures      | `record-details` used bottom-rule styling with no independent surface or padded content boundary. Embedded forms inherited zero card padding, so actions could approach the disclosure edge.                                                                                                                                                             | Vendor `orders.tsx` / `catalog.tsx`; UI `presentation.ts` / `styles.css`                                                                                                                                             | DDN-03 native details surface, summary indicator, padded/gapped content and nested-surface contract. Embedded CommandForms retain one surrounding padded surface.                                                                            | Targeted early adoption; manual review pending                                            |
| Verification, documentation and scope | Mocks/static checks cannot establish actual browser geometry or live credentials/cart ownership.                                                                                                                                                                                                                                                         | Two focused test files; this report; root registry                                                                                                                                                                   | Lightweight checks only; precise runtime prerequisites and manual checklist below. Preserve all approved candidate IDs and unrelated pending decisions.                                                                                      | Recorded; Phase A is not manually accepted                                                |

### C. Permanent Form Control Alignment Contract

The developer-approved reference is `/account/signup`'s password input and adjacent Show button in `SignupPasswords.tsx`. Its actual source uses a flex row, a flexible zero-minimum-width input, a natural-width action, inherited body typography, one-pixel borders and border-box sizing. The prior shared minimum was `calc(3rem + 2px)`, not 44px. At a 16px root font this is **50px**: a 1.6rem text line (25.6px), two 0.7rem block paddings (22.4px), and two 1px borders. The old account button margins could move actions even when minimum heights agreed.

The adopted common geometry is `--ui-control-height: calc(3rem + 2px)`, `font-size: 1rem`, `line-height: 1.6`, `box-sizing: border-box`, 0.7rem block padding and a 1px border. `.ui-input` and ordinary single-value `.ui-select` have that explicit outer height. `.ui-button` has the same minimum and text/padding/border geometry; a genuinely wrapped button label can grow rather than clip. Ordinary modal pairs stretch equally within a flex line. Multiple/size-list selects, textarea, OTP, checkbox/radio, disclosure/icon controls and standalone compact specialists retain their own contracts.

Reusable construction rules:

- **Adjacent unlabelled controls:** `.ui-inline-controls` is a flex row with a 0.5rem gap. The input uses `flex: 1 1 0; min-width: 0`. The action uses `flex: 0 0 auto; width: auto; margin: 0`. Signup's existing `.password-control` now also carries this shared class. Labels and helper/error text belong outside this inline row. This matches geometry without copying Show's secondary colors into primary actions.
- **Labelled search/filter rows:** use `.ui-control-row` on the form. Existing `Field`, `SelectField`, and compatible `.ops-field` wrappers occupy shared label, control and feedback tracks via subgrid. Put an action inside `.ui-field-action`, not inside a field label or helper paragraph. Fields and controls have zero contextual row margins; help/error paragraphs occupy track 3. The responsive auto-fit grid wraps whole fields without treating error text as part of a control's alignment edge.
- **A flexible lookup field plus one action:** add `.ui-control-row-lookup`. It uses `minmax(0, 1fr) max-content`; below 600px it deliberately stacks. `.ui-field-action > .ui-button` uses `justify-self: start`, `align-self: start`, natural width and the ordinary minimum. Do not use `width: 100%`, `flex: 1`, or an equal-width action column to construct a lookup button.
- **Ordinary modal action pairs:** use `className="ui-actions ui-modal-actions"`. DOM order is primary submit/confirm, then secondary Close/Cancel. The row is `display: flex; flex-wrap: wrap; align-items: stretch; gap: 0.8rem`. Direct BTN-01 actions have natural width, no inherited margin, and no flex growth. The modal modifier normalizes compact/default buttons to the ordinary shared height. Both horizontal and wrapped-row spacing come from gap, never sibling `margin-left`.
- **Preserve behavior:** use the current Dialog/MarketDialog `actions` slot for a standalone primary action. For a primary inside CommandForm, use `secondaryAction` and suppress only the duplicate outer footer with `showClose={false}`. Market callers use the supplied `dismiss` callback so animation, dirty-state checks and busy veto stay intact. A submit moved to a dialog footer must keep `type="submit"` and `form={formId}`. Do not change command handlers, verification, revisions or uncertain-outcome policy to align buttons.
- **Keep appearance semantic:** `<Button type="submit">` remains dark-green primary; `<Button variant="secondary">` remains secondary. The geometry classes do not overwrite the approved color/hover variants. Retain explicit destructive or specialist variants as appropriate.

Concrete React example, using existing primitives:

```tsx
<form className="ui-control-row ui-control-row-lookup" onSubmit={lookup}>
  <Field id="reference" label="Order reference" error={error}>
    <Input id="reference" name="reference" required />
  </Field>
  <div className="ui-field-action">
    <Button type="submit">Look up order</Button>
  </div>
</form>
```

For multiple filters, omit `ui-control-row-lookup` and add existing `SelectField` wrappers before the `.ui-field-action`. Astro uses the same renderer-neutral classes and native form controls; sharing geometry does not require hydration.

Conflicting relationships corrected: equal-width auto-fit action columns; grid's default horizontal stretching; minimum-only input/select sizing; inherited ordinary font metrics; default button block padding differing from field padding; compact Save versus default Close; account-context margins on Show; and simple dialog primary actions sitting outside the shared footer. No repeated `!important`, negative offsets, translations or additional height variant was introduced. Existing legacy mobile full-width filter rules lose to the explicit ordinary row contract rather than being copied into new pages.

### D. Authentication

Previously the configured root presented a central sign-in action and an Administrator sign-in link to `?native=1`. That query selected a separate native credential form. Now both mechanisms are available from the root's **one form and explicit Sign in with selector**. Choosing Administrator username reveals the existing native fields within that presentation. The old query is removed from browser history during startup and cannot select another presentation. There is no Administrator sign-in link, alternate standalone page, credential migration or identity-existence probe.

Choosing Platform email account follows `platformAccountLogin` to the existing central `/account/login`, which collects credentials and retains its HttpOnly central cookie. This remains a secure top-level handoff, not a new cross-origin credential API. Customer-only accounts use the validated central profile and phone-proof path to central `/account`; actual Administrator identity is required for Admin-purpose handoff. Current channel permissions, memberships and backend identity determine Platform, Market and Vendor workspaces. Existing multi-role/account switching remains in place. Native username accounts continue to use native Admin authentication, session restoration and workspace validation; the existing `/account/admin-phone` enrollment route is retained for identities that need it.

Local configuration now exists in the **ignored frontend root `.env`**: `PLATFORM_ACCOUNT_ORIGIN=http://auth.platform.localhost:4321`, `ADMIN_ORIGIN=http://localhost:4322`, and a securely generated development-only `PLATFORM_ACCOUNT_BRIDGE_KEY`. No secret value is printed or recorded here. `config.ts` explicitly loads these server-only settings into the Astro development SSR process; Astro's development env loader does not populate `process.env` the way its build loader does. The bridge key is never included in Vite client defines.

The backend `.env` is **tracked**, so it was left byte-for-byte untouched. Load the same ignored frontend environment into the backend process using the supported Node environment-file option and existing Vendure CLI, from the backend folder:

```powershell
cd E:\coding\farmers-market-platform
node --env-file=E:/coding/farmers-market-platform-web/.env ./node_modules/@vendure/cli/dist/cli.js dev server
```

The backend's existing dotenv startup still supplies its unrelated database/credential settings without overwriting these already loaded account values. Its development `localStorefrontPort` already defaults to 4321. This command preserves existing configuration and uses matching account settings only where required. Normal backend startup invokes the project's existing migration runner, so **it was not executed in this task**. Use an already prepared, approved development database and the existing migration policy. Do not place this development key in a tracked file or reuse it for production.

HTTP diagnostics: outside the sandbox, native loopback requests with the intended Host header returned 200 and the expected central login/signup forms. `localhost:4322/` and `localhost:4322/?native=1` returned the same Admin SPA entry. This proves local serving/configuration and form rendering only. The sandboxed Astro attempt failed when evaluating CommonJS React; the same unchanged server configuration started normally outside the sandbox. All temporary diagnostic instrumentation and unsuccessful externalization experiments were removed. No actual credentials were submitted, so **live customer and administrator sign-in success remains unverified**.

### E. Guest cart

Trace: Vendor `ProductPurchase` and Market `MarketPurchase` submit anonymous same-origin JSON through `shopCall` to `/api/shop`. Storefront middleware first checks same-origin mutation safety and resolves the actual approved hostname/channel. The BFF checks canonical origin, storefront identity, ids and integer quantities. Vendor add selects `DIRECT_VENDOR` and verifies its Vendor identity; Market add selects the specified occurrence and validates its Market context. Existing native Shop operations and snapshots retain server-owned active orders and authoritative variants/prices.

`requestOptions` forwards native cookies to Vendure and remembers issued cookie pairs between GraphQL calls within one adapter. It appends each returned Set-Cookie to the response headers supplied by the caller. Cart SSR and BFF responses already supplied that transport. The three product/occurrence bootstrap callers did not, despite the previous remediation report. They now pass `Astro.response.headers`; issued anonymous cookies can persist into the browser before the add request. Existing isolation and context validation remain unchanged.

Backend `OrderContextService.ownedOrder` explicitly requires configured `customerAccounts` and a native `ctx.session.id` for guest access, then verifies the persisted session's active order or checkout-contact session binding. `vendure-config.ts` enables that integration only when both account origin and bridge key exist. Their absence in the current local configuration is a deterministic guest-ownership rejection condition. The frontend settings and backend startup command above correct that condition for the next properly configured local process. The backend guard itself is not modified.

**Actual reported 403 HTTP layer and sanitized response body: not available.** No valid authoritative storefront/product request can be made against the present runtime. Backend port 3000 returned connection refused; read-only PostgreSQL transactions found account/phone capability tables but zero `platform_storefront` records and zero enabled products. The unauthenticated catalog request returned 503 while the API was stopped. No guest session, cart line, completed order or payment was created during these diagnostics. Do not equate source-level disabled-integration findings or mocked cart tests with reproduction of the developer's 403.

A future failing BFF request now emits a development-only sanitized `shop_request_failed` event with stage (`storefront-resolution`, `origin-check`, `request-validation`, `shop-operation`), HTTP status, safe error kind/code and storefront kind. It records no credentials, cookies, bridge key, channel token, raw response, request body or customer data. Existing HTTP/error semantics are preserved. Middleware-origin denials remain their existing 403 Request denied response; backend GraphQL failures remain safely normalized by the API transport.

Reproducible setup path: select the developer's existing populated development database using the backend's normal local configuration; start its API with the matching environment command above; start both frontend applications from this web folder with `npm run dev`; select an active Vendor/Market storefront and approved route key using the existing provisioning/demonstration instructions in `docs/testing-vendors.md` and `docs/boerne-test-market.md`. The currently configured empty database must first have approved development storefront/catalog data made available by the developer. No reset or seed script was run. A Market test additionally needs a future scheduled occurrence, an eligible published offering, an open preorder window and available stock. Once those prerequisites exist, perform the guest-cart checklist below. If a 403 persists, capture its sanitized BFF response/stage and backend safe GraphQL code before proposing any protected backend source change.

### F. Targeted design adoption

**Targeted early adoption of approved future-phase visual standards.** `statusBadgeClassName(tone)` in the existing renderer-neutral UI presentation module supplies BDG-02 appearance. The tone tokens and CSS are shared with compatibility selectors for the existing Market badges; their feature mappings and classes are retained. New `vendor/order-presentation.ts` keeps order, payment/refund, pickup and fulfillment meanings separate, based on the current vendor projections. Unknown or another domain's status remains neutral, including object-prototype names. Native order/payment/fulfillment commands are untouched.

Vendor OrderDetail groups status/context and pickup promise with existing CRD-02 Card. It shows the existing financial status only when that projection is available, with existing monetary values untouched. OrderDetail has no legacy select to replace; its Orders context select and ProductDetail option selectors already use shared SEL-03. Their exact values/actions and supported chevron rotation remain intact.

`disclosureClassName()` provides the thin native DDN-03 presentation adapter: one independent details surface, 8px radius, approved summary padding/hover/V indicator, 1rem padded content, and a 1rem gap between embedded sections. Nested `.ui-disclosure` elements receive independent surfaces and gaps. The specified Vendor order management and product variant disclosures adopt it; their native summary keyboard behavior, expansion state, existing mounted forms, ids and validation stay intact. Embedded CommandForms avoid duplicate card borders/padding. The content wrapper owns bottom padding so actions do not touch a card border.

No new React primitive was needed: Button, Input, Select, Field and Card are reused. The small Vendor-local `OrderStatus` adapter is necessary because the existing Market `StatusBadge` also applies Market-owned mappings and labels; it cannot safely determine Vendor order/payment/fulfillment meaning. The adapter consumes the same shared BDG-02 class/CSS contract rather than defining another badge design. Existing Dropdown is a menu, and Market AnimatedDisclosure is the distinct retained animated/saved-layout family, so neither supplies the approved ordinary native DDN-03 contract. A pure class helper and CSS extraction preserve native details behavior without replacing controllers or introducing another library. DDN-03 and BDG-02 universal Phase D migrations remain pending; Phase B lifecycle and Phase C shells were not started.

### G. Manual retest checklist

Use a running configured backend and existing authorized development accounts/resources. Routes with `{id}` use actual owned ids; public merchant route keys must resolve to real active storefronts.

1. `http://localhost:4322/`: one root sign-in presentation; choose Platform email account or Administrator username in place. No Administrator sign-in detour. Visit `/?native=1` and confirm the query is removed and the same presentation remains. Recovery is immediately above Sign in; the signup sentence below links only Sign up here.
2. Customer email sign-in through that root: central login at `http://auth.platform.localhost:4321/account/login`, required phone proof, then central `/account`. No administrative grant required. Platform/Market/Vendor identities reach only their authorized workspace; multi-role switching remains available. Test native username credentials, invalid credentials, logout and session expiry.
3. Logged-out Vendor `http://{vendor-route-key}.localhost:4321/products/{slug}`: choose a real variant/quantity, add, open `/cart`, increase/decrease quantity, remove, add another variant, revisit. No 403; server prices/inventory remain authoritative.
4. Logged-out Market `http://{market-route-key}.localhost:4321/occurrences/{occurrenceId}/products/{variantId}`: equivalent add/view/adjust/remove/revisit flow. Vendor cart remains independent; nonempty occurrence switching stays guarded. Do not place an order or execute payment.
5. `http://localhost:4322/vendor/orders`: flexible reference input, natural-width green Look up order, matching boundaries and gap; deliberate narrow-screen stack; lookup still navigates to the submitted owned reference.
6. `http://localhost:4322/platform/tenants`: search/select/action outer heights match the signup reference; labels above, helper/error text below; filters and mobile wrapping work.
7. `http://localhost:4322/market/application-submissions`: Save and Close first, secondary Close on its right, equal height and 0.8rem horizontal/wrap gaps. Inspect existing dirty-state and busy-dismissal behavior without operational mutations merely for visual testing.
8. `http://localhost:4322/vendor/orders/{id}`: distinct textual/color statuses, neutral unknown values, CRD-02 grouping, padded DDN-03 management disclosures. Existing fulfill/cancel authority and quantity bounds remain enforced. Ordinary selectors, where present, retain SEL-03.
9. `http://localhost:4322/vendor/products/{id}`: independently expanding padded variant disclosures, separated metadata/price sections and bottom action space. Existing product/options/price/inventory validation unchanged.
10. Representative vendor inventory, Market listing/offering/participation, directory, command confirmation and layout attribute-sync dialogs: primary before secondary Close, content-width actions, equal height, readable wrap gaps, native submit identity and existing busy/focus/dismissal behavior. Read-only single-action dialogs and multi-command booth/offering/layout-selection panels retain their specialized footer/content structure.

### Lightweight checks and local files

`FRONTEND_NO_EVIDENCE=true` was used. `npm run typecheck` passed: TypeScript and 78 Astro files, zero errors/warnings/hints. The one focused Vitest invocation covered phase-a-remediation, ui-foundations, signup-passwords, vendor, layout-library and market-operations: 83 passed and one stale revoked-grant expectation failed. That expectation was corrected to the current nonprivileged personal-account destination, then only the failed test was rerun and passed. `scripts/check-boundaries.ts` passed for nine workspaces. No test measures browser-computed geometry; no mocked result is treated as live account/cart acceptance.

Files changed in this pass (earlier dirty files retain their pre-existing changes):

- `packages/ui/src/styles.css`, `presentation.ts`, `index.tsx`
- `apps/admin/src/AdminApp.tsx`, `account-login.ts`
- `apps/admin/src/vendor/orders.tsx`, `catalog.tsx`, `common.tsx`, `inventory.tsx`, new `order-presentation.ts`
- `apps/admin/src/market/CommandForm.tsx`, `presentation.tsx`, `vendors.tsx`, `dashboard.css`
- `apps/admin/src/market/phase14/ApplicationReview.tsx`, `Directory.tsx`, `LayoutInspector.tsx`
- `apps/storefront/config.ts`, `src/components/SignupPasswords.tsx`, `src/pages/api/shop.ts`
- `apps/storefront/src/pages/products/[slug].astro`, `src/pages/occurrences/[occurrenceId]/index.astro`, `src/pages/occurrences/[occurrenceId]/products/[variantId].astro`
- `tests/phase-a-remediation.test.tsx`, `tests/vendor.test.tsx`
- This report, root `UI_COMPONENTS.md`, and ignored root `.env` (development-only configuration; never include in a commit)

No screenshots, evidence directories, browser automation, Playwright, gallery harness, full unit/end-to-end suite, build, completed order/payment, data seeding/reset, backend migration, commit, push, pull request, deployment, hosting or DNS action was performed. Temporary frontend diagnostic servers are stopped after inspection. Phase A developer manual acceptance remains pending.

## Phase A Functional Unblock - Customer Login and Guest Cart - 2026-10-13

**Customer login: WORKING - LIVE LOCAL INTEGRATION VERIFIED.**
**Guest cart: WORKING - LIVE LOCAL INTEGRATION VERIFIED.**
These statuses describe real local HTTP acceptance. Phase A developer browser/manual acceptance remains pending. The earlier remediation limitations above are historical and are superseded by this functional verification.

### Actual environment and root causes

At the start, no API or frontend service was listening on ports 3000, 4321, 4322, 4347, or the old customer harness port. PostgreSQL was running on loopback:5432. The ordinary tracked backend `.env` selects `vendure`, which has no customers, storefronts, or products. This is a different database from the developer's documented persistent test dataset; existing data had not disappeared.

Read-only inspection found **`vendure_demo_market_ops`**, the database selected by the existing demo commands and documented testing-vendor/Boerne/customer-account records. It has 19 storefronts, 78 enabled products, five occurrences, and the existing documented customer. That Customer and User match `docs/demo-customer-account.json`; the User is verified and has no Administrator identity. No substitute account was created. The saved disposable customer-dashboard manifest points to an old, unavailable environment and was not used or rewritten.

Both databases already contain all 27 source migrations. No migrations were applied. Before the initial unchanged demo startup, the applied migration names were compared with source classes and there were zero pending migrations. The corrected `serve` path checks `showMigrations()` and refuses pending schema changes rather than running the migration runner. It never seeds or resets data.

The frontend ignored root `.env` already held the correct central origin, Admin origin, and a sufficiently long server-only bridge key. The failures were in the **documented demo launchers**:

- Frontend `scripts/demo-market-operations.ts` replaced `PLATFORM_ACCOUNT_BRIDGE_KEY` with an empty string for both frontend processes. A central `/account/login` request with the Admin return origin therefore rendered the unavailable message instead of its sign-in form.
- Backend `scripts/market-operations-demo/environment.ts` filtered out the account origin, bridge key, and Admin origin, then cleared their inherited environment variables. Vendure consequently started with `customerAccounts` disabled.
- The backend demo also disabled attribution and purchase-history composition, which the existing `MarketplaceCommercePlugin.init()` requires when account integration is enabled. Restoring the bridge alone reproduced `CUSTOMER_ACCOUNT_REQUIRES_PAID_COMMERCE_AND_PURCHASE_HISTORY` at startup. The demo now supplies the required composition with the explicit `local-demo-no-refunds-v1` policy and all refund permissions false. Stripe, local verified checkout, local refunds, SMS/email providers, workers, and outbound external network remain disabled. No financial calculation, payment implementation, or production configuration changed.

### Customer authentication verification

The corrected launchers deliver matching server-only configuration to all three actual processes. The Admin root returned 200; its real Vite runtime defines contained the intended public central origin and fixture mode false, with no bridge key exposed.

A real same-origin form POST to `http://auth.platform.localhost:4321/api/account` used the **existing documented customer credentials**, `action=unifiedLogin`, Admin origin `http://localhost:4322`, and a fresh browser correlation. Password validation and the existing verified-phone requirement succeeded. The customer-only Admin-purpose return resolved to central `/account` without acquiring an Administrator identity or business workspace. No identity/verification guard was changed.

The response established `platform-unified-account` with HttpOnly, SameSite=Lax, Path=/ and no Domain attribute, appropriate to the HTTP local central origin. Cookie values, credentials, bridge keys and customer PII were not recorded in this report. With that real session, each route returned 200 with Customer navigation:

- `/account`
- `/account/orders`
- `/account/markets`
- `/account/vendors`
- `/account/settings`

The ordinary signout POST returned 303. Before login and after signout, `/account` returned 302 to the login route. An invalid server bridge key was rejected. Native Shop account registration remained denied with `CENTRAL_ACCOUNT_REQUIRED`; no alternate identity path was introduced.

Correct login entry: `http://localhost:4322/`, select **Platform email account**, then **Sign in**. Direct login: `http://auth.platform.localhost:4321/account/login`. Customer dashboard: `http://auth.platform.localhost:4321/account`. Existing local test credentials are in `docs/demo-customer-account.json`; they are not printed here. Browser click/navigation acceptance remains the developer's final step.

### Guest cart diagnosis and live verification

The original failure was reproduced against the populated demo with a real Manna Roots product, storefront 4 and variant 6. Vendor resolution and public catalog succeeded. Anonymous `/api/shop` add returned **HTTP 403**, `{error:{kind:"forbidden",code:"FORBIDDEN"}}`; existing development logging emitted `shop_request_failed` at `stage=shop-operation`, `storefrontKind=VENDOR`. Vendure simultaneously logged `FORBIDDEN: error.forbidden`.

The add adapter first executes `StorefrontSelectContext` / `selectCommerceContext`. Its `OrderContextService.selected(..., true)` calls `ownedOrder()`. For an anonymous Shop context, that guard rejects when `!options.customerAccounts || !ctx.session?.id`. The unchanged demo composition had `customerAccounts` disabled, so the rejection preceded the persisted-session active-order ownership check. This is the established failing condition. No guard or business resolver was modified.

After correcting configuration, the same real BFF add succeeded with HTTP 200. Public product SSR issued native cookies; the BFF retained and forwarded the signed native session cookies between context selection, add, and snapshot, then on later requests. Vendure continued owning prices, inventory, active orders, and context. No local-only cart was added.

Real HTTP checks passed separately for:

| Context       | Actual route                                                                | Results                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Direct Vendor | `http://manna-roots.localhost:4321/products/manna-roots-green-garden-juice` | Anonymous add one, cart read, adjust to two, remove, re-add, SSR `/cart` revisit and persistent order identity                             |
| Market        | `http://localhost:4321/occurrences/2/products/92`                           | Existing scheduled October 17 occurrence and eligible offering in an open preorder window; anonymous add/read/adjust/remove/re-add/revisit |

For **each** context, a separate guest cookie jar saw no contents from the first guest. Its request for the first guest's order through `checkout-status` returned 403/FORBIDDEN, and its attempt to adjust the first guest's line failed while the owner's quantity stayed unchanged. Invalid Origin was rejected with 403; a mismatched storefront ID was rejected with 400; an invalid native channel was rejected with 403/SHOP_CONTEXT_REQUIRED.

Read-only persistence verification found Vendor order 43 with `DIRECT_VENDOR`, storefront 4/channel 9, no occurrence, and Market order 44 with `MARKET_OCCURRENCE`, storefront 1/channel 2/occurrence 2. Both had their own persisted `AnonymousSession.activeOrder` binding. Their contexts and orders are distinct. All task-created cart lines were removed through the normal BFF remove operation. Empty native orders remain in the normal native history; no raw Order/session/history deletion was attempted. Pre-existing placed purchases and payment data were preserved. No checkout begin, placement, payment, SMS, or email delivery operation was run.

The reported add 403 was **reproduced and eliminated**. Expected anonymous native `me` queries and deliberate foreign-cart probes can still produce Vendure FORBIDDEN warnings. Use the BFF response and sanitized operation/stage to distinguish those expected denials from a failed cart add.

### Local startup and configuration

Run these in **three separate terminals**, each in `E:\coding\farmers-market-platform-web`:

```powershell
# Backend: explicitly selects the existing persistent local test dataset.
npm run demo:market-operations:serve
```

```powershell
# Admin: http://localhost:4322
npm run demo:market-operations:admin
```

```powershell
# Storefront and central account: port 4321
npm run demo:market-operations:storefront
```

All three services were left running with this corrected configuration at completion. Stop only these development processes before relaunching them; never reset the demo to resolve sign-in. The backend wrapper delegates to the sibling backend's existing `demo:market-operations:serve` script, blocks external connections, checks the database name/loopback target, and refuses pending migrations. No worker is needed for these synchronous login/cart checks.

Ignored frontend root `.env` must contain `PLATFORM_ACCOUNT_ORIGIN=http://auth.platform.localhost:4321`, `ADMIN_ORIGIN=http://localhost:4322`, and the same server-only `PLATFORM_ACCOUNT_BRIDGE_KEY` of at least 32 characters. Existing values were reused without modifying either `.env`. Shell overrides take precedence and invalid/missing values fail before starting a child. The bridge is not included in Admin client defines. Keep `SHOP_API_URL` and `PUBLIC_ADMIN_API_URL` pointed at the matching loopback API; the demo frontend helpers supply port 3000 and disable fixture mode. Account origins and local storefront port are deliberately fixed to these documented demo origins.

Use the named demo commands to select `vendure_demo_market_ops` explicitly. The tracked backend `.env` and protected `vendure` database are unchanged. For a different intended persistent database, first verify its loopback connection, applied migrations, account identity, and real provisioned storefront/catalog records; do not silently redirect the demo tooling or invoke ordinary startup against pending migrations.

No storefront/product provisioning was needed. Existing guarded instructions remain in `docs/testing-vendors.md` and `docs/boerne-test-market.md`. Only after explicit approval for missing persistent test data, inspect the applicable seed script and preview with `node scripts/seed-testing-vendors.cjs --dry-run`; use its scoped `--seed --vendor=<existing-approved-slug>` path as documented. Do not run a reset, bulk import, customer demo start, payment walkthrough, or schema migration merely to test these repaired features.

### Troubleshooting and validation

- **Account integration:** start with all three demo commands. Missing bridge/origin values now fail early. Backend startup must report central accounts enabled. A login form alone is not acceptance; check its form POST, session cookie, authenticated dashboard and logout.
- **Anonymous ownership:** compare the add response with `shop_request_failed`. `shop-operation` plus FORBIDDEN during context selection requires checking enabled account integration, native session presence and its persisted active-order binding. Never weaken `ownedOrder` or copy another guest's cookie.
- **Storefront/host/channel:** use a real approved hostname and port. `/storefront-context/resolve` consumes the actual Host header; Node fetch drops an overridden Host, so synthetic-host HTTP diagnostics must use native `node:http`. Missing approval returns 404; an invalid channel yields SHOP_CONTEXT_REQUIRED. Keep exact browser Origin and storefront ID.
- **Product/variant:** use the real public catalog for that resolved channel; enabled products alone do not prove variant publication, ownership, stock or canonical prices.
- **Market eligibility:** query the actual scheduled occurrence and occurrence catalog. A future date, approved attendance/offering, open preorder window and available stock are all required. Do not invent occurrence IDs or extend windows to suppress a rejection.

Validation passed:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
node node_modules/vitest/vitest.mjs run tests/local-account-environment.test.ts tests/phase-a-remediation.test.tsx tests/customer-dashboard.test.ts
npm run typecheck
```

24 focused frontend tests passed across three files. One frontend typecheck passed, including all 78 Astro files with zero errors, warnings or hints. From `E:\coding\farmers-market-platform`, the demo safety/account configuration guard test and the equivalent focused backend compilation passed:

```powershell
node node_modules/ts-node/dist/bin.js --project scripts/market-operations-demo/tsconfig.json scripts/market-operations-demo/guards.test.ts
node node_modules/typescript/bin/tsc --noEmit --project scripts/market-operations-demo/tsconfig.json
```

Live checks used native local HTTP, real existing credentials, real Vendure Shop operations and separate cookie jars. Diagnostic-only assertions were corrected to match existing Customer navigation, Vendor line quantities and Market occurrence fields; their failed attempts were not counted as acceptance. The temporary ignored diagnostics were removed. No screenshots, evidence directory, browser automation, full suite, build, financial transaction, data seed/reset, applied migration, destructive database change, commit, push, pull request or deployment occurred.

### Files changed in this functional unblock

Frontend: `scripts/demo-market-operations.ts`, new `scripts/local-account-environment.ts`, new `tests/local-account-environment.test.ts`, and this appended report. No UI component or visual approval changed.

Backend: `scripts/market-operations-demo/environment.ts` preserves/validates local account configuration and required composition; `run.ts` checks required account configuration and serves without migrations; `guards.test.ts` covers matching accounts, local origins, restrictive attribution composition and existing database/provider guards; `README.md` documents the correct local demo startup. Native authorization, passwords, verification, tenant grants, sessions, cart ownership, prices, financial calculations and payment services are unchanged. Both repositories' extensive earlier uncommitted changes were preserved, and final Git scope checks were performed.

## Local test payment checkout implementation

The Stripe configuration blocker now has a narrowly scoped development payment implementation. A real Manna Roots order (52) completed through Vendure with one settled local Payment, and the existing customer order-history/follow projections were verified. The feature remains disabled by default and requires explicit opt-in against the approved loopback demo database.

See [Local test checkout](Local-Test-Checkout.md) for architecture, enable/disable/startup instructions, manual Vendor/Market walkthroughs and focused results. Two-Vendor Market acceptance remains pending: the existing additional Vendors have stale offering window provenance and lack pickup methods. Favorite-Vendor upcoming appearances additionally require the existing verified-consent flow. No dashboard or Phase B migration was begun, and the historical Phase A records above are preserved.
