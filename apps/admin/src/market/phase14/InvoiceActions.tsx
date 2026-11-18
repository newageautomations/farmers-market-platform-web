import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alert } from '@market/ui';
import { FarmstandButton, FarmstandSelect } from '@market/ui/farmstand';
import type {
  BoothInvoice,
  MarketOperationsData,
  OperationsCommand,
} from '@market/api';
import { MinorPriceInput } from '../../PriceInput';
import { WizardProgress } from '../../WizardProgress';
import { Check, Control, Entry, moneyLabel } from './common';
import { paymentMethodLabel } from './InvoiceHistory';

type Payment = NonNullable<MarketOperationsData['payments']>[number];
type Preview = {
  shares: {
    principal: number;
    platform: number;
    recovery: number;
    feeTax: number;
    gross: number;
  };
};
export type InvoiceSuccess = { title: string; message: string };
/** Runs one financial command; the dialog owns busy state and the animated result. */
export type InvoiceSubmit = (
  command: OperationsCommand,
  success: InvoiceSuccess,
  failureTitle: string,
) => Promise<void>;
type ActionProps = {
  invoice: BoothInvoice;
  busy: boolean;
  submit: InvoiceSubmit;
  onBack: () => void;
};

const localNow = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
export const outstanding = (i: BoothInvoice) =>
  i.remainingMinor ?? i.totalMinor - i.paidMinor;

/** Payments that still have principal left to return, with that remainder. */
export function refundablePayments(i: BoothInvoice, payments: Payment[]) {
  return payments
    .filter((p) => !['WAIVED', 'COMPLIMENTARY'].includes(p.method))
    .map((p) => {
      const refunded = (i.refunds ?? [])
        .filter((r) => r.paymentId === p.id)
        .reduce((n, r) => n + r.amountMinor, 0);
      return { ...p, refunded, refundable: p.amountMinor - refunded };
    })
    .filter((p) => p.refundable > 0);
}

/** Heading, body and Back/submit row shared by every invoice action view. */
function ActionForm({
  title,
  intro,
  onSubmit,
  onBack,
  busy,
  submitLabel,
  disabled,
  destructive,
  children,
  backLabel = 'Back to invoice',
}: {
  title: string;
  intro?: ReactNode;
  onSubmit: () => void;
  onBack: () => void;
  busy: boolean;
  submitLabel: string;
  disabled?: boolean;
  destructive?: boolean;
  children?: ReactNode;
  backLabel?: string;
}) {
  return (
    <form
      className="booth-invoice-action"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!disabled && !busy) onSubmit();
      }}
    >
      <div className="booth-invoice-action-heading">
        <h3>{title}</h3>
        {intro && <p>{intro}</p>}
      </div>
      <div className="booth-invoice-action-fields">{children}</div>
      <div className="ui-actions ui-modal-actions booth-invoice-action-buttons">
        <FarmstandButton variant="tertiary" onClick={onBack} disabled={busy}>
          {backLabel}
        </FarmstandButton>
        <FarmstandButton
          type="submit"
          variant={destructive ? 'destructive' : 'primary'}
          loading={busy}
          disabled={disabled}
        >
          {submitLabel}
        </FarmstandButton>
      </div>
    </form>
  );
}

/** Label/value money rows; `total` marks the emphasised last row. */
export function MoneyRows({
  rows,
  label,
  title,
}: {
  rows: Array<[string, string, ('total' | 'muted')?] | false>;
  label: string;
  /** Visible caption above the rows; `label` names the list either way. */
  title?: string;
}) {
  const list = (
    <dl className="booth-invoice-money" aria-label={label}>
      {rows
        .filter((r): r is [string, string, ('total' | 'muted')?] => !!r)
        .map(([dt, dd, tone]) => (
          <div key={dt} data-tone={tone}>
            <dt>{dt}</dt>
            <dd>{dd}</dd>
          </div>
        ))}
    </dl>
  );
  return title ? (
    <div className="booth-invoice-money-group">
      <h4>{title}</h4>
      {list}
    </div>
  ) : (
    list
  );
}

