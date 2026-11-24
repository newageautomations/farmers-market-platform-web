import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  routeAllowed,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';
import type { TestAccountSummary } from '@market/api';
import { PlatformTestAccounts } from '../apps/admin/src/management/PlatformTestAccounts';
import type { ManagementService } from '../apps/admin/src/management/service';

const path = '/platform/test-accounts';
const platform: AdminContext = {
  scope: 'PLATFORM',
  name: 'Platform administration',
  source: 'backend',
  permissions: ['SuperAdmin'],
  testAccountsAvailable: true,
};
const account: TestAccountSummary = {
  id: '42',
  firstName: 'Avery',
  lastName: 'Fixture',
  email: 'avery@fixtures.invalid',
  phone: '+12025550113',
  type: 'vendor',
  workspaceName: 'Fixture Farm',
  emailVerified: true,
  phoneVerified: true,
  createdAt: '2026-11-24T12:00:00Z',
};
const password = 'Tester2026!';
const destination =
  'http://localhost:4322/vendor?channel=16&principal=42&account=1';

describe('Platform Test Accounts', () => {
  it('uses the server capability and current SuperAdmin scope for navigation and direct entry', () => {
    expect(visibleNavigation(platform)).toContainEqual(
      expect.objectContaining({ path, label: 'Test Accounts' }),
    );
    expect(routeAllowed(platform, path)).toBe(true);
    for (const denied of [
      { ...platform, testAccountsAvailable: false },
      { ...platform, permissions: [] },
      { ...platform, scope: 'VENDOR' as const },
    ]) {
      expect(visibleNavigation(denied).some((item) => item.path === path)).toBe(
        false,
      );
      expect(routeAllowed(denied, path)).toBe(false);
    }
  });

  it('switches workspace fields, reports validation, refreshes the list, and copies credentials once', async () => {
    const user = userEvent.setup();
    const copy = vi.spyOn(navigator.clipboard, 'writeText');
    const testAccounts = vi
      .fn<ManagementService['testAccounts']>()
      .mockResolvedValueOnce({ totalItems: 0, items: [] })
      .mockResolvedValue({ totalItems: 1, items: [account] });
    const createTestAccount = vi
      .fn<ManagementService['createTestAccount']>()
      .mockResolvedValueOnce({
        account: null,
        destination: null,
        problem: 'EMAIL_IN_USE',
      })
      .mockResolvedValue({ account, destination, problem: null });
    render(
      <PlatformTestAccounts service={{ testAccounts, createTestAccount }} />,
    );
    await screen.findByText('No test accounts yet');
    await user.click(
      screen.getByRole('button', { name: 'Create Test Account' }),
    );
    const dialog = within(screen.getByRole('dialog'));
    const type = dialog.getByLabelText('Account type');
    expect(dialog.queryByLabelText('Business name')).toBeNull();
    await user.selectOptions(type, 'market_manager');
    expect(dialog.getByLabelText('Market name')).toBeRequired();
    await user.selectOptions(type, 'vendor');
    expect(dialog.queryByLabelText('Market name')).toBeNull();
    await user.type(dialog.getByLabelText('Business name'), 'Fixture Farm');
    await user.type(dialog.getByLabelText('First name'), 'Avery');
    await user.type(dialog.getByLabelText('Last name'), 'Fixture');
    await user.type(dialog.getByLabelText('Email address'), account.email);
    await user.type(
      dialog.getByLabelText('Password', { exact: true }),
      password,
    );
    const confirm = dialog.getByLabelText('Confirm password');
    await user.type(confirm, 'Another2026!');
    await user.click(
      dialog.getByRole('button', { name: 'Create Test Account' }),
    );
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'The passwords must match.',
    );
    expect(createTestAccount).not.toHaveBeenCalled();
    await user.clear(confirm);
    await user.type(confirm, password);
    await user.click(
      dialog.getByRole('button', { name: 'Create Test Account' }),
    );
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'This email already belongs to an account.',
    );
    expect(createTestAccount).toHaveBeenLastCalledWith({
      type: 'vendor',
      firstName: 'Avery',
      lastName: 'Fixture',
      email: account.email,
      phone: null,
      workspaceName: 'Fixture Farm',
      password,
      confirmPassword: password,
    });
    await user.click(
      dialog.getByRole('button', { name: 'Create Test Account' }),
    );
    expect(
      await dialog.findByRole('link', { name: 'Open sign-in' }),
    ).toHaveAttribute('href', destination);
    expect(dialog.queryByLabelText('Password', { exact: true })).toBeNull();
    expect(dialog.queryByText(password)).toBeNull();
    await user.click(
      dialog.getByRole('button', { name: 'Copy Login Details' }),
    );
    expect(copy).toHaveBeenCalledWith(
      expect.stringContaining(`Password: ${password}`),
    );
    expect(copy).toHaveBeenCalledWith(expect.stringContaining(destination));
    expect(
      await dialog.findByText('Login details copied.'),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const table = within(screen.getByRole('table', { name: 'Test accounts' }));
    expect(table.getByText(account.email)).toBeInTheDocument();
    expect(table.getByText('Verified (simulated)')).toBeInTheDocument();
    expect(table.queryByText(password)).toBeNull();
    expect(testAccounts.mock.calls).toEqual([
      [0, 20],
      [0, 20],
    ]);
    await user.click(
      screen.getByRole('button', { name: 'Create Test Account' }),
    );
    expect(
      within(screen.getByRole('dialog')).getByLabelText('Password', {
        exact: true,
      }),
    ).toHaveValue('');
    copy.mockRestore();
  });
});
