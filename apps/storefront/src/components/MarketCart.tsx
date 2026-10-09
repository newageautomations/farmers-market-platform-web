import { useRef, useState } from 'react';
import {
  cartMessage,
  type MarketCart as Cart,
  type MarketBootstrap,
} from '@market/api';
import { formatMoney } from '@market/config';
import { occurrenceLabel } from '@market/storefront-core/market';
import { shopCall } from './shop-client';

export function MarketCart({
  storefrontId,
  marketName,
  initialCart,
}: {
  storefrontId: string;
  marketName: string;
  initialCart: Cart | null;
}) {
  const [cart, setCart] = useState(initialCart),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const lock = useRef(false);
  async function change(
    action: 'adjust' | 'remove' | 'apply-coupon' | 'remove-coupon',
    input: Record<string, unknown>,
  ) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await shopCall<{ cart: Cart | null }>(
        storefrontId,
        action,
        input,
      );
      setCart(result.cart);
      window.dispatchEvent(
        new CustomEvent('market-cart-updated', {
          detail: { storefrontId, quantity: result.cart?.totalQuantity ?? 0 },
        }),
      );
      setMessage('Cart updated.');
    } catch (e) {
      setError(cartMessage(e as { kind?: string; code?: string }));
      try {
        const refreshed = (
          await shopCall<MarketBootstrap>(storefrontId, 'cart')
        ).cart;
        setCart(refreshed);
        window.dispatchEvent(
          new CustomEvent('market-cart-updated', {
            detail: { storefrontId, quantity: refreshed?.totalQuantity ?? 0 },
          }),
        );
      } catch {
        setCart(null);
        window.dispatchEvent(
          new CustomEvent('market-cart-updated', {
            detail: { storefrontId, quantity: null },
          }),
        );
      }
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const editable = cart?.state === 'AddingItems';
  return (
    <div aria-busy={pending}>
      <h2>{marketName}</h2>
      {cart && (
        <p className="occurrence-summary" data-cart-occurrence>
          {occurrenceLabel(cart.occurrence)}
          <br />
          {cart.occurrence.venue}
        </p>
      )}
      <p role="status" aria-live="polite">
        {pending ? 'Updating your cart…' : message}
      </p>
      {error && <p role="alert">{error}</p>}
      {!cart?.totalQuantity ? (
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Choose an occurrence to browse its eligible offerings.</p>
          <a className="button" href="/#occurrences">
            Choose an occurrence
          </a>
        </div>
      ) : (
        <>
          {!editable && (
            <p role="status">
              This cart cannot be edited in its current state.
            </p>
          )}
          {cart.groups.map((group) => (
            <section
              className="vendor-cart-group"
              key={group.vendorId}
              aria-labelledby={`vendor-${group.vendorId}`}
              data-vendor-group={group.vendorId}
            >
              <h2 id={`vendor-${group.vendorId}`}>{group.vendorName}</h2>
              <ul className="cart-lines">
                {group.lines.map((line) => (
                  <li className="cart-line card" key={line.id}>
                    <div>
                      <h3>
                        <a
                          href={`/occurrences/${cart.occurrence.id}/products/${line.variantId}`}
                        >
                          {line.productName}
                        </a>
                      </h3>
                      <p>{line.name}</p>
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
                        void change('adjust', {
                          lineId: line.id,
                          quantity: Number(
                            new FormData(event.currentTarget).get('quantity'),
                          ),
                        });
                      }}
                    >
                      <div className="field">
                        <label htmlFor={`quantity-${line.id}`}>
                          Quantity for {line.name}
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
                          disabled={pending || !editable}
                        />
                      </div>
                      <div className="actions">
                        <button
                          className="button"
                          disabled={pending || !editable}
                        >
                          Update quantity
                        </button>
                        <button
                          className="button secondary"
                          type="button"
                          aria-label={`Remove ${line.name}`}
                          disabled={pending || !editable}
                          onClick={() =>
                            void change('remove', { lineId: line.id })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="cart-totals card">
            <h2>Cart summary</h2>
            <dl>
              <div>
                <dt>Subtotal including tax</dt>
                <dd>{formatMoney(cart.subTotalWithTax, cart.currencyCode)}</dd>
              </div>
              {cart.discounts.map((discount, i) => (
                <div key={`discount-${i}`}>
                  <dt>{discount.description}</dt>
                  <dd>
                    {formatMoney(discount.amountWithTax, cart.currencyCode)}
                  </dd>
                </div>
              ))}
              {cart.taxSummary.map((tax, i) => (
                <div key={`tax-${i}`}>
                  <dt>{tax.description}</dt>
                  <dd>{formatMoney(tax.taxTotal, cart.currencyCode)}</dd>
                </div>
              ))}
              <div>
                <dt>Total including tax</dt>
                <dd data-cart-total>
                  {formatMoney(cart.totalWithTax, cart.currencyCode)}
                </dd>
              </div>
            </dl>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void change('apply-coupon', {
                  code: new FormData(event.currentTarget).get('code'),
                });
              }}
            >
              <div className="field">
                <label htmlFor="vendor-coupon">Vendor coupon code</label>
                <input
                  id="vendor-coupon"
                  name="code"
                  required
                  maxLength={80}
                  disabled={pending || !editable}
                  autoComplete="off"
                />
              </div>
              <button
                className="button secondary"
                disabled={pending || !editable}
              >
                Apply coupon
              </button>
            </form>
            {!!cart.couponCodes.length && (
              <ul aria-label="Applied Vendor coupon codes">
                {cart.couponCodes.map((code) => (
                  <li key={code}>
                    {code}{' '}
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending || !editable}
                      aria-label={`Remove coupon ${code}`}
                      onClick={() => void change('remove-coupon', { code })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="cart-boundary">Adding items does not reserve them.</p>
            <a className="button" href="/checkout">
              Continue to checkout
            </a>
            <a href={`/occurrences/${cart.occurrence.id}`}>
              Continue browsing this occurrence
            </a>
          </div>
        </>
      )}
    </div>
  );
}
