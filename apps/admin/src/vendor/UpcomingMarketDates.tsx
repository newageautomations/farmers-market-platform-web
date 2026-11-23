import { useCallback, useId, useMemo, useState, type MouseEvent } from 'react';
import { mayCommand } from '@market/admin-core';
import { hasPermission } from '@market/auth';
import {
  Alert,
  Badge,
  Dialog,
  EmptyState,
  Field,
  InlineSkeleton,
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
import { IdentityIcon } from '@market/ui/workspace';
import { useProfileImages } from '../profile-images';
import { MarketsSummary } from './MarketsSummary';
import { MarketsPagination as Pagination } from './MarketsPagination';
import { ApplicationStatusBadge } from './MarketApplications';
import { PackingBadge } from './packing';
import { BoothInvoicePayment } from './BoothInvoicePayment';
import {
  dateAttendance,
  dateAttendanceLabels,
  dateAttendanceTones,
  dateLocation,
  marketDate,
  marketTime,
  readUpcomingMarketDates,
  type DateAttendance,
  type UpcomingMarketDate,
} from './markets-data';
import '@market/ui/workspace-records.css';
import './market-dates.css';
import { DetailSheet, usePhoneRecords } from '../market/mobile';

const PAGE_SIZE = 10;
const DAY = 86400000;
const ranges = ['7', '30', '60', '90'];

/** Keep ordinary clicks on vendor links inside the dashboard router. */
function inApp(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(href);
}
export function AttendanceBadge({ value }: { value: DateAttendance }) {
  return (
    <Badge tone={dateAttendanceTones[value]}>
      {dateAttendanceLabels[value]}
    </Badge>
  );
}
function plural(count: number, one: string, many = one + 's') {
  return `${count} ${count === 1 ? one : many}`;
}

/** Packing progress is read only for the selected date the vendor can pack. */
function DatePacking({
  service,
  occurrenceId,
  available,
  loading,
  revision,
}: {
  service: VendorService;
  occurrenceId: string;
  available: boolean;
  loading: boolean;
  revision: number;
}) {
  const read = useCallback(
    () => service.packing!.read(Number(occurrenceId)),
    [service, occurrenceId],
  );
  const packing = useRead(
    `market-date-packing:${occurrenceId}:${revision}`,
    read,
    available,
  );
  if (loading || packing.loading)
    return <InlineSkeleton label="Checking packing" />;
  if (!available)
    return <span className="markets-muted">No packing list yet</span>;
  if (packing.error)
    return <span className="markets-muted">Packing status unavailable</span>;
  if (!packing.data) return null;
  const { summary } = packing.data;
  return (
    <div className="market-date-packing">
      <PackingBadge status={summary.status} />
      {summary.required > 0 && (
        <small>
          {summary.gathered ?? summary.packed} / {summary.required} units packed
        </small>
      )}
    </div>
  );
}

export function UpcomingMarketDates({ service }: { service: VendorService }) {
  const id = useId();
  const read = useCallback(
    () => readUpcomingMarketDates(service, Date.now(), true),
    [service],
  );
  const query = useRead(`market-dates:${service.vendorId}`, read, true, {
    retainPreviousData: true,
  });
  const packingAllowed =
    !!service.packing &&
    hasPermission(service.context.permissions, 'ReadOwnOrders');
  const readPacking = useCallback(
    () => service.packing!.occurrences(),
    [service],
  );
  const packingDates = useRead(
    `market-date-packing-dates:${service.vendorId}`,
    readPacking,
    packingAllowed,
    { retainPreviousData: true },
  );
  const manage = mayCommand(service.context, 'ManageOwnMarketParticipation');
  const records = usePhoneRecords();
  const [search, setSearch] = useState(''),
    [market, setMarket] = useState('all'),
    [range, setRange] = useState('30'),
    [attendance, setAttendance] = useState('all'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string>(),
    // Phones open a tapped date's details in a bottom sheet.
    [sheet, setSheet] = useState(false),
    [busy, setBusy] = useState(false),
    [confirming, setConfirming] = useState(false),
    [packingRevision, setPackingRevision] = useState(0),
    [result, setResult] = useState<{
      key: string;
      kind: 'saved' | 'failed';
      text: string;
    }>();
  const now = query.data?.now ?? 0;
  const boothsAvailable = !!query.data?.boothsAvailable;
  const inRange = useMemo(
    () =>
      (query.data?.dates ?? []).filter(
        (d) => Date.parse(d.occurrence.startsAt) < now + Number(range) * DAY,
      ),
    [query.data, now, range],
  );
  const markets = useMemo(
    () =>
      [
        ...new Map(
          (query.data?.dates ?? []).map((d) => [
            d.membership.id,
            d.membership.market.name,
          ]),
        ),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [query.data],
  );
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return inRange.filter(
      (d) =>
        (market === 'all' || d.membership.id === market) &&
        (attendance === 'all' ||
          dateAttendance(d.participation, d.occurrence) === attendance) &&
        `${d.membership.market.name} ${d.occurrence.venue} ${dateLocation(d)} ${d.booth ?? ''} ${marketDate(d.occurrence, true)}`
          .toLocaleLowerCase()
          .includes(term),
    );
  }, [inRange, market, attendance, search]);
  const shown = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current: UpcomingMarketDate | undefined =
    shown.find((d) => d.key === selected) ?? shown[0];
  const profileImages = useProfileImages(service.profileImage, {
    markets: [
      ...shown.map((d) => d.membership.marketId),
      current?.membership.marketId,
    ],
  });
  const currentAttendance =
    current && dateAttendance(current.participation, current.occurrence);
  const packable =
    !!current &&
    !!packingDates.data?.some((o) => String(o.id) === current.occurrence.id);
  const counts = inRange.reduce<Record<DateAttendance, number>>(
    (all, d) => {
      all[dateAttendance(d.participation, d.occurrence)]++;
      return all;
    },
    { attending: 0, tentative: 0, 'not-attending': 0, 'needs-rsvp': 0 },
  );
  function changeFilter(update: () => void) {
    update();
    setPage(0);
  }
  function select(key: string) {
    setSelected(key);
    if (result?.key !== key) setResult(undefined);
  }
  async function respond(date: UpcomingMarketDate, attending: boolean) {
    setBusy(true);
    setResult(undefined);
    const p = date.participation;
    try {
      await service.attendance({
        membershipId: date.membership.id,
        occurrenceId: date.occurrence.id,
        expectedVersion: p?.version ?? null,
        status: attending ? 'confirmed' : 'cancelled',
        pickupInstructions: p?.pickupInstructions ?? '',
        preorderOverride: p?.preorderOverride
          ? {
              opensDaysBefore: p.preorderOverride.opensDaysBefore,
              opensTime: p.preorderOverride.opensTime,
              closesDaysBefore: p.preorderOverride.closesDaysBefore,
              closesTime: p.preorderOverride.closesTime,
            }
          : null,
      });
      setResult({
        key: date.key,
        kind: 'saved',
        text: attending
          ? 'You are marked as attending this date.'
          : 'You are marked as not attending this date.',
      });
      setConfirming(false);
    } catch {
      setResult({
        key: date.key,
        kind: 'failed',
        text: 'Your attendance could not be saved. The latest status has been reloaded; review it and try again.',
      });
    } finally {
      setBusy(false);
      setSelected(date.key);
      query.refresh();
      packingDates.refresh();
      setPackingRevision((r) => r + 1);
    }
  }
  const packingHref =
    current &&
    `/vendor/orders/packing?occurrence=${encodeURIComponent(current.occurrence.id)}`;
  const marketHref =
    current && `/vendor/markets/${encodeURIComponent(current.membership.id)}`;
  return (
    <>
      <ReadState skeleton="stats" {...query} retry={query.refresh} />
      {query.data && (
        <div className="markets-columns market-applications-columns">
          <div className="market-applications-main">
            <MarketsSummary
              className="market-dates-summary"
              items={[
                {
                  label: 'Upcoming dates',
                  value: inRange.length,
                  hint: `Market dates in the next ${range} days`,
                  icon: 'calendar-days',
                },
                {
                  label: 'Attending',
                  tone: 'success',
                  value: counts.attending,
                  hint: `You're confirmed for ${plural(counts.attending, 'date')}`,
                  icon: 'circle-check',
                },
                {
                  label: 'Needs RSVP',
                  tone: 'warning',
                  value: counts['needs-rsvp'],
                  hint: `${plural(counts['needs-rsvp'], 'date')} ${counts['needs-rsvp'] === 1 ? 'needs' : 'need'} your response`,
                  icon: 'info',
                },
                {
                  label: 'Not attending',
                  tone: 'danger',
                  value: counts['not-attending'],
                  hint: `You're not attending ${plural(counts['not-attending'], 'date')}`,
                  icon: 'triangle-alert',
                },
              ]}
            />
            <FarmstandPanel
              as="section"
              className="markets-list market-applications-list market-dates-list"
              aria-label="Upcoming market dates"
            >
              <h2>Upcoming market dates</h2>
              <div className="markets-filters market-dates-filters">
                <Field
                  id={id + '-search'}
                  label={<span className="sr-only">Search market dates</span>}
                >
                  <FarmstandSearch
                    id={id + '-search'}
                    placeholder="Search markets or dates..."
                    value={search}
                    onChange={(e) =>
                      changeFilter(() => setSearch(e.target.value))
                    }
                  />
                </Field>
                <Field
                  id={id + '-market'}
                  label={<span className="sr-only">Market</span>}
                >
                  <FarmstandSelect
                    id={id + '-market'}
                    value={market}
                    onChange={(e) =>
                      changeFilter(() => setMarket(e.target.value))
                    }
                  >
                    <option value="all">All markets</option>
                    {markets.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </FarmstandSelect>
                </Field>
                <Field
                  id={id + '-range'}
                  label={<span className="sr-only">Date range</span>}
                >
                  <FarmstandSelect
                    id={id + '-range'}
                    value={range}
                    onChange={(e) =>
                      changeFilter(() => setRange(e.target.value))
                    }
                  >
                    {ranges.map((days) => (
                      <option key={days} value={days}>
                        Next {days} days
                      </option>
                    ))}
                  </FarmstandSelect>
                </Field>
                <Field
                  id={id + '-attendance'}
                  label={<span className="sr-only">Attendance</span>}
                >
                  <FarmstandSelect
                    id={id + '-attendance'}
                    value={attendance}
                    onChange={(e) =>
                      changeFilter(() => setAttendance(e.target.value))
                    }
                  >
                    <option value="all">All attendance</option>
                    {(
                      Object.keys(dateAttendanceLabels) as DateAttendance[]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {dateAttendanceLabels[value]}
                      </option>
                    ))}
                  </FarmstandSelect>
                </Field>
              </div>
              {shown.length ? (
                <>
                  <FarmstandTable
                    label="Upcoming market dates"
                    recordDetails={records({
                      status: 4,
                      onOpen: (index) => {
                        const date = shown[index];
                        if (!date) return;
                        select(date.key);
                        setSheet(true);
                      },
                    })}
                    wide
                    headings={[
                      'Market',
                      'Date & time',
                      'Location',
                      'Booth',
                      'Attendance',
                      'Application',
                    ]}
                  >
                    {shown.map((date) => (
                      <tr
                        key={date.key}
                        tabIndex={0}
                        className={
                          date.key === current?.key
                            ? 'market-application-selected'
                            : undefined
                        }
                        onClick={() => select(date.key)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            select(date.key);
                          }
                        }}
                      >
                        <th scope="row">
                          <div className="markets-identity">
                            <IdentityIcon
                              icon="store"
                              image={profileImages.market(
                                date.membership.marketId,
                              )}
                            />
                            <span className="market-application-name">
                              {date.membership.market.name}
                            </span>
                          </div>
                        </th>
                        <td>
                          <div className="markets-date">
                            <span>
                              <FarmstandIcon name="calendar-days" />
                              {marketDate(date.occurrence)}
                            </span>
                            <small>{marketTime(date.occurrence, false)}</small>
                          </div>
                        </td>
                        <td>
                          <span className="market-dates-location">
                            <FarmstandIcon name="map-pin" />
                            {dateLocation(date)}
                          </span>
                        </td>
                        <td>
                          {date.booth ? (
                            <Badge tone="neutral">{date.booth}</Badge>
                          ) : (
                            <span className="markets-muted">
                              {date.membership.market.ownerVendorId
                                ? 'Not required'
                                : boothsAvailable
                                  ? 'Not assigned'
                                  : 'Unavailable'}
                            </span>
                          )}
                        </td>
                        <td>
                          {date.occurrence.status === 'cancelled' ? (
                            <Badge tone="danger">Cancelled</Badge>
                          ) : (
                            <AttendanceBadge
                              value={dateAttendance(
                                date.participation,
                                date.occurrence,
                              )}
                            />
                          )}
                        </td>
                        <td className="market-application-status-cell">
                          <div className="market-application-status-content">
                            {date.application ? (
                              <ApplicationStatusBadge
                                value={date.application.status}
                              />
                            ) : (
                              <span className="markets-muted">
                                No application
                              </span>
                            )}
                            <FarmstandIcon name="chevron-right" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </FarmstandTable>
                  <Pagination
                    label="Market date pages"
                    summary={`${plural(visible.length, 'market date')}. Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, visible.length)}.`}
                    hasPrevious={page > 0}
                    hasNext={(page + 1) * PAGE_SIZE < visible.length}
                    onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                  />
                </>
              ) : (
                <EmptyState
                  title={
                    inRange.length
                      ? 'No matching market dates'
                      : 'No upcoming market dates'
                  }
                >
                  <p>
                    {inRange.length
                      ? 'Try another search, market or attendance status.'
                      : `None of your approved markets have dates scheduled in the next ${range} days.`}
                  </p>
                </EmptyState>
              )}
              <p className="markets-list-note">
                Dates are shown for markets where your membership is approved.
              </p>
            </FarmstandPanel>
          </div>
          <DetailSheet
            phoneOnly
            title="Date details"
            open={sheet}
            onClose={() => setSheet(false)}
          >
            <FarmstandPanel
              as="section"
              className="markets-next market-application-details market-date-details"
              aria-label="Date details"
            >
              <h2>
                <FarmstandIcon name="calendar-days" />
                Date details
              </h2>
              {current && currentAttendance ? (
                <>
                  <IdentityIcon
                    className="markets-next-art"
                    icon="store"
                    image={profileImages.market(current.membership.marketId)}
                  />
                  <div className="markets-next-content">
                    <h3>{current.membership.market.name}</h3>
                    <p className="markets-venue">
                      <FarmstandIcon name="map-pin" />
                      {dateLocation(current)}
                    </p>
                    <dl className="market-application-facts">
                      <div>
                        <dt>Date</dt>
                        <dd>{marketDate(current.occurrence, true)}</dd>
                      </div>
                      <div>
                        <dt>Time</dt>
                        <dd>{marketTime(current.occurrence)}</dd>
                      </div>
                      {current.occurrence.venue &&
                        current.occurrence.venue !== dateLocation(current) && (
                          <div>
                            <dt>Venue</dt>
                            <dd>{current.occurrence.venue}</dd>
                          </div>
                        )}
                      <div>
                        <dt>Booth</dt>
                        <dd>
                          {current.booth ? (
                            <span className="market-date-booth-status">
                              <Badge tone="neutral">{current.booth}</Badge>
                              {current.occurrence.status === 'cancelled' ? (
                                <Badge tone="danger">Cancelled</Badge>
                              ) : (
                                !!current.invoices?.length && (
                                  <Badge
                                    tone={
                                      current.invoices.every(
                                        (i) => i.paidMinor >= i.totalMinor,
                                      )
                                        ? 'success'
                                        : 'warning'
                                    }
                                  >
                                    {current.invoices.every(
                                      (i) => i.paidMinor >= i.totalMinor,
                                    )
                                      ? 'Paid'
                                      : 'Not paid'}
                                  </Badge>
                                )
                              )}
                              {current.occurrence.status !== 'cancelled' &&
                                current.invoices?.length === 0 && (
                                  <Badge tone="neutral">No invoice</Badge>
                                )}
                            </span>
                          ) : current.membership.market.ownerVendorId ? (
                            'Not required'
                          ) : boothsAvailable ? (
                            'Not assigned'
                          ) : (
                            'Unavailable'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Attendance</dt>
                        <dd>
                          {current.occurrence.status === 'cancelled' ? (
                            <Badge tone="danger">Cancelled</Badge>
                          ) : (
                            <AttendanceBadge value={currentAttendance} />
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Application</dt>
                        <dd>
                          {current.application ? (
                            <ApplicationStatusBadge
                              value={current.application.status}
                            />
                          ) : current.membership.market.ownerVendorId ? (
                            'Not required'
                          ) : (
                            'No application'
                          )}
                        </dd>
                      </div>
                      {packingAllowed && (
                        <div>
                          <dt>Packing</dt>
                          <dd>
                            <DatePacking
                              key={current.occurrence.id}
                              service={service}
                              occurrenceId={current.occurrence.id}
                              available={packable}
                              loading={
                                !packingDates.data && packingDates.loading
                              }
                              revision={packingRevision}
                            />
                          </dd>
                        </div>
                      )}
                    </dl>
                    {result?.key === current.key && (
                      <Alert
                        severity={result.kind === 'saved' ? 'success' : 'error'}
                        role={result.kind === 'saved' ? 'status' : 'alert'}
                      >
                        {result.text}
                      </Alert>
                    )}
                    {current.occurrence.status === 'cancelled' && (
                      <Alert severity="info">
                        {current.membership.market.ownerVendorId
                          ? 'You cancelled this market date.'
                          : 'The market cancelled this date. Booth assignments and invoices are cancelled. No payment is due.'}
                      </Alert>
                    )}
                    {current.invoices?.map(
                      (invoice) =>
                        service.boothInvoices && (
                          <BoothInvoicePayment
                            key={invoice.id}
                            api={service.boothInvoices}
                            invoiceId={invoice.id}
                            cancelled={
                              current.occurrence.status === 'cancelled'
                            }
                            actionLabel={
                              invoice.paidMinor < invoice.totalMinor
                                ? 'Pay invoice'
                                : 'View invoice'
                            }
                            onUpdated={query.refresh}
                            marketDate={marketDate(current.occurrence, true)}
                          />
                        ),
                    )}
                    {manage &&
                      current.occurrence.status === 'scheduled' &&
                      !['attending', 'not-attending'].includes(
                        currentAttendance,
                      ) && (
                        <>
                          <FarmstandButton
                            loading={busy && !confirming}
                            disabled={busy || currentAttendance === 'attending'}
                            onClick={() => void respond(current, true)}
                          >
                            <FarmstandIcon name="circle-check" />
                            {currentAttendance === 'attending'
                              ? 'Attending'
                              : 'Mark attending'}
                          </FarmstandButton>
                          <FarmstandButton
                            variant="secondary"
                            disabled={
                              busy || currentAttendance === 'not-attending'
                            }
                            onClick={() => setConfirming(true)}
                          >
                            Not attending
                          </FarmstandButton>
                        </>
                      )}
                    {packingAllowed &&
                      (packable ? (
                        <FarmstandLink
                          href={packingHref}
                          variant="secondary"
                          onClick={(event) => inApp(event, packingHref!)}
                        >
                          <FarmstandIcon name="package" />
                          Packing list
                        </FarmstandLink>
                      ) : (
                        <FarmstandButton
                          variant="secondary"
                          disabled
                          title="A packing list opens once you respond or receive orders for this date"
                        >
                          <FarmstandIcon name="package" />
                          Packing list
                        </FarmstandButton>
                      ))}
                    <FarmstandLink
                      href={`/vendor/day/${current.occurrence.id}`}
                      onClick={(event) =>
                        inApp(event, `/vendor/day/${current.occurrence.id}`)
                      }
                    >
                      Open Market Day
                    </FarmstandLink>
                    <FarmstandLink
                      href={`/vendor/markets/${current.membership.id}/dates/${current.occurrence.id}/preparation`}
                      onClick={(event) =>
                        inApp(
                          event,
                          `/vendor/markets/${current.membership.id}/dates/${current.occurrence.id}/preparation`,
                        )
                      }
                    >
                      Market preparation
                    </FarmstandLink>
                    <FarmstandLink
                      href={marketHref}
                      variant="secondary"
                      onClick={(event) => inApp(event, marketHref!)}
                    >
                      View market
                      <FarmstandIcon name="chevron-right" />
                    </FarmstandLink>
                  </div>
                </>
              ) : (
                <EmptyState title="No market date selected">
                  <p>Select a market date to review its details.</p>
                </EmptyState>
              )}
            </FarmstandPanel>
          </DetailSheet>
        </div>
      )}
      {current && (
        <Dialog
          open={confirming}
          size="standard"
          title="Not attending this date?"
          busy={busy}
          onClose={() => {
            if (!busy) setConfirming(false);
          }}
          actions={
            <FarmstandButton
              variant="destructive"
              loading={busy}
              onClick={() => void respond(current, false)}
            >
              Mark not attending
            </FarmstandButton>
          }
        >
          <p>
            {current.membership.market.name} on{' '}
            {marketDate(current.occurrence, true)}. The market will see that you
            are not attending. Existing orders remain backend managed.
          </p>
        </Dialog>
      )}
    </>
  );
}
