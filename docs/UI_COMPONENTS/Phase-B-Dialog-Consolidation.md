# Phase B: Dialog consolidation

Implementation date: 2026-10-14. Manual acceptance: **DEVELOPER-REPORTED VISUAL ACCEPTANCE (2026-10-14)**. The developer reported that Phase B looks good when authorizing combined Phase C/D. No new automated or native lifecycle verification is implied by that report.

## A. Overview

Implement the approved DLG-02 MarketDialog presentation and lifecycle in shared UI. Preserve Dialog/Drawer exports, feature commands and native form semantics. DLG-01's independent ordinary presentation is superseded; MarketDialog becomes a compatibility adapter. Phases C and D are outside this task.

## B. Baseline

The workspace began with extensive modified and untracked work, including Phase A foundations, MarketDialog, operations editors, account and commerce changes. All pre-existing work is preserved. No clean baseline or unrelated changes are claimed.

Read root AGENTS.md and UI_COMPONENTS.md, the audit dialog profiles/category, migration plan Phase B, second-round decisions, Phase A foundations and both manual remediation sections, including the permanent form-control alignment contract.

Current inventory before production edits:

| Consumers                                                                                                      | Classification          | Existing integration                                                    |
| -------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| Vendor/management CommandForm, vendor Inventory, storefront OccurrencePreview                                  | MIGRATE                 | DLG-01 shared Dialog                                                    |
| Market CommandForm and five market/vendors dialog sites                                                        | MIGRATE                 | MarketDialog                                                            |
| Applications/ApplicationReview, DirectoryEditorShell, Assignments booth dialog, LayoutInspector attribute sync | MIGRATE                 | MarketDialog                                                            |
| OccurrenceLayoutActions layout chooser                                                                         | MIGRATE                 | MarketDialog with a large content constraint                            |
| Layout library Archive confirmation                                                                            | MIGRATE                 | Browser confirm                                                         |
| Drawer export, no production app imports                                                                       | RETAIN SPECIALIST       | Edge presentation on the shared lifecycle                               |
| Full-screen LayoutEditor and its unsaved-navigation guard                                                      | RETAIN SPECIALIST       | Route editor, synchronous browser confirm and beforeunload protections  |
| ApplicationBuilder question-edit-overlay, Canvas settings, saved-layout details, map overlays and SearchSelect | Outside dialog category | Inline editing hit target, disclosures, canvas annotations and combobox |

No separate Astro native dialog, third modal wrapper or additional alertdialog was found in apps/packages. Tests and the existing gallery also consume the compatibility exports; gallery code will not change.

DLG-01 directly calls onClose both from a Close button and native close events. Parent-driven close can echo another callback. DLG-02 ignores focusTitle, lacks native close synchronization and carries a timeout that can survive a close/reopen state change. Neither currently has a shared backdrop policy. No production consumer currently supplies beforeClose; application review deliberately discards its draft on explicit close (existing tests characterize this). LayoutEditor retains its existing dirty navigation confirmation.

DLG-02 currently combines shared white surface, #d0d7d0 border, 8px radius, #20352c text and rgb(20 38 28 / 0.45) backdrop with admin responsive padding/900px sizing, fixed centered positioning and market enter/exit animations. Legacy admin dialog selectors and market animation ancestry compete with the shared foundation. Phase A excludes dialogs from card last-child spacing to prevent bottom anchoring; preserve that correction.

## C. Shared implementation

Exact shared files: packages/ui/src/dialog.tsx (extracted foundation), packages/ui/src/index.tsx (compatibility exports, former implementation removed), packages/ui/src/styles.css (DLG-02 presentation moved out of admin ancestry). The new module extends the existing Dialog API because it lacked DLG-02 animation, close veto and native synchronization; it is not an additional modal library. It imports only React and the existing shared Button, with no admin feature dependencies.

