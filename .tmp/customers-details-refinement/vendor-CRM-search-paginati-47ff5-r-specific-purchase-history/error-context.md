# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vendor.spec.ts >> CRM search, pagination, detail and Vendor specific purchase history
- Location: tests\e2e\vendor.spec.ts:260:1

# Error details

```
Error: page.evaluate: Target crashed 
 Please check out https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/error-handling.md
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Skip to content" [ref=e4] [cursor=pointer]:
    - /url: "#main"
  - complementary "Development preview" [ref=e5]: Development fixture · Simulated identity and permissions
  - generic [ref=e6]:
    - complementary [ref=e7]:
      - generic [ref=e8]:
        - link "Market platform" [ref=e9] [cursor=pointer]:
          - /url: /
        - button "Collapse sidebar" [expanded] [ref=e14] [cursor=pointer]
      - navigation "Workspace navigation" [ref=e17]:
        - link "Overview" [ref=e20] [cursor=pointer]:
          - /url: /
        - link "Notifications" [ref=e24] [cursor=pointer]:
          - /url: /notifications
        - link "Products & Inventory" [ref=e28] [cursor=pointer]:
          - /url: /vendor/products
        - link "Orders" [ref=e32] [cursor=pointer]:
          - /url: /vendor/orders
        - generic [ref=e34]:
          - link "Customers" [ref=e36] [cursor=pointer]:
            - /url: /vendor/customers
          - link "Loyalty" [ref=e39] [cursor=pointer]:
            - /url: /vendor/loyalty
        - link "Markets" [ref=e43] [cursor=pointer]:
          - /url: /vendor/markets
        - link "Settings" [ref=e47] [cursor=pointer]:
          - /url: /vendor/settings
        - link "Integrations" [ref=e51] [cursor=pointer]:
          - /url: /vendor/integrations
        - link "Billing" [ref=e55] [cursor=pointer]:
          - /url: /vendor/billing
        - link "Team" [ref=e59] [cursor=pointer]:
          - /url: /vendor/team
        - link "Contact Submissions" [ref=e63] [cursor=pointer]:
          - /url: /vendor/contact-submissions
        - link "Market Day" [ref=e67] [cursor=pointer]:
          - /url: /vendor/day
        - link "Analytics" [ref=e71] [cursor=pointer]:
          - /url: /vendor/analytics
    - generic [ref=e73]:
      - banner [ref=e74]:
        - generic [ref=e75]: Synthetic Vendor A
        - group [ref=e76]:
          - generic [ref=e78]:
            - generic [ref=e79]:
              - generic [ref=e80]: Preview scope
              - combobox "Preview scope" [ref=e81]:
                - button "Vendor" [ref=e82] [cursor=pointer]
                - option "Market"
                - option "Vendor" [selected]
                - option "Platform"
              - generic [ref=e84]: Vendor preview
              - combobox "Vendor preview" [ref=e85]:
                - button "Vendor A" [ref=e86] [cursor=pointer]
                - option "Vendor A" [selected]
                - option "Vendor B"
              - generic [ref=e88]: Permission preset
              - combobox "Permission preset" [ref=e89]:
                - button "Owner grants" [ref=e90] [cursor=pointer]
                - option "Owner grants" [selected]
                - option "Operations grants (owner membership)"
                - option "Catalog grants (owner membership)"
                - option "Staff membership, read only commands"
              - generic [ref=e92]: Analytics availability
              - combobox "Analytics availability" [ref=e93]:
                - button "Allowed" [ref=e94] [cursor=pointer]
                - option "Allowed" [selected]
                - option "Denied"
                - option "Unknown"
                - option "Unconfigured"
              - generic [ref=e96]: Response preview
              - combobox "Response preview" [ref=e97]:
                - button "Success" [ref=e98] [cursor=pointer]
                - option "Success" [selected]
                - option "Unavailable"
                - option "Conflict"
                - option "Forbidden"
                - option "Validation"
              - generic [ref=e100]: Projection preview
              - combobox "Projection preview" [ref=e101]:
                - button "ACTIVE" [ref=e102] [cursor=pointer]
                - option "ACTIVE" [selected]
                - option "STALE"
                - option "BUILDING"
                - option "RECONCILIATION_REQUIRED"
                - option "FAILED"
                - option "UNBUILT"
            - button "Sign out" [ref=e104] [cursor=pointer]
      - main [ref=e105]:
        - heading "Customers" [level=1] [ref=e107]
        - generic [ref=e108]:
          - link "Customers" [ref=e109] [cursor=pointer]:
            - /url: /vendor/customers
          - heading "Synthetic A Customer 23" [level=2] [ref=e110]
          - paragraph [ref=e111]: synthetic-1-23@example.invalid
          - generic [ref=e112]:
            - generic [ref=e113]:
              - term [ref=e114]: Relationship status
              - definition [ref=e115]:
                - generic [ref=e116]: active
            - generic [ref=e117]:
              - term [ref=e118]: Purpose
              - definition [ref=e119]: PURCHASE_RELATIONSHIP
            - generic [ref=e120]:
              - term [ref=e121]: First activity
              - definition [ref=e122]: Nov 3, 2026, 11:07 PM (UTC)
            - generic [ref=e123]:
              - term [ref=e124]: Last activity
              - definition [ref=e125]: Nov 3, 2026, 11:07 PM (UTC)
            - generic [ref=e126]:
              - term [ref=e127]: Vendor purchases
              - definition [ref=e128]: "1"
          - region "Vendor customer attribution by currency scroll area" [ref=e129]:
            - table "Vendor customer attribution by currency" [ref=e130]:
              - caption [ref=e131]: Vendor customer attribution by currency
              - rowgroup [ref=e132]:
                - row [ref=e133]:
                  - columnheader "Currency" [ref=e134]
                  - columnheader "Original Vendor attributed" [ref=e135]
                  - columnheader "Settled refunded" [ref=e136]
                  - columnheader "Vendor remaining attributed" [ref=e137]
              - rowgroup [ref=e138]:
                - row [ref=e139]:
                  - rowheader "USD" [ref=e140]
                  - cell "$41.00" [ref=e141]
                  - cell "$8.00" [ref=e142]
                  - cell "$33.00" [ref=e143]
          - heading "Vendor purchase history" [level=2] [ref=e144]
          - region "Vendor specific purchase history scroll area" [ref=e145]:
            - table "Vendor specific purchase history" [ref=e146]:
              - caption [ref=e147]: Vendor specific purchase history
              - rowgroup [ref=e148]:
                - row [ref=e149]:
                  - columnheader "Order" [ref=e150]
                  - columnheader "Purchased" [ref=e151]
                  - columnheader "Context" [ref=e152]
                  - columnheader "Operational" [ref=e153]
                  - columnheader "Financial" [ref=e154]
                  - columnheader "Attributed" [ref=e155]
                  - columnheader "Settled refunded" [ref=e156]
                  - columnheader "Remaining attributed" [ref=e157]
              - rowgroup [ref=e158]:
                - row [ref=e159]:
                  - rowheader [ref=e160]:
                    - link "1421" [ref=e161] [cursor=pointer]:
                      - /url: /vendor/orders/1421
                  - cell "Nov 3, 2026, 11:07 PM (UTC)" [ref=e162]
                  - cell "Market · Synthetic A Market 1 · Occurrence 1811 AWAITING_PICKUP Synthetic A pavilion · Synthetic A pickup at north table" [ref=e163]:
                    - text: Market · Synthetic A Market 1 · Occurrence 1811
                    - generic [ref=e164]: AWAITING_PICKUP
                    - generic [ref=e166]: Synthetic A pavilion · Synthetic A pickup at north table
                  - cell "PaymentSettled" [ref=e167]
                  - cell "PARTIALLY_REFUNDED" [ref=e169]
                  - cell "$41.00" [ref=e171]
                  - cell "$8.00" [ref=e172]
                  - cell "$33.00" [ref=e173]
                - row [ref=e174]:
                  - rowheader [ref=e175]:
                    - link "1422" [ref=e176] [cursor=pointer]:
                      - /url: /vendor/orders/1422
                  - cell "Nov 3, 2026, 11:07 PM (UTC)" [ref=e177]
                  - cell "Direct Vendor AWAITING_PICKUP Synthetic A farm gate · Collect at the farm gate" [ref=e178]:
                    - text: Direct Vendor
                    - generic [ref=e179]: AWAITING_PICKUP
                    - generic [ref=e181]: Synthetic A farm gate · Collect at the farm gate
                  - cell "PaymentSettled" [ref=e182]
                  - cell "PARTIALLY_REFUNDED" [ref=e184]
                  - cell "$41.00" [ref=e186]
                  - cell "$8.00" [ref=e187]
                  - cell "$33.00" [ref=e188]
          - navigation "Pagination" [ref=e189]:
            - paragraph [ref=e190]: 22 records. Showing 21 to 22.
            - button "Previous" [ref=e191] [cursor=pointer]
            - button "Next" [disabled] [ref=e192]
```

