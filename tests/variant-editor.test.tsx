import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  AppError,
  emptyProductInformation,
  type FinanceApi,
  type PublicProduct,
} from '@market/api';
import { routeAllowed } from '@market/admin-core';
import { variantProductPage } from '@market/storefront-core';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { VendorRoutes } from '../apps/admin/src/vendor/VendorRoutes';

async function setup() {
  const context = {
    ...fixtureContexts.VENDOR,
    permissions: [
      ...fixtureContexts.VENDOR.permissions,
      'ReadOwnVendorFinance' as const,
    ],
  };
  const service = createFixtureVendorService(context);
  const initial = await service.product('1001');
  const info = emptyProductInformation();
  info.ingredients.content = 'Apples';
  const product = {
    ...initial,
    name: 'Apple juice',
    slug: 'apple-juice',
    description: 'Fresh pressed',
    collectTaxes: true,
    taxOverride: 8.25,
    taxConfigured: true,
    assetIds: ['photo'],
    productInformation: JSON.stringify(info),
    variants: initial.variants.map((v, i) => ({
      ...v,
      name: i ? '24oz' : '12oz',
      slug: i ? '24oz' : '12oz',
    })),
  };
  service.product = vi.fn(async () => product);
  service.categories = {
    images: vi.fn(async () => [
      { id: 'photo', name: 'Apples', preview: '/apples.png' },
    ]),
  } as unknown as typeof service.categories;
  service.finance = {
    costs: vi.fn(async () => []),
    createVariant: vi.fn(async () => ({ id: 'new-variant' })),
    setCost: vi.fn(async () => undefined),
  } as unknown as FinanceApi;
  return { service, product };
}

describe('dedicated variant pages', () => {
  it('starts product details and additional information closed and navigates to add/edit pages without a dialog', async () => {
    const { service } = await setup();
    render(<VendorRoutes service={service} path="/vendor/products/1001" />);
    await screen.findByText('Product details');
    const details = screen.getByText('Product details').closest('details')!;
    expect(details.open).toBe(false);
    expect(details.querySelector('summary svg')).toBeInTheDocument();
    expect(
      screen.getByText('Additional information').closest('details')!.open,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add variant' }));
    expect(location.pathname).toBe('/vendor/products/1001/variants/new');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit 12oz' }));
    expect(location.pathname).toBe('/vendor/products/1001/variants/1101');
  });

  it('populates the shared product form, previews a nested slug, and creates a disabled costed variant', async () => {
    const { service, product } = await setup();
    const create = vi.spyOn(service, 'createVariant');
    const parent = vi.spyOn(service, 'updateProduct');
    render(
      <VendorRoutes
        service={service}
        path="/vendor/products/1001/variants/new"
      />,
    );
    const name = await screen.findByLabelText('Variant name');
    expect(screen.queryByText('Product organization')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveValue('Fresh pressed');
    expect(screen.getByLabelText('Collect taxes')).toBeChecked();
    expect(screen.getByLabelText('Custom rate (%)')).toHaveValue(8.25);
    expect(
      screen.getByLabelText('Ingredients', { selector: 'textarea' }),
    ).toHaveValue('Apples');
    expect(await screen.findByAltText('Product photograph 1')).toHaveAttribute(
      'src',
      '/apples.png',
    );
    fireEvent.change(name, { target: { value: '12oz' } });
    expect(screen.getByLabelText('Variant slug')).toHaveValue('12oz');
    expect(screen.getByText('Slug /apple-juice/12oz')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Variant slug'), {
      target: { value: 'single-bottle' },
    });
    fireEvent.change(name, { target: { value: 'Small bottle' } });
    expect(screen.getByLabelText('Variant slug')).toHaveValue('single-bottle');
    fireEvent.change(screen.getByLabelText('SKU'), {
      target: { value: 'JUICE-12' },
    });
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '5.25' },
    });
    fireEvent.change(screen.getByLabelText('Cost to produce (optional)'), {
      target: { value: '1.50' },
    });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.submit(name.closest('form')!);
    await waitFor(() =>
      expect(service.finance!.createVariant).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          name: 'Small bottle',
          slug: 'single-bottle',
          enabled: false,
          price: 525,
          collectTaxes: true,
          taxOverride: 8.25,
        }),
        150,
      ),
    );
    expect(create).not.toHaveBeenCalled();
    expect(parent).not.toHaveBeenCalled();
    expect(location.pathname).toBe(
      '/vendor/products/1001/variants/new-variant',
    );
  });

  it('saves variant content independently and reports partial saves if a later price command fails', async () => {
    const { service } = await setup();
    const update = vi
      .spyOn(service, 'updateVariant')
      .mockResolvedValue({ id: '1101' });
    const price = vi
      .spyOn(service, 'price')
      .mockRejectedValue(new AppError('network'));
    const parent = vi.spyOn(service, 'updateProduct');
    render(
      <VendorRoutes
        service={service}
        path="/vendor/products/1001/variants/1101"
      />,
    );
    const description = await screen.findByLabelText('Description');
    expect(screen.getByText('Product details').closest('details')!.open).toBe(
      true,
    );
    fireEvent.change(description, {
      target: { value: 'Small bottle description' },
    });
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '6.00' },
    });
    fireEvent.submit(description.closest('form')!);
    await waitFor(() => expect(price).toHaveBeenCalledWith('1101', 600));
    expect(update).toHaveBeenCalledWith(
      '1101',
      expect.objectContaining({
        slug: '12oz',
        description: 'Small bottle description',
      }),
    );
    expect(parent).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Saved variant details/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save variant' })).toBeDisabled();
  });

  it('does not display another product’s variant and requires catalog read and write permissions', async () => {
    const { service } = await setup();
    render(
      <VendorRoutes
        service={service}
        path="/vendor/products/1001/variants/foreign"
      />,
    );
    expect(
      await screen.findByText(
        'This variant could not be found in this product.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save variant' }),
    ).not.toBeInTheDocument();
    const path = '/vendor/products/1001/variants/new';
    expect(routeAllowed(service.context, path)).toBe(true);
    expect(
      routeAllowed(
        { ...service.context, permissions: ['ReadOwnCatalog'] },
        path,
      ),
    ).toBe(false);
    expect(
      routeAllowed(
        { ...service.context, permissions: ['ManageOwnCatalog'] },
        path,
      ),
    ).toBe(false);
  });
});

describe('variant storefront URLs', () => {
  it('uses only the matching authorized variant and its photos and information', () => {
    const info = JSON.stringify(emptyProductInformation());
    const product = {
      id: '1',
      name: 'Apple juice',
      slug: 'apple-juice',
      description: 'Parent',
      productInformation: info,
      assets: [],
      featuredAsset: null,
      variants: [
        {
          id: '12',
          name: '12oz',
          catalogDetails: {
            slug: '12oz',
            description: 'Small bottle',
            productInformation: info,
            assets: [],
          },
        },
      ],
    } as unknown as PublicProduct;
    expect(variantProductPage(product, '12oz')).toMatchObject({
      name: 'Apple juice (12oz)',
      description: 'Small bottle',
      assets: [],
      featuredAsset: null,
      variants: [{ id: '12' }],
    });
    expect(variantProductPage(product, 'unknown')).toBeNull();
    expect(product.description).toBe('Parent');
  });
});
