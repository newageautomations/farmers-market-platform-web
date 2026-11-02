import { ProductImages } from './ProductImages';
import { ProductInformationFields } from './ProductInformationFields';
import { ProductCategories } from './categories';
import { parseTaxPercent, TaxRateField } from './tax';
import { CatalogWorkspace } from './CatalogWorkspace';
import { disclosureClassName } from '@market/ui/presentation';
import { ProductionCost } from '../finance/ProductionCost';
import { useCallback, useId, useState } from 'react';
import { mayCommand } from '@market/admin-core';
import { AppError, type ProductInput } from '@market/api';
import { formatMoney, parsePrice } from '@market/config';
import { Select, Checkbox, Field, Input, Textarea } from '@market/ui';
import {
  type VendorService,
  type CatalogProduct,
  type CatalogVariant,
} from './service';
import {
  CommandForm,
  DataTable,
  ReadState,
  RouteLink,
  TextField,
  go,
  text,
  useRead,
} from './common';

function productInput(data: FormData): ProductInput {
  const name = text(data, 'name'),
    slug = text(data, 'slug'),
    description = String(data.get('description') ?? '');
  if (
    !name ||
    name.length > 200 ||
    !slug ||
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
    ...(data.has('categoriesLoaded')
      ? { categoryIds: data.getAll('categoryIds').map(String) }
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
function ProductFields({
  product,
  service,
}: {
  product?: CatalogProduct;
  service: VendorService;
}) {
  const [changed, setChanged] = useState(false);
  const [override, setOverride] = useState(product?.taxOverride != null);
  const read = useCallback(() => service.taxSettings(), [service]);
  const defaults = useRead('new-product-tax-default', read, !product);
  const initial =
    product?.collectTaxes ?? defaults.data?.newProductCollectTaxes ?? false;
  return (
    <>
      {(changed || product?.taxConfigured) && (
        <input type="hidden" name="taxChanged" value="true" />
      )}
      <TextField
        name="name"
        label="Product name"
        value={product?.name}
        maxLength={200}
      />
      <TextField
        name="slug"
        label="Slug"
        value={product?.slug}
        maxLength={120}
      />
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
        <summary>Advanced Settings</summary>
        <div className="stack">
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
      {service.categories && (
        <ProductCategories
          key={`${service.vendorId}:${product?.id ?? 'new'}`}
          service={service}
          productId={product?.id}
        />
      )}
      {service.categories && (
        <ProductImages
          key={`images-${product?.id ?? 'new'}`}
          api={service.categories}
          ids={product?.assetIds}
        />
      )}
      <ProductInformationFields
        key={product?.id ?? 'new'}
        value={product?.productInformation}
      />
      <Field id="enabled" label="Enabled">
        <Checkbox
          id="enabled"
          name="enabled"
          defaultChecked={product?.enabled ?? true}
        />
      </Field>
    </>
  );
}
export function Products({
  service,
  id,
}: {
  service: VendorService;
  id?: string;
}) {
  if (id === 'new')
    return (
      <>
        <RouteLink to="/vendor/products">Products</RouteLink>
        <CommandForm
          title="Create product"
          validate={productInput}
          run={async (data) => {
            const receipt = await service.createProduct(productInput(data));
            go(`/vendor/products/${encodeURIComponent(receipt.id)}`);
          }}
          onDone={() => undefined}
          submitLabel="Create product"
        >
          <ProductFields service={service} />
        </CommandForm>
      </>
    );
  if (id) return <ProductDetail service={service} id={id} />;
  return <CatalogWorkspace service={service} />;
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
}: {
  service: VendorService;
  id: string;
}) {
  const read = useCallback(() => service.product(id), [service, id]);
  const query = useRead(`product:${id}`, read);
  const can = mayCommand(service.context, 'ManageOwnCatalog');
  return (
    <>
      <RouteLink to="/vendor/products">Products</RouteLink>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <div key={JSON.stringify(query.data)}>
          <p>Editing {query.data.name}</p>
          {can && (
            <CommandForm
              title="Product metadata"
              validate={productInput}
              run={(data) => service.updateProduct(id, productInput(data))}
              onDone={query.refresh}
            >
              <ProductFields product={query.data} service={service} />
            </CommandForm>
          )}
          <DataTable
            label="Owned variants"
            headings={['Variant', 'SKU', 'Status', 'Canonical price']}
          >
            {query.data.variants.map((v) => (
              <tr key={v.id}>
                <th scope="row">{v.name}</th>
                <td>{v.sku}</td>
                <td>{v.enabled ? 'Enabled' : 'Disabled'}</td>
                <td>{formatMoney(v.price, v.currency)}</td>
              </tr>
            ))}
          </DataTable>
          {can &&
            query.data.variants.map((v) => (
              <VariantEditor
                key={v.id}
                variant={v}
                service={service}
                refresh={query.refresh}
              />
            ))}
          {can && (
            <CommandForm
              title="Add variant"
              submitLabel="Add variant"
              validate={(data) => {
                parsePrice(text(data, 'price'), query.data!.currency);
                if (data.get('production-cost'))
                  parsePrice(
                    String(data.get('production-cost')),
                    query.data!.currency,
                  );
              }}
              run={(data) => {
                const input = {
                  productId: id,
                  name: text(data, 'variant-name'),
                  sku: text(data, 'sku'),
                  price: parsePrice(text(data, 'price'), query.data!.currency),
                  optionIds: query.data!.optionGroups.map((group) =>
                    text(data, `option-${group.id}`),
                  ),
                };
                return service.finance && data.get('production-cost')
                  ? service.finance.createVariant(
                      input,
                      parsePrice(
                        String(data.get('production-cost')),
                        query.data!.currency,
                      ),
                    )
                  : service.createVariant(input);
              }}
              onDone={query.refresh}
            >
              <TextField
                name="variant-name"
                label="Variant name"
                maxLength={200}
              />
              <TextField name="sku" label="SKU" maxLength={200} />
              <TextField
                name="price"
                label={`Initial price (${query.data.currency})`}
              />
              {service.finance &&
                service.context.permissions.includes(
                  'ReadOwnVendorFinance',
                ) && (
                  <TextField
                    name="production-cost"
                    label={`Cost to produce (${query.data.currency}, optional)`}
                    required={false}
                  />
                )}
              {query.data.optionGroups.map((group) => (
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
              <p>
                Currency follows the Vendor's canonical catalog configuration.
              </p>
            </CommandForm>
          )}
        </div>
      )}
    </>
  );
}
function VariantEditor({
  variant: v,
  service,
  refresh,
}: {
  variant: CatalogVariant;
  service: VendorService;
  refresh: () => void;
}) {
  const formId = useId();
  return (
    <details className={disclosureClassName()}>
      <summary>Edit {v.name}</summary>
      <div className="ui-disclosure-content">
        <CommandForm
          embedded
          title="Variant metadata"
          run={(data) =>
            service.updateVariant(v.id, {
              name: text(data, 'variant-name'),
              sku: text(data, 'sku'),
              enabled: data.has('variant-enabled'),
            })
          }
          onDone={refresh}
        >
          <TextField name="variant-name" label="Variant name" value={v.name} />
          <TextField name="sku" label="SKU" value={v.sku} />
          <Field id={`${formId}-enabled`} label="Enabled">
            <Checkbox
              id={`${formId}-enabled`}
              name="variant-enabled"
              defaultChecked={v.enabled}
            />
          </Field>
        </CommandForm>
        <CommandForm
          embedded
          title="Canonical price"
          validate={(data) => {
            parsePrice(text(data, 'price'), v.currency);
          }}
          run={(data) =>
            service.price(v.id, parsePrice(text(data, 'price'), v.currency))
          }
          onDone={refresh}
        >
          <Field id={`${formId}-price`} label={`Price (${v.currency})`}>
            <Input
              name="price"
              id={`${formId}-price`}
              defaultValue={decimal(v.price, v.currency)}
              inputMode="decimal"
              required
            />
          </Field>
          <p>
            Enter an exact decimal amount. This price belongs to the canonical
            Vendor currency.
          </p>
        </CommandForm>
        {service.finance &&
          service.context.permissions.includes('ReadOwnVendorFinance') && (
            <ProductionCost
              api={service.finance}
              variantId={v.id}
              currency={v.currency}
            />
          )}
      </div>
    </details>
  );
}
