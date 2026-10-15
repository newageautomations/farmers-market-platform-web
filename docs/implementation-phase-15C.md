# Phase 15C implementation

Phase 15C: PASS. Implemented locally on October 8, 2026. No publishing, deployment, remote Git changes or provider calls.

## Summary and engine replacement

The native SVG drawing engine has been replaced by a real React-Konva Stage/Layer across the layout designer, assignment map, public occurrence map, linked Vendor map and Market Day map. The existing shared MarketMap API and semantic booth list remain available. SVG is used only for existing UI icons, never as an editor or fallback.

The replacement provides a dedicated design workspace with a dominant canvas, visible tools and contextual properties instead of the former long form and embedded diagram. Marketspread informed the workflow concepts only. All implementation, styling and icons are our own existing Admin visual language; no Marketspread source, branding or assets were copied.

## Packages and licensing

- Konva: **10.7.1**, MIT.
- React-Konva: **19.3.0**, MIT.
- Existing React and ReactDOM: **19.3.0**, unchanged. Registry metadata for React-Konva 19.3.0 explicitly declares React and ReactDOM `^19.3.0`; its Konva peer accepts `^10.0.0`.
- Added exact dependencies to `packages/ui/package.json` and updated the workspace lockfile. No commercial editor SDK, tldraw, Fabric, Polotno or openWarehouse runtime.
- Restricted sandbox DNS initially failed. The registry query/install succeeded outside that sandbox. No substitute renderer was implemented.

## Editor architecture