# Test source

```ts
  200 |   await page.getByText('Manage Synthetic A Variant 1', { exact: true }).click();
  201 |   const fulfill = page.locator('.command-section').filter({
  202 |     has: page.getByRole('heading', { name: 'Fulfill quantity', exact: true }),
  203 |   });
  204 |   await fulfill.getByLabel('Quantity to fulfill').fill('1');
  205 |   await fulfill.getByRole('button', { name: 'Fulfill', exact: true }).click();
  206 |   await expect(table.getByRole('row').nth(1).locator('td')).toHaveText([
  207 |     '5',
  208 |     '1',
  209 |     '3',
  210 |     '1',
  211 |   ]);
  212 |   await navigate(page, 'orders/1402');
  213 |   await ready(page);
  214 |   await expect(page.locator('main')).toContainText('Direct Vendor');
  215 |   await page.getByText('Manage Synthetic A Variant 1', { exact: true }).click();
  216 |   await page.getByLabel('Quantity to cancel').fill('1');
  217 |   await page
  218 |     .getByRole('button', { name: 'Review cancellation', exact: true })
  219 |     .click();
  220 |   await page
  221 |     .getByRole('dialog')
  222 |     .getByRole('button', { name: 'Confirm change' })
  223 |     .click();
  224 |   await expect(table.getByRole('row').nth(1).locator('td')).toHaveText([
  225 |     '5',
  226 |     '0',
  227 |     '1',
  228 |     '4',
  229 |   ]);
  230 | });
  231 | test('customer workspace is responsive and accessible', async ({ page }) => {
  232 |   await vendor(page, '/vendor/customers');
  233 |   for (const width of [390, 768, 1280]) {
  234 |     await page.setViewportSize({ width, height: 900 });
  235 |     await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  236 |       'Customers',
  237 |     );
  238 |     const table = page.getByRole('table', {
  239 |       name: 'Owned customer relationships',
  240 |     });
  241 |     await expect(table).toBeVisible();
  242 |     await expect(page.getByRole('link', { name: 'View All' })).toHaveAttribute(
  243 |       'href',
  244 |       '/vendor/customers/1201',
  245 |     );
  246 |     expect(await table.locator('svg, .farmstand-icon').count()).toBe(0);
  247 |     expect(
  248 |       await page.evaluate(
  249 |         () => document.documentElement.scrollWidth <= innerWidth,
  250 |       ),
  251 |     ).toBe(true);
  252 |     expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  253 |     await page.screenshot({
  254 |       path: test.info().outputPath(`customers-${width}.png`),
  255 |       fullPage: true,
  256 |     });
  257 |   }
  258 | });
  259 | 
  260 | test('CRM search, pagination, detail and Vendor specific purchase history', async ({
  261 |   page,
  262 | }) => {
  263 |   await vendor(page, '/vendor/customers');
  264 |   await expect(
  265 |     page
  266 |       .getByRole('table', { name: 'Owned customer relationships' })
  267 |       .getByRole('row'),
  268 |   ).toHaveCount(21);
  269 |   await page.getByRole('button', { name: 'Next', exact: true }).click();
  270 |   await expect(
  271 |     page
  272 |       .getByRole('table', { name: 'Owned customer relationships' })
  273 |       .getByRole('row'),
  274 |   ).toHaveCount(4);
  275 |   await page.getByRole('button', { name: 'Previous', exact: true }).click();
  276 |   await page
  277 |     .getByLabel('Search customer name or email')
  278 |     .fill('synthetic-1-23@');
  279 |   await expect(
  280 |     page
  281 |       .getByRole('table', { name: 'Owned customer relationships' })
  282 |       .getByRole('row'),
  283 |   ).toHaveCount(2);
  284 |   await page
  285 |     .getByRole('link', { name: 'Synthetic A Customer 23', exact: true })
  286 |     .click();
  287 |   await page.getByRole('link', { name: 'View Purchase History' }).click();
  288 |   await expect(
  289 |     page.getByRole('heading', { name: 'Synthetic A Customer 23', exact: true }),
  290 |   ).toBeVisible();
  291 |   const history = page.getByRole('table', {
  292 |     name: 'Vendor specific purchase history',
  293 |   });
  294 |   await expect(history).toContainText('Market');
  295 |   await expect(history).toContainText('Direct Vendor');
  296 |   await page.getByRole('button', { name: 'Next', exact: true }).click();
  297 |   await expect(history.getByRole('row')).toHaveCount(3);
  298 |   await expect(page.locator('main')).not.toContainText('Phone');
  299 |   await expect(page.locator('main')).not.toContainText('Address');
> 300 |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      |           ^ Error: page.evaluate: Target crashed 
  301 | });
  302 | test('Market participation, pending listing, offering caps and publication commands', async ({
  303 |   page,
  304 | }) => {
  305 |   await vendor(page, '/vendor/markets/1821');
  306 |   await expect(
  307 |     page.getByRole('table', { name: 'Market variant listings' }),
  308 |   ).toContainText('approved');
  309 |   await page
  310 |     .getByRole('button', { name: 'Configure participation', exact: true })
  311 |     .click();
  312 |   const participation = page.locator('.command-section').filter({
  313 |     has: page.getByRole('heading', { name: 'Participation', exact: true }),
  314 |   });
  315 |   await participation
  316 |     .getByLabel('Attendance', { exact: true })
  317 |     .selectOption('planned');
  318 |   await participation
  319 |     .getByLabel('Pickup instructions', { exact: true })
  320 |     .fill('Synthetic A revised pickup');
  321 |   await participation
  322 |     .getByRole('button', { name: 'Save', exact: true })
  323 |     .click();
  324 |   await expect(
  325 |     page.getByRole('table', { name: 'Market occurrences' }),
  326 |   ).toContainText('planned');
  327 |   await page.getByLabel('Owned variant', { exact: true }).selectOption('1102');
  328 |   const listing = page.locator('.command-section').filter({
  329 |     has: page.getByRole('heading', { name: 'Request listing', exact: true }),
  330 |   });
  331 |   await listing.getByRole('button', { name: 'Save', exact: true }).click();
  332 |   await expect(
  333 |     page.getByRole('table', { name: 'Market variant listings' }),
  334 |   ).toContainText('pending');
  335 |   await expect(page.getByRole('button', { name: /Approve/ })).toHaveCount(0);
  336 |   await page.getByLabel('Participation', { exact: true }).selectOption('1831');
  337 |   await page
  338 |     .getByLabel('Approved listing', { exact: true })
  339 |     .selectOption('1841');
  340 |   await page.getByLabel('Occurrence sales cap', { exact: true }).fill('25');
  341 |   const offering = page.locator('.command-section').filter({
  342 |     has: page.getByRole('heading', {
  343 |       name: 'Offering settings',
  344 |       exact: true,
  345 |     }),
  346 |   });
  347 |   await offering.getByRole('button', { name: 'Save', exact: true }).click();
  348 |   await expect(
  349 |     page.getByRole('table', { name: 'Occurrence offerings' }),
  350 |   ).toContainText('25');
  351 |   await page.getByRole('button', { name: 'Publish', exact: true }).click();
  352 |   await expect(
  353 |     page
  354 |       .getByRole('table', { name: 'Market variant listings' })
  355 |       .getByText('published', { exact: true }),
  356 |   ).toBeVisible();
  357 |   await page
  358 |     .getByRole('row')
  359 |     .filter({ has: page.getByText('published', { exact: true }) })
  360 |     .getByRole('button', { name: 'Review unpublish', exact: true })
  361 |     .click();
  362 |   await page
  363 |     .getByRole('dialog')
  364 |     .getByRole('button', { name: 'Confirm change' })
  365 |     .click();
  366 |   await expect(
  367 |     page
  368 |       .getByRole('table', { name: 'Market variant listings' })
  369 |       .getByText('unpublished', { exact: true })
  370 |       .first(),
  371 |   ).toBeVisible();
  372 |   await expect(
  373 |     page.getByRole('table', { name: 'Market variant listings' }),
  374 |   ).toContainText('unpublished');
  375 |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  376 | });
  377 | test('permission presets and owner versus staff boundaries fail closed', async ({
  378 |   page,
  379 | }) => {
  380 |   await vendor(page, '/vendor/products');
  381 |   await page.getByLabel('Permission preset').selectOption('operations');
  382 |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  383 |     'Access restricted',
  384 |   );
  385 |   await expect(
  386 |     page
  387 |       .locator('.admin-sidebar')
  388 |       .getByRole('link', { name: 'Products', exact: true }),
  389 |   ).toHaveCount(0);
  390 |   await navigate(page, 'inventory');
  391 |   await expect(
  392 |     page.getByRole('button', { name: 'Restock', exact: true }).first(),
  393 |   ).toBeVisible();
  394 |   await page.getByLabel('Permission preset').selectOption('catalog');
  395 |   await expect(page.getByRole('heading', { level: 1 })).toHaveText(
  396 |     'Access restricted',
  397 |   );
  398 |   await navigate(page, 'products');
  399 |   await expect(
  400 |     page.getByRole('link', { name: 'Create product', exact: true }),
```