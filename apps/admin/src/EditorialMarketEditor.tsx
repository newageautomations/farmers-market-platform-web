import { createPortal } from 'react-dom';
import { WebsiteInspectorContent } from './WebsiteEditorContext';
import { useEffect, useState, type ReactNode } from 'react';
import { Field, Input, Textarea } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import type { StorefrontAppearanceApi } from '@market/api';
import type {
  EditorialMarketSettings,
  MarketAppearance,
  StorefrontAppearance,
  StorefrontEditorSection,
} from '@market/theme/storefront';
import {
  editorialHomepageComposition,
  editorialMarketHomepageComposition,
  editorialHomepageTarget,
  type EditorialOriginalSectionId,
} from '@market/theme/storefront';
import { WebsiteSectionManagement } from './WebsiteSectionManagement';
import { HomepageDesignEditor } from './HomepageDesignEditor';
import { CategoryImageField } from './vendor/categories';

type Page =
  | 'home'
  | 'about'
  | 'find'
  | 'contact'
  | 'faq'
  | 'policies'
  | 'products'
  | 'product'
  | 'market-dates'
  | 'vendors'
  | 'applications';
/** Market homepage natives whose market settings the visual editor renders.
 * The original call-to-action banner is edited as a CTA banner section. */
export type EditorialMarketNativeId = 'markets' | 'vendors' | 'categories';

export function EditorialMarketEditor({
  globalContainer,
  categoryPresentation,
  onCategoryPresentationChange,
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
  market = false,
  marketAppearance,
  allowSection,
  marketHeroFields,
  renderMarketNative,
}: {
  /** Market website: market homepage natives replace vendor catalog sections. */
  market?: boolean;
  /** Market copy that seeds the original call-to-action banner. */
  marketAppearance?: MarketAppearance;
  allowSection?: (type: string) => boolean;
  marketHeroFields?: ReactNode;
  renderMarketNative?: (id: EditorialMarketNativeId) => ReactNode;
  globalContainer?: HTMLElement | null;
  categoryPresentation?: StorefrontAppearance['categoryPresentation'];
  onCategoryPresentationChange?: (
    value: NonNullable<StorefrontAppearance['categoryPresentation']>,
  ) => void;
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
  const [categories, setCategories] = useState<
    Array<{ id: string; pathIds?: string[] }>
  >([]);
  const [defaultProducts, setDefaultProducts] = useState<Array<{ id: string }>>(
    [],
  );
  useEffect(() => {
    let active = true;
    if (market)
      return () => {
        active = false;
      };
    if (
      !value.composition ||
      value.composition.some((s) => !('type' in s) && s.id === 'products')
    ) {
      void api
        .products?.('', [])
        .then((rows) => {
          if (active) setDefaultProducts(rows);
        })
        .catch(() => {});
    }
    if (
      !value.composition ||
      value.composition.some((s) => !('type' in s) && s.id === 'categories')
    ) {
      void api
        .showcaseCategories?.()
        .then((rows) => {
          if (active) setCategories(rows);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [api, value.composition, market]);
  const homepageSections = market
    ? editorialMarketHomepageComposition({
        market: marketAppearance,
        template: { settings: value },
      })
    : editorialHomepageComposition(
        value,
        {
          productIds: (products.length ? products : defaultProducts).map(
            (p) => p.id,
          ),
          categoryIds: categories
            .filter(
              (c) =>
                !(c.pathIds ?? [c.id]).some(
                  (id) => categoryPresentation?.[id]?.visible === false,
                ),
            )
            .map((c) => c.id),
        },
        market,
      );
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
    const rendered = (
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
          <WebsiteInspectorContent>
            <fieldset disabled={busy}>{content}</fieldset>
          </WebsiteInspectorContent>
        )}
      </details>
    );
    return globalContainer &&
      ['editorial:header', 'editorial:footer', 'editorial:theme'].includes(id)
      ? createPortal(rendered, globalContainer, id)
      : rendered;
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
          )
            .filter(([key]) => !market || key !== 'findUsLabel')
            .map(([key, label]) =>
              text(`editorial-${key}`, label, value.header[key], 60, (next) =>
                patch({ header: { ...value.header, [key]: next } }),
              ),
            )}
        </>,
      )}

      {page === 'home' && (
        <>
          {disclosure(
            'editorial:theme',
            'Homepage design',
            <HomepageDesignEditor
              id="editorial-homepage"
              value={value.homepageDesign}
              onChange={(homepageDesign) => patch({ homepageDesign })}
            />,
          )}
          <WebsiteSectionManagement<{
            id: EditorialOriginalSectionId;
            visible: boolean;
          }>
            allowSection={allowSection}
            sections={homepageSections.map((section) =>
              'type' in section
                ? section
                : {
                    ...section,
                    visible:
                      section.id === 'impact'
                        ? value.impact.visible
                        : section.id === 'categories' ||
                            section.id === 'products'
                          ? market || value[section.id].visible
                          : true,
                  },
            )}
            onChange={(sections) => {
              const visibility = (id: 'categories' | 'products' | 'impact') =>
                sections.find((section) => section.id === id)?.visible ??
                value[id].visible;
              onChange({
                ...value,
                composition: sections.map((section) =>
                  'type' in section ? section : { id: section.id },
                ),
                categories: {
                  ...value.categories,
                  visible: visibility('categories'),
                },
                products: {
                  ...value.products,
                  visible: visibility('products'),
                },
                impact: { ...value.impact, visible: visibility('impact') },
              });
            }}
            target={editorialHomepageTarget}
            prefix="editorial"
            api={api}
            products={products}
            loadProducts={loadProducts}
            selected={selected}
            choose={choose}
            collapsed={collapsed}
            collapse={collapse}
            busy={busy}
            categoryPresentation={categoryPresentation}
            onCategoryPresentationChange={onCategoryPresentationChange}
            hiddenCategoryIds={Object.entries(categoryPresentation ?? {})
              .filter(([, category]) => !category.visible)
              .map(([id]) => id)}
            canHide={(section) => 'type' in section}
            nativeLabel={(section) =>
              ({
                hero: 'Hero',
                categories: 'Product categories',
                products: 'Featured products',
                impact: 'Community impact artwork',
                markets: 'Upcoming markets',
                vendors: 'Vendors',
                closing: 'Call-to-action banner',
              })[section.id]
            }
            renderNative={(section) => {
              if (section.id === 'hero')
                return (
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
                      (buttonLabel) =>
                        patch({ hero: { ...value.hero, buttonLabel } }),
                    )}
                    {marketHeroFields}
                    {image('desktopHero', 'Desktop hero artwork')}
                    {image('mobileHero', 'Mobile hero artwork')}
                  </>
                );
              if (
                section.id === 'markets' ||
                section.id === 'vendors' ||
                (market && section.id === 'categories')
              )
                return renderMarketNative?.(section.id) ?? null;
              if (section.id === 'impact')
                return (
                  <>
                    {image('desktopFooter', 'Desktop impact artwork')}
                    {image('mobileFooter', 'Mobile impact artwork')}
                    {text(
                      'editorial-impact-alt',
                      'Artwork alternative text',
                      value.impact.imageAlt,
                      200,
                      (imageAlt) =>
                        patch({ impact: { ...value.impact, imageAlt } }),
                      true,
                    )}
                  </>
                );
              return null;
            }}
          />
        </>
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
        !market &&
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
