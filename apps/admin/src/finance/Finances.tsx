import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, EmptyState, Field, UtilityIcon } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSelect,
} from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import { formatMoney } from '@market/config';
import { safeError, type FinanceApi, type FinanceScope } from '@market/api';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { go, ReadState, useRead } from '../vendor/common';
import '../vendor/markets-workspace.css';
import '../vendor/market-applications.css';
import '../vendor/orders.css';
import { OrdersDateRange } from '../vendor/OrdersDateRange';
import './finance.css';
import './finance-workspace.css';
import { QuickBooks } from './QuickBooks';
import { ExpenseDialog } from './ExpenseDialog';
import { FinanceOverview } from './FinanceOverview';
import { FinanceTransactions } from './FinanceTransactions';
import { FinanceExpenses } from './FinanceExpenses';
import { financeDates } from './finance-dates';

export { financeDates };

export type FinanceView =
  'overview' | 'transactions' | 'expenses' | 'invoices' | 'quickbooks';
/** Reporting period shared by finance reads and role-owned insights. */
export interface FinanceInsightScope {
  from: string;
  through: string;
  currency: string;
  timezone: string;
  /** Display names known from the authorized finance reads, when available. */
  names?: {
    product: (variantId: string) => string | undefined;
    market: (marketId: string) => string | undefined;
    event: (occurrenceId: string) => string | undefined;
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
const shortDate = (date: string) =>
  new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
function download(content: Blob, filename: string) {
  const url = URL.createObjectURL(content),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function viewFor(path: string, base: string): FinanceView {
  const suffix = path.split('?')[0]!.startsWith(base)
    ? path.split('?')[0]!.slice(base.length)
    : '';
  return (
    (
      {
        '/transactions': 'transactions',
        '/expenses': 'expenses',
        '/invoices': 'invoices',
        '/quickbooks': 'quickbooks',
      } as Record<string, FinanceView>
    )[suffix] ?? 'overview'
  );
}

/**
 * Finance workspace for vendors and market managers. Money reads require the
 * finance grant; role-owned sales/market insights render on the overview with
 * their own optional analytics authority.
 */
export function Finances({
  api,
  path,
  manager = false,
  canReadFinance = true,
  insights,
  invoices,
}: {
  api?: FinanceApi;
  path: string;
  manager?: boolean;
  canReadFinance?: boolean;
  insights?: (scope: FinanceInsightScope) => ReactNode;
  /** Market booth invoices, supplied by the market operations controller. */
  invoices?: ReactNode;
}) {
  const finance = canReadFinance ? api : undefined;
  if (!finance && !insights)
    return <EmptyState title="Connect to the backend to view finances" />;
  return (
    <FinanceWorkspace
      api={finance}
      path={path}
      manager={manager}
      insights={insights}
      invoices={invoices}
    />
  );
}

function FinanceWorkspace({
  api,
  path,
  manager,
  insights,
  invoices,
}: {
  api?: FinanceApi;
  path: string;
  manager: boolean;
  insights?: (scope: FinanceInsightScope) => ReactNode;
  invoices?: ReactNode;
}) {
  const id = useId();
  const base = manager ? '/market/finances' : '/vendor/finances';
  const [selection, setScope] = useState(initialScope),
    [preset, setPreset] = useState(
      new URLSearchParams(location.search).has('from') ? 'custom' : '30',
    ),
    [expenseId, setExpenseId] = useState<string>(),
    [adding, setAdding] = useState(
      () =>
        new URLSearchParams(location.search).get('action') === 'add-expense',
    ),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [calendar, setCalendar] = useState(false);
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
  const readOptions = useCallback(() => api!.options(), [api]),
    options = useRead('finance-options', readOptions, !!api);
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const scope = useMemo(
    () => ({
      ...selection,
      currency: selection.currency || options.data?.currency || 'USD',
      timezone: options.data?.timezone || browserZone,
      ...(preset !== 'custom'
        ? financeDates(preset, new Date(), options.data?.timezone)
        : {}),
    }),
    [
      selection,
      options.data?.currency,
      options.data?.timezone,
      preset,
      browserZone,
    ],
  );
  const read = useCallback(() => api!.report(scope), [api, scope]),
    report = useRead(
      `${revision}:` + JSON.stringify(scope),
      read,
      !!options.data,
      {
        retainPreviousData: true,
      },
    );
  const requested = viewFor(path, base);
  const tabs: Array<{
    value: FinanceView;
    label: string;
    icon: Parameters<typeof FarmstandIcon>[0]['name'];
  }> = [
    { value: 'overview', label: 'Overview', icon: 'layers' },
    ...(api
      ? ([
          {
            value: 'transactions',
            label: 'Transactions',
            icon: 'receipt-text',
          },
          { value: 'expenses', label: 'Expenses', icon: 'tag' },
        ] as const)
      : []),
    ...(manager && invoices
      ? ([
          { value: 'invoices', label: 'Booth invoices', icon: 'store' },
        ] as const)
      : []),
    ...(api?.quickbooks
      ? ([
          { value: 'quickbooks', label: 'QuickBooks', icon: 'arrow-up-right' },
        ] as const)
      : []),
  ];
  const view = tabs.some((t) => t.value === requested) ? requested : 'overview';
  const transactions = report.data?.transactions,
    markets = options.data?.markets,
    events = options.data?.events;
  const insightScope = useMemo<FinanceInsightScope>(
    () => ({
      from: scope.from,
      through: scope.through,
      currency: scope.currency,
      timezone: scope.timezone,
      names: {
        product: (variantId) =>
          transactions?.find((t) => t.variantId === variantId)?.name,
        market: (marketId) => markets?.find((m) => m.id === marketId)?.name,
        event: (occurrenceId) => {
          const event = events?.find((e) => e.id === occurrenceId);
          if (!event) return undefined;
          const market = markets?.find((m) => m.id === event.marketId)?.name;
          return market ? `${market} · ${event.date}` : event.date;
        },
      },
    }),
    [
      scope.from,
      scope.through,
      scope.currency,
      scope.timezone,
      transactions,
      markets,
      events,
    ],
  );
  const money = (n: number) => formatMoney(n, scope.currency);
  const query =
    '?' + new URLSearchParams({ ...selection, ...scope }).toString();
  const hrefFor = (next: FinanceView) =>
    base + (next === 'overview' ? '' : '/' + next) + query;
  function update(value: Partial<FinanceScope>) {
    const next = { ...scope, ...value };
    setScope(next);
    history.replaceState(
      null,
      '',
      `${location.pathname}?${new URLSearchParams(next)}`,
    );
  }
  const canAdd = !!options.data && options.data.canManageExpenses !== false;
  const filtered = ['overview', 'transactions', 'expenses'].includes(view);
  return (
    <WorkspaceFrame
      className="finance-workspace"
      headingClassName="finance-heading"
      actionsClassName="finance-heading-actions"
      icon="credit-card"
      title="Finances"
      description={
        manager
          ? 'Collected revenue, expenses, booth invoices and market activity, all in one place.'
          : 'Sales, expenses and profit, all in one place.'
      }
      tabs={tabs.map((tab) => ({ ...tab, href: hrefFor(tab.value) }))}
      value={view}
      onChange={(next) => go(hrefFor(next))}
      actions={
        api && (
          <>
            {canAdd && (
              <FarmstandButton onClick={() => setAdding(true)}>
                <FarmstandIcon name="plus" />
                Add Expense
              </FarmstandButton>
            )}
            <FarmstandButton
              variant="secondary"
              loading={busy}
              disabled={!options.data}
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
            </FarmstandButton>
          </>
        )
      }
    >
      {error && <Alert severity="error">{error}</Alert>}
      <ReadState {...options} retry={options.refresh} />
      {filtered && (!api || options.data) && (
        <FarmstandPanel
          as="section"
          className="finance-filters"
          aria-label="Reporting period"
        >
          <Field
            id={id + '-period'}
            label={<span className="sr-only">Period</span>}
          >
            <FarmstandSelect
              id={id + '-period'}
              icon="calendar-days"
              value={preset}
              onChange={(e) => {
                // Custom opens the shared date-range calendar; the period
                // changes only once a range is applied.
                if (e.target.value === 'custom') setCalendar(true);
                else {
                  setPreset(e.target.value);
                  update(
                    financeDates(e.target.value, new Date(), scope.timezone),
                  );
                }
              }}
            >
              {[
                ['7', 'Last 7 days'],
                ['30', 'Last 30 days'],
                ['90', 'Last 90 days'],
                ['month', 'This month'],
                ['last-month', 'Last month'],
                [
                  'custom',
                  preset === 'custom'
                    ? `${shortDate(scope.from)} to ${shortDate(scope.through)}`
                    : 'Custom date range',
                ],
              ].map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
          {preset === 'custom' && (
            <FarmstandButton
              variant="secondary"
              size="compact"
              onClick={() => setCalendar(true)}
            >
              <UtilityIcon name="calendar" />
              Edit date range
            </FarmstandButton>
          )}
          {options.data && (
            <Field
              id={id + '-scope'}
              label={
                <span className="sr-only">
                  {manager ? 'Market' : 'Sales scope'}
                </span>
              }
            >
              <FarmstandSelect
                id={id + '-scope'}
                icon="store"
                value={scope.market}
                onChange={(e) => update({ market: e.target.value })}
              >
                <option value="ALL">
                  {manager ? 'Market operations' : 'All sales'}
                </option>
                {!manager && (
                  <option value="INDEPENDENT">Independent sales</option>
                )}
                {options.data.markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </FarmstandSelect>
            </Field>
          )}
          {options.data && options.data.currencies.length > 1 && (
            <Field
              id={id + '-currency'}
              label={<span className="sr-only">Currency</span>}
            >
              <FarmstandSelect
                id={id + '-currency'}
                value={scope.currency}
                onChange={(e) => update({ currency: e.target.value })}
              >
                {options.data.currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </FarmstandSelect>
            </Field>
          )}
          <span className="finance-filters-note">
            {scope.from} – {scope.through} · {scope.timezone}
          </span>
        </FarmstandPanel>
      )}
      <div className="markets-view finance-view" key={view}>
        {view === 'overview' &&
          (api
            ? options.data && (
                <FinanceOverview
                  api={api}
                  scope={scope}
                  report={report}
                  manager={manager}
                  money={money}
                  revision={revision}
                  insights={insights?.(insightScope)}
                />
              )
            : insights?.(insightScope))}
        {['transactions', 'expenses'].includes(view) && (
          <ReadState {...report} retry={report.refresh} />
        )}
        {view === 'transactions' && report.data && (
          <FinanceTransactions
            report={report.data}
            options={options.data}
            timezone={scope.timezone}
            money={money}
            orderHref={
              manager
                ? undefined
                : (orderId) => `/vendor/orders/${encodeURIComponent(orderId)}`
            }
          />
        )}
        {view === 'expenses' && report.data && (
          <FinanceExpenses
            report={report.data}
            options={options.data}
            money={money}
            onOpen={setExpenseId}
          />
        )}
        {view === 'invoices' && (
          <div className="finance-invoices">{invoices}</div>
        )}
        {view === 'quickbooks' && api?.quickbooks && (
          <QuickBooks
            api={api.quickbooks}
            manager={manager}
            categories={options.data?.categories ?? []}
          />
        )}
      </div>
      {calendar && (
        <OrdersDateRange
          value={{ from: scope.from, to: scope.through }}
          subject="finances"
          onClose={() => setCalendar(false)}
          onApply={(next) => {
            setPreset('custom');
            update({ from: next.from, through: next.to });
            setCalendar(false);
          }}
        />
      )}
      {api && (adding || expenseId) && options.data && (!adding || canAdd) && (
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
            setRevision((r) => r + 1);
            if (createdId) {
              setAdding(false);
              setExpenseId(createdId);
            }
          }}
        />
      )}
    </WorkspaceFrame>
  );
}
