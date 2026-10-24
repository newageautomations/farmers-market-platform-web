import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  storefrontAppearanceSchema,
  defaultStorefrontAppearance,
  vendorAppearanceDefaults,
  storefrontThemeVariables,
} from '@market/theme/storefront';
import { FeaturedAdd } from '../apps/storefront/src/components/FeaturedAdd';
it('accepts legacy configuration and rejects duplicate selections and incomplete blurbs', () => {
  expect(
    storefrontAppearanceSchema.parse(defaultStorefrontAppearance).vendor,
  ).toBeUndefined();
  expect(
    storefrontAppearanceSchema.safeParse({
      ...defaultStorefrontAppearance,
      vendor: { ...vendorAppearanceDefaults, featuredIds: ['1', '1'] },
    }).success,
  ).toBe(false);
  expect(
    storefrontAppearanceSchema.safeParse({
      ...defaultStorefrontAppearance,
      vendor: { ...vendorAppearanceDefaults, aboutEnabled: true },
    }).success,
  ).toBe(false);
  for (const heroShape of [
    'square',
    'rounded',
    'circle',
    'dome',
    'star',
    'corner',
  ])
    expect(
      storefrontAppearanceSchema.safeParse({
        ...defaultStorefrontAppearance,
        vendor: { ...vendorAppearanceDefaults, heroShape },
      }).success,
    ).toBe(true);
  expect(
    storefrontThemeVariables({
      ...defaultStorefrontAppearance,
      vendor: { ...vendorAppearanceDefaults, typography: 'friendly' },
    })['--font-heading'],
  ).toContain('Trebuchet');
});
it('adds the explicit variant through the existing shop bridge and blocks duplicate requests', async () => {
  let finish!: () => void;
  const fetcher = vi.fn(
    (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        finish = () => resolve(new Response(JSON.stringify({ result: {} })));
      }),
  );
  vi.stubGlobal('fetch', fetcher);
  render(<FeaturedAdd storefrontId="1" variantId="42" occurrenceId="7" />);
  const button = screen.getByRole('button', { name: 'Add to cart' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({
    action: 'add',
    variantId: '42',
    quantity: 1,
  });
  finish();
  await waitFor(() =>
    expect(screen.getByText('Added to your cart.')).toBeInTheDocument(),
  );
  vi.unstubAllGlobals();
});

it('reuses typography and adjacent image shape controls in visual section settings', async () => {
  const { StorefrontAppearanceSettings } =
    await import('../apps/admin/src/StorefrontAppearance');
  const record = {
    id: '11',
    name: 'Test vendor',
    version: 0,
    draft: structuredClone(defaultStorefrontAppearance),
    published: null,
    publishedAt: null,
  };
  const api = {
    read: vi.fn(async () => [record]),
    links: vi.fn(),
    save: vi.fn(
      async (_id: string, _version: number, config: typeof record.draft) => ({
        ...record,
        draft: config,
        version: 1,
      }),
    ),
    publish: vi.fn(),
  };
  render(<StorefrontAppearanceSettings market={false} api={api} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Theme settings' }),
  );
  expect(screen.getByLabelText('Typography')).toBeInTheDocument();
  expect(
    screen.getByText('Good things, thoughtfully made.'),
  ).toBeInTheDocument();
  for (const [section, url, label] of [
    ['Hero', 'Hero image URL', 'Hero image shape'],
    ['About (hidden)', 'About image URL', 'About image shape'],
  ] as const) {
    fireEvent.click(screen.getByRole('button', { name: section }));
    const field = screen.getByLabelText(url).closest('.field')!;
    expect(field.nextElementSibling).toContainElement(
      screen.getByLabelText(label),
    );
    expect(
      screen
        .getByLabelText(label)
        .querySelectorAll('.shape-swatch[data-hero-shape]'),
    ).toHaveLength(6);
  }
  fireEvent.change(screen.getByLabelText('About image shape'), {
    target: { value: 'circle' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() =>
    expect(api.save).toHaveBeenCalledWith(
      '11',
      0,
      expect.objectContaining({
        vendor: expect.objectContaining({ aboutShape: 'circle' }),
      }),
    ),
  );
});
