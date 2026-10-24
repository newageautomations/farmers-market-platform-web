# Expense treatment

The expense date is the business owner's spending date. Editing a date, amount, market, event, category, or treatment changes reports for the affected dates and scopes. The audit history retains the prior values. Voiding excludes the expense from totals while preserving its history and receipts.

| Treatment                    | Spending report                                                             | Estimated profit         |
| ---------------------------- | --------------------------------------------------------------------------- | ------------------------ |
| Deduct from estimated profit | Includes the purchase                                                       | Deducts it once          |
| Already in production costs  | Includes the purchase                                                       | Does not deduct it again |
| Already in recorded fees     | Keeps the statement in the log; excludes the duplicate from spending totals | Does not deduct it again |

For a baker with a $3 per-loaf production cost that already includes ingredients, a $90 ingredient purchase should use Already in production costs. Sold loaves retain their recorded production costs; the $90 purchase appears under spending without being deducted a second time. Packaging can use the same treatment when bottle/box costs are already included per unit.

If a processor fee has already been assigned to the vendor by a native fee observation, a separately recorded copy of the statement should use Already in recorded fees. An unassigned or unknown provider fee is not already deducted: a real recorded fee expense should use Deduct from estimated profit. The owner chooses the classification; the application does not infer inventory consumption or silently match statements.

A booth fee paid by a vendor belongs in that vendor's market expenses. The manager's corresponding recorded booth payment is separate market revenue. These are different business scopes, not duplicate expenses within one report.

General vendor overhead belongs only to All sales. Selecting Boerne excludes general overhead and other markets' expenses. Selecting Independent sales includes only truly independent activity and explicitly independent expenses. A manager's selected business is their market; expenses can be assigned to an event or retained as market-wide operating expenses. Market-wide overhead is not spread across every event.

Only current authorized owners and market managers can write expenses in their selected business scope. Receipt files are never public or automatically shared with a market. Existing scan/type/size policies apply, and failed uploads cannot be downloaded. A void is the supported safe removal policy; there is no destructive expense-delete command.

This is a lightweight estimate and spending system. It does not manage raw-material inventory, capital asset amortization, tax deductions, purchase order matching, or bank statements.
