import { HarvestCartLine } from './HarvestCartLine';
import { VendorPreorderBanner } from './VendorPreorderBanner';
import type { VendorPreorderState } from '../lib/vendor-preorder';
import { buttonClassName } from '@market/ui/presentation';
import { Card } from '@market/ui';
import { useRef, useState } from 'react';
import {
  cartMessage,
  type MarketCart as Cart,
  type MarketBootstrap,
} from '@market/api';
import { formatMoney } from '@market/config';
import { occurrenceLabel } from '@market/storefront-core/market';
import { shopCall } from './shop-client';
import CheckoutLoyalty from './CheckoutLoyalty';

export function MarketCart({
  storefrontId,
  marketName,
  initialCart,
  initialPreorder,
  concise = false,
}: {
  storefrontId: string;
  marketName: string;
  initialCart: Cart | null;
  initialPreorder?: VendorPreorderState;
  /** Omit general preordering guidance from the market banner. */
  concise?: boolean;
}) {
  const [cart, setCart] = useState(initialCart),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  async function refreshRewards() {
    const next = (await shopCall<MarketBootstrap>(storefrontId, 'cart')).cart;
    setCart(next);
    window.dispatchEvent(
      new CustomEvent('market-cart-updated', {
        detail: { storefrontId, quantity: next?.totalQuantity ?? 0 },
      }),
    );
  }
  async function change(
    action: 'adjust' | 'remove',
    input: Record<string, unknown>,
  ) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
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
    <div className="vendor-cart" aria-busy={pending}>
      {initialPreorder && (
        <VendorPreorderBanner
          storefrontId={storefrontId}
          preorder={initialPreorder}
          scheduleFormat="compact"
          concise={concise}
          hasItems={!!cart?.totalQuantity}
          disabled={pending || (!!cart?.totalQuantity && !editable)}
          onBusyChange={(busy) => {
            lock.current = busy;
            setPending(busy);
          }}
        />
      )}
      {/* Only errors are announced here. A completed change shows in the
          cart itself, and aria-busy marks the cart while it updates. */}
      {error && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
      {!cart?.totalQuantity ? (
        <div className="empty-state">
          <h1>Your Cart</h1>
          <h2 className="ui-section-title-consumer">Your cart is empty</h2>
          <p>Browse products for your next market visit.</p>
          <a
            className={buttonClassName({
              variant: 'primary',
              className: 'button',
            })}
            href="/shop"
          >
            Shop products
          </a>
        </div>
      ) : (
        <>
          {!editable && (
            <p className="alert ui-alert ui-alert-error" role="alert">
              This cart cannot be edited in its current state.
            </p>
          )}
          <div className="vendor-cart-layout">
            <section
              className="vendor-cart-items"
              aria-labelledby="market-cart-title"
            >
              <header className="vendor-cart-heading">
                <h1 id="market-cart-title">Your Cart</h1>
                <p>
                  {cart.totalQuantity}{' '}
                  {cart.totalQuantity === 1 ? 'item' : 'items'}
                </p>
              </header>
              {cart.groups.map((group) => (
                <section
                  className="vendor-cart-group"
                  key={group.vendorId}
                  aria-labelledby={`vendor-${group.vendorId}`}
                  data-vendor-group={group.vendorId}
                >
                  <h2 id={`vendor-${group.vendorId}`}>{group.vendorName}</h2>
                  <ul className="vendor-cart-lines">
                    {group.lines.map((line) => (
                      <HarvestCartLine
                        key={line.id}
                        line={{
                          ...line,
                          productVariant: {
                            id: line.variantId,
                            name: line.name,
                            product: { name: line.productName, slug: '' },
                          },
                        }}
                        currency={cart.currencyCode}
                        productHref={`/shop/products/${line.variantId}?occurrence=${cart.occurrence.id}`}
                        disabled={pending || !editable}
                        change={(action, lineId, quantity) => {
                          if (
                            action === 'adjust' &&
                            (!Number.isSafeInteger(quantity) ||
                              quantity! < 1 ||
                              quantity! > 2147483647)
                          ) {
                            setError('Enter a valid quantity of at least 1.');
                            return;
                          }
                          if (action === 'adjust' && quantity === line.quantity)
                            return;
                          return change(action, {
                            lineId,
                            ...(action === 'adjust' ? { quantity } : {}),
                          });
                        }}
                      />
                    ))}
                  </ul>
                </section>
              ))}
              <a
                className={buttonClassName({ variant: 'primary' })}
                href={`/shop?occurrence=${cart.occurrence.id}`}
              >
                <span aria-hidden="true">←</span> Continue Shopping
              </a>
            </section>
            <Card
              as="section"
              spacing="contained"
              className="vendor-cart-summary"
              aria-label="Order summary"
            >
              <h2 className="ui-section-title-consumer">Order Summary</h2>
              <p>
                {cart.totalQuantity}{' '}
                {cart.totalQuantity === 1 ? 'item' : 'items'} for market pickup
              </p>
              <dl>
                <div>
                  <dt>Subtotal including tax</dt>
                  <dd>
                    {formatMoney(cart.subTotalWithTax, cart.currencyCode)}
                  </dd>
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
                {!!cart.shippingWithTax && (
                  <div>
                    <dt>Pickup fees</dt>
                    <dd>
                      {formatMoney(cart.shippingWithTax, cart.currencyCode)}
                    </dd>
                  </div>
                )}
                <div className="vendor-cart-total">
                  <dt>Current total</dt>
                  <dd data-cart-total>
                    {formatMoney(cart.totalWithTax, cart.currencyCode)}
                  </dd>
                </div>
              </dl>
              <p className="vendor-cart-total-note">
                Current order amounts include tax. Final taxes and pickup fees
                are confirmed during checkout.
              </p>
              <p className="vendor-cart-pickup" data-cart-occurrence>
                Pickup at {marketName}
                <br />
                {occurrenceLabel(cart.occurrence, 'compact')}
              </p>
              <CheckoutLoyalty
                earnedOnly
                vendors={cart.groups.map((group) => group.vendorId)}
                disabled={pending || !editable}
                revision={JSON.stringify(cart)}
                onApplied={refreshRewards}
                onBusyChange={(value) => {
                  lock.current = value;
                  setPending(value);
                }}
              />
              <p className="cart-boundary">
                Adding items does not reserve them.
              </p>
              <a
                className={buttonClassName({
                  variant: 'primary',
                  className: 'button',
                })}
                href="/checkout"
                aria-disabled={pending}
                onClick={(event) => {
                  if (lock.current) event.preventDefault();
                }}
              >
                Continue to checkout
              </a>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
