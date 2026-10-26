import { useProductPurchase } from '../../lib/use-product-purchase';
import { Select } from '@market/ui';
export function Purchase(props: Parameters<typeof useProductPurchase>[0]) {
  const c = useProductPurchase(props);
  const blocked =
    c.pending ||
    !c.selected ||
    props.fixture ||
    props.preview ||
    !c.eligible ||
    !c.validQuantity;
  return (
    <form
      className="farmhouse-form farmhouse-purchase"
      aria-busy={c.pending}
      onSubmit={c.submit}
    >
      <div className="field">
        <label htmlFor="product-variant">Choose your option</label>
        <Select
          id="product-variant"
          value={c.variantId}
          disabled={c.pending || !props.variants.length}
          onChange={(e) => c.selectVariant(e.target.value)}
        >
          {props.variants.length > 1 && (
            <option value="">Choose an option</option>
          )}
          {props.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.options.length
                ? ` (${v.options.map((o) => o.name).join(', ')})`
                : ''}
              {!c.availability.some((a) => a.variantId === v.id && a.available)
                ? ' (unavailable at this market)'
                : ''}
            </option>
          ))}
        </Select>
      </div>
      <label htmlFor="product-quantity">Quantity</label>
      <div className="farmhouse-purchase-action">
        <div className="farmhouse-quantity">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={c.pending || Number(c.quantity) <= 1}
            onClick={() => c.setQuantity(String(Number(c.quantity) - 1))}
          >
            −
          </button>
          <input
            id="product-quantity"
            type="number"
            inputMode="numeric"
            min="1"
            max={Math.max(1, c.maximum)}
            step="1"
            required
            value={c.quantity}
            disabled={c.pending}
            onChange={(e) => c.setQuantity(e.target.value)}
          />
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={c.pending || Number(c.quantity) >= c.maximum}
            onClick={() => c.setQuantity(String(Number(c.quantity) + 1))}
          >
            +
          </button>
        </div>
        <button className="farmhouse-button" type="submit" disabled={blocked}>
          {c.pending
            ? 'Adding…'
            : props.preview
              ? 'Preview only'
              : !c.selected
                ? 'Choose an option'
                : !c.eligible
                  ? 'Unavailable'
                  : 'Add to cart ↗'}
        </button>
      </div>
      {!c.eligible && (
        <p role="status">
          {!c.selected
            ? 'Choose a product option to check availability.'
            : !props.occurrenceId
              ? 'Choose an upcoming pickup market on the Shop page.'
              : (c.availability.find((a) => a.variantId === c.variantId)
                  ?.reason ?? 'Availability could not be confirmed.')}{' '}
          <a
            href={
              props.occurrenceId
                ? `/products?occurrence=${encodeURIComponent(props.occurrenceId)}`
                : '/products'
            }
          >
            Browse markets and products
          </a>
        </p>
      )}
      {c.eligible && (
        <p role="status">
          Available for this market
          {c.maximum < 2147483647 ? `, up to ${c.maximum} available` : ''}.
        </p>
      )}
      {c.eligible && !c.validQuantity && (
        <p role="alert">
          Enter a whole quantity between 1 and {Math.max(1, c.maximum)}.
        </p>
      )}
      {props.fixture && (
        <p>Fixture preview. Cart mutations require a connected Shop session.</p>
      )}
      <p role="status" aria-live="polite">
        {c.pending ? 'Updating your bag…' : c.message}
        {c.message && <a href="/cart"> View your bag ↗</a>}
      </p>
      {c.error && <p role="alert">{c.error}</p>}
    </form>
  );
}
