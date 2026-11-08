# Market layout editor UI, phase 3

Implemented locally on November 7, 2026. No backend files, accounts, database records, dependencies, hosting or remote Git state were changed. No migration is required.

## Changes

- Grouped tool rail with shared icons and readable labels: Select/Pan, Booth/Smart booth row, expandable shapes and paths/landscaping, and content tools. Smart booth row and Premade arrangements open their existing settings directly. The active canvas tool is indicated in the rail and footer.
- Persistent Assets side panel with search across names/categories, category selection, responsive thumbnails, last-inserted indication, insertion feedback and an empty state. Multiple insertions retain the search/category. Arrangements are accessible from this panel too.
- Contextual selection toolbar, in a reserved row above the canvas so it cannot cover objects or handles. Frequent actions remain visible; Copy, visibility, grouping and precision are in More actions. Existing shortcuts and callbacks remain authoritative.
- Inspector disclosures separate Transform, physical booth settings, object-specific settings and Appearance. Layout settings expose the existing style tool. Compatible, unlocked multi-selected decorations have shared fill/opacity controls; booths retain operational controls and dimension validation.
- Layers use the same object icons, clear selection/visibility state, automatic selected-row scrolling, existing lock/hide controls, inline renaming and forward/backward ordering. Group ordering uses the existing group selection and respects locked/hidden members. Names reuse existing labels/text, including legend titles; no new metadata model was added.
- Collapsible properties panel, laptop widths and the existing stacked narrow-screen fallback. Workspace/canvas separation, quieter default grid, compact navigation spacing, hover outlines and smaller rounded selection handles. Saved custom grid opacity remains authoritative; only the unset default is quieter. Shared brand/control tokens and reduced-motion rules are retained.
- Dedicated public-appearance Preview uses the same mounted MapCanvas and current unsaved/draft drawing. It hides editing controls, grids, guides and handles through existing read-only rendering. Reference-only images are excluded, while ordinary editor-hidden objects appear as they do publicly. Vendor assignments, status overlays and private booth type fields are omitted. Legends therefore use public booth dimensions/colors. The notice explicitly distinguishes current editor content from publishing. Returning preserves edits, selection, history and viewport. Editing shortcuts are disabled in preview.
- Fixed smart arrangement/multi-selection dragging jumping northwest on grab. Konva Transformer starts follower drags for all selected nodes. These previously replaced the shared origin with different object centers. One pointer-down world coordinate and one leading object now govern every follower move, snapping and the single history commit. The original grab offset, rotations and internal group spacing remain intact at different zoom/pan settings.

## Architecture and scope

The existing Konva renderer, drawing/history reducer, geometry helpers, protected-booth checks and revision-aware save/publish operations remain in use. No second rendering engine, business controller, UI library or data model was introduced. No scheduling, assignment, physical identity or authorization behavior was expanded.

Read `COMPONENT_USAGE_GUIDE.md`, the relevant `UI_COMPONENTS.md` decisions and both prior phase reports. The editor retains its specialist TAB-02 panel selection and approved shared Button, Input, Select, IconButton, UtilityIcon, field and native disclosure contracts. Pending map/category decisions remain pending. `LayoutTools` is a feature composition because no existing component owns grouped map insertion and environment-tool callbacks. It composes the existing controls; additional glyphs extend UtilityIcon's existing SVG mechanism. Existing Assets, Inspector, Layers and Smart tools compositions were extended instead of creating parallel primitives.

Files changed for this phase:

- `apps/admin/src/market/phase14/Layouts.tsx`, `LayoutTools.tsx`, `LayoutAssets.tsx`, `LayoutInspector.tsx`, `LayoutLayers.tsx`, `LayoutSmartTools.tsx`, `LayoutVisualControls.tsx`, `designer.css`.
- `packages/ui/src/map/MapCanvas.tsx`, `KonvaElement.tsx`, `MapGrid.tsx`, and `packages/ui/src/utility.tsx`.
- `tests/layout-editor-ui.test.tsx`, `tests/layout-canvas-drag.test.tsx`, `tsconfig.layout-smart-design.json`, and this report.

## Verification

Focused tests cover grouped tool wiring, repeated asset insertion/search/category filtering, direct smart-tool switching, shared appearance and undo, layer naming/order/lock/visibility, panel collapse, preview data/keyboard boundaries and retention of unsaved edits. Canvas tests simulate Konva follower drag events with real Group positions at 50%, 100% and 200% zoom, a rotated group, an off-center individual grab, locked-object exclusion and one commit per gesture. Read-only rendering verifies reference exclusion and ordinary hidden-object publication behavior.

