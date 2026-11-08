import { useId, useState } from 'react';
import { Badge, EmptyState, Field } from '@market/ui';
import {
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import type { FinanceOptions, FinanceReport } from '@market/api';
import { MarketsPagination } from '../vendor/MarketsPagination';
import { useResettingState } from './resetting-state';

const PAGE = 20;

/** Expense list; the shared ExpenseDialog remains the detail and edit surface. */
export function FinanceExpenses({
  report,
  options,
  money,
  onOpen,
}: {
  report: FinanceReport;
  options?: FinanceOptions;
  money: (value: number) => string;
  onOpen: (id: string) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState('ALL'),
    [status, setStatus] = useState('ALL');
  // Paging restarts whenever the filters or the report change.
  const [page, setPage] = useResettingState(0, [
    search,
    category,
    status,
    report,
  ]);
  const query = search.trim().toLowerCase();
  const expenses = report.expenses
    .filter(
      (e) =>
        (category === 'ALL' || e.category === category) &&
        (status === 'ALL' || (status === 'VOIDED') === e.voided) &&
        `${e.description} ${e.payee}`.toLowerCase().includes(query),
    )
    .sort((a, b) => b.spentOn.localeCompare(a.spentOn));
  const shown = expenses.slice(page * PAGE, (page + 1) * PAGE);
  // The summary follows the same search, category and status filters as the table.
  const recorded = expenses.filter((e) => !e.voided);
  const byCategory = new Map<string, number>();
  for (const e of recorded)
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  const top = [...byCategory]
    .map(([name, spending]) => ({ name, spending }))
    .sort((a, b) => b.spending - a.spending)
    .slice(0, 5);
  const deducted = recorded
    .filter((e) => e.treatment === 'DEDUCT')
    .reduce((sum, e) => sum + e.amount, 0);
  return (
    <div className="markets-columns market-applications-columns finance-expenses-columns">
      <FarmstandPanel
        as="section"
        className="markets-list market-applications-list finance-list"
        aria-labelledby={id + '-title'}
      >
        <h2 id={id + '-title'}>Expenses</h2>
        <div className="markets-filters finance-list-filters finance-expense-filters">
          <Field
            id={id + '-search'}
            label={<span className="sr-only">Search expenses</span>}
          >
            <FarmstandSearch
              id={id + '-search'}
              placeholder="Search expenses or payees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field
            id={id + '-category'}
            label={<span className="sr-only">Category</span>}
          >
            <FarmstandSelect
              id={id + '-category'}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ALL">All categories</option>
              {options?.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </FarmstandSelect>
          </Field>
          <Field
            id={id + '-status'}
            label={<span className="sr-only">Expense status</span>}
          >
            <FarmstandSelect
              id={id + '-status'}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="RECORDED">Recorded</option>
              <option value="VOIDED">Voided</option>
            </FarmstandSelect>
          </Field>
        </div>
        {shown.length ? (
          <FarmstandTable
            label="Expense history"
            wide
            headings={['Expense', 'Date', 'Category', 'Amount', 'Status']}
          >
            {shown.map((e) => (
              <tr
                key={e.id}
                tabIndex={0}
                onClick={() => onOpen(e.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(e.id);
                  }
                }}
              >
                <th scope="row">
                  <div className="markets-identity">
                    <span className="markets-identity-icon">
                      <FarmstandIcon name="tag" />
                    </span>
                    <span className="market-application-name">
                      {e.description}
                    </span>
                  </div>
                </th>
                <td>{e.spentOn}</td>
                <td>{e.category}</td>
                <td>{money(e.amount)}</td>
                <td className="market-application-status-cell">
                  <div className="market-application-status-content">
                    <Badge tone={e.voided ? 'neutral' : 'success'}>
                      {e.voided ? 'Voided' : 'Recorded'}
                    </Badge>
                    <FarmstandIcon name="chevron-right" />
                  </div>
                </td>
              </tr>
            ))}
          </FarmstandTable>
        ) : (
          <EmptyState title="No matching records">
            <p>Try another search, category or reporting period.</p>
          </EmptyState>
        )}
        <MarketsPagination
          label="Expense pages"
          summary={`${expenses.length} records`}
          hasPrevious={page > 0}
          hasNext={(page + 1) * PAGE < expenses.length}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </FarmstandPanel>
      <FarmstandPanel
        as="section"
        className="markets-next market-application-details finance-details finance-spending-summary"
        aria-label="Spending summary"
      >
        <h2>
          <FarmstandIcon name="tag" />
          Spending summary
        </h2>
        <div className="markets-next-content">
          <dl className="market-application-facts">
            <div>
              <dt>Recorded spending</dt>
              <dd>{money(recorded.reduce((sum, e) => sum + e.amount, 0))}</dd>
            </div>
            <div>
              <dt>Expenses</dt>
              <dd>{recorded.length}</dd>
            </div>
            <div>
              <dt>Deducted from profit</dt>
              <dd>{money(deducted)}</dd>
            </div>
          </dl>
          {top.length > 0 && (
            <section
              className="finance-detail-section"
              aria-label="Top categories"
            >
              <h4>Top categories</h4>
              <ul className="finance-category-list">
                {top.map((c) => (
                  <li key={c.name}>
                    <span>{c.name}</span>
                    <strong>{money(c.spending)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="markets-muted">
            {expenses.length === report.expenses.length
              ? 'All expenses in the selected period.'
              : 'Matching the current search and filters.'}
          </p>
        </div>
      </FarmstandPanel>
    </div>
  );
}
