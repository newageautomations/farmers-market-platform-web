import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AppError, type MarketGenerationJobStatus } from '@market/api';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../apps/admin/src/market/fixture';
import { MarketVendors } from '../apps/admin/src/market/vendors';
import { MarketOccurrences } from '../apps/admin/src/market/occurrences';
import { MarketOverview } from '../apps/admin/src/market/overview';
import { MarketGenerationStatus } from '../apps/admin/src/market/generation-status';
function service(id = '1') {
  return createFixtureMarketService(marketFixtureContext(id));
}
it('selects a safe directory Vendor with deliberate pending status and authoritative relationship reread', async () => {
  const api = service(),
    mutation = vi.spyOn(api, 'membershipStatus'),
    read = vi.spyOn(api, 'relationshipPage');
  render(<MarketVendors service={api} />);
  await screen.findByRole('table', { name: 'Vendor business relationships' });
  fireEvent.click(screen.getByRole('button', { name: 'Add Vendor' }));
  const dialog = await screen.findByRole('dialog', { name: 'Add Vendor' });
  await within(dialog).findByLabelText('Vendor business');
  expect(
    within(dialog).queryByRole('textbox', { name: /Vendor ID/i }),
  ).toBeNull();
  fireEvent.change(within(dialog).getByLabelText('Vendor business'), {
    target: { value: '1900' },
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Create relationship' }),
  );
  await waitFor(() =>
    expect(mutation).toHaveBeenCalledWith('1', '1900', 'pending'),
  );
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  await screen.findByRole('link', {
    name: 'Synthetic Market A Eligible Vendor 1',
  });
});
it('requests page two of the eligible directory from the server adapter', async () => {
  const api = service(),
    read = vi.spyOn(api, 'eligibleVendors');
  render(<MarketVendors service={api} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add Vendor' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByLabelText('Vendor business');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  await waitFor(() =>
    expect(read).toHaveBeenLastCalledWith({ take: 20, skip: 20, search: '' }),
  );
  await within(dialog).findByRole('option', { name: /Eligible Vendor 21/ });
});
it('discards a delayed B1 Market A page after switching to Market B', async () => {
  const a = service(),
    b = service('2');
  let finish!: (v: Awaited<ReturnType<typeof a.relationshipPage>>) => void;
  const original = await a.relationshipPage();
  vi.spyOn(a, 'relationshipPage').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<MarketVendors service={a} />);
  view.rerender(<MarketVendors service={b} />);
  await screen.findByRole('link', { name: 'Synthetic Market B Vendor 1' });
  await act(async () => finish(original));
  expect(
    screen.queryByRole('link', { name: 'Synthetic Market A Vendor 1' }),
  ).toBeNull();
});
it('direct occurrence detail succeeds without requesting the date list', async () => {
  const api = service(),
    direct = vi.spyOn(api, 'occurrence'),
    list = vi.spyOn(api, 'occurrencePage');
  const row = await api.occurrence('101');
  vi.spyOn(api, 'occurrence').mockResolvedValue({
    ...row,
    startsAt: '2020-01-01T15:00:00Z',
    localStartsAt: '2020-01-01T09:00',
    status: 'cancelled',
  });
  render(<MarketOccurrences service={api} id="101" />);
  await screen.findByText('2020-01-01T09:00');
  expect(direct).toHaveBeenCalledWith('101');
  expect(list).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('button', { name: 'Cancel occurrence' }),
  ).toBeNull();
});
it('Overview renders the summary count even when a loaded relationship page has fewer rows', async () => {
  const api = service(),
    summary = await api.overview();
  vi.spyOn(api, 'overview').mockResolvedValue({
    ...summary,
    totalVendorRelationships: 1400,
    approvedVendorRelationships: 1300,
  });
  render(<MarketOverview service={api} />);
  await screen.findByText(
    '1300 approved Vendor relationships out of 1400 total relationships.',
  );
});
function status(
  jobId: string,
  status: MarketGenerationJobStatus['status'],
): MarketGenerationJobStatus {
  return {
    jobId,
    status,
    submittedAt: '2026-10-05T00:00:00Z',
    startedAt: null,
    settledAt: null,
    errorCode: status === 'FAILED' ? 'GENERATION_FAILED' : null,
    matchedOccurrences: null,
  };
}
it.each(['COMPLETED', 'FAILED'] as const)(
  'stops generation polling on terminal %s and refreshes only completed work',
  async (terminal) => {
    vi.useFakeTimers();
    try {
      const api = service(),
        read = vi
          .spyOn(api, 'generationStatus')
          .mockResolvedValueOnce(status('1', 'RUNNING'))
          .mockResolvedValue(status('1', terminal)),
        done = vi.fn();
      const view = render(
        <MarketGenerationStatus service={api} jobId="1" onCompleted={done} />,
      );
      await act(async () => {});
      await act(async () => vi.advanceTimersByTimeAsync(2000));
      expect(
        screen.getByText(new RegExp('Status: ' + terminal)),
      ).toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(120000));
      expect(read).toHaveBeenCalledTimes(2);
      expect(done).toHaveBeenCalledTimes(terminal === 'COMPLETED' ? 1 : 0);
      view.unmount();
    } finally {
      vi.useRealTimers();
    }
  },
);
it('stops A polling, clears A job state and discards an in-flight result after Market switch', async () => {
  vi.useFakeTimers();
  try {
    const a = service(),
      b = service('2'),
      done = vi.fn();
    let finish!: (value: MarketGenerationJobStatus) => void;
    const old = vi.spyOn(a, 'generationStatus').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.spyOn(b, 'generationStatus').mockResolvedValue(
      status('job-B', 'COMPLETED'),
    );
    const view = render(
      <MarketGenerationStatus service={a} jobId="job-A" onCompleted={done} />,
    );
    await act(async () => {});
    view.rerender(
      <MarketGenerationStatus service={b} jobId="job-B" onCompleted={done} />,
    );
    await act(async () => {});
    await act(async () => finish(status('job-A', 'COMPLETED')));
    expect(screen.queryByText(/job-A/)).toBeNull();
    expect(screen.getByText(/job-B/)).toBeInTheDocument();
    expect(done).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(old).toHaveBeenCalledTimes(1);
    view.unmount();
  } finally {
    vi.useRealTimers();
  }
});
it('stops job polling after authority failure and on route leave', async () => {
  vi.useFakeTimers();
  try {
    const api = service(),
      read = vi
        .spyOn(api, 'generationStatus')
        .mockRejectedValue(new AppError('forbidden')),
      done = vi.fn();
    const view = render(
      <MarketGenerationStatus service={api} jobId="1" onCompleted={done} />,
    );
    await act(async () => {});
    expect(
      screen.getByText('You do not have access to this area.'),
    ).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(read).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(read).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
it('bounds nonterminal observation to 60 reads and requires a deliberate new observation', async () => {
  vi.useFakeTimers();
  try {
    const api = service(),
      read = vi
        .spyOn(api, 'generationStatus')
        .mockResolvedValue(status('1', 'PENDING')),
      done = vi.fn();
    const view = render(
      <MarketGenerationStatus service={api} jobId="1" onCompleted={done} />,
    );
    await act(async () => {});
    await act(async () => vi.advanceTimersByTimeAsync(180000));
    expect(read).toHaveBeenCalledTimes(60);
    expect(
      screen.getByRole('button', { name: 'Check generation status' }),
    ).toBeInTheDocument();
    view.unmount();
  } finally {
    vi.useRealTimers();
  }
});
