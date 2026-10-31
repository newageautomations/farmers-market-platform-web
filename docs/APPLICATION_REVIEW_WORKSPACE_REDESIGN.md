# Application review workspace redesign

Implemented locally on October 29, 2026. Existing local Phase A through D changes were retained. No database commands, migrations, fixture provisioning, browser automation, screenshots, deployment, push or remote changes were performed.

## Implementation summary

The Market Manager submissions route now opens a review workspace inside the existing Admin content region. The list stays mounted but hidden while reviewing, preserving search, quick view, expanded filters, sort and pagination. The review header contains the business name, submitted template name, semantic status badge, submission date/time and Back to applications control.

Submitted answers occupy the desktop left panel. The existing ApplicationFields renderer has an optional compact read-only presentation using Card sections and definition lists. It retains the immutable definition snapshot, original section/question order, conditional visibility and blank optional-answer omission. Boolean false remains No, selections retain their submitted values, dates remain their submitted date strings and long answers preserve line breaks. Short answers use two columns; long text and informational questions span both columns. Editable consumers keep their existing renderer.

The inspector presents applicant information; requested dates, times, individual statuses and rentals; document readiness; information requests and amendments; application history; private notes; accepted onboarding when supplied; and finally the application decision. Native shared disclosures keep long histories and request rounds compact. No requirements means no zero-value metrics block.

One private notes section supplies both the notes and private decision-reason value. Save notes sends the existing REVIEW_APPLICATION command with the original status, directory and conditional setting. If a decision draft is present, save that decision to include its notes instead of silently discarding selected controls. Accepted applications cannot save notes through an unchanged Accepted decision. When an existing acceptance is being reversed, the private reason remains editable as in the existing workflow. Declined/Withdrawn applications and non-managers have read-only notes and no application decision controls.

Decision selection uses SelectField, retaining the existing status choices. Acceptance reveals Existing Market Business and conditional acceptance. Review decision opens the shared confirmation dialog before mutation. Existing expected revisions, verified-directory eligibility, unresolved-request guards, affected-date acknowledgments and backend obligation checks remain authoritative. Acceptance does not approve membership, participation, documentation or booth assignments.

Successful acceptance stays open for the refreshed onboarding summary. Other successful status changes return to the retained list. Saving notes stays in the review. Failed commands retain the workspace and display feedback.

## Frontend files changed

