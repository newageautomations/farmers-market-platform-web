import { ProductImages } from './ProductImages';
import { ProductInformationFields } from './ProductInformationFields';
import { ProductClassificationFields } from './ProductClassificationFields';
import { classificationInput } from './product-taxonomy';
import { parseTaxPercent, TaxRateField } from './tax';
import { StockAdjustmentDialog } from './StockAdjustmentDialog';
import { CatalogWorkspace, readCatalogInventory } from './CatalogWorkspace';
import { disclosureClassName } from '@market/ui/presentation';
import {
  useCallback,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { mayCommand } from '@market/admin-core';
import { AppError, type ProductInput } from '@market/api';
import { formatMoney, parsePrice } from '@market/config';
import {
  Alert,
  Badge,
  Select,
  Checkbox,
  Field,
  Input,
  InfoTip,
  Tooltip,
  Textarea,
  UtilityIcon,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
} from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import './product-editor.css';
import { ProductSetupPreview } from './ProductSetupPreview';
import {
  type VendorService,
  type CatalogProduct,
  type CatalogVariant,
} from './service';
import {
  CommandForm,
  DataTable,
  ReadState,
  TextField,
  go,
  text,
  useRead,
} from './common';

function ProductHeading({
  title,
  back = '/vendor/products',
  info,
}: {
  title: string;
  back?: string;
  info?: string;
}) {
  return (
    <div className="product-editor-heading">
      <FarmstandLink
        href={back}
        variant="secondary"
        iconOnly
        aria-label={
          back === '/vendor/products' ? 'Back to products' : 'Back to product'
        }
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (
            event.button === 0 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            !event.altKey
          ) {
            event.preventDefault();
            go(back);
          }
        }}
      >
        <span className="product-back-arrow">
          <FarmstandIcon name="arrow-right" />
        </span>
      </FarmstandLink>
      <h1>{title}</h1>
      {info && <InfoTip label={title} text={info} />}
    </div>
  );
}

function ProductEnabledSwitch({
  enabled = true,
  disabled,
  name = 'enabled',
  form,
}: {
  enabled?: boolean;
  disabled: boolean;
  name?: string;
  form?: string;
}) {
  const [checked, setChecked] = useState(enabled);
  return (
    <label className="product-enabled-switch">
      <Checkbox
        name={name}
        form={form}
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => setChecked(event.currentTarget.checked)}
      />
      <span className="product-enabled-track" aria-hidden="true" />
      <span>{checked ? 'Enabled' : 'Disabled'}</span>
    </label>
  );
}

export function productInput(data: FormData): ProductInput {
  const name = text(data, 'name'),
    slug = text(data, 'slug'),
    description = String(data.get('description') ?? '');
  if (
    !name ||
    name.length > 200 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 120 ||
    description.length > 10000
  )
    throw new AppError('validation');
  if (data.getAll('categoryImagePending').some((v) => v === 'true'))
    throw new AppError('validation');
  return {
    name,
    slug,
    description,
    enabled: data.has('enabled'),
    productInformation: String(data.get('productInformation') ?? ''),
    ...(data.has('productAssetsLoaded')
      ? { assetIds: data.getAll('assetIds').map(String).filter(Boolean) }
      : {}),
    ...classificationInput(data),
    ...(data.has('taxChanged')
      ? {
          collectTaxes: data.has('collectTaxes'),
          taxOverride: data.has('overrideTax')
            ? parseTaxPercent(data.get('taxOverride'))
            : null,
        }
      : {}),
  };
}
/** Controlled identity fields reuse Field/Input to keep dependent slug updates in sync. */
function ProductIdentityFields({ product }: { product?: CatalogProduct }) {
  const id = useId();
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [customSlug, setCustomSlug] = useState(!!product);
  return (
    <>
      <Field id={`${id}-name`} label="Product name">
        <Input
          id={`${id}-name`}
          name="name"
          required
          maxLength={200}
          value={name}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setName(value);
            if (!customSlug)
              setSlug(
                value
                  .toLowerCase()
                  .normalize('NFKD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '')
                  .slice(0, 120)
                  .replace(/-+$/g, ''),
              );
          }}
        />
      </Field>
      <Field
        id={`${id}-slug`}
        label="Slug"
        info="This is what appears in the address bar [www.example.com/SLUG]"
      >
        <Input
          id={`${id}-slug`}
          name="slug"
          required
          maxLength={120}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={slug}
          onChange={(event) => {
            setCustomSlug(true);
            setSlug(
              event.currentTarget.value
                .toLowerCase()
                .replace(/\s/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .slice(0, 120),
            );
          }}
        />
      </Field>
    </>
  );
}

