# Overview attention links

Follow-up: manager and vendor expiring-soon reminders can be dismissed and restored. Dismissal lasts for the current browser-local calendar day, is scoped to the workspace in this browser, and resets when the alert content changes. The expiration side panel offers Preview document using the existing submitted-file preview and Send expiration notification for authorized managers when the shared submission is expiring soon. The new local backend command validates current ownership, revision and sharing, queues the existing vendor expiration event, and deduplicates each submitted version per UTC day. Existing notification preferences remain authoritative for delivery. Open Vendor compliance now uses native navigation so its requested tab and vendor actually load.

Follow-up files include `apps/admin/src/DashboardWidgets.tsx`, the manager/vendor overview consumers, `vendor/vendor-dashboard.css`, the Documents workspace/report components and `packages/api/src/documents.ts`. Backend changes are in `src/plugins/documents-compliance/service.ts`, `notifications.ts` and `test/documents-compliance/notifications.ts` in the backend project. Frontend tests cover dismissal/restoration and the selected-file preview and notification action. Backend TypeScript passes; full document qualification stops during disposable fixture setup on the existing missing `ProductVariant.customFieldsCatalogdetails` column, before the added manual-notification checks run. Restart the demo API and worker after applying this backend change. No migration is required.

Manager and vendor Overview alerts now open the relevant work queue or record. Counts, read permissions and backend decisions retain their existing authority. No database changes are required.

| Manager notification                | Destination                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Documents to review                 | Documents, Readiness and reports, Vendor compliance summary with Compliance status set to Pending review |
| Documents expiring soon             | Documents, Readiness and reports, Report set to Expiration report                                        |
| Expired documents                   | Documents, Readiness and reports, Expiration report with Compliance status set to Expired                |
| Invoices past due                   | Finances, Booth invoices, Past due status across All market dates                                        |
| Applications to review              | Submitted Applications with To review selected                                                           |
| Vendor requests                     | Vendors with Account set to Needs a decision                                                             |
| No booth layout for the next market | The next date's Assignments page, retained                                                               |
| Vendors without a booth             | The next date's Assignments page, retained                                                               |

| Vendor notification                                    | Destination                                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Saved document expired                                 | The exact library document's existing details dialog, with Replace available when authorized                                                                 |
| Saved document expiring soon                           | The exact library document's existing details dialog                                                                                                         |
| Rejected submission                                    | Market requests for that market with the exact request dialog open                                                                                           |
| Missing, expired or access-revoked required submission | Market requests for that market with the exact request dialog open                                                                                           |
| Attendance confirmation                                | The correct market date page, retained                                                                                                                       |
| Booth fee due or past due                              | Booth assignments with the correct date first and expanded, and the exact invoice payment dialog open via `occurrence` and `invoice` URL inputs |
| Application information requested                      | The exact application detail, retained                                                                                                                       |
| Market link request                                    | Markets, Applications, with the exact business-link response focused and scrolled into view                                                                  |

`ComplianceReports` reads an allowlist of report inputs from the URL, including the legacy `occurrence` shortcut. Workspace route inputs are not forwarded to the report API. Expiration rows reuse the compliance summary's Farmstand table, keyboard row selection, SettingsPanel, FarmstandPanel, existing grid classes and DocumentFacts. Each expiration row has its own selection even when a vendor has several requirements. All report columns remain available in the side panel; CSV exports retain the active filters. Filtering and paging clear the selected row.

Library links use an optional `RecordCard.initialOpen` prop forwarded by DocumentCard. Its default remains closed for existing consumers. Request links reuse the workspace's existing request-dialog controller. No new UI primitive, library or presentation standard is introduced.

Local files changed for this task:

- Alert destinations: `apps/admin/src/market/dashboard-data.ts`, `apps/admin/src/vendor/dashboard-data.ts`.
- Destination filters and record selection: `apps/admin/src/market/VendorsWorkspace.tsx`, `apps/admin/src/market/phase14/ApplicationSubmissions.tsx`, `apps/admin/src/market/phase14/Billing.tsx`, `apps/admin/src/market/phase14/OperationsRoutes.tsx`, `apps/admin/src/vendor/markets.tsx`, `apps/admin/src/vendor/booths.tsx`.
- Document presentation and dialogs: `apps/admin/src/documents/ComplianceReports.tsx`, `apps/admin/src/documents/DocumentsWorkspace.tsx`, `apps/admin/src/documents/DocumentCard.tsx`, `packages/ui/src/record-details.tsx`.
- Regression coverage: `tests/overview-destinations.test.tsx`, `tests/manager-overview.test.tsx`, `tests/vendor-dashboard.test.ts`, `tests/documents.test.tsx`, `tests/compliance-phase3.test.tsx`.
- Documentation: this file and root `COMPONENT_USAGE_GUIDE.md`.

Local validation:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/overview-destinations.test.tsx tests/manager-overview.test.tsx tests/vendor-dashboard.test.ts tests/compliance-phase3.test.tsx
npm run build --workspace @market/admin
```

The admin build, targeted ESLint and Prettier checks pass. Across the relevant suites, 105 tests pass, including invoice, application-review, market-workspace and document-preview regressions. The existing navigation-permission assertion in `tests/documents.test.tsx` fails outside this change. Full repository TypeScript checking also reports existing errors outside the changed production files. Native browser verification could not proceed because the computer-use tool could not verify the current URL.

Refresh the local admin to try the links. If it is not running, start it with `npm run demo:market-operations:admin` against the existing demo environment. No migration, reset or reseed is needed.
