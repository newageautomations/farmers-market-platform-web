import {
  galleryStops,
  nextGalleryIndex,
} from '../apps/storefront/src/lib/gallery-carousel';
import { WebsiteEditorContext } from '../apps/admin/src/WebsiteEditorContext';
import { HarvestSectionEditor } from '../apps/admin/src/HarvestSectionEditor';
import { WebsiteSectionManagement } from '../apps/admin/src/WebsiteSectionManagement';
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import {
  act,
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from '@testing-library/react';
import {
  editorialHomepageTarget,
  harvestHomepageTarget,
  harvestOriginalSections,
  isHarvestHomepageComposition,
  isWebsitePageCompositions,
  websitePageRules,
  appearanceWebsiteSections,
  effectiveWebsitePageSections,
  supportsWebsitePageHero,
  effectiveWebsiteBlocks,
  withWebsiteBlocks,
  type StorefrontAppearance,
  editorialHomepageComposition,
  editorialMarketClosingSectionId,
  editorialMarketHomepageComposition,
  marketAppearanceDefaults,
  editorialMarketStarterSettings,
  editorialMarketTemplateSchema,
  websiteSectionVariants,
  createTextSection,
  createWebsiteSection,
  harvestExpandedSectionManifest,
  isWebsiteSection,
  websiteSectionImages,
  availableWebsiteSections,
  websiteSectionRegistry,
  reorderWebsiteSection,
  farmhouseDefaults,
  farmhouseHomepageTarget,
  farmhouseSettingsSchema,
  websiteSectionSchema,
  permitsWebsiteSection,
  isStorefrontEditorSection,
  defaultStorefrontAppearance,
  storefrontAppearanceSchema,
  type FarmhouseSettings,
} from '@market/theme/storefront';
import {
  createStorefrontAppearanceApi,
  createWebsiteLibraryApi,
  type StorefrontAppearanceRecord,
  type StorefrontAppearanceConfig,
  type StorefrontWebsiteRecord,
} from '@market/api';
import { FarmhouseEditor } from '../apps/admin/src/FarmhouseEditor';
import { VisualStorefrontEditor } from '../apps/admin/src/VisualStorefrontEditor';

function addSection(label: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Add Section' })).getByRole(
      'button',
      { name: new RegExp('^' + label) },
    ),
  );
}
const text = () => createTextSection('text-first', farmhouseHomepageTarget);
const settings = (): FarmhouseSettings => ({
  ...farmhouseDefaults(),
  sections: [
    farmhouseDefaults().sections[0]!,
    text(),
    ...farmhouseDefaults().sections.slice(1),
  ],
});

it('derives picker options from registry eligibility and preserves IDs on immutable drops', () => {
  expect(availableWebsiteSections(farmhouseHomepageTarget)).toEqual(
    Object.values(websiteSectionRegistry).filter((d) =>
      permitsWebsiteSection(d.type, farmhouseHomepageTarget),
    ),
  );
  for (const page of ['product', 'cart', 'checkout', 'account', 'orders'])
    expect(
      availableWebsiteSections({ ...farmhouseHomepageTarget, page }),
    ).toEqual([]);
  for (const theme of ['harvest', 'editorial-market'])
    expect(
      availableWebsiteSections({ ...farmhouseHomepageTarget, theme }),
    ).toEqual([]);
  expect(
    availableWebsiteSections({ ...farmhouseHomepageTarget, themeVersion: 1 }),
  ).toEqual([]);
  const before = settings().sections;
  const moved = reorderWebsiteSection(
    before,
    'text-first',
    'cinematic',
    'before',
  );
  expect(moved[0]).toBe(before[1]);
  expect(moved.map((s) => s.id).sort()).toEqual(before.map((s) => s.id).sort());
  expect(before[0]!.id).toBe('cinematic');
  expect(reorderWebsiteSection(before, 'unknown', 'cinematic', 'after')).toBe(
    before,
  );
  expect(
    reorderWebsiteSection(before, 'text-first', 'text-first', 'before'),
  ).toBe(before);
  expect(
    reorderWebsiteSection(moved, 'text-first', 'invitation', 'after').at(-1),
  ).toBe(before[1]);
});

it.each(['image-with-text', 'cta-banner'] as const)(
  'strictly validates %s defaults, links, versions and presentation',
  (type) => {
    const section = createWebsiteSection(
      type,
      `${type}-first`,
      farmhouseHomepageTarget,
    );
    expect(websiteSectionSchema.parse(section)).toEqual(section);
    for (const destination of [
      '/',
      '/products',
      '/products/farm-box',
      '/products?category=12',
      '/about',
      '/find-us',
      '/contact',
      '/faq',
      '/policies',
    ]) {
      expect(
        websiteSectionSchema.safeParse({
          ...section,
          content: { ...section.content, destination },
        }).success,
      ).toBe(true);
    }
    for (const destination of [
      'https://evil.test',
      '//evil.test',
      'javascript:alert(1)',
      '/checkout',
      '/cart',
      '/account',
      '/about?redirect=evil',
      '/products#bad',
      '/products\n',
    ]) {
      expect(
        websiteSectionSchema.safeParse({
          ...section,
          content: { ...section.content, destination },
        }).success,
      ).toBe(false);
    }
    for (const invalid of [
      { ...section, id: 'text-wrong' },
      { ...section, version: 2 },
      { ...section, content: { ...section.content, heading: 'x'.repeat(161) } },
      {
        ...section,
        content: {
          ...section.content,
          body: 'x'.repeat(websiteSectionRegistry[type].limits.body + 1),
        },
      },
      { ...section, content: { ...section.content, label: 'x'.repeat(81) } },
      { ...section, content: { ...section.content, html: '<p>bad</p>' } },
      {
        ...section,
        presentation: { ...section.presentation, background: 'url(x)' },
      },
      {
        ...section,
        presentation: { ...section.presentation, css: 'color:red' },
      },
    ])
      expect(websiteSectionSchema.safeParse(invalid).success).toBe(false);
    expect(isStorefrontEditorSection(`farmhouse:${section.id}`)).toBe(true);
    for (const page of ['shop', 'product', 'cart', 'checkout', 'account'])
      expect(() =>
        createWebsiteSection(type, `${type}-first`, {
          ...farmhouseHomepageTarget,
          page,
        }),
      ).toThrow();
  },
);

it('rejects inconsistent image references, extra nested properties and arbitrary image presentation', () => {
  const section = createWebsiteSection(
    'image-with-text',
    'image-with-text-first',
    farmhouseHomepageTarget,
  );
  const image = {
    assetId: '12',
    url: 'http://localhost:3000/assets/farm.jpg',
    alt: 'Farm',
  };
  expect(
    websiteSectionSchema.safeParse({
      ...section,
      content: { ...section.content, image },
    }).success,
  ).toBe(true);
  for (const invalid of [
    { ...image, assetId: null },
    { ...image, assetId: '0' },
    { ...image, url: '' },
    { ...image, url: 'data:image/png;base64,hi' },
    { ...image, url: 'http://external.test/a.jpg' },
    { ...image, url: 'https://user:pass@external.test/a.jpg' },
    { ...image, alt: 'x'.repeat(201) },
    { ...image, crop: 'free' },
  ])
    expect(
      websiteSectionSchema.safeParse({
        ...section,
        content: { ...section.content, image: invalid },
      }).success,
    ).toBe(false);
  for (const presentation of [
    { ...section.presentation, imageSize: 600 },
    { ...section.presentation, imageSide: 'top' },
  ])
    expect(
      websiteSectionSchema.safeParse({ ...section, presentation }).success,
    ).toBe(false);
});

it.each(['shop', 'product', 'cart', 'checkout', 'about'])(
  'exposes no structural section controls on %s',
  (page) => {
    render(
      <FarmhouseEditor
        value={settings()}
        onChange={vi.fn()}
        api={{ read: vi.fn(), save: vi.fn(), publish: vi.fn(), links: vi.fn() }}
        busy={false}
        products={[]}
        loadProducts={vi.fn()}
        page={page}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add Section' })).toBeNull();
    expect(document.querySelector('[data-section-row]')).toBeNull();
  },
);

it('enforces the combined section budget in the picker and duplicate actions', () => {
  const value: FarmhouseSettings = {
    ...farmhouseDefaults(),
    sections: [
      ...farmhouseDefaults().sections,
      ...Array.from({ length: 12 }, (_, i) =>
        createWebsiteSection(
          i % 2 ? 'cta-banner' : 'image-with-text',
          `${i % 2 ? 'cta-banner' : 'image-with-text'}-${i}`,
          farmhouseHomepageTarget,
        ),
      ),
    ],
  };
  render(
    <FarmhouseEditor
      value={value}
      onChange={vi.fn()}
      api={{ read: vi.fn(), save: vi.fn(), publish: vi.fn(), links: vi.fn() }}
      busy={false}
      products={[]}
      loadProducts={vi.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: 'Add Section' })).toBeDisabled();
  for (const button of screen.getAllByRole('button', { name: /^Duplicate:/ }))
    expect(button).toBeDisabled();
  expect(farmhouseSettingsSchema.safeParse(value).success).toBe(true);
  expect(
    farmhouseSettingsSchema.safeParse({
      ...value,
      sections: [...value.sections, text()],
    }).success,
  ).toBe(false);
});

