# Phase E market Shop fragment traversal

Private local implementation report, November 18, 2026. **A-02 is fixed in the market Shop operation policy.** The focused regressions passed. The finding and upload contract are documented in [Phase B](SECURITY_AUDIT_PHASE_B.md#a-02-graphql-fragment-traversal) and [Phase C](SECURITY_AUDIT_PHASE_C.md).

## Change

The market policy now walks the selected operation's root selections with an explicit stack. It checks actual field names, including aliased fields and fields reached through inline fragments and named spreads. It records active and completed fragments for that request. A back edge fails closed, as do a missing referenced fragment and duplicate fragment definitions. Once a fragment is complete, later spreads still consume a visit but its selections are skipped. The policy records whether it saw any field and whether any field was disallowed. It builds no repeated field-name list and performs no merge on a cache hit. See `backend/src/plugins/platform-identity/shop-context.middleware.ts:102`, `:119`, and `:126`.

The fixed **64-unit budget** reserves two units per document definition, covering the worst-case selected-operation lookup and fragment indexing passes. It charges one unit before visiting each root selection, including inline fragments and every spread edge, even when the referenced fragment is complete. Stack and fragment bookkeeping are bounded by those visits. The named `PublicMarketApplication` operation uses 3 units. `MarketStorefrontOccurrences` and `MarketStorefrontCatalog` each use 5, including their nested fragment definition. These are representative storefront operations with one policy-level root field. A limit of 64 leaves room for small composed operations while keeping policy traversal bounded. See `backend/src/plugins/platform-identity/shop-context.middleware.ts:11`, `:108`, and `:141`, and `web/packages/api/operations/public-market-operations.graphql:1` and `web/packages/api/operations/shop.graphql:41` and `:81`.

When the budget runs out, the market middleware returns HTTP 403 with the existing `MARKET_OCCURRENCE_REQUIRED` response before calling the next handler. Authorization requires completing the traversal. Selected-operation handling and the existing field allowlists are preserved. The Phase C multipart route continues to use the existing Apollo hook for one direct `uploadApplicationCompliance` mutation. Production HTTP admission, JSON size and batching rules, Admin policy, and vendor Shop policy were outside the change. See `backend/src/plugins/platform-identity/shop-context.middleware.ts:14`, `:86`, and `:141`, and `backend/src/production-http.ts:107` and `:127`.

## Verification

The web checkout was `073475be852c80d5e02cafc3e04db8a0e38b1053` and the backend checkout was `75092f15568780770d1d3ba32cf03e53a01de994`. Existing working-tree changes, including the Phase C admission and registration changes, were preserved. `backend/` and `web/` refer to the two sibling repositories.

From the backend root, with Node 24.19.0:

```powershell
node node_modules/ts-node/dist/bin.js --typeCheck --project tsconfig.json test/production-hardening/market-shop-policy.ts
git diff --check -- src/plugins/platform-identity/shop-context.middleware.ts
```

Both commands exited 0. The first command type-checked and ran the focused test. The test invokes the actual `ShopContextMiddleware.use` entry point with an active storefront lookup fixture and a dispatch sentinel. It invokes the actual Apollo `didResolveOperation` hook for the multipart cases. It used no server, database, accounts, or elapsed-time thresholds. See `backend/test/production-hardening/market-shop-policy.ts:8`.

| Case                                | Observed                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supported storefront operations     | `PublicMarketApplication` and `MarketStorefrontOccurrences` each reached the dispatch sentinel.                                                                                                                                                                                                             |
| Shared fragment and budget boundary | Four definitions cost 8, four spread edges cost 4, and the shared leaf costs 1 once. With 51 extra harmless root selections the graph used exactly 64 units and reached dispatch. Adding one selection returned 403 with zero dispatches. A flat document also passed at 64 and stopped at 65.              |
| Fail-closed and tenant controls     | An aliased disallowed root inside nested named and inline fragments returned 403. Cyclic, missing, and duplicate fragments and ambiguous or unknown operation selection also returned 403. A valid selected operation, configured commerce roots, and the vendor JSON control reached dispatch as expected. |
| Phase C multipart policy            | The single direct applicant upload passed the middleware and Apollo hook. Unrelated, mixed, and extra-operation documents failed the hook with `FORBIDDEN` and HTTP 403. Vendor multipart still failed middleware admission.                                                                                |

The report passed `node node_modules/prettier/bin/prettier.cjs --check docs/SECURITY_AUDIT_PHASE_E.md` from the web root.

## Scope and storefront smoke test

This budget covers the root operation-policy collector. GraphQL parsing, the earlier document-wide field scan, schema validation, and resolver execution retain their separate costs. Deployed reachability of raw Shop GraphQL and the deployed edge policy remain unverified. The focused upload check covers the policy decision. Phase C contains the end-to-end parser, session, scanner, and storage evidence.

With the populated local demo backend and storefront running, open the [published Boerne Market v1 application](http://boerne-farmers-market.localhost:4321/apply/4ce9824a-6053-4a15-bfcc-0258e7e90884) while signed out. Expect the **Boerne Market v1** heading and its published application content. If the services are stopped, run `npm run demo:market-operations:serve` and `npm run demo:market-operations:storefront` from the web root in separate terminals. This read-only check requires no login, seed, or submission. The route is documented in `web/docs/boerne-test-market.md:21`. It was supplied for manual testing and was not run in this phase.
