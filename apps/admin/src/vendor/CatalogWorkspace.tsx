import { useCallback, useState, type MouseEvent } from 'react';
import { hasPermission } from '@market/auth';
import { mayCommand } from '@market/admin-core';
import {
  AppError,
  type CategoryImage,
  type InventoryPage,
  type VendorCategory,
} from '@market/api';
import { formatMoney } from '@market/config';
import { EmptyState, UtilityIcon } from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSearch,
  FarmstandSelect,
  FarmstandStockBadge,
  FarmstandStockSummary,
  stockStatus,
  type FarmstandIconName,
  type StockStatus,
} from '@market/ui/farmstand';
import '@market/ui/farmstand.css';
import { ReadState, go, useRead } from './common';
import { StockAdjustmentDialog } from './StockAdjustmentDialog';
import type { CatalogProduct, VendorService } from './service';
import './catalog-workspace.css';
import { CategoryEditor } from './categories';

type StockRow = InventoryPage['items'][number];
type ProductRecord = Pick<CatalogProduct, 'id' | 'name'> & {
  assetIds?: readonly string[] | null;
  variants: readonly (Pick<
    CatalogProduct['variants'][number],
    'id' | 'name' | 'sku'
  > & { price?: number; currency?: string })[];
};

export async function readCatalogInventory(
  service: VendorService,
): Promise<StockRow[]> {
  const items: StockRow[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  do {
    const page = await service.inventory(service.vendorId, cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
    if (cursor && seen.has(cursor)) throw new AppError('unavailable');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
}

function inventoryProducts(rows: StockRow[]): ProductRecord[] {
  const products = new Map<
    string,
    ProductRecord & { variants: ProductRecord['variants'][number][] }
  >();
  for (const row of rows) {
    if (!products.has(row.productId))
      products.set(row.productId, {
        id: row.productId,
        name: row.productName,
        variants: [],
      });
    products.get(row.productId)!.variants.push({
      id: row.variantId,
      name: row.variantName,
      sku: row.sku,
    });
  }
  return [...products.values()];
}

function productStock(
  product: ProductRecord,
  stocks: Map<string, StockRow>,
): StockStatus {
  const quantities = product.variants.map(
    (variant) => stocks.get(variant.id)?.stockOnHand,
  );
  if (
    !quantities.length ||
    quantities.some((quantity) => quantity === undefined)
  )
    return 'unknown';
  const known = quantities as number[];
  if (known.every((quantity) => quantity <= 0)) return 'out';
  return known.some((quantity) => stockStatus(quantity) !== 'in')
    ? 'low'
    : 'in';
}

function categoryIcon(name: string): FarmstandIconName {
  if (/vegetable|produce|greens/i.test(name)) return 'carrot';
  if (/fruit/i.test(name)) return 'apple';
  if (/egg/i.test(name)) return 'egg';
  return 'archive';
}

/** Only explicit unit labels from real variants are appended to physical counts. */
function inventoryQuantity(quantity: number | undefined, variantName: string) {
  if (quantity === undefined) return 'Unavailable';
  const unit = variantName.trim().toLowerCase();
  const plural: Record<string, string> = {
    lb: 'lb',
    oz: 'oz',
    kg: 'kg',
    g: 'g',
    each: 'each',
    dozen: 'dozen',
    bunch: 'bunches',
    jar: 'jars',
    bag: 'bags',
    box: 'boxes',
    bottle: 'bottles',
    pack: 'packs',
  };
  return Object.hasOwn(plural, unit)
    ? `${quantity} ${quantity === 1 ? unit : plural[unit]}`
    : String(quantity);
}

/** Keeps native modified-click navigation while composing the shared action anchor. */
function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  go(event.currentTarget.getAttribute('href')!);
}

export function CatalogWorkspace({ service }: { service: VendorService }) {
  const canReadCatalog = hasPermission(
    service.context.permissions,
    'ReadOwnCatalog',
  );
  const canReadStock = hasPermission(
    service.context.permissions,
    'ReadOwnInventory',
  );
  const canManageStock =
    canReadStock && mayCommand(service.context, 'ManageOwnInventory');
  const canManageCatalog = mayCommand(service.context, 'ManageOwnCatalog');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<StockRow | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const readProducts = useCallback(async () => {
    const items: CatalogProduct[] = [];
    let total = 0;
    do {
      const result = await service.catalog('', items.length);
      total = result.totalItems;
      if (!result.items.length && items.length < total)
        throw new AppError('unavailable');
      items.push(...result.items);
    } while (items.length < total);
    return items;
  }, [service]);
  const catalog = useRead(
    `catalog-workspace:${service.vendorId}`,
    readProducts,
    canReadCatalog,
  );
  const readStocks = useCallback(
    () => readCatalogInventory(service),
    [service],
  );
  const inventory = useRead(
    `catalog-stock:${service.vendorId}`,
    readStocks,
    canReadStock,
  );
  const readCategories = useCallback(
    () =>
      service.categories
        ? service.categories.list()
        : Promise.resolve([] as VendorCategory[]),
    [service],
  );
  const categories = useRead(
    `catalog-categories:${service.vendorId}`,
    readCategories,
    canReadCatalog,
  );
  const readImages = useCallback(async () => {
    const wanted = new Set(
      (catalog.data ?? []).flatMap(
        (product) => product.assetIds?.slice(0, 1) ?? [],
      ),
    );
    const images: CategoryImage[] = [];
    if (!service.categories || !wanted.size) return images;
    let skip = 0;
    while (wanted.size) {
      const batch = await service.categories.images(skip);
      for (const image of batch)
        if (wanted.delete(image.id)) images.push(image);
      if (batch.length < 100) break;
      skip += batch.length;
    }
    return images;
  }, [service, catalog.data]);
  const images = useRead(
    `catalog-images:${service.vendorId}`,
    readImages,
    !!catalog.data,
  );
  const products: ProductRecord[] = canReadCatalog
    ? (catalog.data ?? [])
    : inventoryProducts(inventory.data ?? []);
  const stocks = new Map(
    (inventory.data ?? []).map((row) => [row.variantId, row]),
  );
  const imageMap = new Map(
    (images.data ?? []).map((image) => [image.id, image.preview]),
  );
  const categoryList = categories.data ?? [];
  const statuses = new Map(
    products.map((product) => [product.id, productStock(product, stocks)]),
  );
  const counts = { in: 0, low: 0, out: 0 };
  let unknown = 0;
  for (const status of statuses.values()) {
    if (status === 'unknown') unknown++;
    else counts[status]++;
  }
  const filtered = products.filter((product) => {
    const term = search.trim().toLocaleLowerCase();
    return (
      (!term ||
        `${product.name} ${product.variants.map((variant) => variant.sku).join(' ')}`
          .toLocaleLowerCase()
          .includes(term)) &&
      (!categoryId ||
        categoryList
          .find((category) => category.id === categoryId)
          ?.productIds.includes(product.id)) &&
      (!stockFilter || statuses.get(product.id) === stockFilter)
    );
  });
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  );
  const visible = filtered.slice(currentPage * 20, (currentPage + 1) * 20);
  const loaded = canReadCatalog ? !!catalog.data : !!inventory.data;
  function filter(change: () => void) {
    change();
    setPage(0);
  }

  return (
    <div className="catalog-workspace">
      <div className="catalog-page-heading">
        <h1>Products &amp; Inventory</h1>
        {canManageCatalog && (
          <FarmstandLink
            href="/vendor/products/new"
            onClick={navigate}
            variant="primary"
          >
            <FarmstandIcon name="plus" />
            Add product
          </FarmstandLink>
        )}
      </div>
      <div className="catalog-columns">
        <FarmstandPanel className="catalog-products-panel">
          <div className="catalog-panel-heading">
            <div>
              <h2>Products &amp; inventory</h2>
              <p>Keep your harvest up to date, one product at a time.</p>
            </div>
            <span>
              {loaded ? `${products.length} products` : 'Loading products'}
            </span>
          </div>
          <div className="catalog-controls">
            <FarmstandSearch
              aria-label="Search products by name or SKU"
              placeholder="Search products by name or SKU"
              value={search}
              maxLength={200}
              onChange={(event) =>
                filter(() => setSearch(event.currentTarget.value))
              }
            />
            <FarmstandSelect
              aria-label="Filter by category"
              value={categoryId}
              onChange={(event) =>
                filter(() => setCategoryId(event.currentTarget.value))
              }
              disabled={
                categories.loading || !!categories.error || !categoryList.length
              }
            >
              <option value="">All categories</option>
              {categoryList.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </FarmstandSelect>
            <FarmstandSelect
              aria-label="Filter by stock"
              value={stockFilter}
              onChange={(event) =>
                filter(() => setStockFilter(event.currentTarget.value))
              }
              disabled={!inventory.data}
            >
              <option value="">All stock</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </FarmstandSelect>
          </div>
          <div className="catalog-read-state">
            <ReadState {...catalog} retry={catalog.refresh} />
            <ReadState {...inventory} retry={inventory.refresh} />
            <ReadState {...images} retry={images.refresh} />
          </div>
          {loaded && (
            <>
              <div className="catalog-table-scroll">
                <table
                  className="catalog-table"
                  aria-label="Products and inventory"
                >
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Category</th>
                      <th scope="col">Price</th>
                      <th scope="col">On hand</th>
                      <th scope="col">Manage stock</th>
                      <th scope="col">
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.flatMap((product) => {
                      const variants = product.variants.length
                        ? product.variants
                        : [{ id: '', name: '', sku: '' }];
                      const productCategories = categoryList.filter(
                        (category) => category.productIds.includes(product.id),
                      );
                      const photo = product.assetIds?.[0]
                        ? imageMap.get(product.assetIds[0])
                        : undefined;
                      const href = `/vendor/products/${encodeURIComponent(product.id)}`;
                      return variants.map((variant) => {
                        const row = stocks.get(variant.id);
                        return (
                          <tr
                            key={`${product.id}:${variant.id}`}
                            className={
                              canReadCatalog ? 'catalog-product-row' : undefined
                            }
                            onClick={(event) => {
                              if (
                                !canReadCatalog ||
                                event.defaultPrevented ||
                                (event.target instanceof Element &&
                                  event.target.closest(
                                    'a, button, input, select, textarea, label',
                                  ))
                              )
                                return;
                              const link =
                                event.currentTarget.querySelector<HTMLAnchorElement>(
                                  '.catalog-product-name a',
                                );
                              if (
                                event.ctrlKey ||
                                event.metaKey ||
                                event.shiftKey
                              )
                                window.open(href, '_blank', 'noopener');
                              else link?.click();
                            }}
                          >
                            <th scope="row">
                              <div className="catalog-product-identity">
                                <div className="catalog-product-photo">
                                  {photo ? (
                                    <img
                                      src={photo}
                                      alt=""
                                      width="42"
                                      height="42"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <UtilityIcon name="store" />
                                  )}
                                </div>
                                <div className="catalog-product-name">
                                  {canReadCatalog ? (
                                    <a
                                      className="farmstand-text-link"
                                      href={href}
                                      onClick={navigate}
                                    >
                                      {product.name}
                                    </a>
                                  ) : (
                                    <strong>{product.name}</strong>
                                  )}
                                  {product.variants.length > 1 && (
                                    <small>{variant.name}</small>
                                  )}
                                  <small>
                                    {variant.sku || 'No variants yet'}
                                  </small>
                                </div>
                              </div>
                            </th>
                            <td>
                              {productCategories
                                .map((category) => category.name)
                                .join(', ') ||
                                (categories.loading
                                  ? 'Loading'
                                  : categories.error || !canReadCatalog
                                    ? 'Unavailable'
                                    : 'Uncategorized')}
                            </td>
                            <td>
                              <div className="catalog-price">
                                {'price' in variant &&
                                variant.price !== undefined &&
                                variant.currency
                                  ? formatMoney(variant.price, variant.currency)
                                  : canReadCatalog
                                    ? 'Not set'
                                    : 'Unavailable'}
                                {variant.name &&
                                  variant.name !== product.name &&
                                  !/^(default|standard)( variant)?$/i.test(
                                    variant.name,
                                  ) && <small>/ {variant.name}</small>}
                              </div>
                            </td>
                            <td>
                              <div className="catalog-on-hand">
                                <strong>
                                  {inventoryQuantity(
                                    row?.stockOnHand,
                                    variant.name,
                                  )}
                                </strong>
                                <FarmstandStockBadge
                                  status={stockStatus(row?.stockOnHand)}
                                />
                              </div>
                            </td>
                            <td>
                              {canManageStock && row ? (
                                <div className="catalog-stock-actions">
                                  <FarmstandButton
                                    variant="primary"
                                    size="compact"
                                    aria-label={`Adjust stock for ${product.name}${product.variants.length > 1 ? ` ${variant.name}` : ''}`}
                                    onClick={() => setSelection(row)}
                                  >
                                    Adjust stock
                                  </FarmstandButton>
                                </div>
                              ) : (
                                <span className="catalog-muted">
                                  {canReadStock
                                    ? 'View only'
                                    : 'No inventory access'}
                                </span>
                              )}
                            </td>
                            <td>
                              {canReadCatalog && (
                                <a
                                  className="catalog-detail-link"
                                  href={href}
                                  onClick={navigate}
                                  aria-label={`View ${product.name}`}
                                >
                                  <FarmstandIcon name="chevron-right" />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
              {!filtered.length && (
                <EmptyState title="No matching products">
                  <p>
                    {products.length
                      ? 'Try another search or filter.'
                      : 'Add your first product to get started.'}
                  </p>
                </EmptyState>
              )}
              <div className="catalog-footer">
                <span>
                  {filtered.length <= 20
                    ? `Showing all ${filtered.length} products`
                    : `Showing ${currentPage * 20 + 1} to ${Math.min((currentPage + 1) * 20, filtered.length)} of ${filtered.length} products`}
                </span>
                {filtered.length > 20 ? (
                  <div className="catalog-pagination">
                    <FarmstandButton
                      variant="secondary"
                      size="compact"
                      disabled={!currentPage}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Previous
                    </FarmstandButton>
                    <FarmstandButton
                      variant="secondary"
                      size="compact"
                      disabled={(currentPage + 1) * 20 >= filtered.length}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Next
                    </FarmstandButton>
                  </div>
                ) : (
                  canReadCatalog && (
                    <span>
                      Select a product to view details
                      <FarmstandIcon name="arrow-up-right" />
                    </span>
                  )
                )}
              </div>
            </>
          )}
        </FarmstandPanel>
        <aside
          className="catalog-sidebar"
          aria-label="Categories and stock guidance"
        >
          <FarmstandPanel>
            <div className="catalog-panel-heading">
              <div>
                <h2>Categories</h2>
                <p>A little order for your offerings.</p>
              </div>
              {canManageCatalog && service.categories && (
                <FarmstandButton
                  onClick={() => setAddingCategory(true)}
                  variant="secondary"
                  iconOnly
                  aria-label="Add category"
                  disabled={!catalog.data}
                >
                  <FarmstandIcon name="plus-category" />
                </FarmstandButton>
              )}
            </div>
            <div className="catalog-category-status">
              <ReadState {...categories} retry={categories.refresh} />
            </div>
            {categoryList.map((category) => {
              const categoryProducts = products.filter((product) =>
                category.productIds.includes(product.id),
              );
              const low = categoryProducts.filter(
                (product) => statuses.get(product.id) === 'low',
              ).length;
              const out = categoryProducts.filter(
                (product) => statuses.get(product.id) === 'out',
              ).length;
              const unavailable = categoryProducts.some(
                (product) => statuses.get(product.id) === 'unknown',
              );
              const detail = unavailable
                ? 'Stock unavailable'
                : out
                  ? `${out} out of stock`
                  : low
                    ? `${low} low stock`
                    : 'All in stock';
              return (
                <button
                  className="catalog-category-record"
                  key={category.id}
                  aria-pressed={categoryId === category.id}
                  onClick={() =>
                    filter(() =>
                      setCategoryId(
                        categoryId === category.id ? '' : category.id,
                      ),
                    )
                  }
                >
                  <span className="catalog-category-icon">
                    <FarmstandIcon name={categoryIcon(category.name)} />
                  </span>
                  <span>
                    <strong>{category.name}</strong>
                    <small>
                      {category.productCount}{' '}
                      {category.productCount === 1 ? 'product' : 'products'} ·{' '}
                      {detail}
                    </small>
                  </span>
                  <FarmstandIcon name="chevron-right" />
                </button>
              );
            })}
            {!categories.loading &&
              !categories.error &&
              !categoryList.length && (
                <p className="catalog-no-categories">
                  {canReadCatalog
                    ? 'No categories yet.'
                    : 'Catalog access is required to view categories.'}
                </p>
              )}
            {canManageCatalog && (
              <div className="catalog-category-footer">
                <FarmstandLink
                  appearance="text"
                  href="/vendor/categories"
                  onClick={navigate}
                >
                  <span className="farmstand-text-link">Manage categories</span>
                  <FarmstandIcon name="arrow-right" />
                </FarmstandLink>
              </div>
            )}
          </FarmstandPanel>
          <FarmstandPanel className="catalog-stock-guidance">
            <div
              className={`catalog-stock-heading catalog-stock-check-${inventory.data && !inventory.loading && !inventory.error ? (counts.out > 0 ? 'danger' : counts.low > 0 ? 'warning' : unknown ? 'unknown' : 'success') : 'unknown'}`}
            >
              <h2>A little stock check</h2>
              {inventory.data &&
              !inventory.loading &&
              !inventory.error &&
              !unknown &&
              counts.out === 0 &&
              counts.low === 0 ? (
                <UtilityIcon name="check" />
              ) : (
                <FarmstandIcon name="triangle-alert" />
              )}
            </div>
            <p>
              {inventory.loading || catalog.loading
                ? 'Checking your inventory.'
                : inventory.error
                  ? 'Inventory could not be loaded.'
                  : !canReadStock
                    ? 'Inventory access is required to check stock.'
                    : !products.length
                      ? 'Add products to start keeping track of your stock.'
                      : counts.low + counts.out
                        ? `${counts.low + counts.out} ${counts.low + counts.out === 1 ? 'product could' : 'products could'} use a top-up before your next market.`
                        : unknown
                          ? 'Some products have unavailable inventory.'
                          : 'Your stock is ready for your next market.'}
            </p>
            {inventory.data && (
              <FarmstandStockSummary counts={counts}>
                {unknown > 0 && (
                  <p>{unknown} products have unavailable inventory.</p>
                )}
              </FarmstandStockSummary>
            )}
            <div className="catalog-inventory-guidance">
              <p>
                <strong>Adjust stock</strong> sets your on-hand count after a
                delivery, stocktake, sale or spoilage.
              </p>
            </div>
          </FarmstandPanel>
        </aside>
      </div>
      {addingCategory && service.categories && (
        <CategoryEditor
          api={service.categories}
          products={products}
          onClose={() => setAddingCategory(false)}
          onSaved={() => {
            setAddingCategory(false);
            categories.refresh();
          }}
        />
      )}
      {selection && (
        <StockAdjustmentDialog
          row={selection}
          service={service}
          readInventory={() => readCatalogInventory(service)}
          onClose={() => setSelection(null)}
          onRefresh={inventory.refresh}
        />
      )}
    </div>
  );
}
