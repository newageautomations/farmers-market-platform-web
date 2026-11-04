import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatMoney, parsePrice } from '@market/config';
import {
  PosInputError,
  safeError,
  type InPersonApi,
  type PosDraft,
  type PosPaymentInput,
  type PosPaymentMethods,
  type PosRefundInput,
  type PosSale,
  type NativeHandoff,
  nativePaymentLabel,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Field,
  Input,
  SelectField,
  Spinner,
  Textarea,
  buttonClassName,
} from '@market/ui';
import { RouteLink } from './common';
import './pos.css';

export function parseCash(value: string, currency = 'USD'): number | null {
  if (value.length > 11) return null;
  try {
    return parsePrice(value, currency);
  } catch {
    return null;
  }
}
export function cashInput(amount: number, currency = 'USD') {
  const digits =
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const padded = String(amount).padStart(digits + 1, '0');
  return digits
    ? `${padded.slice(0, -digits)}.${padded.slice(-digits)}`
    : padded;
}
const errorText = (error: unknown) =>
  error instanceof PosInputError ? error.message : safeError(error).message;
export const unresolvedPayment = (sale: PosSale) =>
  !['COMPLETED', 'DECLINED', 'CANCELLED', 'FAILED'].includes(sale.state);

/** Preserve the receipt's provider and test-evidence wording in each order layout. */
export function posPaymentDescription(sale: PosSale) {
  return sale.native
    ? `${nativePaymentLabel(sale.native.method)}${sale.evidenceType === 'NATIVE_CONTROLLED_TEST' ? ' - Controlled adapter test only' : ' - Sandbox'}`
    : sale.evidenceType === 'SQUARE_SDK_FIXTURE'
      ? 'Square SDK fixture only'
      : sale.method === 'CASH'
        ? 'Cash, confirmed by cashier'
        : sale.method === 'CLOVER' || sale.method === 'CLOVER_GO'
          ? sale.evidenceType === 'CLOVER_CONTROLLED_TEST'
            ? 'Clover controlled test only'
            : 'Clover Sandbox'
          : sale.method.startsWith('SQUARE')
            ? `Square Terminal${sale.square?.environment === 'Sandbox' ? ' - Sandbox' : ''}`
            : 'Simulated Terminal - Test Only';
}

