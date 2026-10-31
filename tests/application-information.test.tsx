import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type {
  ApplicationInformationRequest,
  ApplicantApplicationsApi,
  ApplicationSubmission,
} from '@market/api';
import { ApplicationInformationResponse } from '../packages/ui/src/ApplicationInformation';
import { ApplicationInformationReview } from '../apps/admin/src/market/phase14/ApplicationInformationReview';
afterEach(cleanup);
const request: ApplicationInformationRequest = {
  id: 1,
  revision: 1,
  createdAt: '2026-10-29T12:00:00Z',
  reviewedAt: null,
  status: 'AWAITING_RESPONSE',
  references: { clarify: 'products' },
  documents: [],
  response: null,
  definition: {
    sections: ['Requested information'],
    occurrenceIds: [],
    rentalIds: [],
    questions: [
      {
        id: 'clarify',
        section: 'Requested information',
        label: 'Products',
        type: 'LONG_TEXT',
        help: 'Which products are yours?',
        options: [],
        required: true,
        hidden: false,
      },
      {
        id: 'organic',
        section: 'Requested information',
        label: 'Certified organic?',
        type: 'BOOLEAN',
        help: '',
        options: [],
        required: true,
        hidden: false,
      },
    ],
  },
};
it('saves incomplete progress and resumes using the returned revision without submitting', async () => {
  const command = vi
      .fn()
      .mockResolvedValue({ revision: 1, updatedAt: '2026-10-29T13:00:00Z' }),
    onSubmitted = vi.fn(),
    api = { command, read: vi.fn() } as unknown as ApplicantApplicationsApi;
  const props = {
    request,
    original: { products: 'Honey' },
    api,
    submissionId: 3,
    vendorId: 4,
    documentHref: '/vendor/documents',
    onSubmitted,
  };
  const view = render(<ApplicationInformationResponse {...props} />);
  expect(screen.getByText('Original submitted answer: Honey')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Products (required)'), {
    target: { value: 'Our own honey' },
  });
  expect(screen.getByText('Unsaved changes')).toBeTruthy();
  fireEvent.click(screen.getByText('Save progress'));
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(
      'SAVE_INFORMATION_RESPONSE',
      expect.objectContaining({
        revision: 0,
        answers: { clarify: 'Our own honey' },
      }),
    ),
  );
  expect(onSubmitted).not.toHaveBeenCalled();
  view.unmount();
  render(
    <ApplicationInformationResponse
      {...props}
      request={{
        ...request,
        response: {
          id: 1,
          revision: 1,
          answers: { clarify: 'Our own honey' },
          updatedAt: '2026-10-29T13:00:00Z',
          submittedAt: null,
        },
      }}
    />,
  );
  expect(
    (screen.getByLabelText('Products (required)') as HTMLTextAreaElement).value,
  ).toBe('Our own honey');
  fireEvent.change(screen.getByLabelText('Certified organic? (required)'), {
    target: { value: 'false' },
  });
  fireEvent.submit(screen.getByText('Submit response').closest('form')!);
  await waitFor(() =>
    expect(command).toHaveBeenCalledWith(
      'SUBMIT_INFORMATION_RESPONSE',
      expect.objectContaining({
        revision: 1,
        answers: { clarify: 'Our own honey', organic: false },
      }),
    ),
  );
});
it('renders a submitted amendment read-only with its original and document workflow', () => {
  const api = {
    command: vi.fn(),
    read: vi.fn(),
  } as unknown as ApplicantApplicationsApi;
  render(
    <ApplicationInformationResponse
      request={{
        ...request,
        status: 'RESPONDED',
        documents: [
          { id: 'doc', title: 'Insurance', status: 'Pending review' },
        ],
        response: {
          id: 1,
          revision: 2,
          answers: { clarify: 'Own honey', organic: false },
          submittedAt: '2026-10-29T14:00:00Z',
          updatedAt: '2026-10-29T14:00:00Z',
        },
      }}
      original={{ products: 'Honey' }}
      api={api}
      submissionId={3}
      vendorId={4}
      documentHref="/vendor/documents?channel=4"
      onSubmitted={vi.fn()}
    />,
  );
  expect(screen.queryByText('Save progress')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.getByText('Own honey')).toBeTruthy();
  expect(screen.getByText('No')).toBeTruthy();
  expect(
    screen.getByText('Open requirements and documents').getAttribute('href'),
  ).toBe('/vendor/documents?channel=4');
});
it('builds a correction and supplemental question then explicitly reviews before sending', async () => {
  const run = vi.fn().mockResolvedValue({ id: 1 });
  const submission = {
    id: 3,
    revision: 1,
    status: 'UNDER_REVIEW',
    responseVendorId: 4,
    definitionSnapshot: {
      ...request.definition,
      questions: [{ ...request.definition.questions[0]!, id: 'products' }],
    },
    answers: { products: 'Honey' },
    informationRequests: [],
  } as unknown as ApplicationSubmission;
  render(
    <ApplicationInformationReview
      submission={submission}
      run={run}
      canManage
      canRequestDocuments={false}
      onBusy={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByText('Request Additional Information'));
  fireEvent.click(screen.getByText('Clarify an answer'));
  fireEvent.change(screen.getByLabelText('Original question'), {
    target: { value: 'products' },
  });
  fireEvent.change(screen.getByLabelText('Clarification requested'), {
    target: { value: 'Which honey is yours?' },
  });
  fireEvent.click(screen.getByText('Ask a new question'));
  fireEvent.change(screen.getByLabelText('Question label'), {
    target: { value: 'Local producer?' },
  });
  fireEvent.change(screen.getByLabelText('Question type'), {
    target: { value: 'BOOLEAN' },
  });
  fireEvent.click(screen.getByText('Review request'));
  expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Send request'));
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SEND_INFORMATION_REQUEST',
        id: 3,
        data: expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({ originalId: 'products' }),
            expect.objectContaining({
              label: 'Local producer?',
              type: 'BOOLEAN',
            }),
          ]),
        }),
      }),
    ),
  );
});