| File                                                | Responsibility                                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/map/MapCanvas.tsx`                 | Stage, Layer, Transformer, viewport, pointer selection, gestures, touch, joint dragging and guides                     |
| `packages/ui/src/map/KonvaElement.tsx`              | Memoized domain-to-Konva primitives, labels, operational overlays and safe image loading                               |
| `packages/ui/src/map/MapGrid.tsx`                   | Zoom-aware bounded canvas grid                                                                                         |
| `packages/ui/src/map/model.ts`                      | Pure geometry, history, selection, alignment, z-order, group rules, identity-safe copying and sync                     |
| `packages/ui/src/MarketMap.tsx`                     | Shared read-only/operational wrapper, area/search controls, hover card and semantic booth list                         |
| `apps/admin/src/market/phase14/Layouts.tsx`         | Library, editor document/history, tool palette, selection commands, save/publish/clone and dirty navigation protection |
| `apps/admin/src/market/phase14/LayoutInspector.tsx` | Contextual layout/booth/shape/text/multiple-selection forms and sync confirmation                                      |
| `apps/admin/src/market/phase14/LayoutLayers.tsx`    | Keyboard-accessible object selection, lock/hide status and locate actions                                              |
| `apps/admin/src/market/phase14/designer.css`        | Desktop workspace and deliberate tablet/mobile stacking                                                                |

The package boundary remains API -> UI -> Admin/Storefront. Nine workspace boundaries pass. Transient Konva nodes and viewport state never become database records.

## Persistence, historical versions and migration status

Existing `MarketLayoutVersion.definition` is PostgreSQL JSONB containing validated logical geometry. Added optional style fields (`stroke`, `strokeWidth`, `opacity`, `fontSize`, `fontWeight`, `textAlign`), `locked`, `editorHidden`, `groupId` and bounded normalized LINE `points`. Old records need no data rewrite: the rendering adapter supplies defaults while preserving x/y/width/height and rotation around the center used by the SVG-era renderer.

Backend changes are limited to `src/plugins/market-operations/model.ts` validation/public geometry projection and `service.ts` draft layout-name save/public projection. Physical sizes still flow through MarketSpace. The public geometry projection allowlists appearance and geometry and strips editor locking, hiding and group identity. Public projection of Vendor information remains authoritative.

**No database migration is needed.** No tables or columns changed, no historical migration was edited, no synchronize was enabled, and no published version was rewritten. Backend DRAFT-only checks, optimistic revisions, publish/clone and occurrence pinning remain in force. The live historical-version test passed. The browser fixture also verified that editing a clone leaves its published source and occurrence pin unchanged.

A strictly read-only audit of `vendure_demo_market_ops` validated both existing versions. Its current counts are 2 versions, 8 spaces and 1 plan, with no assignments or invoices. No seed, reset, showcase or start-day command was run. The audit writes only a count/digest evidence file, no private record contents or workflow writes. The protected `vendure` database was not accessed.

## Navigation, selection and Transformer

- Wheel/trackpad zoom preserves the world point under the pointer. Zoom is bounded from 5% to 800%, with percentage, zoom buttons, reset and fit.
- Pan tool, Space + drag and Alt/Option + drag move the viewport without moving objects. Read-only maps distinguish a click from a drag using a five-screen-pixel movement threshold, preventing accidental assignment dialogs.
- Initial fit waits for actual container measurement. Resizing preserves the viewport center. Search/list selection highlights and centers a booth, including across areas.
- Click selects, empty click clears, Shift-click toggles/adds, and a real pointer marquee selects contained rotated bounds. Decoration group membership expands selection deterministically.
- Transformer provides visible resize/rotation handles. Completion normalizes scales to x/y/width/height/rotation and resets transient scales. Shift snaps rotation to 45-degree increments; the inspector also supports exact entry.
- Multiple unlocked objects drag together. Decorations may transform together. A multiple selection containing booths is move-only at the Transformer; physical resizing/rotation is performed on individual booths. This avoids ambiguous mixed physical-size transformations.

## Grid, snapping, guides, align and z-order

Show grid, snap-to-grid and practical grid spacing are independent controls. The grid coarsens at distant zoom and caps its Konva line count at 300, without DOM grid nodes. Dragging snaps logical positions to the grid and to nearby object left/right/top/bottom edges and horizontal/vertical centers within five logical pixels, independent of zoom. Temporary pink guides are never persisted.

Compatible multiple selections offer left/center/right and top/middle/bottom alignment and horizontal/vertical distribution for three or more objects. Locked or editor-hidden selections disable incompatible commands. Arrange supports front, forward, backward and back, with deterministic contiguous zIndex values.

## Layers, locking, visibility and grouping

Layers lists the active area's objects in reverse z-order, with type glyph, label, selected state, lock checkbox, hide checkbox and locate button. Locked backgrounds disable hit listening to avoid obstructing booth selection and remain selectable/unlockable through Layers. Locked geometry cannot drag, resize, rotate, nudge or delete. Lock/unlock and hide/show operate on selected/group members and participate in history.

`editorHidden` means **editor-only visibility**. The explanation is visible in Layers. Read-only maps show these objects; publication strips this authoring field. It does not change public layout semantics.

Groups are restricted to unlocked non-booth decorations in one area. Every group member retains absolute domain geometry and a decoration-only groupId. Group/ungroup, joint movement and transforms use those records. Booth grouping is disabled to preserve independent MarketSpace identity, pricing and assignment semantics.

## Shape tools and inspector

Select, Pan, Booth, Rectangle, Circle, Triangle, Line, Draw path, Text and Image are labeled tools. Add tools place sensible objects near the visible center. Freehand LINE paths store normalized coordinate pairs with a maximum of 512 points; frontend sampling and backend validation enforce finite bounds and count. No SVG code input exists.

Shapes support fill, stroke, stroke width, opacity and exact rotation. Text supports label/text, font size, basic bold/normal weight, alignment and text color using the application's curated system font stack. Image nodes accept existing HTTP(S) public URLs, load with anonymous CORS, and show loading/failure placeholders without crashing. No private uploads or arbitrary fonts were added.

Nothing selected shows Layout inspector with name, version/status, scale and area add/rename/delete-empty controls. Other selections show Booth, Shape, Text or Multi-selection inspector. Group members cannot individually change area, protecting deterministic group persistence. The domain has no area-reorder command; area insertion order remains unchanged.

## Booth workflow and physical sizing

Booth creates a first-class MarketSpace with 10 ft by 10 ft defaults, visual geometry derived from pixelsPerFoot, and a unique A01-style label. Inspector fields retain label, feet dimensions, type, description, default fee in minor units, currency, all existing amenities, preferred business and private manager notes. Numeric physical edits change visual geometry; Transformer completion changes physical width/depth in the same history operation.

Duplicate and clipboard paste create fresh IDs and unique labels, retaining reusable size/type/description/amenities/fee/style. Copies start with empty manager notes and no preferred business. Space details are copied through an explicit allowlist, preventing assignments, invoices, payments or occurrence state from being copied even if such fields appear unexpectedly.

Sync booth attributes requires a source, explicit category checkboxes and a confirmation button. It copies only dimensions, amenities, fee/currency, space type and/or appearance. It preserves labels/identities, preferences and manager notes and never reads or writes billing/occurrence records. Locked targets are skipped. Optional separate auto-numbering was not added; safe label incrementing covers rapid duplication.

## Keyboard, undo/redo and saving

Ctrl/Cmd C/V/D, Ctrl/Cmd Z/Y/Shift-Z, Delete/Backspace, arrows, Shift-arrows and Escape are available. Input, textarea, select, contenteditable and dialogs retain their normal keyboard behavior. Editor history is bounded to 100 snapshots and includes geometry, physical details, styles, add/delete/duplicate, ordering, flags, groups, alignment and sync. Consecutive inspector edits merge while the same field retains focus; blur ends that transaction.

Save layout is explicit and disabled when clean. Save and publish remains explicit and uses the returned saved revision. Published versions offer a new draft clone instead of edit controls. Dirty state is visible; browser unload, navigation links, back navigation and layout/version switches warn before discarding changes. Saves do not auto-publish.

## Shared map regressions

Assignment maps preserve viewport-contained hover details, actual amenities/dimensions, assigned business, invoice-derived paid status, collapsed booth rows, correct clicked-booth modal and paid-invoice safeguards. The focused Phase15B Chromium flow passed, including approval and assignment creation. Existing multi-booth selection tests pass.

Public maps use the same Konva geometry while retaining the backend privacy projection and searchable semantic companion list. Public pages show no email, phone, manager notes, application answers, rental costs, invoice amounts, payment status, check-in, attendance or manager controls. Public search/highlighting and real hydrated storefront maps passed.

Market Day retains check-in, attendance, billing/rental/note overlays, booth selection and compatible assignment moves. The live flow verified KEEP protection for a paid invoice, attendance/notes persistence and manual invoice settlement. Linked Vendor views use the same renderer and retain the existing safe own-booth projection; the live Vendor isolation/browser flow passed.

## Responsive behavior, accessibility and visual inspection

1440px uses a broad canvas with a tool rail and scrollable inspector. At 768px the tools wrap above the canvas and the inspector sits below it. At 390px tools/commands wrap, the canvas remains substantial, and inspector/layers form a bounded scrolling panel below; desktop columns are not compressed side by side. Save and inspection remain available.

The semantic Layers/object list, booth list, search, inspector, forms, buttons and assignment dialogs provide keyboard alternatives to canvas objects. Representative Axe WCAG 2A/AA and 2.1 A/AA checks passed around the editor at 1440/768/390, public map at 390 and Market Day at 390. The live Market Day flow also checked 390/768/1280. Document-level horizontal overflow was absent at all qualified widths.

Screenshots were opened and inspected, not only captured: desktop/tablet/mobile editor, desktop Booth inspector, Layers, multi-selection, public read-only map and Market Day. Fixes included compacting selects, removing redundant page-header space, improving tablet tools, measuring before initial fit, keeping viewport center during resize, and allowing enough select padding for readable area names. Evidence is synthetic/local only.

Touch handlers support single-finger object drag and two-finger pan/pinch within the canvas. A pinch cancels an active object drag before navigation. Browser touch-action is restricted to the canvas, preserving normal scrolling elsewhere. Chromium touch events verified that a two-finger pinch changes zoom; physical tablet/touch hardware was not independently qualified.

## Performance qualification

The in-memory fixture contains 200 booths and 300 decorations. No fixture records are saved to a backend database. The final Chromium run recorded initial render 264 ms, pan 594 ms, zoom 179 ms, selection 98 ms and move 440 ms, with no browser errors. Measurements include Playwright navigation, waits and deliberate pointer steps while other local checks ran concurrently. They are observations of a synthetic local fixture, not frame-rate metrics, an SLA or proof of production-scale performance.

Element rendering is memoized, lookups use Maps, drag geometry stays in Konva nodes until completion, and nodes batch-draw. Grid rendering is bounded. React state is used for lightweight transient guides/marquee/path preview. There is no scene serialization or screenshot renderer.

## Tests and builds

| Qualification                                          | Result                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Phase15C focused unit/model suite                      | 23 passed                                                                                   |
| Full frontend Vitest suite                             | 256 passed, 14 files                                                                        |
| Phase15C Chromium script                               | 17 flow groups passed, no page errors                                                       |
| Phase15B focused DOM tests                             | 9 passed, included in full suite                                                            |
| Phase15B focused Chromium regression                   | PASS; evidence redirected under Phase15C                                                    |
| Live Phase14 backend operations                        | 21 passed; guarded disposable database                                                      |
| Live Phase14 Chromium operations                       | 14 passed; includes real save/reload, public hydration, Market Day and Vendor projection    |
| Backend Phase15C model validation                      | PASS; legacy/default, paths/styles, grouping restrictions, public authoring-state exclusion |
| Existing demo read-only compatibility                  | PASS; 2 versions validated, zero workflow writes                                            |
| Frontend TS + Astro typecheck                          | PASS; Astro 52 files, zero errors/warnings/hints                                            |
| Backend Market Operations typecheck                    | PASS                                                                                        |
| ESLint / package boundaries / Prettier                 | PASS                                                                                        |
| Production-local frontend/storefront/admin build       | PASS                                                                                        |
| Production-local backend dashboard/server/worker build | PASS                                                                                        |

The first sandboxed full build hit EPERM resolving the Vendure dashboard entry; rerunning the same production-local command outside the filesystem sandbox passed. No build was deployed.

Run from the frontend repository in a normal local terminal:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use separate terminals. Restart the existing demo services to load backend validation and frontend engine changes. Do not reset or showcase the persistent database.

Qualification commands:

```powershell
$env:FRONTEND_EVIDENCE_DIR='docs/evidence/phase15c'
npx vitest run tests/phase15c.test.ts
npm test
npm run typecheck
npm run lint
npm run test:live:layout-designer
npm run test:layout-demo:read-only
$env:PHASE15B_EVIDENCE_DIR='docs/evidence/phase15c/phase15b-regression'
npx tsx scripts/test-phase15b.ts
$env:FRONTEND_NO_EVIDENCE='true'
npm run test:live:market-operations
npm run build:production-local
```

Evidence is confined to `docs/evidence/phase15c/`. Phase15A/15B evidence was not modified. Existing Phase14 browser selectors were adapted to deliberate world-to-Stage coordinates rather than SVG DOM handles; test interactions remain real pointer gestures.

## Known limits and unchanged boundaries

- Booths do not join graphical groups; multiple selections containing booths resize individually.
- Marquee uses full containment of rotated axis-aligned bounds, not polygon intersection.
- Cross-area groups and area reorder are unsupported by the current domain/UI.
- Image URLs require public HTTP(S) access and compatible CORS; failures use a placeholder.
- Clipboard is editor-local, without OS clipboard/scene JSON import. Paths stop at 512 points. History stops at 100 entries.
- The 390px editor is a vertically stacked authoring/inspection workspace. Desktop remains the best authoring experience.
- Physical touch hardware and arbitrary remote-image services were not tested; no external provider calls were made.
- Financial rules, invoice immutability, fee snapshots, rentals, funds flow, Stripe architecture, applications, recurrence and Vendor identity remain unchanged. No Vendor sales/POS/SNAP/WIC reconciliation.
- Real Stripe Connect = **NOT_EXECUTED**. Real Stripe Billing = **NOT_EXECUTED**. **CHECKOUT-B1 = OPEN**. **FundsFlowPolicy = NOT_CONFIGURED**. No Phase15D work.

## Acceptance matrix

PASS means implemented and qualified at the stated local scope. The documented safe booth-group/multiple-transform restrictions satisfy B26 while preserving physical semantics.

| ID  | Requirement                    | Result / evidence                                     |
| --- | ------------------------------ | ----------------------------------------------------- |
| A1  | react-konva installed          | PASS, 19.3.0                                          |
| A2  | konva installed                | PASS, 10.7.1                                          |
| A3  | existing React 19.3 compatible | PASS, explicit registry peers and unchanged runtime   |
| A4  | actual Stage/Layer editor      | PASS, source assertion and real Chromium canvas       |
| A5  | Transformer                    | PASS, real corner/rotation handle drags               |
| A6  | no primary SVG editor          | PASS, source assertion                                |
| A7  | no commercial SDK              | PASS, MIT library dependencies only                   |
| A8  | no silent fallback             | PASS                                                  |
| B1  | full-workspace editor          | PASS, desktop screenshot                              |
| B2  | tools                          | PASS                                                  |
| B3  | contextual inspector           | PASS                                                  |
| B4  | wheel zoom                     | PASS, real browser                                    |
| B5  | pointer-centered zoom          | PASS, coordinate assertion                            |
| B6  | pan                            | PASS, Space and read-only drag                        |
| B7  | fit                            | PASS                                                  |
| B8  | grid                           | PASS, bounded Konva lines                             |
| B9  | snap to grid                   | PASS, unit and drag implementation                    |
| B10 | alignment guides               | PASS, edge/center unit qualification                  |
| B11 | click selection                | PASS, real canvas                                     |
| B12 | marquee                        | PASS, real pointer rectangle                          |
| B13 | multiple selection             | PASS, Shift-click and joint delta assertion           |
| B14 | resize                         | PASS, Transformer pointer drag                        |
| B15 | rotation                       | PASS, Transformer pointer drag                        |
| B16 | nudge                          | PASS, bounded model/keyboard                          |
| B17 | copy/paste                     | PASS, real shortcuts and identity assertions          |
| B18 | duplicate                      | PASS, fresh label/ID                                  |
| B19 | delete                         | PASS, lock protection                                 |
| B20 | undo/redo                      | PASS, real shortcuts and history units                |
| B21 | z-order                        | PASS, deterministic unit coverage                     |
| B22 | align/distribute               | PASS, actual align and unit distribution              |
| B23 | lock/unlock                    | PASS, locked drag/Delete protection                   |
| B24 | hide/show                      | PASS, editor-only semantics                           |
| B25 | layers                         | PASS, locate/flags/selection                          |
| B26 | group/ungroup restriction      | PASS, decorations only                                |
| C1  | booth                          | PASS, first-class space                               |
| C2  | rectangle                      | PASS                                                  |
| C3  | circle                         | PASS                                                  |
| C4  | triangle                       | PASS                                                  |
| C5  | line                           | PASS                                                  |
| C6  | path/freehand                  | PASS, real drawing, bounded server input              |
| C7  | text                           | PASS                                                  |
| C8  | image                          | PASS, retained safe URL support and error placeholder |
| C9  | shape styling                  | PASS                                                  |
| C10 | text styling                   | PASS, persisted bold/28px in browser                  |
| D1  | MarketSpace preserved          | PASS, live workflow                                   |
| D2  | booth ID/label                 | PASS                                                  |
| D3  | physical width/depth           | PASS                                                  |
| D4  | physical resize sync           | PASS, unit and live Transformer drag                  |
| D5  | amenities                      | PASS, actual checkbox persistence                     |
| D6  | default fee                    | PASS, 4000 minor units retained                       |
| D7  | preferred business             | PASS, live editor save                                |
| D8  | private manager notes          | PASS, existing projection + copy/sync allowlists      |
| D9  | rapid duplicate                | PASS, shortcut                                        |
| D10 | unique identity                | PASS, persisted IDs and labels                        |
| D11 | attribute sync                 | PASS, explicit confirmation                           |
| D12 | no billing duplication         | PASS, explicit space-details allowlist                |
| E1  | domain source of truth         | PASS                                                  |
| E2  | no Konva scene persistence     | PASS                                                  |
| E3  | old records                    | PASS, old fixture and existing demo audit             |
| E4  | save/reload                    | PASS, synthetic and real backend browser              |
| E5  | published immutability         | PASS, live backend guard                              |
| E6  | occurrence history             | PASS, live version pin test                           |
| E7  | demo preserved                 | PASS, zero workflow writes                            |
| F1  | assignment map                 | PASS                                                  |
| F2  | hover                          | PASS, Phase15B regression                             |
| F3  | clicked booth modal            | PASS, actual pointer and multi-booth unit             |
| F4  | paid state                     | PASS, invoice-derived                                 |
| F5  | public map                     | PASS, real storefront hydration                       |
| F6  | public privacy                 | PASS, backend projection and browser                  |
| F7  | Vendor map                     | PASS, live own-booth flow                             |
| F8  | Market Day                     | PASS, paid move/check-in/attendance                   |
| G1  | 500-element fixture            | PASS, synthetic local only                            |
| G2  | 1440 responsive                | PASS, inspected screenshot/Axe                        |
| G3  | 768 responsive                 | PASS, inspected screenshot/Axe                        |
| G4  | 390 intentional layout         | PASS, stacked canvas/inspector                        |
| G5  | no horizontal overflow         | PASS, DOM assertion                                   |
| G6  | semantic alternatives          | PASS, object/booth lists and forms                    |
| G7  | representative Axe             | PASS, WCAG surrounding DOM                            |
| G8  | full unit suite                | PASS, 256 tests                                       |
| G9  | live operations                | PASS, 21 backend + 14 browser                         |
| G10 | Phase15B regression            | PASS                                                  |
| G11 | production-local build         | PASS, both repositories                               |
