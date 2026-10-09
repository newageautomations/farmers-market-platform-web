import { useCallback, useState } from 'react';
import type { TenantKind, TenantOptions } from '@market/api';
import { Card, Button } from '@market/ui';
import type { ManagementService } from './service';
import {
  CommandForm,
  DataTable,
  ReadState,
  RouteLink,
  TextField,
  integer,
  text,
  useRead,
  date,
} from '../vendor/common';
import { Choice, Entitlements, Pager, Readiness } from './common';

export function PlatformOverview({ service }: { service: ManagementService }) {
  const read = useCallback(async () => {
    const [vendors, markets, active, suspended, modules] = await Promise.all([
      service.tenants({ kind: 'VENDOR', take: 1, skip: 0 }),
      service.tenants({ kind: 'MARKET', take: 1, skip: 0 }),
      service.tenants({ status: 'active', take: 1, skip: 0 }),
      service.tenants({ status: 'suspended', take: 1, skip: 0 }),
      service.readiness(),
    ]);
    return {
      vendors: vendors.totalItems,
      markets: markets.totalItems,
      active: active.totalItems,
      suspended: suspended.totalItems,
      modules,
    };
  }, [service]);
  const result = useRead('platform-overview', read);
  return (
    <>
      <ReadState {...result} retry={result.refresh} />
      {result.data && (
        <>
          <dl className="facts">
            <div>
              <dt>Vendors</dt>
              <dd>{result.data.vendors}</dd>
            </div>
            <div>
              <dt>Markets</dt>
              <dd>{result.data.markets}</dd>
            </div>
            <div>
              <dt>Active tenants</dt>
              <dd>{result.data.active}</dd>
            </div>
            <div>
              <dt>Suspended tenants</dt>
              <dd>{result.data.suspended}</dd>
            </div>
          </dl>
          <Readiness items={result.data.modules} />
        </>
      )}
      <p>
        Platform projections preserve each tenant's independent business
        authority. Production deployment qualification remains Phase 13H.
      </p>
    </>
  );
}
export function PlatformIntegrations({
  service,
}: {
  service: ManagementService;
}) {
  const read = useCallback(() => service.readiness(), [service]),
    result = useRead('platform-integrations', read);
  return (
    <>
      <p>
        Configuration, connection, health and qualification are separate facts.
        Credentials are managed by deployment configuration.
      </p>
      <ReadState {...result} retry={result.refresh} />
      {result.data && <Readiness items={result.data} />}
    </>
  );
}
export function TenantDirectory({ service }: { service: ManagementService }) {
  const [options, setOptions] = useState<TenantOptions>({ take: 20, skip: 0 }),
    read = useCallback(() => service.tenants(options), [service, options]),
    result = useRead(`directory:${JSON.stringify(options)}`, read);
  return (
    <>
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setOptions({
            take: 20,
            skip: 0,
            search: text(f, 'search'),
            kind: (text(f, 'kind') || null) as TenantKind | null,
            status: (text(f, 'status') || null) as
              'active' | 'suspended' | null,
          });
        }}
      >
        <TextField
          name="search"
          label="Business name or slug"
          required={false}
          maxLength={80}
        />
        <Choice name="kind" label="Tenant kind" required={false}>
          <option value="">All kinds</option>
          <option value="VENDOR">Vendor</option>
          <option value="MARKET">Market</option>
        </Choice>
        <Choice name="status" label="Tenant status" required={false}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Choice>
        <Button type="submit">Search tenants</Button>
      </form>
      <ReadState {...result} retry={result.refresh} />
      {result.data && (
        <>
          <DataTable
            label="Platform tenant directory"
            headings={['Business', 'Kind', 'Status', 'Storefront', 'Created']}
          >
            <>
              {result.data.items.map((t) => (
                <tr key={`${t.kind}:${t.id}`}>
                  <th scope="row">
                    <RouteLink
                      to={`/platform/tenants/${t.kind.toLowerCase()}/${t.id}`}
                    >
                      {t.name}
                    </RouteLink>
                    <small>{t.slug}</small>
                  </th>
                  <td>{t.kind === 'VENDOR' ? 'Vendor' : 'Market'}</td>
                  <td>{t.status}</td>
                  <td>{t.storefrontStatus}</td>
                  <td>{date(t.createdAt)}</td>
                </tr>
              ))}
            </>
          </DataTable>
          <Pager
            skip={options.skip ?? 0}
            total={result.data.totalItems}
            setSkip={(skip) => setOptions({ ...options, skip })}
          />
          {!result.data.totalItems && <p>No tenants match these filters.</p>}
        </>
      )}
      <Provisioning service={service} onDone={result.refresh} />
    </>
  );
}
function Provisioning({
  service,
  onDone,
}: {
  service: ManagementService;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<TenantKind>('VENDOR');
  return (
    <section>
      <h2>Provision a tenant</h2>
      <Choice
        name="provision-kind"
        label="New tenant kind"
        value={kind}
        onChange={(v) => setKind(v as TenantKind)}
      >
        <option value="VENDOR">Vendor</option>
        <option value="MARKET">Market</option>
      </Choice>
      <CommandForm
        key={kind}
        title={kind === 'VENDOR' ? 'Provision Vendor' : 'Provision Market'}
        submitLabel="Provision tenant"
        confirm="Provision this tenant using the existing domain command? Server-owned commerce identities are derived on the backend."
        run={(f, key) => {
          const base = {
            provisioningKey: key,
            name: text(f, 'name'),
            slug: text(f, 'slug'),
            initialPrincipalId: text(f, 'principal') || null,
          };
          return kind === 'VENDOR'
            ? service.provisionVendor(base)
            : service.provisionMarket({
                ...base,
                timezone: text(f, 'timezone'),
                venue: text(f, 'venue'),
                pickupInstructions: text(f, 'pickup'),
                defaultPreorderRule: {
                  opensDaysBefore: integer(f.get('openDays'), { zero: true }),
                  opensTime: text(f, 'opensTime'),
                  closesDaysBefore: integer(f.get('closeDays'), { zero: true }),
                  closesTime: text(f, 'closesTime'),
                },
                overridePolicy: {
                  membershipAllowed: f.get('membershipAllowed') === 'on',
                  participationAllowed: f.get('participationAllowed') === 'on',
                  vendorWindowMode: text(f, 'windowMode') as
                    'narrower' | 'withinBoundary',
                  closeMinutesBeforeStart: integer(f.get('closeMinutes'), {
                    zero: true,
                  }),
                },
              });
        }}
        onDone={onDone}
      >
        <TextField name="name" label="Business name" maxLength={200} />
        <TextField name="slug" label="Business slug" maxLength={120} />
        <TextField
          name="principal"
          label="Existing initial human principal reference"
          required={false}
        />
        <p>
          Initial membership uses an existing principal with independently
          granted native authority.
        </p>
        {kind === 'MARKET' && (
          <>
            <TextField name="timezone" label="IANA timezone" maxLength={100} />
            <TextField name="venue" label="Venue" maxLength={500} />
            <TextField
              name="pickup"
              label="Pickup instructions"
              maxLength={2000}
            />
            <TextField
              name="openDays"
              label="Preorder opens days before"
              type="number"
            />
            <TextField
              name="opensTime"
              label="Preorder opening time"
              type="time"
            />
            <TextField
              name="closeDays"
              label="Preorder closes days before"
              type="number"
            />
            <TextField
              name="closesTime"
              label="Preorder closing time"
              type="time"
            />
            <label>
              <input type="checkbox" name="membershipAllowed" /> Allow
              membership window overrides
            </label>
            <label>
              <input type="checkbox" name="participationAllowed" /> Allow
              participation window overrides
            </label>
            <Choice name="windowMode" label="Vendor window rule">
              <option value="narrower">Narrower</option>
              <option value="withinBoundary">Within boundary</option>
            </Choice>
            <TextField
              name="closeMinutes"
              label="Close minutes before occurrence"
              type="number"
            />
          </>
        )}
      </CommandForm>
    </section>
  );
}
export function TenantDetail({
  service,
  kind,
  id,
}: {
  service: ManagementService;
  kind: TenantKind;
  id: string;
}) {
  const read = useCallback(() => service.tenant(kind, id), [service, kind, id]),
    result = useRead(`platform-tenant:${kind}:${id}`, read);
  const offersRead = useCallback(
      () => service.catalog('OFFERS', { take: 50, skip: 0 }),
      [service],
    ),
    offers = useRead('assignment-offers', offersRead);
  const data = result.data,
    subject = kind === 'VENDOR' ? { vendorId: id } : { marketId: id };
  return (
    <>
      <ReadState {...result} retry={result.refresh} />
      {data && (
        <>
          <Card>
            <h2>{data.identity.name}</h2>
            <p>
              {kind === 'VENDOR' ? 'Vendor' : 'Market'} · {data.identity.slug} ·{' '}
              {data.identity.status}
            </p>
            <p>Storefront: {data.identity.storefrontStatus}</p>
            <p>Created {date(data.identity.createdAt)}</p>
          </Card>
          <Card>
            <h2>Billing state</h2>
            {data.subscription ? (
              <>
                <p>
                  {data.subscription.status} · {data.subscription.source}
                </p>
                <p>
                  Exact plan version {data.subscription.planVersionId} · Offer{' '}
                  {data.subscription.offerId}
                </p>
                <p>
                  Access:{' '}
                  {data.subscription.accessAllowed ? 'Allowed' : 'Denied'} ·{' '}
                  {data.subscription.accessConfigured
                    ? data.subscription.accessPolicyVersion
                    : 'Policy not configured'}
                </p>
              </>
            ) : (
              <p>No subscription assigned.</p>
            )}
          </Card>
          <Entitlements items={data.entitlements} />
          <Readiness items={data.integrations} />
          {offers.data && (
            <CommandForm
              title={
                data.subscription
                  ? 'Migrate internal subscription'
                  : 'Assign internal subscription'
              }
              submitLabel={
                data.subscription
                  ? 'Migrate selected tenant'
                  : 'Assign no-charge subscription'
              }
              confirm="Apply an explicit internal no-charge assignment or migration to only this selected tenant? No external billing operation is created."
              run={(f, key) =>
                data.subscription
                  ? service.migrateInternal({
                      subscriptionId: data.subscription.id,
                      offerId: text(f, 'offer'),
                      key,
                    })
                  : service.assignInternal({
                      subject,
                      offerId: text(f, 'offer'),
                    })
              }
              onDone={result.refresh}
            >
              <Choice name="offer" label="Approved offer">
                <option value="">Select an approved offer</option>
                {offers.data.items
                  .filter((o) => o.status === 'ACTIVE')
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} · exact version {o.planVersionId}
                    </option>
                  ))}
              </Choice>
              <p>
                Internal assignment creates no provider Customer, invoice or
                subscription. Existing subscribers retain their exact version
                until deliberately migrated.
              </p>
            </CommandForm>
          )}
          {data.billingAccountId && (
            <p>
              <RouteLink
                to={`/platform/billing/overrides?account=${data.billingAccountId}`}
              >
                Manage this tenant's entitlement overrides
              </RouteLink>
            </p>
          )}
          <p>
            Runtime configuration and external qualification are separate from
            persisted account readiness. POS connection does not establish
            physical inventory authority.
          </p>
        </>
      )}
    </>
  );
}
