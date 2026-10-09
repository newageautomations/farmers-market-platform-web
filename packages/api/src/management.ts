import * as g from './generated/admin';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';

export type CatalogSection = g.PlatformCatalogSection;
export type CatalogRecord =
  g.PlatformCatalogQuery['platformBillingCatalog']['items'][number];
export type TenantKind = g.PlatformTenantKind;
export type TenantOptions = Partial<g.PlatformTenantOptions>;
export type ManagementEntitlement = g.ManagementEntitlementFragment;
export type ModuleReadiness = g.ModuleReadinessFragment;
export type PaymentManagement = g.PaymentManagementQuery;
export type TenantBilling = g.TenantBillingQuery;
export type PosSupport =
  | 'SUPPORTED'
  | 'UNSUPPORTED'
  | 'REQUIRES_SCOPE'
  | 'REQUIRES_PROVIDER_APPROVAL'
  | 'UNCHARACTERIZED';
export interface PosProvider {
  providerCode: string;
  apiVersion: string;
  capabilities: Record<string, { support: PosSupport; reason: string }>;
}
export interface PosConnection {
  id: string;
  providerCode: string;
  mode: string;
  status: string;
  version: number;
  apiVersion: string;
  lastSuccessAt: string | null;
  capabilities: Record<string, PosSupport>;
  discoveryCapabilities: Record<string, PosSupport>;
  policies: {
    version: number;
    fields: Record<string, string>;
    inventory: string;
    freshness: {
      policyId: string | null;
      policyVersion: string | null;
      maxAgeSeconds: number | null;
    };
  };
}
export interface PosMapping {
  id: string;
  kind: string;
  externalId: string;
  variantId: string | null;
  stockLocationId: string | null;
  status: string;
}
export interface PosHealth {
  pollingHealthy: boolean;
  reauthorizationRequired: boolean;
  mappingIssues: number;
  lastCatalogSync: string | null;
  lastInventorySync: string | null;
  lastReconciliation: string | null;
  checkpoints: readonly {
    stream: string;
    scope: string;
    lastSuccessAt: string | null;
    hasMore: boolean;
  }[];
  issues: readonly { id: string; kind: string; createdAt: string }[];
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new AppError('graphql');
  return v as Record<string, unknown>;
};
const string = (v: unknown) => {
  if (typeof v !== 'string' && typeof v !== 'number')
    throw new AppError('graphql');
  return String(v);
};
const nullable = (v: unknown) => (v == null ? null : string(v));
const array = (v: unknown): unknown[] => {
  if (!Array.isArray(v) || v.length > 500) throw new AppError('graphql');
  return v;
};
function supports(v: unknown): Record<string, PosSupport> {
  return Object.fromEntries(
    Object.entries(object(v)).map(([k, s]) => {
      if (
        ![
          'SUPPORTED',
          'UNSUPPORTED',
          'REQUIRES_SCOPE',
          'REQUIRES_PROVIDER_APPROVAL',
          'UNCHARACTERIZED',
        ].includes(String(s))
      )
        throw new AppError('graphql');
      return [k, s as PosSupport];
    }),
  );
}
function providers(v: unknown): PosProvider[] {
  return array(v).map((value) => {
    const r = object(value);
    return {
      providerCode: string(r.providerCode),
      apiVersion: string(r.apiVersion),
      capabilities: Object.fromEntries(
        Object.entries(object(r.capabilities)).map(([k, value]) => {
          const d = object(value);
          return [
            k,
            {
              support: supports({ [k]: d.support })[k]!,
              reason: string(d.reason),
            },
          ];
        }),
      ),
    };
  });
}
function connections(v: unknown): PosConnection[] {
  return array(v).map((value) => {
    const r = object(value),
      p = object(r.policies),
      f = object(p.freshness);
    if (!Number.isInteger(r.version) || !Number.isInteger(p.version))
      throw new AppError('graphql');
    return {
      id: string(r.id),
      providerCode: string(r.providerCode),
      mode: string(r.mode),
      status: string(r.status),
      version: Number(r.version),
      apiVersion: string(r.apiVersion),
      lastSuccessAt: nullable(r.lastSuccessAt),
      capabilities: supports(r.capabilities),
      discoveryCapabilities: supports(r.discoveryCapabilities),
      policies: {
        version: Number(p.version),
        fields: Object.fromEntries(
          Object.entries(object(p.fields)).map(([k, v]) => [k, string(v)]),
        ),
        inventory: string(p.inventory),
        freshness: {
          policyId: nullable(f.policyId),
          policyVersion: nullable(f.policyVersion),
          maxAgeSeconds:
            f.maxAgeSeconds == null ? null : Number(f.maxAgeSeconds),
        },
      },
    };
  });
}
export function createManagementApi(options: TransportOptions) {
  const execute = transport('admin', options);
  return {
    platformScope: async () =>
      (await execute({ api: 'admin', document: g.PlatformScopeDocument }, {}))
        .platformAdminScope,
    tenants: async (options: Partial<g.PlatformTenantOptions>) =>
      (
        await execute(
          { api: 'admin', document: g.PlatformDirectoryDocument },
          {
            options: {
              skip: null,
              take: null,
              search: null,
              kind: null,
              status: null,
              ...options,
            },
          },
        )
      ).platformTenants,
    tenant: async (kind: g.PlatformTenantKind, id: string) =>
      (
        await execute(
          { api: 'admin', document: g.PlatformTenantDetailDocument },
          { kind, id },
        )
      ).platformTenant,
    readiness: async () =>
      (
        await execute(
          { api: 'admin', document: g.PlatformReadinessDocument },
          {},
        )
      ).platformIntegrationReadiness,
    payments: (mode: g.StripeAccountMode) =>
      execute(
        { api: 'admin', document: g.PaymentManagementDocument },
        { mode },
      ),
    connectStripe: (mode: g.StripeAccountMode) =>
      execute(
        { api: 'admin', document: g.ManagementConnectStripeDocument },
        { mode },
      ),
    refreshStripe: (mode: g.StripeAccountMode) =>
      execute(
        { api: 'admin', document: g.ManagementRefreshStripeDocument },
        { mode },
      ),
    disconnectStripe: (mode: g.StripeAccountMode) =>
      execute(
        { api: 'admin', document: g.ManagementDisconnectStripeDocument },
        { mode },
      ),
    pos: async () => {
      const r = await execute(
        { api: 'admin', document: g.PosManagementDocument },
        {},
      );
      return {
        providers: providers(r.ownPosProviders),
        connections: connections(r.ownPosConnections),
        runtime: r.ownPosRuntime,
      };
    },
    posDetail: async (id: string) => {
      const r = await execute(
          { api: 'admin', document: g.PosConnectionDetailDocument },
          { id },
        ),
        h = object(r.ownPosHealth);
      const connection = connections(r.ownPosConnections).find(
        (c) => c.id === id,
      );
      if (!connection) throw new AppError('forbidden');
      return {
        connection,
        health: {
          pollingHealthy: h.pollingHealthy === true,
          reauthorizationRequired: h.reauthorizationRequired === true,
          mappingIssues: Number(h.mappingIssues),
          lastCatalogSync: nullable(h.lastCatalogSync),
          lastInventorySync: nullable(h.lastInventorySync),
          lastReconciliation: nullable(h.lastReconciliation),
          checkpoints: array(h.checkpoints).map((value) => {
            const c = object(value);
            return {
              stream: string(c.stream),
              scope: string(c.scope),
              lastSuccessAt: nullable(c.lastSuccessAt),
              hasMore: c.hasMore === true,
            };
          }),
          issues: array(h.issues).map((value) => {
            const i = object(value);
            return {
              id: string(i.id),
              kind: string(i.kind),
              createdAt: string(i.createdAt),
            };
          }),
        } satisfies PosHealth,
        mappings: array(r.ownPosMappings).map((value) => {
          const m = object(value);
          return {
            id: string(m.id),
            kind: string(m.kind),
            externalId: string(m.externalId),
            variantId: nullable(m.variantId),
            stockLocationId: nullable(m.stockLocationId),
            status: string(m.status),
          } satisfies PosMapping;
        }),
      };
    },
    beginPos: (input: g.BeginPosAuthorizationInput) =>
      execute(
        { api: 'admin', document: g.ManagementBeginPosDocument },
        { input },
      ),
    completePos: (input: g.CompletePosAuthorizationInput) =>
      execute(
        { api: 'admin', document: g.ManagementCompletePosDocument },
        { input },
      ),
    connectPos: (variables: g.ManagementConnectPosMutationVariables) =>
      execute(
        { api: 'admin', document: g.ManagementConnectPosDocument },
        variables,
      ),
    revokePos: (id: string) =>
      execute(
        { api: 'admin', document: g.ManagementRevokePosDocument },
        { id },
      ),
    mapPos: (input: g.ConfirmPosMappingInput) =>
      execute(
        { api: 'admin', document: g.ManagementMapPosDocument },
        { input },
      ),
    posPolicies: (variables: g.ManagementPosPoliciesMutationVariables) =>
      execute(
        { api: 'admin', document: g.ManagementPosPoliciesDocument },
        variables,
      ),
    locations: async (id: string) =>
      array(
        (
          await execute(
            { api: 'admin', document: g.ManagementPosLocationsDocument },
            { id },
          )
        ).discoverOwnPosLocations,
      ).map((value) => {
        const l = object(value);
        return {
          id: string(l.id),
          name: string(l.name),
          active: l.active === true,
        };
      }),
    posCatalog: async (id: string, cursor?: string) => {
      const r = object(
        (
          await execute(
            { api: 'admin', document: g.ManagementPosCatalogDocument },
            { id, cursor: cursor ?? null },
          )
        ).discoverOwnPosCatalog,
      );
      return {
        records: array(r.records).map((value) => {
          const i = object(value);
          return { id: string(i.id), name: string(i.name) };
        }),
        nextCursor: nullable(r.nextCursor),
      };
    },
    syncPos: (variables: g.ManagementPosSyncMutationVariables) =>
      execute(
        { api: 'admin', document: g.ManagementPosSyncDocument },
        variables,
      ),
    mappingSource: async (id: string) =>
      (
        await execute(
          { api: 'admin', document: g.ManagementMappingSourceDocument },
          { id },
        )
      ).ownResourceIdentity,
    billing: (subject: Partial<g.BillingSubjectInput>) =>
      execute(
        { api: 'admin', document: g.TenantBillingDocument },
        { subject: { vendorId: null, marketId: null, ...subject } },
      ),
    catalog: async (
      section: g.PlatformCatalogSection,
      options: Partial<g.PlatformCatalogOptions> = { take: 20, skip: 0 },
    ) =>
      (
        await execute(
          { api: 'admin', document: g.PlatformCatalogDocument },
          {
            section,
            options: {
              skip: null,
              take: null,
              search: null,
              planId: null,
              planVersionId: null,
              billingAccountId: null,
              ...options,
            },
          },
        )
      ).platformBillingCatalog,
    provisionVendor: (input: g.PlatformProvisionVendorInput) =>
      execute(
        { api: 'admin', document: g.ManagementProvisionVendorDocument },
        { input },
      ),
    provisionMarket: (input: g.PlatformProvisionMarketInput) =>
      execute(
        { api: 'admin', document: g.ManagementProvisionMarketDocument },
        { input },
      ),
    createPlan: (variables: g.ManagementCreatePlanMutationVariables) =>
      execute(
        { api: 'admin', document: g.ManagementCreatePlanDocument },
        variables,
      ),
    editPlan: (variables: g.ManagementEditPlanMutationVariables) =>
      execute(
        { api: 'admin', document: g.ManagementEditPlanDocument },
        variables,
      ),
    createVersion: (variables: g.ManagementCreateVersionMutationVariables) =>
      execute(
        { api: 'admin', document: g.ManagementCreateVersionDocument },
        variables,
      ),
    rule: (input: g.SaasRuleInput) =>
      execute(
        { api: 'admin', document: g.ManagementSetRuleDocument },
        { input },
      ),
    publishVersion: (id: string) =>
      execute(
        { api: 'admin', document: g.ManagementPublishVersionDocument },
        { id },
      ),
    retireVersion: (id: string) =>
      execute(
        { api: 'admin', document: g.ManagementRetireVersionDocument },
        { id },
      ),
    defaultVersion: (variables: g.ManagementDefaultVersionMutationVariables) =>
      execute(
        { api: 'admin', document: g.ManagementDefaultVersionDocument },
        variables,
      ),
    createOffer: (input: g.SaasOfferInput) =>
      execute(
        { api: 'admin', document: g.ManagementCreateOfferDocument },
        { input },
      ),
    registerFeature: (code: string) =>
      execute(
        { api: 'admin', document: g.ManagementRegisterFeatureDocument },
        { code },
      ),
    createMetric: (input: g.SaasMetricInput) =>
      execute(
        { api: 'admin', document: g.ManagementCreateMetricDocument },
        { input },
      ),
    accessPolicy: (variables: g.ManagementAccessPolicyMutationVariables) =>
      execute(
        { api: 'admin', document: g.ManagementAccessPolicyDocument },
        variables,
      ),
    changePolicy: (input: g.SaasChangePolicyInput) =>
      execute(
        { api: 'admin', document: g.ManagementChangePolicyDocument },
        { input },
      ),
    assignInternal: (
      variables: Omit<
        g.ManagementAssignInternalMutationVariables,
        'subject'
      > & { subject: Partial<g.BillingSubjectInput> },
    ) =>
      execute(
        { api: 'admin', document: g.ManagementAssignInternalDocument },
        {
          ...variables,
          subject: { vendorId: null, marketId: null, ...variables.subject },
        },
      ),
    migrateInternal: (
      variables: g.ManagementMigrateInternalMutationVariables,
    ) =>
      execute(
        { api: 'admin', document: g.ManagementMigrateInternalDocument },
        variables,
      ),
    grantOverride: (input: g.SaasOverrideInput) =>
      execute(
        { api: 'admin', document: g.ManagementGrantOverrideDocument },
        { input },
      ),
    revokeOverride: (id: string) =>
      execute(
        { api: 'admin', document: g.ManagementRevokeOverrideDocument },
        { id },
      ),
  };
}
export type ManagementApi = ReturnType<typeof createManagementApi>;