it('selects and clears an Image with Text photograph through the existing authorized media picker', async () => {
  const owned = {
    id: '501',
    name: 'Our farm photograph',
    preview: 'http://localhost:3000/assets/farm.jpg',
  };
  const media = {
    images: vi.fn(async () => [owned]),
    upload: vi.fn(),
    list: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    themeImages: vi.fn(async () => []),
  };
  let current = createWebsiteSection(
    'image-with-text',
    'image-with-text-media',
    farmhouseHomepageTarget,
  );
  function Editor() {
    const [value, setValue] = useState<FarmhouseSettings>({
      ...farmhouseDefaults(),
      sections: [...farmhouseDefaults().sections, current],
    });
    return (
      <FarmhouseEditor
        value={value}
        onChange={(next) => {
          current = next.sections[6] as typeof current;
          setValue(next);
        }}
        selected={`farmhouse:${current.id}`}
        api={{
          read: vi.fn(),
          save: vi.fn(),
          publish: vi.fn(),
          links: vi.fn(),
          media,
        }}
        busy={false}
        products={[]}
        loadProducts={vi.fn()}
      />
    );
  }
  render(<Editor />);
  fireEvent.change(screen.getByLabelText('Image alt text'), {
    target: { value: 'Our field at dawn' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Photograph' }));
  fireEvent.click(
    await within(
      screen.getByRole('dialog', { name: 'Choose an image' }),
    ).findByRole('button', { name: 'Choose Our farm photograph' }),
  );
  expect(current.content.image).toEqual({
    assetId: owned.id,
    url: owned.preview,
    alt: 'Our field at dawn',
  });
  expect(media.themeImages).toHaveBeenCalledWith('modern-farmhouse');
  fireEvent.click(screen.getByRole('button', { name: 'Photograph' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Choose an image' })).getByRole(
      'button',
      { name: 'No image' },
    ),
  );
  expect(current.content.image).toEqual({
    assetId: null,
    url: '',
    alt: 'Our field at dawn',
  });
});

it.each(['image-with-text', 'cta-banner'] as const)(
  'adds multiple independent %s sections and exposes bounded settings and management',
  (type) => {
    let current: FarmhouseSettings = farmhouseDefaults();
    function Editor() {
      const [value, setValue] = useState(current);
      const [selected, choose] = useState('');
      return (
        <FarmhouseEditor
          value={value}
          onChange={(next) => {
            current = next;
            setValue(next);
          }}
          selected={selected}
          choose={choose}
          api={{
            read: vi.fn(),
            save: vi.fn(),
            publish: vi.fn(),
            links: vi.fn(),
          }}
          busy={false}
          products={[]}
          loadProducts={vi.fn()}
        />
      );
    }
    render(<Editor />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
    const picker = within(screen.getByRole('dialog', { name: 'Add Section' }));
    expect(
      picker
        .getAllByRole('button')
        .filter((button) =>
          button.classList.contains('farmhouse-section-option'),
        ),
    ).toHaveLength(8);
    fireEvent.click(
      picker.getByRole('button', {
        name: new RegExp('^' + websiteSectionRegistry[type].label),
      }),
    );
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Original' },
    });
    fireEvent.change(screen.getByLabelText('Link destination'), {
      target: { value: '/about' },
    });
    fireEvent.change(screen.getByLabelText('Background color'), {
      target: { value: 'surface' },
    });
    if (type === 'image-with-text') {
      fireEvent.change(screen.getByLabelText('Image alt text'), {
        target: { value: 'Our farm' },
      });
      fireEvent.change(screen.getByLabelText('Image position'), {
        target: { value: 'right' },
      });
      fireEvent.change(
        screen.getByLabelText('Column proportions (image / text)'),
        {
          target: { value: '60-40' },
        },
      );
    }
    const original = structuredClone(current.sections[6]!);
    fireEvent.click(
      screen.getByRole('button', { name: 'Duplicate: Original' }),
    );
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Copy' },
    });
    expect(current.sections[6]).toEqual(original);
    expect(current.sections[7]!.id).not.toBe(original.id);
    fireEvent.click(screen.getByRole('switch', { name: 'Enable Copy' }));
    expect(current.sections[7]!.visible).toBe(false);
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete section: Copy' }),
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete this section?' }),
      ).getByRole('button', { name: 'Close' }),
    );
    expect(current.sections).toHaveLength(8);
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete section: Copy' }),
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete this section?' }),
      ).getByRole('button', { name: 'Delete section' }),
    );
    expect(current.sections).toHaveLength(7);
    addSection(websiteSectionRegistry[type].label);
    expect(current.sections).toHaveLength(8);
    expect(farmhouseSettingsSchema.safeParse(current).success).toBe(true);
    expect(screen.getAllByRole('button', { name: /^Duplicate:/ })).toHaveLength(
      2,
    );
    expect(
      screen.getAllByRole('button', { name: /^Delete section:/ }),
    ).toHaveLength(2);
  },
);

it('retains old settings verbatim and interleaves repeatable versioned instances in one composition', () => {
  const old = farmhouseDefaults();
  expect(farmhouseSettingsSchema.parse(old)).toEqual(old);
  const next = settings();
  next.sections.splice(3, 0, { ...text(), id: 'text-second' });
  expect(
    farmhouseSettingsSchema.parse(JSON.parse(JSON.stringify(next))),
  ).toEqual(next);
  expect(old.sections).toHaveLength(6);
  expect(isStorefrontEditorSection('farmhouse:text-first')).toBe(true);
  expect(isStorefrontEditorSection('farmhouse:text-" onclick="bad')).toBe(
    false,
  );
});

it.each([
  null,
  [],
  { ...text(), id: 'cinematic' },
  { ...text(), id: 'text-first\n' },
  { ...text(), version: 2 },
  { ...text(), type: 'checkout' },
  { ...text(), css: 'color:red' },
  {
    ...text(),
    content: { ...text().content, html: '<script>alert(1)</script>' },
  },
  { ...text(), content: { heading: 'a'.repeat(161), body: '' } },
  { ...text(), content: { heading: '', body: 'a'.repeat(1201) } },
  { ...text(), content: { heading: '\u0000', body: '' } },
  { ...text(), presentation: { alignment: 'justify' } },
  {
    ...text(),
    presentation: { alignment: 'left', style: 'background:url(x)' },
  },
  { ...text(), visible: 'true' },
  { ...text(), price: 0 },
])('rejects invalid or unsafe section properties: %j', (section) => {
  expect(websiteSectionSchema.safeParse(section).success).toBe(false);
  expect(
    farmhouseSettingsSchema.safeParse({
      ...farmhouseDefaults(),
      sections: [...farmhouseDefaults().sections, section],
    }).success,
  ).toBe(false);
});

it('rejects duplicate IDs, missing or duplicate original sections, overflow and alternate page compositions', () => {
  const next = settings();
  for (const sections of [
    [...next.sections, text()],
    next.sections.slice(1),
    [...next.sections, farmhouseDefaults().sections[0]],
    [
      ...farmhouseDefaults().sections,
      ...Array.from({ length: 13 }, (_, i) => ({ ...text(), id: `text-${i}` })),
    ],
  ])
    expect(
      farmhouseSettingsSchema.safeParse({ ...next, sections }).success,
    ).toBe(false);
  for (const page of [
    'product',
    'product-detail',
    'cart',
    'checkout',
    'products',
    'shop',
    'about',
    'faq',
    'contact',
    'policies',
    'find-us',
  ]) {
    const allowed = [
      'products',
      'about',
      'faq',
      'contact',
      'policies',
      'find-us',
    ].includes(page);
    expect(
      permitsWebsiteSection('text', { ...farmhouseHomepageTarget, page }),
    ).toBe(allowed);
    if (!allowed)
      expect(() =>
        createTextSection('text-test', { ...farmhouseHomepageTarget, page }),
      ).toThrow();
    expect(
      farmhouseSettingsSchema.safeParse({
        ...next,
        pages: { ...next.pages, [page]: { sections: [text()] } },
      }).success,
    ).toBe(false);
  }
  for (const theme of ['harvest', 'editorial-market', 'unknown'])
    expect(
      permitsWebsiteSection('text', { ...farmhouseHomepageTarget, theme }),
    ).toBe(false);
  expect(permitsWebsiteSection('products', farmhouseHomepageTarget)).toBe(
    false,
  );
  expect(
    permitsWebsiteSection('text', {
      ...farmhouseHomepageTarget,
      themeVersion: 1,
    }),
  ).toBe(false);
});

it('keeps the backend contract byte-identical without runtime cross-repository dependencies', () => {
  expect(
    readFileSync(
      '../farmers-market-platform/src/plugins/platform-identity/website-section-contract.ts',
      'utf8',
    ),
  ).toBe(
    readFileSync('packages/theme/src/website-section-contract.ts', 'utf8'),
  );
});

it('adds, edits, duplicates, interleaves, hides and confirms deletion using existing controls', () => {
  let current: FarmhouseSettings = farmhouseDefaults();
  function Editor() {
    const [value, setValue] = useState(current);
    const [selected, choose] = useState('');
    return (
      <FarmhouseEditor
        value={value}
        onChange={(next) => {
          current = next;
          setValue(next);
        }}
        selected={selected}
        choose={choose}
        api={{ read: vi.fn(), save: vi.fn(), publish: vi.fn(), links: vi.fn() }}
        busy={false}
        products={[]}
        loadProducts={() => {}}
      />
    );
  }
  render(<Editor />);
  addSection('Text');
  fireEvent.change(screen.getByLabelText('Heading'), {
    target: { value: 'Market news' },
  });
  fireEvent.change(screen.getByLabelText('Body text'), {
    target: { value: 'First paragraph.\nSecond paragraph.' },
  });
  fireEvent.change(screen.getByLabelText('Alignment'), {
    target: { value: 'center' },
  });
  const original = structuredClone(current.sections[6]!);
  fireEvent.click(
    screen.getByRole('button', { name: 'Duplicate: Market news' }),
  );
  expect(current.sections).toHaveLength(8);
  expect(current.sections[7]).toEqual({
    ...original,
    id: current.sections[7]!.id,
  });
  expect(current.sections[7]!.id).not.toBe(original.id);
  const duplicateId = current.sections[7]!.id;
  const duplicateRow = () =>
    within(
      document.querySelector<HTMLElement>(
        `[data-section-row="${duplicateId}"]`,
      )!,
    );
  fireEvent.click(
    duplicateRow().getByRole('button', { name: 'Move up: Market news' }),
  );
  fireEvent.click(
    duplicateRow().getByRole('button', { name: 'Move up: Market news' }),
  );
  expect(current.sections[5]!.id).not.toBe('invitation');
  expect(current.sections[6]!.id).toBe('invitation');
  fireEvent.click(
    screen.getAllByRole('switch', { name: 'Enable Market news' })[0]!,
  );
  expect(current.sections[5]!.visible).toBe(false);
  expect(current.sections[7]!.visible).toBe(true);
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Delete section: Market news' })[0]!,
  );
  const dialog = screen.getByRole('dialog', { name: 'Delete this section?' });
  expect(current.sections).toHaveLength(8);
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Delete section' }),
  );
  expect(current.sections).toHaveLength(7);
  expect(current.sections[6]).toEqual(original);
  expect(farmhouseSettingsSchema.safeParse(current).success).toBe(true);
  addSection('Text');
  expect(current.sections).toHaveLength(8);
  expect(new Set(current.sections.map((s) => s.id)).size).toBe(8);
});