Exports remain Dialog and Drawer. New exported type: DialogProps. Added props: beforeClose, dismissOnBackdrop, className, size, description and aria-describedby. children can be a render function receiving dismissal. Existing open/onClose, busy, focusTitle, actions, showClose and drawer props remain available. MarketDialog is a thin adapter using the same shared Dialog and wide size. No package/dependency change is needed.

Lifecycle contract:

- open=true enters native showModal modality and captures the invoking element. Default title focus matches DLG-02; explicit focusTitle=false preserves native initial focus. Titles have a generated aria-labelledby target; description and external aria-describedby references are supported. No custom focus trap or portal is introduced.
- Close, render-prop dismissal, native cancel (Escape), instance element.close() and permitted backdrop interactions share busy/beforeClose checks and the existing 150ms exit. Repeated requests cannot enqueue duplicate callbacks. Opening retains the 180ms DLG-02 animation. Reduced motion suppresses CSS animation and uses a zero-delay close.
- cancel is prevented before default native dismissal. Native close is handled independently. Expected internal close events are consumed, including asynchronous events delivered after rapid reopening. Accepted external native close calls onClose once. Rejected direct prototype/native-form closure reopens the same native dialog with its draft intact, because native close is not cancelable. Normal element.close() is intercepted before closing and restored on cleanup.
- Callback references and busy/veto state remain current during animation. If a command starts during exit, dismissal is cancelled. Parent open=false is authoritative, closes immediately, cancels pending exit, and does not echo onClose or apply a veto. This preserves success paths that close while command cleanup is finishing. Callers own the decision to change open; raw native dismissal cannot bypass their policy.
- Accepted dismissal restores the surviving trigger after native close and before notifying the caller. Removed, disabled, hidden, inert and closed-dialog triggers are excluded. Unmount/route cleanup cancels timers, closes native modality without a callback and checks the surviving trigger after the React commit. Nested native cancel/close events do not dismiss a parent dialog.
- Backdrop dismissal defaults to false, preserving every existing consumer's policy. Opt-in dismissal requires pointer-down and click both outside the dialog rectangle, preventing a drag from content into the backdrop from closing it. Busy/veto still apply.
- Drawer retains the same lifecycle, accessible title, callbacks and policies, with edge placement and independent scroll constraints. Its compatibility export defaults to the compact 480px size; no production app currently imports Drawer.

Browser-native focus trapping, background inertness, automatic native focus return and noncancelable native-form close ordering are pending manual acceptance. DOM tests characterize the integration using the project's native-dialog shim; they do not prove browser geometry or real top-layer behavior.

## D. Consumer migration

All 15 ordinary production dialog call sites now delegate to shared DLG-02. No ordinary consumer remains blocked.

