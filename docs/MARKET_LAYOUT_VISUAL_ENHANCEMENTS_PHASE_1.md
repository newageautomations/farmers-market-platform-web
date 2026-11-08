# Market layout visual enhancements, phase 1

Implemented locally on November 7, 2026. No deployment, account changes, demo seeding or persistent database changes. No migration or dependency installation is needed. Restart the local backend and admin app to use the updated JSON contract and renderer together.

## Capabilities

- A categorized, thumbnail-based Assets panel with 30 application-owned SVG illustrations. Landscaping includes oak, maple, evergreen, shrubs, flowers, grass and planters. Amenities include picnic tables, benches, trash/recycling bins, restrooms, handwashing, fountains and seating. Infrastructure includes tents, food trucks, trailers, utility hookups, fences, barricades and entrance/exit indicators. Transportation includes cars, parking, accessible parking, bicycle racks, arrows and crossings. All use a consistent restrained illustration palette. The primary color is editable; secondary illustration details retain their colors.
- Environment drawing presets for sidewalks, paved paths, roads, gravel paths, dirt paths and curved walkways; filled grass, pavement, gravel, mulch, water and landscaping beds. Draw with the existing freehand tool. New regions start behind existing objects. Arrange commands still control the final layer order.
- Editable vector paths with solid/dashed/dotted strokes, rounded ends and joins, configurable width/color/opacity, a separate outline, closed fills and optional curved interpolation. Environment strokes simplify sampled vertices with a 3-layout-pixel tolerance. Custom paths retain their existing geometry. Edit path points exposes draggable vertices on a selected path.
- Decorative shape styling adds rectangular corner radius, stroke patterns and a subtle shadow. Existing precise size, rotation, opacity, grouping, locks, layers, duplication, deletion and undo/redo remain in use. Decorative strokes support up to 500 layout pixels; booth strokes retain their existing 50-pixel limit.
- Canvas settings add Paper, Meadow, Courtyard and White backgrounds, a custom solid color and editing-grid color/opacity. Background colors are published. Grid settings never render in public maps and never change scale. Existing grid visibility, snapping and spacing remain editor-session settings.
- Existing image objects support tracing references: adjust opacity, lock through the existing commands/Layers, and enable Hide image from published map. Both the backend public projection and read-only renderer exclude these references. Ordinary editor-hidden objects still appear publicly, as before.
- Text supports system sans, Georgia and Consolas, size, normal/bold weight, color, alignment, rotation, optional background color, padding and rounded background corners.

## Architecture and changed files

The existing Konva Stage/Layer/Transformer, normalized LINE points, MapElement geometry, history reducer and layout commands are extended. There is no second drawing engine. All properties are optional, preserving legacy layouts. Artwork is stored once in the application; each saved illustration uses an IMAGE object with a stable assetId and color, never embedded SVG markup. Only application-owned IDs resolve to SVG. SVG colors are restricted to six-digit HEX; untrusted markup is never rendered. Decoded images are shared through a bounded 128-entry cache.

Frontend files:

- `packages/api/src/market-operations.ts`: additive layout JSON types.
- `packages/ui/src/map/assets.ts`, `visuals.ts`: artwork registry, presets, visibility and pure path/style helpers.
- `packages/ui/src/map/KonvaElement.tsx`, `MapCanvas.tsx`, `MapGrid.tsx`, and `packages/ui/src/index.tsx`: shared editor/public rendering, vertex handles, background/grid and exports.
- `apps/admin/src/market/phase14/Layouts.tsx`, `LayoutInspector.tsx`, `LayoutAssets.tsx`, `LayoutVisualControls.tsx`, `designer.css`: bounded editor integration.
- `tests/layout-visuals.test.tsx`, `tests/layout-visual-rendering.test.tsx`: focused automated checks.

With explicit approval, the sibling backend has changes in `src/plugins/market-operations/model.ts` and new `test/market-operations/layout-visuals-model.ts` and `layout-visuals-persistence.ts`. Validation bounds the new values and allowlists asset IDs. Decorative-only fields are rejected on SPACE elements. The public serializer includes published appearance and excludes reference objects, their URLs, editor flags, grouping and private grid settings. Existing service authorization, transactional save/publish, booth identity, scheduling and assignment code is unchanged. The frontend/backend asset allowlists are checked for consistency in focused tests.

The new panels are feature compositions because no existing component supplies map asset browsing or these domain-specific inspector properties. They reuse Button, Select, Control, Entry and Check, the existing sidebar/disclosure structure, and the existing image-library tile presentation. No pending UI category is approved or migrated by this work.

## Verification

Passed:

- Frontend: 34 tests across `layout-visuals.test.tsx`, `layout-visual-rendering.test.tsx` and the existing `phase15c.test.ts`. Coverage includes SVG safety/IDs/recoloring, path geometry, renderer behavior, serialization, existing save/load payloads, background settings, copy/history and separation from physical booth IDs.
- Backend: `layout-visuals-model.ts` and the existing `phase15c-model.ts` pass. They cover legacy/JSON roundtrips, all asset references, bounded styles, rejection of decorative booth fields, public styling and server-side reference exclusion.
- Focused ESLint and Prettier checks on changed frontend implementation and tests.
- Full backend build, using explicit local build environment: `$env:APP_ENV='dev'; $env:NODE_ENV='development'; npm run build` from the backend directory. The initial build without explicit mode failed with `APP_ENV_EXPLICIT_MODE_REQUIRED`; the correctly configured build passed.