it.each(['modern-farmhouse', 'editorial-market'] as const)(
  'serializes %s composition through draft save and explicit publish transport',
  async (theme) => {
    const editorialSettings = {
      ...editorialMarketStarterSettings(),
      composition: [
        ...editorialHomepageComposition(editorialMarketStarterSettings()),
        createWebsiteSection(
          'image-with-text',
          'image-with-text-transport',
          editorialHomepageTarget,
        ),
      ],
      homepageDesign: { spacing: 'compact' as const },
    };
    const template =
      theme === 'editorial-market'
        ? {
            id: 'editorial-market' as const,
            version: 1 as const,
            settings: editorialSettings,
          }
        : {
            id: 'modern-farmhouse' as const,
            version: 2 as const,
            settings: settings(),
          };
    const draft = storefrontAppearanceSchema.parse({
      ...defaultStorefrontAppearance,
      theme,
      template,
    });
    const record: StorefrontWebsiteRecord = {
      id: '2',
      storefrontId: '24',
      name: 'Text pilot',
      version: 3,
      draft,
      published: null,
      publishedAt: null,
      templateId: template.id,
      templateVersion: template.version,
      templateConfig: template.settings,
      isLive: false,
      publicationVersion: 7,
      updatedAt: '2026-11-08T12:00:00Z',
    };
    const fetcher = vi.fn(
      async (_url: unknown, _init?: RequestInit) =>
        new Response(
          JSON.stringify({ data: { changeStorefrontWebsite: record } }),
          { status: 200 },
        ),
    );
    const api = createWebsiteLibraryApi({
      endpoint: 'http://localhost:3000/admin-api',
      channelToken: 'vendor',
      fetch: fetcher,
    });
    await api.change(record, 'save', draft);
    const saved = JSON.parse(
      fetcher.mock.calls[0]![1]!.body as string,
    ).variables;
    expect(saved).toMatchObject({
      storefrontId: '24',
      id: '2',
      version: 3,
      action: 'save',
      publicationVersion: 7,
      templateConfig: template.settings,
    });
    expect(saved.input.template).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await api.change({ ...record, version: 4 }, 'publish');
    expect(
      JSON.parse(fetcher.mock.calls[1]![1]!.body as string).variables,
    ).toMatchObject({
      action: 'publish',
      version: 4,
      publicationVersion: 7,
      templateConfig: template.settings,
    });
  },
);

it.each(
  (['modern-farmhouse', 'editorial-market'] as const).flatMap((theme) =>
    (['text', 'image-with-text', 'cta-banner'] as const).map((type) => ({
      theme,
      type,
    })),
  ),
)(
  'keeps $theme $type in preview, undo/redo, save, reload and explicit publish',
  async ({ theme, type }) => {
    const editorial = theme === 'editorial-market';
    // Editorial: hero, products, categories, impact and the closing banner.
    const originalCount = editorial ? 5 : 6;
    const compositionKey = editorial ? 'composition' : 'sections';
    let snapshot: StorefrontAppearanceRecord = {
      id: '42',
      name: 'Pilot',
      version: 1,
      published: null,
      publishedAt: null,
      draft: storefrontAppearanceSchema.parse({
        ...defaultStorefrontAppearance,
        theme,
        template: editorial
          ? {
              id: 'editorial-market',
              version: 1,
              settings: editorialMarketStarterSettings(),
            }
          : {
              id: 'modern-farmhouse',
              version: 2,
              settings: farmhouseDefaults(),
            },
      }),
    };
    const save = vi.fn(
      async (
        _id: string,
        version: number,
        draft: StorefrontAppearanceConfig,
      ) => {
        snapshot = { ...snapshot, version: version + 1, draft };
        return snapshot;
      },
    );
    const publish = vi.fn(async () => {
      snapshot = {
        ...snapshot,
        version: snapshot.version + 1,
        published: structuredClone(snapshot.draft),
        publishedAt: new Date().toISOString(),
      };
      return snapshot;
    });
    const preview = vi.fn(async () => ({
      token: 'a'.repeat(43),
      url: 'http://pilot.localhost:4321',
      expiresAt: Date.now() + 300000,
    }));
    function Editor() {
      const [record, setRecord] = useState(snapshot);
      return (
        <VisualStorefrontEditor
          record={record}
          api={{
            read: vi.fn(),
            links: vi.fn(async () => []),
            save,
            publish,
            preview,
          }}
          onSaved={setRecord}
        />
      );
    }
    const view = render(<Editor />);
    const frame = (await screen.findByTitle(
      'Actual storefront preview',
    )) as HTMLIFrameElement;
    const postMessage = vi.spyOn(frame.contentWindow!, 'postMessage');
    addSection(websiteSectionRegistry[type].label);
    const id = screen.getByLabelText('Heading').id;
    const sectionId = id.slice(0, -'-heading'.length);
    const order = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>('[data-section-row]'),
      ).map((row) => row.dataset.sectionRow);
    const sectionRow = () =>
      within(
        document.querySelector<HTMLElement>(
          `[data-section-row="${sectionId}"]`,
        )!,
      );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(document.getElementById(id)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    if (!document.getElementById(id))
      fireEvent.click(
        document.querySelector(`[data-section-row="${sectionId}"] summary`)!,
      );
    expect(screen.getByLabelText('Heading').id).toBe(id);
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Saved text' },
    });
    fireEvent.change(screen.getByLabelText('Presentation'), {
      target: { value: 'featured' },
    });
    fireEvent.change(screen.getByLabelText('Alignment'), {
      target: { value: 'center' },
    });
    // Native drag events are simulated in JSDOM, without browser automation.
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: '',
      dropEffect: '',
    };
    fireEvent.dragStart(
      sectionRow().getByRole('button', { name: /^Drag to reorder:/ }),
      { dataTransfer },
    );
    const target = document.querySelector<HTMLElement>(
      `[data-section-row="${editorial ? 'hero' : 'cinematic'}"]`,
    )!;
    fireEvent.dragOver(target, { dataTransfer, clientY: 1 });
    fireEvent.drop(target, { dataTransfer });
    expect(order()[1]).toBe(sectionId);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(order().at(-1)).toBe(sectionId);
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(order()[1]).toBe(sectionId);
    fireEvent.click(
      within(
        screen.getByRole('complementary', { name: 'Selection settings' }),
      ).getByRole('switch'),
    );
    expect(
      within(
        screen.getByRole('complementary', { name: 'Selection settings' }),
      ).getByRole('switch'),
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
      within(
        screen.getByRole('complementary', { name: 'Selection settings' }),
      ).getByRole('switch'),
    ).toBeChecked();
    fireEvent.click(
      screen.getByRole('button', { name: 'Duplicate: Saved text' }),
    );
    expect(order()).toHaveLength(originalCount + 2);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(order()).toHaveLength(originalCount + 1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete section: Saved text' }),
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete this section?' }),
      ).getByRole('button', { name: 'Delete section' }),
    );
    expect(order()).toHaveLength(originalCount);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(order()[1]).toBe(sectionId);
    await waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update',
          config: expect.objectContaining({
            template: expect.objectContaining({
              settings: expect.objectContaining({
                [compositionKey]: expect.arrayContaining([
                  expect.objectContaining({
                    id: sectionId,
                    type,
                    presentation: expect.objectContaining({
                      variant: 'featured',
                      alignment: 'center',
                    }),
                    content: expect.objectContaining({ heading: 'Saved text' }),
                  }),
                ]),
              }),
            }),
          }),
        }),
        'http://pilot.localhost:4321',
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Publish saved changes' }),
      ).toBeEnabled(),
    );
    expect(publish).not.toHaveBeenCalled();
    const savedTemplate = save.mock.calls[0]![2].template;
    const savedComposition =
      savedTemplate?.id === 'editorial-market'
        ? savedTemplate.settings.composition
        : savedTemplate?.settings.sections;
    expect(savedComposition).toContainEqual(
      expect.objectContaining({
        type,
        content: expect.objectContaining({ heading: 'Saved text' }),
      }),
    );
    view.unmount();
    render(<Editor />);
    expect(order()[1]).toBe(sectionId);
    expect(snapshot.published).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(publish).toHaveBeenCalledOnce());
    expect(snapshot.published).toEqual(snapshot.draft);
  },
);

it('derives Editorial originals without mutating stored settings and strictly validates mixed compositions', () => {
  const old = editorialMarketStarterSettings();
  const parse = (settings: unknown) =>
    editorialMarketTemplateSchema.safeParse({
      id: 'editorial-market',
      version: 1,
      settings,
    });
  expect(parse(old).data?.settings).toEqual(old);
  expect(old).not.toHaveProperty('composition');
  const defaults = editorialHomepageComposition(old);
  // A vendor homepage without a saved order starts hero, products,
  // categories, then the closing invitation (after Editorial's impact art).
  expect(defaults.map((s) => s.id)).toEqual([
    'hero',
    'product-showcase-homepage',
    'category-showcase-homepage',
    'impact',
    'cta-banner-homepage-closing',
  ]);
  const reusable = availableWebsiteSections(editorialHomepageTarget)
    .map((d) => d.type)
    .map((type) =>
      createWebsiteSection(type, `${type}-editorial`, editorialHomepageTarget),
    );
  const composition = [
    defaults[0]!,
    reusable[0]!,
    defaults[1]!,
    reusable[1]!,
    defaults[2]!,
    reusable[2]!,
    defaults[3]!,
  ];
  expect(parse({ ...old, composition }).success).toBe(true);
  expect(parse({ ...old, composition }).data?.settings.composition).toEqual(
    composition,
  );
  for (const invalid of [
    [],
    composition.slice(1),
    [...composition, defaults[0]],
    [...composition, reusable[0]],
    [...defaults, { id: 'header' }],
    [...defaults, { id: 'hero', visible: false }],
    [...defaults, { ...reusable[0], id: 'text-bad id' }],
    [...defaults, { ...reusable[0], version: 2 }],
    [
      ...defaults,
      ...Array.from({ length: 13 }, (_, i) => ({
        ...reusable[0],
        id: `text-${i}`,
      })),
    ],
  ])
    expect(parse({ ...old, composition: invalid }).success).toBe(false);
  for (const page of ['product', 'cart', 'checkout', 'account', 'orders']) {
    expect(
      availableWebsiteSections({ ...editorialHomepageTarget, page }),
    ).toEqual([]);
    expect(
      parse({ ...old, pages: { ...old.pages, [page]: { composition } } })
        .success,
    ).toBe(false);
  }
  for (const section of reusable) {
    expect(isStorefrontEditorSection(`editorial:${section.id}`)).toBe(true);
    expect(
      websiteSectionRegistry[
        section.type as 'text' | 'image-with-text' | 'cta-banner'
      ].renderers['editorial-market'],
    ).not.toBe(
      websiteSectionRegistry[
        section.type as 'text' | 'image-with-text' | 'cta-banner'
      ].renderers['modern-farmhouse'],
    );
  }
});

