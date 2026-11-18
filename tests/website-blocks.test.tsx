import { useState } from 'react';
import {
  fireEvent,
  createEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  createWebsiteBlock,
  createWebsiteSection,
  defaultStorefrontAppearance,
  editWebsiteBlocks,
  effectiveWebsiteBlocks,
  editorialHomepageTarget,
  editorialMarketStarterSettings,
  farmhouseDefaults,
  farmhouseHomepageTarget,
  isImageTextBlocksContent,
  isWebsiteBlock,
  permitsWebsiteBlock,
  storefrontAppearanceSchema,
  websiteSectionSchema,
  withWebsiteBlocks,
  type WebsiteBlockType,
} from '@market/theme/storefront';
import type {
  StorefrontAppearanceConfig,
  StorefrontAppearanceRecord,
} from '@market/api';
import { VisualStorefrontEditor } from '../apps/admin/src/VisualStorefrontEditor';

const legacy = () =>
  createWebsiteSection(
    'image-with-text',
    'image-with-text-blocks',
    farmhouseHomepageTarget,
  );
const composition = () =>
  withWebsiteBlocks(legacy(), effectiveWebsiteBlocks(legacy()));

it('explicitly limits block eligibility to Image with Text on supported pages', () => {
  for (const type of [
    'heading',
    'paragraph',
    'image',
    'button',
    'eyebrow',
  ] as const) {
    expect(
      permitsWebsiteBlock(type, 'image-with-text', farmhouseHomepageTarget),
    ).toBe(true);
    expect(
      permitsWebsiteBlock(type, 'image-with-text', editorialHomepageTarget),
    ).toBe(true);
    for (const page of ['shop', 'product', 'cart', 'checkout'])
      expect(
        permitsWebsiteBlock(type, 'image-with-text', {
          ...farmhouseHomepageTarget,
          page,
        }),
      ).toBe(false);
    for (const section of ['text', 'cta-banner', 'products', 'checkout'])
      expect(permitsWebsiteBlock(type, section, farmhouseHomepageTarget)).toBe(
        false,
      );
    expect(
      permitsWebsiteBlock(type, 'image-with-text', {
        ...farmhouseHomepageTarget,
        themeVersion: 1,
      }),
    ).toBe(false);
  }
  expect(
    permitsWebsiteBlock('checkout', 'image-with-text', farmhouseHomepageTarget),
  ).toBe(false);
});

it('derives legacy blocks without rewriting, then serializes one authoritative composition', () => {
  const section = legacy();
  section.content.label = 'Our story';
  const before = structuredClone(section);
  const blocks = effectiveWebsiteBlocks(section);
  expect(blocks.map((b) => b.type)).toEqual([
    'image',
    'heading',
    'paragraph',
    'button',
  ]);
  expect(effectiveWebsiteBlocks(section)).toEqual(blocks);
  expect(section).toEqual(before);
  const next = withWebsiteBlocks(section, blocks);
  expect(Object.keys(JSON.parse(JSON.stringify(next)).content)).toEqual([
    'blocks',
  ]);
  expect(websiteSectionSchema.safeParse(next).success).toBe(true);
  expect(
    websiteSectionSchema.safeParse({
      ...next,
      content: { ...next.content, heading: 'conflict' },
    }).success,
  ).toBe(false);
  expect(websiteSectionSchema.safeParse(section).success).toBe(true);
});