Existing unrelated failures, left unchanged:

- Scoped frontend TypeScript compilation reaches `packages/ui/src/table-navigation.ts:29`: TS18048, target possibly undefined. No errors were reported in the changed layout modules.
- `layout-library.test.tsx`: 5 pass, 2 fail. The copy test expects immediate navigation instead of the existing Copy layout dialog; the route test expects a two-argument API read while the current API receives three arguments.
- The new real persistence test uses `startOperationsHarness` and the existing loopback-only, uniquely named `vendure_test_` database guard. Bootstrap fails before layout qualification because `ProductVariant.customFieldsCatalogdetails` is absent from that harness's schema. The failed database `vendure_test_operations_1794109653022_588b4e` was retained by the existing failure policy. The persistent `vendure_demo_market_ops` database was untouched. Live database save/publish, cross-market denial and assignment-retention assertions in that test remain unqualified until this unrelated harness issue is resolved.

No broad test suite, browser automation or screenshot verification was run. Manual visual review remains required.

Run focused checks from the web directory in PowerShell:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/layout-visuals.test.tsx tests/layout-visual-rendering.test.tsx tests/phase15c.test.ts --reporter=default
```

From the backend directory:

```powershell
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/layout-visuals-model.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/phase15c-model.ts
# After the existing disposable harness schema is corrected:
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/layout-visuals-persistence.ts
```

## Manual testing

1. In separate terminals in `E:\coding\farmers-market-platform-web`, start the established environment with `npm run demo:market-operations:serve`, `npm run demo:market-operations:worker`, `npm run demo:market-operations:admin` and `npm run demo:market-operations:storefront`. Use the URLs printed by these scripts. Do not run reset, seed or migration commands for this feature.
2. Sign in with the existing Boerne Market Manager account (`market.manager@example.test`) using its established local credentials and select the existing Boerne market. Open `/market/layouts`. Create a separate layout for manual review, preserving established layouts and assignments, then open `/market/layouts/:layoutId/edit`.
3. Select Grass area in Environment drawing. Drag an irregular boundary with at least three distinct vertices. Expect a green filled region behind other objects. Draw a Curved walkway over it; adjust stroke width, outline, color and opacity in Inspector. At 10 pixels per foot, 40 layout pixels represent a 4-foot path.
4. Select the walkway, choose Edit path points and drag a vertex. Expect smooth vector updates without moving/resizing booths. Vertices stay inside the object's current bounds; use Select and the existing resize handles/precise width and height to expand those bounds. Switch back to Select for normal dragging/resizing.
5. Browse Assets, switch categories and insert trees, a picnic table and parking. Select Inspector to recolor and change opacity/shadow. Move, rotate, resize, duplicate, group, lock, reorder and delete decorations. Undo and redo. Expect matching artwork and existing selection/layer behavior, with the booth count unchanged.
6. Add Text and create an entrance label. Try each font, bold, alignment, padding, background color, radius and rotation. Change the text object's width/height to provide space for its padded label. Expect the same appearance after saving and reopening.
7. Open Canvas settings. Try a background preset, custom color, grid color/opacity, visibility and spacing. Expect background/grid updates without any booth coordinates, physical dimensions or pixels-per-foot changes.
8. Add Image using an existing accessible HTTP(S) site-plan/aerial image URL. Reduce opacity, enable Hide image from published map, and lock it. Use Layers to unlock/select it when needed. Expect it to remain in the editor but disappear from layout-library previews and published maps. Editor Hide alone must continue to hide an ordinary object only during editing.
9. Add an operational Booth. Confirm its physical dimensions and normal operational fields are unchanged, and that decorative controls are absent from its inspector. Save, reload, then Save and publish layout. Expect artwork, geometry and styles to survive, with no new physical booth created for any decoration.
10. For public review, use a new, otherwise unused occurrence with no established assignments. Select the review layout and publish its map using existing occurrence controls, then view its storefront `/occurrences/:occurrenceId` page. Expect styled content and background, with no grid or tracing image. Do not switch the layout of a populated occurrence just for this review. The existing occurrence editor at `/market/assignments/:occurrenceId/edit-layout` uses the same enhancements and retains its assignment protections.

## Limits and deferred scope

- Artwork is authored as SVG but decoded by the existing Konva image renderer at 256px for display. Resizing remains editable; very large illustrations can show raster softness. Paths, shapes and labels remain vector objects in the existing renderer. No new export format is introduced.
- Curves use Konva tension through editable normalized vertices, not independent Bezier tangent handles. There are no polygon holes, vertex insertion/deletion controls or material textures. Gravel and soil are restrained color/stroke presets.
- Fonts use installed system families with fallbacks; no remote font requests. Remote reference images retain existing HTTP(S), CORS and availability constraints. Custom SVG uploads are not added.
- New illustrations use the existing object-size convention, not surveyed real-world asset dimensions. Operational booth dimensions remain authoritative. Background colors apply to the viewport, not a new bounded artboard.
- No AI layouts, smart booth rows, themes, automatic legends, UI redesign or unrelated refactoring. Backend database persistence qualification is limited by the existing harness failure described above.
