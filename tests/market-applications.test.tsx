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
  ApplicantApplicationRow,
  ApplicantApplicationsApi,
  ApplicantDraftDetail,
} from '@market/api';
import { VendorDraftPreview } from '../apps/admin/src/vendor/application-continuation';
import type { VendorService } from '../apps/admin/src/vendor/service';
import {
  FindMarketApplications,
  MarketApplicationRecords,
} from '../apps/admin/src/vendor/MarketApplications';
import {
  applicationNextStep,
  localVendorDestination,
  readAllMarketApplications,
  safeMarketApplicationUrl,
  type DiscoverableMarket,
  type MarketDiscoveryApi,
} from '../apps/admin/src/vendor/market-applications-data';

afterEach(() => window.history.replaceState(null, '', '/'));
const row = (id: number, status = 'SUBMITTED'): ApplicantApplicationRow => ({
  id,
  status,
  vendorId: 4,
  vendorChannelId: 'vendor-channel',
  marketId: id,
  marketName: `Market ${id}`,
  name: 'Vendor application',
  slug: 'vendors',
  origin: 'https://market.example',
  current: true,
  city: 'Austin',
  state: 'TX',
  createdAt: `2026-10-${String(id).padStart(2, '0')}T15:00:00Z`,
});
const detail = (row: ApplicantApplicationRow): ApplicantApplicationDetail => ({
  ...row,
  vendorId: 4,
  definition: { sections: [], questions: [], occurrenceIds: [], rentalIds: [] },
  answers: {},
  rentalRequests: [],
  dates: [],
  history: [],
  canWithdraw: true,
});
function apiFor(
  rows: ApplicantApplicationRow[],
  details = new Map<number, ApplicantApplicationDetail>(),
) {
  return {
    read: vi.fn(async (input = {}) =>
      'id' in input
        ? (details.get(input.id as number) ??
          detail(rows.find((r) => r.id === input.id)!))
        : {
            vendorId: 4,
            vendorChannelId: 'vendor-channel',
            drafts: rows.filter((r) => r.status === 'DRAFT'),
            items: rows.filter((r) => r.status !== 'DRAFT'),
            totalItems: rows.filter((r) => r.status !== 'DRAFT').length,
            skip: 0,
          },
    ),
    command: vi.fn(),
  } as unknown as ApplicantApplicationsApi;
}
function discovery() {
  const markets: DiscoverableMarket[] = Array.from({ length: 23 }, (_, i) => ({
    id: String(i),
    name: `Discover market ${i}`,
    city: i % 2 ? 'Boerne' : 'Austin',
    state: 'TX',
    website: 'https://market.example',
    applyUrl: 'https://market.example/apply/vendors',
    nextMarket: {
      startsAt: '2026-11-15T15:00:00Z',
      timezone: 'America/Chicago',
    },
    deadline: null,
  }));
  const api: MarketDiscoveryApi = {
    cities: vi.fn(async () => [
      { value: 'Austin, TX', label: 'Austin, TX' },
      { value: 'Boerne, TX', label: 'Boerne, TX' },
    ]),
    search: vi.fn(async ({ search, city, skip, take }) => {
      const filtered = markets.filter(
        (m) =>
          (!city || `${m.city}, ${m.state}` === city) &&
          m.name.includes(search),
      );
      return {
        items: filtered.slice(skip, skip + take),
        totalItems: filtered.length,
      };
    }),
  };
  return api;
}

