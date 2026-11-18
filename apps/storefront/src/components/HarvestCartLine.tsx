import { Button, Input } from '@market/ui';
import type { PublicCart } from '@market/api';
import { formatMoney } from '@market/config';
import { safeAsset } from '@market/storefront-core/catalog';

/** Harvest product row shared by vendor and market carts. Each controller owns commerce. */
export function HarvestCartLine({
  line,
  currency,
  productHref,
  disabled,
  maximum = 2147483647,
  available = true,
  warning,
  error,
  change,
}: {
  line: Pick<
    PublicCart['lines'][number],
    | 'id'
    | 'quantity'
    | 'unitPriceWithTax'
    | 'discountedLinePriceWithTax'
    | 'featuredAsset'
    | 'productVariant'
  >;
  currency: string;
  productHref: string;
  disabled: boolean;
  maximum?: number;
  available?: boolean;
  warning?: string;
  error?: string;
  change: (
    action: 'adjust' | 'remove',
    lineId: string,
    quantity?: number,
  ) => unknown;
}) {
  const image = safeAsset(line.featuredAsset?.preview);
  return (
    <li className="vendor-cart-line">
      <a
        className="vendor-cart-image"
        href={productHref}
        tabIndex={-1}
        aria-hidden="true"
      >
        <span>Image unavailable</span>
        {image && (
          <img
            src={image}
            alt=""
            width="120"
            height="120"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </a>
      <div className="vendor-cart-description">
        <h2>
          <a href={productHref}>{line.productVariant.product.name}</a>
        </h2>
        <p>{line.productVariant.name}</p>
        <p>
          {formatMoney(line.unitPriceWithTax, currency)} each, including tax
        </p>
        {warning && (
          <p
            id={`availability-${line.id}`}
            className="ui-alert ui-alert-warning"
          >
            {warning}
          </p>
        )}
        {error && <p className="ui-alert ui-alert-error">{error}</p>}
        <form
          className="vendor-cart-controls"
          onSubmit={(event) => {
            event.preventDefault();
            void change(
              'adjust',
              line.id,
              Number(new FormData(event.currentTarget).get('quantity')),
            );
          }}
        >
          <div className="vendor-cart-quantity">
            <Button
              variant="primary"
              className="vendor-cart-stepper"
              type="button"
              disabled={disabled || line.quantity <= 1}
              aria-label={`Decrease quantity for ${line.productVariant.name}`}
              onClick={(event) => {
                const input =
                  event.currentTarget.form?.elements.namedItem('quantity');
                void change(
                  'adjust',
                  line.id,
                  (input instanceof HTMLInputElement
                    ? Number(input.value)
                    : line.quantity) - 1,
                );
              }}
            >
              −
            </Button>
            <label className="sr-only" htmlFor={`quantity-${line.id}`}>
              Quantity for {line.productVariant.name}
            </label>
            <Input
              key={`${line.id}-${line.quantity}-${disabled}`}
              id={`quantity-${line.id}`}
              name="quantity"
              type="number"
              inputMode="numeric"
              min="1"
              max={maximum}
              step="1"
              required
              defaultValue={line.quantity}
              disabled={disabled}
              onBlur={(event) => {
                // These buttons apply their own change using the draft quantity.
                if (
                  event.relatedTarget instanceof Node &&
                  event.currentTarget.form?.contains(event.relatedTarget)
                )
                  return;
                void change(
                  'adjust',
                  line.id,
                  Number(event.currentTarget.value),
                );
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                void change(
                  'adjust',
                  line.id,
                  Number(event.currentTarget.value),
                );
              }}
              aria-describedby={warning ? `availability-${line.id}` : undefined}
            />
            <Button
              variant="primary"
              className="vendor-cart-stepper"
              type="button"
              disabled={disabled || !available || line.quantity >= maximum}
              aria-label={`Increase quantity for ${line.productVariant.name}`}
              onClick={(event) => {
                const input =
                  event.currentTarget.form?.elements.namedItem('quantity');
                void change(
                  'adjust',
                  line.id,
                  (input instanceof HTMLInputElement
                    ? Number(input.value)
                    : line.quantity) + 1,
                );
              }}
            >
              +
            </Button>
          </div>
          <Button
            variant="destructive-outline"
            type="button"
            aria-label={`Remove ${line.productVariant.name}`}
            disabled={disabled}
            onClick={() => void change('remove', line.id)}
          >
            Remove
          </Button>
        </form>
      </div>
      <strong
        className="vendor-cart-line-total"
        aria-label={`Subtotal for ${line.productVariant.name}`}
      >
        {formatMoney(line.discountedLinePriceWithTax, currency)}
      </strong>
    </li>
  );
}
