import { useId, useLayoutEffect, useRef, useState } from 'react';
import { AppError, safeError, type InventoryPage } from '@market/api';
import {
  Alert,
  Button,
  Card,
  Dialog,
  Field,
  InfoTip,
  Spinner,
  UtilityIcon,
} from '@market/ui';
import { integer } from './common';
import { QuantityStepper } from './QuantityStepper';
import type { VendorService } from './service';
import './stock-adjustment-dialog.css';

type StockRow = InventoryPage['items'][number];
type Stage = 'edit' | 'confirm' | 'saving' | 'success' | 'error';
const maximum = 2147483647;

/** Stock-specific intent and result flow composed inside one shared Dialog. */
export function StockAdjustmentDialog({
  row,
  service,
  readInventory,
  onClose,
  onRefresh,
}: {
  row: StockRow;
  service: VendorService;
  readInventory: () => Promise<StockRow[]>;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(row.stockOnHand));
  const [stage, setStage] = useState<Stage>('edit');
  const [candidate, setCandidate] = useState(row.stockOnHand);
  const [error, setError] = useState<AppError | null>(null);
  const [mustRefresh, setMustRefresh] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const busy = useRef(false);
  const intent = useRef<string | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const previousSize = useRef<{ width: number; height: number } | null>(null);

  // Animate the existing native dialog's actual dimensions, without reopening it.
  useLayoutEffect(() => {
    const dialog = content.current?.closest('dialog');
    if (!dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const previous = previousSize.current;
    previousSize.current = { width: bounds.width, height: bounds.height };
    if (previous) {
      if (stage === 'edit')
        content.current?.querySelector<HTMLInputElement>('input')?.focus();
      else dialog.querySelector<HTMLElement>('.ui-dialog-header h2')?.focus();
    }
    if (
      !previous ||
      !dialog.animate ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const animation = dialog.animate(
      [
        { width: `${previous.width}px`, height: `${previous.height}px` },
        { width: `${bounds.width}px`, height: `${bounds.height}px` },
      ],
      { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
    return () => animation.cancel();
  }, [stage]);

  async function confirm() {
    if (busy.current || stage !== 'confirm' || mustRefresh) return;
    busy.current = true;
    setStage('saving');
    setError(null);
    intent.current ??= crypto.randomUUID();
    try {
      const latest = (await readInventory()).find(
        (item) => item.variantId === row.variantId,
      );
      if (!latest || latest.stockOnHand !== row.stockOnHand)
        throw new AppError('conflict');
      const adjustment = candidate - latest.stockOnHand;
      if (adjustment !== 0)
        await service.adjust({
          operationKey: intent.current,
          variantId: row.variantId,
          quantity: adjustment,
        });
      intent.current = null;
      setStage('success');
      onRefresh();
    } catch (failure) {
      const safe = safeError(failure);
      const unconfirmed = [
        'network',
        'unavailable',
        'graphql',
        'unknown',
      ].includes(safe.kind);
      setError(safe);
      setUncertain(unconfirmed);
      setMustRefresh(
        unconfirmed || ['conflict', 'validation'].includes(safe.kind),
      );
      if (!unconfirmed) intent.current = null;
      setStage('error');
    } finally {
      busy.current = false;
    }
  }

  const titles: Record<Stage, string> = {
    edit: 'Adjust inventory total',
    confirm: 'Confirm adjust stock',
    saving: 'Updating stock',
    success: 'Stock updated',
    error: 'Stock update failed',
  };

  return (
    <Dialog
      open
      title={titles[stage]}
      size={stage === 'edit' ? 'wide' : 'standard'}
      className={`catalog-stock-dialog catalog-stock-dialog-${stage}`}
      busy={stage === 'saving'}
      beforeClose={() => !busy.current}
      onClose={onClose}
    >
      {(dismiss) => (
        <div ref={content}>
          <div key={stage} className="catalog-stock-stage">
            {stage === 'edit' ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  try {
                    setCandidate(integer(draft, { zero: true }));
                    setError(null);
                    setStage('confirm');
                  } catch {
                    setError(new AppError('validation'));
                  }
                }}
              >
                <div className="catalog-stock-identity">
                  <p className="catalog-stock-product">
                    {row.productName} · {row.variantName}
                  </p>
                  <p className="catalog-stock-sku">{row.sku}</p>
                </div>
                <div className="catalog-stock-facts">
                  <dl className="catalog-stock-cards">
                    {[
                      ['On hand', row.stockOnHand],
                      ['Allocated', row.stockAllocated],
                      ['Available', row.physicalFree],
                    ].map(([label, value]) => (
                      <Card key={label} spacing="contained">
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </Card>
                    ))}
                  </dl>
                  <InfoTip
                    label="inventory values"
                    text="On hand: your physical stock. Allocated: stock committed to orders. Available: stock left after allocations and active checkout holds. These values are managed by the inventory system."
                  />
                </div>
                <Field
                  id={`${id}-quantity`}
                  label="New on-hand total"
                  error={
                    error
                      ? 'Enter a whole number from 0 to 2147483647.'
                      : undefined
                  }
                >
                  <QuantityStepper
                    id={`${id}-quantity`}
                    name="quantity"
                    label="New on-hand total"
                    value={draft}
                    max={maximum}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                      error ? `${id}-quantity-error` : undefined
                    }
                    onChange={(event) => {
                      setDraft(event.target.value);
                      setError(null);
                    }}
                    onStep={(delta) => {
                      setDraft((value) =>
                        String(
                          Math.max(
                            0,
                            Math.min(
                              maximum,
                              (/^\d+$/.test(value)
                                ? Number(value)
                                : row.stockOnHand) + delta,
                            ),
                          ),
                        ),
                      );
                      setError(null);
                    }}
                  />
                </Field>
                <div className="ui-actions ui-modal-actions">
                  <Button type="submit">Review adjustment</Button>
                </div>
              </form>
            ) : stage === 'confirm' ? (
              <>
                <p>
                  Apply this inventory total? Allocations and checkout holds
                  remain backend controlled.
                </p>
                <p className="catalog-stock-change">
                  On hand amount: {row.stockOnHand} → {candidate}
                </p>
                <div className="ui-actions ui-modal-actions">
                  <Button onClick={() => void confirm()}>Confirm change</Button>
                  <Button variant="secondary" onClick={() => setStage('edit')}>
                    Back
                  </Button>
                </div>
              </>
            ) : stage === 'saving' ? (
              <div className="catalog-stock-result">
                <Spinner label="Saving stock" />
              </div>
            ) : (
              <>
                <div
                  className={`catalog-stock-result catalog-stock-result-${stage}`}
                  role={stage === 'error' ? 'alert' : 'status'}
                >
                  <UtilityIcon name={stage === 'success' ? 'check' : 'close'} />
                  <p>
                    {stage === 'success'
                      ? 'Inventory total updated.'
                      : error?.message}
                  </p>
                  {stage === 'success' && (
                    <p className="catalog-stock-change">
                      On hand amount: {row.stockOnHand} → {candidate}
                    </p>
                  )}
                </div>
                {uncertain && (
                  <Alert severity="warning">
                    The command outcome is unconfirmed. Check current records
                    before attempting another change.
                  </Alert>
                )}
                {stage === 'error' && (
                  <div className="ui-actions ui-modal-actions">
                    {mustRefresh ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          onRefresh();
                          dismiss();
                        }}
                      >
                        Check current records
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setError(null);
                          setStage('edit');
                        }}
                      >
                        Back
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
