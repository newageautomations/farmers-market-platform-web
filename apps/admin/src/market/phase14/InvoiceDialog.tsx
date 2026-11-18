import { useEffect, useRef, useState } from 'react';
import { Alert, Dialog, UtilityIcon } from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';
import type {
  AppError,
  BoothInvoice,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { useWizardDialogHeight } from '../../WizardProgress';
import { StatusBadge, date } from '../presentation';
import { moneyLabel } from './common';
import { InvoiceHistory } from './InvoiceHistory';
import { InvoiceTable } from './InvoiceTable';
import {
  AdjustAction,
  CancelAction,
  IssueAction,
  MoneyRows,
  PaymentAction,
  RefundAction,
  VoidAction,
  outstanding,
  refundablePayments,
  type InvoiceSubmit,
} from './InvoiceActions';
import './booth-invoices.css';

type View =
  'details' | 'payment' | 'adjust' | 'refund' | 'cancel' | 'issue' | 'void';
type Outcome = {
  ok: boolean;
  title: string;
  message: string;
  retry?: () => void;
};

/** Booth invoice modal: balance, line items, history and every manager action.
 * Feature controller only; the server remains the financial authority. */
export function InvoiceDialog({
  invoice: i,
  payments = [],
  collections = [],
  run,
  canManage,
  error,
  occurrence,
  onClose,
}: {
  invoice: BoothInvoice;
  payments?: NonNullable<MarketOperationsData['payments']>;
  collections?: NonNullable<MarketOperationsData['invoiceCollections']>;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  /** The operations controller's last safe command error. */
  error?: AppError | null;
  /** Market date label, when the caller knows it. */
  occurrence?: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>('details'),
    [outcome, setOutcome] = useState<Outcome | null>(null),
    [busy, setBusy] = useState(false),
    lock = useRef(false),
    root = useRef<HTMLDivElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const capture = useWizardDialogHeight(root, `${view}:${!!outcome}`);
  const go = (next: View) => {
    capture();
    setOutcome(null);
    setView(next);
  };
  useEffect(() => {
    if (outcome) heading.current?.focus();
  }, [outcome]);
  const reserved =
    collections.some((c) => c.active || c.state === 'REVIEW') ||
    (i.refunds ?? []).some((r) => r.state !== 'COMPLETED');
  const submit: InvoiceSubmit = async (command, success, failureTitle) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    let result: unknown;
    try {
      result = await run(command);
    } catch {
      result = undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
    capture();
    setOutcome(
      result
        ? { ok: true, ...success }
        : {
            ok: false,
            title: failureTitle,
            message: '',
            // The same idempotency key is resent, so a retry can never apply twice.
            retry: () => void submit(command, success, failureTitle),
          },
    );
  };
  const due = outstanding(i);
  const status = i.billingStatus ?? i.status;
  const refundable = refundablePayments(i, payments).length > 0;
  const open = i.status === 'OPEN';
  const actionProps = { invoice: i, busy, submit, onBack: () => go('details') };
  return (
    <Dialog
      open
      size="wide"
      className="booth-invoice-dialog"
      title={`Invoice ${i.id} · ${i.recipientSnapshot.businessName}`}
      busy={busy}
      onClose={onClose}
    >
      <div ref={root} className="booth-invoice-body">
        {outcome ? (
          <div
            className={`booth-invoice-outcome ${outcome.ok ? 'is-success' : 'is-failure'}`}
          >
            <div role={outcome.ok ? 'status' : 'alert'}>
              <span
                className="reward-published-check booth-invoice-outcome-mark"
                aria-hidden="true"
              >
                <UtilityIcon name={outcome.ok ? 'check' : 'close'} />
              </span>
              <h3 ref={heading} tabIndex={-1}>
                {outcome.title}
              </h3>
              <p>
                {outcome.ok
                  ? outcome.message
                  : (error?.message ??
                    'The result could not be confirmed. Try again to check the original request. It will not be applied twice.')}
              </p>
            </div>
            <div className="ui-actions booth-invoice-outcome-actions">
              {outcome.ok ? (
                <>
                  <FarmstandButton variant="secondary" onClick={onClose}>
                    Close
                  </FarmstandButton>
                  <FarmstandButton onClick={() => go('details')}>
                    Back to invoice
                  </FarmstandButton>
                </>
              ) : (
                <>
                  <FarmstandButton
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      capture();
                      setOutcome(null);
                    }}
                  >
                    Edit details
                  </FarmstandButton>
                  <FarmstandButton loading={busy} onClick={outcome.retry}>
                    Try again
                  </FarmstandButton>
                </>
              )}
            </div>
          </div>
        ) : null}
        {/* Hidden, not unmounted, behind a result so Edit details keeps the draft. */}
        <div hidden={!!outcome} className="booth-invoice-stage" key={view}>
          {view === 'details' && (
            <>
              <div className="booth-invoice-meta">
                <StatusBadge>{status}</StatusBadge>
                <span>{i.dueAt ? `Due ${date(i.dueAt)}` : 'No due date'}</span>
                {occurrence && <span>Market date {occurrence}</span>}
                {i.recipientSnapshot.email && (
                  <a href={`mailto:${i.recipientSnapshot.email}`}>
                    {i.recipientSnapshot.email}
                  </a>
                )}
              </div>
              <dl
                className="booth-invoice-balance"
                aria-label="Invoice balance"
              >
                <div>
                  <dt>Invoice total</dt>
                  <dd key={i.totalMinor}>
                    {moneyLabel(i.totalMinor, i.currency)}
                  </dd>
                </div>
                <div data-tone="paid">
                  <dt>Paid</dt>
                  <dd key={i.paidMinor}>
                    {moneyLabel(i.paidMinor, i.currency)}
                  </dd>
                </div>
                <div data-tone={due > 0 ? 'owed' : 'settled'}>
                  <dt>Outstanding</dt>
                  <dd key={due}>{moneyLabel(Math.max(0, due), i.currency)}</dd>
                </div>
              </dl>
              {reserved && (
                <Alert severity="info">
                  A payment or refund is processing or needs reconciliation.
                  Changes and new payments are unavailable until it is resolved.
                </Alert>
              )}
              {i.status === 'CANCEL_PENDING' && (
                <Alert severity="info">
                  Cancellation is pending. Return each original payment with
                  Refund payment; the invoice closes once every refund
                  reconciles.
                </Alert>
              )}
              <section
                className="booth-invoice-section"
                aria-labelledby={`invoice-${i.id}-lines`}
              >
                <h3 id={`invoice-${i.id}-lines`}>Charges</h3>
                <div className="booth-invoice-lines">
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
                      {i.lines.map((line, index) => (
                        <tr key={index}>
                          <td>{line.description}</td>
                          <td>{line.quantity}</td>
                          <td>{moneyLabel(line.unitMinor, line.currency)}</td>
                          <td>{moneyLabel(line.lineMinor, line.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </InvoiceTable>
                </div>
                <MoneyRows
                  label="Invoice totals"
                  rows={[
                    [
                      'Original charges',
                      moneyLabel(
                        i.originalTotalMinor ??
                          i.lines.reduce((n, l) => n + l.lineMinor, 0),
                        i.currency,
                      ),
                    ],
                    !!i.adjustments?.length && [
                      'Adjustments',
                      (() => {
                        const net = i.adjustments!.reduce(
                          (n, a) => n + a.amountMinor,
                          0,
                        );
                        return `${net < 0 ? '−' : '+'}${moneyLabel(Math.abs(net), i.currency)}`;
                      })(),
                      'muted',
                    ],
                    ['Invoice total', moneyLabel(i.totalMinor, i.currency)],
                    [
                      'Paid',
                      `−${moneyLabel(i.paidMinor, i.currency)}`,
                      'muted',
                    ],
                    [
                      'Outstanding',
                      moneyLabel(Math.max(0, due), i.currency),
                      'total',
                    ],
                  ]}
                />
              </section>
              <InvoiceHistory
                invoice={i}
                payments={payments}
                collections={collections}
              />
              {canManage && (
                <div className="ui-actions ui-modal-actions booth-invoice-actions">
                  {i.status === 'DRAFT' && (
                    <FarmstandButton onClick={() => go('issue')}>
                      Issue invoice
                    </FarmstandButton>
                  )}
                  {['OPEN', 'PAID'].includes(i.status) && !reserved && (
                    <FarmstandButton
                      variant="destructive-outline"
                      onClick={() => go('cancel')}
                    >
                      Cancel invoice
                    </FarmstandButton>
                  )}
                  {open && !reserved && i.paidMinor === 0 && (
                    <FarmstandButton
                      variant="destructive-outline"
                      onClick={() => go('void')}
                    >
                      Void and replace
                    </FarmstandButton>
                  )}
                  <span className="booth-invoice-actions-spacer" />
                  {['OPEN', 'PAID'].includes(i.status) && !reserved && (
                    <FarmstandButton
                      variant="secondary"
                      onClick={() => go('adjust')}
                    >
                      Adjust
                    </FarmstandButton>
                  )}
                  {['OPEN', 'PAID', 'CANCEL_PENDING'].includes(i.status) &&
                    refundable &&
                    !reserved && (
                      <FarmstandButton
                        variant="secondary"
                        onClick={() => go('refund')}
                      >
                        Refund payment
                      </FarmstandButton>
                    )}
                  {open && !reserved && (
                    <FarmstandButton onClick={() => go('payment')}>
                      Record payment
                    </FarmstandButton>
                  )}
                </div>
              )}
            </>
          )}
          {view === 'payment' && <PaymentAction {...actionProps} />}
          {view === 'adjust' && <AdjustAction {...actionProps} />}
          {view === 'cancel' && <CancelAction {...actionProps} />}
          {view === 'issue' && <IssueAction {...actionProps} />}
          {view === 'void' && <VoidAction {...actionProps} />}
          {view === 'refund' && (
            <RefundAction
              {...actionProps}
              payments={payments}
              run={run}
              onStep={capture}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}
