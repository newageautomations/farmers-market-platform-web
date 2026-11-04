import { describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AppError,
  createProductTaxonomyApi,
  createVendorApi,
  type ProductCategoryNode,
  type ProductTag,
} from '@market/api';
import { visibleNavigation } from '@market/admin-core';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { ProductClassificationFields } from '../apps/admin/src/vendor/ProductClassificationFields';
import { Products, productInput } from '../apps/admin/src/vendor/catalog';
import { PublicationControls } from '../apps/admin/src/vendor/markets';
import {
  catalogCategories,
  searchCategories,
} from '../apps/admin/src/vendor/product-taxonomy';

const vegetable: ProductCategoryNode = {
  id: 'veg',
  code: 'produce.vegetables',
  name: 'Vegetables',
  parentId: 'produce',
  active: true,
  assignable: true,
  children: [],
};
const fruit: ProductCategoryNode = {
  ...vegetable,
  id: 'fruit',
  name: 'Fruits',
};
const produce: ProductCategoryNode = {
  ...vegetable,
  id: 'produce',
  name: 'Produce',
  parentId: null,
  assignable: false,
  children: [vegetable, fruit],
};
const bread: ProductCategoryNode = {
  ...vegetable,
  id: 'bread',
  name: 'Bread & Baked Goods',
  parentId: null,
};
const fresh: ProductTag = {
  id: 'fresh',
  name: 'Fresh',
  group: 'condition',
  claimStatus: 'SELLER_DECLARED',
};
const organic: ProductTag = {
  ...fresh,
  id: 'organic',
  name: 'Certified Organic',
  group: 'claims',
};
function setup() {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  service.taxonomy = {
    hierarchy: vi.fn(async () => [produce, bread]),
    classification: vi.fn(async () => ({
      primaryCategory: vegetable,
      categoryPath: [produce, vegetable],
      tags: [fresh, organic],
    })),
    tags: vi.fn(async (id: string) =>
      id === 'bread' ? [fresh] : [fresh, organic],
    ),
  };
  return service;
}
async function fields(
  service = setup(),
  productId: string | undefined = 'owned',
) {
  const user = userEvent.setup();
  const view = render(
    <form>
      <ProductClassificationFields service={service} productId={productId} />
    </form>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Choose category' }),
    ).toBeEnabled(),
  );
  return {
    service,
    user,
    data: () => new FormData(view.container.querySelector('form')!),
    ...view,
  };
}