it('validates curated section variants and homepage design across both themes with unchanged defaults', () => {
  for (const target of [farmhouseHomepageTarget, editorialHomepageTarget]) {
    expect(availableWebsiteSections(target)).toHaveLength(8);
    for (const { type } of availableWebsiteSections(target).filter((d) =>
      ['text', 'image-with-text', 'cta-banner'].includes(d.type),
    )) {
      const section = createWebsiteSection(type, `${type}-design`, target);
      expect(section.presentation).not.toHaveProperty('variant');
      for (const variant of websiteSectionVariants(type, target)) {
        expect(
          websiteSectionSchema.safeParse({
            ...section,
            presentation: { ...section.presentation, variant },
          }).success,
        ).toBe(true);
      }
      for (const variant of ['custom', 'color:red', '<script>', null, 1]) {
        expect(
          websiteSectionSchema.safeParse({
            ...section,
            presentation: { ...section.presentation, variant },
          }).success,
        ).toBe(false);
      }
    }
    const parse = (homepageDesign: unknown) =>
      target.theme === 'modern-farmhouse'
        ? farmhouseSettingsSchema.safeParse({
            ...farmhouseDefaults(),
            homepageDesign,
          })
        : editorialMarketTemplateSchema.safeParse({
            id: 'editorial-market',
            version: 1,
            settings: { ...editorialMarketStarterSettings(), homepageDesign },
          });
    for (const spacing of ['compact', 'balanced', 'spacious'])
      for (const typographyScale of ['standard', 'expressive'])
        expect(parse({ spacing, typographyScale }).success).toBe(true);
    for (const invalid of [
      null,
      [],
      { spacing: '10px' },
      { typographyScale: 'huge' },
      { css: 'color:red' },
    ])
      expect(parse(invalid).success).toBe(false);
  }
});

it('accepts explicit page regions on all three supported themes and rejects protected structure and ambiguous identities', () => {
  for (const target of [
    harvestHomepageTarget,
    farmhouseHomepageTarget,
    editorialHomepageTarget,
  ]) {
    for (const page of Object.keys(websitePageRules)) {
      expect(availableWebsiteSections({ ...target, page })).toHaveLength(
        page === 'home' || page === 'about' ? 8 : page === 'find-us' ? 6 : 5,
      );
      for (const definition of availableWebsiteSections({ ...target, page })) {
        const section = definition.create(`${definition.type}-page`, {
          ...target,
          page,
        });
        if (page === 'home') continue;
        expect(
          isWebsitePageCompositions({ [page]: { before: [section] } }, target),
        ).toBe(true);
        expect(
          isWebsitePageCompositions({ [page]: { after: [section] } }, target),
        ).toBe(page !== 'products');
      }
    }
    const section = createTextSection('text-page', target);
    for (const page of [
      'product',
      'product-detail',
      'cart',
      'checkout',
      'account',
      'login',
      'orders',
      'confirmation',
      'custom',
      'home',
    ])
      expect(
        isWebsitePageCompositions({ [page]: { before: [section] } }, target),
      ).toBe(false);
    for (const regions of [
      [],
      null,
      { native: [section] },
      { before: [{ id: 'contact-form' }] },
      { before: [{ ...section, version: 2 }] },
      { before: [{ ...section, css: 'display:none' }] },
      { before: [section], after: [section] },
      {
        before: Array.from({ length: 13 }, (_, i) => ({
          ...section,
          id: `text-${i}`,
        })),
      },
    ])
      expect(isWebsitePageCompositions({ contact: regions }, target)).toBe(
        false,
      );
    expect(
      isWebsitePageCompositions(
        { contact: { before: [section] }, faq: { after: [section] } },
        target,
      ),
    ).toBe(false);
  }
  const originals = harvestOriginalSections.map((id) => ({ id }));
  const text = createTextSection('text-harvest', harvestHomepageTarget);
  expect(
    isHarvestHomepageComposition([
      originals[2],
      text,
      originals[0],
      originals[3],
      originals[1],
    ]),
  ).toBe(true);
  for (const invalid of [
    [],
    originals.slice(1),
    [...originals, originals[0]],
    [...originals, { id: 'header' }],
    [...originals, { ...originals[0], visible: false }],
    [...originals, text, text],
  ])
    expect(isHarvestHomepageComposition(invalid)).toBe(false);
  expect(storefrontAppearanceSchema.parse(defaultStorefrontAppearance)).toEqual(
    defaultStorefrontAppearance,
  );
  expect(
    storefrontAppearanceSchema.safeParse({
      ...defaultStorefrontAppearance,
      harvestComposition: originals,
      pageSections: { contact: { before: [text] } },
    }).success,
  ).toBe(true);
  expect(
    storefrontAppearanceSchema.safeParse({
      ...defaultStorefrontAppearance,
      harvestComposition: [...originals, text],
      pageSections: { contact: { before: [text] } },
    }).success,
  ).toBe(false);
  expect(isStorefrontEditorSection('page:products:after:text-page')).toBe(
    false,
  );
});

it('extracts hidden page sections and nested blocks without adopting legacy flat content', () => {
  const image = createWebsiteSection(
    'image-with-text',
    'image-with-text-page',
    harvestHomepageTarget,
  );
  image.visible = false;
  image.content.image = {
    assetId: '501',
    url: 'http://localhost:3000/assets/farm.jpg',
    alt: 'Farm',
  };
  const before = structuredClone(image);
  const config = {
    ...defaultStorefrontAppearance,
    pageSections: {
      contact: { before: [image] },
      products: {
        before: [
          withWebsiteBlocks(
            { ...image, id: 'image-with-text-shop' },
            effectiveWebsiteBlocks(image),
          ),
        ],
      },
    },
  };
  expect(storefrontAppearanceSchema.safeParse(config).success).toBe(true);
  expect(appearanceWebsiteSections(config)).toHaveLength(2);
  expect(image).toEqual(before);
  expect(image.content.blocks).toBeUndefined();
});

it.each(['harvest', 'modern-farmhouse', 'editorial-market'] as const)(
  'preserves %s unsaved page sections, region boundaries, history, preview and explicit draft saving',
  async (theme) => {
    let snapshot: StorefrontAppearanceRecord = {
      id: '84',
      name: 'Phase E draft',
      version: 1,
      published: null,
      publishedAt: null,
      draft: storefrontAppearanceSchema.parse({
        ...defaultStorefrontAppearance,
        theme,
        ...(theme === 'modern-farmhouse'
          ? {
              template: {
                id: theme,
                version: 2,
                settings: farmhouseDefaults(),
              },
            }
          : theme === 'editorial-market'
            ? {
                template: {
                  id: theme,
                  version: 1,
                  settings: editorialMarketStarterSettings(),
                },
              }
            : {}),
      }),
    };
    const save = vi.fn(
      async (_id: string, version: number, draft: StorefrontAppearanceConfig) =>
        (snapshot = { ...snapshot, version: version + 1, draft }),
    );
    const publish = vi.fn();
    const api = {
      read: vi.fn(),
      links: vi.fn(async () => []),
      save,
      publish,
      preview: vi.fn(async () => ({
        token: 'e'.repeat(43),
        url: 'http://pilot.localhost:4321',
        expiresAt: Date.now() + 300000,
      })),
    };
    function Editor() {
      const [record, setRecord] = useState(snapshot);
      return (
        <VisualStorefrontEditor record={record} api={api} onSaved={setRecord} />
      );
    }
    const view = render(<Editor />);
    const frame = await screen.findByTitle<HTMLIFrameElement>(
      'Actual storefront preview',
    );
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    if (theme === 'harvest') {
      addSection('Text');
      fireEvent.change(screen.getByLabelText('Heading'), {
        target: { value: 'Harvest homepage addition' },
      });
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Move up: Harvest homepage addition',
        }),
      );
    }
    const switchPage = (value: string) =>
      fireEvent.change(screen.getByLabelText('Preview page'), {
        target: { value },
      });
    // Find Us is fixed on vendor websites: no library sections.
    switchPage('find');
    expect(screen.queryByRole('button', { name: /Add Section/ })).toBeNull();
    for (const page of ['about', 'contact', 'faq', 'policies', 'products']) {
      switchPage(page);
      const add = screen.getByRole('button', {
        name: 'Add Section',
      });
      if (page === 'products')
        expect(
          screen.queryByRole('button', {
            name: 'Add Section after page content',
          }),
        ).toBeNull();
      fireEvent.click(add);
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'Add Section' })).getByRole(
          'button',
          { name: /^Text/ },
        ),
      );
      fireEvent.change(screen.getByLabelText('Heading'), {
        target: { value: `${page} editorial` },
      });
    }
    switchPage('contact');
    fireEvent.click(
      screen.getByRole('button', { name: 'Text: contact editorial' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Duplicate: contact editorial' }),
    );
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Second contact section' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Move up: Second contact section' }),
    );
    const inspector = () =>
      within(screen.getByRole('complementary', { name: 'Selection settings' }));
    fireEvent.click(inspector().getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(inspector().getByRole('switch')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(inspector().getByRole('switch')).not.toBeChecked();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Delete section: Second contact section',
      }),
    );
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete this section?' }),
      ).getByRole('button', { name: 'Delete section' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    switchPage('product');
    expect(screen.queryByRole('button', { name: /Add Section/ })).toBeNull();
    switchPage('products');
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update',
          path: '/products',
          config: expect.objectContaining({
            pageSections: expect.objectContaining({
              products: expect.anything(),
              contact: expect.anything(),
            }),
          }),
        }),
        'http://pilot.localhost:4321',
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(publish).not.toHaveBeenCalled();
    const saved = save.mock.calls[0]![2] as StorefrontAppearance;
    expect(saved.contact?.enabled ?? false).toBe(false);
    expect(saved.about).toEqual(defaultStorefrontAppearance.about);
    expect(
      saved.pageSections?.contact?.after?.map((s) => [s.content, s.visible]),
    ).toEqual([
      [expect.objectContaining({ heading: 'Second contact section' }), false],
      [expect.objectContaining({ heading: 'contact editorial' }), true],
    ]);
    if (theme === 'harvest')
      expect(saved.harvestComposition?.map((s) => s.id).slice(-2)).toEqual([
        expect.stringMatching(/^text-/),
        'closing',
      ]);
    view.unmount();
    render(<Editor />);
    await act(async () => {});
    switchPage('contact');
    expect(
      screen.getByRole('button', { name: 'Text: contact editorial' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Text: Second contact section (hidden)',
      }),
    ).toBeInTheDocument();
  },
);

