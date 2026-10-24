import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { MarketDayChecklist } from '@market/api';
import type { MarketService } from '../apps/admin/src/market/service';
import { ReadinessChecklist } from '../apps/admin/src/market/ReadinessChecklist';
import { visibleNavigation, type AdminContext } from '@market/admin-core';

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
  it('displays authoritative counts and resolution links and refreshes resolved source facts', async () => {
    const user = userEvent.setup(),
      checklist = vi
        .fn()
        .mockResolvedValueOnce(data)
        .mockResolvedValue({
          ...data,
          items: [
            {
              ...data.items[0],
              count: 0,
              status: 'No outstanding requirements',
            },
          ],
        });
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
    await user.click(screen.getByRole('button', { name: 'Refresh checklist' }));
    expect(
      await screen.findByText('No outstanding requirements'),
    ).toBeVisible();
    expect(checklist).toHaveBeenCalledTimes(2);
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
          (item) => item.path === '/notifications',
        ),
      ).toHaveLength(1);
    },
  );
});
