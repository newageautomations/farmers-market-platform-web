import { useEffect, useState, type ReactNode } from 'react';
import { disclosureClassName } from '@market/ui/presentation';
import {
  Button,
  Dialog,
  IconButton,
  Checkbox,
  Field,
  Input,
  SelectField,
  Textarea,
} from '@market/ui';
import type { StorefrontAppearanceApi } from '@market/api';
import type {
  FarmhouseSettings,
  FarmhouseSection,
  StorefrontEditorSection,
  StorefrontAppearance,
} from '@market/theme/storefront';
import {
  farmhousePalettes,
  farmhouseFonts,
} from '@market/theme/farmhouse-presentation';
import { farmhousePhoto } from '@market/theme/storefront';
import { CategoryImageField } from './vendor/categories';

/** Theme-specific composition using approved editor controls and authorized media. */
export function FarmhouseEditor({
  value,
  onChange,
  api,
  busy,
  products,
  loadProducts,
  selected,
  choose,
  collapsed = false,
  collapse,
  page = 'home',
  appearance,
  onAppearanceChange,
}: {
  value: FarmhouseSettings;
  onChange: (v: FarmhouseSettings) => void;
  api: StorefrontAppearanceApi;
  busy: boolean;
  products: Array<{ id: string; name: string; slug?: string }>;
  loadProducts: () => void;
  selected?: string;
  choose?: (id: StorefrontEditorSection) => void;
  collapsed?: boolean;
  collapse?: () => void;
  page?: string;
  appearance?: Pick<StorefrontAppearance, 'buttonShape' | 'buttonHover'>;
  onAppearanceChange?: (
    patch: Partial<Pick<StorefrontAppearance, 'buttonShape' | 'buttonHover'>>,
  ) => void;
}) {
  const [productPicker, setProductPicker] = useState<{
    section: FarmhouseSection['id'];
    ids: string[];
  }>();
  const [productSearch, setProductSearch] = useState('');
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  useEffect(() => {
    let active = true;
    void api.media
      ?.list()
      .then((rows) => {
        if (active) setCategories(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [api]);
  const patch = (v: Partial<FarmhouseSettings>) => onChange({ ...value, ...v });
  const section = (id: FarmhouseSection['id'], v: Partial<FarmhouseSection>) =>
    patch({
      sections: value.sections.map((s) => (s.id === id ? { ...s, ...v } : s)),
    });
  const text = (
    id: string,
    label: string,
    v: string,
    max: number,
    change: (v: string) => void,
    multiline = false,
  ) => (
    <Field key={id} id={id} label={label}>
      {multiline ? (
        <Textarea
          id={id}
          value={v}
          maxLength={max}
          rows={3}
          onChange={(e) => change(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={v}
          maxLength={max}
          onChange={(e) => change(e.target.value)}
        />
      )}
    </Field>
  );
  const photo = (
    id: string,
    v: FarmhouseSection['photo'],
    change: (v: FarmhouseSection['photo']) => void,
  ) => (
    <>
      {api.media && (
        <CategoryImageField
          api={api.media}
          themeId="modern-farmhouse"
          value={v.assetId}
          preview={v.url}
          label="Photograph"
          presentation="library"
          onImageChange={(image) =>
            change({
              ...v,
              assetId: image?.id ?? null,
              url: image?.preview ?? '',
            })
          }
        />
      )}{' '}
      {text(id + '-alt', 'Image description', v.alt, 200, (alt) =>
        change({ ...v, alt }),
      )}
      {(['desktop', 'mobile'] as const).map((device) => (
        <SelectField
          key={device}
          id={id + '-' + device}
          label={`${device === 'desktop' ? 'Desktop' : 'Mobile'} image position`}
          value={v[device]}
          onChange={(e) =>
            change({ ...v, [device]: e.target.value as typeof v.desktop })
          }
        >
          {['center', 'top', 'bottom', 'left', 'right'].map((position) => (
            <option key={position}>{position}</option>
          ))}
        </SelectField>
      ))}
    </>
  );
  const dropdown = (
    id: StorefrontEditorSection,
    label: string,
    children: ReactNode,
  ) => {
    const open = !collapsed && selected === id;
    return (
      <details
        key={id}
        className={disclosureClassName('dropdown')}
        open={open}
        data-farmhouse-editor={
          id.startsWith('farmhouse:') ? id.slice(10) : undefined
        }
      >
        <summary
          role="button"
          aria-expanded={open}
          onClick={(event) => {
            event.preventDefault();
            if (open) collapse?.();
            else choose?.(id);
          }}
        >
          {label}
        </summary>
        {open && (
          <div className="ui-disclosure-content visual-editor-section-content">
            <fieldset disabled={busy}>{children}</fieldset>
          </div>
        )}
      </details>
    );
  };
  return (
    <>
      {dropdown(
        'header',
        'Header',
        <>
          {(['shopLabel', 'storyLabel'] as const).map((key) =>
            text(
              'farmhouse-header-' + key,
              {
                shopLabel: 'Shop navigation label',
                storyLabel: 'Story navigation label',
              }[key],
              value.header[key],
              60,
              (v) => patch({ header: { ...value.header, [key]: v } }),
            ),
          )}
        </>,
      )}
      {dropdown(
        'footer',
        'Footer',
        <p>
          Footer links follow your enabled pages and product categories. Social
          links use your Contact settings.
        </p>,
      )}
      {dropdown(
        'theme',
        'Theme settings',
        <>
          {' '}
          <label className="story-page-toggle" htmlFor="farmhouse-scroll-fade">
            <Checkbox
              id="farmhouse-scroll-fade"
              role="switch"
              className="sr-only"
              checked={value.scrollFade ?? false}
              onChange={(e) => patch({ scrollFade: e.target.checked })}
            />
            <span className="story-switch-track" aria-hidden="true" />
            <span>Fade in while scrolling</span>
          </label>
          <SelectField
            id="farmhouse-palette"
            label="Palette"
            className="ui-palette-select"
            value={value.palette}
            onChange={(e) =>
              patch({ palette: e.target.value as FarmhouseSettings['palette'] })
            }
          >
            {Object.entries(farmhousePalettes).map(([key, palette]) => (
              <option key={key} value={key}>
                <span className="ui-palette-option">
                  <span className="ui-palette-option-label">
                    {palette.label}
                  </span>
                  <span className="ui-palette-swatches" aria-hidden="true">
                    {(
                      ['primary', 'secondary', 'background', 'surface'] as const
                    ).map((token) => (
                      <span
                        key={token}
                        className="ui-palette-swatch"
                        style={{ backgroundColor: palette[token] }}
                      />
                    ))}
                  </span>
                </span>
              </option>
            ))}
          </SelectField>
          <SelectField
            id="farmhouse-type"
            label="Typography"
            value={value.typography}
            onChange={(e) =>
              patch({
                typography: e.target.value as FarmhouseSettings['typography'],
              })
            }
          >
            {Object.entries(farmhouseFonts).map(([key, font]) => (
              <option key={key} value={key}>
                {font.label}
              </option>
            ))}
          </SelectField>
          <p
            style={{
              fontFamily: farmhouseFonts[value.typography].heading,
              fontSize: '1.8rem',
            }}
          >
            Good things, thoughtfully made.
          </p>
          <SelectField
            id="farmhouse-button-shape"
            label="Button shape"
            value={appearance?.buttonShape ?? 'pill'}
            onChange={(e) =>
              onAppearanceChange?.({
                buttonShape: e.target
                  .value as StorefrontAppearance['buttonShape'],
              })
            }
          >
            <option value="square">Square / minimal</option>
            <option value="soft">Softly rounded</option>
            <option value="pill">Pill-shaped</option>
          </SelectField>
          <SelectField
            id="farmhouse-button-hover"
            label="Button hover effect"
            value={appearance?.buttonHover ?? 'lift'}
            onChange={(e) =>
              onAppearanceChange?.({
                buttonHover: e.target
                  .value as StorefrontAppearance['buttonHover'],
              })
            }
          >
            <option value="lift">Subtle lift</option>
            <option value="darken">Darken</option>
            <option value="outline">Outline transition</option>
          </SelectField>
        </>,
      )}
      {page === 'products' &&
        dropdown(
          'farmhouse:shop-settings',
          'Shop settings',
          <>
            {' '}
            {text(
              'farmhouse-shop-heading',
              'Shop heading',
              value.pages.shopHeading,
              160,
              (shopHeading) =>
                patch({ pages: { ...value.pages, shopHeading } }),
            )}
            {text(
              'farmhouse-shop-intro',
              'Shop introduction',
              value.pages.shopIntroduction,
              600,
              (shopIntroduction) =>
                patch({ pages: { ...value.pages, shopIntroduction } }),
              true,
            )}
            <p>The hero photograph is shared with the homepage opening.</p>
            {photo(
              'farmhouse-shop-photo',
              value.sections.find((s) => s.id === 'cinematic')!.photo,
              (v) => section('cinematic', { photo: v }),
            )}
          </>,
        )}
      {page === 'about' &&
        dropdown(
          'farmhouse:story-layout',
          'Story composition',
          <>
            {' '}
            <SelectField
              id="farmhouse-story-layout"
              label="Story composition"
              value={value.pages.storyLayout}
              onChange={(e) =>
                patch({
                  pages: {
                    ...value.pages,
                    storyLayout: e.target
                      .value as FarmhouseSettings['pages']['storyLayout'],
                  },
                })
              }
            >
              <option value="alternating">
                Alternating image and text spreads
              </option>
              <option value="image-first">Photograph above text</option>
            </SelectField>
          </>,
        )}
      {page === 'product' &&
        dropdown(
          'farmhouse:gallery',
          'Product gallery',
          <>
            {' '}
            <SelectField
              id="farmhouse-gallery"
              label="Product gallery"
              value={value.pages.gallery}
              onChange={(e) =>
                patch({
                  pages: {
                    ...value.pages,
                    gallery: e.target
                      .value as FarmhouseSettings['pages']['gallery'],
                  },
                })
              }
            >
              <option value="mosaic">Large supporting photographs</option>
              <option value="rail">Compact photograph rail</option>
            </SelectField>
          </>,
        )}
      {page === 'home' &&
        value.sections.map((s, index) =>
          dropdown(
            `farmhouse:${s.id}`,
            `${{ cinematic: 'Cinematic opening', discovery: 'Editorial discovery', products: 'Featured products', story: 'Image and story', collection: 'Product story', invitation: 'Closing invitation' }[s.id]}${s.visible ? '' : ' (hidden)'}`,
            <>
              {' '}
              <label className="story-page-toggle" htmlFor={s.id + '-visible'}>
                <Checkbox
                  id={s.id + '-visible'}
                  role="switch"
                  className="sr-only"
                  aria-label={`Enable ${s.heading || s.id}`}
                  checked={s.visible}
                  onChange={(e) => section(s.id, { visible: e.target.checked })}
                />
                <span className="story-switch-track" aria-hidden="true" />
                <span>{s.visible ? 'Enabled' : 'Disabled'}</span>
              </label>
              {text(s.id + '-heading', 'Heading', s.heading, 160, (heading) =>
                section(s.id, { heading }),
              )}
              {text(
                s.id + '-body',
                'Supporting copy',
                s.body,
                1200,
                (body) => section(s.id, { body }),
                true,
              )}
              {text(s.id + '-label', 'Link label', s.label, 80, (label) =>
                section(s.id, { label }),
              )}
              <Destination
                categories={categories}
                id={s.id + '-destination'}
                value={s.destination}
                products={products}
                loadProducts={loadProducts}
                onChange={(destination) => section(s.id, { destination })}
              />
              {!['products', 'invitation'].includes(s.id) &&
                photo(s.id, s.photo, (v) => section(s.id, { photo: v }))}
              {['products', 'collection'].includes(s.id) && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      loadProducts();
                      setProductSearch('');
                      setProductPicker({
                        section: s.id,
                        ids: [...s.productIds],
                      });
                    }}
                  >
                    Choose featured products
                  </Button>
                  <p>
                    {s.productIds.length
                      ? s.productIds.length + ' products selected'
                      : 'Using catalog selection'}
                  </p>
                </>
              )}
              {s.id === 'discovery' && (
                <>
                  {s.tiles.map((tile, i) => (
                    <div key={i}>
                      {text(
                        `tile-${i}-title`,
                        'Tile title',
                        tile.title,
                        100,
                        (title) =>
                          section(s.id, {
                            tiles: s.tiles.map((t, j) =>
                              j === i ? { ...t, title } : t,
                            ),
                          }),
                      )}
                      {text(
                        `tile-${i}-body`,
                        'Tile text',
                        tile.body,
                        300,
                        (body) =>
                          section(s.id, {
                            tiles: s.tiles.map((t, j) =>
                              j === i ? { ...t, body } : t,
                            ),
                          }),
                      )}
                      <Destination
                        categories={categories}
                        id={`tile-${i}-destination`}
                        value={tile.destination}
                        products={products}
                        loadProducts={loadProducts}
                        onChange={(destination) =>
                          section(s.id, {
                            tiles: s.tiles.map((t, j) =>
                              j === i ? { ...t, destination } : t,
                            ),
                          })
                        }
                      />
                      {photo('tile-' + i, tile.photo, (v) =>
                        section(s.id, {
                          tiles: s.tiles.map((t, j) =>
                            j === i ? { ...t, photo: v } : t,
                          ),
                        }),
                      )}
                      <Button
                        variant="destructive-outline"
                        onClick={() =>
                          section(s.id, {
                            tiles: s.tiles.filter((_, j) => i !== j),
                          })
                        }
                      >
                        Remove tile
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    disabled={s.tiles.length >= 3}
                    onClick={() =>
                      section(s.id, {
                        tiles: [
                          ...s.tiles,
                          {
                            title: 'Explore the shop',
                            body: 'Discover something for your next market visit.',
                            destination: '/products',
                            photo: { ...farmhousePhoto },
                          },
                        ],
                      })
                    }
                  >
                    Add editorial tile
                  </Button>
                  <p>
                    With no custom tiles, this section uses real catalog
                    categories and product photographs.
                  </p>
                </>
              )}
              <div className="ui-actions">
                <IconButton
                  icon="arrow-up"
                  label={`Move up: ${s.heading || s.id}`}
                  size="compact"
                  disabled={index === 0}
                  onClick={() => {
                    const sections = [...value.sections];
                    [sections[index - 1], sections[index]] = [
                      sections[index]!,
                      sections[index - 1]!,
                    ];
                    patch({ sections });
                  }}
                ></IconButton>
                <IconButton
                  icon="arrow-down"
                  label={`Move down: ${s.heading || s.id}`}
                  size="compact"
                  disabled={index === value.sections.length - 1}
                  onClick={() => {
                    const sections = [...value.sections];
                    [sections[index + 1], sections[index]] = [
                      sections[index]!,
                      sections[index + 1]!,
                    ];
                    patch({ sections });
                  }}
                ></IconButton>
              </div>
            </>,
          ),
        )}
      <Dialog
        open={!!productPicker}
        onClose={() => setProductPicker(undefined)}
        title="Choose featured products"
        size="wide"
        busy={busy}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setProductPicker(undefined)}
            >
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (productPicker)
                  section(productPicker.section, {
                    productIds: productPicker.ids,
                  });
                setProductPicker(undefined);
              }}
            >
              Use selected products
            </Button>
          </>
        }
      >
        <Field id="farmhouse-product-search" label="Search products">
          <Input
            id="farmhouse-product-search"
            type="search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </Field>
        <p>
          {productPicker?.ids.length ?? 0} of 12 selected. Leave empty to use
          the catalog selection.
        </p>
        <div className="storefront-product-picker">
          {[
            ...products,
            ...(productPicker?.ids
              .filter((id) => !products.some((p) => p.id === id))
              .map((id) => ({ id, name: 'Selected product ' + id })) ?? []),
          ]
            .filter((product) =>
              product.name
                .toLocaleLowerCase()
                .includes(productSearch.toLocaleLowerCase()),
            )
            .map((product) => (
              <label
                className="storefront-product-choice"
                key={product.id}
                htmlFor={'farmhouse-product-' + product.id}
              >
                <Checkbox
                  id={'farmhouse-product-' + product.id}
                  checked={productPicker?.ids.includes(product.id) ?? false}
                  disabled={
                    busy ||
                    ((productPicker?.ids.length ?? 0) >= 12 &&
                      !productPicker?.ids.includes(product.id))
                  }
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setProductPicker((current) =>
                      current
                        ? {
                            ...current,
                            ids: checked
                              ? [...current.ids, product.id]
                              : current.ids.filter((id) => id !== product.id),
                          }
                        : current,
                    );
                  }}
                />
                <span>{product.name}</span>
              </label>
            ))}
        </div>
      </Dialog>
    </>
  );
}

