import { describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  defaultStorefrontAppearance,
  defaultContact,
  defaultFaq,
  defaultPolicies,
  defaultFindUs,
  storefrontAppearanceSchema,
  storefrontThemes,
  storefrontThemeVariables,
  storefrontTextSizeCss,
  storefrontPreviewPath,
  vendorAppearanceDefaults,
  type StorefrontAppearance,
} from '@market/theme/storefront';
import { VisualStorefrontEditor } from '../apps/admin/src/VisualStorefrontEditor';
import { VendorCartLink } from '../apps/storefront/src/components/legacy-modern-farmhouse/VendorCartLink';
import { mountStorefrontMenu } from '../apps/storefront/src/lib/storefront-menu';
import { shopCall } from '../apps/storefront/src/components/shop-client';
import type { StorefrontAppearanceRecord } from '@market/api';

vi.mock('../apps/storefront/src/components/shop-client', () => ({
  shopCall: vi.fn(),
}));

function authored(): StorefrontAppearance {
  return structuredClone({
    ...defaultStorefrontAppearance,
    palette: 'terracotta',
    buttonShape: 'soft',
    buttonHover: 'outline',
    homepage: {
      title: 'Willow & Grain',
      introduction: 'Locally made',
      image: 'https://assets.example.test/hero.jpg',
      story: 'Legacy story retained',
    },
    vendor: {
      ...vendorAppearanceDefaults,
      typography: 'warm',
      heroShape: 'star',
      aboutShape: 'circle',
      featuredIds: ['12', '7'],
      aboutEnabled: true,
      aboutBlurb: 'Our growing story',
      aboutImage: 'https://assets.example.test/story.jpg',
      aboutAlt: 'Our field',
      text: { closingHeading: 'See you at the market' },
    },
    about: {
      enabled: true,
      title: 'Our Story',
      content: 'Original story',
      sectionsVersion: 1,
      sections: [
        {
          id: 'first',
          layout: 'text-image',
          heading: 'A family farm',
          body: 'Our words',
          imageAssetId: '9',
          image: 'https://assets.example.test/story.jpg',
          alt: 'Orchard',
          shape: 'natural-rounded',
          imagePosition: 'left',
          textAlign: 'right',
          imageSize: 'small',
          visible: true,
        },
      ],
    },
    findUs: { ...defaultFindUs, enabled: true },
    contact: { ...defaultContact, enabled: true },
    faq: { ...defaultFaq, enabled: true },
    policies: { ...defaultPolicies, enabled: true },
    textSizes: { hero: { heading: 110, paragraph: 105 } },
  } satisfies StorefrontAppearance);
}