**Passed: 79 tests across seven focused files**, plus focused ESLint and Prettier checks on the changed implementation/tests.

Run from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/layout-editor-ui.test.tsx tests/layout-canvas-drag.test.tsx tests/layout-smart-design.test.tsx tests/layout-smart-contract.test.ts tests/layout-visuals.test.tsx tests/layout-visual-rendering.test.tsx tests/phase15c.test.ts --reporter=default
npx tsc --noEmit -p tsconfig.layout-smart-design.json
```

The contract test reads the existing sibling backend validator/public serializer without starting a server or connecting to a database. No persistent database or disposable database harness was invoked.

Known pre-existing verification limits:

- Scoped TypeScript compilation reaches `packages/ui/src/table-navigation.ts:29`, TS18048, target possibly undefined. This was also recorded in phases 1 and 2.
- Additional `occurrence-layouts.test.tsx` run: six pass and two fail because the tests expect the previously absent Physical booth identity selector/retirement controls. These same failures were recorded in phase 2. Assigned-booth deletion protection, failed-draft retention and revision-aware occurrence editing pass. No identity workflow was added to satisfy unrelated expectations.
- No full test suite, browser automation, screenshot comparison or live database save/publish qualification was run. Manual visual and native-pointer review remains necessary.

## Manual review

Use the established populated `vendure_demo_market_ops` environment. If it is not already running, start each of these in a separate terminal in the web directory and use its printed local URL:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Sign in as the existing Boerne Market Manager, `market.manager@example.test`, using established local credentials. Select Boerne, open `/market/layouts`, and create a separate review layout. Open `/market/layouts/:layoutId/edit`. Preserve existing layouts, accounts, assignments and occurrences. No fixtures, reset, seed or migration is needed.
2. Insert a smart booth row with a fresh number prefix. Expect independent booths and their existing physical/operational inspector controls. Try shapes, custom paths, roads and landscaping; expect existing drawing behavior. Undo and redo insertions.
3. Insert a premade arrangement, then drag it from several pieces and off-center points. Expect every member to retain its relative position and the grab point to stay near the cursor, subject only to enabled snapping. Repeat at 50%, 100% and 200% zoom, after panning, with multiple selected arrangements and with snapping on/off. Try a single asset, legend and individual booth. Undo/redo a completed move once; expect the whole gesture to undo/redo together.
4. Search Assets for trees, choose a category and insert several illustrations. Expect the browser/search/category to stay open. Try a search with no matches. Select objects, change Transform and Appearance, then multi-select decorations and change shared opacity. Expect existing geometry, booth validation and history behavior.
5. In Layers, locate/select an object, rename it, lock/unlock, hide/show and move it forward/backward. Expect matching canvas selection, group behavior and rendering order. Lock a group member and confirm ordering does not move part of that group. Names are the existing map labels/text, so renaming a text object changes its visible content.
6. Add a tracing image with Hide image from published map enabled. Hide an ordinary decoration in the editor. Open Preview. Expect no reference, grid, selection handles or editing toolbar; expect the ordinary hidden decoration to reappear, along with assets, landscaping, booths, labels and legend. Expect no vendor names or scheduling status colors. Check the draft/unsaved notice, pan/zoom, try Delete/Ctrl+Z, then return to editing. Expect all edits/history to remain intact.
7. Try a map style through layout properties. Save, reopen and publish only the separate review layout through existing controls. Expect styles/geometry/names and distinct booth identities to persist. To compare with actual public output, use only an unused occurrence without assignments through the established occurrence publish workflow, then open its storefront `/occurrences/:occurrenceId` page. Preview itself never publishes.
8. At normal desktop and laptop widths, collapse/reopen properties and test each disclosure/menu with keyboard focus. At narrow widths, expect the existing stacked canvas/panel fallback. Check hover, selection and reduced-motion behavior. Review existing occurrence editing at `/market/assignments/:occurrenceId/edit-layout` without saving changes to established operational data.

## Limits

Only the general public-appearance preview is offered. Market/vendor preview modes and public vendor attribution require their existing permission-scoped projections; no alternate authorization path was created. This preview deliberately omits vendor attribution and is not a fetched copy of the actual published occurrence map. Existing public rendering and publishing remain authoritative.

No separate mobile editor, artboard/coordinate model, new physical identity controls, AI tools or backend changes were added. The canvas remains the existing unbounded coordinate workspace. Legends keep their existing fixed editable bounds and can need more height for many entries. Local visual/native-pointer review has not yet been performed.
