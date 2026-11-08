import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { ApplicationDefinition, OperationsCommand } from '@market/api';
import { ApplicationFields } from '@market/ui';
import { routeAllowed } from '@market/admin-core';
import { Applications } from '../apps/admin/src/market/phase14/Applications';
import { Layouts } from '../apps/admin/src/market/phase14/Layouts';
import {
  Rentals,
  usdToMinor,
} from '../apps/admin/src/market/phase14/Directory';
import {
  localToInstant,
  TimezoneField,
} from '../apps/admin/src/market/timezones';
import { recurrenceInput } from '../apps/admin/src/market/schedule';

import { data, definition } from './fixtures/phase15-data';
import { applicationReviewApi } from './fixtures/application-review-api';
/** Renders the builder for the fixture's draft; run answers every save. */
async function builder() {
  const user = userEvent.setup(),
    run = vi.fn(async (command: OperationsCommand) => ({
      ...data.versions![0]!,
      revision: (command.expectedRevision ?? 0) + 1,
    }));
  render(
    <Applications
      data={structuredClone(data)}
      run={run}
      canManage
      path="/market/applications/1"
    />,
  );
  return { user, run };
}
/** The last autosaved command, once the debounce has run. */
async function autosaved(run: ReturnType<typeof vi.fn>) {
  await waitFor(
    () =>
      expect(run).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'SAVE_APPLICATION' }),
      ),
    { timeout: 3000 },
  );
  return run.mock.calls.at(-1)![0] as OperationsCommand;
}
test('a new application is not saved until something is edited', async () => {
  const user = userEvent.setup();
  const run = vi.fn(async (command: OperationsCommand) =>
    command.action === 'CREATE_APPLICATION'
      ? { ...data.versions![0]!, id: 9, templateId: 9, revision: 1 }
      : { ...data.versions![0]!, id: 9, templateId: 9, revision: 2 },
  );
  render(
    <Applications
      data={{ ...structuredClone(data), applicationDefaults: definition }}
      run={run}
      canManage
      path="/market/applications/new"
    />,
  );
  expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(run).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Application name'));
  await user.type(screen.getByLabelText('Application name'), 'Fall');
  const saved = await autosaved(run);
  expect(run.mock.calls.map(([c]) => c.action)).toEqual([
    'CREATE_APPLICATION',
    'SAVE_APPLICATION',
  ]);
  expect(run.mock.calls[0]![0].data).toEqual({ name: 'Fall' });
  expect(saved).toMatchObject({ id: 9, expectedRevision: 1 });
  expect(window.location.pathname).toBe('/market/applications/9');
});
test('layout creation does not require a name', async () => {
  const run = vi.fn(async () => undefined);
  render(<Layouts data={data} run={run} canManage />);
  expect(screen.queryByLabelText('Layout name')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Create layout' }));
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith({
      action: 'CREATE_LAYOUT',
      data: { name: 'Untitled layout' },
    }),
  );
});
test('applications can be archived and restored from the list', async () => {
  const user = userEvent.setup();
  const run = vi.fn(async () => ({ id: 1 }));
  const view = render(
    <Applications data={structuredClone(data)} run={run} canManage />,
  );
  await user.click(screen.getByRole('button', { name: 'Archive' }));
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Archive application',
    }),
  );
  expect(run).toHaveBeenCalledWith({
    action: 'ARCHIVE_APPLICATION',
    id: 1,
    expectedRevision: 1,
    data: {},
  });
  const archived = structuredClone(data);
  archived.templates![0]!.archivedAt = '2026-11-01T00:00:00Z';
  view.rerender(<Applications data={archived} run={run} canManage />);
  expect(screen.getByText('No matching applications')).toBeInTheDocument();
  await user.selectOptions(
    screen.getByLabelText('Application status'),
    'ARCHIVED',
  );
  await user.click(screen.getByRole('button', { name: 'Restore application' }));
  expect(run).toHaveBeenLastCalledWith({
    action: 'UNARCHIVE_APPLICATION',
    id: 1,
    expectedRevision: 1,
    data: {},
  });
});
test('one question expands at a time and custom options are individual fields', async () => {
  const { user } = await builder();
  expect(screen.queryByLabelText('Question')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Edit Business name' }));
  expect(screen.getByLabelText('Question')).toHaveValue('Business name');
  await user.click(screen.getByRole('button', { name: 'Edit Products sold' }));
  expect(screen.getAllByLabelText('Question')).toHaveLength(1);
  expect(screen.getByLabelText('Question')).toHaveValue('Products sold');
  await user.clear(screen.getByLabelText('Option 1'));
  await user.type(screen.getByLabelText('Option 1'), 'Baked goods');
  await user.click(screen.getByRole('button', { name: 'Add option' }));
  expect(screen.getByLabelText('Option 3')).toHaveValue('Option 3');
  await user.selectOptions(
    screen.getByLabelText('Question type'),
    'MULTI_SELECT',
  );
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByLabelText('Baked goods')).toHaveAttribute(
    'type',
    'checkbox',
  );
});
test('application title, required toggle, and time question autosave', async () => {
  const { user, run } = await builder();
  await user.clear(screen.getByLabelText('Application name'));
  await user.type(screen.getByLabelText('Application name'), 'Fall season');
  await user.click(screen.getByRole('button', { name: 'Edit Business name' }));
  expect(screen.getByLabelText('Required')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Edit Setup notes' }));
  await user.selectOptions(screen.getByLabelText('Question type'), 'TIME');
  await user.click(screen.getByLabelText('Required'));
  expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
  const saved = await autosaved(run);
  expect(saved).toEqual(
    expect.objectContaining({
      action: 'SAVE_APPLICATION',
      data: expect.objectContaining({
        name: 'Fall season',
        definition: expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({
              id: 'notes',
              type: 'TIME',
              required: true,
            }),
          ]),
        }),
      }),
    }),
  );
  // The draft already exists, so nothing new is created.
  expect(run.mock.calls.every(([c]) => c.action === 'SAVE_APPLICATION')).toBe(
    true,
  );
});
test('optional fields can be deleted while system identity stays protected', async () => {
  const { user, run } = await builder();
  await user.click(screen.getByRole('button', { name: 'Edit Business name' }));
  expect(screen.queryByRole('button', { name: 'Delete question' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Edit Setup notes' }));
  await user.click(screen.getByRole('button', { name: 'Delete question' }));
  const saved = (await autosaved(run)).data.definition as ApplicationDefinition;
  expect(saved.questions.some((q) => q.id === 'notes')).toBe(false);
  expect(saved.questions.some((q) => q.semantic === 'businessName')).toBe(true);
});
test('questions move between sections with the keyboard handle', async () => {
  const { run } = await builder();
  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Move Products sold' }),
    { key: 'ArrowUp' },
  );
  expect(
    screen.getByText('Products sold moved to position 3 of 3 in Business.'),
  ).toBeInTheDocument();
  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Move Products sold' }),
    { key: 'ArrowUp' },
  );
  const saved = (await autosaved(run)).data.definition as ApplicationDefinition;
  expect(
    saved.questions.filter((q) => q.section === 'Business').map((q) => q.id),
  ).toEqual(['business', 'category', 'notes']);
});
test('new sections are visible, movable, and rename their questions together', async () => {
  const { user, run } = await builder();
  await user.click(screen.getByRole('button', { name: 'Add section' }));
  expect(screen.getByLabelText('Section name: Section 3')).toBeInTheDocument();
  for (let i = 0; i < 2; i++)
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Move section Section 3' }),
      { key: 'ArrowUp' },
    );
  await user.click(screen.getByRole('button', { name: 'Edit Products sold' }));
  await user.selectOptions(screen.getByLabelText('Section'), 'Section 3');
  fireEvent.change(screen.getByLabelText('Section name: Section 3'), {
    target: { value: 'Experience' },
  });
  fireEvent.blur(screen.getByLabelText('Section name: Section 3'));
  await waitFor(
    () =>
      expect(
        (run.mock.calls.at(-1)?.[0]?.data.definition as ApplicationDefinition)
          ?.sections,
      ).toEqual(['Experience', 'Business', 'Products']),
    { timeout: 3000 },
  );
  const saved = run.mock.calls.at(-1)![0].data
    .definition as ApplicationDefinition;
  expect(saved.questions.find((q) => q.id === 'category')?.section).toBe(
    'Experience',
  );
});
test('submitted application detail omits blank optional answers', async () => {
  render(
    <Applications
      data={data}
      run={async () => undefined}
      canManage={false}
      view="submissions"
      path="/market/application-submissions/1"
      api={applicationReviewApi(data)}
    />,
  );
  const answers = await screen.findByRole('region', {
    name: 'Submitted information',
  });
  expect(within(answers).queryByText('Setup notes')).toBeNull();
  expect(within(answers).queryByText('Products sold')).toBeNull();
  expect(within(answers).getByText('No')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Back to submitted applications' }),
  ).toHaveAttribute('href', '/market/application-submissions');
});
test('empty checkbox answers are omitted while zero and No remain', () => {
  render(
    <ApplicationFields
      definition={{
        ...definition,
        questions: [
          {
            ...definition.questions[1]!,
            type: 'MULTI_SELECT',
            options: ['One'],
          },
          { ...definition.questions[3]! },
          { ...definition.questions[2]!, type: 'NUMBER' },
        ],
      }}
      answers={{ notes: [], power: false, category: 0 }}
      readOnly
    />,
  );
  expect(screen.queryByText('Setup notes')).toBeNull();
  expect(screen.getByText('No')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
});
test('rental creation opens a staged modal', async () => {
  render(
    <Rentals data={data} run={async () => undefined} canManage view="add" />,
  );
  expect(screen.queryByRole('button', { name: 'Save business' })).toBeNull();
  expect(
    screen.getByRole('dialog', { name: 'Add rental equipment' }),
  ).toBeInTheDocument();
  await userEvent.setup().type(screen.getByLabelText('Rental name'), 'Table');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }));
  expect(
    screen.getByRole('button', { name: 'About Price (USD)' }),
  ).toBeInTheDocument();
});
test('USD prices accept at most two decimals, normalize on blur, and save cents', async () => {
  const user = userEvent.setup(),
    run = vi.fn(async () => ({}));
  render(<Rentals data={data} run={run} canManage view="add" />);
  await user.type(screen.getByLabelText('Rental name'), 'Table');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.clear(screen.getByLabelText('Price (USD)'));
  await user.type(screen.getByLabelText('Price (USD)'), '12.345');
  expect(screen.getByLabelText('Price (USD)')).toHaveValue('12.34');
  await user.clear(screen.getByLabelText('Price (USD)'));
  await user.type(screen.getByLabelText('Price (USD)'), '25');
  await user.tab();
  expect(screen.getByLabelText('Price (USD)')).toHaveValue('25.00');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(run).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save rental' }));
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        details: expect.objectContaining({ priceMinor: 2500, currency: 'USD' }),
      },
    }),
  );
  expect(usdToMinor('0.29')).toBe(29);
  expect(() => usdToMinor('1.234')).toThrow();
});
test('US timezone control uses friendly labels', () => {
  render(<TimezoneField />);
  expect(screen.getByRole('option', { name: 'Central' })).toHaveValue(
    'America/Chicago',
  );
  expect(screen.queryByRole('option', { name: 'UTC' })).toBeNull();
});
test.each([
  ['2026-01-10', '15:00:00.000Z'],
  ['2026-07-10', '14:00:00.000Z'],
])('local time conversion respects Central DST on %s', (date, instant) => {
  expect(localToInstant(date, '09:00', 'America/Chicago')).toBe(
    `${date}T${instant}`,
  );
});
test.each([
  ['2026-03-08', '02:30'],
  ['2026-11-01', '01:30'],
  ['2026-02-30', '09:00'],
])('rejects nonexistent or ambiguous local times: %s %s', (date, time) => {
  expect(() => localToInstant(date, time, 'America/Chicago')).toThrow();
});
test('monthly rule validates a combined second and fourth weekday pattern', () => {
  const form = new FormData();
  Object.entries({
    frequency: 'monthly',
    startTime: '09:00',
    endTime: '14:00',
    endDayOffset: '0',
    effectiveFrom: '2026-10-01',
  }).forEach(([key, value]) => form.set(key, value));
  form.append('weekdays', '6');
  form.append('monthWeeks', '2');
  form.append('monthWeeks', '4');
  expect(recurrenceInput(form)).toMatchObject({
    frequency: 'monthly',
    monthWeeks: [2, 4],
    weekdays: [6],
  });
  form.delete('monthWeeks');
  expect(() => recurrenceInput(form)).toThrow();
});
test('new subpages retain their permission boundaries', () => {
  const context = {
    scope: 'MARKET' as const,
    name: 'Market',
    source: 'fixture' as const,
    permissions: ['ReadOwnMarket'] as const,
  };
  expect(routeAllowed(context, '/market/vendors/participation/2')).toBe(true);
  expect(routeAllowed(context, '/market/occurrences/generate')).toBe(false);
  expect(routeAllowed(context, '/market/rentals')).toBe(false);
});
