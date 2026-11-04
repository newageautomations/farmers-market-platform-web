import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LoyaltyOverview } from '@market/api';
import { safeError } from '@market/api';
import {
  Alert,
  Badge,
  Dialog,
  EmptyState,
  Field,
  scrollToPaginatedTable,
  UtilityIcon,
} from '@market/ui';
import { formatMoney } from '@market/config';
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
import { ReadState, useRead } from './common';
import { OrdersDateRange } from './OrdersDateRange';
import type { VendorService } from './service';
import './orders.css';
import './loyalty-dashboard.css';
import { LoyaltyLeaderboard } from './LoyaltyLeaderboard';
import { LoyaltyIcon } from './LoyaltyIcon';
import { NavigationIcon } from '../NavigationIcon';
import { WorkspaceMenu } from '../WorkspaceMenu';
import { LoyaltyRewards } from './LoyaltyRewards';
import {
  filterRedemptions,
  readRedemptions,
  readRedemptionOrder,
  readRedemptionSpending,
  redemptionStatuses,
  type RedemptionFilters,
} from './loyalty-redemptions-data';
import './loyalty-leaderboard.css';
import './loyalty-rewards.css';
import './loyalty-redemptions.css';

type LoyaltyView = 'overview' | 'rewards' | 'leaderboard' | 'redemptions';

type Metric = 'earned' | 'redeemed' | 'redemptions' | 'customers';
type Range = { from: string; to: string };
const metrics: Record<Metric, string> = {
  earned: 'Points earned',
  redeemed: 'Points redeemed',
  redemptions: 'Reward redemptions',
  customers: 'Repeat customer activity',
};
const dayMs = 86400000;
export function loyaltyRange(days: number): Range {
  const to = new Date().toISOString().slice(0, 10);
  return {
    from: new Date(Date.parse(to) - (days - 1) * dayMs)
      .toISOString()
      .slice(0, 10),
    to,
  };
}
const dateLabel = (day: string) =>
  new Date(day + 'T00:00:00Z').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/** Native hash links retain the selected view inside the loyalty workspace. */
export function LoyaltyMenu({
  view,
  onView,
}: {
  view: LoyaltyView;
  onView: (view: LoyaltyView) => void;
}) {
  const items: Array<{ label: string; suffix: string; icon?: ReactNode }> = [
    {
      label: 'Overview',
      suffix: '',
      icon: <NavigationIcon path="/vendor/finances" />,
    },
    { label: 'Rewards', suffix: '/rewards', icon: <LoyaltyIcon name="gift" /> },
    {
      label: 'Leaderboard',
      suffix: '/leaderboard',
      icon: <LoyaltyIcon name="trophy" />,
    },
    {
      label: 'Redeemed rewards',
      suffix: '/redemptions',
      icon: <LoyaltyIcon name="ticket" />,
    },
  ];
  return (
    <WorkspaceMenu
      className="loyalty-menu"
      label="Loyalty"
      value={view}
      onChange={onView}
      items={items.map(({ label, suffix, icon }) => ({
        label,
        icon,
        value: (suffix.slice(1) || 'overview') as LoyaltyView,
        href: '/vendor/loyalty' + (suffix ? '#' + suffix.slice(1) : ''),
      }))}
    />
  );
}

export function loyaltySeries(
  data: LoyaltyOverview['trend'],
  metric: Metric,
  range: Range,
) {
  const byDay = new Map(data.map((row) => [row.day, Number(row[metric])]));
  return Array.from(
    {
      length:
        Math.round((Date.parse(range.to) - Date.parse(range.from)) / dayMs) + 1,
    },
    (_, index) => {
      const day = new Date(Date.parse(range.from) + index * dayMs)
        .toISOString()
        .slice(0, 10);
      return { day, value: byDay.get(day) ?? 0 };
    },
  );
}

/** Rounded whole-number ticks keep small redemption/customer counts distinct from points. */
export function loyaltyScale(values: number[]) {
  const low = Math.min(0, ...values),
    high = Math.max(1, ...values);
  const rough = (high - low) / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(
    1,
    Math.ceil(
      [1, 2, 2.5, 5, 10].find((value) => value * power >= rough)! * power,
    ),
  );
  const min = Math.floor(low / step) * step,
    max = Math.ceil(high / step) * step;
  return {
    min,
    max,
    ticks: Array.from(
      { length: Math.round((max - min) / step) + 1 },
      (_, index) => min + index * step,
    ),
  };
}