it('bounds structural operations and preserves the image region and immutable saved order', () => {
  const original = composition();
  let section = editWebsiteBlocks(original, {
    type: 'add',
    block: createWebsiteBlock('eyebrow', 'block-intro'),
  });
  section = editWebsiteBlocks(section, {
    type: 'move',
    id: 'block-intro',
    offset: -1,
  });
  expect(effectiveWebsiteBlocks(section).map((b) => b.type)).toEqual([
    'image',
    'heading',
    'eyebrow',
    'paragraph',
  ]);
  expect(effectiveWebsiteBlocks(original).map((b) => b.type)).toEqual([
    'image',
    'heading',
    'paragraph',
  ]);
  expect(
    editWebsiteBlocks(section, {
      type: 'move',
      id: 'block-legacy-image',
      offset: 1,
    }),
  ).toBe(section);
  expect(
    editWebsiteBlocks(section, { type: 'delete', id: 'block-legacy-heading' }),
  ).toBe(section);
  expect(
    editWebsiteBlocks(section, { type: 'toggle', id: 'block-legacy-image' }),
  ).toBe(section);
  section = editWebsiteBlocks(section, {
    type: 'duplicate',
    id: 'block-legacy-paragraph',
    newId: 'block-paragraph-copy',
  });
  section = editWebsiteBlocks(section, {
    type: 'duplicate',
    id: 'block-legacy-paragraph',
    newId: 'block-paragraph-last',
  });
  expect(
    editWebsiteBlocks(section, {
      type: 'duplicate',
      id: 'block-legacy-paragraph',
      newId: 'block-overflow',
    }),
  ).toBe(section);
  expect(
    editWebsiteBlocks(section, {
      type: 'duplicate',
      id: 'block-legacy-heading',
      newId: 'block-heading-copy',
    }),
  ).toBe(section);
  section = editWebsiteBlocks(section, { type: 'toggle', id: 'block-intro' });
  expect(
    effectiveWebsiteBlocks(section).find((b) => b.id === 'block-intro')
      ?.visible,
  ).toBe(false);
  section = editWebsiteBlocks(section, { type: 'delete', id: 'block-intro' });
  expect(
    effectiveWebsiteBlocks(section).some((b) => b.id === 'block-intro'),
  ).toBe(false);
});

it.each([
  'heading',
  'paragraph',
  'image',
  'button',
  'eyebrow',
] as WebsiteBlockType[])(
  'strictly validates %s identity, version, content and presentation',
  (type) => {
    const block = createWebsiteBlock(type, 'block-valid');
    expect(isWebsiteBlock(block)).toBe(true);
    for (const bad of [
      { ...block, id: 'unsafe id' },
      { ...block, version: 2 },
      { ...block, visible: 'true' },
      { ...block, type: 'checkout' },
      { ...block, price: 0 },
      { ...block, content: { ...block.content, html: '<script/>' } },
      { ...block, presentation: { css: 'color:red' } },
    ])
      expect(isWebsiteBlock(bad)).toBe(false);
  },
);

it('rejects duplicate IDs, missing required blocks, count overflow, unsafe references and layout values', () => {
  const section = composition();
  const blocks = effectiveWebsiteBlocks(section);
  expect(isImageTextBlocksContent({ blocks: [...blocks, blocks[0]] })).toBe(
    false,
  );
  expect(
    isImageTextBlocksContent({
      blocks: blocks.filter((b) => b.type !== 'heading'),
    }),
  ).toBe(false);
  for (const type of [
    'heading',
    'image',
    'eyebrow',
    'paragraph',
    'button',
  ] as const) {
    const count = { heading: 2, image: 2, eyebrow: 2, paragraph: 4, button: 3 }[
      type
    ];
    const next = blocks.filter((b) => b.type !== type);
    for (let i = 0; i < count; i++)
      next.push(createWebsiteBlock(type, `block-${type}-${i}`));
    expect(isImageTextBlocksContent({ blocks: next })).toBe(false);
  }
  for (const destination of [
    'javascript:alert(1)',
    '/checkout',
    '/cart',
    '//external.test',
    'https://external.test',
    '/products?price=0',
  ])
    expect(
      isWebsiteBlock({
        ...createWebsiteBlock('button', 'block-link'),
        content: { label: 'Go', destination },
      }),
    ).toBe(false);
  expect(
    isWebsiteBlock({
      ...createWebsiteBlock('image', 'block-photo'),
      content: {
        assetId: null,
        url: 'https://external.test/photo.png',
        alt: '',
      },
    }),
  ).toBe(false);
  expect(
    isWebsiteBlock({
      ...createWebsiteBlock('paragraph', 'block-copy'),
      content: { text: 'x'.repeat(1201) },
    }),
  ).toBe(false);
  for (const [key, valid, invalid] of [
    ['columnRatio', '40-60', '20-80'],
    ['verticalAlignment', 'top', 'stretch'],
    ['spacing', 'compact', '5px'],
  ]) {
    expect(
      websiteSectionSchema.safeParse({
        ...section,
        presentation: { ...section.presentation, [key!]: valid },
      }).success,
    ).toBe(true);
    expect(
      websiteSectionSchema.safeParse({
        ...section,
        presentation: { ...section.presentation, [key!]: invalid },
      }).success,
    ).toBe(false);
  }
});

