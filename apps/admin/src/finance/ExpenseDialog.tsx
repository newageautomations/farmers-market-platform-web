import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Dialog,
  Dropdown,
  Field,
  Input,
  Textarea,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandSelect,
} from '@market/ui/farmstand';
import { buttonClassName } from '@market/ui/presentation';
import type { ComponentProps, ReactNode } from 'react';
import { formatMoney, parsePrice } from '@market/config';
import { safeError, type FinanceApi, type FinanceOptions } from '@market/api';
import { ReadState, useRead } from '../vendor/common';
import { minorDecimal } from './ProductionCost';
import {
  chronologicalExpenseHistory,
  expenseHistoryEntry,
} from './expense-history';

/** Labelled Farmstand select for the expense form. */
function SelectRow({
  label,
  info,
  children,
  ...props
}: ComponentProps<typeof FarmstandSelect> & {
  label: ReactNode;
  info?: string;
}) {
  const id = useId();
  return (
    <Field id={id} label={label} info={info}>
      <FarmstandSelect id={id} {...props}>
        {children}
      </FarmstandSelect>
    </Field>
  );
}

export function ExpenseDialog({
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
      className="finance-expense-dialog"
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
          <FarmstandButton type="submit" form={formId} loading={busy}>
            Save expense
          </FarmstandButton>
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
            <SelectRow
              label="Category"
              name="category"
              defaultValue={e?.category ?? options.categories[0]}
            >
              {options.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </SelectRow>
            {options.kind === 'VENDOR' && (
              <SelectRow
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
              </SelectRow>
            )}
            {attribution === 'MARKET' && (
              <>
                <SelectRow
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
                </SelectRow>
                <SelectRow
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
                </SelectRow>
              </>
            )}
            {options.kind === 'VENDOR' && (
              <SelectRow
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
              </SelectRow>
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
            <div className="finance-expense-summary">
              <div>
                <span className="finance-expense-amount">
                  {money(e.amount)}
                </span>
                <span className="finance-expense-meta">
                  <FarmstandIcon name="calendar-days" />
                  {e.spentOn}
                  <span aria-hidden="true">·</span>
                  {e.category}
                </span>
              </div>
              <Badge tone={e.voided ? 'neutral' : 'success'}>
                {e.voided ? 'Voided' : 'Recorded'}
              </Badge>
            </div>
            <dl className="finance-expense-facts">
              {[
                [
                  'Applies to',
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
            <section
              className="finance-expense-receipts"
              aria-labelledby={formId + 'receipts'}
            >
              <div className="finance-expense-section-title">
                <h3 id={formId + 'receipts'}>Receipts</h3>
                {!e.voided && options.canManageExpenses !== false && (
                  <label
                    className={buttonClassName({
                      variant: 'secondary',
                      size: 'compact',
                      className: 'farmstand-button finance-receipt-upload',
                    })}
                    aria-disabled={busy || undefined}
                  >
                    <FarmstandIcon name="plus-small" />
                    Upload receipt
                    <input
                      id={formId + 'receipt'}
                      type="file"
                      className="sr-only"
                      aria-label="Receipt (image or PDF, up to 10 MB)"
                      disabled={busy}
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
                  </label>
                )}
              </div>
              {query.data?.receipts.length ? (
                <ul className="finance-receipt-list">
                  {query.data.receipts.map((r) => (
                    <li key={r.id}>
                      <FarmstandIcon name="receipt-text" />
                      <span className="finance-receipt-name">{r.filename}</span>
                      {r.status === 'AVAILABLE' ? (
                        <FarmstandButton
                          variant="tertiary"
                          size="compact"
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
                        </FarmstandButton>
                      ) : (
                        <Badge tone="neutral">{r.status}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="finance-expense-empty">
                  No receipts yet. Images or PDFs up to 10 MB.
                </p>
              )}
            </section>
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
            {!e.voided && options.canManageExpenses !== false && (
              <div className="finance-expense-actions">
                <FarmstandButton
                  variant="destructive-outline"
                  onClick={() => setConfirmVoid(true)}
                >
                  Void expense
                </FarmstandButton>
                <FarmstandButton
                  onClick={() => {
                    setAttribution(e.attribution);
                    setMarket(e.marketId ?? '');
                    setEditing(true);
                  }}
                >
                  Edit expense
                </FarmstandButton>
              </div>
            )}
          </>
        )}
        {confirmVoid && e && (
          <Dialog
            open
            title="Void this expense?"
            busy={busy}
            onClose={() => setConfirmVoid(false)}
            actions={
              <FarmstandButton
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
              </FarmstandButton>
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
