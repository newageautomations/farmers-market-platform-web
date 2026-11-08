import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { formatMoney, parsePrice } from '@market/config';
import { safeError, type LoyaltyReward, type LoyaltyTerms } from '@market/api';
import {
  Alert,
  Badge,
  Card,
  Field,
  Input,
  Radio,
  Textarea,
  SearchSelect,
  SearchableMultiSelect,
  UtilityIcon,
} from '@market/ui';
import { FarmstandButton, FarmstandIcon } from '@market/ui/farmstand';
import type { VendorService } from './service';
import { ReadState, useRead } from './common';
import { CategoryImageField } from './categories';
import { LoyaltyIcon } from './LoyaltyIcon';
import { useWizardDialogHeight, WizardProgress } from '../WizardProgress';
import './loyalty-reward-wizard.css';

export const rewardKindLabels = {
  FIXED: 'Fixed amount discount',
  PERCENTAGE: 'Percentage discount',
  FREE_PRODUCT: 'Free product',
} as const;
const kindDescriptions = {
  FIXED: 'Give a specific dollar amount off, like $5 off.',
  PERCENTAGE: 'Give a percentage off, like 10% off.',
  FREE_PRODUCT: 'Let customers redeem a specific product for free.',
};
const steps = [
  'Reward type',
  'Reward details',
  'Redemption rules',
  'Review & publish',
];
const initialTerms: LoyaltyTerms = {
  name: '',
  kind: 'FIXED',
  points: 2000,
  value: 200,
  maximum: 1500,
  minimum: 0,
  variantIds: [],
  quantity: 1,
  startsAt: null,
  endsAt: null,
  limit: null,
};
function RewardTypeIcon({ kind }: { kind: LoyaltyTerms['kind'] }) {
  return kind === 'FREE_PRODUCT' ? (
    <LoyaltyIcon name="gift" />
  ) : kind === 'FIXED' ? (
    <FarmstandIcon name="tag" />
  ) : (
    <span className="reward-percentage-icon" aria-hidden="true">
      %
    </span>
  );
}
function reviewDate(
  value: string | null | undefined,
  fallback: string,
  end = false,
) {
  return value
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.parse(value) - (end ? 1 : 0)))
    : fallback;
}

