import { useCallback, useEffect, useId, useState } from 'react';
import {
  AppError,
  safeError,
  type MarketOrganizerRelationshipState as MarketRelationshipState,
  type Offering,
  type MarketMembershipStatus,
} from '@market/api';
import { mayMarketCommand } from '@market/admin-core';
import {
  Dialog as UiDialog,
  EmptyState,
  ErrorState,
  Field,
  UtilityIcon,
} from '@market/ui';
import { MarketsPagination } from '../vendor/MarketsPagination';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import type { MarketService } from './service';
import { MarketDialog as Dialog, StatusBadge as Badge } from './presentation';
import {
  CommandForm,
  calendarDate,
  date,
  dateBounds,
  ReadState,
  RuleFields,
  RuleSummary,
  ruleInput,
  text,
  TextField,
  useRead,
} from './common';
import { WorkspaceMenu } from '../WorkspaceMenu';
import { Fact, Panel } from '../vendor/application-detail';
import { VendorsWorkspace, inApp, vendorRows } from './VendorsWorkspace';
import { VendorNotesDialog } from './VendorNotes';
import { ListingReview } from './ListingReview';
import { periodRange, periods } from './occurrences';
import { addDays, readableDate } from './occurrences-data';
import { OrdersDateRange } from '../vendor/OrdersDateRange';
import '../vendor/orders.css';
import {
  AccountBadge,
  ComplianceSummary,
  useVendorCompliance,
} from './vendor-compliance';
import '@market/ui/farmstand.css';
import '../vendor/markets-workspace.css';
import './market-occurrences.css';
// Listing thumbnails reuse the Catalog's product photo cell.
import '../vendor/catalog-workspace.css';
import './vendors.css';

const membershipStatuses = [
  'pending',
  'approved',
  'suspended',
  'withdrawn',
] as const;
const participationStatuses = ['planned', 'confirmed', 'cancelled'] as const;
function status<T extends string>(data: FormData, values: readonly T[]): T {
  const candidate = text(data, 'status');
  const selected = values.find((value) => value === candidate);
  if (!selected) throw new AppError('validation');
  return selected;
}
const PAGE = 10;
/** Reads every page of a 20-row detail read so filters cover all records. */
function readAllPages<T>(
  read: (skip: number) => Promise<{ items: readonly T[]; totalItems: number }>,
) {
  return async () => {
    const rows: T[] = [];
    for (let skip = 0; skip < 2000; skip += 20) {
      const page = await read(skip);
      rows.push(...page.items);
      if (!page.items.length || rows.length >= page.totalItems) break;
    }
    return rows;
  };
}
function pageSummary(total: number, page: number) {
  return `${total} ${total === 1 ? 'record' : 'records'}. Showing ${total ? page * PAGE + 1 : 0} to ${Math.min((page + 1) * PAGE, total)}.`;
}
/** A select used as a table filter, labelled for screen readers only. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
  icon?: 'calendar-days';
}) {
  const id = useId();
  return (
    <Field id={id} label={<span className="sr-only">{label}</span>}>
      <FarmstandSelect
        id={id}
        icon={icon}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </FarmstandSelect>
    </Field>
  );
}
type Tab = 'memberships' | 'participation' | 'listings' | 'offerings';
const tabs: Array<{ value: Tab; label: string; icon: 'info' | 'calendar-days' | 'circle-check' | 'shopping-cart' }> = [
  { value: 'memberships', label: 'Overview', icon: 'info' },
  { value: 'participation', label: 'Market dates', icon: 'calendar-days' },
  { value: 'listings', label: 'Listing approvals', icon: 'circle-check' },
  { value: 'offerings', label: 'Products by date', icon: 'shopping-cart' },
];
const tabHash: Record<Tab, string> = {
  memberships: '',
  participation: '#market-dates',
  listings: '#listings',
  offerings: '#products-by-date',
};
function hashTab(): Tab | undefined {
  return (Object.keys(tabHash) as Tab[]).find(
    (tab) => tabHash[tab] && tabHash[tab] === window.location.hash,
  );
}
/** Membership status as a Farmstand select; submitted with the form data. */
function StatusSelect({
  name = 'status',
  label,
  value,
  choices,
  labels = {},
}: {
  name?: string;
  label: string;
  value: string;
  choices: readonly string[];
  labels?: Record<string, string>;
}) {
  const id = useId();
  const [selected, setSelected] = useState(value);
  return (
    <Field id={id} label={label}>
      <FarmstandSelect
        id={id}
        name={name}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
      >
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {labels[choice] ?? choice[0]!.toUpperCase() + choice.slice(1)}
          </option>
        ))}
      </FarmstandSelect>
    </Field>
  );
}

