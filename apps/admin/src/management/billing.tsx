import { useCallback } from 'react';
import { Button, Card } from '@market/ui';
import { formatMoney } from '@market/config';
import type { ManagementService } from './service';
import { ReadState, useRead, date, Unavailable } from '../vendor/common';
import { Entitlements } from './common';
export function Billing({ service }: { service: ManagementService }) {
  const subject = service.context.subject;
  const read = useCallback(() => {
    if (!subject) throw new Error('Missing billing subject');
    return service.billing(subject);
  }, [service, subject]);
  const result = useRead('tenant-billing', read),
    data = result.data,
    s = data?.ownSubscription;
  return (
    <>
      <ReadState {...result} retry={result.refresh} />
      {data && (
        <>
          <Card>
            <h2>Subscription</h2>
            <p>{s ? s.status : 'No subscription assigned'}</p>
            <p>
              Source:{' '}
              {data.ownBillingConfiguration.subscriptionSource ??
                'Not assigned'}
            </p>
            <p>
              External provider:{' '}
              {data.ownBillingConfiguration.state === 'NOT_CONFIGURED'
                ? 'Not configured'
                : data.ownBillingConfiguration.state}
            </p>
            {s && (
              <dl className="facts">
                <div>
                  <dt>Exact plan version</dt>
                  <dd>{s.planVersionId}</dd>
                </div>
                <div>
                  <dt>Offer</dt>
                  <dd>{s.offerId}</dd>
                </div>
                <div>
                  <dt>Period</dt>
                  <dd>
                    {date(s.periodStart)} to {date(s.periodEnd)}
                  </dd>
                </div>
              </dl>
            )}
            {s?.pendingChange && (
              <p>
                Pending change: {s.pendingChange.changeType} ·{' '}
                {s.pendingChange.state} · {s.pendingChange.timing} ·{' '}
                {date(s.pendingChange.effectiveAt)}
              </p>
            )}
          </Card>
          <Entitlements items={data.ownEntitlements} />
          <section>
            <h2>Usage</h2>
            {data.ownUsage.length ? (
              <Entitlements items={data.ownUsage} />
            ) : (
              <p>No metered usage definitions apply to this tenant.</p>
            )}
          </section>
          <section>
            <h2>Available offers</h2>
            <div className="management-grid">
              {data.availableBillingOffers.map((o) => (
                <Card key={o.id}>
                  <h3>{o.code}</h3>
                  <p>
                    {formatMoney(o.amount, o.currency)} per {o.cadenceCount}{' '}
                    {o.cadenceInterval}
                  </p>
                  <p>Exact plan version {o.planVersionId}</p>
                  <Button disabled>Select offer</Button>
                </Card>
              ))}
            </div>
            {!data.availableBillingOffers.length && (
              <p>No approved offers are configured.</p>
            )}
          </section>
          <Unavailable>
            External billing actions are unavailable in Phase 13G. Internal
            no-charge assignments are administered by the Platform. Refunds,
            inventory release, reconciliation, unsubscribe, purchase history and
            billing resolution remain outside optional entitlement gating.
          </Unavailable>
          <div className="actions">
            <Button disabled>Request plan change</Button>
            <Button disabled>Cancel subscription</Button>
            <Button disabled>Open billing portal</Button>
          </div>
        </>
      )}
    </>
  );
}
