import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AppError, emptyProductInformation } from '@market/api';
import { routeAllowed } from '@market/admin-core';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { createFixtureVendorService } from '../apps/admin/src/vendor/fixture';
import { VendorRoutes } from '../apps/admin/src/vendor/VendorRoutes';
import { go } from '../apps/admin/src/vendor/common';
import type { VendorService } from '../apps/admin/src/vendor/service';

function setup() {
  const service = createFixtureVendorService(fixtureContexts.VENDOR);
  const category = {
    id: 'fruit',
    code: 'fruit',
    name: 'Fruit',
    active: true,
    parentId: null,
    assignable: true,
    children: [],
  };
  service.taxonomy = {
    hierarchy: vi.fn(async () => [category]),
    tags: vi.fn(async () => []),
    classification: vi.fn(async () => ({
      primaryCategory: category,
      categoryPath: [category],
      tags: [],
    })),
  };
  service.categories = {
    images: vi.fn(async () => [
      { id: 'small', name: 'Small bottle', preview: '/small.jpg' },
      { id: 'large', name: 'Large bottle', preview: '/large.jpg' },
    ]),
  } as unknown as VendorService['categories'];
  return service;
}

function Flow({ service }: { service: VendorService }) {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const update = () => setPath(location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return <VendorRoutes service={service} path={path} />;
}

function start(service: VendorService, path: string) {
  history.replaceState(null, '', path);
  return render(<Flow service={service} />);
}

async function variantFields(name: string, price = '5.25') {
  const nameField = await screen.findByLabelText('Variant name');
  await act(async () => {
    fireEvent.change(nameField, {
      target: { value: name },
    });
    fireEvent.change(screen.getByLabelText('SKU'), {
      target: { value: `SKU-${name}` },
    });
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: price },
    });
  });
}

