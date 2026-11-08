import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  type AppError,
  safeError,
  type CategoryImage,
  type VendorCategoryApi,
} from '@market/api';
import {
  Button,
  Dialog,
  ErrorState,
  Field,
  Input,
  IconButton,
  SearchSelect,
  Tabs,
  UtilityIcon,
} from '@market/ui';
import './image-library.css';
import { ReadState, useRead } from './common';

export type StockLibraryImage = CategoryImage;

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
  triggerClassName = '',
  renderTrigger,
  themeId,
  stockImages,
}: {
  api: Pick<VendorCategoryApi, 'images' | 'upload'> & {
    themeImages?: (themeId: string) => Promise<CategoryImage[]>;
  };
  value?: string | null;
  preview?: string | null;
  name?: string;
  label?: string;
  onChange?: () => void;
  onImageChange?: (image: CategoryImage | null) => void;
  presentation?: 'inline' | 'library';
  triggerClassName?: string;
  renderTrigger?: (open: () => void, disabled: boolean) => ReactNode;
  themeId?: string;
  /** Opt-in curated collection. Omit outside the owning feature. */
  stockImages?: readonly StockLibraryImage[];
}) {
  const read = useCallback(() => api.images(), [api]);
  const images = useRead('category-images', read);
  const [selected, setSelected] = useState(value ?? '');
  const selectedId = presentation === 'library' ? (value ?? '') : selected;
  const [uploaded, setUploaded] = useState<CategoryImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError>();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [enlarged, setEnlarged] = useState<CategoryImage>();
  const [extra, setExtra] = useState<CategoryImage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState<boolean>();
  const [themeImages, setThemeImages] = useState<CategoryImage[]>([]);
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeError, setThemeError] = useState<AppError>();
  const options = [
    ...uploaded,
    ...[...(images.data ?? []), ...extra].filter(
      (i) => !uploaded.some((u) => u.id === i.id),
    ),
  ].filter(
    (image) =>
      image.source !== 'theme' &&
      image.source !== 'stock' &&
      !themeImages.some((theme) => theme.id === image.id) &&
      !stockImages?.some((stock) => stock.id === image.id),
  );
  // A selected external image must not become a personal-library entry.
  const selectedImage =
    options.find((image) => image.id === selectedId) ??
    stockImages?.find((image) => image.id === selectedId) ??
    themeImages.find((image) => image.id === selectedId);
  const inlineOptions =
    value && !options.some((image) => image.id === value)
      ? [
          ...options,
          { id: value, name: 'Current image', preview: preview ?? '' },
        ]
      : options;
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
  useEffect(() => {
    if (!libraryOpen || !themeId || !api.themeImages) return;
    let active = true;
    void api
      .themeImages(themeId)
      .then((rows) => {
        if (active) setThemeImages(rows);
      })
      .catch((error) => {
        if (active) setThemeError(safeError(error));
      })
      .finally(() => {
        if (active) setThemeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, libraryOpen, themeId]);
  const chooseImage = (image: CategoryImage | null) => {
    setSelected(image?.id ?? '');
    onChange?.();
    onImageChange?.(image);
    setLibraryOpen(false);
  };
  const enlargeButton = (image: CategoryImage) =>
    image.preview && (
      <IconButton
        label={`Enlarge ${image.name?.trim() || 'image'}`}
        icon="expand"
        className="image-library-enlarge"
        disabled={busy}
        aria-haspopup="dialog"
        onClick={() => setEnlarged(image)}
      />
    );
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
          {renderTrigger ? (
            renderTrigger(() => setLibraryOpen(true), busy || loadingMore)
          ) : (
            <Field id={`${uploadId}-select`} label={label}>
              <Button
                id={`${uploadId}-select`}
                variant="secondary"
                className={`image-library-trigger ${triggerClassName}`}
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={libraryOpen}
                onClick={() => {
                  setLibraryOpen(true);
                  if (themeId && api.themeImages) {
                    setThemeLoading(true);
                    setThemeError(undefined);
                  }
                }}
              >
                <span>
                  {selectedImage?.name ||
                    (selectedId ? 'Selected image' : 'Choose an image')}
                </span>
                <UtilityIcon name="chevron-down" />
              </Button>
            </Field>
          )}
          <Dialog
            open={libraryOpen}
            title="Choose an image"
            size="wide"
            busy={busy}
            onClose={() => setLibraryOpen(false)}
          >
            <div className="stack">
              <Tabs
                initialTab="My Images"
                items={[
                  ...(stockImages
                    ? [
                        {
                          label: 'Stock Images',
                          content: (
                            <div className="stack">
                              {busy && (
                                <p role="status">Adding stock image...</p>
                              )}
                              {error && <ErrorState error={error} />}
                              <div className="image-library-grid image-library-stock">
                                {stockImages.map((image) => (
                                  <div
                                    className="image-library-tile"
                                    key={image.id}
                                  >
                                    <Button
                                      variant="secondary"
                                      className="image-library-option button-selection-fill"
                                      aria-label={`Choose ${image.name}`}
                                      disabled={busy}
                                      aria-pressed={selectedId === image.id}
                                      onClick={() =>
                                        chooseImage({
                                          ...image,
                                          source: 'stock',
                                          preview: new URL(
                                            image.preview,
                                            window.location.origin,
                                          ).href,
                                        })
                                      }
                                    >
                                      <img
                                        src={image.preview}
                                        alt=""
                                        width="160"
                                        height="160"
                                        loading="lazy"
                                      />
                                      <span>{image.name}</span>
                                    </Button>
                                    {enlargeButton(image)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ),
                        },
                      ]
                    : []),
                  {
                    label: 'My Images',
                    content: (
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
                            <div className="image-library-tile" key={image.id}>
                              <Button
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
                                <span>
                                  {image.name?.trim() || `Image ${image.id}`}
                                </span>
                              </Button>
                              {enlargeButton(image)}
                            </div>
                          ))}
                        </div>
                        {!images.loading && !options.length && (
                          <p>
                            Your image library is empty. Upload a PNG or JPEG to
                            get started.
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
                    ),
                  },
                  {
                    label: 'Theme Images',
                    disabled: !themeId || !api.themeImages,
                    content: (
                      <div className="stack">
                        <p>
                          These read-only images belong to the selected theme
                          and remain available across website drafts.
                        </p>
                        {themeLoading && (
                          <p role="status">Loading theme images...</p>
                        )}
                        {themeError && <ErrorState error={themeError} />}
                        <div className="image-library-grid">
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => chooseImage(null)}
                          >
                            No image
                          </Button>
                          {themeImages.map((image) => (
                            <div className="image-library-tile" key={image.id}>
                              <Button
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
                                <span>
                                  {image.name?.trim() || `Image ${image.id}`}
                                </span>
                              </Button>
                              {enlargeButton(image)}
                            </div>
                          ))}
                        </div>
                        {!themeLoading &&
                          !themeError &&
                          !themeImages.length && (
                            <p>No images are registered for this theme.</p>
                          )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
            <Dialog
              open={!!enlarged}
              title={`Image preview: ${enlarged?.name?.trim() || 'Image'}`}
              size="wide"
              onClose={() => setEnlarged(undefined)}
            >
              {enlarged && (
                <img
                  className="image-library-preview"
                  src={enlarged.preview}
                  alt={enlarged.name?.trim() || 'Enlarged image'}
                />
              )}
            </Dialog>
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
            options={inlineOptions.map((i) => ({
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
        value={
          busy || (!renderTrigger && (images.loading || !!images.error))
            ? 'true'
            : 'false'
        }
      />
    </div>
  );
}