function ActivityGraph({
  data,
  metric,
  range,
}: {
  data: LoyaltyOverview['trend'];
  metric: Metric;
  range: Range;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const element = container.current!;
    const measure = () => setWidth(Math.max(280, element.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const series = loyaltySeries(data, metric, range);
  const scale = loyaltyScale(series.map((row) => row.value));
  const labelStep = Math.max(
    1,
    Math.ceil(series.length / (width < 500 ? 3 : 8)),
  );
  const x = (index: number) =>
    56 + (index * (width - 74)) / Math.max(1, series.length - 1);
  const y = (value: number) =>
    220 - ((value - scale.min) / (scale.max - scale.min)) * 190;
  const path = series
    .map((row, index) => `${index ? 'L' : 'M'}${x(index)},${y(row.value)}`)
    .join(' ');
  const [active, setActive] = useState<number>();
  const point = active === undefined ? undefined : series[active];
  return (
    <div className="loyalty-graph" ref={container}>
      <svg
        viewBox={`0 0 ${width} 265`}
        role="img"
        aria-label={`${metrics[metric]} by day, ${dateLabel(range.from)} to ${dateLabel(range.to)} (UTC)`}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1="56"
              x2={width - 18}
              y1={y(tick)}
              y2={y(tick)}
              className="loyalty-grid-line"
            />
            <text x="46" y={y(tick) + 4} textAnchor="end">
              {tick.toLocaleString()}
            </text>
          </g>
        ))}
        <path
          d={`${path} L${x(series.length - 1)},${y(0)} L56,${y(0)} Z`}
          fill={`url(#${id})`}
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {series.map((row, index) =>
          index % Math.max(1, Math.ceil(series.length / 14)) === 0 ||
          index === series.length - 1 ? (
            <circle
              key={row.day}
              cx={x(index)}
              cy={y(row.value)}
              r="3.5"
              className="loyalty-data-dot"
            >
              <title>
                {row.day}: {row.value.toLocaleString()}{' '}
                {metrics[metric].toLowerCase()}
              </title>
            </circle>
          ) : null,
        )}
        {series.map((row, index) =>
          (index % labelStep === 0 &&
            index < series.length - 1 - labelStep * 0.6) ||
          index === series.length - 1 ? (
            <text
              key={row.day}
              x={x(index)}
              y="248"
              textAnchor={
                index === 0
                  ? 'start'
                  : index === series.length - 1
                    ? 'end'
                    : 'middle'
              }
            >
              {dateLabel(row.day)}
            </text>
          ) : null,
        )}
        {point && (
          <>
            <line
              x1={x(active!)}
              x2={x(active!)}
              y1="30"
              y2="220"
              className="loyalty-guide"
            />
            <circle
              cx={x(active!)}
              cy={y(point.value)}
              r="5"
              className="loyalty-data-dot"
            />
          </>
        )}
      </svg>
      <div
        className="loyalty-graph-interaction"
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          setActive(
            Math.min(
              series.length - 1,
              Math.max(
                0,
                Math.round(
                  ((event.clientX - box.left) / box.width) *
                    (series.length - 1),
                ),
              ),
            ),
          );
        }}
        onPointerLeave={() => setActive(undefined)}
        aria-hidden="true"
      />
      {point && (
        <output className="loyalty-graph-hint">
          {dateLabel(point.day)}:{' '}
          <strong>{point.value.toLocaleString()}</strong>{' '}
          {metrics[metric].toLowerCase()}
        </output>
      )}
      <div className="loyalty-graph-legend">
        <span />
        {metrics[metric]}
      </div>
      {series.every((row) => !row.value) && (
        <p className="loyalty-empty-activity">No activity in this period.</p>
      )}
    </div>
  );
}

