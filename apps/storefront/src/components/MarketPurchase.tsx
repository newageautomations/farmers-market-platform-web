import { useRef, useState } from 'react';
import {
  cartMessage,
  type MarketCart,
  type MarketBootstrap,
} from '@market/api';
import { occurrenceLabel } from '@market/storefront-core/market';
import { shopCall } from './shop-client';

export function MarketPurchase({
  storefrontId,
  occurrenceId,
  variantId,
  signedIn: _signedIn,
  initialCart,
}: {
  storefrontId: string;
  occurrenceId: string;
  variantId?: string;
  signedIn: boolean;
  initialCart: MarketCart | null;
}) {
  const [cart, setCart] = useState(initialCart),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const lock = useRef(false),
    mismatch = !!cart?.totalQuantity && cart.occurrence.id !== occurrenceId;
  return (
    <form
      className="purchase-form"
      aria-busy={pending}
      onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current || mismatch) return;
        const quantity = Number(
          new FormData(event.currentTarget).get('quantity') ?? 1,
        );
        lock.current = true;
        setPending(true);
        setError('');
        setMessage('');
        try {
          const result = await shopCall<{ cart: MarketCart | null }>(
            storefrontId,
            variantId ? 'add' : 'select-occurrence',
            { occurrenceId, variantId, quantity },
          );
          setCart(result.cart);
          window.dispatchEvent(
            new CustomEvent('market-cart-updated', {
              detail: {
                storefrontId,
                quantity: result.cart?.totalQuantity ?? 0,
              },
            }),
          );
          setMessage(
            variantId ? 'Added to your cart.' : 'Cart occurrence selected.',
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
                detail: {
                  storefrontId,
                  quantity: refreshed?.totalQuantity ?? 0,
                },
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
      }}
    >
      {cart && <p>Your cart is for {occurrenceLabel(cart.occurrence)}.</p>}
      {mismatch && (
        <p role="status">
          Remove the current items before switching occurrences.{' '}
          <a href="/cart">Review your cart</a>
        </p>
      )}
      {variantId && (
        <div className="field">
          <label htmlFor="market-quantity">Quantity</label>
          <input
            id="market-quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min="1"
            max="2147483647"
            step="1"
            defaultValue="1"
            required
            disabled={pending || mismatch}
          />
        </div>
      )}
      <button className="button" disabled={pending || mismatch}>
        {pending
          ? 'Updating…'
          : variantId
            ? 'Add to cart'
            : 'Use this occurrence for my cart'}
      </button>

      <p role="status" aria-live="polite">
        {message} {message && <a href="/cart">View cart</a>}
      </p>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
