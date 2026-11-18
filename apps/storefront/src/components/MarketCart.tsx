import { HarvestCartLine } from './HarvestCartLine';
import { VendorPreorderBanner } from './VendorPreorderBanner';
import type { VendorPreorderState } from '../lib/vendor-preorder';
import { buttonClassName } from '@market/ui/presentation';
import { Card, Field, Select } from '@market/ui';
import { useRef, useState } from 'react';
import {
  AppError,
  cartMessage,
  type MarketCart as Cart,
  type MarketBootstrap,
  type PickupOption,
} from '@market/api';
import { formatMoney } from '@market/config';
import { occurrenceLabel } from '@market/storefront-core/market';
import { shopCall } from './shop-client';
import CheckoutLoyalty from './CheckoutLoyalty';
import { prepareMarketCheckout } from '../lib/prepare-market-checkout';

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
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const lock = useRef(false);
  const [preparing, setPreparing] = useState(false);
  const [pickupOptions, setPickupOptions] = useState<PickupOption[]>([]);
  const [pickupSelection, setPickupSelection] = useState<
    Record<string, string>
  >({});
  async function continueCheckout() {
    if (lock.current || !cart) return;
    lock.current = true;
    setPending(true);
    setPreparing(true);
    setError('');
    try {
      const result = await prepareMarketCheckout(
        storefrontId,
        cart.id,
        pickupOptions.length
          ? cart.groups.map((group) => pickupSelection[group.vendorId] ?? '')
          : undefined,
      );
      if ('pickupOptions' in result) {
        setPickupOptions(result.pickupOptions);
        setPickupSelection(
          Object.fromEntries(
            cart.groups.map((group) => {
              const options = result.pickupOptions.filter(
                (option) => option.vendorId === group.vendorId,
              );
              return [
                group.vendorId,
                options.length === 1 ? options[0]!.methodId : '',
              ];
            }),
          ),
        );
        setMessage('Choose pickup for each vendor before continuing.');
      } else window.location.assign('/checkout');
    } catch (error) {
      setError(
        error instanceof AppError &&
          error.code === 'MARKET_VENDOR_PICKUP_UNAVAILABLE'
          ? error.message
          : 'Checkout could not be prepared. Check your pickup choices and try again to refresh the fees.',
      );
    } finally {
      lock.current = false;
      setPending(false);
      setPreparing(false);
    }
  }
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
    setMessage('');
    try {
      const result = await shopCall<{ cart: Cart | null }>(
        storefrontId,
        action,
        input,
      );
      setCart(result.cart);
      setPickupOptions([]);
      setPickupSelection({});
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
      <p
        className={
          pending || message ? 'alert ui-alert ui-alert-info' : undefined
        }
        role="status"
        aria-live="polite"
      >
        {pending
          ? preparing
            ? 'Preparing checkout…'
            : 'Updating your cart…'
          : message}
      </p>
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
            <p className="alert ui-alert ui-alert-info" role="status">
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
              {!!pickupOptions.length &&
                cart.groups.map((group) => (
                  <Field
                    key={group.vendorId}
                    id={`cart-pickup-${group.vendorId}`}
                    label={`Pickup for ${group.vendorName}`}
                  >
                    <Select
                      id={`cart-pickup-${group.vendorId}`}
                      value={pickupSelection[group.vendorId] ?? ''}
                      disabled={pending}
                      onChange={(event) =>
                        setPickupSelection((previous) => ({
                          ...previous,
                          [group.vendorId]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Choose pickup</option>
                      {pickupOptions
                        .filter((option) => option.vendorId === group.vendorId)
                        .map((option) => (
                          <option key={option.methodId} value={option.methodId}>
                            {option.name} ·{' '}
                            {formatMoney(option.price, option.currencyCode)}
                          </option>
                        ))}
                    </Select>
                  </Field>
                ))}
              <a
                className={buttonClassName({
                  variant: 'primary',
                  className: 'button',
                })}
                href="/checkout"
                aria-disabled={
                  pending ||
                  (!!pickupOptions.length &&
                    cart.groups.some(
                      (group) => !pickupSelection[group.vendorId],
                    ))
                }
                onClick={(event) => {
                  event.preventDefault();
                  if (
                    pending ||
                    (!!pickupOptions.length &&
                      cart.groups.some(
                        (group) => !pickupSelection[group.vendorId],
                      ))
                  )
                    return;
                  void continueCheckout();
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
