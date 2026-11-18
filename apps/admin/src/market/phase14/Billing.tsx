import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Alert, Checkbox, EmptyState, Field, Input } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import type {
  AppError,
  BoothInvoice,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { MarketsSummary } from '../../vendor/MarketsSummary';
import { MarketsPagination } from '../../vendor/MarketsPagination';
import { useResettingState } from '../../finance/resetting-state';
import { StatusBadge, date } from '../presentation';
import { moneyLabel } from './common';
import { InvoiceDialog } from './InvoiceDialog';
import { outstanding } from './InvoiceActions';
import './booth-invoices.css';

const PAGE = 20;
const STATUSES = [
  ['OPEN', 'Open'],
  ['PAST_DUE', 'Past due'],
  ['PAID', 'Paid'],
  ['DRAFT', 'Draft'],
  ['COMPLIMENTARY', 'Complimentary'],
  ['CANCEL_PENDING', 'Cancel pending'],
  ['CANCELED', 'Canceled'],
  ['VOID', 'Void'],
] as const;

/** Market Finances › Booth invoices: summary, filterable table and the invoice modal. */
export function Billing({
  data,
  run,
  canManage,
  error,
  occurrence,
}: {
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  error?: AppError | null;
  /** Market date filter owned by the operations controller. */
  occurrence?: {
    value: number;
    options: Array<{ id: number; label: string }>;
    onChange: (id: number) => void;
  };
}) {
  const id = useId();
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(() => {
      const status = new URLSearchParams(window.location.search).get('status');
      return STATUSES.some(([value]) => value === status) ? status! : 'ALL';
    }),
    [openId, setOpenId] = useState<number | null>(null);
  const invoices = data.invoices ?? [];
  const [page, setPage] = useResettingState(0, [
    search,
    status,
    invoices.length,
  ]);
  const query = search.trim().toLowerCase();
  const [selected, setSelected] = useResettingState<ReadonlySet<number>>(
    new Set(),
    [search, status, occurrence?.value],
  );
  const [issuing, setIssuing] = useState(false);
  const issueLock = useRef(false);
  const [dueAt, setDueAt] = useState('');
  const [issueResult, setIssueResult] = useState<{
    issued: number;
    failed: number[];
  }>();
  const rows = invoices
    .filter(
      (i) =>
        (status === 'ALL' || (i.billingStatus ?? i.status) === status) &&
        `${i.id} ${i.recipientSnapshot.businessName}`
          .toLowerCase()
          .includes(query),
    )
    .sort((a, b) => b.id - a.id);
  const shown = rows.slice(page * PAGE, (page + 1) * PAGE);
  const drafts = rows.filter((invoice) => invoice.status === 'DRAFT');
  const chosen = drafts.filter((invoice) => selected.has(invoice.id));
  const pageDrafts = shown.filter((invoice) => invoice.status === 'DRAFT');
  const pageSelected = pageDrafts.filter((invoice) =>
    selected.has(invoice.id),
  ).length;
  function toggle(ids: number[], checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }
  async function issueSelected() {
    if (!canManage || !chosen.length || issueLock.current) return;
    issueLock.current = true;
    setIssuing(true);
    setIssueResult(undefined);
    const issued: number[] = [],
      failed: number[] = [];
    try {
      for (const invoice of chosen) {
        try {
          const result = await run({
            action: 'ISSUE_INVOICE',
            id: invoice.id,
            expectedRevision: invoice.revision,
            data: {
              online: false,
              dueAt: dueAt ? new Date(dueAt).toISOString() : null,
            },
          });
          (result ? issued : failed).push(invoice.id);
        } catch {
          failed.push(invoice.id);
        }
      }
      toggle(issued, false);
      setIssueResult({ issued: issued.length, failed });
    } finally {
      issueLock.current = false;
      setIssuing(false);
    }
  }
  const current = invoices.find((i) => i.id === openId);
  const summary = data.billingSummary;
  const totals = Object.entries(summary?.byCurrency ?? {});
  const sum = (
    field: 'expectedMinor' | 'collectedMinor' | 'outstandingMinor',
  ) =>
    totals.map(([c, s]) => moneyLabel(s[field], c)).join(' · ') ||
    moneyLabel(0, invoices[0]?.currency ?? 'USD');
  const waived = totals
    .map(([c, s]) => moneyLabel(s.waivedMinor, c))
    .join(' · ');
  const occurrenceLabel = occurrence?.options.find(
    (o) => o.id === (current?.occurrenceId ?? -1),
  )?.label;
  const select = (invoice: BoothInvoice) => ({
    tabIndex: 0,
    'aria-label': `Open invoice ${invoice.id}, ${invoice.recipientSnapshot.businessName}`,
    onClick: (event: MouseEvent) => {
      if (
        !issuing &&
        !(event.target as HTMLElement).closest('input, button, a, label')
      )
        setOpenId(invoice.id);
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (
        !issuing &&
        event.target === event.currentTarget &&
        (event.key === 'Enter' || event.key === ' ')
      ) {
        event.preventDefault();
        setOpenId(invoice.id);
      }
    },
  });
  return (
    <div className="booth-invoices">
      {summary && (
        <MarketsSummary
          className="finance-kpis"
          items={[
            {
              label: 'Outstanding',
              value: sum('outstandingMinor'),
              hint: `${summary.open} open · ${summary.pastDue} past due`,
              icon: 'clock',
              tone: summary.pastDue ? 'warning' : undefined,
            },
            {
              label: 'Collected',
              value: sum('collectedMinor'),
              hint: `${summary.paid} paid ${summary.paid === 1 ? 'invoice' : 'invoices'}`,
              icon: 'circle-check',
              tone: 'success',
            },
            {
              label: 'Expected',
              value: sum('expectedMinor'),
              hint: waived ? `Waived ${waived}` : 'All issued invoices',
              icon: 'receipt-text',
            },
            {
              label: 'Past due',
              value: summary.pastDue,
              hint: `${summary.complimentary} complimentary · ${summary.draft ?? 0} draft`,
              icon: 'triangle-alert',
              tone: summary.pastDue ? 'danger' : undefined,
            },
          ]}
        />
      )}
      <FarmstandPanel
        as="section"
        className="markets-list market-applications-list finance-list"
        aria-labelledby={id + '-title'}
      >
        <h2 id={id + '-title'}>Booth invoices</h2>
        <div
          className={`markets-filters finance-list-filters${occurrence ? ' booth-invoice-filters' : ''}`}
        >
          <Field
            id={id + '-search'}
            label={<span className="sr-only">Search invoices</span>}
          >
            <FarmstandSearch
              id={id + '-search'}
              placeholder="Search vendors or invoice numbers..."
              value={search}
              disabled={issuing}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          {occurrence && (
            <Field
              id={id + '-date'}
              label={<span className="sr-only">Market date</span>}
            >
              <FarmstandSelect
                id={id + '-date'}
                icon="calendar-days"
                value={occurrence.value}
                disabled={issuing}
                onChange={(e) => occurrence.onChange(Number(e.target.value))}
              >
                {occurrence.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </FarmstandSelect>
            </Field>
          )}
          <Field
            id={id + '-status'}
            label={<span className="sr-only">Invoice status</span>}
          >
            <FarmstandSelect
              id={id + '-status'}
              value={status}
              disabled={issuing}
              onChange={(e) => {
                const value = e.target.value;
                const url = new URL(window.location.href);
                if (value === 'ALL') url.searchParams.delete('status');
                else url.searchParams.set('status', value);
                window.history.replaceState(null, '', url);
                setStatus(value);
              }}
            >
              <option value="ALL">All statuses</option>
              {STATUSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FarmstandSelect>
          </Field>
        </div>
        {canManage && (
          <form
            className="actions booth-invoice-bulk-actions"
            aria-label="Issue selected invoices"
            onSubmit={(event) => {
              event.preventDefault();
              void issueSelected();
            }}
          >
            <label className="booth-invoice-select-all">
              <Checkbox
                checked={
                  pageDrafts.length > 0 && pageSelected === pageDrafts.length
                }
                ref={(input) => {
                  if (input)
                    input.indeterminate =
                      pageSelected > 0 && pageSelected < pageDrafts.length;
                }}
                disabled={issuing || !pageDrafts.length}
                onChange={(event) =>
                  toggle(
                    pageDrafts.map((i) => i.id),
                    event.currentTarget.checked,
                  )
                }
              />
              Select all drafts on this page ({pageDrafts.length})
            </label>
            <span aria-live="polite">{chosen.length} selected</span>
            <div className="ui-control-row ui-control-row-lookup">
              <Field id={id + '-due'} label="Due date, optional">
                <Input
                  id={id + '-due'}
                  type="date"
                  value={dueAt}
                  disabled={issuing}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </Field>
              <div className="ui-field-action">
                <FarmstandButton
                  type="submit"
                  disabled={issuing || !chosen.length}
                  loading={issuing}
                >
                  Issue invoices{chosen.length > 0 ? ` (${chosen.length})` : ''}
                </FarmstandButton>
              </div>
            </div>
          </form>
        )}
        {issueResult && (
          <Alert
            severity={issueResult.failed.length ? 'warning' : 'success'}
            role="status"
          >
            {issueResult.issued}{' '}
            {issueResult.issued === 1 ? 'invoice issued' : 'invoices issued'}.
            {issueResult.failed.length > 0 &&
              ` Could not issue invoices ${issueResult.failed.join(', ')}. Review their current status and try again.`}
          </Alert>
        )}
        {shown.length ? (
          <FarmstandTable
            label="Booth invoices"
            wide
            selectionColumn={canManage}
            headings={[
              ...(canManage ? ['Select'] : []),
              'Vendor',
              'Due',
              'Total',
              'Paid',
              'Outstanding',
              'Status',
            ]}
          >
            {shown.map((i) => {
              const due = outstanding(i);
              return (
                <tr key={i.id} className="booth-invoice-row" {...select(i)}>
                  {canManage && (
                    <td>
                      <Checkbox
                        aria-label={`Select invoice ${i.id}, ${i.recipientSnapshot.businessName}`}
                        checked={i.status === 'DRAFT' && selected.has(i.id)}
                        disabled={issuing || i.status !== 'DRAFT'}
                        onChange={(event) =>
                          toggle([i.id], event.currentTarget.checked)
                        }
                      />
                    </td>
                  )}
                  <th scope="row">
                    <div className="markets-identity">
                      <span className="markets-identity-icon">
                        <FarmstandIcon name="store" />
                      </span>
                      <span className="booth-invoice-identity">
                        <span className="market-application-name">
                          {i.recipientSnapshot.businessName}
                        </span>
                        <span className="markets-muted">Invoice {i.id}</span>
                      </span>
                    </div>
                  </th>
                  <td>{i.dueAt ? date(i.dueAt.slice(0, 10)) : 'Not set'}</td>
                  <td>{moneyLabel(i.totalMinor, i.currency)}</td>
                  <td>{moneyLabel(i.paidMinor, i.currency)}</td>
                  <td
                    className="booth-invoice-due"
                    data-owed={
                      due > 0 &&
                      !['DRAFT', 'CANCELED', 'VOID'].includes(i.status)
                    }
                  >
                    {moneyLabel(Math.max(0, due), i.currency)}
                  </td>
                  <td className="market-application-status-cell">
                    <div className="market-application-status-content">
                      <StatusBadge>{i.billingStatus ?? i.status}</StatusBadge>
                      <FarmstandIcon name="chevron-right" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </FarmstandTable>
        ) : (
          <EmptyState
            title={invoices.length ? 'No matching invoices' : 'No invoices yet'}
          >
            <p>
              {invoices.length
                ? 'Try another search, status or market date.'
                : 'Invoices appear here once vendors are assigned booths for this market date.'}
            </p>
          </EmptyState>
        )}
        <MarketsPagination
          label="Invoice pages"
          summary={`${rows.length} ${rows.length === 1 ? 'invoice' : 'invoices'}`}
          hasPrevious={page > 0}
          hasNext={(page + 1) * PAGE < rows.length}
          onPrevious={() => {
            if (!issuing) setPage((p) => p - 1);
          }}
          onNext={() => {
            if (!issuing) setPage((p) => p + 1);
          }}
        />
      </FarmstandPanel>
      {current && (
        <InvoiceDialog
          key={current.id}
          invoice={current}
          payments={data.payments?.filter((p) => p.invoiceId === current.id)}
          collections={data.invoiceCollections?.filter(
            (c) => c.invoiceId === current.id,
          )}
          run={run}
          canManage={canManage}
          error={error}
          occurrence={occurrenceLabel}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

/** Compact invoice summary for other operations views (Assignments); the
 * full invoice and its actions open in the shared invoice modal. */
export function Invoice({
  invoice: i,
  run,
  canManage,
  payments,
  collections,
}: {
  invoice: BoothInvoice;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  payments?: NonNullable<MarketOperationsData['payments']>;
  collections?: NonNullable<MarketOperationsData['invoiceCollections']>;
}) {
  const [open, setOpen] = useState(false);
  const due = outstanding(i);
  return (
    <div className="booth-invoice-compact">
      <StatusBadge>{i.billingStatus ?? i.status}</StatusBadge>
      <dl
        className="booth-invoice-balance"
        aria-label={`Invoice ${i.id} balance`}
      >
        <div>
          <dt>Total</dt>
          <dd>{moneyLabel(i.totalMinor, i.currency)}</dd>
        </div>
        <div data-tone="paid">
          <dt>Paid</dt>
          <dd>{moneyLabel(i.paidMinor, i.currency)}</dd>
        </div>
        <div data-tone={due > 0 ? 'owed' : 'settled'}>
          <dt>Outstanding</dt>
          <dd>{moneyLabel(Math.max(0, due), i.currency)}</dd>
        </div>
      </dl>
      <FarmstandButton
        variant="secondary"
        size="compact"
        onClick={() => setOpen(true)}
      >
        Open invoice
      </FarmstandButton>
      {open && (
        <InvoiceDialog
          invoice={i}
          payments={payments}
          collections={collections}
          run={run}
          canManage={canManage}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
