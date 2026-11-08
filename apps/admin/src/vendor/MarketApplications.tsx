import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  safeStorefrontUrl,
  type ApplicantApplicationRow,
  type ApplicantApplicationsApi,
} from '@market/api';
import {
  applicationStatusLabel,
  Badge,
  EmptyState,
  Field,
  UtilityIcon,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { go, ReadState, useRead } from './common';
import type { VendorService } from './service';
import { MarketsSummary } from './MarketsSummary';
import {
  applicationDate,
  applicationKey,
  applicationLocation,
  applicationNextStep,
  discoveryAction,
  readAllMarketApplications,
  readApplicationSteps,
  type DiscoverableMarket,
  type MarketDiscoveryApi,
} from './market-applications-data';
import './market-applications.css';
import { MarketsPagination as Pagination } from './MarketsPagination';

/** Same-origin /vendor/ links navigate in-app; modified clicks keep browser behavior. */
export function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const url = new URL(event.currentTarget.href);
  if (
    url.origin !== window.location.origin ||
    !url.pathname.startsWith('/vendor/')
  )
    return;
  event.preventDefault();
  go(url.pathname + url.search + url.hash);
}
function ApplicationLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <FarmstandLink
      href={href}
      variant={primary ? 'primary' : 'secondary'}
      onClick={navigate}
    >
      {children}
      <FarmstandIcon name="chevron-right" />
    </FarmstandLink>
  );
}
function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={
        value === 'ACCEPTED'
          ? 'success'
          : ['NEEDS_INFO', 'SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'].includes(
                value,
              )
            ? 'warning'
            : value === 'DECLINED'
              ? 'danger'
              : 'neutral'
      }
    >
      {applicationStatusLabel(value)}
    </Badge>
  );
}
function Website({
  href,
  label = 'Website',
}: {
  href?: string | null;
  label?: string;
}) {
  const url = safeStorefrontUrl(href ?? null);
  return url ? (
    <FarmstandLink
      href={url}
      variant="secondary"
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
      <UtilityIcon name="external" />
      <span className="sr-only"> (opens in a new tab)</span>
    </FarmstandLink>
  ) : (
    <FarmstandButton
      variant="secondary"
      disabled
      title="Market website unavailable"
    >
      {label}
      <UtilityIcon name="external" />
    </FarmstandButton>
  );
}
function ZonedDate({ value, timezone }: { value: string; timezone: string }) {
  return (
    <time dateTime={value}>
      {new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone,
      })}
    </time>
  );
}

