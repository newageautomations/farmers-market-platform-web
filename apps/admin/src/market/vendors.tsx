import { cardClassName } from '@market/ui/presentation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  AppError,
  type MarketOrganizerRelationshipState as MarketRelationshipState,
  type MarketDetailPages,
  type Offering,
  type MarketMembershipStatus,
  type MarketListingStatus,
} from '@market/api';
import { mayMarketCommand } from '@market/admin-core';
import { Card, Button, EmptyState, Pagination } from '@market/ui';
import type { MarketService } from './service';
import {
  MarketDialog as Dialog,
  StatusBadge as Badge,
  SearchSelect,
} from './presentation';
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
      {!id && (
        <>
          <form
            className={cardClassName({
              className: 'dashboard-card ui-control-row ui-control-row-lookup',
            })}
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
            <div className="ui-field-action">
              <Button type="submit">Search relationships</Button>
            </div>
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
                headings={['Vendor', 'Membership', 'Preorder default']}
                sort={{ heading: 'Vendor', direction: 'ascending' }}
              >
                {list.data.items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <RouteLink to={`/market/vendors/${tab}/${member.id}`}>
                        {member.vendor.name}
                      </RouteLink>
                    </td>
                    <td>
                      <Badge>{member.status}</Badge>
                    </td>
                    <td>
                      {member.preorderDefault
                        ? 'Configured by Vendor'
                        : 'Uses Market default'}
                    </td>
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
        {page.totalItems} records. Showing {page.items.length ? skip + 1 : 0} to{' '}
        {page.items.length ? skip + page.items.length : 0}.
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
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    null,
  );
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const read = useCallback(
    () => service.eligibleVendors({ take: 20, skip: 0, search }),
    [service, search],
  );
  const directory = useRead(
    `${service.readKey}:eligible-vendors:${search}`,
    read,
  );
  const searching = directory.loading || query !== search;
  return (
    <Dialog
      open
      title="Add Vendor"
      busy={busy}
      onClose={close}
      showClose={false}
    >
      {(dismiss) => (
        <>
          <ReadState {...directory} retry={directory.refresh} />
          <CommandForm
            embedded
            title="New Vendor relationship"
            submitLabel="Create relationship"
            onPendingChange={setBusy}
            validate={() => {
              if (!selected) throw new AppError('validation');
            }}
            secondaryAction={
              <Button variant="secondary" disabled={busy} onClick={dismiss}>
                Close
              </Button>
            }
            onDone={() => {
              refresh();
              close();
            }}
            run={async (data) => {
              if (!selected || selected.id !== text(data, 'vendor'))
                throw new AppError('validation');
              return service.membershipStatus(
                service.marketId,
                selected.id,
                status<MarketMembershipStatus>(data, membershipStatuses),
              );
            }}
          >
            <SearchSelect
              label="Vendor business"
              placeholder="Search vendor businesses"
              value={selected?.id ?? ''}
              selectedLabel={selected?.name}
              onSearch={setQuery}
              loading={searching}
              disabled={busy}
              allowClear
              onChange={(id) => {
                if (!id) {
                  setSelected(null);
                  return;
                }
                const vendor = directory.data?.items.find((v) => v.id === id);
                if (vendor) setSelected({ id: vendor.id, name: vendor.name });
              }}
              options={(directory.data?.items ?? []).map((v) => ({
                value: v.id,
                label: v.name,
              }))}
              searchHint={
                directory.data &&
                directory.data.totalItems > directory.data.items.length
                  ? 'Type more of the business name to narrow these results.'
                  : undefined
              }
            />
            <input type="hidden" name="vendor" value={selected?.id ?? ''} />
            <Choice
              name="status"
              label="Initial business membership status"
              choices={membershipStatuses}
              value="pending"
            />
          </CommandForm>
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
  const [editing, setEditing] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const close = () => setEditing(null);
  const saved = () => {
    close();
    refresh();
  };
  const occurrenceName = (id: string) => {
    const occurrence = state.occurrences.find((o) => o.id === id);
    return occurrence
      ? date(occurrence.startsAt, occurrence.timezone)
      : `Market Date ${id}`;
  };
  const productName = (variantId: string) => {
    const listing = state.listings.find((l) => l.variantId === variantId);
    return listing
      ? `${listing.variant.product.name} / ${listing.variant.name}`
      : 'Product Offering';
  };
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
      <h2 className="ui-section-title-dashboard">{member.vendor.name}</h2>
      {tab === 'memberships' && (
        <>
          {!canMembership && (
            <p>
              <Badge>{member.status}</Badge>
            </p>
          )}
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
          {controls('listings', 'Listing pages')}
          {state.listings.length ? (
            <DataTable
              label="Listing approvals"
              headings={['Variant', 'Approval', 'Publication']}
            >
              {state.listings.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Button
                      className="secondary"
                      onClick={() => setEditing(`listing:${row.id}`)}
                    >
                      {row.variant.product.name}
                    </Button>
                    <small>
                      {row.variant.name} · {row.variant.sku}
                    </small>
                  </td>
                  <td>
                    <Badge>{row.status}</Badge>
                  </td>
                  <td>
                    <Badge>{row.publication.state}</Badge>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="No listings returned" />
          )}
          {state.listings
            .filter((listing) => editing === `listing:${listing.id}`)
            .map((listing) => (
              <Dialog
                key={listing.id}
                open
                title={listing.variant.product.name}
                busy={modalBusy}
                onClose={close}
                showClose={!canListing}
              >
                {(dismiss) => (
                  <>
                    {canListing ? (
                      <CommandForm
                        embedded
                        key={`listing:${listing.id}:${listing.version}`}
                        title="Listing Approval"
                        secondaryAction={
                          <Button
                            variant="secondary"
                            disabled={modalBusy}
                            onClick={dismiss}
                          >
                            Close
                          </Button>
                        }
                        onPendingChange={setModalBusy}
                        onDone={saved}
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
                            listing.status === 'pending'
                              ? 'approved'
                              : listing.status
                          }
                        />
                      </CommandForm>
                    ) : (
                      <Badge>{listing.status}</Badge>
                    )}
                  </>
                )}
              </Dialog>
            ))}
        </>
      )}
      {tab === 'participation' && (
        <ParticipationPanel
          service={service}
          state={state}
          refresh={refresh}
          editable={canParticipation}
        />
      )}
      {tab === 'offerings' && (
        <>
          {controls('offerings', 'Offering pages')}
          {state.offerings.length ? (
            <DataTable
              label="Product offerings"
              headings={[
                'Offering',
                'Enabled',
                'Preorders',
                'Sales cap',
                'Effective window',
              ]}
            >
              {state.offerings.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Button
                      className="secondary"
                      onClick={() => setEditing(`offering:${row.id}`)}
                    >
                      {productName(row.variantId)}
                    </Button>
                  </td>
                  <td>
                    <Badge>{row.enabled ? 'enabled' : 'disabled'}</Badge>
                  </td>
                  <td>
                    <Badge>
                      {row.preorderEnabled ? 'enabled' : 'disabled'}
                    </Badge>
                  </td>
                  <td>{row.salesCap ?? 'No limit'}</td>
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
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState title="No offerings returned" />
          )}
          {state.offerings
            .filter((row) => editing === `offering:${row.id}`)
            .map((row) => (
              <Dialog
                key={row.id}
                open
                title={productName(row.variantId)}
                busy={modalBusy}
                onClose={close}
              >
                <OfferingDetail
                  offering={row}
                  service={service}
                  refresh={saved}
                  editable={canOffering}
                  onPendingChange={setModalBusy}
                />
              </Dialog>
            ))}
          {canOffering &&
            state.participations.length > 0 &&
            state.listings.length > 0 && (
              <>
                <Button onClick={() => setEditing('new-offering')}>
                  Create Offering
                </Button>
                {editing === 'new-offering' && (
                  <Dialog
                    open
                    title="Create Offering"
                    busy={modalBusy}
                    onClose={close}
                    showClose={false}
                  >
                    {(dismiss) => (
                      <>
                        <CommandForm
                          embedded
                          title="Offering Details"
                          secondaryAction={
                            <Button
                              variant="secondary"
                              disabled={modalBusy}
                              onClick={dismiss}
                            >
                              Close
                            </Button>
                          }
                          onPendingChange={setModalBusy}
                          onDone={saved}
                          submitLabel="Create offering"
                          validate={(data) => {
                            cap(data);
                            const participationId = text(
                                data,
                                'participationId',
                              ),
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
                                {occurrenceName(row.occurrenceId)}
                              </option>
                            ))}
                          </SelectField>
                          <SelectField
                            name="listingId"
                            label="Offering listing"
                          >
                            {state.listings.map((row) => (
                              <option key={row.id} value={row.id}>
                                {row.variant.product.name} / {row.variant.name}
                              </option>
                            ))}
                          </SelectField>
                          <Toggle
                            name="enabled"
                            label="Offering enabled"
                            value={false}
                          />
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
                      </>
                    )}
                  </Dialog>
                )}
              </>
            )}
        </>
      )}
    </>
  );
}
function ParticipationPanel({
  service,
  state,
  refresh,
  editable,
}: {
  service: MarketService;
  state: MarketRelationshipState;
  refresh: () => void;
  editable: boolean;
}) {
  const [range, setRange] = useState(initialRange);
  const [skip, setSkip] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bounds = dateBounds(range.from, range.through);
  const load = useCallback(
    () =>
      service.occurrencePage({
        take: 20,
        skip,
        from: bounds.from,
        through: bounds.through,
      }),
    [service, skip, bounds.from, bounds.through],
  );
  const occurrences = useRead(
    `${service.readKey}:participation-dates:${bounds.from}:${bounds.through}:${skip}`,
    load,
  );
  // Read every participation page so a date on a later page cannot be mistaken for a new participation.
  const loadParticipation = useCallback(async () => {
    let rows: MarketRelationshipState['participations'] = [];
    let offset = 0;
    while (true) {
      const page = (
        await service.relationshipDetail(state.membership.id, {
          participations: offset,
        })
      ).participations;
      rows = [...rows, ...page.items];
      offset += page.items.length;
      if (offset >= page.totalItems) return rows;
      if (!page.items.length) throw new AppError('unavailable');
    }
  }, [service, state.membership.id]);
  const participations = useRead(
    `${service.readKey}:all-participations:${state.membership.id}`,
    loadParticipation,
  );
  const configRead = useCallback(
    () => service.configuration(service.marketId),
    [service],
  );
  const config = useRead(`${service.readKey}:participation-config`, configRead);
  const occurrence = occurrences.data?.items.find((o) => o.id === selected);
  const row = participations.data?.find((p) => p.occurrenceId === selected);
  return (
    <>
      <RangeForm
        range={range}
        onChange={(value) => {
          setRange(value);
          setSkip(0);
        }}
      />
      <ReadState {...occurrences} retry={occurrences.refresh} />
      <ReadState {...participations} retry={participations.refresh} />
      {occurrences.data && participations.data && (
        <>
          <DataTable
            label="Occurrence participation"
            headings={['Occurrence', 'Participation', 'Pickup Instructions']}
          >
            {occurrences.data.items.map((o) => {
              const participation = participations.data!.find(
                (p) => p.occurrenceId === o.id,
              );
              return (
                <tr key={o.id}>
                  <td>
                    <Button
                      className="secondary"
                      onClick={() => setSelected(o.id)}
                    >
                      {date(o.startsAt, o.timezone)}
                    </Button>
                  </td>
                  <td>
                    <Badge>
                      {participation?.status ?? 'not participating'}
                    </Badge>
                  </td>
                  <td>{participation?.pickupInstructions || 'Not provided'}</td>
                </tr>
              );
            })}
          </DataTable>
          {!occurrences.data.items.length && (
            <EmptyState title="No occurrences in these dates" />
          )}
          <PageControls
            label="Participation occurrence pages"
            skip={skip}
            page={occurrences.data}
            change={setSkip}
          />
        </>
      )}
      {occurrence && (
        <Dialog
          open
          title={date(occurrence.startsAt, occurrence.timezone)}
          busy={busy}
          onClose={() => setSelected(null)}
          showClose={!editable || !config.data}
        >
          {(dismiss) => (
            <>
              <ReadState {...config} retry={config.refresh} />
              {editable && config.data ? (
                <CommandForm
                  embedded
                  title="Occurrence Participation"
                  secondaryAction={
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={dismiss}
                    >
                      Close
                    </Button>
                  }
                  onPendingChange={setBusy}
                  submitLabel="Save and Close"
                  onDone={() => {
                    setSelected(null);
                    participations.refresh();
                    refresh();
                  }}
                  validate={(data) => {
                    status(data, participationStatuses);
                    if (data.has('useOverride')) ruleInput(data);
                  }}
                  run={(data) =>
                    service.participation({
                      membershipId: state.membership.id,
                      occurrenceId: occurrence.id,
                      expectedVersion: row?.version ?? null,
                      status: status(data, participationStatuses),
                      pickupInstructions: text(data, 'pickupInstructions'),
                      preorderOverride: config.data!.overridePolicy
                        .participationAllowed
                        ? data.has('useOverride')
                          ? ruleInput(data)
                          : null
                        : (row?.preorderOverride ?? null),
                    })
                  }
                  confirm={(data) =>
                    text(data, 'status') === 'cancelled'
                      ? 'Cancel this vendor participation? Existing orders will need to be handled separately.'
                      : undefined
                  }
                >
                  <Choice
                    name="status"
                    label="Participation status"
                    value={row?.status ?? 'planned'}
                    choices={participationStatuses}
                  />
                  <TextField
                    name="pickupInstructions"
                    label="Participation pickup instructions"
                    value={row?.pickupInstructions ?? ''}
                    required={false}
                    maxLength={2000}
                  />
                  {config.data.overridePolicy.participationAllowed && (
                    <RuleFields rule={row?.preorderOverride ?? null} optional />
                  )}
                </CommandForm>
              ) : (
                !editable && <Badge>{row?.status ?? 'not participating'}</Badge>
              )}
            </>
          )}
        </Dialog>
      )}
    </>
  );
}

function OfferingDetail({
  offering: row,
  service,
  refresh,
  editable,
  onPendingChange,
}: {
  offering: Offering;
  service: MarketService;
  refresh: () => void;
  editable: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  return (
    <Card as="div" className="record-details">
      <p>
        Preorders:{' '}
        {date(row.effectivePreorderOpensAt, row.windowProvenance.timezone)} to{' '}
        {date(row.effectivePreorderClosesAt, row.windowProvenance.timezone)}
      </p>
      {editable && (
        <>
          <CommandForm
            embedded
            title="Offering Settings"
            onPendingChange={onPendingChange}
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
            embedded
            title="Preorder Schedule"
            onPendingChange={onPendingChange}
            onDone={refresh}
            submitLabel="Apply current window configuration"
            run={() => service.rematerialize(row.id, row.version)}
          >
            <p>Update this offering to use the current preorder schedule.</p>
          </CommandForm>
        </>
      )}
    </Card>
  );
}
