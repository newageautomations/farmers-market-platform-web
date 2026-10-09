import { useId, type ReactNode } from 'react';
import { Button, Field } from '@market/ui';
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
  const id = useId();
  return (
    <Field id={id} label={label}>
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      >
        {children}
      </select>
    </Field>
  );
}
export function Pager({
  skip,
  total,
  setSkip,
}: {
  skip: number;
  total: number;
  setSkip: (skip: number) => void;
}) {
  return (
    <nav className="actions" aria-label="Results pages">
      <p>
        {total} results · {total ? skip + 1 : 0} to {Math.min(skip + 20, total)}
      </p>
      <Button
        className="secondary"
        disabled={skip === 0}
        onClick={() => setSkip(Math.max(0, skip - 20))}
      >
        Previous page
      </Button>
      <Button
        className="secondary"
        disabled={skip + 20 >= total}
        onClick={() => setSkip(skip + 20)}
      >
        Next page
      </Button>
    </nav>
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
        <article className="card" key={e.featureCode}>
          <h2>{e.featureCode}</h2>
          <p>
            {e.allowed ? 'Allowed' : 'Denied'} · {e.reason}
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
        </article>
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
        <article className="card" key={m.code}>
          <h2>{names[m.code] ?? m.code}</h2>
          <p>{m.state === 'NOT_CONFIGURED' ? 'Not configured' : m.state}</p>
          <p>{m.detail}</p>
          <p>External qualification: {m.qualification}</p>
          <p>Configuration observed {date(m.asOf)}</p>
        </article>
      ))}
    </div>
  );
}