it.each(['harvest', 'modern-farmhouse', 'editorial-market'] as const)(
  'edits %s Image with Text blocks on an informational page through the same inspector',
  async (theme) => {
    const section = createWebsiteSection(
      'image-with-text',
      'image-with-text-contact',
      {
        theme,
        themeVersion: theme === 'modern-farmhouse' ? 2 : 1,
        page: 'contact',
      },
    );
    const draft = storefrontAppearanceSchema.parse({
      ...defaultStorefrontAppearance,
      theme,
      ...(theme === 'modern-farmhouse'
        ? { template: { id: theme, version: 2, settings: farmhouseDefaults() } }
        : theme === 'editorial-market'
          ? {
              template: {
                id: theme,
                version: 1,
                settings: editorialMarketStarterSettings(),
              },
            }
          : {}),
      pageSections: { contact: { before: [section] } },
    });
    const save = vi.fn(
      async (
        _id: string,
        _version: number,
        config: StorefrontAppearanceConfig,
      ) => ({ ...record, draft: config }),
    );
    const record: StorefrontAppearanceRecord = {
      id: '99',
      name: 'Page blocks',
      version: 1,
      draft,
      published: null,
      publishedAt: null,
    };
    render(
      <VisualStorefrontEditor
        record={record}
        api={{
          read: vi.fn(),
          links: vi.fn(async () => []),
          save,
          publish: vi.fn(),
        }}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Preview page'), {
      target: { value: 'contact' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Image with Text:/ }));
    fireEvent.click(
      within(screen.getByLabelText('Section blocks')).getByRole('button', {
        name: 'Heading',
      }),
    );
    fireEvent.change(screen.getByLabelText('Heading'), {
      target: { value: 'Page block heading' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Heading')).toHaveValue(
      section.content.heading,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByLabelText('Heading')).toHaveValue('Page block heading');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const saved = save.mock.calls[0]![2].pageSections!.contact!.before![0]!;
    expect(saved.type === 'image-with-text' && saved.content.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'heading',
          content: { text: 'Page block heading' },
        }),
      ]),
    );
    expect(saved.content).not.toHaveProperty('heading');
  },
);

it('accepts the curated background image layout and rejects arbitrary layouts', () => {
  const section = createWebsiteSection(
    'image-with-text',
    'image-with-text-overlay',
    harvestHomepageTarget,
  );
  expect(
    websiteSectionSchema.safeParse({
      ...section,
      presentation: { ...section.presentation, imageSide: 'background' },
    }).success,
  ).toBe(true);
  expect(
    websiteSectionSchema.safeParse({
      ...section,
      presentation: { ...section.presentation, imageSide: 'custom-css' },
    }).success,
  ).toBe(false);
});

it('registers the expanded library on explicitly eligible pages across all three themes with strict bounded schemas', () => {
  for (const definition of Object.values(harvestExpandedSectionManifest)) {
    const section = createWebsiteSection(
      definition.type,
      `${definition.type}-expanded`,
      harvestHomepageTarget,
    );
    expect(isWebsiteSection(section)).toBe(true);
    expect(JSON.parse(JSON.stringify(section))).toEqual(section);
    for (const target of [farmhouseHomepageTarget, editorialHomepageTarget])
      expect(permitsWebsiteSection(section.type, target)).toBe(true);
    for (const page of [
      'product',
      'cart',
      'checkout',
      'account',
      'login',
      'orders',
      'confirmation',
    ])
      expect(
        permitsWebsiteSection(section.type, { ...harvestHomepageTarget, page }),
      ).toBe(false);
    for (const bad of [
      { ...section, version: 2 },
      { ...section, unknown: true },
      { ...section, content: { ...section.content, html: '<b>custom</b>' } },
      {
        ...section,
        presentation: { ...section.presentation, css: 'display:none' },
      },
      {
        ...section,
        presentation: { ...section.presentation, layout: 'custom' },
      },
    ])
      expect(isWebsiteSection(bad)).toBe(false);
    expect(isStorefrontEditorSection(`harvest:${section.id}`)).toBe(true);
    expect(isStorefrontEditorSection(`page:about:before:${section.id}`)).toBe(
      true,
    );
    expect(
      availableWebsiteSections(harvestHomepageTarget).some(
        (d) => d.type === section.type,
      ),
    ).toBe(true);
    const draft = {
      ...defaultStorefrontAppearance,
      harvestComposition: [
        ...harvestOriginalSections.map((id) => ({ id })),
        section,
      ],
    };
    expect(storefrontAppearanceSchema.parse(draft)).toEqual(draft);
  }
  for (const type of ['product-showcase', 'category-showcase'] as const) {
    const section = createWebsiteSection(
      type,
      `${type}-references`,
      harvestHomepageTarget,
    );
    const key = type === 'product-showcase' ? 'productIds' : 'categoryIds';
    for (const ids of [
      ['1', '1'],
      ['0'],
      ['2147483648'],
      ['other-vendor'],
      Array.from({ length: 9 }, (_, i) => String(i + 1)),
    ])
      expect(
        isWebsiteSection({
          ...section,
          content: { ...section.content, [key]: ids },
        }),
      ).toBe(false);
    expect(
      permitsWebsiteSection(type, {
        ...harvestHomepageTarget,
        page: 'products',
      }),
    ).toBe(false);
    expect(
      isWebsitePageCompositions(
        { products: { before: [section] } },
        harvestHomepageTarget,
      ),
    ).toBe(false);
    expect(
      isWebsiteSection({
        ...section,
        content: { ...section.content, price: 1 },
      }),
    ).toBe(false);
  }
  const gallery = createWebsiteSection(
    'image-gallery',
    'image-gallery-limits',
    harvestHomepageTarget,
  );
  const image = {
    id: 'image-photo',
    image: {
      assetId: '501',
      url: 'http://localhost:3000/assets/farm.jpg',
      alt: '',
    },
    caption: '',
  };
  gallery.visible = false;
  gallery.content.images = [image];
  expect(websiteSectionImages(gallery)).toEqual([image.image]);
  expect(
    isWebsiteSection({
      ...gallery,
      content: {
        ...gallery.content,
        images: Array.from({ length: 9 }, (_, i) => ({
          ...image,
          id: `image-${i}`,
        })),
      },
    }),
  ).toBe(false);
  expect(
    isWebsiteSection({
      ...gallery,
      content: { ...gallery.content, images: [image, image] },
    }),
  ).toBe(false);
  expect(
    isWebsiteSection({
      ...gallery,
      content: {
        ...gallery.content,
        images: [{ ...image, image: { ...image.image, assetId: null } }],
      },
    }),
  ).toBe(false);
  const features = createWebsiteSection(
    'feature-grid',
    'feature-grid-limits',
    harvestHomepageTarget,
  );
  const item = features.content.items[0]!;
  expect(
    isWebsiteSection({
      ...features,
      content: {
        ...features.content,
        items: Array.from({ length: 7 }, (_, i) => ({
          ...item,
          id: `feature-${i}`,
        })),
      },
    }),
  ).toBe(false);
  for (const icon of ['<svg/>', 'arbitrary-icon', 'alert(1)'])
    expect(
      isWebsiteSection({
        ...features,
        content: { ...features.content, items: [{ ...item, icon }] },
      }),
    ).toBe(false);
});

it('edits, orders and bounds gallery images and feature items through the existing inspector controls', () => {
  let latest: import('@market/theme/storefront').HarvestExpandedSection;
  function Editor({ type }: { type: 'image-gallery' | 'feature-grid' }) {
    const [value, setValue] = useState(() =>
      createWebsiteSection(type, `${type}-inspector`, harvestHomepageTarget),
    );
    latest = value;
    return (
      <HarvestSectionEditor
        value={value}
        onChange={(v) => setValue(v as typeof value)}
      />
    );
  }
  const view = render(<Editor type="image-gallery" />);
  fireEvent.click(screen.getByRole('button', { name: 'Add photograph' }));
  const firstImageId =
    latest!.type === 'image-gallery' ? latest!.content.images[0]!.id : '';
  fireEvent.click(screen.getByRole('button', { name: 'Add photograph' }));
  const secondImageId =
    latest!.type === 'image-gallery' ? latest!.content.images[1]!.id : '';
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Move photograph up' })[1]!,
  );
  expect(
    latest!.type === 'image-gallery' && latest!.content.images.map((i) => i.id),
  ).toEqual([secondImageId, firstImageId]);
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Remove photograph' })[0]!,
  );
  for (let i = 1; i < 8; i++)
    fireEvent.click(screen.getByRole('button', { name: 'Add photograph' }));
  expect(screen.getByRole('button', { name: 'Add photograph' })).toBeDisabled();
  expect(isWebsiteSection(latest!)).toBe(true);
  view.unmount();
  render(<Editor type="feature-grid" />);
  fireEvent.change(screen.getAllByLabelText('Feature title')[0]!, {
    target: { value: 'Local food' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Move Local food down' }));
  expect(
    latest!.type === 'feature-grid' && latest!.content.items[1]!.title,
  ).toBe('Local food');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Local food' }));
  for (let i = 1; i < 6; i++)
    fireEvent.click(screen.getByRole('button', { name: 'Add feature' }));
  expect(screen.getByRole('button', { name: 'Add feature' })).toBeDisabled();
  expect(isWebsiteSection(latest!)).toBe(true);
});

it('uses vendor-only catalog choices and keeps reference order independent of picker results', async () => {
  const api = {
    read: vi.fn(),
    save: vi.fn(),
    publish: vi.fn(),
    links: vi.fn(),
    products: vi.fn(async () => [
      { id: '21', name: 'Our carrots' },
      { id: '22', name: 'Our apples' },
    ]),
    showcaseCategories: vi.fn(async () => [
      { id: '31', name: 'Our vegetables' },
    ]),
    hierarchy: vi.fn(async () => [
      {
        id: '999',
        code: 'other',
        parentId: null,
        assignable: true,
        name: 'Other vendor category',
        active: true,
        children: [],
      },
    ]),
  };
  let latest: import('@market/theme/storefront').HarvestExpandedSection;
  function Editor({
    type,
  }: {
    type: 'product-showcase' | 'category-showcase';
  }) {
    const [value, setValue] = useState(() =>
      createWebsiteSection(type, `${type}-picker`, harvestHomepageTarget),
    );
    latest = value;
    return (
      <HarvestSectionEditor
        value={value}
        api={api}
        onChange={(v) => setValue(v as typeof value)}
      />
    );
  }
  const view = render(<Editor type="product-showcase" />);
  await screen.findByRole('option', { name: 'Our carrots' });
  fireEvent.change(screen.getByLabelText('Add a product'), {
    target: { value: '21' },
  });
  fireEvent.change(screen.getByLabelText('Add a product'), {
    target: { value: '22' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Move product 22 up' }));
  expect(
    latest!.type === 'product-showcase' && latest!.content.productIds,
  ).toEqual(['22', '21']);
  fireEvent.click(screen.getByRole('button', { name: 'Remove product 21' }));
  expect(
    latest!.type === 'product-showcase' && latest!.content.productIds,
  ).toEqual(['22']);
  view.unmount();
  render(<Editor type="category-showcase" />);
  await screen.findByRole('option', { name: 'Our vegetables' });
  expect(screen.queryByText('Other vendor category')).not.toBeInTheDocument();
  expect(api.hierarchy).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Add a category'), {
    target: { value: '31' },
  });
  expect(
    latest!.type === 'category-showcase' && latest!.content.categoryIds,
  ).toEqual(['31']);
});

it.each(Object.values(harvestExpandedSectionManifest))(
  'uses existing add, duplicate, hide, move and delete management for $label',
  async (definition) => {
    let latest: import('@market/theme/storefront').WebsiteSection[] = [];
    const api = {
      read: vi.fn(),
      save: vi.fn(),
      publish: vi.fn(),
      links: vi.fn(),
      showcaseCategories: vi.fn(async () => []),
      products: vi.fn(async () => []),
    };
    function Manager() {
      const [sections, setSections] = useState<
        import('@market/theme/storefront').WebsiteSection[]
      >([]);
      const [selected, choose] =
        useState<import('@market/theme/storefront').StorefrontEditorSection>();
      latest = sections;
      return (
        <WebsiteSectionManagement
          sections={sections}
          onChange={setSections}
          target={harvestHomepageTarget}
          prefix="harvest"
          api={api}
          products={[]}
          loadProducts={() => {}}
          selected={selected}
          choose={choose}
          busy={false}
          nativeLabel={() => ''}
          renderNative={() => null}
        />
      );
    }
    render(<Manager />);
    addSection(definition.label);
    expect(latest).toHaveLength(1);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: /^Duplicate:/ }));
    expect(latest).toHaveLength(2);
    expect(latest[0]!.id).not.toBe(latest[1]!.id);
    expect(latest[0]!.content).toEqual(latest[1]!.content);
    const copiedId = latest[1]!.id;
    const copyRow = within(
      document.querySelector(
        `[data-section-row="${copiedId}"]`,
      )! as HTMLElement,
    );
    fireEvent.click(copyRow.getByRole('button', { name: /^Move up:/ }));
    expect(latest[0]!.id).toBe(copiedId);
    fireEvent.click(copyRow.getByRole('switch', { name: /^Enable / }));
    expect(latest[0]!.visible).toBe(false);
    fireEvent.click(copyRow.getByRole('button', { name: /^Delete section:/ }));
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete this section?' }),
      ).getByRole('button', { name: 'Delete section' }),
    );
    expect(latest).toHaveLength(1);
  },
);

