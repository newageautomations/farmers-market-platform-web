import { useEffect, useState } from 'react';
import type { MarketBootstrap } from '@market/api';
import { shopCall } from './shop-client';
import { FarmstandIcon } from '@market/ui/farmstand';
import { buttonClassName } from '@market/ui/presentation';
export function MarketCartLink({
  storefrontId,
  icon = false,
}: {
  storefrontId: string;
  icon?: boolean;
}) {
  const [quantity, setQuantity] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      shopCall<MarketBootstrap>(storefrontId, 'cart')
        .then((result) => {
          if (active) setQuantity(result.cart?.totalQuantity ?? 0);
        })
        .catch(() => {
          if (active) setQuantity(null);
        });
    void refresh();
    const update = (event: Event) => {
      const detail = (
        event as CustomEvent<{ storefrontId: string; quantity: number | null }>
      ).detail;
      if (detail.storefrontId !== storefrontId) return;
      if (typeof detail.quantity === 'number') setQuantity(detail.quantity);
      else void refresh();
    };
    window.addEventListener('market-cart-updated', update);
    window.addEventListener('vendor-cart-updated', update);
    return () => {
      active = false;
      window.removeEventListener('market-cart-updated', update);
      window.removeEventListener('vendor-cart-updated', update);
    };
  }, [storefrontId]);
  return (
    <a
      href="/cart"
      className={
        icon
          ? buttonClassName({
              variant: 'tertiary',
              iconOnly: true,
              className: 'harvest-cart-link harvest-header-icon',
            })
          : undefined
      }
      aria-label={quantity === null ? 'Cart' : `Cart, ${quantity} items`}
    >
      {icon ? <FarmstandIcon name="shopping-bag" /> : 'Cart'}
      {quantity !== null && (
        <span
          className={icon ? 'harvest-cart-count' : undefined}
          aria-hidden="true"
        >
          {icon ? quantity : ` (${quantity})`}
        </span>
      )}
    </a>
  );
}
