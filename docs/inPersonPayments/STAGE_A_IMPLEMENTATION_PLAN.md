# Stage A implementation plan

## Inspected architecture

The vendor React dashboard routes through VendorRoutes inside AdminShell. Selected AdminContext and channel token establish vendor authority, including multiple businesses. Shared @market/ui exports provide buttons, forms, search, tabs, cards, dialogs, status, empty/loading states and pagination. UI_COMPONENTS.md and COMPONENT_USAGE_GUIDE.md remain authoritative; existing product cards and quantity controls are storefront purchase specialists, not a fast vendor register.

The backend MarketplaceCommercePlugin owns native Vendure commerce, canonical catalog publication, inventory capacity, checkout coordination, promotions, customer accounts and both loyalty engines. TenantAccessPolicy reloads current channel grants and active membership. OwnershipDirectory resolves protected vendor/product/source ownership. CapacityService validates canonical stock and subtracts allocations and live online holds. Existing market membership and confirmed occurrence participation provide attribution authority. Existing POS integrations synchronize external providers; they are not an in-person checkout interface.

Online OrderContextService assumes an identified customer, storefront and preorder/pickup eligibility. Reusing that entire workflow for physical checkout would misrepresent the selling context. Native Vendure Draft orders already support authoritative price/tax recalculation without stock allocation. POS will compose them with a durable vendor/cashier draft record and a narrowly scoped internal edit capability, preserving all ordinary order interceptors outside that boundary.

Central Customer/User identities and AccountPhoneIdentity provide exact normalized identifiers. CustomerAccountService.purchaseLink is the existing paid guest purchase invitation path. Stage A records intent only; it will not create accounts, send invitations or claim completed sales. Reviewed loyalty foundation and market loyalty architecture/summaries: both consume verified paid provenance; POS drafts must emit neither financial snapshots nor loyalty events.

## Planned integration

- Add an explicit OperateOwnPos permission, usable by active vendor owners or staff with that grant. Market managers receive no implicit authority.
- Add migration-managed POS draft, operation receipt, customer audit, favorites and lookup throttle records. Native orders stay Draft and inactive. Operations use row locks, versions and idempotency keys; cashier ownership is checked on every read/write.
- Add bounded admin GraphQL catalog, category, context, draft, customer and quote operations. Official amounts always come from Vendure. Canonical inventory is validated without reservation or decrement. Physical market contexts validate active market, verified approved relationship and confirmed applicable occurrence, independently of online preorder windows.
- Add /vendor/pos and permanent permission-aware navigation. Compose existing primitives into image tiles, variant dialog, serialized quick-add queue, persistent cart, optional identity selector and checkout review. Mobile uses the shared Dialog with a sticky cart summary.
- Build a guarded fresh PostgreSQL fixture from existing commerce/identity harnesses, with three fictional vendors, categories, variants, stock, identities and market participation. Never migrate vendure or vendure_demo_market_ops.
- Add backend integration and frontend/browser DOM tests, including concurrency, tenant denial, exact identity, stock, tax and unpaid boundaries. Take no screenshots.

## Decisions and verification

Quotes are advisory, versioned and short-lived, with no payment provider call or stock hold. Stage B must revalidate under inventory locks before accepting payment. Weighted quantities remain unsupported because native inventory/order quantities use integers. No custom prices or loyalty coupons are allowed. Ordinary compatible vendor coupons may use existing native promotion policies only.

All new Stage A reports live in this directory. Preserve pre-existing uncommitted files in both repositories. No commits, remote Git actions, deployment, external merchant calls or protected database changes are authorized.

## POS interaction references

The design uses immediate unambiguous additions, compact variant choice, favorites and a visible running cart, consistent with [Square item grid documentation](https://squareup.com/help/us/en/article/8334-set-up-item-grid). Real catalog categories provide quick filtering, consistent with [Clover category organization](https://docs.clover.com/dev/docs/managing-categories). These are interaction references, with no copied branding or assets.
