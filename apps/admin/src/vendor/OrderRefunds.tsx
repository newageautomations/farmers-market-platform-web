import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Dialog, Field, Select } from '@market/ui';
import { FarmstandButton as Button } from '@market/ui/farmstand';
import { formatMoney } from '@market/config';
import type {
  OrderRefundPreview,
  OrderRefundsApi,
  OrderRefundView,
} from '@market/api';
import { safeError } from '@market/api';

/** Order-specific composition. POS refund dialogs own cash/provider attestations which do not apply to preorders. */
export function OrderRefunds({
  api,
  orderId,
  names,
  onUpdated,
}: {
  api: OrderRefundsApi;
  orderId: string;
  names: Record<string, string>;
  onUpdated: () => void;
}) {
  const [view, setView] = useState<OrderRefundView | null>(null),
    [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({}),
    [preview, setPreview] = useState<OrderRefundPreview | null>(null);
  const [busy, setBusy] = useState(false),
    [interrupted, setInterrupted] = useState(false),
    [calculating, setCalculating] = useState(false);
  const lock = useRef(false),
    request = useRef<Parameters<OrderRefundsApi['request']>[0] | null>(null);
  const refresh = useCallback(async () => {
    const next = await api.read(orderId);
    setView(next);
    if (
      request.current &&
      next?.history.some(
        (r) => r.operationKey === request.current!.operationKey,
      )
    ) {
      request.current = null;
      setInterrupted(false);
      setOpen(false);
      setCounts({});
    }
    return next;
  }, [api, orderId]);
  useEffect(() => {
    let active = true;
    void api
      .read(orderId)
      .then((next) => {
        if (active) setView(next);
      })
      .catch((cause) => {
        if (active) setError(safeError(cause).message);
      });
    return () => {
      active = false;
    };
  }, [api, orderId]);
  useEffect(() => {
    if (!view?.blocked && !request.current) return;
    const timer = setInterval(() => {
      void refresh().catch(() =>
        setError(
          'Refund status could not be checked. Your original request is retained.',
        ),
      );
    }, 4000);
    return () => clearInterval(timer);
  }, [view?.blocked, interrupted, refresh]);
  const unitIds =
    view?.lines.flatMap((line) =>
      line.unitIds.slice(0, counts[line.lineId] ?? 0),
    ) ?? [];
  const selectedKey = unitIds.join(',');
  useEffect(() => {
    setPreview(null);
    if (!open || !view || !selectedKey || request.current) {
      setCalculating(false);
      return;
    }
    let active = true;
    setCalculating(true);
    const timer = setTimeout(() => {
      void api
        .preview(view.allocationId, selectedKey.split(','))
        .then((next) => {
          if (active) setPreview(next);
        })
        .catch((cause) => {
          if (active) setError(safeError(cause).message);
        })
        .finally(() => {
          if (active) setCalculating(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, open, view?.allocationId, selectedKey]);
  async function confirm() {
    if (lock.current || !view || (!preview && !request.current)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    request.current ??= {
      operationKey: crypto.randomUUID(),
      allocationId: view.allocationId,
      unitIds: preview!.unitIds,
      cancelUnfulfilled: false,
      platformChargeIds: [],
    };
    try {
      await api.request(request.current!);
      await refresh();
      request.current = null;
      setInterrupted(false);
      setOpen(false);
      setCounts({});
      setPreview(null);
      onUpdated();
    } catch (cause) {
      setInterrupted(true);
      setError(
        safeError(cause).message +
          ' Check the original refund before starting another request.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!view) return error ? <Alert severity="error">{error}</Alert> : null;
  const money = (amount: number) => formatMoney(amount, view.currency as 'USD');
  return (
    <div className="order-payment-controls">
      {error && !open && <Alert severity="error">{error}</Alert>}
      <Button
        type="button"
        variant="secondary"
        disabled={
          view.blocked || !view.lines.some((line) => line.unitIds.length)
        }
        onClick={() => setOpen(true)}
      >
        Refund items
      </Button>
      {view.blocked && (
        <p role="status">
          Refund activity is being reconciled or needs attention. Another refund
          is unavailable until it is resolved.
        </p>
      )}
      {view.providerReview && (
        <Alert severity="warning">
          Refund attention reference: {view.providerReview}
        </Alert>
      )}
      {view.history.length > 0 && (
        <ul className="order-refund-history" aria-label="Refund history">
          {view.history.map((refund) => (
            <li key={refund.id}>
              <Badge
                tone={
                  refund.financialState === 'COMPLETED' ? 'success' : 'warning'
                }
              >
                {refund.financialState === 'COMPLETED'
                  ? 'Refund confirmed'
                  : 'Refund requires verification'}
              </Badge>
              <strong>{money(refund.amount)}</strong>
              <span>
                Online payment fee:{' '}
                {money(refund.platform + refund.recovery + refund.feeTax)}
              </span>
              <span>
                Customer refund: {refund.customerState.toLowerCase()}. Platform
                fee return: {refund.applicationFeeState.toLowerCase()}.
              </span>
              {refund.reconciliationCode && (
                <span>Reference: {refund.reconciliationCode}</span>
              )}
              <time dateTime={refund.createdAt}>
                {new Date(refund.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={open}
        title="Refund original purchased items"
        busy={busy}
        beforeClose={() => !request.current}
        onClose={() => setOpen(false)}
        className="pos-payment-dialog"
        actions={
          <Button
            type="button"
            disabled={busy || calculating || (!preview && !request.current)}
            onClick={() => void confirm()}
          >
            {request.current ? 'Check original refund' : 'Confirm refund'}
          </Button>
        }
      >
        {error && <Alert severity="error">{error}</Alert>}
        <p>
          Select quantities from the original purchase. Refunding does not
          automatically return or restock merchandise.
        </p>
        {view.lines
          .filter((line) => line.unitIds.length)
          .map((line) => (
            <Field
              key={line.lineId}
              id={`refund-${line.lineId}`}
              label={names[line.lineId] ?? 'Purchased item'}
            >
              <Select
                id={`refund-${line.lineId}`}
                value={counts[line.lineId] ?? 0}
                disabled={busy || !!request.current}
                onChange={(event) => {
                  setPreview(null);
                  setError('');
                  setCounts((old) => ({
                    ...old,
                    [line.lineId]: Number(event.target.value),
                  }));
                }}
              >
                {Array.from({ length: line.unitIds.length + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        {calculating && (
          <p role="status">Calculating the original refund amount...</p>
        )}
        {preview && (
          <>
            <ul aria-label="Refund breakdown">
              <li>Item value: {money(preview.merchandise)}</li>
              <li>Taxes: {money(preview.tax)}</li>
              <li>Pickup/shipping: {money(preview.shipping)}</li>
              <li>Online payment fee: {money(preview.preorderFee)}</li>
              <li>Customer refund: {money(preview.total)}</li>
            </ul>
            <p>
              The platform returns {money(preview.platform)} of its original
              application fee to your Stripe account. The customer refund
              includes {money(preview.recovery)} of original processing
              recovery. Stripe may retain its actual processing fees.
            </p>
          </>
        )}
        <p>
          Provider confirmation and bank posting are separate. A pending refund
          will update here automatically.
        </p>
      </Dialog>
    </div>
  );
}
