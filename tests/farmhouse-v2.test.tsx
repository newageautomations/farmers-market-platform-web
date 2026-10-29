import { expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import {
  farmhouseDefaults,
  farmhouseSettingsSchema,
  storefrontAppearanceSchema,
  defaultStorefrontAppearance,
  isFarmhouse,
} from '@market/theme/storefront';
import { FarmhouseEditor } from '../apps/admin/src/FarmhouseEditor';
import { Purchase } from '../apps/storefront/src/components/modern-farmhouse/Purchase';
import { ContactForm } from '../apps/storefront/src/components/modern-farmhouse/ContactForm';
import { fixtureCatalog } from '@market/storefront-core/fixtures';
import { shopCall } from '../apps/storefront/src/components/shop-client';
import type { StorefrontAppearanceConfig } from '@market/api';
import { VisualStorefrontEditor } from '../apps/admin/src/VisualStorefrontEditor';
import {
  farmhousePalettes,
  farmhouseFonts,
  farmhousePresentationStyle,
} from '@market/theme/farmhouse-presentation';
vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: vi.fn(),
}));
const call = vi.mocked(shopCall);
it('separates v2 defaults, settings and identities from legacy appearance', () => {
  const a = farmhouseDefaults(),
    b = farmhouseDefaults();
  a.sections[0]!.heading = 'Only A';
  expect(b.sections[0]!.heading).not.toBe('Only A');
  expect(farmhouseSettingsSchema.safeParse({ ...b, version: 1 }).success).toBe(
    false,
  );
  expect(
    farmhouseSettingsSchema.safeParse({
      ...b,
      sections: [...b.sections.slice(1), b.sections[1]],
    }).success,
  ).toBe(false);
  expect(farmhouseSettingsSchema.safeParse({ ...b, extra: true }).success).toBe(
    false,
  );
  const bad = structuredClone(b);
  bad.sections[0]!.destination = '//attacker.test';
  expect(farmhouseSettingsSchema.safeParse(bad).success).toBe(false);
  bad.sections[0]!.destination = '/products';
  bad.sections[0]!.photo = {
    ...bad.sections[0]!.photo,
    url: 'https://attacker.test/image.jpg',
  };
  expect(farmhouseSettingsSchema.safeParse(bad).success).toBe(false);
  const modern = {
    ...defaultStorefrontAppearance,
    theme: 'modern-farmhouse' as const,
    template: {
      id: 'modern-farmhouse' as const,
      version: 2 as const,
      settings: b,
    },
  };
  expect(isFarmhouse(modern)).toBe(true);
  expect(
    farmhouseSettingsSchema.safeParse({ ...b, scrollFade: true }).success,
  ).toBe(true);
  expect(
    farmhouseSettingsSchema.safeParse({ ...b, scrollFade: 'yes' }).success,
  ).toBe(false);
  expect(isFarmhouse({ ...modern, template: undefined })).toBe(false);
  expect(
    storefrontAppearanceSchema.safeParse({ ...modern, theme: 'harvest' })
      .success,
  ).toBe(false);
});
it('owns presentation and never imports the quarantined design or Harvest components', () => {
  const root = 'apps/storefront/src/components/modern-farmhouse/';
  for (const name of readdirSync(root)) {
    const source = readFileSync(root + name, 'utf8');
    expect(source).not.toMatch(
      /legacy-modern-farmhouse|Harvest|VendorHome|AboutStory/,
    );
  }
  const css = readFileSync(
    'apps/storefront/src/styles/farmhouse-v2.css',
    'utf8',
  );
  expect(css).toContain("data-template-version='2'");
  expect(css).toContain('prefers-reduced-motion');
});
it('edits the actual section model using approved fields and preserves ordered independent settings', () => {
  const value = farmhouseDefaults();
  const change = vi.fn();
  render(
    <FarmhouseEditor
      value={value}
      onChange={change}
      api={{ read: vi.fn(), save: vi.fn(), publish: vi.fn(), links: vi.fn() }}
      busy={false}
      products={[]}
      loadProducts={() => {}}
      selected="farmhouse:cinematic"
    />,
  );
  fireEvent.change(
    screen.getByLabelText('Heading', { selector: '#cinematic-heading' }),
    { target: { value: 'A new opening' } },
  );
  expect(change.mock.calls.at(-1)![0].sections[0].heading).toBe(
    'A new opening',
  );
  expect(value.sections[0]!.heading).toBe('Good food. A little closer.');
  expect(screen.queryByLabelText('Hero shape')).toBeNull();
});
it('retains product availability revalidation and authorized add operations in the premium purchase presentation', async () => {
  const product = fixtureCatalog({ skip: 0, take: 1, search: '', sort: 'asc' })
    .items[0]!;
  const variant = {
    ...product.variants[0]!,
    sku: 'TEST',
    assets: [],
    featuredAsset: null,
    options: [],
  };
  const availability = [
    {
      variantId: variant.id,
      available: true,
      quantity: 3,
      reason: 'Available',
    },
  ];
  call
    .mockResolvedValueOnce(availability)
    .mockResolvedValueOnce({ cart: null });
  render(
    <Purchase
      storefrontId="1"
      variants={[variant]}
      signedIn={false}
      fixture={false}
      occurrenceId="7"
      availability={availability}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /Add to cart/ }));
  await waitFor(() =>
    expect(call).toHaveBeenCalledWith('1', 'add', {
      variantId: variant.id,
      quantity: 1,
      occurrenceId: '7',
    }),
  );
  expect(call.mock.calls[0]).toEqual([
    '1',
    'product-availability',
    { occurrenceId: '7', variantIds: [variant.id] },
  ]);
});
it('blocks contact submission in preview through the shared contact controller', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  render(<ContactForm preview />);
  expect(screen.getByRole('button', { name: /Send Message/ })).toBeDisabled();
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});

