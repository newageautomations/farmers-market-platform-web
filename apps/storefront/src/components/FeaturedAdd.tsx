import { useId, useRef, useState } from 'react';
import { Button, Dialog, SelectField } from '@market/ui';
import { cartMessage } from '@market/api';
import { shopCall } from './shop-client';
export function FeaturedAdd({
  storefrontId,
  variantId,
  occurrenceId,
  className,
  variantOptions = [],
  productName = 'this product',
}: {
  storefrontId: string;
  variantId?: string;
  occurrenceId?: string;
  className?: string;
  variantOptions?: Array<{ id: string; name: string }>;
  productName?: string;
}) {
  const lock = useRef(false);
  const optionId = useId();
  const [choosing, setChoosing] = useState(false);
  const [option, setOption] = useState('');
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState('');
  async function add(selectedId: string) {
    if (lock.current || !selectedId) return;
    if (!occurrenceId) {
      window.location.assign('/products');
      return;
    }
    lock.current = true;
    setPending(true);
    setMessage('');
    try {
      await shopCall(storefrontId, 'add', {
        variantId: selectedId,
        quantity: 1,
        occurrenceId,
      });
      setMessage('Added to your cart.');
      setChoosing(false);
      window.dispatchEvent(
        new CustomEvent('vendor-cart-updated', {
          detail: { storefrontId },
        }),
      );
    } catch (error) {
      setMessage(cartMessage(error as { code?: string; kind?: string }));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const feedback = (
    <p role="status">
      {message}
      {message === 'Added to your cart.' && (
        <>
          {' '}
          <a href="/cart">View cart</a>
        </>
      )}
    </p>
  );
  return (
    <div className="featured-purchase">
      <Button
        className={className}
        loading={pending}
        onClick={() => {
          if (lock.current) return;
          if (!variantId && variantOptions.length) {
            setMessage('');
            setChoosing(true);
            return;
          }
          if (variantId) void add(variantId);
        }}
      >
        {occurrenceId ? 'Add to cart' : 'Choose market'}
      </Button>
      {!choosing && feedback}
      {variantOptions.length > 0 && !variantId && (
        <Dialog
          open={choosing}
          onClose={() => setChoosing(false)}
          title={`Choose options for ${productName}`}
          busy={pending}
          actions={
            <Button
              loading={pending}
              disabled={!option}
              onClick={() => void add(option)}
            >
              Add to cart
            </Button>
          }
        >
          <SelectField
            id={optionId}
            label="Product option"
            value={option}
            disabled={pending}
            onChange={(event) => {
              setOption(event.target.value);
              setMessage('');
            }}
          >
            <option value="">Choose an option</option>
            {variantOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </SelectField>
          {choosing && feedback}
        </Dialog>
      )}
    </div>
  );
}
