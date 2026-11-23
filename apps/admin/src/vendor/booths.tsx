import { useEffect, useId, useMemo, useState } from 'react';
import type { VendorBoothAssignment } from '@market/api';
import { formatMoney } from '@market/config';
import { Alert, Badge, EmptyState, Field, MarketMap } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { IdentityIcon } from '@market/ui/workspace';
import '@market/ui/farmstand.css';
import '@market/ui/workspace.css';
import '@market/ui/workspace-records.css';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { useProfileImages } from '../profile-images';
import { DetailSheet, usePhoneRecords } from '../market/mobile';
import type { VendorService } from './service';
import { ReadState, useRead } from './common';
import { BoothInvoicePayment } from './BoothInvoicePayment';
import { MarketsPagination as Pagination } from './MarketsPagination';
import './booths.css';

const PAGE_SIZE = 10;

type BoothPayment = 'awaiting' | 'paid' | 'none' | 'cancelled';
const paymentLabels: Record<BoothPayment, string> = {
  awaiting: 'Awaiting payment',
  paid: 'Paid',
  none: 'No invoice',
  cancelled: 'Cancelled',
};
const paymentTones = {
  awaiting: 'warning',
  paid: 'success',
  none: 'neutral',
  cancelled: 'danger',
} as const;
/** The Overview's "Booth fee due" rule: an issued invoice with a balance. */
const DUE_STATUSES = ['OPEN', 'PAST_DUE'];
const CLOSED_STATUSES = ['VOID', 'CANCELED', 'CANCEL_PENDING'];

type Invoice = VendorBoothAssignment['invoices'][number];
const boothKey = (a: VendorBoothAssignment) =>
  `${a.occurrenceId}:${a.elementId}`;
const cancelledDate = (a: VendorBoothAssignment) =>
  a.occurrenceStatus === 'cancelled';
const invoiceDue = (i: Invoice) =>
  DUE_STATUSES.includes(i.status) ? Math.max(0, i.totalMinor - i.paidMinor) : 0;

/** One payment state per booth, so the filter, table and panel agree. */
function boothPayment(a: VendorBoothAssignment): BoothPayment {
  if (cancelledDate(a)) return 'cancelled';
  if (a.invoices.some((i) => invoiceDue(i) > 0)) return 'awaiting';
  if (
    a.invoices.some(
      (i) =>
        i.status !== 'DRAFT' &&
        !CLOSED_STATUSES.includes(i.status) &&
        i.paidMinor >= i.totalMinor,
    )
  )
    return 'paid';
  return 'none';
}
/** Balances by currency; a cancelled date has nothing due. */
function boothDue(assignments: readonly VendorBoothAssignment[]) {
  const totals = new Map<string, number>();
  for (const a of assignments) {
    if (cancelledDate(a)) continue;
    for (const i of a.invoices) {
      const due = invoiceDue(i);
      if (due > 0) totals.set(i.currency, (totals.get(i.currency) ?? 0) + due);
    }
  }
  return [...totals]
    .map(([currency, minor]) => formatMoney(minor, currency))
    .join(' + ');
}
function PaymentBadge({ assignment }: { assignment: VendorBoothAssignment }) {
  const payment = boothPayment(assignment);
  const pastDue =
    payment === 'awaiting' &&
    assignment.invoices.some(
      (i) => i.status === 'PAST_DUE' && invoiceDue(i) > 0,
    );
  return (
    <Badge tone={pastDue ? 'danger' : paymentTones[payment]}>
      {pastDue ? 'Past due' : paymentLabels[payment]}
    </Badge>
  );
}
function invoiceSummary(i: Invoice, cancelled: boolean) {
  if (cancelled || CLOSED_STATUSES.includes(i.status)) return 'No payment due';
  if (i.status === 'DRAFT') return 'Not issued yet';
  if (i.paidMinor >= i.totalMinor)
    return `Paid in full · ${formatMoney(i.totalMinor, i.currency)}`;
  return `${formatMoney(i.totalMinor - i.paidMinor, i.currency)} due`;
}
const boothDate = (a: VendorBoothAssignment, full = false) =>
  new Date(a.startsAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(full ? ({ year: 'numeric' } as const) : {}),
  });
