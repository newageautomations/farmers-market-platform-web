import { useCallback, useState } from 'react';
import { AppError, type PosConnection } from '@market/api';
import { Button, Card } from '@market/ui';
import type { VendorService } from '../vendor/service';
import type { ManagementService } from './service';
import {
  CommandForm,
  ReadState,
  TextField,
  date,
  text,
  useRead,
  Unavailable,
} from '../vendor/common';
import { Choice } from './common';

export function Pos({
  service,
  vendor,
}: {
  service: ManagementService;
  vendor?: VendorService;
}) {
  const read = useCallback(() => service.pos(), [service]),
    result = useRead('pos', read);
  const [selected, setSelected] = useState('');
  const data = result.data,
    canManage = service.context.permissions.includes(
      'ManageOwnPosIntegrations',
    );
  return (
    <>
      <ReadState {...result} retry={result.refresh} />
      <Unavailable>
        POS connections observe inventory by default. A connection does not
        establish physical authority. Marketplace order export and Customer
        imports are unavailable. External provider qualification remains
        separate.
      </Unavailable>
      {data && (
        <>
          <div className="management-grid">
            {data.providers.map((p) => {
              const runtime = data.runtime.providers.find(
                  (r) => r.providerCode === p.providerCode,
                ),
                localIO = canManage && runtime?.providerIOAllowed;
              return (
                <Card key={p.providerCode}>
                  <h2>{p.providerCode}</h2>
                  <p>
                    API version {p.apiVersion} ·{' '}
                    {runtime?.state ?? 'NOT_CONFIGURED'}
                  </p>
                  <details>
                    <summary>Provider capabilities</summary>
                    <dl>
                      {Object.entries(p.capabilities).map(([key, c]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>
                            {c.support} · {c.reason}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                  {localIO && p.capabilities.oauth?.support === 'SUPPORTED' ? (
                    <CommandForm
                      title={`Connect ${p.providerCode}`}
                      submitLabel="Connect local adapter"
                      run={async (f) => {
                        const hint = text(f, 'accountHint');
                        const redirect = data.runtime.allowedRedirectUris[0];
                        if (!redirect) throw new AppError('unavailable');
                        const response = await service.beginPos({
                          providerCode: p.providerCode,
                          mode: 'SANDBOX',
                          redirectUri: redirect,
                          accountHint: hint,
                        });
                        const raw = response.beginOwnPosAuthorization;
                        if (
                          !raw ||
                          typeof raw !== 'object' ||
                          !('authorizationUrl' in raw) ||
                          typeof raw.authorizationUrl !== 'string'
                        )
                          throw new AppError('graphql');
                        const state = new URL(
                          raw.authorizationUrl,
                        ).searchParams.get('state');
                        if (!state) throw new AppError('graphql');
                        await service.completePos({
                          providerCode: p.providerCode,
                          mode: 'SANDBOX',
                          state,
                          code: text(f, 'localCode'),
                          accountHint: hint,
                          callbackParams: null,
                        });
                      }}
                      onDone={result.refresh}
                    >
                      <p>
                        Controlled local authorization only. No external
                        redirect or provider call.
                      </p>
                      <TextField
                        name="accountHint"
                        label="Local adapter account reference"
                        maxLength={200}
                      />
                      <TextField
                        name="localCode"
                        label="Local adapter authorization code"
                        maxLength={2000}
                      />
                    </CommandForm>
                  ) : localIO &&
                    p.capabilities.clientCredentials?.support ===
                      'SUPPORTED' ? (
                    <CommandForm
                      title={`Connect ${p.providerCode}`}
                      run={(f) =>
                        service.connectPos({
                          providerCode: p.providerCode,
                          mode: 'SANDBOX',
                          accountId: text(f, 'accountId'),
                        })
                      }
                      onDone={result.refresh}
                    >
                      <TextField
                        name="accountId"
                        label="Partner account reference"
                        maxLength={200}
                      />
                    </CommandForm>
                  ) : (
                    <Button disabled>Authorize connection</Button>
                  )}
                </Card>
              );
            })}
          </div>
          <section>
            <h2>Connections</h2>
            {!data.connections.length && (
              <p>No connections are recorded for this Vendor.</p>
            )}
            {data.connections.map((c) => (
              <Card key={c.id}>
                <h3>{c.providerCode}</h3>
                <p>
                  {c.status} · {c.mode} · API {c.apiVersion}
                </p>
                <p>Inventory authority: {c.policies.inventory}</p>
                <p>Last successful observation: {date(c.lastSuccessAt)}</p>
                <Button className="secondary" onClick={() => setSelected(c.id)}>
                  Inspect connection
                </Button>
              </Card>
            ))}
          </section>
          {data.connections.find((c) => c.id === selected) && (
            <PosDetail
              key={selected}
              service={service}
              vendor={vendor}
              connection={data.connections.find((c) => c.id === selected)!}
              runtime={data.runtime}
              onRefresh={result.refresh}
            />
          )}
        </>
      )}
    </>
  );
}
function PosDetail({
  service,
  vendor,
  connection: initial,
  runtime,
  onRefresh,
}: {
  service: ManagementService;
  vendor?: VendorService;
  connection: PosConnection;
  runtime: Awaited<ReturnType<ManagementService['pos']>>['runtime'];
  onRefresh: () => void;
}) {
  const read = useCallback(
      () => service.posDetail(initial.id),
      [service, initial.id],
    ),
    result = useRead(`pos-detail:${initial.id}`, read),
    c = result.data?.connection ?? initial;
  const catalogRead = useCallback(
      () =>
        vendor
          ? vendor.catalog('', 0)
          : Promise.reject(new AppError('forbidden')),
      [vendor],
    ),
    candidates = useRead('mapping-candidates', catalogRead, !!vendor);
  const [locations, setLocations] = useState<
      Awaited<ReturnType<ManagementService['locations']>>
    >([]),
    [resources, setResources] = useState<
      Awaited<ReturnType<ManagementService['posCatalog']>>['records']
    >([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [variant, setVariant] = useState(''),
    sourceRead = useCallback(
      () => service.mappingSource(variant),
      [service, variant],
    ),
    source = useRead(`mapping-source:${variant}`, sourceRead, !!variant);
  const canManage = service.context.permissions.includes(
      'ManageOwnPosIntegrations',
    ),
    localIO =
      canManage &&
      runtime.providers.some(
        (p) => p.providerCode === c.providerCode && p.providerIOAllowed,
      );
  const refresh = () => {
    result.refresh();
  };
  return (
    <section>
      <h2>{c.providerCode} connection details</h2>
      <ReadState {...result} retry={refresh} />
      {result.data && (
        <>
          <p>
            {result.data.health.pollingHealthy
              ? 'Polling observation is recent'
              : 'Polling is stale or unavailable'}{' '}
            ·{' '}
            {result.data.health.reauthorizationRequired
              ? 'Reauthorization or reconciliation required'
              : 'No reauthorization flagged'}
          </p>
          <p>
            Catalog sync: {date(result.data.health.lastCatalogSync)} · Inventory
            sync: {date(result.data.health.lastInventorySync)} · Reconciliation:{' '}
            {date(result.data.health.lastReconciliation)}
          </p>
          <p>Mapping issues: {result.data.health.mappingIssues}</p>
          <ul>
            {result.data.health.issues.map((i) => (
              <li key={i.id}>
                {i.kind} · {date(i.createdAt)}
              </li>
            ))}
          </ul>
          <details>
            <summary>Effective connection capabilities</summary>
            <dl>
              {Object.entries(c.capabilities).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </details>
          <section>
            <h3>Confirmed mappings</h3>
            <ul>
              {result.data.mappings.map((m) => (
                <li key={m.id}>
                  {m.kind} · {m.externalId} →{' '}
                  {m.variantId
                    ? `Owned variant ${m.variantId}`
                    : `Owned source ${m.stockLocationId}`}{' '}
                  · {m.status}
                </li>
              ))}
            </ul>
            {!result.data.mappings.length && (
              <p>
                No confirmed mappings. Matching SKUs do not establish ownership.
              </p>
            )}
          </section>
        </>
      )}
      {localIO && (
        <>
          {c.discoveryCapabilities.locations === 'SUPPORTED' && (
            <CommandForm
              title="Discover locations"
              submitLabel="Discover locations"
              run={async () => setLocations(await service.locations(c.id))}
              onDone={refresh}
            >
              <p>Read locations from the controlled adapter.</p>
            </CommandForm>
          )}
          {c.discoveryCapabilities.catalogRead === 'SUPPORTED' && (
            <CommandForm
              title="Discover catalog"
              submitLabel={
                cursor ? 'Discover next catalog page' : 'Discover catalog'
              }
              run={async () => {
                const page = await service.posCatalog(
                  c.id,
                  cursor ?? undefined,
                );
                setResources(page.records);
                setCursor(page.nextCursor);
              }}
              onDone={refresh}
            >
              <p>Discovery does not create a mapping.</p>
            </CommandForm>
          )}
          {locations.length > 0 && source.data?.canonicalSourceId && (
            <CommandForm
              title="Map location"
              submitLabel="Confirm location mapping"
              run={(f) =>
                service.mapPos({
                  connectionId: c.id,
                  kind: 'LOCATION',
                  externalId: text(f, 'externalLocation'),
                  localId: source.data!.canonicalSourceId!,
                })
              }
              onDone={refresh}
            >
              <Choice
                name="externalLocation"
                label="Discovered provider location"
              >
                {locations
                  .filter((l) => l.active)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </Choice>
              <p>
                Platform source {source.data.canonicalSourceId}, derived from
                the selected owned variant.
              </p>
            </CommandForm>
          )}
          {resources.length > 0 && candidates.data && (
            <CommandForm
              title="Map catalog resource"
              submitLabel="Confirm variant mapping"
              run={(f) =>
                service.mapPos({
                  connectionId: c.id,
                  kind: 'VARIANT',
                  externalId: text(f, 'externalResource'),
                  localId: text(f, 'variant'),
                })
              }
              onDone={refresh}
            >
              <Choice
                name="externalResource"
                label="Discovered provider resource"
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Choice>
              <Choice
                name="variant"
                label="Owned platform variant"
                value={variant}
                onChange={setVariant}
              >
                <option value="">Select an owned variant</option>
                {candidates.data.items.flatMap((p) =>
                  p.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {p.name} · {v.name}
                    </option>
                  )),
                )}
              </Choice>
              <p>
                Choose explicit resources. No SKU matching is applied.
                Candidates are from the current bounded catalog page.
              </p>
            </CommandForm>
          )}
          <CommandForm
            title="Keep inventory observe-only"
            run={() =>
              service.posPolicies({
                id: c.id,
                expectedVersion: c.version,
                policies: {
                  ...c.policies,
                  version: c.policies.version + 1,
                  inventory: 'OBSERVE_ONLY',
                  freshness: {
                    policyId: null,
                    policyVersion: null,
                    maxAgeSeconds: null,
                  },
                },
              })
            }
            onDone={refresh}
          >
            <p>
              Physical authority requires a separate platform-approved policy.{' '}
              {runtime.approvedPhysicalPolicyId
                ? `Approved policy exists: ${runtime.approvedPhysicalPolicyId}.`
                : 'No physical authority policy is configured.'}
            </p>
          </CommandForm>
          {(['catalog', 'inventory'] as const)
            .filter(
              (stream) =>
                c.capabilities[
                  stream === 'catalog' ? 'catalogRead' : 'inventoryRead'
                ] === 'SUPPORTED',
            )
            .map((stream) => (
              <CommandForm
                key={stream}
                title={`Request ${stream} sync`}
                submitLabel="Request sync"
                run={(_f, key) => service.syncPos({ id: c.id, stream, key })}
                onDone={refresh}
              >
                <p>
                  Submission schedules backend work. Confirm results through
                  current health and sync observations.
                </p>
              </CommandForm>
            ))}
          <CommandForm
            title="Revoke POS connection"
            submitLabel="Revoke connection"
            confirm="Revoke this POS connection? History and ambiguous effects remain available for reconciliation."
            run={() => service.revokePos(c.id)}
            onDone={() => {
              refresh();
              onRefresh();
            }}
          >
            <p>Backend revocation remains authoritative.</p>
          </CommandForm>
        </>
      )}
    </section>
  );
}
