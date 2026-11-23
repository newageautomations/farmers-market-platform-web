import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dialog, Spinner, UtilityIcon } from '@market/ui';
import { FarmstandButton, FarmstandIcon } from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import {
  loadStripeSdk,
  type StripePaymentClient,
  type StripePaymentElement,
  type StripePaymentElements,
  type StripePaymentFactory,
} from '@market/ui/stripe-card';
import { formatMoney } from '@market/config';
import type {
  BoothInvoiceApi,
  BoothInvoiceDetail,
  BoothInvoiceFee,
  BoothInvoicePayment as Payment,
} from '@market/api';
import { useWizardDialogHeight } from '../WizardProgress';
import { StatusBadge } from '../market/presentation';
import {
  InvoiceHistory,
  paymentMethodLabel,
} from '../market/phase14/InvoiceHistory';
import { InvoiceTable } from '../market/phase14/InvoiceTable';
import { outstanding } from '../market/phase14/InvoiceActions';
import './booth-invoice-payment.css';

const money = (n: number, currency: string) => formatMoney(n, currency);
const pending = (p: Payment | null) =>
  !!p?.active && ['PROCESSING', 'CAPTURED'].includes(p.state);
const canEnterPayment = (p: Payment | null) =>
  !!p?.active && !p.reviewCode && p.state === 'CARD_REQUIRED';
const matchesQuote = (expected: BoothInvoiceFee, actual: BoothInvoiceFee) =>
  expected.base === actual.base &&
  expected.platform === actual.platform &&
  expected.recovery === actual.recovery &&
  expected.feeTax === actual.feeTax &&
  expected.gross === actual.gross &&
  expected.currency === actual.currency &&
  expected.policy === actual.policy;
const day = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
/** Compact result shown after Pay: a working ring, then a check or an X. */
type Outcome =
  | { kind: 'processing' }
  | { kind: 'success' }
  | { kind: 'failure'; message: string; retry: boolean };
const DECLINED =
  'Your payment was not completed. Check your payment details or choose another method.';
/** The server's payment state decides the result; a Stripe callback never does. */
function settled(p: Payment | null | undefined): Outcome | null {
  if (!p) return null;
  if (p.state === 'COMPLETED') return { kind: 'success' };
  if (pending(p)) return { kind: 'processing' };
  if (p.state === 'REVIEW' || p.reviewCode)
    return {
      kind: 'failure',
      message:
        'This payment needs verification. Contact the market before making another payment.',
      retry: false,
    };
  if (p.state === 'CANCELED')
    return {
      kind: 'failure',
      message:
        'This payment was canceled. No invoice principal was settled by this attempt.',
      retry: false,
    };
  return null;
}
type Row = {
  key: string;
  description: string;
  detail?: string;
  quantity?: number;
  unitMinor?: number;
  amountMinor: number;
  tone?: 'credit';
};
/** Every charge, adjustment, payment and completed refund as an invoice line.
 * Refunds lower the server's paid amount, so these lines add up to its
 * balance due (total minus paid). */
