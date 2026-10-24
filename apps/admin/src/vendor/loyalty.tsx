import { useCallback, useState, type FormEvent } from 'react';
import { formatMoney, parsePrice } from '@market/config';
import {
  safeError,
  type LoyaltyReward,
  type LoyaltyTerms,
  type LoyaltyOverview,
  type LoyaltyRank,
  type LoyaltyApi,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  RecordCard,
  UtilityIcon,
  EmptyState,
  Field,
  Input,
  Pagination,
  SearchSelect,
  SearchableMultiSelect,
  SelectField,
} from '@market/ui';
import '@market/ui/loyalty.css';
import type { VendorService } from './service';
import { go, ReadState, RouteLink, useRead } from './common';

const kinds = {
  FIXED: 'Fixed amount discount',
  PERCENTAGE: 'Percentage discount',
  FREE_PRODUCT: 'Free product',
} as const;
const initialTerms: LoyaltyTerms = {
  name: '',
  kind: 'FIXED',
  points: 2000,
  value: 200,
  maximum: 1500,
  minimum: 0,
  variantIds: [],
  quantity: 1,
  startsAt: null,
  endsAt: null,
  limit: null,
};
const tabs = [
  ['Overview', ''],
  ['Rewards', '/rewards'],
  ['Leaderboard', '/leaderboard'],
  ['Redeemed rewards', '/redemptions'],
] as const;
function valueLabel(t: LoyaltyTerms) {
  return t.kind === 'FIXED'
    ? formatMoney(t.value, 'USD') + ' off'
    : t.kind === 'PERCENTAGE'
      ? `${t.value}% off, up to ${formatMoney(t.maximum, 'USD')}`
      : `${t.quantity} free product${t.quantity === 1 ? '' : 's'} in your cart`;
}
function RankTable({
  rows,
  label = 'Customer leaderboard',
  start = 0,
}: {
  rows: LoyaltyRank[];
  label?: string;
  start?: number;
}) {
  return rows.length ? (
    <DataTable
      label={label}
      headings={['Customer', 'Rank', 'Net earned points']}
      recordDetails={{
        identifier: 0,
        status: 1,
        labels: rows.map((r) => r.customer),
      }}
    >
      {rows.map((r, index) => (
        <tr key={r.id}>
          <th scope="row">{r.customer}</th>
          <td>
            <span
              className="loyalty-rank"
              data-loyalty-rank={r.rank ?? start + index + 1}
            >
              #{r.rank ?? start + index + 1}
            </span>
          </td>
          <td>
            {Number(r.earned).toLocaleString()} points
            <dl>
              <dt>Available</dt>
              <dd>{Number(r.available).toLocaleString()} points</dd>
              <dt>Completed orders</dt>
              <dd>{r.orders}</dd>
              <dt>Last qualifying purchase</dt>
              <dd>
                {r.last_purchase
                  ? new Date(r.last_purchase).toLocaleDateString()
                  : 'None'}
              </dd>
            </dl>
          </td>
        </tr>
      ))}
    </DataTable>
  ) : (
    <EmptyState title="No qualifying customers yet">
      <p>Completed purchases will appear here.</p>
    </EmptyState>
  );
}
function TopCustomers({ rows }: { rows: LoyaltyRank[] }) {
  return rows.length ? (
    <ol className="loyalty-wallet-grid loyalty-top-customers">
      {rows.map((r, index) => (
        <li key={r.id} data-loyalty-rank={r.rank ?? index + 1}>
          <RecordCard
            title={r.customer}
            className="loyalty-leader-card"
            label={`${['Gold', 'Silver', 'Bronze'][index]} customer`}
            summary={
              <>
                <span
                  className="loyalty-leader-award"
                  role="img"
                  aria-label={
                    index === 0
                      ? 'First place trophy'
                      : index === 1
                        ? 'Second place medal'
                        : 'Third place medal'
                  }
                >
                  <UtilityIcon name={index === 0 ? 'trophy' : 'medal'} />
                </span>
                <p>{Number(r.earned).toLocaleString()} net lifetime points</p>
                <p>{r.orders} completed orders</p>
              </>
            }
          >
            <dl className="ui-record-facts">
              <div>
                <dt>Customer</dt>
                <dd>{r.customer}</dd>
              </div>
              <div>
                <dt>Net earned</dt>
                <dd>{Number(r.earned).toLocaleString()} points</dd>
              </div>
              <div>
                <dt>Available</dt>
                <dd>{Number(r.available).toLocaleString()} points</dd>
              </div>
              <div>
                <dt>Completed orders</dt>
                <dd>{r.orders}</dd>
              </div>
              <div>
                <dt>Last qualifying purchase</dt>
                <dd>
                  {r.last_purchase
                    ? new Date(r.last_purchase).toLocaleDateString()
                    : 'None'}
                </dd>
              </div>
            </dl>
          </RecordCard>
        </li>
      ))}
    </ol>
  ) : (
    <EmptyState title="No qualifying customers yet">
      <p>Completed purchases will appear here.</p>
    </EmptyState>
  );
}
function TrendGraph({
  data,
  metric,
  title,
  from,
  through,
}: {
  data: LoyaltyOverview['trend'];
  metric: 'earned' | 'redeemed' | 'redemptions' | 'customers';
  title: string;
  from: string;
  through: string;
}) {
  const days =
    Math.round((Date.parse(through) - Date.parse(from)) / 86400000) + 1;
  const start = new Date(from + 'T00:00:00Z');
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    return {
      day,
      value: Number(data.find((row) => row.day === day)?.[metric] ?? 0),
    };
  });
  const maximum = Math.max(1, ...series.map((r) => r.value));
  const total = series.reduce((sum, row) => sum + row.value, 0);
  const step = 270 / days;
  const barWidth = Math.min(18, step * 0.65);
  return (
    <>
      <p>
        <strong>{total.toLocaleString()}</strong> from {from} through {through}
      </p>
      <>
        <svg
          className="loyalty-trend"
          viewBox="0 0 330 180"
          role="img"
          aria-label={`${title}. ${series
            .filter((r) => r.value)
            .map((r) => `${r.day}: ${r.value}`)
            .join('. ')}`}
        >
          {[0, 0.5, 1].map((ratio) => (
            <g key={ratio}>
              <line
                x1="48"
                x2="318"
                y1={140 - 112 * ratio}
                y2={140 - 112 * ratio}
              />
              <text x="42" y={144 - 112 * ratio} textAnchor="end">
                {new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(maximum * ratio)}
              </text>
            </g>
          ))}
          {series
            .filter((r) => r.value > 0)
            .map((r) => (
              <rect
                key={r.day}
                x={48 + series.indexOf(r) * step + (step - barWidth) / 2}
                y={140 - (r.value / maximum) * 112}
                width={barWidth}
                height={(r.value / maximum) * 112}
                rx="2"
              >
                <title>{`${r.day}: ${r.value.toLocaleString()}`}</title>
              </rect>
            ))}
          <text x="48" y="165">
            {series[0]?.day.slice(5)}
          </text>
          <text x="318" y="165" textAnchor="end">
            {series.at(-1)?.day.slice(5)}
          </text>
        </svg>
      </>
      {total === 0 && <p>No activity in this period.</p>}
    </>
  );
}
function trendRange(days: number) {
  const end = new Date(),
    start = new Date(end);
  start.setUTCDate(end.getUTCDate() - days + 1);
  return {
    from: start.toISOString().slice(0, 10),
    through: end.toISOString().slice(0, 10),
  };
}
function Trend({
  data,
  metric,
  title,
  days,
  api,
  vendorId,
}: {
  data: LoyaltyOverview['trend'];
  metric: 'earned' | 'redeemed' | 'redemptions' | 'customers';
  title: string;
  days: number;
  api: LoyaltyApi;
  vendorId: string;
}) {
  const [open, setOpen] = useState(false),
    [range, setRange] = useState(() => trendRange(days)),
    [draft, setDraft] = useState(() => trendRange(days)),
    [error, setError] = useState('');
  const read = useCallback(
    () =>
      api.overview({
        trendFrom: range.from + 'T00:00:00Z',
        trendThrough: new Date(
          Date.parse(range.through + 'T00:00:00Z') + 86400000,
        ).toISOString(),
      }),
    [api, range],
  );
  const report = useRead(
    `loyalty-graph:${vendorId}:${metric}:${range.from}:${range.through}`,
    read,
    open,
  );
  return (
    <Card>
      <h2>{title}</h2>
      <TrendGraph
        data={data}
        metric={metric}
        title={title}
        {...trendRange(days)}
      />
      <Button
        variant="secondary"
        onClick={() => {
          const initial = trendRange(days);
          setRange(initial);
          setDraft(initial);
          setError('');
          setOpen(true);
        }}
      >
        View daily values
      </Button>
      <Dialog
        open={open}
        title={`${title} by date`}
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const span = Date.parse(draft.through) - Date.parse(draft.from);
            if (!Number.isFinite(span) || span < 0 || span >= 366 * 86400000) {
              setError('Choose an ordered date range of up to 366 days.');
              return;
            }
            setError('');
            setRange({ ...draft });
          }}
        >
          <div className="loyalty-date-range">
            <Field id={`loyalty-${metric}-from`} label="From date (UTC)">
              <Input
                id={`loyalty-${metric}-from`}
                type="date"
                required
                value={draft.from}
                max={draft.through}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              />
            </Field>
            <Field id={`loyalty-${metric}-through`} label="Through date (UTC)">
              <Input
                id={`loyalty-${metric}-through`}
                type="date"
                required
                value={draft.through}
                min={draft.from}
                onChange={(e) =>
                  setDraft({ ...draft, through: e.target.value })
                }
              />
            </Field>
          </div>
          <Button type="submit">Update graph</Button>
        </form>
        {error && <Alert severity="error">{error}</Alert>}
        <ReadState {...report} retry={report.refresh} />
        {report.data && (
          <>
            <TrendGraph
              data={report.data.trend}
              metric={metric}
              title={title}
              {...range}
            />
            <dl className="loyalty-daily-values">
              {Array.from(
                {
                  length:
                    Math.round(
                      (Date.parse(range.through) - Date.parse(range.from)) /
                        86400000,
                    ) + 1,
                },
                (_, i) => {
                  const day = new Date(
                    Date.parse(range.from + 'T00:00:00Z') + i * 86400000,
                  )
                    .toISOString()
                    .slice(0, 10);
                  return (
                    <div key={day}>
                      <dt>{day}</dt>
                      <dd>
                        {Number(
                          report.data!.trend.find((row) => row.day === day)?.[
                            metric
                          ] ?? 0,
                        ).toLocaleString()}
                      </dd>
                    </div>
                  );
                },
              )}
            </dl>
          </>
        )}
      </Dialog>
    </Card>
  );
}
export function VendorLoyalty({
  service,
  path,
}: {
  service: VendorService;
  path: string;
}) {
  const api = service.loyalty;
  const [filter, setFilter] = useState<Record<string, unknown>>({
    skip: 0,
    days: 30,
  });
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<LoyaltyReward>();
  const read = useCallback(() => api!.overview(filter), [api, filter]);
  const query = useRead(
    `loyalty:${service.vendorId}:${JSON.stringify(filter)}`,
    read,
    !!api,
  );
  const data = query.data;
  async function run(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
      query.refresh();
      setSelected(undefined);
    } catch (e) {
      setError(safeError(e).message);
    } finally {
      setBusy(false);
    }
  }
  if (!api)
    return (
      <Alert severity="info">Loyalty is unavailable in this environment.</Alert>
    );
  if (path.endsWith('/new') || /\/rewards\/\d+\/edit$/.test(path)) {
    const id = Number(path.split('/').at(-2));
    const reward = data?.rewards.find((r) => r.id === id);
    return (
      <>
        <h2>{reward ? 'Edit reward' : 'Create reward'}</h2>
        <ReadState {...query} retry={query.refresh} />
        {(path.endsWith('/new') || reward) && (
          <LoyaltyRewardWizard
            key={reward?.versionId ?? 'new'}
            service={service}
            initial={reward}
            onSave={async (terms, status) => {
              await api.save(terms, status, reward?.id);
              go('/vendor/loyalty/rewards');
            }}
          />
        )}
      </>
    );
  }
  const section = path.split('/')[3] ?? '';
  return (
    <>
      <p>
        Reward purchases from your business across every participating
        storefront.
      </p>
      <nav className="ui-tabs" aria-label="Loyalty">
        {tabs.map(([label, suffix]) => (
          <RouteLink
            key={label}
            to={'/vendor/loyalty' + suffix}
            variant="tab"
            current={path === '/vendor/loyalty' + suffix}
          >
            {label}
          </RouteLink>
        ))}
      </nav>
      <ReadState {...query} retry={query.refresh} />
      {error && <Alert severity="error">{error}</Alert>}
      {data && (
        <>
          {section === '' ? (
            <>
              <Card>
                <div className="actions">
                  <Badge tone={data.enabled ? 'success' : 'neutral'}>
                    {data.enabled ? 'Program enabled' : 'Program paused'}
                  </Badge>
                  {service.context.permissions.includes('ManageOwnCoupon') && (
                    <Button
                      disabled={busy}
                      onClick={() => void run(() => api.program(!data.enabled))}
                    >
                      {data.enabled ? 'Pause program' : 'Enable program'}
                    </Button>
                  )}
                </div>
                <p>
                  Paused programs keep all balances and history. Issued cart
                  rewards retain their terms. New redemptions and earnings
                  pause.
                </p>
              </Card>
              <div className="ui-kpi-grid">
                {[
                  ['Net points issued', data.metrics.issued],
                  ['Outstanding points', data.metrics.outstanding],
                  ['Pending points', data.metrics.pending],
                  ['Orders using rewards', data.metrics.rewardOrders],
                  ['Repeat customers', data.metrics.repeat],
                ].map(([label, value]) => (
                  <Card key={label}>
                    <dl>
                      <dt>{label}</dt>
                      <dd>{Number(value).toLocaleString()}</dd>
                    </dl>
                  </Card>
                ))}
              </div>
              <p>
                Lifetime finalized issuance:{' '}
                {Number(data.metrics.lifetime).toLocaleString()} points. Repeat
                customer rate:{' '}
                {data.metrics.customers
                  ? Math.round(
                      (data.metrics.repeat / data.metrics.customers) * 100,
                    )
                  : 0}
                %.
              </p>
              <SelectField
                id="loyalty-period"
                label="Activity period"
                value={String(filter.days)}
                onChange={(e) =>
                  setFilter({ ...filter, days: Number(e.target.value) })
                }
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </SelectField>
              <div className="loyalty-wallet-grid">
                <Trend
                  data={data.trend}
                  metric="earned"
                  title="Points earned"
                  api={api}
                  vendorId={service.vendorId}
                  days={Number(filter.days)}
                />
                <Trend
                  data={data.trend}
                  metric="redeemed"
                  title="Points redeemed"
                  api={api}
                  vendorId={service.vendorId}
                  days={Number(filter.days)}
                />
                <Trend
                  data={data.trend}
                  metric="redemptions"
                  title="Reward redemptions"
                  api={api}
                  vendorId={service.vendorId}
                  days={Number(filter.days)}
                />
                <Trend
                  data={data.trend}
                  metric="customers"
                  title="Repeat customer activity"
                  api={api}
                  vendorId={service.vendorId}
                  days={Number(filter.days)}
                />
              </div>
              <Card>
                <h2>Leading customers</h2>
                <TopCustomers rows={data.top} />
                <RouteLink to="/vendor/loyalty/leaderboard">
                  View full leaderboard
                </RouteLink>
              </Card>
            </>
          ) : section === 'rewards' ? (
            <>
              {service.context.permissions.includes('ManageOwnCoupon') && (
                <RouteLink to="/vendor/loyalty/rewards/new">
                  Create Reward
                </RouteLink>
              )}
              {data.rewards.length ? (
                <DataTable
                  label="Loyalty rewards"
                  headings={[
                    'Reward',
                    'Status',
                    'Points',
                    'Successful redemptions',
                  ]}
                  recordDetails={{
                    identifier: 0,
                    status: 1,
                    onOpen: (index) => setSelected(data.rewards[index]),
                  }}
                >
                  {data.rewards.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">{r.terms.name}</th>
                      <td>
                        <Badge>{r.status}</Badge>
                      </td>
                      <td>{r.terms.points.toLocaleString()}</td>
                      <td>{r.redemptions}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState title="Create your first reward">
                  <p>Choose a discount or an item from your own catalog.</p>
                </EmptyState>
              )}
              <Dialog
                open={!!selected}
                onClose={() => setSelected(undefined)}
                title={selected?.terms.name ?? 'Reward'}
                busy={busy}
              >
                {selected && (
                  <>
                    <p>
                      {valueLabel(selected.terms)} for{' '}
                      {selected.terms.points.toLocaleString()} points.
                    </p>
                    <p>
                      Version {selected.versionId}. Minimum eligible
                      merchandise: {formatMoney(selected.terms.minimum, 'USD')}.
                    </p>
                    {service.context.permissions.includes('ManageOwnCoupon') &&
                      selected.status !== 'ARCHIVED' && (
                        <div className="actions">
                          <RouteLink
                            to={`/vendor/loyalty/rewards/${selected.id}/edit`}
                          >
                            Edit reward
                          </RouteLink>
                          <Button
                            disabled={busy}
                            variant="secondary"
                            onClick={() =>
                              void run(() =>
                                api.save(
                                  selected.terms,
                                  selected.status === 'ACTIVE'
                                    ? 'INACTIVE'
                                    : 'ACTIVE',
                                  selected.id,
                                ),
                              )
                            }
                          >
                            {selected.status === 'ACTIVE'
                              ? 'Deactivate'
                              : 'Publish'}
                          </Button>
                          <Button
                            disabled={busy}
                            variant="secondary"
                            onClick={() =>
                              void run(() =>
                                api.save(
                                  selected.terms,
                                  'ARCHIVED',
                                  selected.id,
                                ),
                              )
                            }
                          >
                            Archive
                          </Button>
                        </div>
                      )}
                    <p>
                      Existing issued rewards and qualified versions retain
                      their promised terms.
                    </p>
                  </>
                )}
              </Dialog>
            </>
          ) : (
            <>
              {section === 'leaderboard' && (
                <Card>
                  <h2>Leading customers</h2>
                  <TopCustomers rows={data.top} />
                </Card>
              )}
              <form
                className="ui-control-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  setFilter({
                    ...filter,
                    skip: 0,
                    search: String(form.get('search') ?? ''),
                    status: String(form.get('status') ?? ''),
                    rewardId: form.get('rewardId')
                      ? Number(form.get('rewardId'))
                      : null,
                    from: form.get('from')
                      ? `${form.get('from')}T00:00:00Z`
                      : null,
                    through: form.get('through')
                      ? `${form.get('through')}T23:59:59Z`
                      : null,
                  });
                }}
              >
                <Field
                  id="loyalty-search"
                  label={
                    section === 'leaderboard'
                      ? 'Search customer identifier'
                      : 'Search customer or reward'
                  }
                >
                  <Input
                    id="loyalty-search"
                    name="search"
                    type="search"
                    maxLength={80}
                  />
                </Field>
                {section === 'redemptions' && (
                  <>
                    <SelectField
                      id="loyalty-status"
                      name="status"
                      label="Status"
                    >
                      <option value="">All statuses</option>
                      {[
                        'SELECTED',
                        'RESERVED',
                        'COMPLETED',
                        'CANCELLED',
                        'REVERSED',
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </SelectField>
                    <SelectField
                      id="loyalty-reward-filter"
                      name="rewardId"
                      label="Reward"
                    >
                      <option value="">All rewards</option>
                      {data.rewards.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.terms.name}
                        </option>
                      ))}
                    </SelectField>
                    <Field id="loyalty-from" label="From">
                      <Input id="loyalty-from" name="from" type="date" />
                    </Field>
                    <Field id="loyalty-through" label="Through">
                      <Input id="loyalty-through" name="through" type="date" />
                    </Field>
                  </>
                )}
                <div className="ui-field-action">
                  <Button type="submit">Apply filters</Button>
                </div>
              </form>
              {section === 'leaderboard' ? (
                <RankTable rows={data.leaderboard} start={data.skip} />
              ) : data.redemptions.length ? (
                <DataTable
                  label="Redemption history"
                  headings={[
                    'Reward',
                    'Status',
                    'Customer',
                    'Points',
                    'Order',
                    'Discount',
                    'Date',
                  ]}
                  recordDetails={{ identifier: 0, status: 1 }}
                >
                  {data.redemptions.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">{r.terms.name}</th>
                      <td>
                        <Badge>{r.status}</Badge>
                      </td>
                      <td>{r.customer}</td>
                      <td>
                        {r.terms.points.toLocaleString()} points ·{' '}
                        {kinds[r.terms.kind]}
                      </td>
                      <td>
                        {r.vendor_order_id ? (
                          <RouteLink to={`/vendor/orders/${r.vendor_order_id}`}>
                            Order {r.order_id}
                          </RouteLink>
                        ) : (
                          <>Cart {r.order_id}</>
                        )}
                      </td>
                      <td>
                        {formatMoney(r.discount, 'USD')}
                        <p>
                          {r.status === 'REVERSED'
                            ? 'Points restored after full refund.'
                            : 'Partial refunds reverse product earnings. Spent points return after a full vendor refund.'}
                        </p>
                      </td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState title="No redemptions match">
                  <p>
                    Real cart selections, reservations and completed redemptions
                    appear here.
                  </p>
                </EmptyState>
              )}
              <Pagination
                label="Loyalty pages"
                summary={`Showing up to ${data.take} records from ${data.skip + 1}`}
                hasPrevious={data.skip > 0}
                hasNext={
                  (section === 'leaderboard'
                    ? data.leaderboard
                    : data.redemptions
                  ).length === data.take
                }
                onPrevious={() =>
                  setFilter({
                    ...filter,
                    skip: Math.max(0, data.skip - data.take),
                  })
                }
                onNext={() =>
                  setFilter({ ...filter, skip: data.skip + data.take })
                }
              />
            </>
          )}
        </>
      )}
    </>
  );
}

