import { useCallback, useId, useState } from 'react';
import { mayCommand } from '@market/admin-core';
import { AppError, type ProductInput } from '@market/api';
import { formatMoney, parsePrice } from '@market/config';
import {
  Button,
  Checkbox,
  Field,
  Input,
  Pagination,
  Textarea,
} from '@market/ui';
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
  return { name, slug, description, enabled: data.has('enabled') };
}
function ProductFields({ product }: { product?: CatalogProduct }) {
  return (
    <>
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
  const [search, setSearch] = useState(''),
    [skip, setSkip] = useState(0);
  const read = useCallback(
    () => service.catalog(search, skip),
    [service, search, skip],
  );
  const query = useRead(`catalog:${search}:${skip}`, read, !id);
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
          <ProductFields />
        </CommandForm>
      </>
    );
  if (id) return <ProductDetail service={service} id={id} />;
  return (
    <>
      {mayCommand(service.context, 'ManageOwnCatalog') && (
        <div className="actions">
          <RouteLink to="/vendor/products/new">Create product</RouteLink>
        </div>
      )}
      {
        <>
          <form
            className="filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              setSkip(0);
              setSearch(text(new FormData(e.currentTarget), 'search'));
            }}
          >
            <TextField
              name="search"
              label="Search products"
              required={false}
              maxLength={200}
            />
            <Button type="submit">Search</Button>
          </form>
          <ReadState {...query} retry={query.refresh} />
          {query.data && (
            <>
              <DataTable
                label="Owned products"
                headings={['Product', 'Status', 'Variants', 'Actions']}
              >
                {query.data.items.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.name}</th>
                    <td>{p.enabled ? 'Enabled' : 'Disabled'}</td>
                    <td>{p.variants.length}</td>
                    <td>
                      <RouteLink
                        to={`/vendor/products/${encodeURIComponent(p.id)}`}
                      >
                        Edit {p.name}
                      </RouteLink>
                    </td>
                  </tr>
                ))}
              </DataTable>
              {!query.data.items.length && (
                <p>No products match your search.</p>
              )}
              <Pagination
                hasPrevious={skip > 0}
                hasNext={skip + 20 < query.data.totalItems}
                onPrevious={() => setSkip(skip - 20)}
                onNext={() => setSkip(skip + 20)}
              />
            </>
          )}
        </>
      }
    </>
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
              <ProductFields product={query.data} />
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
              }}
              run={(data) =>
                service.createVariant({
                  productId: id,
                  name: text(data, 'variant-name'),
                  sku: text(data, 'sku'),
                  price: parsePrice(text(data, 'price'), query.data!.currency),
                  optionIds: query.data!.optionGroups.map((group) =>
                    text(data, `option-${group.id}`),
                  ),
                })
              }
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
              {query.data.optionGroups.map((group) => (
                <Field
                  key={group.id}
                  id={`option-${group.id}`}
                  label={group.name}
                >
                  <select
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
                  </select>
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
    <details className="record-details">
      <summary>Edit {v.name}</summary>
      <CommandForm
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
    </details>
  );
}
