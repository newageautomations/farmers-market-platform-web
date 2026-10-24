# Stage D implementation plan

Work locally in the two authorized repositories. Preserve existing Square, cash and simulator behavior, all unrelated changes, and both protected databases. Use fresh guarded PostgreSQL databases and separate Clover demo ports. No screenshots, recordings, traces, deployment or remote Git actions.

1. Research official REST Pay Display, OAuth v2 and the Remote Pay Cloud examples; record the choice of backend HTTPS transport.
2. Add isolated Clover configuration, merchant ownership, session-bound one-time OAuth, encrypted credentials and serialized refresh/recovery.
3. Validate merchant device serials, retain registration history, select defaults and protect unresolved device operations.
4. Extend the existing payment adapter and coordinator vocabulary. Freeze provider context before external effects.
5. Retrieve and verify original payment evidence; retain uncertain outcomes and inventory. Support cancellation requests without assuming cancellation succeeded.
6. Use RefundCoordinator and original financial units for linked, idempotent refunds. Quarantine ambiguous refund recovery.
7. Investigate general REST webhooks, use independent retrieval and retain polling as the required recovery mechanism.
8. Compose Clover settings and POS controls from approved shared components.
9. Extend disposable demo infrastructure with explicitly controlled fixtures and separate opt-in Sandbox qualification.
10. Run relevant local tests, DOM geometry/accessibility checks, type checks and builds. Maintain one testing report and six Stage D documents. Record external blockers precisely.

Actual Sandbox credentials, a registered HTTPS callback and hardware are external prerequisites. Fixture qualification never establishes real provider or physical-device qualification.