function ledgerRows(detail: BoothInvoiceDetail): Row[] {
  const i = detail.invoice;
  return [
    ...i.lines.map((l, index) => ({
      key: `line:${index}`,
      description: l.description,
      quantity: l.quantity,
      unitMinor: l.unitMinor,
      amountMinor: l.lineMinor,
    })),
    ...(i.adjustments ?? []).map((a) => ({
      key: `adjustment:${a.id}`,
      description: a.amountMinor >= 0 ? 'Charge added' : 'Charge reduced',
      detail: a.reason,
      amountMinor: a.amountMinor,
      tone: a.amountMinor < 0 ? ('credit' as const) : undefined,
    })),
    ...[...detail.payments]
      .sort((a, b) => Date.parse(a.paidAt) - Date.parse(b.paidAt))
      .map((p) => ({
        key: `payment:${p.id}`,
        description: ['WAIVED', 'COMPLIMENTARY'].includes(p.method)
          ? `${paymentMethodLabel(p.method)} by the market`
          : `Payment · ${paymentMethodLabel(p.method)}`,
        detail: day(p.paidAt),
        amountMinor: -p.amountMinor,
        tone: 'credit' as const,
      })),
    ...(i.refunds ?? [])
      .filter((r) => r.state === 'COMPLETED')
      .map((r) => ({
        key: `refund:${r.id}`,
        description: `Refund · ${paymentMethodLabel(r.method)}`,
        detail: r.returnedAt ? day(r.returnedAt) : r.reason,
        amountMinor: r.amountMinor,
      })),
  ];
}
/** Invoice-specific controller: shared checkout owns merchandise groups and cannot authorize booth debt. */
export function BoothInvoicePayment({
  api,
  invoiceId,
  onUpdated,
  marketDate,
  loadSdk = loadStripeSdk,
  actionLabel = 'View invoice',
  cancelled = false,
  initialOpen = false,
}: {
  api: BoothInvoiceApi;
  invoiceId: number;
  onUpdated: () => void;
  /** Market date label, when the caller knows it. */
  marketDate?: string;
  loadSdk?: () => Promise<StripePaymentFactory>;
  actionLabel?: string;
  cancelled?: boolean;
  /** Open the existing invoice dialog when arriving from an invoice link. */
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen),
    [detail, setDetail] = useState<BoothInvoiceDetail | null>(null),
    [payment, setPayment] = useState<Payment | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [entry, setEntry] = useState<{
      id: Payment['id'];
      secret: string;
    } | null>(null),
    [entryReady, setEntryReady] = useState(false),
    [outcome, setOutcome] = useState<Outcome | null>(null);
  const root = useRef<HTMLDivElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    host = useRef<HTMLDivElement>(null),
    elements = useRef<StripePaymentElements | null>(null),
    stripe = useRef<StripePaymentClient | null>(null),
    lock = useRef(false),
    /** True while the compact result waits on the server's payment status. */
    watching = useRef(false);
  // Eases the dialog between the full invoice and the compact result.
  const capture = useWizardDialogHeight(root, outcome?.kind ?? 'invoice');
  const show = useCallback(
    (next: Outcome | null) => {
      capture();
      setOutcome(next);
    },
    [capture],
  );
  const outcomeKind = outcome?.kind;
  useEffect(() => {
    if (outcomeKind) heading.current?.focus({ preventScroll: true });
  }, [outcomeKind]);
  const refresh = useCallback(async () => {
    const d = await api.detail(invoiceId);
    setDetail(d);
    return d;
  }, [api, invoiceId]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const returned = initialOpen ? params.get('invoice-payment-return') : null;
    void api
      .detail(invoiceId)
      .then(async (d) => {
        if (!active) return;
        setDetail(d);
        if (
          cancelled ||
          d.occurrenceStatus === 'cancelled' ||
          ['VOID', 'CANCELED', 'CANCEL_PENDING'].includes(d.invoice.status)
        )
          return;
        const returning = d.collections.some((c) => String(c.id) === returned);
        if (!returning && !d.collections.some((c) => c.active)) return;
        const p = await api.act(invoiceId, 'STATUS');
        if (!active || !p) return;
        setPayment(p);
        if (p.state === 'COMPLETED' && d.invoice.status !== 'PAID') {
          await refresh();
          if (active) onUpdated();
        }
        if (active && returning && String(p.id) === returned) {
          const next = settled(p);
          watching.current = next?.kind === 'processing';
          show(next);
        }
      })
      .catch(() => {
        if (active)
          setError(
            'This invoice could not be opened. Check your access and try again.',
          );
      });
    return () => {
      active = false;
    };
  }, [api, invoiceId, open, cancelled, initialOpen, onUpdated, refresh, show]);
  const account = payment?.account,
    key = payment?.publishableKey;
  const secret =
    canEnterPayment(payment) && payment?.id === entry?.id
      ? entry?.secret
      : undefined;
  useEffect(() => {
    if (!open || !secret || !account || !key || !host.current) return;
    let active = true,
      mounted: StripePaymentElement | undefined;
    void loadSdk()
      .then((factory) => {
        if (!active || !host.current) return;
        const client = factory(key, { stripeAccount: account });
        const form = client.elements({ clientSecret: secret });
        const element = form.create('payment', {
          layout: {
            type: 'accordion',
            radios: 'always',
            defaultCollapsed: false,
          },
          defaultValues: { billingDetails: {} },
          fields: {
            billingDetails: { name: 'auto', email: 'auto', phone: 'auto' },
          },
        });
        stripe.current = client;
        elements.current = form;
        mounted = element;
        setEntryReady(false);
        element.on('change', (v) => {
          if (active) setEntryReady(v.complete && !v.error);
        });
        element.mount(host.current);
      })
      .catch(() => {
        if (active)
          setError(
            'The secure payment form could not load. Reopen this invoice to try again.',
          );
      });
    return () => {
      active = false;
      mounted?.destroy();
      elements.current = null;
      stripe.current = null;
    };
  }, [open, secret, account, key, loadSdk]);
  useEffect(() => {
    if (!open || !payment?.active || payment.state === 'REVIEW') return;
    let active = true,
      running = false;
    const timer = setInterval(() => {
      if (running || lock.current) return;
      running = true;
      void api
        .act(invoiceId, 'STATUS')
        .then(async (p) => {
          if (!active || lock.current || !p) return;
          setPayment(p);
          if (p.state === 'COMPLETED') {
            await refresh();
            onUpdated();
          }
          // A payment still processing after Pay settles here.
          const next = settled(p);
          if (watching.current && next && next.kind !== 'processing') {
            watching.current = false;
            show(next);
          }
        })
        .catch(() => {
          if (active)
            setError(
              'Payment status is being verified. Please keep this invoice open.',
            );
        })
        .finally(() => {
          running = false;
        });
    }, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [
    open,
    api,
    invoiceId,
    payment?.active,
    payment?.state,
    refresh,
    onUpdated,
    show,
  ]);
  const choosePayment = async () => {
    if (noPayment || lock.current || !detail?.eligible) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setEntry(null);
    setEntryReady(false);
    try {
      const expected = payment?.active ? payment.quote : detail.paymentQuote;
      const prepared = payment?.active ? payment : await api.prepare(invoiceId);
      setPayment(prepared);
      if (!prepared.active || settled(prepared)) return;
      // Review the frozen amount if it differs from the amount the payer saw.
      if (!expected) return;
      if (!matchesQuote(expected, prepared.quote)) {
        setError(
          'The payment total changed. Review the updated amount before choosing a payment method.',
        );
        return;
      }
      const p = await api.act(invoiceId, 'CONFIRM', prepared.consentPolicy);
      if (!p) throw new Error('No payment');
      setPayment(p);
      if (p.state === 'COMPLETED') {
        await refresh();
        onUpdated();
      }
      if (p.id === prepared.id && canEnterPayment(p) && p.clientSecret) {
        setEntry({ id: p.id, secret: p.clientSecret });
      } else if (canEnterPayment(p) && !p.clientSecret) {
        throw new Error('No payment form');
      }
    } catch {
      setError(
        'Secure payment could not be opened. Check the invoice and try again.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const pay = async () => {
    const form = elements.current;
    const client = stripe.current;
    if (
      noPayment ||
      lock.current ||
      !payment ||
      !detail ||
      !secret ||
      !form ||
      !entryReady ||
      !client?.confirmPayment
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    show({ kind: 'processing' });
    let next: Outcome;
    try {
      const p = await api.act(invoiceId, 'CONFIRM', payment.consentPolicy);
      if (!p) throw new Error('No payment');
      setPayment(p);
      if (canEnterPayment(p)) {
        if (p.id !== payment.id || p.clientSecret !== secret)
          throw new Error('Payment form changed');
        const returnUrl = new URL('/vendor/booths', window.location.origin);
        returnUrl.searchParams.set(
          'occurrence',
          String(detail.invoice.occurrenceId),
        );
        returnUrl.searchParams.set('invoice', String(invoiceId));
        returnUrl.searchParams.set('invoice-payment-return', String(p.id));
        await client.confirmPayment({
          elements: form,
          redirect: 'if_required',
          confirmParams: {
            return_url: returnUrl.href,
            payment_method_data: { billing_details: {} },
          },
        });
      }
      const verified = await api.act(invoiceId, 'STATUS');
      if (!verified || verified.id !== payment.id)
        throw new Error('Payment status changed');
      setPayment(verified);
      if (verified.state === 'COMPLETED') {
        await refresh();
        onUpdated();
      }
      next = settled(verified) ?? {
        kind: 'failure',
        message: DECLINED,
        retry: canEnterPayment(verified),
      };
    } catch {
      next = {
        kind: 'failure',
        message:
          'We are checking the payment result. This invoice remains reserved while the original payment is verified.',
        retry: false,
      };
    } finally {
      lock.current = false;
      setBusy(false);
    }
    watching.current = next.kind === 'processing';
    show(next);
  };
  const close = () => {
    if (!busy) {
      setOpen(false);
      setDetail(null);
      setError('');
      setPayment(null);
      setEntry(null);
      setEntryReady(false);
      setOutcome(null);
      watching.current = false;
    }
  };
  const i = detail?.invoice;
  const dateCancelled = cancelled || detail?.occurrenceStatus === 'cancelled';
  const noPayment =
    dateCancelled ||
    (!!i && ['VOID', 'CANCELED', 'CANCEL_PENDING'].includes(i.status));
  const due = i && !noPayment ? Math.max(0, outstanding(i)) : 0;
  // The server decides when an invoice is past due.
  const overdue = !!i?.dueAt && due > 0 && i.billingStatus === 'PAST_DUE';
  const quote = payment?.active ? payment.quote : detail?.paymentQuote;
  const feeQuote = due > 0 ? quote : null;
  const totalDue = feeQuote?.gross ?? due;
  const canChoose =
    !!detail?.eligible &&
    due > 0 &&
    !secret &&
    !pending(payment) &&
    !payment?.reviewCode &&
    payment?.state !== 'REVIEW';
  return (
    <>
      <FarmstandButton
        variant="secondary"
        size="compact"
        aria-label={`${cancelled ? 'View invoice' : actionLabel} ${invoiceId}`}
        onClick={() => setOpen(true)}
      >
        <FarmstandIcon name="receipt-text" />
        {cancelled ? 'View invoice' : actionLabel}
      </FarmstandButton>
      <Dialog
        open={open}
        size="wide"
        className={`booth-invoice-dialog vendor-invoice-dialog farmstand-controls ${outcome ? 'is-payment-result' : ''}`}
        title={`Invoice ${invoiceId}`}
        onClose={close}
        busy={busy}
      >
        <div ref={root} className="booth-invoice-body">
          {outcome && (
            <div
              className={`booth-invoice-outcome vendor-invoice-outcome is-${outcome.kind === 'failure' ? 'failure' : outcome.kind}`}
            >
              <div role={outcome.kind === 'failure' ? 'alert' : 'status'}>
                {outcome.kind === 'processing' ? (
                  <span className="generate-creating-ring" aria-hidden="true" />
                ) : (
                  <span
                    className="reward-published-check booth-invoice-outcome-mark"
                    aria-hidden="true"
                  >
                    <UtilityIcon
                      name={outcome.kind === 'success' ? 'check' : 'close'}
                    />
                  </span>
                )}
                <h3 ref={heading} tabIndex={-1}>
                  {outcome.kind === 'processing'
                    ? 'Processing payment'
                    : outcome.kind === 'success'
                      ? 'Payment received'
                      : 'Payment not completed'}
                </h3>
                <p>
                  {outcome.kind === 'processing'
                    ? busy
                      ? 'Keep this window open while we confirm your payment.'
                      : 'Your payment is processing. The invoice balance updates after Stripe verification.'
                    : outcome.kind === 'success'
                      ? 'Payment verified and recorded. Your invoice is paid.'
                      : outcome.message}
                </p>
              </div>
              {outcome.kind !== 'processing' && (
                <div className="ui-actions booth-invoice-outcome-actions">
                  {outcome.kind === 'success' ? (
                    <>
                      <FarmstandButton
                        variant="secondary"
                        onClick={() => show(null)}
                      >
                        View invoice
                      </FarmstandButton>
                      <FarmstandButton onClick={close}>Done</FarmstandButton>
                    </>
                  ) : (
                    <FarmstandButton onClick={() => show(null)}>
                      {outcome.retry ? 'Try again' : 'Back to invoice'}
                    </FarmstandButton>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Keep the secure payment form mounted behind the result for retries. */}
          <div className="booth-invoice-stage" hidden={!!outcome}>
            {error && <Alert severity="error">{error}</Alert>}
            {!detail && !error && <Spinner label="Loading invoice" />}
            {detail && i && (
              <>
                <div className="booth-invoice-meta">
                  <StatusBadge>
                    {dateCancelled
                      ? 'Cancelled'
                      : (i.billingStatus ?? i.status)}
                  </StatusBadge>
                  <span>{detail.marketName}</span>
                  {marketDate && <span>Market date {marketDate}</span>}
                </div>
                {dateCancelled && (
                  <Alert severity="info">
                    The market cancelled this date. This invoice is cancelled
                    and no payment is due. Recorded payments remain in your
                    history. Contact the market about refunds.
                  </Alert>
                )}
                <dl
                  className="booth-invoice-balance vendor-invoice-balance"
                  aria-label="Invoice balance"
                >
                  <div data-tone={due > 0 ? 'owed' : 'settled'}>
                    <dt>Total due</dt>
                    <dd key={totalDue}>{money(totalDue, i.currency)}</dd>
                  </div>
                  <div data-tone={overdue ? 'owed' : undefined}>
                    <dt>{overdue ? 'Past due since' : 'Due date'}</dt>
                    <dd className="vendor-invoice-due">
                      <FarmstandIcon name="calendar-days" />
                      {i.dueAt
                        ? new Date(i.dueAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'No due date'}
                    </dd>
                  </div>
                </dl>
                <section
                  className="booth-invoice-section"
                  aria-labelledby={`vendor-invoice-${i.id}-lines`}
                >
                  <h3 id={`vendor-invoice-${i.id}-lines`}>Charges</h3>
                  <div className="booth-invoice-lines vendor-invoice-lines">
                    <InvoiceTable>
                      <caption className="sr-only">Invoice line items</caption>
                      <thead>
                        <tr>
                          <th scope="col">Description</th>
                          <th scope="col">Quantity</th>
                          <th scope="col">Unit price</th>
                          <th scope="col">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRows(detail).map((row) => (
                          <tr key={row.key} data-tone={row.tone}>
                            <td>
                              {row.description}
                              {row.detail && (
                                <span className="vendor-invoice-line-detail">
                                  {row.detail}
                                </span>
                              )}
                            </td>
                            <td>{row.quantity ?? ''}</td>
                            <td>
                              {row.unitMinor === undefined
                                ? ''
                                : money(row.unitMinor, i.currency)}
                            </td>
                            <td>
                              {row.amountMinor < 0 ? '−' : ''}
                              {money(Math.abs(row.amountMinor), i.currency)}
                            </td>
                          </tr>
                        ))}
                        {feeQuote && (
                          <tr>
                            <td colSpan={3}>Online processing fee</td>
                            <td>{money(feeQuote.fee, feeQuote.currency)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th scope="row" colSpan={3}>
                            Total due
                          </th>
                          <td>{money(totalDue, i.currency)}</td>
                        </tr>
                      </tfoot>
                    </InvoiceTable>
                  </div>
                  {!payment && !detail.eligible && i.status === 'OPEN' && (
                    <p className="markets-muted">{detail.unavailable}</p>
                  )}
                  {!noPayment && (quote || payment || canChoose) && (
                    <>
                      <div
                        ref={host}
                        className="vendor-invoice-card"
                        aria-label="Secure payment entry"
                        hidden={!secret}
                      />
                      {/* The compact result announces these while it shows. */}
                      {!outcome && pending(payment) && (
                        <p role="status" className="markets-muted">
                          Your payment is processing. The invoice balance
                          updates after Stripe verification.
                        </p>
                      )}
                      {!outcome && payment?.state === 'COMPLETED' && (
                        <Alert severity="success">
                          Payment verified and recorded. Your invoice is paid.
                        </Alert>
                      )}
                      {!outcome && payment?.state === 'CANCELED' && (
                        <p role="status" className="markets-muted">
                          This payment was canceled. No invoice principal was
                          settled by this attempt.
                        </p>
                      )}
                      {!outcome &&
                        !pending(payment) &&
                        (payment?.state === 'REVIEW' ||
                          payment?.reviewCode) && (
                          <Alert severity="warning">
                            This payment needs verification. Contact the market
                            before making another payment.
                          </Alert>
                        )}
                      <div className="ui-actions ui-modal-actions vendor-invoice-actions">
                        {canChoose && (
                          <FarmstandButton
                            loading={busy}
                            disabled={busy}
                            onClick={() => void choosePayment()}
                          >
                            Pay Invoice
                          </FarmstandButton>
                        )}
                        {secret && quote && (
                          <FarmstandButton
                            loading={busy}
                            disabled={busy || !entryReady}
                            onClick={() => void pay()}
                          >
                            <FarmstandIcon name="credit-card" />
                            {`Pay invoice ${money(quote.gross, quote.currency)}`}
                          </FarmstandButton>
                        )}
                      </div>
                    </>
                  )}
                </section>
                <InvoiceHistory
                  invoice={i}
                  payments={detail.payments}
                  collections={detail.collections}
                />
              </>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
