import { useEffect, useState } from 'react';
import type { CartBootstrap } from '@market/api';
import { buttonClassName } from '@market/ui/presentation';
import { shopCall } from '../shop-client';

/** Vendor adapter for the existing cart read/event contract; never creates a cart. */
export function VendorCartLink({ storefrontId }: { storefrontId: string }) {
  const [quantity, setQuantity] = useState<number | null>(null);
  useEffect(() => {
    if (document.documentElement.dataset.editorPreview === 'true') return;
    let active = true,
      pending = false,
      queued = false;
    const refresh = async () => {
      if (pending) {
        queued = true;
        return;
      }
      pending = true;
      try {
        const result = await shopCall<CartBootstrap>(storefrontId, 'cart');
        if (active)
          setQuantity(
            result.cart?.lines.reduce(
              (total, line) => total + line.quantity,
              0,
            ) ?? 0,
          );
      } catch {
        if (active) setQuantity(null);
      } finally {
        pending = false;
        if (active && queued) {
          queued = false;
          void refresh();
        }
      }
    };
    const update = (event: Event) => {
      if (
        (event as CustomEvent<{ storefrontId: string }>).detail
          ?.storefrontId === storefrontId
      )
        void refresh();
    };
    void refresh();
    window.addEventListener('vendor-cart-updated', update);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('vendor-cart-updated', update);
      window.removeEventListener('focus', refresh);
    };
  }, [storefrontId]);
  return (
    <a
      className={buttonClassName({
        variant: 'secondary',
        className: 'mf-cart-link',
      })}
      href="/cart"
      aria-label={quantity === null ? 'Cart' : `Cart, ${quantity} items`}
    >
      Cart
      {quantity !== null && (
        <span className="mf-cart-count" aria-hidden="true">
          {quantity}
        </span>
      )}
    </a>
  );
}
