import { render, screen, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { MarketDayChecklist } from '@market/api';
import type { MarketService } from '../apps/admin/src/market/service';
import { ReadinessChecklist } from '../apps/admin/src/market/ReadinessChecklist';
import {
  canonicalNotificationsPath,
  isLegacyNotificationsPath,
  notificationsBase,
  notificationsView,
  routeAllowed,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';

const data: MarketDayChecklist = {
  occurrenceId: '7',
  market: 'Saturday Market',
  status: 'today',
  localDate: '2026-10-17',
  today: '2026-10-17',
  timezone: 'America/Chicago',
  generatedAt: '2026-10-17T12:00:00Z',
  items: [
    {
      title: 'Required Vendor documents',
      status: 'Needs attention',
      count: 2,
      explanation: 'Two Vendors have outstanding requirements.',
      href: '/market/documents?view=reports&occurrence=7',
      action: 'Review Documents',
    },
  ],
};
describe('Live Market readiness checklist', () => {
  it('displays authoritative counts and resolution links without a page refresh button', async () => {
    const checklist = vi.fn().mockResolvedValue(data);
    const service = {
      readKey: 'test-market',
      checklist,
    } as unknown as MarketService;
    render(<ReadinessChecklist service={service} occurrenceId="7" />);
    expect(await screen.findByText('Needs attention (2)')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Review Documents' }),
    ).toHaveAttribute('href', '/market/documents?view=reports&occurrence=7');
    expect(screen.queryByRole('checkbox')).toBeNull();
    // Refreshing is the AdminShell workspace refresh, which remounts the page.
    expect(screen.queryByRole('button', { name: /refresh/i })).toBeNull();
    expect(checklist).toHaveBeenCalledTimes(1);
  });
  it('groups resolved items as on track and shows the all-clear only for sourced dates', async () => {
    const service = {
      readKey: 'resolved-market',
      checklist: vi.fn().mockResolvedValue({
        ...data,
        items: [
          {
            ...data.items[0],
            count: 0,
            status: 'No outstanding requirements',
          },
        ],
      }),
    } as unknown as MarketService;
    render(<ReadinessChecklist service={service} occurrenceId="7" />);
    expect(
      await screen.findByText('No outstanding requirements'),
    ).toBeVisible();
    expect(
      screen.getByText('Nothing needs attention for this date right now.'),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: /On track/ })).toBeVisible();
  });
  it('does not present canceled requirements as complete', async () => {
    const service = {
      readKey: 'canceled-market',
      checklist: vi
        .fn()
        .mockResolvedValue({ ...data, status: 'canceled', items: [] }),
    } as unknown as MarketService;
    render(<ReadinessChecklist service={service} occurrenceId="7" />);
    expect(
      await screen.findByText(/This occurrence is canceled/),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Review Documents' })).toBeNull();
  });
  it('preserves denied-read handling without rendering stale private facts', async () => {
    const service = {
      readKey: 'denied-market',
      checklist: vi.fn().mockRejectedValue(new Error('Denied')),
    } as unknown as MarketService;
    render(<ReadinessChecklist service={service} occurrenceId="7" />);
    await waitFor(() =>
      expect(screen.queryByText('Saturday Market')).toBeNull(),
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Market Day Checklist' }),
      ).queryByRole('link'),
    ).toBeNull();
  });
});
describe('Permanent unified Notifications navigation', () => {
  it.each(['VENDOR', 'MARKET', 'PLATFORM'] as const)(
    'is visible exactly once in %s mode without a business permission',
    (scope) => {
      const context = {
        scope,
        name: 'Test workspace',
        permissions: [],
        source: 'backend',
      } as AdminContext;
      expect(
        visibleNavigation(context).filter(
          (item) => item.label === 'Notifications',
        ),
      ).toEqual([
        expect.objectContaining({
          path: `/${scope.toLowerCase()}/notifications`,
        }),
      ]);
    },
  );
  it.each(['VENDOR', 'MARKET', 'PLATFORM'] as const)(
    'keeps %s notification routes under the role so a refresh keeps the role',
    (scope) => {
      const base = `/${scope.toLowerCase()}/notifications`;
      const context = {
        scope,
        name: 'Test workspace',
        permissions: [],
        source: 'backend',
      } as AdminContext;
      expect(notificationsBase(scope)).toBe(base);
      for (const [suffix, view] of [
        ['', 'inbox'],
        ['/trash', 'trash'],
        ['/settings', 'settings'],
        ['/unsubscribed', 'unsubscribed'],
      ] as const) {
        expect(notificationsView(scope, base + suffix)).toBe(view);
        expect(routeAllowed(context, base + suffix)).toBe(true);
        expect(
          canonicalNotificationsPath(scope, `/notifications${suffix}`),
        ).toBe(base + suffix);
      }
      expect(isLegacyNotificationsPath('/notifications/settings')).toBe(true);
      expect(isLegacyNotificationsPath(base)).toBe(false);
      expect(canonicalNotificationsPath(scope, '/notifications/other')).toBe(
        null,
      );
    },
  );
});
