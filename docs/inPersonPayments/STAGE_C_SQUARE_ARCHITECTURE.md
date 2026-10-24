# Stage C Square architecture

## Authority and effects

Vendure remains the cart, tax, discount, stock, order and original-unit financial authority. Square owns card acceptance and external evidence. The Stage B private scope, InPersonPaymentAdapter and InPersonPaymentCoordinator remain the only native sale completion route. Square writes no native inventory or order state directly. ProviderOperation and ProviderResultFact retain their existing independent intent/evidence commit boundary.

Separate connection, token envelope, OAuth state, devices, processor operations and webhook receipt tables retain merchant/environment and operation identities. Payment preparation freezes the selected connection generation, merchant, location and device before effects. Stable UUID-derived SDK idempotency keys recover lost responses. A durable unresolved device lease prevents competing registers. Square payment IDs survive checkout retention expiry.

## Merchant security

Current ManageOwnPosIntegrations permission and owner membership authorize connection management. OperateOwnPos authorizes checkout only. RequestOwnVendorRefund and owner membership authorize returns. Every server operation reloads current grants/membership. OAuth state is random, hashed at rest, short-lived, session/user/channel/vendor bound and consumed before code exchange. The authenticated dashboard callback submits the code to the backend, never exchanges it in JavaScript. No tokens leave the backend.

Token envelopes use Node/OpenSSL AES-256-GCM with random 96-bit nonces, authentication tags and vendor/environment/connection associated data. Keys and version IDs come from backend environment configuration, separate from database ciphertext. Missing keys fail closed. Rotation retains old decrypt keys while refreshed envelopes use the active key. Credentials are inaccessible through GraphQL and excluded from audit/log payloads. One Square merchant per environment belongs to only one vendor context. Refresh rechecks merchant identity; revocation disables new effects and retains historical references.

## Provider verification

Use official square SDK, pinned to 46.0.0 with Square-Version 2026-09-16. Current SDK uses SquareClient, client.terminal.checkouts, client.devices.codes, client.oAuth, client.payments, client.orders and client.refunds. Node >=18 is supported; backend uses Node 24 and TypeScript nodenext/ES2020. SDK license is MIT. SDK logging stays silent; provider exceptions are translated to fixed messages. Bounded SDK requests use explicit environments, 15-second timeouts and stable keys, with automatic SDK retries disabled. Unauthenticated OAuth calls explicitly disable ambient SQUARE_TOKEN adoption. No legacy SDK client interface is used by this integration, although the official package includes square-legacy as a dependency.

Terminal success requires one completed card payment matching exact total/currency, merchant-authorized location, terminal checkout, reference and application. Tips, split payments and mismatches cannot complete a sale. Signed webhooks trigger server retrieval and original coordinator recovery. Original raw UTF-8 bytes, exact configured URL, per-environment signature key and official WebhooksHelper.verifySignature are mandatory. Duplicate/out-of-order receipts cannot create native effects. Polling uses the same retrieval path when webhooks are unavailable.

Square Refunds API uses the original captured payment and original-unit amount. Pending refunds remain pending; only retrieved COMPLETED evidence settles existing financial allocations. No restock is introduced. Disconnect is blocked while payment/refund outcomes are unresolved.

## Provider limitations and sources

Production pairing uses the Devices API and Square Terminal, not phone-connected readers. Sandbox has virtual IDs and no normal pairing. Terminal records are deleted after 30 days, so retain payment IDs. Orders use ad-hoc lines without catalog references and exact total checking before checkout; no order mutation during processing. Mobile POS is an app switch, has no Sandbox card support or itemized handoff, and returns legacy transaction references. Unsupported verifiable correlation must remain fail closed pending physical/provider qualification.

Official sources reviewed before implementation:

- [Official TypeScript SDK](https://github.com/square/square-nodejs-sdk)
- [Current API/SDK release](https://developer.squareup.com/docs/changelog/connect-logs/2026-09-16)
- [Terminal overview](https://developer.squareup.com/docs/terminal-api/overview), [pairing](https://developer.squareup.com/docs/terminal-api/quickstart), [Sandbox values](https://developer.squareup.com/docs/devtools/sandbox/testing)
- [OAuth](https://developer.squareup.com/docs/oauth-api/overview), [permissions](https://developer.squareup.com/docs/oauth-api/square-permissions)
- [Token status for OAuth/personal tokens](https://developer.squareup.com/reference/square/o-auth-api/RetrieveTokenStatus), [Sandbox/Production token troubleshooting](https://developer.squareup.com/docs/build-basics/general-considerations/handling-errors)
- [Webhook verification](https://developer.squareup.com/docs/webhooks/step3validate)
- [Terminal orders](https://developer.squareup.com/docs/terminal-api/take-payments-for-orders)
- [Refunds API](https://developer.squareup.com/reference/square/refunds)
- [Mobile web](https://developer.squareup.com/docs/pos-api/build-mobile-web), [technical reference](https://developer.squareup.com/docs/pos-api/web-technical-reference)

Requested scopes are MERCHANT_PROFILE_READ, PAYMENTS_READ, PAYMENTS_WRITE, ORDERS_READ, ORDERS_WRITE and DEVICE_CREDENTIAL_MANAGEMENT. No catalog, customer directory or inventory scopes are requested. Exact endpoint requirements and implemented qualification are recorded in the testing/setup reports.

## Recovery and operating policy

The immutable Square operation freezes application ID and actual terminal ID as well as merchant, environment, location and native attempt. The partial unique unresolved-device index and locked preparation serialize competing registers. Local device removal is blocked while that device is unresolved. Removed registrations retain history; a new pairing/virtual registration can replace a removed device. Removal does not sign a physical terminal out of Square or prove it is online. Availability is explicitly reported as not independently verified.

Every completed Terminal checkout is independently retrieved, followed by its single completed CARD Payment. Both identities, application, reference, location, total, currency and checkout association must match. Zero tips/application fees and no partial authorization are required. An amount mismatch retains capacity for reviewed reconciliation. Signed webhooks match only stored resources and recheck receipt hashes after concurrent insertion. They trigger the existing stored-actor recovery path, which reloads live authorization. Unknown operations rotate through the existing bounded sweep; no webhook identity becomes a vendor principal.

Mobile handoff is separately gated to an explicitly enabled Production pilot. Android intent v2.0 and iOS scheme v1.3 send the exact amount, card tender, opaque operation note and random one-use state. A return only supplies a transaction lookup candidate. Server retrieval requires one matching legacy transaction tender, the opaque operation note, location, time and amount, then a completed card-present Payment. Unsupported or missing correlation, app absence, cancellation without independently provable absence of funds, replay or expiration leaves the original payment uncertain. Never relaunch it to resolve uncertainty. This path has fixture coverage only and is disabled by default.

OAuth disconnect first prevents new preparation, verifies no unresolved obligations, revokes the OAuth authorization and deletes local ciphertext. A server-imported personal Sandbox token is different: disconnect removes its local ciphertext without attempting to revoke an OAuth grant it does not have. Revoke/rotate that personal token yourself in Square Developer Console. Merchant substitution requires an explicit data-preserving ownership migration; reconnect supports the same merchant only. Failed refunds retain their original reservations and evidence for reviewed resolution, rather than automatically creating replacement refund requests.

The dependency audit found 33 backend production dependency findings (3 critical, 24 high, 6 moderate), outside the resolved Square dependency closure. The 66 resolved SDK dependency nodes, including its legacy alias, had no matching advisory nodes in this audit. This is a point-in-time advisory review, not a security certification. No broad dependency upgrade or npm audit fix was performed. See STAGE_C_DEPENDENCY_AUDIT.json and STAGE_C_SDK_DEPENDENCY_REVIEW.json in this directory.
