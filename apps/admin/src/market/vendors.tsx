import { useCallback, useState, type ReactNode } from 'react';
import {
  AppError,
  type MarketOrganizerRelationshipState as MarketRelationshipState,
  type MarketDetailPages,
  type Offering,
  type MarketMembershipStatus,
  type MarketListingStatus,
} from '@market/api';
import { mayMarketCommand } from '@market/admin-core';
import { Badge, Button, Dialog, EmptyState, Pagination } from '@market/ui';
import type { MarketService } from './service';
import {
  Choice,
  CommandForm,
  DataTable,
  date,
  dateBounds,
  initialRange,
  integer,
  RangeForm,
  ReadState,
  RouteLink,
  RuleFields,
  ruleInput,
  RuleSummary,
  SelectField,
  text,
  TextField,
  Toggle,
  useRead,
} from './common';

const membershipStatuses = [
  'pending',
  'approved',
  'suspended',
  'withdrawn',
] as const;
const listingStatuses = ['approved', 'withdrawn'] as const;
const participationStatuses = ['planned', 'confirmed', 'cancelled'] as const;
function status<T extends string>(data: FormData, values: readonly T[]): T {
  const candidate = text(data, 'status');
  const selected = values.find((value) => value === candidate);
  if (!selected) throw new AppError('validation');
  return selected;
}
function cap(data: FormData) {
  return text(data, 'salesCap') ? integer(data.get('salesCap')) : null;
}

