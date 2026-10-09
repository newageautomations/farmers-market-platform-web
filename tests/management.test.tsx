import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildSchema, parse, validate } from 'graphql';
import { readFileSync } from 'node:fs';
import {
  createManagementApi,
  AppError,
  type CommunicationSettings,
} from '@market/api';
import {
  resolveAdminContext,
  routeAllowed,
  type AdminContext,
} from '@market/admin-core';
import { authenticatedSession } from '@market/auth';
import { Payments } from '../apps/admin/src/management/payments';
import {
  createManagementService,
  type ManagementService,
} from '../apps/admin/src/management/service';
import CommunicationPreferences from '../apps/storefront/src/components/CommunicationPreferences';
const endpoint = 'http://localhost/admin-api';
const vendor: AdminContext = {
  scope: 'VENDOR',
  name: 'Vendor A',
  source: 'backend',
  membershipRole: 'owner',
  subject: { vendorId: '1' },
  permissions: [
    'ReadOwnVendorIdentity',
    'ReadOwnPaymentAccount',
    'ManageOwnPaymentAccount',
    'ReadOwnPosIntegrations',
    'ManageOwnPosIntegrations',
    'ReadOwnBilling',
  ],
};
const response = (data: unknown) => new Response(JSON.stringify({ data }));
describe('Phase 13G safe contracts', () => {
  it.each(['management', 'preferences'])(
    'validates all %s operations against extracted authoritative SDL',
    (name) => {
      const api = name === 'management' ? 'admin' : 'shop',
        schema = buildSchema(
          readFileSync(`packages/api/schema/${api}.graphql`, 'utf8'),
        );
      expect(
        validate(
          schema,
          parse(
            readFileSync(`packages/api/operations/${name}.graphql`, 'utf8'),
          ),
        ),
      ).toEqual([]);
    },
  );
  it('fresh platform scope rejects cached native SuperAdmin after revocation', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [
            {
              message: 'secret raw response',
              extensions: { code: 'FORBIDDEN' },
            },
          ],
        }),
      ),
    );
    const session = authenticatedSession({
      id: '1',
      identifier: 'platform',
      channels: [
        {
          id: '1',
          code: 'default',
          token: 'default',
          permissions: ['SuperAdmin'],
        },
      ],
    });
    await expect(resolveAdminContext(session, endpoint)).rejects.toMatchObject({
      kind: 'forbidden',
    });
    expect(String(fetcher.mock.calls[0]?.[1]?.body)).toContain(
      'platformAdminScope',
    );
    fetcher.mockRestore();
  });
  it('Platform, Vendor and Market route boundaries remain distinct', () => {
    expect(routeAllowed(vendor, '/platform/tenants')).toBe(false);
    expect(
      routeAllowed(
        { ...vendor, scope: 'MARKET' },
        '/vendor/integrations/payments',
      ),
    ).toBe(false);
    expect(
      routeAllowed(
        { ...vendor, scope: 'PLATFORM', permissions: ['SuperAdmin'] },
        '/platform/tenants/vendor/1',
      ),
    ).toBe(true);
    expect(
      routeAllowed(
        { ...vendor, scope: 'PLATFORM', permissions: [] },
        '/platform/billing',
      ),
    ).toBe(false);
  });
  it('sanitizes protected management refusal and revalidates current authority', async () => {
    const denied = vi.fn(),
      fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            errors: [
              {
                message: 'provider secret code SQL stack',
                extensions: { code: 'FORBIDDEN' },
              },
            ],
          }),
        ),
      );
    const service = createManagementService(
      vendor,
      endpoint,
      'vendor-a',
      denied,
    );
    await expect(service.payments('TEST')).rejects.toMatchObject({
      kind: 'forbidden',
    });
    expect(denied).toHaveBeenCalledOnce();
    fetcher.mockRestore();
  });
  it('rejects uncharacterized capability upgrades and strips raw POS account identifiers', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({
        ownPosProviders: [
          {
            providerCode: 'dynamic',
            apiVersion: 'v1',
            capabilities: {
              catalogRead: {
                support: 'UNCHARACTERIZED',
                reason: 'Pending characterization',
              },
            },
          },
        ],
        ownPosConnections: [],
        ownPosRuntime: {
          providers: [],
          allowedRedirectUris: [],
          approvedPhysicalProviderCodes: [],
          approvedPhysicalPolicyId: null,
          approvedPhysicalPolicyVersion: null,
          approvedPhysicalMaxAgeSeconds: null,
        },
      }),
    );
    const result = await createManagementApi({
      endpoint,
      fetch: fetcher,
    }).pos();
    expect(result.providers[0]?.capabilities.catalogRead?.support).toBe(
      'UNCHARACTERIZED',
    );
    expect(JSON.stringify(result)).not.toContain('externalAccountId');
  });
  it('renders authoritative Stripe readiness independently and disables no-config I/O', async () => {
    const connect = vi.fn(),
      service = {
        context: vendor,
        payments: vi.fn().mockResolvedValue({
          ownPaymentConfiguration: {
            state: 'NOT_CONFIGURED',
            providerIOAllowed: false,
            qualification: 'NOT_EXECUTED',
            fundsFlowPolicy: 'NOT_CONFIGURED',
          },
          ownPaymentAccount: {
            accountReference: '…abcd',
            connectionStatus: 'RECONCILIATION_REQUIRED',
            detailsSubmitted: false,
            currentlyDueCount: 2,
            pastDueCount: 0,
            lastSyncAt: null,
            readiness: [
              {
                purpose: 'ACCEPT_DIRECT_CHARGE',
                ready: false,
                reasons: ['CHARGES_DISABLED'],
              },
              { purpose: 'RECEIVE_TRANSFER', ready: true, reasons: [] },
              {
                purpose: 'RECEIVE_PAYOUT',
                ready: false,
                reasons: ['PAYOUTS_DISABLED'],
              },
            ],
          },
          ownVendorEarningsPolicy: {
            entitlementPolicy: 'NOT_CONFIGURED',
            transferPolicy: 'NOT_CONFIGURED',
          },
        }),
        connectStripe: connect,
      } as unknown as ManagementService;
    render(<Payments service={service} />);
    await screen.findByText('Not configured');
    expect(
      screen.getByRole('button', { name: 'Connect account' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('heading', { name: 'Receive transfers' }),
    ).toBeVisible();
    expect(screen.getAllByText('Not ready')).toHaveLength(2);
    expect(
      screen.getByText('Ready according to persisted account state'),
    ).toBeVisible();
    expect(connect).not.toHaveBeenCalled();
  });
  it('withdraws stale consent without requiring renewal and never supplies a subject ID', async () => {
    const initial: CommunicationSettings = {
      subjectKind: 'VENDOR',
      displayName: 'Vendor A',
      noticeVersion: 'notice-v2',
      preferences: [
        {
          medium: 'EMAIL',
          purpose: 'RESTOCK',
          status: 'SUBSCRIBED',
          version: 1,
          renewalRequired: true,
          grantAvailable: true,
          unavailableReason: null,
        },
        {
          medium: 'SMS',
          purpose: 'RESTOCK',
          status: 'UNSUBSCRIBED',
          version: 0,
          renewalRequired: false,
          grantAvailable: false,
          unavailableReason: 'SMS_VERIFIED_CONTACT_POLICY_NOT_CONFIGURED',
        },
      ],
    };
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            ...initial,
            preferences: initial.preferences.map((p) => ({
              ...p,
              status: 'UNSUBSCRIBED',
              renewalRequired: false,
              version: 2,
            })),
          },
        }),
      ),
    );
    render(
      <CommunicationPreferences storefrontId="site-a" initial={initial} />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Withdraw preference' }),
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    const payload = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(payload).toMatchObject({
      storefrontId: 'site-a',
      action: 'communication-change',
      medium: 'EMAIL',
      purpose: 'RESTOCK',
      subscribed: false,
    });
    expect(payload.vendorId).toBeUndefined();
    expect(payload.marketId).toBeUndefined();
    expect(payload.customerId).toBeUndefined();
    fetcher.mockRestore();
  });
  it('requires explicit independent grants and leaves SMS unavailable', () => {
    const initial: CommunicationSettings = {
      subjectKind: 'MARKET',
      displayName: 'Market A',
      noticeVersion: 'n1',
      preferences: [
        {
          medium: 'EMAIL',
          purpose: 'MARKET_ANNOUNCEMENT',
          status: 'UNSUBSCRIBED',
          version: 0,
          renewalRequired: false,
          grantAvailable: true,
          unavailableReason: null,
        },
        {
          medium: 'SMS',
          purpose: 'MARKET_ANNOUNCEMENT',
          status: 'UNSUBSCRIBED',
          version: 0,
          renewalRequired: false,
          grantAvailable: false,
          unavailableReason: 'SMS_VERIFIED_CONTACT_POLICY_NOT_CONFIGURED',
        },
      ],
    };
    render(
      <CommunicationPreferences storefrontId="site-a" initial={initial} />,
    );
    expect(screen.getByRole('checkbox')).toBeRequired();
    expect(
      screen.getAllByRole('button', { name: 'Grant preference' })[1],
    ).toBeDisabled();
    expect(screen.getByText(/Purchases and account claim/)).toBeVisible();
  });
  it('rejects local management commands without exact current module grants', async () => {
    const service = createManagementService(
      { ...vendor, permissions: ['ReadOwnVendorIdentity'] },
      endpoint,
      'vendor-a',
      vi.fn(),
    );
    await expect(service.revokePos('1')).rejects.toBeInstanceOf(AppError);
    await expect(service.payments('TEST')).rejects.toMatchObject({
      kind: 'forbidden',
    });
  });
});