function Destination({
  categories,
  id,
  value,
  onChange,
  products,
  loadProducts,
}: {
  categories: Array<{ id: string; name: string }>;
  id: string;
  value: string;
  onChange: (v: string) => void;
  products: Array<{ id: string; name: string; slug?: string }>;
  loadProducts: () => void;
}) {
  return (
    <SelectField
      id={id}
      label="Link destination"
      value={value}
      onFocus={loadProducts}
      onChange={(e) => onChange(e.target.value)}
    >
      {[
        ['/', 'Homepage'],
        ['/products', 'Shop'],
        ['/about', 'Our story'],
        ['/find-us', 'Find us'],
        ['/contact', 'Contact'],
        ['/faq', 'FAQ'],
        ['/policies', 'Policies'],
      ].map(([path, label]) => (
        <option key={path} value={path}>
          {label}
        </option>
      ))}
      {products
        .filter((p) => p.slug)
        .map((p) => (
          <option key={p.id} value={'/products/' + encodeURIComponent(p.slug!)}>
            {p.name}
          </option>
        ))}
      {categories.map((category) => (
        <option
          key={'category-' + category.id}
          value={'/products?category=' + encodeURIComponent(category.id)}
        >
          {category.name} collection
        </option>
      ))}
      {value.includes('?category=') &&
        !categories.some(
          (c) => value === '/products?category=' + encodeURIComponent(c.id),
        ) && <option value={value}>Selected catalog category</option>}
    </SelectField>
  );
}
