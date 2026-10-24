import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  RecordCard,
  DataTable,
  Dialog,
  Dropdown,
  EmptyState,
  Field,
  Input,
  Pagination,
  SelectField,
  SearchableMultiSelect,
  Textarea,
  Tooltip,
} from '@market/ui';
import { formatMoney, parsePrice } from '@market/config';
import {
  safeError,
  type FinanceApi,
  type FinanceOptions,
  type FinanceProduct,
  type FinanceScope,
} from '@market/api';
import { ReadState, RouteLink, useRead } from '../vendor/common';
import {
  FinancialGraph,
  FinanceDonut,
  financeMetrics,
  type FinanceMetric,
} from './charts';
import { minorDecimal } from './ProductionCost';
import './finance.css';
import { QuickBooks } from './QuickBooks';
import {
  chronologicalExpenseHistory,
  expenseHistoryEntry,
} from './expense-history';

export function financeDates(
  preset: string,
  now = new Date(),
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const today = new Date(
    part('year') + '-' + part('month') + '-' + part('day') + 'T00:00:00Z',
  );
  let start = new Date(today),
    end = new Date(today);
  if (preset === 'month') start.setUTCDate(1);
  else if (preset === 'last-month') {
    start = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
    );
    end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  } else start = new Date(today.getTime() - (Number(preset) - 1) * 86400000);
  return {
    from: start.toISOString().slice(0, 10),
    through: end.toISOString().slice(0, 10),
  };
}
function initialScope(): FinanceScope {
  const q = new URLSearchParams(location.search);
  return {
    ...financeDates('30'),
    ...(q.has('from')
      ? { from: q.get('from')!, through: q.get('through')! }
      : {}),
    market: q.get('market') ?? 'ALL',
    currency: q.get('currency') ?? '',
  };
}
function download(content: Blob, filename: string) {
  const url = URL.createObjectURL(content),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Finances({
  api,
  path,
  manager = false,
}: {
  api?: FinanceApi;
  path: string;
  manager?: boolean;
}) {
  if (!api)
    return <EmptyState title="Connect to the backend to view finances" />;
  return <FinanceWorkspace api={api} path={path} manager={manager} />;
}
function FinanceWorkspace({
  api,
  path,
  manager,
}: {
  api: FinanceApi;
  path: string;
  manager: boolean;
}) {
  const [selection, setScope] = useState(initialScope),
    [preset, setPreset] = useState(
      new URLSearchParams(location.search).has('from') ? 'custom' : '30',
    ),
    [series, setSeries] = useState<FinanceMetric[]>([
      'gross',
      'totalExpenses',
      'profit',
    ]),
    [group, setGroup] = useState('daily'),
    [salesMetric, setSalesMetric] = useState('revenue'),
    [expenseMetric, setExpenseMetric] = useState<'deducted' | 'spending'>(
      'deducted',
    ),
    [expenseId, setExpenseId] = useState<string>(),
    [adding, setAdding] = useState(
      () =>
        new URLSearchParams(location.search).get('action') === 'add-expense',
    ),
    [product, setProduct] = useState<FinanceProduct>(),
    [daily, setDaily] = useState(false),
    [categoryDetails, setCategoryDetails] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [skip, setSkip] = useState(0),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState('ALL');
  useEffect(() => {
    const mountedPath = location.pathname;
    const openExpense = () => {
      if (location.pathname !== mountedPath) return;
      const url = new URL(location.href);
      if (url.searchParams.get('action') !== 'add-expense') return;
      setAdding(true);
      url.searchParams.delete('action');
      history.replaceState(null, '', url.pathname + url.search);
    };
    openExpense();
    window.addEventListener('popstate', openExpense);
    return () => window.removeEventListener('popstate', openExpense);
  }, []);
  const readOptions = useCallback(() => api.options(), [api]),
    options = useRead('finance-options', readOptions);
  const scope = useMemo(
    () => ({
      ...selection,
      currency: selection.currency || options.data?.currency || 'USD',
      timezone:
        options.data?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(preset !== 'custom'
        ? financeDates(preset, new Date(), options.data?.timezone)
        : {}),
    }),
    [selection, options.data?.currency, options.data?.timezone, preset],
  );
  const read = useCallback(() => api.report(scope), [api, scope]),
    report = useRead(JSON.stringify(scope), read, !!options.data, {
      retainPreviousData: true,
    });
  // Compare the latest seven account-local dates with the preceding seven,
  // independently of the date range selected for the report.
  const weeklyScope = useMemo(
    () => ({
      market: scope.market,
      currency: scope.currency,
      timezone: scope.timezone,
      ...financeDates('14', new Date(), scope.timezone),
    }),
    [scope.market, scope.currency, scope.timezone],
  );
  const readWeekly = useCallback(
    () => api.report(weeklyScope),
    [api, weeklyScope],
  );
  const weekly = useRead(
    'finance-weekly:' + JSON.stringify(weeklyScope),
    readWeekly,
    !!options.data &&
      !path
        .split('?')[0]!
        .slice((manager ? '/market/finances' : '/vendor/finances').length),
  );
  function weeklyChange(
    metric: 'gross' | 'profit' | 'totalExpenses' | 'orders',
  ) {
    if (!weekly.data || weekly.loading || weekly.error) return null;
    const boundary = new Date(weeklyScope.through + 'T00:00:00Z');
    boundary.setUTCDate(boundary.getUTCDate() - 6);
    const split = boundary.toISOString().slice(0, 10);
    let current = 0,
      previous = 0;
    for (const day of weekly.data.daily) {
      if (day.date >= split) current += day[metric];
      else previous += day[metric];
    }
    const change =
      previous === 0
        ? current === 0
          ? 0
          : null
        : ((current - previous) / Math.abs(previous)) * 100;
    const good =
      metric === 'totalExpenses' ? current < previous : current > previous;
    return (
      <small
        className={
          'finance-weekly-change ' +
          (current === previous
            ? ''
            : good
              ? 'finance-change-positive'
              : 'finance-change-negative')
        }
        title="Latest 7 days compared with the previous 7 days"
      >
        {change === null
          ? 'No prior-week baseline'
          : `${change >= 0 ? '+' : '-'}${Math.abs(change).toLocaleString(undefined, { maximumFractionDigits: 1 })}% vs prior week`}
      </small>
    );
  }
  const base = manager ? '/market/finances' : '/vendor/finances',
    view = path.split('?')[0]!.slice(base.length),
    money = (n: number) => formatMoney(n, scope.currency);
  function update(value: Partial<FinanceScope>) {
    const next = { ...scope, ...value };
    setScope(next);
    setSkip(0);
    const query = new URLSearchParams(next);
    history.replaceState(null, '', `${location.pathname}?${query}`);
  }
  const suffix = '?' + new URLSearchParams({ ...scope }).toString();
  const grouped = !manager && !!report.data?.orderTransactions;
  const orders =
    report.data?.orderTransactions?.filter((t) =>
      `${t.orderCode} ${t.orderId} ${t.method} ${t.status} ${t.lines.map((l) => l.name).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];
  const transactions =
    report.data?.transactions.filter((t) =>
      `${t.name} ${t.orderId} ${t.method}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];
  const orderTransactions = [
    ...orders.map((t) => ({ ...t, cost: 0 })),
    ...transactions
      .filter((t) => t.kind === 'COST')
      .map((t) => ({
        id: t.id,
        orderId: t.orderId,
        orderCode: t.name,
        date: t.date,
        currency: t.currency,
        marketId: t.marketId,
        occurrenceId: t.occurrenceId,
        method: t.method,
        status: 'Cost',
        gross: 0,
        discount: 0,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        payment: 0,
        refund: 0,
        refundedTax: 0,
        remaining: 0,
        lines: [],
        events: [],
        cost: t.marketFee ?? 0,
      })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const expenses =
    report.data?.expenses.filter(
      (e) =>
        (category === 'ALL' || e.category === category) &&
        `${e.description} ${e.payee}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];
  const rows =
    view === '/expenses'
      ? expenses
      : grouped
        ? orderTransactions
        : transactions;
  const filters = options.data && (
    <div className="finance-controls">
      <SelectField
        label="Period"
        value={preset}
        onChange={(e) => {
          setPreset(e.target.value);
          if (e.target.value !== 'custom')
            update(financeDates(e.target.value, new Date(), scope.timezone));
        }}
      >
        {[
          ['7', 'Last 7 days'],
          ['30', 'Last 30 days'],
          ['90', 'Last 90 days'],
          ['month', 'This month'],
          ['last-month', 'Last month'],
          ['custom', 'Custom date range'],
        ].map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </SelectField>
      {preset === 'custom' && (
        <>
          <Field id="finance-from" label="From">
            <Input
              id="finance-from"
              type="date"
              value={scope.from}
              max={scope.through}
              onChange={(e) => update({ from: e.target.value })}
            />
          </Field>
          <Field id="finance-through" label="Through">
            <Input
              id="finance-through"
              type="date"
              value={scope.through}
              min={scope.from}
              onChange={(e) => update({ through: e.target.value })}
            />
          </Field>
        </>
      )}
      <SelectField
        label={manager ? 'Market' : 'Sales scope'}
        value={scope.market}
        onChange={(e) => update({ market: e.target.value })}
      >
        <option value="ALL">
          {manager ? 'Market operations' : 'All sales'}
        </option>
        {!manager && <option value="INDEPENDENT">Independent sales</option>}
        {options.data.markets.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </SelectField>
      {options.data.currencies.length > 1 && (
        <SelectField
          label="Currency"
          value={scope.currency}
          onChange={(e) => update({ currency: e.target.value })}
        >
          {options.data.currencies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectField>
      )}
    </div>
  );
  if (view === '/quickbooks' && api.quickbooks)
    return (
      <QuickBooks
        api={api.quickbooks}
        manager={manager}
        categories={options.data?.categories ?? []}
      />
    );
  return (
    <div className="finance-workspace">
      <div className="actions finance-actions">
        {api.quickbooks && (
          <RouteLink to={base + '/quickbooks'}>
            QuickBooks Online (sandbox)
          </RouteLink>
        )}
        {options.data && options.data.canManageExpenses !== false && (
          <Button onClick={() => setAdding(true)}>Add Expense</Button>
        )}
        {view && <RouteLink to={base + suffix}>Dashboard</RouteLink>}
        <RouteLink to={base + '/transactions' + suffix}>
          View Transactions
        </RouteLink>
        <RouteLink to={base + '/expenses' + suffix}>Manage Expenses</RouteLink>
        <Button
          variant="secondary"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const result = await api.export(scope);
              download(
                new Blob([result.content], {
                  type: 'text/csv;charset=utf-8',
                }),
                result.filename,
              );
            } catch (e) {
              setError(safeError(e).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Export Report
        </Button>
      </div>
      <ReadState {...options} retry={options.refresh} />
      {view && options.data && <Card spacing="contained">{filters}</Card>}
      {error && <Alert severity="error">{error}</Alert>}
      {view && <ReadState {...report} retry={report.refresh} />}
      {!view && report.data && (
        <>
          {' '}
          <div className="ui-kpi-grid finance-summary">
            {[
              [
                manager ? 'Collected revenue' : 'Gross sales',
                money(report.data.summary.gross),
                'gross',
              ],
              [
                'Estimated net profit',
                money(report.data.summary.profit),
                'profit',
              ],
              [
                'Total expenses',
                money(report.data.summary.totalExpenses),
                'totalExpenses',
              ],
              [
                manager ? 'Payments' : 'Total sales',
                String(report.data.summary.orders),
                'orders',
              ],
            ].map(([label, value, metric]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                {weeklyChange(
                  metric as 'gross' | 'profit' | 'totalExpenses' | 'orders',
                )}
              </div>
            ))}
          </div>
          {(report.data.summary.missingCostUnits > 0 ||
            report.data.summary.unknownFeeSales > 0 ||
            (report.data.unattributedSales ?? 0) > 0) && (
            <div className="finance-estimate">
              <Tooltip label={report.data.costPolicy}>
                <Button variant="tertiary">Known costs only</Button>
              </Tooltip>
              <span>
                {report.data.summary.missingCostUnits} units without production
                costs · {report.data.summary.unknownFeeSales} sales with
                unassigned fees
              </span>
              {(report.data.unattributedSales ?? 0) > 0 && (
                <span>
                  {report.data.unattributedSales} sales without market
                  attribution
                </span>
              )}
            </div>
          )}
        </>
      )}
      {!view && options.data && (
        <>
          {' '}
          <Card spacing="contained">
            <div className="finance-report-controls">
              {filters}
              <div className="finance-graph-header">
                <SearchableMultiSelect
                  label="Metric"
                  value={series}
                  options={(Object.keys(financeMetrics) as FinanceMetric[]).map(
                    (value) => ({
                      value,
                      label:
                        manager && value === 'gross'
                          ? 'Collected revenue'
                          : financeMetrics[value],
                    }),
                  )}
                  onChange={(values) => setSeries(values as FinanceMetric[])}
                  placeholder="Show metrics"
                  selectedLabel={
                    series.length ? series.length + ' selected' : 'No metrics'
                  }
                />
                <SelectField
                  label="Group by"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </SelectField>
                <Button
                  variant="secondary"
                  disabled={!report.data}
                  onClick={() => setDaily(true)}
                >
                  Daily values
                </Button>
              </div>
            </div>
            <div className="finance-legend">
              {series.map((metric) => (
                <span
                  key={metric}
                  className={'finance-series-key finance-series-' + metric}
                >
                  {manager && metric === 'gross'
                    ? 'Collected revenue'
                    : financeMetrics[metric]}
                </span>
              ))}
              <span>Time zone: {scope.timezone}</span>
            </div>
            <div aria-busy={report.loading} className="finance-graph-body">
              {report.loading && (
                <span role="status" className="finance-updating">
                  Updating chart…
                </span>
              )}
              <ReadState {...report} loading={false} retry={report.refresh} />
              {report.data && (
                <FinancialGraph
                  report={report.data}
                  series={series}
                  group={group}
                />
              )}
            </div>
          </Card>
        </>
      )}
      {report.data && (
        <>
          {!view && (
            <>
              {' '}
              <div className="finance-analytics">
                <Card
                  as="section"
                  spacing="contained"
                  aria-label={manager ? 'Profit by event' : 'Profit by product'}
                >
                  <h2>{manager ? 'Profit by event' : 'Profit by product'}</h2>
                  {manager ? (
                    <FinanceDonut
                      currency={scope.currency}
                      items={(report.data.events ?? []).map((e) => ({
                        id: e.id,
                        name: e.name,
                        value: e.profit,
                      }))}
                    />
                  ) : (
                    <>
                      <FinanceDonut
                        currency={scope.currency}
                        items={report.data.products.map((p) => ({
                          id: p.id,
                          name: p.name,
                          value: p.contribution,
                        }))}
                        onSelect={(id) =>
                          setProduct(
                            report.data!.products.find((p) => p.id === id),
                          )
                        }
                      />
                      <small>Contribution after direct production costs</small>
                    </>
                  )}
                </Card>
                <Card
                  as="section"
                  spacing="contained"
                  aria-label={manager ? 'Market revenue' : 'Product sales'}
                >
                  <h2>{manager ? 'Market revenue' : 'Product sales'}</h2>
                  {manager ? (
                    <>
                      <strong>{money(report.data.summary.netSales)}</strong>
                      <p>
                        Outstanding fees: {money(report.data.outstanding ?? 0)}
                      </p>
                    </>
                  ) : (
                    <>
                      <FinanceDonut
                        controls={
                          <SelectField
                            label="Show product sales by"
                            value={salesMetric}
                            onChange={(e) => setSalesMetric(e.target.value)}
                          >
                            <option value="units">Units sold</option>
                            <option value="revenue">Sales revenue</option>
                          </SelectField>
                        }
                        currency={scope.currency}
                        units={salesMetric === 'units'}
                        items={[...report.data.products]
                          .sort(
                            (a, b) =>
                              b[salesMetric === 'units' ? 'units' : 'revenue'] -
                              a[salesMetric === 'units' ? 'units' : 'revenue'],
                          )
                          .map((p) => ({
                            id: p.id,
                            name: p.name,
                            value:
                              p[salesMetric === 'units' ? 'units' : 'revenue'],
                          }))}
                        onSelect={(id) =>
                          setProduct(
                            report.data!.products.find((p) => p.id === id),
                          )
                        }
                      />
                    </>
                  )}
                </Card>
                <RecordCard
                  title="Expenses by category"
                  label="Expenses by category"
                  className="finance-expense-card"
                  header={<h2>Expenses by category</h2>}
                  onOpen={() => setCategoryDetails(true)}
                  renderTrigger={(props) => (
                    <Button {...props} className={props.className + ' sr-only'}>
                      Open expense category details
                    </Button>
                  )}
                  summary={
                    <>
                      <FinanceDonut
                        onSelect={() => setCategoryDetails(true)}
                        controls={
                          <SelectField
                            label="Show expenses by"
                            value={expenseMetric}
                            onChange={(e) =>
                              setExpenseMetric(
                                e.target.value as 'deducted' | 'spending',
                              )
                            }
                          >
                            <option value="deducted">
                              Costs deducted from profit
                            </option>
                            <option value="spending">Recorded spending</option>
                          </SelectField>
                        }
                        currency={scope.currency}
                        items={report.data.categories
                          .filter((c) => c[expenseMetric] !== 0)
                          .sort((a, b) => b[expenseMetric] - a[expenseMetric])
                          .map((c) => ({
                            id: c.name,
                            name: c.name,
                            value: c[expenseMetric],
                          }))}
                      />
                      <small>
                        {expenseMetric === 'deducted'
                          ? 'Includes direct production costs and qualifying expenses'
                          : 'Includes purchases already covered by production costs'}
                      </small>
                    </>
                  }
                />
              </div>
            </>
          )}
          {view && (
            <>
              <Card spacing="contained" className="finance-list-filters">
                <Field
                  id="finance-search"
                  label={
                    view === '/expenses'
                      ? 'Search expenses'
                      : 'Search transactions'
                  }
                >
                  <Input
                    id="finance-search"
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSkip(0);
                    }}
                  />
                </Field>
                {view === '/expenses' && (
                  <SelectField
                    label="Category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSkip(0);
                    }}
                  >
                    <option value="ALL">All categories</option>
                    {options.data?.categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </SelectField>
                )}
              </Card>
              {view === '/expenses' ? (
                <DataTable
                  label="Expense history"
                  headings={['Expense', 'Status']}
                  recordDetails={{
                    status: 1,
                    onOpen: (i) => setExpenseId(expenses[skip + i]!.id),
                  }}
                >
                  {expenses.slice(skip, skip + 20).map((e) => (
                    <tr key={e.id}>
                      <th scope="row">{e.description}</th>
                      <td>
                        <Badge tone={e.voided ? 'neutral' : 'success'}>
                          {e.voided ? 'Voided' : 'Recorded'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </DataTable>
              ) : grouped ? (
                <DataTable
                  label="Transaction history"
                  headings={[
                    'Order',
                    'Status',
                    'Date',
                    'Market',
                    'Payment method',
                    'Purchased products',
                    'Payment breakdown',
                    'Refund history',
                  ]}
                  recordDetails={{ status: 1 }}
                >
                  {orderTransactions.slice(skip, skip + 20).map((t) => (
                    <tr key={t.id}>
                      <th scope="row">
                        {t.cost ? t.orderCode : `Order ${t.orderCode}`}
                      </th>
                      <td>
                        <Badge
                          tone={
                            t.cost
                              ? 'neutral'
                              : t.refund
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td>
                        {new Date(t.date).toLocaleString(undefined, {
                          timeZone: scope.timezone,
                        })}
                      </td>
                      <td>
                        {options.data?.markets.find((m) => m.id === t.marketId)
                          ?.name ??
                          (t.marketId
                            ? 'Unavailable market'
                            : 'Independent sale')}
                      </td>
                      <td>{t.method}</td>
                      <td>
                        <ul>
                          {t.lines.map((l) => (
                            <li key={l.id}>
                              {l.quantity} × {l.name}: {money(l.gross)}
                              {l.discount > 0 && (
                                <>
                                  {' '}
                                  · Discount {money(-l.discount)} · After
                                  discount {money(l.subtotal)}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        {t.cost ? (
                          <dl className="ui-record-facts">
                            <div>
                              <dt>Recorded booth payment</dt>
                              <dd>{money(t.cost)}</dd>
                            </div>
                          </dl>
                        ) : (
                          <dl className="ui-record-facts">
                            <div>
                              <dt>Merchandise before discounts</dt>
                              <dd>{money(t.gross)}</dd>
                            </div>
                            {t.discount > 0 && (
                              <div>
                                <dt>Discounts</dt>
                                <dd>{money(-t.discount)}</dd>
                              </div>
                            )}
                            <div>
                              <dt>Merchandise subtotal</dt>
                              <dd>{money(t.subtotal)}</dd>
                            </div>
                            <div>
                              <dt>Sales tax collected</dt>
                              <dd>{money(t.tax)}</dd>
                            </div>
                            {t.shipping !== 0 && (
                              <div>
                                <dt>Shipping</dt>
                                <dd>{money(t.shipping)}</dd>
                              </div>
                            )}
                            <div>
                              <dt>Customer payment for your items</dt>
                              <dd>{money(t.payment)}</dd>
                            </div>
                            {t.refund > 0 && (
                              <>
                                <div>
                                  <dt>Refunded to customer</dt>
                                  <dd>{money(t.refund)}</dd>
                                </div>
                                <div>
                                  <dt>Sales tax refunded</dt>
                                  <dd>{money(t.refundedTax)}</dd>
                                </div>
                                <div>
                                  <dt>Payment remaining</dt>
                                  <dd>{money(t.remaining)}</dd>
                                </div>
                              </>
                            )}
                          </dl>
                        )}
                      </td>
                      <td>
                        <ul>
                          {t.events.length > 0 && (
                            <li>
                              Complete order history. Report totals use the
                              selected dates.
                            </li>
                          )}
                          {t.events.map((e) => (
                            <li key={`${e.kind}:${e.id}`}>
                              {e.kind} ·{' '}
                              {new Date(e.date).toLocaleString(undefined, {
                                timeZone: scope.timezone,
                              })}{' '}
                              · {money(e.amount)} · Sales tax {money(e.tax)}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <DataTable
                  label="Transaction history"
                  headings={[
                    'Transaction',
                    'Type',
                    'Date',
                    'Gross',
                    'Discount',
                    'Refund',
                    'Production cost',
                    'Processing fee',
                    'Recorded booth fee',
                    'Method',
                    'Market',
                  ]}
                  recordDetails={{ status: 1 }}
                >
                  {transactions.slice(skip, skip + 20).map((t) => (
                    <tr key={t.id}>
                      <th scope="row">
                        {t.name} · {t.orderId}
                      </th>
                      <td>
                        <Badge
                          tone={
                            t.kind === 'REFUND'
                              ? 'warning'
                              : t.kind === 'COST'
                                ? 'neutral'
                                : 'success'
                          }
                        >
                          {t.kind === 'REFUND'
                            ? 'Refund'
                            : t.kind === 'COST'
                              ? 'Cost'
                              : 'Sale'}
                        </Badge>
                      </td>
                      <td>{t.date}</td>
                      <td>{money(t.gross)}</td>
                      <td>{money(t.discount)}</td>
                      <td>{money(t.refund)}</td>
                      <td>
                        {t.productionCost === null
                          ? 'Unknown'
                          : money(t.productionCost)}
                      </td>
                      <td>
                        {t.processingFee === null
                          ? 'Unknown'
                          : money(t.processingFee)}
                      </td>
                      <td>{money(t.marketFee ?? 0)}</td>
                      <td>{t.method}</td>
                      <td>
                        {options.data?.markets.find((m) => m.id === t.marketId)
                          ?.name ??
                          (t.marketId ? 'Unavailable market' : 'Independent')}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
              {!rows.length && <EmptyState title="No matching records" />}
              <Pagination
                hasPrevious={skip > 0}
                hasNext={skip + 20 < rows.length}
                onPrevious={() => setSkip(skip - 20)}
                onNext={() => setSkip(skip + 20)}
                summary={`${rows.length} records`}
              />
            </>
          )}
          {daily && (
            <Dialog
              open
              onClose={() => setDaily(false)}
              title="Daily financial values"
            >
              <DataTable
                wide
                label="Daily financial values in minor currency units"
                headings={[
                  'Date',
                  'Gross sales',
                  'Discounts',
                  'Refunds',
                  'Costs',
                  'Estimated profit',
                ]}
              >
                {report.data.daily.map((d) => (
                  <tr key={d.date}>
                    <th scope="row">{d.date}</th>
                    <td>{money(d.gross)}</td>
                    <td>{money(d.discounts)}</td>
                    <td>{money(d.refunds)}</td>
                    <td>{money(d.totalExpenses)}</td>
                    <td>{money(d.profit)}</td>
                  </tr>
                ))}
              </DataTable>
            </Dialog>
          )}
          {categoryDetails && (
            <Dialog
              open
              title="Expense categories"
              onClose={() => setCategoryDetails(false)}
            >
              <DataTable
                label="Recorded spending and costs by category"
                headings={[
                  'Category',
                  'Recorded spending',
                  'Deducted from profit',
                ]}
              >
                {report.data.categories.map((c) => (
                  <tr key={c.name}>
                    <th scope="row">{c.name}</th>
                    <td>{money(c.spending)}</td>
                    <td>{money(c.deducted)}</td>
                  </tr>
                ))}
              </DataTable>
              <p>
                Per-unit production costs are estimates. Purchases already
                covered by those costs remain in spending. Copies of fees
                already recorded automatically are excluded from both totals.
              </p>
            </Dialog>
          )}
          {product && (
            <Dialog
              open
              onClose={() => setProduct(undefined)}
              title={product.name}
            >
              <dl className="facts">
                {[
                  ['Units sold', String(product.units)],
                  ['Gross product sales', money(product.gross)],
                  ['Discounts', money(product.discounts)],
                  ['Refunds', money(product.refunds)],
                  ['Sales revenue', money(product.revenue)],
                  [
                    'Estimated production costs',
                    money(product.productionCosts),
                  ],
                  ['Estimated contribution', money(product.contribution)],
                  [
                    'Units without known cost',
                    String(product.missingCostUnits),
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <p>
                Contribution excludes payment fees and general business
                expenses. Returned units retain their production costs.
              </p>
            </Dialog>
          )}
        </>
      )}
      {(adding || expenseId) &&
        options.data &&
        (!adding || options.data.canManageExpenses !== false) && (
          <ExpenseDialog
            key={expenseId ?? 'new'}
            api={api}
            options={options.data}
            id={expenseId}
            date={scope.through}
            onClose={() => {
              setAdding(false);
              setExpenseId(undefined);
            }}
            onSaved={(createdId) => {
              report.refresh();
              weekly.refresh();
              if (createdId) {
                setAdding(false);
                setExpenseId(createdId);
              }
            }}
          />
        )}
    </div>
  );
}

function ExpenseDialog({
  api,
  options,
  id,
  date,
  onClose,
  onSaved,
}: {
  api: FinanceApi;
  options: FinanceOptions;
  id?: string;
  date: string;
  onClose: () => void;
  onSaved: (createdId?: string) => void;
}) {
  const formId = useId(),
    [editing, setEditing] = useState(!id),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [attributionChoice, setAttribution] = useState<string | null>(null),
    [marketChoice, setMarket] = useState<string | null>(null),
    [receipt, setReceipt] = useState<{
      url: string;
      mime: string;
      name: string;
    }>(),
    [confirmVoid, setConfirmVoid] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  const read = useCallback(() => api.detail(id!), [api, id]),
    query = useRead(`expense:${id}`, read, !!id),
    e = query.data?.expense;
  const attribution =
      attributionChoice ??
      e?.attribution ??
      (options.kind === 'MARKET' ? 'MARKET' : 'GENERAL'),
    market =
      marketChoice ??
      e?.marketId ??
      (options.kind === 'MARKET' ? (options.markets[0]?.id ?? '') : '');
  useEffect(
    () => () => {
      if (receipt) URL.revokeObjectURL(receipt.url);
    },
    [receipt],
  );
  const money = (n: number) => formatMoney(n, e?.currency ?? options.currency);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const saved = await api.save({
        ...(e ? { id: e.id, version: e.version } : { key }),
        description: String(data.get('description')),
        amount: parsePrice(
          String(data.get('amount')),
          e?.currency ?? options.currency,
        ),
        spentOn: String(data.get('spentOn')),
        category: String(data.get('category')),
        attribution,
        marketId: attribution === 'MARKET' ? market : null,
        occurrenceId: data.get('occurrenceId') || null,
        treatment: data.get('treatment') ?? 'DEDUCT',
        payee: String(data.get('payee') ?? ''),
        notes: String(data.get('notes') ?? ''),
      });
      onSaved(id ? undefined : saved.id);
      if (id) {
        setEditing(false);
        query.refresh();
      }
    } catch (err) {
      setError(safeError(err).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title={
        editing
          ? id
            ? 'Edit expense'
            : 'Add Expense'
          : (e?.description ?? 'Expense details')
      }
      busy={busy}
      onClose={onClose}
      actions={
        editing ? (
          <Button type="submit" form={formId} loading={busy}>
            Save expense
          </Button>
        ) : undefined
      }
    >
      <div className="finance-dialog">
        <ReadState {...query} retry={query.refresh} />
        {error && <Alert severity="error">{error}</Alert>}
        {editing && (!id || e) && (
          <form id={formId} className="finance-expense-form" onSubmit={submit}>
            <Field id={formId + 'description'} label="Expense description">
              <Input
                id={formId + 'description'}
                name="description"
                defaultValue={e?.description}
                required
                maxLength={200}
              />
            </Field>
            <Field
              id={formId + 'amount'}
              label={`Amount (${e?.currency ?? options.currency})`}
            >
              <Input
                id={formId + 'amount'}
                name="amount"
                inputMode="decimal"
                defaultValue={e ? minorDecimal(e.amount, e.currency) : ''}
                required
              />
            </Field>
            <Field id={formId + 'date'} label="Date">
              <Input
                id={formId + 'date'}
                type="date"
                name="spentOn"
                defaultValue={e?.spentOn ?? date}
                required
              />
            </Field>
            <SelectField
              label="Category"
              name="category"
              defaultValue={e?.category ?? options.categories[0]}
            >
              {options.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </SelectField>
            {options.kind === 'VENDOR' && (
              <SelectField
                label="Applies to"
                value={attribution}
                onChange={(event) => {
                  setAttribution(event.target.value);
                  setMarket('');
                }}
              >
                <option value="GENERAL">General business operations</option>
                <option value="INDEPENDENT">Independent operations</option>
                <option value="MARKET">Market or event</option>
              </SelectField>
            )}
            {attribution === 'MARKET' && (
              <>
                <SelectField
                  label="Market"
                  value={market}
                  required
                  onChange={(event) => setMarket(event.target.value)}
                >
                  <option value="">Choose a market</option>
                  {options.markets.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  key={market}
                  label="Event (optional)"
                  name="occurrenceId"
                  defaultValue={
                    e?.marketId === market ? (e.occurrenceId ?? '') : ''
                  }
                >
                  <option value="">All events at this market</option>
                  {e?.occurrenceId &&
                    e.marketId === market &&
                    !options.events.some(
                      (event) => event.id === e.occurrenceId,
                    ) && (
                      <option value={e.occurrenceId}>
                        Saved event {e.occurrenceId}
                      </option>
                    )}
                  {options.events
                    .filter((event) => event.marketId === market)
                    .map((event) => (
                      <option value={event.id} key={event.id}>
                        {event.date}
                      </option>
                    ))}
                </SelectField>
              </>
            )}
            {options.kind === 'VENDOR' && (
              <SelectField
                label="Profit treatment"
                info="Choose Already in production costs when per-unit costs include this purchase. Spending is still recorded."
                name="treatment"
                defaultValue={e?.treatment ?? 'DEDUCT'}
              >
                <option value="DEDUCT">Deduct from estimated profit</option>
                <option value="IN_PRODUCTION_COST">
                  Already in production costs
                </option>
                <option value="IN_AUTOMATIC_FEES">
                  Already in recorded fees
                </option>
              </SelectField>
            )}
            <Field id={formId + 'payee'} label="Payee (optional)">
              <Input
                id={formId + 'payee'}
                name="payee"
                maxLength={200}
                defaultValue={e?.payee}
              />
            </Field>
            <Field id={formId + 'notes'} label="Notes (optional)">
              <Textarea
                id={formId + 'notes'}
                name="notes"
                rows={3}
                maxLength={2000}
                defaultValue={e?.notes}
              />
            </Field>
          </form>
        )}
        {!editing && e && (
          <>
            <dl className="facts">
              {[
                ['Amount', money(e.amount)],
                ['Date', e.spentOn],
                ['Category', e.category],
                [
                  'Scope',
                  e.attribution === 'GENERAL'
                    ? 'General business'
                    : e.attribution === 'INDEPENDENT'
                      ? 'Independent'
                      : (options.markets.find((m) => m.id === e.marketId)
                          ?.name ?? 'Market'),
                ],
                [
                  'Event',
                  options.events.find((event) => event.id === e.occurrenceId)
                    ?.date ?? 'None',
                ],
                [
                  'Profit treatment',
                  e.treatment === 'DEDUCT'
                    ? 'Deducted from profit'
                    : e.treatment === 'IN_AUTOMATIC_FEES'
                      ? 'Already in recorded fees'
                      : 'Already in production costs',
                ],
                ['Payee', e.payee || 'None'],
                ['Notes', e.notes || 'None'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {!e.voided && options.canManageExpenses !== false && (
              <div className="actions">
                <Button
                  onClick={() => {
                    setAttribution(e.attribution);
                    setMarket(e.marketId ?? '');
                    setEditing(true);
                  }}
                >
                  Edit expense
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmVoid(true)}
                >
                  Void expense
                </Button>
              </div>
            )}
            <Field
              id={formId + 'receipt'}
              label="Receipt (image or PDF, up to 10 MB)"
            >
              <Input
                id={formId + 'receipt'}
                type="file"
                disabled={
                  busy || e.voided || options.canManageExpenses === false
                }
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError('');
                  try {
                    await api.upload(e.id, file);
                    query.refresh();
                  } catch (err) {
                    setError(safeError(err).message);
                  } finally {
                    setBusy(false);
                    event.target.value = '';
                  }
                }}
              />
            </Field>
            {query.data?.receipts.map((r) => (
              <div className="actions" key={r.id}>
                <span>
                  {r.filename} · {r.status}
                </span>
                {r.status === 'AVAILABLE' && (
                  <Button
                    variant="secondary"
                    loading={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        const f = await api.download(r.id);
                        if (
                          ![
                            'application/pdf',
                            'image/jpeg',
                            'image/png',
                            'image/webp',
                          ].includes(f.mime)
                        )
                          throw new Error('Unsupported receipt');
                        const bytes = Uint8Array.from(
                          atob(f.bytesBase64),
                          (c) => c.charCodeAt(0),
                        );
                        setReceipt({
                          url: URL.createObjectURL(
                            new Blob([bytes], { type: f.mime }),
                          ),
                          mime: f.mime,
                          name: f.filename,
                        });
                      } catch (err) {
                        setError(safeError(err).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    View receipt
                  </Button>
                )}
              </div>
            ))}
            <Dropdown label="Expense history">
              <ul
                className="finance-expense-history"
                aria-label="Expense activity"
              >
                {chronologicalExpenseHistory(query.data?.history ?? []).map(
                  (h) => {
                    const entry = expenseHistoryEntry(h, e.currency);
                    const date = new Date(h.created_at);
                    return (
                      <li key={h.id}>
                        <div>
                          {entry.action}
                          {entry.change !== null && (
                            <>
                              {' '}
                              {entry.change > 0 && entry.action !== 'Created'
                                ? '+'
                                : ''}
                              {money(entry.change)}
                            </>
                          )}
                          {entry.category && (
                            <> · Category changed to {entry.category}</>
                          )}
                        </div>
                        {Number.isFinite(date.getTime()) ? (
                          <time dateTime={date.toISOString()}>
                            {date.toLocaleString(undefined, {
                              timeZone: options.timezone,
                            })}
                          </time>
                        ) : (
                          <span>Date unavailable</span>
                        )}
                      </li>
                    );
                  },
                )}
              </ul>
              {!query.data?.history.length && (
                <p>No expense activity available.</p>
              )}
            </Dropdown>
          </>
        )}
        {confirmVoid && e && (
          <Dialog
            open
            title="Void this expense?"
            busy={busy}
            onClose={() => setConfirmVoid(false)}
            actions={
              <Button
                variant="destructive"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await api.save({
                      action: 'VOID',
                      id: e.id,
                      version: e.version,
                    });
                    onSaved();
                    setConfirmVoid(false);
                    query.refresh();
                  } catch (err) {
                    setError(safeError(err).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Void expense
              </Button>
            }
          >
            <p>
              The expense will stop affecting reports. Its history and receipts
              will remain available.
            </p>
          </Dialog>
        )}
        {receipt && (
          <Dialog
            open
            title={receipt.name}
            onClose={() => setReceipt(undefined)}
          >
            {receipt.mime === 'application/pdf' ? (
              <iframe
                title="Receipt preview"
                src={receipt.url}
                sandbox=""
                className="finance-receipt"
              />
            ) : (
              <img
                src={receipt.url}
                alt="Uploaded expense receipt"
                className="finance-receipt"
              />
            )}
          </Dialog>
        )}
      </div>
    </Dialog>
  );
}
