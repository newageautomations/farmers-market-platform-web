# Stage G manual testing

Run commands from Windows PowerShell 5.1 in `E:\coding\farmers-market-platform-web`. The existing local PostgreSQL service must be available. Keep the demo terminal open.

```powershell
Set-Location E:\coding\farmers-market-platform-web
$env:APP_ENV = 'test'
$env:NODE_ENV = 'test'
npm run demo:pos:loyalty
```

This reuses the existing POS demo supervisor, generates a randomized `vendure_test_pos_demo_*` database, applies migrations only there, and launches local storefront/admin servers on ports 4376 and 4594. It seeds actual native commerce, inventory, loyalty and participation. No device or provider credential is required. Square, Clover and native methods are explicitly controlled fixtures.

## Sign in and use a reward

1. Open `http://auth.platform.localhost:4376/account/login`.
2. Sign in as `identity-owner-0@test.invalid`, password `local-identity-regression-only-password`.
3. Open the vendor dashboard and In-Person Checkout. The printed direct register URL includes the correct vendor channel.
4. Select today's Cedar Meadow market occurrence. Its active window is created for the current run; the second occurrence is tomorrow and has not opened.
5. Add Raw Honey, choose the ordinary small variant, and set quantity to 5. The Stage G small fixture unit costs $1 before tax.
6. Select Add Customer, enter `(210) 555-0142`, and select Find customer and rewards. The result is **Casey Demo**, a fictional existing account funded by an actual earlier $10 cash purchase. There are initially 1,000 points and a $2 reward costing 200 points.
7. Select **Apply $2.00 reward, customer agreed** after simulated verbal agreement. The quote has $5 merchandise, a $2 discount, and native tax on $3. With the fixture's 8.25% tax the payable total is $3.25.
8. Review and collect cash with the existing cash-receipt attestation, or use the simulated successful terminal. The final quoted discounted amount is collected. The customer earns 300 merchandise points after handoff. This $3 purchase does not meet the $20 market minimum.
9. Open the customer's loyalty dashboard if desired by signing in separately as `phone@pos.test.invalid` with the same fictional fixture password. No customer login is part of the cashier workflow.

## Minimum-spend and multiple-vendor exercise

Use separate checkouts without applying a reward for these exact amounts. Discounts change qualifying merchandise and must not be ignored.

1. At the first vendor, select today's occurrence, add 25 small Honey units, associate Casey's phone and complete cash checkout. This is $25 merchandise plus tax. Vendor points increase by 2,500. The $20 Visit challenge completes; Discovery has one of two vendors; Spending gains $25.
2. Sign in as `identity-owner-1@test.invalid`, choose Green Acres Farm, today's same market, and buy 25 Vegetable Box fixture units for Casey. Each Stage G unit is $1. Discovery completes with two vendors and Spending reaches $50.
3. Return to the first vendor's Orders, open the original $25 sale/payment and use its original-unit refund action. Refund four units and attest that cash was returned. The remaining merchandise is $21 and the purchase still qualifies.
4. Refund six more original units. The total merchandise return is $10 and the remaining $15 no longer qualifies for the $20 challenge rule. The original vendor's Discovery credit disappears if no other qualifying order exists. An earned completion can become invalid.
5. Fully refund the remaining units. Its remaining points/spending contribution is zero. Other vendors' purchases and another qualifying order at this vendor remain counted.
6. Refresh and repeat the read-only verification command. Point reversals, native refunds and contributions must not duplicate. Delivered stock is not automatically returned by this payment action.
7. Select tomorrow's occurrence for another completed purchase now. Ordinary vendor earning is allowed; market challenge progress does not increase before its scheduled start.

## Controlled payment methods

Cash and the development simulator are immediately available. The demo connects the controlled Square merchant and virtual counter. In Payment Integrations, use Clover's controlled connection action, then add the controlled Flex with serial `CONTROLLED_FLEX_2`, check availability and set it as default. These are the existing Stage D controlled actions and do not contact Clover. No browser action is financial proof; the backend retrieves the controlled provider's record.

The demo also enables Stage E controlled native handoffs. After preparing a Square Mobile or Clover Go companion payment, copy its handoff ID. In another PowerShell terminal:

```powershell
npm run demo:pos:loyalty:control -- SUCCESS HANDOFF_ID --stage-g
```

Replace `HANDOFF_ID` with the actual displayed ID. `DECLINE`, `CANCEL`, `INTERRUPT` and `RECOVER` are also supported by the existing controlled driver. These commands are fixture outcomes, not actual SDK or hardware qualification. Recover the original attempt in the register. Standard Square/Clover Orders refund controls continue using original units.

## Read-only verification and shutdown

```powershell
npm run demo:pos:loyalty:verify
npm run demo:pos:loyalty:stop
```

Verification reads the owning demo manifest and opens only its exact randomized database with a read-only transaction. It prints original sales, native financial snapshots, unit refunds, consent/redemption states, wallet sums, challenge contributions and completion validity, and checks ledger reconciliation. It makes no repairs or provider calls.

Pressing Enter in the demo terminal also stops it. Successful shutdown drops only the database created by that supervisor. Failed qualification databases remain retained by the existing guard for diagnosis. Neither protected populated database is part of this procedure.
