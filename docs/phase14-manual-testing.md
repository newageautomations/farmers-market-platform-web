# Phase 14 local manual testing

This is a real, persistent local database used by the normal React Admin and Astro Storefront. Your browser changes stay saved after you stop the servers. Reset deliberately erases only `vendure_demo_market_ops`. It never targets the protected `vendure` database or disposable acceptance-test databases.

The baseline contains Bulverde Market Day Demo, four upcoming Saturday occurrences, one Market Manager, three canonical Vendors and their owners, and normal native country, zone and tax prerequisites. Applications, directory businesses, rentals, layouts, assignments, invoices, payments and attendance start empty. You perform those actions below.

## Prepare once

Use PowerShell or Windows Terminal. A terminal is the window where you paste commands. Press Enter after each command. Node 24 or newer, npm, and the existing local PostgreSQL server must be available. This computer's PostgreSQL uses `localhost:5432`. No Docker, hosted service or deployment is needed.

1. Open PowerShell and check Node:

   ```powershell
   node --version
   npm --version
   ```

2. Both projects already have dependencies installed on this computer. If you are restoring the projects on another local computer, run `npm ci` once in each folder:

   ```powershell
   Set-Location E:\coding\farmers-market-platform
   npm ci
   Set-Location E:\coding\farmers-market-platform-web
   npm ci
   ```

3. The demo commands use their own safe configuration and never read the backend's ordinary `.env`. Default PostgreSQL credentials are `postgres` / `postgres`. If your local PostgreSQL password or port differs, create the optional demo configuration:

   ```powershell
   Set-Location E:\coding\farmers-market-platform
   Copy-Item .env.demo-market-operations.example .env.demo-market-operations
   notepad .env.demo-market-operations
   ```

   Change only the local connection credentials/port as needed. Keep `DB_NAME=vendure_demo_market_ops`, `DB_SCHEMA=public`, a loopback host, and every provider flag `false`. This file is ignored by Git. Do not paste provider keys into it. The demo refuses unsafe shell overrides too. If a previous terminal has `DB_NAME=vendure` or production/provider variables set, use a fresh terminal or remove those variables before running the demo.

4. Create the baseline, or reset previous manual work:

   ```powershell
   Set-Location E:\coding\farmers-market-platform-web
   npm run demo:market-operations:reset
   ```

   Wait for **Phase 14 manual demo ready**. The command explains its target, runs all normal migrations, seeds prerequisites, prints credentials, occurrence IDs, and URLs, then exits. The database stays on disk. It does not open browsers or start the three servers.

   Reset chooses the next Saturday at 9am to 2pm in America/Chicago, plus three weekly Saturdays. Seed reuses these dates and preserves manual work. For a repeatable calendar anchor, set a future `DEMO_START_DATE=YYYY-MM-DD` in the optional configuration before reset. Reset refreshes dates when this setting is omitted. The Market has no automatic recurrence generation, so no extra occurrences silently appear.

## Start the three servers

Open three separate PowerShell tabs/windows. Keep each window open while testing. All commands below can run from the frontend folder; the backend convenience command invokes the sibling local project explicitly.

**Window 1: backend**

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:serve
```

Wait for **Persistent demo backend ready**. This starts Vendure at `http://localhost:3000` using the approved demo database. Startup runs pending migrations but does not reset or seed workflow data. Use this command every time you return to the demo. The ordinary backend `npm run dev` uses its ordinary configuration and is a different environment.

Equivalent direct backend command:

```powershell
Set-Location E:\coding\farmers-market-platform
npm run demo:market-operations:serve
```

**Window 2: Admin frontend**

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:admin
```

Open [Market applications](http://localhost:4322/market/applications). This is the React Admin used for the walkthrough. The backend's Vendure Dashboard is not the Phase 14 frontend.

**Window 3: public Storefront**

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:storefront
```

