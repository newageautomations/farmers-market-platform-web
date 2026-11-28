import { useEffect, useState, type ReactNode } from 'react';
import type { CartBootstrap, MarketBootstrap } from '@market/api';
import { shopCall } from './shop-client';
import { FarmstandIcon } from '@market/ui/farmstand';
import { buttonClassName } from '@market/ui/presentation';
/**
 * The header cart link with its item count. `icon` draws the shared bag
 * button. A theme with its own cart drawing passes it as children with its
 * own `className`; the count badge is added the same way.
 */
export function MarketCartLink({
  storefrontId,
  icon = false,
  className,
  children,
}: {
  storefrontId: string;
  icon?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const badge = icon || children != null;
  const [quantity, setQuantity] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      shopCall<MarketBootstrap | CartBootstrap>(storefrontId, 'cart')
        .then((result) => {
          // A market cart reports its total; a vendor cart lists its lines.
          const cart = result.cart as
            | { totalQuantity?: number; lines?: { quantity: number }[] }
            | null
            | undefined;
          if (active)
            setQuantity(
              cart?.totalQuantity ??
                cart?.lines?.reduce(
                  (total, line) => total + line.quantity,
                  0,
                ) ??
                0,
            );
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
        className ??
        (icon
          ? buttonClassName({
              variant: 'tertiary',
              iconOnly: true,
              className: 'harvest-cart-link harvest-header-icon',
            })
          : undefined)
      }
      aria-label={quantity === null ? 'Cart' : `Cart, ${quantity} items`}
    >
      {children ?? (icon ? <FarmstandIcon name="shopping-bag" /> : 'Cart')}
      {quantity !== null && (
        <span
          className={badge ? 'harvest-cart-count' : undefined}
          aria-hidden="true"
        >
          {badge ? quantity : ` (${quantity})`}
        </span>
      )}
    </a>
  );
}