function ProductFields({
  product,
  service,
  children,
  variantFields,
}: {
  product?: CatalogProduct;
  service: VendorService;
  children?: ReactNode;
  variantFields?: ReactNode;
}) {
  const [changed, setChanged] = useState(false);
  const [override, setOverride] = useState(product?.taxOverride != null);
  const read = useCallback(() => service.taxSettings(), [service]);
  const defaults = useRead('new-product-tax-default', read, !product);
  const initial =
    product?.collectTaxes ?? defaults.data?.newProductCollectTaxes ?? false;
  return (
    <div
      className="product-editor-columns"
      onInvalidCapture={(event) => {
        let disclosure = (event.target as HTMLElement).closest('details');
        while (disclosure) {
          disclosure.open = true;
          disclosure = disclosure.parentElement?.closest('details') ?? null;
        }
      }}
    >
      <div className="product-editor-main">
        <FarmstandPanel as="section" className="product-editor-panel">
          <details
            className={disclosureClassName('product-details')}
            open={!product || !!variantFields}
            onInvalidCapture={(event) => {
              event.currentTarget.open = true;
            }}
          >
            <summary>
              <span className="product-details-heading">
                <UtilityIcon name="store" />
                <span>
                  <span className="product-information-title">
                    Product details
                  </span>
                  <span className="product-information-description">
                    Basic information about your product.
                  </span>
                </span>
              </span>
            </summary>
            <div className="product-panel-body ui-disclosure-content">
              {(changed || product?.taxConfigured) && (
                <input type="hidden" name="taxChanged" value="true" />
              )}
              {variantFields ?? (
                <div className="product-editor-name-row">
                  <ProductIdentityFields product={product} />
                </div>
              )}
              <Field id="description" label="Description">
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={product?.description}
                  maxLength={10000}
                  rows={4}
                />
              </Field>
              <Field id="collectTaxes" label="Collect taxes">
                <Checkbox
                  key={String(initial)}
                  id="collectTaxes"
                  name="collectTaxes"
                  disabled={!product && !defaults.data}
                  defaultChecked={initial}
                  onChange={() => setChanged(true)}
                />
              </Field>
              {!product && <ReadState {...defaults} retry={defaults.refresh} />}
              {product && !product.taxConfigured && (
                <p>
                  {product.collectTaxes == null
                    ? 'Variants have different existing tax settings. Those settings remain until you change these tax controls.'
                    : 'Existing variant tax settings remain until you change these tax controls.'}
                </p>
              )}
              <details className={disclosureClassName()}>
                <summary>Advanced settings</summary>
                <div className="stack ui-disclosure-content">
                  <Field id="overrideTax" label="Override tax rate">
                    <Checkbox
                      id="overrideTax"
                      name="overrideTax"
                      checked={override}
                      onChange={(e) => {
                        setOverride(e.currentTarget.checked);
                        setChanged(true);
                      }}
                    />
                  </Field>
                  {override && (
                    <div onChange={() => setChanged(true)}>
                      <TaxRateField
                        name="taxOverride"
                        label="Custom rate (%)"
                        value={product?.taxOverride ?? null}
                        required
                      />
                    </div>
                  )}
                </div>
              </details>
            </div>
          </details>
        </FarmstandPanel>
        <FarmstandPanel as="section" className="product-editor-panel">
          <ProductInformationFields
            defaultOpen={!product || !!variantFields}
            key={product?.id ?? 'new'}
            value={product?.productInformation}
          />
        </FarmstandPanel>
        {children}
      </div>
      <aside
        className="product-editor-sidebar"
        aria-label={
          variantFields ? 'Product photos' : 'Product organization and photos'
        }
      >
        {!variantFields && (
          <FarmstandPanel
            as="section"
            className="product-editor-panel product-organization-panel"
          >
            <div className="product-panel-heading">
              <UtilityIcon name="store" />
              <div>
                <h2>Product organization</h2>
                <p>Keep your product easy to find and properly categorized.</p>
              </div>
            </div>
            <div className="product-panel-body">
              <ProductClassificationFields
                key={`${service.vendorId}:${product?.id ?? 'new'}`}
                service={service}
                productId={product?.id}
              />
            </div>
          </FarmstandPanel>
        )}
        {service.categories && (
          <FarmstandPanel as="section" className="product-editor-panel">
            <div className="product-panel-heading">
              <UtilityIcon name="arrow-up" />
              <div>
                <h2>Product photos</h2>
                <p>Add images to showcase your product.</p>
              </div>
            </div>
            <div className="product-panel-body">
              <ProductImages
                key={`images-${product?.id ?? 'new'}`}
                api={service.categories}
                ids={product?.assetIds}
              />
            </div>
          </FarmstandPanel>
        )}
      </aside>
    </div>
  );
}
export function Products({
  service,
  id,
  variantId,
  setup = false,
  preview = false,
}: {
  service: VendorService;
  id?: string;
  variantId?: string;
  setup?: boolean;
  preview?: boolean;
}) {
  if (id && setup && preview)
    return (
      <ProductSetupPreview
        key={`${service.vendorId}:${id}`}
        service={service}
        id={id}
      />
    );
  if (id && variantId)
    return (
      <VariantPage
        key={`${service.vendorId}:${id}:${variantId}`}
        service={service}
        productId={id}
        variantId={variantId}
        setup={setup}
      />
    );
  if (id === 'new') return <NewProduct service={service} />;
  if (id)
    return (
      <ProductDetail
        key={`${service.vendorId}:${id}:${setup}`}
        service={service}
        id={id}
        setup={setup}
      />
    );
  return <CatalogWorkspace service={service} />;
}