export function PaymentAction({
  invoice: i,
  busy,
  submit,
  onBack,
}: ActionProps) {
  const [method, setMethod] = useState('CASH'),
    [amount, setAmount] = useState(outstanding(i)),
    [note, setNote] = useState(''),
    [paidAt, setPaidAt] = useState(localNow),
    [key] = useState(() => crypto.randomUUID());
  const after = outstanding(i) - amount;
  return (
    <ActionForm
      title="Record a payment"
      intro="Record money the vendor paid outside the platform, in full or in part."
      busy={busy}
      onBack={onBack}
      submitLabel={`Record ${moneyLabel(amount, i.currency)} payment`}
      disabled={amount <= 0 || !paidAt}
      onSubmit={() =>
        void submit(
          {
            action: 'RECORD_PAYMENT',
            id: i.id,
            expectedRevision: i.revision,
            data: {
              idempotencyKey: key,
              amountMinor: amount,
              method,
              note,
              paidAt: new Date(paidAt).toISOString(),
            },
          },
          {
            title: 'Payment recorded',
            message: `${moneyLabel(amount, i.currency)} ${paymentMethodLabel(method).toLowerCase()} payment from ${i.recipientSnapshot.businessName} was added to invoice ${i.id}.`,
          },
          'Payment not recorded',
        )
      }
    >
      <div className="booth-invoice-field-grid">
        <Control label="Payment method">
          {(id) => (
            <FarmstandSelect
              id={id}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {[
                'CASH',
                'CHECK',
                'EXTERNAL',
                'COMPLIMENTARY',
                'WAIVED',
                'OTHER',
              ].map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel(m)}
                </option>
              ))}
            </FarmstandSelect>
          )}
        </Control>
        <Control label="Amount received">
          {(id) => (
            <MinorPriceInput
              id={id}
              valueMinor={amount}
              currency={i.currency}
              onMinorChange={setAmount}
              required
            />
          )}
        </Control>
        <Entry
          label="Payment date and time"
          type="datetime-local"
          value={paidAt}
          onChange={setPaidAt}
          required
        />
        <Entry
          label="Payment note"
          maxLength={2000}
          value={note}
          onChange={setNote}
        />
      </div>
      <MoneyRows
        label="Balance after this payment"
        rows={[
          ['Outstanding now', moneyLabel(outstanding(i), i.currency)],
          ['This payment', `−${moneyLabel(amount, i.currency)}`],
          [
            after < 0 ? 'Overpaid by' : 'Outstanding after',
            moneyLabel(Math.abs(after), i.currency),
            'total',
          ],
        ]}
      />
    </ActionForm>
  );
}

export function AdjustAction({
  invoice: i,
  busy,
  submit,
  onBack,
}: ActionProps) {
  const [direction, setDirection] = useState('increase'),
    [amount, setAmount] = useState(0),
    [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    request = useRef({ key: crypto.randomUUID(), returnedAt: localNow() });
  const delta = direction === 'increase' ? amount : -amount;
  const blocked = i.totalMinor + delta < i.paidMinor;
  return (
    <ActionForm
      title="Adjust invoice"
      intro="Add a charge or reduce what the vendor owes. Adjustments never issue refunds."
      busy={busy}
      onBack={onBack}
      submitLabel="Confirm adjustment"
      disabled={!amount || blocked || !reason.trim() || !confirmed}
      onSubmit={() =>
        void submit(
          {
            action: 'ADJUST_INVOICE',
            id: i.id,
            expectedRevision: i.revision,
            data: {
              idempotencyKey: request.current.key,
              reason,
              amountMinor: delta,
              paymentId: 0,
              confirmed,
              fundsReturned: confirmed,
              method: undefined,
              returnedAt: new Date(request.current.returnedAt).toISOString(),
            },
          },
          {
            title: 'Invoice adjusted',
            message: `Invoice ${i.id} now totals ${moneyLabel(i.totalMinor + delta, i.currency)}.`,
          },
          'Adjustment not saved',
        )
      }
    >
      <div className="booth-invoice-field-grid">
        <Control label="Change">
          {(id) => (
            <FarmstandSelect
              id={id}
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                setConfirmed(false);
              }}
            >
              <option value="increase">Add or increase a charge</option>
              <option value="decrease">Remove or reduce a charge</option>
            </FarmstandSelect>
          )}
        </Control>
        <Control label="Adjustment amount">
          {(id) => (
            <MinorPriceInput
              id={id}
              valueMinor={amount}
              currency={i.currency}
              onMinorChange={(v) => {
                setAmount(v);
                setConfirmed(false);
              }}
            />
          )}
        </Control>
      </div>
      <Entry
        label="Reason and charge description"
        value={reason}
        maxLength={2000}
        required
        onChange={setReason}
      />
      <MoneyRows
        label="Adjustment summary"
        rows={[
          ['Current total', moneyLabel(i.totalMinor, i.currency)],
          [
            'Adjustment',
            `${delta < 0 ? '−' : '+'}${moneyLabel(Math.abs(delta), i.currency)}`,
          ],
          ['Paid so far', moneyLabel(i.paidMinor, i.currency), 'muted'],
          [
            'Outstanding after',
            moneyLabel(i.totalMinor + delta - i.paidMinor, i.currency),
            'total',
          ],
        ]}
      />
      {blocked && (
        <Alert severity="error">
          Refund the excess payment before reducing this invoice below what has
          been paid.
        </Alert>
      )}
      <Check
        animated
        label="I authorize this invoice change"
        checked={confirmed}
        onChange={setConfirmed}
      />
    </ActionForm>
  );
}