| Group / file                                                              | Sites and final classification              | Migration / preserved behavior                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: apps/admin/src/vendor/common.tsx                                       | 1, ALREADY COMPLIANT through changed export | Vendor and management CommandForm confirmations inherit shared Dialog. No local controller edit; UUID, validation, error/uncertain outcome and pending policy preserved.                                                                                   |
| A: apps/admin/src/vendor/inventory.tsx                                    | 1, ALREADY COMPLIANT                        | Existing Dialog export now shared; embedded Close uses render-prop dismissal. Restock/adjust payloads, validation, refresh and nested confirmations preserved.                                                                                             |
| D: apps/storefront/src/components/OccurrencePreview.tsx                   | 1, ALREADY COMPLIANT                        | Same React island and Dialog export, explicit 480px standard size. No Astro hydration change.                                                                                                                                                              |
| B: apps/admin/src/market/presentation.tsx                                 | Adapter, no independent dialog lifecycle    | Replaces MarketDialog lifecycle/markup with shared Dialog. Unrelated status/disclosure implementations stay unchanged.                                                                                                                                     |
| B: apps/admin/src/market/CommandForm.tsx                                  | 1, ALREADY COMPLIANT through adapter        | Confirmation intent, operation keys, validation, uncertain outcome and pending protection unchanged. Settings suspension and other market commands covered.                                                                                                |
| B: apps/admin/src/market/vendors.tsx                                      | 5, ALREADY COMPLIANT through adapter        | Add Vendor, listing approval, offering detail, create offering and participation editor preserve selected IDs, requests, status/cap validation and pending protection. Offering detail remains a multi-command body with a single shared Close footer.     |
| C: apps/admin/src/market/phase14/Applications.tsx / ApplicationReview.tsx | 1, ALREADY COMPLIANT through adapter        | Review draft/status/notes/directory selection, Save and Close, explicit draft discard, failed-save retention and busy policy unchanged. There was no existing dirty veto to invent.                                                                        |
| C: apps/admin/src/market/phase14/Directory.tsx                            | 1, ALREADY COMPLIANT through adapter        | DirectoryEditorShell keeps its native form id and footer type=submit/form association, optional vendor relationship and busy guard. Route-level Add and rental forms remain pages.                                                                         |
| C: apps/admin/src/market/phase14/Assignments.tsx                          | 1, ALREADY COMPLIANT through adapter        | Booth details, assignment/release confirmations, revision and permissions unchanged. No new command runner or feature policy introduced.                                                                                                                   |
| C: apps/admin/src/market/phase14/LayoutInspector.tsx                      | 1, ALREADY COMPLIANT through adapter        | Attribute sync selections and geometry operations unchanged; shared action row normalizes its compact primary and ordinary Close.                                                                                                                          |
| C: apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx              | 1, ALREADY COMPLIANT                        | Shared wide size replaces local size CSS. Destructive confirmation, Keep current layout and Close use one footer row with primary first. Existing change command, protected data warning, revision, pending/error state and disclosure previews unchanged. |
| C: apps/admin/src/market/phase14/Layouts.tsx                              | 1, ALREADY COMPLIANT                        | Archive browser confirm becomes shared DLG-02. Same message, archive ID/revision/payload and command; local pending guard prevents double activation/dismissal. Copy/create/unarchive and full-screen editor unchanged.                                    |

Retained specialists: Drawer presentation on shared Dialog; route-level LayoutEditor with existing beforeunload and synchronous link/back confirmations. Navigation confirmations must synchronously veto existing route handlers; replacing them with asynchronous dialogs would require a routing/controller change outside this migration. They are not ordinary component modal wrappers. Their dirty detection, save/publish guards, tool/inspector state and map models were not edited.

ApplicationBuilder question-edit-overlay is a transparent inline edit button, not a dialog. The old occurrence-layout-editor-dialog CSS had no current consumers and was removed with superseded dialog constraints. Layout editor route geometry remains untouched. No separate renderer adapter was needed because there is no Astro native dialog consumer.

Directly changed consumer/presentation files: apps/admin/src/market/presentation.tsx; apps/admin/src/vendor/inventory.tsx; apps/admin/src/market/phase14/Layouts.tsx; apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx; apps/storefront/src/components/OccurrencePreview.tsx; apps/admin/src/phase15.css; apps/admin/src/market/dashboard.css. Other sites migrate through their existing shared export/adapter without unnecessary source rewrites. Focused test files: tests/dialog-lifecycle.test.tsx and tests/layout-library.test.tsx. Documentation: this report and only DLG implementation tracking in root UI_COMPONENTS.md.

## E. Presentation contract

One shared CSS contract preserves the actual DLG-02 white surface, 1px #d0d7d0 border, 8px radius, #20352c text, 1.8rem title and rgb(20 38 28 / 0.45) backdrop. No new shadow, color system or redesign was introduced.

Modals use fixed inset:0, margin:auto, border-box, min-width:0, 1rem viewport gutters, responsive clamp(1rem, 3vw, 2rem) padding and calc(100dvh - 2rem) maximum height. Wide (900px) is the universal DLG-02 default; standard (480px) preserves the small informational/Drawer capability. Overflow is vertically scrollable and long unbroken content wraps. Header/title, caller-owned body and optional footer preserve existing markup rather than adding wrappers that would break native forms or selectors. Footer is reachable through the dialog's scroll surface.

