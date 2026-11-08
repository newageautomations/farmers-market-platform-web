import { routeAllowed } from '@market/admin-core';
import {
  waitFor,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Applications } from '../apps/admin/src/market/phase14/Applications';
import { managerData } from './fixtures/market-dashboard-data';
import { applicationReviewApi } from './fixtures/application-review-api';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});
function setup(path = '/market/application-submissions') {
  const data = managerData();
  data.submissions!.push({
    ...structuredClone(data.submissions![0]!),
    id: 2,
    applicant: {
      ...data.submissions![0]!.applicant,
      businessName: 'Second business',
      email: 'second@example.test',
    },
  });
  const api = applicationReviewApi(data);
  const run = vi.fn(async () => ({ id: 1 }));
  const view = render(
    <Applications
      api={{
        ...api,
        read: (section, occurrence, input) =>
          api.read(
            section,
            occurrence,
            input?.mode === 'SCHEDULE' ? undefined : input,
          ),
      }}
      data={data}
      run={run}
      canManage
      view="submissions"
      path={path}
    />,
  );
  return { ...view, api, run };
}

test('submission rows select a side preview and Open navigates to the review route', async () => {
  setup();
  const table = await screen.findByRole('table', {
    name: 'Application submissions',
  });
  const preview = screen.getByRole('region', { name: 'Submission details' });
  expect(await within(preview).findByText('Orchard Farm')).toBeVisible();
  const second = within(table).getByText('Second business').closest('tr')!;
  second.focus();
  fireEvent.keyDown(second, { key: 'Enter' });
  expect(await within(preview).findByText('second@example.test')).toBeVisible();
  fireEvent.click(
    within(table).getByRole('link', { name: 'Open Second business' }),
  );
  expect(window.location.pathname).toBe('/market/application-submissions/2');
  expect(
    screen.queryByRole('region', { name: 'Original submitted answers' }),
  ).toBeNull();
});

test('filters keep their disclosure behavior with the select presentation', async () => {
  const { api } = setup();
  await screen.findByRole('table', { name: 'Application submissions' });
  const trigger = screen.getByRole('button', { name: 'Filters' });
  expect(trigger).toHaveClass('submission-filter-trigger');
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  fireEvent.change(screen.getByLabelText('Vendor category'), {
    target: { value: 'Produce' },
  });
  await waitFor(() =>
    expect(api.read).toHaveBeenCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ mode: 'PAGE', category: 'Produce', skip: 0 }),
    ),
  );
});

test('submission detail uses its own page and protects unsaved review notes', async () => {
  setup('/market/application-submissions/1');
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Orchard Farm' }),
  ).toBeVisible();
  expect(screen.queryByRole('navigation', { name: 'Applications' })).toBeNull();
  expect(screen.queryByRole('table', { name: 'Your applications' })).toBeNull();
  expect(
    screen.getByRole('region', { name: 'Submitted information' }),
  ).toBeVisible();
  expect(
    screen.getByRole('region', { name: 'Application decision' }),
  ).toBeVisible();
  const notes = screen.getByLabelText(
    'Private Manager Notes and decision reason',
  );
  fireEvent.change(notes, { target: { value: 'Unsaved note' } });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(
    screen.getByRole('link', { name: 'Back to submitted applications' }),
  );
  expect(confirm).toHaveBeenCalled();
  expect(window.location.pathname).toBe('/');
  expect(notes).toHaveValue('Unsaved note');
  confirm.mockReturnValue(true);
  fireEvent.click(
    screen.getByRole('link', { name: 'Back to submitted applications' }),
  );
  expect(window.location.pathname).toBe('/market/application-submissions');
});

test('legacy notification submission links open the same detail presentation', async () => {
  window.history.replaceState(
    null,
    '',
    '/market/application-submissions?submission=1&channel=42',
  );
  setup();
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Orchard Farm' }),
  ).toBeVisible();
});

test('submission detail routes require the existing application read permission', () => {
  const context = {
    scope: 'MARKET' as const,
    source: 'fixture' as const,
    name: 'Market',
    permissions: ['ReadOwnMarket', 'ReadOwnMarketApplications'] as const,
  };
  expect(routeAllowed(context, '/market/application-submissions/2')).toBe(true);
  expect(
    routeAllowed(
      { ...context, permissions: ['ReadOwnMarket'] },
      '/market/application-submissions/2',
    ),
  ).toBe(false);
  expect(
    routeAllowed(context, '/market/application-submissions/not-an-id'),
  ).toBe(false);
});
