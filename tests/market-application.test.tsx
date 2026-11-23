import { afterEach, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  applicationAcknowledgementVersion,
  type PublicApplication,
} from '@market/api';
import { MarketApplication } from '../apps/storefront/src/components/MarketApplication';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStorage.clear();
});
const application: PublicApplication = {
  marketId: 1,
  slug: 'season',
  name: 'Season application',
  versionId: 1,
  definition: {
    sections: ['Business'],
    occurrenceIds: [1],
    rentalIds: [],
    questions: [
      {
        id: 'business',
        section: 'Business',
        label: 'Business name',
        help: '',
        type: 'SHORT_TEXT',
        required: true,
        hidden: false,
        options: [],
        semantic: 'businessName',
      },
      {
        id: 'website',
        section: 'Business',
        label: 'Website',
        help: '',
        type: 'URL',
        required: false,
        hidden: false,
        options: [],
      },
      {
        id: 'products',
        section: 'Business',
        label: 'Products',
        help: '',
        type: 'MULTI_SELECT',
        required: true,
        hidden: false,
        options: ['Produce', 'Flowers'],
      },
    ],
  },
  occurrences: [
    {
      id: 1,
      startsAt: '2026-10-10T15:00:00Z',
      endsAt: '2026-10-10T20:00:00Z',
      venue: 'Town square',
    },
  ],
  rentals: [],
};

const anonymous = (url: unknown) => url === '/api/application-applicant';

/** Answers the account question with No and moves past the market dates. */
async function continueWithoutAccount(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    await screen.findByRole('button', { name: 'No, continue without one' }),
  );
  await user.click(screen.getByLabelText(/Town square/));
  await user.click(screen.getByRole('button', { name: 'Next' }));
}

/** Accepts the acknowledgement (if not yet) and submits from the last step. */
async function submitApplication(user: ReturnType<typeof userEvent.setup>) {
  const acknowledge = screen.getByRole('checkbox', { name: /I confirm/ });
  if (!(acknowledge as HTMLInputElement).checked) await user.click(acknowledge);
  await user.click(screen.getByRole('button', { name: 'Submit application' }));
}

it('steps through sections and retries with the same submission key without randomUUID', async () => {
  vi.stubGlobal('crypto', {
    getRandomValues: crypto.getRandomValues.bind(crypto),
  });
  let attempts = 0;
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url) =>
      anonymous(url)
        ? new Response('{}', { status: 401 })
        : new Response('{}', { status: ++attempts === 1 ? 400 : 200 }),
    );
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  expect(
    await screen.findByRole('heading', { name: 'Your account' }),
  ).toBeVisible();
  expect(
    screen.getByRole('navigation', { name: 'Application sections' }),
  ).toHaveTextContent('Business');
  await continueWithoutAccount(user);
  expect(screen.getByRole('heading', { name: 'Business' })).toBeVisible();
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Orchard Farm',
  );
  await user.click(screen.getByLabelText('Flowers'));
  await user.click(screen.getByRole('checkbox', { name: /I confirm/ }));
  const submit = screen.getByRole('button', { name: 'Submit application' });
  await user.click(submit);
  await screen.findByRole('alert');
  expect(submit).toBeEnabled();
  await user.click(submit);
  await screen.findByRole('heading', { name: 'Application submitted' });
  const payloads = fetcher.mock.calls
    .filter(([url]) => url === '/api/market-application')
    .map(([, init]) => JSON.parse(String(init?.body)));
  expect(payloads).toHaveLength(2);
  expect(payloads[0]).toEqual(
    expect.objectContaining({
      answers: { business: 'Orchard Farm', products: ['Flowers'] },
      occurrenceIds: [1],
      accountAnswer: 'NO',
      vendorId: null,
      acknowledgement: applicationAcknowledgementVersion,
    }),
  );
  expect(payloads[0].idempotencyKey).toMatch(
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  expect(payloads[1].idempotencyKey).toBe(payloads[0].idempotencyKey);
});

it('keeps a section until its required answers are valid and lets earlier sections be revisited', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { status: 401 }));
  const user = userEvent.setup();
  render(
    <MarketApplication
      application={{
        ...application,
        definition: {
          ...application.definition,
          sections: ['Business', 'Social'],
          questions: application.definition.questions.map((q) =>
            q.id === 'website' ? { ...q, section: 'Social' } : q,
          ),
        },
      }}
    />,
  );
  await continueWithoutAccount(user);
  // Next stays on an incomplete section.
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: 'Business' })).toBeVisible();
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Orchard Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: 'Social' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: /^Market dates/ }));
  expect(screen.getByRole('heading', { name: 'Market dates' })).toBeVisible();
  expect(screen.getByLabelText(/Town square/)).toBeChecked();
  expect(
    fetcher.mock.calls.some(([url]) => url === '/api/market-application'),
  ).toBe(false);
});

it('does not submit while the last section is incomplete', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { status: 401 }));
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  await continueWithoutAccount(user);
  await submitApplication(user);
  expect(screen.getByRole('heading', { name: 'Business' })).toBeVisible();
  expect(
    fetcher.mock.calls.some(([url]) => url === '/api/market-application'),
  ).toBe(false);
});

