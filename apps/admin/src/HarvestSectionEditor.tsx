import { EditorRangeField } from './TextSizeControls';
import { WebsiteEditorContext } from './WebsiteEditorContext';
import { useContext, useEffect, useState, type ReactNode } from 'react';
import {
  Button,
  Checkbox,
  Field,
  IconButton,
  Input,
  SelectField,
  Textarea,
} from '@market/ui';
import type { StorefrontAppearanceApi } from '@market/api';
import {
  harvestFeatureIcons,
  type HarvestExpandedSection,
  type WebsiteSection,
  type WebsiteSectionImage,
} from '@market/theme/storefront';
import { CategoryImageField } from './vendor/categories';

/** Feature inspector composition. Existing fields and media/catalog APIs retain their authority. */
export function HarvestSectionEditor({
  value,
  themeId = 'harvest',
  onChange,
  media,
  destinationControl,
  api,
  products = [],
  categoryPresentation,
  onCategoryPresentationChange,
  hiddenCategoryIds = [],
}: {
  value: HarvestExpandedSection;
  themeId?: string;
  onChange: (value: WebsiteSection) => void;
  media?: StorefrontAppearanceApi['media'];
  destinationControl?: ReactNode;
  api?: StorefrontAppearanceApi;
  products?: Array<{ id: string; name: string }>;
  loadProducts?: () => void;
  categoryPresentation?: import('@market/theme/storefront').StorefrontAppearance['categoryPresentation'];
  onCategoryPresentationChange?: (
    value: NonNullable<
      import('@market/theme/storefront').StorefrontAppearance['categoryPresentation']
    >,
  ) => void;
  hiddenCategoryIds?: readonly string[];
}) {
  const workspace = useContext(WebsiteEditorContext);
  const selectedItem =
    workspace?.block?.sectionId === value.id
      ? workspace.block.blockId
      : undefined;
  const [choices, setChoices] = useState<
    Array<{ id: string; name: string; pathIds?: string[] }>
  >([]);
  const selectedProductIds =
    value.type === 'product-showcase' ? value.content.productIds.join(',') : '';
  const [selectedProducts, setSelectedProducts] = useState<
    Array<{ id: string; name: string }>
  >([]);
  useEffect(() => {
    let active = true;
    const ids = selectedProductIds.split(',').filter(Boolean);
    if (ids.length)
      void api
        ?.products?.('', ids)
        .then((rows) => {
          if (active) setSelectedProducts(rows);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [api, selectedProductIds]);
  const [search, setSearch] = useState('');
  const [catalogError, setCatalogError] = useState('');
  useEffect(() => {
    let active = true;
    if (value.type === 'category-showcase') {
      void api
        ?.showcaseCategories?.()
        .then((rows) => {
          if (active) {
            setChoices(rows);
            setCatalogError('');
          }
        })
        .catch(() => {
          if (active)
            setCatalogError(
              'Categories could not be loaded. Try reopening this section.',
            );
        });
    }
    if (value.type === 'product-showcase') {
      void api
        ?.products?.(search)
        .then((rows) => {
          if (active) {
            setChoices(rows);
            setCatalogError('');
          }
        })
        .catch(() => {
          if (active)
            setCatalogError(
              'Products could not be loaded. Try searching again.',
            );
        });
    }
    return () => {
      active = false;
    };
  }, [api, value.type, search]);
  const content = (patch: object) =>
    onChange({
      ...value,
      content: { ...value.content, ...patch },
    } as HarvestExpandedSection);
  const presentation = (patch: object) =>
    onChange({
      ...value,
      presentation: { ...value.presentation, ...patch },
    } as HarvestExpandedSection);
  const field = (
    key: string,
    label: string,
    text: string,
    change: (text: string) => void,
    limit: number,
    multiline = false,
  ) =>
    selectedItem && ['heading', 'body'].includes(key) ? null : (
      <Field key={key} id={`${value.id}-${key}`} label={label}>
        {multiline ? (
          <Textarea
            id={`${value.id}-${key}`}
            value={text}
            maxLength={limit}
            rows={3}
            onChange={(e) => change(e.target.value)}
          />
        ) : (
          <Input
            id={`${value.id}-${key}`}
            value={text}
            maxLength={limit}
            onChange={(e) => change(e.target.value)}
          />
        )}
      </Field>
    );
  const select = (
    key: string,
    label: string,
    options: readonly (string | number)[],
  ) =>
    selectedItem ? null : (
      <SelectField
        key={key}
        id={`${value.id}-${key}`}
        label={label}
        value={String(
          (value.presentation as Record<string, unknown>)[key] ??
            (key === 'backgroundType' ? 'contained' : ''),
        )}
        onChange={(e) =>
          presentation({
            [key]:
              typeof options[0] === 'number'
                ? Number(e.target.value)
                : e.target.value,
          })
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {String(option)
              .replaceAll('-', ' ')
              .replace(/^./, (c) => c.toUpperCase())}
          </option>
        ))}
      </SelectField>
    );
  const photo = (
    key: string,
    image: WebsiteSectionImage,
    change: (image: WebsiteSectionImage) => void,
  ) => (
    <>
      {media && (
        <CategoryImageField
          api={media}
          themeId={themeId}
          label="Photograph"
          presentation="library"
          value={image.assetId}
          preview={image.url}
          onImageChange={(asset) =>
            change({
              ...image,
              assetId: asset?.id ?? null,
              url: asset?.preview ?? '',
            })
          }
        />
      )}
      {(value.type !== 'image-gallery' || !!selectedItem) &&
        field(
          key + '-alt',
          'Image description (leave blank for decorative images)',
          image.alt,
          (alt) => change({ ...image, alt }),
          200,
        )}
    </>
  );
  const actions = <T,>(
    items: T[],
    index: number,
    change: (items: T[]) => void,
    label: string,
  ) => (
    <div className="ui-actions">
      {([-1, 1] as const).map((offset) => (
        <IconButton
          key={offset}
          icon={offset < 0 ? 'arrow-up' : 'arrow-down'}
          label={`Move ${label} ${offset < 0 ? 'up' : 'down'}`}
          size="compact"
          disabled={index + offset < 0 || index + offset >= items.length}
          onClick={() => {
            const next = [...items];
            [next[index], next[index + offset]] = [
              next[index + offset]!,
              next[index]!,
            ];
            change(next);
          }}
        />
      ))}
      <IconButton
        icon="trash"
        label={`Remove ${label}`}
        size="compact"
        onClick={() => change(items.filter((_, i) => i !== index))}
      />
    </div>
  );
  return (
    <>
      {selectedItem && (
        <Button
          variant="tertiary"
          onClick={() => workspace?.selectBlock(value.id)}
        >
          Section settings
        </Button>
      )}
      {field(
        'heading',
        'Heading',
        value.content.heading,
        (heading) => content({ heading }),
        160,
      )}
      {field(
        'body',
        'Description (optional)',
        value.content.body,
        (body) => content({ body }),
        1200,
        true,
      )}
      {value.type === 'image-banner' && (
        <>
          {field(
            'introduction',
            'Introductory text (optional)',
            value.content.introduction,
            (introduction) => content({ introduction }),
            80,
          )}
          {photo('banner', value.content.image, (image) => content({ image }))}
          {field(
            'label',
            'Button label (optional)',
            value.content.label,
            (label) => content({ label }),
            80,
          )}
          {destinationControl}
          {select('layout', 'Layout', [
            'photo-overlay',
            'split-editorial',
            'minimal-centered',
          ])}
          {select('width', 'Width', ['contained', 'full'])}
          {select('placement', 'Text placement', ['top', 'middle', 'bottom'])}
          {select('focalPoint', 'Image focal point', [
            'center',
            'top',
            'bottom',
            'left',
            'right',
          ])}
          {select('overlay', 'Image overlay', ['none', 'subtle', 'strong'])}
          {select('height', 'Banner height', ['small', 'medium', 'large'])}
        </>
      )}
      {value.type === 'image-gallery' && (
        <>
          {select('layout', 'Layout', ['grid', 'mosaic', 'strip', 'carousel'])}
          {!selectedItem && value.presentation.layout === 'carousel' && (
            <SelectField
              id={`${value.id}-visible-images`}
              label="Visible images"
              value={value.presentation.visibleImages ?? 3}
              onChange={(e) =>
                presentation({ visibleImages: Number(e.target.value) })
              }
            >
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </SelectField>
          )}
          {select('aspectRatio', 'Image shape', [
            'landscape',
            'square',
            'portrait',
          ])}
          {!selectedItem && (
            <>
              <Field id={`${value.id}-captions`} label="Show captions">
                <Checkbox
                  id={`${value.id}-captions`}
                  checked={value.presentation.captions}
                  onChange={(e) => presentation({ captions: e.target.checked })}
                />
              </Field>
            </>
          )}
          {value.content.images.map((item, index) => (
            <fieldset
              key={item.id}
              hidden={!!selectedItem && selectedItem !== item.id}
            >
              {photo(item.id, item.image, (image) =>
                content({
                  images: value.content.images.map((i) =>
                    i.id === item.id ? { ...i, image } : i,
                  ),
                }),
              )}
              {selectedItem === item.id &&
                field(
                  item.id + '-caption',
                  'Caption (optional)',
                  item.caption,
                  (caption) =>
                    content({
                      images: value.content.images.map((i) =>
                        i.id === item.id ? { ...i, caption } : i,
                      ),
                    }),
                  200,
                )}
              {actions(
                value.content.images,
                index,
                (images) => content({ images }),
                item.image.alt || 'photograph',
              )}
            </fieldset>
          ))}
          {!selectedItem && (
            <>
              <Button
                variant="secondary"
                disabled={value.content.images.length >= 8}
                onClick={() =>
                  content({
                    images: [
                      ...value.content.images,
                      {
                        id: 'image-' + crypto.randomUUID(),
                        image: { assetId: null, url: '', alt: '' },
                        caption: '',
                      },
                    ],
                  })
                }
              >
                Add photograph
              </Button>
              <p>{value.content.images.length} of 8 photographs</p>
            </>
          )}
        </>
      )}
      {value.type === 'feature-grid' && (
        <>
          {select('columns', 'Desktop columns', [2, 3, 4])}
          {!selectedItem && (
            <EditorRangeField
              id={`${value.id}-icon-size`}
              label="Icon size"
              min={16}
              max={96}
              unit="px"
              value={value.presentation.iconSize ?? 40}
              onChange={(iconSize) => presentation({ iconSize })}
            />
          )}
          {select('iconPosition', 'Icon placement', ['above', 'beside'])}
          {select('cardStyle', 'Feature treatment', [
            'standard',
            'highlighted',
            'bordered',
          ])}
          {value.content.items.map((item, index) => (
            <fieldset
              key={item.id}
              hidden={!!selectedItem && selectedItem !== item.id}
            >
              {field(
                item.id + '-title',
                'Feature title',
                item.title,
                (title) =>
                  content({
                    items: value.content.items.map((i) =>
                      i.id === item.id ? { ...i, title } : i,
                    ),
                  }),
                120,
              )}
              {field(
                item.id + '-description',
                'Feature description',
                item.description,
                (description) =>
                  content({
                    items: value.content.items.map((i) =>
                      i.id === item.id ? { ...i, description } : i,
                    ),
                  }),
                400,
                true,
              )}
              <SelectField
                id={`${value.id}-${item.id}-icon`}
                label="Icon"
                value={item.icon}
                onChange={(e) =>
                  content({
                    items: value.content.items.map((i) =>
                      i.id === item.id ? { ...i, icon: e.target.value } : i,
                    ),
                  })
                }
              >
                <option value="">No icon</option>
                {harvestFeatureIcons.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon.replaceAll('-', ' ')}
                  </option>
                ))}
              </SelectField>
              {actions(
                value.content.items,
                index,
                (items) => content({ items }),
                item.title || 'feature',
              )}
            </fieldset>
          ))}
          {!selectedItem && (
            <>
              <Button
                variant="secondary"
                disabled={value.content.items.length >= 6}
                onClick={() =>
                  content({
                    items: [
                      ...value.content.items,
                      {
                        id: 'feature-' + crypto.randomUUID(),
                        title: 'A little closer to home',
                        description: 'Share what matters to you.',
                        icon: '',
                      },
                    ],
                  })
                }
              >
                Add feature
              </Button>
              <p>{value.content.items.length} of 6 features</p>
            </>
          )}
        </>
      )}
      {(value.type === 'product-showcase' ||
        value.type === 'category-showcase') &&
        (() => {
          const product = value.type === 'product-showcase';
          const key = product ? 'productIds' : 'categoryIds';
          const ids =
            value.type === 'product-showcase'
              ? value.content.productIds
              : value.content.categoryIds;
          const available: Array<{
            id: string;
            name: string;
            pathIds?: string[];
          }> = product
            ? [
                ...new Map(
                  [...products, ...selectedProducts, ...choices].map((row) => [
                    row.id,
                    row,
                  ]),
                ).values(),
              ]
            : choices;
          return (
            <>
              {select(
                'layout',
                'Layout',
                product
                  ? ['grid', 'featured-product', 'compact-row', 'carousel']
                  : ['cards', 'photo-tiles', 'compact'],
              )}
              {!selectedItem &&
                value.type === 'product-showcase' &&
                value.presentation.layout === 'carousel' && (
                  <SelectField
                    id={`${value.id}-visible-products`}
                    label="Visible products"
                    value={value.presentation.visibleImages ?? 3}
                    onChange={(e) =>
                      presentation({ visibleImages: Number(e.target.value) })
                    }
                  >
                    {[1, 2, 3, 4].map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </SelectField>
                )}
              {product
                ? value.presentation.layout !== 'carousel' &&
                  select('columns', 'Desktop columns', [2, 3, 4])
                : select('aspectRatio', 'Image shape', [
                    'landscape',
                    'square',
                    'portrait',
                  ])}
              {product &&
                field('search', 'Search your products', search, setSearch, 100)}
              {!selectedItem && (
                <>
                  <SelectField
                    id={`${value.id}-selection`}
                    label={product ? 'Add a product' : 'Add a category'}
                    value=""
                    disabled={ids.length >= 8}
                    onChange={(e) => {
                      if (e.target.value && !ids.includes(e.target.value))
                        content({ [key]: [...ids, e.target.value] });
                    }}
                  >
                    <option value="">Choose from your catalog</option>
                    {available
                      .filter(
                        (row) =>
                          !ids.includes(row.id) &&
                          (product ||
                            !(row.pathIds ?? [row.id]).some((id) =>
                              hiddenCategoryIds.includes(id),
                            )),
                      )
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                  </SelectField>
                </>
              )}
              {catalogError && <p role="alert">{catalogError}</p>}
              {!catalogError && !available.length && (
                <p>No matching catalog selections are available.</p>
              )}
              {ids.map((id, index) => (
                <div key={id} hidden={!!selectedItem && selectedItem !== id}>
                  {selectedItem === id && (
                    <SelectField
                      id={`${value.id}-${id}-replace`}
                      label={product ? 'Product' : 'Category'}
                      value={id}
                      onChange={(e) => {
                        content({
                          [key]: ids.map((current) =>
                            current === id ? e.target.value : current,
                          ),
                        });
                        workspace?.selectBlock(value.id, e.target.value);
                      }}
                    >
                      {!available.some((row) => row.id === id) && (
                        <option value={id}>
                          Unavailable product or category (ID {id})
                        </option>
                      )}
                      {available
                        .filter(
                          (row) =>
                            row.id === id ||
                            (!ids.includes(row.id) &&
                              (product ||
                                !(row.pathIds ?? [row.id]).some((pathId) =>
                                  hiddenCategoryIds.includes(pathId),
                                ))),
                        )
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name}
                          </option>
                        ))}
                    </SelectField>
                  )}
                  <p>
                    {available.find((row) => row.id === id)?.name ??
                      (product
                        ? products.find((row) => row.id === id)?.name
                        : undefined) ??
                      'Saved selection (currently unavailable)'}
                  </p>
                  {!product && media && onCategoryPresentationChange && (
                    <CategoryImageField
                      api={media}
                      themeId={themeId}
                      label="Category image"
                      presentation="library"
                      value={categoryPresentation?.[id]?.imageAssetId ?? null}
                      preview={categoryPresentation?.[id]?.image ?? ''}
                      onImageChange={(image) =>
                        onCategoryPresentationChange({
                          ...categoryPresentation,
                          [id]: {
                            position: index,
                            visible: true,
                            ...categoryPresentation?.[id],
                            imageAssetId: image?.id ?? null,
                            image: image?.preview ?? '',
                          },
                        })
                      }
                    />
                  )}
                  {actions(
                    ids,
                    index,
                    (next) => content({ [key]: next }),
                    `${product ? 'product' : 'category'} ${id}`,
                  )}
                </div>
              ))}
              {!selectedItem && (
                <>
                  <p>
                    {ids.length} of 8 selected. Only your published catalog can
                    appear.
                  </p>
                  <Field id={`${value.id}-shop-link`} label="Show link to Shop">
                    <Checkbox
                      id={`${value.id}-shop-link`}
                      checked={value.content.showShopLink}
                      onChange={(e) =>
                        content({ showShopLink: e.target.checked })
                      }
                    />
                  </Field>
                </>
              )}
            </>
          );
        })()}
      {select(
        'alignment',
        'Text alignment',
        value.type === 'feature-grid'
          ? ['left', 'center']
          : ['left', 'center', 'right'],
      )}
      {select('backgroundType', 'Background type', ['contained', 'full'])}
      {select('background', 'Background color', ['paper', 'surface', 'ink'])}
      {select('spacing', 'Section spacing', [
        'compact',
        'balanced',
        'spacious',
      ])}
    </>
  );
}
