import { useState } from 'react';
import type { CheckoutView } from '@market/api';
import { CheckoutSummary } from './Checkout';
import { shopCall } from './shop-client';
export function PurchaseSuccess({
  view,
  storefrontId,
}: {
  view: CheckoutView;
  storefrontId: string;
}) {
  const [state, setState] = useState(view.profile ? 'AUTHENTICATED' : ''),
    [pending, setPending] = useState(false);
  return (
    <div>
      <p>Your order is confirmed.</p>
      <p>
        Order reference: <strong>{view.code}</strong>
      </p>
      <CheckoutSummary view={view} />
      {state === 'AUTHENTICATED' ? (
        <a href="/account/orders">View your orders</a>
      ) : (
        <>
          <p role="status">
            {state === 'ACCEPTED'
              ? 'Check your email to access your orders.'
              : state === 'UNAVAILABLE'
                ? 'An account access email could not currently be sent. Your order is confirmed. You can request an account link later.'
                : 'You can access your orders with a one-time email link whenever you choose.'}
          </p>
          <button
            disabled={pending || state === 'ACCEPTED'}
            onClick={async () => {
              setPending(true);
              try {
                const r = await shopCall<{ state: string }>(
                  storefrontId,
                  'purchase-account-link',
                  { orderId: view.orderId },
                );
                setState(r.state);
              } catch {
                setState('UNAVAILABLE');
              } finally {
                setPending(false);
              }
            }}
          >
            Email me an account link
          </button>
          <p>
            <a href="/account/sign-in">Request a fresh account link later</a>
          </p>
        </>
      )}
    </div>
  );
}