function NewProduct({ service }: { service: VendorService }) {
  const created = useRef<string | null>(null);
  return (
    <div className="product-editor">
      <CommandForm
        embedded
        header={
          <ProductHeading
            title="Create product"
            info="Enter basic product details on this page. The next step will allow you to add variants and prices."
          />
        }
        className="product-editor-command"
        submitClassName="farmstand-button product-next-button"
        protectChanges
        disableUntilValid
        title="Create product"
        validate={productInput}
        run={async (data) => {
          const receipt = await service.createProduct({
            ...productInput(data),
            enabled: false,
          });
          created.current = receipt.id;
        }}
        onDone={() => {
          if (created.current) {
            // Back returns to the saved details rather than a fresh creation form.
            window.history.replaceState(
              window.history.state,
              '',
              `/vendor/products/${encodeURIComponent(created.current)}/setup`,
            );
            go(
              `/vendor/products/${encodeURIComponent(created.current)}/setup/variants/new`,
            );
          }
        }}
        submitLabel={
          <>
            Next <FarmstandIcon name="arrow-right" />
          </>
        }
      >
        <input type="hidden" name="enabled" value="true" />
        <ProductFields service={service} />
      </CommandForm>
    </div>
  );
}
function decimal(price: number, currency: string) {
  const digits =
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const padded = String(price).padStart(digits + 1, '0');
  return digits
    ? `${padded.slice(0, -digits)}.${padded.slice(-digits)}`
    : padded;
}
function ProductDetail({
  service,
  id,
  setup: setupRequested,
}: {
  service: VendorService;
  id: string;
  setup: boolean;
}) {
  const read = useCallback(() => service.product(id), [service, id]);
  const query = useRead(`product:${id}`, read);
  const readStock = useCallback(() => readCatalogInventory(service), [service]);
  const stock = useRead(
    `product-stock:${id}`,
    readStock,
    service.context.permissions.includes('ReadOwnInventory'),
  );
  const [stockSelection, setStockSelection] = useState<
    Awaited<ReturnType<typeof readCatalogInventory>>[number] | null
  >(null);

  const setup = setupRequested && !query.data?.enabled;
  const can = mayCommand(service.context, 'ManageOwnCatalog');
  const variants = query.data && (
    <FarmstandPanel as="section" className="product-editor-variants">
      <div className="product-panel-heading">
        <div>
          <h2>Variants</h2>
          <p>Manage product sizes, weights or formats.</p>
        </div>
        {can && (
          <FarmstandButton
            size="compact"
            onClick={() =>
              go(
                `/vendor/products/${encodeURIComponent(id)}${setup ? '/setup' : ''}/variants/new`,
              )
            }
          >
            <FarmstandIcon name="plus" />
            Add variant
          </FarmstandButton>
        )}
      </div>
      <div
        className={`product-variants-table${can ? ' product-variants-editable' : ''}`}
      >
        <DataTable
          label="Owned variants"
          headings={[
            'Variant',
            'SKU',
            'Status',
            'Price',
            ...(can ? ['Actions'] : []),
          ]}
        >
          {query.data.variants.map((v) => (
            <tr key={v.id}>
              <th scope="row">{v.name}</th>
              <td>{v.sku}</td>
              <td>
                <Badge tone={v.enabled ? 'success' : 'neutral'}>
                  {v.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </td>
              <td>{formatMoney(v.price, v.currency)}</td>
              {can && (
                <td className="product-variant-actions-cell">
                  <div className="product-variant-actions">
                    <Tooltip label={`Edit ${v.name}`}>
                      <FarmstandButton
                        className="product-variant-edit"
                        variant="secondary"
                        size="compact"
                        aria-label={`Edit ${v.name}`}
                        onClick={() =>
                          go(
                            `/vendor/products/${encodeURIComponent(id)}${setup ? '/setup' : ''}/variants/${encodeURIComponent(v.id)}`,
                          )
                        }
                      >
                        <span className="product-variant-action-full">
                          Edit variant
                        </span>
                        <span
                          className="product-variant-action-compact"
                          aria-hidden="true"
                        >
                          <UtilityIcon name="edit" />
                        </span>
                      </FarmstandButton>
                    </Tooltip>
                    {service.context.permissions.includes(
                      'ManageOwnInventory',
                    ) && (
                      <FarmstandButton
                        aria-label={`Adjust stock for ${v.name}`}
                        variant="primary"
                        size="compact"
                        disabled={
                          !stock.data?.some((row) => row.variantId === v.id)
                        }
                        title={
                          stock.data?.some((row) => row.variantId === v.id)
                            ? undefined
                            : 'Inventory unavailable. This variant may need its stock source configured.'
                        }
                        onClick={() =>
                          setStockSelection(
                            stock.data!.find((row) => row.variantId === v.id)!,
                          )
                        }
                      >
                        <span className="product-variant-action-full">
                          Adjust stock
                        </span>
                        <span
                          className="product-variant-action-compact"
                          aria-hidden="true"
                        >
                          <UtilityIcon name="plus" />
                          Stock
                        </span>
                      </FarmstandButton>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </DataTable>
      </div>
      {!query.data.variants.length && (
        <p className="product-variants-empty">
          No variants yet. Add a variant to set its SKU and price.
        </p>
      )}
    </FarmstandPanel>
  );
  return (
    <div className="product-editor">
      {stockSelection && (
        <StockAdjustmentDialog
          row={stockSelection}
          service={service}
          readInventory={readStock}
          onClose={() => setStockSelection(null)}
          onRefresh={stock.refresh}
        />
      )}
      {!query.data && <ProductHeading title="Product" />}
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <div key={JSON.stringify(query.data)}>
          {can && (
            <CommandForm
              embedded
              header={<ProductHeading title={query.data.name} />}
              headerControls={
                setup
                  ? undefined
                  : (disabled) => (
                      <ProductEnabledSwitch
                        disabled={disabled}
                        enabled={query.data!.enabled}
                      />
                    )
              }
              className="product-editor-command"
              submitClassName="farmstand-button"
              protectChanges
              disableUntilValid
              submitLabel={setup ? 'Save and preview' : 'Save product'}
              title="Product metadata"
              validate={productInput}
              run={(data) =>
                service.updateProduct(id, {
                  ...productInput(data),
                  ...(setup ? { enabled: false } : {}),
                })
              }
              onDone={
                setup
                  ? () =>
                      go(
                        `/vendor/products/${encodeURIComponent(id)}/setup/preview${window.location.search}`,
                      )
                  : query.refresh
              }
            >
              {setup && <input type="hidden" name="enabled" value="true" />}
              <ProductFields product={query.data} service={service}>
                {variants}
              </ProductFields>
            </CommandForm>
          )}
          {!can && (
            <>
              <ProductHeading title={query.data.name} />
              <FarmstandPanel className="product-editor-panel product-readonly-panel">
                <ProductClassificationFields
                  service={service}
                  productId={id}
                  readOnly
                />
              </FarmstandPanel>
            </>
          )}
          {!can && variants}
        </div>
      )}
    </div>
  );
}
/** Currency entry composes shared Field/Input; no existing amount control supplied dollar affixes or decimal editing. */
function ProductPriceField({
  name,
  label,
  value = '',
  required = true,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
}) {
  const id = useId();
  const [amount, setAmount] = useState(value);
  return (
    <Field id={id} label={label}>
      <div className="product-price-input">
        <span aria-hidden="true">$</span>
        <Input
          id={id}
          name={name}
          value={amount}
          required={required}
          inputMode="decimal"
          pattern="[0-9]+([.][0-9]{0,2})?"
          maxLength={11}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (next.length <= 11 && /^\d*(\.\d{0,2})?$/.test(next))
              setAmount(next.startsWith('.') ? `0${next}` : next);
          }}
          onBlur={() => {
            if (!amount) return;
            const [whole, fraction = ''] = amount.split('.');
            setAmount(`${whole || '0'}.${fraction.padEnd(2, '0')}`);
          }}
        />
      </div>
    </Field>
  );
}

function VariantPage({
  service,
  productId,
  variantId,
  setup,
}: {
  service: VendorService;
  productId: string;
  variantId: string;
  setup: boolean;
}) {
  const read = useCallback(
    () => service.product(productId),
    [service, productId],
  );
  const query = useRead(`variant-product:${productId}`, read);
  const variant = query.data?.variants.find((v) => v.id === variantId);
  const creating = variantId === 'new';
  const can = mayCommand(service.context, 'ManageOwnCatalog');
  return (
    <div className="product-editor">
      {!query.data && (
        <ProductHeading
          title={creating ? 'Add variant' : 'Edit variant'}
          back={`/vendor/products/${encodeURIComponent(productId)}${setup ? '/setup' : ''}`}
        />
      )}
      <ReadState {...query} retry={query.refresh} />
      {query.data && can && (creating || variant) && (
        <VariantEditor
          key={JSON.stringify(query.data)}
          product={query.data}
          variant={variant}
          service={service}
          refresh={query.refresh}
          setup={setup && !query.data.enabled}
        />
      )}
      {query.data && !can && (
        <Alert severity="warning">
          You do not have permission to edit variants.
        </Alert>
      )}
      {query.data && !creating && !variant && (
        <Alert severity="warning">
          This variant could not be found in this product.
        </Alert>
      )}
    </div>
  );
}

/** Variant-specific name/slug composition shares the product editor and existing inputs. */
function VariantIdentityFields({
  product,
  variant,
}: {
  product: CatalogProduct;
  variant?: CatalogVariant;
}) {
  const prefix = useId();
  const [name, setName] = useState(variant?.name ?? '');
  const [slug, setSlug] = useState(variant?.slug ?? '');
  const [customSlug, setCustomSlug] = useState(!!variant);
  const slugFromName = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120)
      .replace(/-+$/g, '');
  return (
    <div className="product-editor-name-row">
      <Field id={`${prefix}-name`} label="Variant name">
        <Input
          id={`${prefix}-name`}
          name="variant-name"
          required
          maxLength={200}
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value);
            if (!customSlug) setSlug(slugFromName(event.currentTarget.value));
          }}
        />
      </Field>
      <Field
        id={`${prefix}-slug`}
        label={`Slug /${product.slug}/${slug || 'XXX'}`}
        info="This is what appears in the address bar [www.example.com/SLUG]"
      >
        <Input
          id={`${prefix}-slug`}
          name="variant-slug"
          aria-label="Variant slug"
          value={slug}
          required
          maxLength={120}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          onChange={(event) => {
            setCustomSlug(true);
            setSlug(
              event.currentTarget.value
                .toLowerCase()
                .replace(/\s/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .slice(0, 120),
            );
          }}
        />
      </Field>
    </div>
  );
}

function variantMetadata(data: FormData) {
  const name = text(data, 'variant-name'),
    sku = text(data, 'sku'),
    slug = text(data, 'variant-slug');
  const description = String(data.get('description') ?? '');
  if (
    !name ||
    name.length > 200 ||
    !sku ||
    sku.length > 200 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 120 ||
    description.length > 10000 ||
    data.getAll('categoryImagePending').includes('true')
  )
    throw new AppError('validation');
  return {
    name,
    sku,
    slug,
    description,
    enabled: data.has('enabled'),
    productInformation: String(data.get('productInformation') ?? ''),
    ...(data.has('productAssetsLoaded')
      ? { assetIds: data.getAll('assetIds').map(String).filter(Boolean) }
      : {}),
    ...(data.has('taxChanged')
      ? {
          collectTaxes: data.has('collectTaxes'),
          taxOverride: data.has('overrideTax')
            ? parseTaxPercent(data.get('taxOverride'))
            : null,
        }
      : {}),
  };
}

function VariantEditor({
  product,
  variant: v,
  service,
  refresh,
  setup,
}: {
  product: CatalogProduct;
  variant?: CatalogVariant;
  service: VendorService;
  refresh: () => void;
  setup: boolean;
}) {
  const finance =
    service.finance &&
    service.context.permissions.includes('ReadOwnVendorFinance')
      ? service.finance
      : undefined;
  const readCosts = useCallback(
    () => (finance && v ? finance.costs(v.id) : Promise.resolve([])),
    [finance, v],
  );
  const costs = useRead(`variant-cost:${v?.id ?? 'new'}`, readCosts);
  const [savedParts, setSavedParts] = useState<string[]>([]);
  const destination = useRef<string | null>(null);
  const createdVariant = useRef<string | null>(null);
  const currentCost = costs.data?.[0]?.unitCost ?? null;
  const source = v
    ? {
        ...product,
        description: v.description ?? product.description,
        productInformation:
          v.productInformation === undefined
            ? product.productInformation
            : v.productInformation,
        assetIds: v.assetIds ?? product.assetIds,
        collectTaxes: v.collectTaxes ?? product.collectTaxes,
        taxOverride: v.taxConfigured
          ? (v.taxOverride ?? null)
          : product.taxOverride,
        taxConfigured: v.taxConfigured ?? product.taxConfigured,
      }
    : product;
  const back = `/vendor/products/${encodeURIComponent(product.id)}${setup ? '/setup' : ''}`;
  return (
    <>
      <ReadState {...costs} retry={costs.refresh} />
      {costs.data && (
        <CommandForm
          embedded
          header={
            <ProductHeading
              title={v ? v.name : 'Add variant'}
              back={back}
              info="A variant is a version of your product, such as a different size, weight or flavor. Each variant has its own SKU, price and optional photos and details."
            />
          }
          headerControls={(disabled) => (
            <ProductEnabledSwitch
              enabled={v?.enabled ?? true}
              disabled={disabled}
            />
          )}
          className="product-editor-command"
          submitClassName="farmstand-button"
          protectChanges
          disableUntilValid
          title={v ? 'Edit variant' : 'Add variant'}
          submitLabel={
            setup
              ? v
                ? 'Save and preview'
                : 'Publish product'
              : v
                ? 'Save variant'
                : 'Add variant'
          }
          secondaryAction={
            setup && !v
              ? (disabled) => (
                  <FarmstandButton
                    type="submit"
                    variant="secondary"
                    disabled={disabled}
                    name="setup-action"
                    value="additional"
                  >
                    <FarmstandIcon name="plus" />
                    Additional variant
                  </FarmstandButton>
                )
              : undefined
          }
          validate={(data) => {
            variantMetadata(data);
            parsePrice(text(data, 'price'), product.currency);
            if (text(data, 'cost'))
              parsePrice(text(data, 'cost'), product.currency);
          }}
          run={async (data) => {
            const metadata = variantMetadata(data),
              price = parsePrice(text(data, 'price'), product.currency);
            const cost = text(data, 'cost')
              ? parsePrice(text(data, 'cost'), product.currency)
              : null;
            if (!v) {
              const input = {
                ...metadata,
                productId: product.id,
                price,
                collectTaxes: data.has('collectTaxes'),
                taxOverride: data.has('overrideTax')
                  ? parseTaxPercent(data.get('taxOverride'))
                  : null,
                optionIds: product.optionGroups.map((group) =>
                  text(data, `option-${group.id}`),
                ),
              };
              const receipt =
                finance && cost !== null
                  ? await finance.createVariant(input, cost)
                  : await service.createVariant(input);
              createdVariant.current = receipt.id;
              destination.current = setup
                ? data.get('setup-action') === 'additional'
                  ? `${back}/variants/new`
                  : `${back}/preview?variant=${encodeURIComponent(receipt.id)}`
                : `${back}/variants/${encodeURIComponent(receipt.id)}`;
              return;
            }
            await service.updateVariant(v.id, metadata);
            setSavedParts((parts) => [...parts, 'variant details']);
            if (price !== v.price) {
              await service.price(v.id, price);
              setSavedParts((parts) => [...parts, 'price']);
            }
            if (finance && cost !== currentCost) {
              await finance.setCost(v.id, cost);
              setSavedParts((parts) => [...parts, 'production cost']);
            }
          }}
          onDone={() => {
            if (setup && v)
              go(`${back}/preview?variant=${encodeURIComponent(v.id)}`);
            else if (destination.current) {
              const samePage = destination.current === window.location.pathname;
              if (setup && createdVariant.current)
                window.history.replaceState(
                  window.history.state,
                  '',
                  `${back}/variants/${encodeURIComponent(createdVariant.current)}`,
                );
              go(destination.current);
              if (samePage) refresh();
            } else if (v) refresh();
          }}
        >
          <ProductFields
            product={source}
            service={service}
            variantFields={
              <>
                <VariantIdentityFields product={product} variant={v} />
                <div className="product-editor-name-row">
                  <TextField
                    name="sku"
                    label="SKU"
                    value={v?.sku}
                    maxLength={200}
                  />
                  <ProductPriceField
                    name="price"
                    label="Price"
                    value={v ? decimal(v.price, product.currency) : ''}
                  />
                  {finance && (
                    <ProductPriceField
                      name="cost"
                      label="Cost to produce (optional)"
                      value={
                        currentCost == null
                          ? ''
                          : decimal(currentCost, product.currency)
                      }
                      required={false}
                    />
                  )}
                </div>
                {!v &&
                  product.optionGroups.map((group) => (
                    <Field
                      key={group.id}
                      id={`option-${group.id}`}
                      label={group.name}
                    >
                      <Select
                        id={`option-${group.id}`}
                        name={`option-${group.id}`}
                        required
                      >
                        <option value="">Choose an option</option>
                        {group.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ))}
                {finance && !!costs.data.length && (
                  <details className={disclosureClassName()}>
                    <summary>Cost history</summary>
                    <ul>
                      {costs.data.map((entry) => (
                        <li key={entry.id}>
                          {entry.unitCost == null
                            ? 'Unknown'
                            : formatMoney(entry.unitCost, product.currency)}
                          {' · '}
                          {new Date(entry.effectiveAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            }
          />
        </CommandForm>
      )}
      {!!savedParts.length && (
        <Alert severity="info">
          Saved {savedParts.join(', ')}. If another change fails, check current
          records before trying again.
        </Alert>
      )}
    </>
  );
}