| File                                                             | Change                                                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/admin/src/market/phase14/ApplicationSubmissions.tsx`       | Embedded review, compact header, retained list, close confirmation, navigation guard, deep-link dismissal and focus restoration |
| `apps/admin/src/market/phase14/ApplicationReview.tsx`            | Panel composition, ordered inspector, consolidated notes and decision confirmation; existing domain controls retained           |
| `apps/admin/src/market/phase14/ApplicationInformationReview.tsx` | Optional dirty-state callback so closing protects an open request draft                                                         |
| `apps/admin/src/market/phase14/application-review.css`           | Scoped shell/content sizing, panel scrolling, inspector spacing and answer grid                                                 |
| `packages/ui/src/ApplicationFields.tsx`                          | Opt-in compact read-only Card/definition-list rendering                                                                         |
| `packages/ui/src/index.tsx`                                      | Opt-in Tabs split presentation, keeping both panels mounted and labelled; focus fallback when returning to tabs                 |
| `tests/application-review-workspace.test.tsx`                    | Nine focused component scenarios                                                                                                |
| `tests/application-phase-d.test.tsx`                             | Directory selector assertion follows acceptance selection                                                                       |
| `tests/market-dashboard.test.tsx`                                | Two application scenarios follow embedded review and confirmation controls                                                      |
| `tests/tsconfig.application-review.json`                         | Reproducible scoped TypeScript check, including transitive dependencies and DOM matcher declarations                            |

These files already contained local feature work where indicated by the working tree. This report describes this redesign, not every difference from the repository's committed baseline.

## Shared components reused

Card, Button and buttonClassName, Select/SelectField, SearchSelect, Tabs, Dropdown with its approved native disclosure presentation, StatusBadge, DocumentStatus, MarketDialog over the shared Dialog, Entry/Check over shared inputs, ApplicationFields, ApplicationInformationReview/InformationRecord and ApplicationOnboarding are reused. The list still uses DataTable, Pagination, Input, Field, Spinner, EmptyState and ErrorState.

No replacement primitive, UI library, shell, document workflow or application API was introduced. The existing renderer needed an optional compact read-only variant because its fieldsets also serve editable public and builder forms. Tabs needed an optional split variant because separate desktop/mobile copies would duplicate controls or reset drafts during resizing. Existing Tabs callers retain their default tab behavior. This does not approve any pending registry category or authorize unrelated migrations.

## Admin shell boundaries and scrolling

The workspace is a labelled section in the existing main element, beneath the existing Admin topbar and beside the existing navigation. It has no fixed positioning, portal, global review dialog, focus trap or body scroll lock. The duplicate route PageHeader is hidden only while the review's own compact header is present. Account controls and mobile navigation remain the existing shell controls.

Scoped :has rules bound the existing shell to the dynamic viewport and allow its content ancestors to flex into the remaining space. Sidebar and topbar dimensions come from the existing shell. No sidebar-width or topbar-height offsets are hardcoded. A long navigation sidebar can scroll within its existing column.

At viewport widths of 1100px and above, the shared Tabs split variant presents both mounted panels as labelled, keyboard-focusable regions. A 7fr/3fr grid divides the available content width after the gap. Each region has min-height: 0 and its own overflow: auto, with overscroll containment. The header stays outside those scrolling regions. Narrower viewports use the same mounted content through Submitted Answers and Details & Actions tabs, with Submitted Answers initially selected. Short-answer columns collapse to one below 600px. Grids use minmax(0, ...) and long text wraps.

The review title receives focus on opening. Closing restores the originating record trigger if it remains connected, otherwise the search input. Escape is scoped to the workspace and respects prevented events, open dialogs, busy commands and unsaved-change confirmation. Closing dirty work requires explicit discard. Full-page exits use the browser's beforeunload guard; shell/document link navigation uses a native confirmation when dirty. Related date/request mutations also confirm before refreshing away unsaved notes or decision selections. Open information-request drafts participate in the close guard. Responsive changes keep both panels mounted.

## Preserved functionality and authority

- Server search, quick views, status/template/category/date filters, sorting and 20-record paging remain in the same list controller.
- Pointer and keyboard record activation, selected-detail reads and notification submission query links remain supported. Closing removes only the submission parameter and retains channel and other parameters.
- Original answers remain immutable. Snapshot visibility and optional empty-answer handling are shared with the prior renderer.
- Phase B clarification definitions, submitted amendments, previous rounds, document references, review/resolve/cancel/send controls and command revisions remain in the existing feature controller.
- History uses the existing Phase D projection without adding synthetic or duplicated events. Private note bodies stay in their own section.
- Accepted onboarding renders the existing API-supplied independent states and authorized destinations.
- Date confirmation, identity conversion, compatibility guidance, cancellation/release/void options and assignment destinations retain their existing controllers and permissions.
- Backend status, scope, identity, membership, consent, billing, documentation and assignment checks are unchanged. No database/schema/API changes were needed.

## Focused verification

All checks passed:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/application-review-workspace.test.tsx tests/application-phase-d.test.tsx tests/application-information.test.tsx tests/application-phase-c.test.tsx --reporter=default
# 23 passed
npx vitest run tests/market-dashboard.test.tsx -t 'application' --reporter=default
# 2 passed; 4 unrelated cases skipped
npx vitest run tests/admin.test.tsx -t 'arrow-key tab navigation' --reporter=default
# 1 passed; 17 unrelated cases skipped
npx tsc --noEmit -p tests/tsconfig.application-review.json
```

