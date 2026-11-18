# Booth billing before layout publication

Saved shared layouts in either Draft or Published status can be selected for a market date through Change layout. Assign booths, issue invoices, and collect payment using the existing billing flow. Neither layout publication nor public map publication is required for billing. Existing payment permissions, invoice issuance, vendor identity and payment provider requirements still apply.

Selecting a draft pins that saved version to the date. Later edits in the layout library create a new draft version and preserve the version, booths, assignments and billing already used by dates. Editing a date's own layout continues using the existing occurrence-specific editor.

The existing Publish layout button remains in Layouts > Edit for a shared draft layout, in the editor toolbar beside Save layout. It requires layout management permission and does not appear for already published layouts or in the date-specific editor. Publish map remains the separate action that makes a date's map public. No publication controls were added.

The frontend reuses OccurrenceLayoutActions and its existing preview, confirmation and selection controls. No new component or styling system is introduced.

Regression checks:

- Web: `node node_modules/vitest/vitest.mjs run tests/occurrence-layouts.test.tsx tests/assignments-workspace.test.tsx tests/booth-invoice-bulk.test.tsx`
- Backend: `node node_modules/ts-node/dist/bin.js --project test/market-operations/tsconfig.json test/market-operations/occurrence-layouts.ts --draft-layout`
- Backend published-layout regression: `npm run test:occurrence-layouts`

Backend tests use the guarded disposable database harness, never the persistent manual test database. No schema migration is introduced by this change.

Validation on November 12, 2026: the admin build and backend server build passed. Seven occurrence-layout UI checks and all 26 assignment workspace/bulk invoice checks passed. The full occurrence-layout UI file has two unrelated failures expecting the absent Physical booth identity selector. The backend integration run stops during fixture setup because the existing harness omits current schema migrations (catalog details and membership grant revision), before reaching the new assertions. The full backend build stops at the dashboard configuration's APP_ENV_EXPLICIT_MODE_REQUIRED check. The backend server build passes independently. These broader harness/configuration issues were left outside this change.
