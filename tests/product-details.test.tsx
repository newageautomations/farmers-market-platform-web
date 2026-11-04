import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductInformationFields } from '../apps/admin/src/vendor/ProductInformationFields';
import { ProductPurchase } from '../apps/storefront/src/components/ProductPurchase';
import { ProductImages } from '../apps/admin/src/vendor/ProductImages';
import { mountProductGallery } from '../apps/storefront/src/lib/product-gallery';
import {
  emptyProductInformation,
  type PublicProduct,
  type PublicCatalog,
  type VendorCategoryApi,
} from '@market/api';
import { relatedProducts } from '@market/storefront-core';
import {
  storefrontAppearanceSchema,
  defaultStorefrontAppearance,
  vendorAppearanceDefaults,
  storefrontText,
} from '@market/theme/storefront';

describe('product information form', () => {
  it('preserves existing native assets unless the vendor edits the gallery', async () => {
    const api = { images: async () => [] } as unknown as VendorCategoryApi;
    const { container } = render(
      <form>
        <ProductImages api={api} ids={['42']} />
      </form>,
    );
    expect(
      new FormData(container.querySelector('form')!).has('productAssetsLoaded'),
    ).toBe(false);
    fireEvent.click(screen.getByText('Product photographs'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove photograph 1' }),
    );
    expect(
      new FormData(container.querySelector('form')!).has('productAssetsLoaded'),
    ).toBe(true);
    expect(
      new FormData(container.querySelector('form')!).getAll('assetIds'),
    ).toEqual([]);
  });
  it('preserves multiline content and unsaved parent values while adding, hiding, reordering and confirming deletion', async () => {
    const user = userEvent.setup();
    const info = emptyProductInformation();
    info.custom = [
      { title: 'Materials', content: 'Cotton\nLinen', enabled: true },
    ];
    const { container } = render(
      <form>
        <input aria-label="Product name" defaultValue="Unsaved product" />
        <ProductInformationFields value={JSON.stringify(info)} />
      </form>,
    );
    fireEvent.click(screen.getByText('Additional product information'));
    await user.click(
      screen.getByRole('button', { name: 'Add Information Section' }),
    );
    const titles = screen.getAllByLabelText('Section title');
    await user.type(titles[1]!, 'Nutrition Facts');
    await user.type(
      screen.getAllByLabelText('Section content')[1]!,
      'Serving size: 1\nCalories: 90',
    );
    await user.click(screen.getAllByLabelText('Show section')[0]!);
    await user.click(screen.getAllByRole('button', { name: 'Move up' })[1]!);
    const read = () =>
      JSON.parse(
        new FormData(container.querySelector('form')!).get(
          'productInformation',
        ) as string,
      );
    expect(read().custom).toEqual([
      {
        title: 'Nutrition Facts',
        content: 'Serving size: 1\nCalories: 90',
        enabled: true,
      },
      { title: 'Materials', content: 'Cotton\nLinen', enabled: false },
    ]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(
      screen.getAllByRole('button', { name: 'Delete section' })[1]!,
    );
    expect(read().custom).toHaveLength(2);
    confirm.mockReturnValue(true);
    await user.click(
      screen.getAllByRole('button', { name: 'Delete section' })[1]!,
    );
    expect(read().custom).toHaveLength(1);
    expect(screen.getByLabelText('Product name')).toHaveValue(
      'Unsaved product',
    );
    confirm.mockRestore();
  });
});
it('navigates gallery thumbnails with the keyboard and retains all photographs when a variant changes', async () => {
  const gallery = document.createElement('div');
  gallery.innerHTML =
    '<img data-gallery-main src="/first.jpg" alt="First"><button type="button" data-gallery-id="1" data-gallery-src="/first.jpg" data-gallery-alt="First">First</button><button type="button" data-gallery-id="2" data-gallery-src="/second.jpg" data-gallery-alt="Second">Second</button>';
  document.body.append(gallery);
  const cleanup = mountProductGallery(gallery);
  const buttons = gallery.querySelectorAll('button');
  buttons[1]!.focus();
  await userEvent.keyboard('{Enter}');
  expect(gallery.querySelector('img')).toHaveAttribute('src', '/second.jpg');
  expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
  window.dispatchEvent(
    new CustomEvent('product-variant-image', { detail: '1' }),
  );
  expect(gallery.querySelector('img')).toHaveAttribute('src', '/first.jpg');
  expect(gallery.querySelectorAll('button')).toHaveLength(2);
  window.dispatchEvent(
    new CustomEvent('product-variant-image', { detail: 'missing' }),
  );
  expect(gallery.querySelector('img')).toHaveAttribute('src', '/first.jpg');
  cleanup();
  gallery.remove();
});
it('contains each related-product link overlay within its own card without a homepage wrapper', () => {
  const style = document.createElement('style');
  style.textContent = readFileSync(
    resolve('apps/storefront/src/styles/homepage.css'),
    'utf8',
  );
  document.head.append(style);
  const page = document.createElement('main');
  page.innerHTML =
    '<div class="product-gallery"><button type="button">Second photo</button></div><section class="product-related"><div class="harvest-products"><article class="product-card"><a class="product-card-link" href="/products/other">Other product</a></article><article class="product-card"><a class="product-card-link" href="/products/last">Last product</a></article></div></section>';
  document.body.append(page);
  try {
    for (const card of page.querySelectorAll('.product-card')) {
      expect(getComputedStyle(card).position).toBe('relative');
      expect(getComputedStyle(card).isolation).toBe('isolate');
    }
    expect(getComputedStyle(page).position).not.toBe('relative');
  } finally {
    page.remove();
    style.remove();
  }
});
it('keeps the main gallery image mounted after a load error so another thumbnail can recover', () => {
  const gallery = document.createElement('div');
  gallery.innerHTML =
    '<img data-gallery-main src="/missing.jpg" alt="Product"><button type="button" data-gallery-id="2" data-gallery-src="/second.jpg" data-gallery-alt="Second">Second</button>';
  document.body.append(gallery);
  const cleanup = mountProductGallery(gallery);
  try {
    const main = gallery.querySelector('img')!;
    fireEvent.error(main);
    expect(main.isConnected).toBe(true);
    expect(main.hidden).toBe(true);
    expect(gallery.querySelector('[role="img"]')).toHaveTextContent(
      'Image unavailable',
    );
    fireEvent.click(gallery.querySelector('button')!);
    expect(main.hidden).toBe(false);
    expect(main).toHaveAttribute('src', '/second.jpg');
    expect(gallery.querySelector('[role="img"]')).toBeNull();
    expect(main.closest('a')).toBeNull();
  } finally {
    cleanup();
    gallery.remove();
  }
});
const variants: PublicProduct['variants'] = [
  {
    id: '10',
    name: 'Small',
    assets: [],
    sku: 's',
    priceWithTax: 500,
    currencyCode: 'USD',
    options: [],
    featuredAsset: {
      id: '100',
      preview: 'http://localhost/small.jpg',
      width: 500,
      height: 500,
    },
  },
  {
    id: '11',
    name: 'Large',
    assets: [
      {
        id: '101',
        preview: 'http://localhost/large.jpg',
        width: 500,
        height: 500,
      },
    ],
    sku: 'l',
    priceWithTax: 900,
    currencyCode: 'USD',
    options: [],
    featuredAsset: null,
  },
];
const facts = [
  { variantId: '10', available: true, reason: 'Available', quantity: 2 },
  {
    variantId: '11',
    available: false,
    reason: 'Sold out for this market',
    quantity: 0,
  },
];
describe('product purchasing', () => {
  it('requires an explicit option, updates variant imagery and price, and rejects unavailable options and excess quantity', async () => {
    const image = vi.fn();
    window.addEventListener('product-variant-image', image);
    render(
      <ProductPurchase
        storefrontId="1"
        variants={variants}
        signedIn
        fixture={false}
        occurrenceId="7"
        availability={facts}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Choose an option' }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Product option'), {
      target: { value: '10' },
    });
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(image).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '3' },
    });
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Product option'), {
      target: { value: '11' },
    });
    expect(screen.getByText('$9.00')).toBeInTheDocument();
    expect(image.mock.lastCall?.[0].detail).toBe('101');
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
    window.removeEventListener('product-variant-image', image);
  });
  it('rechecks late availability and submits exactly the selected variant, occurrence and quantity once', async () => {
    let resolveAdd: (value: Response) => void = () => {};
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      if (body.action === 'product-availability')
        return new Response(JSON.stringify({ result: facts }));
      return await new Promise<Response>((r) => {
        resolveAdd = r;
      });
    });
    vi.stubGlobal('fetch', fetcher);
    render(
      <ProductPurchase
        storefrontId="1"
        variants={variants}
        initialVariantId="10"
        signedIn
        fixture={false}
        occurrenceId="7"
        availability={facts}
      />,
    );
    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetcher.mock.calls[1]![1]!.body as string)).toEqual({
      storefrontId: '1',
      action: 'add',
      variantId: '10',
      occurrenceId: '7',
      quantity: 2,
    });
    fireEvent.submit(screen.getByLabelText('Quantity').closest('form')!);
    expect(fetcher).toHaveBeenCalledTimes(2);
    resolveAdd(new Response(JSON.stringify({ result: {} })));
    expect(await screen.findByText('Added to your cart.')).toBeInTheDocument();
  });
  it('blocks a late capacity change before the add operation', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            result: [
              {
                ...facts[0],
                available: false,
                quantity: 0,
                reason: 'Sold out for this market',
              },
            ],
          }),
        ),
    );
    vi.stubGlobal('fetch', fetcher);
    render(
      <ProductPurchase
        storefrontId="1"
        variants={variants}
        initialVariantId="10"
        signedIn
        fixture={false}
        occurrenceId="7"
        availability={facts}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Unavailable' }),
      ).toBeDisabled(),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