Scoped ESLint passed for the three review/controller files, ApplicationFields, the shared UI index and the three changed test files. Prettier passed for those files, the review CSS and scoped TypeScript configuration. Total focused component assertions: 26 passing test cases. The full frontend/backend suites and browser tests were not run.

The workspace tests cover in-shell DOM placement and header/navigation presence, title/return focus, retained search/category/sort/page, Escape/discard, immutable answers and conditions, dates/rentals/readiness links, amendment/history/onboarding integration, terminal and non-manager states, notes command status/revision, responsive tab switching and retained edits, and selected-submission deep links. Existing focused tests cover request building and read-only responses, conditional-field behavior, paging/filter requests, decision confirmation and failed-save retention.

## Known limitations

DOM tests cannot establish rendered widths, actual scrolling geometry, dropdown clipping, touch behavior, native top-layer behavior or appearance. Desktop/mobile visual acceptance is deliberately left to manual testing. No screenshot or browser automation was used.

Responsive selection currently follows viewport width at 1100px. The desktop sidebar is approximately 30% after the column gap. The normal shell mobile menu replaces the desktop sidebar at its existing breakpoint. Existing saved local application data may differ from the prepared fixture baseline if you have already reviewed those records.

List state is preserved within the mounted route, not persisted across reloads or leaving and returning to the route. Concurrent server changes can move offset-paginated results on refresh. Backend rejections remain possible if another manager changes a record or an operational obligation remains unresolved.

Native unsaved-exit confirmation depends on browser support and prior user interaction. Do not use a forced reload to test draft retention. Use Back to applications or Escape to test the shared discard dialog.

## Manual testing setup

