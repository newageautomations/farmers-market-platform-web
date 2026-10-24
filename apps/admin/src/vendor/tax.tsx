import { useCallback } from 'react';
import { AppError } from '@market/api';
import { Field, Input } from '@market/ui';
import { CommandForm, ReadState, useRead } from './common';
import type { VendorService } from './service';

export function parseTaxPercent(value: FormDataEntryValue | null): number {
  const raw = String(value ?? '').trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(raw) || Number(raw) > 100)
    throw new AppError('validation', 'VENDOR_TAX_RATE_INVALID');
  return Number(raw);
}
export function TaxRateField({
  name,
  label,
  value,
  required = false,
}: {
  name: string;
  label: string;
  value: number | null;
  required?: boolean;
}) {
  return (
    <Field id={name} label={label}>
      <Input
        id={name}
        name={name}
        type="number"
        min="0"
        max="100"
        step="0.01"
        required={required}
        defaultValue={value ?? ''}
      />
    </Field>
  );
}
export function VendorTaxSettings({ service }: { service: VendorService }) {
  const read = useCallback(() => service.taxSettings(), [service]);
  const query = useRead(`vendor-tax:${service.vendorId}`, read);
  const settings = query.data;
  const input = (data: FormData) => ({
    version: settings!.version,
    defaultRate:
      String(data.get('defaultRate') ?? '').trim() === ''
        ? null
        : parseTaxPercent(data.get('defaultRate')),
    markets: settings!.markets.map((m) => ({
      marketId: m.id,
      rate:
        String(data.get(`market-${m.id}`) ?? '').trim() === ''
          ? null
          : parseTaxPercent(data.get(`market-${m.id}`)),
    })),
  });
  return (
    <>
      <ReadState {...query} retry={query.refresh} />
      {settings && (
        <CommandForm
          key={settings.version}
          title="Taxes"
          validate={input}
          run={async (data) => {
            await service.saveTaxSettings(input(data));
          }}
          onDone={query.refresh}
          submitLabel="Save tax settings"
        >
          <p>
            You choose the applicable rates and are responsible for reporting
            and remitting collected tax. Addresses do not determine rates. Blank
            market rates inherit your default. Zero is an explicit rate.
          </p>
          <TaxRateField
            name="defaultRate"
            label="Default tax rate (%)"
            value={settings.defaultRate}
          />
          {settings.markets.map((m) => (
            <TaxRateField
              key={m.id}
              name={`market-${m.id}`}
              label={`${m.name} tax rate (%)`}
              value={m.rate}
            />
          ))}
        </CommandForm>
      )}
    </>
  );
}
