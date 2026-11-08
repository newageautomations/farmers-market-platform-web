import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  DataTable,
  Dialog,
  Field,
  RecordCard,
  Tooltip,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSelect,
} from '@market/ui/farmstand';
import type {
  FinanceApi,
  FinanceProduct,
  FinanceReport,
  FinanceScope,
} from '@market/api';
import { ReadState, useRead } from '../vendor/common';
import { MarketsSummary } from '../vendor/MarketsSummary';
import {
  FinancialGraph,
  FinanceDonut,
  financeMetrics,
  type FinanceMetric,
} from './charts';
import { financeDates } from './finance-dates';
import { FinanceMetricSelect } from './FinanceMetricSelect';

type WeeklyMetric = 'gross' | 'profit' | 'totalExpenses' | 'orders';
type Read<T> = ReturnType<typeof useRead<T>>;

/** Finance overview: report cards, graph and drilldowns, then role-owned insights. */
export function FinanceOverview({
  api,
  scope,
  report,
  manager,
  money,
  insights,
  revision,
}: {
  api: FinanceApi;
  scope: Required<FinanceScope>;
  report: Read<FinanceReport>;
  manager: boolean;
  money: (value: number) => string;
  insights?: ReactNode;
  /** Changes after expense writes so the weekly comparison is re-read. */
  revision: number;
}) {
  const id = useId();
  const [series, setSeries] = useState<FinanceMetric[]>([
      'gross',
      'totalExpenses',
      'profit',
    ]),
    [group, setGroup] = useState('daily'),
    [salesMetric, setSalesMetric] = useState('revenue'),
    [expenseMetric, setExpenseMetric] = useState<'deducted' | 'spending'>(
      'deducted',
    ),
    [product, setProduct] = useState<FinanceProduct>(),
    [daily, setDaily] = useState(false),
    [categoryDetails, setCategoryDetails] = useState(false);
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
    `finance-weekly:${revision}:` + JSON.stringify(weeklyScope),
    readWeekly,
  );
  function weeklyChange(metric: WeeklyMetric) {
    if (!weekly.data || weekly.loading || weekly.error)
      return 'Compared with the prior week';
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
          // A missing baseline is neutral, not a favorable or unfavorable change.
          (current === previous || change === null
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
  const data = report.data;
  const metricLabel = (metric: FinanceMetric) =>
    manager && metric === 'gross'
      ? 'Collected revenue'
      : financeMetrics[metric];
  return (
    <>
      {data && (
        <MarketsSummary
          className="finance-kpis finance-summary"
          items={[
            {
              label: manager ? 'Collected revenue' : 'Gross sales',
              value: money(data.summary.gross),
              hint: weeklyChange('gross'),
              icon: 'shopping-cart',
            },
            {
              label: 'Estimated net profit',
              value: money(data.summary.profit),
              hint: weeklyChange('profit'),
              icon: 'circle-check',
            },
            {
              label: 'Total expenses',
              value: money(data.summary.totalExpenses),
              hint: weeklyChange('totalExpenses'),
              icon: 'tag',
            },
            {
              label: manager ? 'Payments' : 'Total sales',
              value: data.summary.orders,
              hint: weeklyChange('orders'),
              icon: 'hash',
            },
          ]}
        />
      )}
      {data &&
        (data.summary.missingCostUnits > 0 ||
          data.summary.unknownFeeSales > 0 ||
          (data.unattributedSales ?? 0) > 0) && (
          <div className="finance-estimate">
            <FarmstandIcon name="triangle-alert" />
            <Tooltip label={data.costPolicy}>
              <FarmstandButton variant="tertiary" size="compact">
                Known costs only
              </FarmstandButton>
            </Tooltip>
            <span>
              {data.summary.missingCostUnits} units without production costs ·{' '}
              {data.summary.unknownFeeSales} sales with unassigned fees
            </span>
            {(data.unattributedSales ?? 0) > 0 && (
              <span>
                {data.unattributedSales} sales without market attribution
              </span>
            )}
          </div>
        )}
      <FarmstandPanel
        as="section"
        className="finance-panel finance-performance"
        aria-labelledby={id + '-performance'}
      >
        <div className="finance-panel-title">
          <h2 id={id + '-performance'}>Performance</h2>
          <div className="finance-graph-header">
            <FinanceMetricSelect
              value={series}
              options={(Object.keys(financeMetrics) as FinanceMetric[]).map(
                (value) => ({ value, label: metricLabel(value) }),
              )}
              onChange={setSeries}
            />
            <Field
              id={id + '-group'}
              label={<span className="sr-only">Group by</span>}
            >
              <FarmstandSelect
                id={id + '-group'}
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </FarmstandSelect>
            </Field>
            <FarmstandButton
              variant="secondary"
              disabled={!data}
              onClick={() => setDaily(true)}
            >
              Daily values
            </FarmstandButton>
          </div>
        </div>
        <div className="finance-legend">
          {series.map((metric) => (
            <span
              key={metric}
              className={'finance-series-key finance-series-' + metric}
            >
              {metricLabel(metric)}
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
          {data && (
            <FinancialGraph report={data} series={series} group={group} />
          )}
        </div>
      </FarmstandPanel>
      {data && (
        <div className="finance-analytics">
          <FarmstandPanel
            as="section"
            className="finance-panel"
            aria-label={manager ? 'Profit by event' : 'Profit by product'}
          >
            <h2>{manager ? 'Profit by event' : 'Profit by product'}</h2>
            {manager ? (
              <FinanceDonut
                currency={scope.currency}
                items={(data.events ?? []).map((e) => ({
                  id: e.id,
                  name: e.name,
                  value: e.profit,
                }))}
              />
            ) : (
              <>
                <FinanceDonut
                  currency={scope.currency}
                  items={data.products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    value: p.contribution,
                  }))}
                  onSelect={(pid) =>
                    setProduct(data.products.find((p) => p.id === pid))
                  }
                />
              </>
            )}
          </FarmstandPanel>
          <FarmstandPanel
            as="section"
            className="finance-panel"
            aria-label={manager ? 'Market revenue' : 'Product sales'}
          >
            <div className="finance-card-header">
              <h2>{manager ? 'Market revenue' : 'Product sales'}</h2>
              {!manager && (
                <Field
                  id={id + '-sales'}
                  label={<span className="sr-only">Show product sales by</span>}
                >
                  <FarmstandSelect
                    id={id + '-sales'}
                    value={salesMetric}
                    onChange={(e) => setSalesMetric(e.target.value)}
                  >
                    <option value="units">Units sold</option>
                    <option value="revenue">Sales revenue</option>
                  </FarmstandSelect>
                </Field>
              )}
            </div>
            {manager ? (
              <div className="finance-market-revenue">
                <strong>{money(data.summary.netSales)}</strong>
                <p>Outstanding fees: {money(data.outstanding ?? 0)}</p>
              </div>
            ) : (
              <FinanceDonut
                currency={scope.currency}
                units={salesMetric === 'units'}
                items={[...data.products]
                  .sort(
                    (a, b) =>
                      b[salesMetric === 'units' ? 'units' : 'revenue'] -
                      a[salesMetric === 'units' ? 'units' : 'revenue'],
                  )
                  .map((p) => ({
                    id: p.id,
                    name: p.name,
                    value: p[salesMetric === 'units' ? 'units' : 'revenue'],
                  }))}
                onSelect={(pid) =>
                  setProduct(data.products.find((p) => p.id === pid))
                }
              />
            )}
          </FarmstandPanel>
          <RecordCard
            title="Expenses by category"
            label="Expenses by category"
            className="farmstand-panel finance-panel finance-expense-card"
            header={
              <div className="finance-card-header">
                <h2>Expenses by category</h2>
                <Field
                  id={id + '-expenses'}
                  label={<span className="sr-only">Show expenses by</span>}
                >
                  <FarmstandSelect
                    id={id + '-expenses'}
                    value={expenseMetric}
                    onChange={(e) =>
                      setExpenseMetric(
                        e.target.value as 'deducted' | 'spending',
                      )
                    }
                  >
                    <option value="deducted">Costs deducted from profit</option>
                    <option value="spending">Recorded spending</option>
                  </FarmstandSelect>
                </Field>
              </div>
            }
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
                  currency={scope.currency}
                  items={data.categories
                    .filter((c) => c[expenseMetric] !== 0)
                    .sort((a, b) => b[expenseMetric] - a[expenseMetric])
                    .map((c) => ({
                      id: c.name,
                      name: c.name,
                      value: c[expenseMetric],
                    }))}
                />
              </>
            }
          />
        </div>
      )}
      {insights}
      {data && daily && (
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
            {data.daily.map((d) => (
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
      {data && categoryDetails && (
        <Dialog
          open
          title="Expense categories"
          onClose={() => setCategoryDetails(false)}
        >
          <DataTable
            label="Recorded spending and costs by category"
            headings={['Category', 'Recorded spending', 'Deducted from profit']}
          >
            {data.categories.map((c) => (
              <tr key={c.name}>
                <th scope="row">{c.name}</th>
                <td>{money(c.spending)}</td>
                <td>{money(c.deducted)}</td>
              </tr>
            ))}
          </DataTable>
          <p>
            Per-unit production costs are estimates. Purchases already covered
            by those costs remain in spending. Copies of fees already recorded
            automatically are excluded from both totals.
          </p>
        </Dialog>
      )}
      {product && (
        <Dialog open onClose={() => setProduct(undefined)} title={product.name}>
          <dl className="facts">
            {[
              ['Units sold', String(product.units)],
              ['Gross product sales', money(product.gross)],
              ['Discounts', money(product.discounts)],
              ['Refunds', money(product.refunds)],
              ['Sales revenue', money(product.revenue)],
              ['Estimated production costs', money(product.productionCosts)],
              ['Estimated contribution', money(product.contribution)],
              ['Units without known cost', String(product.missingCostUnits)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p>
            Contribution excludes payment fees and general business expenses.
            Returned units retain their production costs.
          </p>
        </Dialog>
      )}
    </>
  );
}
