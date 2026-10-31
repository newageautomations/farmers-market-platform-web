import { useState } from 'react';
import type { CheckoutView } from '@market/api';
import { Summary, Pickup } from './Checkout';
import { shopCall } from '../shop-client';
export function Success({
  view,
  storefrontId,
}: {
  view?: CheckoutView;
  storefrontId: string;
}) {
  const [state, setState] = useState(view?.profile ? 'AUTHENTICATED' : '');
  const [pending, setPending] = useState(false);
  if (!view?.committed || !view.code)
    return (
      <div className="farmhouse-space">
        <h1>Order confirmation</h1>
        <p>
          {view?.paymentStatus === 'FAILED'
            ? 'Payment failed. Your purchase has not been confirmed.'
            : ['PENDING', 'RECONCILIATION_REQUIRED'].includes(
                  view?.paymentStatus ?? '',
                )
              ? 'Payment is still being checked. Your purchase has not been confirmed. Please do not submit another payment.'
              : 'Your purchase has not been confirmed.'}{' '}
          <a href="/checkout">Check checkout status</a>
        </p>
      </div>
    );
  return (
    <article
      className="farmhouse-success farmhouse-space"
      data-farmhouse-component="success"
    >
      <header className="farmhouse-page-heading">
        <h1>Thank you for your order.</h1>
        <p>Your order is confirmed.</p>
        <p>
          Order reference <strong>{view.code}</strong>
        </p>
        <p>
          Payment status:{' '}
          {view.paymentStatus.toLowerCase().replaceAll('_', ' ')}
        </p>
      </header>
      <div className="farmhouse-checkout-composition">
        <Pickup view={view} />
        <aside className="farmhouse-order-panel">
          <h2>Your order</h2>
          <Summary view={view} />
        </aside>
      </div>
      <div className="farmhouse-invitation">
        <a className="farmhouse-button" href="/products">
          Continue exploring ↗
        </a>
        {state === 'AUTHENTICATED' ? (
          <p>
            <a href="/account/orders">View your orders</a>
          </p>
        ) : (
          <>
            <p role="status">
              {state === 'ACCEPTED'
                ? 'Check your email to access your orders.'
                : state === 'UNAVAILABLE'
                  ? 'An account access email could not currently be sent. Your order is confirmed.'
                  : 'Access your orders with a one-time email link.'}
            </p>
            <button
              className="farmhouse-button"
              type="button"
              disabled={pending || state === 'ACCEPTED'}
              onClick={async () => {
                setPending(true);
                try {
                  const result = await shopCall<{ state: string }>(
                    storefrontId,
                    'purchase-account-link',
                    { orderId: view.orderId },
                  );
                  setState(result.state);
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
              <a href="/account/login">Sign in to your account</a>
            </p>
          </>
        )}
      </div>
    </article>
  );
}
