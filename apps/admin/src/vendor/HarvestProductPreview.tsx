import { useState, type CSSProperties } from 'react';
import { readProductInformation } from '@market/api';
import { formatMoney } from '@market/config';
import {
  defaultStorefrontAppearance,
  storefrontThemeVariables,
} from '@market/theme/storefront';
import { Button, Field, Input, Select } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import '@market/ui/harvest-product.css';
import './harvest-product-preview.css';

export interface PreviewVariant {
  id: string;
  name: string;
  /** Minor units; null when the price is unavailable. */
  price: number | null;
  currency: string | null;
  enabled?: boolean;
  /** Stored HTML description; rendered as plain text. */
  description: string;
  productInformation: string | null | undefined;
  images: ReadonlyArray<{ id: string; preview: string }>;
}

/**
 * Read-only Harvest product page presentation, shared by the Vendor's
 * product setup preview and the Market's listing review. Reuses Harvest's
 * CSS and theme tokens; purchase controls are inert.
 */
export function HarvestProductPreview({
  name,
  variants,
  variantId,
  onVariantChange,
  idPrefix = 'product-preview',
}: {
  name: string;
  variants: readonly PreviewVariant[];
  variantId?: string;
  onVariantChange?: (id: string) => void;
  idPrefix?: string;
}) {
  const [photo, setPhoto] = useState('');
  const variant =
    variants.find((item) => item.id === variantId) ?? variants[0];
  const assets = (variant?.images ?? []).filter((asset) =>
    safePreview(asset.preview),
  );
  const primary = assets.find((asset) => asset.id === photo) ?? assets[0];
  const info = readProductInformation(variant?.productInformation);
  const entries = [
    { title: 'Ingredients', ...info.ingredients },
    { title: 'Allergens', ...info.allergens },
    { title: 'Storage & Care', ...info.storage },
    {
      title: 'Pickup Information',
      ...info.pickup,
      enabled: info.pickupEnabled && info.pickup.enabled,
    },
    ...info.custom,
  ].filter(
    (entry) => entry.enabled && entry.title.trim() && entry.content.trim(),
  );
  return (
    <section
      className="vendor-product product-harvest-preview"
      aria-label="Harvest product preview"
      style={
        storefrontThemeVariables(defaultStorefrontAppearance) as CSSProperties
      }
    >
      <div className="product-detail">
        <div className="product-gallery">
          {primary ? (
            <img
              className="product-media"
              src={primary.preview}
              alt={`${name}${variant ? ` (${variant.name})` : ''}`}
              width="1000"
              height="1000"
            />
          ) : (
            <div
              className="product-media product-placeholder"
              role="img"
              aria-label={`${name}: no image`}
            >
              No image
            </div>
          )}
          {assets.length > 1 && (
            <div
              className="product-thumbnails"
              role="group"
              aria-label="Product photographs"
            >
              {assets.map((asset, index) => (
                <Button
                  key={asset.id}
                  variant="secondary"
                  aria-label={`View photograph ${index + 1}`}
                  aria-pressed={asset.id === primary?.id}
                  onClick={() => setPhoto(asset.id)}
                >
                  <img src={asset.preview} alt="" width="90" height="90" />
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="product-summary">
          <h2>{name}</h2>
          <p className="product-price" aria-live="polite">
            {variant && variant.price !== null && variant.currency
              ? formatMoney(variant.price, variant.currency)
              : variant
                ? 'Price unavailable'
                : 'Add a variant to set a price'}
          </p>
          <p className="product-description">
            {plainText(variant?.description ?? '')}
          </p>
          <div className="purchase-form">
            <Field id={`${idPrefix}-variant`} label="Product option">
              <Select
                id={`${idPrefix}-variant`}
                value={variant?.id ?? ''}
                disabled={!onVariantChange}
                onChange={(event) => {
                  setPhoto('');
                  onVariantChange?.(event.currentTarget.value);
                }}
              >
                {variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.enabled === false ? ' (disabled)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id={`${idPrefix}-quantity`} label="Quantity">
              <Input
                id={`${idPrefix}-quantity`}
                type="number"
                value="1"
                disabled
              />
            </Field>
            <Button disabled>Add to cart</Button>
            {!!entries.length && (
              <div
                className="product-information"
                aria-label="Product information"
              >
                {entries.map((entry, index) => (
                  <details
                    key={`${variant?.id}:${index}`}
                    className={disclosureClassName()}
                  >
                    <summary>{entry.title}</summary>
                    <div className="ui-disclosure-content product-information-text">
                      {entry.content}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function safePreview(value: string) {
  return (
    /^https?:\/\//i.test(value) ||
    (value.startsWith('/') && !value.startsWith('//'))
  );
}

function plainText(value: string) {
  const document = new DOMParser().parseFromString(value, 'text/html');
  return document.body.textContent ?? '';
}