export function LoyaltyRewardWizard({
  service,
  initial,
  onSave,
}: {
  service: VendorService;
  initial?: LoyaltyReward;
  onSave: (terms: LoyaltyTerms, status: string) => Promise<void>;
}) {
  const [step, setStep] = useState(0),
    [terms, setTerms] = useState(initial?.terms ?? initialTerms),
    [status, setStatus] = useState(initial?.status ?? 'ACTIVE'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [search, setSearch] = useState('');
  const [amountDraft, setAmountDraft] = useState(
    String(
      initial?.terms.kind === 'PERCENTAGE'
        ? initial.terms.value
        : (initial?.terms.value ?? 200) / 100,
    ),
  );
  const [maximumDraft, setMaximumDraft] = useState(
    String((initial?.terms.maximum ?? 1500) / 100),
  );
  const [minimumDraft, setMinimumDraft] = useState(
    String((initial?.terms.minimum ?? 0) / 100),
  );
  const read = useCallback(() => service.catalog(search, 0), [service, search]);
  const products = useRead(`loyalty-products:${search}`, read, step === 1);
  const options =
    products.data?.items.flatMap((p) =>
      p.variants.map((v) => ({ value: v.id, label: `${p.name}: ${v.name}` })),
    ) ?? [];
  const set = (changes: Partial<LoyaltyTerms>) =>
    setTerms((t) => ({ ...t, ...changes }));
  const steps = [
    'Reward type',
    'Reward details',
    'Points and availability',
    'Review and publish',
  ];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (step === 1) {
      try {
        const value =
          terms.kind === 'FREE_PRODUCT'
            ? 0
            : terms.kind === 'FIXED'
              ? parsePrice(amountDraft, 'USD')
              : Number(amountDraft);
        const maximum =
          terms.kind === 'PERCENTAGE' ? parsePrice(maximumDraft, 'USD') : 0;
        const minimum = parsePrice(minimumDraft || '0', 'USD');
        if (terms.kind === 'FIXED' && minimum > value) {
          setError(
            'Minimum eligible subtotal cannot exceed the discount amount.',
          );
          return;
        }
        if (
          (terms.kind !== 'FREE_PRODUCT' &&
            (!Number.isSafeInteger(value) || value <= 0)) ||
          (terms.kind === 'PERCENTAGE' && (value > 100 || maximum <= 0))
        )
          throw new Error();
        setTerms({ ...terms, value, maximum, minimum });
      } catch {
        setError(
          'Enter exact dollar amounts and a whole percentage between 1 and 100.',
        );
        return;
      }
    }
    if (
      step === 2 &&
      terms.startsAt &&
      terms.endsAt &&
      terms.endsAt <= terms.startsAt
    ) {
      setError('The end date must be later than the start date.');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await onSave(terms, status);
    } catch (err) {
      setError(safeError(err).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <p role="status">{steps[step]}</p>
      {error && <Alert severity="error">{error}</Alert>}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {step === 0 ? (
            <div className="loyalty-wallet-grid">
              {Object.entries(kinds).map(([kind, label]) => (
                <label key={kind} className="ui-card loyalty-type-option">
                  <Input
                    type="radio"
                    name="reward-kind"
                    checked={terms.kind === kind}
                    onChange={() => {
                      setAmountDraft(kind === 'PERCENTAGE' ? '10' : '2');
                      set({
                        kind: kind as LoyaltyTerms['kind'],
                        variantIds: [],
                        value:
                          kind === 'PERCENTAGE'
                            ? 10
                            : kind === 'FIXED'
                              ? 200
                              : 0,
                      });
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : step === 1 ? (
            <>
              <Field id="loyalty-name" label="Reward name">
                <Input
                  id="loyalty-name"
                  required
                  maxLength={120}
                  value={terms.name}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </Field>
              {terms.kind === 'FREE_PRODUCT' ? (
                <>
                  <ReadState {...products} retry={products.refresh} />
                  <SearchSelect
                    label="Product and variant"
                    value={terms.variantIds[0] ?? ''}
                    options={options}
                    onSearch={setSearch}
                    onChange={(value) =>
                      set({ variantIds: value ? [value] : [] })
                    }
                    required
                    searchHint="Search your catalog. Add this variant to the cart before redeeming."
                  />
                  <Field id="loyalty-quantity" label="Free quantity">
                    <Input
                      id="loyalty-quantity"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={terms.quantity}
                      onChange={(e) =>
                        set({ quantity: Number(e.target.value) })
                      }
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field
                    id="loyalty-value"
                    label={
                      terms.kind === 'FIXED'
                        ? 'Discount amount (USD)'
                        : 'Percentage'
                    }
                  >
                    <Input
                      id="loyalty-value"
                      type="number"
                      min={terms.kind === 'FIXED' ? '0.01' : '1'}
                      max={terms.kind === 'PERCENTAGE' ? '100' : undefined}
                      step={terms.kind === 'FIXED' ? '0.01' : '1'}
                      required
                      value={amountDraft}
                      onChange={(e) => setAmountDraft(e.target.value)}
                    />
                  </Field>
                  {terms.kind === 'PERCENTAGE' && (
                    <Field id="loyalty-maximum" label="Maximum discount (USD)">
                      <Input
                        id="loyalty-maximum"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={maximumDraft}
                        onChange={(e) => setMaximumDraft(e.target.value)}
                      />
                    </Field>
                  )}
                </>
              )}
              {terms.kind !== 'FREE_PRODUCT' && (
                <>
                  <ReadState {...products} retry={products.refresh} />
                  <SearchableMultiSelect
                    label="Eligible products (optional)"
                    options={options}
                    value={terms.variantIds}
                    onSearch={setSearch}
                    onChange={(value) => set({ variantIds: [...value] })}
                    searchHint="Leave empty for all your products. Minimum spending uses this eligible selection."
                  />
                </>
              )}
              <Field
                id="loyalty-minimum"
                label="Minimum eligible product subtotal (USD)"
              >
                <Input
                  id="loyalty-minimum"
                  type="number"
                  min="0"
                  max={terms.kind === 'FIXED' ? amountDraft : undefined}
                  step="0.01"
                  value={minimumDraft}
                  onChange={(e) => setMinimumDraft(e.target.value)}
                />
              </Field>
              {terms.kind === 'FIXED' && (
                <p>
                  The minimum eligible subtotal cannot exceed the discount
                  amount.
                </p>
              )}
            </>
          ) : step === 2 ? (
            <>
              <Field id="loyalty-points" label="Required points">
                <Input
                  id="loyalty-points"
                  type="number"
                  min="1"
                  step="1"
                  max="2147483647"
                  required
                  value={terms.points}
                  onChange={(e) => set({ points: Number(e.target.value) })}
                />
              </Field>
              <SelectField
                id="loyalty-publish-status"
                label="Availability"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Publish reward</option>
                <option value="DRAFT">Save draft</option>
                <option value="INACTIVE">Inactive</option>
              </SelectField>
              <Field id="loyalty-start" label="Start date (optional, UTC)">
                <Input
                  id="loyalty-start"
                  type="datetime-local"
                  value={terms.startsAt?.slice(0, 16) ?? ''}
                  onChange={(e) =>
                    set({
                      startsAt: e.target.value ? e.target.value + ':00Z' : null,
                    })
                  }
                />
              </Field>
              <Field id="loyalty-end" label="End date (optional, UTC)">
                <Input
                  id="loyalty-end"
                  type="datetime-local"
                  value={terms.endsAt?.slice(0, 16) ?? ''}
                  onChange={(e) =>
                    set({
                      endsAt: e.target.value ? e.target.value + ':00Z' : null,
                    })
                  }
                />
              </Field>
              <Field
                id="loyalty-limit"
                label="Redemptions per customer (optional)"
              >
                <Input
                  id="loyalty-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={terms.limit ?? ''}
                  onChange={(e) =>
                    set({
                      limit: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Field>
              <p>
                Points do not expire. Customers earn one point per eligible
                cent. You choose reward values independently.
              </p>
            </>
          ) : (
            <>
              <h2>{terms.name}</h2>
              <dl>
                <dt>Reward</dt>
                <dd>
                  {kinds[terms.kind]}: {valueLabel(terms)}
                </dd>
                <dt>Points</dt>
                <dd>{terms.points.toLocaleString()}</dd>
                <dt>Minimum product subtotal</dt>
                <dd>{formatMoney(terms.minimum, 'USD')}</dd>
                <dt>Availability</dt>
                <dd>
                  {status}, {terms.startsAt ?? 'immediately'} to{' '}
                  {terms.endsAt ?? 'no end date'}
                </dd>
                <dt>Customer limit</dt>
                <dd>{terms.limit ?? 'Repeatable'}</dd>
              </dl>
              <p>
                {terms.points.toLocaleString()} points are earned from{' '}
                {formatMoney(terms.points, 'USD')} of eligible spending.{' '}
                {terms.kind !== 'FREE_PRODUCT' &&
                  `The maximum potential reward represents ${(((terms.kind === 'FIXED' ? terms.value : terms.maximum) / terms.points) * 100).toFixed(1)}% of that spending. Actual value depends on cart restrictions.`}
              </p>
              <p>
                One reward per vendor order. No stacking with that vendor’s
                coupons. Published edits preserve issued terms and prior
                qualifications.
              </p>
              {terms.kind === 'FREE_PRODUCT' && (
                <p>
                  The selected variant and additional paid merchandise from your
                  business must already be in the cart. Use the required
                  quantity. Normal availability, stock, tax and fulfillment
                  checks apply.
                </p>
              )}
            </>
          )}
          <div className="actions">
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            <Button type="submit" loading={busy}>
              {step === 3
                ? status === 'ACTIVE'
                  ? 'Publish reward'
                  : 'Save reward'
                : 'Continue'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}
