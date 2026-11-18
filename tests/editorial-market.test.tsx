import { useState } from 'react';
import { EditorialMarketEditor } from '../apps/admin/src/EditorialMarketEditor';
import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import {
  editorialHomepageComposition,
  type EditorialMarketSettings,
  type StorefrontEditorSection,
  editorialMarketStarterSettings,
  editorialMarketTemplateSchema,
} from '@market/theme/storefront';
import type { StorefrontAppearanceApi } from '@market/api';
import { StorefrontCategoriesEditor } from '../apps/admin/src/StorefrontCategoriesEditor';

function api(): StorefrontAppearanceApi {
  return {
    read: vi.fn(async () => []),
    links: vi.fn(async () => []),
    save: vi.fn(),
    publish: vi.fn(),
    hierarchy: vi.fn(async () => [
      {
        id: '42',
        code: 'produce',
        name: 'Fresh Produce',
        parentId: null,
        active: true,
        assignable: false,
        children: [],
      },
    ]),
    media: {
      list: vi.fn(async () => [
        {
          id: '42',
          name: 'Fresh Produce',
          imageAssetId: null,
          image: null,
          productIds: ['7'],
          productCount: 1,
        },
      ]),
      images: vi.fn(async () => []),
      upload: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
      themeImages: vi.fn(async () => [
        {
          id: '91',
          name: 'desktopHomeHero.png',
          preview: 'http://localhost:3000/assets/preview/editorial.png',
          source: 'http://localhost:3000/assets/source/editorial.png',
          placement: 'desktop-home-hero',
        },
      ]),
    },
  };
}

it('keeps Editorial Market configuration independent and validates asset pairs', () => {
  const settings = editorialMarketStarterSettings();
  expect(settings.categories.images).toEqual({});
  expect(
    editorialMarketTemplateSchema.safeParse({
      id: 'editorial-market',
      version: 1,
      settings: {
        ...settings,
        assets: {
          ...settings.assets,
          desktopHero: {
            assetId: '91',
            url: '',
            alt: 'Artwork',
          },
        },
      },
    }).success,
  ).toBe(false);
});

it('maps an actual category ID to a read-only theme image without uploading it', async () => {
  const mediaApi = api();
  const onChange = vi.fn();
  render(
    <StorefrontCategoriesEditor
      value={{}}
      onChange={onChange}
      api={mediaApi}
      themeId="editorial-market"
    />,
  );
  const choose = await screen.findByRole('button', {
    name: 'Fresh Produce image',
  });
  fireEvent.click(choose);
  expect(screen.getByRole('tab', { name: 'My Images' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Theme Images' }));
  await waitFor(() =>
    expect(mediaApi.media!.themeImages).toHaveBeenCalledWith(
      'editorial-market',
    ),
  );
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Choose desktopHomeHero.png',
    }),
  );
  const next = onChange.mock.calls.at(-1)?.[0];
  expect(next).toEqual({
    '42': {
      position: 0,
      visible: true,
      imageAssetId: '91',
      image: 'http://localhost:3000/assets/preview/editorial.png',
    },
  });
  expect(mediaApi.media!.upload).not.toHaveBeenCalled();
  expect(mediaApi.media!.save).not.toHaveBeenCalled();
  expect(mediaApi.media!.list).not.toHaveBeenCalled();
});

it('shares section controls while preserving Editorial native panels, visibility, assets and homepage design', async () => {
  const mediaApi = api();
  let current = editorialMarketStarterSettings();
  function Editor() {
    const [value, setValue] = useState<EditorialMarketSettings>(current);
    const [selected, choose] =
      useState<StorefrontEditorSection>('editorial:theme');
    return (
      <EditorialMarketEditor
        value={value}
        onChange={(next) => {
          current = next;
          setValue(next);
        }}
        api={mediaApi}
        products={[]}
        loadProducts={vi.fn()}
        page="home"
        selected={selected}
        choose={choose}
        collapsed={false}
        collapse={vi.fn()}
        busy={false}
      />
    );
  }
  render(<Editor />);
  expect(screen.getAllByRole('button', { name: /^Duplicate:/ })).toHaveLength(
    2,
  );
  expect(screen.queryByRole('switch', { name: 'Enable Hero' })).toBeNull();
  expect(current.composition).toBeUndefined();
  fireEvent.change(screen.getByLabelText('Homepage section spacing'), {
    target: { value: 'spacious' },
  });
  fireEvent.change(screen.getByLabelText('Homepage typography scale'), {
    target: { value: 'expressive' },
  });
  expect(current.homepageDesign).toEqual({
    spacing: 'spacious',
    typographyScale: 'expressive',
  });
  expect(current.composition).toBeUndefined();
  fireEvent.click(
    screen.getByRole('button', { name: 'Move up: Featured Products' }),
  );
  expect(editorialHomepageComposition(current).map((s) => s.id)).toEqual([
    'hero',
    'product-showcase-homepage',
    'category-showcase-homepage',
    'impact',
  ]);
  fireEvent.click(
    screen.getByRole('button', { name: 'Product Showcase: Featured Products' }),
  );
  fireEvent.change(screen.getByLabelText('Layout'), {
    target: { value: 'carousel' },
  });
  fireEvent.change(screen.getByLabelText('Background color'), {
    target: { value: 'ink' },
  });
  expect(
    current.composition?.find((s) => s.id === 'product-showcase-homepage'),
  ).toMatchObject({
    type: 'product-showcase',
    presentation: { background: 'ink', layout: 'carousel' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Category Showcase: Shop by Category' }),
  );
  fireEvent.change(screen.getByLabelText('Layout'), {
    target: { value: 'compact' },
  });
  fireEvent.change(screen.getByLabelText('Background type'), {
    target: { value: 'full' },
  });
  expect(
    current.composition?.find((s) => s.id === 'category-showcase-homepage'),
  ).toMatchObject({
    type: 'category-showcase',
    presentation: { backgroundType: 'full', layout: 'compact' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Hero' }));
  fireEvent.change(screen.getByLabelText('Heading'), {
    target: { value: 'Original hero preserved' },
  });
  expect(current.hero.heading).toBe('Original hero preserved');
  fireEvent.click(screen.getByRole('button', { name: 'Add Section' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Add Section' })).getByRole(
      'button',
      { name: /^Image with Text/ },
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Photograph' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Theme Images' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Choose desktopHomeHero.png' }),
  );
  expect(mediaApi.media!.themeImages).toHaveBeenCalledWith('editorial-market');
  const image = current.composition?.find(
    (s) => 'type' in s && s.type === 'image-with-text',
  );
  expect(
    image &&
      'type' in image &&
      image.type === 'image-with-text' &&
      image.content.image,
  ).toEqual({
    assetId: '91',
    url: 'http://localhost:3000/assets/preview/editorial.png',
    alt: '',
  });
  expect(current.assets).toEqual(editorialMarketStarterSettings().assets);
  expect(
    editorialMarketTemplateSchema.safeParse({
      id: 'editorial-market',
      version: 1,
      settings: current,
    }).success,
  ).toBe(true);
});
