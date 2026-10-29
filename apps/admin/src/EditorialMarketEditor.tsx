import { useEffect, useState, type ReactNode } from 'react';
import {
  Button,
  Checkbox,
  Field,
  Input,
  SelectField,
  Textarea,
} from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import type { StorefrontAppearanceApi, VendorCategory } from '@market/api';
import type {
  EditorialMarketSettings,
  StorefrontEditorSection,
} from '@market/theme/storefront';
import { CategoryImageField } from './vendor/categories';

type Page =
  | 'home'
  | 'about'
  | 'find'
  | 'contact'
  | 'faq'
  | 'policies'
  | 'products'
  | 'product';

export function EditorialMarketEditor({
  value,
  onChange,
  api,
  products,
  loadProducts,
  page,
  selected,
  collapsed,
  choose,
  collapse,
  busy,
}: {
  value: EditorialMarketSettings;
  onChange: (value: EditorialMarketSettings) => void;
  api: StorefrontAppearanceApi;
  products: Array<{ id: string; name: string; slug?: string }>;
  loadProducts: () => void;
  page: Page;
  selected: StorefrontEditorSection;
  collapsed: boolean;
  choose: (id: StorefrontEditorSection) => void;
  collapse: () => void;
  busy: boolean;
}) {
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [categoryError, setCategoryError] = useState(false);
  useEffect(() => {
    if (!api.media) return;
    let active = true;
    void api.media
      .list()
      .then((rows) => {
        if (active) {
          setCategories(rows);
          setCategoryError(false);
        }
      })
      .catch(() => {
        if (active) setCategoryError(true);
      });
    return () => {
      active = false;
    };
  }, [api]);

  const patch = (next: Partial<EditorialMarketSettings>) =>
    onChange({ ...value, ...next });
  const text = (
    id: string,
    label: string,
    current: string,
    max: number,
    change: (next: string) => void,
    multiline = false,
  ) => (
    <Field id={id} label={label}>
      {multiline ? (
        <Textarea
          id={id}
          value={current}
          maxLength={max}
          rows={4}
          onChange={(event) => change(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={current}
          maxLength={max}
          onChange={(event) => change(event.target.value)}
        />
      )}
    </Field>
  );
  const disclosure = (
    id: StorefrontEditorSection,
    label: string,
    content: ReactNode,
  ) => {
    const open = !collapsed && selected === id;
    return (
      <details key={id} className={disclosureClassName('dropdown')} open={open}>
        <summary
          role="button"
          aria-expanded={open}
          onClick={(event) => {
            event.preventDefault();
            if (open) collapse();
            else choose(id);
          }}
        >
          {label}
        </summary>
        {open && (
          <div className="ui-disclosure-content visual-editor-section-content">
            <fieldset disabled={busy}>{content}</fieldset>
          </div>
        )}
      </details>
    );
  };
  const image = (
    key: keyof EditorialMarketSettings['assets'],
    label: string,
  ) => {
    const current = value.assets[key];
    return api.media ? (
      <CategoryImageField
        key={key}
        api={api.media}
        themeId="editorial-market"
        value={current.assetId}
        preview={current.url}
        label={label}
        presentation="library"
        onImageChange={(selectedImage) =>
          patch({
            assets: {
              ...value.assets,
              [key]: {
                assetId: selectedImage?.id ?? null,
                url: selectedImage
                  ? (selectedImage.source ?? selectedImage.preview)
                  : '',
                alt: current.alt,
              },
            },
          })
        }
      />
    ) : (
      <p>Connect your vendor session to choose images.</p>
    );
  };

  return (
    <>
      {disclosure(
        'editorial:header',
        'Header',
        <>
          {text(
            'editorial-announcement',
            'Announcement',
            value.header.announcement,
            160,
            (announcement) =>
              patch({ header: { ...value.header, announcement } }),
          )}
          {(
            [
              ['shopLabel', 'Shop navigation label'],
              ['storyLabel', 'Story navigation label'],
              ['findUsLabel', 'Find Us navigation label'],
              ['contactLabel', 'Contact navigation label'],
            ] as const
          ).map(([key, label]) =>
            text(`editorial-${key}`, label, value.header[key], 60, (next) =>
              patch({ header: { ...value.header, [key]: next } }),
            ),
          )}
        </>,
      )}
      {page === 'home' &&
        disclosure(
          'editorial:hero',
          'Hero',
          <>
            {text(
              'editorial-hero-heading',
              'Heading',
              value.hero.heading,
              160,
              (heading) => patch({ hero: { ...value.hero, heading } }),
            )}
            {text(
              'editorial-hero-introduction',
              'Introduction',
              value.hero.introduction,
              600,
              (introduction) =>
                patch({ hero: { ...value.hero, introduction } }),
              true,
            )}
            {text(
              'editorial-hero-button',
              'Button label',
              value.hero.buttonLabel,
              80,
              (buttonLabel) => patch({ hero: { ...value.hero, buttonLabel } }),
            )}
            {image('desktopHero', 'Desktop hero artwork')}
            {image('mobileHero', 'Mobile hero artwork')}
          </>,
        )}
      {page === 'home' &&
        disclosure(
          'editorial:categories',
          `Product categories${value.categories.visible ? '' : ' (hidden)'}`,
          <>
            <Field id="editorial-categories-visible" label="Show categories">
              <Checkbox
                id="editorial-categories-visible"
                checked={value.categories.visible}
                onChange={(event) =>
                  patch({
                    categories: {
                      ...value.categories,
                      visible: event.target.checked,
                    },
                  })
                }
              />
            </Field>
            {text(
              'editorial-categories-heading',
              'Heading',
              value.categories.heading,
              160,
              (heading) =>
                patch({ categories: { ...value.categories, heading } }),
            )}
            {text(
              'editorial-categories-link',
              'Shop link label',
              value.categories.linkLabel,
              80,
              (linkLabel) =>
                patch({ categories: { ...value.categories, linkLabel } }),
            )}
            <SelectField
              id="editorial-category-limit"
              label="Categories shown"
              value={String(value.categories.limit)}
              onChange={(event) =>
                patch({
                  categories: {
                    ...value.categories,
                    limit: Number(event.target.value),
                  },
                })
              }
            >
              {[4, 6, 8, 10, 12].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </SelectField>
            {categoryError && (
              <p role="status">
                Product categories could not be loaded. Existing image choices
                are retained.
              </p>
            )}
            {!categoryError && !categories.length && (
              <p>No product categories are available yet.</p>
            )}
            {api.media &&
              categories.slice(0, value.categories.limit).map((category) => {
                const selectedImage = value.categories.images[category.id];
                return (
                  <CategoryImageField
                    key={category.id}
                    api={api.media!}
                    themeId="editorial-market"
                    value={selectedImage?.assetId}
                    preview={selectedImage?.url}
                    label={`${category.name} image`}
                    presentation="library"
                    onImageChange={(image) => {
                      const images = { ...value.categories.images };
                      if (image)
                        images[category.id] = {
                          assetId: image.id,
                          url: image.preview,
                        };
                      else delete images[category.id];
                      patch({
                        categories: { ...value.categories, images },
                      });
                    }}
                  />
                );
              })}
          </>,
        )}
      {page === 'home' &&
        disclosure(
          'editorial:products',
          `Featured products${value.products.visible ? '' : ' (hidden)'}`,
          <>
            <Field id="editorial-products-visible" label="Show products">
              <Checkbox
                id="editorial-products-visible"
                checked={value.products.visible}
                onChange={(event) =>
                  patch({
                    products: {
                      ...value.products,
                      visible: event.target.checked,
                    },
                  })
                }
              />
            </Field>
            {text(
              'editorial-products-heading',
              'Heading',
              value.products.heading,
              160,
              (heading) => patch({ products: { ...value.products, heading } }),
            )}
            {text(
              'editorial-products-link',
              'Shop link label',
              value.products.linkLabel,
              80,
              (linkLabel) =>
                patch({ products: { ...value.products, linkLabel } }),
            )}
            <Button variant="secondary" onClick={loadProducts}>
              Load products
            </Button>
            <div className="storefront-product-picker">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="storefront-product-choice"
                  htmlFor={`editorial-product-${product.id}`}
                >
                  <Checkbox
                    id={`editorial-product-${product.id}`}
                    checked={value.products.productIds.includes(product.id)}
                    disabled={
                      value.products.productIds.length >= 8 &&
                      !value.products.productIds.includes(product.id)
                    }
                    onChange={(event) =>
                      patch({
                        products: {
                          ...value.products,
                          productIds: event.target.checked
                            ? [...value.products.productIds, product.id]
                            : value.products.productIds.filter(
                                (id) => id !== product.id,
                              ),
                        },
                      })
                    }
                  />
                  <span>{product.name}</span>
                </label>
              ))}
            </div>
          </>,
        )}
      {page === 'home' &&
        disclosure(
          'editorial:impact',
          `Community impact artwork${value.impact.visible ? '' : ' (hidden)'}`,
          <>
            <Field id="editorial-impact-visible" label="Show artwork">
              <Checkbox
                id="editorial-impact-visible"
                checked={value.impact.visible}
                onChange={(event) =>
                  patch({
                    impact: { ...value.impact, visible: event.target.checked },
                  })
                }
              />
            </Field>
            {image('desktopFooter', 'Desktop impact artwork')}
            {image('mobileFooter', 'Mobile impact artwork')}
            {text(
              'editorial-impact-alt',
              'Artwork alternative text',
              value.impact.imageAlt,
              200,
              (imageAlt) => patch({ impact: { ...value.impact, imageAlt } }),
              true,
            )}
          </>,
        )}
      {disclosure(
        'editorial:footer',
        'Footer',
        <>
          {text(
            'editorial-footer-tagline',
            'Tagline',
            value.footer.tagline,
            240,
            (tagline) => patch({ footer: { ...value.footer, tagline } }),
          )}
          {text(
            'editorial-footer-shop',
            'Shop link label',
            value.footer.shopLabel,
            60,
            (shopLabel) => patch({ footer: { ...value.footer, shopLabel } }),
          )}
          {text(
            'editorial-footer-story',
            'Story link label',
            value.footer.storyLabel,
            60,
            (storyLabel) => patch({ footer: { ...value.footer, storyLabel } }),
          )}
        </>,
      )}
      {page === 'products' &&
        disclosure(
          'editorial:shop-settings',
          'Shop settings',
          <>
            {text(
              'editorial-shop-heading',
              'Shop heading',
              value.pages.shopHeading,
              160,
              (shopHeading) =>
                patch({ pages: { ...value.pages, shopHeading } }),
            )}
            {text(
              'editorial-shop-introduction',
              'Shop introduction',
              value.pages.shopIntroduction,
              600,
              (shopIntroduction) =>
                patch({ pages: { ...value.pages, shopIntroduction } }),
              true,
            )}
          </>,
        )}
    </>
  );
}