it.each(['modern-farmhouse', 'editorial-market'] as const)(
  'edits %s blocks in the inspector, carries history, preview and save without implicit publication',
  async (theme) => {
    const editorial = theme === 'editorial-market';
    const section = legacy();
    const settings = editorial
      ? editorialMarketStarterSettings()
      : farmhouseDefaults();
    let snapshot: StorefrontAppearanceRecord = {
      id: '42',
      name: 'Block pilot',
      version: 1,
      published: null,
      publishedAt: null,
      draft: storefrontAppearanceSchema.parse({
        ...defaultStorefrontAppearance,
        theme,
        template: editorial
          ? {
              id: theme,
              version: 1,
              settings: {
                ...settings,
                composition: [
                  { id: 'hero' },
                  section,
                  { id: 'categories' },
                  { id: 'products' },
                  { id: 'impact' },
                ],
              },
            }
          : {
              id: theme,
              version: 2,
              settings: {
                ...settings,
                sections: [...farmhouseDefaults().sections, section],
              },
            },
      }),
    };
    const save = vi.fn(
      async (_id: string, version: number, draft: StorefrontAppearanceConfig) =>
        (snapshot = { ...snapshot, version: version + 1, draft }),
    );
    const publish = vi.fn(
      async () =>
        (snapshot = {
          ...snapshot,
          version: snapshot.version + 1,
          published: structuredClone(snapshot.draft),
          publishedAt: new Date().toISOString(),
        }),
    );
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
            preview: vi.fn(async () => ({
              token: 'a'.repeat(43),
              url: 'http://pilot.localhost:4321',
              expiresAt: Date.now() + 300000,
            })),
          }}
          onSaved={setRecord}
          dashboardHref="/vendor/storefront?storefront=7"
          backLabel="Back to Website Library"
        />
      );
    }
    const view = render(<Editor />);
    const frame = await screen.findByTitle<HTMLIFrameElement>(
      'Actual storefront preview',
    );
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    fireEvent.click(screen.getByRole('button', { name: /^Image with Text:/ }));
    const inspector = () =>
      within(screen.getByRole('complementary', { name: 'Selection settings' }));
    expect(
      inspector().getByLabelText('Column proportions (image / text)'),
    ).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByLabelText('Section blocks')).getByRole('button', {
        name: 'Heading',
      }),
    );
    expect(
      inspector().queryByLabelText('Column proportions (image / text)'),
    ).toBeNull();
    fireEvent.change(inspector().getByLabelText('Heading'), {
      target: { value: 'A composed heading' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(inspector().getByLabelText('Heading')).toHaveValue(
      section.content.heading,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(inspector().getByLabelText('Heading')).toHaveValue(
      'A composed heading',
    );
    fireEvent.change(inspector().getByLabelText('Text size'), {
      target: { value: '137' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Block' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Add block' })).getByRole(
        'button',
        { name: 'Eyebrow' },
      ),
    );
    fireEvent.change(inspector().getByLabelText('Eyebrow'), {
      target: { value: 'From the farm' },
    });
    fireEvent.click(inspector().getByRole('button', { name: 'Move block up' }));
    const transfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    const introHandle = within(
      screen.getByLabelText('Section blocks'),
    ).getByRole('button', { name: 'Move block: Eyebrow' });
    const headingRow = within(screen.getByLabelText('Section blocks'))
      .getByRole('button', { name: 'Move block: Heading' })
      .closest('.website-block-row')!;
    fireEvent.dragStart(introHandle, { dataTransfer: transfer });
    const over = createEvent.dragOver(headingRow, { dataTransfer: transfer });
    Object.defineProperty(over, 'clientY', { value: -1 });
    fireEvent(headingRow, over);
    fireEvent.drop(headingRow, { dataTransfer: transfer });
    expect(
      Array.from(
        screen
          .getByLabelText('Section blocks')
          .querySelectorAll('.website-block-row'),
      ).map((row) => row.textContent),
    ).toEqual(['Image', 'Eyebrow', 'Heading', 'Paragraph']);

    fireEvent.click(inspector().getByLabelText('Visible'));
    expect(
      within(screen.getByLabelText('Section blocks')).getByRole('button', {
        name: 'Eyebrow (hidden)',
      }),
    ).toBeInTheDocument();
    fireEvent.click(inspector().getByRole('button', { name: 'Delete block' }));
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete this block?' }),
      ).getByRole('button', { name: 'Delete block' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
      within(screen.getByLabelText('Section blocks')).getByRole('button', {
        name: 'Eyebrow (hidden)',
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByLabelText('Section blocks')).getByRole('button', {
        name: 'Paragraph',
      }),
    );
    fireEvent.click(
      inspector().getByRole('button', { name: 'Duplicate block' }),
    );
    expect(
      within(screen.getByLabelText('Section blocks')).getAllByRole('button', {
        name: 'Paragraph',
      }),
    ).toHaveLength(2);
    fireEvent.click(
      inspector().getByRole('button', { name: 'Section settings' }),
    );
    fireEvent.change(
      inspector().getByLabelText('Column proportions (image / text)'),
      { target: { value: '40-60' } },
    );
    fireEvent.change(inspector().getByLabelText('Text vertical alignment'), {
      target: { value: 'top' },
    });
    fireEvent.change(inspector().getByLabelText('Image width'), {
      target: { value: '63' },
    });
    fireEvent.change(inspector().getByLabelText('Image height'), {
      target: { value: '517' },
    });
    fireEvent.change(inspector().getByLabelText('Content spacing'), {
      target: { value: '34' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(inspector().getByLabelText('Content spacing')).not.toHaveValue('34');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(inspector().getByLabelText('Content spacing')).toHaveValue('34');
    expect(inspector().queryByLabelText('Heading')).toBeNull();
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'update', config: expect.any(Object) }),
        'http://pilot.localhost:4321',
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled(),
    );
    const previewConfig = (
      post.mock.calls.at(-1)?.[0] as { config: StorefrontAppearanceConfig }
    ).config;
    const previewTemplate = previewConfig.template!;
    const previewSections =
      previewTemplate.id === 'modern-farmhouse'
        ? previewTemplate.settings.sections
        : previewTemplate.id === 'editorial-market'
          ? previewTemplate.settings.composition!
          : [];
    const previewSection = previewSections.find((s) => s.id === section.id)!;
    expect(previewSection).toMatchObject({
      content: {
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: 'heading',
            content: { text: 'A composed heading' },
            presentation: { scale: 137 },
          }),
        ]),
      },
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
    const template = snapshot.draft.template!;
    const saved = (
      template.id === 'modern-farmhouse'
        ? template.settings.sections
        : template.id === 'editorial-market'
          ? template.settings.composition!
          : []
    ).find((s) => s.id === section.id)!;
    expect(saved).toMatchObject({
      content: { blocks: expect.any(Array) },
      presentation: {
        columnRatio: '40-60',
        verticalAlignment: 'top',
        sizing: { imageWidth: 63, imageHeight: 517, gap: 34 },
      },
    });
    expect(Object.keys('content' in saved ? saved.content : {})).toEqual([
      'blocks',
    ]);
    view.unmount();
    render(<Editor />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Image with Text: A composed heading',
      }),
    );
    expect(
      inspector().getByLabelText('Column proportions (image / text)'),
    ).toHaveValue('custom');
    expect(inspector().getByLabelText('Image width')).toHaveValue('63');
    expect(
      screen.getByRole('link', { name: 'Back to Website Library' }),
    ).toHaveAttribute('href', '/vendor/storefront?storefront=7');
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    expect(snapshot.published).toEqual(snapshot.draft);
  },
);
