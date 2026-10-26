import {
  useEffect,
  Fragment,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import {
  createStorefrontAppearanceApi,
  safeStorefrontUrl,
  safeError,
  type StorefrontAppearanceApi,
  type StorefrontAppearanceRecord,
  type StorefrontLink,
} from '@market/api';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SelectField,
  Spinner,
  Textarea,
  UtilityIcon,
} from '@market/ui';
import { buttonClassName } from '@market/ui/presentation';
import {
  vendorAppearanceDefaults,
  storefrontFonts,
  storefrontAppearanceSchema,
  storefrontPalettes,
  storefrontThemeVariables,
  type StorefrontAppearance,
  type AboutSection,
} from '@market/theme/storefront';
import '@market/theme/storefront.css';
import './storefront-appearance.css';
import { VisualStorefrontEditor } from './VisualStorefrontEditor';
import { WebsiteLibrary } from './WebsiteLibrary';

export interface StorefrontConnection {
  endpoint: string;
  channelToken: string;
  channelId?: string;
}
export function ViewStorefront({
  connection,
}: {
  connection: StorefrontConnection;
}) {
  const { endpoint, channelToken } = connection;
  const [links, setLinks] = useState<StorefrontLink[]>([]);
  const [selected, setSelected] = useState('');
  useEffect(() => {
    let active = true;
    void createStorefrontAppearanceApi({ endpoint, channelToken })
      .links()
      .then((value) => {
        if (active) {
          setLinks(value.filter((link) => safeStorefrontUrl(link.url)));
          setSelected(
            value.find((link) => safeStorefrontUrl(link.url))?.id ?? '',
          );
        }
      })
      .catch(() => {
        if (active) setLinks([]);
      });
    return () => {
      active = false;
    };
  }, [endpoint, channelToken]);
  const url = safeStorefrontUrl(
    links.find((link) => link.id === selected)?.url ?? null,
  );
  if (!url) return null;
  return (
    <div className="storefront-shell-link">
      {links.length > 1 && (
        <SelectField
          id="shell-storefront"
          label="Storefront"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {links.map((link) => (
            <option key={link.id} value={link.id}>
              {link.name}
            </option>
          ))}
        </SelectField>
      )}
      <a
        className={buttonClassName({ variant: 'secondary' })}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <UtilityIcon name="store" />
        View Storefront<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}

const desktopQuery = '(max-width: 1024px)';
function desktopAccessRestricted() {
  return (
    !!window.matchMedia?.(desktopQuery).matches ||
    /Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
function subscribeDesktopAccess(update: () => void) {
  const query = window.matchMedia?.(desktopQuery);
  query?.addEventListener('change', update);
  return () => query?.removeEventListener('change', update);
}
export function StorefrontAppearanceSettings(
  props: Parameters<typeof DesktopAppearanceSettings>[0],
) {
  const restricted = useSyncExternalStore(
    subscribeDesktopAccess,
    desktopAccessRestricted,
    () => false,
  );
  return (
    <>
      <div hidden={!restricted}>
        <EmptyState title="Desktop or laptop required">
          <p>
            Storefront appearance is only accessible from a desktop or laptop.
            Please open this page on a larger screen to edit your storefront.
          </p>
        </EmptyState>
      </div>
      <div hidden={restricted}>
        {!props.market && props.connection && !props.api ? (
          <WebsiteLibrary connection={props.connection} />
        ) : (
          <DesktopAppearanceSettings {...props} />
        )}
      </div>
    </>
  );
}
function DesktopAppearanceSettings({
  connection,
  market,
  api: suppliedApi,
}: {
  connection?: StorefrontConnection;
  market: boolean;
  api?: StorefrontAppearanceApi;
}) {
  const endpoint = connection?.endpoint,
    channelToken = connection?.channelToken;
  const api = useMemo(
    () =>
      suppliedApi ??
      (endpoint && channelToken
        ? createStorefrontAppearanceApi({ endpoint, channelToken })
        : undefined),
    [suppliedApi, endpoint, channelToken],
  );
  const [records, setRecords] = useState<StorefrontAppearanceRecord[]>();
  const [selected, setSelected] = useState('');
  const dirtyEditor = useRef(false);
  const [error, setError] = useState<unknown>();
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    if (api)
      void api
        .read()
        .then((value) => {
          if (active) {
            setRecords(value);
            setSelected(value[0]?.id ?? '');
            setError(undefined);
          }
        })
        .catch((value) => {
          if (active) setError(value);
        });
    return () => {
      active = false;
    };
  }, [api, generation]);
  if (!api)
    return (
      <EmptyState title="Connect to your storefront">
        <p>
          Storefront appearance is available in the connected business
          workspace.
        </p>
      </EmptyState>
    );
  if (error)
    return (
      <>
        <ErrorState error={safeError(error)} />
        <Button
          onClick={() => {
            setError(undefined);
            setRecords(undefined);
            setGeneration((value) => value + 1);
          }}
        >
          Reload settings
        </Button>
      </>
    );
  if (!records) return <Spinner label="Loading storefront appearance" />;
  if (!records.length)
    return (
      <EmptyState title="No storefront is configured">
        <p>
          A storefront must be associated with this business before its
          appearance can be edited.
        </p>
      </EmptyState>
    );
  const record = records.find((value) => value.id === selected);
  return (
    <>
      {records.length > 1 && (
        <SelectField
          id="appearance-storefront"
          label="Storefront"
          value={selected}
          onChange={(event) => {
            if (
              !dirtyEditor.current ||
              window.confirm('Discard unsaved storefront changes?')
            )
              setSelected(event.target.value);
          }}
        >
          {records.map((value) => (
            <option key={value.id} value={value.id}>
              {value.name}
            </option>
          ))}
        </SelectField>
      )}
      {record && (
        <AppearanceEditor
          key={record.id}
          record={record}
          api={api}
          market={market}
          dashboardHref={
            connection?.channelId
              ? `/vendor?channel=${encodeURIComponent(connection.channelId)}`
              : '/vendor'
          }
          onDirty={(value) => {
            dirtyEditor.current = value;
          }}
          onSaved={(value) =>
            setRecords((current) =>
              current?.map((item) => (item.id === value.id ? value : item)),
            )
          }
        />
      )}
    </>
  );
}

function AppearanceEditor(props: {
  record: StorefrontAppearanceRecord;
  api: StorefrontAppearanceApi;
  market: boolean;
  dashboardHref?: string;
  onSaved: (value: StorefrontAppearanceRecord) => void;
  onDirty?: (dirty: boolean) => void;
}) {
  if (!props.market) return <VisualStorefrontEditor {...props} />;
  return <LegacyMarketAppearanceEditor {...props} />;
}

function LegacyMarketAppearanceEditor({
  record,
  api,
  market,
  onSaved,
}: {
  record: StorefrontAppearanceRecord;
  api: StorefrontAppearanceApi;
  market: boolean;
  onSaved: (value: StorefrontAppearanceRecord) => void;
}) {
  const [draft, setDraft] = useState<StorefrontAppearance>(record.draft);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const valid = storefrontAppearanceSchema.safeParse(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(record.draft);
  const unpublished =
    JSON.stringify(record.draft) !== JSON.stringify(record.published);
  const update = (patch: Partial<StorefrontAppearance>) =>
    setDraft((current) => ({ ...current, ...patch }));
  async function change(publish: boolean) {
    if (lock.current || !valid.success || (publish && dirty)) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const value = publish
        ? await api.publish(record.id, record.version)
        : await api.save(record.id, record.version, valid.data);
      if (active.current) {
        setDraft(value.draft);
        onSaved(value);
        setNotice(
          publish
            ? 'Your storefront has been published.'
            : 'Draft saved. Your public storefront has not changed.',
        );
      }
    } catch (value) {
      if (active.current) setError(value);
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <div className="storefront-appearance-workspace">
      <div className="storefront-appearance-controls">
        <Card>
          <p>
            Customize {record.name}. Save a private draft, then publish it when
            you are ready. Dashboard colors stay independent.
          </p>
          <p role="status">
            {record.publishedAt
              ? `Last published ${new Date(record.publishedAt).toLocaleString()}.`
              : 'Using the default appearance. Nothing has been published yet.'}{' '}
            {unpublished
              ? 'There are unpublished settings.'
              : 'Your saved settings are published.'}
          </p>
        </Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void change(false);
          }}
        >
          <fieldset disabled={busy}>
            <Card>
              <h2>Appearance</h2>
              <p>Theme: Harvest</p>
              {!market && (
                <VendorTypography
                  value={draft.vendor ?? { ...vendorAppearanceDefaults }}
                  onChange={(vendor) => update({ vendor })}
                />
              )}
              <SelectField
                id="storefront-palette"
                label="Color palette"
                value={draft.palette}
                onChange={(event) =>
                  update({
                    palette: event.target
                      .value as StorefrontAppearance['palette'],
                  })
                }
              >
                {Object.entries(storefrontPalettes).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </SelectField>
              <div className="storefront-palette-swatches" aria-hidden="true">
                {[
                  storefrontPalettes[draft.palette].primary,
                  storefrontPalettes[draft.palette].accent,
                  storefrontPalettes[draft.palette].background,
                ].map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </div>
              <SelectField
                id="storefront-shape"
                label="Button shape"
                value={draft.buttonShape}
                onChange={(event) =>
                  update({
                    buttonShape: event.target
                      .value as StorefrontAppearance['buttonShape'],
                  })
                }
              >
                <option value="square">Square / minimal</option>
                <option value="soft">Softly rounded</option>
                <option value="pill">Pill-shaped</option>
              </SelectField>
              <SelectField
                id="storefront-hover"
                label="Button hover effect"
                value={draft.buttonHover}
                onChange={(event) =>
                  update({
                    buttonHover: event.target
                      .value as StorefrontAppearance['buttonHover'],
                  })
                }
              >
                <option value="lift">Subtle lift</option>
                <option value="darken">Darken</option>
                <option value="outline">Outline transition</option>
              </SelectField>
            </Card>
            <Card>
              <h2>Homepage content</h2>
              <Field id="home-title" label="Hero heading">
                <Input
                  id="home-title"
                  maxLength={160}
                  value={draft.homepage.title}
                  placeholder={record.name}
                  onChange={(event) =>
                    update({
                      homepage: {
                        ...draft.homepage,
                        title: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field id="home-introduction" label="Introduction">
                <Textarea
                  id="home-introduction"
                  maxLength={600}
                  rows={3}
                  value={draft.homepage.introduction}
                  onChange={(event) =>
                    update({
                      homepage: {
                        ...draft.homepage,
                        introduction: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field
                id="home-image"
                label="Hero image URL"
                info="Use an HTTPS image URL or a local development asset URL. Leave blank to use existing product imagery or the botanical illustration."
              >
                <Input
                  id="home-image"
                  type="url"
                  maxLength={2000}
                  value={draft.homepage.image}
                  onChange={(event) =>
                    update({
                      homepage: {
                        ...draft.homepage,
                        image: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              {!market && (
                <ImageShapeField
                  id="hero-shape"
                  label="Hero image shape"
                  value={draft.vendor?.heroShape ?? 'dome'}
                  onChange={(heroShape) =>
                    update({
                      vendor: {
                        ...(draft.vendor ?? vendorAppearanceDefaults),
                        heroShape,
                      },
                    })
                  }
                />
              )}
              <Field id="home-story" label="Your story">
                <Textarea
                  id="home-story"
                  maxLength={3000}
                  rows={5}
                  value={draft.homepage.story}
                  onChange={(event) =>
                    update({
                      homepage: {
                        ...draft.homepage,
                        story: event.target.value,
                      },
                    })
                  }
                />
              </Field>
            </Card>
            {!market && (
              <VendorHomepageOptions
                value={draft.vendor ?? { ...vendorAppearanceDefaults }}
                api={api}
                onChange={(vendor) => update({ vendor })}
              />
            )}
            <Card>
              <h2>About page</h2>
              <Field id="about-enabled" label="Enable the About page">
                <Checkbox
                  id="about-enabled"
                  checked={draft.about.enabled}
                  onChange={(event) =>
                    update({
                      about: { ...draft.about, enabled: event.target.checked },
                    })
                  }
                />
              </Field>
              <p>
                The page and its navigation link appear only after publishing.
                Disabling keeps your saved content.
              </p>
              <Field id="about-title" label="Page title">
                <Input
                  id="about-title"
                  maxLength={160}
                  value={draft.about.title}
                  onChange={(event) =>
                    update({
                      about: { ...draft.about, title: event.target.value },
                    })
                  }
                />
              </Field>
              <Field
                id="about-content"
                label="Page content"
                info="Plain text with paragraph breaks. HTML is displayed as text."
              >
                <Textarea
                  id="about-content"
                  maxLength={20000}
                  rows={8}
                  value={draft.about.content}
                  onChange={(event) =>
                    update({
                      about: { ...draft.about, content: event.target.value },
                    })
                  }
                />
              </Field>
            </Card>
            {!valid.success && (
              <Alert severity="warning">
                Use a valid image URL. An enabled About page needs a title and
                content.
              </Alert>
            )}
            <div className="ui-actions">
              <Button
                type="submit"
                loading={busy}
                disabled={!valid.success || !dirty}
              >
                Save draft
              </Button>
              <Button
                variant="secondary"
                disabled={busy || dirty || !unpublished || !valid.success}
                onClick={() => void change(true)}
              >
                Publish saved changes
              </Button>
            </div>
          </fieldset>
        </form>
        {dirty && <p>Save your draft before publishing.</p>}
        {notice && <p role="status">{notice}</p>}
        {!!error && (
          <>
            <ErrorState error={safeError(error)} />
            <p>
              Reload settings before retrying if another session changed this
              storefront.
            </p>
          </>
        )}
      </div>
      <aside
        className="storefront-appearance-preview"
        aria-label="Storefront appearance preview"
      >
        <h2>Appearance preview</h2>
        <p>
          Try your colors, content, and button styles here. Publish to see the
          complete homepage with your live catalog and dates.
        </p>
        {valid.success && (
          <div
            className="storefront-preview"
            data-storefront-theme="harvest"
            data-storefront-hover={draft.buttonHover}
            style={storefrontThemeVariables(valid.data) as CSSProperties}
          >
            <p className="storefront-preview-brand">{record.name}</p>
            {draft.homepage.image && (
              <img
                data-hero-shape={
                  !market ? (draft.vendor?.heroShape ?? 'dome') : undefined
                }
                src={valid.data.homepage.image}
                alt="Hero preview"
                width="640"
                height="480"
              />
            )}
            <h3>{draft.homepage.title || record.name}</h3>
            <p>
              {draft.homepage.introduction ||
                (market
                  ? 'Find your next market day.'
                  : 'Good things, thoughtfully made.')}
            </p>
            <div className="ui-actions">
              <Button>
                {market ? 'Explore the market' : 'Shop the collection'} ↗
              </Button>
              <Button variant="secondary">Our story</Button>
            </div>
            {!market &&
              draft.vendor?.aboutEnabled &&
              draft.vendor.aboutImage && (
                <img
                  src={draft.vendor.aboutImage}
                  alt={draft.vendor.aboutAlt || 'About image preview'}
                  data-hero-shape={draft.vendor.aboutShape ?? 'rounded'}
                  width="640"
                  height="640"
                />
              )}
            {draft.homepage.story && (
              <p className="storefront-preview-story">{draft.homepage.story}</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export function VendorHomepageOptions({
  value,
  section,
  api,
  onChange,
}: {
  value: NonNullable<StorefrontAppearance['vendor']>;
  section?: 'featured' | 'about';
  api: StorefrontAppearanceApi;
  onChange: (v: NonNullable<StorefrontAppearance['vendor']>) => void;
}) {
  const [search, setSearch] = useState(''),
    [products, setProducts] = useState<Array<{ id: string; name: string }>>([]),
    [error, setError] = useState(false);
  useEffect(() => {
    if (section === 'about') return;
    let active = true;
    const timer = setTimeout(() => {
      void api
        .products?.(search)
        .then((rows) => {
          if (active) {
            setProducts(rows);
            setError(false);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, search, section]);
  const patch = (p: Partial<typeof value>) => onChange({ ...value, ...p });
  const Panel = section ? Fragment : Card;
  return (
    <>
      {section !== 'about' && (
        <Panel>
          {!section && <h2>Featured products</h2>}
          <p>
            Choose up to three products in display order. Leave the automatic
            collection enabled to keep the existing default.
          </p>
          <Field id="featured-auto" label="Automatic collection">
            <Checkbox
              id="featured-auto"
              checked={value.featuredIds === null}
              onChange={(event) =>
                patch({ featuredIds: event.target.checked ? null : [] })
              }
            />
          </Field>
          {value.featuredIds !== null && (
            <>
              <Field id="featured-search" label="Search your public products">
                <Input
                  id="featured-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </Field>
              {[0, 1, 2].map((index) => (
                <SelectField
                  key={index}
                  id={'featured-' + index}
                  label={
                    ['First product', 'Second product', 'Third product'][index]
                  }
                  value={value.featuredIds?.[index] ?? ''}
                  onChange={(event) => {
                    const ids = [...(value.featuredIds ?? [])];
                    ids[index] = event.target.value;
                    patch({ featuredIds: ids.filter(Boolean) });
                  }}
                >
                  <option value="">No product</option>
                  {value.featuredIds?.[index] &&
                    !products.some(
                      (p) => p.id === value.featuredIds?.[index],
                    ) && (
                      <option value={value.featuredIds[index]}>
                        Selected product {value.featuredIds[index]}
                      </option>
                    )}
                  {products
                    .filter(
                      (p) =>
                        p.id === value.featuredIds?.[index] ||
                        !value.featuredIds?.includes(p.id),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </SelectField>
              ))}
              {!products.length && <p>No matching public products found.</p>}
              {error && (
                <Alert severity="error">
                  Product choices could not be loaded. Try your search again.
                </Alert>
              )}
            </>
          )}
        </Panel>
      )}
      {section !== 'featured' && (
        <Panel>
          {!section && <h2>Homepage About section</h2>}
          <Field id="home-about-enabled" label="Show homepage About section">
            <Checkbox
              id="home-about-enabled"
              checked={value.aboutEnabled}
              onChange={(event) =>
                patch({ aboutEnabled: event.target.checked })
              }
            />
          </Field>
          <Field id="home-about-blurb" label="Short About blurb">
            <Textarea
              id="home-about-blurb"
              maxLength={600}
              rows={4}
              value={value.aboutBlurb}
              onChange={(event) => patch({ aboutBlurb: event.target.value })}
            />
          </Field>
          <Field id="home-about-image" label="About image URL">
            <Input
              id="home-about-image"
              type="url"
              value={value.aboutImage}
              maxLength={2000}
              onChange={(event) => patch({ aboutImage: event.target.value })}
            />
          </Field>
          <ImageShapeField
            id="about-image-shape"
            label="About image shape"
            value={value.aboutShape ?? 'rounded'}
            onChange={(aboutShape) => patch({ aboutShape })}
          />
          <Field id="home-about-alt" label="About image description">
            <Input
              id="home-about-alt"
              maxLength={200}
              value={value.aboutAlt}
              onChange={(event) => patch({ aboutAlt: event.target.value })}
            />
          </Field>
        </Panel>
      )}
    </>
  );
}

export function VendorTypography({
  value,
  onChange,
}: {
  value: NonNullable<StorefrontAppearance['vendor']>;
  onChange: (v: NonNullable<StorefrontAppearance['vendor']>) => void;
}) {
  const patch = (p: Partial<typeof value>) => onChange({ ...value, ...p });
  return (
    <>
      <SelectField
        id="storefront-fonts"
        label="Typography"
        value={value.typography}
        onChange={(event) =>
          patch({ typography: event.target.value as typeof value.typography })
        }
      >
        {Object.entries(storefrontFonts).map(([key, font]) => (
          <option key={key} value={key}>
            {font.label}
          </option>
        ))}
      </SelectField>
      <p
        style={{
          fontFamily: storefrontFonts[value.typography].heading,
          fontSize: '1.8rem',
        }}
      >
        Good things, thoughtfully made.
      </p>
    </>
  );
}
export function ImageShapeField<T extends AboutSection['shape']>({
  id,
  label,
  value,
  onChange,
  includeNatural = false,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (shape: T) => void;
  includeNatural?: boolean;
}) {
  return (
    <SelectField
      id={id}
      label={label}
      className="storefront-shape-select"
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {(
        [
          ['natural', 'Straight edges'],
          ['natural-rounded', 'Rounded'],
          ['square', 'Square'],
          ['rounded', 'Rounded square'],
          ['circle', 'Circle'],
          ['dome', 'Dome'],
          ['star', 'Star'],
          ['corner', 'Single rounded corner'],
        ] as const
      )
        .filter(([shape]) => includeNatural || !shape.startsWith('natural'))
        .map(([shape, name]) => (
          <option key={shape} value={shape}>
            <span className="storefront-shape-option">
              <span
                className="shape-swatch"
                data-hero-shape={shape}
                aria-hidden="true"
              />
              <span>{name}</span>
            </span>
          </option>
        ))}
    </SelectField>
  );
}
