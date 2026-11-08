import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ApplicantApplicationDetail,
  ApplicantApplicationsApi,
} from '@market/api';
import { VendorApplicationDetail } from '../apps/admin/src/vendor/application-detail';

afterEach(() => window.history.replaceState(null, '', '/'));

const base: ApplicantApplicationDetail = {
  id: 4,
  revision: 2,
  status: 'SUBMITTED',
  vendorId: 7,
  vendorChannelId: '9',
  marketId: 2,
  marketName: 'Boerne Farmers Market',
  city: 'Boerne',
  state: 'TX',
  name: 'Boerne Market v1',
  slug: 'boerne',
  origin: 'https://market.example',
  current: true,
  createdAt: '2026-10-17T21:02:17.044Z',
  definition: {
    schedule: { timeZone: 'America/Chicago' },
    sections: ['Business'],
    questions: [
      {
        id: 'businessName',
        label: 'Business name',
        type: 'SHORT_TEXT',
        section: 'Business',
        required: true,
      },
      {
        id: 'website',
        label: 'Website',
        type: 'URL',
        section: 'Business',
        required: false,
      },
    ],
    occurrenceIds: [5],
    rentalIds: [],
  } as ApplicantApplicationDetail['definition'],
  answers: { businessName: 'Manna Roots' },
  rentalRequests: [
    {
      optionId: 1,
      quantity: 2,
      unitMinor: 1500,
      currency: 'USD',
      name: 'Extra table',
      requiredAmenity: null,
    },
  ],
  dates: [
    {
      id: 5,
      startsAt: '2026-10-24T14:00:00.000Z',
      venue: '',
      status: 'scheduled',
      decision: 'CONFIRMED',
    },
  ],
  documentation: {
    total: 1,
    complete: 0,
    missing: 0,
    pending: 0,
    rejected: 0,
    expired: 1,
    expiringSoon: 0,
    outstandingRequired: 1,
    outstanding: ['General Liability Insurance'],
    status: 'Incomplete',
  },
  history: [
    { at: '2026-10-17T21:02:17.044Z', event: 'SUBMITTED', status: 'SUBMITTED' },
    {
      at: '2026-10-18T15:00:00.000Z',
      event: 'APPLICATION_DATE_DECISION_CHANGED',
      status: 'CONFIRMED',
      occurrenceId: 5,
    },
  ],
  canWithdraw: true,
};
const apiFor = (detail: ApplicantApplicationDetail) =>
  ({
    read: vi.fn().mockResolvedValue(detail),
    command: vi.fn().mockResolvedValue({}),
  }) as unknown as ApplicantApplicationsApi & {
    read: ReturnType<typeof vi.fn>;
    command: ReturnType<typeof vi.fn>;
  };

describe('VendorApplicationDetail', () => {
  it('presents submitted answers, dates, rentals, compliance and newest-first history', async () => {
    const api = apiFor(base);
    render(<VendorApplicationDetail api={api} id={4} vendorId={7} />);
    expect(
      await screen.findByRole('heading', {
        name: 'Boerne Farmers Market application',
      }),
    ).toBeTruthy();
    expect(api.read).toHaveBeenCalledWith({ id: 4, vendorId: 7 });
    const answers = screen.getByRole('region', {
      name: 'Submitted information',
    });
    expect(within(answers).getByText('Manna Roots')).toBeTruthy();
    // Optional unanswered questions stay hidden.
    expect(within(answers).queryByText('Website')).toBeNull();
    const dates = screen.getByRole('region', { name: 'Requested dates' });
    expect(within(dates).getByText('Confirmed')).toBeTruthy();
    const rentals = screen.getByRole('region', {
      name: 'Requested rental items',
    });
    expect(within(rentals).getByText('Extra table')).toBeTruthy();
    expect(within(rentals).getByText('$15.00 each')).toBeTruthy();
    const compliance = screen.getByRole('region', {
      name: 'Document compliance',
    });
    expect(
      within(compliance).getByText('General Liability Insurance'),
    ).toBeTruthy();
    expect(
      within(compliance)
        .getByRole('link', { name: /View document requests/ })
        .getAttribute('href'),
    ).toBe('/vendor/documents?view=requests&market=2&channel=9');
    expect(
      within(compliance)
        .getByRole('link', { name: /Open document library/ })
        .getAttribute('href'),
    ).toBe('/vendor/documents?channel=9');
    const history = within(
      screen.getByRole('region', { name: 'Application history' }),
    ).getAllByRole('listitem');
    expect(history[0].textContent).toContain('Market date confirmed');
    expect(history[1].textContent).toContain('Application submitted');
    expect(
      screen
        .getByRole('link', { name: /Back to all applications/ })
        .getAttribute('href'),
    ).toBe('/vendor/applications?channel=9');
    expect(
      screen
        .getAllByRole('link', { name: /Visit market/ })[0]
        .getAttribute('target'),
    ).toBe('_blank');
  });

  it('withdraws with the current revision only after confirmation', async () => {
    const api = apiFor(base);
    render(<VendorApplicationDetail api={api} id={4} vendorId={7} />);
    fireEvent.click(
      (
        await screen.findAllByRole('button', { name: 'Withdraw application' })
      )[0],
    );
    expect(api.command).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Withdraw application' }),
    );
    await waitFor(() =>
      expect(api.command).toHaveBeenCalledWith('WITHDRAW', {
        id: 4,
        revision: 2,
        cancelInformationRequests: true,
      }),
    );
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2));
  });

  it('hides withdrawal when the backend does not allow it and links accepted next steps', async () => {
    render(
      <VendorApplicationDetail
        api={apiFor({ ...base, status: 'ACCEPTED', canWithdraw: false })}
        id={4}
        vendorId={7}
      />,
    );
    expect(
      await screen.findByRole('link', { name: /Booth assignments/ }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Withdraw application' }),
    ).toBeNull();
  });
});
