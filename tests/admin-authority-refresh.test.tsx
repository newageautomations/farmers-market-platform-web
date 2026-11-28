import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@market/api';
import type { AdminContext } from '@market/admin-core';
import type { SessionState } from '@market/auth';

const mocks = vi.hoisted(() => ({
  restore: vi.fn(),
  logout: vi.fn(),
  signIn: vi.fn(),
  resolve: vi.fn(),
  service: vi.fn(),
  denied: undefined as undefined | (() => void),
}));
vi.mock('@market/auth', async (original) => ({
  ...(await original<typeof import('@market/auth')>()),
  createAdminSession: () => ({ restore: mocks.restore, logout: mocks.logout }),
}));
vi.mock('@market/admin-core', async (original) => ({
  ...(await original<typeof import('@market/admin-core')>()),
  resolveAdminContext: mocks.resolve,
}));
vi.mock('../apps/admin/src/account-login', () => ({
  completePlatformAccountLogin: async () => {},
  selectAuthorizedAccountContext: async (
    _endpoint: string,
    session: SessionState,
  ) => session,
  platformAccountLogin: mocks.signIn,
}));
vi.mock('../apps/admin/src/vendor/service', () => ({
  createLiveVendorService: mocks.service,
}));
vi.mock('../apps/admin/src/AdminShell', () => ({
  AdminShellSkeleton: () => null,
  AdminShell: ({ onLogout }: { onLogout: () => void }) => (
    <>
      <button onClick={() => mocks.denied?.()}>Exercise denied resource</button>
      <button onClick={onLogout}>Sign out</button>
    </>
  ),
}));
import { AdminApp } from '../apps/admin/src/AdminApp';

afterEach(() => {
  vi.clearAllMocks();
  mocks.denied = undefined;
  window.history.replaceState(null, '', '/');
});
const context: AdminContext = {
  scope: 'VENDOR',
  name: 'Employee Vendor',
  subject: { vendorId: '1' },
  membershipRole: 'lead',
  permissions: ['ReadOwnVendorIdentity', 'ReadOwnCatalog'],
  source: 'backend',
};
const channel = {
  id: '9',
  token: 'vendor-token',
  code: 'vendor',
  permissions: [...context.permissions],
};
const session: SessionState = {
  status: 'authenticated',
  user: { id: '2', identifier: 'employee@test.invalid', channels: [channel] },
  channel,
};
function start(path = '/vendor?channel=9', accountOrigin?: string) {
  window.history.replaceState(null, '', path);
  mocks.restore.mockImplementation(async () => ({ ...session }));
  mocks.resolve.mockResolvedValue(context);
  mocks.service.mockImplementation((_context, _endpoint, _token, onDenied) => {
    mocks.denied = onDenied;
    return {};
  });
  render(
    <AdminApp
      endpoint="http://localhost:3000/admin-api"
      accountOrigin={accountOrigin}
    />,
  );
  return screen.findByRole('button', { name: 'Exercise denied resource' });
}

it('starts sign-in without the previous workspace or principal after sign-out', async () => {
  const accountOrigin = 'http://auth.platform.localhost:4321';
  mocks.logout.mockResolvedValueOnce(undefined);
  await start('/vendor/orders?channel=9&principal=2#details', accountOrigin);

  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  const signIn = await screen.findByRole('button', { name: 'Sign in' });

  expect(mocks.logout).toHaveBeenCalledWith(true);
  expect(window.location.href).toBe(`${window.location.origin}/`);
  fireEvent.click(signIn);
  expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith(accountOrigin);
});

describe('workspace authority revalidation', () => {
  it('coalesces denials and keeps the workspace mounted when current authority is unchanged', async () => {
    const button = await start();
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.resolve).toHaveBeenCalledTimes(2));
    expect(mocks.service).toHaveBeenCalledOnce();
    expect(mocks.restore).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole('button', { name: 'Exercise denied resource' }),
    ).toBe(button);
    expect(
      screen.queryByText('Loading your workspace'),
    ).not.toBeInTheDocument();
  });

  it('refreshes once when the backend confirms a permission change', async () => {
    const button = await start();
    mocks.resolve.mockResolvedValue({
      ...context,
      permissions: ['ReadOwnVendorIdentity'],
    });
    fireEvent.click(button);
    await waitFor(() => expect(mocks.service).toHaveBeenCalledTimes(2));
    expect(mocks.restore).toHaveBeenCalledTimes(3);
    expect(mocks.service.mock.calls[1]![0].permissions).toEqual([
      'ReadOwnVendorIdentity',
    ]);
  });

  it('shows a stable unavailable state when membership is revoked', async () => {
    const button = await start();
    mocks.resolve.mockRejectedValue(new AppError('forbidden'));
    fireEvent.click(button);
    await screen.findByRole('heading', { name: 'Workspace unavailable' });
    expect(mocks.service).toHaveBeenCalledOnce();
    expect(mocks.restore).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole('button', { name: 'Exercise denied resource' }),
    ).not.toBeInTheDocument();
  });
});
