import type { CheckoutView, MarketCart, PublicCart } from '@market/api';
import { formatMoney } from '@market/config';

// Recognize historical descriptions without modifying stored financial records.
const isOnlinePaymentFee = (description: string) =>
  description === 'Preorder fee' || description === 'Online payment fee';

/**
 * The order summary's totals, the same on every market and vendor cart and
 * checkout: Subtotal, Tax (only when there is any), Preorder fee and Total
 * due. Discounts, pickup fees and the tax breakdown are not itemized for the
 * customer; the backend keeps that split.
 *
 * Subtotal is what remains of the total after tax and the preorder fee, so
 * the four rows always add up (discounts and pickup fees are inside it). The
 * preorder fee carries no tax, and it is only added to the order when payment
 * quotes it; until then its row says so instead of showing an amount.
 */
export function OrderTotals({
  total,
  tax,
  preorderFee,
  currency,
  className,
}: {
  total: number;
  tax: number;
  /** `null` until payment quotes the fee. */
  preorderFee: number | null;
  currency: string;
  className?: string;
}) {
  const subtotal = total - tax - (preorderFee ?? 0);
  return (
    <dl className={['order-totals', className].filter(Boolean).join(' ')}>
      <div>
        <dt>Subtotal</dt>
        <dd>{formatMoney(subtotal, currency)}</dd>
      </div>
      {tax !== 0 && (
        <div>
          <dt>Tax</dt>
          <dd>{formatMoney(tax, currency)}</dd>
        </div>
      )}
      <div>
        <dt>Preorder fee</dt>
        <dd>
          {preorderFee === null
            ? 'Calculated at payment'
            : formatMoney(preorderFee, currency)}
        </dd>
      </div>
      <div className="vendor-cart-total">
        <dt>Total due</dt>
        <dd data-cart-total>{formatMoney(total, currency)}</dd>
      </div>
    </dl>
  );
}

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

/** A vendor cart (the Shop API's active order). */
export function CartTotals({ cart }: { cart: PublicCart }) {
  const fees = cart.surcharges.filter((s) => isOnlinePaymentFee(s.description));
  return (
    <OrderTotals
      total={cart.totalWithTax}
      tax={sum(cart.taxSummary.map((t) => t.taxTotal))}
      preorderFee={fees.length ? sum(fees.map((s) => s.priceWithTax)) : null}
      currency={cart.currencyCode}
    />
  );
}

/** A market cart. Its fee is only known once payment quotes it. */
export function MarketCartTotals({ cart }: { cart: MarketCart }) {
  return (
    <OrderTotals
      total={cart.totalWithTax}
      tax={sum(cart.taxSummary.map((t) => t.taxTotal))}
      preorderFee={null}
      currency={cart.currencyCode}
    />
  );
}

/** A checkout. Once quoted, the fee is already part of the order total. */
export function CheckoutTotals({
  view,
  className,
}: {
  view: CheckoutView;
  className?: string;
}) {
  return (
    <OrderTotals
      total={view.total}
      tax={sum(view.taxes.map((t) => t.total))}
      preorderFee={view.preorderFee ? view.preorderFee.preorderFee : null}
      currency={view.currency}
      className={className}
    />
  );
}
