import { useRef, useState } from 'react';
import { Button, Dialog } from '@market/ui';
import { cartMessage, type VendorPreorderOccurrence } from '@market/api';
import { MarketPickupCalendar } from './MarketPickupCalendar';
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
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  async function select(value: string) {
    if (
      lock.current ||
      preview ||
      disabled ||
      !occurrences.some((o) => o.id === value)
    )
      return;
    if (value === selectedId) {
      setOpen(false);
      return;
    }
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
      window.location.assign(url.pathname + url.search + url.hash);
    } catch (e) {
      setError(cartMessage(e as { kind?: string; code?: string }));
      lock.current = false;
      setPending(false);
      onBusyChange?.(false);
    }
  }
  return (
    <div className="shop-market-picker">
      <Button
        variant="secondary"
        disabled={disabled || pending}
        aria-haspopup="dialog"
        onClick={() => {
          setError('');
          setOpen(true);
        }}
      >
        Change Market
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Choose a pickup market"
        size="standard"
        className="market-selection-dialog"
        busy={pending}
      >
        {open && (
          <MarketPickupCalendar
            occurrences={occurrences}
            selectedId={selectedId}
            disabled={disabled || pending || preview}
            onSelect={(value) => void select(value)}
          />
        )}
        {preview && <p>Market selection is disabled in the editor preview.</p>}
        {pending && <p role="status">Changing your pickup market…</p>}
        {error && (
          <p className="ui-alert ui-alert-error" role="alert">
            {error} <a href="/cart">Review your cart</a>
          </p>
        )}
      </Dialog>
    </div>
  );
}