/** `/market/vendors` lists every business; `/market/vendors/:tab/:id` is one Vendor. */
export function MarketVendors({
  service,
  id,
  tab = 'memberships',
  adding = false,
}: {
  service: MarketService;
  id?: string;
  tab?: Tab;
  adding?: boolean;
}) {
  if (!id) return <VendorsWorkspace service={service} adding={adding} />;
  return <VendorDetail service={service} id={id} tab={tab} />;
}

function VendorDetail({
  service,
  id,
  tab: initialTab,
}: {
  service: MarketService;
  id: string;
  tab: Tab;
}) {
  // A legacy `/market/vendors/:tab/:id` route names its view; otherwise the hash does.
  const base = `/market/vendors/memberships/${id}`;
  const [tab, setTab] = useState<Tab>(() =>
    initialTab !== 'memberships'
      ? initialTab
      : window.location.pathname === base
        ? (hashTab() ?? 'memberships')
        : 'memberships',
  );
  useEffect(() => {
    // Legacy `/market/vendors/:tab/:id` links open the same page and view.
    if (window.location.pathname !== base)
      window.history.replaceState(null, '', base + tabHash[tab]);
    const sync = () => setTab(hashTab() ?? 'memberships');
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
    // Only on mount: later changes come from the menu or history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function changeTab(next: Tab) {
    if (next === tab) return;
    window.history.pushState(null, '', base + tabHash[next]);
    setTab(next);
  }
  const detailRead = useCallback(
    () => service.relationshipDetail(id),
    [service, id],
  );
  const detail = useRead(
    `${service.readKey}:relationship:${id}`,
    detailRead,
  );
  return (
    <div className="application-detail vendor-detail farmstand-controls">
      <FarmstandLink
        href="/market/vendors"
        variant="secondary"
        onClick={(event) => inApp(event, '/market/vendors')}
        className="application-detail-back application-detail-arrow"
      >
        <FarmstandIcon name="arrow-left" />
        Back to Vendors
      </FarmstandLink>
      <ReadState
        loading={!detail.data && detail.loading}
        error={detail.error}
        retry={detail.refresh}
      />
      {detail.data && (
        <Relationship
          key={`${detail.data.membership.id}:${detail.data.membership.version}:${detail.data.listings.items.map((r) => r.version).join(',')}:${detail.data.participations.items.map((r) => r.version).join(',')}:${detail.data.offerings.items.map((r) => r.version).join(',')}`}
          service={service}
          tab={tab}
          onTab={changeTab}
          state={{
            membership: detail.data.membership,
            occurrences: detail.data.occurrences.items,
            participations: detail.data.participations.items,
            listings: detail.data.listings.items,
            offerings: detail.data.offerings.items,
          }}
          refresh={detail.refresh}
        />
      )}
    </div>
  );
}

function Relationship({
  service,
  state,
  refresh,
  tab,
  onTab,
}: {
  service: MarketService;
  state: MarketRelationshipState;
  refresh: () => void;
  tab: Tab;
  onTab: (tab: Tab) => void;
}) {
  const member = state.membership;
  const vendorId = Number(member.vendorId);
  const [editing, setEditing] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string>();
  const [toggleError, setToggleError] = useState<AppError>();
  /** A Market may only disable or re-enable a Vendor's existing offering. */
  async function toggleOffering(row: Offering, enabled: boolean) {
    setToggling(row.id);
    setToggleError(undefined);
    try {
      await service.offering({
        participationId: row.participationId,
        listingId: row.listingId,
        variantId: row.variantId,
        expectedVersion: row.version,
        enabled,
        preorderEnabled: row.preorderEnabled,
        salesCap: row.salesCap,
      });
      setEditing(null);
      allOfferings.refresh();
      refresh();
    } catch (cause) {
      setEditing(null);
      setToggleError(safeError(cause));
    } finally {
      setToggling(undefined);
    }
  }
  const close = () => setEditing(null);
  const saved = () => {
    close();
    refresh();
  };
  const listingsRead = useCallback(
    readAllPages((skip) =>
      service
        .relationshipDetail(member.id, { listings: skip })
        .then((d) => d.listings),
    ),
    [service, member.id],
  );
  const allListings = useRead(
    `${service.readKey}:all-listings:${member.id}:${member.version}`,
    listingsRead,
  );
  const offeringsRead = useCallback(
    readAllPages((skip) =>
      service
        .relationshipDetail(member.id, { offerings: skip })
        .then((d) => d.offerings),
    ),
    [service, member.id],
  );
  const allOfferings = useRead(
    `${service.readKey}:all-offerings:${member.id}`,
    offeringsRead,
    tab === 'offerings',
  );
  const participationsRead = useCallback(
    readAllPages((skip) =>
      service
        .relationshipDetail(member.id, { participations: skip })
        .then((d) => d.participations),
    ),
    [service, member.id],
  );
  const allParticipations = useRead(
    `${service.readKey}:offering-participations:${member.id}`,
    participationsRead,
    tab === 'offerings',
  );
  const occurrencesRead = useCallback(
    readAllPages((skip) =>
      service
        .relationshipDetail(member.id, { occurrences: skip })
        .then((d) => d.occurrences),
    ),
    [service, member.id],
  );
  const allOccurrences = useRead(
    `${service.readKey}:offering-dates:${member.id}`,
    occurrencesRead,
    tab === 'offerings',
  );
  const listings = allListings.data ?? state.listings;
  const occurrenceList = allOccurrences.data ?? state.occurrences;
  const participationList = allParticipations.data ?? state.participations;
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [listingPage, setListingPage] = useState(0);
  const [offeringDate, setOfferingDate] = useState('all');
  const [offeringStatus, setOfferingStatus] = useState('all');
  const [offeringPage, setOfferingPage] = useState(0);
  const occurrenceName = (id: string) => {
    const occurrence = occurrenceList.find((o) => o.id === id);
    return occurrence
      ? date(occurrence.startsAt, occurrence.timezone)
      : `Market Date ${id}`;
  };
  const productName = (variantId: string) => {
    const listing = listings.find((l) => l.variantId === variantId);
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
  // Private notes and any former external record live in the operations read.
  const notesAllowed =
    !!service.phase14 &&
    service.context.permissions.includes('ReadOwnMarketApplications');
  const operationsRead = useCallback(
    () => service.phase14!.read('DIRECTORY'),
    [service],
  );
  const operations = useRead(
    `${service.readKey}:vendor-notes`,
    operationsRead,
    notesAllowed,
  );
  const row = operations.data
    ? vendorRows([member], operations.data).find(
        (candidate) => candidate.membership?.id === member.id,
      )
    : undefined;
  const canNotes =
    notesAllowed && mayMarketCommand(service.context, 'ManageOwnMarketApplications');
  const compliance = useVendorCompliance(
    `${service.readKey}:vendor:${vendorId}`,
    [vendorId],
    service.notifications,
    service.documents,
  );
  const documentsHref = `/market/documents?vendor=${vendorId}#vendor-${vendorId}`;
  return (
    <>
      <header className="application-detail-heading">
        <div className="application-detail-title">
          <h1>{member.vendor.name}</h1>
          <AccountBadge state="LINK_VERIFIED" />
          <Badge>{member.status}</Badge>
        </div>
        {canNotes && (
          <div className="occurrence-detail-actions">
            <FarmstandButton
              variant="secondary"
              onClick={() => setEditing('notes')}
            >
              Edit private notes
            </FarmstandButton>
          </div>
        )}
      </header>
      <p className="occurrence-detail-lead">
        {member.vendor.name} manages its own business details on the platform.
        You manage its membership, market dates and product approvals, and can
        keep private notes.
      </p>
      <WorkspaceMenu
        label={`${member.vendor.name} sections`}
        value={tab}
        onChange={onTab}
        items={tabs.map((item) => ({
          value: item.value,
          label: item.label,
          href: `/market/vendors/memberships/${member.id}${tabHash[item.value]}`,
          icon: <FarmstandIcon name={item.icon} />,
        }))}
        className="vendor-detail-menu"
      />
      <div className="vendor-detail-view" key={tab}>
      {tab === 'memberships' && (
        <div className="application-detail-columns">
          <div className="application-detail-main">
            <Panel icon={{ farmstand: 'shield-check' }} title="Document compliance">
              <div className="vendor-panel-body">
                <ComplianceSummary
                  vendor={vendorId}
                  compliance={compliance}
                  untracked=""
                />
                <FarmstandLink
                  href={documentsHref}
                  variant="secondary"
                  className="application-detail-arrow vendor-detail-link"
                  onClick={(event) => inApp(event, documentsHref)}
                >
                  Open in Documents
                  <FarmstandIcon name="arrow-right" />
                </FarmstandLink>
              </div>
            </Panel>
            <Panel icon={{ farmstand: 'user-round' }} title="Membership">
              <div className="vendor-panel-body">
              {canMembership ? (
                <CommandForm
 submitClassName="farmstand-button"
                  embedded
                  hideTitle
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
                  <p className="vendor-panel-help">
                    Approved members can attend market dates and sell approved
                    products. Suspending or withdrawing keeps their history.
                  </p>
                  <StatusSelect
                    label="Business membership status"
                    choices={membershipStatuses}
                    value={member.status}
                  />
                </CommandForm>
              ) : (
                <p className="vendor-panel-help">
                  Membership is <Badge>{member.status}</Badge>. You do not have
                  permission to change it.
                </p>
              )}
              </div>
            </Panel>
          </div>
          <aside
            className="application-detail-sidebar"
            aria-label="Vendor details"
          >
            <Panel icon={{ farmstand: 'store' }} title="Vendor">
              <dl className="application-detail-summary">
                <Fact icon={{ farmstand: 'store' }} label="Business">
                  {member.vendor.name}
                </Fact>
                <Fact icon={{ farmstand: 'circle-check' }} label="Account">
                  Platform Vendor · {member.vendor.status}
                </Fact>
                <Fact icon={{ farmstand: 'user-round' }} label="Membership">
                  <Badge>{member.status}</Badge>
                </Fact>
                <Fact icon={{ farmstand: 'shopping-cart' }} label="Preorders">
                  {member.preorderDefault ? (
                    <RuleSummary rule={member.preorderDefault} />
                  ) : (
                    'Uses the market default'
                  )}
                </Fact>
              </dl>
              <p className="application-detail-note">
                Business name, contact and profile are managed by the Vendor
                and cannot be edited here.
              </p>
            </Panel>
            <Panel
              icon={{ farmstand: 'file-text' }}
              title="Private notes"
              aside={
                canNotes && (
                  <FarmstandButton
                    variant="tertiary"
                    onClick={() => setEditing('notes')}
                  >
                    Edit
                  </FarmstandButton>
                )
              }
            >
              <div className="vendor-panel-body">
              {!notesAllowed ? (
                <p className="vendor-panel-help">
                  Private notes are unavailable with your permissions.
                </p>
              ) : operations.loading && !row ? (
                <ReadState loading error={undefined} retry={() => {}} />
              ) : operations.error ? (
                <ReadState
                  loading={false}
                  error={operations.error}
                  retry={operations.refresh}
                />
              ) : (
                <p className="market-application-guidance vendor-notes-text">
                  {row?.notes || 'No notes yet. Notes are visible only to your market team.'}
                </p>
              )}
              </div>
            </Panel>
          </aside>
        </div>
      )}
      {tab === 'listings' && (
        <Panel icon={{ farmstand: 'circle-check' }} title="Listing approvals">
          <div className="vendor-panel-body">
          <p className="vendor-panel-help">
            Products the Vendor wants to sell at your market. Review each one
            and approve or deny it.
          </p>
          <div className="markets-filters vendor-detail-filters">
            <FilterSelect
              label="Approval"
              value={approvalFilter}
              onChange={(value) => {
                setApprovalFilter(value);
                setListingPage(0);
              }}
              options={[
                ['all', 'All approvals'],
                ['pending', 'Pending review'],
                ['approved', 'Approved'],
                ['withdrawn', 'Denied'],
              ]}
            />
          </div>
          <ReadState
            loading={allListings.loading && !allListings.data}
            error={allListings.error}
            retry={allListings.refresh}
          />
          {(() => {
            const visible = listings.filter(
              (l) => approvalFilter === 'all' || l.status === approvalFilter,
            );
            const current = Math.min(
              listingPage,
              Math.max(0, Math.ceil(visible.length / PAGE) - 1),
            );
            return visible.length ? (
              <div className="markets-list vendor-detail-table">
                <FarmstandTable
                  label="Listing approvals"
                  headings={['Product', 'Category', 'Approval', 'Publication', '']}
                >
                  {visible
                    .slice(current * PAGE, (current + 1) * PAGE)
                    .map((listing) => (
                      <tr key={listing.id}>
                        <th scope="row">
                          <div className="catalog-product-identity">
                            <div className="catalog-product-photo">
                              {listing.variant.image ? (
                                <img
                                  src={listing.variant.image}
                                  alt=""
                                  width="42"
                                  height="42"
                                  loading="lazy"
                                />
                              ) : (
                                <UtilityIcon name="store" />
                              )}
                            </div>
                            <div className="vendor-contact-cell">
                              <span>{listing.variant.product.name}</span>
                              <small>
                                {listing.variant.name} · {listing.variant.sku}
                              </small>
                            </div>
                          </div>
                        </th>
                        <td>
                          {listing.variant.product.category ?? (
                            <span className="markets-muted">Uncategorized</span>
                          )}
                        </td>
                        <td>
                          <Badge>
                            {listing.status === 'withdrawn'
                              ? 'denied'
                              : listing.status}
                          </Badge>
                        </td>
                        <td>
                          <Badge>{listing.publication.state}</Badge>
                        </td>
                        <td>
                          <FarmstandButton
                            variant="secondary"
                            aria-label={`${canListing ? 'Review' : 'View'} ${listing.variant.product.name}`}
                            onClick={() => setEditing(`listing:${listing.id}`)}
                          >
                            {canListing && listing.status === 'pending'
                              ? 'Review'
                              : 'View'}
                            <FarmstandIcon name="chevron-right" />
                          </FarmstandButton>
                        </td>
                      </tr>
                    ))}
                </FarmstandTable>
                <MarketsPagination
                  label="Listing pages"
                  summary={pageSummary(visible.length, current)}
                  hasPrevious={current > 0}
                  hasNext={(current + 1) * PAGE < visible.length}
                  onPrevious={() => setListingPage(current - 1)}
                  onNext={() => setListingPage(current + 1)}
                />
              </div>
            ) : (
              <EmptyState
                title={
                  listings.length ? 'No matching listings' : 'No listings yet'
                }
              >
                <p>
                  {listings.length
                    ? 'Try another approval filter.'
                    : 'Products this Vendor submits to your market appear here.'}
                </p>
              </EmptyState>
            );
          })()}
          {listings
            .filter((listing) => editing === `listing:${listing.id}`)
            .map((listing) => (
              <ListingReview
                key={listing.id}
                service={service}
                listing={listing}
                canReview={canListing}
                membershipApproved={member.status === 'approved'}
                onClose={close}
                onSaved={() => {
                  allListings.refresh();
                  saved();
                }}
              />
            ))}
          </div>
        </Panel>
      )}
      {tab === 'participation' && (
        <Panel icon={{ farmstand: 'calendar-days' }} title="Market dates">
          <div className="vendor-panel-body">
            <p className="vendor-panel-help">
              Market dates this Vendor plans to attend, with any pickup
              instructions for customers.
            </p>
            <ParticipationPanel
              service={service}
              state={state}
              refresh={refresh}
              editable={canParticipation}
            />
          </div>
        </Panel>
      )}
      {tab === 'offerings' && (
        <Panel icon={{ farmstand: 'shopping-cart' }} title="Products by date">
          <div className="vendor-panel-body">
          <p className="vendor-panel-help">
            The products this Vendor offers at each market date. The Vendor
            chooses what to sell, preorders and limits; you can disable a
            product for a date and re-enable it later.
          </p>
          {(() => {
            const offerings = allOfferings.data ?? state.offerings;
            const dateOf = (participationId: string) => {
              const participation = participationList.find(
                (p) => p.id === participationId,
              );
              return participation
                ? occurrenceList.find(
                    (o) => o.id === participation.occurrenceId,
                  )
                : undefined;
            };
            const dates = [
              ...new Map(
                offerings.flatMap((row) => {
                  const occurrence = dateOf(row.participationId);
                  return occurrence ? [[occurrence.id, occurrence]] : [];
                }),
              ).values(),
            ].sort((x, y) => Date.parse(x.startsAt) - Date.parse(y.startsAt));
            const visible = offerings
              .filter(
                (row) =>
                  (offeringDate === 'all' ||
                    dateOf(row.participationId)?.id === offeringDate) &&
                  (offeringStatus === 'all' ||
                    row.enabled === (offeringStatus === 'enabled')),
              )
              .sort(
                (x, y) =>
                  (Date.parse(dateOf(x.participationId)?.startsAt ?? '') ||
                    0) -
                    (Date.parse(dateOf(y.participationId)?.startsAt ?? '') ||
                      0) || productName(x.variantId).localeCompare(productName(y.variantId)),
              );
            const current = Math.min(
              offeringPage,
              Math.max(0, Math.ceil(visible.length / PAGE) - 1),
            );
            return (
              <>
                <div className="markets-filters vendor-detail-filters">
                  <FilterSelect
                    label="Market date"
                    icon="calendar-days"
                    value={offeringDate}
                    onChange={(value) => {
                      setOfferingDate(value);
                      setOfferingPage(0);
                    }}
                    options={[
                      ['all', 'All market dates'],
                      ...dates.map(
                        (o) => [o.id, date(o.startsAt, o.timezone)] as const,
                      ),
                    ]}
                  />
                  <FilterSelect
                    label="Status"
                    value={offeringStatus}
                    onChange={(value) => {
                      setOfferingStatus(value);
                      setOfferingPage(0);
                    }}
                    options={[
                      ['all', 'All statuses'],
                      ['enabled', 'Enabled'],
                      ['disabled', 'Disabled'],
                    ]}
                  />
                </div>
                <ReadState
                  loading={allOfferings.loading && !allOfferings.data}
                  error={
                    allOfferings.error ??
                    allParticipations.error ??
                    allOccurrences.error
                  }
                  retry={() => {
                    allOfferings.refresh();
                    allParticipations.refresh();
                    allOccurrences.refresh();
                  }}
                />
                {visible.length ? (
                  <div className="markets-list vendor-detail-table">
                    <FarmstandTable
                      label="Products by date"
                      headings={[
                        'Product',
                        'Market date',
                        'Status',
                        'Preorders',
                        'Sales cap',
                        '',
                      ]}
                    >
                      {visible
                        .slice(current * PAGE, (current + 1) * PAGE)
                        .map((row) => {
                          const occurrence = dateOf(row.participationId);
                          return (
                            <tr key={row.id}>
                              <th scope="row">{productName(row.variantId)}</th>
                              <td>
                                {occurrence
                                  ? date(occurrence.startsAt, occurrence.timezone)
                                  : 'Market date'}
                              </td>
                              <td>
                                <Badge>
                                  {row.enabled ? 'enabled' : 'disabled'}
                                </Badge>
                              </td>
                              <td>
                                {row.preorderEnabled ? (
                                  <span className="vendor-contact-cell">
                                    <span>Open</span>
                                    <small>
                                      {date(
                                        row.effectivePreorderOpensAt,
                                        row.windowProvenance.timezone,
                                      )}{' '}
                                      to{' '}
                                      {date(
                                        row.effectivePreorderClosesAt,
                                        row.windowProvenance.timezone,
                                      )}
                                    </small>
                                  </span>
                                ) : (
                                  <span className="markets-muted">Off</span>
                                )}
                              </td>
                              <td>{row.salesCap ?? 'No limit'}</td>
                              <td>
                                {canOffering &&
                                  (row.enabled ? (
                                    <FarmstandButton
                                      variant="destructive-outline"
                                      aria-label={`Disable ${productName(row.variantId)}`}
                                      onClick={() =>
                                        setEditing(`disable:${row.id}`)
                                      }
                                    >
                                      Disable
                                    </FarmstandButton>
                                  ) : (
                                    <FarmstandButton
                                      variant="secondary"
                                      loading={toggling === row.id}
                                      disabled={!!toggling}
                                      aria-label={`Re-enable ${productName(row.variantId)}`}
                                      onClick={() => toggleOffering(row, true)}
                                    >
                                      Re-enable
                                    </FarmstandButton>
                                  ))}
                              </td>
                            </tr>
                          );
                        })}
                    </FarmstandTable>
                    <MarketsPagination
                      label="Products by date pages"
                      summary={pageSummary(visible.length, current)}
                      hasPrevious={current > 0}
                      hasNext={(current + 1) * PAGE < visible.length}
                      onPrevious={() => setOfferingPage(current - 1)}
                      onNext={() => setOfferingPage(current + 1)}
                    />
                  </div>
                ) : (
                  <EmptyState
                    title={
                      offerings.length
                        ? 'No matching products'
                        : 'No products scheduled yet'
                    }
                  >
                    <p>
                      {offerings.length
                        ? 'Try another market date or status.'
                        : 'Products appear here once the Vendor offers an approved product at a market date it is attending.'}
                    </p>
                  </EmptyState>
                )}
              </>
            );
          })()}
          {toggleError && <ErrorState error={toggleError} />}
          </div>
          {(allOfferings.data ?? state.offerings)
            .filter((row) => editing === `disable:${row.id}`)
            .map((row) => (
              <UiDialog
                key={row.id}
                open
                size="standard"
                title={`Disable ${productName(row.variantId)}?`}
                busy={toggling === row.id}
                onClose={close}
                actions={
                  <>
                    <FarmstandButton
                      variant="secondary"
                      disabled={toggling === row.id}
                      onClick={close}
                    >
                      Cancel
                    </FarmstandButton>
                    <FarmstandButton
                      variant="destructive"
                      loading={toggling === row.id}
                      onClick={() => toggleOffering(row, false)}
                    >
                      Disable product
                    </FarmstandButton>
                  </>
                }
              >
                <p>
                  Customers can no longer order this product for{' '}
                  {(() => {
                    const p = participationList.find(
                      (item) => item.id === row.participationId,
                    );
                    return p ? occurrenceName(p.occurrenceId) : 'this date';
                  })()}
                  . Existing orders are not cancelled. You can re-enable it
                  later.
                </p>
              </UiDialog>
            ))}
        </Panel>
      )}
      </div>
      {editing === 'notes' && canNotes && service.phase14 && (
        <VendorNotesDialog
          open
          vendorId={vendorId}
          name={member.vendor.name}
          notes={row?.notes ?? ''}
          revision={row?.note?.revision}
          run={(command) => service.phase14!.command(command)}
          onClose={close}
          onSaved={operations.refresh}
        />
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
  // The market-date period presets from Market Occurrences, plus a custom range.
  const [period, setPeriod] = useState('next-30');
  const [range, setRange] = useState(() => periodRange('next-30'));
  const [calendar, setCalendar] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bounds = dateBounds(range.from, range.through);
  const load = useCallback(
    readAllPages((skip) =>
      service.occurrencePage({
        take: 20,
        skip,
        from: bounds.from,
        through: bounds.through,
      }),
    ),
    [service, bounds.from, bounds.through],
  );
  const occurrences = useRead(
    `${service.readKey}:participation-dates:${bounds.from}:${bounds.through}`,
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
  const occurrence = occurrences.data?.find((o) => o.id === selected);
  const statusOf = (occurrenceId: string) =>
    participations.data?.find((p) => p.occurrenceId === occurrenceId)
      ?.status ?? 'not participating';
  const visible = (occurrences.data ?? []).filter(
    (o) => statusFilter === 'all' || statusOf(o.id) === statusFilter,
  );
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(visible.length / PAGE) - 1),
  );
  const rangeLabel = `${readableDate(range.from)} to ${readableDate(addDays(range.through, -1))}`;
  const row = participations.data?.find((p) => p.occurrenceId === selected);
  return (
    <>
      <div className="markets-filters vendor-detail-filters">
        <FilterSelect
          label="Date range"
          icon="calendar-days"
          value={period}
          onChange={(value) => {
            if (value === 'custom') {
              setCalendar(true);
              return;
            }
            setPeriod(value);
            setRange(periodRange(value));
            setPage(0);
          }}
          options={[
            ...periods.map((p) => [p.value, p.label] as const),
            [
              'custom',
              period === 'custom' ? rangeLabel : 'Custom date range',
            ],
          ]}
        />
        <FilterSelect
          label="Participation"
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
          options={[
            ['all', 'All participation'],
            ['confirmed', 'Confirmed'],
            ['planned', 'Planned'],
            ['cancelled', 'Cancelled'],
            ['not participating', 'Not participating'],
          ]}
        />
      </div>
      <ReadState {...occurrences} retry={occurrences.refresh} />
      <ReadState {...participations} retry={participations.refresh} />
      {occurrences.data && participations.data && (
        visible.length ? (
          <div className="markets-list vendor-detail-table">
            <FarmstandTable
              label="Occurrence participation"
              headings={['Market date', 'Participation', 'Pickup instructions', '']}
            >
              {visible
                .slice(current * PAGE, (current + 1) * PAGE)
                .map((o) => {
                  const participation = participations.data!.find(
                    (p) => p.occurrenceId === o.id,
                  );
                  return (
                    <tr key={o.id}>
                      <th scope="row">{date(o.startsAt, o.timezone)}</th>
                      <td>
                        <Badge>
                          {participation?.status ?? 'not participating'}
                        </Badge>
                      </td>
                      <td>
                        {participation?.pickupInstructions || (
                          <span className="markets-muted">Not provided</span>
                        )}
                      </td>
                      <td>
                        <FarmstandButton
                          variant="secondary"
                          aria-label={`Open ${date(o.startsAt, o.timezone)}`}
                          onClick={() => setSelected(o.id)}
                        >
                          {editable ? 'Edit' : 'View'}
                          <FarmstandIcon name="chevron-right" />
                        </FarmstandButton>
                      </td>
                    </tr>
                  );
                })}
            </FarmstandTable>
            <MarketsPagination
              label="Participation occurrence pages"
              summary={pageSummary(visible.length, current)}
              hasPrevious={current > 0}
              hasNext={(current + 1) * PAGE < visible.length}
              onPrevious={() => setPage(current - 1)}
              onNext={() => setPage(current + 1)}
            />
          </div>
        ) : (
          <EmptyState
            title={
              occurrences.data.length
                ? 'No matching market dates'
                : 'No market dates in this range'
            }
          >
            <p>Try another date range or participation filter.</p>
          </EmptyState>
        )
      )}
      {calendar && (
        <OrdersDateRange
          value={{ from: range.from, to: addDays(range.through, -1) }}
          subject="market dates"
          maxDays={366}
          onClose={() => setCalendar(false)}
          onApply={(next) => {
            try {
              calendarDate(next.from);
              calendarDate(next.to);
            } catch {
              return;
            }
            setPeriod('custom');
            setRange({ from: next.from, through: addDays(next.to, 1) });
            setPage(0);
            setCalendar(false);
          }}
        />
      )}
      {occurrence && (
        <Dialog
          open
          title={date(occurrence.startsAt, occurrence.timezone)}
          busy={busy}
          onClose={() => setSelected(null)}
        >
          {() => (
            <div className="farmstand-controls">
              <ReadState {...config} retry={config.refresh} />
              {editable && config.data ? (
                <CommandForm
 submitClassName="farmstand-button"
                  embedded
                  title="Occurrence Participation"
                  onPendingChange={setBusy}
                  submitLabel="Save"
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
                  <StatusSelect
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
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