describe('market discovery UI contract', () => {
  it('expands three results to ten and paginates in place with the requested columns', async () => {
    const api = discovery();
    render(<FindMarketApplications api={api} />);
    let table = await screen.findByRole('table', {
      name: 'Markets accepting applications',
    });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual([
      'Market',
      'Location',
      'Next market',
      'Application deadline',
      'Actions',
    ]);
    expect(
      within(table).getAllByRole('link', { name: 'Apply' })[0],
    ).toHaveAttribute('href', 'https://market.example/apply/vendors');
    const path = window.location.href;
    fireEvent.click(screen.getByRole('button', { name: 'View more markets' }));
    table = await screen.findByRole('table', {
      name: 'Markets accepting applications',
    });
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Discover market 10');
    expect(api.search).toHaveBeenLastCalledWith({
      search: '',
      city: '',
      skip: 10,
      take: 10,
    });
    expect(window.location.href).toBe(path);
  });
  it('lists only supplied market cities and resets pagination on city selection', async () => {
    const api = discovery();
    render(<FindMarketApplications api={api} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'View more markets' }),
    );
    await screen.findByRole('button', { name: 'Next' });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Discover market 10');
    const location = screen.getByRole('combobox', { name: 'Location' });
    await waitFor(() =>
      expect(
        within(location)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['All locations', 'Austin, TX', 'Boerne, TX']),
    );
    fireEvent.change(location, { target: { value: 'Boerne, TX' } });
    await waitFor(() =>
      expect(api.search).toHaveBeenLastCalledWith({
        search: '',
        city: 'Boerne, TX',
        skip: 0,
        take: 10,
      }),
    );
    expect(api.cities).toHaveBeenCalledTimes(1);
  });
  it('does not manufacture discoverable markets when the endpoint is missing', () => {
    render(<FindMarketApplications />);
    expect(
      screen.getByText('Market search is not available yet'),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('application records and next actions', () => {
  it.each([true, false])(
    'opens saved draft answers with truthful current-form guidance: %s',
    async (current) => {
      const saved: ApplicantDraftDetail = {
        vendor: { id: 4, channelId: 'vendor-channel', name: 'Vendor' },
        definition: {
          sections: [],
          questions: [],
          occurrenceIds: [],
          rentalIds: [],
        },
        marketId: 1,
        current,
        origin: 'https://market.example',
        marketName: 'Market',
        name: 'Vendor application',
        application: null,
        draft: {
          id: 8,
          revision: 1,
          templateVersionId: 3,
          vendorId: 4,
          updatedAt: '2026-11-01T12:00:00Z',
          progress: { answers: {}, occurrenceIds: [], rentals: [] },
        },
      };
      const service = {
        vendorId: '4',
        applications: { read: vi.fn(async () => saved) },
      } as unknown as VendorService;
      render(<VendorDraftPreview service={service} id={8} />);
      await screen.findByText('Vendor application at Market');
      if (current) {
        expect(
          screen.getByRole('link', { name: 'Complete application' }),
        ).toHaveAttribute(
          'href',
          'https://market.example/vendor/application-continue?draft=8&vendor=4&channel=vendor-channel',
        );
        expect(
          screen.queryByText(/This form changed or was retired/),
        ).not.toBeInTheDocument();
      } else {
        expect(
          screen.getByText(/This form changed or was retired/),
        ).toBeVisible();
        expect(
          screen.queryByRole('link', { name: 'Complete application' }),
        ).not.toBeInTheDocument();
      }
      expect(service.applications!.read).toHaveBeenCalledWith({
        draftId: 8,
        vendorId: 4,
      });
    },
  );

  it('retains draft discard behind confirmation with the saved revision', async () => {
    const command = vi.fn(async () => ({}));
    const service = {
      vendorId: '4',
      applications: {
        command,
        read: vi.fn(async () => ({
          vendor: { id: 4, channelId: 'channel' },
          current: false,
          name: 'Saved draft',
          marketName: 'Market',
          definition: {
            sections: [],
            questions: [],
            occurrenceIds: [],
            rentalIds: [],
          },
          draft: { id: 8, revision: 3, progress: { answers: {} } },
        })),
      },
    } as unknown as VendorService;
    render(<VendorDraftPreview service={service} id={8} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Discard draft' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Discard draft?' });
    expect(command).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Keep application' }),
    );
    expect(command).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Discard draft',
      }),
    );
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('DISCARD_DRAFT', {
        id: 8,
        revision: 3,
        cancelInformationRequests: true,
      }),
    );
  });
  it('shows the requested columns and navigates to actual information and onboarding steps without commands', async () => {
    const accepted = row(2, 'ACCEPTED'),
      needsInfo = row(3, 'NEEDS_INFO');
    const acceptance = {
      ...detail(accepted),
      onboarding: {
        platformVendorId: 4,
        membershipStatus: null,
        consentVerified: true,
        steps: [
          {
            key: 'documents',
            label: 'Documents',
            state: 'Action needed',
            detail: 'Provide your insurance document.',
            href: '/vendor/documents?channel=vendor-channel',
          },
        ],
      },
    };
    const request = {
      ...detail(needsInfo),
      informationRequests: [{ id: 82, status: 'AWAITING_RESPONSE' }],
    } as ApplicantApplicationDetail;
    const api = apiFor(
      [accepted, needsInfo],
      new Map([
        [2, acceptance],
        [3, request],
      ]),
    );
    render(<MarketApplicationRecords api={api} vendorId={4} />);
    const table = await screen.findByRole('table', {
      name: 'Your applications',
    });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Market', 'Location', 'Submitted date', 'Status', 'Action']);
    expect(
      await within(table).findByRole('link', { name: 'Provide information' }),
    ).toHaveAttribute(
      'href',
      '/vendor/applications/3?channel=vendor-channel#information-request-82',
    );
    fireEvent.click(
      within(table).getByRole('button', { name: /Preview Market 2/ }),
    );
    const panel = screen.getByRole('region', { name: 'Application details' });
    expect(
      await within(panel).findByRole('link', { name: 'Open documents' }),
    ).toHaveAttribute('href', '/vendor/documents?channel=vendor-channel');
    expect(
      within(panel).getByRole('link', { name: 'Open application' }),
    ).toHaveAttribute('href', '/vendor/applications/2?channel=vendor-channel');
    expect(
      within(panel).getByRole('link', { name: /View market/ }),
    ).toHaveAttribute('href', 'https://market.example');
    expect(api.command).not.toHaveBeenCalled();
  });
  it('keeps draft and submission IDs separate, does not call drafts submitted, and resets filters to page one', async () => {
    const rows = [
      row(1, 'DRAFT'),
      ...Array.from({ length: 12 }, (_, i) => row(i + 1)),
    ];
    const api = apiFor(rows);
    render(<MarketApplicationRecords api={api} vendorId={4} />);
    await screen.findByRole('table', { name: 'Your applications' });
    fireEvent.click(
      within(
        screen.getByRole('navigation', { name: 'Application pages' }),
      ).getByRole('button', { name: 'Next' }),
    );
    await screen.findByText('Not submitted');
    fireEvent.change(screen.getByLabelText('Application status'), {
      target: { value: 'DRAFT' },
    });
    expect(
      await within(
        screen.getByRole('table', { name: 'Your applications' }),
      ).findByRole('link', { name: 'Complete application' }),
    ).toHaveAttribute(
      'href',
      'https://market.example/vendor/application-continue?draft=1&vendor=4&channel=vendor-channel',
    );
    expect(
      within(screen.getByRole('table')).getByText('Not submitted'),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole('region', { name: 'Application details' }),
      ).getByRole('link', { name: 'Open application' }),
    ).toHaveAttribute(
      'href',
      '/vendor/applications/drafts/1?channel=vendor-channel',
    );
  });
  it('collects all submitted pages while deduplicating repeated drafts', async () => {
    const api = {
      read: vi.fn(async ({ skip }) => ({
        vendorId: 4,
        vendorChannelId: 'channel',
        drafts: [row(1, 'DRAFT')],
        items: [row(skip === 0 ? 1 : 2)],
        totalItems: 2,
      })),
    } as unknown as ApplicantApplicationsApi;
    const rows = await readAllMarketApplications(api, 4);
    expect(rows).toHaveLength(3);
    expect(api.read).toHaveBeenLastCalledWith({ vendorId: 4, skip: 1 });
  });
  it('retains safe fallback actions for waiting, unavailable forms and unavailable websites', async () => {
    const saved = { ...row(1, 'DRAFT'), current: false, origin: null };
    const api = apiFor([saved]);
    render(<MarketApplicationRecords api={api} vendorId={4} />);
    const panel = await screen.findByRole('region', {
      name: 'Application details',
    });
    await within(panel).findByRole('link', { name: 'View saved draft' });
    expect(
      within(panel).getByRole('button', { name: 'View market' }),
    ).toBeDisabled();
    expect(
      within(panel).getByRole('link', { name: 'Open application' }),
    ).toBeVisible();
    expect(applicationNextStep(row(2, 'WAITLISTED')).label).toBe(
      'View updates',
    );
    expect(applicationNextStep(row(3)).label).toBe('View review status');
    expect(localVendorDestination('javascript:alert(1)')).toBeUndefined();
    expect(
      localVendorDestination('https://other.example/vendor/documents'),
    ).toBeUndefined();
    expect(localVendorDestination('http://[')).toBeUndefined();
    expect(safeMarketApplicationUrl('javascript:alert(1)')).toBeUndefined();
  });
});