Use the existing populated `vendure_demo_market_ops` environment. This redesign requires no migration. Do not reset, reseed or re-provision fixtures. If the dedicated services are already running, use them. Otherwise, from `E:\coding\farmers-market-platform-web`, run these in separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Open [Market submissions](http://localhost:4322/market/application-submissions?channel=42). Sign in as `phase-d.manager@example.test` with password `PhaseD-Local-Only!2026`. Select channel 42, Phase D Applications Test Market. The prepared application IDs below are from the existing Phase D report; no verification or mutation of the database was performed for this redesign.

## Manual walkthrough

### Test A: Workspace boundaries

1. Open an application row from the submissions list using its business name or keyboard trigger.
2. Verify the review occupies the existing main content region. The left navigation and Admin topbar/account controls remain visible and usable.
3. Verify no new tab/window, standalone page or global review backdrop appears. The business title has initial keyboard focus.
4. Confirm the workspace header shows the template, semantic status and submission date/time once.

### Test B: Desktop layout

1. Use a desktop viewport at least 1100px wide.
2. Verify original submitted answers dominate the left approximately 70%, and the inspector occupies approximately 30%.
3. Check original sections, compact labels, two-column short answers, full-width long answers, wrapped text and absence of horizontal page overflow.
4. Collapse and expand the existing Admin navigation. Verify available content adjusts without covering it or the topbar.

### Test C: Independent scrolling

1. With a sufficiently long existing application, scroll the answers using wheel/touchpad. The inspector position and workspace header must stay still.
2. Scroll the inspector through requests/history/notes. The left answer position must stay still.
3. Tab to each scrollable region and use Page Down/arrow keys. Check that focused controls remain reachable and the page does not accumulate another content scrollbar.
4. Test a shorter desktop viewport too. Do not rewrite prepared answers to make a long form.

### Test D: Application content

1. Check contact name/email, identity type and actual verified Vendor/directory identity where supplied.
2. Check requested dates show market-local date/time, individual decision badges and requested rentals for each date.
3. Check document readiness and outstanding requirements. Follow Review document readiness and verify the existing documents workflow opens in the selected market.
4. For a record with no requirements, verify there is no block of zero metrics. Original answers must never become editable.

### Test E: Information requests

1. Open [Application 26](http://localhost:4322/market/application-submissions?channel=42&submission=26).
2. Expand Additional information requests and amendments. Verify the existing resolved round, original answer references, submitted amendment values and recorded times are accessible.
3. Expand Application history. Verify its chronological request/response/resolution events and no duplicated generic decision entries.
4. Inspect allowed request controls on an eligible record. Open a request draft, use Back or Escape, then Keep reviewing. Verify the draft survives. Discard it explicitly after inspection; sending is optional and changes the record.

### Test F: Accepted onboarding

1. Open [Application 25](http://localhost:4322/market/application-submissions?channel=42&submission=25).
2. Expand Next steps after acceptance. Verify independently projected membership, participation, outstanding documentation, booth and rental states, and existing authorized workflow links.
3. Verify separate date controls and assignment links remain available according to permissions. Opening the review must perform no approvals or assignments.
4. Verify the existing manager note appears once and an unchanged Accepted status offers no notes-only save.

### Test G: Terminal application

1. Open [Application 32](http://localhost:4322/market/application-submissions?channel=42&submission=32), prepared as Withdrawn.
2. Verify the read-only status and private notes. No status selector, Review decision or Save notes action should be present.
3. Optionally repeat for declined application 31. If you previously changed those records, choose another existing terminal application instead.

### Test H: Notes and decisions

1. Open [Application 28](http://localhost:4322/market/application-submissions?channel=42&submission=28), prepared as Submitted and suitable for external directory selection. Confirm its current state before making intentional manual changes.
2. Enter a private test note, Save notes, and verify the review stays open, the note survives refresh and status stays unchanged. This is an intentional manual data change, not a required automated setup step.
3. Select Accepted. Verify conditional acceptance and Existing Market Business appear in the final decision section. Search the existing eligible external directory records. Do not confirm acceptance unless you intend to change this prepared record.
4. Select another valid decision. Verify edits stay local until Review decision and then Confirm decision. Keep reviewing must dismiss confirmation without mutating.
5. To test saving a decision, intentionally confirm it on an eligible prepared record and verify the refreshed status/list behavior. Do not reset fixtures afterward. Existing active requests and operational obligations must remain enforced.
6. On an accepted application, verify reversing acceptance still requires the affected-date acknowledgement and backend obligation checks. Do not release assignments or void invoices just for presentation testing.

### Test I: Mobile

1. Reduce the viewport below 1100px, then to a typical phone width.
2. Verify Submitted Answers is the initial tab. Switch to Details & Actions and inspect the same section order with Application decision last.
3. Enter an unsaved note or select a decision, switch tabs and resize to desktop. Verify edits remain intact. Return to mobile and check keyboard focus is not left in a hidden panel.
4. Open the existing shell hamburger menu. Verify navigation/account controls remain available and the review does not cover the topbar.
5. Check touch scrolling, wrapping, dropdowns, disclosure summaries and button targets. Discard test drafts explicitly when done.

### Test J: Return to list

1. Set a search value, quick view, additional filter and sort, and move to another page when enough existing results remain.
2. Open a row and close with Back to applications. Verify search, filter selections, sort and current page remain. Focus should return to the originating trigger, or search if the record disappeared after a decision.
3. Repeat with Escape while clean, then with unsaved notes. Keep reviewing must preserve edits; Discard changes and close must return to the retained list.
4. Open a submission deep link and close it. Verify the submission query parameter is removed while channel 42 remains.

## Card presentation follow-up

The inspector headings now reuse UtilityIcon for the applicant, calendar, checked document, request, history, notepad, onboarding and final decision icons. The shared icon vocabulary adds calendar, document-check and notebook SVG paths; existing user/check/email/refresh icons are reused. Documents always use the shared Card surface, including unavailable readiness. Applicant email appears beneath the contact name. Answer values explicitly use normal (400) weight while question labels retain their stronger weight. Corrupted header separators were replaced with HTML middle-dot entities. These are presentation-only changes to the existing compositions; no new primitive was introduced.
