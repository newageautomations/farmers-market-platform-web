import { describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StorefrontAppearanceSettings } from '../apps/admin/src/StorefrontAppearance';
import {
  defaultStorefrontAppearance,
  storefrontAppearanceSchema,
  storefrontPreviewPath,
  storefrontText,
  vendorAppearanceDefaults,
} from '@market/theme/storefront';
import type { StorefrontAppearanceRecord } from '@market/api';
import { shopCall } from '../apps/storefront/src/components/shop-client';

const token = 'x'.repeat(43),
  url = 'http://preview-vendor.localhost:4321';
function fixture() {
  const record: StorefrontAppearanceRecord = {
    id: '11',
    name: 'Garden Farm',
    version: 3,
    draft: structuredClone(defaultStorefrontAppearance),
    published: null,
    publishedAt: null,
  };
  const api = {
    read: vi.fn(async () => [record]),
    links: vi.fn(async () => []),
    preview: vi.fn(async () => ({
      token,
      url,
      expiresAt: Date.now() + 300000,
    })),
    products: vi.fn(async () => [
      { id: '1', name: 'Fresh produce', slug: 'fresh-produce' },
    ]),
    save: vi.fn(async (_id, _version, config) => ({
      ...record,
      draft: config,
      version: 4,
    })),
    publish: vi.fn(async () => ({
      ...record,
      published: record.draft,
      version: 5,
    })),
  };
  return { record, api };
}
function message(
  frame: HTMLIFrameElement,
  data: object,
  origin = url,
  source = frame.contentWindow,
) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin,
        source,
        data: { protocol: 'storefront-editor-v1', ...data },
      }),
    );
  });
}
describe('visual storefront editor', () => {
  it('retains the last renderable preview when another editor section is temporarily invalid', async () => {
    const { api } = fixture();
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Hero' }));
    const frame = (await screen.findByTitle(
      'Actual storefront preview',
    )) as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    fireEvent.change(screen.getByLabelText('Hero heading'), {
      target: { value: 'Valid heading' },
    });
    await waitFor(() => expect(api.preview).toHaveBeenCalled());
    message(frame, { type: 'ready' });
    await waitFor(() => expect(post).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Hero heading'), {
      target: { value: 'x'.repeat(161) },
    });
    message(frame, { type: 'ready' });
    expect(post.mock.calls.at(-1)?.[0].config.homepage.title).toBe(
      'Valid heading',
    );
    expect(screen.queryByText('Preview unavailable.')).not.toBeInTheDocument();
  });

  it('mounts disclosure settings on demand and reuses icon and palette presentation', async () => {
    const { api } = fixture();
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    const hero = await screen.findByRole('button', { name: 'Hero' });
    expect(hero.tagName).toBe('SUMMARY');
    expect(screen.queryByLabelText('Hero heading')).not.toBeInTheDocument();
    expect(api.products).not.toHaveBeenCalled();
    expect(screen.getByText('Saved draft')).toHaveClass('ui-status-success');
    fireEvent.click(hero);
    fireEvent.change(screen.getByLabelText('Hero heading'), {
      target: { value: 'Fresh today' },
    });
    expect(screen.getByText('Unsaved changes')).toHaveClass('ui-status-danger');
    fireEvent.click(hero);
    expect(screen.queryByLabelText('Hero heading')).not.toBeInTheDocument();
    fireEvent.click(hero);
    expect(screen.getByLabelText('Hero heading')).toHaveValue('Fresh today');
    fireEvent.click(screen.getByRole('button', { name: 'Theme settings' }));
    expect(
      screen
        .getByLabelText('Color palette')
        .querySelectorAll('.ui-palette-swatch'),
    ).toHaveLength(16);
    for (const name of [
      'Desktop',
      'Tablet',
      'Mobile',
      'Reconnect preview',
      'Expand preview',
    ]) {
      const button = screen.getByRole('button', { name });
      expect(button.querySelector('svg')).not.toBeNull();
      expect(button.textContent).toBe('');
    }
    expect(screen.getByRole('button', { name: 'Desktop' })).toHaveClass(
      'button-selection-fill',
    );
    expect(api.products).not.toHaveBeenCalled();
  });
  it('preserves the selected business when returning to the dashboard', async () => {
    const { api } = fixture();
    render(
      <StorefrontAppearanceSettings
        market={false}
        api={api}
        connection={{
          endpoint: 'http://localhost:3000/admin-api',
          channelToken: 'selected-vendor',
          channelId: '42',
        }}
      />,
    );
    expect(
      await screen.findByRole('link', { name: 'Back to dashboard' }),
    ).toHaveAttribute('href', '/vendor?channel=42');
  });
  it('sends unsaved labels and theme settings only to the actual trusted storefront frame', async () => {
    const { api } = fixture();
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    const frame = await screen.findByTitle<HTMLIFrameElement>(
      'Actual storefront preview',
    );
    expect(frame.src).toBe(url + '/storefront-editor-preview/');
    expect(frame.src).not.toContain(token);
    expect(frame.sandbox?.value ?? frame.getAttribute('sandbox')).not.toContain(
      'allow-top-navigation',
    );
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    await waitFor(() => {
      message(frame, { type: 'ready' });
      expect(post).toHaveBeenCalled();
    });
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({
        token,
        path: '/',
        config: defaultStorefrontAppearance,
      }),
      url,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hero' }));
    fireEvent.change(screen.getByLabelText('Primary button label'), {
      target: { value: 'Shop fresh today' },
    });
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            vendor: expect.objectContaining({
              text: { heroPrimaryLabel: 'Shop fresh today' },
            }),
          }),
        }),
        url,
      ),
    );
    expect(api.save).not.toHaveBeenCalled();
    expect(api.publish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Theme settings' }));
    fireEvent.change(screen.getByLabelText('Typography'), {
      target: { value: 'friendly' },
    });
    fireEvent.change(screen.getByLabelText('Color palette'), {
      target: { value: 'blue' },
    });
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          palette: 'blue',
          vendor: expect.objectContaining({ typography: 'friendly' }),
        }),
      }),
      url,
    );
    const count = post.mock.calls.length;
    message(frame, { type: 'ready' }, 'https://untrusted.example');
    message(frame, { type: 'ready' }, url, window);
    expect(post).toHaveBeenCalledTimes(count);
  });
  it('synchronizes click selection, read-only pages, product examples and real viewport widths', async () => {
    const { api } = fixture();
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    const frame = await screen.findByTitle<HTMLIFrameElement>(
      'Actual storefront preview',
    );
    message(frame, { type: 'select', section: 'footer' });
    expect(await screen.findByLabelText('Footer tagline')).toBeInTheDocument();
    message(frame, { type: 'select', section: '__proto__' });
    expect(screen.getByLabelText('Footer tagline')).toBeInTheDocument();
    fireEvent.focus(screen.getByLabelText('Preview page'));
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Product detail' }),
      ).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText('Preview page'), {
      target: { value: 'product' },
    });
    expect(await screen.findByLabelText('Example product')).toHaveValue(
      'fresh-produce',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Related products' }));
    fireEvent.change(screen.getByLabelText('Section heading'), {
      target: { value: 'More from our farm' },
    });
    fireEvent.click(screen.getByLabelText('Show related products'));
    expect(
      screen.getByText(/Product records are managed in Products/),
    ).toBeInTheDocument();
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    message(frame, { type: 'navigate', path: '/checkout' });
    message(frame, { type: 'ready' });
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({
        path: '/products/fresh-produce',
        config: expect.objectContaining({
          vendor: expect.objectContaining({
            relatedEnabled: false,
            text: expect.objectContaining({
              relatedHeading: 'More from our farm',
            }),
          }),
        }),
      }),
      url,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(frame.parentElement).toHaveAttribute('data-viewport', 'mobile');
    fireEvent.click(screen.getByRole('button', { name: 'Tablet' }));
    expect(frame.parentElement).toHaveAttribute('data-viewport', 'tablet');
    expect(frame).not.toHaveAttribute('style');
  });
  it('retains edits after a version conflict, supports undo/redo, and guards business exits', async () => {
    const { api } = fixture();
    api.save.mockRejectedValue(new Error('conflict'));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Hero' }));
    fireEvent.change(screen.getByLabelText('Hero heading'), {
      target: { value: 'An unsaved heading' },
    });
    expect(
      window.dispatchEvent(
        new Event('storefront-editor:before-exit', { cancelable: true }),
      ),
    ).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Hero heading')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByLabelText('Hero heading')).toHaveValue(
      'An unsaved heading',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('Hero heading')).toHaveValue(
      'An unsaved heading',
    );
    expect(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    ).toBeDisabled();
  });
  it('preserves the complete legacy story while adopting vendor theme settings', async () => {
    const { api, record } = fixture();
    record.draft.homepage.story = 'A'.repeat(1800);
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Theme settings' }),
    );
    fireEvent.change(screen.getByLabelText('Typography'), {
      target: { value: 'warm' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        '11',
        3,
        expect.objectContaining({
          homepage: expect.objectContaining({ story: 'A'.repeat(1800) }),
          vendor: expect.objectContaining({ aboutUseLegacyStory: true }),
        }),
      ),
    );
  });
});
it('validates stable text fields and restricts navigation to existing safe templates', () => {
  const config = {
    ...defaultStorefrontAppearance,
    vendor: {
      ...vendorAppearanceDefaults,
      text: { heroPrimaryLabel: 'Pick your harvest' },
    },
  };
  expect(
    storefrontText(
      storefrontAppearanceSchema.parse(config),
      'heroPrimaryLabel',
    ),
  ).toBe('Pick your harvest');
  expect(storefrontText(defaultStorefrontAppearance, 'heroPrimaryLabel')).toBe(
    'Shop the collection',
  );
  for (const text of [
    { arbitrary: 'unsafe' },
    { heroPrimaryLabel: 'a'.repeat(81) },
  ])
    expect(
      storefrontAppearanceSchema.safeParse({
        ...config,
        vendor: { ...config.vendor, text },
      }).success,
    ).toBe(false);
  for (const path of ['/', '/products', '/products/fresh-harvest', '/about'])
    expect(storefrontPreviewPath(path)).toBe(true);
  for (const path of [
    '/checkout',
    '/api/shop',
    '//evil.example',
    '/products/%2e%2e',
    '/products/a%2Fb',
    '/products?token=x',
  ])
    expect(storefrontPreviewPath(path)).toBe(false);
});
it('blocks commerce at the common shop bridge even if an event handler is bypassed', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch');
  document.documentElement.dataset.editorPreview = 'true';
  try {
    await expect(
      shopCall('1', 'add', { variantId: '42', quantity: 1 }),
    ).rejects.toMatchObject({ kind: 'forbidden' });
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    delete document.documentElement.dataset.editorPreview;
  }
});
