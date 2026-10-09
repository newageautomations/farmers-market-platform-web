import { useRef, useState } from 'react';
import { cartMessage, type PublicProduct } from '@market/api';
import { formatMoney } from '@market/config';
import { shopCall } from './shop-client';

export function ProductPurchase({
  storefrontId,
  variants,
  signedIn: _signedIn,
  fixture,
}: {
  storefrontId: string;
  variants: PublicProduct['variants'];
  signedIn: boolean;
  fixture: boolean;
}) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? ''),
    [quantity, setQuantity] = useState('1'),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const lock = useRef(false),
    selected = variants.find((v) => v.id === variantId);
  return (
    <form
      className="purchase-form"
      aria-busy={pending}
      onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current || !selected || fixture) return;
        lock.current = true;
        setPending(true);
        setMessage('');
        setError('');
        try {
          await shopCall(storefrontId, 'add', {
            variantId,
            quantity: Number(quantity),
          });
          setMessage('Added to your cart.');
        } catch (e) {
          setError(cartMessage(e as { code?: string; kind?: string }));
        } finally {
          lock.current = false;
          setPending(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="product-variant">Product option</label>
        <select
          id="product-variant"
          value={variantId}
          onChange={(e) => {
            setVariantId(e.target.value);
            setMessage('');
          }}
          disabled={pending || !variants.length}
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.options.length
                ? ` (${v.options.map((o) => o.name).join(', ')})`
                : ''}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <p className="product-price" data-variant-price>
          {formatMoney(selected.priceWithTax, selected.currencyCode)}
        </p>
      )}
      <div className="field">
        <label htmlFor="product-quantity">Quantity</label>
        <input
          id="product-quantity"
          type="number"
          inputMode="numeric"
          min="1"
          max="2147483647"
          step="1"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={pending}
        />
      </div>
      <button className="button" disabled={pending || !selected || fixture}>
        {pending ? 'Adding…' : 'Add to cart'}
      </button>

      {fixture && (
        <p>Fixture preview. Cart mutations require a connected Shop session.</p>
      )}
      <p role="status" aria-live="polite">
        {pending ? 'Updating your cart…' : message}
        {message && (
          <>
            {' '}
            <a href="/cart">View cart</a>
          </>
        )}
      </p>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
