import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ApplicationSubmissions } from '../apps/admin/src/market/phase14/ApplicationSubmissions';
import { ApplicationReview } from '../apps/admin/src/market/phase14/ApplicationReview';
import { ApplicationOnboarding } from '../packages/ui/src/ApplicationOnboarding';
import { ApplicantApplications } from '../packages/ui/src/ApplicantApplications';
import { managerData } from './fixtures/market-dashboard-data';
import { applicationReviewApi } from './fixtures/application-review-api';
import type { ApplicantApplicationsApi } from '@market/api';

afterEach(cleanup);
it('requests the next server page and returns to the previous page', async () => {
  const data = managerData(),
    api = applicationReviewApi(data);
  api.read.mockImplementation(async (_section, _occurrence, input) => ({
    ...data,
    applicationPage: {
      items: [{ id: 1, businessName: 'Orchard Farm', status: 'SUBMITTED' }],
      totalItems: 42,
      skip: input?.skip ?? 0,
      take: 20,
      templates: [],
      categories: [],
      dates: [],
    },
  }));
  render(
    <ApplicationSubmissions
      api={api}
      data={data}
      run={vi.fn()}
      canManage
      canConfirmDates={false}
      canBilling={false}
      canRequestDocuments={false}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
  await waitFor(() =>
    expect(api.read).toHaveBeenLastCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ skip: 20 }),
    ),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Previous' }));
  await waitFor(() =>
    expect(api.read).toHaveBeenLastCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ skip: 0 }),
    ),
  );
});
it('queries filters and pagination on the server, resets them and loads only the selected details', async () => {
  const data = managerData(),
    api = applicationReviewApi(data);
  const pageRead = api.read;
  render(
    <ApplicationSubmissions
      api={api}
      data={data}
      run={vi.fn()}
      canManage
      canConfirmDates={false}
      canBilling={false}
      canRequestDocuments={false}
    />,
  );
  await screen.findByRole('button', { name: 'Open Orchard Farm' });
  expect(pageRead.mock.calls.every((c) => c[2]?.mode === 'PAGE')).toBe(true);
  expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(
    ['Business', 'Status'],
  );
  fireEvent.change(screen.getByLabelText('Search applications'), {
    target: { value: 'alex@example.invalid' },
  });
  await waitFor(() =>
    expect(pageRead).toHaveBeenLastCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ search: 'alex@example.invalid', skip: 0 }),
    ),
  );
  fireEvent.click(screen.getByText('Filters'));
  fireEvent.focus(screen.getByRole('combobox', { name: 'Application status' }));
  fireEvent.click(screen.getByRole('option', { name: 'Waitlisted' }));
  await waitFor(() =>
    expect(pageRead).toHaveBeenLastCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ status: 'WAITLISTED' }),
    ),
  );
  fireEvent.change(screen.getByLabelText('Application template'), {
    target: { value: '1' },
  });
  fireEvent.change(screen.getByLabelText('Vendor category'), {
    target: { value: 'Produce' },
  });
  fireEvent.change(screen.getByLabelText('Requested market date'), {
    target: { value: '101' },
  });
  fireEvent.change(screen.getByLabelText('Sort applications'), {
    target: { value: 'BUSINESS' },
  });
  await waitFor(() =>
    expect(pageRead).toHaveBeenLastCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({
        templateId: 1,
        category: 'Produce',
        occurrenceId: 101,
        sort: 'BUSINESS',
      }),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await waitFor(() =>
    expect(pageRead).toHaveBeenLastCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({
        search: 'alex@example.invalid',
        status: '',
        sort: 'NEWEST',
        skip: 0,
      }),
    ),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Open Orchard Farm' }),
  );
  await waitFor(() =>
    expect(pageRead).toHaveBeenCalledWith('APPLICATIONS', undefined, {
      mode: 'DETAIL',
      submissionId: 1,
    }),
  );
  await screen.findByRole('region', { name: 'Original submitted answers' });
});
it('separates private notes from submitted answers, date requests and information requests', () => {
  const data = managerData(),
    s = { ...data.submissions![0]!, managerNotes: 'Private trial note' };
  render(
    <ApplicationReview
      submission={s}
      data={data}
      run={vi.fn()}
      canManage
      onSaved={vi.fn()}
      onBusy={vi.fn()}
    />,
  );
  expect(
    screen.getByLabelText('Private Manager Notes and decision reason'),
  ).toHaveValue('Private trial note');
  expect(
    screen.getByText(
      /Applicants cannot see these notes or the private decision reason/,
    ),
  ).toBeTruthy();
  expect(screen.getByLabelText('Original submitted answers')).toBeTruthy();
  expect(screen.getByLabelText('Requested dates and rentals')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Application status'), {
    target: { value: 'ACCEPTED' },
  });
  expect(
    screen.getByRole('combobox', { name: 'Existing Market Business' }),
  ).toBeTruthy();
  expect(
    screen.getByText(/Choose an existing market business record/),
  ).toBeTruthy();
});
it('presents actual independent onboarding states and only supplied authorized links', () => {
  render(
    <ApplicationOnboarding
      summary={{
        platformVendorId: 9,
        membershipStatus: 'pending',
        consentVerified: false,
        steps: [
          {
            key: 'accepted',
            label: 'Application acceptance',
            state: 'Complete',
            detail: 'Accepted independently.',
            href: null,
          },
          {
            key: 'membership',
            label: 'Market membership',
            state: 'Pending review',
            detail: 'Waiting for review.',
            href: '/vendor/markets/1?channel=2',
          },
          {
            key: 'booth',
            label: 'Booth assignment',
            state: 'Action needed',
            detail: 'No booth assigned.',
            href: null,
          },
        ],
      }}
    />,
  );
  expect(screen.getByText('Complete')).toBeTruthy();
  expect(screen.getByText('Pending review')).toBeTruthy();
  expect(screen.getByText('Action needed')).toBeTruthy();
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    '/vendor/markets/1?channel=2',
  );
});
it('renders vendor next steps without a manager note field or manager actions', async () => {
  const data = managerData(),
    s = data.submissions![0]!;
  const api = {
    read: vi.fn().mockResolvedValue({
      id: 1,
      marketId: 1,
      marketName: 'Test Market',
      name: 'Seasonal application',
      status: 'ACCEPTED',
      definition: s.definitionSnapshot,
      answers: s.answers,
      rentalRequests: [],
      dates: [],
      history: [],
      canWithdraw: false,
      vendorId: 9,
      vendorChannelId: '2',
      onboarding: {
        platformVendorId: 9,
        membershipStatus: null,
        consentVerified: false,
        steps: [
          {
            key: 'membership',
            label: 'Market membership',
            state: 'Not started',
            detail: 'Complete your market membership request to continue.',
            href: '/vendor/markets/1?channel=2',
          },
        ],
      },
    }),
    command: vi.fn(),
  } as unknown as ApplicantApplicationsApi;
  render(
    <ApplicantApplications
      api={api}
      id={1}
      basePath="/vendor/applications"
      vendorOrigin=""
    />,
  );
  const section = await screen.findByLabelText('Next steps after acceptance');
  expect(within(section).getByRole('link')).toHaveAttribute(
    'href',
    '/vendor/markets/1?channel=2',
  );
  expect(screen.queryByText('Private Manager Notes')).toBeNull();
  expect(screen.queryByText('Accept business')).toBeNull();
});

