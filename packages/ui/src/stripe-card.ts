export interface StripeCard {
  mount(target: HTMLElement): void;
  destroy(): void;
  on(
    event: 'change',
    callback: (value: { complete: boolean; error?: unknown }) => void,
  ): void;
}
export interface StripeClient {
  elements(): {
    create(
      type: 'card',
      options: { hidePostalCode: boolean; disableLink: boolean },
    ): StripeCard;
  };
  confirmCardPayment?(
    secret: string,
    options: { payment_method: { card: StripeCard } },
  ): Promise<{ error?: unknown }>;
  confirmCardSetup(
    secret: string,
    options: { payment_method: { card: StripeCard } },
  ): Promise<{ error?: unknown }>;
  handleNextAction(options: {
    clientSecret: string;
  }): Promise<{ error?: unknown }>;
}
export type StripeFactory = (
  key: string,
  options?: { stripeAccount: string },
) => StripeClient;

export type StripeBillingDetails = {
  name?: string;
  email?: string;
  phone?: string;
};
export type StripePaymentElement = Pick<StripeCard, 'mount' | 'destroy' | 'on'>;
export interface StripePaymentElements {
  create(
    type: 'payment',
    options: {
      layout?: { type: 'accordion'; radios: 'always'; defaultCollapsed: false };
      defaultValues: { billingDetails: StripeBillingDetails };
      fields: {
        billingDetails: Record<keyof StripeBillingDetails, 'auto' | 'never'>;
      };
      wallets?: { applePay: 'never'; googlePay: 'never'; link: 'never' };
    },
  ): StripePaymentElement;
}
export interface StripePaymentClient extends Pick<
  StripeClient,
  'handleNextAction'
> {
  elements(options: { clientSecret: string }): StripePaymentElements;
  confirmSetup(options: {
    elements: StripePaymentElements;
    redirect: 'if_required';
    confirmParams: {
      payment_method_data: { billing_details: StripeBillingDetails };
    };
  }): Promise<{ setupIntent?: { status: string }; error?: unknown }>;
  confirmPayment?(options: {
    elements: StripePaymentElements;
    redirect: 'if_required';
    confirmParams: {
      return_url: string;
      payment_method_data: { billing_details: StripeBillingDetails };
    };
  }): Promise<{ error?: unknown }>;
}
export type StripePaymentFactory = (
  ...args: Parameters<StripeFactory>
) => StripePaymentClient;
type StripeSdkFactory = (
  ...args: Parameters<StripeFactory>
) => StripeClient & StripePaymentClient;
let sdk: Promise<StripeSdkFactory> | undefined;
/** Stripe hosts payment inputs in its own iframe. */
export function loadStripeSdk(): Promise<StripeSdkFactory> {
  sdk ??= new Promise((resolve, reject) => {
    const existing = (window as Window & { Stripe?: StripeSdkFactory }).Stripe;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      const factory = (window as Window & { Stripe?: StripeSdkFactory }).Stripe;
      if (factory) resolve(factory);
      else reject(new Error('Stripe did not load'));
    };
    script.onerror = () => {
      sdk = undefined;
      reject(new Error('Stripe did not load'));
    };
    document.head.appendChild(script);
  });
  return sdk;
}
