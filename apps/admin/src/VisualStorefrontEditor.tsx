import { CategoryImageField } from './vendor/categories';
import { WebsiteSectionDestination } from './WebsiteSectionManagement';
import { createPortal } from 'react-dom';
import { WebsiteSectionManagement } from './WebsiteSectionManagement';
import './market/phase14/designer.css';
import './website-editor.css';
import { browserOrigin, browserUrl } from './remote-demo';
import {
  WebsiteEditorContext,
  WebsiteInspectorContent,
} from './WebsiteEditorContext';
import { StorefrontCategoriesEditor } from './StorefrontCategoriesEditor';
import { FarmhouseEditor } from './FarmhouseEditor';
import { EditorialMarketEditor } from './EditorialMarketEditor';
import { PoliciesEditor } from './PoliciesEditor';
import { FaqEditor } from './FaqEditor';
import { ContactEditor } from './ContactEditor';
import { TextSizeControls } from './TextSizeControls';
import { FindUsEditor } from './FindUsEditor';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  safeError,
  safeStorefrontUrl,
  type StorefrontAppearanceApi,
  type StorefrontAppearanceRecord,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ErrorState,
  Field,
  Input,
  IconButton,
  UtilityIcon,
  SelectField,
  Spinner,
  Textarea,
} from '@market/ui';
import { disclosureClassName, buttonClassName } from '@market/ui/presentation';
import {
  effectiveWebsitePageSections,
  editorialHomepageComposition,
  editorialMarketHiddenText,
  headingOnlyMarketText,
  usesHarvestContract,
  editorialMarketHomepageComposition,
  supportsWebsitePageHero,
  defaultContact,
  defaultFindUs,
  defaultFaq,
  harvestOriginalSections,
  harvestHomepageTarget,
  marketOriginalSections,
  marketTextFields,
  marketAppearanceDefaults,
  marketHeroDestinations,
  permitsMarketWebsiteSection,
  type MarketAppearance,
  type MarketPageId,
  type MarketTextKey,
  websitePageRules,
  type WebsiteEditorialPage,
  type WebsitePageRegion,
  type WebsiteSection,
  type HarvestHomepageSection,
  type HarvestOriginalSectionId,
  defaultPolicies,
  storefrontAppearanceSchema,
  websiteSectionItems,
  effectiveWebsiteBlocks,
  storefrontEditorSections,
  storefrontPalettes,
  bloomPalettes,
  themeOffersButtonHover,
  storefrontThemes,
  storefrontPreviewPath,
  storefrontTextFields,
  aboutSections,
  isStorefrontEditorSection,
  vendorAppearanceDefaults,
  type StorefrontAppearance,
  type StorefrontEditorSection,
  type StorefrontTextKey,
} from '@market/theme/storefront';
import {
  ImageShapeField,
  VendorHomepageOptions,
  VendorTypography,
} from './StorefrontAppearance';
import { AboutStoryEditor } from './AboutStoryEditor';

