import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ApplicationSubmission } from '@market/api';
import { ApplicationReview } from '../apps/admin/src/market/phase14/ApplicationReview';
import { Applications } from '../apps/admin/src/market/phase14/Applications';
import { ApplicationSubmissions } from '../apps/admin/src/market/phase14/ApplicationSubmissions';
import { managerData } from './fixtures/market-dashboard-data';
import { applicationReviewApi } from './fixtures/application-review-api';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});
function renderReview(
  patch: Partial<ApplicationSubmission> = {},
  canManage = true,
) {
  const data = managerData();
  const submission = { ...data.submissions![0]!, ...patch };
  const run = vi.fn().mockResolvedValue({ id: 1 });
  const view = render(
    <ApplicationReview
      submission={submission}
      data={data}
      run={run}
      canManage={canManage}
      onBusy={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
  return { data, submission, run, container: view.container };
}

it('retains list controls and paging while selecting a side preview', async () => {
  const data = managerData(),
    api = applicationReviewApi(data);
  const original = api.read.getMockImplementation()!;
  api.read.mockImplementation(async (section, occurrence, input) => {
    const result = await original(section, occurrence, input);
    if (result.applicationPage) {
      result.applicationPage.skip = input?.skip ?? 0;
      result.applicationPage.totalItems = 42;
    }
    return result;
  });
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
  fireEvent.change(screen.getByLabelText('Search applications'), {
    target: { value: 'Orchard' },
  });
  await waitFor(() =>
    expect(api.read).toHaveBeenCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ search: 'Orchard' }),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  fireEvent.change(screen.getByLabelText('Sort applications'), {
    target: { value: 'BUSINESS' },
  });
  fireEvent.change(screen.getByLabelText('Vendor category'), {
    target: { value: 'Produce' },
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
  await waitFor(() =>
    expect(api.read).toHaveBeenCalledWith(
      'APPLICATIONS',
      undefined,
      expect.objectContaining({ skip: 20 }),
    ),
  );
  fireEvent.click(
    within(
      screen.getByRole('table', { name: 'Application submissions' }),
    ).getByText('Orchard Farm'),
  );
  expect(screen.getByLabelText('Search applications')).toHaveValue('Orchard');
  expect(screen.getByLabelText('Sort applications')).toHaveValue('BUSINESS');
  expect(screen.getByLabelText('Vendor category')).toHaveValue('Produce');
  expect(screen.getByText('21 to 21 of 42 applications')).toBeTruthy();
  expect(
    await within(
      screen.getByRole('region', { name: 'Submission details' }),
    ).findByText('alex@example.invalid'),
  ).toBeVisible();
});

it('protects unsaved notes before leaving the submission detail page', async () => {
  const data = managerData(),
    api = applicationReviewApi(data);
  render(
    <Applications
      api={api}
      data={data}
      run={vi.fn()}
      canManage
      view="submissions"
      path="/market/application-submissions/1"
    />,
  );
  const notes = await screen.findByLabelText(
    'Private Manager Notes and decision reason',
  );
  fireEvent.change(notes, { target: { value: 'Unsaved private note' } });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(
    screen.getByRole('link', { name: 'Back to submitted applications' }),
  );
  expect(confirm).toHaveBeenCalled();
  expect(notes).toHaveValue('Unsaved private note');
  confirm.mockRestore();
});

it('renders snapshot sections, supported answer values, conditional visibility, dates, rentals and readiness', () => {
  const question = {
    section: 'Business',
    help: '',
    required: false,
    hidden: false,
    options: [],
  };
  renderReview({
    definitionSnapshot: {
      sections: ['Business', 'Products'],
      occurrenceIds: [],
      rentalIds: [],
      questions: [
        { ...question, id: 'bool', label: 'Prepare food?', type: 'BOOLEAN' },
        {
          ...question,
          id: 'blank',
          label: 'Empty optional',
          type: 'SHORT_TEXT',
        },
        {
          ...question,
          id: 'long',
          section: 'Products',
          label: 'Tell us about products',
          type: 'LONG_TEXT',
        },
        {
          ...question,
          id: 'select',
          label: 'Categories',
          type: 'MULTI_SELECT',
        },
        { ...question, id: 'date', label: 'Harvest date', type: 'DATE' },
        {
          ...question,
          id: 'conditional',
          label: 'Food details',
          type: 'SHORT_TEXT',
          condition: { questionId: 'bool', comparison: 'IS', value: true },
        },
      ],
    },
    answers: {
      bool: false,
      long: 'Original product description\nSecond line',
      select: ['Fruit', 'Honey'],
      date: '2027-05-14',
      conditional: 'Historical hidden answer',
    },
    rentalRequests: [
      {
        optionId: 1,
        name: 'Folding table',
        quantity: 2,
        unitMinor: 500,
        currency: 'USD',
        requiredAmenity: null,
      },
    ],
    documentation: {
      status: 'Missing',
      total: 1,
      complete: 0,
      missing: 1,
      pending: 0,
      expired: 0,
      rejected: 0,
      outstanding: ['Insurance'],
      expiringSoon: 0,
      outstandingRequired: 1,
    },
  });
  const original = screen.getByLabelText('Original submitted answers');
  expect(
    within(original)
      .getAllByRole('heading')
      .map((h) => h.textContent),
  ).toEqual(['Business', 'Products']);
  expect(within(original).getByText('No')).toBeTruthy();
  expect(within(original).getByText('Fruit, Honey')).toBeTruthy();
  expect(within(original).getByText('2027-05-14')).toBeTruthy();
  expect(within(original).queryByText('Food details')).toBeNull();
  expect(within(original).queryByText('Empty optional')).toBeNull();
  expect(within(original).queryByRole('textbox')).toBeNull();
  expect(screen.getAllByText('Folding table: 2')).toHaveLength(2);
  expect(
    screen.getByRole('link', { name: 'Review document readiness' }),
  ).toHaveAttribute('href', '/market/documents?vendor=&channel=');
  expect(screen.getByText('Outstanding: Insurance')).toBeTruthy();
});

it.each(['WITHDRAWN', 'DECLINED'] as const)(
  'shows one private note and no prohibited decision controls for %s',
  (status) => {
    renderReview({ status, managerNotes: 'Private historical reason' });
    expect(screen.getAllByText('Private historical reason')).toHaveLength(1);
    expect(screen.queryByLabelText('Application status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save notes' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Review decision' }),
    ).toBeNull();
  },
);

it('keeps non-managers read-only and saves private notes using the current status and revision', async () => {
  renderReview({}, false);
  expect(screen.queryByLabelText('Application status')).toBeNull();
  cleanup();
  const { run } = renderReview();
  fireEvent.change(
    screen.getByLabelText('Private Manager Notes and decision reason'),
    { target: { value: 'Private follow-up' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save notes' }));
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REVIEW_APPLICATION',
        expectedRevision: 1,
        data: expect.objectContaining({
          status: 'UNDER_REVIEW',
          managerNotes: 'Private follow-up',
          directoryId: null,
        }),
      }),
    ),
  );
});

it('uses mobile tabs by default and retains edits when switching tabs and resizing to split panels', () => {
  let change: (() => void) | undefined;
  const query = {
    matches: false,
    addEventListener: vi.fn((_name, listener) => {
      change = listener;
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  renderReview();
  expect(
    screen.getByRole('tab', { name: 'Submitted Answers' }),
  ).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('tab', { name: 'Details & Actions' }));
  const notes = screen.getByLabelText(
    'Private Manager Notes and decision reason',
  );
  fireEvent.change(notes, { target: { value: 'Retained across panels' } });
  fireEvent.change(screen.getByLabelText('Application status'), {
    target: { value: 'WAITLISTED' },
  });
  fireEvent.click(screen.getByRole('tab', { name: 'Submitted Answers' }));
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Submitted Answers' }), {
    key: 'ArrowRight',
  });
  expect(notes).toHaveValue('Retained across panels');
  expect(screen.getByLabelText('Application status')).toHaveValue('WAITLISTED');
  act(() => {
    query.matches = true;
    change?.();
  });
  expect(screen.queryByRole('tab')).toBeNull();
  expect(
    screen.getByRole('region', { name: 'Submitted Answers' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('region', { name: 'Details & Actions' }),
  ).toBeTruthy();
  expect(notes).toHaveValue('Retained across panels');
});
it('keeps amendment rounds, chronological history and accepted onboarding available before the final decision', () => {
  const { container } = renderReview({
    status: 'ACCEPTED',
    managerNotes: 'Only one historical note',
    answers: { original: 'Original honey' },
    informationRequests: [
      {
        id: 7,
        revision: 2,
        createdAt: '2026-10-28T12:00:00Z',
        reviewedAt: '2026-10-29T14:00:00Z',
        status: 'RESOLVED',
        references: { clarification: 'original' },
        documents: [],
        definition: {
          sections: ['Clarification'],
          occurrenceIds: [],
          rentalIds: [],
          questions: [
            {
              id: 'clarification',
              section: 'Clarification',
              label: 'Which products?',
              type: 'LONG_TEXT',
              help: '',
              required: true,
              hidden: false,
              options: [],
            },
          ],
        },
        response: {
          id: 8,
          revision: 1,
          answers: { clarification: 'Our own honey' },
          submittedAt: '2026-10-29T12:00:00Z',
          updatedAt: '2026-10-29T12:00:00Z',
        },
      },
    ],
    history: [
      {
        id: 'submitted',
        at: '2026-10-28T10:00:00Z',
        event: 'SUBMITTED',
        status: 'SUBMITTED',
        actorId: null,
      },
      {
        id: 'accepted',
        at: '2026-10-29T15:00:00Z',
        event: 'ACCEPTED',
        status: 'ACCEPTED',
        actorId: 1,
      },
    ],
    onboarding: {
      platformVendorId: 9,
      membershipStatus: 'pending',
      consentVerified: false,
      steps: [
        {
          key: 'membership',
          label: 'Market membership',
          state: 'Pending review',
          detail: 'Consent still required.',
          href: '/market/vendors?channel=42',
        },
      ],
    },
  });
  fireEvent.click(
    screen
      .getByText('Additional information requests and amendments', {
        selector: 'span',
      })
      .closest('summary')!,
  );
  expect(
    screen.getByText('Original submitted answer: Original honey'),
  ).toBeTruthy();
  expect(screen.getByText('Our own honey')).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Mark request resolved' }),
  ).toBeNull();
  fireEvent.click(
    screen
      .getByText('Application history', { selector: 'span' })
      .closest('summary')!,
  );
  expect(
    within(screen.getByLabelText('Application history'))
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  ).toEqual([
    expect.stringContaining('Submitted'),
    expect.stringContaining('Accepted'),
  ]);
  fireEvent.click(
    screen
      .getByText('Next steps after acceptance', { selector: 'span' })
      .closest('summary')!,
  );
  expect(screen.getByText('Consent still required.')).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Open market membership' }),
  ).toHaveAttribute('href', '/market/vendors?channel=42');
  expect(screen.getAllByText('Only one historical note')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Save notes' })).toBeNull();
  const inspector = container.querySelector('.application-review-inspector')!;
  expect(inspector.lastElementChild).toHaveAttribute(
    'aria-label',
    'Application decision',
  );
});

it('opens notification deep links using the submission detail page', async () => {
  window.history.replaceState(
    null,
    '',
    '/market/application-submissions?channel=42&submission=1',
  );
  const data = managerData();
  render(
    <Applications
      api={applicationReviewApi(data)}
      data={data}
      run={vi.fn()}
      canManage
      view="submissions"
    />,
  );
  await screen.findByLabelText('Private Manager Notes and decision reason');
  expect(
    screen.getByRole('heading', { level: 1, name: 'Orchard Farm' }),
  ).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Back to submitted applications' }),
  ).toHaveAttribute('href', '/market/application-submissions');
});
