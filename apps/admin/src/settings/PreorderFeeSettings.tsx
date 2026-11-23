import { useCallback, useState } from 'react';
import { AppError } from '@market/api';
import { Field, Input, Radio } from '@market/ui';
import { formatMoney } from '@market/config';
import { PriceInput, minorToAmount } from '../PriceInput';
import { CommandForm, ReadState, useRead } from '../vendor/common';
import type { VendorService } from '../vendor/service';

export function PreorderFeeSettings({ service }: { service: VendorService }) {
  const read = useCallback(() => service.preorderFeeSettings(), [service]);
  const query = useRead(`preorder-fees:${service.vendorId}`, read);
  return (
    <>
      <ReadState skeleton="detail" {...query} retry={query.refresh} />
      {query.data && (
        <FeeForm
          key={`${service.vendorId}:${query.data.version}`}
          settings={query.data}
          service={service}
          refresh={query.refresh}
        />
      )}
    </>
  );
}
function FeeForm({
  settings,
  service,
  refresh,
}: {
  settings: Awaited<ReturnType<VendorService['preorderFeeSettings']>>;
  service: VendorService;
  refresh: () => void;
}) {
  const [mode, setMode] = useState(settings.mode);
  const [amount, setAmount] = useState(minorToAmount(settings.customAmount));
  const [percentage, setPercentage] = useState(
    minorToAmount(settings.customPercentageBps),
  );
  const [pending, setPending] = useState(false);
  const value = mode === 'PERCENTAGE' ? percentage : amount;
  const valid = /^\d+(\.\d{1,2})?$/.test(value);
  const [whole = '0', fraction = ''] = value.split('.');
  const custom = valid
    ? Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    : 0;
  const recovery = mode === 'AUTOMATIC' ? settings.example.recovery : custom;
  const platform = settings.example.platform;
  const input = () => {
    if (
      mode !== 'AUTOMATIC' &&
      (!valid ||
        custom > (mode === 'PERCENTAGE' ? 10000 : settings.maxCustomAmount))
    )
      throw new AppError('validation', 'PREORDER_CUSTOM_AMOUNT_INVALID');
    return {
      version: settings.version,
      mode,
      currency: settings.currency,
      customAmount: mode === 'CUSTOM' ? amount : '0.00',
      customPercentage: mode === 'PERCENTAGE' ? percentage : '0.00',
    };
  };
  const options: [string, string, string][] = [
    [
      'AUTOMATIC',
      'Automatically estimate processing recovery (default)',
      'We estimate card processing costs for each order.',
    ],
    ['PERCENTAGE', 'Custom percentage', 'A percentage of each order.'],
    ['CUSTOM', 'Custom fixed amount', 'The same amount on every order.'],
  ];
  const content = (
    <div className="preorder-fee-settings">
      <p className="settings-note">
        Customers will see one "Online payment fee" combining the platform fee
        (5%) and your processing recovery for online preorder checkout.
      </p>
      <fieldset
        className="preorder-fee-modes"
        disabled={!settings.editable || pending}
      >
        <legend>Your processing recovery</legend>
        {options.map(([value, label, hint]) => (
          <label key={value} className="preorder-fee-mode">
            <Radio
              name="recoveryMode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value as typeof mode)}
              aria-labelledby={`preorder-fee-mode-${value}-label`}
              aria-describedby={`preorder-fee-mode-${value}-hint`}
            />
            <span>
              <span
                id={`preorder-fee-mode-${value}-label`}
                className="preorder-fee-mode-label"
              >
                {label}
              </span>
              <small id={`preorder-fee-mode-${value}-hint`}>{hint}</small>
            </span>
          </label>
        ))}
        {mode === 'PERCENTAGE' && (
          <Field id="preorder-percentage" label="Your processing recovery (%)">
            <Input
              id="preorder-percentage"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              value={percentage}
              onChange={(e) => setPercentage(e.currentTarget.value)}
              required
            />
          </Field>
        )}
        {mode === 'CUSTOM' && (
          <Field id="preorder-recovery" label="Your processing recovery (USD)">
            <PriceInput
              id="preorder-recovery"
              value={amount}
              onValueChange={setAmount}
              required
            />
          </Field>
        )}
      </fieldset>
      <section
        className="preorder-fee-example"
        aria-labelledby="preorder-fee-example-title"
      >
        <div>
          <h3 id="preorder-fee-example-title">Example on a $100.00 purchase</h3>
          <p className="settings-note">No tax or pickup charges.</p>
        </div>
        <dl className="provider-facts" aria-label="Online payment fee example">
          <div>
            <dt>Product subtotal</dt>
            <dd>{formatMoney(10000, 'USD')}</dd>
          </div>
          <div className="preorder-fee-part">
            <dt>
              Platform fee (5%)
              <small>Not shown separately to customers</small>
            </dt>
            <dd>{formatMoney(platform, 'USD')}</dd>
          </div>
          <div className="preorder-fee-part">
            <dt>
              Your processing recovery
              <small>Not shown separately to customers</small>
            </dt>
            <dd>{formatMoney(recovery, 'USD')}</dd>
          </div>
          <div className="preorder-fee-subtotal">
            <dt>Online payment fee</dt>
            <dd>{formatMoney(platform + recovery, 'USD')}</dd>
          </div>
          <div className="preorder-fee-total">
            <dt>Final customer charge</dt>
            <dd>{formatMoney(10000 + platform + recovery, 'USD')}</dd>
          </div>
        </dl>
      </section>
      <p className="settings-note">
        Percentages apply to discounted merchandise before tax and pickup.
        Stripe deducts actual processing costs from your connected account; your
        processing recovery may not cover them. Automatic amounts are estimates.
        Collection remains disabled.
      </p>
      {!settings.editable && (
        <p className="settings-note">
          Only owners and authorized business administrators can change these
          settings.
        </p>
      )}
    </div>
  );
  return settings.editable ? (
    <CommandForm
      title="Online payment fee settings"
      embedded
      hideTitle
      submitLabel="Save online payment fee settings"
      validate={input}
      run={async () => {
        await service.savePreorderFeeSettings(input());
      }}
      onDone={refresh}
      onPendingChange={setPending}
    >
      {content}
    </CommandForm>
  ) : (
    content
  );
}
