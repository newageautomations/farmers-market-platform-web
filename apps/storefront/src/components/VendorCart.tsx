import { useRef, useState } from 'react';
import { cartMessage, type PublicCart, type CartBootstrap } from '@market/api';
import { formatMoney } from '@market/config';
import { shopCall } from './shop-client';

export function VendorCart({
  storefrontId,
  initialCart,
}: {
  storefrontId: string;
  initialCart: PublicCart | null;
}) {
  const [cart, setCart] = useState(initialCart),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const lock = useRef(false);
  async function change(
    action: 'adjust' | 'remove',
    lineId: string,
    quantity?: number,
  ) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await shopCall<{ cart: PublicCart | null }>(
        storefrontId,
        action,
        { lineId, quantity },
      );
      setCart(result.cart);
      setMessage('Cart updated.');
    } catch (e) {
      setError(cartMessage(e as { kind?: string; code?: string }));
      // Re-read actual backend state even after rejection, including native partial results.
      try {
        setCart((await shopCall<CartBootstrap>(storefrontId, 'cart')).cart);
      } catch {
        setCart(null);
      }
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <div aria-busy={pending}>
      <p role="status" aria-live="polite">
        {pending ? 'Updating your cart…' : message}
      </p>
      {error && <p role="alert">{error}</p>}
      {!cart?.lines.length ? (
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Browse this Vendor’s products to get started.</p>
          <a className="button" href="/products">
            Browse products
          </a>
        </div>
      ) : (
        <>
          {cart.state !== 'AddingItems' && (
            <p role="status">
              This cart cannot be edited in its current state.
            </p>
          )}
          <ul className="cart-lines">
            {cart.lines.map((line) => (
              <li key={line.id} className="cart-line card">
                <div>
                  <h2>
                    <a
                      href={`/products/${encodeURIComponent(line.productVariant.product.slug)}`}
                    >
                      {line.productVariant.product.name}
                    </a>
                  </h2>
                  <p>{line.productVariant.name}</p>
                  <p>Quantity: {line.quantity}</p>
                  <p>
                    {formatMoney(
                      line.discountedLinePriceWithTax,
                      cart.currencyCode,
                    )}
                  </p>
                </div>
                <form
                  className="cart-controls"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    void change(
                      'adjust',
                      line.id,
                      Number(data.get('quantity')),
                    );
                  }}
                >
                  <div className="field">
                    <label htmlFor={`quantity-${line.id}`}>
                      Quantity for {line.productVariant.name}
                    </label>
                    <input
                      key={`${line.id}-${line.quantity}`}
                      id={`quantity-${line.id}`}
                      name="quantity"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="2147483647"
                      step="1"
                      required
                      defaultValue={line.quantity}
                      disabled={pending || cart.state !== 'AddingItems'}
                    />
                  </div>
                  <div className="actions">
                    <button
                      className="button"
                      disabled={pending || cart.state !== 'AddingItems'}
                    >
                      Update quantity
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      aria-label={`Remove ${line.productVariant.name}`}
                      disabled={pending || cart.state !== 'AddingItems'}
                      onClick={() => void change('remove', line.id)}
                    >
                      Remove
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
          <div className="cart-totals card">
            <h2>Cart summary</h2>
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
                  <dt>{t.description}</dt>
                  <dd>{formatMoney(t.taxTotal, cart.currencyCode)}</dd>
                </div>
              ))}
              <div>
                <dt>Shipping</dt>
                <dd>{formatMoney(cart.shippingWithTax, cart.currencyCode)}</dd>
              </div>
              <div>
                <dt>Total including tax</dt>
                <dd data-cart-total>
                  {formatMoney(cart.totalWithTax, cart.currencyCode)}
                </dd>
              </div>
            </dl>
            <a className="button" href="/checkout">
              Continue to checkout
            </a>
            <a href="/products">Continue browsing</a>
          </div>
        </>
      )}
    </div>
  );
}