it('keeps quick views and additional filters synchronized and closes the card', async () => {
  const data = managerData(),
    api = applicationReviewApi(data);
  render(
    <ApplicationSubmissions
      api={api}
      data={data}
      run={vi.fn()}
      canManage
      canConfirmDates={false}
      canBilling={false}
      canRequestDocuments={false}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'To review' }));
  await waitFor(() =>
    expect(api.read).toHaveBeenCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ quickView: 'REVIEW', skip: 0 }),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Awaiting vendor' }));
  await waitFor(() =>
    expect(api.read).toHaveBeenCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ quickView: 'VENDOR' }),
    ),
  );
  fireEvent.click(screen.getByText('Filters'));
  const card = screen
    .getByText('Filter applications', { selector: 'summary' })
    .closest('details')!;
  fireEvent.focus(screen.getByRole('combobox', { name: 'Application status' }));
  expect(screen.getAllByRole('option')[0]).toHaveTextContent('All statuses');
  expect(screen.queryByRole('button', { name: 'All statuses' })).toBeNull();
  expect(
    screen.queryByRole('heading', { name: 'Filter applications' }),
  ).toBeNull();
  const option = screen.getByRole('option', { name: 'Accepted' });
  expect(option.querySelector('.ui-status-success')).toBeTruthy();
  fireEvent.click(option);
  expect(
    await screen.findByRole('button', { name: 'Remove Accepted' }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(card.open).toBe(true);
  expect(card.closest('.application-filter-closing')).toBeTruthy();
  await waitFor(() => expect(card.open).toBe(false));
  fireEvent.click(screen.getByText('Filters (1)'));
  expect(card.open).toBe(true);
  fireEvent.click(screen.getByText('Filters (1)'));
  expect(card.open).toBe(true);
  await waitFor(() => expect(card.open).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Accepted' }));
  await waitFor(() =>
    expect(api.read).toHaveBeenLastCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ quickView: 'VENDOR', status: '' }),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  await waitFor(() =>
    expect(api.read).toHaveBeenLastCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ quickView: 'ALL' }),
    ),
  );
});