export function VisualStorefrontEditor({
  record,
  api,
  onSaved,
  onDirty,
  dashboardHref = '/vendor',
  backLabel = 'Back to dashboard',
  initialMode = 'inspect',
  market = false,
}: {
  record: StorefrontAppearanceRecord;
  api: StorefrontAppearanceApi;
  onSaved: (record: StorefrontAppearanceRecord) => void;
  onDirty?: (dirty: boolean) => void;
  dashboardHref?: string;
  backLabel?: string;
  initialMode?: 'inspect' | 'browse';
  /** Market Harvest website: market homepage natives and market pages. */
  market?: boolean;
}) {
  const [history, setHistory] = useState<{
    past: StorefrontAppearance[];
    value: StorefrontAppearance;
    future: StorefrontAppearance[];
  }>({ past: [], value: record.draft, future: [] });
  const draft = history.value;
  const [requestedSection, setSection] = useState<StorefrontEditorSection>(
    () =>
      record.draft.template?.id === 'editorial-market'
        ? 'editorial:hero'
        : 'hero',
  );
  const [selectionTrail, setSelectionTrail] = useState<
    StorefrontEditorSection[]
  >([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [structure, setStructure] = useState(true);
  const [path, setPath] = useState('/');
  const [mode, setMode] = useState<'inspect' | 'browse'>(initialMode);
  const [viewport, setViewport] = useState('desktop');
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [globalContainer, setGlobalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const globalItem = (id: string, content: React.ReactNode) =>
    globalContainer && ['header', 'footer', 'theme'].includes(id)
      ? createPortal(content, globalContainer, id)
      : content;
  const [inspector, setInspector] = useState<HTMLElement | null>(null);
  const [requestedBlock, setBlock] = useState<{
    sectionId: string;
    blockId: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [liveUrl, setLiveUrl] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [products, setProducts] = useState<
    Array<{ id: string; name: string; slug?: string }>
  >([]);
  const [scrollRequest, setScrollRequest] = useState(0);
  const lock = useRef(false);
  const mounted = useRef(true);
  const dirty = JSON.stringify(draft) !== JSON.stringify(record.draft);
  const unpublished =
    record.isLive === false ||
    JSON.stringify(record.draft) !== JSON.stringify(record.published);
  const valid = useMemo(
    () => storefrontAppearanceSchema.safeParse(draft),
    [draft],
  );
  const previewConfig = useMemo(() => {
    if (valid.success) return valid.data;
    for (let i = history.past.length - 1; i >= 0; i--) {
      const previous = storefrontAppearanceSchema.safeParse(history.past[i]);
      if (previous.success) return previous.data;
    }
    return record.draft;
  }, [valid, history.past, record.draft]);
  const template = draft.template;
  const homeNatives: readonly string[] = market
    ? marketOriginalSections
    : harvestOriginalSections;
  const defaultHome = homeNatives.map((id) => ({
    id,
  })) as HarvestHomepageSection[];
  const marketConfig: MarketAppearance =
    draft.market ?? marketAppearanceDefaults;
  const marketPageId = market
    ? (['market-dates', 'vendors', 'applications'] as const).find(
        (id) => path === `/${id}`,
      )
    : undefined;
  const allowSection = market ? permitsMarketWebsiteSection : undefined;
  const editorialPage = (
    path === '/shop' ? 'products' : path.slice(1)
  ) as WebsiteEditorialPage;
  const homePrefix =
    template?.id === 'editorial-market'
      ? 'editorial'
      : template?.id === 'modern-farmhouse'
        ? 'farmhouse'
        : 'harvest';
  const composition =
    path !== '/'
      ? Object.entries({
          before: effectiveWebsitePageSections(draft, editorialPage, 'before'),
          after: effectiveWebsitePageSections(draft, editorialPage, 'after'),
        }).flatMap(([region, sections]) =>
          (sections as WebsiteSection[]).map((item) => ({
            ...item,
            selection: `page:${editorialPage}:${region}:${item.id}`,
          })),
        )
      : (template?.id === 'modern-farmhouse'
          ? template.settings.sections
          : template?.id === 'editorial-market'
            ? market
              ? editorialMarketHomepageComposition({
                  market: draft.market,
                  template,
                })
              : editorialHomepageComposition(template.settings)
            : (draft.harvestComposition ?? defaultHome)
        ).map((item) => ({ ...item, selection: `${homePrefix}:${item.id}` }));
  const exists = (id: string) =>
    composition.some((item) => item.selection === id);
  const section =
    /^(?:farmhouse|editorial|harvest|page):.*(?:text|image-with-text|cta-banner|image-banner|image-gallery|feature-grid|product-showcase|category-showcase)-/.test(
      requestedSection,
    ) && !exists(requestedSection)
      ? ([...selectionTrail].reverse().find(exists) ?? 'theme')
      : requestedSection;
  const blockParent = composition.find(
    (s) => s.id === requestedBlock?.sectionId,
  );
  const block =
    requestedBlock &&
    blockParent &&
    'type' in blockParent &&
    (blockParent.type === 'image-with-text'
      ? effectiveWebsiteBlocks(blockParent)
      : websiteSectionItems(blockParent)
    ).some((b) => b.id === requestedBlock.blockId)
      ? requestedBlock
      : undefined;
  const vendor = draft.vendor ?? {
    ...vendorAppearanceDefaults,
    // Adopting vendor options must preserve the legacy homepage story.
    aboutEnabled: !!draft.homepage.story,
    aboutBlurb: '',
    ...(draft.homepage.story ? { aboutUseLegacyStory: true } : {}),
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onDirty?.(dirty);
  }, [dirty, onDirty]);
  const [loadProducts, setLoadProducts] = useState(false);
  useEffect(() => {
    if (!loadProducts) return;
    let active = true;
    void api
      .products?.()
      .then((value) => {
        if (active) setProducts(value);
      })
      .catch(() => {
        if (active)
          setNotice(
            'Product examples could not be loaded. You can still browse products inside the preview.',
          );
      });
    return () => {
      active = false;
    };
  }, [api, loadProducts]);
  useEffect(() => {
    if (!dirty) return;
    let approved = false;
    const unload = (event: BeforeUnloadEvent) => {
      if (approved) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const navigate = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null;
      if (
        !link ||
        link.target === '_blank' ||
        link.getAttribute('href')?.startsWith('#') ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      approved = window.confirm('Discard unsaved storefront changes?');
      if (!approved) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const beforeExit = (event: Event) => {
      approved = window.confirm('Discard unsaved storefront changes?');
      if (!approved) event.preventDefault();
    };
    window.addEventListener('storefront-editor:before-exit', beforeExit);
    const current = window.location.href;
    const back = (event: PopStateEvent) => {
      if (approved) {
        approved = false;
        return;
      }
      if (!window.confirm('Discard unsaved storefront changes?')) {
        event.stopImmediatePropagation();
        window.history.pushState(null, '', current);
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    window.addEventListener('popstate', back, true);
    return () => {
      window.removeEventListener('storefront-editor:before-exit', beforeExit);
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
      window.removeEventListener('popstate', back, true);
    };
  }, [dirty]);
  function replace(value: StorefrontAppearance) {
    setHistory((h) => ({
      past: [...h.past.slice(-49), h.value],
      value,
      future: [],
    }));
    setNotice('');
  }
  const update = (patch: Partial<StorefrontAppearance>) =>
    replace({ ...draft, ...patch });
  const updateHome = (patch: Partial<StorefrontAppearance['homepage']>) =>
    update({ homepage: { ...draft.homepage, ...patch } });
  const updateMarket = (patch: Partial<MarketAppearance>) =>
    update({ market: { ...marketConfig, ...patch } });
  const updateMarketPage = (
    id: MarketPageId,
    patch: Partial<MarketAppearance['pages'][MarketPageId]>,
  ) =>
    updateMarket({
      pages: {
        ...marketConfig.pages,
        [id]: { ...marketConfig.pages[id], ...patch },
      },
    });
  async function persist(publish: boolean) {
    if (lock.current || !valid.success || (publish && dirty)) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = publish
        ? await api.publish(record.id, record.version)
        : await api.save(record.id, record.version, valid.data);
      if (mounted.current) {
        setHistory({ past: [], value: result.draft, future: [] });
        onSaved(result);
        setNotice(
          publish
            ? 'Your storefront has been published.'
            : 'Draft saved. Your public storefront has not changed.',
        );
      }
    } catch (value) {
      if (mounted.current) setError(value);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function choose(value: StorefrontEditorSection) {
    if (
      [
        'header',
        'footer',
        'theme',
        'editorial:header',
        'editorial:footer',
        'editorial:theme',
      ].includes(value)
    )
      setGlobalSettingsOpen(true);
    if (
      path === '/' &&
      usesHarvestContract(draft.theme) &&
      homeNatives.some((id) => id === value)
    )
      value = `harvest:${value}`;
    setSelectionTrail((previous) => [...previous.slice(-49), section]);
    setBlock(undefined);
    setCategoriesOpen(false);
    setSection(value);
    setStructure(false);
    setScrollRequest((v) => v + 1);
  }
  const page =
    path === '/'
      ? 'home'
      : path === '/policies'
        ? 'policies'
        : path === '/faq'
          ? 'faq'
          : path === '/contact'
            ? 'contact'
            : path === '/find-us'
              ? 'find'
              : path === '/about'
                ? 'about'
                : path === '/products' || path === '/shop'
                  ? 'products'
                  : (marketPageId ?? 'product');
  const available = (
    Object.keys(storefrontEditorSections) as StorefrontEditorSection[]
  ).filter(
    (id) =>
      !(
        page === 'home' &&
        usesHarvestContract(draft.theme) &&
        homeNatives.some((native) => native === id)
      ) &&
      !id.endsWith('-settings') &&
      !(market
        ? ['featured', 'about'].includes(id)
        : ['markets', 'vendors', 'categories'].includes(id)) &&
      !id.startsWith('policies-') &&
      !id.startsWith('faq-') &&
      !id.startsWith('contact-') &&
      !id.startsWith('find-') &&
      id !== 'theme' &&
      id !== 'story-settings' &&
      id !== 'story-cta' &&
      (['header', 'footer'].includes(id) ||
        (page === 'home' &&
          !['product', 'information', 'related'].includes(id)) ||
        (page === 'product' &&
          ['product', 'information', 'related'].includes(id))),
  );
  const editable =
    page === 'home' ||
    !!marketPageId ||
    ['header', 'footer', 'theme', 'related'].includes(section);
  // Bloom shows its own matched palettes; other themes show the shared presets.
  const paletteOptions =
    draft.theme === 'bloom'
      ? Object.entries(bloomPalettes).map(([key, p]) => ({
          key,
          label: p.label,
          swatches: [p.primary, p.pop, p.sun, p.paper],
        }))
      : Object.entries(storefrontPalettes).map(([key, p]) => ({
          key,
          label: p.label,
          swatches: [p.primary, p.secondary, p.background, p.surface],
        }));
  const themeControls = (
    <>
      <SelectField
        id="storefront-palette"
        label="Color palette"
        className="ui-palette-select"
        value={draft.palette}
        onChange={(e) =>
          update({
            palette: e.target.value as StorefrontAppearance['palette'],
          })
        }
      >
        {paletteOptions.map(({ key, label, swatches }) => (
          <option key={key} value={key}>
            <span className="ui-palette-option">
              <span className="ui-palette-option-label">{label}</span>
              <span className="ui-palette-swatches" aria-hidden="true">
                {swatches.map((color, index) => (
                  <span
                    key={index}
                    className="ui-palette-swatch"
                    style={{
                      backgroundColor: color,
                    }}
                  />
                ))}
              </span>
            </span>
          </option>
        ))}
      </SelectField>
      <SelectField
        id="storefront-shape"
        label="Button shape"
        value={draft.buttonShape}
        onChange={(e) =>
          update({
            buttonShape: e.target.value as StorefrontAppearance['buttonShape'],
          })
        }
      >
        <option value="square">Square / minimal</option>
        <option value="soft">Softly rounded</option>
        <option value="pill">Pill-shaped</option>
      </SelectField>
      {themeOffersButtonHover(draft.theme) && (
        <SelectField
          id="storefront-hover"
          label="Button hover effect"
          value={draft.buttonHover}
          onChange={(e) =>
            update({
              buttonHover: e.target
                .value as StorefrontAppearance['buttonHover'],
            })
          }
        >
          <option value="lift">Subtle lift</option>
          <option value="darken">Darken</option>
          <option value="outline">Outline transition</option>
        </SelectField>
      )}
    </>
  );
  const heroCopyFields = (
    <>
      <TextSetting
        id="home-title"
        label="Hero heading"
        value={draft.homepage.title}
        max={160}
        placeholder={record.name}
        onChange={(title) => updateHome({ title })}
      />
      <TextSetting
        id="home-introduction"
        label="Introduction"
        value={draft.homepage.introduction}
        max={600}
        multiline
        onChange={(introduction) => updateHome({ introduction })}
      />
      {market && api.media ? (
        <CategoryImageField
          api={api.media}
          themeId="harvest"
          presentation="library"
          label="Hero image"
          value={marketConfig.heroImageAssetId}
          preview={draft.homepage.image}
          onImageChange={(asset) =>
            update({
              homepage: { ...draft.homepage, image: asset?.preview ?? '' },
              market: { ...marketConfig, heroImageAssetId: asset?.id ?? null },
            })
          }
        />
      ) : (
        <>
          <Field
            id="home-image"
            label="Hero image URL"
            info="Use an HTTPS image or a local development asset. Blank uses the existing product image or illustration."
          >
            <Input
              id="home-image"
              type="url"
              maxLength={2000}
              value={draft.homepage.image}
              onChange={(e) =>
                updateHome({
                  image: e.target.value,
                })
              }
            />
          </Field>{' '}
        </>
      )}
    </>
  );
  const marketHeroDestination = (
    <WebsiteSectionDestination
      id="market-heroPrimaryDestination"
      label="Button destination"
      destinations={marketHeroDestinations}
      categories={[]}
      products={[]}
      loadProducts={() => {}}
      value={marketConfig.heroPrimaryDestination ?? '/market-dates'}
      onChange={(value) => updateMarket({ heroPrimaryDestination: value })}
    />
  );
  /** Editorial Market renders its own hero and sizes; it shares the market content controls. */
  const marketAppearanceFields = (
    section: StorefrontEditorSection,
    editorialTemplate = false,
  ) => {
    const pageId = section.endsWith('-settings')
      ? (section.slice(0, -'-settings'.length) as MarketPageId)
      : undefined;
    const marketPage =
      pageId && Object.hasOwn(marketConfig.pages, pageId)
        ? marketConfig.pages[pageId]
        : undefined;
    return (
      <>
        {!editorialTemplate &&
          [
            'hero',
            'markets',
            'vendors',
            'categories',
            'closing',
            'footer',
          ].includes(section) && (
            <TextSizeControls
              value={draft.textSizes?.[section]}
              heading={section !== 'footer'}
              paragraph
              onChange={(value) =>
                update({ textSizes: { ...draft.textSizes, [section]: value } })
              }
            />
          )}
        {section === 'theme' && (
          <>
            <p>
              Harvest. Create a separate website in your library to start
              another design.
            </p>
            <VendorTypography
              value={marketConfig}
              onChange={(value) => updateMarket(value)}
            />
            {themeControls}
            <Button
              variant="secondary"
              onClick={() => {
                setPath('/about');
                choose('story-settings');
              }}
            >
              Edit Our Story page
            </Button>
          </>
        )}
        {section === 'hero' && (
          <>
            {heroCopyFields}
            <ImageShapeField
              id="hero-shape"
              label="Hero image shape"
              value={marketConfig.heroShape}
              onChange={(heroShape) => updateMarket({ heroShape })}
            />
            {(
              ['heroPrimaryDestination', 'heroSecondaryDestination'] as const
            ).map((key) => (
              <Fragment key={key}>
                <TextSetting
                  id={`editor-market-text-${key === 'heroPrimaryDestination' ? 'heroPrimaryLabel' : 'heroSecondaryLabel'}`}
                  label={
                    key === 'heroPrimaryDestination'
                      ? 'Primary button label'
                      : 'Secondary button label'
                  }
                  value={
                    marketConfig.text?.[
                      key === 'heroPrimaryDestination'
                        ? 'heroPrimaryLabel'
                        : 'heroSecondaryLabel'
                    ] ?? ''
                  }
                  max={80}
                  placeholder={
                    marketTextFields[
                      key === 'heroPrimaryDestination'
                        ? 'heroPrimaryLabel'
                        : 'heroSecondaryLabel'
                    ].fallback
                  }
                  onChange={(value) =>
                    updateMarket({
                      text: {
                        ...marketConfig.text,
                        [key === 'heroPrimaryDestination'
                          ? 'heroPrimaryLabel'
                          : 'heroSecondaryLabel']: value,
                      },
                    })
                  }
                />
                <WebsiteSectionDestination
                  id={`market-${key}`}
                  label={
                    key === 'heroPrimaryDestination'
                      ? 'Primary button destination'
                      : 'Secondary button destination'
                  }
                  destinations={marketHeroDestinations}
                  categories={[]}
                  products={[]}
                  loadProducts={() => {}}
                  value={
                    marketConfig[key] ??
                    (key === 'heroPrimaryDestination'
                      ? '/market-dates'
                      : '/vendors')
                  }
                  onChange={(value) => updateMarket({ [key]: value })}
                />
              </Fragment>
            ))}
          </>
        )}
        {(section === 'markets' || section === 'vendors') && (
          <SelectField
            id={`market-${section}-card-theme`}
            label="Card color theme"
            value={
              marketConfig[
                section === 'markets' ? 'marketsCardTheme' : 'vendorsCardTheme'
              ] ?? 'standard'
            }
            onChange={(event) =>
              updateMarket({
                [section === 'markets'
                  ? 'marketsCardTheme'
                  : 'vendorsCardTheme']: event.target.value,
              })
            }
          >
            <option value="standard">Original</option>
            <option value="inverse">Inverted</option>
            <option value="soft">Soft tint</option>
          </SelectField>
        )}
        {section === 'markets' && (
          <p>
            Shows your next scheduled market dates. Manage dates in Occurrences.
          </p>
        )}
        {section === 'vendors' && (
          <p>
            Shows vendors confirmed for your next market date. Each card links
            to that vendor&apos;s storefront.
          </p>
        )}
        {section === 'categories' && (
          <p>
            {editorialTemplate
              ? 'Shows the product categories offered at the market date a shopper has chosen, or across all upcoming market dates when none is chosen. Each category opens that date’s products, filtered.'
              : 'Shows the product categories offered at your next market date. Each category opens that date’s products, filtered.'}
          </p>
        )}
        {(
          Object.entries(marketTextFields) as Array<
            [MarketTextKey, (typeof marketTextFields)[MarketTextKey]]
          >
        )
          .filter(
            ([key, field]) =>
              field.section === section &&
              section !== 'hero' &&
              !(editorialTemplate && editorialMarketHiddenText.includes(key)) &&
              !headingOnlyMarketText(draft.theme).includes(key),
          )
          .map(([key, field]) => (
            <TextSetting
              key={key}
              id={`editor-market-text-${key}`}
              label={field.label}
              value={marketConfig.text?.[key] ?? ''}
              max={field.max}
              placeholder={field.fallback}
              multiline={key === 'closingHeading' || field.max >= 600}
              onChange={(value) =>
                updateMarket({ text: { ...marketConfig.text, [key]: value } })
              }
            />
          ))}
        {pageId && marketPage && (
          <>
            <Field id={`market-page-${pageId}-enabled`} label="Show page">
              <Checkbox
                id={`market-page-${pageId}-enabled`}
                checked={marketPage.enabled}
                onChange={(e) =>
                  updateMarketPage(pageId, { enabled: e.target.checked })
                }
              />
            </Field>
            <TextSetting
              id={`market-page-${pageId}-title`}
              label="Page title"
              value={marketPage.title}
              max={160}
              onChange={(title) => updateMarketPage(pageId, { title })}
            />
            <TextSetting
              id={`market-page-${pageId}-description`}
              label="Introduction"
              value={marketPage.description}
              max={600}
              multiline
              onChange={(description) =>
                updateMarketPage(pageId, { description })
              }
            />
            <p>
              {pageId === 'market-dates'
                ? 'Lists every scheduled market date with its time and location. Manage dates in Occurrences.'
                : pageId === 'vendors'
                  ? 'Visitors choose a market date, then visit a vendor storefront or browse what that vendor offers on the date.'
                  : 'Lists your public applications with their open dates. Manage applications in Applications.'}
            </p>
          </>
        )}
        {section === 'header' && (
          <p>
            Branding comes from your market identity. Navigation lists your
            enabled pages. Account and cart links remain protected.
          </p>
        )}
      </>
    );
  };
  const appearanceFields = (section: StorefrontEditorSection) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void persist(false);
      }}
    >
      <fieldset disabled={busy}>
        {!editable ? (
          <p>
            Descriptions, photographs and information sections are edited in
            Products. Select Related products to customize this template.
          </p>
        ) : market ? (
          marketAppearanceFields(section)
        ) : (
          <>
            {[
              'hero',
              'featured',
              'about',
              'closing',
              'footer',
              'related',
            ].includes(section) && (
              <TextSizeControls
                value={draft.textSizes?.[section]}
                heading={section !== 'footer'}
                paragraph={!['featured', 'related'].includes(section)}
                onChange={(value) =>
                  update({
                    textSizes: {
                      ...draft.textSizes,
                      [section]: value,
                    },
                  })
                }
              />
            )}
            {section === 'theme' && (
              <>
                <p>
                  {storefrontThemes[draft.theme].label}. Create a separate
                  website in your library to use another template.
                </p>
                <VendorTypography
                  value={vendor}
                  onChange={(value) => update({ vendor: value })}
                />
                {themeControls}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPath('/about');
                    choose('story-settings');
                  }}
                >
                  Edit Our Story page
                </Button>
              </>
            )}
            {section === 'hero' && (
              <>
                {heroCopyFields}
                <ImageShapeField
                  id="hero-shape"
                  label="Hero image shape"
                  value={vendor.heroShape}
                  onChange={(heroShape) =>
                    update({
                      vendor: { ...vendor, heroShape },
                    })
                  }
                />
                <p>
                  Buttons keep their existing Shop and About destinations. The
                  secondary button appears when the About page is enabled.
                </p>
              </>
            )}
            {(
              Object.entries(storefrontTextFields) as Array<
                [
                  StorefrontTextKey,
                  (typeof storefrontTextFields)[StorefrontTextKey],
                ]
              >
            )
              .filter(
                ([, field]) => field.section === section && section !== 'hero',
              )
              .map(([key, field]) => (
                <TextSetting
                  key={key}
                  id={`editor-text-${key}`}
                  label={field.label}
                  value={vendor.text?.[key] ?? ''}
                  max={field.max}
                  placeholder={
                    key === 'aboutHeading'
                      ? `Meet ${record.name}`
                      : field.fallback
                  }
                  multiline={key === 'closingText' || key === 'closingHeading'}
                  onChange={(value) =>
                    update({
                      vendor: {
                        ...vendor,
                        text: {
                          ...vendor.text,
                          [key]: value,
                        },
                      },
                    })
                  }
                />
              ))}
            {section === 'related' && (
              <Field id="related-enabled" label="Show related products">
                <Checkbox
                  id="related-enabled"
                  checked={vendor.relatedEnabled !== false}
                  onChange={(e) =>
                    update({
                      vendor: {
                        ...vendor,
                        relatedEnabled: e.target.checked,
                      },
                    })
                  }
                />
              </Field>
            )}
            {(section === 'featured' || section === 'about') && (
              <VendorHomepageOptions
                section={section}
                value={vendor}
                api={api}
                onChange={(value) =>
                  update({
                    vendor: {
                      ...value,
                      ...(value.aboutBlurb !== vendor.aboutBlurb
                        ? { aboutUseLegacyStory: false }
                        : {}),
                    },
                  })
                }
              />
            )}
            {section === 'about' &&
              (!draft.vendor || draft.vendor.aboutUseLegacyStory) && (
                <TextSetting
                  id="home-story"
                  label="Legacy homepage story"
                  value={draft.homepage.story}
                  max={3000}
                  multiline
                  onChange={(story) => updateHome({ story })}
                />
              )}
            {section === 'header' && (
              <p>
                Branding comes from your business identity. Account, cart and
                platform navigation remain protected.
              </p>
            )}
            {section === 'footer' && (
              <p>
                Your business name, account link and platform attribution are
                shared across all vendor pages.
              </p>
            )}
          </>
        )}
      </fieldset>
    </form>
  );
  const supportedSections =
    usesHarvestContract(draft.theme) || !!draft.template;
  const pageRegions =
    supportedSections && Object.hasOwn(websitePageRules, editorialPage)
      ? websitePageRules[editorialPage].regions
      : [];
  const pageBefore = effectiveWebsitePageSections(
    draft,
    editorialPage,
    'before',
  );
  const pageAfter = effectiveWebsitePageSections(draft, editorialPage, 'after');
  const pageCount = pageBefore.length + pageAfter.length;
  const pageHeroEnabled = supportsWebsitePageHero(draft, editorialPage);
  const pageSectionEditor = (region: WebsitePageRegion) =>
    pageRegions.some((r) => r === region) ? (
      <WebsiteSectionManagement<{ id: string; visible: boolean }>
        key={`${editorialPage}:${region}`}
        sections={effectiveWebsitePageSections(draft, editorialPage, region)}
        target={{
          theme: draft.theme,
          themeVersion: draft.template?.version ?? 1,
          page: editorialPage,
        }}
        prefix={`page:${editorialPage}:${region}`}
        allowAdd={
          region !== 'before' ||
          [
            'about',
            'products',
            'market-dates',
            'vendors',
            'applications',
          ].includes(editorialPage)
        }
        allowSection={allowSection}
        totalCount={pageCount}
        addLabel="Add Section"
        onChange={(sections) =>
          update({
            pageSections: {
              ...draft.pageSections,
              [editorialPage]: {
                ...draft.pageSections?.[editorialPage],
                [region]: sections as WebsiteSection[],
              },
            },
          })
        }
        api={api}
        busy={busy}
        categoryPresentation={draft.categoryPresentation}
        onCategoryPresentationChange={(categoryPresentation) =>
          update({ categoryPresentation })
        }
        hiddenCategoryIds={Object.entries(draft.categoryPresentation ?? {})
          .filter(([, c]) => !c.visible)
          .map(([id]) => id)}
        products={products}
        loadProducts={() => setLoadProducts(true)}
        selected={section}
        choose={choose}
        collapsed={structure}
        collapse={() => setStructure(true)}
        nativeLabel={() => ''}
        renderNative={() => null}
      />
    ) : null;
  const nativePageSelection = (
    editorialPage === 'about'
      ? 'story-settings'
      : editorialPage === 'find-us'
        ? 'find-settings'
        : `${editorialPage}-settings`
  ) as StorefrontEditorSection;
  function renderPageSettings(id: string, closingOnly = false) {
    return id === 'policies-settings' ? (
      <PoliciesEditor
        onlyClosing={closingOnly}
        hideClosing={!closingOnly && pageHeroEnabled}
        sectionHero={pageHeroEnabled}
        key={id}
        value={draft.policies ?? defaultPolicies}
        selected={section}
        selectionRequest={scrollRequest}
        collapsed={structure}
        collapse={() => setStructure(true)}
        choose={choose}
        onChange={(policies) => update({ policies })}
        busy={busy}
        validationError={
          !valid.success
            ? valid.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(' ')
            : undefined
        }
      />
    ) : id === 'faq-settings' ? (
      <FaqEditor
        onlyClosing={closingOnly}
        hideClosing={!closingOnly && pageHeroEnabled}
        sectionHero={pageHeroEnabled}
        collapsed={structure}
        collapse={() => setStructure(true)}
        key={id}
        value={draft.faq ?? defaultFaq}
        selected={section}
        choose={choose}
        onChange={(faq) => update({ faq })}
        busy={busy}
      />
    ) : id === 'contact-settings' ? (
      <ContactEditor
        formAvailable={!market}
        onlyClosing={closingOnly}
        hideClosing={!closingOnly && pageHeroEnabled}
        sectionHero={pageHeroEnabled}
        key={id}
        value={draft.contact}
        selected={section}
        collapsed={structure}
        choose={choose}
        collapse={() => setStructure(true)}
        onChange={(contact) => update({ contact })}
        busy={busy}
      />
    ) : id === 'find-settings' ? (
      <FindUsEditor
        onlyClosing={closingOnly}
        hideClosing={!closingOnly && pageHeroEnabled}
        sectionHero={pageHeroEnabled}
        key={id}
        textSizes={draft.textSizes}
        onTextSizeChange={(id, value) =>
          update({
            textSizes: { ...draft.textSizes, [id]: value },
          })
        }
        value={draft.findUs}
        api={api}
        selected={section}
        collapsed={structure}
        choose={choose}
        collapse={() => setStructure(true)}
        onChange={(findUs) => update({ findUs })}
        busy={busy}
        themeId={draft.theme}
      />
    ) : id === 'story-settings' ? (
      <AboutStoryEditor
        onlyClosing={closingOnly}
        hideClosing={!closingOnly && pageHeroEnabled}
        allowAdd={!pageHeroEnabled}
        key={id}
        textSizes={draft.textSizes}
        onTextSizeChange={(id, value) =>
          update({
            textSizes: { ...draft.textSizes, [id]: value },
          })
        }
        about={draft.about}
        api={api}
        selected={section}
        collapsed={structure}
        choose={choose}
        collapse={() => setStructure(true)}
        onChange={(about, sizes) =>
          update({
            about,
            textSizes: Object.fromEntries(
              Object.entries(sizes ?? draft.textSizes ?? {}).filter(
                ([id]) =>
                  !id.startsWith('story:') ||
                  about.sections?.some((item) => `story:${item.id}` === id),
              ),
            ),
          })
        }
        busy={busy}
        themeId={draft.theme}
      />
    ) : null;
  }
  const closingSelection = (
    editorialPage === 'about'
      ? 'story-cta'
      : editorialPage === 'find-us'
        ? 'find-cta'
        : `${editorialPage}-cta`
  ) as StorefrontEditorSection;
  const nativePageRows: Array<
    { id: string; visible: boolean } | WebsiteSection
  > = [...pageBefore, { id: 'page-content', visible: true }, ...pageAfter];
  nativePageRows.splice(
    draft.pageSections?.[editorialPage]?.closingPosition ??
      pageBefore.length + 1,
    0,
    { id: 'closing-invitation', visible: true },
  );
  const unifiedPageEditor = pageHeroEnabled ? (
    <WebsiteSectionManagement<{ id: string; visible: boolean }>
      sections={nativePageRows}
      target={{
        theme: draft.theme,
        themeVersion: draft.template?.version ?? 1,
        page: editorialPage,
      }}
      prefix={`page:${editorialPage}:before`}
      selectionId={(s, list) => {
        if (s.id === 'page-content') return nativePageSelection;
        if (s.id === 'closing-invitation') return closingSelection;
        const before = list
          ? list.slice(
              0,
              list.findIndex((item) => item.id === 'page-content'),
            )
          : pageBefore;
        return `page:${editorialPage}:${before.some((item) => item.id === s.id) ? 'before' : 'after'}:${s.id}`;
      }}
      totalCount={pageCount}
      onChange={(sections) => {
        const closingPosition = sections.findIndex(
          (s) => s.id === 'closing-invitation',
        );
        const content = sections.filter((s) => s.id !== 'closing-invitation');
        const split = content.findIndex((s) => s.id === 'page-content');
        const before = content.slice(0, split) as WebsiteSection[];
        const after = content.slice(split + 1) as WebsiteSection[];
        update({
          pageSections: {
            ...draft.pageSections,
            [editorialPage]: { before, after, closingPosition },
          },
        });
        const current = composition.find((s) => s.selection === section);
        if (current) {
          const nextSelection: StorefrontEditorSection = `page:${editorialPage}:${before.some((s) => s.id === current.id) ? 'before' : 'after'}:${current.id}`;
          if (nextSelection !== section) setSection(nextSelection);
        }
      }}
      api={api}
      products={products}
      loadProducts={() => setLoadProducts(true)}
      busy={busy}
      selected={section}
      choose={choose}
      collapsed={structure}
      collapse={() => setStructure(true)}
      nativeLabel={(s) =>
        s.id === 'closing-invitation' ? 'Closing invitation' : 'Page content'
      }
      renderNative={(s) =>
        s.id === 'closing-invitation' ? (
          <div hidden>{renderPageSettings(nativePageSelection, true)}</div>
        ) : null
      }
      renderNativeHierarchy={(s) =>
        s.id === 'page-content' ? renderPageSettings(nativePageSelection) : null
      }
      canHide={(s) => 'type' in s}
      allowSection={allowSection}
      categoryPresentation={draft.categoryPresentation}
      onCategoryPresentationChange={(categoryPresentation) =>
        update({ categoryPresentation })
      }
      hiddenCategoryIds={Object.entries(draft.categoryPresentation ?? {})
        .filter(([, c]) => !c.visible)
        .map(([id]) => id)}
    />
  ) : null;
  return (
    <WebsiteEditorContext.Provider
      value={{
        inspector,
        block,
        selectBlock: (sectionId, blockId) => {
          const parent = composition.find((s) => s.id === sectionId);
          if (!parent) return;
          choose(parent.selection as StorefrontEditorSection);
          setBlock(blockId ? { sectionId, blockId } : undefined);
        },
      }}
    >
      <section
        className="visual-storefront-editor designer website-editor-workspace"
        aria-label="Storefront editor"
      >
        <div className="visual-editor-toolbar designer-chrome">
          <a
            className={buttonClassName({ variant: 'tertiary' })}
            href={dashboardHref}
            aria-label={backLabel}
            title={backLabel}
          >
            <UtilityIcon name="close" /> Exit
          </a>
          <div className="designer-title">
            <strong>{record.name}</strong>
            <p>Website editor</p>
          </div>
          <div className="ui-actions visual-editor-history">
            <Button
              variant="tertiary"
              iconOnly
              aria-label="Undo"
              title="Undo"
              disabled={busy || !history.past.length}
              onClick={() =>
                setHistory((h) => ({
                  past: h.past.slice(0, -1),
                  value: h.past.at(-1)!,
                  future: [h.value, ...h.future],
                }))
              }
            >
              <UtilityIcon name="undo" />
            </Button>
            <Button
              variant="tertiary"
              iconOnly
              aria-label="Redo"
              title="Redo"
              disabled={busy || !history.future.length}
              onClick={() =>
                setHistory((h) => ({
                  past: [...h.past, h.value],
                  value: h.future[0]!,
                  future: h.future.slice(1),
                }))
              }
            >
              <UtilityIcon name="redo" />
            </Button>
          </div>
          <div className="visual-editor-preview-tools">
            <div className="ui-actions" aria-label="Preview viewport">
              {['desktop', 'tablet', 'mobile'].map((value) => (
                <Button
                  key={value}
                  variant="tertiary"
                  className="button-selection-fill"
                  iconOnly
                  aria-label={value[0]!.toUpperCase() + value.slice(1)}
                  title={value[0]!.toUpperCase() + value.slice(1)}
                  aria-pressed={viewport === value}
                  onClick={() => setViewport(value)}
                >
                  <UtilityIcon
                    name={value as 'desktop' | 'tablet' | 'mobile'}
                  />
                </Button>
              ))}
            </div>
            <div className="ui-actions">
              <Button
                variant="tertiary"
                className="button-selection-fill"
                aria-pressed={mode === 'inspect'}
                onClick={() =>
                  setMode((value) =>
                    value === 'inspect' ? 'browse' : 'inspect',
                  )
                }
              >
                {mode === 'inspect' ? 'Inspect sections' : 'Browse pages'}
              </Button>
            </div>
          </div>

          {liveUrl && (
            <a
              className={buttonClassName({ variant: 'tertiary' })}
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View live storefront <UtilityIcon name="external" />
            </a>
          )}
          <Badge tone={dirty ? 'danger' : 'success'}>
            {dirty
              ? 'Unsaved changes'
              : unpublished
                ? 'Saved draft'
                : 'Published'}
          </Badge>
          <div className="ui-actions">
            <Button
              loading={busy}
              disabled={busy || !dirty || !valid.success}
              onClick={() => void persist(false)}
            >
              Save draft
            </Button>
            <Button
              variant="secondary"
              disabled={busy || dirty || !unpublished || !valid.success}
              onClick={() => void persist(true)}
            >
              Publish saved changes
            </Button>
          </div>
        </div>
        <div
          className="visual-editor-feedback designer-chrome"
          aria-live="polite"
        >
          {dirty && (
            <p>
              Save your draft before publishing. The preview includes your
              unsaved changes.
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {!valid.success && (
            <Alert severity="warning">
              {valid.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(' ')}
            </Alert>
          )}
          {!!error && (
            <>
              <ErrorState error={safeError(error)} />
              <p>
                Your edits are retained. If another session changed this
                storefront, copy your changes before reloading the saved draft.
              </p>
            </>
          )}
        </div>
        <div className="visual-editor-body">
          <aside
            className="visual-editor-sidebar designer-chrome"
            aria-label="Storefront settings"
          >
            <div className="visual-editor-page-selector">
              {' '}
              <SelectField
                id="editor-page"
                label="Preview page"
                onFocus={() => setLoadProducts(true)}
                value={page}
                onChange={(event) => {
                  const value = event.target.value;
                  setPath(
                    value === 'home'
                      ? '/'
                      : value === 'find'
                        ? '/find-us'
                        : value === 'product'
                          ? market
                            ? path
                            : `/products/${encodeURIComponent(products.find((p) => p.slug)?.slug ?? '')}`
                          : value === 'products' && market
                            ? '/shop'
                            : `/${value}`,
                  );
                  setBlock(undefined);
                  setCategoriesOpen(false);
                  setStructure(true);
                }}
              >
                <option value="home">Homepage</option>
                {market ? (
                  <>
                    <option value="products">Shop page</option>
                    {page === 'product' && (
                      <option value="product">Product detail</option>
                    )}
                    <option value="market-dates">Market dates page</option>
                    <option value="vendors">Vendors page</option>
                    <option value="applications">Applications page</option>
                  </>
                ) : (
                  <>
                    <option value="products">Product listing</option>
                    <option
                      value="product"
                      disabled={!products.some((p) => p.slug)}
                    >
                      Product detail
                    </option>
                  </>
                )}
                <option value="about">About page</option>
                {!market && <option value="find">Find Us page</option>}
                <option value="contact">Contact page</option>
                <option value="faq">FAQ page</option>
                <option value="policies">Policies page</option>
              </SelectField>
            </div>

            <nav aria-label="Page sections" className="visual-editor-sections">
              {pageHeroEnabled && (
                <label
                  className="story-page-toggle"
                  htmlFor="editor-page-enabled"
                >
                  <Checkbox
                    id="editor-page-enabled"
                    role="switch"
                    className="sr-only"
                    aria-label="Enable page"
                    checked={
                      editorialPage === 'about'
                        ? draft.about.enabled
                        : editorialPage === 'contact'
                          ? !!draft.contact?.enabled
                          : editorialPage === 'faq'
                            ? !!draft.faq?.enabled
                            : editorialPage === 'policies'
                              ? !!draft.policies?.enabled
                              : !!draft.findUs?.enabled
                    }
                    disabled={busy}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      if (editorialPage === 'about')
                        update({
                          about: {
                            ...draft.about,
                            title: draft.about.title || 'Our story',
                            ...(!draft.about.content &&
                            draft.about.sections === undefined
                              ? { sections: [], sectionsVersion: 1 as const }
                              : {}),
                            enabled,
                          },
                        });
                      else if (editorialPage === 'contact')
                        update({
                          contact: {
                            ...(draft.contact ?? defaultContact),
                            enabled,
                          },
                        });
                      else if (editorialPage === 'faq')
                        update({
                          faq: { ...(draft.faq ?? defaultFaq), enabled },
                        });
                      else if (editorialPage === 'policies')
                        update({
                          policies: {
                            ...(draft.policies ?? defaultPolicies),
                            enabled,
                          },
                        });
                      else
                        update({
                          findUs: {
                            ...(draft.findUs ?? defaultFindUs),
                            enabled,
                          },
                        });
                    }}
                  />
                  <span className="story-switch-track" aria-hidden="true" />
                  <span>Enable page</span>
                </label>
              )}
              <details
                className={disclosureClassName('dropdown')}
                open={globalSettingsOpen}
                onToggle={(event) =>
                  setGlobalSettingsOpen(event.currentTarget.open)
                }
              >
                <summary role="button">Theme settings</summary>
                <div ref={setGlobalContainer} />
              </details>
              {pageHeroEnabled
                ? unifiedPageEditor
                : pageSectionEditor('before')}
              {page === 'home' && usesHarvestContract(draft.theme) && (
                <WebsiteSectionManagement<{
                  id: HarvestOriginalSectionId;
                  visible: boolean;
                }>
                  allowSection={allowSection}
                  sections={(draft.harvestComposition ?? defaultHome).map(
                    (s) =>
                      'type' in s
                        ? s
                        : {
                            ...s,
                            visible: s.id !== 'about' || vendor.aboutEnabled,
                          },
                  )}
                  hiddenCategoryIds={Object.entries(
                    draft.categoryPresentation ?? {},
                  )
                    .filter(([, c]) => !c.visible)
                    .map(([id]) => id)}
                  categoryPresentation={draft.categoryPresentation}
                  onCategoryPresentationChange={(categoryPresentation) =>
                    update({ categoryPresentation })
                  }
                  target={harvestHomepageTarget}
                  prefix="harvest"
                  onChange={(sections) =>
                    update({
                      harvestComposition: sections.map((s) =>
                        'type' in s ? s : { id: s.id },
                      ) as HarvestHomepageSection[],
                    })
                  }
                  api={api}
                  busy={busy}
                  products={products}
                  loadProducts={() => setLoadProducts(true)}
                  selected={section}
                  choose={choose}
                  collapsed={structure}
                  collapse={() => setStructure(true)}
                  nativeLabel={(s) =>
                    market && s.id === 'closing'
                      ? 'Call-to-action banner'
                      : storefrontEditorSections[s.id]
                  }
                  renderNative={(s) => appearanceFields(s.id)}
                  canHide={(s) => 'type' in s}
                />
              )}

              {globalContainer &&
                !market &&
                createPortal(
                  <StorefrontCategoriesEditor
                    api={api}
                    open={categoriesOpen}
                    onToggle={() => {
                      setCategoriesOpen((open) => !open);
                      setBlock(undefined);
                      setStructure(true);
                    }}
                    value={draft.categoryPresentation}
                    themeId={draft.theme}
                    onChange={(categoryPresentation) =>
                      update({ categoryPresentation })
                    }
                    busy={busy}
                  />,
                  globalContainer,
                )}
              {draft.template?.id === 'modern-farmhouse' && (
                <FarmhouseEditor
                  globalContainer={globalContainer}
                  appearance={draft}
                  onAppearanceChange={update}
                  page={page as Exclude<typeof page, MarketPageId>}
                  collapsed={structure}
                  collapse={() => setStructure(true)}
                  selected={section}
                  choose={choose}
                  value={draft.template.settings}
                  onChange={(settings) =>
                    update({
                      template: {
                        id: 'modern-farmhouse',
                        version: 2,
                        settings,
                      },
                    })
                  }
                  api={api}
                  busy={busy}
                  products={products}
                  loadProducts={() => setLoadProducts(true)}
                />
              )}
              {draft.template?.id === 'editorial-market' && (
                <EditorialMarketEditor
                  market={market}
                  marketAppearance={draft.market}
                  allowSection={allowSection}
                  marketHeroFields={market ? marketHeroDestination : undefined}
                  renderMarketNative={(id) => (
                    <fieldset disabled={busy}>
                      {marketAppearanceFields(id, true)}
                    </fieldset>
                  )}
                  categoryPresentation={draft.categoryPresentation}
                  onCategoryPresentationChange={(categoryPresentation) =>
                    update({ categoryPresentation })
                  }
                  globalContainer={globalContainer}
                  page={page}
                  collapsed={structure}
                  collapse={() => setStructure(true)}
                  selected={section}
                  choose={choose}
                  value={draft.template.settings}
                  onChange={(settings) =>
                    update({
                      template: {
                        id: 'editorial-market',
                        version: 1,
                        settings,
                      },
                    })
                  }
                  api={api}
                  busy={busy}
                  products={products}
                  loadProducts={() => setLoadProducts(true)}
                />
              )}
              {[
                ...(page === 'policies'
                  ? ([
                      'header',
                      'footer',
                      'theme',
                      'policies-settings',
                    ] as const)
                  : page === 'faq'
                    ? (['header', 'footer', 'theme', 'faq-settings'] as const)
                    : page === 'contact'
                      ? ([
                          'header',
                          'footer',
                          'theme',
                          'contact-settings',
                        ] as const)
                      : page === 'find'
                        ? ([
                            'header',
                            'footer',
                            'theme',
                            'find-settings',
                          ] as const)
                        : page === 'about'
                          ? ([
                              'header',
                              'footer',
                              'theme',
                              'story-settings',
                            ] as const)
                          : marketPageId
                            ? [
                                'header' as const,
                                'footer' as const,
                                `${marketPageId}-settings` as StorefrontEditorSection,
                              ]
                            : available),
                ...(['about', 'find', 'contact', 'faq', 'policies'].includes(
                  page,
                )
                  ? []
                  : ['theme' as const]),
              ]
                .filter(
                  (id) =>
                    !draft.template ||
                    // Market pages keep their settings on every template.
                    (!!marketPageId && id === `${marketPageId}-settings`) ||
                    [
                      'policies-settings',
                      'faq-settings',
                      'contact-settings',
                      'find-settings',
                      'story-settings',
                    ].includes(id),
                )
                .map((id) =>
                  [
                    'policies-settings',
                    'faq-settings',
                    'contact-settings',
                    'find-settings',
                    'story-settings',
                  ].includes(id)
                    ? pageHeroEnabled
                      ? null
                      : renderPageSettings(id)
                    : globalItem(
                        id,
                        <details
                          key={id}
                          className={disclosureClassName('dropdown')}
                          open={!structure && section === id}
                        >
                          <summary
                            role="button"
                            aria-expanded={!structure && section === id}
                            onClick={(event) => {
                              event.preventDefault();
                              if (!structure && section === id)
                                setStructure(true);
                              else choose(id);
                            }}
                          >
                            {id === 'theme'
                              ? 'Appearance'
                              : storefrontEditorSections[
                                  id as keyof typeof storefrontEditorSections
                                ]}
                            {id === 'related' &&
                            draft.vendor?.relatedEnabled === false
                              ? ' (hidden)'
                              : ''}
                            {id === 'about' &&
                            !(
                              draft.vendor?.aboutEnabled ??
                              !!draft.homepage.story
                            )
                              ? ' (hidden)'
                              : ''}
                          </summary>
                          {!structure && section === id && (
                            <WebsiteInspectorContent>
                              {appearanceFields(section)}
                            </WebsiteInspectorContent>
                          )}
                        </details>,
                      ),
                )}
              {!pageHeroEnabled && pageSectionEditor('after')}
            </nav>
            {page === 'product' && (
              <p>
                {market
                  ? 'Products are managed by their vendors. Browse the shop preview to inspect a product. Related products, header, footer and theme settings apply across your website.'
                  : 'Product records are managed in Products. Related products, header, footer and theme settings apply across all vendor pages.'}
              </p>
            )}
          </aside>
          <div
            className="visual-editor-preview designer-chrome"
            aria-label="Storefront appearance preview"
          >
            {page === 'product' && !market && (
              <SelectField
                id="preview-product"
                label="Example product"
                value={decodeURIComponent(path.slice('/products/'.length))}
                onChange={(e) =>
                  setPath(`/products/${encodeURIComponent(e.target.value)}`)
                }
              >
                {products
                  .filter((p) => p.slug)
                  .map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
              </SelectField>
            )}
            <PreviewFrame
              api={api}
              id={record.id}
              config={previewConfig}
              path={path}
              section={section}
              mode={mode}
              viewport={viewport}
              scrollRequest={scrollRequest}
              onSelect={choose}
              onLiveUrl={setLiveUrl}
              onNavigate={(value) => {
                setPath(value);
                setBlock(undefined);
                setCategoriesOpen(false);
                setStructure(true);
              }}
            />
          </div>
          <aside
            className="website-editor-inspector designer-chrome"
            aria-label="Selection settings"
          >
            <div className="website-inspector-title">
              {block ? 'Block settings' : 'Settings'}
            </div>
            {structure && !categoriesOpen && (
              <p className="website-inspector-empty">
                Select a section or block to edit its settings.
              </p>
            )}
            <div ref={setInspector} />
          </aside>
        </div>
      </section>
    </WebsiteEditorContext.Provider>
  );
}

function TextSetting({
  id,
  label,
  value,
  max,
  placeholder,
  multiline,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  max: number;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const props = {
    id,
    value,
    maxLength: max,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  };
  return (
    <Field
      id={id}
      label={label}
      info={
        placeholder ? 'Leave blank to use the template default.' : undefined
      }
    >
      {multiline ? <Textarea {...props} rows={3} /> : <Input {...props} />}
    </Field>
  );
}

function PreviewFrame(props: {
  api: StorefrontAppearanceApi;
  id: string;
  config?: StorefrontAppearance;
  path: string;
  section: StorefrontEditorSection;
  mode: 'inspect' | 'browse';
  viewport: string;
  scrollRequest: number;
  onSelect: (section: StorefrontEditorSection) => void;
  onNavigate: (path: string) => void;
  onLiveUrl: (url: string) => void;
}) {
  const [grant, setGrant] = useState<{
    token: string;
    expiresAt: number;
    url: string;
  }>();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(
    'Connecting to your storefront preview...',
  );
  const [failed, setFailed] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(props);
  const grantRef = useRef(grant);
  const scroll = useRef(props.scrollRequest);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    latest.current = props;
    grantRef.current = grant;
  });
  useEffect(() => {
    let active = true;
    if (!props.api.preview) return;
    void props.api
      .preview(props.id)
      .then((value) => {
        const url = safeStorefrontUrl(value.url);
        if (
          !url ||
          !/^[A-Za-z0-9_-]{43}$/.test(value.token) ||
          value.expiresAt <= Date.now()
        )
          throw new Error('Preview unavailable');
        if (active) {
          setFailed(false);
          setGrant({ ...value, url });
          latest.current.onLiveUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setStatus(
            'Preview could not connect. Check your storefront server and vendor session, then reconnect.',
          );
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [props.api, props.id, attempt]);
  useEffect(() => {
    if (!grant) return;
    const timer = setTimeout(
      () => setAttempt((value) => value + 1),
      Math.max(1000, grant.expiresAt - Date.now() - 30000),
    );
    return () => clearTimeout(timer);
  }, [grant]);
  useEffect(() => {
    if (!grant) return;
    function message(event: MessageEvent) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== browserOrigin(grant!.url) ||
        event.data?.protocol !== 'storefront-editor-v1'
      )
        return;
      const p = latest.current;
      const current = grantRef.current;
      if (!current) return;
      switch (event.data.type) {
        case 'ready':
          if (p.config)
            frame.current?.contentWindow?.postMessage(
              {
                protocol: 'storefront-editor-v1',
                type: 'update',
                ...current,
                config: p.config,
                path: p.path,
                section: p.section,
                mode: p.mode,
                scroll: false,
              },
              browserOrigin(current.url),
            );
          break;
        case 'rendered':
          clearTimeout(pendingTimeout.current);
          setFailed(false);
          setStatus('Preview up to date.');
          break;
        case 'loading':
          setStatus('Rendering your storefront...');
          break;
        case 'select':
          if (
            isStorefrontEditorSection(event.data.section) &&
            event.data.section !== 'theme' &&
            (!event.data.section.startsWith('policy:') ||
              (p.path === '/policies' &&
                (p.config?.policies ?? defaultPolicies).policies.some(
                  (policy) => `policy:${policy.id}` === event.data.section,
                ))) &&
            (!event.data.section.startsWith('faq:') ||
              (p.path === '/faq' &&
                (p.config?.faq ?? defaultFaq).questions.some(
                  (q) => `faq:${q.id}` === event.data.section,
                ))) &&
            (!event.data.section.startsWith('story:') ||
              (p.path === '/about' &&
                p.config &&
                aboutSections(p.config.about).some(
                  (s) => `story:${s.id}` === event.data.section,
                )))
          )
            p.onSelect(event.data.section);
          break;
        case 'navigate':
          if (storefrontPreviewPath(event.data.path))
            p.onNavigate(event.data.path);
          break;
        case 'blocked':
          setStatus(
            'Purchases and account actions are disabled in preview. Use View live storefront for customer testing.',
          );
          break;
        case 'expired':
          setStatus('Your preview session expired. Reconnect to continue.');
          setFailed(true);
          break;
      }
    }
    window.addEventListener('message', message);
    return () => window.removeEventListener('message', message);
  }, [grant]);
  useEffect(() => {
    if (!grant || !props.config) return;
    frame.current?.contentWindow?.postMessage(
      {
        protocol: 'storefront-editor-v1',
        type: 'update',
        ...grant,
        config: props.config,
        path: props.path,
        section: props.section,
        mode: props.mode,
        scroll: scroll.current !== props.scrollRequest,
      },
      browserOrigin(grant.url),
    );
    scroll.current = props.scrollRequest;
    pendingTimeout.current = setTimeout(() => {
      setStatus(
        'Preview did not respond. Check the storefront server and reconnect.',
      );
      setFailed(true);
    }, 12000);
    return () => clearTimeout(pendingTimeout.current);
  }, [
    grant,
    props.config,
    props.path,
    props.section,
    props.mode,
    props.scrollRequest,
  ]);
  return (
    <>
      <div className="visual-editor-preview-status">
        <p role="status">
          {props.api.preview
            ? status
            : 'A connected vendor session is required for the actual storefront preview.'}
        </p>
        <IconButton
          icon="refresh"
          label="Reconnect preview"
          variant="tertiary"
          onClick={() => {
            setFailed(false);
            setStatus('Connecting to your storefront preview...');
            setGrant(undefined);
            setAttempt((value) => value + 1);
          }}
        />
      </div>
      {props.api.preview && !grant && !failed && (
        <Spinner label="Loading actual storefront" />
      )}
      {grant && (
        <div className="visual-editor-viewport" data-viewport={props.viewport}>
          <iframe
            ref={frame}
            key={grant.url}
            src={browserUrl(`${grant.url}/storefront-editor-preview/`)}
            title="Actual storefront preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  );
}