Drawer uses inset:0 0 0 auto, margin:0, 100dvh height and square edge treatment. It retains viewport width constraints and scrolling; mobile modals are not automatically converted to drawers. Shared motion moves the modal by DLG-02's original 5px on enter/exit; the drawer uses the same subtle horizontal offset. Backdrop and reduced-motion rules are shared.

Legacy admin dialog geometry and market-only modal animation selectors were removed; shared dialog selectors explicitly own geometry. Phase A's card last-child rule still excludes dialog, preventing the suspension confirmation from being anchored at the bottom. Market workspace/disclosure animation was retained independently.

ui-actions ui-modal-actions remains flex, wrap, align-items:stretch and gap:0.8rem in both axes. Direct BTN-01 buttons have natural widths, no flex growth or sibling margins and matching ordinary minimum height (calc(3rem + 2px), 50px at 16px root). Primary precedes secondary Close/Cancel. Extra layout-choice actions and the multi-command offering editor retain their feature meaning. Native submit buttons keep type, associated form, names/values, validation, loading and handlers. Close remains type=button. Existing INP-02, SEL-03 and CRD-02 content is reused unchanged.

## F. Testing

Implementation complete. Every check used FRONTEND_NO_EVIDENCE=true. No browser automation, screenshots, evidence folders, live mutations, full suite or builds.