const boothTime = (a: VendorBoothAssignment) =>
  new Date(a.startsAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
const plural = (count: number, one: string, many = one + 's') =>
  `${count} ${count === 1 ? one : many}`;
const pastDue = (a: VendorBoothAssignment) =>
  a.invoices.some((i) => i.status === 'PAST_DUE' && invoiceDue(i) > 0);

/** The page's only summary: shown while a booth fee is awaiting payment, as
 * the shared warning Alert (error once a fee is past due) with the amount,
 * the soonest booth and a button that opens that booth's invoice. */
function PaymentDueNotice({
  awaiting,
  onPay,
}: {
  awaiting: readonly VendorBoothAssignment[];
  onPay: (booth: VendorBoothAssignment) => void;
}) {
  const id = useId();
  const next = [...awaiting].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  )[0]!;
  const late = awaiting.some(pastDue);
  const booth = `booth ${next.space.label}${next.marketName ? ` at ${next.marketName}` : ''}, ${boothDate(next, true)}`;
  return (
    <Alert
      severity={late ? 'error' : 'warning'}
      className="vendor-booths-notice"
      aria-labelledby={id}
    >
      <span className="vendor-booths-notice-icon" aria-hidden="true">
        <FarmstandIcon name={late ? 'triangle-alert' : 'credit-card'} />
      </span>
      <div className="vendor-booths-notice-text">
        <strong id={id}>
          {boothDue(awaiting)} in booth fees{' '}
          {late ? 'past due' : 'awaiting payment'}
        </strong>
        <p>
          {awaiting.length > 1
            ? `${plural(awaiting.length, 'booth')} to pay. The next is ${booth}.`
            : `For ${booth}.`}
        </p>
      </div>
      <FarmstandButton onClick={() => onPay(next)}>
        <FarmstandIcon name="credit-card" />
        {awaiting.length > 1 ? 'Pay next invoice' : 'Pay invoice'}
      </FarmstandButton>
    </Alert>
  );
}

/** Vendor booth assignments as the Markets workspace list: a payment notice,
 * market, payment and date-order filters, a table, the selected booth's
 * details with its invoices, and the published map for that date. The list
 * opens on booths awaiting payment; a linked booth (`?occurrence=`) opens
 * with every status shown so the link's booth is never filtered out. */