export function MarketVendors({
  service,
  id,
  tab = 'memberships',
}: {
  service: MarketService;
  id?: string;
  tab?: 'memberships' | 'participation' | 'listings' | 'offerings';
}) {
  const [skip, setSkip] = useState(0),
    [search, setSearch] = useState(''),
    [add, setAdd] = useState(false);
  const [pages, setPages] = useState<MarketDetailPages>({});
  const read = useCallback(
    () => service.relationshipPage({ take: 20, skip, search }),
    [service, skip, search],
  );
  const list = useRead(
    `${service.readKey}:relationships:${skip}:${search}`,
    read,
    !id,
  );
  const detailRead = useCallback(
    () => service.relationshipDetail(id!, pages),
    [service, id, pages],
  );
  const detail = useRead(
    `${service.readKey}:relationship:${id}:${JSON.stringify(pages)}`,
    detailRead,
    !!id,
  );
  const active = id ? detail : list;
  const controls = (kind: keyof MarketDetailPages, label: string) =>
    detail.data ? (
      <PageControls
        label={label}
        skip={pages[kind] ?? 0}
        page={detail.data[kind]}
        change={(skip) => setPages((values) => ({ ...values, [kind]: skip }))}
      />
    ) : null;
  return (
    <>
      <ReadState {...active} retry={active.refresh} />
      <Button className="secondary" onClick={active.refresh}>
        Refresh Vendor relationships
      </Button>
      {!id && (
        <>
          <form
            className="dashboard-card"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(text(new FormData(event.currentTarget), 'search'));
              setSkip(0);
            }}
          >
            <TextField
              name="search"
              label="Search Vendor relationships"
              required={false}
              maxLength={200}
              value={search}
            />
            <Button type="submit">Search relationships</Button>
          </form>
          {mayMarketCommand(service.context, 'ManageOwnMarketMemberships') && (
            <Button onClick={() => setAdd(true)}>Add Vendor</Button>
          )}
          {add && (
            <AddVendor
              service={service}
              close={() => setAdd(false)}
              refresh={list.refresh}
            />
          )}
          {list.data &&
            (list.data.items.length ? (
              <DataTable
                label="Vendor business relationships"
                headings={[
                  'Vendor',
                  'Membership',
                  'Preorder default',
                  'Version',
                ]}
                sort={{ heading: 'Vendor', direction: 'ascending' }}
              >
                {list.data.items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <RouteLink to={`/market/vendors/${tab}/${member.id}`}>
                        {member.vendor.name}
                      </RouteLink>
                      <small>{member.vendor.slug}</small>
                    </td>
                    <td>
                      <Badge>{member.status}</Badge>
                    </td>
                    <td>
                      {member.preorderDefault
                        ? 'Configured by Vendor'
                        : 'Uses Market default'}
                    </td>
                    <td>{member.version}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState title="No Vendor relationships" />
            ))}
          {list.data && (
            <PageControls
              label="Vendor relationship pages"
              skip={skip}
              page={list.data}
              change={setSkip}
            />
          )}
        </>
      )}
      {id && <RouteLink to="/market/vendors">Back to Vendors</RouteLink>}
      {detail.data && (
        <Relationship
          key={`${detail.data.membership.id}:${detail.data.membership.version}:${detail.data.listings.items.map((r) => r.version).join(',')}:${detail.data.participations.items.map((r) => r.version).join(',')}:${detail.data.offerings.items.map((r) => r.version).join(',')}`}
          service={service}
          tab={tab}
          state={{
            membership: detail.data.membership,
            occurrences: detail.data.occurrences.items,
            participations: detail.data.participations.items,
            listings: detail.data.listings.items,
            offerings: detail.data.offerings.items,
          }}
          refresh={detail.refresh}
          controls={controls}
        />
      )}
    </>
  );
}
function PageControls({
  label,
  skip,
  page,
  change,
}: {
  label: string;
  skip: number;
  page: { totalItems: number; items: readonly unknown[] };
  change: (value: number) => void;
}) {
  return (
    <div role="region" aria-label={label}>
      <p>
        {page.totalItems} records. Showing {skip + (page.items.length ? 1 : 0)}{' '}
        to {skip + page.items.length}.
      </p>
      <Pagination
        label={label}
        hasPrevious={skip > 0}
        hasNext={skip + 20 < page.totalItems}
        onPrevious={() => change(Math.max(0, skip - 20))}
        onNext={() => change(skip + 20)}
      />
    </div>
  );
}
function AddVendor({
  service,
  close,
  refresh,
}: {
  service: MarketService;
  close: () => void;
  refresh: () => void;
}) {
  const [skip, setSkip] = useState(0),
    [search, setSearch] = useState(''),
    [busy, setBusy] = useState(false);
  const read = useCallback(
    () => service.eligibleVendors({ take: 20, skip, search }),
    [service, skip, search],
  );
  const directory = useRead(
    `${service.readKey}:eligible-vendors:${skip}:${search}`,
    read,
  );
  return (
    <Dialog open title="Add Vendor" busy={busy} onClose={close}>
      <p>
        Choose an eligible business. The backend rechecks the relationship when
        you submit.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(text(new FormData(event.currentTarget), 'search'));
          setSkip(0);
        }}
      >
        <TextField
          name="search"
          label="Search eligible Vendors"
          required={false}
          maxLength={200}
          value={search}
        />
        <Button type="submit" disabled={busy}>
          Search directory
        </Button>
      </form>
      <ReadState {...directory} retry={directory.refresh} />
      {directory.data && (
        <>
          <PageControls
            label="Eligible Vendor pages"
            skip={skip}
            page={directory.data}
            change={setSkip}
          />
          {directory.data.items.length ? (
            <CommandForm
              key={`${skip}:${search}`}
              title="New Vendor relationship"
              submitLabel="Create relationship"
              onDone={() => {
                refresh();
                close();
              }}
              run={async (data) => {
                const selected = directory.data!.items.find(
                  (v) => v.id === text(data, 'vendor'),
                );
                if (!selected) throw new AppError('validation');
                setBusy(true);
                try {
                  return await service.membershipStatus(
                    service.marketId,
                    selected.id,
                    status<MarketMembershipStatus>(data, membershipStatuses),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <SelectField name="vendor" label="Vendor business">
                {directory.data.items.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.slug})
                  </option>
                ))}
              </SelectField>
              <Choice
                name="status"
                label="Initial business membership status"
                choices={membershipStatuses}
                value="pending"
              />
            </CommandForm>
          ) : (
            <EmptyState title="No eligible Vendors match" />
          )}
        </>
      )}
    </Dialog>
  );
}

