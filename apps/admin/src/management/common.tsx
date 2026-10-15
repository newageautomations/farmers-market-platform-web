import { Badge } from '@market/ui';
import { managementStatusTone } from './status-presentation';
import { type ReactNode } from 'react';
import { Card, Pagination, SelectField } from '@market/ui';
import type { ManagementEntitlement, ModuleReadiness } from '@market/api';
import { date } from '../vendor/common';
export function Choice({
  name,
  label,
  children,
  value,
  onChange,
  required = true,
}: {
  name: string;
  label: string;
  children: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <SelectField
      label={label}
      name={name}
      required={required}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    >
      {children}
    </SelectField>
  );
}
export function Pager({
  skip,
  total,
  setSkip,
  count = Math.max(0, Math.min(20, total - skip)),
}: {
  skip: number;
  total: number;
  setSkip: (skip: number) => void;
  count?: number;
}) {
  return (
    <Pagination
      label="Results pages"
      summary={
        <>
          {total} results · {count ? skip + 1 : 0} to {count ? skip + count : 0}
        </>
      }
      hasPrevious={skip > 0}
      hasNext={skip + 20 < total}
      onPrevious={() => setSkip(Math.max(0, skip - 20))}
      onNext={() => setSkip(skip + 20)}
      previousLabel="Previous page"
      nextLabel="Next page"
    />
  );
}
export function Entitlements({
  items,
}: {
  items: readonly ManagementEntitlement[];
}) {
  return (
    <div className="management-grid">
      {items.map((e) => (
        <Card as="article" spacing="contained" key={e.featureCode}>
          <h2 className="ui-section-title-dashboard">{e.featureCode}</h2>
          <p>
            <Badge tone={e.allowed ? 'success' : 'neutral'}>
              {e.allowed ? 'Allowed' : 'Denied'}
            </Badge>{' '}
            · {e.reason}
          </p>
          <dl className="facts">
            <div>
              <dt>Value</dt>
              <dd>
                {e.valueKind === 'BOOLEAN'
                  ? e.enabled
                    ? 'Enabled'
                    : 'Disabled'
                  : e.unlimited
                    ? 'Unlimited'
                    : (e.limit ?? 'Not configured')}
              </dd>
            </div>
            {e.currentCount != null && (
              <div>
                <dt>Current quantity</dt>
                <dd>{e.currentCount}</dd>
              </div>
            )}
            {e.committed != null && (
              <div>
                <dt>Committed</dt>
                <dd>{e.committed}</dd>
              </div>
            )}
            {e.reserved != null && (
              <div>
                <dt>Reserved</dt>
                <dd>{e.reserved}</dd>
              </div>
            )}
            {e.remaining != null && (
              <div>
                <dt>Remaining</dt>
                <dd>{e.remaining}</dd>
              </div>
            )}
          </dl>
          {e.windowStart && (
            <p>
              Usage window: {date(e.windowStart)} to {date(e.windowEnd)} ·{' '}
              {e.windowPolicy}
            </p>
          )}
          <p>Access policy: {e.accessPolicyVersion ?? 'Not configured'}</p>
        </Card>
      ))}
    </div>
  );
}
export function Readiness({ items }: { items: readonly ModuleReadiness[] }) {
  const names: Record<string, string> = {
    'marketplace-stripe-connect': 'Marketplace Stripe Connect',
    'saas-stripe-billing': 'Platform SaaS Stripe Billing',
    'account-email': 'Account email',
    'marketing-email': 'Marketing email',
    sms: 'SMS',
    'pos-adapters': 'POS adapters',
    'vendor-stripe-account': 'Vendor Stripe account',
    'vendor-pos-connections': 'Vendor POS connections',
  };
  return (
    <div className="management-grid">
      {items.map((m) => (
        <Card as="article" spacing="contained" key={m.code}>
          <h2 className="ui-section-title-dashboard">
            {names[m.code] ?? m.code}
          </h2>
          <p>
            <Badge tone={managementStatusTone('readiness', m.state)}>
              {m.state === 'NOT_CONFIGURED' ? 'Not configured' : m.state}
            </Badge>
          </p>
          <p>{m.detail}</p>
          <p>External qualification: {m.qualification}</p>
          <p>Configuration observed {date(m.asOf)}</p>
        </Card>
      ))}
    </div>
  );
}
