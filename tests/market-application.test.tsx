import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PublicApplication } from '@market/api';
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

it('enables the HTTP form without randomUUID and retries with the same submission key', async () => {
  vi.stubGlobal('crypto', {
    getRandomValues: crypto.getRandomValues.bind(crypto),
  });
  let attempts = 0;
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url) =>
      url === '/api/application-applicant'
        ? new Response('{}', { status: 401 })
        : new Response('{}', { status: ++attempts === 1 ? 400 : 200 }),
    );
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  const submit = screen.getByRole('button', { name: 'Submit application' });
  expect(submit).toBeEnabled();
  await user.click(screen.getByLabelText('No'));
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Orchard Farm',
  );
  await user.click(screen.getByLabelText('Flowers'));
  await user.click(screen.getByLabelText(/Town square/));
  await user.click(submit);
  await screen.findByRole('alert');
  expect(submit).toBeEnabled();
  await user.click(submit);
  await screen.findByRole('heading', {
    name: 'Application submitted successfully.',
  });
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
    }),
  );
  expect(payloads[0].idempotencyKey).toMatch(
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  expect(payloads[1].idempotencyKey).toBe(payloads[0].idempotencyKey);
});

it('keeps submission clickable after hydration and prevents duplicate pending requests', async () => {
  let complete!: (response: Response) => void;
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
    url === '/api/application-applicant'
      ? Promise.resolve(new Response('{}', { status: 401 }))
      : new Promise((resolve) => {
          complete = resolve;
        }),
  );
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  await user.click(screen.getByLabelText('No'));
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Orchard Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await user.click(screen.getByRole('button', { name: 'Submit application' }));
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
      screen.getByRole('heading', {
        name: 'Application submitted successfully.',
      }),
    ).toBeVisible(),
  );
});

it('requires the permanent question before any custom questions and cannot submit Yes anonymously', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { status: 401 }));
  render(<MarketApplication application={application} />);
  expect(document.querySelector('fieldset')?.textContent).toContain(
    'Do you have an account with Market platform?',
  );
  expect(screen.getByLabelText('Yes')).toBeRequired();
  expect(screen.getByLabelText('No')).toBeRequired();
  fireEvent.submit(document.querySelector('form')!);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByLabelText('Yes'));
  await screen.findByRole('button', { name: 'Sign in with my Vendor account' });
  fireEvent.submit(document.querySelector('form')!);
  expect(
    fetcher.mock.calls.some(([url]) => url === '/api/market-application'),
  ).toBe(false);
});

it('shows the optional invitation after submission and dismisses it without losing success', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (url) =>
      new Response(JSON.stringify({ submitted: true, submissionId: 42 }), {
        status: url === '/api/application-applicant' ? 401 : 200,
      }),
  );
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  expect(
    screen.queryByRole('link', {
      name: 'Create a Vendor account to track your application',
    }),
  ).toBeNull();
  await user.click(screen.getByLabelText('No'));
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Independent Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await user.click(screen.getByRole('button', { name: 'Submit application' }));
  const success = await screen.findByRole('heading', {
    name: 'Application submitted successfully.',
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

it('offers only current businesses and autofills empty semantic fields while keeping answers editable', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (url) =>
      new Response(
        JSON.stringify(
          url === '/api/application-applicant'
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
  await user.click(screen.getByLabelText('Yes'));
  const businesses = await screen.findByRole('combobox', {
    name: 'Business for this application',
  });
  await user.selectOptions(businesses, '4');
  await user.click(
    screen.getByRole('button', { name: 'Fill empty fields from my account' }),
  );
  expect(screen.getByLabelText('Business name (required)')).toHaveValue(
    'Verified Orchard',
  );
  await user.clear(screen.getByLabelText('Business name (required)'));
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'Edited Orchard',
  );
  await user.click(
    screen.getByRole('button', { name: 'Fill empty fields from my account' }),
  );
  expect(screen.getByLabelText('Business name (required)')).toHaveValue(
    'Edited Orchard',
  );
  await user.click(screen.getByLabelText('Flowers'));
  await user.click(screen.getByRole('button', { name: 'Submit application' }));
  await screen.findByRole('heading', {
    name: 'Application submitted successfully.',
  });
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
  await user.type(
    screen.getByLabelText('Business name (required)'),
    'New Farm',
  );
  await user.click(screen.getByLabelText('Produce'));
  await user.click(screen.getByRole('button', { name: 'Submit application' }));
  await screen.findByRole('heading', {
    name: 'Application submitted successfully.',
  });
  const commands = fetcher.mock.calls
    .filter(([url]) => url === '/api/applicant-applications')
    .map(([, init]) => JSON.parse(String(init?.body)));
  expect(commands.at(-1)).toEqual({
    action: 'SUBMIT_DRAFT',
    input: { id: 42, revision: 3, vendorId: 4 },
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
it('Customer-only accounts must onboard a Vendor and cannot choose account-only management', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    url === '/api/application-applicant'
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
  const user = userEvent.setup();
  render(<MarketApplication application={application} />);
  await user.click(screen.getByLabelText('Yes'));
  expect(
    await screen.findByRole('link', { name: 'Complete Vendor onboarding' }),
  ).toHaveAttribute('href', '/vendor/application-continue?slug=season');
  expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Submit application' }),
  ).toBeDisabled();
  expect(screen.queryByText('Apply with my account only')).toBeNull();
});
