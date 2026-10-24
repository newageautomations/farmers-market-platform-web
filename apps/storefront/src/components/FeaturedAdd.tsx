import { useRef, useState } from 'react';
import { Button } from '@market/ui';
import { cartMessage } from '@market/api';
import { shopCall } from './shop-client';
export function FeaturedAdd({
  storefrontId,
  variantId,
  occurrenceId,
}: {
  storefrontId: string;
  variantId: string;
  occurrenceId?: string;
}) {
  const lock = useRef(false);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState('');
  return (
    <div className="featured-purchase">
      <Button
        loading={pending}
        onClick={async () => {
          if (lock.current) return;
          if (!occurrenceId) {
            window.location.assign('/products');
            return;
          }
          lock.current = true;
          setPending(true);
          setMessage('');
          try {
            await shopCall(storefrontId, 'add', {
              variantId,
              quantity: 1,
              occurrenceId,
            });
            setMessage('Added to your cart.');
            window.dispatchEvent(
              new CustomEvent('vendor-cart-updated', {
                detail: { storefrontId },
              }),
            );
          } catch (error) {
            setMessage(cartMessage(error as { code?: string; kind?: string }));
          } finally {
            lock.current = false;
            setPending(false);
          }
        }}
      >
        {occurrenceId ? 'Add to cart' : 'Choose market'}
      </Button>
      <p role="status">
        {message}{' '}
        {message === 'Added to your cart.' && <a href="/cart">View cart</a>}
      </p>
    </div>
  );
}
