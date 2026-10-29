import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import {
  editorialMarketStarterSettings,
  editorialMarketTemplateSchema,
} from '@market/theme/storefront';
import type { StorefrontAppearanceApi } from '@market/api';
import { EditorialMarketEditor } from '../apps/admin/src/EditorialMarketEditor';

function api(): StorefrontAppearanceApi {
  return {
    read: vi.fn(async () => []),
    links: vi.fn(async () => []),
    save: vi.fn(),
    publish: vi.fn(),
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
    <EditorialMarketEditor
      value={editorialMarketStarterSettings()}
      onChange={onChange}
      api={mediaApi}
      products={[]}
      loadProducts={() => {}}
      page="home"
      selected="editorial:categories"
      collapsed={false}
      choose={() => {}}
      collapse={() => {}}
      busy={false}
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
  expect(next.categories.images).toEqual({
    '42': {
      assetId: '91',
      url: 'http://localhost:3000/assets/preview/editorial.png',
    },
  });
  expect(mediaApi.media!.upload).not.toHaveBeenCalled();
});
