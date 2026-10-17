import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  IconButton,
  RecordCard,
  SearchableMultiSelect,
} from '@market/ui';
import { DocumentVersionPicker } from '@market/ui/documents';
import {
  dashboardPaletteDefaults,
  dashboardPalettePresets,
  dashboardPaletteError,
  dashboardPaletteAdvice,
} from '@market/theme';
import {
  DashboardAppearanceProvider,
  DashboardAppearanceSettings,
  useDashboardAppearance,
} from '../apps/admin/src/DashboardAppearance';
import { AdminShell } from '../apps/admin/src/AdminShell';
import type { ComplianceDocument } from '@market/api';

describe('Shared UI refinement', () => {
  it('shows only identifier and status and opens every retained field/action by keyboard', async () => {
    const user = userEvent.setup(),
      act = vi.fn();
    render(
      <DataTable
        label="People"
        headings={['Name', 'Status', 'Email', 'Actions']}
        recordDetails={{ status: 1 }}
      >
        <tr key="a">
          <td>Ada</td>
          <td>
            <Badge tone="success">Active</Badge>
          </td>
          <td>ada@example.test</td>
          <td>
            <Button onClick={act}>Save</Button>
          </td>
        </tr>
      </DataTable>,
    );
    expect(
      screen.getAllByRole('columnheader').map((el) => el.textContent),
    ).toEqual(['Name', 'Status']);
    expect(screen.queryByText('ada@example.test')).toBeNull();
    const trigger = screen.getByRole('button', { name: 'Open Ada' });
    trigger.focus();
    await user.keyboard(' ');
    expect(
      within(screen.getByRole('dialog')).getByText('ada@example.test'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(act).toHaveBeenCalledOnce();
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
    fireEvent.click(within(screen.getByRole('table')).getByText('Active'));
    expect(
      within(screen.getByRole('dialog')).getByText('ada@example.test'),
    ).toBeVisible();
    expect(act).toHaveBeenCalledOnce();
  });
  it('synchronizes open record details from refreshed rows', () => {
    const view = (value: string) => (
      <DataTable
        label="People"
        headings={['Name', 'Status']}
        recordDetails={{ status: 1 }}
      >
        <tr key="a">
          <td>Ada</td>
          <td>{value}</td>
        </tr>
      </DataTable>
    );
    const { rerender } = render(view('Pending'));
    fireEvent.click(screen.getByRole('button', { name: 'Open Ada' }));
    rerender(view('Approved'));
    expect(
      within(screen.getByRole('dialog')).getByText('Approved'),
    ).toBeVisible();
    expect(
      within(screen.getByRole('table')).getByText('Approved'),
    ).toBeVisible();
  });
  it('keeps card actions inside the dialog and utility actions named', () => {
    render(
      <RecordCard title="Certificate" summary={<p>Insurance</p>}>
        <IconButton icon="edit" label="Edit certificate" />
      </RecordCard>,
    );
    expect(
      screen.queryByRole('button', { name: 'Edit certificate' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open Certificate' }));
    expect(
      screen.getByRole('button', { name: 'Edit certificate' }),
    ).toBeVisible();
  });
  it('sorts selected matches first, preserves disabled options and native form values', async () => {
    const user = userEvent.setup();
    function Example() {
      const [values, setValues] = useState(['b']);
      return (
        <form aria-label="Assignment">
          <SearchableMultiSelect
            label="Vendors"
            name="vendors"
            value={values}
            onChange={setValues}
            options={[
              { value: 'z', label: 'Zulu' },
              { value: 'b', label: 'Beta' },
              { value: 'a', label: 'alpha' },
              { value: 'x', label: 'Blocked', disabled: true },
            ]}
          />
        </form>
      );
    }
    render(<Example />);
    const input = screen.getByRole('combobox');
    await user.click(input);
    const names = () =>
      screen
        .getAllByRole('option')
        .map((el) => el.textContent?.replace('✓', '').trim());
    expect(names()).toEqual(['Beta', 'alpha', 'Blocked', 'Zulu']);
    await user.click(screen.getByRole('option', { name: 'alpha' }));
    expect(names()).toEqual(['alpha', 'Beta', 'Blocked', 'Zulu']);
    await user.click(screen.getByRole('option', { name: 'Blocked' }));
    expect(
      new FormData(screen.getByRole('form') as HTMLFormElement).getAll(
        'vendors',
      ),
    ).toEqual(['b', 'a']);
    await user.type(input, 'a');
    expect(names()).toEqual(['alpha', 'Beta']);
    await user.keyboard('{Home}{Enter}');
    expect(names()).toEqual(['Beta', 'alpha']);
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('Beta');
  });
  it('validates required multi-selection and respects a disabled ancestor', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <form aria-label="Assignment">
        <SearchableMultiSelect
          label="Vendors"
          required
          options={[{ value: 'a', label: 'Alpha' }]}
          onChange={change}
        />
      </form>,
    );
    expect((screen.getByRole('form') as HTMLFormElement).checkValidity()).toBe(
      false,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option'));
    expect((screen.getByRole('form') as HTMLFormElement).checkValidity()).toBe(
      true,
    );
    rerender(
      <fieldset disabled>
        <SearchableMultiSelect
          label="Vendors"
          options={[{ value: 'a', label: 'Alpha' }]}
          onChange={change}
        />
      </fieldset>,
    );
    change.mockClear();
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option'));
    expect(change).not.toHaveBeenCalled();
  });
  it('changes the selected version metadata and download without a document mutation', async () => {
    const download = vi.fn();
    const meta = {
      title: 'Certificate',
      category: 'Insurance',
      notes: 'Original notes',
      noExpiration: true,
      issuedOn: null,
      expiresOn: null,
    };
    const document = {
      version_count: 2,
      files: [
        {
          id: 'current',
          filename: 'current.pdf',
          status: 'Available',
          mime: 'application/pdf',
          size: 8,
          created_at: '2026-10-16',
          metadata: { ...meta, notes: 'Current notes' },
        },
        {
          id: 'old',
          filename: 'old.pdf',
          status: 'Available',
          mime: 'application/pdf',
          size: 4,
          created_at: '2026-10-15',
          metadata: meta,
        },
      ],
    } as ComplianceDocument;
    render(
      <DocumentVersionPicker
        document={document}
        busy={false}
        onDownload={download}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /old.pdf/ }));
    expect(screen.getByText('Original notes')).toBeVisible();
    expect(screen.queryByText('Current notes')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(download).toHaveBeenCalledWith('old');
  });
  it.each(['MARKET', 'VENDOR', 'PLATFORM'] as const)(
    '%s shell keeps named navigation when collapsed',
    async (scope) => {
      window.history.replaceState({}, '', '/' + scope.toLowerCase());
      render(
        <AdminShell
          context={{
            scope,
            source: 'fixture',
            name: 'Workspace',
            permissions: [
              'SuperAdmin',
              'ReadOwnMarket',
              'ReadOwnVendorIdentity',
            ],
          }}
          onLogout={() => {}}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
      const sidebar = document.getElementById('market-sidebar')!;
      expect(sidebar).not.toHaveAttribute('inert');
      expect(
        sidebar.querySelectorAll('.navigation-icon').length,
      ).toBeGreaterThan(0);
      const link = within(sidebar).getAllByRole('link')[1]!;
      fireEvent.focus(link);
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        link.getAttribute('aria-label')!,
      );
      expect(
        screen.getByRole('button', { name: 'Expand sidebar' }),
      ).toBeVisible();
    },
  );
});

describe('Account dashboard preferences', () => {
  const palette = { ...dashboardPaletteDefaults, primary: '#492d65' };
  function Probe() {
    return (
      <output aria-label="Saved primary">
        {useDashboardAppearance().palette.primary}
      </output>
    );
  }
  it('preserves the existing workspace defaults until the account chooses a palette', async () => {
    const defaults = { ...dashboardPaletteDefaults, primary: '#244967' };
    const api = { read: vi.fn().mockResolvedValue(null), save: vi.fn() };
    render(
      <DashboardAppearanceProvider accountId="a" api={api} defaults={defaults}>
        <Probe />
        <DashboardAppearanceSettings />
      </DashboardAppearanceProvider>,
    );
    await screen.findByLabelText('Primary', { exact: true });
    expect(screen.getByLabelText('Saved primary')).toHaveTextContent(
      defaults.primary,
    );
    expect(api.save).not.toHaveBeenCalled();
  });
  it('previews, cancels, restores and saves without persisting draft changes', async () => {
    const api = {
      read: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };
    render(
      <DashboardAppearanceProvider accountId="a" api={api}>
        <DashboardAppearanceSettings />
        <Probe />
      </DashboardAppearanceProvider>,
    );
    const input = await screen.findByLabelText('Primary', { exact: true });
    const preset = screen.getByLabelText('Theme preset');
    const preview = screen.getByLabelText('Dashboard color preview');
    expect(
      within(preview).getByRole('button', { name: 'Tertiary' }),
    ).toHaveClass('button-tertiary');
    for (const { id, palette: colors } of dashboardPalettePresets) {
      fireEvent.change(preset, { target: { value: id } });
      expect(dashboardPaletteError(colors)).toBeUndefined();
      expect(preset).toHaveValue(id);
      expect(input).toHaveValue(colors.primary);
      expect(screen.getByLabelText('Secondary', { exact: true })).toHaveValue(
        colors.secondary,
      );
      expect(
        screen.getByLabelText('Dashboard background', { exact: true }),
      ).toHaveValue(colors.background);
      expect(
        screen.getByLabelText('Card background', { exact: true }),
      ).toHaveValue(colors.surface);
      expect(preview).toHaveStyle({ '--brand-primary': colors.primary });
      expect(screen.getByLabelText('Saved primary')).toHaveTextContent(
        dashboardPaletteDefaults.primary,
      );
      expect(api.save).not.toHaveBeenCalled();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(preset).toHaveValue('workspace');
    fireEvent.change(input, { target: { value: palette.primary } });
    expect(preset).toHaveValue('custom');
    expect(screen.getByLabelText('Dashboard color preview')).toHaveStyle({
      '--brand-primary': palette.primary,
    });
    expect(screen.getByLabelText('Saved primary')).toHaveTextContent(
      dashboardPaletteDefaults.primary,
    );
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(input).toHaveValue(dashboardPaletteDefaults.primary);
    fireEvent.change(input, { target: { value: palette.primary } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(preset).toBeDisabled();
    await screen.findByText('Dashboard colors saved.');
    expect(api.save).toHaveBeenCalledWith(palette);
    expect(screen.getByLabelText('Saved primary')).toHaveTextContent(
      palette.primary,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restore defaults' }));
    expect(input).toHaveValue(dashboardPaletteDefaults.primary);
    expect(api.save).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(input).toHaveValue(palette.primary);
    fireEvent.change(preset, { target: { value: 'ocean' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Dashboard colors saved.');
    expect(api.save).toHaveBeenLastCalledWith(
      dashboardPalettePresets[1].palette,
    );
    expect(screen.getByLabelText('Saved primary')).toHaveTextContent(
      dashboardPalettePresets[1].palette.primary,
    );
  });
  it('loads saved colors after remount and never displays another account palette while loading', async () => {
    const a = { read: vi.fn().mockResolvedValue(palette), save: vi.fn() };
    let resolveB: (v: unknown) => void = () => {};
    const b = {
      read: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveB = resolve;
          }),
      ),
      save: vi.fn(),
    };
    const { rerender } = render(
      <DashboardAppearanceProvider accountId="a" api={a}>
        <Probe />
      </DashboardAppearanceProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Saved primary')).toHaveTextContent(
        palette.primary,
      ),
    );
    rerender(
      <DashboardAppearanceProvider accountId="b" api={b}>
        <Probe />
      </DashboardAppearanceProvider>,
    );
    expect(screen.getByLabelText('Saved primary')).toHaveTextContent(
      dashboardPaletteDefaults.primary,
    );
    resolveB(null);
    await waitFor(() => expect(b.read).toHaveBeenCalledOnce());
    rerender(
      <DashboardAppearanceProvider accountId="a" api={a}>
        <Probe />
      </DashboardAppearanceProvider>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Saved primary')).toHaveTextContent(
        palette.primary,
      ),
    );
  });
  it('rejects CSS injection while treating contrast tips as advisory', () => {
    expect(dashboardPaletteError(palette)).toBeUndefined();
    expect(
      dashboardPaletteError({ ...palette, primary: '#fff;display:none' }),
    ).toBeTruthy();
    expect(
      dashboardPaletteError({ ...palette, primary: '#ffffff' }),
    ).toBeUndefined();
    expect(
      dashboardPaletteError({ ...palette, surface: '#000000' }),
    ).toBeUndefined();
    expect(
      dashboardPaletteAdvice({ ...palette, primary: '#ffffff' }),
    ).toBeTruthy();
    expect(
      dashboardPaletteError({ ...palette, arbitrary: '#ffffff' }),
    ).toBeTruthy();
  });
  it('allows saving and reloading valid colors even when contrast tips are shown', async () => {
    const saved = { ...palette, primary: '#ffffff', surface: '#000000' };
    const api = {
      read: vi.fn().mockResolvedValue(saved),
      save: vi.fn().mockResolvedValue(undefined),
    };
    render(
      <DashboardAppearanceProvider accountId="a" api={api}>
        <DashboardAppearanceSettings />
      </DashboardAppearanceProvider>,
    );
    const input = await screen.findByLabelText('Primary', { exact: true });
    expect(input).toHaveValue('#ffffff');
    expect(screen.getByText(/Tip:/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Dashboard colors saved.');
    expect(api.save).toHaveBeenCalledWith(saved);
    fireEvent.change(input, { target: { value: 'invalid' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
