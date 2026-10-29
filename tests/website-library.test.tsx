import { beforeEach, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { defaultStorefrontAppearance } from '@market/theme/storefront';
import {
  createWebsiteLibraryApi,
  type StorefrontWebsiteRecord,
} from '@market/api';
import {
  WebsiteLibrary,
  websiteEditorHref,
} from '../apps/admin/src/WebsiteLibrary';
import { VisualStorefrontEditor } from '../apps/admin/src/VisualStorefrontEditor';

beforeEach(() => {
  window.history.replaceState({}, '', '/vendor/storefront?channel=7');
});
const connection = {
  endpoint: 'http://localhost:3000/admin-api',
  channelToken: 'vendor',
};
function website(id: string, isLive = false): StorefrontWebsiteRecord {
  return {
    id,
    storefrontId: '24',
    name: `Website ${id}`,
    version: 3,
    draft: structuredClone(defaultStorefrontAppearance),
    published: isLive ? structuredClone(defaultStorefrontAppearance) : null,
    publishedAt: isLive ? '2026-10-01T12:00:00Z' : null,
    templateId: 'harvest',
    templateVersion: 1,
    templateConfig: {},
    isLive,
    publicationVersion: 2,
    updatedAt: '2026-10-24T12:00:00Z',
  };
}
function fixture() {
  const live = website('1', true),
    draft = website('2');
  const library = {
    list: vi.fn(async () => ({
      items: [live, draft],
      live,
      totalItems: 21,
      publicationVersion: 2,
    })),
    read: vi.fn(async (_store: string, id: string) => ({ ...draft, id })),
    create: vi.fn(async () => website('3')),
    change: vi.fn(async (record: StorefrontWebsiteRecord) => record),
    preview: vi.fn(async () => ({
      token: 'x'.repeat(43),
      url: 'http://homepage-vendor.localhost:4321',
      expiresAt: Date.now() + 300000,
    })),
  };
  const appearance = {
    links: vi.fn(async () => [
      {
        id: '24',
        name: 'Vendor',
        url: 'http://homepage-vendor.localhost:4321',
      },
    ]),
    read: vi.fn(async () => []),
    save: vi.fn(),
    publish: vi.fn(),
  };
  return { library, appearance, live, draft };
}

it('shows live and drafts separately, preserves channel selection, and bounds library pages', async () => {
  const f = fixture();
  render(<WebsiteLibrary connection={connection} {...f} />);
  expect(
    await screen.findByRole('region', { name: 'Live Website' }),
  ).toHaveTextContent('Website 1');
  const drafts = screen.getByRole('region', { name: 'Draft Websites' });
  expect(drafts).toHaveTextContent('Website 2');
  expect(drafts).not.toHaveTextContent('Website 1');
  expect(within(drafts).getByRole('link', { name: 'Edit' })).toHaveAttribute(
    'href',
    '/vendor/storefront?channel=7&storefront=24&website=2',
  );
  expect(
    screen.queryByRole('link', { name: 'Preview' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Refresh' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/More actions for/)).not.toBeInTheDocument();
  expect(
    within(drafts).getByRole('button', { name: 'Duplicate' }),
  ).toBeInTheDocument();
  expect(
    within(drafts).getByRole('button', { name: 'Rename' }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole('region', { name: 'Live Website' })).queryByRole(
      'button',
      { name: 'Delete', hidden: true },
    ),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() =>
    expect(f.library.list).toHaveBeenLastCalledWith('24', 20, 20),
  );
});

it('offers only available templates, names the deletion target, and does not delete before confirmation', async () => {
  const f = fixture();
  render(<WebsiteLibrary connection={connection} {...f} />);
  await screen.findByText('Website 2');
  fireEvent.click(screen.getByRole('button', { name: 'New Website' }));
  expect(
    screen.getByRole('option', { name: 'Harvest · Free' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('option', { name: /Modern Farmhouse/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('option', { name: 'Editorial Market · Free' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  const drafts = screen.getByRole('region', { name: 'Draft Websites' });
  fireEvent.click(within(drafts).getByRole('button', { name: 'Delete' }));
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Delete Website 2');
  expect(f.library.change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Delete Website' }));
  await waitFor(() =>
    expect(f.library.change).toHaveBeenCalledWith(f.draft, 'delete', undefined),
  );
});

it('renames only the selected instance and reports mutation errors within the dialog', async () => {
  const f = fixture();
  f.library.change.mockRejectedValueOnce(new Error('Version conflict'));
  render(<WebsiteLibrary connection={connection} {...f} />);
  await screen.findByText('Website 2');
  const drafts = screen.getByRole('region', { name: 'Draft Websites' });
  fireEvent.click(within(drafts).getByRole('button', { name: 'Rename' }));
  fireEvent.change(screen.getByLabelText('Website name'), {
    target: { value: 'Holiday' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  await waitFor(() =>
    expect(f.library.change).toHaveBeenCalledWith(f.draft, 'rename', 'Holiday'),
  );
  await waitFor(() =>
    expect(
      within(screen.getByRole('dialog')).getByRole('alert'),
    ).toBeInTheDocument(),
  );
});

it('loads and previews the requested website instance without using legacy persistence', async () => {
  window.history.replaceState(
    {},
    '',
    '/vendor/storefront?channel=7&storefront=24&website=2&preview=1',
  );
  const f = fixture();
  render(<WebsiteLibrary connection={connection} {...f} />);
  await screen.findByTitle('Actual storefront preview');
  expect(f.library.read).toHaveBeenCalledWith('24', '2');
  expect(f.library.preview).toHaveBeenCalledWith('24', '2');
  expect(f.appearance.read).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Storefront theme')).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Back to Website Library' }),
  ).toHaveAttribute('href', '/vendor/storefront?channel=7&storefront=24');
});

it('remounting the editor for another instance clears unsaved content and undo history', () => {
  const f = fixture();
  const api = { ...f.appearance, preview: undefined };
  const { rerender } = render(
    <VisualStorefrontEditor
      key="a"
      record={f.draft}
      api={api}
      onSaved={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Hero' }));
  const title = screen.getByLabelText('Hero heading');
  fireEvent.change(title, { target: { value: 'Private A copy' } });
  expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  rerender(
    <VisualStorefrontEditor
      key="b"
      record={website('3')}
      api={api}
      onSaved={() => {}}
    />,
  );
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  expect(screen.queryByDisplayValue('Private A copy')).not.toBeInTheDocument();
});

it('sends storefront and instance scope, draft version and publication generation through the admin transport', async () => {
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string);
    return new Response(
      JSON.stringify({
        data: body.query.includes('ChangeWebsite')
          ? { changeStorefrontWebsite: website('2') }
          : { startStorefrontPreview: { token: 'x'.repeat(43) } },
      }),
      { status: 200 },
    );
  });
  const api = createWebsiteLibraryApi({
    ...connection,
    fetch: fetcher as typeof fetch,
  });
  await api.change(website('2'), 'publish');
  const body = JSON.parse(fetcher.mock.calls[0]![1]!.body as string);
  expect(body.variables).toMatchObject({
    storefrontId: '24',
    id: '2',
    version: 3,
    publicationVersion: 2,
    action: 'publish',
  });
  await api.preview('24', '2');
  expect(
    JSON.parse(fetcher.mock.calls[1]![1]!.body as string).variables,
  ).toEqual({ id: '24', websiteId: '2' });
  expect(websiteEditorHref('24', '2')).toContain('channel=7');
});
