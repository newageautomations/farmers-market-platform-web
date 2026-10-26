import { FarmhouseEditor } from './FarmhouseEditor';
import { PoliciesEditor } from './PoliciesEditor';
import { FaqEditor } from './FaqEditor';
import { ContactEditor } from './ContactEditor';
import { TextSizeControls } from './TextSizeControls';
import { FindUsEditor } from './FindUsEditor';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  defaultFaq,
  defaultPolicies,
  storefrontAppearanceSchema,
  storefrontEditorSections,
  storefrontPalettes,
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
}: {
  record: StorefrontAppearanceRecord;
  api: StorefrontAppearanceApi;
  onSaved: (record: StorefrontAppearanceRecord) => void;
  onDirty?: (dirty: boolean) => void;
  dashboardHref?: string;
  backLabel?: string;
  initialMode?: 'inspect' | 'browse';
}) {
  const [history, setHistory] = useState<{
    past: StorefrontAppearance[];
    value: StorefrontAppearance;
    future: StorefrontAppearance[];
  }>({ past: [], value: record.draft, future: [] });
  const draft = history.value;
  const [section, setSection] = useState<StorefrontEditorSection>('hero');
  const [structure, setStructure] = useState(true);
  const [path, setPath] = useState('/');
  const [mode, setMode] = useState<'inspect' | 'browse'>(initialMode);
  const [viewport, setViewport] = useState('desktop');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [expanded]);
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
                : path === '/products'
                  ? 'products'
                  : 'product';
  const available = (
    Object.keys(storefrontEditorSections) as StorefrontEditorSection[]
  ).filter(
    (id) =>
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
    ['header', 'footer', 'theme', 'related'].includes(section);
  return (
    <section
      className={`visual-storefront-editor${expanded ? ' visual-editor-expanded' : ''}`}
      aria-label="Storefront editor"
    >
      <div className="visual-editor-toolbar">
        <a
          className={buttonClassName({ variant: 'tertiary' })}
          href={dashboardHref}
        >
          {backLabel}
        </a>
        <strong>{record.name}</strong>
        {liveUrl && (
          <a
            className={buttonClassName({ variant: 'primary' })}
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
      <div className="visual-editor-feedback" aria-live="polite">
        {dirty && (
          <p>
            Save your draft before publishing. The preview includes your unsaved
            changes.
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
          className="visual-editor-sidebar"
          aria-label="Storefront settings"
        >
          <div className="ui-actions visual-editor-history">
            <Button
              variant="tertiary"
              disabled={busy || !history.past.length}
              onClick={() =>
                setHistory((h) => ({
                  past: h.past.slice(0, -1),
                  value: h.past.at(-1)!,
                  future: [h.value, ...h.future],
                }))
              }
            >
              Undo
            </Button>
            <Button
              variant="tertiary"
              disabled={busy || !history.future.length}
              onClick={() =>
                setHistory((h) => ({
                  past: [...h.past, h.value],
                  value: h.future[0]!,
                  future: h.future.slice(1),
                }))
              }
            >
              Redo
            </Button>
          </div>
          <nav aria-label="Page sections" className="visual-editor-sections">
            {draft.template && (
              <FarmhouseEditor
                appearance={draft}
                onAppearanceChange={update}
                page={page}
                collapsed={structure}
                collapse={() => setStructure(true)}
                selected={section}
                choose={choose}
                value={draft.template.settings}
                onChange={(settings) =>
                  update({
                    template: { id: 'modern-farmhouse', version: 2, settings },
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
                ? (['header', 'footer', 'theme', 'policies-settings'] as const)
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
                        : available),
              ...(['about', 'find', 'contact', 'faq', 'policies'].includes(page)
                ? []
                : ['theme' as const]),
            ]
              .filter(
                (id) =>
                  !draft.template ||
                  [
                    'policies-settings',
                    'faq-settings',
                    'contact-settings',
                    'find-settings',
                    'story-settings',
                  ].includes(id),
              )
              .map((id) =>
                id === 'policies-settings' ? (
                  <PoliciesEditor
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
                            .map(
                              (issue) =>
                                `${issue.path.join('.')}: ${issue.message}`,
                            )
                            .join(' ')
                        : undefined
                    }
                  />
                ) : id === 'faq-settings' ? (
                  <FaqEditor
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
                    key={id}
                    textSizes={draft.textSizes}
                    onTextSizeChange={(id, value) =>
                      update({ textSizes: { ...draft.textSizes, [id]: value } })
                    }
                    value={draft.findUs}
                    api={api}
                    selected={section}
                    collapsed={structure}
                    choose={choose}
                    collapse={() => setStructure(true)}
                    onChange={(findUs) => update({ findUs })}
                    busy={busy}
                  />
                ) : id === 'story-settings' ? (
                  <AboutStoryEditor
                    key={id}
                    textSizes={draft.textSizes}
                    onTextSizeChange={(id, value) =>
                      update({ textSizes: { ...draft.textSizes, [id]: value } })
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
                              about.sections?.some(
                                (item) => `story:${item.id}` === id,
                              ),
                          ),
                        ),
                      })
                    }
                    busy={busy}
                  />
                ) : (
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
                        if (!structure && section === id) setStructure(true);
                        else choose(id);
                      }}
                    >
                      {
                        storefrontEditorSections[
                          id as keyof typeof storefrontEditorSections
                        ]
                      }
                      {id === 'related' &&
                      draft.vendor?.relatedEnabled === false
                        ? ' (hidden)'
                        : ''}
                      {id === 'about' &&
                      !(draft.vendor?.aboutEnabled ?? !!draft.homepage.story)
                        ? ' (hidden)'
                        : ''}
                    </summary>
                    {!structure && section === id && (
                      <div className="ui-disclosure-content visual-editor-section-content">
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void persist(false);
                          }}
                        >
                          <fieldset disabled={busy}>
                            {!editable ? (
                              <p>
                                Descriptions, photographs and information
                                sections are edited in Products. Select Related
                                products to customize this template.
                              </p>
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
                                    paragraph={
                                      !['featured', 'related'].includes(section)
                                    }
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
                                      {storefrontThemes[draft.theme].label}.
                                      Create a separate website in your library
                                      to use another template.
                                    </p>
                                    <VendorTypography
                                      value={vendor}
                                      onChange={(value) =>
                                        update({ vendor: value })
                                      }
                                    />
                                    <SelectField
                                      id="storefront-palette"
                                      label="Color palette"
                                      className="ui-palette-select"
                                      value={draft.palette}
                                      onChange={(e) =>
                                        update({
                                          palette: e.target
                                            .value as StorefrontAppearance['palette'],
                                        })
                                      }
                                    >
                                      {Object.entries(storefrontPalettes).map(
                                        ([key, p]) => (
                                          <option key={key} value={key}>
                                            <span className="ui-palette-option">
                                              <span className="ui-palette-option-label">
                                                {p.label}
                                              </span>
                                              <span
                                                className="ui-palette-swatches"
                                                aria-hidden="true"
                                              >
                                                {(
                                                  [
                                                    'primary',
                                                    'secondary',
                                                    'background',
                                                    'surface',
                                                  ] as const
                                                ).map((token) => (
                                                  <span
                                                    key={token}
                                                    className="ui-palette-swatch"
                                                    style={{
                                                      backgroundColor: p[token],
                                                    }}
                                                  />
                                                ))}
                                              </span>
                                            </span>
                                          </option>
                                        ),
                                      )}
                                    </SelectField>
                                    <SelectField
                                      id="storefront-shape"
                                      label="Button shape"
                                      value={draft.buttonShape}
                                      onChange={(e) =>
                                        update({
                                          buttonShape: e.target
                                            .value as StorefrontAppearance['buttonShape'],
                                        })
                                      }
                                    >
                                      <option value="square">
                                        Square / minimal
                                      </option>
                                      <option value="soft">
                                        Softly rounded
                                      </option>
                                      <option value="pill">Pill-shaped</option>
                                    </SelectField>
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
                                      <option value="outline">
                                        Outline transition
                                      </option>
                                    </SelectField>
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
                                    <TextSetting
                                      id="home-title"
                                      label="Hero heading"
                                      value={draft.homepage.title}
                                      max={160}
                                      placeholder={record.name}
                                      onChange={(title) =>
                                        updateHome({ title })
                                      }
                                    />
                                    <TextSetting
                                      id="home-introduction"
                                      label="Introduction"
                                      value={draft.homepage.introduction}
                                      max={600}
                                      multiline
                                      onChange={(introduction) =>
                                        updateHome({ introduction })
                                      }
                                    />
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
                                          updateHome({ image: e.target.value })
                                        }
                                      />
                                    </Field>
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
                                      Buttons keep their existing Shop and About
                                      destinations. The secondary button appears
                                      when the About page is enabled.
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
                                    ([, field]) => field.section === section,
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
                                      multiline={
                                        key === 'closingText' ||
                                        key === 'closingHeading'
                                      }
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
                                  <Field
                                    id="related-enabled"
                                    label="Show related products"
                                  >
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
                                {(section === 'featured' ||
                                  section === 'about') && (
                                  <VendorHomepageOptions
                                    section={section}
                                    value={vendor}
                                    api={api}
                                    onChange={(value) =>
                                      update({
                                        vendor: {
                                          ...value,
                                          ...(value.aboutBlurb !==
                                          vendor.aboutBlurb
                                            ? { aboutUseLegacyStory: false }
                                            : {}),
                                        },
                                      })
                                    }
                                  />
                                )}
                                {section === 'about' &&
                                  (!draft.vendor ||
                                    draft.vendor.aboutUseLegacyStory) && (
                                    <TextSetting
                                      id="home-story"
                                      label="Legacy homepage story"
                                      value={draft.homepage.story}
                                      max={3000}
                                      multiline
                                      onChange={(story) =>
                                        updateHome({ story })
                                      }
                                    />
                                  )}
                                {section === 'header' && (
                                  <p>
                                    Branding comes from your business identity.
                                    Account, cart and platform navigation remain
                                    protected.
                                  </p>
                                )}
                                {section === 'footer' && (
                                  <p>
                                    Your business name, account link and
                                    platform attribution are shared across all
                                    vendor pages.
                                  </p>
                                )}
                              </>
                            )}
                          </fieldset>
                        </form>
                      </div>
                    )}
                  </details>
                ),
              )}
          </nav>
          {page !== 'home' && page !== 'about' && page !== 'find' && (
            <p>
              Product records are managed in Products. Related products, header,
              footer and theme settings apply across all vendor pages.
            </p>
          )}
        </aside>
        <div
          className="visual-editor-preview"
          aria-label="Storefront appearance preview"
        >
          <div className="visual-editor-preview-tools">
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
                      : value === 'policies'
                        ? '/policies'
                        : value === 'faq'
                          ? '/faq'
                          : value === 'contact'
                            ? '/contact'
                            : value === 'products'
                              ? '/products'
                              : value === 'find'
                                ? '/find-us'
                                : value === 'about'
                                  ? '/about'
                                  : `/products/${encodeURIComponent(products.find((p) => p.slug)?.slug ?? '')}`,
                  );
                  setStructure(true);
                }}
              >
                <option value="home">Homepage</option>
                <option value="products">Product listing</option>
                <option
                  value="product"
                  disabled={!products.some((p) => p.slug)}
                >
                  Product detail
                </option>
                <option value="about">About page</option>
                <option value="find">Find Us page</option>
                <option value="contact">Contact page</option>
                <option value="faq">FAQ page</option>
                <option value="policies">Policies page</option>
              </SelectField>
            </div>
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
              <IconButton
                icon={expanded ? 'restore' : 'expand'}
                label={expanded ? 'Restore editor' : 'Expand preview'}
                className="button-selection-fill"
                aria-pressed={expanded}
                onClick={() => setExpanded(!expanded)}
              />
            </div>
          </div>
          {page === 'product' && (
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
              setStructure(true);
            }}
          />
        </div>
      </div>
    </section>
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
    'Connecting to your storefront preview…',
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
        event.origin !== grant!.url ||
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
              current.url,
            );
          break;
        case 'rendered':
          clearTimeout(pendingTimeout.current);
          setFailed(false);
          setStatus('Preview up to date.');
          break;
        case 'loading':
          setStatus('Rendering your storefront…');
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
      grant.url,
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
            setStatus('Connecting to your storefront preview…');
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
            src={`${grant.url}/storefront-editor-preview/`}
            title="Actual storefront preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  );
}
