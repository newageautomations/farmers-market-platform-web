# Vendor Products & Inventory

Product names and Manage categories use the reusable Farmstand text-link adapter of the existing left-to-right, 350ms underline effect, including keyboard focus and reduced motion. Price descriptions retain their full DOM text but visually clamp to two lines with an ellipsis. The category and price columns are 170px and 160px, with 24px right padding after price.

Developer refinements: enlarged all catalog typography, widened category/price/on-hand columns and constrained the product column so category starts further left. Rows navigate through their existing native product link while embedded controls remain independent. Adjust stock uses the primary action appearance. Stock guidance shows a green check for healthy stock, an amber triangle for low stock and a red triangle for any out-of-stock products. Unknown reads remain neutral. Dropdown hover fills and pointer cursors follow the theme, and the native search clear affordance uses a primary-colored X with a pointer cursor.

Implemented locally from [the Farmstand vendor products and inventory frame](https://www.figma.com/design/z0E5gETA4imgDzAzRaA0Zh/Farmstand-farmers-market?node-id=19-1285), using Figma MCP design context and its screenshot.

The existing dashboard shell remains. Content uses the same unconstrained width and desktop/mobile gutters as Team. The page heading is Products & Inventory, without the farm label, page subtitle or Export action. The products panel, controls, row actions, category summary and stock guidance follow the reference. Categories retains its existing page. Its plus action reuses CategoryEditor directly. Product creation and product/variant editing retain their existing routes and forms. Inventory is removed from navigation; old inventory URLs still open the combined view with their inventory permission requirement.

## Reuse decisions

`packages/ui/src/farmstand.tsx` and `farmstand.css` provide reusable, opt-in FarmstandButton, FarmstandLink, FarmstandPanel, FarmstandSearch, FarmstandSelect, FarmstandIcon, FarmstandStockBadge and FarmstandStockSummary. These compose the existing Button, buttonClassName, Card, Input, Select and Badge, retaining native semantics, disabled/loading behavior, keyboard focus, reduced motion and native select behavior.

Existing control presentation uses 22px button corners, 40px height and larger typography. It cannot reproduce the explicitly requested 8px corners, 42px main actions, 32px compact actions, 38px search field and compact stock badges without a presentation adapter. These classes opt in explicitly; ancestor CSS does not change ordinary consumers. No new library or parallel styling framework was added. Shared category/filter and stock-summary behavior receives caller-owned data and callbacks rather than fetching tenant data itself.

The stock table is a specialist with inline per-variant inventory commands. The ordinary record-details table moves fields/actions into dialogs and cannot reproduce these requested visible columns and actions. This composition uses a semantic table with scope headings and a contained horizontal scroll area. The scroll container establishes positioning for its hidden accessible heading so it cannot enlarge the page. On narrow content widths the sidebar moves below the table, and the filters wrap. Mobile retains the existing dashboard menu.

The thirteen original visible SVG assets are stored in `packages/ui/src/assets/farmstand`. Their original root dimensions are retained, and CSS masks apply the current theme color without rewriting SVG data. Product photographs remain dynamic and come from the vendor's existing authorized asset library through the featured asset ID. No Figma sample-product photograph is embedded in the live catalog. Missing photographs use the existing store icon. Category symbols use the supplied vegetable, fruit, egg and pantry icons with pantry as the generic fallback.

The reference requests Inter and Lora. These names are preferred locally, with the project's system body font and Georgia as fallbacks when those fonts are not installed. No remote font service is introduced.

The stock dialog reuses DLG-02, Card, Field, Input, InfoTip, Button, Spinner and UtilityIcon. `StockAdjustmentDialog.tsx` owns its edit, confirmation, pending and result stages inside one native Dialog because CommandForm always opens a separate confirmation dialog and closes immediately after success. This feature-specific composition preserves the existing freshness check, operation key and uncertain-outcome policy without changing other command forms. The dialog resizes in place using the browser animation API and respects reduced motion. Back retains the edited total, while dismissing an unconfirmed draft discards it. A centered spinner leads to a green check or red X, and an uncertain or stale result requires checking current records before another intent.

`QuantityStepper.tsx` extracts packing's existing button/input presentation and CSS for reuse by the stock dialog. Packing retains its debounced saves, bounds and blur/Enter behavior. Stock uses the same control with a local draft initialized to the current count, without autosave. The quantity category remains pending in the registry; this bounded extraction does not establish a new general standard. On-hand, allocated and available cards display backend values verbatim. Their shared information bubble explains allocations and active checkout holds without recalculating available stock.

## Data and authority

Catalog, category and inventory data use the existing service APIs. Individual responses remain bounded, and all pages are read so category/stock filters, SKU search, product counts and summaries also include later pages. Display pagination operates on filtered products, with separate rows for variants to avoid ambiguous price or inventory commands. Asset-library reads stop when featured images are resolved or the library is exhausted.

When a variant name is an explicit unit label such as lb, bunch or jar, the on-hand count includes that unit. Other variant names remain variant descriptions; the UI does not invent product measurement data.

ReadOwnCatalog and ReadOwnInventory remain independent. Inventory-only users can use the combined page without issuing catalog/category reads or gaining product-edit access. Stock writes require ManageOwnInventory and a successfully loaded inventory record. Catalog writes and category creation require ManageOwnCatalog. Missing or failed inventory stays unavailable rather than being fabricated as zero. Physical on-hand, allocated and available quantities remain visible in stock dialogs.

Adjust stock is the only stock action in this workspace. Its dialog accepts a nonnegative whole-number total, including zero, and converts it to a signed difference for the existing adjustment command after deliberate confirmation. A fresh read rejects a count changed since opening the dialog. An unchanged target makes no write. Existing operation keys, uncertain-outcome protection, backend validation and refresh handling are retained. This frontend does not introduce an atomic compare-and-set backend operation; a concurrent write after the freshness check remains subject to the existing backend command semantics.

Low stock is a display rule of 1 through 10 on-hand units because the existing inventory projection does not expose a configured low-stock threshold. A product with every variant at zero or below is out of stock; a product with any low/out variant and another available variant is low stock. Missing variant records make the product status unavailable. These rules do not establish checkout availability or change allocation/hold authority.

Primary, secondary, background, surface, foreground, muted and readable primary text consume the existing account theme tokens. Borders, subtle fills, successful stock pills, category symbols and distribution segments derive from those tokens. Warning/danger indicators retain shared semantic status tokens. The account palette provider and persistence flow remain unchanged.

## Local verification

Run focused checks:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/vendor-catalog.test.tsx
npm run build --workspace @market/admin
```

With the existing admin server running through `npm run demo:market-operations:admin`, run `node scripts/check-vendor-catalog-design.mjs`. It uses a temporary frontend entry and in-memory services, blocks external/API requests, and removes its temporary files. It checks desktop geometry, original SVG masks, dynamic thumbnails, theme changes, page overflow at 1280/768/390px, SKU search and the stock adjustment flow, including responsive modal geometry, retained drafts, confirmation-only writes, loading/results, busy dismissal and reduced motion. New artifacts are kept under `docs/evidence/vendor-catalog/stock-adjustment/`. Its photographs are explicitly supplied local test data, not the Figma sample photographs or persistent database content. Screenshots and geometry results are under `docs/evidence/vendor-catalog/`.

No database schema or data changes, migrations, backend file edits, commits, pushes or deployments are part of this implementation.

Verification result: 10 focused catalog/navigation tests passed, the admin production build passed, scoped ESLint and Prettier checks passed, and the browser checks passed without page errors. The build retains its existing large-chunk advisory. The repository-wide TypeScript check reports 11 errors in untouched application-review, market-dashboard, occurrence-layout and phase15 test fixtures; the output is retained in `docs/evidence/vendor-catalog/typecheck.txt`. The broader admin/vendor test run also encountered existing authentication mock and older permission expectations, outside the focused catalog checks.

Stock dialog verification: all 33 catalog and packing tests passed, along with the admin build, scoped ESLint and formatting checks. Chromium passed at 1280, 768 and 390px, including actual shrinking/expanding dialog dimensions, one native dialog throughout, retained drafts, cancellation without a write, quantity limits/native validation, loading, busy dismissal, successful refresh, failure results and reduced motion. The TypeScript check still reports the same 11 pre-existing fixture errors and no errors in the changed files; the current output is retained under `docs/evidence/vendor-catalog/stock-adjustment/typecheck.txt`.
