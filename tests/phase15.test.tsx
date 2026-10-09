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
  Directory,
  Rentals,
  usdToMinor,
} from '../apps/admin/src/market/phase14/Directory';
import {
  localToInstant,
  TimezoneField,
} from '../apps/admin/src/market/timezones';
import { recurrenceInput } from '../apps/admin/src/market/schedule';

import { data, definition } from './fixtures/phase15-data';
async function builder() {
  const user = userEvent.setup(),
    run = vi.fn(async (_command: OperationsCommand) => data.versions![0]);
  render(<Applications data={structuredClone(data)} run={run} canManage />);
  await user.click(screen.getByRole('button', { name: 'Version 1 · draft' }));
  return { user, run };
}
test('application and layout creation do not require names', async () => {
  const run = vi.fn(async () => undefined);
  const view = render(<Applications data={data} run={run} canManage />);
  expect(screen.queryByLabelText('Application name')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Create application' }));
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith({
      action: 'CREATE_APPLICATION',
      data: { name: 'Untitled application' },
    }),
  );
  view.rerender(<Layouts data={data} run={run} canManage />);
  expect(screen.queryByLabelText('Layout name')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Create layout' }));
  await waitFor(() =>
    expect(run).toHaveBeenCalledWith({
      action: 'CREATE_LAYOUT',
      data: { name: 'Untitled layout' },
    }),
  );
});
test('one question expands at a time and custom options are individual fields', async () => {
  const { user } = await builder();
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
test('application title, required toggle, and time question save through the command', async () => {
  const { user, run } = await builder();
  await user.clear(screen.getByLabelText('Application name'));
  await user.type(screen.getByLabelText('Application name'), 'Fall season');
  expect(screen.getByLabelText('Required')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Edit Setup notes' }));
  await user.selectOptions(screen.getByLabelText('Question type'), 'TIME');
  await user.click(screen.getByLabelText('Required'));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(run).toHaveBeenLastCalledWith(
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
});
test('optional fields can be deleted while system identity stays protected', async () => {
  const { user, run } = await builder();
  expect(screen.queryByRole('button', { name: 'Delete question' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Edit Setup notes' }));
  await user.click(screen.getByRole('button', { name: 'Delete question' }));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const saved = run.mock.calls.at(-1)![0].data
    .definition as ApplicationDefinition;
  expect(saved.questions.some((q) => q.id === 'notes')).toBe(false);
  expect(saved.questions.some((q) => q.semantic === 'businessName')).toBe(true);
});
test('new sections are visible, movable, and rename their questions together', async () => {
  const { user, run } = await builder();
  await user.click(screen.getByRole('button', { name: 'Add section' }));
  expect(screen.getByLabelText('Section name: Section 3')).toBeInTheDocument();
  await user.click(
    screen.getByRole('button', { name: 'Move section Section 3 up' }),
  );
  await user.click(screen.getByRole('button', { name: 'Edit Products sold' }));
  await user.selectOptions(screen.getByLabelText('Section'), 'Section 3');
  fireEvent.change(screen.getByLabelText('Section name: Section 3'), {
    target: { value: 'Experience' },
  });
  fireEvent.blur(screen.getByLabelText('Section name: Section 3'));
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  const saved = run.mock.calls.at(-1)![0].data
    .definition as ApplicationDefinition;
  expect(saved.sections).toEqual(['Experience', 'Business', 'Products']);
  expect(saved.questions.find((q) => q.id === 'category')?.section).toBe(
    'Experience',
  );
});
test('submitted application opens in a modal and omits blank optional answers', async () => {
  const user = userEvent.setup();
  render(
    <Applications
      data={data}
      run={async () => undefined}
      canManage={false}
      view="submissions"
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Local Orchard' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).queryByText('Setup notes')).toBeNull();
  expect(within(dialog).queryByText('Products sold')).toBeNull();
  expect(within(dialog).getByText('No')).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
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
test('external business and rental equipment forms are separate pages', () => {
  const view = render(
    <Directory data={data} run={async () => undefined} canManage view="add" />,
  );
  expect(
    screen.getByRole('heading', { name: 'Add external business' }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Rental name')).toBeNull();
  view.rerender(
    <Rentals data={data} run={async () => undefined} canManage view="add" />,
  );
  expect(screen.queryByRole('button', { name: 'Save business' })).toBeNull();
  expect(
    screen.getByRole('button', { name: 'About Price (USD)' }),
  ).toBeInTheDocument();
});
test('USD prices accept at most two decimals, normalize on blur, and save cents', async () => {
  const user = userEvent.setup(),
    run = vi.fn(async () => ({}));
  render(<Rentals data={data} run={run} canManage view="add" />);
  await user.type(screen.getByLabelText('Rental name'), 'Table');
  await user.clear(screen.getByLabelText('Price (USD)'));
  await user.type(screen.getByLabelText('Price (USD)'), '12.345');
  expect(screen.getByLabelText('Price (USD)')).toHaveValue('12.34');
  await user.clear(screen.getByLabelText('Price (USD)'));
  await user.type(screen.getByLabelText('Price (USD)'), '25');
  await user.tab();
  expect(screen.getByLabelText('Price (USD)')).toHaveValue('25.00');
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
