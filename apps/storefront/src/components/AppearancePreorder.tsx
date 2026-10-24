import { useRef, useState } from 'react';
import { Button } from '@market/ui';
import { cartMessage } from '@market/api';
import { shopCall } from './shop-client';
/** A direct action using the same server selection boundary as ShopMarketSelection. */
export function AppearancePreorder({
  storefrontId,
  occurrenceId,
  preview = false,
}: {
  storefrontId: string;
  occurrenceId: string;
  preview?: boolean;
}) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div>
      <Button
        disabled={preview}
        loading={busy}
        onClick={async () => {
          if (preview || lock.current) return;
          lock.current = true;
          setBusy(true);
          setError('');
          try {
            await shopCall(storefrontId, 'select-occurrence', {
              occurrenceId,
              requireAvailable: true,
            });
            window.location.assign(
              `/products?occurrence=${encodeURIComponent(occurrenceId)}`,
            );
          } catch (e) {
            setError(cartMessage(e as { kind?: string; code?: string }));
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        Preorder for This Market
      </Button>
      {error && (
        <p role="alert">
          {error} <a href="/cart">Review your cart</a>
        </p>
      )}
    </div>
  );
}
