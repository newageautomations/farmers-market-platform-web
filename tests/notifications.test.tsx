import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AppError,
  createNotificationsApi,
  type ComplianceSummaryData,
  type NotificationPreferencesData,
  type NotificationsApi,
} from '@market/api';
import { fixtureContexts } from '../apps/admin/src/FixtureAdmin';
import { NotificationPreferences } from '../apps/admin/src/notifications/NotificationPreferences';
import { ComplianceOverview } from '../apps/admin/src/documents/ComplianceOverview';
import { DocumentStatus } from '@market/ui/documents';

const preferences: NotificationPreferencesData = {
  scope: 'vendor',
  vendorId: 1,
  marketId: null,
  channel: 'console',
  revision: 0,
  enabled: {},
  thresholds: [30, 14, 7],
  supported: [
    'documents.request.created',
    'documents.expiring',
    'documents.expired',
  ],
};
const counts = {
  total: 4,
  complete: 1,
  missing: 1,
  pending: 1,
  rejected: 1,
  expired: 0,
  expiringSoon: 1,
  outstandingRequired: 3,
};
const ownerContext = {
  ...fixtureContexts.VENDOR,
  permissions: [
    ...fixtureContexts.VENDOR.permissions,
    'ManageOwnStorefront' as const,
  ],
};
const summary: ComplianceSummaryData = {
  scope: 'vendor',
  totals: counts,
  marketTotals: { ready: 2, incomplete: 3, noRequirements: 1, vendors: 6 },
  library: { expired: 1, expiringSoon: 2 },
  vendorReadiness: [],
  truncated: false,
  markets: [
    { ...counts, market_id: 1, market_name: 'Market A', status: 'Incomplete' },
    { ...counts, market_id: 2, market_name: 'Market B', status: 'Ready' },
  ],
};
function api(): NotificationsApi {
  return {
    upcoming: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    preferences: vi.fn().mockResolvedValue(preferences),
    save: vi.fn().mockResolvedValue({ ...preferences, revision: 1 }),
    summary: vi.fn().mockResolvedValue(summary),
  };
}
describe('Phase 2B notification preferences and dashboard compliance', () => {
  it('saves independent event choices and supported thresholds through labeled checkboxes', async () => {
    const service = api();
    const user = userEvent.setup();
    render(<NotificationPreferences api={service} context={ownerContext} />);
    await user.click(
      await screen.findByRole('checkbox', { name: 'New document requests' }),
    );
    await user.click(screen.getByRole('checkbox', { name: '14 days before' }));
    await user.click(
      screen.getByRole('button', { name: 'Save notification preferences' }),
    );
    expect(service.save).toHaveBeenCalledWith({
      expectedRevision: 0,
      enabled: {
        'documents.request.created': true,
        'documents.expiring': false,
        'documents.expired': false,
      },
      thresholds: [30, 7],
    });
    expect(
      await screen.findByText('Notification preferences saved.'),
    ).toBeVisible();
    expect(screen.getByText(/backend console for testing/)).toBeVisible();
    expect(document.querySelector('select')).toBeNull();
  });
  it('uses keyboard controls, prevents duplicate saves and exposes safe errors', async () => {
    const service = api();
    let reject!: (e: Error) => void;
    vi.mocked(service.save).mockImplementation(
      () =>
        new Promise((_, r) => {
          reject = r;
        }),
    );
    const user = userEvent.setup();
    render(<NotificationPreferences api={service} context={ownerContext} />);
    const checkbox = await screen.findByRole('checkbox', {
      name: 'New document requests',
    });
    checkbox.focus();
    await user.keyboard(' ');
    expect(checkbox).toBeChecked();
    const save = screen.getByRole('button', {
      name: 'Save notification preferences',
    });
    await user.click(save);
    expect(save).toBeDisabled();
    await act(async () => reject(new AppError('conflict')));
    expect(
      await screen.findByText(
        'This information has changed. Refresh and try again.',
      ),
    ).toBeVisible();
    expect(service.save).toHaveBeenCalledTimes(1);
  });
  it('retains read-only staff authority in the preferences form', async () => {
    const service = api();
    render(
      <NotificationPreferences
        api={service}
        context={{
          ...fixtureContexts.VENDOR,
          permissions: ['ReadOwnVendorIdentity'],
        }}
      />,
    );
    expect(
      await screen.findByRole('checkbox', { name: 'New document requests' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save notification preferences' }),
    ).toBeDisabled();
    expect(service.save).not.toHaveBeenCalled();
  });
  it('shows independent Market states and links to their requests without fetching documents or files', async () => {
    const service = api();
    render(<ComplianceOverview api={service} />);
    const table = await screen.findByRole('table', {
      name: 'Document requests by Market',
    });
    expect(within(table).getByText('Incomplete')).toHaveClass(
      'ui-status-danger',
    );
    expect(within(table).getByText('Ready')).toHaveClass('ui-status-success');
    fireEvent.click(
      within(table).getByRole('button', { name: 'Open Market A' }),
    );
    expect(screen.getByRole('link', { name: 'Market A' })).toHaveAttribute(
      'href',
      '/vendor/documents?view=requests&market=1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(
      within(table).getByRole('button', { name: 'Open Market B' }),
    );
    expect(screen.getByRole('link', { name: 'Market B' })).toHaveAttribute(
      'href',
      '/vendor/documents?view=requests&market=2',
    );
    expect(service.summary).toHaveBeenCalledTimes(1);
  });
  it('displays backend Market totals and makes truncated lists explicit', async () => {
    const service = api();
    vi.mocked(service.summary).mockResolvedValue({
      ...summary,
      scope: 'market',
    });
    const view = render(<ComplianceOverview api={service} manager />);
    await screen.findByText('Vendors ready');
    expect(screen.getByText('Vendors incomplete')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Review Vendor compliance' }),
    ).toHaveAttribute('href', '/market/documents?view=requests');
    view.unmount();
    vi.mocked(service.summary).mockResolvedValue({
      ...summary,
      truncated: true,
    });
    render(<ComplianceOverview api={service} />);
    expect(
      await screen.findByText(/Showing a limited Market list/),
    ).toBeVisible();
  });
  it('does not let an old account read populate the replacement preferences view', async () => {
    let resolve!: (v: NotificationPreferencesData) => void;
    const old = api(),
      next = api();
    vi.mocked(old.preferences).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    vi.mocked(next.preferences).mockResolvedValue({
      ...preferences,
      vendorId: 2,
      supported: ['documents.submission.approved'],
    });
    const view = render(
      <NotificationPreferences
        key="vendor-1"
        api={old}
        context={fixtureContexts.VENDOR}
      />,
    );
    view.rerender(
      <NotificationPreferences
        key="vendor-2"
        api={next}
        context={fixtureContexts.VENDOR}
      />,
    );
    await screen.findByRole('checkbox', { name: 'Document approvals' });
    await act(async () => resolve(preferences));
    expect(
      screen.queryByRole('checkbox', { name: 'New document requests' }),
    ).not.toBeInTheDocument();
  });
  it.each([
    ['Ready', 'success'],
    ['Incomplete', 'danger'],
    ['Pending review', 'warning'],
    ['Expiring Soon', 'warning'],
    ['Expired', 'danger'],
    ['Rejected', 'danger'],
    ['Waived', 'neutral'],
    ['No requirements', 'neutral'],
  ])('uses the centralized semantic tone for %s', (status, tone) => {
    render(<DocumentStatus value={status} />);
    expect(screen.getByText(status)).toHaveClass(`ui-status-${tone}`);
  });
  it('binds API reads to the current channel and invalidates authority on denial', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: { ownNotificationPreferences: preferences } }),
        ),
      );
    const revoke = vi.fn();
    const service = createNotificationsApi({
      endpoint: 'http://localhost/admin-api',
      channelToken: 'current-market',
      fetch,
      onAuthorityFailure: revoke,
    });
    await service.preferences();
    expect(
      new Headers(fetch.mock.calls[0]?.[1]?.headers).get('vendure-token'),
    ).toBe('current-market');
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ extensions: { code: 'FORBIDDEN' } }] }),
      ),
    );
    await expect(service.summary()).rejects.toBeInstanceOf(AppError);
    expect(revoke).toHaveBeenCalledOnce();
  });
});
