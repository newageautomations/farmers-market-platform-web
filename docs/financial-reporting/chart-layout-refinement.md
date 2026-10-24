# Finance chart layout refinement

Changed only the frontend chart composition and layout:

- Donut hover cards occupy a reserved row below the circle and never overlay the plot. The same space is reserved across analytics cards.
- Product-sales and expense dropdowns render below the donut and above the legend, including when the current metric has no matching activity.
- Expenses by category uses the existing clickable RecordCard contract and details dialog. The visible Category details button is removed. The dropdown remains independently usable; the native card trigger preserves keyboard access.
- Gross sales use upward bars. Expenses use downward bars and negative labels/tooltips. Net profit remains a line with focusable points, drawn above the bars. Only expense presentation is inverted; financial calculations, summary totals, exports and stored records are unchanged.

Local files: `apps/admin/src/finance/charts.tsx`, `Finances.tsx`, `finance.css`, and the root component usage/registry notes.

Browser tests, backend tests, screenshots and other test suites were not run for this refinement, per the developer's request. Only source formatting, targeted lint and TypeScript checks were used. Manual verification is left to the developer: hover each donut, switch its selector, open the expense card by pointer/keyboard, and toggle all three main-chart series.
