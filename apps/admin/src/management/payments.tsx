import { useCallback, useState } from 'react';
import { Button, Card } from '@market/ui';
import type { ManagementService } from './service';
import {
  CommandForm,
  ReadState,
  date,
  useRead,
  Unavailable,
} from '../vendor/common';
import { Choice } from './common';
export function Payments({ service }: { service: ManagementService }) {
  const [mode, setMode] = useState<'TEST' | 'LIVE'>('TEST'),
    read = useCallback(() => service.payments(mode), [service, mode]);
  const result = useRead(`payments:${mode}`, read);
  const config = result.data?.ownPaymentConfiguration,
    account = result.data?.ownPaymentAccount;
  const manage = service.context.permissions.includes(
      'ManageOwnPaymentAccount',
    ),
    localIO = manage && config?.providerIOAllowed;
  const purpose: Record<string, string> = {
    ACCEPT_DIRECT_CHARGE: 'Accept direct charges',
    RECEIVE_TRANSFER: 'Receive transfers',
    RECEIVE_PAYOUT: 'Receive payouts',
  };
  return (
    <>
      <Choice
        name="mode"
        label="Stripe mode"
        value={mode}
        onChange={(v) => setMode(v as 'TEST' | 'LIVE')}
      >
        <option value="TEST">Test</option>
        <option value="LIVE">Live</option>
      </Choice>
      <ReadState {...result} retry={result.refresh} />
      {config && (
        <>
          <Card>
            <h2>Marketplace Stripe Connect</h2>
            <p>
              {config.state === 'NOT_CONFIGURED'
                ? 'Not configured'
                : config.state}
            </p>
            <p>External qualification: {config.qualification}</p>
            <p>FundsFlowPolicy: {config.fundsFlowPolicy}</p>
            <p>
              Shopper payment confirmation remains unavailable. CHECKOUT-B1 is
              open.
            </p>
          </Card>
          {account ? (
            <>
              <dl className="facts">
                <div>
                  <dt>Connection</dt>
                  <dd>{account.connectionStatus}</dd>
                </div>
                <div>
                  <dt>Account reference</dt>
                  <dd>{account.accountReference}</dd>
                </div>
                <div>
                  <dt>Details submitted</dt>
                  <dd>{account.detailsSubmitted ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Requirements</dt>
                  <dd>
                    {account.currentlyDueCount} currently due ·{' '}
                    {account.pastDueCount} past due
                  </dd>
                </div>
              </dl>
              <p>Last synchronized: {date(account.lastSyncAt)}</p>
              <div className="management-grid">
                {account.readiness.map((r) => (
                  <Card key={r.purpose}>
                    <h2>{purpose[r.purpose] ?? r.purpose}</h2>
                    <p>
                      {r.ready
                        ? 'Ready according to persisted account state'
                        : 'Not ready'}
                    </p>
                    <ul>
                      {r.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <p>No connected payment account is recorded.</p>
          )}
          <Unavailable>
            Connect, reconnect, refresh and disconnect require a configured
            provider. Real OAuth and provider I/O remain reserved for the final
            Stripe phase. A connected account does not qualify platform
            checkout.
          </Unavailable>
          {localIO ? (
            <>
              <CommandForm
                title="Begin local Connect authorization"
                submitLabel="Begin authorization"
                run={() => service.connectStripe(mode)}
                onDone={result.refresh}
              >
                <p>
                  Controlled local transport only. External redirects are not
                  executed in Phase 13G.
                </p>
              </CommandForm>
              {account && (
                <>
                  <CommandForm
                    title="Refresh account"
                    run={() => service.refreshStripe(mode)}
                    onDone={result.refresh}
                  >
                    <p>
                      Read current provider observations through the controlled
                      local transport.
                    </p>
                  </CommandForm>
                  <CommandForm
                    title="Disconnect account"
                    submitLabel="Disconnect"
                    confirm="Disconnect this Vendor payment account? Backend deauthorization and reconciliation preserve its history."
                    run={() => service.disconnectStripe(mode)}
                    onDone={result.refresh}
                  >
                    <p>
                      Retained history remains available for reconciliation.
                    </p>
                  </CommandForm>
                </>
              )}
            </>
          ) : (
            <div className="actions">
              <Button disabled>Connect account</Button>
              <Button disabled>Refresh account</Button>
              <Button disabled>Disconnect account</Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
