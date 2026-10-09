import { useEffect, useState } from 'react';
import type { MarketBootstrap } from '@market/api';
import { shopCall } from './shop-client';
export function MarketCartLink({ storefrontId }: { storefrontId: string }) {
  const [quantity, setQuantity] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void shopCall<MarketBootstrap>(storefrontId, 'cart')
      .then((result) => {
        if (active) setQuantity(result.cart?.totalQuantity ?? 0);
      })
      .catch(() => {
        if (active) setQuantity(null);
      });
    const update = (event: Event) => {
      const detail = (
        event as CustomEvent<{ storefrontId: string; quantity: number | null }>
      ).detail;
      if (detail.storefrontId === storefrontId) setQuantity(detail.quantity);
    };
    window.addEventListener('market-cart-updated', update);
    return () => {
      active = false;
      window.removeEventListener('market-cart-updated', update);
    };
  }, [storefrontId]);
  return (
    <a
      href="/cart"
      aria-label={quantity === null ? 'Cart' : `Cart, ${quantity} items`}
    >
      Cart{quantity !== null && <span aria-hidden="true"> ({quantity})</span>}
    </a>
  );
}