describe('Phase B vendor classification', () => {
  it('blocks a form save while category applicability is pending', async () => {
    const { service, user, data } = await fields();
    let resolve!: (tags: ProductTag[]) => void;
    vi.mocked(service.taxonomy!.tags).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Choose category' }));
    await user.click(
      screen.getByRole('radio', { name: 'Bread & Baked Goods' }),
    );
    const pending = data();
    pending.set('name', 'Carrots');
    pending.set('slug', 'carrots');
    expect(() => productInput(pending)).toThrow(/checks to finish/);
    expect(pending.get('primaryCategoryId')).toBe('veg');
    resolve([fresh]);
    await waitFor(() =>
      expect(data().has('classificationPending')).toBe(false),
    );
  });
  it('populates an existing product from canonical classification and updates it in one mutation', async () => {
    const service = setup();
    const update = vi
      .spyOn(service, 'updateProduct')
      .mockResolvedValue({ id: '1001' });
    render(<Products service={service} id="1001" />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Choose category' }),
      ).toBeEnabled(),
    );
    expect(service.taxonomy!.classification).toHaveBeenCalledWith('1001');
    expect(screen.getByText('Produce → Vegetables')).toBeInTheDocument();
    fireEvent.submit(screen.getByLabelText('Product name').closest('form')!);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        '1001',
        expect.objectContaining({
          primaryCategoryId: 'veg',
          tagIds: ['fresh', 'organic'],
        }),
      ),
    );
    expect(update).toHaveBeenCalledTimes(1);
  });
  it('blocks publishing an uncategorized product before issuing the publication mutation', async () => {
    const service = setup();
    vi.mocked(service.taxonomy!.classification).mockResolvedValue({
      primaryCategory: null,
      categoryPath: [],
      tags: [],
    });
    service.publication = vi.fn(async () => ({
      listingId: 'l',
      variantId: 'v',
      productId: 'p',
      marketId: 'm',
      state: 'UNPUBLISHED' as const,
    }));
    const publish = vi.spyOn(service, 'publish');
    render(
      <PublicationControls
        service={service}
        listing={{
          id: 'l',
          membershipId: 'm',
          variantId: 'v',
          status: 'approved',
          version: 1,
        }}
        refresh={() => undefined}
      />,
    );
    await screen.findByText(
      'Select a valid leaf category in the product editor before publishing this listing.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(
      await screen.findByText(/Select a valid leaf category before enabling/),
    ).toBeInTheDocument();
    expect(publish).not.toHaveBeenCalled();
  });
  it('allows publishing after a valid leaf classification has loaded', async () => {
    const service = setup();
    service.publication = vi.fn(async () => ({
      listingId: 'l',
      variantId: 'v',
      productId: 'p',
      marketId: 'm',
      state: 'UNPUBLISHED' as const,
    }));
    const publish = vi
      .spyOn(service, 'publish')
      .mockResolvedValue({
        listingId: 'l',
        productId: 'p',
        variantId: 'v',
        marketId: 'm',
        published: true,
      });
    render(
      <PublicationControls
        service={service}
        listing={{
          id: 'l',
          membershipId: 'm',
          variantId: 'v',
          status: 'approved',
          version: 1,
        }}
        refresh={() => undefined}
      />,
    );
    await waitFor(() =>
      expect(service.taxonomy!.classification).toHaveBeenCalledWith('p'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(publish).toHaveBeenCalledWith('l'));
  });
  it('searches parents and children without making parents selectable', () => {
    expect(
      searchCategories([produce, bread], 'produce')[0]?.children,
    ).toHaveLength(2);
    expect(
      searchCategories([produce, bread], 'vegetable')[0]?.children.map(
        (node) => node.id,
      ),
    ).toEqual(['veg']);
    expect(searchCategories([produce], 'missing')).toEqual([]);
  });
  it('opens the selected branch, searches parents and selects a single leaf with the keyboard', async () => {
    const { user, data } = await fields();
    expect(data().getAll('primaryCategoryId')).toEqual(['veg']);
    await user.click(screen.getByRole('button', { name: 'Choose category' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('radio', { name: 'Vegetables' }),
    ).toBeChecked();
    expect(within(dialog).queryByRole('radio', { name: 'Produce' })).toBeNull();
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Search categories' }),
      'Produce',
    );
    expect(within(dialog).getByRole('radio', { name: 'Fruits' })).toBeVisible();
    const radio = within(dialog).getByRole('radio', { name: 'Fruits' });
    radio.focus();
    await user.keyboard(' ');
    await waitFor(() =>
      expect(data().getAll('primaryCategoryId')).toEqual(['fruit']),
    );
    expect(screen.getByText('Produce → Fruits')).toBeInTheDocument();
  });
  it('removes incompatible tags only after a successful category change', async () => {
    const { user, data } = await fields();
    await user.click(screen.getByRole('button', { name: 'Choose category' }));
    await user.click(
      screen.getByRole('radio', { name: 'Bread & Baked Goods' }),
    );
    await waitFor(() => expect(data().getAll('tagIds')).toEqual(['fresh']));
    expect(
      screen.getByText(/Removed tags.*Certified Organic/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Product tags: claims' }),
    ).toBeNull();
  });
  it('preserves category and tags when a category change read fails', async () => {
    const { service, user, data } = await fields();
    vi.mocked(service.taxonomy!.tags).mockRejectedValue(
      new AppError('network'),
    );
    await user.click(screen.getByRole('button', { name: 'Choose category' }));
    await user.click(
      screen.getByRole('radio', { name: 'Bread & Baked Goods' }),
    );
    await screen.findByText(/Selection preserved/);
    expect(data().get('primaryCategoryId')).toBe('veg');
    expect(data().getAll('tagIds')).toEqual(['fresh', 'organic']);
  });
  it('preserves selected tags when applicable-tag loading fails', async () => {
    const service = setup();
    vi.mocked(service.taxonomy!.tags).mockRejectedValue(
      new AppError('network'),
    );
    const { data } = await fields(service);
    await waitFor(() => expect(service.taxonomy!.tags).toHaveBeenCalled());
    expect(data().getAll('tagIds')).toEqual(['fresh', 'organic']);
  });
  it.each(['hierarchy', 'classification'] as const)(
    'omits classification fields on a failed %s read',
    async (method) => {
      const service = setup();
      vi.mocked(service.taxonomy![method]).mockRejectedValue(
        new AppError('network'),
      );
      const view = render(
        <form>
          <ProductClassificationFields service={service} productId="owned" />
        </form>,
      );
      await screen.findByRole('button', { name: 'Refresh records' });
      expect(
        screen.getByText('Classification unavailable'),
      ).toBeInTheDocument();
      const data = new FormData(view.container.querySelector('form')!);
      data.set('name', 'Preserved draft');
      data.set('slug', 'preserved');
      expect(productInput(data)).not.toHaveProperty('primaryCategoryId');
      expect(productInput(data)).not.toHaveProperty('tagIds');
      data.set('enabled', 'on');
      expect(() => productInput(data)).toThrow(/valid leaf category/);
    },
  );
  it('supports adding and removing predefined tags without saving early', async () => {
    const { user, data } = await fields();
    const picker = screen.getByRole('combobox', {
      name: 'Product tags: claims',
    });
    await user.click(picker);
    await user.click(screen.getByRole('option', { name: 'Certified Organic' }));
    expect(data().getAll('tagIds')).toEqual(['fresh']);
    await user.click(screen.getByRole('option', { name: 'Certified Organic' }));
    expect(data().getAll('tagIds')).toEqual(['fresh', 'organic']);
    expect(screen.queryByText(/Create.*tag/)).toBeNull();
  });
  it('saves an uncategorized draft and validates before enabling', async () => {
    const service = setup();
    const create = vi
      .spyOn(service, 'createProduct')
      .mockResolvedValue({ id: 'new-id' });
    render(<Products service={service} id="new" />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Choose category' }),
      ).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Draft carrots' },
    });
    fireEvent.change(screen.getByLabelText('Slug'), {
      target: { value: 'draft-carrots' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));
    expect(
      await screen.findByText(/Select a valid leaf category/),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Enabled'));
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryCategoryId: null,
          tagIds: [],
          enabled: false,
        }),
      ),
    );
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('counts distinct products and filters by canonical ancestor paths', () => {
    const map = new Map([
      [
        'p1',
        {
          primaryCategory: vegetable,
          categoryPath: [produce, vegetable],
          tags: [],
        },
      ],
      [
        'p2',
        { primaryCategory: fruit, categoryPath: [produce, fruit], tags: [] },
      ],
      ['p3', { primaryCategory: null, categoryPath: [], tags: [] }],
    ]);
    const categories = catalogCategories([produce, bread], map);
    expect(
      categories.find((node) => node.id === 'produce')?.productIds,
    ).toEqual(['p1', 'p2']);
    expect(categories.find((node) => node.id === 'veg')?.productIds).toEqual([
      'p1',
    ]);
    expect(categories.some((node) => node.id === 'bread')).toBe(false);
  });
  it('removes legacy category navigation', () => {
    expect(
      visibleNavigation(fixtureContexts.VENDOR).some(
        (item) => item.path === '/vendor/categories',
      ),
    ).toBe(false);
  });
  it('sends category and tags together in one create/update request, preserving omitted fields', async () => {
    const requests: { query: string; variables: Record<string, unknown> }[] =
      [];
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body));
      requests.push(request);
      expect((init?.headers as Record<string, string>)['vendure-token']).toBe(
        'vendor-channel',
      );
      return new Response(
        JSON.stringify({
          data: {
            createOwnCatalogProduct: { id: 'p' },
            updateOwnCatalogProduct: { id: 'p' },
          },
        }),
      );
    });
    const api = createVendorApi({
      endpoint: 'http://localhost/admin-api',
      channelToken: 'vendor-channel',
      fetch: fetcher as typeof fetch,
    });
    const input = {
      name: 'Carrots',
      slug: 'carrots',
      description: '',
      enabled: true,
      primaryCategoryId: 'veg',
      tagIds: ['fresh'],
    };
    await api.createProduct(input);
    await api.updateProduct('p', input);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.variables).toEqual({ input });
    expect(requests[1]?.variables).toEqual({ id: 'p', input });
    const metadata = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      enabled: input.enabled,
    };
    await api.updateProduct('p', metadata);
    expect(requests[2]?.variables.input).not.toHaveProperty(
      'primaryCategoryId',
    );
    expect(requests[2]?.variables.input).not.toHaveProperty('tagIds');
  });
  it('uses the Phase A named JSON operations', async () => {
    const requests: { query: string; variables: unknown }[] = [];
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          data: {
            productCategoryHierarchy: [produce],
            applicableProductTags: [fresh],
            ownProductClassification: {
              primaryCategory: vegetable,
              categoryPath: [produce, vegetable],
              tags: [],
            },
          },
        }),
      );
    });
    const api = createProductTaxonomyApi({
      endpoint: 'http://localhost/admin-api',
      channelToken: 'vendor-channel',
      fetch: fetcher as typeof fetch,
    });
    expect(await api.hierarchy()).toEqual([produce]);
    expect(await api.tags('veg')).toEqual([fresh]);
    expect((await api.classification('owned')).primaryCategory?.id).toBe('veg');
    expect(requests[1]?.variables).toEqual({ categoryId: 'veg' });
    expect(requests[2]?.variables).toEqual({ productId: 'owned' });
  });
});
