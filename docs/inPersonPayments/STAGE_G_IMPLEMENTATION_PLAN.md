# Stage G implementation plan

Stage F is explicitly deferred until physical devices are available. It is not a prerequisite for this integration. Development and qualification use local files and randomized disposable PostgreSQL databases only.

## Investigation and decisions

The vendor engine is `LoyaltyService`. It awards one point per original merchandise cent after discounts, excludes tax, shipping and fees, reserves spending under the wallet mutex, freezes reward versions, and reverses original paid units. There is no configurable vendor earning minimum, category earning rule or earning rate to invent. Fixed, capped percentage and free-product rewards already use native Vendure promotions.

The market engine is `MarketLoyaltyService`. Its existing Discovery, Visits and Spending challenges use immutable published terms, occurrence windows, original-unit contributions, completion validity, claims and append-only events. Discovery and Visits group the remaining units of each original order before applying the purchase minimum. Spending uses remaining eligible merchandise value. Market rewards are manager-written fulfillment promises, without a monetary discount, vendor redemption rule or reimbursement contract.

POS already resolves canonical account phones, authorizes cashier-owned drafts, selects real market participations, generates native quotes, verifies providers independently, completes delivery and coordinates original-unit refunds. Three explicit in-person exclusions in financial attribution, operational fulfillment and refund settlement prevented the shared loyalty hooks from running.

## Implementation sequence

1. Reuse exact identity resolution, add US input normalization, retain invitations, rate-limit and minimally audit lookups.
2. Extend existing reward selection with cashier authority derived from the owned draft. Preserve native pricing and wallet reservation. Add immutable verbal-consent provenance.
3. Admit associated independently verified POS purchases and delivered units to the existing loyalty hooks. Anonymous sales remain unattributed.
4. Adapt market qualification to the selected POS occurrence and verified original payment time. Freeze the validated context with financial evidence.
5. Admit settled POS refunds to the existing original-unit reversal and completion reconciliation paths.
6. Extend the register using existing shared presentation and serialized commands. Add disposable fixtures, read-only audit, controlled provider tests and DOM-only browser qualification.
7. Run the existing regression suites, builds, type checks and supported lint checks. Record actual results in the testing and summary documents.

No protected database migration, hosted resource, Git mutation, production credential or physical device is part of this plan.
