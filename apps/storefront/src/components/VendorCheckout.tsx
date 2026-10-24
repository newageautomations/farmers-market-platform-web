import { checkoutFieldError } from '../lib/checkout-contact';
import { useEffect, useRef, useState } from 'react';
import type { CheckoutView, PublicCart } from '@market/api';
import {
  Button,
  Dropdown,
  FormError,
  Input,
  PhoneInput,
  Textarea,
  fieldLimits,
} from '@market/ui';
import { buttonClassName } from '@market/ui/presentation';
import { safeAsset } from '@market/storefront-core/catalog';
import { formatMoney } from '@market/config';
import type { VendorPreorderState } from '../lib/vendor-preorder';
import { cartCheckoutIssue } from '../lib/vendor-cart';
import { shopCall } from './shop-client';
import { VendorPreorderBanner } from './VendorPreorderBanner';
import { CartTotals } from './CartTotals';
import { Checkout, CheckoutSummary } from './Checkout';
import { CheckoutPickup } from './CheckoutPickup';
import { CheckoutPaymentPlaceholder } from './CheckoutPaymentPlaceholder';

type Snapshot = { cart: PublicCart | null; preorder: VendorPreorderState };
export function VendorCheckout({
  storefrontId,
  initial,
  initialCart,
  initialPreorder,
}: {
  storefrontId: string;
  initial: CheckoutView;
  initialCart: PublicCart | null;
  initialPreorder: VendorPreorderState;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    cart: initialCart,
    preorder: initialPreorder,
  });
  const [view, setView] = useState(initial);
  const [stale, setStale] = useState(false);
  const [pending, setPending] = useState(false);
  const [validated, setValidated] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const { cart, preorder } = snapshot;
  const contact = initial.contact ?? initial.profile;
  const legacy =
    view.committed ||
    !!view.attempt ||
    initial.availability.state === 'AVAILABLE';
  const issue = stale
    ? 'The latest order could not be confirmed. Refresh before continuing.'
    : cartCheckoutIssue(cart, preorder);
  async function refresh() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      const current = await shopCall<CheckoutView>(
        storefrontId,
        'checkout-status',
        { orderId: initial.orderId },
      );
      const next = await shopCall<Snapshot>(storefrontId, 'cart', {
        includePreorder: true,
      });
      if (
        next.cart?.id !== initial.orderId ||
        current.orderId !== initial.orderId
      )
        throw new Error('Order changed');
      setSnapshot(next);
      setView(current);
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  useEffect(() => {
    const update = () => {
      void refresh();
    };
    window.addEventListener('focus', update);
    window.addEventListener('pageshow', update);
    window.addEventListener('vendor-cart-updated', update);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('pageshow', update);
      window.removeEventListener('vendor-cart-updated', update);
    };
    // This island remains bound to the original session order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storefrontId, initial.orderId]);
  return (
    <div className="vendor-checkout" aria-busy={pending}>
      <VendorPreorderBanner
        storefrontId={storefrontId}
        preorder={preorder}
        hasItems={!!cart?.lines.length}
        disabled={pending || !!view.attempt || view.committed}
      />
      <header className="checkout-heading">
        <h1>Checkout</h1>
      </header>
      {issue && !view.committed && (
        <p className="ui-alert ui-alert-warning" role="alert">
          {issue} <a href="/cart">Review your cart</a>
        </p>
      )}
      <div className="vendor-checkout-layout">
        <div>
          {legacy ? (
            <Checkout
              storefrontId={storefrontId}
              initial={view}
              onViewChange={setView}
            />
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const inputs = Array.from(
                  event.currentTarget.querySelectorAll<
                    HTMLInputElement | HTMLTextAreaElement
                  >('input:not([type="hidden"]), textarea'),
                );
                const next = Object.fromEntries(
                  inputs.map((input) => [input.id, checkoutFieldError(input)]),
                );
                setErrors(next);
                setValidated(true);
                const invalid = inputs.find((input) => next[input.id]);
                if (invalid) {
                  setFeedback('Please check your contact information.');
                  invalid.focus();
                } else {
                  setFeedback(
                    'Your details are valid. Payments are not configured, so your order has not been placed.',
                  );
                  void refresh();
                }
              }}
            >
              <section
                className="checkout-section"
                aria-labelledby="contact-title"
              >
                <h2 id="contact-title">Contact information</h2>
                <p>
                  Use the details we can reach you at about pickup. No account
                  is required.
                </p>
                <div className="checkout-contact-grid">
                  {(['firstName', 'lastName', 'emailAddress'] as const).map(
                    (name) => {
                      const label = {
                        firstName: 'First name',
                        lastName: 'Last name',
                        emailAddress: 'Email address',
                      }[name];
                      return (
                        <div
                          className={`field ${name === 'emailAddress' ? 'checkout-full-field' : ''}`}
                          key={name}
                        >
                          <label htmlFor={name}>{label}</label>
                          <Input
                            id={name}
                            name={name}
                            type={name === 'emailAddress' ? 'email' : 'text'}
                            autoComplete={
                              {
                                firstName: 'given-name',
                                lastName: 'family-name',
                                emailAddress: 'email',
                              }[name]
                            }
                            maxLength={fieldLimits[name]}
                            required
                            defaultValue={contact?.[name] ?? ''}
                            aria-invalid={!!errors[name]}
                            aria-describedby={
                              errors[name] ? `${name}-error` : undefined
                            }
                            onBlur={(event) => {
                              event.target.value = event.target.value.trim();
                              setErrors((previous) => ({
                                ...previous,
                                [name]: checkoutFieldError(event.target),
                              }));
                            }}
                          />
                          {errors[name] && (
                            <FormError id={`${name}-error`}>
                              {errors[name]}
                            </FormError>
                          )}
                        </div>
                      );
                    },
                  )}
                  <div className="checkout-full-field">
                    <PhoneInput
                      id="phoneNumber"
                      name="phoneNumber"
                      label="Phone number"
                      required
                      defaultValue={contact?.phoneNumber ?? ''}
                      validationMode="blur"
                      showValidation={validated}
                    />
                  </div>
                </div>
              </section>
              <CheckoutPickup view={view} preorder={preorder} />
              <CheckoutPaymentPlaceholder />
              <section className="checkout-section">
                <h2>
                  <label htmlFor="order-notes">
                    Order notes <span>(optional)</span>
                  </label>
                </h2>
                <Textarea
                  id="order-notes"
                  name="note"
                  maxLength={fieldLimits.note}
                  rows={4}
                  aria-describedby={`order-notes-help${errors['order-notes'] ? ' order-notes-error' : ''}`}
                  aria-invalid={!!errors['order-notes']}
                  onBlur={(event) =>
                    setErrors((previous) => ({
                      ...previous,
                      'order-notes': checkoutFieldError(event.target),
                    }))
                  }
                />
                <p id="order-notes-help">
                  Draft only. Notes are not sent to the vendor yet. Special
                  requests cannot be guaranteed.
                </p>
                {errors['order-notes'] && (
                  <FormError id="order-notes-error">
                    {errors['order-notes']}
                  </FormError>
                )}
              </section>
              <div className="checkout-actions">
                <p role="status" aria-live="polite">
                  {feedback}
                </p>
                <Button type="submit" variant="secondary" disabled={pending}>
                  Check my details
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled
                  aria-describedby="payment-unavailable"
                >
                  Place order
                </Button>
                <p id="payment-unavailable">
                  Payments not configured in this environment. Your order has
                  not been placed.
                </p>
              </div>
            </form>
          )}
        </div>
        <aside className="checkout-order-summary" aria-label="Order summary">
          <Dropdown
            defaultOpen
            label={
              <>
                <span>Order summary</span>
                <strong className="checkout-summary-total">
                  {formatMoney(
                    legacy ? view.total : (cart?.totalWithTax ?? view.total),
                    legacy
                      ? view.currency
                      : (cart?.currencyCode ?? view.currency),
                  )}
                </strong>
              </>
            }
          >
            {cart?.lines.length ? (
              <>
                <ul className="checkout-product-lines">
                  {cart.lines.map((line) => {
                    const image = safeAsset(line.featuredAsset?.preview);
                    return (
                      <li key={line.id}>
                        <div className="vendor-cart-image">
                          {image ? (
                            <img
                              src={image}
                              alt=""
                              width="64"
                              height="64"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.hidden = true;
                              }}
                            />
                          ) : (
                            <span>Image unavailable</span>
                          )}
                        </div>
                        <div>
                          <strong>{line.productVariant.product.name}</strong>
                          <p>{line.productVariant.name}</p>
                          <p>Quantity: {line.quantity}</p>
                        </div>
                        <span>
                          {formatMoney(
                            line.discountedLinePriceWithTax,
                            cart.currencyCode,
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {legacy ? (
                  <CheckoutSummary view={view} totalsOnly />
                ) : (
                  <CartTotals cart={cart} />
                )}
                <p>
                  Current amounts include tax. Final taxes and pickup fees are
                  confirmed during checkout.
                </p>
              </>
            ) : (
              <CheckoutSummary view={view} />
            )}
            <a
              className={buttonClassName({ variant: 'secondary' })}
              href="/cart"
            >
              Edit cart
            </a>
          </Dropdown>
          <Button
            type="button"
            variant="tertiary"
            disabled={pending}
            onClick={() => void refresh()}
          >
            Refresh order summary
          </Button>
        </aside>
      </div>
    </div>
  );
}