Open [the Market storefront](http://localhost:4321). Both frontend demo commands force fixture mode off and use the local backend. They do not alter your usual frontend `.env`. Use `localhost` consistently in the browser; switching to `127.0.0.1` changes cookie and storefront host behavior.

## Log in

At [Admin](http://localhost:4322/market/applications), enter:

| Account                 | Email or username                 | Password                                  |
| ----------------------- | --------------------------------- | ----------------------------------------- |
| Market Manager          | `market.manager@example.test`     | `local-identity-regression-only-password` |
| Texas Wild Seafood Demo | `texas.wild@example.test`         | `local-identity-regression-only-password` |
| Hill Country Honey Demo | `hill.country.honey@example.test` | `local-identity-regression-only-password` |
| Canyon Bakery Demo      | `canyon.bakery@example.test`      | `local-identity-regression-only-password` |

Click **Sign in**. Use the Market Manager for steps 1 through 35. If the Admin asks for a Channel, choose the Market's Channel. Each Vendor owner uses their own Vendor Channel. These are local development credentials, restricted to the demo command and database.

The main routes are:

| Screen                              | Local URL                                  |
| ----------------------------------- | ------------------------------------------ |
| Applications and builder            | http://localhost:4322/market/applications  |
| Market Vendor Directory and rentals | http://localhost:4322/market/directory     |
| Canonical Vendor relationships      | http://localhost:4322/market/vendors       |
| Layouts                             | http://localhost:4322/market/layouts       |
| Occurrence assignments              | http://localhost:4322/market/assignments   |
| Booth billing                       | http://localhost:4322/market/booth-billing |
| Market Day                          | http://localhost:4322/market/day           |
| Vendor booth projection             | http://localhost:4322/vendor/booths        |
| Backend Admin API                   | http://localhost:3000/admin-api            |
| Backend Shop API                    | http://localhost:3000/shop-api             |

Applications display their actual `/apply/<slug>` link after creation. Public maps use `/occurrences/<ID>/map`, with the occurrence ID printed by reset. The first page has no public application until you publish one.

Use the application's direct link for public testing. The current live Market homepage does not display the application callout, even when the advertised flag is selected. The published form itself works at the printed URL.

## Walk through the baseline

Keep a normal browser window signed in as the Manager and a separate incognito/private window for public pages. Use the earliest seeded occurrence as the first date. Note its ID from the reset output. Do not run the start-day helper until the future-date acceptance, linking and copy steps are finished.

All prices and amounts entered in fields labelled **minor units** are integer cents: `1000` is $10.00, `4000` is $40.00. Rental capacity is a limit across the occurrence, while maximum per Vendor is the limit on one applicant's quantity.

1. **Create an application.** On Applications, enter `Saturday Demo Application` in **Application name**, then click **Create application**. Open its draft version if necessary.

   **EXPECTED RESULT:** A new draft and the application builder appear. No submission or invoice exists.

2. **Customize fields.** Add a `Products` section and a long-text custom question such as `What do you sell?`. Change a field label/help text, try a different custom question type and options, and reorder questions. Keep the required business name, first name, last name and email system fields. Leave booth size and electricity system fields visible. Use **Preview application**, **Return to builder**, and **Save draft** before leaving the page.

   **EXPECTED RESULT:** The saved draft retains your customization after refresh. Required identity fields retain their system meaning.

3. **Add rentals.** Open Directory. Under **Rentals and add-ons**, create the following using **Save rental** each time. Keep **Available to applicants** checked, currency `USD`, default quantity `0`, and use maximum per Vendor `2` for the Table and `1` for the other two.

   | Rental name     | Price in minor units | Capacity per occurrence | Required booth amenity |
   | --------------- | -------------------- | ----------------------- | ---------------------- |
   | 6 ft Table      | 1000                 | 10                      | None                   |
   | Canopy          | 1500                 | 3                       | None                   |
   | Electric Hookup | 500                  | 8                       | electricity            |

   **EXPECTED RESULT:** The catalog displays $10, $15 and $5 with finite capacities. No capacity is reserved yet.

4. **Publish the application.** Return to Applications and open the draft. Check the first two future dates under **Dates applicants may request** and check all three rental options. Leave **Private direct-link application** unchecked and **Advertise on Market storefront** checked. Click **Save and publish**.

   **EXPECTED RESULT:** Version 1 is published. Its `/apply/<slug>` link is displayed. Copy that exact path and prefix it with `http://localhost:4321`.

5. **Open the public form.** Paste that URL into an incognito/private browser window.

   **EXPECTED RESULT:** The real application loads without an Admin login, with your custom fields, dates and rentals.

6. **Submit an external business.** Use `Guest Produce Farm Demo`, contact `Casey Farmer`, email `guest.produce@example.test`, a 10 by 10 ft booth, and electricity required. Request both dates and one of each rental. Fill any required custom fields, then click **Submit application**.

   **EXPECTED RESULT:** **Application submitted** appears. There is no charge, payment redirect or new canonical Vendor.

7. **Review the applicant.** In the normal Manager window, refresh Applications and click **Guest Produce Farm Demo**. Try **under review**, **needs info**, or **waitlisted**, reopening the submission if necessary. Enter a private review note.

   **EXPECTED RESULT:** Status and note persist. These review states do not assign a booth or issue an invoice.

8. **Accept one date.** Keep only the earliest requested date checked. Keep the business external and click **Accept selected dates**. Do not use **Accept and assign** yet, because no layout exists.

   **EXPECTED RESULT:** The submission is accepted for just that date. A directory business and occurrence approval exist. The other date is not approved. No booth, invoice or payment is created yet.

9. **Inspect the directory and deliberately link a different business.** In Directory, inspect Guest Produce Farm Demo. Add a separate external business called `Texas Wild Seafood Demo`, contact `Taylor Demo`, email `texas.wild@example.test`; click **Save business** with **External business** selected. Reopen it, select **Texas Wild Seafood Demo** in **Confirm platform Vendor link**, then save again. Before approving this linked business for a date, open **Vendors**, click **Add Vendor**, choose the canonical Texas Wild Seafood Demo, and approve its Market relationship through the normal relationship controls. Return to Directory afterward.

   **EXPECTED RESULT:** Guest Produce stays external. Texas Wild becomes platform linked only after your deliberate selection. Linking does not replace the existing canonical Vendor or automatically assign a booth. An approved native Market relationship is required for later linked-Vendor occurrence approval.

10. **Create a layout.** In Layouts, enter `Main Saturday Layout`, then click **Create layout**.

    **EXPECTED RESULT:** A draft layout editor opens, separate from any occurrence assignment.

11. **Add areas.** Use **New area name** and **Add area** to add `Main Market` and `Food Truck Lot`. Choose **Main Market** in **Area for new elements**. The initial empty Main area can stay unused.

    **EXPECTED RESULT:** Both named areas are available for placing elements.

12. **Draw design elements.** Try **Add rectangle**, circle, triangle, line and text. Move/resize/rotate elements, change their labels, and exercise **Undo**, **Redo**, **Copy**, **Paste** and **Duplicate**. An image element may use a locally hosted asset; keep provider and remote image URLs out of this demo.

    **EXPECTED RESULT:** The canvas changes and saved geometry survives refresh. Shapes do not become booths automatically.

13. **Create A01 without electricity.** Add a booth in Main Market. Select it and set **Label** `A01`, width and depth `10`, default fee `4000`, currency `USD`. Leave electricity unchecked.

    **EXPECTED RESULT:** A01 is a 10 by 10 ft, $40 space without an electric amenity.

14. **Create A02 with electricity.** Add another booth labelled `A02`, 10 by 10 ft, fee `4000`, and check electricity. Add `A03` with electricity as a free destination for the later move test, and `A04` without electricity for Texas Wild. Optional: add a Food Truck Lot booth with vehicle/food-truck amenities. Preferred business suggestions are optional and do not assign booths.

    **EXPECTED RESULT:** A02 and A03 support electric applicants. Each booth has its own label and space details.

15. **Publish the layout and select it for the date.** Click **Save and publish layout**. Open Assignments, select the first occurrence, choose Main Saturday Layout Version 1 in **Published layout version**, then click **Use layout for occurrence**.

    **EXPECTED RESULT:** The first occurrence refers to published Version 1. Its map remains draft and private until explicitly published.

16. **Attempt an incompatible assignment.** In Guest Produce's assignment card, choose A01 in **Booth assignment**, keep the accepted Electric Hookup rental, and click **Save booth and rental changes**.

    **EXPECTED RESULT:** The server rejects the electricity conflict. The applicant remains unassigned and no invoice is created. Occupied booths are also unavailable for a second business. If the UI resets after the error, reopen the card and select the compatible booth next.

17. **Assign the compatible booth.** Choose A02. Set accepted quantities to one Table, one Canopy and one Electric Hookup. Save. Also use **Approve directory business** and **Approve occurrence** for the linked Texas Wild business, then assign it to A04 with zero rentals. This supplies a second invoice and the later Vendor view. Add another external directory business such as Bob's Woodworking Demo and approve it if you want separate no-show/absence records.

    **EXPECTED RESULT:** Guest Produce is assigned to A02 with valid allocations. Texas Wild has its own approved canonical participation and booth assignment. Both assignments create local draft invoices.

18. **Inspect draft billing.** Open Booth billing and select the first occurrence. Inspect Guest Produce's invoice.

    **EXPECTED RESULT:** Its draft contains booth $40, Table $10, Canopy $15 and Electric Hookup $5, total $70 (`7000` cents). No invoice was sent and no provider reference exists.

19. **Edit the draft through its assignment.** Return to Assignments and change Guest Produce's accepted Table quantity to `2`, then save. You can also change the accepted unit price there. The current billing screen does not provide a free-form invoice line editor.

    **EXPECTED RESULT:** The same draft recalculates from booth and accepted rentals. With two Tables at $10 each, total becomes $80 (`8000` cents). Finite capacity and amenity rules still apply. A rental quantity change that exceeds remaining occurrence capacity is rejected.

20. **Issue a manual invoice.** In Booth billing, optionally enter a due date for Guest Produce, then click **Issue manual invoice**.

    **EXPECTED RESULT:** The draft becomes open. This is local issuance, with no external email or online invoice delivery.

21. **Check online sending.** Inspect **Online invoicing not configured** and **Send online invoice**.

    **EXPECTED RESULT:** Online sending stays disabled. Real Stripe Connect and Billing remain NOT_EXECUTED; CHECKOUT-B1 stays OPEN and FundsFlowPolicy stays NOT_CONFIGURED.

22. **Record cash/check payment.** For Guest Produce's open invoice, choose cash or check, enter `8000` if using the amounts above, leave a payment date/time at or before now, add a note, and click **Record manual payment**. You can instead record a smaller partial payment and inspect the remaining balance before settling it.

    **EXPECTED RESULT:** Full settlement makes the invoice paid; a partial payment leaves the balance open. Offline payment is recorded once, without contacting a provider.

23. **Publish the occurrence map.** Return to Assignments for the first date and click **Publish map**. Note the occurrence ID in the URL or reset output.

    **EXPECTED RESULT:** The plan is published. The reusable layout itself and the occurrence's published map remain separate records.

24. **View the map logged out.** In incognito, open `http://localhost:4321/occurrences/<ID>/map`, replacing `<ID>` with the actual first occurrence ID. Search for Guest Produce or A02 and select a booth.

    **EXPECTED RESULT:** Booth geometry, labels and public business details are visible without login.

25. **Check privacy.** Inspect the public map and its Network response in browser developer tools if comfortable doing so.

    **EXPECTED RESULT:** It does not expose contact email/phone, manager notes, linked Vendor IDs, invoice amounts, payments, rentals, check-in or attendance, and offers no operational controls.

26. **Create layout Version 2.** In Layouts, open Version 1 and click **Create new draft version**. Open the new draft, change the design or add a booth, then save and publish it. Keep A01 through A04 and their compatibility if you want the copy exercise to succeed easily.

    **EXPECTED RESULT:** Version 2 exists without mutating published Version 1.

27. **Check the first occurrence.** Reopen the first occurrence's Assignments and public map.

    **EXPECTED RESULT:** It still uses Version 1 and its published snapshot. Publishing a newer reusable layout does not change previous plans.

28. **Copy previous assignments.** On the second occurrence, choose Version 2 and **Use layout for occurrence**, leaving the new plan draft. Approve Guest Produce and Texas Wild for this second date using **Approve directory business**. Select the first date in **Previous occurrence**, then click **Prepare copy suggestions**. Review proposed booths and conflicts, then click **Confirm Guest Produce Farm Demo** and **Confirm Texas Wild Seafood Demo** separately. If the UI identifies new/unapproved businesses or a compatibility conflict, approve/fix them deliberately and prepare suggestions again.

    **EXPECTED RESULT:** Only compatible, approved proposals apply, with fresh occurrence-specific assignments and draft billing. Previously unaccepted application dates do not silently become approved just because you preview copying. Prior invoices/payments are not copied.

29. **Open Market Day.** Open `/market/day/<first-ID>` or use the occurrence selector on Market Day. Use the first occurrence for steps 30 through 35.

    **EXPECTED RESULT:** Expected/assigned/unassigned counts, the map, attendance, notes, rentals and billing are available in one operational workspace. Future demo dates can be inspected and checked in, but closeout is rejected until the start time passes.

30. **Check in businesses.** Click **Check in** for Guest Produce. Try **Undo check-in**, then check it in again.

    **EXPECTED RESULT:** Check-in state persists after refresh and is independent of final attendance.

31. **Record attendance.** Use **Final attendance** to mark Guest Produce attended, Texas Wild no show, and an additional approved external business approved absence if created. You can change one record through all three states to exercise the controls.

    **EXPECTED RESULT:** ATTENDED, NO_SHOW and APPROVED_ABSENCE are distinct records and update the day summary.

32. **Add a note.** Enter a note under **Private occurrence notes**, then click **Save manager note** and refresh.

    **EXPECTED RESULT:** The private note persists for the occurrence and is absent from the public map.

33. **Move a booth.** Choose Guest Produce's free compatible A03 in the card, or select A03 on the map and choose Guest Produce. Since its invoice is issued/paid, check **Keep the issued invoice unchanged after this move or rental change** before saving.

    **EXPECTED RESULT:** The compatible move succeeds without rewriting the paid invoice. An incompatible move or a move without the required billing choice is rejected. Public maps are snapshots: unpublish and publish again if you want a saved map to reflect the move.

34. **Record a Market Day payment.** Expand Texas Wild's draft invoice on its card. Click **Issue manual invoice**, then record cash/check payment for its displayed outstanding amount, normally `4000`. Leave Guest Produce's already-paid invoice alone.

    **EXPECTED RESULT:** Texas Wild's invoice becomes paid and the Market Day billing summary updates.

35. **Perform operational closeout.** First try **Mark day operations complete** while the occurrence is future.

    **EXPECTED RESULT:** The server rejects closeout because the occurrence has not started. To make this demo occurrence suitable without changing production logic, stop the backend in Window 1 with Ctrl+C, then run:

    ```powershell
    Set-Location E:\coding\farmers-market-platform-web
    npm.cmd run demo:market-operations:start-day -- <first-ID>
    npm run demo:market-operations:serve
    ```

    Replace `<first-ID>` with the actual numeric ID, for example `1` if that is what reset printed. Do not paste angle brackets. The helper requires an existing plan, accepts only the four seeded demo occurrences, and refuses the protected/remote database just like reset. It moves the selected occurrence's start to one hour ago and end to four hours from now, keeping the original demo schedule identity, assignments, billing and layout. It writes a demo audit record. It does not check anyone in or mark closeout complete. Finish all future-date linking and copying before this helper because approvals require future occurrences.

    Refresh Market Day, review warnings, and click **Mark day operations complete** again.

    **EXPECTED RESULT:** Operations are marked complete. This is operational closeout, with no Vendor daily-sales, percentage-of-sales fee, SNAP/WIC or payment-provider reconciliation.

36. **Log in as the linked Vendor.** Sign out of the Manager session, or use a different browser profile, and sign in at `http://localhost:4322/vendor/booths` with Texas Wild's credentials above.

    **EXPECTED RESULT:** The Vendor session uses its own Channel and active owner membership. If there are no booths, check that you deliberately linked Texas Wild, approved its Market relationship, then approved and assigned it for a date.

37. **Inspect the Vendor projection.** View **Your booth assignments**, including Texas Wild's booth and occurrence information. Compare with the Manager view.

    **EXPECTED RESULT:** Texas Wild sees only its own safe assignment projection. Other businesses' private contact/notes/payments and Manager operational controls are absent.

After this walkthrough you can test additional custom field types, private direct-link forms, application clone/version and retire controls, draft layouts, duplicate/multiple booth constraints, rental capacity limits, partial payments, complimentary/waived settlements and copy conflicts. Retire a separate cloned application after the main walkthrough so you can observe that public submission becomes unavailable without disrupting the form used above.

## Stop, return later, or reset

Press **Ctrl+C** in each of the three server windows and wait for the command prompt. This stops the applications, leaving PostgreSQL and its demo database persistent. You do not need to stop the shared PostgreSQL service.

To return later, repeat the three start commands. Your manual work stays saved. The non-destructive seed command fills missing prerequisites and does not reset workflows, passwords or dates:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:seed
```

To start over, stop the backend first, then:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:reset
```

Reset refuses to run while demo database clients are connected. Restart the three servers, refresh the browser, and sign in again because reset replaces native users and sessions.

For the optional populated showcase, stop the backend, then:

```powershell
npm.cmd run demo:market-operations:reset -- --showcase
```

This is separate from the empty baseline: a published custom application, accepted/waitlisted/needs-info submissions, external and linked businesses, rentals, a multi-area layout, booth amenities and preferences, assignments, draft/open/paid/complimentary invoices, allocations, a public map, mixed attendance and notes. The four seeded dates remain future until you deliberately use start-day. To add showcase to a completely untouched baseline, or safely repeat a completed showcase seed:

```powershell
npm run demo:market-operations:showcase
```

Showcase is committed atomically and repeating it preserves existing records. If you have begun manual workflows in a baseline, it refuses to overlay them; use the explicit showcase reset to discard them. Return to an empty baseline with ordinary reset.

## Checks and troubleshooting

Commands that forward extra arguments use `npm.cmd` below because the installed PowerShell `npm.ps1` wrapper can consume the `--` separator. The ordinary commands without extra arguments use `npm`.

These checks concern the demo tooling and real logins; they do not run or replace the historical acceptance suites:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:test
npm run demo:market-operations:verify
```

Immediately after an empty reset, optionally require the exact baseline counts:

```powershell
npm.cmd run demo:market-operations:verify -- --baseline
```

Verify starts a temporary loopback API, logs in all four test accounts, checks the Phase 14 reads and permissions, and prints persistent record counts. Workflow data is read only; native login sessions may be created. Every demo backend process blocks external TCP/UDP connections, uses no configured providers, and has no background workers or occurrence scheduler.

- **Cannot connect to PostgreSQL:** Start the existing local PostgreSQL service and check the optional demo connection settings. Demo tooling does not install or manage your shared database service.
- **Port 3000/4321/4322 is occupied:** Stop the earlier server with Ctrl+C before starting another. These demo URLs have fixed ports so that cookies and public links agree. Do not kill unrelated processes blindly.
- **Astro says a session already exists:** Stop the old Storefront first. If it was detached, from the frontend folder run `npm.cmd exec --workspace @market/storefront -- astro dev stop`, then start Storefront again.
- **Storefront is unavailable:** Confirm the demo backend is running and visit `http://localhost:4321`, since only that host is seeded for this Market.
- **Login fails after reset:** Refresh, sign out if needed, and sign in again with the printed demo credentials. Confirm the backend window says persistent demo, rather than ordinary dev.
- **No public application or map:** Baseline intentionally starts empty. Publish the application, or select a published layout for a date and publish its occurrence map.
- **Linked business approval is rejected:** In the normal Vendors page approve the canonical Vendor's Market relationship first. Directory linking alone does not approve that relationship.
- **Seed does not undo your changes:** That is intentional. Reset is the command that restores the empty baseline.

There is no Stripe configuration or deployment step in this guide. Online invoice sending remains unavailable; manual issuance and offline recording are the supported demo payment paths.
