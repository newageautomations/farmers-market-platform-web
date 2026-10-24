import type { PublicCart } from '@market/api';
import { formatMoney } from '@market/config';

/** Shared Vendure totals presentation for cart and checkout drafts. */
export function CartTotals({ cart }: { cart: PublicCart }) {
  return (
    <dl>
      <div>
        <dt>Subtotal including tax</dt>
        <dd>{formatMoney(cart.subTotalWithTax, cart.currencyCode)}</dd>
      </div>
      {cart.discounts.map((d, i) => (
        <div key={`discount-${i}`}>
          <dt>{d.description}</dt>
          <dd>{formatMoney(d.amountWithTax, cart.currencyCode)}</dd>
        </div>
      ))}
      {cart.surcharges.map((s, i) => (
        <div key={`surcharge-${i}`}>
          <dt>{s.description}</dt>
          <dd>{formatMoney(s.priceWithTax, cart.currencyCode)}</dd>
        </div>
      ))}
      {cart.taxSummary.map((t, i) => (
        <div key={`tax-${i}`}>
          <dt>{t.description} (included)</dt>
          <dd>{formatMoney(t.taxTotal, cart.currencyCode)}</dd>
        </div>
      ))}
      {cart.shippingWithTax !== 0 && (
        <div>
          <dt>Pickup fees</dt>
          <dd>{formatMoney(cart.shippingWithTax, cart.currencyCode)}</dd>
        </div>
      )}
      <div className="vendor-cart-total">
        <dt>Current total</dt>
        <dd data-cart-total>
          {formatMoney(cart.totalWithTax, cart.currencyCode)}
        </dd>
      </div>
    </dl>
  );
}