function Relationship({
  service,
  state,
  refresh,
  controls,
  tab,
}: {
  service: MarketService;
  state: MarketRelationshipState;
  refresh: () => void;
  controls: (kind: keyof MarketDetailPages, label: string) => ReactNode;
  tab: 'memberships' | 'participation' | 'listings' | 'offerings';
}) {
  const member = state.membership;
  const [range, setRange] = useState(initialRange);
  const [choiceSkip, setChoiceSkip] = useState(0);
  const bounds = dateBounds(range.from, range.through);
  const occurrencesRead = useCallback(
    () =>
      service.occurrencePage({
        take: 20,
        skip: choiceSkip,
        from: bounds.from,
        through: bounds.through,
      }),
    [service, bounds.from, bounds.through, choiceSkip],
  );
  const occurrences = useRead(
    `${service.readKey}:participation-choices:${bounds.from}:${bounds.through}:${choiceSkip}`,
    occurrencesRead,
  );
  const configRead = useCallback(
    () => service.configuration(service.marketId),
    [service],
  );
  const config = useRead(`${service.readKey}:relationship-config`, configRead);
  const canMembership = mayMarketCommand(
    service.context,
    'ManageOwnMarketMemberships',
  );
  const canListing = mayMarketCommand(
    service.context,
    'ManageOwnMarketListings',
  );
  const canParticipation = mayMarketCommand(
    service.context,
    'ManageOwnMarketOccurrences',
  );
  const canOffering = mayMarketCommand(
    service.context,
    'ManageOwnMarketOfferings',
  );
  return (
    <>
      <div className="ops-toolbar">
        {(
          ['memberships', 'participation', 'listings', 'offerings'] as const
        ).map((page) => (
          <RouteLink key={page} to={`/market/vendors/${page}/${member.id}`}>
            {page === 'memberships'
              ? 'Business membership'
              : page === 'participation'
                ? 'Occurrence participation'
                : page === 'listings'
                  ? 'Listing approvals'
                  : 'Product offerings'}
          </RouteLink>
        ))}
      </div>
      <p>
        {member.vendor.name} · Business membership {member.status} · version{' '}
        {member.version}
      </p>
      <p>
        Business membership, listing approval, participation, offering and
        publication are independent states.
      </p>
      <RuleSummary rule={member.preorderDefault} />
      {tab === 'memberships' && (
        <>
          {canMembership && (
            <CommandForm
              title="Business membership"
              onDone={refresh}
              submitLabel="Update membership"
              run={(data) =>
                service.membershipStatus(
                  service.marketId,
                  member.vendorId,
                  status<MarketMembershipStatus>(data, membershipStatuses),
                  member.version,
                )
              }
              confirm={(data) =>
                ['suspended', 'withdrawn'].includes(text(data, 'status'))
                  ? 'Change this business relationship? This does not delete the Vendor, Products, orders or customer relationships.'
                  : undefined
              }
            >
              <Choice
                name="status"
                label="Business membership status"
                choices={membershipStatuses}
                value={member.status}
              />
            </CommandForm>
          )}
        </>
      )}
      {tab === 'listings' && (
        <>
          <p>
            Labels reflect the current Vendor catalog. Approval, publication and
            offering availability remain separate.
          </p>
          {controls('listings', 'Listing pages')}
          {state.listings.length ? (
            <DataTable
              label="Listing approvals (backend order)"
              headings={[
                'Listing',
                'Variant',
                'Approval',
                'Publication',
                'Version',
              ]}
            >
              {state.listings.map((row) => (
                <tr key={row.id}>
                  <td>Listing reference {row.id}</td>
                  <td>
                    {row.variant.product.name}
                    <small>
                      {row.variant.name} · {row.variant.sku}
                    </small>
                  </td>
                  <td>{row.status}</td>
                  <td>
                    <Badge>{row.publication.state}</Badge>
                  </td>
                  <td>{row.version}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="No listings returned" />
          )}
          {canListing &&
            state.listings.map((listing) => (
              <CommandForm
                key={`listing:${listing.id}:${listing.version}`}
                title={`Listing reference ${listing.id}`}
                onDone={refresh}
                submitLabel="Update listing approval"
                run={(data) =>
                  service.approveListing(
                    listing.id,
                    listing.version,
                    status<MarketListingStatus>(data, listingStatuses),
                  )
                }
                confirm={(data) =>
                  text(data, 'status') === 'withdrawn'
                    ? 'Withdraw this listing approval? This does not delete the Product or act as a refund.'
                    : undefined
                }
              >
                <Choice
                  name="status"
                  label="Listing approval status"
                  choices={listingStatuses}
                  value={
                    listing.status === 'pending' ? 'approved' : listing.status
                  }
                />
              </CommandForm>
            ))}
        </>
      )}
      {tab === 'participation' && (
        <>
          {controls('occurrences', 'Relationship occurrence pages')}
          {state.occurrences.length > 0 && (
            <DataTable
              label="Relationship occurrence history"
              headings={['Occurrence', 'Status']}
            >
              {state.occurrences.map((row) => (
                <tr key={row.id}>
                  <td>
                    <RouteLink to={`/market/occurrences/${row.id}`}>
                      {row.localStartsAt} ({row.timezone})
                    </RouteLink>
                  </td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </DataTable>
          )}
          {controls('participations', 'Participation pages')}
          {state.participations.length ? (
            <DataTable
              label="Occurrence participation (backend order)"
              headings={[
                'Occurrence',
                'Participation',
                'Pickup instructions',
                'Version',
              ]}
            >
              {state.participations.map((row) => (
                <tr key={row.id}>
                  <td>
                    <RouteLink to={`/market/occurrences/${row.occurrenceId}`}>
                      Occurrence reference {row.occurrenceId}
                    </RouteLink>
                  </td>
                  <td>{row.status}</td>
                  <td>{row.pickupInstructions || 'Not provided'}</td>
                  <td>{row.version}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="No participation returned" />
          )}
          {canParticipation &&
            state.participations.map((row) => (
              <CommandForm
                key={`participation:${row.id}:${row.version}`}
                title={`Participation for occurrence ${row.occurrenceId}`}
                onDone={refresh}
                submitLabel="Update participation"
                validate={(data) => {
                  status(data, participationStatuses);
                  if (data.has('useOverride')) ruleInput(data);
                }}
                run={(data) =>
                  service.participation({
                    membershipId: member.id,
                    occurrenceId: row.occurrenceId,
                    expectedVersion: row.version,
                    status: status(data, participationStatuses),
                    pickupInstructions: text(data, 'pickupInstructions'),
                    preorderOverride: config.data?.overridePolicy
                      .participationAllowed
                      ? data.has('useOverride')
                        ? ruleInput(data)
                        : null
                      : row.preorderOverride,
                  })
                }
                confirm={(data) =>
                  text(data, 'status') === 'cancelled'
                    ? 'Cancel this Vendor participation? This changes participation only and does not issue refunds or prove attendance.'
                    : undefined
                }
              >
                <Choice
                  name="status"
                  label="Participation status"
                  value={row.status}
                  choices={participationStatuses}
                />
                <TextField
                  name="pickupInstructions"
                  label="Participation pickup instructions"
                  value={row.pickupInstructions}
                  required={false}
                  maxLength={2000}
                />
                {config.data?.overridePolicy.participationAllowed ? (
                  <RuleFields rule={row.preorderOverride} optional />
                ) : (
                  <RuleSummary rule={row.preorderOverride} />
                )}
              </CommandForm>
            ))}
          {canParticipation && (
            <>
              <RangeForm
                range={range}
                onChange={(value) => {
                  setRange(value);
                  setChoiceSkip(0);
                }}
              />
              <ReadState {...occurrences} retry={occurrences.refresh} />
              {occurrences.data && (
                <PageControls
                  label="Participation occurrence choices"
                  skip={choiceSkip}
                  page={occurrences.data}
                  change={setChoiceSkip}
                />
              )}
              {occurrences.data &&
                (occurrences.data.items.filter(
                  (row) =>
                    !state.participations.some(
                      (p) => p.occurrenceId === row.id,
                    ),
                ).length ? (
                  <CommandForm
                    title="Add occurrence participation"
                    onDone={refresh}
                    submitLabel="Add participation"
                    run={(data) =>
                      service.participation({
                        membershipId: member.id,
                        occurrenceId: text(data, 'occurrenceId'),
                        expectedVersion: null,
                        status: status(data, participationStatuses),
                        pickupInstructions: text(data, 'pickupInstructions'),
                        preorderOverride: data.has('useOverride')
                          ? ruleInput(data)
                          : null,
                      })
                    }
                  >
                    <SelectField name="occurrenceId" label="Occurrence">
                      <>
                        {occurrences.data.items
                          .filter(
                            (row) =>
                              !state.participations.some(
                                (p) => p.occurrenceId === row.id,
                              ),
                          )
                          .map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.localStartsAt} ({row.timezone}), {row.status}
                            </option>
                          ))}
                      </>
                    </SelectField>
                    <Choice
                      name="status"
                      label="New participation status"
                      choices={['planned', 'confirmed']}
                      value="planned"
                    />
                    <TextField
                      name="pickupInstructions"
                      label="New participation pickup instructions"
                      required={false}
                      maxLength={2000}
                    />
                    {config.data?.overridePolicy.participationAllowed && (
                      <RuleFields rule={null} optional />
                    )}
                  </CommandForm>
                ) : (
                  <p>No additional occurrences in this date view.</p>
                ))}
            </>
          )}
          <ReadState {...config} retry={config.refresh} />
        </>
      )}
      {tab === 'offerings' && (
        <>
          {controls('offerings', 'Offering pages')}
          {state.offerings.length ? (
            <DataTable
              label="Market offerings (backend order)"
              headings={[
                'Offering',
                'Enabled',
                'Preorders',
                'Sales cap',
                'Effective window',
                'Version',
              ]}
            >
              {state.offerings.map((row) => (
                <tr key={row.id}>
                  <td>Variant reference {row.variantId}</td>
                  <td>{String(row.enabled)}</td>
                  <td>{String(row.preorderEnabled)}</td>
                  <td>{row.salesCap ?? 'No cap configured'}</td>
                  <td>
                    {date(
                      row.effectivePreorderOpensAt,
                      row.windowProvenance.timezone,
                    )}{' '}
                    to{' '}
                    {date(
                      row.effectivePreorderClosesAt,
                      row.windowProvenance.timezone,
                    )}
                    <small>
                      {row.windowProvenance.timezone} ·{' '}
                      {row.windowProvenance.source}
                    </small>
                  </td>
                  <td>{row.version}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="No offerings returned" />
          )}
          <p>
            The occurrence sales cap is separate from Vendor physical inventory.
            Effective windows come from the backend. A window is domain/time
            configuration, not stock availability or checkout authorization.
          </p>
          {state.offerings.map((row) => (
            <OfferingDetail
              key={row.id}
              offering={row}
              service={service}
              refresh={refresh}
              editable={canOffering}
            />
          ))}
          {canOffering &&
            state.participations.length > 0 &&
            state.listings.length > 0 && (
              <CommandForm
                title="Create offering"
                onDone={refresh}
                submitLabel="Create offering"
                validate={(data) => {
                  cap(data);
                  const participationId = text(data, 'participationId'),
                    listingId = text(data, 'listingId');
                  const listing = state.listings.find(
                    (row) => row.id === listingId,
                  );
                  if (
                    !listing ||
                    state.offerings.some(
                      (row) =>
                        row.participationId === participationId &&
                        row.variantId === listing.variantId,
                    )
                  )
                    throw new AppError('validation');
                }}
                run={(data) => {
                  const listing = state.listings.find(
                    (row) => row.id === text(data, 'listingId'),
                  );
                  if (!listing) throw new AppError('validation');
                  return service.offering({
                    participationId: text(data, 'participationId'),
                    listingId: listing.id,
                    variantId: listing.variantId,
                    expectedVersion: null,
                    enabled: data.has('enabled'),
                    preorderEnabled: data.has('preorderEnabled'),
                    salesCap: cap(data),
                  });
                }}
              >
                <SelectField
                  name="participationId"
                  label="Offering participation"
                >
                  {state.participations.map((row) => (
                    <option key={row.id} value={row.id}>
                      Occurrence {row.occurrenceId}, {row.status}
                    </option>
                  ))}
                </SelectField>
                <SelectField name="listingId" label="Offering listing">
                  {state.listings.map((row) => (
                    <option key={row.id} value={row.id}>
                      Variant reference {row.variantId}, {row.status}
                    </option>
                  ))}
                </SelectField>
                <Toggle name="enabled" label="Offering enabled" value={false} />
                <Toggle
                  name="preorderEnabled"
                  label="Preorders enabled"
                  value={false}
                />
                <TextField
                  name="salesCap"
                  label="Occurrence sales cap (optional)"
                  required={false}
                  type="number"
                />
              </CommandForm>
            )}
        </>
      )}
    </>
  );
}
function OfferingDetail({
  offering: row,
  service,
  refresh,
  editable,
}: {
  offering: Offering;
  service: MarketService;
  refresh: () => void;
  editable: boolean;
}) {
  return (
    <div className="record-details">
      <p>
        Offering reference {row.id}. Materialized window:{' '}
        {row.effectivePreorderOpensAt} to {row.effectivePreorderClosesAt} (UTC).
      </p>
      <p>
        Provenance {row.windowProvenance.source}; timezone{' '}
        {row.windowProvenance.timezone}; Market version{' '}
        {row.windowProvenance.marketVersion}; occurrence{' '}
        {row.windowProvenance.occurrenceVersion}; membership{' '}
        {row.windowProvenance.membershipVersion}; participation{' '}
        {row.windowProvenance.participationVersion}; policy{' '}
        {row.windowProvenance.policyVersion}.
      </p>
      {editable && (
        <>
          <CommandForm
            title={`Configure offering ${row.id}`}
            onDone={refresh}
            submitLabel="Save offering"
            validate={(data) => {
              cap(data);
            }}
            run={(data) =>
              service.offering({
                participationId: row.participationId,
                listingId: row.listingId,
                variantId: row.variantId,
                expectedVersion: row.version,
                enabled: data.has('enabled'),
                preorderEnabled: data.has('preorderEnabled'),
                salesCap: cap(data),
              })
            }
          >
            <Toggle
              name="enabled"
              label="Offering enabled"
              value={row.enabled}
            />
            <Toggle
              name="preorderEnabled"
              label="Preorders enabled"
              value={row.preorderEnabled}
            />
            <TextField
              name="salesCap"
              label="Occurrence sales cap (optional)"
              type="number"
              required={false}
              value={row.salesCap ?? ''}
            />
          </CommandForm>
          <CommandForm
            title={`Rematerialize window ${row.id}`}
            onDone={refresh}
            submitLabel="Apply current window configuration"
            run={() => service.rematerialize(row.id, row.version)}
          >
            <p>
              Explicitly apply the current permitted configuration to this
              materialized preorder window. Existing backend version and
              future-occurrence guards apply.
            </p>
          </CommandForm>
        </>
      )}
    </div>
  );
}