it('accepts the gallery carousel while retaining strict layout validation', () => {
  const gallery = createWebsiteSection(
    'image-gallery',
    'image-gallery-carousel',
    harvestHomepageTarget,
  );
  expect(
    isWebsiteSection({
      ...gallery,
      presentation: { ...gallery.presentation, layout: 'carousel' },
    }),
  ).toBe(true);
  expect(
    isWebsiteSection({
      ...gallery,
      presentation: { ...gallery.presentation, layout: 'custom-carousel' },
    }),
  ).toBe(false);
});

it('selects feature items in the section hierarchy and focuses their own editing controls', () => {
  const inspector = document.createElement('aside');
  document.body.append(inspector);
  const initial = createWebsiteSection(
    'feature-grid',
    'feature-grid-children',
    harvestHomepageTarget,
  );
  let latest = initial;
  const api = {
    read: vi.fn(),
    save: vi.fn(),
    publish: vi.fn(),
    links: vi.fn(),
  };
  function Editor() {
    const [sections, setSections] = useState<
      import('@market/theme/storefront').WebsiteSection[]
    >([initial]);
    const [block, setBlock] = useState<{
      sectionId: string;
      blockId: string;
    }>();
    return (
      <WebsiteEditorContext.Provider
        value={{
          inspector,
          block,
          selectBlock: (sectionId, blockId) =>
            setBlock(blockId ? { sectionId, blockId } : undefined),
        }}
      >
        <WebsiteSectionManagement
          sections={sections}
          onChange={(next) => {
            setSections(next);
            latest = next[0] as typeof initial;
          }}
          target={harvestHomepageTarget}
          prefix="harvest"
          api={api}
          products={[]}
          loadProducts={() => {}}
          selected={`harvest:${initial.id}`}
          busy={false}
          nativeLabel={() => ''}
          renderNative={() => null}
        />
      </WebsiteEditorContext.Provider>
    );
  }
  const view = render(<Editor />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Rooted in our community' }),
  );
  for (const label of [
    'Heading',
    'Description (optional)',
    'Desktop columns',
    'Icon placement',
    'Feature treatment',
    'Text alignment',
    'Background color',
    'Section spacing',
  ])
    expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Add feature' }),
  ).not.toBeInTheDocument();
  const fields = screen.getAllByLabelText('Feature title');
  expect(fields[1]!.closest('fieldset')).toHaveAttribute('hidden');
  fireEvent.change(fields[0]!, { target: { value: 'Our own feature' } });
  expect(latest.content.items[0]!.title).toBe('Our own feature');
  fireEvent.click(screen.getByRole('button', { name: 'Section settings' }));
  expect(fields[1]!.closest('fieldset')).not.toHaveAttribute('hidden');
  expect(screen.getByLabelText('Heading')).toBeInTheDocument();
  expect(screen.getByLabelText('Desktop columns')).toBeInTheDocument();
  view.unmount();
  inspector.remove();
});

it('chooses category representation images through the existing authorized media library', async () => {
  const owned = {
    id: '501',
    name: 'Our category photo',
    preview: 'http://localhost:3000/assets/category.jpg',
  };
  const media = {
    images: vi.fn(async () => [owned]),
    upload: vi.fn(),
    list: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    themeImages: vi.fn(async () => []),
  };
  const section = createWebsiteSection(
    'category-showcase',
    'category-showcase-image',
    harvestHomepageTarget,
  );
  section.content.categoryIds = ['31'];
  const change = vi.fn();
  render(
    <HarvestSectionEditor
      value={section}
      onChange={vi.fn()}
      media={media}
      categoryPresentation={{
        '31': { position: 4, visible: true, imageAssetId: null, image: '' },
      }}
      onCategoryPresentationChange={change}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Category image' }));
  fireEvent.click(
    await within(
      screen.getByRole('dialog', { name: 'Choose an image' }),
    ).findByRole('button', { name: 'Choose Our category photo' }),
  );
  expect(change).toHaveBeenCalledWith({
    '31': {
      position: 4,
      visible: true,
      imageAssetId: '501',
      image: owned.preview,
    },
  });
});

it.each(['image-gallery', 'product-showcase', 'category-showcase'] as const)(
  'keeps %s section controls out of the selected item inspector',
  async (type) => {
    const value = createWebsiteSection(
      type,
      `${type}-focused`,
      harvestHomepageTarget,
    );
    const itemId = type === 'image-gallery' ? 'image-first' : '31';
    if (value.type === 'image-gallery')
      value.content.images = [
        {
          id: itemId,
          image: { assetId: null, url: '', alt: '' },
          caption: 'Our photo',
        },
      ];
    if (value.type === 'product-showcase') value.content.productIds = [itemId];
    if (value.type === 'category-showcase')
      value.content.categoryIds = [itemId];
    render(
      <WebsiteEditorContext.Provider
        value={{
          inspector: null,
          block: { sectionId: value.id, blockId: itemId },
          selectBlock: vi.fn(),
        }}
      >
        <HarvestSectionEditor value={value} onChange={vi.fn()} />
      </WebsiteEditorContext.Provider>,
    );
    for (const label of [
      'Heading',
      'Description (optional)',
      'Layout',
      'Image shape',
      'Show captions',
      'Show link to Shop',
      'Desktop columns',
      'Text alignment',
      'Background color',
      'Section spacing',
      'Add a product',
      'Add a category',
    ])
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add photograph' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(
        type === 'image-gallery'
          ? 'Caption (optional)'
          : type === 'product-showcase'
            ? 'Product'
            : 'Category',
      ),
    ).toBeInTheDocument();
  },
);

it('offers bounded feature icon sizing without requiring a saved size for older sections', () => {
  const section = createWebsiteSection(
    'feature-grid',
    'feature-grid-size',
    harvestHomepageTarget,
  );
  expect(isWebsiteSection(section)).toBe(true);
  const change = vi.fn();
  render(<HarvestSectionEditor value={section} onChange={change} />);
  fireEvent.change(screen.getByLabelText('Icon size'), {
    target: { value: '64' },
  });
  expect(change.mock.calls[0]![0].presentation.iconSize).toBe(64);
  for (const iconSize of [15, 97, 20.5, '64px'])
    expect(
      isWebsiteSection({
        ...section,
        presentation: { ...section.presentation, iconSize },
      }),
    ).toBe(false);
  expect(
    isWebsiteSection({
      ...section,
      presentation: { ...section.presentation, iconSize: 96 },
    }),
  ).toBe(true);
});

it('resolves the selected product name even when it is absent from picker search results', async () => {
  const section = createWebsiteSection(
    'product-showcase',
    'product-showcase-names',
    harvestHomepageTarget,
  );
  section.content.productIds = ['901'];
  const products = vi.fn(async (_search?: string, ids?: string[]) =>
    ids ? [{ id: '901', name: 'Our saved tomatoes' }] : [],
  );
  const api = {
    read: vi.fn(),
    save: vi.fn(),
    publish: vi.fn(),
    links: vi.fn(),
    products,
  };
  render(
    <WebsiteEditorContext.Provider
      value={{
        inspector: null,
        block: { sectionId: section.id, blockId: '901' },
        selectBlock: vi.fn(),
      }}
    >
      <HarvestSectionEditor value={section} api={api} onChange={vi.fn()} />
    </WebsiteEditorContext.Provider>,
  );
  expect(
    await screen.findByRole('option', { name: 'Our saved tomatoes' }),
  ).toBeInTheDocument();
  expect(products).toHaveBeenCalledWith('', ['901']);
  expect(
    screen.queryByRole('option', { name: 'Current selection' }),
  ).not.toBeInTheDocument();
});

