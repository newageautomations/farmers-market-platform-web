import type { CheckoutView } from '@market/api';

export function CheckoutContactDetails({
  contact,
  showMissingPhone = false,
}: {
  contact: CheckoutView['contact'] | CheckoutView['profile'];
  showMissingPhone?: boolean;
}) {
  if (!contact) return null;

  return (
    <section
      className="checkout-section checkout-contact-details"
      aria-label="Contact details"
    >
      <h2>Contact details</h2>
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
        {(contact.phoneNumber || showMissingPhone) && (
          <div>
            <dt>Phone:</dt>
            <dd>{contact.phoneNumber || 'Not provided'}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
