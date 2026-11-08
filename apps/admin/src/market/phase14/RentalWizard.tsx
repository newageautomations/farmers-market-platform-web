import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  safeError,
  type AppError,
  type OperationsCommand,
  type RentalDetails,
  type RentalOption,
} from '@market/api';
import { Alert, Card, ErrorState, Input, UtilityIcon } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandSelect,
} from '@market/ui/farmstand';
import { WizardProgress, useWizardDialogHeight } from '../../WizardProgress';
import { CategoryImageField } from '../../vendor/categories';
import { Check, Control, Entry, moneyLabel } from './common';
import { usdToMinor } from './rental-data';
import type { RentalMedia } from './Rentals';
import { rentalStockImages } from './rental-stock';

const steps = ['Equipment details', 'Price & availability', 'Review & save'];
const initial: RentalDetails = {
  name: '',
  description: '',
  enabled: true,
  priceMinor: 0,
  currency: 'USD',
  defaultQuantity: 0,
  maxQuantity: 10,
  capacity: null,
  requiredAmenity: null,
  sortOrder: 0,
  imageAssetId: null,
  image: null,
};

/** Rental-specific fields and validation compose the existing reward wizard
 * presentation and image picker. No shared controller owns rental commands. */
export function RentalWizard({
  original,
  media,
  run,
  onBusyChange,
  onClose,
}: {
  original?: RentalOption;
  media?: RentalMedia;
  run: (command: OperationsCommand) => Promise<unknown>;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);
  const [details, setDetails] = useState<RentalDetails>(() => ({
    ...initial,
    ...original?.details,
  }));
  const [price, setPrice] = useState(() =>
    ((original?.details.priceMinor ?? 0) / 100).toFixed(2),
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [problem, setProblem] = useState('');
  const [error, setError] = useState<AppError>();
  const captureHeight = useWizardDialogHeight(root, `${step}:${busy}:${saved}`);
  const previousStage = useRef(`${step}:${saved}`);
  useEffect(() => {
    const current = `${step}:${saved}`;
    if (previousStage.current !== current)
      heading.current?.focus({ preventScroll: true });
    previousStage.current = current;
  }, [step, saved]);
  const edit = (patch: Partial<RentalDetails>) =>
    setDetails((current) => ({ ...current, ...patch }));
  function move(next: number) {
    captureHeight();
    setProblem('');
    setStep(next);
  }
  function validate() {
    if (!details.name.trim()) return 'Enter a rental name.';
    try {
      usdToMinor(price);
    } catch {
      return 'Enter a USD price from $0.00 to $1,000,000.00 with up to two decimal places.';
    }
    if (details.defaultQuantity > details.maxQuantity)
      return 'Default quantity cannot exceed the maximum per vendor.';
    return '';
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || saved || uncertain) return;
    const issue =
      step === 0
        ? !details.name.trim()
          ? 'Enter a rental name.'
          : ''
        : validate();
    setProblem(issue);
    if (issue) return;
    if (step < 2) {
      move(step + 1);
      return;
    }
    locked.current = true;
    captureHeight();
    setBusy(true);
    onBusyChange(true);
    setError(undefined);
    try {
      const result = await run({
        action: 'SAVE_RENTAL',
        id: original?.id,
        expectedRevision: original?.revision,
        data: {
          details: {
            ...details,
            name: details.name.trim(),
            priceMinor: usdToMinor(price),
            currency: 'USD',
          },
        },
      });
      if (!result) {
        setProblem(
          'The equipment could not be saved. Review the error and try again.',
        );
        return;
      }
      captureHeight();
      setSaved(true);
    } catch (cause) {
      const safe = safeError(cause);
      setError(safe);
      if (['network', 'unavailable', 'graphql', 'unknown'].includes(safe.kind))
        setUncertain(true);
    } finally {
      locked.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  if (saved)
    return (
      <div className="reward-wizard reward-published" ref={root}>
        <div role="status" aria-live="polite">
          <span className="reward-published-check" aria-hidden="true">
            <UtilityIcon name="check" />
          </span>
          <h3 ref={heading} tabIndex={-1}>
            {original ? 'Rental equipment updated' : 'Rental equipment added'}
          </h3>
          <p>
            {details.name} is{' '}
            {details.enabled
              ? 'available to include on vendor applications.'
              : 'saved and disabled for applicants.'}
          </p>
        </div>
        <FarmstandButton onClick={onClose}>Done</FarmstandButton>
      </div>
    );
  return (
    <div className="reward-wizard rental-wizard" ref={root}>
      <WizardProgress
        steps={steps}
        step={step}
        label="Rental equipment progress"
      />
      <form onSubmit={submit}>
        <fieldset disabled={busy || uncertain}>
          <div className="reward-stage" key={step}>
            <div className="reward-stage-heading">
              <h3 ref={heading} tabIndex={-1}>
                {
                  [
                    'Describe the equipment',
                    'Set price and availability',
                    'Review your rental equipment',
                  ][step]
                }
              </h3>
              <p>
                {
                  [
                    'Give vendors a clear description and an optional image.',
                    'Set the price per market date and the quantities vendors can request.',
                    'Check the details before saving. Nothing is saved until you confirm.',
                  ][step]
                }
              </p>
            </div>
            {step === 0 && (
              <div className="reward-identity-fields">
                <Entry
                  label="Rental name"
                  value={details.name}
                  required
                  maxLength={200}
                  onChange={(name) => edit({ name })}
                />
                <Entry
                  label="Description"
                  value={details.description}
                  maxLength={2000}
                  onChange={(description) => edit({ description })}
                />
                <div className="reward-image-field">
                  <span>Equipment image (optional)</span>
                  <div className="reward-image-controls">
                    {details.image && (
                      <img
                        src={details.image}
                        alt={details.name || 'Selected equipment'}
                        width={96}
                        height={96}
                      />
                    )}
                    {media ? (
                      <CategoryImageField
                        api={media}
                        stockImages={rentalStockImages}
                        presentation="library"
                        value={details.imageStockId ?? details.imageAssetId}
                        preview={details.image}
                        label="Equipment image (optional)"
                        renderTrigger={(open, disabled) => (
                          <FarmstandButton
                            variant="secondary"
                            disabled={disabled}
                            onClick={open}
                          >
                            <FarmstandIcon name="file-image" />
                            {details.image
                              ? 'Replace image'
                              : 'Upload or choose image'}
                          </FarmstandButton>
                        )}
                        onImageChange={(image) =>
                          edit({
                            imageAssetId:
                              image?.source === 'stock'
                                ? null
                                : (image?.id ?? null),
                            imageStockId:
                              image?.source === 'stock' ? image.id : null,
                            image: image?.preview ?? null,
                          })
                        }
                      />
                    ) : (
                      <p className="reward-field-help">
                        Image uploads and the image library require website
                        management access.
                      </p>
                    )}
                    {details.image && (
                      <FarmstandButton
                        variant="secondary"
                        onClick={() =>
                          edit({
                            imageAssetId: null,
                            imageStockId: null,
                            image: null,
                          })
                        }
                      >
                        Remove image
                      </FarmstandButton>
                    )}
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <>
                <div className="reward-rules-grid">
                  <Control
                    label="Price (USD)"
                    info="The price for one unit at one market date."
                  >
                    {(id) => (
                      <Input
                        id={id}
                        inputMode="decimal"
                        required
                        pattern="[0-9]+([.][0-9]{1,2})?"
                        value={price}
                        onChange={(e) => {
                          if (/^\d*(\.\d{0,2})?$/.test(e.target.value))
                            setPrice(e.target.value);
                        }}
                        onBlur={() => {
                          if (price && Number.isFinite(Number(price)))
                            setPrice(Number(price).toFixed(2));
                        }}
                      />
                    )}
                  </Control>
                  <Entry
                    label="Capacity per occurrence, blank for unlimited"
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    value={details.capacity ?? ''}
                    onChange={(v) =>
                      edit({ capacity: v === '' ? null : Number(v) })
                    }
                  />
                  <Entry
                    label="Default quantity"
                    type="number"
                    required
                    min={0}
                    max={1000}
                    step={1}
                    value={details.defaultQuantity}
                    onChange={(v) => edit({ defaultQuantity: Number(v) })}
                  />
                  <Entry
                    label="Maximum per Vendor"
                    type="number"
                    required
                    min={1}
                    max={1000}
                    step={1}
                    value={details.maxQuantity}
                    onChange={(v) => edit({ maxQuantity: Number(v) })}
                  />
                  <Entry
                    label="Sort order"
                    type="number"
                    required
                    min={0}
                    max={10000}
                    step={1}
                    value={details.sortOrder}
                    onChange={(v) => edit({ sortOrder: Number(v) })}
                  />
                  <Control label="Required booth amenity">
                    {(id) => (
                      <FarmstandSelect
                        id={id}
                        value={details.requiredAmenity ?? ''}
                        onChange={(e) =>
                          edit({ requiredAmenity: e.target.value || null })
                        }
                      >
                        <option value="">None</option>
                        {['ELECTRICITY', 'WATER', 'VEHICLE', 'FOOD_TRUCK'].map(
                          (a) => (
                            <option key={a} value={a}>
                              {a.toLowerCase().replaceAll('_', ' ')}
                            </option>
                          ),
                        )}
                      </FarmstandSelect>
                    )}
                  </Control>
                </div>
                <Check
                  label="Available to applicants"
                  checked={details.enabled}
                  onChange={(enabled) => edit({ enabled })}
                />
              </>
            )}
            {step === 2 && (
              <Card className="rental-review" spacing="contained">
                <div className="reward-review-identity">
                  <span className="reward-review-image">
                    {details.image ? (
                      <img src={details.image} alt="" />
                    ) : (
                      <FarmstandIcon name="package" />
                    )}
                  </span>
                  <div>
                    <h4>{details.name}</h4>
                    <p>{details.description || 'No description provided.'}</p>
                  </div>
                </div>
                <dl className="reward-review-facts">
                  {[
                    [
                      'Price per market date',
                      moneyLabel(usdToMinor(price), 'USD'),
                    ],
                    [
                      'Availability',
                      details.enabled ? 'Available to applicants' : 'Disabled',
                    ],
                    [
                      'Stock per market date',
                      details.capacity === null
                        ? 'Unlimited'
                        : details.capacity,
                    ],
                    ['Default quantity', details.defaultQuantity],
                    ['Maximum per vendor', details.maxQuantity],
                    [
                      'Required booth amenity',
                      details.requiredAmenity
                        ?.toLowerCase()
                        .replaceAll('_', ' ') || 'None',
                    ],
                    ['Sort order', details.sortOrder],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
          </div>
          {problem && <Alert severity="error">{problem}</Alert>}
          {error && <ErrorState error={error} />}
          {uncertain && (
            <Alert severity="warning">
              The save could not be confirmed. Close this dialog and check the
              equipment list before trying again.
            </Alert>
          )}
          <div className="reward-wizard-actions ui-actions ui-modal-actions">
            <FarmstandButton
              variant="secondary"
              disabled={step === 0 || busy || uncertain}
              onClick={() => move(step - 1)}
            >
              <FarmstandIcon name="arrow-right" />
              Back
            </FarmstandButton>
            <div>
              <FarmstandButton
                type="submit"
                loading={busy}
                disabled={busy || uncertain}
              >
                {step === 2 ? (
                  <>
                    <UtilityIcon name="check" />
                    Save rental
                  </>
                ) : (
                  <>
                    Next
                    <FarmstandIcon name="arrow-right" />
                  </>
                )}
              </FarmstandButton>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
