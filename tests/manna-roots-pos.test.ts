import { describe, expect, it, vi } from 'vitest';
import { authenticatedSession } from '@market/auth';
import type { AdminUser } from '@market/api';
import {
  routeAllowed,
  resolveAdminContext,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';
import {
  mannaPosPlan,
  type PosAccessFacts,
} from '../scripts/manna-roots-pos-plan';

function facts(): PosAccessFacts {
  return {
    user: {
      id: 8,
      identifier: 'manna-roots@example.test',
      deletedAt: null,
      verified: true,
    },
    vendor: {
      id: 7,
      slug: 'manna-roots',
      provisioningKey: 'requested-vendors:manna-roots',
      status: 'active',
      primaryChannelId: 9,
    },
    memberships: [
      {
        principalId: 8,
        vendorId: 7,
        marketId: null,
        role: 'owner',
        status: 'active',
      },
    ],
    role: {
      id: 9,
      code: 'testing-vendor:manna-roots',
      permissions:
        'Authenticated,ReadOwnVendorIdentity,ManageOwnCatalog,ReadOwnVendorFinance',
      userIds: [8],
      channelIds: [9],
    },
  };
}
describe('Manna Roots guarded POS opt-in', () => {
  it('requires the selected channel and fresh Manna ownership projection to agree', async () => {
    const plan = mannaPosPlan(facts());
    const permissions = plan.after as AdminContext['permissions'];
    const user: AdminUser = {
      id: '8',
      identifier: 'manna-roots@example.test',
      channels: [
        { id: '9', token: 'manna-channel', code: 'manna', permissions },
        { id: '10', token: 'unrelated-channel', code: 'other', permissions },
      ],
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              ownVendorIdentity: {
                id: '7',
                name: 'Manna Roots',
                slug: 'manna-roots',
                status: 'active',
                channelId: '9',
                permissions,
                memberships: [
                  {
                    id: '7',
                    principalId: '8',
                    role: 'owner',
                    status: 'active',
                  },
                ],
              },
            },
          }),
        ),
    );
    const selected = await resolveAdminContext(
      authenticatedSession(user, '9'),
      'http://localhost:3000/admin-api',
    );
    expect(selected.subject).toEqual({ vendorId: '7' });
    expect(routeAllowed(selected, '/vendor/pos')).toBe(true);
    await expect(
      resolveAdminContext(
        authenticatedSession(user, '10'),
        'http://localhost:3000/admin-api',
      ),
    ).rejects.toMatchObject({ kind: 'forbidden' });
  });
  it('adds only the existing POS grant and preserves every original permission', () => {
    const f = facts(),
      original = structuredClone(f),
      plan = mannaPosPlan(f);
    expect(plan.added).toEqual(['OperateOwnPos']);
    expect(plan.after).toEqual([...plan.before, 'OperateOwnPos']);
    expect(f).toEqual(original);
    expect(plan.channelId).toBe(9);
    expect(mannaPosPlan(f).approval).toBe(plan.approval);
    f.role.permissions = plan.after.join(',');
    expect(mannaPosPlan(f).added).toEqual([]);
    expect(mannaPosPlan(f).approval).not.toBe(plan.approval);
  });
  it.each([
    'shared role',
    'extra channel',
    'wrong channel',
    'revoked owner',
    'staff',
    'wrong business',
    'deleted user',
    'unverified user',
    'wrong fixture',
    'platform grant',
  ])('refuses %s without proposing a change', (kind) => {
    const f = facts();
    if (kind === 'shared role') f.role.userIds.push(12);
    if (kind === 'extra channel') f.role.channelIds.push(10);
    if (kind === 'wrong channel') f.role.channelIds = [10];
    if (kind === 'revoked owner') f.memberships[0]!.status = 'revoked';
    if (kind === 'staff') f.memberships[0]!.role = 'staff';
    if (kind === 'wrong business') f.memberships[0]!.vendorId = 10;
    if (kind === 'deleted user') f.user.deletedAt = new Date();
    if (kind === 'unverified user') f.user.verified = false;
    if (kind === 'wrong fixture') f.vendor.provisioningKey = 'other';
    if (kind === 'platform grant') f.role.permissions += ',SuperAdmin';
    expect(() => mannaPosPlan(f)).toThrow();
  });
  it('keeps navigation and route authority aligned with the selected vendor grants', () => {
    const plan = mannaPosPlan(facts());
    const owner: AdminContext = {
      scope: 'VENDOR',
      name: 'Manna Roots',
      source: 'backend',
      subject: { vendorId: '7' },
      membershipRole: 'owner',
      permissions: plan.after as AdminContext['permissions'],
    };
    expect(routeAllowed(owner, '/vendor/pos')).toBe(true);
    expect(visibleNavigation(owner).some((n) => n.path === '/vendor/pos')).toBe(
      true,
    );
    const unrelated = {
      ...owner,
      subject: { vendorId: '10' },
      permissions: plan.before as AdminContext['permissions'],
    };
    expect(routeAllowed(unrelated, '/vendor/pos')).toBe(false);
    expect(
      visibleNavigation(unrelated).some((n) => n.path === '/vendor/pos'),
    ).toBe(false);
    expect(routeAllowed({ ...owner, scope: 'MARKET' }, '/vendor/pos')).toBe(
      false,
    );
    expect(routeAllowed(owner, '/management')).toBe(false);
  });
});
