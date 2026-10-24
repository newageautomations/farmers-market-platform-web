# Stage B implementation plan

## Boundaries reviewed

Stage A plans, architecture, summary and tests, the roadmap, native commerce and inventory capacity reports, original financial attribution/refund code, centralized customer identity and guest claims, vendor loyalty, market challenges, and the approved UI registry/usage guide inform this work. Existing uncommitted changes in both repositories are retained.

## Implementation sequence

- B1: Add durable POS payment attempts and append-only transitions, nonsecret merchant metadata, strict current vendor/cashier authority and provider-neutral execution contracts.
- B2: Extend the private native placement boundary for an explicit IN_PERSON context. Acquire existing physical capacity before recording payment evidence, preserve unresolved holds, reuse native payment/allocation and immutable financial units, then deliver merchandise through native fulfillment.
- B3: Implement bounded integer cash tender, exact change and immutable cashier attestation. Complete the same native order idempotently.
- B4: Add an explicitly enabled loopback disposable-database simulator with durable outcomes and reconciliation through the same coordinator. No Square/Clover calls or credentials.
- B5: Preserve existing customer association, prepare guest contact through the current account service and deliver purchase-linked invitations after committed sales. Extend existing vendor Orders.
- B6: Wrap RefundCoordinator with authorized cash-return attestation and simulated-provider execution, preserving original units and avoiding automatic restock.
- B7: Compose shared Dialog, Button, Field, Input, SelectField, Card, Badge and existing dashboard/order views. Use existing spacing tokens and modal actions with comfortable touch targets.
- B8: Qualify real PostgreSQL lifecycle, concurrency, authorization, recovery, financial/inventory and loyalty boundaries; unit/DOM browser behavior and geometry at 1280, 768 and 390 pixels; relevant regressions, types, builds and static checks.

## Safeguards and handoff

All migrations/tests/demo writes target newly created guarded disposable databases only. Neither vendure nor vendure_demo_market_ops may be migrated or modified. No screenshots, videos, traces, deployments, commits or remote Git actions. All Stage B reports remain in this directory. Record actual qualification results and limitations in the summary/testing guide and leave a fresh disposable demonstration ready for manual use.