export function VendorBooths({ service }: { service: VendorService }) {
  const id = useId();
  const read = useRead(
    `booths:${service.vendorId}`,
    service.boothAssignments ?? unavailable,
    true,
    { retainPreviousData: true },
  );
  const [requested] = useState(() =>
    new URLSearchParams(window.location.search).get('occurrence'),
  );
  const [requestedInvoice] = useState(() =>
    new URLSearchParams(window.location.search).get('invoice'),
  );
  const records = usePhoneRecords();
  const [market, setMarket] = useState('all'),
    [payment, setPayment] = useState(requested ? 'all' : 'awaiting'),
    [sort, setSort] = useState('newest'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string>(),
    // The linked booth stays selected (and its invoice link open) until the
    // vendor picks another booth or changes a filter.
    [linked, setLinked] = useState(!!requested),
    // Phones open a tapped booth's details in a bottom sheet.
    [sheet, setSheet] = useState(false),
    // The notice's Pay button opens this invoice; `n` remounts it on a repeat
    // click, and `open` is consumed once it has opened so a later remount
    // (a resize into the phone sheet) does not reopen it.
    [payRequest, setPayRequest] = useState<{
      invoiceId: number;
      n: number;
      open: boolean;
    }>();
  useEffect(() => {
    if (payRequest?.open) setPayRequest({ ...payRequest, open: false });
  }, [payRequest]);
  const all = read.data;
  const markets = useMemo(
    () =>
      [
        ...new Map(
          (all ?? [])
            .filter((a) => a.marketId != null && a.marketName)
            .map((a) => [String(a.marketId), a.marketName!]),
        ),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [all],
  );
  const visible = useMemo(
    () =>
      (all ?? [])
        .filter(
          (a) =>
            (market === 'all' || String(a.marketId) === market) &&
            (payment === 'all' || boothPayment(a) === payment),
        )
        .sort(
          (a, b) =>
            (sort === 'oldest' ? 1 : -1) *
              (Date.parse(a.startsAt) - Date.parse(b.startsAt)) ||
            a.space.label.localeCompare(b.space.label),
        ),
    [all, market, payment, sort],
  );
  const shown = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  // Resolved from every booth, not just this page: paying an invoice can move
  // the booth out of the current filter, and its open invoice must stay put.
  const current =
    all?.find((a) => boothKey(a) === selected) ??
    (linked
      ? all?.find((a) => String(a.occurrenceId) === requested)
      : undefined) ??
    shown[0];
  const profileImages = useProfileImages(service.profileImage, {
    markets: [...shown.map((a) => a.marketId), current?.marketId],
  });
  const awaiting = (all ?? []).filter((a) => boothPayment(a) === 'awaiting');
  function changeFilter(update: () => void) {
    update();
    setPage(0);
    setSelected(undefined);
    setLinked(false);
    setPayRequest(undefined);
  }
  function select(a: VendorBoothAssignment) {
    if (current && boothKey(a) !== boothKey(current)) {
      setLinked(false);
      setPayRequest(undefined);
    }
    setSelected(boothKey(a));
  }
  function pay(a: VendorBoothAssignment) {
    const invoice = a.invoices.find((i) => invoiceDue(i) > 0);
    if (!invoice) return;
    setSelected(boothKey(a));
    setLinked(false);
    // The details (and so the invoice dialog) sit in a bottom sheet on phones.
    if (records()) setSheet(true);
    setPayRequest((r) => ({
      invoiceId: invoice.id,
      n: (r?.n ?? 0) + 1,
      open: true,
    }));
  }
  return (
    <WorkspaceFrame
      className="vendor-booths farmstand-controls"
      icon="map-pin"
      title="Booth assignments"
      description="Your booths for market dates, with invoices and the market map for each."
      tabs={[]}
      value="booths"
      onChange={() => undefined}
    >
      <ReadState
        loading={!all && read.loading}
        error={read.error}
        retry={read.refresh}
      />
      {all && (
        <div className="markets-columns market-applications-columns">
          <div className="market-applications-main">
            {awaiting.length > 0 && (
              <PaymentDueNotice awaiting={awaiting} onPay={pay} />
            )}
            <FarmstandPanel
              as="section"
              className="markets-list market-applications-list vendor-booths-list"
              aria-label="Your booths"
            >
              <h2>Your booths</h2>
              <div className="markets-filters vendor-booths-filters">
                <Field
                  id={id + '-market'}
                  label={<span className="sr-only">Market</span>}
                >
                  <FarmstandSelect
                    id={id + '-market'}
                    value={market}
                    disabled={!markets.length}
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
                  id={id + '-payment'}
                  label={<span className="sr-only">Payment status</span>}
                >
                  <FarmstandSelect
                    id={id + '-payment'}
                    value={payment}
                    onChange={(e) =>
                      changeFilter(() => setPayment(e.target.value))
                    }
                  >
                    <option value="all">All payment statuses</option>
                    {(Object.keys(paymentLabels) as BoothPayment[]).map(
                      (value) => (
                        <option key={value} value={value}>
                          {paymentLabels[value]}
                        </option>
                      ),
                    )}
                  </FarmstandSelect>
                </Field>
                <Field
                  id={id + '-sort'}
                  label={<span className="sr-only">Sort booths</span>}
                >
                  <FarmstandSelect
                    id={id + '-sort'}
                    value={sort}
                    onChange={(e) =>
                      changeFilter(() => setSort(e.target.value))
                    }
                  >
                    <option value="newest">Market date: Newest</option>
                    <option value="oldest">Market date: Oldest</option>
                  </FarmstandSelect>
                </Field>
              </div>
              {shown.length ? (
                <>
                  <FarmstandTable
                    label="Your booths"
                    recordDetails={records({
                      status: 4,
                      onOpen: (index) => {
                        const booth = shown[index];
                        if (!booth) return;
                        select(booth);
                        setSheet(true);
                      },
                    })}
                    wide
                    headings={[
                      'Market',
                      'Booth',
                      'Market date',
                      'Amount due',
                      'Payment',
                    ]}
                  >
                    {shown.map((a) => {
                      const key = boothKey(a);
                      const due = boothDue([a]);
                      return (
                        <tr
                          key={key}
                          tabIndex={0}
                          className={
                            current && key === boothKey(current)
                              ? 'market-application-selected'
                              : undefined
                          }
                          onClick={() => select(a)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              select(a);
                            }
                          }}
                        >
                          <th scope="row">
                            <div className="markets-identity">
                              <IdentityIcon
                                icon="store"
                                image={profileImages.market(a.marketId)}
                              />
                              <span className="market-application-name">
                                {a.marketName || 'Market'}
                              </span>
                            </div>
                          </th>
                          <td>
                            <Badge tone="neutral">{a.space.label}</Badge>
                          </td>
                          <td>
                            <div className="markets-date">
                              <span>
                                <FarmstandIcon name="calendar-days" />
                                {boothDate(a, true)}
                              </span>
                              <small>{boothTime(a)}</small>
                            </div>
                          </td>
                          <td className="vendor-booths-due">
                            {due || <span className="markets-muted">None</span>}
                          </td>
                          <td className="market-application-status-cell">
                            <div className="market-application-status-content">
                              <PaymentBadge assignment={a} />
                              <FarmstandIcon name="chevron-right" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </FarmstandTable>
                  <Pagination
                    label="Booth pages"
                    summary={`${plural(visible.length, 'booth')}. Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, visible.length)}.`}
                    hasPrevious={page > 0}
                    hasNext={(page + 1) * PAGE_SIZE < visible.length}
                    onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                    onNext={() => setPage((p) => p + 1)}
                  />
                </>
              ) : (
                <EmptyState
                  title={
                    !all.length
                      ? 'No booth assignments yet'
                      : payment === 'awaiting' && market === 'all'
                        ? 'No booths awaiting payment'
                        : 'No matching booths'
                  }
                >
                  <p>
                    {!all.length
                      ? 'Booths appear here once a market assigns you one.'
                      : payment === 'awaiting' && market === 'all'
                        ? 'Every booth fee is paid. Choose another payment status to see your other booths.'
                        : 'Try another market or payment status.'}
                  </p>
                </EmptyState>
              )}
            </FarmstandPanel>
            {current && (
              <FarmstandPanel
                as="section"
                id={id + '-map'}
                // Focus target for the details panel's View market map button.
                tabIndex={-1}
                className="markets-list vendor-booth-map-panel"
                aria-label="Market map"
              >
                <div className="market-applications-title">
                  <h2>
                    <FarmstandIcon name="map-pin" />
                    Market map
                  </h2>
                  <p>
                    Booth {current.space.label}
                    {current.marketName
                      ? ` at ${current.marketName}`
                      : ''}, {boothDate(current, true)}.
                  </p>
                </div>
                {current.map ? (
                  <div className="vendor-booth-map">
                    <MarketMap
                      key={boothKey(current)}
                      definition={current.map.definition}
                      spaces={current.map.spaces}
                      selectedId={current.elementId}
                      showBoothList={false}
                    />
                  </div>
                ) : (
                  <p className="markets-muted">
                    The market map is awaiting publication.
                  </p>
                )}
              </FarmstandPanel>
            )}
          </div>
          <DetailSheet
            phoneOnly
            title="Booth details"
            open={sheet}
            onClose={() => setSheet(false)}
          >
            <FarmstandPanel
              as="section"
              className="markets-next market-application-details vendor-booth-details"
              aria-label="Booth details"
            >
              <h2>
                <FarmstandIcon name="map-pin" />
                Booth details
              </h2>
              {current ? (
                <BoothDetails
                  key={boothKey(current)}
                  assignment={current}
                  service={service}
                  image={profileImages.market(current.marketId)}
                  requestedInvoice={linked ? requestedInvoice : null}
                  payRequest={payRequest}
                  onViewMap={() => {
                    // On phones the details are a sheet over the page: close
                    // it first so the map underneath is what scrolls into view.
                    setSheet(false);
                    requestAnimationFrame(() => {
                      const map = document.getElementById(id + '-map');
                      if (!map) return;
                      map.scrollIntoView({
                        behavior: window.matchMedia?.(
                          '(prefers-reduced-motion: reduce)',
                        ).matches
                          ? 'auto'
                          : 'smooth',
                        block: 'start',
                      });
                      map.focus({ preventScroll: true });
                    });
                  }}
                  onUpdated={() => {
                    // Keep this booth (and its open invoice) selected while
                    // the refreshed balance may move it out of the filter.
                    setSelected(boothKey(current));
                    read.refresh();
                  }}
                />
              ) : (
                <EmptyState title="No booth selected">
                  <p>Select a booth to review its details and invoices.</p>
                </EmptyState>
              )}
            </FarmstandPanel>
          </DetailSheet>
        </div>
      )}
    </WorkspaceFrame>
  );
}

function BoothDetails({
  assignment: a,
  service,
  image,
  requestedInvoice,
  payRequest,
  onViewMap,
  onUpdated,
}: {
  assignment: VendorBoothAssignment;
  service: VendorService;
  image: ReturnType<ReturnType<typeof useProfileImages>['market']>;
  requestedInvoice: string | null;
  /** Opens this invoice; a new `n` remounts it so a repeat click reopens it. */
  payRequest?: { invoiceId: number; n: number; open: boolean };
  /** Scrolls to the Market map panel; offered only when the map is published. */
  onViewMap: () => void;
  onUpdated: () => void;
}) {
  const cancelled = cancelledDate(a);
  const due = boothDue([a]);
  const amenities = a.space.amenities
    .map((x) => x.toLowerCase().replaceAll('_', ' '))
    .join(', ');
  return (
    <>
      <IdentityIcon className="markets-next-art" icon="store" image={image} />
      <div className="markets-next-content">
        <h3>Booth {a.space.label}</h3>
        {a.marketName && (
          <p className="markets-venue">
            <FarmstandIcon name="store" />
            {a.marketName}
          </p>
        )}
        <dl className="market-application-facts vendor-booth-facts">
          <div>
            <dt>Date</dt>
            <dd>{boothDate(a, true)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{boothTime(a)}</dd>
          </div>
          <div>
            <dt>Booth size</dt>
            <dd>
              {a.space.widthFeet > 0
                ? `${a.space.widthFeet} × ${a.space.depthFeet} ft`
                : 'Not provided'}
            </dd>
          </div>
          <div>
            <dt>Amenities</dt>
            <dd>{amenities || 'None'}</dd>
          </div>
          <div>
            <dt>Rentals</dt>
            <dd>
              {a.rentals.length
                ? a.rentals.map((r) => `${r.name} × ${r.quantity}`).join(', ')
                : 'None'}
            </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>
              <PaymentBadge assignment={a} />
            </dd>
          </div>
          {due && (
            <div>
              <dt>Amount due</dt>
              <dd>{due}</dd>
            </div>
          )}
        </dl>
        {cancelled && (
          <Alert severity="info">
            The market cancelled this date. Your booth assignment and invoices
            are cancelled. No payment is due. Recorded payments remain in your
            invoice history; contact the market about refunds.
          </Alert>
        )}
        {a.publicInstructions && (
          <p className="market-application-guidance">{a.publicInstructions}</p>
        )}
        {!!a.invoices.length && (
          <ul className="vendor-booth-invoices" aria-label="Booth invoices">
            {a.invoices.map((i) => (
              <li key={i.id}>
                <span className="vendor-booth-invoice-name">
                  <strong>Invoice {i.id}</strong>
                  <span>{invoiceSummary(i, cancelled)}</span>
                </span>
                {service.boothInvoices && (
                  <BoothInvoicePayment
                    key={
                      payRequest?.invoiceId === i.id ? payRequest.n : 'linked'
                    }
                    api={service.boothInvoices}
                    invoiceId={i.id}
                    initialOpen={
                      String(i.id) === requestedInvoice ||
                      (!!payRequest?.open && payRequest.invoiceId === i.id)
                    }
                    cancelled={cancelled}
                    actionLabel={
                      !cancelled && invoiceDue(i) > 0
                        ? 'Pay invoice'
                        : 'View invoice'
                    }
                    onUpdated={onUpdated}
                    marketDate={boothDate(a, true)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {a.map && (
          <FarmstandButton variant="secondary" onClick={onViewMap}>
            <FarmstandIcon name="map-pin" />
            View market map
          </FarmstandButton>
        )}
      </div>
    </>
  );
}

async function unavailable() {
  return [];
}