it('prefers native categories, excludes the current product and limits related products', () => {
  const product = (
    id: string,
    category: string,
  ): PublicCatalog['items'][number] => ({
    id,
    name: id,
    slug: id,
    description: '',
    featuredAsset: null,
    variants: [],
    facetValues: [
      {
        id: category,
        name: category,
        facet: { code: 'farmstand-category', id: '1', name: 'Category' },
      },
    ],
  });
  const current = product('1', 'a');
  expect(
    relatedProducts(current, [
      current,
      product('2', 'b'),
      product('3', 'a'),
      product('4', 'b'),
      product('5', 'a'),
      product('6', 'b'),
    ]).map((v) => v.id),
  ).toEqual(['3', '5', '2', '4']);
  expect(relatedProducts(current, [current])).toEqual([]);
});
it('validates related template settings and retains the heading when hidden', () => {
  const config = storefrontAppearanceSchema.parse({
    ...defaultStorefrontAppearance,
    vendor: {
      ...vendorAppearanceDefaults,
      relatedEnabled: false,
      text: { relatedHeading: 'More from our farm' },
    },
  });
  expect(config.vendor?.relatedEnabled).toBe(false);
  expect(storefrontText(config, 'relatedHeading')).toBe('More from our farm');
  expect(storefrontText(undefined, 'relatedHeading')).toBe(
    'You might also like',
  );
  expect(() =>
    storefrontAppearanceSchema.parse({
      ...config,
      vendor: { ...config.vendor, text: { relatedHeading: 'x'.repeat(161) } },
    }),
  ).toThrow();
});