it('keeps gallery alt text and captions in individual image editing only', () => {
  const section = createWebsiteSection(
    'image-gallery',
    'image-gallery-section-fields',
    harvestHomepageTarget,
  );
  section.content.images = [
    {
      id: 'image-fields',
      image: { assetId: null, url: '', alt: '' },
      caption: '',
    },
  ];
  render(<HarvestSectionEditor value={section} onChange={vi.fn()} />);
  expect(screen.queryByLabelText('Caption (optional)')).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText(
      'Image description (leave blank for decorative images)',
    ),
  ).not.toBeInTheDocument();
});

it('advances carousel arrows by one anchored image and clamps at the last complete view', () => {
  const stops = galleryStops([0, 220, 440, 660, 880, 1100, 1320, 1540], 1100);
  expect(stops).toEqual([0, 220, 440, 660, 880, 1100]);
  let index = 0;
  index = nextGalleryIndex(index, 1, stops.length);
  expect(stops[index]).toBe(220);
  index = nextGalleryIndex(index, 1, stops.length);
  expect(stops[index]).toBe(440);
  index = nextGalleryIndex(index, -1, stops.length);
  expect(stops[index]).toBe(220);
  expect(nextGalleryIndex(0, -1, stops.length)).toBe(0);
  expect(nextGalleryIndex(5, 1, stops.length)).toBe(5);
  expect(galleryStops([0], 0)).toEqual([0]);
});

it('configures a bounded visible-image count without rewriting older galleries', () => {
  const section = createWebsiteSection(
    'image-gallery',
    'image-gallery-count',
    harvestHomepageTarget,
  );
  section.presentation.layout = 'carousel';
  const change = vi.fn();
  render(<HarvestSectionEditor value={section} onChange={change} />);
  expect(screen.getByLabelText('Visible images')).toHaveValue('3');
  fireEvent.change(screen.getByLabelText('Visible images'), {
    target: { value: '4' },
  });
  expect(change.mock.calls[0]![0].presentation.visibleImages).toBe(4);
  for (const visibleImages of [1, 2, 3, 4])
    expect(
      isWebsiteSection({
        ...section,
        presentation: { ...section.presentation, visibleImages },
      }),
    ).toBe(true);
  for (const visibleImages of [0, 5, 1.5, '3'])
    expect(
      isWebsiteSection({
        ...section,
        presentation: { ...section.presentation, visibleImages },
      }),
    ).toBe(false);
  expect(isWebsiteSection(section)).toBe(true);
});

it('adds the shared carousel to product showcase without image-shape settings', () => {
  const section = createWebsiteSection(
    'product-showcase',
    'product-showcase-carousel',
    harvestHomepageTarget,
  );
  section.presentation.layout = 'carousel';
  const change = vi.fn();
  render(<HarvestSectionEditor value={section} onChange={change} />);
  expect(screen.getByLabelText('Visible products')).toHaveValue('3');
  expect(screen.queryByLabelText('Image shape')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Desktop columns')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Visible products'), {
    target: { value: '4' },
  });
  expect(change.mock.calls[0]![0].presentation.visibleImages).toBe(4);
  expect(isWebsiteSection(change.mock.calls[0]![0])).toBe(true);
  for (const aspectRatio of ['square', 'portrait', 'landscape'])
    expect(
      isWebsiteSection({
        ...section,
        presentation: { ...section.presentation, aspectRatio },
      }),
    ).toBe(false);
  for (const visibleImages of [0, 5, '3'])
    expect(
      isWebsiteSection({
        ...section,
        presentation: { ...section.presentation, visibleImages },
      }),
    ).toBe(false);
});

it('normalizes raw numeric product IDs so saved dropdown selections resolve to their names', async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            ownStorefrontProducts: [
              {
                id: 901,
                name: 'Our saved tomatoes',
                slug: 'our-saved-tomatoes',
              },
            ],
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
  );
  const api = createStorefrontAppearanceApi({
    endpoint: 'http://localhost/admin-api',
    channelToken: 'our-vendor-channel',
    fetch: fetcher,
  });
  expect(await api.products('', ['901'])).toEqual([
    { id: '901', name: 'Our saved tomatoes', slug: 'our-saved-tomatoes' },
  ]);
  const section = createWebsiteSection(
    'product-showcase',
    'product-showcase-numeric-ids',
    harvestHomepageTarget,
  );
  section.content.productIds = ['901'];
  render(
    <WebsiteEditorContext.Provider
      value={{
        inspector: null,
        block: { sectionId: section.id, blockId: '901' },
        selectBlock: vi.fn(),
      }}
    >
      <HarvestSectionEditor value={section} api={api} onChange={vi.fn()} />
    </WebsiteEditorContext.Provider>,
  );
  expect(
    await screen.findByRole('option', { name: 'Our saved tomatoes' }),
  ).toHaveValue('901');
  expect(
    screen.queryByRole('option', { name: /Unavailable product/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText('Product')).toHaveDisplayValue(
    'Our saved tomatoes',
  );
});

it('derives editable informational heroes without mutations and respects explicit deletion and page budgets', () => {
  for (const theme of [
    'harvest',
    'modern-farmhouse',
    'editorial-market',
  ] as const) {
    const appearance = storefrontAppearanceSchema.parse({
      ...defaultStorefrontAppearance,
      theme,
      ...(theme === 'modern-farmhouse'
        ? { template: { id: theme, version: 2, settings: farmhouseDefaults() } }
        : theme === 'editorial-market'
          ? {
              template: {
                id: theme,
                version: 1,
                settings: editorialMarketStarterSettings(),
              },
            }
          : {}),
    });
    const original = JSON.stringify(appearance);
    // On a vendor website the vendor standard keeps Policies heading-only
    // and Find Us fixed, so neither derives a hero. Market Harvest and market
    // Editorial Market follow the market standard: Policies is heading-only.
    const marketHeroPages =
      theme === 'modern-farmhouse'
        ? (['about', 'contact', 'find-us', 'faq', 'policies'] as const)
        : (['about', 'contact', 'faq'] as const);
    if (theme !== 'modern-farmhouse')
      expect(supportsWebsitePageHero(appearance, 'policies', 'MARKET')).toBe(
        false,
      );
    for (const [kind, page] of [
      ...marketHeroPages.map((page) => ['MARKET', page] as const),
      ...(['about', 'contact', 'faq'] as const).map(
        (page) => ['VENDOR', page] as const,
      ),
    ]) {
      expect(supportsWebsitePageHero(appearance, page, kind)).toBe(true);
      const sections = effectiveWebsitePageSections(
        appearance,
        page,
        'before',
        kind,
      );
      expect(sections).toHaveLength(1);
      expect(sections[0]!.type).toBe('image-with-text');
      expect(isWebsiteSection(sections[0])).toBe(true);
      expect(
        effectiveWebsitePageSections(appearance, page, 'after', kind),
      ).toEqual([]);
      const deleted = {
        ...appearance,
        pageSections: { [page]: { before: [], after: [] } },
      };
      expect(
        effectiveWebsitePageSections(
          storefrontAppearanceSchema.parse(deleted),
          page,
          'before',
          kind,
        ),
      ).toEqual([]);
      const after = Array.from({ length: 12 }, (_, i) =>
        createWebsiteSection('text', `text-budget-${i}`, {
          theme,
          themeVersion: theme === 'modern-farmhouse' ? 2 : 1,
          page,
        }),
      );
      expect(
        effectiveWebsitePageSections(
          { ...appearance, pageSections: { [page]: { after } } },
          page,
          'before',
          kind,
        ),
      ).toEqual([]);
    }
    for (const page of ['find-us', 'policies'] as const) {
      expect(supportsWebsitePageHero(appearance, page, 'VENDOR')).toBe(false);
      expect(
        effectiveWebsitePageSections(appearance, page, 'before', 'VENDOR'),
      ).toEqual([]);
    }
    expect(JSON.stringify(appearance)).toBe(original);
    for (const page of ['products', 'product', 'cart', 'checkout', 'account'])
      for (const kind of ['MARKET', 'VENDOR'] as const)
        expect(supportsWebsitePageHero(appearance, page, kind)).toBe(false);
  }
});

