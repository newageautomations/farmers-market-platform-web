import { useCallback } from 'react';
import { Badge, EmptyState } from '@market/ui';
import {
  FarmstandButton as Button,
  FarmstandPanel,
} from '@market/ui/farmstand';
import { formatMoney } from '@market/config';
import { managementStatusTone } from './status-presentation';
import type { ManagementService } from './service';
import { ReadState, useRead, date, Unavailable } from '../vendor/common';
import { Entitlements } from './common';
import { WorkspaceFrame } from '../WorkspaceFrame';
import { SettingsPanel } from '../settings/SettingsPanel';
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
    <WorkspaceFrame
      icon="credit-card"
      title="Subscription"
      description="Your plan, included features, usage and available offers."
      tabs={[]}
      value="billing"
      onChange={() => {}}
      className="management-billing farmstand-controls"
    >
      <ReadState skeleton="detail" {...result} retry={result.refresh} />
      {data && (
        <>
          <SettingsPanel
            icon="receipt-text"
            title="Subscription"
            description={
              s ? (
                <Badge tone={managementStatusTone('subscription', s.status)}>
                  {s.status}
                </Badge>
              ) : (
                'No subscription assigned'
              )
            }
            module="management-workspace"
          >
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
            <div className="actions">
              <Button disabled>Request plan change</Button>
              <Button disabled variant="secondary">
                Cancel subscription
              </Button>
              <Button disabled variant="secondary">
                Open billing portal
              </Button>
            </div>
          </SettingsPanel>
          <SettingsPanel
            icon="shield-check"
            title="Features"
            description="What your current plan includes."
            module="management-workspace"
          >
            <Entitlements items={data.ownEntitlements} />
          </SettingsPanel>
          <SettingsPanel
            icon="chart-column"
            title="Usage"
            module="management-workspace"
          >
            {data.ownUsage.length ? (
              <Entitlements items={data.ownUsage} />
            ) : (
              <EmptyState title="No metered usage">
                <p>No metered usage definitions apply to this tenant.</p>
              </EmptyState>
            )}
          </SettingsPanel>
          <SettingsPanel
            icon="tag"
            title="Available offers"
            module="management-workspace"
          >
            {data.availableBillingOffers.length ? (
              <div className="management-grid">
                {data.availableBillingOffers.map((o) => (
                  <FarmstandPanel
                    as="article"
                    className="management-entitlement"
                    key={o.id}
                  >
                    <h3>{o.code}</h3>
                    <p>
                      {formatMoney(o.amount, o.currency)} per {o.cadenceCount}{' '}
                      {o.cadenceInterval}
                    </p>
                    <p>Exact plan version {o.planVersionId}</p>
                    <Button disabled>Select offer</Button>
                  </FarmstandPanel>
                ))}
              </div>
            ) : (
              <EmptyState title="No offers configured">
                <p>No approved offers are configured.</p>
              </EmptyState>
            )}
          </SettingsPanel>
          <Unavailable>
            External billing actions are unavailable in Phase 13G. Internal
            no-charge assignments are administered by the Platform. Refunds,
            inventory release, reconciliation, unsubscribe, purchase history and
            billing resolution remain outside optional entitlement gating.
          </Unavailable>
        </>
      )}
    </WorkspaceFrame>
  );
}
