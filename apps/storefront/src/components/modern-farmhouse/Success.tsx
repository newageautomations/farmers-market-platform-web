import type { CheckoutView } from '@market/api';
import { Summary, Pickup } from './Checkout';
export function Success({
  view,
  images = {},
}: {
  view?: CheckoutView;
  storefrontId: string;
  images?: Record<string, string>;
}) {
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
          <Summary view={view} images={images} />
        </aside>
      </div>
      <div className="farmhouse-invitation">
        <a className="farmhouse-button" href="/products">
          Continue exploring ↗
        </a>
        {view.profile ? (
          <p>
            <a href="/account/orders">View your orders</a>
          </p>
        ) : (
          <section
            className="farmhouse-checkout-section checkout-account-invitation"
            aria-label="Track your orders"
          >
            <p>Want to keep track of your orders?</p>
            <p>
              Create a free account to keep your order details together. We will
              prefill your details from checkout.
            </p>
            <a
              className="farmhouse-button"
              href={`/account/signup?order=${encodeURIComponent(view.orderId)}`}
            >
              Create a free account
            </a>
          </section>
        )}
      </div>
    </article>
  );
}
