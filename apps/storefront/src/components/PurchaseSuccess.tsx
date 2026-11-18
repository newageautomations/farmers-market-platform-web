import { CheckoutPickup } from './CheckoutPickup';
import { buttonClassName } from '@market/ui/presentation';
import type { CheckoutView } from '@market/api';
import { CheckoutSummary } from './Checkout';
export function PurchaseSuccess({
  view,
  images = {},
  timezone,
  shopHref = '/products',
}: {
  view: CheckoutView;
  storefrontId: string;
  images?: Record<string, string>;
  timezone?: string;
  shopHref?: string;
}) {
  const contact = view.contact ?? view.profile;
  if (!view.committed || !view.code)
    return (
      <p>
        Your purchase has not been confirmed.{' '}
        <a href="/checkout">Check checkout status</a>
      </p>
    );
  return (
    <div className="checkout-confirmation">
      <div className="vendor-checkout-layout">
        <div className="checkout-confirmation-details">
          <h2>Thank you for your order</h2>
          <p>Your order is confirmed.</p>
          <p>
            Payment status:{' '}
            {view.paymentStatus === 'SUCCEEDED'
              ? 'Succeeded'
              : view.paymentStatus.toLowerCase().replaceAll('_', ' ')}
          </p>
          <p>
            Order reference: <strong>{view.code}</strong>
          </p>
          {contact && (
            <section
              className="checkout-section checkout-contact-details"
              aria-labelledby="confirmation-contact-title"
            >
              <h2 id="confirmation-contact-title">Contact details</h2>
              <dl className="checkout-contact-facts">
                <div>
                  <dt>Name:</dt>
                  <dd>
                    {contact.firstName} {contact.lastName}
                  </dd>
                </div>
                <div>
                  <dt>Email:</dt>
                  <dd>{contact.emailAddress}</dd>
                </div>
                <div>
                  <dt>Phone:</dt>
                  <dd>{contact.phoneNumber || 'Not provided'}</dd>
                </div>
              </dl>
            </section>
          )}
          <CheckoutPickup view={view} timezone={timezone} />
        </div>
        <section
          className="checkout-order-summary"
          aria-label="Purchased items"
        >
          <CheckoutSummary
            view={view}
            images={images}
            showPickup={false}
            showContact={false}
          />
        </section>
      </div>
      {view.profile ? (
        <a
          className={buttonClassName({ variant: 'secondary' })}
          href="/account/orders"
        >
          View your orders
        </a>
      ) : (
        <section
          className="checkout-account-invitation"
          aria-label="Track your orders"
        >
          <p>Want to keep track of your orders?</p>
          <p>
            Create a free account. We will prefill your details from checkout.
          </p>
          <a
            className={buttonClassName({ variant: 'primary' })}
            href={`/account/signup?order=${encodeURIComponent(view.orderId)}`}
          >
            Create a free account
          </a>
        </section>
      )}
      <a className={buttonClassName({ variant: 'primary' })} href={shopHref}>
        Continue shopping
      </a>
    </div>
  );
}
