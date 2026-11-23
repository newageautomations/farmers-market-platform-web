import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, LoadingSkeleton, Spinner } from '@market/ui';
import { formatMoney } from '@market/config';
import {
  AppError,
  type CheckoutView,
  type StripeCheckoutStatus,
} from '@market/api';
import { shopCall } from './shop-client';
import { CheckoutTermsAcceptance } from './CheckoutTermsAcceptance';
import {
  loadStripeSdk,
  prepareStripeForm,
  type StripePaymentClient,
  type StripePaymentElement,
  type StripePaymentElements,
  type StripePaymentFactory,
} from '../lib/stripe-checkout';

const messages: Record<string, string> = {
  SETUP_REQUIRED: 'Enter your card details securely with Stripe.',
  AUTHENTICATION_REQUIRED:
    'Your bank needs you to authenticate a vendor charge.',
  AUTHORIZING: 'Authorizing vendor payments.',
  CAPTURING: 'Completing your purchase.',
  VERIFYING:
    'We are verifying the payment outcome. Please do not submit another payment.',
  COMPLETED:
    'Your payment was received. We are verifying your order confirmation. Do not pay again.',
  DECLINED: 'Your card was declined. This purchase was not placed.',
  AUTHORIZATION_FAILED: 'A vendor payment could not be authorized.',
  CAPTURE_FAILED:
    'Payment could not be completed. We are checking any charges.',
  CANCELED: 'Checkout canceled. This purchase was not placed.',
  COMPENSATION_PENDING:
    'This purchase was not placed. We are verifying cancellations and refunds. Funds have not yet been confirmed returned.',
  COMPENSATION_COMPLETED:
    'This purchase was not placed. Stripe has confirmed the required refunds. Your bank determines when they appear.',
  MANUAL_INTERVENTION_REQUIRED:
    'Your payment needs review. This purchase is not confirmed. Contact the storefront and do not submit another payment.',
};
const terminal = [
  'DECLINED',
  'AUTHORIZATION_FAILED',
  'CAPTURE_FAILED',
  'CANCELED',
  'COMPENSATION_COMPLETED',
  'MANUAL_INTERVENTION_REQUIRED',
];
const statusInterval = 4000;
/** Checkout-specific composition: existing primitives cannot host Stripe's account-scoped card/authentication lifecycle. */
export function StripeCheckout({
  storefrontId,
  view,
  loadSdk = loadStripeSdk,
  accordion = false,
  disabled = false,
  onBusyChange,
  backAction,
  concise = false,
  market = false,
  onTermsChanged,
}: {
  storefrontId: string;
  view: CheckoutView;
  loadSdk?: () => Promise<StripePaymentFactory>;
  accordion?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  backAction?: ReactNode;
  market?: boolean;
  onTermsChanged?: () => Promise<CheckoutView>;
  /** Omit general reassurance copy. Charges, authorization and status stay. */
  concise?: boolean;
}) {
  const [status, setStatus] = useState<StripeCheckoutStatus | null>(null);
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [complete, setComplete] = useState(false),
    [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState<string>();
  const termsToken = view.termsDisclosure?.token;
  const termsAccepted = !!termsToken && acceptedTerms === termsToken;
  useEffect(() => setAcceptedTerms(undefined), [termsToken]);
  const cardHost = useRef<HTMLDivElement>(null),
    elements = useRef<StripePaymentElements | null>(null),
    client = useRef<StripePaymentClient | null>(null);
  const lock = useRef(false),
    mounted = useRef(true),
    factory = useRef<StripePaymentFactory | null>(null);
  const checkingOutcome =
    !confirmed &&
    uncertain &&
    submitted &&
    !terminal.includes(status?.state ?? '');
  const checkingConfirmation = status?.state === 'COMPLETED' || checkingOutcome;
  const contact = view.contact ?? view.profile;
  const name = contact
    ? `${contact.firstName} ${contact.lastName}`.trim() || undefined
    : undefined;
  const email = contact?.emailAddress || undefined;
  const phone = contact?.phoneNumber || undefined;
  const paymentAccount = status?.paymentAccount;
  const showCardEntry = !confirmed && status?.state === 'SETUP_REQUIRED';
  const entrySecret =
    showCardEntry
      ? paymentAccount
        ? status.paymentSecret
        : status.setupSecret
      : null;
  const publishableKey = status?.publishableKey;
  const [entryRetry, setEntryRetry] = useState(0);
  useEffect(() => {
    onBusyChange?.(pending || processing || checkingConfirmation);
    return () => onBusyChange?.(false);
  }, [pending, processing, checkingConfirmation, onBusyChange]);
  function accept(next: StripeCheckoutStatus | null) {
    if (!mounted.current) return;
    if (next && next.orderId !== view.orderId)
      throw new Error('Checkout changed');
    setStatus(next);
    setUncertain(false);
    if (
      next &&
      ['AUTHORIZING', 'CAPTURING', 'VERIFYING', 'COMPLETED'].includes(
        next.state,
      )
    ) {
      setSubmitted(true);
      setProcessing(true);
    }
    if (
      next &&
      (terminal.includes(next.state) ||
        (next.paymentAccount &&
          ['SETUP_REQUIRED', 'AUTHENTICATION_REQUIRED'].includes(next.state)))
    )
      setProcessing(false);
  }
  async function run(
    work: () => Promise<void>,
    verifyOnFailure = submitted && !terminal.includes(status?.state ?? ''),
  ) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    try {
      await work();
    } catch (cause) {
      if (mounted.current) {
        setProcessing(false);
        if (
          cause instanceof AppError &&
          ['VENDOR_TERMS_CHANGED', 'VENDOR_TERMS_ACCEPTANCE_REQUIRED'].includes(
            cause.code ?? '',
          )
        ) {
          setSubmitted(false);
          setAcceptedTerms(undefined);
          setShowPaymentDialog(false);
          setUncertain(false);
          try {
            await onTermsChanged?.();
            setError(cause.message);
          } catch {
            setError(
              'Seller terms could not be refreshed. Refresh checkout to try again.',
            );
          }
        } else if (
          !status &&
          cause instanceof AppError &&
          cause.code === 'ACCOUNT_NOT_READY'
        ) {
          setUncertain(false);
          setError(cause.message);
        } else {
          setUncertain(true);
          if (!verifyOnFailure)
            setError(
              'We could not verify the payment outcome. Your order is not yet confirmed. Do not pay again while we check its status.',
            );
        }
      }
    } finally {
      lock.current = false;
      if (mounted.current) {
        setPending(false);
        setLoading(false);
      }
    }
  }
  async function readPayment() {
    if (
      submitted ||
      (!accordion &&
        new URLSearchParams(window.location.search).get('payment-order') ===
          view.orderId)
    )
      return shopCall<StripeCheckoutStatus | null>(
        storefrontId,
        'stripe-checkout-status',
        { orderId: view.orderId },
      );
    return prepareStripeForm(storefrontId, view.orderId, () =>
      shopCall<StripeCheckoutStatus>(
        storefrontId,
        'stripe-checkout-prepare',
        {},
      ),
    );
  }
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(() => {
      if (!mounted.current) return;
      return run(async () => accept(await readPayment()));
    });
    return () => {
      mounted.current = false;
    };
  }, [storefrontId, view.orderId]);
  useEffect(() => {
    if (!entrySecret || !publishableKey || !cardHost.current) return;
    let active = true;
    let element: StripePaymentElement | undefined;
    void loadSdk()
      .then((sdk) => {
        if (!active || !cardHost.current) return;
        factory.current = sdk;
        client.current = paymentAccount
          ? sdk(publishableKey, { stripeAccount: paymentAccount })
          : sdk(publishableKey);
        elements.current = client.current.elements({
          clientSecret: entrySecret,
        });
        element = elements.current.create('payment', {
          layout:
            accordion || paymentAccount
              ? { type: 'accordion', radios: 'always', defaultCollapsed: false }
              : undefined,
          defaultValues: { billingDetails: { name, email, phone } },
          fields: {
            billingDetails: {
              name: name ? 'never' : 'auto',
              email: email ? 'never' : 'auto',
              phone: phone ? 'never' : 'auto',
            },
          },
          ...(!paymentAccount && {
            wallets: { applePay: 'never', googlePay: 'never', link: 'never' },
          }),
        });
        element.on('change', (value) => {
          if (!active) return;
          setComplete(value.complete);
          setError(
            value.error
              ? paymentAccount
                ? 'Check your payment information.'
                : 'Check your card information.'
              : '',
          );
        });
        element.mount(cardHost.current);
      })
      .catch(() => {
        if (active)
          setError(
            paymentAccount
              ? 'The secure payment form could not load. Refresh the status to try loading it again.'
              : 'The secure card form could not load. Refresh the status to try loading it again.',
          );
      });
    return () => {
      active = false;
      element?.destroy();
      elements.current = null;
      setComplete(false);
    };
  }, [
    entrySecret,
    paymentAccount,
    publishableKey,
    name,
    email,
    phone,
    loadSdk,
    entryRetry,
    accordion,
  ]);
  useEffect(() => {
    if (!checkingConfirmation || confirmed) return;
    let active = true;
    let timer: number | undefined;
    async function checkOrder() {
      // A slow or lost response can outlive the browser's payment request.
      // Read the native order without starting or advancing another payment.
      const order = await shopCall<CheckoutView | null>(
        storefrontId,
        'checkout-status',
        { orderId: view.orderId },
      ).catch(() => null);
      if (!active) return;
      if (order?.committed && order.orderId === view.orderId) {
        setConfirmed(true);
        setError('');
        window.location.assign(
          `/checkout/success?order=${encodeURIComponent(view.orderId)}`,
        );
        return;
      }
      timer = window.setTimeout(checkOrder, statusInterval);
    }
    void checkOrder();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkingConfirmation, confirmed, storefrontId, view.orderId]);
  useEffect(() => {
    if (
      !status ||
      checkingConfirmation ||
      terminal.includes(status.state) ||
      ['COMPLETED', 'SETUP_REQUIRED', 'AUTHENTICATION_REQUIRED'].includes(
        status.state,
      )
    )
      return;
    const timer = window.setInterval(() => {
      void run(async () =>
        accept(
          await shopCall<StripeCheckoutStatus>(
            storefrontId,
            'stripe-checkout-advance',
            { groupId: status.groupId },
          ),
        ),
      );
    }, statusInterval);
    return () => window.clearInterval(timer);
  }, [status?.groupId, status?.state, checkingConfirmation]);
  async function pay() {
    setShowPaymentDialog(true);
    await run(async () => {
      if (!status) return;
      let next: StripeCheckoutStatus;
      let submittedVendorPayment = false;
      if (status.state === 'SETUP_REQUIRED') {
        const paymentElements = elements.current;
        const stripe = client.current;
        if (
          !paymentElements || !stripe || !complete || !entrySecret || !termsAccepted
        ) return;
        setSubmitted(true);
        next = await shopCall<StripeCheckoutStatus>(
          storefrontId,
          'stripe-checkout-start',
          { consent: 'checkout-vendors-once-v1', termsToken },
        );
        if (next.orderId !== view.orderId || next.groupId !== status.groupId)
          throw new Error('Checkout changed');
        if (next.state === 'SETUP_REQUIRED' && paymentAccount) {
          if (!stripe.confirmPayment)
            throw new Error('Stripe payment confirmation is unavailable');
          if (
            next.paymentSecret !== entrySecret ||
            next.paymentAccount !== paymentAccount
          )
            throw new Error('Checkout payment changed');
          const returnUrl = new URL('/checkout', window.location.origin);
          returnUrl.searchParams.set('payment-order', view.orderId);
          await stripe.confirmPayment({
            elements: paymentElements,
            redirect: 'if_required',
            confirmParams: {
              return_url: returnUrl.href,
              payment_method_data: {
                billing_details: { name, email, phone },
              },
            },
          });
          submittedVendorPayment = true;
          next = await shopCall<StripeCheckoutStatus>(
            storefrontId,
            'stripe-checkout-advance',
            { groupId: status.groupId },
          );
        } else if (next.state === 'SETUP_REQUIRED') {
          if (next.setupSecret !== entrySecret)
            throw new Error('Checkout payment changed');
          const result = await stripe.confirmSetup({
            elements: paymentElements,
            redirect: 'if_required',
            confirmParams: {
              payment_method_data: { billing_details: { name, email, phone } },
            },
          });
          if (result.error || result.setupIntent?.status !== 'succeeded') {
            setError(
              'Your card could not be set up. Check your details or complete the bank authentication.',
            );
            return;
          }
          setProcessing(true);
          next = await shopCall<StripeCheckoutStatus>(
            storefrontId,
            'stripe-checkout-advance',
            { groupId: status.groupId },
          );
        }
      } else {
        setSubmitted(true);
        next = await shopCall<StripeCheckoutStatus>(
          storefrontId,
          'stripe-checkout-advance',
          { groupId: status.groupId },
        );
      }
      setProcessing(true);
      if (
        !submittedVendorPayment &&
        next.state === 'AUTHENTICATION_REQUIRED' &&
        next.actionSecret &&
        next.actionAccount
      ) {
        setProcessing(false);
        const sdk = factory.current ?? (await loadSdk());
        factory.current = sdk;
        const result = await sdk(next.publishableKey, {
          stripeAccount: next.actionAccount,
        }).handleNextAction({ clientSecret: next.actionSecret });
        if (result.error) {
          next = await shopCall<StripeCheckoutStatus>(
            storefrontId,
            'stripe-checkout-cancel',
            { groupId: next.groupId },
          );
        } else
          next = await shopCall<StripeCheckoutStatus>(
            storefrontId,
            'stripe-checkout-advance',
            { groupId: next.groupId },
          );
      }
      setProcessing(true);
      accept(next);
      if (next.state === 'SETUP_REQUIRED')
        setError(
          paymentAccount
            ? 'Payment was not completed. Check your payment details or choose another method.'
            : 'Card setup has not completed. Your order is not confirmed. Check your card details before continuing.',
        );
      if (terminal.includes(next.state) || next.state === 'SETUP_REQUIRED')
        setProcessing(false);
    }, true);
  }
  const paymentProblem =
    error ||
    (status && [...terminal, 'COMPENSATION_PENDING'].includes(status.state)
      ? messages[status.state]
      : '');
  const showPaymentActions =
    !confirmed &&
    (!status ||
      ['SETUP_REQUIRED', 'AUTHENTICATION_REQUIRED'].includes(status.state));
  const progressTitle = checkingOutcome
    ? 'Verifying your order'
    : 'Processing your order';
  const progressMessage = checkingOutcome
    ? 'This is taking longer than expected. We are checking your order. Do not pay again.'
    : 'We are confirming your payment and order. Please keep this page open.';
  return (
    <section
      className="checkout-section"
      aria-label={paymentAccount ? 'Secure payment' : 'Secure card payment'}
      aria-busy={pending || loading}
    >
      <Dialog
        open={
          showPaymentDialog && (processing || checkingOutcome || !!paymentProblem)
        }
        title={
          error
            ? 'Payment needs verification'
            : paymentProblem
              ? 'Order not placed'
              : progressTitle
        }
        size="standard"
        busy={processing && !paymentProblem}
        onClose={() => setShowPaymentDialog(false)}
      >
        {paymentProblem ? (
          <p role="alert">{paymentProblem}</p>
        ) : (
          <>
            <Spinner label={progressTitle} />
            <p>{progressMessage}</p>
          </>
        )}
      </Dialog>
      {!concise && <p>Payment details are securely handled by Stripe.</p>}
      {view.groups.length > 1 && (
        <p>
          You are buying from independent vendors. Your total will appear as
          separate vendor charges.
        </p>
      )}
      <ul
        aria-label={paymentAccount ? 'Vendor charges' : 'Vendor card charges'}
      >
        {(
          status?.charges ??
          view.preorderFee?.vendors.map((v) => ({
            vendorId: v.vendorId,
            amount: v.total,
            currency: view.currency,
          })) ??
          []
        ).map((c) => (
          <li key={c.vendorId}>
            {view.groups.find((g) => g.vendorId === c.vendorId)?.vendorName ??
              'Vendor'}
            : {formatMoney(c.amount, c.currency)}
          </li>
        ))}
      </ul>
      {loading && <LoadingSkeleton variant="checkout" label={null} />}
      {showCardEntry && (
        <div className="checkout-card-entry">
          <p id="checkout-card-label">
            {paymentAccount ? 'Payment method' : 'Card details'}
          </p>
          {!paymentAccount && (
            <p
              id="checkout-card-help"
              className={concise ? 'sr-only' : undefined}
            >
              Enter your card number, expiration date, security code and ZIP
              code.
            </p>
          )}
          <div
            className="checkout-card-host"
            role="group"
            ref={cardHost}
            aria-labelledby="checkout-card-label"
            aria-describedby={paymentAccount ? undefined : 'checkout-card-help'}
          />
        </div>
      )}
      {showCardEntry && (
        <p>
          By selecting Complete purchase, you authorize the vendor charges shown
          above for this checkout.
        </p>
      )}
      <p role="status" aria-live="polite">
        {confirmed
          ? 'Purchase confirmed.'
          : checkingOutcome
            ? messages.VERIFYING
            : loading
              ? 'Loading secure payment status.'
              : status
                ? concise && status.state === 'SETUP_REQUIRED'
                  ? ''
                  : paymentAccount && status.state === 'SETUP_REQUIRED'
                    ? 'Choose a payment method securely with Stripe.'
                    : (messages[status.state] ?? messages.VERIFYING)
                : concise
                  ? ''
                  : 'Your card will be used only for this checkout.'}
      </p>
      {error && (
        <p className="ui-alert ui-alert-error" role="alert">
          {error}
        </p>
      )}
      {showCardEntry && (
        <CheckoutTermsAcceptance
          disclosure={view.termsDisclosure}
          market={market}
          checked={termsAccepted}
          disabled={pending || uncertain}
          onChange={(checked) =>
            setAcceptedTerms(checked ? termsToken : undefined)
          }
        />
      )}
      {showPaymentActions && (
        <div className="checkout-stage-actions">
          {backAction}{' '}
          <Button
            type="button"
            variant="primary"
            disabled={
              disabled ||
              uncertain ||
              loading ||
              pending ||
              !status ||
              (status.state === 'SETUP_REQUIRED' &&
                (!complete || !termsAccepted))
            }
            onClick={() => void pay()}
          >
            {pending
              ? 'Checking payment…'
              : !status
                ? 'Preparing secure card entry'
                : status.state === 'AUTHENTICATION_REQUIRED'
                  ? 'Authenticate vendor payment'
                  : 'Complete purchase'}
          </Button>
        </div>
      )}
      {(error || uncertain) && !confirmed && (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            void run(async () => {
              accept(await readPayment());
              setEntryRetry((retry) => retry + 1);
            })
          }
        >
          {submitted ? 'Check payment status' : 'Retry secure payment'}
        </Button>
      )}
      {status && terminal.includes(status.state) && (
        <>
          {status.state !== 'MANUAL_INTERVENTION_REQUIRED' && (
            <p>
              Your items are saved. You can return to your cart or continue with
              a new checkout.
            </p>
          )}
          {status.state !== 'MANUAL_INTERVENTION_REQUIRED' && (
            <Button
              type="button"
              variant="primary"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await shopCall(storefrontId, 'checkout-restart', {
                    orderId: view.orderId,
                  });
                  window.location.assign('/checkout?step=Review');
                })
              }
            >
              Continue checkout
            </Button>
          )}
          <a href="/cart">Return to cart</a>
        </>
      )}
    </section>
  );
}