it('edits the shop hero copy and photograph using the existing authorized photo contract', () => {
  const value = farmhouseDefaults();
  const change = vi.fn();
  render(
    <FarmhouseEditor
      value={value}
      onChange={change}
      api={{ read: vi.fn(), save: vi.fn(), publish: vi.fn(), links: vi.fn() }}
      busy={false}
      products={[]}
      loadProducts={() => {}}
      page="products"
      selected="farmhouse:shop-settings"
    />,
  );
  fireEvent.change(screen.getByLabelText('Shop heading'), {
    target: { value: 'Our collection' },
  });
  expect(change.mock.calls.at(-1)![0].pages.shopHeading).toBe('Our collection');
  fireEvent.change(screen.getByLabelText('Shop introduction'), {
    target: { value: 'Fresh from our farm.' },
  });
  expect(change.mock.calls.at(-1)![0].pages.shopIntroduction).toBe(
    'Fresh from our farm.',
  );
  fireEvent.change(screen.getByLabelText('Image description'), {
    target: { value: 'A table of seasonal produce' },
  });
  expect(
    change.mock.calls
      .at(-1)![0]
      .sections.find((s: { id: string }) => s.id === 'cinematic').photo.alt,
  ).toBe('A table of seasonal produce');
  fireEvent.change(screen.getByLabelText('Mobile image position'), {
    target: { value: 'top' },
  });
  expect(
    change.mock.calls
      .at(-1)![0]
      .sections.find((s: { id: string }) => s.id === 'cinematic').photo.mobile,
  ).toBe('top');
  expect(value.sections[0]!.photo.mobile).toBe('center');
});

