# Stage C hardware qualification

No physical Square Terminal, phone/Square POS app/reader combination, Production merchant authorization or real card transaction was tested. No real merchant payout was verified. Do not describe Stage C as production-ready or physically qualified. No screenshots, recordings or traces are authorized for this task.

## Qualification matrix

| Capability                                               | Implemented                             | Controlled SDK fixture                          | Actual Sandbox                   | Physical                        |
| -------------------------------------------------------- | --------------------------------------- | ----------------------------------------------- | -------------------------------- | ------------------------------- |
| Confidential OAuth, encrypted tokens, refresh/revocation | Yes                                     | Passed                                          | Blocked by configuration         | Unverified                      |
| Merchant/location/vendor isolation                       | Yes                                     | Passed                                          | Blocked by credentials           | Unverified                      |
| Terminal code create/poll/pair/expiry                    | Yes, Production path                    | Passed                                          | Normal pairing unsupported       | Unverified                      |
| Allowlisted Terminal virtual devices                     | Yes, separately labelled                | Passed                                          | Blocked by credentials           | Not physical devices            |
| Actual terminal online/connected status                  | Availability remains unknown            | No online claim                                 | No physical availability claim   | Unverified                      |
| Exact card checkout and native finalization              | Yes                                     | Passed                                          | Blocked by credentials           | Unverified                      |
| Itemized ad-hoc Orders and amount-only fallback          | Yes                                     | Passed, constructed arithmetic                  | Provider arithmetic unverified   | Terminal display unverified     |
| Cancellation, busy/concurrent registers, recovery        | Yes                                     | Passed                                          | Blocked by credentials           | Unverified                      |
| Signed raw-body webhooks and original polling            | Yes                                     | SDK signature/replay tests passed               | External delivery unconfigured   | Network behavior unverified     |
| Full/partial/multiple original-unit refunds              | Yes                                     | Passed, including pending/failure/lost response | Blocked by credentials           | Actual funds/receipt unverified |
| Android/iOS mobile POS URL and return verification       | Yes, explicit pilot gate off by default | Passed                                          | Card handoff unsupported         | Unverified                      |
| Physical pairing, tap/chip, receipt, payout              | Supported architecture only             | Fixtures are not hardware proof                 | Cannot qualify physical behavior | Unverified                      |

The normal Devices API code pairing workflow is unavailable in Sandbox. Current Sandbox support for fake List/Get device results does not make physical pairing supported. The integration deliberately uses the documented Terminal virtual IDs for hardware-free tests. Square POS app card payments and mobile itemization cannot be qualified through Sandbox. A website cannot directly control arbitrary phone-connected readers through Terminal API.

## Prerequisites for an authorized physical pilot

- Separate user authorization for Production account access and any real financial effects. The current task explicitly prohibits Production calls and real charges.
- A real vendor-owned Square merchant, supported country/USD card-processing location, application credentials and required scopes, secure backend keyring, correctly configured HTTPS OAuth/mobile redirects and signed webhooks.
- A compatible Square Terminal with current supported software for Terminal API pairing. A phone-connected Square Reader is a different mobile POS path; model/platform availability must be checked against current Square documentation.
- For mobile: compatible Android/iOS browser, registered Square application, installed Square Point of Sale app, correctly signed-in merchant/location, compatible reader and permission to verify legacy transaction note/correlation plus current Payment evidence.
- Reviewed refund, receipt, reconciliation and operational incident procedures. Keep historical operation/payment IDs and original financial units available.

## Physical Terminal checklist

Every item below is **unverified** until an authorized tester records the actual outcome:

- Authorize the application with the real vendor and confirm the merchant/location belongs to that vendor.
- Create a pairing code, enter it on the physical Terminal, observe real confirmation, test expiry/rejection and confirm the actual device ID/location.
- Confirm device availability behavior, offline/unreachable responses, local removal and re-pair behavior. Local removal alone does not unpair the provider's device.
- Send the exact native total with itemized lines and compare terminal labels/tax/discount/amount and its amount-only fallback.
- Exercise chip/contactless card interaction, declines, customer cancellation and receipt preferences; confirm no tipping, split tender, partial authorization or unexpected surcharge changes the total.
- Verify the successful Payment belongs to the intended merchant/location and payout destination. A local receipt or Sandbox result cannot prove actual payout attribution.
- Confirm one native order, one financial snapshot, one inventory decrement and one guest invitation despite duplicate/out-of-order events and browser reloads.
- Test Terminal busy state and two concurrent registers against the same physical device.
- Interrupt browser/backend/device/network connections before and after checkout creation, after acceptance and during native finalization. Recover the original identity with no second charge and no premature stock release.
- Test timeout, delayed success, cancellation racing with approval, unavailable webhook delivery and manual/scheduled polling.
- Perform separately authorized full, partial and multiple partial refunds; observe pending/completed/failed outcomes and actual refund/receipt behavior without automatic stock increase.

## Phone and reader checklist

Every item is **unverified** on real hardware:

- Android intent and iOS URL routing, browser return, app installation absence/fallback, unsupported browsers and back/refresh behavior.
- Signed-in merchant/location, reader availability, tap/chip, card-only tender, disabled default fees where supported and exact final amount.
- Request state and opaque note survive provider processing, legacy transaction retrieval resolves to the actual Payment, and evidence fields satisfy the implemented strict checks. If they do not, keep the feature disabled and document the unsupported provider/platform case.
- Cancellation, decline, expired/consumed return, forged return, lost browser response and interrupted app switches retain an uncertain original operation rather than inventing success or permitting another launch.
- User reopen/history cannot produce a duplicate physical app payment; the browser scheme itself supplies no general guarantee equivalent to Terminal API idempotency. This risk requires physical operating-policy qualification before enablement.
- Receipt behavior, refunds and actual merchant payout attribution.

No custom native app or Square reader SDK is implemented. No universal phone/reader compatibility is claimed. In-person loyalty remains disabled. If Square's later approval process requests screenshots or video, obtain separate explicit authorization; this development task does not permit creating them.
