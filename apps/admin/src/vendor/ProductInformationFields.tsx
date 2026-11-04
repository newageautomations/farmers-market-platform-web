import { useId, useState } from 'react';
import { Checkbox, Input, Textarea, UtilityIcon } from '@market/ui';
import { FarmstandButton as Button, FarmstandIcon } from '@market/ui/farmstand';
import { disclosureClassName } from '@market/ui/presentation';
import { readProductInformation, type ProductInformation } from '@market/api';

/** Product form composition. Shared fields/disclosures supply all primitive presentation. */
export function ProductInformationFields({
  value,
  defaultOpen = false,
}: {
  value?: string | null;
  defaultOpen?: boolean;
}) {
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
    <details
      className={disclosureClassName('product-information')}
      open={defaultOpen}
      onInvalidCapture={(event) => {
        event.currentTarget.open = true;
      }}
    >
      <summary>
        <span>
          <span className="product-information-title">
            Additional information
          </span>
          <span className="product-information-description">
            Add optional product details to help customers make a decision.
          </span>
        </span>
      </summary>
      <div className="stack ui-disclosure-content product-information-body">
        <input
          type="hidden"
          name="productInformation"
          value={JSON.stringify(info)}
        />
        <label
          className="product-information-toggle"
          htmlFor={`${prefix}-pickupEnabled`}
        >
          <Checkbox
            id={`${prefix}-pickupEnabled`}
            checked={info.pickupEnabled}
            onChange={(e) => update({ pickupEnabled: e.target.checked })}
          />
          Show market pickup information
        </label>
        {(['ingredients', 'allergens', 'storage', 'pickup'] as const).map(
          (key) => {
            const title = {
              ingredients: 'Ingredients',
              allergens: 'Allergens',
              storage: 'Storage & care',
              pickup: 'Product-specific pickup instructions',
            }[key];
            return (
              <div className="product-information-row" key={key}>
                <label
                  className="product-information-toggle"
                  htmlFor={`${prefix}-${key}-enabled`}
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
                  {title}
                </label>
                <div
                  className="product-information-reveal"
                  data-open={info[key].enabled}
                  aria-hidden={!info[key].enabled}
                  inert={!info[key].enabled}
                >
                  <div>
                    <Textarea
                      id={`${prefix}-${key}`}
                      aria-label={title}
                      rows={2}
                      maxLength={8000}
                      disabled={!info[key].enabled}
                      value={info[key].content}
                      onChange={(e) =>
                        update({
                          [key]: { ...info[key], content: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            );
          },
        )}
        {info.custom.map((entry, index) => (
          <div key={index} className="product-information-row">
            <div className="product-information-custom-heading">
              <label
                className="product-information-toggle"
                htmlFor={`${prefix}-enabled-${index}`}
              >
                <Checkbox
                  id={`${prefix}-enabled-${index}`}
                  checked={entry.enabled}
                  onChange={(e) => custom(index, { enabled: e.target.checked })}
                />
                {entry.title || 'New information section'}
              </label>
              <Button
                variant="destructive-outline"
                size="compact"
                iconOnly
                aria-label={`Delete ${entry.title || 'information section'}`}
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
                <UtilityIcon name="trash" />
              </Button>
            </div>
            <div
              className="product-information-reveal"
              data-open={entry.enabled}
              aria-hidden={!entry.enabled}
              inert={!entry.enabled}
            >
              <div className="product-information-custom-fields">
                <div className="product-information-custom-inputs">
                  <Input
                    aria-label="Section title"
                    placeholder="Section title"
                    required
                    disabled={!entry.enabled}
                    maxLength={100}
                    value={entry.title}
                    onChange={(e) => custom(index, { title: e.target.value })}
                  />
                  <Textarea
                    aria-label={`${entry.title || 'Information section'} content`}
                    required
                    disabled={!entry.enabled}
                    maxLength={8000}
                    rows={3}
                    value={entry.content}
                    onChange={(e) => custom(index, { content: e.target.value })}
                  />
                </div>
                <div className="product-information-order">
                  <Button
                    variant="secondary"
                    size="compact"
                    iconOnly
                    aria-label={`Move ${entry.title || 'information section'} up`}
                    disabled={!entry.enabled || index === 0}
                    onClick={() => {
                      const next = [...info.custom];
                      [next[index - 1], next[index]] = [
                        next[index]!,
                        next[index - 1]!,
                      ];
                      update({ custom: next });
                    }}
                  >
                    <UtilityIcon name="arrow-up" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="compact"
                    iconOnly
                    aria-label={`Move ${entry.title || 'information section'} down`}
                    disabled={
                      !entry.enabled || index === info.custom.length - 1
                    }
                    onClick={() => {
                      const next = [...info.custom];
                      [next[index], next[index + 1]] = [
                        next[index + 1]!,
                        next[index]!,
                      ];
                      update({ custom: next });
                    }}
                  >
                    <UtilityIcon name="arrow-down" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
          <FarmstandIcon name="plus" />
          Add information section
        </Button>
        <p>
          Optional plain text. Line breaks are preserved. Hiding a section keeps
          its content. Market schedules come from the selected pickup market.
        </p>
      </div>
    </details>
  );
}
