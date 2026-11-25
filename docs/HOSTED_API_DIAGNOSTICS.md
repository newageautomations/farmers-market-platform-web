# Hosted API diagnostics and vendor catalog

## What the local reproduction established

The disposable Phase C API fixture reproduced the reported response for `VendorCatalog`. Vendure threw `USER_INPUT_ERROR` with the message `UNSUPPORTED_PUBLICATION_CONFIGURATION` because the vendor channel had no default tax zone. The production GraphQL sanitizer replaced that message and code with `Request could not be completed` and `INTERNAL_SERVER_ERROR`. Nest’s Apollo adapter restored HTTP 200 for the executed GraphQL response. The body had `data: null` and a server-generated request ID, matching the reported staging response shape.

Vendure’s exception filter sent the production logger a formatted warning. The logger intentionally discarded the text because framework warnings can contain exception details, request data or secrets. The existing `application_warning` event therefore carried little beyond the request ID.

`VendorCatalog` and `VendorProduct` share the publication configuration check. It requires tax-exclusive pricing, a single matching currency and a configured default tax zone. `VendorInventory` independently reads scoped stock and succeeded with an empty result for the same unconfigured vendor. A missing default tax zone can explain the catalog response. The actual staging request, the live channel configuration and the failures on other pages still need confirmation. [Previous storage and catalog investigation](HOSTED_STORAGE_CORRECTIONS.md)

## Diagnostic changes

The API now writes a private `graphql_error` event before response formatting and an `application_exception` event for exceptions reported by Vendure from HTTP handlers. Use either event with the existing `http_request` entry and `X-Request-Id`. The browser error policy and existing publication and tenant checks are preserved.

The events carry a stable code, failure category and known exception classification. GraphQL events can include a reviewed operation name and the failing schema field. Known failures add a module or fixed reason. The catalog configuration event identifies missing or mismatched zones, unsupported currencies or tax-inclusive pricing. Database, provider, authorization, input and programming failures use separate codes and categories. The logger excludes aliases, arbitrary operation names, unknown extension codes, raw exception text, stacks and request data. The Vendure logger continues to discard its free-form input.

Example private API event for a disposable fixture request.

```json
{
  "timestamp": "2026-11-25T19:00:00.000Z",
  "level": "warn",
  "event": "graphql_error",
  "requestId": "e20b94e7-d9bc-448d-afab-6b28e7a9ead4",
  "route": "/admin-api",
  "operation": "VendorCatalog",
  "field": "ownVendorCatalog",
  "category": "business_configuration",
  "code": "UNSUPPORTED_PUBLICATION_CONFIGURATION",
  "exception": "UserInputError",
  "reason": "MISSING_DEFAULT_TAX_ZONE",
  "module": "CatalogCommandService"
}
```

## Commerce configuration and conditional channel repair

The fixture reproduced a missing foundational default. Vendor provisioning copied the platform default channel’s configuration. After the fixture’s platform default received a synthetic zone, a newly provisioned vendor inherited it. An existing vendor still needed its own zone assignment. Assigning the fixture zone to that vendor restored catalog reads. This verifies the repair mechanism in the fixture. The release adds diagnostics and keeps the current provisioning and tax rules.

If the new staging log confirms `MISSING_DEFAULT_TAX_ZONE`, have an authorized platform operator perform this read-only inspection before approving any write.

1. Verify the environment is staging. Identify the affected vendor’s **primary** channel ID from its workspace, and verify the platform channel ID by the channel code `__default_channel__`. Inspect only the selected channels through the existing authenticated Admin API. Include a target market channel only if the failing operation is a publication operation. Read the zone membership and applicable tax configuration from the authorized commerce settings.

   ```graphql
   query InspectCatalogChannels($platformId: ID!, $vendorId: ID!) {
     platform: channel(id: $platformId) {
       ...ChannelTaxConfiguration
     }
     vendor: channel(id: $vendorId) {
       ...ChannelTaxConfiguration
     }
   }
   fragment ChannelTaxConfiguration on Channel {
     id
     code
     updatedAt
     defaultCurrencyCode
     availableCurrencyCodes
     pricesIncludeTax
     defaultTaxZone {
       id
       name
     }
   }
   ```