it('moves the default About hero across page content, uses one picker and persists hero deletion', async () => {
  let snapshot: StorefrontAppearanceRecord = {
    id: '101',
    name: 'Page hero',
    version: 1,
    draft: structuredClone(defaultStorefrontAppearance),
    published: null,
    publishedAt: null,
  };
  const save = vi.fn(
    async (
      _id: string,
      _version: number,
      config: StorefrontAppearanceConfig,
    ) => ({ ...snapshot, draft: config, version: 2 }),
  );
  const api = {
    read: vi.fn(),
    links: vi.fn(async () => []),
    save,
    publish: vi.fn(),
  };
  function Editor() {
    const [record, setRecord] = useState(snapshot);
    return (
      <VisualStorefrontEditor
        record={record}
        api={api}
        onSaved={(next) => {
          snapshot = next;
          setRecord(next);
        }}
      />
    );
  }
  const view = render(<Editor />);
  const about = () =>
    fireEvent.change(screen.getByLabelText('Preview page'), {
      target: { value: 'about' },
    });
  about();
  expect(screen.getAllByRole('button', { name: 'Add Section' })).toHaveLength(
    1,
  );
  expect(screen.queryByText(/Native page content/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Add Section after page content' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Image with Text:/ }));
  fireEvent.click(
    screen.getByRole('button', { name: /^Move down: Our story/ }),
  );
  expect(screen.getByLabelText('Heading')).toHaveValue('Our story');
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(snapshot.draft.pageSections?.about?.before).toEqual([]);
  expect(snapshot.draft.pageSections?.about?.after?.[0]?.type).toBe(
    'image-with-text',
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Delete section: Our story' }),
  );
  fireEvent.click(
    within(
      screen.getByRole('dialog', { name: 'Delete this section?' }),
    ).getByRole('button', { name: 'Delete section' }),
  );
  expect(
    screen.queryByRole('button', { name: /^Image with Text:/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(
    screen.getByRole('button', { name: /^Image with Text:/ }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(snapshot.draft.pageSections?.about).toEqual({
    before: [],
    after: [],
    closingPosition: 1,
  });
  view.unmount();
  render(<Editor />);
  about();
  expect(
    screen.queryByRole('button', { name: /^Image with Text:/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
  expect(
    screen.getByRole('dialog', { name: 'Add Section' }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole('dialog', { name: 'Add Section' })).getByRole(
      'button',
      { name: /^Image with Text/ },
    ),
  ).toBeInTheDocument();
});

it('shows page enablement above Theme settings and removes page metadata dropdowns', () => {
  const api = {
    read: vi.fn(),
    links: vi.fn(async () => []),
    save: vi.fn(),
    publish: vi.fn(),
  };
  render(
    <VisualStorefrontEditor
      record={{
        id: 'page-controls',
        name: 'Page controls',
        version: 1,
        draft: structuredClone(defaultStorefrontAppearance),
        published: null,
        publishedAt: null,
      }}
      api={api}
      onSaved={vi.fn()}
    />,
  );
  for (const page of ['about', 'contact', 'find', 'faq', 'policies']) {
    fireEvent.change(screen.getByLabelText('Preview page'), {
      target: { value: page },
    });
    const toggle = screen.getByRole('switch', {
      name: {
        about: 'Enable the About page',
        contact: 'Enable Contact page',
        find: 'Enable Find Us page',
        faq: 'Enable FAQ page',
        policies: 'Enable Policies page',
      }[page],
    });
    const theme = screen.getByRole('button', { name: 'Theme settings' });
    expect(
      toggle.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Page content' }),
    ).not.toBeInTheDocument();
    for (const name of [
      'Our Story page',
      'Find Us page',
      'Contact page',
      'FAQ page',
      'Policies page',
    ])
      // Vendor Policies opens with its own heading (vendor standard), so it
      // keeps its own settings row.
      if (page === 'policies' && name === 'Policies page')
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
      else
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Page title')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(screen.queryByText(/Edits are incomplete/)).not.toBeInTheDocument();
  }
});

it('shows no Closing invitation on vendor Find Us and Policies', () => {
  render(
    <VisualStorefrontEditor
      record={{
        id: 'closing-none',
        name: 'Closing none',
        version: 1,
        draft: structuredClone(defaultStorefrontAppearance),
        published: null,
        publishedAt: null,
      }}
      api={{
        read: vi.fn(),
        links: vi.fn(async () => []),
        save: vi.fn(),
        publish: vi.fn(),
      }}
    />,
  );
  for (const page of ['find', 'policies']) {
    fireEvent.change(screen.getByLabelText('Preview page'), {
      target: { value: page },
    });
    expect(
      screen.queryByRole('button', { name: 'Closing invitation' }),
    ).toBeNull();
  }
});

it.each(['about', 'contact', 'faq'])(
  'moves %s Closing invitation independently, edits it and saves its position',
  async (page) => {
    let snapshot: StorefrontAppearanceRecord = {
      id: 'closing-move',
      name: 'Closing move',
      version: 1,
      draft: structuredClone(defaultStorefrontAppearance),
      published: null,
      publishedAt: null,
    };
    const save = vi.fn(
      async (
        _id: string,
        _version: number,
        config: StorefrontAppearanceConfig,
      ) => ({ ...snapshot, draft: config, version: snapshot.version + 1 }),
    );
    const api = {
      read: vi.fn(),
      links: vi.fn(async () => []),
      save,
      publish: vi.fn(),
    };
    function Editor() {
      const [record, setRecord] = useState(snapshot);
      return (
        <VisualStorefrontEditor
          record={record}
          api={api}
          onSaved={(next) => {
            snapshot = next;
            setRecord(next);
          }}
        />
      );
    }
    const view = render(<Editor />);
    const select = () =>
      fireEvent.change(screen.getByLabelText('Preview page'), {
        target: { value: page },
      });
    select();
    fireEvent.click(screen.getByRole('button', { name: 'Closing invitation' }));
    const field = screen.getByLabelText(
      page === 'about'
        ? 'CTA heading'
        : page === 'faq' || page === 'policies'
          ? 'Invitation heading'
          : 'Heading',
    );
    fireEvent.change(field, { target: { value: 'Our moved invitation' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Move up: Closing invitation' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Move up: Closing invitation' }),
    );
    expect(
      screen.getByRole('button', { name: 'Move up: Closing invitation' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
      screen.getByRole('button', { name: 'Move up: Closing invitation' }),
    ).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const key =
      page === 'find'
        ? 'find-us'
        : (page as import('@market/theme/storefront').WebsiteEditorialPage);
    expect(snapshot.draft.pageSections?.[key]?.closingPosition).toBe(0);
    expect(storefrontAppearanceSchema.safeParse(snapshot.draft).success).toBe(
      true,
    );
    view.unmount();
    render(<Editor />);
    select();
    fireEvent.click(screen.getByRole('button', { name: 'Closing invitation' }));
    expect(
      screen.getByRole('button', { name: 'Move up: Closing invitation' }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(
        page === 'about'
          ? 'CTA heading'
          : page === 'faq' || page === 'policies'
            ? 'Invitation heading'
            : 'Heading',
      ),
    ).toHaveValue('Our moved invitation');
  },
);

it('strictly bounds invitation positions and rejects them on Shop and protected pages', () => {
  const hero = createWebsiteSection(
    'image-with-text',
    'image-with-text-close-contract',
    harvestHomepageTarget,
  );
  for (const closingPosition of [0, 1, 2])
    expect(
      isWebsitePageCompositions(
        { about: { before: [hero], after: [], closingPosition } },
        harvestHomepageTarget,
      ),
    ).toBe(true);
  for (const closingPosition of [-1, 3, 0.5, '0'])
    expect(
      isWebsitePageCompositions(
        { about: { before: [hero], after: [], closingPosition } },
        harvestHomepageTarget,
      ),
    ).toBe(false);
  for (const page of ['products', 'product', 'cart', 'checkout', 'account'])
    expect(
      isWebsitePageCompositions(
        { [page]: { before: [], after: [], closingPosition: 0 } },
        harvestHomepageTarget,
      ),
    ).toBe(false);
});

it('offers the same expanded library and page boundaries on all three themes', () => {
  const targets = [
    harvestHomepageTarget,
    farmhouseHomepageTarget,
    editorialHomepageTarget,
  ];
  for (const target of targets) {
    expect(availableWebsiteSections(target)).toHaveLength(8);
    for (const page of [
      'home',
      'about',
      'find-us',
      'contact',
      'faq',
      'policies',
      'products',
    ]) {
      expect(
        availableWebsiteSections({ ...target, page }).map((d) => d.type),
      ).toEqual(
        availableWebsiteSections({ ...harvestHomepageTarget, page }).map(
          (d) => d.type,
        ),
      );
    }
    const sections = availableWebsiteSections(target).map(({ type }) =>
      createWebsiteSection(type, `${type}-theme-parity`, target),
    );
    const appearance =
      target.theme === 'modern-farmhouse'
        ? {
            ...defaultStorefrontAppearance,
            theme: target.theme,
            template: {
              id: target.theme,
              version: 2,
              settings: {
                ...farmhouseDefaults(),
                sections: [...farmhouseDefaults().sections, ...sections],
              },
            },
          }
        : target.theme === 'editorial-market'
          ? {
              ...defaultStorefrontAppearance,
              theme: target.theme,
              template: {
                id: target.theme,
                version: 1,
                settings: {
                  ...editorialMarketStarterSettings(),
                  composition: [
                    ...editorialHomepageComposition(
                      editorialMarketStarterSettings(),
                    ),
                    ...sections,
                  ],
                },
              },
            }
          : {
              ...defaultStorefrontAppearance,
              harvestComposition: [
                ...harvestOriginalSections.map((id) => ({ id })),
                ...sections,
              ],
            };
    expect(storefrontAppearanceSchema.safeParse(appearance).success).toBe(true);
    for (const page of ['product', 'cart', 'checkout', 'account', 'orders'])
      expect(availableWebsiteSections({ ...target, page })).toEqual([]);
  }
});

it('validates background extent independently from color while preserving old sections', () => {
  for (const target of [
    harvestHomepageTarget,
    farmhouseHomepageTarget,
    editorialHomepageTarget,
  ]) {
    for (const { type } of availableWebsiteSections(target)) {
      const section = createWebsiteSection(
        type,
        `${type}-background-options`,
        target,
      );
      for (const backgroundType of ['contained', 'full'])
        expect(
          isWebsiteSection({
            ...section,
            presentation: { ...section.presentation, backgroundType },
          }),
        ).toBe(true);
      expect(
        isWebsiteSection({
          ...section,
          presentation: {
            ...section.presentation,
            backgroundType: 'arbitrary',
          },
        }),
      ).toBe(false);
    }
  }
});

it('keeps saved default showcases authoritative, including edits and deletion', () => {
  const legacy = editorialMarketStarterSettings();
  const composition = editorialHomepageComposition(legacy, {
    productIds: ['7'],
    categoryIds: ['42'],
  });
  expect(composition[2]).toMatchObject({
    type: 'category-showcase',
    content: { categoryIds: ['42'] },
  });
  expect(composition[1]).toMatchObject({
    type: 'product-showcase',
    content: { productIds: ['7'] },
  });
  const saved = {
    ...legacy,
    composition: composition.filter(
      (s) => s.id !== 'category-showcase-homepage',
    ),
  };
  expect(editorialHomepageComposition(saved)).toEqual(saved.composition);
  expect(
    editorialMarketTemplateSchema.safeParse({
      id: 'editorial-market',
      version: 1,
      settings: saved,
    }).success,
  ).toBe(true);
});

it('seeds an Editorial Market market banner as an editable CTA section that saves without the native slot', () => {
  const settings = editorialMarketStarterSettings();
  const market = {
    ...marketAppearanceDefaults,
    text: { closingHeading: 'Come early.\nStay late.', closingLabel: 'Visit' },
  };
  const composition = editorialMarketHomepageComposition({
    market,
    template: { settings },
  });
  expect(composition.map((section) => section.id)).toEqual([
    'hero',
    'markets',
    'vendors',
    'categories',
    editorialMarketClosingSectionId,
    'impact',
  ]);
  const banner = composition.find(
    (section) => section.id === editorialMarketClosingSectionId,
  );
  expect(banner).toMatchObject({
    type: 'cta-banner',
    content: {
      heading: 'Come early.\nStay late.',
      label: 'Visit',
      destination: '/market-dates',
    },
    presentation: { alignment: 'left', background: 'paper' },
  });
  // The converted composition is the one the editor saves.
  expect(
    editorialMarketTemplateSchema.safeParse({
      id: 'editorial-market',
      version: 1,
      settings: { ...settings, composition },
    }).success,
  ).toBe(true);
  // Saved compositions keep their banner; the other market natives stay required.
  expect(
    editorialHomepageComposition({ ...settings, composition }, {}, true),
  ).toEqual(composition);
  expect(
    editorialMarketTemplateSchema.safeParse({
      id: 'editorial-market',
      version: 1,
      settings: {
        ...settings,
        composition: composition.filter((section) => section.id !== 'vendors'),
      },
    }).success,
  ).toBe(false);
});
