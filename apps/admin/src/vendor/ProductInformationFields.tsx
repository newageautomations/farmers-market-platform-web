import { useId, useState } from 'react';
import { Button, Checkbox, Field, Input, Textarea } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import { readProductInformation, type ProductInformation } from '@market/api';

/** Product form composition. Shared fields/disclosures supply all primitive presentation. */
export function ProductInformationFields({ value }: { value?: string | null }) {
  const prefix = useId();
  const [info, setInfo] = useState(() => readProductInformation(value));
  const update = (patch: Partial<ProductInformation>) =>
    setInfo((v) => ({ ...v, ...patch }));
  const custom = (
    index: number,
    patch: Partial<ProductInformation['custom'][number]>,
  ) =>
    update({
      custom: info.custom.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    });
  return (
    <details className={disclosureClassName()}>
      <summary>Additional product information</summary>
      <div className="stack ui-disclosure-content">
        <input
          type="hidden"
          name="productInformation"
          value={JSON.stringify(info)}
        />
        <Field
          id={`${prefix}-pickupEnabled`}
          label="Show market pickup information"
        >
          <Checkbox
            id={`${prefix}-pickupEnabled`}
            checked={info.pickupEnabled}
            onChange={(e) => update({ pickupEnabled: e.target.checked })}
          />
        </Field>
        {(['ingredients', 'allergens', 'storage', 'pickup'] as const).map(
          (key) => {
            const title = {
              ingredients: 'Ingredients',
              allergens: 'Allergens',
              storage: 'Storage & Care',
              pickup: 'Product-specific pickup instructions',
            }[key];
            return (
              <div className="stack" key={key}>
                <Field
                  id={`${prefix}-${key}-enabled`}
                  label={`Show ${title.toLowerCase()}`}
                >
                  <Checkbox
                    id={`${prefix}-${key}-enabled`}
                    checked={info[key].enabled}
                    onChange={(e) =>
                      update({
                        [key]: { ...info[key], enabled: e.target.checked },
                      })
                    }
                  />
                </Field>
                <Field id={`${prefix}-${key}`} label={title}>
                  <Textarea
                    id={`${prefix}-${key}`}
                    rows={4}
                    maxLength={8000}
                    value={info[key].content}
                    onChange={(e) =>
                      update({
                        [key]: { ...info[key], content: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>
            );
          },
        )}
        {info.custom.map((entry, index) => (
          <details key={index} className={disclosureClassName()} open>
            <summary>{entry.title || 'New information section'}</summary>
            <div className="stack ui-disclosure-content">
              <Field id={`${prefix}-title-${index}`} label="Section title">
                <Input
                  id={`${prefix}-title-${index}`}
                  required
                  maxLength={100}
                  value={entry.title}
                  onChange={(e) => custom(index, { title: e.target.value })}
                />
              </Field>
              <Field id={`${prefix}-content-${index}`} label="Section content">
                <Textarea
                  id={`${prefix}-content-${index}`}
                  required
                  maxLength={8000}
                  rows={6}
                  value={entry.content}
                  onChange={(e) => custom(index, { content: e.target.value })}
                />
              </Field>
              <Field id={`${prefix}-enabled-${index}`} label="Show section">
                <Checkbox
                  id={`${prefix}-enabled-${index}`}
                  checked={entry.enabled}
                  onChange={(e) => custom(index, { enabled: e.target.checked })}
                />
              </Field>
              <div className="ui-actions">
                <Button
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...info.custom];
                    [next[index - 1], next[index]] = [
                      next[index]!,
                      next[index - 1]!,
                    ];
                    update({ custom: next });
                  }}
                >
                  Move up
                </Button>
                <Button
                  variant="secondary"
                  disabled={index === info.custom.length - 1}
                  onClick={() => {
                    const next = [...info.custom];
                    [next[index], next[index + 1]] = [
                      next[index + 1]!,
                      next[index]!,
                    ];
                    update({ custom: next });
                  }}
                >
                  Move down
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${entry.title || 'this information section'}?`,
                      )
                    )
                      update({
                        custom: info.custom.filter((_, i) => i !== index),
                      });
                  }}
                >
                  Delete section
                </Button>
              </div>
            </div>
          </details>
        ))}
        <Button
          variant="secondary"
          disabled={info.custom.length >= 12}
          onClick={() =>
            update({
              custom: [
                ...info.custom,
                { title: '', content: '', enabled: true },
              ],
            })
          }
        >
          Add Information Section
        </Button>
        <p>
          Optional plain text. Line breaks are preserved. Hiding a section keeps
          its content. Market schedules come from the selected pickup market.
        </p>
      </div>
    </details>
  );
}