export function CancelAction({
  invoice: i,
  busy,
  submit,
  onBack,
}: ActionProps) {
  const [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    request = useRef({ key: crypto.randomUUID(), returnedAt: localNow() });
  return (
    <ActionForm
      title="Cancel invoice"
      intro="Stop collecting this invoice. No future credit is created."
      busy={busy}
      onBack={onBack}
      destructive
      submitLabel="Cancel invoice"
      disabled={!reason.trim() || !confirmed}
      onSubmit={() =>
        void submit(
          {
            action: 'CANCEL_INVOICE',
            id: i.id,
            expectedRevision: i.revision,
            data: {
              idempotencyKey: request.current.key,
              reason,
              amountMinor: 0,
              paymentId: 0,
              confirmed,
              fundsReturned: confirmed,
              method: undefined,
              returnedAt: new Date(request.current.returnedAt).toISOString(),
            },
          },
          {
            title: i.paidMinor ? 'Cancellation started' : 'Invoice canceled',
            message: i.paidMinor
              ? `Return each payment with Refund payment. Invoice ${i.id} closes once ${moneyLabel(i.paidMinor, i.currency)} is refunded.`
              : `Invoice ${i.id} is no longer collected.`,
          },
          'Invoice not canceled',
        )
      }
    >
      {i.paidMinor > 0 && (
        <Alert severity="warning">
          {moneyLabel(i.paidMinor, i.currency)} has been paid. Cancellation
          stays pending until every payment is returned through its original
          payment method.
        </Alert>
      )}
      <Entry
        label="Reason"
        value={reason}
        maxLength={2000}
        required
        onChange={setReason}
      />
      <Check
        animated
        label="I authorize this invoice change"
        checked={confirmed}
        onChange={setConfirmed}
      />
    </ActionForm>
  );
}

export function IssueAction({ invoice: i, busy, submit, onBack }: ActionProps) {
  const [dueAt, setDueAt] = useState('');
  return (
    <ActionForm
      title="Issue invoice"
      intro={`Send this ${moneyLabel(i.totalMinor, i.currency)} invoice to ${i.recipientSnapshot.businessName}.`}
      busy={busy}
      onBack={onBack}
      submitLabel="Issue invoice"
      onSubmit={() =>
        void submit(
          {
            action: 'ISSUE_INVOICE',
            id: i.id,
            expectedRevision: i.revision,
            data: {
              online: false,
              dueAt: dueAt ? new Date(dueAt).toISOString() : null,
            },
          },
          {
            title: 'Invoice issued',
            message: `${i.recipientSnapshot.businessName} can now pay invoice ${i.id}.`,
          },
          'Invoice not issued',
        )
      }
    >
      <Entry
        label="Due date, optional"
        type="date"
        value={dueAt}
        onChange={setDueAt}
      />
    </ActionForm>
  );
}

export function VoidAction({ invoice: i, busy, submit, onBack }: ActionProps) {
  return (
    <ActionForm
      title="Void and replace"
      intro="Void this unpaid invoice and create a replacement draft with the same charges."
      busy={busy}
      onBack={onBack}
      destructive
      submitLabel="Void and create replacement"
      onSubmit={() =>
        void submit(
          {
            action: 'VOID_REISSUE',
            id: i.id,
            expectedRevision: i.revision,
            data: {},
          },
          {
            title: 'Invoice voided',
            message: `Invoice ${i.id} was voided and a replacement draft was created.`,
          },
          'Invoice not voided',
        )
      }
    />
  );
}

/** Two-step refund: choose the payment and amount, then review the server's
 * calculation and confirm. */
export function RefundAction({
  invoice: i,
  payments,
  run,
  busy,
  submit,
  onBack,
  onStep,
}: ActionProps & {
  payments: Payment[];
  run: (c: OperationsCommand) => Promise<unknown>;
  /** Called before the step changes so the dialog can ease its height. */
  onStep: () => void;
}) {
  const id = useId();
  const refundable = refundablePayments(i, payments);
  const [step, setStep] = useState(0),
    [paymentId, setPaymentId] = useState(
      refundable.length === 1 ? String(refundable[0]!.id) : '',
    ),
    [amount, setAmount] = useState(
      refundable.length === 1 ? refundable[0]!.refundable : 0,
    ),
    [reason, setReason] = useState(''),
    [returnedAt, setReturnedAt] = useState(localNow),
    [confirmed, setConfirmed] = useState(false),
    [preview, setPreview] = useState<Preview | null>(null),
    [previewing, setPreviewing] = useState(false),
    [problem, setProblem] = useState(0);
  // One idempotency key per refund attempt, so a retry is never applied twice.
  const [request] = useState(() => ({
    key: crypto.randomUUID(),
    date: new Date().toISOString(),
  }));
  const payment = refundable.find((p) => String(p.id) === paymentId);
  const stripe = payment?.method === 'STRIPE';
  const tooMuch = !!payment && amount > payment.refundable;
  const pending = i.status === 'CANCEL_PENDING';
  const data = {
    idempotencyKey: request.key,
    reason,
    amountMinor: amount,
    paymentId: Number(paymentId),
    confirmed,
    fundsReturned: confirmed,
    method: payment?.method,
    returnedAt:
      stripe || !returnedAt
        ? request.date
        : new Date(returnedAt).toISOString(),
  };
  const change = () => {
    setPreview(null);
    setConfirmed(false);
  };
  const review = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const result = (await run({
        action: 'PREVIEW_INVOICE_REFUND',
        id: i.id,
        expectedRevision: i.revision,
        data,
      })) as Preview | undefined;
      if (result?.shares) {
        onStep();
        setPreview(result);
        setStep(1);
      } else setProblem((n) => n + 1);
    } catch {
      setProblem((n) => n + 1);
    } finally {
      setPreviewing(false);
    }
  };
  const working = busy || previewing;
  return (
    <div className="reward-wizard booth-invoice-refund">
      <WizardProgress
        steps={['Choose payment', 'Review and confirm']}
        step={step}
        label="Refund progress"
      />
      <div className="booth-invoice-stage" key={step}>
        {step === 0 ? (
          <ActionForm
            title="Which payment are you refunding?"
            intro={
              pending
                ? 'Return each original payment to finish cancelling this invoice.'
                : 'A refund corrects a payment and adds the amount back to what the vendor owes. To stop collecting entirely, cancel the invoice instead.'
            }
            busy={working}
            onBack={onBack}
            submitLabel="Review refund"
            disabled={
              !payment ||
              amount <= 0 ||
              tooMuch ||
              !reason.trim() ||
              (!stripe && !returnedAt)
            }
            onSubmit={() => void review()}
          >
            <Control label="Original payment">
              {(cid) => (
                <FarmstandSelect
                  id={cid}
                  value={paymentId}
                  onChange={(e) => {
                    const next = refundable.find(
                      (p) => String(p.id) === e.target.value,
                    );
                    setPaymentId(e.target.value);
                    setAmount(next?.refundable ?? 0);
                    change();
                  }}
                >
                  <option value="">Choose a payment</option>
                  {refundable.map((p) => (
                    <option key={p.id} value={p.id}>
                      {paymentMethodLabel(p.method)} ·{' '}
                      {moneyLabel(p.amountMinor, p.currency)} ·{' '}
                      {new Date(p.paidAt).toLocaleDateString()}
                    </option>
                  ))}
                </FarmstandSelect>
              )}
            </Control>
            {payment && (
              <MoneyRows
                label="Selected payment"
                rows={[
                  [
                    'Paid',
                    `${moneyLabel(payment.amountMinor, i.currency)} on ${new Date(payment.paidAt).toLocaleDateString()}`,
                  ],
                  payment.refunded > 0 && [
                    'Already refunded',
                    moneyLabel(payment.refunded, i.currency),
                    'muted',
                  ],
                  [
                    'Available to refund',
                    moneyLabel(payment.refundable, i.currency),
                    'total',
                  ],
                ]}
              />
            )}
            <div className="booth-invoice-field-grid">
              <Control label="Amount to refund">
                {(cid) => (
                  <div className="booth-invoice-amount">
                    <MinorPriceInput
                      id={cid}
                      valueMinor={amount}
                      currency={i.currency}
                      aria-describedby={tooMuch ? `${id}-limit` : undefined}
                      onMinorChange={(v) => {
                        setAmount(v);
                        change();
                      }}
                    />
                    {payment && amount !== payment.refundable && (
                      <FarmstandButton
                        variant="tertiary"
                        size="compact"
                        onClick={() => {
                          setAmount(payment.refundable);
                          change();
                        }}
                      >
                        Refund all
                      </FarmstandButton>
                    )}
                  </div>
                )}
              </Control>
              {payment && !stripe && (
                <Entry
                  label="Date the money was returned"
                  type="datetime-local"
                  value={returnedAt}
                  required
                  onChange={(v) => {
                    setReturnedAt(v);
                    change();
                  }}
                />
              )}
            </div>
            {tooMuch && (
              <p id={`${id}-limit`} className="booth-invoice-field-error">
                This payment has {moneyLabel(payment!.refundable, i.currency)}{' '}
                left to refund.
              </p>
            )}
            <Entry
              label="Reason"
              value={reason}
              maxLength={2000}
              required
              onChange={(v) => {
                setReason(v);
                change();
              }}
            />
            {payment && !stripe && (
              <Alert severity="info">
                Give the money back first (for example, cash or a check).
                Recording this refund documents that you returned it; it does
                not move money.
              </Alert>
            )}
            {problem > 0 && (
              <div key={problem} className="booth-invoice-shake">
                <Alert severity="error">
                  The refund could not be calculated. Check the details and try
                  again.
                </Alert>
              </div>
            )}
          </ActionForm>
        ) : (
          preview && (
            <ActionForm
              title="Review and confirm"
              intro={`Refunding ${paymentMethodLabel(payment?.method ?? '').toLowerCase()} payment ${paymentId} to ${i.recipientSnapshot.businessName}.`}
              busy={busy}
              backLabel="Edit refund"
              onBack={() => {
                onStep();
                setStep(0);
                setConfirmed(false);
              }}
              submitLabel={`Confirm ${moneyLabel(preview.shares.gross, i.currency)} refund`}
              disabled={!confirmed}
              onSubmit={() =>
                void submit(
                  {
                    action: 'REFUND_PAYMENT',
                    id: i.id,
                    expectedRevision: i.revision,
                    data,
                  },
                  {
                    title: 'Refund recorded',
                    message: `${moneyLabel(preview.shares.gross, i.currency)} returned to ${i.recipientSnapshot.businessName} by ${paymentMethodLabel(payment?.method ?? '').toLowerCase()}.`,
                  },
                  'Refund not recorded',
                )
              }
            >
              <MoneyRows
                title="Refund"
                label="Refund calculated by the server"
                rows={[
                  [
                    'Invoice amount',
                    moneyLabel(preview.shares.principal, i.currency),
                  ],
                  preview.shares.platform > 0 && [
                    'Online payment fee',
                    moneyLabel(preview.shares.platform, i.currency),
                    'muted',
                  ],
                  preview.shares.recovery > 0 && [
                    'Processing recovery',
                    moneyLabel(preview.shares.recovery, i.currency),
                    'muted',
                  ],
                  preview.shares.feeTax > 0 && [
                    'Fee tax',
                    moneyLabel(preview.shares.feeTax, i.currency),
                    'muted',
                  ],
                  [
                    'Vendor receives',
                    moneyLabel(preview.shares.gross, i.currency),
                    'total',
                  ],
                ]}
              />
              {preview.shares.platform > 0 && (
                <p className="markets-muted">
                  The platform fee is returned to the market separately and is
                  counted once in the vendor total.
                </p>
              )}
              <MoneyRows
                title="Invoice after this refund"
                label="Invoice after the refund"
                rows={[
                  [
                    'Paid',
                    moneyLabel(
                      i.paidMinor - preview.shares.principal,
                      i.currency,
                    ),
                  ],
                  [
                    'Outstanding',
                    pending
                      ? moneyLabel(0, i.currency)
                      : moneyLabel(
                          outstanding(i) + preview.shares.principal,
                          i.currency,
                        ),
                    'total',
                  ],
                ]}
              />
              <Check
                animated
                label={
                  stripe
                    ? 'I authorize this refund'
                    : 'I confirm the money was returned using the original payment method'
                }
                checked={confirmed}
                onChange={setConfirmed}
              />
            </ActionForm>
          )
        )}
      </div>
    </div>
  );
}