describe('Retired theme compatibility', () => {
  it('registers two explicit identities, preserves Harvest defaults and rejects unknown identities', () => {
    expect(Object.keys(storefrontThemes)).toEqual([
      'harvest',
      'modern-farmhouse',
    ]);
    expect(storefrontThemes['modern-farmhouse'].premium).toBe(true);
    expect(storefrontThemes['modern-farmhouse'].available).toBe(true);
    expect(defaultStorefrontAppearance.theme).toBe('harvest');
    const original = authored();
    const premium = storefrontAppearanceSchema.parse({
      ...original,
      theme: 'modern-farmhouse',
    });
    expect(premium).toEqual({ ...original, theme: 'modern-farmhouse' });
    expect(
      storefrontAppearanceSchema.parse({ ...premium, theme: 'harvest' }),
    ).toEqual(original);
    expect(storefrontThemeVariables(premium)).toEqual(
      storefrontThemeVariables(original),
    );
    expect(storefrontTextSizeCss(premium)).toContain(
      "html:root[data-storefront-theme='modern-farmhouse']",
    );
    expect(storefrontTextSizeCss(premium)).toContain('*1.1');
    expect(storefrontTextSizeCss(original)).toContain(
      '[data-storefront-theme] [data-editor-section="hero"]',
    );
    expect(
      storefrontAppearanceSchema.safeParse({ ...original, theme: 'unknown' })
        .success,
    ).toBe(false);
    for (const path of ['/cart', '/checkout', '/checkout/success', '/account'])
      expect(storefrontPreviewPath(path)).toBe(false);
  });

  it('keeps the template fixed while appearance edits retain preview, undo, save and publish', async () => {
    let record: StorefrontAppearanceRecord = {
      id: '11',
      name: 'Willow & Grain',
      version: 4,
      draft: authored(),
      published: authored(),
      publishedAt: null,
    };
    const original = structuredClone(record.draft);
    const api = {
      read: vi.fn(async () => [record]),
      links: vi.fn(async () => []),
      preview: vi.fn(async () => ({
        token: 'x'.repeat(43),
        expiresAt: Date.now() + 300000,
        url: 'http://vendor.localhost:4321',
      })),
      save: vi.fn(
        async (_id: string, version: number, config: StorefrontAppearance) => {
          expect(version).toBe(record.version);
          record = { ...record, version: version + 1, draft: config };
          return record;
        },
      ),
      publish: vi.fn(async (_id: string, version: number) => {
        expect(version).toBe(record.version);
        record = {
          ...record,
          version: version + 1,
          published: structuredClone(record.draft),
        };
        return record;
      }),
    };
    const { rerender } = render(
      <VisualStorefrontEditor
        record={record}
        api={api}
        onSaved={(next) =>
          rerender(
            <VisualStorefrontEditor
              record={next}
              api={api}
              onSaved={() => {}}
            />,
          )
        }
      />,
    );
    const frame = await screen.findByTitle<HTMLIFrameElement>(
      'Actual storefront preview',
    );
    const post = vi
      .spyOn(frame.contentWindow!, 'postMessage')
      .mockImplementation(() => {});
    act(() =>
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'http://vendor.localhost:4321',
          source: frame.contentWindow,
          data: { protocol: 'storefront-editor-v1', type: 'ready' },
        }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Theme settings' }));
    expect(screen.queryByLabelText('Storefront theme')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Color palette'), {
      target: { value: 'blue' },
    });
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({ config: { ...original, palette: 'blue' } }),
      'http://vendor.localhost:4321',
    );
    expect(record.published).toEqual(original);
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Color palette')).toHaveValue(
      original.palette,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByLabelText('Color palette')).toHaveValue('blue');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith('11', 4, {
        ...original,
        palette: 'blue',
      }),
    );
    expect(record.published).toEqual(original);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Publish saved changes' }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(api.publish).toHaveBeenCalledWith('11', 5));
    expect(record.published).toEqual({
      ...original,
      palette: 'blue',
    });
  });

  it('keeps native navigation operable with Escape, outside focus and link dismissal', () => {
    document.body.innerHTML =
      '<details><summary>Menu</summary><nav><a href="/products">Shop</a></nav></details><button>Outside</button>';
    const menu = document.querySelector('details')!;
    const summary = document.querySelector('summary')!;
    mountStorefrontMenu(menu);
    menu.open = true;
    fireEvent(menu, new Event('toggle'));
    expect(summary).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(menu.open).toBe(false);
    menu.open = true;
    document
      .querySelector('a')!
      .addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(document.querySelector('a')!);
    expect(menu.open).toBe(false);
    expect(summary).toHaveFocus();
    menu.open = true;
    fireEvent.focusIn(document.querySelector('button')!);
    expect(menu.open).toBe(false);
  });

  it('reads the authorized vendor cart, updates on matching events and makes no preview requests', async () => {
    vi.mocked(shopCall)
      .mockReset()
      .mockResolvedValue({ cart: { lines: [{ quantity: 3 }] } });
    const { unmount } = render(<VendorCartLink storefrontId="11" />);
    await screen.findByRole('link', { name: 'Cart, 3 items' });
    expect(shopCall).toHaveBeenCalledWith('11', 'cart');
    fireEvent(
      window,
      new CustomEvent('vendor-cart-updated', {
        detail: { storefrontId: '22' },
      }),
    );
    expect(shopCall).toHaveBeenCalledTimes(1);
    vi.mocked(shopCall).mockResolvedValue({
      cart: { lines: [{ quantity: 4 }] },
    });
    fireEvent(
      window,
      new CustomEvent('vendor-cart-updated', {
        detail: { storefrontId: '11' },
      }),
    );
    await screen.findByRole('link', { name: 'Cart, 4 items' });
    unmount();
    document.documentElement.dataset.editorPreview = 'true';
    vi.mocked(shopCall).mockClear();
    render(<VendorCartLink storefrontId="11" />);
    expect(shopCall).not.toHaveBeenCalled();
    delete document.documentElement.dataset.editorPreview;
  });

  it('refreshes again when a cart change arrives during an in-flight count read', async () => {
    let resolveInitial!: (value: unknown) => void;
    vi.mocked(shopCall)
      .mockReset()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitial = resolve;
          }),
      )
      .mockResolvedValue({ cart: { lines: [{ quantity: 5 }] } });
    render(<VendorCartLink storefrontId="11" />);
    fireEvent(
      window,
      new CustomEvent('vendor-cart-updated', {
        detail: { storefrontId: '11' },
      }),
    );
    expect(shopCall).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolveInitial({ cart: { lines: [{ quantity: 2 }] } }),
    );
    await screen.findByRole('link', { name: 'Cart, 5 items' });
    expect(shopCall).toHaveBeenCalledTimes(2);
  });
});
