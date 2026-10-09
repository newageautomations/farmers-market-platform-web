import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { MarketMap, boothTooltipPosition } from '@market/ui';
import {
  Assignments,
  boothStatus,
} from '../apps/admin/src/market/phase14/Assignments';
import { boothData } from './fixtures/phase15b-data';
import type { OperationsCommand } from '@market/api';

test('booth rows keep information collapsed and expanding does not open the assignment modal', async () => {
  const user = userEvent.setup(),
    select = vi.fn();
  render(
    <MarketMap
      definition={boothData.layoutVersions![0]!.definition}
      spaces={[
        {
          elementId: 'booth-1',
          label: 'A1',
          widthFeet: 12,
          depthFeet: 10,
          amenities: ['ELECTRICITY'],
          vendor: null,
        },
      ]}
      onSelect={select}
    />,
  );
  const row = screen
    .getByText('A1', { selector: 'summary span' })
    .closest('details')!;
  expect(row).not.toHaveAttribute('open');
  expect(within(row).getByText(/12 × 10/)).not.toBeVisible();
  await user.click(within(row).getByText('A1'));
  expect(row).toHaveAttribute('open');
  expect(within(row).getByText(/12 × 10/)).toBeVisible();
  expect(select).not.toHaveBeenCalled();
  await user.click(
    within(row).getByRole('button', { name: 'Add business to booth' }),
  );
  expect(select).toHaveBeenCalledWith('booth-1');
});
test('hover shows size and amenities the booth has without opening an assignment', () => {
  render(
    <MarketMap
      definition={boothData.layoutVersions![0]!.definition}
      spaces={[
        {
          elementId: 'booth-1',
          label: 'A1',
          widthFeet: 12,
          depthFeet: 10,
          amenities: ['ELECTRICITY'],
          vendor: null,
        },
      ]}
    />,
  );
  fireEvent.pointerEnter(document.querySelector('[data-element="booth-1"]')!);
  const tip = screen.getByRole('tooltip');
  expect(tip).toHaveTextContent('12 × 10 ft');
  expect(tip).toHaveTextContent('electricity');
  expect(tip).not.toHaveTextContent('water');
  expect(screen.queryByRole('dialog')).toBeNull();
});
test.each([
  [0, 0],
  [700, 0],
  [0, 400],
  [700, 400],
])('hover cards stay inside the viewport at %s,%s', (x, y) => {
  const position = boothTooltipPosition(
    { x, y, width: 80, height: 80 },
    { width: 800, height: 500 },
    { width: 260, height: 180 },
  );
  expect(position.x).toBeGreaterThanOrEqual(8);
  expect(position.y).toBeGreaterThanOrEqual(8);
  expect(position.x + 260).toBeLessThanOrEqual(792);
  expect(position.y + 180).toBeLessThanOrEqual(492);
});
test('booth color status uses its actual assignment invoice and ignores void invoices', () => {
  const assignment = boothData.assignments![0]!;
  expect(boothStatus(undefined, boothData.invoices)).toBe('available');
  expect(boothStatus(assignment, [])).toBe('assigned');
  expect(boothStatus(assignment, boothData.invoices)).toBe('paid');
  expect(
    boothStatus(assignment, [{ ...boothData.invoices![0]!, status: 'VOID' }]),
  ).toBe('assigned');
  expect(boothStatus({ ...assignment, id: 2 }, boothData.invoices)).toBe(
    'assigned',
  );
});
test('a booth opens a modal where an unapproved directory business can receive date approval', async () => {
  const user = userEvent.setup(),
    run = vi.fn(async (_c: OperationsCommand) => ({}));
  render(
    <Assignments
      data={boothData}
      run={run}
      occurrenceId={1}
      canAssign
      canDay={false}
      canBill={false}
    />,
  );
  const row = screen
    .getByText('A1', { selector: 'summary span' })
    .closest('details')!;
  await user.click(within(row).getByText('A1'));
  await user.click(
    within(row).getByRole('button', { name: 'Add business to booth' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Booth A1' });
  await user.selectOptions(
    within(dialog).getByLabelText('Business for selected booth'),
    '2',
  );
  await user.click(
    within(dialog).getByRole('button', {
      name: 'Approve business for this date',
    }),
  );
  expect(run).toHaveBeenCalledWith({
    action: 'APPROVE_OCCURRENCE',
    data: { occurrenceId: 1, directoryId: 2 },
  });
  await user.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
test('editing a business with multiple booths selects the clicked assignment', async () => {
  const data = structuredClone(boothData);
  data.assignments!.push({
    ...data.assignments![0]!,
    id: 3,
    spaceId: 3,
    spaceSnapshot: data.spaces![2]!.details,
  });
  const user = userEvent.setup(),
    run = vi.fn(async (_c: OperationsCommand) => ({}));
  render(
    <Assignments
      data={data}
      run={run}
      occurrenceId={1}
      canAssign
      canDay={false}
      canBill={false}
    />,
  );
  const row = screen
    .getByText('A3', { selector: 'summary span' })
    .closest('details')!;
  await user.click(within(row).getByText('A3'));
  await user.click(
    within(row).getByRole('button', { name: 'Manage business assignment' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Booth A3' });
  expect(within(dialog).getByLabelText('Assignment to edit')).toHaveValue('3');
  await user.click(
    within(dialog).getByRole('button', {
      name: 'Save booth and rental changes',
    }),
  );
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'ASSIGN',
      id: 3,
      data: expect.objectContaining({ spaceId: 3 }),
    }),
  );
});