/** Reward-specific stages compose shared controls; no shared wizard supplies this workflow. */
export function LoyaltyRewardWizard({
  service,
  initial,
  onSave,
  onBusyChange,
  onCancel,
  onPublished,
}: {
  service: VendorService;
  initial?: LoyaltyReward;
  onBusyChange?: (busy: boolean) => void;
  onCancel?: () => void;
  onPublished?: () => void;
  onSave: (terms: LoyaltyTerms, status: string) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);
  const [terms, setTerms] = useState(initial?.terms ?? initialTerms);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const captureHeight = useWizardDialogHeight(root, `${step}:${published}`);
  function moveToStep(next: number) {
    captureHeight();
    setStep(next);
  }
  const previousStep = useRef(step);
  const [productLabels, setProductLabels] = useState<Record<string, string>>(
    {},
  );
  const [amountDraft, setAmountDraft] = useState(
    String(
      initial?.terms.kind === 'PERCENTAGE'
        ? initial.terms.value
        : (initial?.terms.value ?? 200) / 100,
    ),
  );
  const [maximumDraft, setMaximumDraft] = useState(
    String((initial?.terms.maximum ?? 1500) / 100),
  );
  const [minimumDraft, setMinimumDraft] = useState(
    String((initial?.terms.minimum ?? 0) / 100),
  );
  const read = useCallback(async () => {
    const page = await service.catalog(search, 0);
    setProductLabels((previous) => ({
      ...previous,
      ...Object.fromEntries(
        page.items.flatMap((product) =>
          product.variants.map((variant) => [
            variant.id,
            `${product.name}: ${variant.name}`,
          ]),
        ),
      ),
    }));
    return page;
  }, [service, search]);
  const products = useRead(`loyalty-products:${search}`, read, step === 1);
  const options =
    products.data?.items.flatMap((p) =>
      p.variants.map((v) => ({
        value: v.id,
        label: `${p.name}: ${v.name}`,
        disabled: !p.enabled || !v.enabled,
      })),
    ) ?? [];
  const selectedProducts = terms.variantIds.map((value) => ({
    value,
    label: productLabels[value] ?? service.variantName(value),
  }));
  const selectionOptions = [
    ...options,
    ...selectedProducts.filter(
      (p) => !options.some((o) => o.value === p.value),
    ),
  ];
  const set = (changes: Partial<LoyaltyTerms>) =>
    setTerms((t) => ({ ...t, ...changes }));
  const valueTitle =
    terms.kind === 'FIXED'
      ? 'Discount amount'
      : terms.kind === 'PERCENTAGE'
        ? 'Percentage discount'
        : 'Free quantity';
  useEffect(() => {
    if (previousStep.current !== step || published)
      heading.current?.focus({ preventScroll: true });
    previousStep.current = step;
  }, [step, published]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving.current || (uncertain && step === 3)) return;
    setError('');
    if (step === 1) {
      if (!terms.name.trim()) {
        setError('Enter a reward name.');
        return;
      }
      if (
        terms.name.trim().length > 120 ||
        (terms.description?.length ?? 0) > 500
      ) {
        setError(
          'Keep the reward name within 120 characters and the description within 500 characters.',
        );
        return;
      }
      if (terms.variantIds.some((id) => !/^[1-9][0-9]*$/.test(id))) {
        setError(
          'Choose a valid product and variant from your catalog in Reward details.',
        );
        return;
      }
      if (terms.variantIds.length > 100) {
        setError('Select no more than 100 eligible products.');
        return;
      }
      const unavailable = products.data?.items.some((p) =>
        p.variants.some(
          (v) => terms.variantIds.includes(v.id) && (!p.enabled || !v.enabled),
        ),
      );
      if (unavailable) {
        setError('Choose an enabled product and variant in Reward details.');
        return;
      }
      if (
        terms.kind === 'FREE_PRODUCT' &&
        (terms.variantIds.length !== 1 ||
          !Number.isSafeInteger(terms.quantity) ||
          terms.quantity < 1)
      ) {
        setError('Select a product and a positive whole quantity.');
        return;
      }
      try {
        const money = (draft: string, label: string) => {
          try {
            return parsePrice(draft, 'USD');
          } catch {
            throw new Error(
              `In Reward details, enter ${label} as a valid dollar amount with at most two decimal places.`,
            );
          }
        };
        const value =
          terms.kind === 'FREE_PRODUCT'
            ? 0
            : terms.kind === 'FIXED'
              ? money(amountDraft, 'Discount amount')
              : Number(amountDraft);
        const maximum =
          terms.kind === 'PERCENTAGE'
            ? money(maximumDraft, 'Maximum discount')
            : 0;
        const minimum = money(
          minimumDraft || '0',
          'Minimum eligible product subtotal',
        );
        if (
          [value, maximum, minimum, terms.quantity].some(
            (n) => !Number.isSafeInteger(n) || n > 2147483647,
          )
        ) {
          setError(
            'Use whole quantities and amounts within the supported limit in Reward details.',
          );
          return;
        }
        if (terms.kind === 'FIXED' && minimum > value) {
          setError(
            'Minimum eligible subtotal cannot exceed the discount amount.',
          );
          return;
        }
        if (minimum < 0)
          throw new Error(
            'In Reward details, Minimum eligible product subtotal must be zero or more.',
          );
        if (terms.kind === 'FIXED' && value <= 0)
          throw new Error(
            'In Reward details, Discount amount must be greater than zero.',
          );
        if (
          terms.kind === 'PERCENTAGE' &&
          (!Number.isSafeInteger(value) || value < 1 || value > 100)
        )
          throw new Error(
            'In Reward details, Percentage discount must be a whole number from 1 to 100.',
          );
        if (terms.kind === 'PERCENTAGE' && maximum <= 0)
          throw new Error(
            'In Reward details, Maximum discount must be greater than zero.',
          );
        setTerms({ ...terms, value, maximum, minimum });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Check the amounts in Reward details.',
        );
        return;
      }
    }
    if (step === 2) {
      if (
        [terms.startsAt, terms.endsAt].some(
          (date) => date && !Number.isFinite(Date.parse(date)),
        )
      ) {
        setError('Choose valid start and end dates in Redemption rules.');
        return;
      }
      if (
        !Number.isSafeInteger(terms.points) ||
        terms.points < 1 ||
        terms.points > 2147483647 ||
        (terms.limit != null &&
          (!Number.isSafeInteger(terms.limit) ||
            terms.limit < 1 ||
            terms.limit > 2147483647))
      ) {
        setError(
          'Enter positive whole numbers for required points and the customer limit.',
        );
        return;
      }
      if (terms.startsAt && terms.endsAt && terms.endsAt <= terms.startsAt) {
        setError('The end date must be later than the start date.');
        return;
      }
    }
    if (step < 3) {
      moveToStep(step + 1);
      return;
    }
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const status = submitter?.value === 'DRAFT' ? 'DRAFT' : 'ACTIVE';
    saving.current = true;
    setBusy(true);
    onBusyChange?.(true);
    try {
      await onSave(terms, status);
      if (status === 'ACTIVE') {
        captureHeight();
        setPublished(true);
      }
    } catch (err) {
      const error = safeError(err);
      setError(
        error.kind === 'validation' &&
          (!error.code || error.code === 'BAD_USER_INPUT')
          ? 'The reward was not saved. Return to Reward details to check the reward value and product selection, then check points, limits and dates in Redemption rules. Your progress is preserved.'
          : error.message,
      );
      if (['network', 'unavailable', 'graphql', 'unknown'].includes(error.kind))
        setUncertain(true);
    } finally {
      saving.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  if (published)
    return (
      <div className="reward-wizard reward-published" ref={root}>
        <div role="status" aria-live="polite">
          <span className="reward-published-check" aria-hidden="true">
            <UtilityIcon name="check" />
          </span>
          <h3 ref={heading} tabIndex={-1}>
            Reward successfully published
          </h3>
          <p>{terms.name} is published.</p>
        </div>
        <FarmstandButton onClick={onPublished ?? onCancel}>
          Done
        </FarmstandButton>
      </div>
    );
  return (
    <div className="reward-wizard" ref={root}>
      <WizardProgress
        steps={steps}
        step={step}
        label="Reward creation progress"
      />
      {error && <Alert severity="error">{error}</Alert>}
      {uncertain && (
        <Alert severity="warning">
          The save result could not be confirmed. Reload this page and check the
          rewards list before trying again.
        </Alert>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="reward-wizard-fields">
          <div className="reward-stage" key={step}>
            <div className="reward-stage-heading">
              <h3 ref={heading} tabIndex={-1}>
                {
                  [
                    'Choose reward type',
                    'Enter reward details',
                    'Set redemption rules',
                    'Review and publish',
                  ][step]
                }
              </h3>
              <p>
                {step === 0
                  ? 'Select the type of reward you want to offer to your loyalty members.'
                  : step === 1
                    ? `Provide the key information for your ${rewardKindLabels[terms.kind].toLowerCase()} reward.`
                    : step === 2
                      ? 'Define how many points are required and any limits or dates for this reward.'
                      : 'Review your reward details before publishing. You can save it as a draft or publish it now.'}
              </p>
            </div>
            {step === 0 ? (
              <div
                className="reward-type-grid"
                role="radiogroup"
                aria-label="Reward type"
              >
                {Object.entries(rewardKindLabels).map(([kind, label]) => (
                  <Card
                    key={kind}
                    spacing="contained"
                    padding="none"
                    className="reward-type-choice"
                    data-selected={terms.kind === kind}
                  >
                    <label>
                      <Radio
                        name="reward-kind"
                        aria-label={label}
                        checked={terms.kind === kind}
                        onChange={() => {
                          setAmountDraft(kind === 'PERCENTAGE' ? '10' : '2');
                          set({
                            kind: kind as LoyaltyTerms['kind'],
                            variantIds: [],
                            value:
                              kind === 'PERCENTAGE'
                                ? 10
                                : kind === 'FIXED'
                                  ? 200
                                  : 0,
                          });
                        }}
                      />
                      <span className="reward-type-check" aria-hidden="true">
                        <UtilityIcon name="check" />
                      </span>
                      <RewardTypeIcon kind={kind as LoyaltyTerms['kind']} />
                      <strong>{label}</strong>
                      <span>
                        {kindDescriptions[kind as LoyaltyTerms['kind']]}
                      </span>
                    </label>
                  </Card>
                ))}
              </div>
            ) : step === 1 ? (
              <div className="reward-details-grid">
                <div className="reward-identity-fields">
                  <Field id="loyalty-name" label="Reward name *">
                    <Input
                      id="loyalty-name"
                      required
                      maxLength={120}
                      value={terms.name}
                      onChange={(e) => set({ name: e.target.value })}
                    />
                  </Field>
                  <Field
                    id="loyalty-description"
                    label="Description (optional)"
                  >
                    <Textarea
                      id="loyalty-description"
                      rows={2}
                      maxLength={500}
                      value={terms.description ?? ''}
                      onChange={(e) => set({ description: e.target.value })}
                    />
                  </Field>
                </div>
                {service.categories &&
                  service.context.permissions.includes('ManageOwnCatalog') && (
                    <div className="reward-image-field">
                      <span>Reward image (optional)</span>
                      <div className="reward-image-controls">
                        {terms.image && (
                          <img
                            src={terms.image}
                            alt="Reward preview"
                            width="96"
                            height="96"
                          />
                        )}
                        <CategoryImageField
                          api={service.categories}
                          value={terms.imageAssetId}
                          preview={terms.image}
                          label="Reward image (optional)"
                          presentation="library"
                          renderTrigger={(open, disabled) => (
                            <FarmstandButton
                              variant="secondary"
                              className="reward-image-trigger"
                              aria-label="Reward image (optional)"
                              aria-haspopup="dialog"
                              disabled={disabled}
                              onClick={open}
                            >
                              <UtilityIcon name="plus" />
                              {terms.image ? 'Replace' : 'Add image'}
                            </FarmstandButton>
                          )}
                          onImageChange={(image) =>
                            set({
                              imageAssetId: image?.id ?? null,
                              image: image?.preview ?? null,
                            })
                          }
                        />
                        {terms.imageAssetId && (
                          <FarmstandButton
                            variant="secondary"
                            iconOnly
                            aria-label="Remove reward image"
                            onClick={() =>
                              set({ imageAssetId: null, image: null })
                            }
                          >
                            <UtilityIcon name="trash" />
                          </FarmstandButton>
                        )}
                      </div>
                    </div>
                  )}
                <div className="reward-value-fields">
                  <Field
                    id={
                      terms.kind === 'FREE_PRODUCT'
                        ? 'loyalty-quantity'
                        : 'loyalty-value'
                    }
                    label={`${valueTitle}${terms.kind === 'FIXED' ? ' (USD)' : ''} *`}
                  >
                    <Input
                      id={
                        terms.kind === 'FREE_PRODUCT'
                          ? 'loyalty-quantity'
                          : 'loyalty-value'
                      }
                      type="number"
                      min={terms.kind === 'FIXED' ? '0.01' : '1'}
                      max={terms.kind === 'PERCENTAGE' ? '100' : undefined}
                      step={terms.kind === 'FIXED' ? '0.01' : '1'}
                      required
                      value={
                        terms.kind === 'FREE_PRODUCT'
                          ? terms.quantity
                          : amountDraft
                      }
                      onChange={(e) =>
                        terms.kind === 'FREE_PRODUCT'
                          ? set({ quantity: Number(e.target.value) })
                          : setAmountDraft(e.target.value)
                      }
                    />
                  </Field>
                  {terms.kind === 'PERCENTAGE' && (
                    <Field
                      id="loyalty-maximum"
                      label="Maximum discount (USD) *"
                    >
                      <Input
                        id="loyalty-maximum"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={maximumDraft}
                        onChange={(e) => setMaximumDraft(e.target.value)}
                      />
                    </Field>
                  )}
                </div>
                <div className="reward-products-field">
                  {terms.kind === 'FREE_PRODUCT' ? (
                    <SearchSelect
                      label="Product and variant *"
                      value={terms.variantIds[0] ?? ''}
                      options={selectionOptions}
                      loading={products.loading}
                      onSearch={setSearch}
                      onChange={(value) =>
                        set({ variantIds: value ? [value] : [] })
                      }
                      required
                    />
                  ) : (
                    <SearchableMultiSelect
                      label="Eligible products (optional)"
                      options={selectionOptions}
                      value={terms.variantIds}
                      loading={products.loading}
                      onSearch={setSearch}
                      onChange={(value) => set({ variantIds: [...value] })}
                      placeholder="All your products"
                    />
                  )}
                  <ReadState {...products} retry={products.refresh} />
                </div>
                <div className="reward-minimum-field">
                  <Field
                    id="loyalty-minimum"
                    label="Minimum eligible product subtotal (USD) *"
                  >
                    <Input
                      id="loyalty-minimum"
                      type="number"
                      min="0"
                      max={terms.kind === 'FIXED' ? amountDraft : undefined}
                      step="0.01"
                      required
                      value={minimumDraft}
                      onChange={(e) => setMinimumDraft(e.target.value)}
                    />
                  </Field>
                  {terms.kind === 'FIXED' && (
                    <p className="reward-field-help">
                      The minimum eligible subtotal cannot exceed the discount
                      amount.
                    </p>
                  )}
                </div>
              </div>
            ) : step === 2 ? (
              <div className="reward-rules-grid">
                <div className="reward-rule-number">
                  <Field id="loyalty-points" label="Required points *">
                    <Input
                      id="loyalty-points"
                      type="number"
                      min="1"
                      step="1"
                      max="2147483647"
                      required
                      value={terms.points}
                      onChange={(e) => set({ points: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <div className="reward-rule-number">
                  <Field
                    id="loyalty-limit"
                    label="Redemptions per customer (optional)"
                    info="Leave empty to let customers redeem this reward more than once. Each redemption requires the points shown above."
                  >
                    <Input
                      id="loyalty-limit"
                      type="number"
                      min="1"
                      step="1"
                      value={terms.limit ?? ''}
                      onChange={(e) =>
                        set({
                          limit: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </Field>
                </div>
                <Field id="loyalty-start" label="Start date (optional)">
                  <Input
                    id="loyalty-start"
                    type="date"
                    value={terms.startsAt?.slice(0, 10) ?? ''}
                    onChange={(e) =>
                      set({
                        startsAt: e.target.value
                          ? e.target.value + 'T00:00:00.000Z'
                          : null,
                      })
                    }
                  />
                </Field>
                <Field id="loyalty-end" label="End date (optional)">
                  <Input
                    id="loyalty-end"
                    type="date"
                    value={
                      terms.endsAt
                        ? new Date(Date.parse(terms.endsAt) - 1)
                            .toISOString()
                            .slice(0, 10)
                        : ''
                    }
                    onChange={(e) =>
                      set({
                        endsAt: e.target.value
                          ? new Date(
                              Date.parse(e.target.value + 'T00:00:00.000Z') +
                                86400000,
                            ).toISOString()
                          : null,
                      })
                    }
                  />
                </Field>
              </div>
            ) : (
              <>
                <div className="reward-review-status">
                  <Badge tone="neutral">Draft</Badge>
                  <Badge tone="success">
                    <UtilityIcon name="check" /> Ready to publish
                  </Badge>
                </div>
                <Card spacing="contained" className="reward-review-card">
                  <div className="reward-review-overview">
                    <div className="reward-review-identity">
                      <span className="reward-review-image">
                        {terms.image ? (
                          <img
                            src={terms.image}
                            alt="Reward preview"
                            width="104"
                            height="104"
                          />
                        ) : (
                          <LoyaltyIcon name="gift" />
                        )}
                      </span>
                      <div>
                        <Badge tone="neutral">
                          <RewardTypeIcon kind={terms.kind} />{' '}
                          {rewardKindLabels[terms.kind]}
                        </Badge>
                        <h4>{terms.name}</h4>
                        {terms.description && <p>{terms.description}</p>}
                      </div>
                    </div>
                    <div className="reward-review-products">
                      <SearchableMultiSelect
                        label="Eligible products"
                        readOnly
                        value={
                          selectedProducts.length ? terms.variantIds : ['all']
                        }
                        options={
                          selectedProducts.length
                            ? selectedProducts
                            : [{ value: 'all', label: 'All your products' }]
                        }
                      />
                    </div>
                  </div>
                  <dl className="reward-review-facts">
                    <div>
                      <dt>{valueTitle}</dt>
                      <dd>
                        {terms.kind === 'FIXED'
                          ? formatMoney(terms.value, 'USD')
                          : terms.kind === 'PERCENTAGE'
                            ? `${terms.value}%`
                            : terms.quantity}
                      </dd>
                    </div>
                    {terms.kind === 'PERCENTAGE' && (
                      <div>
                        <dt>Maximum discount</dt>
                        <dd>{formatMoney(terms.maximum, 'USD')}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Minimum subtotal</dt>
                      <dd>{formatMoney(terms.minimum, 'USD')}</dd>
                    </div>
                    <div>
                      <dt>Required points</dt>
                      <dd>{terms.points.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Start date</dt>
                      <dd>{reviewDate(terms.startsAt, 'Immediately')}</dd>
                    </div>
                    <div>
                      <dt>End date</dt>
                      <dd>{reviewDate(terms.endsAt, 'No end date', true)}</dd>
                    </div>
                    <div>
                      <dt>Redemptions per customer</dt>
                      <dd>{terms.limit ?? 'Unlimited'}</dd>
                    </div>
                  </dl>
                </Card>
                <p className="reward-field-help">
                  One reward per vendor order. Cannot be combined with your
                  coupons. Published edits preserve previously issued reward
                  terms.
                </p>
                {terms.kind === 'FREE_PRODUCT' && (
                  <p className="reward-field-help">
                    The selected variant and additional paid merchandise from
                    your business must already be in the cart. Normal
                    availability, stock, tax and fulfillment checks apply.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="reward-wizard-actions">
            <FarmstandButton
              type="button"
              variant="secondary"
              disabled={step === 0 && !onCancel}
              onClick={() => {
                setError('');
                if (step > 0) moveToStep(step - 1);
                else onCancel?.();
              }}
            >
              <FarmstandIcon name="arrow-right" />
              Back
            </FarmstandButton>
            <div>
              {step === 3 && (
                <FarmstandButton
                  type="submit"
                  name="status"
                  value="DRAFT"
                  variant="secondary"
                  disabled={busy || uncertain}
                >
                  Save as draft
                </FarmstandButton>
              )}
              <FarmstandButton
                type="submit"
                name="status"
                value="ACTIVE"
                loading={busy}
                disabled={uncertain && step === 3}
              >
                {step === 3 ? (
                  <>
                    <UtilityIcon name="check" />
                    Publish reward
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
