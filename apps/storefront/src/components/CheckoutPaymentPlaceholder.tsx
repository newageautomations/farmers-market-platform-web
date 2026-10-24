/** Presentation only. Never accepts card data or initiates payment work. */
export function CheckoutPaymentPlaceholder() {
  return (
    <section className="checkout-section" aria-labelledby="payment-title">
      <h2 id="payment-title">Payment information</h2>
      <div className="checkout-payment-placeholder">
        <span aria-hidden="true">▤</span>
        <h3>Payment setup is not connected</h3>
        <p>
          The Stripe Payment Element will appear here when online payments are
          available.
        </p>
        <p>This preview cannot accept payment details or place an order.</p>
        <div className="checkout-payment-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
