import { useRef, useState } from 'react';
import { Button, SelectField } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import { cartMessage, type VendorPreorderOccurrence } from '@market/api';
import { occurrenceLabel } from '@market/storefront-core/market';
import { shopCall } from './shop-client';

export function ShopMarketSelection({
  storefrontId,
  occurrences,
  selectedId,
  preview = false,
  disabled = false,
  onBusyChange,
}: {
  storefrontId: string;
  occurrences: readonly VendorPreorderOccurrence[];
  selectedId: string;
  preview?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [value, setValue] = useState(selectedId),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  return (
    <details className={disclosureClassName('shop-market-picker')}>
      <summary>Change Market</summary>
      <div className="ui-disclosure-content">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (lock.current || preview || disabled || !value) return;
            lock.current = true;
            setPending(true);
            onBusyChange?.(true);
            setError('');
            try {
              await shopCall(storefrontId, 'select-occurrence', {
                occurrenceId: value,
              });
              const url = new URL(window.location.href);
              url.searchParams.set('occurrence', value);
              url.searchParams.delete('page');
              window.location.assign(url.pathname + url.search);
            } catch (e) {
              setError(cartMessage(e as { kind?: string; code?: string }));
              lock.current = false;
              setPending(false);
              onBusyChange?.(false);
            }
          }}
        >
          <SelectField
            label="Pickup market and date"
            value={value}
            disabled={pending || preview || disabled}
            onChange={(e) => setValue(e.target.value)}
          >
            {!selectedId && <option value="">Choose a market</option>}
            {occurrences.map((o) => (
              <option key={o.id} value={o.id}>
                {o.marketName} · {occurrenceLabel(o)}
              </option>
            ))}
          </SelectField>
          <Button
            type="submit"
            loading={pending}
            disabled={preview || disabled || !value}
          >
            Shop this market
          </Button>
          {error && (
            <p className="ui-alert ui-alert-error" role="alert">
              {error} <a href="/cart">Review your cart</a>
            </p>
          )}
        </form>
      </div>
    </details>
  );
}
