import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AppError,
  createTeamApi,
  type TeamMember,
  type TeamPolicy,
} from '@market/api';
import type { AdminContext } from '@market/admin-core';
import { routeAllowed, visibleNavigation } from '@market/admin-core';
import { TeamWorkspace } from '../apps/admin/src/team/TeamWorkspace';

function fixture(scope: 'VENDOR' | 'MARKET' = 'VENDOR') {
  const base = scope === 'VENDOR' ? 'ReadOwnVendorIdentity' : 'ReadOwnMarket';
  const extra =
    scope === 'VENDOR' ? 'ReadOwnCatalog' : 'ReadOwnMarketApplications';
  const policy: TeamPolicy = {
    membershipId: '1',
    owner: true,
    basePermission: base,
    grantablePermissions: [base, extra],
    presets: [
      { role: 'staff', permissions: [base] },
      { role: 'lead', permissions: [base, extra] },
      { role: 'administrator', permissions: [base, extra] },
    ],
  };
  const owner: TeamMember = {
    id: '1',
    name: 'Mara Owner',
    email: 'owner@test.invalid',
    role: 'owner',
    status: 'active',
    permissions: [base, extra],
    delegationCeiling: [],
    grantRevision: 1,
    canManage: false,
  };
  const staff: TeamMember = {
    ...owner,
    id: '2',
    name: 'Jordan Rivera',
    email: 'jordan@test.invalid',
    role: 'staff',
    permissions: [base],
    grantRevision: 3,
    canManage: true,
  };
  const api = {
    policy: vi.fn().mockResolvedValue(policy),
    members: vi.fn().mockResolvedValue([owner, staff]),
    member: vi.fn().mockResolvedValue(staff),
    invitations: vi.fn().mockResolvedValue([
      {
        id: '9',
        email: 'pending@test.invalid',
        role: 'staff',
        status: 'pending',
        expiresAt: '2026-11-07T12:00:00Z',
        createdAt: '2026-10-31T12:00:00Z',
        deliveredAt: null,
        presetVersion: 'v1',
        canManage: true,
      },
    ]),
    invite: vi.fn().mockResolvedValue({}),
    resend: vi.fn().mockResolvedValue({}),
    cancel: vi.fn().mockResolvedValue({}),
    change: vi.fn().mockResolvedValue(true),
  };
  const context: AdminContext = {
    scope,
    name: 'Test business',
    source: 'backend',
    membershipRole: 'owner',
    subject: scope === 'VENDOR' ? { vendorId: '1' } : { marketId: '1' },
    permissions: [],
  };
  return { api, context, policy, owner, staff, extra, base };
}
async function mount(f = fixture()) {
  render(<TeamWorkspace api={f.api} context={f.context} />);
  await screen.findByRole('button', { name: 'Jordan Rivera' });
  return f;
}
function inviteForm() {
  return screen
    .getByRole('button', { name: 'Send invitation' })
    .closest('form')!;
}
describe.each(['VENDOR', 'MARKET'] as const)('%s team content', (scope) => {
  it('loads real member identities, invitations, and searches names and email', async () => {
    await mount(fixture(scope));
    expect(screen.getByText('pending@test.invalid')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search your team'), {
      target: { value: 'jordan@' },
    });
    expect(
      screen.queryByRole('button', { name: 'Mara Owner' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Jordan Rivera' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'lead' },
    });
    expect(screen.getByText('No matching team members')).toBeInTheDocument();
  });
  it('copies intentional presets, keeps custom choices, and submits actual capabilities', async () => {
    const f = await mount(fixture(scope));
    const form = within(inviteForm());
    fireEvent.click(form.getByRole('radio', { name: /Lead/ }));
    const checkboxes = form.getAllByRole('checkbox', { hidden: true });
    const extra = checkboxes.find((c) => !(c as HTMLInputElement).disabled)!;
    expect(extra).toBeChecked();
    fireEvent.click(extra);
    fireEvent.change(form.getByLabelText('Email address'), {
      target: { value: 'new@test.invalid' },
    });
    expect(extra).not.toBeChecked();
    fireEvent.submit(inviteForm());
    await waitFor(() =>
      expect(f.api.invite).toHaveBeenCalledWith({
        role: 'lead',
        email: 'new@test.invalid',
        permissions: [f.base],
      }),
    );
    await screen.findByText(
      'Invitation created. Access begins when the recipient accepts.',
    );
  });
});
it('never requests private team data for Staff or a role label without authority', () => {
  const f = fixture();
  render(
    <TeamWorkspace
      api={f.api}
      context={{ ...f.context, membershipRole: 'staff' }}
    />,
  );
  expect(f.api.members).not.toHaveBeenCalled();
  expect(screen.getByText('Team management is restricted')).toBeInTheDocument();
  expect(
    routeAllowed(
      { ...f.context, membershipRole: 'administrator' },
      '/vendor/team',
    ),
  ).toBe(false);
  expect(routeAllowed(f.context, '/vendor/team')).toBe(true);
});
it('resends, confirms cancellation, and refreshes the scoped lists', async () => {
  const f = await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Resend' }));
  await screen.findByText('Invitation resent. Previous links no longer work.');
  expect(f.api.resend).toHaveBeenCalledWith('9');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel invitation' }));
  expect(f.api.cancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
  await waitFor(() => expect(f.api.cancel).toHaveBeenCalledWith('9'));
});
it('loads member detail before saving, supplies revision, and confirms revocation', async () => {
  const f = await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Jordan Rivera' }));
  const dialog = await screen.findByRole('dialog', { name: /Jordan Rivera/ });
  expect(f.api.member).toHaveBeenCalledWith('2');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save access' }));
  await waitFor(() =>
    expect(f.api.change).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '2',
        expectedRevision: 3,
        permissions: [f.base],
        revoke: false,
      }),
    ),
  );
  await screen.findByText('Employee access updated.');
  fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm revocation' }));
  await waitFor(() =>
    expect(f.api.change).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: '2',
        expectedRevision: 3,
        permissions: [],
        revoke: true,
      }),
    ),
  );
});
it('keeps Owner read-only and excludes administrator presets for delegated managers', async () => {
  const f = fixture();
  f.api.policy.mockResolvedValue({
    ...f.policy,
    owner: false,
    presets: f.policy.presets.filter((p) => p.role !== 'administrator'),
  });
  f.api.member.mockResolvedValue(f.owner);
  await mount(f);
  expect(
    screen.queryByRole('radio', { name: /Administrator/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mara Owner' }));
  const dialog = await screen.findByRole('dialog', { name: /Mara Owner/ });
  expect(
    within(dialog).queryByRole('button', { name: 'Save access' }),
  ).not.toBeInTheDocument();
});
it('shows revision conflict and blocks save until the current team is reloaded', async () => {
  const f = await mount();
  f.api.change.mockRejectedValue(new AppError('conflict'));
  fireEvent.click(screen.getByRole('button', { name: 'Edit permissions' }));
  const dialog = await screen.findByRole('dialog', { name: /Jordan Rivera/ });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save access' }));
  await waitFor(() =>
    expect(
      within(dialog).getByRole('button', { name: 'Save access' }),
    ).toBeDisabled(),
  );
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Reload current access' }),
  );
  await waitFor(() => expect(f.api.policy).toHaveBeenCalledTimes(2));
});
it('does not show another workspace while a new workspace loads or a stale request resolves', async () => {
  const a = fixture();
  let resolve!: (value: TeamMember[]) => void;
  a.api.members.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = render(<TeamWorkspace api={a.api} context={a.context} />);
  await waitFor(() => expect(a.api.members).toHaveBeenCalled());
  const b = fixture('MARKET');
  b.api.members.mockResolvedValue([{ ...b.owner, name: 'Market Owner' }]);
  view.rerender(<TeamWorkspace api={b.api} context={b.context} />);
  await screen.findByRole('button', { name: 'Market Owner' });
  resolve([a.staff]);
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Jordan Rivera' }),
    ).not.toBeInTheDocument(),
  );
});
it('clears employee data and offers retry after an authorization error', async () => {
  const f = await mount();
  f.api.resend.mockRejectedValue(new AppError('forbidden'));
  fireEvent.click(screen.getByRole('button', { name: 'Resend' }));
  await screen.findByText('You do not have access to this area.');
  expect(screen.queryByText('jordan@test.invalid')).not.toBeInTheDocument();
});
it('uses scoped generated GraphQL operations and recognizes Phase B revision conflicts', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        errors: [
          {
            message: 'Employee access changed. Reload the team before saving.',
            extensions: { code: 'BAD_USER_INPUT' },
          },
        ],
      }),
    ),
  );
  const api = createTeamApi({
    endpoint: 'http://localhost:3000/admin-api',
    channelToken: 'selected-business',
    fetch: fetcher,
  });
  await expect(
    api.change({
      id: '2',
      role: 'staff',
      permissions: [],
      expectedRevision: 3,
      delegationCeiling: undefined,
      revoke: true,
    }),
  ).rejects.toMatchObject({ kind: 'conflict' });
  expect(fetcher.mock.calls[0]![1].headers['vendure-token']).toBe(
    'selected-business',
  );
  expect(JSON.parse(fetcher.mock.calls[0]![1].body).query).toContain(
    'mutation TeamChange',
  );
});
it('allows Owner-defined administrator ceilings without changing customized grants', async () => {
  const f = fixture();
  f.api.member.mockResolvedValue({
    ...f.staff,
    role: 'administrator',
    permissions: [f.base, f.extra],
    delegationCeiling: [],
  });
  await mount(f);
  fireEvent.click(screen.getByRole('button', { name: 'Jordan Rivera' }));
  const dialog = await screen.findByRole('dialog', { name: /Jordan Rivera/ });
  const ceiling = within(dialog)
    .getByText('Administrator delegation ceiling')
    .closest('details')!;
  fireEvent.click(
    within(ceiling).getAllByRole('checkbox', { hidden: true })[0]!,
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save access' }));
  await waitFor(() =>
    expect(f.api.change).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'administrator',
        permissions: [f.base, f.extra],
        delegationCeiling: [f.base],
        expectedRevision: 3,
      }),
    ),
  );
});
it('supports empty invitations and hides lifecycle actions beyond delegated authority', async () => {
  const f = fixture();
  f.api.invitations.mockResolvedValue([]);
  await mount(f);
  expect(
    screen.getByText('No invitations awaiting acceptance.'),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Resend' }),
  ).not.toBeInTheDocument();
});
it('keeps invitation validation native and requires the base capability in a ceiling', async () => {
  const f = fixture();
  f.api.policy.mockResolvedValue({
    ...f.policy,
    owner: false,
    grantablePermissions: [],
    presets: [{ role: 'staff', permissions: [] }],
  });
  await mount(f);
  expect(
    screen.getByRole('button', { name: 'Send invitation' }),
  ).toBeDisabled();
  const input = screen.getByLabelText('Email address') as HTMLInputElement;
  expect(input.required).toBe(true);
  fireEvent.change(input, { target: { value: 'not-an-email' } });
  expect(input.checkValidity()).toBe(false);
  expect(f.api.invite).not.toHaveBeenCalled();
});
it('opens only one permission group at a time and preserves checkbox selections', async () => {
  await mount();
  const form = inviteForm();
  const business = within(form)
    .getByText('Business and team')
    .closest('details')!;
  const products = within(form)
    .getByText('Products and orders')
    .closest('details')!;
  fireEvent.click(within(business).getByText('Business and team'));
  expect(business.open).toBe(true);
  fireEvent.click(within(products).getByText('Products and orders'));
  expect(products.open).toBe(true);
  expect(business.open).toBe(false);
  fireEvent.click(within(products).getByRole('checkbox'));
  fireEvent.click(within(business).getByText('Business and team'));
  expect(products.open).toBe(false);
  fireEvent.click(within(products).getByText('Products and orders'));
  expect(within(products).getByRole('checkbox')).toBeChecked();
});
it('shows Team in authorized workspace navigation and uses the dedicated route', () => {
  const f = fixture();
  expect(visibleNavigation(f.context)).toContainEqual(
    expect.objectContaining({ label: 'Team', path: '/vendor/team' }),
  );
  expect(
    visibleNavigation({ ...f.context, membershipRole: 'staff' }),
  ).not.toContainEqual(expect.objectContaining({ path: '/vendor/team' }));
  expect(routeAllowed(f.context, '/vendor/team')).toBe(true);
  expect(routeAllowed(f.context, '/vendor/settings/team')).toBe(false);
});