Commands and results:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npm run typecheck
npx vitest run tests/dialog-lifecycle.test.tsx tests/market-dashboard.test.tsx tests/occurrence-layouts.test.tsx tests/layout-library.test.tsx
npx tsx scripts/check-boundaries.ts
```

- Typecheck: TypeScript passed; Astro checked 78 files with zero errors, warnings or hints. After the final StrictMode correction, npx tsc --noEmit also passed; unchanged Astro files did not require a repeated check.
- Focused Vitest invocation: initial 43 cases, 40 passed and 3 new-test setup/assertion failures. All 19 existing affected-consumer tests passed (market-dashboard 6, occurrence-layouts 6, layout-library 7). Corrected the removed-node test's React cleanup, advanced the fixture's deliberate 30ms inventory delay and asserted the actual approved Button class contract. Only tests/dialog-lifecycle.test.tsx was rerun: all 24 passed.
- Final review found an initially-open StrictMode effect replay could replace the original trigger with its title in the DOM shim. Retained the session trigger through cleanup/replay and added a focused regression. Reran only npx vitest run tests/dialog-lifecycle.test.tsx: **25 passed**. Final coverage is **44 distinct passing focused cases**, including the 19 unchanged consumer tests from the original invocation. No unresolved test failure remains.
- Boundaries: **9 workspaces valid**. Shared extraction has no admin imports; exports require no package manifest edit.
- Scoped git diff --check passed. Git emits existing Windows LF/CRLF conversion notices. Final diff inspection includes pre-existing Phase A changes in tracked files; they are not claimed as Phase B edits. Newly created/untracked implementation and documentation were inspected directly. The 14 task-touched files are listed in sections C/D and this report's documentation record.

Coverage includes shared open/close/reopen, native/programmatic/queued close, Escape, focus/restoration (including removed/hidden/disabled triggers and both StrictMode mount patterns), reduced motion, busy/veto, nested dialogs, Drawer/MarketDialog, action rows, native submitter/validation, vendor Inventory and both command forms, review, directory, relationship and layout consumers. Existing layout archive test now uses shared confirmation instead of mocking window.confirm.

Unverified in this lightweight environment: actual native Tab trapping/background inertness, viewport centering, narrow-screen wrapping/scroll reachability, browser focus restoration after route transitions and browser native-form noncancelable close recovery. Native methods are shimmed in DOM tests. Developer manual testing below remains required; no mocked result is claimed as live visual or operational acceptance.

## G. Developer manual testing

Use existing authorized local Vendor and Market-manager test accounts and current seeded records. No new account, grant or purchase is required. Admin base: http://localhost:4322. Start npm run dev:admin only if needed; the informational storefront island uses its existing storefront server (npm run dev:storefront, port 4321).

Fastest representative sequence:

1. /market/settings: open suspension confirmation, inspect centering and Confirm change | Close, then cancel. Do not suspend merely to test appearance.
2. /market/vendors: Add Vendor, choose/clear an existing business, inspect Create relationship | Close and reopen. Cancel rather than creating a relationship for appearance.
3. /market/application-submissions: review an existing application, change local status/notes, Close and reopen to verify the existing draft-discard policy. Save and Close only when an authorized test change is intended; failed-save/pending behavior must preserve the feature policy.
4. /market/directory: open an existing business. Inspect Save business | Close, form validation, optional association and keyboard submit. Cancel for appearance review.
5. /vendor/inventory: Restock or Adjust an existing record, inspect primary | Close and reopen. Check nested adjustment confirmation without sending stock commands. /vendor/products and /vendor/orders: inspect existing command confirmations only when an authorized test edit is intended.
6. /market/layouts: Archive an existing card, inspect Archive layout | Close, cancel and reopen. Use that card's actual Edit link to /market/layouts/{actualId}/edit; do not substitute a guessed ID. Change a local field, open Sync booth attributes and cancel, then test the existing unsaved-navigation guard by staying on the editor. Do not save/archive/publish layout data merely to inspect appearance.
7. /market/occurrences: follow an existing occurrence to /market/occurrences/{actualId}; open Change layout, choose another preview if available, inspect the protected-data warning and destructive primary / Keep current layout / Close row, then cancel. Inspect its booth dialog in /market/assignments/{actualId} with an existing booth. Do not assign/release/change layout for presentation checks.
8. On a storefront that renders OccurrencePreview, open About occurrence selection, Close and reopen. Drawer has no production route/current app consumer; its retained export is covered by the focused synthetic test.

For representative modals: Close, reopen, Escape, backdrop (existing consumers should stay open), Tab/Shift+Tab, focus return, narrow/mobile viewport, long content and footer reachability. Inspect pending dismissal only with an authorized operation that safely produces a pending state; mocks do not establish live acceptance. Ensure suspension remains centered inside its Card/CommandForm. Dirty layout navigation must still prompt; application review's explicit Close still discards its local draft. Manual acceptance remains pending.

## H. Final status

- Shared foundation: COMPLETE.
- Applicable consumer migration: COMPLETE (15 ordinary production sites, plus compatibility adapter).
- Retained specialists: Drawer, route editor and its synchronous unsaved-navigation protections; multi-command offering/detail and layout-choice actions remain within shared dialogs.
- Remaining ordinary consumers / blockers: none found.
- Required verification: passed (typecheck, 44 distinct focused cases, nine-workspace boundaries and scope review).
- Manual acceptance: DEVELOPER-REPORTED VISUAL ACCEPTANCE (2026-10-14). Additional native/browser lifecycle checks were not performed or inferred.

No backend, authentication/session, cart, checkout/payment, financial/inventory calculations, permissions, application commands, map geometry/model, dependencies, lockfiles, build/deployment configuration or Phase C/D migrations were changed. No commits, pushes, PRs or deployments occurred.


## Developer-reported acceptance recorded during Phase C/D

On 2026-10-14 the developer stated that the Phase B implementation looks good after manual review. This records their visual acceptance. The earlier DOM test evidence and its limitations remain unchanged. Combined Phase C/D preserves packages/ui/src/dialog.tsx byte-for-byte, including native modality, guarded dismissal, focus restoration, animation, drawers, native footer forms and the 0.8rem action-row contract. The combined task reran the existing 25 DOM dialog cases as a compatibility check. No additional native browser lifecycle verification is claimed.
