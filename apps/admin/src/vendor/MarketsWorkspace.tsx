import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { mayCommand } from '@market/admin-core';
import { Badge, EmptyState, Field, UtilityIcon } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { go, ReadState, useRead } from './common';
import { UpcomingMarketDates } from './UpcomingMarketDates';
import type { VendorService } from './service';
import { vendorStatusTone } from './status-presentation';
import {
  attendanceLabel,
  marketDate,
  marketTime,
  readMarketsOverview,
  type MarketOverviewRow,
} from './markets-data';
import './markets-workspace.css';
import { MarketApplications } from './MarketApplications';
import { MarketsPagination } from './MarketsPagination';
import { MarketsSummary } from './MarketsSummary';

type View = 'overview' | 'applications' | 'upcoming-dates';
const hashView = (): View =>
  window.location.hash === '#applications'
    ? 'applications'
    : window.location.hash === '#upcoming-dates'
      ? 'upcoming-dates'
      : 'overview';

export function MarketsWorkspace({
  service,
  relationshipTools,
  initialView,
}: {
  service: VendorService;
  relationshipTools: ReactNode;
  initialView?: View;
}) {
  const [view, setView] = useState<View>(() => initialView ?? hashView());
  useEffect(() => {
    if (initialView)
      window.history.replaceState(null, '', '/vendor/markets#' + initialView);
    const sync = () => setView(hashView());
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [initialView]);
  function changeView(next: View) {
    if (next === view) return;
    window.history.pushState(null, '', '/vendor/markets#' + next);
    setView(next);
  }
  return (
    <WorkspaceFrame
      icon="store"
      title="Markets"
      description="Your markets, applications and upcoming dates, all in one place."
      value={view}
      onChange={changeView}
      tabs={[
        {
          value: 'overview',
          label: 'Overview',
          href: '/vendor/markets#overview',
          icon: 'store',
        },
        {
          value: 'applications',
          label: 'Applications',
          href: '/vendor/markets#applications',
          icon: 'receipt-text',
        },
        {
          value: 'upcoming-dates',
          label: 'Upcoming Dates',
          href: '/vendor/markets#upcoming-dates',
          icon: 'calendar-days',
        },
      ]}
    >
      <div className="markets-view" key={view}>
        {view === 'overview' && (
          <MarketsOverview
            service={service}
            onDates={() => changeView('upcoming-dates')}
          />
        )}
        {view === 'applications' && (
          <>
            {service.applications &&
            mayCommand(service.context, 'ManageOwnMarketParticipation') ? (
              <MarketApplications service={service} />
            ) : (
              <EmptyState title="Applications unavailable">
                <p>Your account does not have access to applications here.</p>
              </EmptyState>
            )}
            {relationshipTools}
          </>
        )}
        {view === 'upcoming-dates' && <UpcomingMarketDates service={service} />}
      </div>
    </WorkspaceFrame>
  );
}

function MarketAction({
  row,
  service,
  configure = false,
}: {
  row: MarketOverviewRow;
  service: VendorService;
  configure?: boolean;
}) {
  const request =
    !configure &&
    !!row.next &&
    row.membership.status === 'approved' &&
    row.participation?.status !== 'confirmed' &&
    mayCommand(service.context, 'ManageOwnMarketParticipation');
  // Requesting attendance opens that date's page; configuring opens the market page.
  const href =
    `/vendor/markets/${encodeURIComponent(row.membership.id)}` +
    (request ? '/dates/' + encodeURIComponent(row.next!.id) : '');
  return (
    <FarmstandLink
      href={href}
      variant="primary"
      onClick={(event) => {
        if (
          event.button === 0 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          go(href);
        }
      }}
    >
      {request ? 'Request attendance' : 'Configure'}
      <FarmstandIcon name="chevron-right" />
    </FarmstandLink>
  );
}

function AttendanceStatus({ row }: { row: MarketOverviewRow }) {
  return (
    <Badge
      tone={
        row.participation?.status === 'confirmed'
          ? 'success'
          : row.participation?.status === 'planned'
            ? 'warning'
            : 'neutral'
      }
    >
      {attendanceLabel(row)}
    </Badge>
  );
}

function MarketsOverview({
  service,
  onDates,
}: {
  service: VendorService;
  onDates: () => void;
}) {
  const read = useCallback(() => readMarketsOverview(service), [service]);
  const query = useRead(`markets-overview:${service.vendorId}`, read);
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [sort, setSort] = useState('date');
  const id = useId();
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [search, status, sort]);
  const rows = query.data?.rows ?? [];
  const active = rows.filter((r) => r.membership.status === 'approved');
  const upcoming = active
    .flatMap((r) => r.upcoming)
    .filter(
      (o) => Date.parse(o.startsAt) < (query.data?.now ?? 0) + 30 * 86400000,
    );
  const next = active
    .filter((r) => r.next)
    .sort(
      (a, b) => Date.parse(a.next!.startsAt) - Date.parse(b.next!.startsAt),
    )[0];
  const visible = rows
    .filter(
      (r) =>
        (status === 'all' || r.membership.status === status) &&
        `${r.membership.market.name} ${r.next?.venue ?? ''}`
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.membership.market.name.localeCompare(b.membership.market.name)
        : (a.next ? Date.parse(a.next.startsAt) : Infinity) -
            (b.next ? Date.parse(b.next.startsAt) : Infinity) ||
          a.membership.market.name.localeCompare(b.membership.market.name),
    );
  return (
    <>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          <MarketsSummary
            items={[
              {
                label: 'Active markets',
                value: active.length,
                hint: 'Approved market memberships',
                icon: 'store' as const,
              },
              {
                label: 'Pending memberships',
                value: rows.filter((r) => r.membership.status === 'pending')
                  .length,
                hint: 'Awaiting market approval',
                icon: 'receipt-text' as const,
              },
              {
                label: 'Upcoming market dates',
                value: upcoming.length,
                hint: 'Across active markets in the next 30 days',
                icon: 'calendar-days' as const,
              },
            ]}
          />
          <div className="markets-columns">
            <FarmstandPanel
              as="section"
              className="markets-list"
              aria-label="Your markets"
            >
              <h2>Your markets</h2>
              <div className="markets-filters">
                <Field
                  id={id + '-search'}
                  label={<span className="sr-only">Search markets</span>}
                >
                  <FarmstandSearch
                    id={id + '-search'}
                    placeholder="Search markets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Field>
                <Field
                  id={id + '-status'}
                  label={<span className="sr-only">Membership status</span>}
                >
                  <FarmstandSelect
                    id={id + '-status'}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="withdrawn">Withdrawn</option>
                  </FarmstandSelect>
                </Field>
                <Field
                  id={id + '-sort'}
                  label={<span className="sr-only">Sort markets</span>}
                >
                  <FarmstandSelect
                    id={id + '-sort'}
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="date">Sort: Next date</option>
                    <option value="name">Sort: Name</option>
                  </FarmstandSelect>
                </Field>
              </div>
              {visible.length ? (
                <FarmstandTable
                  label="Your markets"
                  wide
                  headings={[
                    'Market',
                    'Next market date',
                    'Membership',
                    'Actions',
                  ]}
                >
                  {visible.slice(page * 20, (page + 1) * 20).map((row) => (
                    <tr key={row.membership.id}>
                      <th scope="row">
                        <div className="markets-identity">
                          <span className="markets-identity-icon">
                            <FarmstandIcon name="store" />
                          </span>
                          <div>{row.membership.market.name}</div>
                        </div>
                      </th>
                      <td>
                        {row.next ? (
                          <div className="markets-date">
                            <span>
                              <FarmstandIcon name="calendar-days" />
                              {marketDate(row.next)}
                            </span>
                            <small>{marketTime(row.next)}</small>
                          </div>
                        ) : (
                          <span className="markets-muted">
                            No date in the next 90 days
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge
                          tone={vendorStatusTone(
                            'membership',
                            row.membership.status,
                          )}
                        >
                          {row.membership.status.charAt(0).toUpperCase() +
                            row.membership.status.slice(1)}
                        </Badge>
                      </td>
                      <td>
                        <div className="markets-row-actions">
                          <MarketAction row={row} service={service} configure />
                          {row.website ? (
                            <FarmstandLink
                              href={row.website}
                              variant="secondary"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Website
                              <UtilityIcon name="external" />
                              <span className="sr-only">
                                {' '}
                                (opens in a new tab)
                              </span>
                            </FarmstandLink>
                          ) : (
                            <FarmstandButton
                              variant="secondary"
                              disabled
                              title="Market website unavailable"
                            >
                              Website
                              <UtilityIcon name="external" />
                            </FarmstandButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </FarmstandTable>
              ) : (
                <EmptyState
                  title={
                    rows.length
                      ? 'No matching markets'
                      : 'No market memberships yet'
                  }
                >
                  <p>
                    {rows.length
                      ? 'Try another search or membership status.'
                      : 'Your market memberships will appear here once a relationship is created.'}
                  </p>
                </EmptyState>
              )}
              <MarketsPagination
                summary={`${visible.length} markets`}
                hasPrevious={page > 0}
                hasNext={(page + 1) * 20 < visible.length}
                onPrevious={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
              <p className="markets-list-note">
                Next dates show scheduled markets in the next 90 days.
              </p>
            </FarmstandPanel>
            <FarmstandPanel
              as="section"
              className="markets-next"
              aria-label="Next upcoming market"
            >
              <h2>
                <FarmstandIcon name="calendar-days" />
                Next upcoming market
              </h2>
              {next ? (
                <>
                  <div className="markets-next-art" aria-hidden="true">
                    <FarmstandIcon name="store" />
                  </div>
                  <div className="markets-next-content">
                    <h3>{next.membership.market.name}</h3>
                    {next.next!.venue && (
                      <p className="markets-venue">
                        <FarmstandIcon name="map-pin" />
                        {next.next!.venue}
                      </p>
                    )}
                    <div className="markets-next-date">
                      <FarmstandIcon name="calendar-days" />
                      <div>
                        <strong>{marketDate(next.next!, true)}</strong>
                        <small>{marketTime(next.next!)}</small>
                      </div>
                    </div>
                    <div className="markets-next-attendance">
                      <span>Attendance</span>
                      <AttendanceStatus row={next} />
                    </div>
                    <MarketAction row={next} service={service} />
                    <FarmstandLink
                      href="/vendor/markets#upcoming-dates"
                      variant="secondary"
                      onClick={(event) => {
                        if (
                          event.button === 0 &&
                          !event.ctrlKey &&
                          !event.metaKey &&
                          !event.shiftKey &&
                          !event.altKey
                        ) {
                          event.preventDefault();
                          onDates();
                        }
                      }}
                    >
                      <FarmstandIcon name="calendar-days" />
                      View dates
                    </FarmstandLink>
                  </div>
                </>
              ) : (
                <EmptyState title="No upcoming market">
                  <p>
                    No scheduled dates for your active memberships in the next
                    90 days.
                  </p>
                </EmptyState>
              )}
            </FarmstandPanel>
          </div>
        </>
      )}
    </>
  );
}
