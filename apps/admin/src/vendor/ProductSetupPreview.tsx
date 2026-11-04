import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { AppError, readProductInformation } from '@market/api';
import { formatMoney } from '@market/config';
import {
  defaultStorefrontAppearance,
  storefrontThemeVariables,
} from '@market/theme/storefront';
import { Alert, Button, Field, Input, Select } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import { FarmstandButton, FarmstandIcon } from '@market/ui/farmstand';
import '@market/ui/harvest-product.css';
import { CommandForm, go, ReadState, useRead } from './common';
import type { CatalogProduct, VendorService } from './service';

/** React preview adapter: authorized drafts cannot use the public Astro product route.
 * Reuses Harvest's CSS, theme tokens and shared controls without a commerce controller. */
export function ProductSetupPreview({
  service,
  id,
}: {
  service: VendorService;
  id: string;
}) {
  const read = useCallback(() => service.product(id), [service, id]);
  const query = useRead(`product-setup-preview:${id}`, read);
  const [selected, setSelected] = useState(
    () => new URL(window.location.href).searchParams.get('variant') ?? '',
  );
  const [photo, setPhoto] = useState('');
  const readImages = useCallback(
    () => service.categories?.images() ?? Promise.resolve([]),
    [service],
  );
  const images = useRead(`product-setup-images:${id}`, readImages);
  const product = query.data;
  useEffect(() => {
    if (product?.enabled) {
      window.history.replaceState(
        window.history.state,
        '',
        `/vendor/products/${encodeURIComponent(id)}`,
      );
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [product?.enabled, id]);
  const variant =
    product?.variants.find((item) => item.id === selected) ??
    product?.variants[0];
  const base = `/vendor/products/${encodeURIComponent(id)}/setup`;
  const ids = variant?.assetIds ?? product?.assetIds ?? [];
  const assets = ids.flatMap((assetId) => {
    const asset = images.data?.find((item) => item.id === assetId);
    return asset && safePreview(asset.preview) ? [asset] : [];
  });
  const primary = assets.find((asset) => asset.id === photo) ?? assets[0];
  const info = readProductInformation(
    variant?.productInformation === undefined
      ? product?.productInformation
      : variant?.productInformation,
  );
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
    <div className="product-editor product-setup-preview">
      <ReadState {...query} retry={query.refresh} />
      {product && (
        <>
          <CommandForm
            embedded
            title="Preview product"
            header={
              <div className="product-editor-heading">
                <h1>Preview product</h1>
              </div>
            }
            className="product-editor-command"
            submitClassName="farmstand-button"
            submitLabel="Publish"
            headerControls={(disabled) => (
              <>
                <FarmstandButton
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => go(`${base}/variants/new`)}
                >
                  <FarmstandIcon name="plus" />
                  Add variant
                </FarmstandButton>
                {product.variants.map((item) => (
                  <FarmstandButton
                    key={item.id}
                    variant="secondary"
                    disabled={disabled}
                    onClick={() =>
                      go(`${base}/variants/${encodeURIComponent(item.id)}`)
                    }
                  >
                    Edit {item.name}
                  </FarmstandButton>
                ))}
                <FarmstandButton
                  variant="secondary"
                  disabled={disabled}
                  onClick={() =>
                    go(
                      `${base}${variant ? `?variant=${encodeURIComponent(variant.id)}` : ''}`,
                    )
                  }
                >
                  Edit Product
                </FarmstandButton>
              </>
            )}
            disableUntilValid
            validate={() => {
              if (!product.variants.some((item) => item.enabled))
                throw new AppError('validation');
            }}
            run={() => service.updateProduct(id, publicationInput(product))}
            onDone={() => go(`/vendor/products/${encodeURIComponent(id)}`)}
          >
            <p>
              This is a basic preview of your product. Visuals are subject to
              change according to the chosen storefront theme. Review this
              preview, then publish when you are ready
            </p>
            {!product.variants.some((item) => item.enabled) && (
              <Alert severity="warning">
                Enable at least one variant before publishing.
              </Alert>
            )}
          </CommandForm>
          <ReadState {...images} retry={images.refresh} />
          <section
            className="vendor-product product-harvest-preview"
            aria-label="Harvest product preview"
            style={
              storefrontThemeVariables(
                defaultStorefrontAppearance,
              ) as CSSProperties
            }
          >
            <div className="product-detail">
              <div className="product-gallery">
                {primary ? (
                  <img
                    className="product-media"
                    src={primary.preview}
                    alt={`${product.name}${variant ? ` (${variant.name})` : ''}`}
                    width="1000"
                    height="1000"
                  />
                ) : (
                  <div
                    className="product-media product-placeholder"
                    role="img"
                    aria-label={`${product.name}: no image`}
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
                        <img
                          src={asset.preview}
                          alt=""
                          width="90"
                          height="90"
                        />
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="product-summary">
                <h2>{product.name}</h2>
                <p className="product-price" aria-live="polite">
                  {variant
                    ? formatMoney(variant.price, variant.currency)
                    : 'Add a variant to set a price'}
                </p>
                <p className="product-description">
                  {plainText(variant?.description ?? product.description)}
                </p>
                <div className="purchase-form">
                  <Field id="setup-preview-variant" label="Product option">
                    <Select
                      id="setup-preview-variant"
                      value={variant?.id ?? ''}
                      onChange={(event) => {
                        setSelected(event.currentTarget.value);
                        setPhoto('');
                        const url = new URL(window.location.href);
                        url.searchParams.set(
                          'variant',
                          event.currentTarget.value,
                        );
                        window.history.replaceState(
                          window.history.state,
                          '',
                          url.pathname + url.search,
                        );
                      }}
                    >
                      {product.variants.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {!item.enabled ? ' (disabled)' : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field id="setup-preview-quantity" label="Quantity">
                    <Input
                      id="setup-preview-quantity"
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
        </>
      )}
    </div>
  );
}

function publicationInput(product: CatalogProduct) {
  // Omit unrelated settings so publication preserves the backend's saved catalog data.
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    enabled: true,
  };
}

function safePreview(value: string) {
  return (
    /^https?:\/\//i.test(value) ||
    (value.startsWith('/') && !value.startsWith('//'))
  );
}

function plainText(value: string) {
  const document = new DOMParser().parseFromString(value, 'text/html');
  return document.body.textContent ?? '';
}