2. Confirm the intended tax zone with the commerce owner, including its regions and applicable rates. If the platform default is empty, obtain explicit approval for the intended foundational configuration before updating it. If there is no approved zone, or the channel’s currency, tax mode or existing zone conflicts with the intended configuration, stop and resolve that policy first.
3. During the staging maintenance window, re-read each individually approved channel immediately before applying a change. Skip a channel already set to the approved zone. Stop if its identity or reviewed configuration changed or if another zone is present. For a confirmed missing value, use the authorized Vendure `updateChannel` mutation with only `input.id` and `input.defaultTaxZoneId`. Check the returned `Channel` and re-run the inspection. Apply the same checks individually to any existing affected vendor channels. This makes a repeat inspection a no-op for repaired channels. Preserve shipping defaults, currency, tax inclusion and rates.
4. Retry the original GraphQL operation under the affected vendor’s normal session. If it still fails, use the new request ID to identify the next failure before making further changes.

There is no schema migration. Additional data changes depend on the staging inspection. No live data was accessed or changed during this work.

## Verification and release

The focused checks use loopback disposable PostgreSQL and mocked R2. The persistent demo database was left untouched. The backend server build is the build used by the hosted API image.

| Check                                                                                                                                        | Result                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build:server`                                                                                                                       | Passed.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `npm run test:test-data`                                                                                                                     | Passed. Verified request ID correlation, exact HTTP 200 and masked error reproduction, private classification, input and log injection redaction, default-zone inheritance, existing-channel repair, populated catalog, product and inventory, and foreign-channel and anonymous denial. The guard dropped the successful database and retained one earlier run that lacked a correctly initialized fixture operator context. |
| `test/production-hardening/policy.ts` and `test/production-hardening/hosted.ts` via `ts-node --project test/market-operations/tsconfig.json` | Passed. Covered application exception redaction and correlation, startup policy, hosted routing, ingress authorization and staging admission.                                                                                                                                                                                                                                                                                 |
| `npm run test:storefront:enable -- --hosted`                                                                                                 | Passed. Existing public storefront error sentinels and anonymous denial survived production masking. This suite and the Phase C run emitted a PostgreSQL client deprecation warning.                                                                                                                                                                                                                                          |
| `npm run test:market-operations:types`                                                                                                       | Blocked by unrelated existing errors in `scripts/market-operations-demo/storefront-shop-fixture.ts` (nullable fixture data) and `test/farmers-market/storefront-shop-fixture.ts` (obsolete `VendorCategoryService.scanner` references). The server build and focused typed test runs passed.                                                                                                                                  |

No Railway variable changes are required. When deployment is authorized, redeploy the **API** service from the corrected backend revision. No worker, gateway, Admin or storefront redeploy is required for these API diagnostics.

After the API is redeployed, open Products & Inventory with the affected staging vendor in the intended workspace. In DevTools Network, record the results of `VendorCatalog`, `VendorInventory` and `VendorProduct` when a product can be opened. Then reproduce one of the other affected page requests. For each failure, record the operation, timestamp with timezone, status, response error code, API revision and `X-Request-Id`. Find the matching `graphql_error` and `http_request` entries in the private API logs. If a request has no API event, verify whether the gateway admitted it. Keep session, authorization and channel tokens out of shared evidence.

For manual local testing, create dedicated vendor fixtures using the existing guarded demo fixture workflow. Start `npm run demo:market-operations:serve`, `npm run demo:market-operations:worker`, `npm run demo:market-operations:admin` and `npm run demo:market-operations:storefront` from the web checkout. Select the dedicated vendor workspace on `vendure_demo_market_ops` and verify empty catalog and inventory, then add a fixture product and variant to check detail and stock. Use the guarded disposable test for the missing-zone reproduction. [Local demo fixture setup](TEST_DATA_MANAGER_PHASE_A.md#local-demo-accounts)