it('shows requested documents outside the answers form', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('{}', { status: 401 }),
  );
  const user = userEvent.setup();
  render(
    <MarketApplication
      application={{
        ...application,
        documentRequirements: [
          {
            id: 'insurance',
            title: 'Liability insurance',
            instructions: 'Upload your certificate.',
            required: true,
            submission_blocking: false,
          },
        ],
      }}
    />,
  );
  expect(
    within(
      await screen.findByRole('navigation', { name: 'Application sections' }),
    ).getByText('Documents'),
  ).toBeInTheDocument();
  await continueWithoutAccount(user);
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Orchard Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  const documents = screen.getByRole('region', {
    name: 'Application documents',
  });
  expect(documents).toHaveTextContent('Liability insurance');
  expect(documents.closest('form')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Submit application' }),
  ).toBeEnabled();
});

it('prevents duplicate pending requests', async () => {
  let complete!: (response: Response) => void;
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
    anonymous(url)
      ? Promise.resolve(new Response('{}', { status: 401 }))
      : new Promise((resolve) => {
          complete = resolve;
        }),
  );
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  await continueWithoutAccount(user);
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Orchard Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await submitApplication(user);
  expect(
    screen.getByRole('button', { name: 'Submitting application' }),
  ).toBeDisabled();
  fireEvent.submit(document.querySelector('form')!);
  expect(
    fetcher.mock.calls.filter(([url]) => url === '/api/market-application'),
  ).toHaveLength(1);
  complete(new Response('{}'));
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Application submitted' }),
    ).toBeVisible(),
  );
});

it('asks about an account first and signs in without submitting', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { status: 401 }));
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  render(<MarketApplication application={application} />);
  expect(
    await screen.findByText('Do you have an account with Market platform?'),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Yes, log in' }));
  await waitFor(() =>
    expect(
      fetcher.mock.calls.some(([url]) => url === '/api/application-progress'),
    ).toBe(true),
  );
  expect(
    fetcher.mock.calls.some(([url]) => url === '/api/market-application'),
  ).toBe(false);
});

it('shows the optional invitation after submission and dismisses it without losing success', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (url) =>
      new Response(JSON.stringify({ submitted: true, submissionId: 42 }), {
        status: anonymous(url) ? 401 : 200,
      }),
  );
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  await continueWithoutAccount(user);
  expect(
    screen.queryByRole('link', {
      name: 'Create a Vendor account to track your application',
    }),
  ).toBeNull();
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Independent Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await submitApplication(user);
  const success = await screen.findByRole('heading', {
    name: 'Application submitted',
  });
  expect(
    screen.getByRole('link', {
      name: 'Create a Vendor account to track your application',
    }),
  ).toHaveAttribute('href', '/vendor/application-continue?claim=42');
  await user.click(
    screen.getByRole('button', { name: 'Finish without creating an account' }),
  );
  expect(success).toBeVisible();
  expect(
    screen.queryByRole('link', {
      name: 'Create a Vendor account to track your application',
    }),
  ).toBeNull();
});

it('asks signed-in owners of several businesses which one applies and fills only empty fields', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (url) =>
      new Response(
        JSON.stringify(
          anonymous(url)
            ? {
                authenticated: true,
                principalId: '7',
                profile: { email: 'owner@test.invalid' },
                vendors: [
                  { id: 4, name: 'Verified Orchard' },
                  { id: 5, name: 'Second Farm' },
                ],
              }
            : {},
        ),
      ),
  );
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  const businesses = await screen.findByRole('combobox', {
    name: 'Which business is applying? (required)',
  });
  expect(screen.queryByText(/Do you have an account/)).toBeNull();
  await user.selectOptions(businesses, '4');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByLabelText(/Town square/));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByLabelText('Business name (required)')).toHaveValue(
    'Verified Orchard',
  );
  await user.clear(screen.getByLabelText('Business name (required)'));
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Edited Orchard',
  );
  await user.click(screen.getByLabelText('Flowers'));
  await submitApplication(user);
  await screen.findByRole('heading', { name: 'Application submitted' });
  const payload = JSON.parse(
    String(
      fetcher.mock.calls.find(([url]) => url === '/api/market-application')?.[1]
        ?.body,
    ),
  );
  expect(payload).toMatchObject({
    accountAnswer: 'YES',
    vendorId: 4,
    answers: { business: 'Edited Orchard', products: ['Flowers'] },
  });
  expect(
    screen.queryByRole('link', {
      name: 'Create a Vendor account to track your application',
    }),
  ).toBeNull();
});

