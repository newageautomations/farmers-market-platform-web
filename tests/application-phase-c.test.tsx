import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ApplicationFields } from '@market/ui';
import {
  activeApplicationAnswers,
  applicationScheduleIssue,
  type ApplicationDefinition,
  type ApplicationVersion,
  type PublicApplication,
} from '@market/api';
import { ApplicationBuilder } from '../apps/admin/src/market/phase14/ApplicationBuilder';
import { MarketApplication } from '../apps/storefront/src/components/MarketApplication';
import { managerData } from './fixtures/market-dashboard-data';
const definition: ApplicationDefinition = {
  sections: ['Business'],
  occurrenceIds: [],
  rentalIds: [],
  questions: [
    {
      id: 'food',
      label: 'Prepare food?',
      type: 'BOOLEAN',
      section: 'Business',
      help: '',
      required: false,
      hidden: false,
      options: [],
    },
    {
      id: 'plan',
      label: 'Safety plan',
      type: 'SHORT_TEXT',
      section: 'Business',
      help: '',
      required: true,
      hidden: false,
      options: [],
      condition: { questionId: 'food', comparison: 'IS', value: true },
    },
    {
      id: 'category',
      label: 'Category',
      type: 'DROPDOWN',
      section: 'Business',
      help: '',
      required: false,
      hidden: false,
      options: ['Crafts', 'Produce'],
    },
  ],
};
function Form() {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  return (
    <form aria-label="Application">
      <ApplicationFields
        definition={definition}
        answers={answers}
        onAnswer={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
      />
    </form>
  );
}
it('updates visibility and native required validity with the trigger answer', () => {
  render(<Form />);
  const form = screen.getByRole('form') as HTMLFormElement;
  expect(screen.queryByLabelText('Safety plan (required)')).toBeNull();
  expect(form.checkValidity()).toBe(true);
  fireEvent.change(screen.getByLabelText('Prepare food?'), {
    target: { value: 'true' },
  });
  expect(screen.getByLabelText('Safety plan (required)')).toBeRequired();
  expect(form.checkValidity()).toBe(false);
  fireEvent.change(screen.getByLabelText('Prepare food?'), {
    target: { value: 'false' },
  });
  expect(screen.queryByLabelText('Safety plan (required)')).toBeNull();
  expect(form.checkValidity()).toBe(true);
  expect(
    activeApplicationAnswers(definition, { food: false, plan: 'stale' }),
  ).toEqual({ food: false });
});
it('configures rules with question labels, supported comparisons and expected answers', () => {
  const data = managerData();
  data.timeZone = 'America/Chicago';
  const version = {
    id: 9,
    templateId: 1,
    marketId: 1,
    revision: 1,
    status: 'DRAFT',
    versionNumber: 1,
    definition: structuredClone(definition),
  } as ApplicationVersion;
  render(
    <ApplicationBuilder
      version={version}
      data={data}
      canManage
      run={vi.fn()}
      onSelect={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit Safety plan' }));
  expect(screen.getByLabelText('Question visibility')).toHaveValue(
    'CONDITIONAL',
  );
  expect(screen.getByLabelText('Show this question when')).toHaveDisplayValue(
    'Prepare food?',
  );
  expect(screen.getByLabelText('Comparison')).toHaveDisplayValue('Is');
  fireEvent.change(screen.getByLabelText('Expected answer'), {
    target: { value: 'false' },
  });
  expect(
    screen.getByText(/applicant’s answer to “Prepare food\?” is No/),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Question visibility'), {
    target: { value: 'HIDDEN' },
  });
  expect(screen.queryByLabelText('Expected answer')).toBeNull();
});
it('validates the schedule and supports interactive unpublished previews', () => {
  const data = managerData();
  data.timeZone = 'America/Chicago';
  const run = vi.fn();
  const version = {
    id: 9,
    templateId: 1,
    marketId: 1,
    revision: 1,
    status: 'DRAFT',
    versionNumber: 1,
    definition: structuredClone(definition),
  } as ApplicationVersion;
  render(
    <ApplicationBuilder
      version={version}
      data={data}
      canManage
      run={run}
      onSelect={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('Opening date and time'), {
    target: { value: '2027-03-10T17:00' },
  });
  fireEvent.change(screen.getByLabelText('Closing date and time'), {
    target: { value: '2027-03-10T09:00' },
  });
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Opening must be before closing.',
  );
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Preview application' }));
  fireEvent.change(screen.getByLabelText('Prepare food?'), {
    target: { value: 'true' },
  });
  expect(screen.getByLabelText('Safety plan (required)')).toBeInTheDocument();
  expect(run).not.toHaveBeenCalled();
  expect(
    applicationScheduleIssue({
      ...definition,
      schedule: {
        timeZone: 'America/Chicago',
        opensAt: '2027-01-01T09:00',
        closesAt: '2027-01-01T09:00',
      },
    }),
  ).toBeDefined();
});
it.each(['CLOSED', 'NOT_YET_OPEN'] as const)(
  'shows a market-local %s message and blocks submission',
  async (state) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 401 }),
    );
    const application: PublicApplication = {
      marketId: 1,
      name: 'Test application',
      slug: 'test',
      versionId: 1,
      definition,
      occurrences: [],
      rentals: [],
      availability: {
        state,
        timeZone: 'America/Chicago',
        opensAt: '2027-03-10T15:00:00Z',
        closesAt: '2027-03-10T23:00:00Z',
      },
    };
    await act(async () => {
      render(<MarketApplication application={application} />);
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      state === 'CLOSED'
        ? /closed on March 10, 2027 at 5:00 PM/
        : /opens on March 10, 2027 at 9:00 AM/,
    );
    expect(
      screen.getByRole('button', { name: 'Submit application' }),
    ).toBeDisabled();
  },
);
