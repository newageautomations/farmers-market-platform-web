import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AppError,
  safeError,
  type VendorCategory,
  type CategoryImage,
  type VendorCategoryApi,
} from '@market/api';
import {
  Button,
  Dialog,
  ErrorState,
  Field,
  Input,
  SearchSelect,
  SearchableMultiSelect,
  UtilityIcon,
} from '@market/ui';
import './image-library.css';
import { mayCommand } from '@market/admin-core';
import type { VendorService } from './service';
import {
  CommandForm,
  DataTable,
  ReadState,
  TextField,
  text,
  useRead,
} from './common';

/** Feature composition of approved controls. No existing category or public asset picker exists. */
export function CategoryImageField({
  api,
  value,
  preview,
  name = 'imageAssetId',
  label = 'Category image (optional)',
  onChange,
  onImageChange,
  presentation = 'inline',
}: {
  api: Pick<VendorCategoryApi, 'images' | 'upload'>;
  value?: string | null;
  preview?: string | null;
  name?: string;
  label?: string;
  onChange?: () => void;
  onImageChange?: (image: CategoryImage | null) => void;
  presentation?: 'inline' | 'library';
}) {
  const read = useCallback(() => api.images(), [api]);
  const images = useRead('category-images', read);
  const [selected, setSelected] = useState(value ?? '');
  const selectedId = presentation === 'library' ? (value ?? '') : selected;
  const [uploaded, setUploaded] = useState<CategoryImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError>();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [extra, setExtra] = useState<CategoryImage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState<boolean>();
  const options = [
    ...uploaded,
    ...[...(images.data ?? []), ...extra].filter(
      (i) => !uploaded.some((u) => u.id === i.id),
    ),
  ];
  if (value && !options.some((image) => image.id === value))
    options.push({ id: value, name: 'Current image', preview: preview ?? '' });
  const uploadId = useId();
  const imageChange = useRef(onImageChange);
  const mounted = useRef(true);
  useEffect(() => {
    imageChange.current = onImageChange;
  }, [onImageChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const chooseImage = (image: CategoryImage | null) => {
    setSelected(image?.id ?? '');
    onChange?.();
    onImageChange?.(image);
    setLibraryOpen(false);
  };
  const uploadField = (
    <>
      <Field id={uploadId} label="Upload image (PNG or JPEG)">
        <Input
          id={uploadId}
          type="file"
          accept="image/png,image/jpeg"
          disabled={busy || loadingMore}
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            e.currentTarget.value = '';
            setBusy(true);
            setError(undefined);
            try {
              const image = await api.upload(file);
              setUploaded((previous) => [image, ...previous]);
              setSelected(image.id);
              onChange?.();
              if (mounted.current) imageChange.current?.(image);
              if (mounted.current && presentation === 'library')
                setLibraryOpen(false);
            } catch (error) {
              setError(safeError(error));
            } finally {
              setBusy(false);
            }
          }}
        />
      </Field>
      {busy && <p role="status">Scanning and uploading image...</p>}
      {error && <ErrorState error={error} />}
    </>
  );
  return (
    <div className="stack">
      {presentation === 'library' ? (
        <>
          <Field id={`${uploadId}-select`} label={label}>
            <Button
              id={`${uploadId}-select`}
              variant="secondary"
              className="image-library-trigger"
              aria-label={label}
              aria-haspopup="dialog"
              aria-expanded={libraryOpen}
              onClick={() => setLibraryOpen(true)}
            >
              <span>
                {options.find((image) => image.id === selectedId)?.name ||
                  (selectedId ? 'Selected image' : 'Choose an image')}
              </span>
              <UtilityIcon name="chevron-down" />
            </Button>
          </Field>
          <Dialog
            open={libraryOpen}
            title="Choose an image"
            size="wide"
            busy={busy}
            onClose={() => setLibraryOpen(false)}
          >
            <div className="stack">
              {uploadField}
              <ReadState {...images} retry={images.refresh} />
              <div className="image-library-grid">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => chooseImage(null)}
                >
                  No image
                </Button>
                {options.map((image) => (
                  <Button
                    key={image.id}
                    variant="secondary"
                    className="image-library-option button-selection-fill"
                    aria-label={`Choose ${image.name?.trim() || `Image ${image.id}`}`}
                    aria-pressed={selectedId === image.id}
                    disabled={busy}
                    onClick={() => chooseImage(image)}
                  >
                    {image.preview && (
                      <img
                        src={image.preview}
                        alt=""
                        width="160"
                        height="160"
                        loading="lazy"
                      />
                    )}
                    <span>{image.name?.trim() || `Image ${image.id}`}</span>
                  </Button>
                ))}
              </div>
              {!images.loading && !options.length && (
                <p>
                  Your image library is empty. Upload a PNG or JPEG to get
                  started.
                </p>
              )}
              {(hasMore ?? images.data?.length === 100) && (
                <Button
                  variant="secondary"
                  loading={loadingMore}
                  disabled={busy || loadingMore}
                  onClick={async () => {
                    setLoadingMore(true);
                    setError(undefined);
                    try {
                      const page = await api.images(
                        (images.data?.length ?? 0) + extra.length,
                      );
                      if (!mounted.current) return;
                      setExtra((previous) => [...previous, ...page]);
                      setHasMore(page.length === 100);
                    } catch (error) {
                      if (mounted.current) setError(safeError(error));
                    } finally {
                      if (mounted.current) setLoadingMore(false);
                    }
                  }}
                >
                  Load more images
                </Button>
              )}
            </div>
          </Dialog>
        </>
      ) : (
        <>
          <SearchSelect
            label={label}
            name={name}
            value={selected}
            onChange={(value) => {
              setSelected(value);
              onChange?.();
              onImageChange?.(
                options.find((image) => image.id === value) ?? null,
              );
            }}
            allowClear
            options={options.map((i) => ({
              value: i.id,
              label:
                typeof i.name === 'string' && i.name.trim()
                  ? i.name
                  : `Image ${i.id}`,
            }))}
            disabled={busy || images.loading}
          />
          <ReadState {...images} retry={images.refresh} />
          {uploadField}
          {selected && options.find((i) => i.id === selected)?.preview && (
            <img
              src={options.find((i) => i.id === selected)!.preview}
              alt="Selected category"
              width="80"
              height="80"
            />
          )}
        </>
      )}
      <input
        type="hidden"
        name="categoryImagePending"
        value={busy || images.loading || !!images.error ? 'true' : 'false'}
      />
    </div>
  );
}
function categoryInput(data: FormData) {
  const name = text(data, 'categoryName');
  if (!name || name.length > 100 || data.get('categoryImagePending') === 'true')
    throw new AppError('validation');
  return { name, imageAssetId: text(data, 'imageAssetId') || null };
}
export function CategoryEditor({
  api,
  category,
  onSaved,
  onClose,
  products,
}: {
  api: VendorCategoryApi;
  category?: VendorCategory;
  onSaved: (category: VendorCategory) => void;
  onClose: () => void;
  products?: Array<{ id: string; name: string }>;
}) {
  const [busy, setBusy] = useState(false);
  return createPortal(
    <div
      onSubmit={(event) => event.stopPropagation()}
      onSubmitCapture={(event) => {
        if (busy) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <Dialog
        open
        title={category ? 'Edit category' : 'Create category'}
        busy={busy}
        onClose={onClose}
      >
        <CommandForm
          title={category ? category.name : 'New category'}
          validate={categoryInput}
          onPendingChange={setBusy}
          submitLabel={category ? 'Save changes' : 'Create category'}
          onDone={() => undefined}
          run={async (data) => {
            const saved = await api.save({
              ...categoryInput(data),
              ...(category ? { id: category.id } : {}),
              ...(products
                ? { productIds: data.getAll('productIds').map(String) }
                : {}),
            });
            onSaved(saved);
          }}
          secondaryAction={
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
          }
        >
          <TextField
            name="categoryName"
            label="Category name"
            value={category?.name}
            maxLength={100}
          />
          <CategoryImageField
            api={api}
            value={category?.imageAssetId}
            preview={category?.image}
          />
          {products && (
            <SearchableMultiSelect
              label="Products"
              name="productIds"
              defaultValue={category?.productIds ?? []}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
              allowClear
            />
          )}
        </CommandForm>
        {category && products && (
          <CommandForm
            title="Delete category"
            confirm="Delete this category and its assignments? Products and variants will be preserved."
            submitLabel="Delete category"
            onPendingChange={setBusy}
            run={async () => {
              await api.remove(category.id);
              onClose();
              onSaved(category);
            }}
            onDone={() => undefined}
          >
            <p>Deleting a category preserves its products.</p>
          </CommandForm>
        )}
      </Dialog>
    </div>,
    document.body,
  );
}
export function ProductCategories({
  service,
  productId,
}: {
  service: VendorService;
  productId?: string;
}) {
  const api = service.categories!;
  const read = useCallback(() => api.list(), [api]);
  const query = useRead(
    `product-categories:${service.vendorId}:${productId ?? 'new'}`,
    read,
    true,
    { retainPreviousData: true },
  );
  const [selected, setSelected] = useState<string[] | null>(null);
  const [added, setAdded] = useState<VendorCategory[]>([]);
  const [creating, setCreating] = useState(false);
  const rows = [
    ...(query.data ?? []),
    ...added.filter((a) => !query.data?.some((c) => c.id === a.id)),
  ];
  const initial = rows
    .filter((c) => productId && c.productIds.includes(productId))
    .map((c) => c.id);
  return (
    <div className="stack">
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <input type="hidden" name="categoriesLoaded" value="true" />
      )}
      <SearchableMultiSelect
        label="Categories"
        name="categoryIds"
        options={rows.map((c) => ({ value: c.id, label: c.name }))}
        value={selected ?? initial}
        onChange={setSelected}
        disabled={!query.data}
        allowClear
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => setCreating(true)}
      >
        + Create New Category
      </Button>
      {creating && (
        <CategoryEditor
          api={api}
          onClose={() => setCreating(false)}
          onSaved={(category) => {
            setAdded((previous) => [...previous, category]);
            setSelected((previous) => [...(previous ?? initial), category.id]);
            setCreating(false);
            query.refresh();
          }}
        />
      )}
    </div>
  );
}
export function Categories({ service }: { service: VendorService }) {
  const api = service.categories;
  const read = useCallback(
    () => (api ? api.list() : Promise.resolve([])),
    [api],
  );
  const query = useRead(`categories:${service.vendorId}`, read);
  const [editing, setEditing] = useState<VendorCategory | 'new' | null>(null);
  const readProducts = useCallback(async () => {
    const all = [];
    let skip = 0;
    while (true) {
      const page = await service.catalog('', skip);
      all.push(...page.items);
      skip += page.items.length;
      if (skip >= page.totalItems) return all;
      if (!page.items.length) throw new AppError('unavailable');
    }
  }, [service]);
  const productQuery = useRead(
    `category-products:${service.vendorId}:${editing === 'new' ? 'new' : editing?.id}`,
    readProducts,
    editing !== null,
  );
  const products = productQuery.data;
  if (!api) return <p>Categories are unavailable in this environment.</p>;
  const can = mayCommand(service.context, 'ManageOwnCatalog');
  return (
    <>
      {can && (
        <div className="actions">
          <Button onClick={() => setEditing('new')}>Create Category</Button>
        </div>
      )}
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <DataTable
          label="Categories"
          headings={['Image', 'Category', 'Products']}
        >
          {query.data.map((category) => (
            <tr
              key={category.id}
              className="ui-record-row"
              onClick={(event) => {
                if (
                  !(event.target instanceof Element) ||
                  event.target.closest(
                    'button, a, input, select, textarea, label',
                  )
                )
                  return;
                const trigger =
                  event.currentTarget.querySelector<HTMLButtonElement>(
                    'button',
                  );
                trigger?.focus({ preventScroll: true });
                trigger?.click();
              }}
            >
              <td>
                {category.image ? (
                  <img src={category.image} alt="" width="48" height="48" />
                ) : (
                  <span aria-label="No category image">No image</span>
                )}
              </td>
              <th scope="row">
                <Button
                  variant="tertiary"
                  disabled={!can}
                  onClick={() => setEditing(category)}
                >
                  {category.name}
                </Button>
              </th>
              <td>{category.productCount}</td>
            </tr>
          ))}
        </DataTable>
      )}
      {editing && !products && (
        <Dialog open title="Category products" onClose={() => setEditing(null)}>
          <ReadState {...productQuery} retry={productQuery.refresh} />
        </Dialog>
      )}
      {editing && products && (
        <CategoryEditor
          key={editing === 'new' ? 'new' : editing.id}
          api={api}
          category={editing === 'new' ? undefined : editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            query.refresh();
          }}
        />
      )}
    </>
  );
}
