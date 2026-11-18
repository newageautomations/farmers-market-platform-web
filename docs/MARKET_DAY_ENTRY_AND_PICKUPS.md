# Market Day entry and pickup fixtures

Market Day reuses its existing date selector, workspace frame, attendance controller, checklist and assistance panels. No new UI component or presentation standard is introduced.

Without an explicit date, entry chooses the earliest active or upcoming date. Explicit dates and phase links remain selectable. Vendor entry opens Market after their own check-in and non-closing setup tasks are complete. Manager entry uses the manager preparation checklist, independent of vendor attendance and vendor checklists. Managers do not have a separate self-check-in record. Empty checklists retain Setup.

Vendor attendance appears only in Setup. Manager attendance appears in Setup and Closing. Assistance appears only in Market.

The local seed script adds eight idempotent native-checkout orders for vendor 52, Preorder Fee D orchard, at occurrence 78 on November 13, 2026, noon to 3 p.m. Central. It reuses the existing backend packing fixture flow, with external providers disabled for its process, preserves existing data, and never performs pickup fulfillment. Run `node scripts/seed-orchard-market-day.cjs --verify` to check eight settled, uncollected operational orders. Do not repurpose the script for another database.

Validation: `npx vitest run tests/market-day.test.tsx tests/market-day-actions.test.tsx`.

The initial eight November 14 fixture orders were cancelled through the coordinated inventory cancellation service after the requested date was clarified. Existing placed-order contexts remain immutable.

Because the requested market had already started, replacement orders use the backend clock composition seams in the isolated seed process to represent preorders placed before the market. The live server clock and market schedule are unchanged. Verification also confirms all eight mistaken November 14 operational orders are cancelled.

Market Day pickups retain collected orders after outstanding orders, with total purchased quantity in the Items column. The existing PickupDetails opts into an item-gathering checklist for the review dialog through `itemChecklist`; these session-local checkboxes do not record fulfillment or replace customer identity confirmation. The shared detail footer places navigation links on one flex row and aligns the order total at the left. Existing Checkbox, FarmstandTable and link components are reused, with no new UI component.