export function PosSaleDetails({ sale }: { sale: PosSale }) {
  const money = (n: number) => formatMoney(n, sale.currency as 'USD');
  return (
    <div className="pos-payment-sections">
      <div>
        <Badge tone={sale.state === 'COMPLETED' ? 'success' : 'warning'}>
          {sale.state === 'COMPLETED'
            ? 'Sale completed'
            : sale.state === 'PAID'
              ? 'Paid, completing order'
              : sale.state.replaceAll('_', ' ')}
        </Badge>
        <p>
          Order {sale.orderCode} · {sale.vendor}
        </p>
        <p>{new Date(sale.completedAt ?? sale.confirmedAt).toLocaleString()}</p>
        <p>
          {sale.customer} · {sale.context.label}
        </p>
        <p>{posPaymentDescription(sale)}</p>
        {sale.square && (
          <p>
            Square location {sale.square.locationId} · Payment{' '}
            {sale.square.paymentId ?? 'Awaiting verification'}
          </p>
        )}
        {sale.native && (
          <p>
            Merchant {sale.native.merchantId} · Payment{' '}
            {sale.native.paymentId ?? 'Awaiting independent verification'} ·
            Reference {sale.native.reference}
          </p>
        )}
        {sale.clover && (
          <p>
            Clover merchant {sale.clover.merchantId} · Device{' '}
            {sale.clover.deviceLabel} · Payment{' '}
            {sale.clover.paymentId ?? 'Awaiting verification'} · Reference{' '}
            {sale.clover.externalPaymentId}
          </p>
        )}
        {sale.cashierId && <p>Cashier reference {sale.cashierId}</p>}
        {sale.financialStatus && sale.financialStatus !== 'PAID' && (
          <Badge tone="info">
            {sale.financialStatus === 'REFUNDED'
              ? 'Refunded'
              : 'Partially refunded'}
          </Badge>
        )}
      </div>
      <ul className="pos-receipt-items" aria-label="Purchased products">
        {sale.items.map((l) => (
          <li key={l.id}>
            <span>
              {l.quantity} × {l.name}
            </span>
            <span>
              {money(
                l.merchandiseAmount ??
                  (l.lineTax == null
                    ? l.unitPrice * l.quantity
                    : l.lineTotal - l.lineTax + (l.lineDiscount ?? 0)),
              )}
            </span>
          </li>
        ))}
      </ul>
      <dl className="pos-totals">
        <div>
          <dt>Merchandise before discounts</dt>
          <dd>{money(sale.subtotal)}</dd>
        </div>
        {sale.discount > 0 && (
          <div>
            <dt>Discounts</dt>
            <dd>{money(-sale.discount)}</dd>
          </div>
        )}
        <div>
          <dt>Merchandise subtotal</dt>
          <dd>{money(sale.subtotal - sale.discount)}</dd>
        </div>
        <div>
          <dt>Sales tax collected</dt>
          <dd>{money(sale.tax)}</dd>
        </div>
        <div className="pos-total">
          <dt>Total paid</dt>
          <dd>{money(sale.amount)}</dd>
        </div>
        {sale.tendered != null && (
          <div>
            <dt>Cash received</dt>
            <dd>{money(sale.tendered)}</dd>
          </div>
        )}
        {sale.changeDue != null && (
          <div>
            <dt>Change due</dt>
            <dd>{money(sale.changeDue)}</dd>
          </div>
        )}
      </dl>
      {sale.refunds.length > 0 && (
        <ul aria-label="Refund history">
          {sale.refunds.map((r) => (
            <li key={r.id}>
              {money(r.amount)} · {r.state.replaceAll('_', ' ')} · {r.reason} ·{' '}
              {new Date(r.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PosPaymentDialog({
  api,
  draft,
  methods,
  sale,
  onSale,
  onClose,
  onNewSale,
}: {
  api: InPersonApi;
  draft: PosDraft | null;
  methods: PosPaymentMethods;
  sale: PosSale | null;
  onSale: (sale: PosSale) => void;
  onClose: () => void;
  onNewSale: () => void;
}) {
  const [method, setMethod] = useState<PosPaymentInput['method']>('CASH'),
    [deviceId, setDeviceId] = useState(
      methods.square?.devices.find((d) => d.isDefault)?.id ??
        methods.square?.devices[0]?.id ??
        '',
    ),
    [tender, setTender] = useState(''),
    [cloverDeviceId, setCloverDeviceId] = useState(
      methods.clover?.devices.find((d) => d.isDefault)?.id ??
        methods.clover?.devices[0]?.id ??
        '',
    ),
    [scenario, setScenario] = useState('SUCCESS'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [interrupted, setInterrupted] = useState(false);
  const [handoffOpened, setHandoffOpened] = useState(false);
  const [nativeHandoff, setNativeHandoff] = useState<NativeHandoff | null>(
    null,
  );
  const nativeSelected = method === 'SQUARE_MOBILE' || method === 'CLOVER_GO';
  const nativeCapability = methods.native?.find((c) => c.method === method);
  const mobilePlatform = /Android/i.test(navigator.userAgent)
    ? 'android'
    : /iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? 'ios'
      : null;
  const lock = useRef(false),
    request = useRef<PosPaymentInput | null>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const amount = draft?.total ?? sale?.amount ?? 0,
    currency = draft?.currency ?? sale?.currency ?? 'USD';
  const money = (n: number) => formatMoney(n, currency as 'USD'),
    parsed = parseCash(tender, currency),
    enough = parsed != null && parsed >= amount,
    pending = !!sale && unresolvedPayment(sale);
  async function submit() {
    if (lock.current || !draft?.quote) return;
    if (method === 'SQUARE_MOBILE' || method === 'CLOVER_GO') {
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        setNativeHandoff(
          await api.nativeHandoff({
            draftId: draft.id,
            version: draft.version,
            quoteId: draft.quote.id,
            method,
          }),
        );
      } catch (error) {
        setError(errorText(error));
      } finally {
        lock.current = false;
        setBusy(false);
      }
      return;
    }
    request.current ??= {
      draftId: draft.id,
      version: draft.version,
      quoteId: draft.quote.id,
      key: crypto.randomUUID(),
      method,
      ...(method === 'CASH'
        ? { tendered: parsed!, confirmCashReceived: true }
        : method === 'SIMULATED'
          ? { scenario }
          : method === 'SQUARE_POS_APP'
            ? { platform: mobilePlatform! }
            : { deviceId: method === 'CLOVER' ? cloverDeviceId : deviceId }),
    };
    await run(() => api.pay(request.current!));
  }
  async function run(work: () => Promise<PosSale>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await work();
      if (alive.current) {
        onSale(result);
        setInterrupted(false);
      }
    } catch (error) {
      if (alive.current) {
        setError(errorText(error));
        if (error instanceof PosInputError) {
          const existing = draft
            ? await api.payment(draft.id).catch(() => undefined)
            : null;
          if (existing) {
            onSale(existing);
            setInterrupted(false);
          } else if (existing === null) {
            request.current = null;
            setInterrupted(false);
          } else setInterrupted(true);
        } else setInterrupted(true);
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function check() {
    if (sale) return run(() => api.reconcile(sale.id));
    if (draft)
      await run(async () => {
        const existing = await api.payment(draft.id);
        return existing
          ? api.reconcile(existing.id)
          : api.pay(request.current!);
      });
  }
  const finished = !!sale && !pending;
  const actions = (dismiss: () => void) => (
    <div className="ui-actions ui-modal-actions">
      <>
        {finished ? (
          <>
            <Button onClick={onNewSale}>New Sale</Button>
            {sale.state === 'COMPLETED' && (
              <RouteLink
                to={`/vendor/orders/${encodeURIComponent(sale.orderId)}`}
              >
                View Order
              </RouteLink>
            )}
          </>
        ) : pending || interrupted ? (
          <Button disabled={busy} onClick={() => void check()}>
            {sale?.state === 'PAID'
              ? 'Retry order completion'
              : 'Check Payment Status'}
          </Button>
        ) : (
          <Button
            disabled={
              busy ||
              !draft?.quote ||
              (method === 'CASH' && !enough) ||
              (method === 'SQUARE_TERMINAL' && !deviceId) ||
              (method === 'CLOVER' && !cloverDeviceId) ||
              (nativeSelected && !nativeCapability?.available) ||
              (method === 'SQUARE_POS_APP' && !mobilePlatform)
            }
            onClick={() => void submit()}
          >
            {nativeSelected
              ? 'Prepare companion checkout'
              : method === 'CASH'
                ? 'Confirm Cash Received'
                : method === 'CLOVER'
                  ? 'Send to Clover'
                  : method === 'SQUARE_TERMINAL'
                    ? 'Send to Square Terminal'
                    : method === 'SQUARE_POS_APP'
                      ? 'Prepare Square POS app'
                      : 'Start simulated payment'}
          </Button>
        )}
      </>
      {pending && sale?.method === 'CLOVER' && (
        <>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void run(() => api.clover.cancel(sale.id))}
          >
            Request Clover cancellation
          </Button>
          {sale.evidenceType === 'CLOVER_CONTROLLED_TEST' && (
            <>
              <Button
                disabled={busy}
                onClick={() =>
                  void run(() => api.clover.control(sale.id, 'SUCCESS'))
                }
              >
                Approve controlled Clover payment
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(() => api.clover.control(sale.id, 'FAIL'))
                }
              >
                Decline controlled Clover payment
              </Button>
            </>
          )}
        </>
      )}
      {pending && sale?.method === 'SQUARE_TERMINAL' && (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void run(() => api.cancelSquare(sale.id))}
        >
          Request terminal cancellation
        </Button>
      )}
      {pending &&
        sale?.method === 'SQUARE_POS_APP' &&
        sale.handoffUrl &&
        !handoffOpened && (
          <a
            className={buttonClassName({})}
            href={sale.handoffUrl}
            onClick={() => setHandoffOpened(true)}
          >
            Open Square POS App
          </a>
        )}
      {!sale && !interrupted && (
        <Button variant="secondary" disabled={busy} onClick={dismiss}>
          Return to cart
        </Button>
      )}
    </div>
  );
  return (
    <Dialog
      open
      onClose={onClose}
      title={
        sale?.state === 'COMPLETED' ? 'Sale completed' : 'Complete payment'
      }
      busy={busy}
      beforeClose={() => !pending && !interrupted}
      className="pos-payment-dialog"
    >
      {(dismiss) => (
        <>
          <div className="pos-payment-sections">
            {error && <Alert severity="error">{error}</Alert>}
            {busy && (
              <div role="status">
                <Spinner
                  label={
                    sale?.state === 'PAID'
                      ? 'Completing the paid order'
                      : 'Processing payment'
                  }
                />
                <p>Keep this sale open while its payment is checked.</p>
              </div>
            )}
            {pending || interrupted ? (
              <Alert severity="warning">
                {sale?.state === 'PAID'
                  ? 'Payment is confirmed. Order completion needs another check.'
                  : 'The payment result is unresolved. Check this payment before collecting money again.'}
              </Alert>
            ) : null}
            {sale ? (
              sale.state === 'COMPLETED' ? (
                <PosSaleDetails sale={sale} />
              ) : (
                <>
                  <p>
                    Order {sale.orderCode} · {money(sale.amount)}
                  </p>
                  {!pending && (
                    <Alert
                      severity={sale.state === 'DECLINED' ? 'error' : 'info'}
                    >
                      {sale.state === 'DECLINED'
                        ? 'Payment declined. No sale was completed.'
                        : sale.state === 'CANCELLED'
                          ? 'Payment cancelled. No sale was completed.'
                          : 'Payment failed. No sale was completed.'}
                    </Alert>
                  )}
                </>
              )
            ) : (
              <>
                <div>
                  <p className="pos-payment-amount">
                    Total due: {money(amount)}
                  </p>
                  <p>{draft?.customer}</p>
                  <p>{draft?.context.label}</p>
                </div>
                <SelectField
                  id="pos-payment-method"
                  label="Payment method"
                  value={method}
                  disabled={busy || interrupted}
                  onChange={(e) => {
                    setMethod(e.target.value as typeof method);
                    setNativeHandoff(null);
                  }}
                >
                  <option value="CASH">Cash</option>
                  {methods.native?.map((c) => (
                    <option key={c.method} value={c.method}>
                      {nativePaymentLabel(c.method)}
                      {!c.available
                        ? ' (setup required)'
                        : ' (companion app required)'}
                    </option>
                  ))}
                  {!!methods.clover?.devices.length && (
                    <option value="CLOVER">
                      {methods.clover.qualification === 'CONTROLLED_TEST'
                        ? 'Clover - Controlled Test'
                        : 'Clover - Sandbox'}
                    </option>
                  )}
                  {methods.simulated && (
                    <option value="SIMULATED">
                      Simulated Terminal - Test Only
                    </option>
                  )}
                  {!!methods.square?.devices.length && (
                    <option value="SQUARE_TERMINAL">
                      Square Terminal
                      {methods.square.environment === 'Sandbox'
                        ? ' - Sandbox'
                        : ''}
                    </option>
                  )}
                  {methods.square?.mobile && (
                    <option value="SQUARE_POS_APP" disabled={!mobilePlatform}>
                      Square POS App
                      {!mobilePlatform ? ' (supported phone required)' : ''}
                    </option>
                  )}
                </SelectField>
                {nativeSelected ? (
                  <>
                    <Alert
                      severity={
                        nativeCapability?.available ? 'info' : 'warning'
                      }
                    >
                      {nativeCapability?.reason ??
                        'Requires the native companion app'}
                      . Browser checkout cannot pair or operate mobile readers.
                    </Alert>
                    {nativeCapability?.merchant && (
                      <p>
                        {nativeCapability.merchant.merchantName} ·{' '}
                        {nativeCapability.merchant.environment}
                      </p>
                    )}
                    {nativeCapability?.qualification === 'CONTROLLED_TEST' && (
                      <Alert severity="warning">
                        Controlled adapter fixture only. This does not execute
                        the native SDK or charge a card.
                      </Alert>
                    )}
                    {nativeHandoff && (
                      <div className="pos-payment-sections">
                        <p>
                          Open the installed companion and sign in to this
                          vendor workspace. This handoff expires at{' '}
                          {new Date(
                            nativeHandoff.expiresAt,
                          ).toLocaleTimeString()}
                          . If the app is unavailable, install a local native
                          development build before continuing.
                        </p>
                        <a
                          className={buttonClassName({})}
                          href={nativeHandoff.url}
                        >
                          Open payment companion
                        </a>
                        <p>Handoff reference: {nativeHandoff.id}</p>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const current = await api.payment(draft!.id);
                              if (!current)
                                throw new PosInputError(
                                  'The companion has not prepared a payment yet',
                                );
                              return current;
                            })
                          }
                        >
                          Check companion payment
                        </Button>
                      </div>
                    )}
                  </>
                ) : method === 'CASH' ? (
                  <>
                    <div className="pos-payment-sections">
                      <Field
                        id="pos-cash-tender"
                        label={`Cash received (${currency})`}
                      >
                        <Input
                          id="pos-cash-tender"
                          inputMode="decimal"
                          autoComplete="off"
                          value={tender}
                          disabled={busy || interrupted}
                          maxLength={11}
                          aria-describedby="pos-cash-feedback"
                          onChange={(e) => setTender(e.target.value)}
                        />
                      </Field>
                      <div className="ui-actions">
                        <Button
                          variant="secondary"
                          disabled={busy || interrupted}
                          onClick={() => setTender(cashInput(amount, currency))}
                        >
                          Exact Amount
                        </Button>
                      </div>
                      <p
                        id="pos-cash-feedback"
                        className="pos-payment-amount"
                        aria-live="polite"
                      >
                        {parsed == null
                          ? 'Enter a valid cash amount'
                          : enough
                            ? `Change due: ${money(parsed - amount)}`
                            : `Remaining due: ${money(amount - parsed)}`}
                      </p>
                    </div>
                    <p>
                      Confirm only after you have received the cash. This
                      records your cash receipt attestation.
                    </p>
                  </>
                ) : method === 'CLOVER' ? (
                  <>
                    <Alert
                      severity={
                        methods.clover?.qualification === 'CONTROLLED_TEST'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {methods.clover?.qualification === 'CONTROLLED_TEST'
                        ? 'Controlled Clover adapter test. No card is charged and no Clover API is contacted.'
                        : 'Clover Sandbox requires an eligible terminal running Cloud Pay Display. Payment remains pending until the backend verifies the original transaction.'}
                    </Alert>
                    <p>{methods.clover?.merchant}</p>
                    <SelectField
                      id="pos-clover-device"
                      label="Clover device"
                      value={cloverDeviceId}
                      disabled={busy || interrupted}
                      onChange={(e) => setCloverDeviceId(e.target.value)}
                    >
                      <option value="">Choose a device</option>
                      {methods.clover?.devices.map((d) => (
                        <option
                          key={d.id}
                          value={d.id}
                          disabled={d.status === 'BUSY'}
                        >
                          {d.label} (
                          {d.status === 'UNVERIFIED'
                            ? 'availability unverified'
                            : d.status.toLowerCase()}
                          )
                        </option>
                      ))}
                    </SelectField>
                  </>
                ) : method === 'SQUARE_POS_APP' ? (
                  <Alert severity="info">
                    Open the installed Square POS app on your phone to collect
                    the exact card payment. Returning to this page does not
                    confirm payment; the server verifies the original
                    transaction. Do not restart an unresolved payment.
                  </Alert>
                ) : method === 'SQUARE_TERMINAL' ? (
                  <>
                    <p>
                      {methods.square?.merchant} · {methods.square?.location}
                    </p>
                    {methods.square?.environment === 'Sandbox' && (
                      <Alert severity="info">
                        Square Sandbox payment using a virtual terminal. No
                        physical device is paired. Keep the total at $25 or
                        less.
                      </Alert>
                    )}
                    {methods.square?.qualification === 'FIXTURE' && (
                      <Alert severity="warning">
                        Controlled SDK fixture only. No Square account is
                        authorized and no Square API is contacted.
                      </Alert>
                    )}
                    <SelectField
                      id="pos-square-device"
                      label="Square terminal"
                      value={deviceId}
                      disabled={busy || interrupted}
                      onChange={(e) => setDeviceId(e.target.value)}
                    >
                      <option value="">Choose a terminal</option>
                      {methods.square?.devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                          {d.kind === 'VIRTUAL' ? ' (Sandbox virtual)' : ''}
                        </option>
                      ))}
                    </SelectField>
                  </>
                ) : (
                  <>
                    <Alert severity="warning">
                      Test only. No card is charged or external processor
                      contacted.
                    </Alert>
                    <SelectField
                      id="pos-test-outcome"
                      label="Simulated terminal outcome"
                      value={scenario}
                      disabled={busy || interrupted}
                      onChange={(e) => setScenario(e.target.value)}
                    >
                      {methods.scenarios.map((value) => (
                        <option key={value} value={value}>
                          {value.replaceAll('_', ' ').toLowerCase()}
                        </option>
                      ))}
                    </SelectField>
                  </>
                )}
              </>
            )}
          </div>
          {actions(dismiss)}
        </>
      )}
    </Dialog>
  );
}

export function PosOrderPayment({
  api,
  orderId,
  canRefund,
  renderRecord,
  actionClassName,
}: {
  api: InPersonApi;
  orderId: string;
  canRefund: boolean;
  renderRecord?: (sale: PosSale | null, controls: ReactNode) => ReactNode;
  actionClassName?: string;
}) {
  const [sale, setSale] = useState<PosSale | null>(null),
    [error, setError] = useState(''),
    [open, setOpen] = useState(false),
    [detailsOpen, setDetailsOpen] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .orderPayment(orderId)
      .then((s) => {
        if (active) setSale(s);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [api, orderId]);
  if (error && !sale) {
    const failure = (
      <Alert severity="error">
        <p>{error}</p>
        <div className="ui-actions">
          <Button
            variant="secondary"
            className={actionClassName}
            onClick={() => {
              setError('');
              api
                .orderPayment(orderId)
                .then(setSale)
                .catch((e) => setError(errorText(e)));
            }}
          >
            Reload payment details
          </Button>
        </div>
      </Alert>
    );
    return renderRecord ? renderRecord(null, failure) : failure;
  }
  if (!sale)
    return renderRecord
      ? renderRecord(null, <Spinner label="Loading payment details" />)
      : null;
  const controls = (
    <>
      {error && <Alert severity="error">{error}</Alert>}
      <div className="ui-actions">
        {canRefund &&
          sale.canRecordRefund === true &&
          sale.units.some((u) => !u.reserved && u.amount > 0) &&
          sale.refunds
            .filter((r) => r.state === 'SETTLED')
            .reduce((n, r) => n + r.amount, 0) < sale.amount && (
            <Button
              variant="secondary"
              className={actionClassName}
              onClick={() => setOpen(true)}
            >
              Record Refund
            </Button>
          )}
        {sale.refunds.length > 0 && (
          <Button
            variant="secondary"
            className={actionClassName}
            onClick={() => setDetailsOpen(true)}
          >
            Refund Details
          </Button>
        )}
      </div>
      {canRefund &&
        sale.refunds
          .filter((r) =>
            [
              'PROVIDER_PENDING',
              'PROVIDER_SUCCEEDED',
              'PROVIDER_FAILED',
            ].includes(r.state),
          )
          .map((r) => (
            <div className="ui-actions" key={r.id}>
              <Button
                disabled={busy}
                variant="secondary"
                className={actionClassName}
                onClick={() => {
                  setBusy(true);
                  setError('');
                  api
                    .retryRefund(sale.id, r.id)
                    .then(setSale)
                    .catch((e) => setError(errorText(e)))
                    .finally(() => setBusy(false));
                }}
              >
                {r.state === 'PROVIDER_FAILED'
                  ? 'Retry original refund'
                  : 'Check refund status'}
              </Button>
            </div>
          ))}
      {open && (
        <PosRefundDialog
          api={api}
          sale={sale}
          onClose={() => setOpen(false)}
          onSale={(value) => {
            setSale(value);
            setOpen(false);
          }}
        />
      )}
      {detailsOpen && (
        <PosRefundDetails sale={sale} onClose={() => setDetailsOpen(false)} />
      )}
    </>
  );
  return renderRecord ? (
    renderRecord(sale, controls)
  ) : (
    <Card className="pos-payment-record" aria-label="In-person payment">
      <PosSaleDetails sale={sale} />
      {controls}
    </Card>
  );
}

function refundStatus(state: string) {
  if (state === 'SETTLED') return 'Completed';
  if (['PROVIDER_FAILED', 'FAILED'].includes(state)) return 'Failed';
  if (['CANCELED', 'CANCELLED'].includes(state)) return 'Canceled';
  if (state === 'RECONCILIATION_REQUIRED') return 'Needs review';
  if (['REQUESTED', 'PROVIDER_PENDING', 'PROVIDER_SUCCEEDED'].includes(state))
    return 'Pending';
  return 'Status unavailable';
}

/** Order-owned detail composition. Shared Dialog retains focus and nested dismissal behavior. */
export function PosRefundDetails({
  sale,
  onClose,
}: {
  sale: PosSale;
  onClose: () => void;
}) {
  const money = (value: number) => formatMoney(value, sale.currency as 'USD');
  const refunds = [...sale.refunds].sort(
    (a, b) =>
      Date.parse(a.details?.completedAt ?? a.createdAt) -
      Date.parse(b.details?.completedAt ?? b.createdAt),
  );
  const refunded = refunds
    .filter((r) => r.state === 'SETTLED')
    .reduce((n, r) => n + r.amount, 0);
  const remaining = sale.amount - refunded;
  const status =
    remaining < 0
      ? 'Amounts need review'
      : refunded === sale.amount && sale.amount > 0
        ? 'Fully refunded'
        : refunded > 0
          ? 'Partially refunded'
          : 'No completed refunds';
  return (
    <Dialog
      open
      title="Refund Details"
      onClose={onClose}
      className="pos-payment-dialog"
    >
      <div className="pos-payment-sections">
        <p>Order {sale.orderCode}</p>
        <dl className="pos-totals" aria-label="Original purchase">
          <div>
            <dt>Original merchandise</dt>
            <dd>{money(sale.subtotal - sale.discount)}</dd>
          </div>
          {sale.discount > 0 && (
            <div>
              <dt>Original discounts</dt>
              <dd>{money(sale.discount)}</dd>
            </div>
          )}
          <div>
            <dt>Original sales tax</dt>
            <dd>{money(sale.tax)}</dd>
          </div>
          <div>
            <dt>Total paid</dt>
            <dd>{money(sale.amount)}</dd>
          </div>
        </dl>
        {refunds.map((r, index) => {
          const completed = r.state === 'SETTLED',
            details = completed ? r.details : null;
          const date = new Date(details?.completedAt ?? r.createdAt);
          return (
            <div key={r.id} role="group" aria-label={`Refund ${index + 1}`}>
              <p>
                {refundStatus(r.state)} ·{' '}
                {Number.isFinite(date.getTime()) ? (
                  <time dateTime={date.toISOString()}>
                    {date.toLocaleString(undefined, {
                      timeZone: sale.timezone,
                    })}
                  </time>
                ) : (
                  'Date unavailable'
                )}
              </p>
              {details ? (
                <>
                  <ul
                    className="pos-receipt-items"
                    aria-label="Refunded products"
                  >
                    {details.products.map((product, i) => (
                      <li key={i}>
                        <span>
                          {product.name} × {product.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <dl className="pos-totals">
                    <div>
                      <dt>Merchandise refunded</dt>
                      <dd>{money(details.merchandise)}</dd>
                    </div>
                    {details.discount > 0 && (
                      <div>
                        <dt>Original discounts on returned items</dt>
                        <dd>{money(details.discount)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Tax refunded</dt>
                      <dd>{money(details.tax)}</dd>
                    </div>
                    {details.shipping > 0 && (
                      <div>
                        <dt>Shipping refunded</dt>
                        <dd>{money(details.shipping)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Total refunded</dt>
                      <dd>{money(r.amount)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <>
                  <p>
                    {completed ? 'Total refunded' : 'Requested refund amount'}:{' '}
                    {money(r.amount)}
                  </p>
                  {completed && (
                    <p>
                      Item and tax breakdown is unavailable for this recorded
                      refund.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
        <dl className="pos-totals" aria-label="Refund summary">
          <div>
            <dt>Total completed refunds</dt>
            <dd>{money(refunded)}</dd>
          </div>
          {remaining >= 0 && (
            <div>
              <dt>Remaining payment amount</dt>
              <dd>{money(remaining)}</dd>
            </div>
          )}
          <div>
            <dt>Refund status</dt>
            <dd>{status}</dd>
          </div>
        </dl>
      </div>
    </Dialog>
  );
}
export function PosRefundDialog({
  api,
  sale,
  onClose,
  onSale,
}: {
  api: InPersonApi;
  sale: PosSale;
  onClose: () => void;
  onSale: (sale: PosSale) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [reason, setReason] = useState(''),
    [returned, setReturned] = useState(false),
    [scenario, setScenario] = useState('SUCCESS'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [interrupted, setInterrupted] = useState(false);
  const lock = useRef(false),
    request = useRef<PosRefundInput | null>(null);
  const amount = sale.units
      .filter((u) => selected.includes(u.id))
      .reduce((n, u) => n + u.amount, 0),
    money = (n: number) => formatMoney(n, sale.currency as 'USD');
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    request.current ??= {
      key: crypto.randomUUID(),
      unitIds: selected,
      reason: reason.trim(),
      ...(sale.method === 'CASH'
        ? { cashReturned: returned }
        : sale.method === 'SIMULATED'
          ? { scenario }
          : {}),
    };
    try {
      onSale(await api.refund(sale.id, request.current));
    } catch (error) {
      setError(errorText(error));
      if (error instanceof PosInputError) request.current = null;
      else setInterrupted(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title="Record refund"
      onClose={onClose}
      busy={busy}
      className="pos-payment-dialog"
      beforeClose={() => !interrupted}
      actions={
        <Button
          disabled={
            busy ||
            !selected.length ||
            !reason.trim() ||
            (sale.method === 'CASH' && !returned)
          }
          onClick={() => void submit()}
        >
          {interrupted
            ? 'Check original refund'
            : sale.method === 'CASH'
              ? 'Confirm Cash Returned'
              : sale.method === 'CLOVER' || sale.method === 'CLOVER_GO'
                ? 'Request Clover refund'
                : sale.method.startsWith('SQUARE')
                  ? 'Request Square refund'
                  : 'Refund simulated payment'}
        </Button>
      }
    >
      <div className="pos-payment-sections">
        {error && <Alert severity="error">{error}</Alert>}
        <p>
          Order {sale.orderCode}. Refund original purchased units. Returned
          merchandise is not automatically restocked.
        </p>
        <fieldset className="pos-refund-units" disabled={busy || interrupted}>
          <legend>Items to refund</legend>
          {sale.units
            .filter((u) => !u.reserved)
            .map((u, index) => (
              <label key={u.id}>
                <Checkbox
                  checked={selected.includes(u.id)}
                  onChange={(e) =>
                    setSelected((v) =>
                      e.target.checked
                        ? [...v, u.id]
                        : v.filter((id) => id !== u.id),
                    )
                  }
                />
                <span>
                  {sale.items.find((l) => l.id === u.lineId)?.name ?? 'Item'},
                  unit {index + 1} · {money(u.amount)}
                </span>
              </label>
            ))}
        </fieldset>
        <p className="pos-payment-amount">Refund amount: {money(amount)}</p>
        <Field label="Refund reason" id="pos-refund-reason">
          <Textarea
            id="pos-refund-reason"
            required
            maxLength={500}
            value={reason}
            disabled={busy || interrupted}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {sale.method === 'CASH' ? (
          <label className="pos-cash-return" htmlFor="pos-cash-returned">
            <Checkbox
              id="pos-cash-returned"
              checked={returned}
              disabled={busy || interrupted}
              onChange={(e) => setReturned(e.target.checked)}
            />
            <span>I have returned this cash to the customer.</span>
          </label>
        ) : sale.method === 'SIMULATED' ? (
          <SelectField
            id="pos-refund-outcome"
            label="Simulated refund outcome"
            disabled={busy || interrupted}
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option value="SUCCESS">Success</option>
            <option value="DUPLICATE_SUCCESS">Duplicate success event</option>
            <option value="REFUND_FAILURE">Refund failure</option>
          </SelectField>
        ) : (
          <Alert severity="info">
            {sale.method === 'CLOVER' || sale.method === 'CLOVER_GO'
              ? 'Clover'
              : 'Square'}{' '}
            may return an unresolved refund. Original units settle only after
            the provider confirms completion. Check the original refund before
            requesting another.
          </Alert>
        )}
      </div>
    </Dialog>
  );
}
