# Stage E implementation plan

The implementation extends the existing InPersonPaymentCoordinator and ProviderFactsService. Native reader methods have separate identities from Square Terminal, Square POS app switch and Clover REST Pay Display. Vendure remains the only cart, quote, order, inventory and original-unit refund authority.

1. Add durable native sessions, expiring handoffs and immutable native operation bindings. Require the existing authenticated platform actor and vendor, a bearer session and an installation secret held in native secure storage. A handoff is only a locator.
2. Add Square Mobile Payments SDK preparation, one-use launch permission and independent Payments API verification. Never retry an interrupted SDK charge automatically. Keep uncertain holds and recover the original reference. Preserve online-only processing and zero platform fees.
3. Add a separate Clover Go contract. Real operation stays unavailable until developer credentials, a safe distributable authorization model and supported hardware are available. Controlled fixtures are explicitly identified and restricted to randomized local test databases.
4. Add an isolated React Native companion with secure storage, focused checkout, SDK lifecycle and recovery. Reuse renderer-neutral contracts and native adapters for existing design tokens. Preserve the browser dashboard and existing checkout UI components.
5. Qualify controlled native adapters against actual disposable Vendure commerce, run Stage A to D and financial regressions, and document actual native toolchain results separately from fixtures.

No protected database changes, deployment, Git operations, production effects, device purchases, screenshots, videos, snapshots or browser traces are authorized. Stage G stays excluded. All new reports and retained test logs belong in this documentation tree.