describe('guided product setup', () => {
  it('generates a product slug from its name until the slug is edited manually', async () => {
    start(setup(), '/vendor/products/new');
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Watermelon Splash' },
    });
    expect(screen.getByLabelText('Slug')).toHaveValue('watermelon-splash');
    expect(
      screen.getByRole('button', { name: 'About Slug' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Slug'), {
      target: { value: 'Custom Slug!' },
    });
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Different name' },
    });
    expect(screen.getByLabelText('Slug')).toHaveValue('custom-slug');
    await act(async () => {});
  });
  it('requires all basic fields and a category, saves a disabled draft and opens variant setup', async () => {
    const service = setup();
    const create = vi.spyOn(service, 'createProduct');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    start(service, '/vendor/products/new');
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toBeDisabled();
    fireEvent.input(screen.getByLabelText('Slug'), {
      target: { value: 'Watermelon Splash! ' },
    });
    expect(screen.getByLabelText('Slug')).toHaveValue('watermelon-splash-');
    expect(screen.getByLabelText('Slug')).toHaveAttribute('maxLength', '120');
    expect(
      screen.getByRole('button', { name: 'About Create product' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Apple juice' },
    });
    fireEvent.change(screen.getByLabelText('Slug'), {
      target: { value: 'apple-juice' },
    });
    expect(next).toBeDisabled();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Choose category' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Choose category' }));
    fireEvent.click(await screen.findByRole('radio', { name: 'Fruit' }));
    await waitFor(() => expect(next).toBeEnabled());
    expect(next).toHaveClass('product-next-button');
    expect(
      next.querySelector('.farmstand-icon-arrow-right'),
    ).toBeInTheDocument();
    fireEvent.click(next);
    await screen.findByLabelText('Variant name');
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Apple juice',
        enabled: false,
        primaryCategoryId: 'fruit',
      }),
    );
    expect(location.pathname).toMatch(/\/setup\/variants\/new$/);
    expect(
      screen.getByRole('button', { name: 'Publish product' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Additional variant' }),
    ).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
    // Going back to saved details retains the first step and its draft state.
    fireEvent.click(screen.getByRole('link', { name: 'Back to product' }));
    expect(await screen.findByLabelText('Product name')).toHaveValue(
      'Apple juice',
    );
    expect(
      await service.product(
        create.mock.results[0] ? (await create.mock.results[0].value).id : '',
      ),
    ).toMatchObject({ enabled: false });
  });

  it('saves additional variants, previews selected content and publishes only from the final action', async () => {
    const service = setup();
    await service.updateProduct('1001', {
      name: 'Apple juice',
      slug: 'apple-juice',
      description: 'Fresh pressed',
      enabled: false,
    });
    const create = vi.spyOn(service, 'createVariant');
    const publish = vi.spyOn(service, 'updateProduct');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    start(service, '/vendor/products/1001/setup/variants/new');
    await variantFields('Small');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Additional variant' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Additional variant' }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByLabelText('Variant name')).toHaveValue(''),
    );
    expect(location.pathname).toBe('/vendor/products/1001/setup/variants/new');
    expect((await service.product('1001')).enabled).toBe(false);
    await variantFields('Large', '9.00');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Publish product' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publish product' }));
    await screen.findByRole('region', { name: 'Harvest product preview' });
    expect(create).toHaveBeenCalledTimes(2);
    expect(publish).not.toHaveBeenCalled();
    expect(location.pathname).toBe('/vendor/products/1001/setup/preview');
    const large = (await service.product('1001')).variants.find(
      (v) => v.name === 'Large',
    )!;
    fireEvent.change(screen.getByLabelText('Product option'), {
      target: { value: large.id },
    });
    expect(screen.getByText('$9.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Large' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Edit Product' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Edit Small' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add variant' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Large' }));
    expect(await screen.findByLabelText('Variant name')).toHaveValue('Large');
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Large bottle' },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save and preview' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save and preview' }));
    await screen.findByRole('region', { name: 'Harvest product preview' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() =>
      expect(publish).toHaveBeenCalledWith(
        '1001',
        expect.objectContaining({ enabled: true }),
      ),
    );
    await waitFor(() =>
      expect(location.pathname).toBe('/vendor/products/1001'),
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it('changes photos, information and edit targets when switching preview variants', async () => {
    const service = setup();
    const product = await service.product('1001');
    const info = emptyProductInformation();
    info.ingredients.content = 'Large apples';
    service.product = vi.fn(async () => ({
      ...product,
      enabled: false,
      variants: product.variants.slice(0, 2).map((variant, index) => ({
        ...variant,
        enabled: true,
        assetIds: [index ? 'large' : 'small'],
        description: index ? 'Large description' : 'Small description',
        productInformation: index ? JSON.stringify(info) : null,
      })),
    }));
    start(service, '/vendor/products/1001/setup/preview');
    await screen.findByRole('region', { name: 'Harvest product preview' });
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute('src', '/small.jpg'),
    );
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Product option'), {
        target: { value: product.variants[1]!.id },
      });
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', '/large.jpg');
    expect(screen.getByText('Large description')).toBeInTheDocument();
    expect(screen.getByText('Large apples')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Edit ${product.variants[1]!.name}` }),
    ).toBeInTheDocument();
  });

  it('allows editing a preview with no enabled variants while preventing publication', async () => {
    const service = setup();
    const product = await service.product('1001');
    service.product = vi.fn(async () => ({
      ...product,
      enabled: false,
      variants: product.variants.map((v) => ({ ...v, enabled: false })),
    }));
    start(service, '/vendor/products/1001/setup/preview');
    expect(
      await screen.findByRole('button', { name: 'Publish' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Product' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: `Edit ${product.variants[0]!.name}` }),
    ).toBeEnabled();
  });

  it('guards the page back arrow, internal commands, browser history and unload without losing edits', async () => {
    const service = setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    start(service, '/vendor/products/1001/variants/new');
    await variantFields('Unsaved');
    await act(async () => {});
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('link', { name: 'Back to product' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(location.pathname).toBe('/vendor/products/1001/variants/new');
    expect(screen.getByLabelText('Variant name')).toHaveValue('Unsaved');
    act(() => go('/vendor/products/1001'));
    expect(confirm).toHaveBeenCalledTimes(2);
    history.replaceState(null, '', '/vendor/products/1001');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(location.pathname).toBe('/vendor/products/1001/variants/new');
    expect(confirm).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText('Variant name')).toHaveValue('Unsaved');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('link', { name: 'Back to product' }));
    expect(location.pathname).toBe('/vendor/products/1001');
    expect(await screen.findByLabelText('Product name')).toBeInTheDocument();
  });

  it('retains progress and blocks another create after an uncertain save', async () => {
    const service = setup();
    await service.updateProduct('1001', {
      name: 'Apple juice',
      slug: 'apple-juice',
      description: '',
      enabled: false,
    });
    const create = vi
      .spyOn(service, 'createVariant')
      .mockRejectedValue(new AppError('network'));
    start(service, '/vendor/products/1001/setup/variants/new');
    await variantFields('Small');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Publish product' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publish product' }));
    await screen.findByText(/The command outcome is unconfirmed/);
    expect(screen.getByLabelText('Variant name')).toHaveValue('Small');
    expect(
      screen.getByRole('button', { name: 'Publish product' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Additional variant' }),
    ).toBeDisabled();
    expect(create).toHaveBeenCalledOnce();
    expect(location.pathname).toBe('/vendor/products/1001/setup/variants/new');
  });

  it('protects photo-only changes that are saved through hidden form fields', async () => {
    const service = setup();
    const product = await service.product('1001');
    service.product = vi.fn(async () => ({ ...product, assetIds: ['small'] }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    start(service, '/vendor/products/1001/variants/new');
    await screen.findByAltText('Product photograph 1');
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove photograph 1' }),
      );
    });
    fireEvent.click(screen.getByRole('link', { name: 'Back to product' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(location.pathname).toBe('/vendor/products/1001/variants/new');
    expect(
      screen.queryByAltText('Product photograph 1'),
    ).not.toBeInTheDocument();
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
  });

  it('keeps normal variant creation unchanged and requires both permissions for setup routes', async () => {
    const service = setup();
    const view = start(service, '/vendor/products/1001/variants/new');
    await screen.findByLabelText('Variant name');
    expect(
      screen.getByRole('button', { name: 'Add variant' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Additional variant' }),
    ).not.toBeInTheDocument();
    view.unmount();
    // A historical setup URL must not re-enable setup actions after publication.
    start(service, '/vendor/products/1001/setup/variants/new');
    await screen.findByLabelText('Variant name');
    expect(
      screen.getByRole('button', { name: 'Add variant' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Additional variant' }),
    ).not.toBeInTheDocument();
    for (const path of [
      '/vendor/products/1001/setup',
      '/vendor/products/1001/setup/preview',
      '/vendor/products/1001/setup/variants/new',
    ]) {
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
    }
  });
});