export function LoyaltyDashboard({
  service,
  initialView,
  initialCreate = false,
  initialRewardId,
}: {
  service: VendorService;
  initialView?: LoyaltyView;
  initialCreate?: boolean;
  initialRewardId?: number;
}) {
  const hashView = (): LoyaltyView =>
    window.location.hash === '#leaderboard'
      ? 'leaderboard'
      : window.location.hash === '#rewards'
        ? 'rewards'
        : window.location.hash === '#redemptions'
          ? 'redemptions'
          : 'overview';
  const [view, setView] = useState<LoyaltyView>(
    () => initialView ?? hashView(),
  );
  const [rewardId, setRewardId] = useState(initialRewardId);
  const [createRequest, setCreateRequest] = useState(initialCreate ? 1 : 0);
  useEffect(() => {
    if (initialView)
      window.history.replaceState(null, '', '/vendor/loyalty#' + initialView);
    const sync = () => setView(hashView());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, [initialView]);
  function changeView(next: LoyaltyView) {
    if (next === view) return;
    window.history.pushState(
      null,
      '',
      '/vendor/loyalty' + (next === 'overview' ? '' : '#' + next),
    );
    setView(next);
  }
  const api = service.loyalty!;
  const [period, setPeriod] = useState('90');
  const [range, setRange] = useState(() => loyaltyRange(90));
  const [metric, setMetric] = useState<Metric>('earned');
  const [calendar, setCalendar] = useState(false);
  const [daily, setDaily] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const read = useCallback(
    () =>
      api.overview({
        trendFrom: range.from + 'T00:00:00Z',
        trendThrough: new Date(Date.parse(range.to) + dayMs).toISOString(),
      }),
    [api, range],
  );
  const query = useRead(
    `loyalty-dashboard:${service.vendorId}:${range.from}:${range.to}`,
    read,
    view === 'overview',
  );
  const data = query.data;
  const [redemptionFilters, setRedemptionFilters] = useState<RedemptionFilters>(
    {
      search: '',
      reward: 'all',
      status: 'COMPLETED',
      period: 'all',
      range: loyaltyRange(30),
      sort: 'newest',
    },
  );
  const [redemptionPage, setRedemptionPage] = useState(0);
  const [selectedRedemption, setSelectedRedemption] = useState<number>();
  const [redemptionCalendar, setRedemptionCalendar] = useState(false);
  const loadRedemptions = useCallback(
    () => readRedemptions(service),
    [service],
  );
  const redemptions = useRead(
    `loyalty-redemptions:${service.vendorId}`,
    loadRedemptions,
    view === 'redemptions',
  );
  const filteredRedemptions = useMemo(
    () => filterRedemptions(redemptions.data ?? [], redemptionFilters),
    [redemptions.data, redemptionFilters],
  );
  const shownRedemptions = filteredRedemptions.slice(
    redemptionPage * 20,
    (redemptionPage + 1) * 20,
  );
  const redemption =
    shownRedemptions.find((row) => row.id === selectedRedemption) ??
    shownRedemptions[0] ??
    redemptions.data?.[0];
  const completedRedemptions = filteredRedemptions.filter(
    (row) => row.status === 'COMPLETED',
  );
  const redemptionOrderId = String(redemption?.vendor_order_id ?? '');
  const loadRedemptionOrder = useCallback(
    () =>
      readRedemptionOrder(service, {
        vendor_order_id: redemptionOrderId ? Number(redemptionOrderId) : null,
      }),
    [service, redemptionOrderId],
  );
  const redemptionOrder = useRead(
    `redemption-order:${service.vendorId}:${redemption?.id}`,
    loadRedemptionOrder,
    view === 'redemptions' && !!redemption,
  );
  const loadSpending = useCallback(
    () => readRedemptionSpending(service, redemptions.data ?? []),
    [service, redemptions.data],
  );
  const spending = useRead(
    `redemption-spending:${service.vendorId}`,
    loadSpending,
    view === 'redemptions' && !!redemptions.data,
  );
  const discountedOrders = [
    ...new Set(completedRedemptions.map((row) => row.vendor_order_id)),
  ];
  const totalSpent = spending.loading
    ? 'Loading...'
    : discountedOrders.every((id) => id && spending.data?.has(id))
      ? formatMoney(
          discountedOrders.reduce(
            (sum, id) => sum + (spending.data?.get(id!) ?? 0),
            0,
          ),
          'USD',
        )
      : 'Unavailable';
  function changeRedemptions(next: Partial<RedemptionFilters>) {
    setRedemptionFilters((current) => ({ ...current, ...next }));
    setRedemptionPage(0);
    setSelectedRedemption(undefined);
  }
  const manage = service.context.permissions.includes('ManageOwnCoupon');
  async function toggleProgram() {
    if (!data || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.program(!data.enabled);
      query.refresh();
    } catch (cause) {
      setError(safeError(cause).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="loyalty-dashboard">
      <header className="loyalty-heading">
        <div className="loyalty-heading-title">
          <LoyaltyIcon name="star" />
          <div>
            <h1>Loyalty Program</h1>
            <p>
              Track points activity, redemptions, and overall program
              performance.
            </p>
          </div>
        </div>
        {manage && (
          <FarmstandLink
            href="/vendor/loyalty#rewards"
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
                changeView('rewards');
                setCreateRequest((request) => request + 1);
              }
            }}
          >
            <LoyaltyIcon name="gift" />
            Create Reward
          </FarmstandLink>
        )}
      </header>
      <LoyaltyMenu view={view} onView={changeView} />
      <div className="loyalty-view" key={view}>
        {view === 'rewards' && (
          <LoyaltyRewards
            service={service}
            createRequest={createRequest}
            initialRewardId={rewardId}
            onEditorClose={() => {
              setCreateRequest(0);
              setRewardId(undefined);
            }}
          />
        )}
        {view === 'leaderboard' && <LoyaltyLeaderboard service={service} />}
        {view === 'redemptions' && (
          <section
            className="loyalty-rewards loyalty-redemptions"
            aria-label="Redeemed rewards"
          >
            <ReadState {...redemptions} retry={redemptions.refresh} />
            {redemptions.data && (
              <>
                <div className="redemptions-toolbar">
                  <Field
                    id="redemptions-search"
                    label="Search customer or reward"
                  >
                    <FarmstandSearch
                      id="redemptions-search"
                      placeholder="Search customer or reward..."
                      maxLength={80}
                      value={redemptionFilters.search}
                      onChange={(event) =>
                        changeRedemptions({ search: event.target.value })
                      }
                    />
                  </Field>
                  <Field id="redemptions-reward" label="Reward">
                    <FarmstandSelect
                      id="redemptions-reward"
                      value={redemptionFilters.reward}
                      onChange={(event) =>
                        changeRedemptions({ reward: event.target.value })
                      }
                    >
                      <option value="all">All rewards</option>
                      {[
                        ...new Set(
                          redemptions.data.map((row) => row.terms.name),
                        ),
                      ]
                        .sort()
                        .map((name) => (
                          <option key={name}>{name}</option>
                        ))}
                    </FarmstandSelect>
                  </Field>
                  <Field id="redemptions-status" label="Status">
                    <FarmstandSelect
                      id="redemptions-status"
                      value={redemptionFilters.status}
                      onChange={(event) =>
                        changeRedemptions({ status: event.target.value })
                      }
                    >
                      <option value="all">All statuses</option>
                      {Object.entries(redemptionStatuses).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </FarmstandSelect>
                  </Field>
                  <Field id="redemptions-period" label="Date range">
                    <FarmstandSelect
                      id="redemptions-period"
                      icon="calendar-days"
                      value={redemptionFilters.period}
                      onChange={(event) =>
                        event.target.value === 'custom'
                          ? setRedemptionCalendar(true)
                          : changeRedemptions({ period: event.target.value })
                      }
                    >
                      <option value="all">All dates</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                      <option value="custom">
                        {redemptionFilters.period === 'custom'
                          ? `${dateLabel(redemptionFilters.range.from)} to ${dateLabel(redemptionFilters.range.to)}`
                          : 'Custom date range'}
                      </option>
                    </FarmstandSelect>
                  </Field>
                  <Field id="redemptions-sort" label="Sort by">
                    <FarmstandSelect
                      id="redemptions-sort"
                      value={redemptionFilters.sort}
                      onChange={(event) =>
                        changeRedemptions({ sort: event.target.value })
                      }
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </FarmstandSelect>
                  </Field>
                  {redemptionFilters.period === 'custom' && (
                    <FarmstandButton
                      variant="secondary"
                      onClick={() => setRedemptionCalendar(true)}
                    >
                      <UtilityIcon name="calendar" />
                      Edit date range
                    </FarmstandButton>
                  )}
                </div>
                <div
                  className="rewards-summary"
                  aria-label="Completed redemptions in filtered results"
                >
                  {[
                    {
                      label: 'Rewards redeemed',
                      value: completedRedemptions.length.toLocaleString(),
                      icon: 'gift' as const,
                    },
                    {
                      label: 'Total points used',
                      value: `${completedRedemptions.reduce((sum, row) => sum + row.terms.points, 0).toLocaleString()} pts`,
                      icon: 'coins' as const,
                    },
                    {
                      label: 'Total discounted',
                      value: formatMoney(
                        completedRedemptions.reduce(
                          (sum, row) => sum + row.discount,
                          0,
                        ),
                        'USD',
                      ),
                      icon: 'ticket' as const,
                    },
                    {
                      label: 'Total spent on discounted purchases',
                      value: totalSpent,
                      icon: 'activity' as const,
                    },
                  ].map((metric) => (
                    <FarmstandPanel key={metric.label} className="rewards-stat">
                      <span
                        className="rewards-stat-icon"
                        data-metric={metric.icon}
                      >
                        <LoyaltyIcon name={metric.icon} />
                      </span>
                      <div>
                        <strong>{metric.value}</strong>
                        <span>{metric.label}</span>
                      </div>
                    </FarmstandPanel>
                  ))}
                </div>
                <div className="leaderboard-columns">
                  <FarmstandPanel className="leaderboard-table-panel redemptions-table-panel">
                    <FarmstandTable
                      label="Redemption history"
                      headings={[
                        'Reward redeemed',
                        'Customer',
                        'Order #',
                        'Date & time',
                        'Discount',
                      ]}
                    >
                      {shownRedemptions.map((row) => (
                        <tr
                          key={row.id}
                          aria-selected={row.id === redemption?.id}
                          tabIndex={0}
                          aria-label={`View redemption ${row.id}: ${row.terms.name}`}
                          onClick={() => setSelectedRedemption(row.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedRedemption(row.id);
                            }
                          }}
                          className={
                            row.id === redemption?.id
                              ? 'leaderboard-selected'
                              : undefined
                          }
                        >
                          <th scope="row">
                            <span className="reward-identity">
                              <span className="reward-thumbnail">
                                <LoyaltyIcon name="gift" />
                                {row.terms.image && (
                                  <img
                                    src={row.terms.image}
                                    alt=""
                                    onError={(event) => {
                                      event.currentTarget.hidden = true;
                                    }}
                                  />
                                )}
                              </span>
                              <span>
                                <strong className="farmstand-text-link">
                                  {row.terms.name}
                                </strong>
                                {row.status !== 'COMPLETED' && (
                                  <span>
                                    {redemptionStatuses[row.status] ??
                                      row.status}
                                  </span>
                                )}
                              </span>
                            </span>
                          </th>
                          <td>{row.customer || 'Unavailable'}</td>
                          <td>
                            {row.vendor_order_id
                              ? `#${row.order_id}`
                              : `Cart ${row.order_id}`}
                          </td>
                          <td>
                            <time dateTime={row.created_at}>
                              {new Date(row.created_at).toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                },
                              )}
                              <br />
                              {new Date(row.created_at).toLocaleTimeString(
                                undefined,
                                { hour: 'numeric', minute: '2-digit' },
                              )}
                            </time>
                          </td>
                          <td>
                            <span className="redemption-discount">
                              <Badge
                                tone={
                                  row.status === 'COMPLETED'
                                    ? 'success'
                                    : 'neutral'
                                }
                              >
                                {formatMoney(-row.discount, 'USD')}
                              </Badge>
                              <FarmstandIcon name="chevron-right" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </FarmstandTable>
                    {!shownRedemptions.length && (
                      <EmptyState
                        title={
                          redemptions.data.length
                            ? 'No redemptions match'
                            : 'No redeemed rewards yet'
                        }
                      >
                        <p>
                          {redemptions.data.length
                            ? 'Try another customer, reward, status or date range.'
                            : 'Rewards will appear here when customers use them on an order.'}
                        </p>
                      </EmptyState>
                    )}
                    {!!filteredRedemptions.length && (
                      <div className="orders-footer">
                        <span>
                          {filteredRedemptions.length <= 20
                            ? `Showing all ${filteredRedemptions.length} redemptions`
                            : `Showing ${redemptionPage * 20 + 1} to ${Math.min((redemptionPage + 1) * 20, filteredRedemptions.length)} of ${filteredRedemptions.length} redemptions`}
                        </span>
                        {filteredRedemptions.length > 20 ? (
                          <nav
                            className="orders-pagination"
                            aria-label="Redemption pages"
                            onClickCapture={(event) =>
                              scrollToPaginatedTable(event.currentTarget)
                            }
                          >
                            <FarmstandButton
                              variant="secondary"
                              size="compact"
                              disabled={!redemptionPage}
                              onClick={() => {
                                setRedemptionPage(redemptionPage - 1);
                                setSelectedRedemption(undefined);
                              }}
                            >
                              Previous
                            </FarmstandButton>
                            <FarmstandButton
                              variant="secondary"
                              size="compact"
                              disabled={
                                (redemptionPage + 1) * 20 >=
                                filteredRedemptions.length
                              }
                              onClick={() => {
                                setRedemptionPage(redemptionPage + 1);
                                setSelectedRedemption(undefined);
                              }}
                            >
                              Next
                            </FarmstandButton>
                          </nav>
                        ) : (
                          <span>
                            Select a reward to view details{' '}
                            <FarmstandIcon name="arrow-up-right" />
                          </span>
                        )}
                      </div>
                    )}
                  </FarmstandPanel>
                  {redemption && (
                    <FarmstandPanel
                      as="section"
                      className="leaderboard-preview redemptions-preview"
                      aria-label="Redemption details"
                    >
                      <div className="leaderboard-identity">
                        <span className="reward-thumbnail">
                          <LoyaltyIcon name="gift" />
                          {redemption.terms.image && (
                            <img
                              src={redemption.terms.image}
                              alt=""
                              onError={(event) => {
                                event.currentTarget.hidden = true;
                              }}
                            />
                          )}
                        </span>
                        <div>
                          <strong>{redemption.terms.name}</strong>
                          <p>
                            <Badge
                              tone={
                                redemption.status === 'COMPLETED'
                                  ? 'success'
                                  : redemption.status === 'REVERSED'
                                    ? 'danger'
                                    : 'neutral'
                              }
                            >
                              {redemptionStatuses[redemption.status] ??
                                redemption.status}
                            </Badge>
                          </p>
                        </div>
                      </div>
                      <ReadState
                        {...redemptionOrder}
                        retry={redemptionOrder.refresh}
                      />
                      <dl className="leaderboard-facts">
                        <div>
                          <dt>
                            <FarmstandIcon name="user-round" />
                            Customer
                          </dt>
                          <dd>{redemption.customer || 'Unavailable'}</dd>
                        </div>
                        <div>
                          <dt>
                            <FarmstandIcon name="hash" />
                            Order #
                          </dt>
                          <dd>
                            {redemptionOrder.data?.sale?.orderCode ||
                              (redemption.vendor_order_id
                                ? `#${redemption.order_id}`
                                : `Cart ${redemption.order_id}`)}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <FarmstandIcon name="map-pin" />
                            Redeemed at
                          </dt>
                          <dd>
                            {redemptionOrder.loading
                              ? 'Loading...'
                              : (redemptionOrder.data?.location ??
                                'Unavailable')}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <LoyaltyIcon name="coins" />
                            Points required
                          </dt>
                          <dd>
                            {redemption.terms.points.toLocaleString()} pts
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <FarmstandIcon name="tag" />
                            Total discounted
                          </dt>
                          <dd>{formatMoney(redemption.discount, 'USD')}</dd>
                        </div>
                        <div>
                          <dt>
                            <FarmstandIcon name="shopping-cart" />
                            Order total
                          </dt>
                          <dd>
                            {redemptionOrder.data?.sale
                              ? formatMoney(
                                  redemptionOrder.data.sale.amount,
                                  redemptionOrder.data.sale.currency as 'USD',
                                )
                              : redemptionOrder.data?.order.context
                                ? formatMoney(
                                    redemptionOrder.data.order.context.original,
                                    redemptionOrder.data.order.context
                                      .currency as 'USD',
                                  )
                                : 'Unavailable'}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <FarmstandIcon name="calendar-days" />
                            Recorded on
                          </dt>
                          <dd>
                            {new Date(redemption.created_at).toLocaleString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              },
                            )}
                          </dd>
                        </div>
                      </dl>
                      {redemption.status === 'REVERSED' && (
                        <p className="rewards-description">
                          Points restored after a full vendor refund.
                        </p>
                      )}
                      <div className="redemptions-actions">
                        {redemption.relationship && (
                          <FarmstandLink
                            variant="secondary"
                            href={`/vendor/customers/${encodeURIComponent(redemption.relationship.id)}`}
                          >
                            <FarmstandIcon name="user-round" />
                            View customer
                          </FarmstandLink>
                        )}
                        {redemption.vendor_order_id &&
                          service.context.permissions.includes(
                            'ReadOwnOrders',
                          ) && (
                            <FarmstandLink
                              variant="primary"
                              href={`/vendor/orders/${redemption.vendor_order_id}`}
                            >
                              <UtilityIcon name="external" />
                              View order
                            </FarmstandLink>
                          )}
                      </div>
                    </FarmstandPanel>
                  )}
                </div>
              </>
            )}
            {redemptionCalendar && (
              <OrdersDateRange
                value={redemptionFilters.range}
                subject="reward selections"
                onClose={() => setRedemptionCalendar(false)}
                onApply={(next) => {
                  changeRedemptions({ period: 'custom', range: next });
                  setRedemptionCalendar(false);
                }}
              />
            )}
          </section>
        )}
        {view === 'overview' && <ReadState {...query} retry={query.refresh} />}
        {view === 'overview' && error && (
          <Alert severity="error">{error}</Alert>
        )}
        {view === 'overview' && data && (
          <>
            <div className="loyalty-summary">
              <FarmstandPanel className="loyalty-program">
                <span
                  className="loyalty-program-dot"
                  data-enabled={data.enabled}
                />
                <div>
                  <h2>{data.enabled ? 'Program Enabled' : 'Program Paused'}</h2>
                  <p>
                    {data.enabled
                      ? 'Your loyalty program is live and customers can earn and redeem points.'
                      : 'Balances and history are preserved. New earnings and redemptions are paused.'}
                  </p>
                </div>
                {manage && (
                  <FarmstandButton
                    variant="secondary"
                    size="compact"
                    disabled={busy}
                    loading={busy}
                    onClick={() => void toggleProgram()}
                  >
                    {data.enabled ? (
                      <LoyaltyIcon name="pause" />
                    ) : (
                      <LoyaltyIcon name="star" />
                    )}
                    {data.enabled ? 'Pause Program' : 'Enable Program'}
                  </FarmstandButton>
                )}
              </FarmstandPanel>
              <FarmstandPanel className="loyalty-stat">
                <span className="loyalty-stat-icon">
                  <LoyaltyIcon name="members" />
                </span>
                <dl>
                  <dt>Loyalty members</dt>
                  <dd>{data.metrics.customers.toLocaleString()}</dd>
                </dl>
              </FarmstandPanel>
              <FarmstandPanel className="loyalty-stat">
                <span className="loyalty-stat-icon loyalty-icon-warm">
                  <LoyaltyIcon name="coins" />
                </span>
                <dl>
                  <dt>
                    Net points issued<span>All time</span>
                  </dt>
                  <dd>{Number(data.metrics.issued).toLocaleString()}</dd>
                </dl>
              </FarmstandPanel>
              <FarmstandPanel className="loyalty-stat">
                <span className="loyalty-stat-icon">
                  <LoyaltyIcon name="gift" />
                </span>
                <dl>
                  <dt>
                    Orders using rewards<span>All time</span>
                  </dt>
                  <dd>{data.metrics.rewardOrders.toLocaleString()}</dd>
                </dl>
              </FarmstandPanel>
            </div>
            <FarmstandPanel className="loyalty-activity-panel">
              <div className="loyalty-activity-header">
                <div className="loyalty-activity-title">
                  <LoyaltyIcon name="activity" />
                  <div>
                    <h2>Points Activity</h2>
                    <p>
                      Explore points earned, redeemed, and reward redemptions
                      over time.
                    </p>
                  </div>
                </div>
                <div className="loyalty-chart-controls">
                  <FarmstandSelect
                    icon="calendar-days"
                    aria-label="Activity period"
                    value={period}
                    onChange={(event) => {
                      if (event.target.value === 'custom') setCalendar(true);
                      else {
                        setPeriod(event.target.value);
                        setRange(loyaltyRange(Number(event.target.value)));
                      }
                    }}
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="custom">
                      {period === 'custom'
                        ? `${dateLabel(range.from)} to ${dateLabel(range.to)}`
                        : 'Custom date range'}
                    </option>
                  </FarmstandSelect>
                  {period === 'custom' && (
                    <FarmstandButton
                      variant="secondary"
                      size="compact"
                      onClick={() => setCalendar(true)}
                    >
                      <UtilityIcon name="calendar" />
                      Edit date range
                    </FarmstandButton>
                  )}
                  <label className="loyalty-metric-select">
                    <FarmstandSelect
                      aria-label="Display metric"
                      value={metric}
                      onChange={(event) =>
                        setMetric(event.target.value as Metric)
                      }
                    >
                      {Object.entries(metrics).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </FarmstandSelect>
                  </label>
                </div>
              </div>
              <ActivityGraph
                key={metric}
                data={data.trend}
                metric={metric}
                range={range}
              />
              <div className="loyalty-period-note">
                <span>
                  {dateLabel(range.from)}, {range.from.slice(0, 4)} to{' '}
                  {dateLabel(range.to)}, {range.to.slice(0, 4)} · Daily values
                  in UTC
                </span>
                <FarmstandButton
                  variant="tertiary"
                  onClick={() => setDaily(true)}
                >
                  <span className="farmstand-text-link">View daily values</span>
                </FarmstandButton>
              </div>
              <div className="loyalty-totals">
                {(['earned', 'redeemed', 'redemptions'] as const).map((key) => (
                  <FarmstandPanel key={key} className="loyalty-total">
                    <span
                      className={`loyalty-stat-icon${key === 'redemptions' ? ' loyalty-icon-warm' : ''}`}
                    >
                      {key === 'earned' ? (
                        <LoyaltyIcon name="coins" />
                      ) : key === 'redeemed' ? (
                        <LoyaltyIcon name="ticket" />
                      ) : (
                        <LoyaltyIcon name="gift" />
                      )}
                    </span>
                    <dl>
                      <dt>
                        {key === 'earned'
                          ? 'Total Points Earned'
                          : key === 'redeemed'
                            ? 'Total Points Redeemed'
                            : 'Total Reward Redemptions'}
                      </dt>
                      <dd>
                        {loyaltySeries(data.trend, key, range)
                          .reduce((sum, row) => sum + row.value, 0)
                          .toLocaleString()}
                      </dd>
                      <dd className="loyalty-total-period">Selected period</dd>
                    </dl>
                  </FarmstandPanel>
                ))}
              </div>
            </FarmstandPanel>
            <Dialog
              open={daily}
              title={`${metrics[metric]} by date`}
              onClose={() => setDaily(false)}
            >
              <p>Daily values in UTC, including days with no activity.</p>
              <dl className="loyalty-daily-values">
                {loyaltySeries(data.trend, metric, range).map((row) => (
                  <div key={row.day}>
                    <dt>{row.day}</dt>
                    <dd>{row.value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </Dialog>
          </>
        )}
      </div>
      {calendar && (
        <OrdersDateRange
          value={range}
          subject="loyalty activity (UTC)"
          maxDays={366}
          onClose={() => setCalendar(false)}
          onApply={(next) => {
            const span = Date.parse(next.to) - Date.parse(next.from);
            if (!Number.isFinite(span) || span < 0 || span >= 366 * dayMs)
              return;
            setRange(next);
            setPeriod('custom');
            setCalendar(false);
          }}
        />
      )}
    </div>
  );
}