it('skips the account question for a signed-in owner of one business', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    anonymous(url)
      ? new Response(
          JSON.stringify({
            authenticated: true,
            principalId: '7',
            profile: { email: 'owner@test.invalid' },
            vendors: [{ id: 4, name: 'Verified Orchard' }],
          }),
        )
      : new Response(null, { status: 204 }),
  );
  render(<MarketApplication application={application} />);
  expect(
    await screen.findByRole('heading', { name: 'Market dates' }),
  ).toBeVisible();
  expect(screen.getByText('Verified Orchard', { selector: 'strong' }));
  expect(screen.queryByText(/Do you have an account/)).toBeNull();
});
it('saves incomplete drafts and submits the saved revision through the draft endpoint', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url, init) => {
      if (url === '/api/application-applicant')
        return new Response(
          JSON.stringify({
            authenticated: true,
            principalId: '7',
            profile: { email: 'vendor@example.test' },
            vendors: [{ id: 4, name: 'Verified Orchard', channelId: '35' }],
          }),
        );
      if (url === '/api/applicant-applications') {
        const body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify(
            body.action === 'SAVE_DRAFT'
              ? {
                  id: 42,
                  revision: body.input.revision + 1,
                  updatedAt: '2026-10-29T15:00:00Z',
                }
              : { submitted: true, submissionId: 77 },
          ),
        );
      }
      return new Response(null, { status: 204 });
    });
  const user = userEvent.setup();
  render(
    <MarketApplication
      application={application}
      vendorOrigin="http://localhost:4322"
      initialDraft={{
        vendor: { id: 4, name: 'Verified Orchard', channelId: '35' },
        marketId: 1,
        current: true,
        origin: 'http://market.localhost',
        marketName: 'Local market',
        name: application.name,
        definition: application.definition,
        application,
        draft: {
          id: 42,
          revision: 1,
          templateVersionId: 1,
          vendorId: 4,
          updatedAt: '2026-10-28T15:00:00Z',
          progress: { answers: {}, occurrenceIds: [], rentals: [] },
        },
      }}
    />,
  );
  await user.click(await screen.findByRole('button', { name: 'Save draft' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled(),
  );
  expect(
    JSON.parse(
      String(
        fetcher.mock.calls.find(
          ([url]) => url === '/api/applicant-applications',
        )?.[1]?.body,
      ),
    ),
  ).toMatchObject({
    action: 'SAVE_DRAFT',
    input: { id: 42, revision: 1, answers: {} },
  });
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'New Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await submitApplication(user);
  await screen.findByRole('heading', { name: 'Application submitted' });
  const commands = fetcher.mock.calls
    .filter(([url]) => url === '/api/applicant-applications')
    .map(([, init]) => JSON.parse(String(init?.body)));
  expect(commands.at(-1)).toEqual({
    action: 'SUBMIT_DRAFT',
    input: {
      id: 42,
      revision: 3,
      vendorId: 4,
      acknowledgement: applicationAcknowledgementVersion,
    },
  });
  expect(
    fetcher.mock.calls.some(([url]) => url === '/api/market-application'),
  ).toBe(false);
  expect(
    screen.getByRole('link', { name: 'View application' }),
  ).toHaveAttribute(
    'href',
    'http://localhost:4322/vendor/applications/77?channel=35',
  );
});
it('Customer-only accounts must onboard a Vendor or continue without linking', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    anonymous(url)
      ? new Response(
          JSON.stringify({
            authenticated: true,
            principalId: '7',
            profile: { email: 'customer@example.test' },
            vendors: [],
          }),
        )
      : new Response(null, { status: 204 }),
  );
  render(<MarketApplication application={application} />);
  expect(
    await screen.findByRole('link', { name: 'Complete Vendor onboarding' }),
  ).toHaveAttribute('href', '/vendor/application-continue?slug=season');
  expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Continue without linking' }),
  ).toBeEnabled();
  expect(screen.queryByText('Apply with my account only')).toBeNull();
});

it('requires the acknowledgement before submitting', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { status: 401 }));
  const user = userEvent.setup();
  render(
    <MarketApplication application={application} policiesHref="/policies" />,
  );
  await continueWithoutAccount(user);
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Orchard Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  const acknowledge = screen.getByRole('checkbox', { name: /I confirm/ });
  expect(acknowledge).toBeRequired();
  expect(screen.getByRole('link', { name: 'policies' })).toHaveAttribute(
    'href',
    '/policies',
  );
  await user.click(screen.getByRole('button', { name: 'Submit application' }));
  expect(
    fetcher.mock.calls.some(([url]) => url === '/api/market-application'),
  ).toBe(false);
});

it('offers account creation on the Documents step to applicants without an account', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { status: 401 }));
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  const user = userEvent.setup();
  render(
    <MarketApplication
      application={{
        ...application,
        documentRequirements: [
          {
            id: 'insurance',
            title: 'Liability insurance',
            instructions: 'Upload your certificate.',
            required: true,
            submission_blocking: true,
          },
        ],
      }}
    />,
  );
  expect(
    await screen.findByRole('button', { name: 'Create an account' }),
  ).toBeVisible();
  await continueWithoutAccount(user);
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Orchard Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  fetcher.mockResolvedValue(new Response('{}'));
  await user.click(
    screen.getByRole('button', { name: 'Create a Vendor account' }),
  );
  await waitFor(() =>
    expect(assign).toHaveBeenCalledWith(
      '/vendor/application-continue?slug=season&signup=1&context=vendor',
    ),
  );
});
