# Market layout smart design tools, phase 2

Implemented locally on November 7, 2026. All changes are in the web project. No backend files, database schema, accounts, populated test data, hosting or remote Git state were changed. No migration or dependency installation is required.

## Implemented

- **Booth rows:** Smart design opens one compact sidebar panel with a tool selector. Configure 1 to 100 booths, width/depth/gap in feet, horizontal/vertical direction, number prefix, starting number and rotation. Insert at the current canvas center. Rotation affects both the row direction and individual booth orientation. Labels are checked case-insensitively against the whole drawing; a collision stops the entire operation with a specific error. Measurements, map coordinates and the existing 1,000-object limit are checked before insertion. Each booth is an independent `SPACE`, with normal default operational details and no group or borrowed physical identity. Row insertion is one undo/redo action.
- **Minimal, Natural and Modern styles:** centralized palettes coordinate background, booth/decorative fills, text families, strokes and decorative shadows. An explicit Replace existing map styling checkbox explains the replacement before applying. All areas are included; locked objects, tracing references and external images retain their styling. Physical dimensions, positions, rotation, path geometry, scale, identities and operational details remain unchanged. Applying a style is one undoable action.
- **Precision:** retain all six alignment directions and horizontal/vertical distribution. Alignment now moves complete decoration groups as units and preserves operational details exactly, without recalculating booth feet from pixel dimensions. Equal spacing accepts a gap in feet, anchored at the leftmost/topmost unit, using rotated bounds. Match width/height uses the first selected object and accepts only unlocked, visible, ungrouped decorations; booths and paths are excluded. Locked/partial groups and selections spanning areas cannot be aligned. Optional object snapping uses the existing edge/center guides, with a five-screen-pixel tolerance independent of zoom. Grid snapping remains independent.
- **Premade elements:** picnic seating, tree-lined walkway, landscaped entrance, marked parking, information/welcome area and food truck seating. Each inserts existing editable shapes and bundled Phase 1 asset references in one ordinary decoration group. Ungroup through the existing command to customize pieces. No operational booths, equipment stock or assignments are created.
- **Automatic legends:** an editable title, color swatches and entries derived from represented booth types/sizes, actual booth fills and mapped amenities. Legend entries update with visible area objects and caller-supplied scheduling statuses. References, fully transparent objects and absent categories/statuses are omitted. Inspector changes title, position, dimensions, text styling, background, stroke, padding and opacity. Layers, duplication, grouping, undo/redo and published rendering use the same existing object infrastructure.
- **Booth appearance:** apply a uniform fill or deterministic colors from existing `spaceType`; individual custom styling remains in the existing booth inspector. Locked booths are preserved. Occurrence editors optionally preview current assignment/payment colors using the exact same `boothStatus` helper as Assignments. Preview colors are never saved into object fills. The legend labels unassigned booths as needing scheduling checks, rather than claiming bookable availability.

## Architecture and files

The existing Konva renderer, `Drawing`, history reducer, `SPACE` identity lifecycle and revision-aware save/publish commands remain authoritative. New booths omit `physicalBoothIds` entries exactly like the individual Booth tool; the existing backend creates their identities during save. Authorization, scheduling and assignment services are unchanged.

Legends use a bounded text template: an ordinary `TEXT` object's text starts with `{{map-legend}}` followed by a newline and its title. The shared renderer interprets that explicit template and derives entries at render time. No assignment, availability, category snapshot or private manager data is embedded in it. Inspector and Layers show its title instead of the template marker. This reuses the validated/publicly projected existing schema, avoiding a new object type, database migration or theme/template engine. The contract test runs the actual sibling backend's source validator and public serializer without starting Vendure or connecting to a database.

New files:

- `packages/ui/src/map/smart-design.ts`: pure row, palette, spacing, sizing, arrangement, appearance and legend helpers.
- `apps/admin/src/market/phase14/LayoutSmartTools.tsx`: feature panel composition.
- `apps/admin/src/market/phase14/booth-status.ts`: existing status calculation extracted unchanged for reuse; Assignments retains its exported API.
- `tests/layout-smart-design.test.tsx`, `tests/layout-smart-contract.test.ts`: domain, editor, serialization and publish checks.
- `tsconfig.layout-smart-design.json`: repeatable scoped TypeScript check.

Updated files:

- `packages/ui/src/map/model.ts`, `MapCanvas.tsx`, `KonvaElement.tsx`: group-aware positioning, optional snapping, memoized legend derivation and shared legend rendering.
- `packages/ui/src/MarketMap.tsx`, `packages/ui/src/index.tsx`: readable legend labels and helper exports.
- `apps/admin/src/market/phase14/Layouts.tsx`, `LayoutInspector.tsx`, `LayoutLayers.tsx`, `Assignments.tsx`: bounded integration, title editing, type information and status reuse.
- `tests/layout-visual-rendering.test.tsx`: dynamic legend rendering coverage.
- This report.

`LayoutSmartTools` is necessary because existing components do not own batch booth validation or map-specific design actions. It composes the existing Button, Select, Control, Entry, Check and inspector fieldset presentation. No new primitive, styling system, SVG artwork, UI library or approved component category is introduced. Existing specialist editor shell and frontend/backend authority boundaries are retained.

## Verification

Passed: **69 tests across five focused files**, plus focused ESLint and Prettier checks on implementation and tests. Tests cover row direction/rotation/numbering/collisions/limits, physical identity separation, atomic undo/redo, style geometry/data preservation, grouped alignment and equal spacing, compatible sizing, all six asset arrangements, legend data derivation and renderer updates, live occurrence preview changes, save payloads and revision-aware publish ordering. The contract test validates unstyled and all three styled layouts through the actual existing server validator and public JSON projection, including all arrangements and the legend template.