/** Apply follows the vendor's existing relationship; workspace links stay in-app. */
function DiscoveryApply({ market }: { market: DiscoverableMarket }) {
  const action = discoveryAction(market);
  switch (action.kind) {
    case 'apply':
      return (
        <FarmstandLink
          href={action.href}
          variant="primary"
          className="market-discovery-arrow"
        >
          {action.label}
          <FarmstandIcon name="arrow-right" />
        </FarmstandLink>
      );
    case 'external':
      return (
        <FarmstandLink href={action.href} variant="secondary">
          {action.label}
          <FarmstandIcon name="chevron-right" />
        </FarmstandLink>
      );
    case 'local':
      return (
        <ApplicationLink href={action.href}>{action.label}</ApplicationLink>
      );
    case 'not-yet-open':
      return (
        <>
          <span className="markets-muted">
            {action.opensAt && action.timezone ? (
              <>
                Opens{' '}
                <ZonedDate value={action.opensAt} timezone={action.timezone} />
              </>
            ) : (
              'Not yet open'
            )}
          </span>
          <FarmstandButton disabled title="Applications are not open yet">
            Apply
          </FarmstandButton>
        </>
      );
    default:
      return (
        <FarmstandButton disabled title={action.reason}>
          {action.label}
          <span className="sr-only">. {action.reason}</span>
        </FarmstandButton>
      );
  }
}
export function FindMarketApplications({ api }: { api?: MarketDiscoveryApi }) {
  const id = useId();
  const [search, setSearch] = useState(''),
    [debouncedSearch, setDebouncedSearch] = useState(''),
    [city, setCity] = useState(''),
    [expanded, setExpanded] = useState(false),
    [page, setPage] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [search]);
  const take = expanded ? 10 : 3;
  const read = useCallback(
    () =>
      api!.search({ search: debouncedSearch, city, skip: page * take, take }),
    [api, debouncedSearch, city, page, take],
  );
  const query = useRead(
    `market-discovery:${debouncedSearch}:${city}:${page}:${take}`,
    read,
    !!api,
  );
  const readCities = useCallback(() => api!.cities(), [api]);
  const cities = useRead('market-discovery-cities', readCities, !!api);
  return (
    <FarmstandPanel
      as="section"
      className="markets-list market-discovery"
      aria-label="Find markets to apply"
    >
      <div className="market-applications-title">
        <h2>
          <FarmstandIcon name="search" />
          Find markets to apply
        </h2>
        <p>Discover markets and apply to join.</p>
      </div>
      <div className="markets-filters market-discovery-filters">
        <Field
          id={id + '-search'}
          label={<span className="sr-only">Search markets to apply</span>}
        >
          <FarmstandSearch
            id={id + '-search'}
            placeholder="Search markets..."
            value={search}
            disabled={!api}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </Field>
        <Field
          id={id + '-location'}
          label={<span className="sr-only">Location</span>}
        >
          <FarmstandSelect
            id={id + '-location'}
            value={city}
            disabled={!api || !!cities.error || cities.loading}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All locations</option>
            {(cities.data ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FarmstandSelect>
        </Field>
      </div>
      {!api ? (
        <EmptyState title="Market search is not available yet">
          <p>
            Market discovery will appear here when it is connected. You can
            still manage your saved applications below.
          </p>
        </EmptyState>
      ) : (
        <>
          <ReadState {...cities} retry={cities.refresh} />
          <ReadState {...query} retry={query.refresh} />
          {query.data &&
            (query.data.items.length ? (
              <FarmstandTable
                label="Markets accepting applications"
                wide
                headings={[
                  'Market',
                  'Location',
                  'Next market',
                  'Application deadline',
                  'Actions',
                ]}
              >
                {query.data.items.map((market) => (
                  <tr key={market.id}>
                    <th scope="row">
                      <div className="markets-identity">
                        <span className="markets-identity-icon">
                          <FarmstandIcon name="store" />
                        </span>
                        <span className="market-application-name">
                          {market.name}
                        </span>
                      </div>
                    </th>
                    <td>
                      {[market.city, market.state].filter(Boolean).join(', ') ||
                        'Location unavailable'}
                    </td>
                    <td>
                      {market.nextMarket ? (
                        <ZonedDate
                          value={market.nextMarket.startsAt}
                          timezone={market.nextMarket.timezone}
                        />
                      ) : (
                        <span className="markets-muted">Not announced</span>
                      )}
                    </td>
                    <td>
                      {market.deadline ? (
                        <ZonedDate
                          value={market.deadline.closesAt}
                          timezone={market.deadline.timezone}
                        />
                      ) : (
                        <span className="markets-muted">Not specified</span>
                      )}
                    </td>
                    <td className="market-discovery-actions-cell">
                      <div className="market-discovery-actions">
                        <DiscoveryApply market={market} />
                        <Website href={market.website} />
                      </div>
                    </td>
                  </tr>
                ))}
              </FarmstandTable>
            ) : (
              <EmptyState title="No matching markets">
                <p>Try another market name or city.</p>
              </EmptyState>
            ))}
          {query.data && !expanded && query.data.totalItems > 3 && (
            <div className="market-discovery-more">
              <FarmstandButton
                variant="tertiary"
                className="market-discovery-arrow market-discovery-more-action"
                onClick={() => {
                  setExpanded(true);
                  setPage(0);
                }}
              >
                View more markets
                <FarmstandIcon name="arrow-right" />
              </FarmstandButton>
            </div>
          )}
          {query.data && expanded && (
            <Pagination
              summary={`${query.data.totalItems} markets. Showing ${query.data.items.length ? page * take + 1 : 0} to ${page * take + query.data.items.length}.`}
              hasPrevious={page > 0}
              hasNext={(page + 1) * take < query.data.totalItems}
              onPrevious={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          )}
        </>
      )}
    </FarmstandPanel>
  );
}

export function MarketApplications({ service }: { service: VendorService }) {
  return (
    <MarketApplicationRecords
      api={service.applications!}
      vendorId={Number(service.vendorId)}
      discovery={service.marketDiscovery}
    />
  );
}
export function MarketApplicationRecords({
  api,
  vendorId,
  discovery,
}: {
  api: ApplicantApplicationsApi;
  vendorId: number;
  discovery?: MarketDiscoveryApi;
}) {
  const id = useId();
  const load = useCallback(
    () => readAllMarketApplications(api, vendorId),
    [api, vendorId],
  );
  const query = useRead(`market-applications:${vendorId}`, load);
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [sort, setSort] = useState('newest'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string>();
  const visible = useMemo(
    () =>
      (query.data ?? [])
        .filter(
          (row) =>
            (status === 'all' || row.status === status) &&
            `${row.marketName} ${row.name} ${applicationLocation(row)}`
              .toLocaleLowerCase()
              .includes(search.trim().toLocaleLowerCase()),
        )
        .sort((a, b) => {
          if (sort === 'name') return a.marketName.localeCompare(b.marketName);
          const timestamp = (row: ApplicantApplicationRow) =>
            row.status === 'DRAFT' ? 0 : Date.parse(row.createdAt ?? '') || 0;
          return (
            (sort === 'oldest' ? 1 : -1) * (timestamp(a) - timestamp(b)) ||
            applicationKey(a).localeCompare(applicationKey(b))
          );
        }),
    [query.data, status, search, sort],
  );
  const shown = useMemo(
    () => visible.slice(page * 10, (page + 1) * 10),
    [visible, page],
  );
  const readSteps = useCallback(
    () => readApplicationSteps(api, vendorId, shown),
    [api, vendorId, shown],
  );
  const steps = useRead(
    `market-application-steps:${vendorId}:${shown.map(applicationKey).join(',')}`,
    readSteps,
    shown.length > 0,
  );
  const row = shown.find((r) => applicationKey(r) === selected) ?? shown[0];
  const detail = row ? steps.data?.get(applicationKey(row)) : undefined;
  const current = detail ?? row;
  const next = current ? applicationNextStep(current, detail) : undefined;
  function changeFilter(update: () => void) {
    update();
    setPage(0);
  }
  return (
    <>
      <ReadState {...query} retry={query.refresh} />
      <div className="markets-columns market-applications-columns">
        <div className="market-applications-main">
          {query.data && (
            <MarketsSummary
              items={[
                {
                  label: 'Pending applications',
                  tone: 'warning',
                  value: query.data.filter((r) =>
                    ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO'].includes(
                      r.status,
                    ),
                  ).length,
                  hint: 'In review or awaiting information',
                  icon: 'receipt-text',
                },
                {
                  label: 'Accepted applications',
                  tone: 'success',
                  value: query.data.filter((r) => r.status === 'ACCEPTED')
                    .length,
                  hint: 'Review your next steps',
                  icon: 'circle-check',
                },
                {
                  label: 'Draft applications',
                  value: query.data.filter((r) => r.status === 'DRAFT').length,
                  hint: 'Not submitted yet',
                  icon: 'receipt-text',
                },
              ]}
            />
          )}
          <FindMarketApplications api={discovery} />
          <FarmstandPanel
            as="section"
            className="markets-list market-applications-list"
            aria-label="Your applications"
          >
            <h2>Your applications</h2>
            <div className="markets-filters">
              <Field
                id={id + '-search'}
                label={<span className="sr-only">Search applications</span>}
              >
                <FarmstandSearch
                  id={id + '-search'}
                  placeholder="Search markets or applications..."
                  value={search}
                  onChange={(e) =>
                    changeFilter(() => setSearch(e.target.value))
                  }
                />
              </Field>
              <Field
                id={id + '-status'}
                label={<span className="sr-only">Application status</span>}
              >
                <FarmstandSelect
                  id={id + '-status'}
                  value={status}
                  onChange={(e) =>
                    changeFilter(() => setStatus(e.target.value))
                  }
                >
                  <option value="all">All statuses</option>
                  {[
                    'DRAFT',
                    'SUBMITTED',
                    'UNDER_REVIEW',
                    'NEEDS_INFO',
                    'WAITLISTED',
                    'ACCEPTED',
                    'DECLINED',
                    'WITHDRAWN',
                  ].map((value) => (
                    <option key={value} value={value}>
                      {applicationStatusLabel(value)}
                    </option>
                  ))}
                </FarmstandSelect>
              </Field>
              <Field
                id={id + '-sort'}
                label={<span className="sr-only">Sort applications</span>}
              >
                <FarmstandSelect
                  id={id + '-sort'}
                  value={sort}
                  onChange={(e) => changeFilter(() => setSort(e.target.value))}
                >
                  <option value="newest">Submitted: Newest</option>
                  <option value="oldest">Submitted: Oldest</option>
                  <option value="name">Market: A to Z</option>
                </FarmstandSelect>
              </Field>
            </div>
            {query.data &&
              (shown.length ? (
                <>
                  <FarmstandTable
                    label="Your applications"
                    wide
                    headings={[
                      'Market',
                      'Location',
                      'Submitted date',
                      'Status',
                    ]}
                  >
                    {shown.map((application) => {
                      const key = applicationKey(application),
                        preview = steps.data?.get(key),
                        latest = preview ?? application;
                      return (
                        <tr
                          key={key}
                          tabIndex={0}
                          onClick={() => setSelected(key)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelected(key);
                            }
                          }}
                        >
                          <th scope="row">
                            <div className="markets-identity">
                              <span className="markets-identity-icon">
                                <FarmstandIcon name="store" />
                              </span>
                              <span className="market-application-name">
                                {application.marketName}
                              </span>
                            </div>
                          </th>
                          <td>{applicationLocation(latest)}</td>
                          <td>
                            {application.status === 'DRAFT' ? (
                              <span className="markets-muted">
                                Not submitted
                              </span>
                            ) : (
                              applicationDate(application.createdAt)
                            )}
                          </td>
                          <td className="market-application-status-cell">
                            <div className="market-application-status-content">
                              <Status value={latest.status} />
                              <FarmstandIcon name="chevron-right" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </FarmstandTable>
                  <Pagination
                    label="Application pages"
                    summary={`${visible.length} applications. Showing ${page * 10 + 1} to ${Math.min((page + 1) * 10, visible.length)}.`}
                    hasPrevious={page > 0}
                    hasNext={(page + 1) * 10 < visible.length}
                    onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                  />
                </>
              ) : (
                <EmptyState
                  title={
                    query.data.length
                      ? 'No matching applications'
                      : 'No applications yet'
                  }
                >
                  <p>
                    {query.data.length
                      ? 'Try another search or status.'
                      : 'Your saved drafts and submitted applications will appear here.'}
                  </p>
                </EmptyState>
              ))}
          </FarmstandPanel>
        </div>
        <FarmstandPanel
          as="section"
          className="markets-next market-application-details"
          aria-label="Application details"
        >
          <h2>
            <FarmstandIcon name="receipt-text" />
            Application details
          </h2>
          {row && current && next ? (
            <>
              <div className="markets-next-art" aria-hidden="true">
                <FarmstandIcon name="store" />
              </div>
              <div className="markets-next-content">
                <h3>{current.marketName}</h3>
                <p className="markets-venue">
                  <FarmstandIcon name="map-pin" />
                  {applicationLocation(current)}
                </p>
                <dl className="market-application-facts">
                  <div>
                    <dt>Application</dt>
                    <dd>{current.name}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <Status value={current.status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>
                      {row.status === 'DRAFT'
                        ? 'Not submitted'
                        : applicationDate(row.createdAt)}
                    </dd>
                  </div>
                  {row.status === 'DRAFT' && (
                    <div>
                      <dt>Last saved</dt>
                      <dd>{applicationDate(row.updatedAt)}</dd>
                    </div>
                  )}
                </dl>
                <ReadState {...steps} retry={steps.refresh} />
                <p className="market-application-guidance">{next.detail}</p>
                <ApplicationLink href={next.href} primary>
                  {next.label}
                </ApplicationLink>
                <Website href={current.origin} label="View market" />
              </div>
            </>
          ) : (
            <EmptyState title="No application selected">
              <p>Select an application to review its details and next step.</p>
            </EmptyState>
          )}
        </FarmstandPanel>
      </div>
    </>
  );
}

/** Shared application status presentation for other Markets views. */
export { Status as ApplicationStatusBadge };