it('keeps premium edits inside editor undo, redo and draft save without showing Harvest homepage controls', async () => {
  const draft = {
    ...structuredClone(defaultStorefrontAppearance),
    theme: 'modern-farmhouse' as const,
    template: {
      id: 'modern-farmhouse' as const,
      version: 2 as const,
      settings: farmhouseDefaults(),
    },
  };
  const record = {
    id: '22',
    name: 'Premium draft',
    version: 1,
    draft,
    published: null,
    publishedAt: null,
  };
  const save = vi.fn(
    async (
      _id: string,
      _version: number,
      config: StorefrontAppearanceConfig,
    ) => ({ ...record, draft: config }),
  );
  render(
    <VisualStorefrontEditor
      record={record}
      api={{
        read: vi.fn(),
        links: vi.fn(async () => []),
        save,
        publish: vi.fn(),
      }}
      onSaved={() => {}}
    />,
  );
  fireEvent.click(screen.getByText('Cinematic opening'));
  const input = screen.getByLabelText('Heading', {
    selector: '#cinematic-heading',
  });
  fireEvent.change(input, { target: { value: 'An independent opening' } });
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(input).toHaveValue('Good food. A little closer.');
  fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
  expect(input).toHaveValue('An independent opening');
  expect(screen.queryByLabelText('Hero heading')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  const saved = save.mock.calls[0]![2];
  expect(
    saved.template?.id === 'modern-farmhouse'
      ? saved.template.settings.sections[0]!.heading
      : undefined,
  ).toBe('An independent opening');
  expect(
    draft.template.id === 'modern-farmhouse'
      ? draft.template.settings.sections[0]!.heading
      : undefined,
  ).toBe(
    'Good food. A little closer.',
  );
});

it('uses shared editor dropdowns and retains global header, footer and theme edits across pages', () => {
  const draft = {
    ...structuredClone(defaultStorefrontAppearance),
    theme: 'modern-farmhouse' as const,
    template: {
      id: 'modern-farmhouse' as const,
      version: 2 as const,
      settings: farmhouseDefaults(),
    },
  };
  render(
    <VisualStorefrontEditor
      record={{
        id: '31',
        name: 'Premium',
        version: 1,
        draft,
        published: null,
        publishedAt: null,
      }}
      api={{
        read: vi.fn(),
        links: vi.fn(async () => []),
        save: vi.fn(),
        publish: vi.fn(),
      }}
      onSaved={() => {}}
    />,
  );
  for (const label of ['Header', 'Footer', 'Theme settings']) {
    expect(
      screen.getByRole('button', { name: label }).closest('details'),
    ).toHaveClass('ui-disclosure', 'dropdown');
  }
  fireEvent.click(screen.getByRole('button', { name: 'Header' }));
  fireEvent.change(screen.getByLabelText('Shop navigation label'), {
    target: { value: 'Our pantry' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Header' }));
  expect(screen.queryByLabelText('Shop navigation label')).toBeNull();
  fireEvent.change(screen.getByLabelText('Preview page'), {
    target: { value: 'products' },
  });
  expect(
    screen.queryByRole('button', { name: 'Cinematic opening' }),
  ).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Shop settings' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Header' }));
  expect(screen.getByLabelText('Shop navigation label')).toHaveValue(
    'Our pantry',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Footer' }));
  expect(screen.getByText(/Footer links follow/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Footer invitation')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Theme settings' }));
  fireEvent.change(screen.getByLabelText('Palette'), {
    target: { value: 'clay' },
  });
  fireEvent.click(
    screen.getByRole('switch', { name: 'Fade in while scrolling' }),
  );
  for (const page of ['home', 'about', 'find', 'contact', 'faq', 'policies']) {
    fireEvent.change(screen.getByLabelText('Preview page'), {
      target: { value: page },
    });
    for (const label of ['Header', 'Footer', 'Theme settings'])
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
  }
  fireEvent.click(screen.getByRole('button', { name: 'Header' }));
  expect(screen.getByLabelText('Shop navigation label')).toHaveValue(
    'Our pantry',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Footer' }));
  expect(screen.getByText(/Footer links follow/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Theme settings' }));
  expect(screen.getByLabelText('Palette')).toHaveValue('clay');
  expect(
    screen.getByRole('switch', { name: 'Fade in while scrolling' }),
  ).toBeChecked();
  expect(draft.template.settings.header.shopLabel).toBe('The shop');
});

it('offers every palette with four swatches and includes Harvest fonts and shared button settings', () => {
  const settings = farmhouseDefaults();
  render(
    <FarmhouseEditor
      value={settings}
      selected="theme"
      busy={false}
      onChange={() => {}}
      api={{ read: vi.fn(), save: vi.fn(), publish: vi.fn(), links: vi.fn() }}
      products={[]}
      loadProducts={() => {}}
    />,
  );
  const palette = screen.getByLabelText('Palette');
  expect(palette.querySelectorAll('.ui-palette-swatches')).toHaveLength(
    Object.keys(farmhousePalettes).length,
  );
  for (const option of palette.querySelectorAll('option'))
    expect(option.querySelectorAll('.ui-palette-swatch')).toHaveLength(4);
  for (const [id, font] of Object.entries(farmhouseFonts))
    expect(screen.getByRole('option', { name: font.label })).toHaveValue(id);
  expect(
    screen.getByRole('switch', { name: 'Fade in while scrolling' }),
  ).not.toBeChecked();
  expect(screen.getByLabelText('Button shape')).toBeInTheDocument();
  expect(screen.getByLabelText('Button hover effect')).toBeInTheDocument();
  const config = {
    ...defaultStorefrontAppearance,
    theme: 'modern-farmhouse' as const,
    template: {
      id: 'modern-farmhouse' as const,
      version: 2 as const,
      settings: {
        ...settings,
        palette: 'blue' as const,
        typography: 'friendly' as const,
      },
    },
  };
  expect(storefrontAppearanceSchema.safeParse(config).success).toBe(true);
  expect(farmhousePresentationStyle(config)).toContain(
    '--farmhouse-ink:#365C6E',
  );
  expect(farmhousePresentationStyle(config)).toContain('Trebuchet MS');
});

it('chooses multiple full-name products in a modal and applies only the confirmed selection', () => {
  const value = farmhouseDefaults();
  const onChange = vi.fn();
  const load = vi.fn();
  render(
    <FarmhouseEditor
      value={value}
      selected="farmhouse:products"
      busy={false}
      onChange={onChange}
      api={{ read: vi.fn(), save: vi.fn(), publish: vi.fn(), links: vi.fn() }}
      products={[
        {
          id: '101',
          name: 'A long descriptive name for the first farm product',
        },
        { id: '102', name: 'Another full product name' },
      ]}
      loadProducts={load}
    />,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Choose featured products' }),
  );
  const modal = screen.getByRole('dialog', {
    name: 'Choose featured products',
  });
  fireEvent.click(
    within(modal).getByRole('checkbox', {
      name: 'A long descriptive name for the first farm product',
    }),
  );
  fireEvent.click(
    within(modal).getByRole('checkbox', { name: 'Another full product name' }),
  );
  expect(onChange).not.toHaveBeenCalled();
  expect(load).toHaveBeenCalledOnce();
  fireEvent.click(
    within(modal).getByRole('button', { name: 'Use selected products' }),
  );
  expect(
    onChange.mock.calls[0]![0].sections.find(
      (s: { id: string }) => s.id === 'products',
    ).productIds,
  ).toEqual(['101', '102']);
  expect(value.sections.find((s) => s.id === 'products')!.productIds).toEqual(
    [],
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Choose featured products' }),
  );
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('checkbox', {
      name: 'Another full product name',
    }),
  );
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }),
  );
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('switch')).toHaveAccessibleName(/Enable/);
  expect(
    screen.getByRole('button', { name: /Move up:/ }).querySelector('svg'),
  ).not.toBeNull();
});