Additional occurrence regression run: six tests passed, including revision-aware edits, assigned-booth deletion protection, failed-draft retention and existing layout-switch confirmation. Two pre-existing tests failed because they expect the retired Physical booth identity selector and retirement controls (`physical identity selection requires confirmation and excludes identities already represented`, `physical identity changes are disabled for an assigned representation`). Those controls were already absent before this feature and are intentionally not restored.

Scoped TypeScript compilation reports only the previously documented unrelated `packages/ui/src/table-navigation.ts:29` TS18048 error, target possibly undefined. No errors are reported in the feature or its tests. No browser automation, screenshots or full repository test suite was run. Real database save/reload and visual review remain manual checks; JSON contract qualification is not a database integration test.

Run from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/layout-smart-design.test.tsx tests/layout-smart-contract.test.ts tests/layout-visuals.test.tsx tests/layout-visual-rendering.test.tsx tests/phase15c.test.ts --reporter=default
npx tsc --project tsconfig.layout-smart-design.json --noEmit
```

The contract test requires the existing sibling backend checkout and its already-installed dependencies. It reads the source model through that checkout's TypeScript loader; it does not run a migration, seed, server or database harness.

## Manual testing

Use the populated local `vendure_demo_market_ops` environment. In separate terminals in the web project, run `npm run demo:market-operations:serve`, `npm run demo:market-operations:worker`, `npm run demo:market-operations:admin` and `npm run demo:market-operations:storefront`. Use the printed local URLs. Do not reset, reseed or migrate for this feature.

1. Sign in as the existing Boerne Market Manager (`market.manager@example.test`) with its established credentials. Select Boerne and open `/market/layouts`. Create a separate review layout and name it `Phase 2 smart design review`. Preserve established layouts, accounts, assignments and occurrences. No fixtures were needed or created during implementation.
2. At `/market/layouts/:layoutId/edit`, open Smart design. Create six 12-by-10-foot booths with a two-foot gap, prefix `Review-`, starting at 20. Expect `Review-20` through `Review-25`, independent selection and normal booth inspector fields. Repeat unchanged: expect a collision message and no partial insertion. Undo and redo the row. Try vertical direction and 30-degree rotation with a fresh prefix. Save and reopen; expect the same geometry and distinct physical booth records through the existing save workflow.
3. Select at least three differently positioned objects. Try every Align command and horizontal/vertical distribution. Apply a three-foot equal gap. Expect equal rotated bounding-box gaps and unchanged booth measurements. Lock one item: operations must be disabled. Try Match width/height on ungrouped decorations; expect the first selected size to be copied. Include a booth: size matching must be disabled. Toggle object snapping, zoom and drag near an edge/center; expect guides only when enabled.
4. Insert each premade arrangement. Move it as a group, then select it together with another object and align/space them. Expect its internal arrangement to stay intact. Ungroup, recolor or move a piece, and undo/redo. Expect booth count and assignments to stay unchanged.
5. Try each map style after checking Replace existing map styling. Expect coordinated colors/text and unchanged geometry, fees, amenities and identities. Lock a custom object before applying; it must retain its style. Undo once to restore all previous styling. Apply uniform booth color, then color by booth type. Change a booth type in Inspector and reapply to update its color. Custom Inspector fills must remain editable.
6. Add parking, restroom and entrance assets, then insert a legend. Expect entries only for mapped items and represented booth types/colors. Remove an amenity: its entry disappears. Change legend title/font/background/padding/position in Inspector, save and reopen. Resize its height for a long list. Hide an ordinary object in the editor: it disappears from the editor legend but returns in public views; reference-only images never contribute entries.
7. Save and publish the separate review layout. For storefront review, use a new unused occurrence with no assignments, choose this layout through existing occurrence controls and publish the occurrence map. Open `/occurrences/:occurrenceId`. Expect saved styling, decorations and legend, with booth-size labels where the public API omits type names. Do not replace a populated occurrence's layout for this test.
8. On an existing occurrence with assignments, open `/market/assignments/:occurrenceId/edit-layout` for read/review, preserving its records. Under Smart design, Booth appearance, enable live scheduling status preview. Expect existing assignment/payment states and a matching legend if present. Toggle it off: saved custom fills return. Status colors must not become saved fills or alter assignments. Review without saving changes to an established operational layout. The existing Manna Roots Vendor and all other accounts retain their data and privileges.

## Limits and intentionally omitted behavior

- Presets and type/uniform colors are explicit, undoable style applications. They are not a persistent theme engine. Reapply after adding objects or changing booth types. Six deterministic type colors may repeat for different types; legends retain their distinct text labels. Custom styling is preserved until an explicit replacement action.
- Status preview and snapping toggles are session settings. Scheduling views supplying live statuses keep dynamic status legends. Public views receive saved presentation plus public booth dimensions; the existing public API does not expose `spaceType` or authoritative bookable/unavailable calculations. Public legends therefore use real booth sizes and colors, and no unsupported unavailable state or private type field is invented. No new availability API or persisted status mode is introduced.
- Legend content follows the currently rendered area and view. Its fixed editable bounds clip overflow; enlarge the legend or reduce font/padding for many entries. It is a dynamic explanation of current data, not a manually maintained category/status list. Older application builds would display its template text, so use the updated shared renderer for admin and storefront together.
- Arrangements use Phase 1's existing layout-pixel artwork sizes, not surveyed dimensions or equipment reservations. Row creation intentionally stops at coordinate/object limits and does not auto-fit an oversized row; use the existing Fit map control if a generated row extends beyond the viewport.
- No AI layouts/styling, shell redesign, physical identity selector, scheduling/assignment workflow, backend schema change, deployment or unrelated refactor was added.
