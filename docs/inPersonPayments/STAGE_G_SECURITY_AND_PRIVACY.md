# Stage G security and privacy

Cashier-assisted lookup and verbal agreement are intentionally sufficient. No customer SMS, OTP, email approval, magic link or customer login is introduced into POS checkout.

## Lookup authority

The existing Admin GraphQL operation requires `OperateOwnPos`. The service rechecks the active vendor, current role grant, active owner/staff membership, current channel and original cashier-owned draft. Exact canonical account identities are used, with no fuzzy search or directory endpoint. US formatting is normalized before calling the existing canonical phone service; international numbers retain their explicit country calling code. Contact snapshots are not treated as personal account identity.

The existing durable cashier limit is 20 attempts per minute, including failed matches. An additional indexed vendor audit window limits normal lookup activity to 200 per hour. Account resolution returns at most two candidates and rejects ambiguity. A failed or unknown number leaves ordinary guest checkout and the existing invitation flow available. Invitations still require an email and permission and are sent only after a verified completed purchase.

The POS response exposes the known first and last name, current vendor's points/reward definitions and applicable selected-market collection promises. It exposes no account email, stored payment method, address, customer order history or unrelated vendor wallet. Lookup audit records contain operational IDs, outcome and server time; raw identifiers are not retained there.

## Redemption authority

The browser submits a reward version and explicit cashier verbal-consent action. The customer, vendor and cashier come from the owned draft and active server authority. A cross-vendor version, missing agreement, unsupported field such as an arbitrary discount, invalid cart, expired terms, insufficient points, exceeded usage limit or conflicting coupon fails on the server.

The original command key and draft version prevent replay or stale edits. Quote fingerprints bind customer, cart, price, tax, coupons, physical context and sources. Changing identity clears the selection. Current account validity and cart restrictions are rechecked before payment. Wallet locking serializes point reservations and usage limits across registers.

Consent records are immutable and have foreign keys plus a lineage-validation trigger. Their existing redemption joins supply reward terms, state, actual discount, original order and original payment/capacity attempt. Lookup and consent reads do not confer customer session authority.

## Financial boundaries

Independent provider evidence, native payment/order placement, source inventory, original-unit refunds, merchant isolation, unresolved-payment holds and session-switch protections remain authoritative. In-person provider application fees remain zero. Online Stripe Connect handlers and fee calculations are unchanged. Missing original provider time does not become browser-supplied market attendance.

Only migration files and disposable test/demo databases are used during development. Neither `vendure` nor `vendure_demo_market_ops` is migrated, seeded or queried by these qualification commands. The read-only demo audit verifies its randomized database name and loopback target before connecting.
