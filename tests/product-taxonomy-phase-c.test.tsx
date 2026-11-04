import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import {
  createStorefrontTaxonomyApi,
  type StorefrontCategory,
  type ProductCategoryNode,
  type StorefrontAppearanceApi,
} from '@market/api';
import {
  presentedCategories,
  availableTaxonomy,
  taxonomyFilters,
  taxonomyNavigation,
  type CategoryPresentation,
} from '@market/storefront-core';
import { StorefrontCategoriesEditor } from '../apps/admin/src/StorefrontCategoriesEditor';

const category = (
  id: string,
  parentId: string | null,
  position: number,
  count = 1,
): StorefrontCategory => ({
  id,
  parentId,
  position,
  count,
  code: id,
  name: id,
  pathIds: parentId ? [parentId, id] : [id],
  pathCodes: parentId ? [parentId, id] : [id],
  pathNames: parentId ? [parentId, id] : [id],
});
const categories = [
  category('1', null, 0, 3),
  category('2', '1', 0, 2),
  category('3', '1', 1),
  category('4', null, 1),
  category('5', '4', 0),
  category('6', null, 2, 0),
];
const setting = (position = 0, visible = true, image = '') => ({
  position,
  visible,
  imageAssetId: image ? '9' : null,
  image,
});

it('orders siblings without moving children under a different parent', () => {
  expect(
    presentedCategories(categories, {
      '4': setting(0),
      '1': setting(1),
      '2': setting(1),
      '3': setting(0),
    }).map((c) => c.id),
  ).toEqual(['4', '5', '1', '3', '2']);
});
it('hides empty branches and descendants of hidden parents from navigation only', () => {
  expect(
    presentedCategories(categories, { '1': setting(0, false) }).map(
      (c) => c.id,
    ),
  ).toEqual(['4', '5']);
  expect(
    presentedCategories(categories, { '2': setting(0, false) }).map(
      (c) => c.id,
    ),
  ).toEqual(['1', '3', '4', '5']);
  expect(
    presentedCategories(categories, { '1': setting(0, false) }, true),
  ).toHaveLength(6);
  expect(categories[0]!.count).toBe(3);
});
it('projects canonical path labels, counts and instance-specific images', () => {
  const first = taxonomyNavigation(
    { categories, tags: [] },
    { '2': setting(0, true, 'https://assets.example.test/carrot.png') },
  );
  const other = taxonomyNavigation({ categories, tags: [] });
  expect(first.find((c) => c.id === '2')).toMatchObject({
    name: '1 / 2 (2)',
    image: 'https://assets.example.test/carrot.png',
  });
  expect(other.find((c) => c.id === '2')?.image).toBe('');
});

it('uses the complete Product projection for available-only counts before result pagination', () => {
  const taxonomy = {
    categories,
    tags: [
      {
        id: '9',
        code: 'fresh',
        name: 'Fresh',
        group: 'condition',
        claimStatus: 'SELLER_DECLARED' as const,
        count: 2,
      },
    ],
  };
  const products = [
    {
      productId: '10',
      primaryCategoryId: '2',
      categoryIds: [1, 2],
      tagIds: [9],
      variantIds: [100, 101],
    },
    {
      productId: '11',
      primaryCategoryId: '3',
      categoryIds: [1, 3],
      tagIds: [9],
      variantIds: [102],
    },
  ];
  const result = availableTaxonomy(taxonomy, products, new Set(['10']));
  expect(result.categories.find((c) => c.id === '1')?.count).toBe(1);
  expect(result.categories.find((c) => c.id === '3')?.count).toBe(0);
  expect(result.tags[0]?.count).toBe(1);
});
it('validates repeated taxonomy query identities without accepting generic facets', () => {
  expect(
    taxonomyFilters(
      new URLSearchParams('category=1&category=2&category=1&tag=9&facet=42'),
    ),
  ).toEqual({ categoryIds: ['1', '2'], tagIds: ['9'] });
  for (const value of ['category=produce', 'tag=-1', 'tag=1.5', 'category='])
    expect(() => taxonomyFilters(new URLSearchParams(value))).toThrow();
  expect(() =>
    taxonomyFilters(
      new URLSearchParams(
        Array.from({ length: 21 }, (_, i) => `category=${i + 1}`).join('&'),
      ),
    ),
  ).toThrow();
});
it('uses one named channel-aware Shop projection, with canonical filters sent before rendering pagination', async () => {
  const fetcher = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          data: {
            vendorStorefrontTaxonomy: {
              taxonomy: { categories, tags: [] },
              products: [
                {
                  productId: '7',
                  categoryIds: [1, 2],
                  tagIds: [9],
                  primaryCategoryId: '2',
                },
              ],
              totalProducts: 1,
            },
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
  );
  const api = createStorefrontTaxonomyApi({
    endpoint: 'http://localhost/shop-api',
    channelToken: 'vendor-a',
    fetch: fetcher,
  });
  expect(
    (await api({ categoryIds: ['1'], tagIds: ['9'] })).products.map(
      (p) => p.productId,
    ),
  ).toEqual(['7']);
  const init = fetcher.mock.calls[0]![1] as RequestInit;
  expect(new Headers(init.headers).get('vendure-token')).toBe('vendor-a');
  const body = JSON.parse(init.body as string);
  expect(body.query).toContain('vendorStorefrontTaxonomy');
  expect(body.variables).toEqual({ categoryIds: ['1'], tagIds: ['9'] });
});

