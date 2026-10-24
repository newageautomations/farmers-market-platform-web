import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { InboxApi, InboxNotification, InboxSettings } from '@market/api';
import { NotificationCenter } from '@market/ui/notifications';

const rows: InboxNotification[] = [
  {
    id: '1',
    type: 'customer.market.occurrence',
    context: 'customer',
    workspace_id: null,
    source_kind: 'market',
    source_id: 5,
    business_name: 'Your account',
    sender: 'Saturday Market',
    title: 'New market occurrence',
    preview: 'Saturday at the park',
    body: 'Full notification content for Saturday Market.',
    category: 'markets',
    severity: 'informational',
    mandatory: false,
    action_required: false,
    destination: null,
    created_at: '2026-10-17T12:00:00Z',
    read_at: null,
    starred: false,
  },
  {
    id: '2',
    type: 'vendor.market.cancelled',
    context: 'vendor',
    workspace_id: 8,
    source_kind: 'market',
    source_id: 5,
    business_name: 'Honey Vendor',
    sender: 'Saturday Market',
    title: 'Participating market canceled',
    preview: 'Cancellation notice',
    body: 'The occurrence is canceled.',
    category: 'participation',
    severity: 'critical',
    mandatory: true,
    action_required: false,
    destination: '/vendor/markets',
    action_label: 'View Market Relationships',
    destination_kind: 'market-relationships',
    created_at: '2026-10-17T11:00:00Z',
    read_at: null,
    starred: false,
  },
];
const settings: InboxSettings = {
  types: rows.map((n) => ({
    id: n.type,
    name: n.title,
    contexts: [n.context],
    category: n.category,
    severity: n.severity,
    mandatory: n.mandatory,
    status: 'integrated',
    grouping: false,
    reminder: false,
  })),
  affiliations: [
    { id: 8, name: 'Honey Vendor', mode: 'VENDOR', channelId: '10' },
  ],
  rules: [],
  truncated: false,
};
function api(): InboxApi {
  const data = structuredClone(rows);
  return {
    list: vi.fn(async (input = {}) => ({
      items: data.filter((n) => input.state !== 'unread' || !n.read_at),
      totalItems: data.length,
      unread: data.filter((n) => !n.read_at).length,
      skip: 0,
      take: 25,
    })),
    detail: vi.fn(async (id) => data.find((n) => n.id === id)!),
    settings: vi.fn(async () => structuredClone(settings)),
    mutate: vi.fn(async ({ ids, action }) => {
      for (const n of data.filter((n) => ids.includes(n.id))) {
        if (action === 'read') n.read_at = '2026-10-17T15:00:00Z';
        if (action === 'unread') n.read_at = null;
        if (action === 'star') n.starred = true;
      }
      return { changed: ids.length };
    }),
    preference: vi.fn(async () => ({ saved: true })),
  };
}
describe('Unified inbox interaction contracts', () => {
  it('preserves inactive historical messages and their actions without offering subscription controls', async () => {
    const service = api();
    vi.mocked(service.list).mockResolvedValue({
      items: [
        {
          ...rows[0]!,
          delivery_active: false,
          starred: true,
          read_at: '2026-10-17T15:00:00Z',
        },
      ],
      totalItems: 1,
      unread: 0,
      skip: 0,
      take: 25,
    });
    render(<NotificationCenter api={service} />);
    const inbox = await screen.findByRole('list', {
      name: 'Notification inbox',
    });
    expect(within(inbox).getByText('New market occurrence')).toBeVisible();
    expect(
      within(inbox).getAllByRole('button', { name: 'Unstar notification' })[0],
    ).toBeVisible();
    expect(
      within(inbox).queryByRole('button', {
        name: 'Unsubscribe from this source',
      }),
    ).toBeNull();
  });
  it('keeps inactive preference history out of selectable types and resubscribe actions', async () => {
    const service = api();
    vi.mocked(service.settings).mockResolvedValue({
      ...settings,
      types: settings.types.filter((t) => t.mandatory),
      rules: [
        {
          id: '43',
          type: 'customer.market.occurrence',
          type_name: 'New market occurrence',
          delivery_active: false,
          category: null,
          context: 'customer',
          workspace_id: null,
          source_kind: null,
          source_id: null,
          disabled: true,
          muted_until: null,
          revision: 2,
        },
      ],
    });
    render(<NotificationCenter view="settings" api={service} />);
    const select = await screen.findByLabelText('Optional notification type');
    expect(
      within(select).queryByRole('option', { name: /New market occurrence/ }),
    ).toBeNull();
    expect(screen.getByText('Inactive notification type')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'History preserved' }),
    ).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Resubscribe' })).toBeNull();
  });
  it('keeps context text and icons independent of severity and uses authorized descriptive actions', async () => {
    const service = api(),
      user = userEvent.setup();
    render(<NotificationCenter api={service} />);
    const inbox = await screen.findByRole('list', {
      name: 'Notification inbox',
    });
    const vendorBadge = within(inbox).getByText('Vendor');
    expect(vendorBadge).toHaveClass('notification-role-vendor');
    expect(vendorBadge.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(within(inbox).getByText('Customer')).toHaveClass(
      'notification-role-customer',
    );
    await user.click(
      within(inbox).getByRole('button', {
        name: /Participating market canceled.*Cancellation notice/,
      }),
    );
    const dialog = await screen.findByRole('dialog');
    const action = within(dialog).getByRole('link', {
      name: 'View Market Relationships',
    });
    expect(action).toHaveAttribute(
      'href',
      new URL('/vendor/markets?channel=10', location.origin).toString(),
    );
    expect(dialog).not.toHaveTextContent('Open related record');
  });
  it('shows a safe unavailable state when a business affiliation has been revoked', async () => {
    const service = api(),
      user = userEvent.setup();
    vi.mocked(service.settings).mockResolvedValue({
      ...settings,
      affiliations: [],
    });
    render(<NotificationCenter api={service} />);
    const inbox = await screen.findByRole('list', {
      name: 'Notification inbox',
    });
    await user.click(
      within(inbox).getByRole('button', {
        name: /Participating market canceled.*Cancellation notice/,
      }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByRole('link', { name: 'View Market Relationships' }),
    ).toBeNull();
    expect(dialog).toHaveTextContent('destination is currently unavailable');
  });
  it('shares one polling store across bell and inbox and keeps row actions separate', async () => {
    const service = api(),
      user = userEvent.setup();
    render(
      <>
        <NotificationCenter view="bell" api={service} />
        <NotificationCenter api={service} />
      </>,
    );
    const inbox = await screen.findByRole('list', {
      name: 'Notification inbox',
    });
    expect(within(inbox).getByText('Honey Vendor')).toBeVisible();
    await user.click(
      within(inbox).getAllByRole('button', { name: 'Star notification' })[0]!,
    );
    await waitFor(() =>
      expect(service.mutate).toHaveBeenCalledWith({
        ids: ['1'],
        action: 'star',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(
      within(inbox).getByRole('button', {
        name: /New market occurrence.*Saturday at the park/,
      }),
    );
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Full notification content',
    );
    await waitFor(() =>
      expect(service.mutate).toHaveBeenCalledWith({
        ids: ['1'],
        action: 'read',
      }),
    );
  });
  it('selects only visible page IDs for bulk operations', async () => {
    const service = api(),
      user = userEvent.setup();
    render(<NotificationCenter api={service} />);
    await screen.findByRole('list', { name: 'Notification inbox' });
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Select all notifications on this page',
      }),
    );
    await user.click(screen.getByRole('button', { name: /^Delete$/ }));
    await waitFor(() =>
      expect(service.mutate).toHaveBeenCalledWith({
        ids: ['1', '2'],
        action: 'delete',
      }),
    );
  });
  it('explains exact unsubscribe scope and sends stable backend identities', async () => {
    const service = api(),
      user = userEvent.setup();
    render(<NotificationCenter api={service} />);
    const inbox = await screen.findByRole('list', {
      name: 'Notification inbox',
    });
    await user.click(
      within(inbox).getAllByRole('button', {
        name: 'Unsubscribe from this source',
      })[0]!,
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Saturday Market');
    expect(dialog).toHaveTextContent('Customer');
    expect(dialog).toHaveTextContent('required order');
    await user.click(
      within(dialog).getByRole('button', { name: /^Unsubscribe$/ }),
    );
    await waitFor(() =>
      expect(service.preference).toHaveBeenCalledWith({
        type: 'customer.market.occurrence',
        context: 'customer',
        sourceKind: 'market',
        sourceId: 5,
        disabled: true,
        expectedRevision: 0,
      }),
    );
  });
  it('does not offer unsubscribe for mandatory notices', async () => {
    const service = api(),
      user = userEvent.setup();
    render(<NotificationCenter api={service} />);
    const inbox = await screen.findByRole('list', {
      name: 'Notification inbox',
    });
    await user.click(
      within(inbox).getByRole('button', {
        name: /Participating market canceled.*Cancellation notice/,
      }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByRole('button', {
        name: 'Unsubscribe from this source',
      }),
    ).toBeNull();
    expect(dialog).toHaveTextContent('cannot be disabled');
  });
  it('sends server-side filters instead of filtering complete history', async () => {
    const service = api(),
      user = userEvent.setup();
    render(<NotificationCenter api={service} />);
    await screen.findByRole('list', { name: 'Notification inbox' });
    await user.selectOptions(screen.getByLabelText('Receiving role'), 'vendor');
    await waitFor(() =>
      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'vendor', skip: 0, take: 25 }),
      ),
    );
    await user.selectOptions(screen.getByLabelText('Read status'), 'unread');
    await waitFor(() =>
      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'vendor', state: 'unread' }),
      ),
    );
  });
  it('restores exactly one rule and retains broader-rule explanation', async () => {
    const service = api(),
      user = userEvent.setup();
    vi.mocked(service.settings).mockResolvedValue({
      ...settings,
      rules: [
        {
          id: '42',
          type: rows[0]!.type,
          category: null,
          context: 'customer',
          workspace_id: null,
          source_kind: 'market',
          source_id: 5,
          disabled: true,
          muted_until: null,
          revision: 3,
        },
      ],
    });
    render(<NotificationCenter view="unsubscribed" api={service} />);
    await user.click(
      await screen.findByRole('button', { name: 'Resubscribe' }),
    );
    await waitFor(() =>
      expect(service.preference).toHaveBeenCalledWith({
        id: '42',
        expectedRevision: 3,
        remove: true,
      }),
    );
    expect(
      screen.getByText(/broader category, type and workspace rules/),
    ).toBeVisible();
  });
});
