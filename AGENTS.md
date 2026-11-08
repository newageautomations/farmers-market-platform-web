## Persistent test database

- `vendure_demo_market_ops` is the persistent local test database. It contains the existing Boerne Market Manager, Manna Roots Vendor, other test accounts, and their saved test data.
- When the user refers to "the test DB" or asks to migrate changes for manual testing, use `vendure_demo_market_ops`, not the ordinary configured `vendure` database or a disposable acceptance-test database.
- Do not alter this persistent database while developing a new feature. Creating migration files or running automated tests does not authorize applying migrations, seeding records, or changing its schema or data.
- Use the existing guarded disposable database mechanisms for automated feature qualification. Do not point destructive test harnesses at the persistent test database.
- When the user explicitly requests migration for testing, verify the actual target is the local `vendure_demo_market_ops` database, inspect its pending migrations, and apply the required changes through the guarded demo migration command: `npm run demo:market-operations:migrate` from `E:\coding\farmers-market-platform-web`.
- A migration request does not authorize resetting, dropping, truncating, reseeding, or replacing existing test data. Preserve the populated dataset unless the user explicitly requests those actions.
- Start this environment through the web directory's `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin`, and `demo:market-operations:storefront` npm scripts. Do not substitute ordinary backend development commands that select `vendure`.

## Frontend Component Reuse

1. Before creating any UI component, search the
   existing codebase for a matching or similar
   component.

2. Prefer importing and reusing existing shared
   components rather than recreating their
   appearance using new JSX, HTML, or CSS.

3. Shared UI primitives must use the project's
   existing design tokens and styling conventions.

4. Do not duplicate buttons, inputs, dropdowns,
   cards, modals, or other existing UI primitives.

5. Admin, vendor, and customer dashboards must
   use the shared dashboard shell where applicable.

6. If an existing component is almost suitable,
   consider extending it through a prop or variant.

7. Do not modify a shared component in a way that
   unexpectedly breaks existing consumers.

8. If no suitable shared component exists, determine
   whether the new component is reusable before
   deciding where it belongs.

9. Do not create parallel styling systems or introduce
   new UI libraries without explicit approval.

10. When a new component is created, document why
    existing components could not be reused.

## Approved UI standards

Before implementing or modifying frontend UI, read the root [COMPONENT_USAGE_GUIDE.md](COMPONENT_USAGE_GUIDE.md) and consult [UI_COMPONENTS.md](UI_COMPONENTS.md) as the authoritative approved-design registry. Reuse documented shared components and renderer-specific adapters, preserve specialist interactions and frontend/backend authority boundaries, and do not silently approve pending component categories.

1. Read root [UI_COMPONENTS.md](UI_COMPONENTS.md) before creating or changing frontend UI. Developer selections take precedence over historical recommendations.

2. Reuse approved components and their shared design contracts. Search existing implementations before creating a component or adapter.

3. Respect the approved scope, variants and retained specialists. Approval of one category does not approve a related category or every consumer's business behavior.

4. Do not recreate an approved component through independent styling or new markup without a documented architectural reason. Renderer-specific adapters must share the approved presentation contract.

5. Preserve Astro SSR and use React components/islands where appropriate. Do not hydrate a page or dashboard just to share styles; never import admin services, privileges or controllers into customer UI.

6. Prevent ancestor/contextual CSS overrides from silently changing approved designs. Use the approved semantic variants and existing tokens instead of competing local styles.

7. Preserve component behavior, accessibility, responsiveness, native form/navigation semantics, domain validation and security contracts during any approved migration.

8. Distinguish implemented standards from approved designs whose implementation is pending. Until a separately instructed migration, reuse existing compatible shared code and document gaps rather than copying visual patterns or claiming consolidation is complete.

9. Document necessary deviations and request developer approval before introducing a competing standard. Do not infer canonical approval for unselected categories; continue applying the existing reuse rules to them.

10. Keep feature work and migrations bounded. Do not perform unrelated UI refactoring, rewrite business controllers or expand the migration plan without task authorization. Use [UI_COMPONENT_MIGRATION_PLAN.md](docs/UI_COMPONENT_MIGRATION_PLAN.md) for the approved sequence; the plan itself is not implementation authorization.

## Label/value alignment

Inherited `dd` margins keep pushing values below their labels. Whenever you build label/value rows (`dl` > `div` > `dt` + `dd`):
- Put `margin: 0; align-self: center;` on the component's own `dd` selector. A broad reset like `.page dd { margin: 0 }` can lose to the app-wide rule.
- Use `align-items: center` on the row instead of `start`.
- Check in the browser that the `dt` and `dd` centers line up (0px offset), as `.redemptions-preview .leaderboard-facts dd` in `loyalty-redemptions.css` does.
