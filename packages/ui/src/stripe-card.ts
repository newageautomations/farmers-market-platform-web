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
let sdk: Promise<StripeFactory> | undefined;
/** Stripe hosts card inputs in its own iframe. Card values never enter application state or our API. */
export function loadStripeSdk(): Promise<StripeFactory> {
  sdk ??= new Promise((resolve, reject) => {
    const existing = (window as Window & { Stripe?: StripeFactory }).Stripe;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      const factory = (window as Window & { Stripe?: StripeFactory }).Stripe;
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
