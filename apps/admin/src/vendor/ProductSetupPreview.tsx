import { useCallback, useEffect, useState } from 'react';
import { AppError } from '@market/api';
import { Alert } from '@market/ui';
import { FarmstandButton, FarmstandIcon } from '@market/ui/farmstand';
import { HarvestProductPreview } from './HarvestProductPreview';
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
          <HarvestProductPreview
            idPrefix="setup-preview"
            name={product.name}
            variantId={variant?.id}
            onVariantChange={(value) => {
              setSelected(value);
              const url = new URL(window.location.href);
              url.searchParams.set('variant', value);
              window.history.replaceState(
                window.history.state,
                '',
                url.pathname + url.search,
              );
            }}
            variants={product.variants.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              currency: item.currency,
              enabled: item.enabled,
              description: item.description ?? product.description,
              productInformation:
                item.productInformation === undefined
                  ? product.productInformation
                  : item.productInformation,
              images: (item.assetIds ?? product.assetIds ?? []).flatMap(
                (assetId) => {
                  const asset = images.data?.find((row) => row.id === assetId);
                  return asset ? [{ id: asset.id, preview: asset.preview }] : [];
                },
              ),
            }))}
          />
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
