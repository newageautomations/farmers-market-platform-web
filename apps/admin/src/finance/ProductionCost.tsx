import { useCallback, useId } from 'react';
import { Field, Input } from '@market/ui';
import { parsePrice } from '@market/config';
import type { FinanceApi } from '@market/api';
import { CommandForm, ReadState, useRead } from '../vendor/common';
export function minorDecimal(value: number, currency: string) {
  const digits =
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  return (value / 10 ** digits).toFixed(digits);
}
export function ProductionCost({
  api,
  variantId,
  currency,
}: {
  api: FinanceApi;
  variantId: string;
  currency: string;
}) {
  const id = useId(),
    read = useCallback(() => api.costs(variantId), [api, variantId]),
    query = useRead(`cost:${variantId}`, read);
  return (
    <>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <CommandForm
          key={query.data[0]?.id ?? 'unknown'}
          embedded
          title="Production cost"
          run={(data) =>
            api.setCost(
              variantId,
              String(data.get('cost')).trim()
                ? parsePrice(String(data.get('cost')), currency)
                : null,
            )
          }
          onDone={query.refresh}
        >
          <Field
            id={id}
            label={`Cost to produce (${currency}, optional)`}
            info="Private to vendor finance. Changes apply to future sales; past sales keep their recorded cost. Blank means unknown."
          >
            <Input
              id={id}
              name="cost"
              inputMode="decimal"
              defaultValue={
                query.data[0]?.unitCost == null
                  ? ''
                  : minorDecimal(query.data[0].unitCost, currency)
              }
            />
          </Field>
          {!!query.data.length && (
            <details>
              <summary>Cost history</summary>
              <ul>
                {query.data.map((c) => (
                  <li key={c.id}>
                    {c.unitCost == null
                      ? 'Unknown'
                      : `${c.currency} ${minorDecimal(c.unitCost, c.currency)}`}{' '}
                    · {new Date(c.effectiveAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CommandForm>
      )}
    </>
  );
}
