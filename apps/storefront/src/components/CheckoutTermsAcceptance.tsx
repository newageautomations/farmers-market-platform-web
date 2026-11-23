import type { CheckoutTermsDisclosure } from '@market/api';
import { Checkbox } from '@market/ui';
import { policyContentParts } from '@market/theme/storefront';
import { Fragment, useId } from 'react';
import '../styles/checkout-terms.css';

export function CheckoutTermsAcceptance({
  disclosure,
  market = false,
  checked,
  disabled,
  onChange,
}: {
  disclosure?: CheckoutTermsDisclosure | null;
  market?: boolean;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const checkboxId = useId();
  if (!disclosure?.sellers.length)
    return (
      <p role="status">
        Seller terms are unavailable. Refresh checkout to try again.
      </p>
    );

  const { sellers } = disclosure;
  const policySellers = market
    ? sellers.filter(
        (seller) => seller.policies.length || seller.pickupRefundNotice,
      )
    : sellers;

  return (
    <div className="checkout-terms">
      {policySellers.length > 0 && (
        <ul
          className="checkout-terms-sellers"
          aria-label={market ? 'Seller policies' : 'Seller terms'}
        >
          {policySellers.map((seller) => (
            <li key={seller.vendorId}>
              <p>
                <strong>{seller.vendorName}</strong>
                {!market && (
                  <>
                    {' '}
                    <a
                      href={`/terms-and-conditions?version=${seller.version}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Terms & Conditions for ${seller.vendorName} (opens in a new tab)`}
                    >
                      Terms &amp; Conditions
                    </a>
                  </>
                )}
              </p>
              {seller.policies.map((policy, index) => (
                <div key={index} className="checkout-terms-policy">
                  <strong>{policy.title}</strong>
                  <p>
                    {policyContentParts(policy.content)
                      .map((part) => part.text)
                      .join('')}
                  </p>
                </div>
              ))}
              {seller.pickupRefundNotice && <p>{seller.pickupRefundNotice}</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="checkout-terms-check">
        <Checkbox
          id={checkboxId}
          aria-labelledby={`${checkboxId}-text`}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span id={`${checkboxId}-text`}>
          {market ? (
            <>
              <label htmlFor={checkboxId}>
                I agree to the Terms &amp; Conditions for my purchases from
              </label>{' '}
              {sellers.map((seller, index) => (
                <Fragment key={seller.vendorId}>
                  {index > 0 && ', '}
                  <a
                    href={`/checkout/seller-terms/${seller.version}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {seller.vendorName}
                  </a>
                </Fragment>
              ))}
              .
            </>
          ) : (
            <label htmlFor={checkboxId}>
              I agree to the Terms &amp; Conditions for my purchase from{' '}
              {sellers[0]?.vendorName}.
            </label>
          )}
        </span>
      </div>
    </div>
  );
}
