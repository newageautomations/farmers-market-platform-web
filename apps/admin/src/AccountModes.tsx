import { buttonClassName } from '@market/ui/presentation';
import { AccountModeSelect, Select } from '@market/ui';
import { useEffect, useState } from 'react';
import {
  createPlatformAccountApi,
  type PlatformAccountContexts,
} from '@market/api';
import type { AdminContext } from '@market/admin-core';
import './account-modes.css';
export function AccountModes({
  endpoint,
  channelToken,
  context,
  onSwitch,
  customerOrigin,
  accountOrigin,
}: {
  endpoint: string;
  channelToken: string;
  context: AdminContext;
  onSwitch: (channelId: string) => void;
  customerOrigin?: string;
  accountOrigin?: string;
}) {
  const [account, setAccount] = useState<PlatformAccountContexts | null>(null);
  useEffect(() => {
    let current = true;
    void createPlatformAccountApi({ endpoint, channelToken })
      .contexts()
      .then((a) => {
        if (current) setAccount(a);
      })
      .catch(() => {
        if (current) setAccount(null);
      });
    return () => {
      current = false;
    };
  }, [endpoint, channelToken]);
  const personalOrigin = accountOrigin ?? customerOrigin;
  if (!account)
    return personalOrigin ? (
      <a
        className={buttonClassName({
          variant: 'secondary',
          className: 'button secondary',
        })}
        href={new URL('/account/login', personalOrigin).toString()}
      >
        Your account
      </a>
    ) : (
      <span>Account switching unavailable</span>
    );
  const mode =
    context.scope === 'MARKET'
      ? 'MARKET_MANAGER'
      : context.scope === 'VENDOR'
        ? 'VENDOR'
        : 'PLATFORM';
  const businesses = account.affiliations.filter((a) => a.mode === mode);
  function switchBusiness(channelId: string) {
    const business = account?.affiliations.find(
      (a) => a.channelId === channelId,
    );
    if (!business) return;
    window.history.replaceState(
      null,
      '',
      `/${business.mode === 'VENDOR' ? 'vendor' : 'market'}?channel=${encodeURIComponent(channelId)}`,
    );
    window.dispatchEvent(new PopStateEvent('popstate'));
    onSwitch(channelId);
  }
  return (
    <div className="account-mode-controls">
      {personalOrigin && (
        <a
          className={buttonClassName({
            variant: 'secondary',
            className: 'button secondary',
          })}
          href={new URL('/account/login', personalOrigin).toString()}
        >
          Your account
        </a>
      )}
      <AccountModeSelect
        value={mode}
        choices={[
          ...(personalOrigin ? [{ value: 'CUSTOMER', label: 'Customer' }] : []),
          ...(account.affiliations.some((a) => a.mode === 'VENDOR')
            ? [{ value: 'VENDOR', label: 'Vendor' }]
            : []),
          ...(account.affiliations.some((a) => a.mode === 'MARKET_MANAGER')
            ? [{ value: 'MARKET_MANAGER', label: 'Market Manager' }]
            : []),
          ...(context.scope === 'PLATFORM'
            ? [{ value: 'PLATFORM', label: 'Platform' }]
            : []),
        ]}
        onSelect={(value) => {
          if (value === 'CUSTOMER' && personalOrigin) {
            window.location.assign(
              new URL('/account/login', personalOrigin).toString(),
            );
            return;
          }
          const business = account.affiliations.find((a) => a.mode === value);
          if (business) switchBusiness(business.channelId);
        }}
      />
      {businesses.length > 1 && (
        <>
          <label htmlFor="account-business">Business</label>
          <Select
            id="account-business"
            value={
              businesses.find(
                (a) =>
                  a.id ===
                  Number(
                    context.subject &&
                      ('vendorId' in context.subject
                        ? context.subject.vendorId
                        : 'marketId' in context.subject
                          ? context.subject.marketId
                          : 0),
                  ),
              )?.channelId ?? businesses[0]?.channelId
            }
            onChange={(e) => switchBusiness(e.target.value)}
          >
            {businesses.map((a) => (
              <option key={a.channelId} value={a.channelId}>
                {a.name}
              </option>
            ))}
          </Select>
        </>
      )}
      <span className="visually-hidden">
        Current mode:{' '}
        {mode === 'MARKET_MANAGER'
          ? 'Market Manager'
          : mode === 'VENDOR'
            ? 'Vendor'
            : 'Platform'}
      </span>
    </div>
  );
}