const tree: ProductCategoryNode[] = [
  {
    id: '1',
    name: 'Produce',
    code: 'produce',
    parentId: null,
    active: true,
    assignable: false,
    children: [
      {
        id: '2',
        name: 'Vegetables',
        code: 'produce.vegetables',
        parentId: '1',
        active: true,
        assignable: true,
        children: [],
      },
      {
        id: '3',
        name: 'Fruits',
        code: 'produce.fruits',
        parentId: '1',
        active: true,
        assignable: true,
        children: [],
      },
    ],
  },
];
const api = {
  hierarchy: vi.fn(async () => tree),
} as unknown as StorefrontAppearanceApi;
function Editor({ initial = {} }: { initial?: CategoryPresentation }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <StorefrontCategoriesEditor
        api={api}
        value={value}
        onChange={setValue}
        themeId="harvest"
      />
      <output data-testid="settings">{JSON.stringify(value)}</output>
    </>
  );
}
it('retains hidden categories in the editor and restores visibility with keyboard-compatible controls', async () => {
  render(<Editor initial={{ '1': setting(0, false) }} />);
  await screen.findByRole('option', { name: 'Produce (hidden)' });
  fireEvent.click(screen.getByLabelText('Show in navigation'));
  expect(
    JSON.parse(screen.getByTestId('settings').textContent!)['1'].visible,
  ).toBe(true);
  expect(screen.getByRole('button', { name: 'Move earlier' })).toBeDisabled();
});
it('reorders only the selected child siblings and resets ordering without dropping images or visibility', async () => {
  render(
    <Editor
      initial={{
        '2': setting(0, false, 'https://assets.example.test/carrot.png'),
      }}
    />,
  );
  await screen.findByRole('option', { name: 'Produce' });
  fireEvent.change(screen.getByLabelText('Category'), {
    target: { value: '3' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Move earlier' }));
  let settings = JSON.parse(screen.getByTestId('settings').textContent!);
  expect(settings['3'].position).toBe(0);
  expect(settings['2'].position).toBe(1);
  expect(settings['1']).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Reset sibling order' }));
  settings = JSON.parse(screen.getByTestId('settings').textContent!);
  expect(settings['2']).toMatchObject({
    position: 0,
    visible: false,
    image: 'https://assets.example.test/carrot.png',
  });
});
it('does not replace settings on a failed hierarchy read and offers retry', async () => {
  const fail = {
    hierarchy: vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(tree),
  } as unknown as StorefrontAppearanceApi;
  const change = vi.fn();
  render(
    <StorefrontCategoriesEditor
      api={fail}
      value={{ '1': setting(0, false) }}
      onChange={change}
      themeId="harvest"
    />,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Retry categories' }),
  );
  await screen.findByRole('option', { name: 'Produce (hidden)' });
  expect(change).not.toHaveBeenCalled();
});
