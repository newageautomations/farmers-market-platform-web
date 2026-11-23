import { Dropdown } from '@market/ui';
import type { BoothInvoice, MarketOperationsData } from '@market/api';
import { moneyLabel } from './common';
import './booth-invoices.css';

/** Manager payment records, or the vendor invoice detail's (string ids). */
type Payment = Omit<
  NonNullable<MarketOperationsData['payments']>[number],
  'id' | 'invoiceId'
> & { id: number | string };
type Collection = NonNullable<
  MarketOperationsData['invoiceCollections']
>[number];

export type InvoiceHistoryEntry = {
  key: string;
  at: string;
  message: string;
  detail?: string;
  /** Effect on the balance due: negative settles it (green), positive raises it (red). */
  balance: number | null;
};

export const paymentMethodLabel = (method: string) =>
  method === 'STRIPE'
    ? 'Stripe'
    : method.charAt(0) + method.slice(1).toLowerCase().replaceAll('_', ' ');

/** One newest-first ledger from the invoice's adjustments, payments, refunds
 * and unfinished online collections. Amounts are the server's records. */
export function invoiceHistory(
  i: BoothInvoice,
  payments: Payment[] = [],
  collections: Collection[] = [],
): InvoiceHistoryEntry[] {
  const entries: InvoiceHistoryEntry[] = [
    ...(i.adjustments ?? []).map((a) => ({
      key: `adjustment:${a.id}`,
      at: a.createdAt,
      message: a.amountMinor >= 0 ? 'Charge added' : 'Charge reduced',
      detail: a.reason,
      balance: a.amountMinor,
    })),
    ...payments.map((p) => ({
      key: `payment:${p.id}`,
      at: p.paidAt,
      message: ['WAIVED', 'COMPLIMENTARY'].includes(p.method)
        ? `${paymentMethodLabel(p.method)} by the market`
        : `Payment received · ${paymentMethodLabel(p.method)}`,
      detail: `Payment ${p.id}`,
      balance: -p.amountMinor,
    })),
    ...(i.refunds ?? []).map((r) => ({
      key: `refund:${r.id}`,
      at: r.state === 'COMPLETED' ? r.returnedAt : r.createdAt,
      message: `Refund · ${paymentMethodLabel(r.method)}${
        r.state === 'COMPLETED' ? '' : ' · pending verification'
      }${r.reviewCode ? ' · requires reconciliation' : ''}`,
      detail: [
        r.reason,
        `from payment ${r.paymentId}`,
        r.shares.gross !== r.amountMinor &&
          `vendor received ${moneyLabel(r.shares.gross, i.currency)} including fees`,
      ]
        .filter(Boolean)
        .join(' · '),
      balance: r.amountMinor,
    })),
    // A completed online payment also appears as its payment record, which
    // carries the balance change; the attempt itself only explains the fees.
    ...collections.map((c) => ({
      key: `collection:${c.id}`,
      at: c.createdAt ?? '',
      message: `Online payment · ${c.state === 'CARD_REQUIRED' ? 'awaiting payment details' : c.state.toLowerCase().replaceAll('_', ' ')}${c.reviewCode ? ' · requires reconciliation' : ''}`,
      detail: `Invoice principal ${moneyLabel(c.quote.base, c.quote.currency)} · Online charge ${moneyLabel(c.quote.gross, c.quote.currency)} · Online processing fee ${moneyLabel(c.quote.fee, c.quote.currency)}`,
      balance: null,
    })),
  ];
  // Newest first; anything without a usable date goes last.
  const time = (e: InvoiceHistoryEntry) => Date.parse(e.at) || -Infinity;
  return entries.sort((a, b) => time(b) - time(a));
}

/** Collapsible invoice history: date and time, message, then the balance change. */
export function InvoiceHistory({
  invoice: i,
  payments,
  collections,
  timezone,
}: {
  invoice: BoothInvoice;
  payments?: Payment[];
  collections?: Collection[];
  timezone?: string;
}) {
  const entries = invoiceHistory(i, payments, collections);
  return (
    <Dropdown
      className="booth-invoice-history"
      label={
        <span className="booth-invoice-history-label">
          History
          <span className="booth-invoice-history-count">
            {entries.length} {entries.length === 1 ? 'change' : 'changes'}
          </span>
        </span>
      }
    >
      {entries.length ? (
        <ol aria-label="Invoice history, newest first">
          {entries.map((e) => {
            const when = new Date(e.at);
            const valid = Number.isFinite(when.getTime());
            const tone =
              e.balance === null || e.balance === 0
                ? 'neutral'
                : e.balance < 0
                  ? 'settled'
                  : 'owed';
            return (
              <li key={e.key} data-tone={tone}>
                {valid ? (
                  <time dateTime={when.toISOString()}>
                    <span>
                      {when.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: timezone,
                      })}
                    </span>
                    <span>
                      {when.toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: timezone,
                      })}
                    </span>
                  </time>
                ) : (
                  <span className="booth-invoice-history-time">
                    Date unavailable
                  </span>
                )}
                <div className="booth-invoice-history-message">
                  <strong>{e.message}</strong>
                  {e.detail && <span>{e.detail}</span>}
                </div>
                <span className="booth-invoice-history-change">
                  {e.balance === null ? (
                    'No change'
                  ) : (
                    <>
                      <span className="sr-only">
                        {e.balance < 0
                          ? 'Balance due decreased by'
                          : 'Balance due increased by'}{' '}
                      </span>
                      <span aria-hidden="true">
                        {e.balance < 0 ? '−' : '+'}
                      </span>
                      {moneyLabel(Math.abs(e.balance), i.currency)}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="markets-muted">No payments or changes yet.</p>
      )}
    </Dropdown>
  );
}
