import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  Dialog,
  Field,
  Input,
  SelectField,
  Dropdown,
} from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import type {
  QuickBooksApi,
  QuickBooksStatus,
  QuickBooksAmounts,
  QuickBooksAccount,
  QuickBooksRecord,
  QuickBooksSettings,
  QuickBooksRange,
  QuickBooksAdjustment,
} from '@market/api';
import { AppError } from '@market/api';
import { ReadState, RouteLink, useRead } from '../vendor/common';

export function QuickBooks({
  api,
  manager = false,
  categories,
}: {
  api: QuickBooksApi;
  manager?: boolean;
  categories: string[];
}) {
  const read = useCallback(() => api.status(), [api]);
  const status = useRead('quickbooks', read);
  const [draftSettings, setSettings] = useState<QuickBooksSettings | null>(
    null,
  );
  const sources = manager
    ? ['collections', 'expenses']
    : ['cash', 'stripe', 'expenses'];
  const settings: QuickBooksSettings = {
    ...(draftSettings ??
      status.data?.settings ?? { mappings: {}, active: false }),
    sources,
  };
  const settingsDirty =
    !status.data || settingsKey(settings) !== settingsKey(status.data.settings);
  const [accounts, setAccounts] = useState<QuickBooksAccount[]>([]);
  const [range, setRange] = useState<QuickBooksRange>({
    from: '',
    through: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [previewRevision, setPreviewRevision] = useState(0);
  const [history, setHistory] = useState<QuickBooksRecord[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [details, setDetails] = useState<QuickBooksRecord | null>(null);
  const [confirm, setConfirm] = useState<'sync' | 'disconnect' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncOutcome, setSyncOutcome] = useState<{
    message: string;
    severity: 'success' | 'info' | 'warning';
  } | null>(null);
  const [autoProposal, setAutoProposal] = useState<{
    token: string;
    since: string;
  } | null>(null);
  const [autoAcknowledged, setAutoAcknowledged] = useState(false);
  const callbackStarted = useRef(false);
  const accountsLoading = useRef(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountsBusy, setAccountsBusy] = useState(false);
  const [syncHelp, setSyncHelp] = useState(false);
  const [taxHelp, setTaxHelp] = useState(false);
  const action = useCallback(async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    setSyncOutcome(null);
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof AppError && e.code
          ? quickBooksError(e.code)
          : e instanceof Error
            ? e.message
            : 'QuickBooks operation failed. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (callbackStarted.current) return;
    callbackStarted.current = true;
    const params = new URLSearchParams(location.search);
    if (!params.has('code') && !params.has('error')) return;
    window.history.replaceState(null, '', location.pathname);
    if (params.has('error')) {
      queueMicrotask(() =>
        setError(
          'QuickBooks authorization was declined. Connect again when ready.',
        ),
      );
      return;
    }
    if (
      ['state', 'code', 'realmId'].some((k) => params.getAll(k).length !== 1)
    ) {
      queueMicrotask(() =>
        setError('Invalid QuickBooks callback. Connect again.'),
      );
      return;
    }
    void Promise.resolve().then(() =>
      action(async () => {
        await api.complete({
          state: params.get('state')!,
          code: params.get('code')!,
          realmId: params.get('realmId')!,
        });
        setNotice(
          'Sandbox company connected. Review account connections before activating synchronization.',
        );
        status.refresh();
      }),
    );
  }, [api, action, status]);
  const connected = status.data?.status === 'CONNECTED';
  const validDates =
    /^\d{4}-\d{2}-\d{2}$/.test(range.from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(range.through) &&
    range.from <= range.through;
  const readPreview = useCallback(() => api.preview(range), [api, range]);
  const previewRead = useRead(
    JSON.stringify([range, status.data?.settings, previewRevision]),
    readPreview,
    connected && validDates && !settingsDirty,
  );
  const preview = previewRead.data;
  function invalidatePreview() {
    setPreviewRevision((revision) => revision + 1);
    setConfirm(null);
  }

  const items = preview?.items ?? [];
  const eligible = items.filter((i) => i.status === 'ELIGIBLE').length;
  const succeeded = items.filter((i) => i.status === 'SUCCEEDED').length;
  const excluded = items.filter((i) => i.status === 'EXCLUDED').length;
  const attention = items.filter((i) =>
    ['RETRY', 'UNCERTAIN', 'SENDING', 'NEEDS_ATTENTION'].includes(i.status),
  ).length;
  const recoverable = items.some(
    (i) => i.payload && ['RETRY', 'UNCERTAIN', 'SENDING'].includes(i.status),
  );
  const emptyMessage =
    eligible > 0
      ? ''
      : items.length > 0 && succeeded === items.length
        ? 'All selected records are already synchronized.'
        : attention > 0
          ? 'No new eligible records. Review records requiring attention.'
          : excluded > 0
            ? 'No eligible records. Review exclusions for details.'
            : 'No new transactions available to synchronize.';
  function edit(next: QuickBooksSettings) {
    setSettings(next);
    invalidatePreview();
  }
  const mappingKeys = [
    'revenue',
    'discounts',
    'refunds',
    ...(!manager ? ['taxLiability'] : []),
    ...sources.filter((source) => source !== 'expenses'),
    'spending',
    ...categories.map((c) => `expense:${c}`),
  ];
  const mainKeys = [
    'revenue',
    'taxLiability',
    'cash',
    'collections',
    'spending',
  ];
  const labels: Record<string, string> = {
    taxLiability: 'Collected Sales Tax Liability',
    revenue: 'Revenue',
    discounts: 'Discounts (contra income)',
    refunds: 'Refunds (contra income)',
    cash: 'Cash on hand account',
    stripe: 'Stripe clearing account',
    collections: 'Cash collections account',
    spending: 'Expense payment account',
  };
  return (
    <div className="finance-workspace quickbooks-workspace">
      <RouteLink to={manager ? '/market/finances' : '/vendor/finances'}>
        Back to Finances
      </RouteLink>
      <ReadState {...status} retry={status.refresh} />
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      {syncOutcome && (
        <Alert severity={syncOutcome.severity}>{syncOutcome.message}</Alert>
      )}
      <Card title="QuickBooks Online" spacing="contained">
        <Badge>Sandbox</Badge>
        <p>
          {status.data?.company || 'No company connected'} ·{' '}
          {status.data ? (
            <Badge tone={connected ? 'success' : 'danger'}>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          ) : (
            'Loading'
          )}
        </p>
        <p>
          Last successful record:{' '}
          {status.data?.lastSuccess
            ? new Date(status.data.lastSuccess).toLocaleString()
            : 'None'}
        </p>
        <div className="actions">
          {status.data?.counts.map((count) => (
            <Badge key={count.status} tone={syncStatusTone(count.status)}>
              {syncStatusLabel(count.status)}: {count.count}
            </Badge>
          ))}
        </div>
        {status.data && !status.data.configured && (
          <Alert severity="warning">
            Sandbox credentials and server configuration are required. See the
            local integration guide.
          </Alert>
        )}
        <div className="actions">
          <Button
            disabled={busy || !status.data?.configured}
            onClick={() =>
              void action(async () => {
                const result = await api.begin();
                const url = new URL(result.url);
                if (
                  url.origin !== 'https://appcenter.intuit.com' ||
                  url.pathname !== '/connect/oauth2'
                )
                  throw new Error('Invalid authorization destination');
                location.assign(url.href);
              })
            }
          >
            {connected ? 'Reconnect QuickBooks' : 'Connect QuickBooks'}
          </Button>
          {status.data?.realm && (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => setConfirm('disconnect')}
            >
              Disconnect
            </Button>
          )}
          <Button
            disabled={busy}
            onClick={() =>
              void action(async () => {
                setOffset(0);
                setHistory(await api.history(0));
              })
            }
          >
            View Sync History
          </Button>
        </div>
      </Card>
      <Card spacing="contained">
        <p>
          Send supported activity automatically.{' '}
          <Button variant="disclosure" onClick={() => setSyncHelp(true)}>
            Learn how automatic sync works
          </Button>
        </p>
        <label htmlFor="qbo-automatic">
          <Checkbox
            id="qbo-automatic"
            role="switch"
            aria-label="Automatic Synchronization"
            checked={status.data?.automation?.enabled ?? false}
            disabled={busy || !status.data}
            onChange={(e) =>
              void action(async () => {
                if (!e.target.checked) {
                  await api.automation({ enabled: false });
                  setNotice(
                    'Automatic synchronization is off. Manual preview and sync remain available. An in-progress operation may finish or require reconciliation.',
                  );
                  status.refresh();
                } else {
                  setAutoAcknowledged(false);
                  setAutoProposal(await api.prepareAutomation());
                }
              })
            }
          />
          Automatic Synchronization
        </label>
        {status.data && automaticSyncNotice(status.data) && (
          <Alert severity="info">{automaticSyncNotice(status.data)}</Alert>
        )}
      </Card>
      {syncHelp && (
        <Dialog
          open
          title="How automatic sync works"
          onClose={() => setSyncHelp(false)}
        >
          <p>
            When enabled, Farmers Market Platform automatically sends supported
            sales, confirmed refunds, and expenses to your connected QuickBooks
            account using your saved sources and account mappings.
          </p>
          <p>
            This creates accounting records. It does not collect, move, refund,
            or transfer money. Unsupported or uncertain activity requires manual
            review. You can turn it off at any time. Turning it off does not
            delete entries already sent, erase history, or disconnect
            QuickBooks. An operation already in progress may finish or need
            reconciliation.
          </p>
          <Alert severity="warning">
            Square, Clover, Stripe, or another payment processor or accounting
            service may already send your transactions to QuickBooks. Enabling
            synchronization here could send the same transactions again,
            creating duplicate sales, expenses, or other accounting entries.
            Review your selected sources and make sure the same activity is not
            synchronized through another service.
          </Alert>
          <p>
            We prevent repeat exports of the same event through Farmers Market
            Platform, but cannot reliably detect entries created by other
            integrations. For example, if Square already exports your sales,
            select only supported cash sales or expenses that are not imported
            elsewhere. Square and Clover sales remain unsupported here.
          </p>
          <p>
            Automatic sync: {status.data?.automation?.enabled ? 'On' : 'Off'}.
            Checks run about every five minutes while the worker is running.
          </p>
          {!status.data?.automation?.enabled && (
            <p>
              Records export only when you choose Sync Now after reviewing the
              loaded records. Enabling requires an active connection, saved
              account mappings, selected sources, and activated sandbox exports.
            </p>
          )}
          {status.data && automaticSyncNotice(status.data) && (
            <Alert severity="info">{automaticSyncNotice(status.data)}</Alert>
          )}
          <p>
            Last automatic check:{' '}
            {status.data?.automation?.lastCheck
              ? new Date(status.data.automation.lastCheck).toLocaleString()
              : 'None'}
            . Records awaiting attention:{' '}
            {status.data?.counts
              .filter((c) =>
                ['UNCERTAIN', 'SENDING', 'NEEDS_ATTENTION', 'RETRY'].includes(
                  c.status,
                ),
              )
              .reduce((sum, c) => sum + c.count, 0) ?? 0}
            .
          </p>
          {status.data?.automation?.since && (
            <p>
              Current activation boundary:{' '}
              {new Date(status.data.automation.since).toLocaleString()} (
              {status.data.automation.since}).
            </p>
          )}
          <p>
            Changing selected sources or their export mappings pauses automatic
            synchronization. Review the changes and acknowledge the duplicate
            risk again to resume. Older records remain available through manual
            preview.
          </p>
        </Dialog>
      )}
      {autoProposal && (
        <Dialog
          open
          title="Enable Automatic QuickBooks Sync?"
          busy={busy}
          onClose={() => setAutoProposal(null)}
        >
          <p>
            Supported new transactions from your saved selected sources will be
            sent to QuickBooks automatically. This does not process customer
            payments or guarantee that every transaction is supported.
          </p>
          <p>
            Selected sources:{' '}
            {status.data?.settings.sources.join(', ') || 'None'}.
          </p>
          <Alert severity="warning">
            Square, Clover, Stripe, or another connected service may already
            send some of these transactions to QuickBooks. If both systems
            export the same activity, duplicate accounting records may result.
          </Alert>
          <p>
            Starting point: {new Date(autoProposal.since).toLocaleString()} (
            {autoProposal.since}). Only financial activity completed from this
            exact boundary onward is considered. Older records will not be
            automatically imported. Re-enabling establishes a new boundary, so
            activity completed while off stays in the manual workflow.
          </p>
          <label htmlFor="qbo-duplicate-ack">
            <Checkbox
              id="qbo-duplicate-ack"
              checked={autoAcknowledged}
              onChange={(e) => setAutoAcknowledged(e.target.checked)}
            />
            I understand that if Square, Clover, Stripe, or another service
            already synchronizes these transactions to QuickBooks, enabling this
            feature may create duplicate accounting entries. I have reviewed
            which sources Farmers Market Platform will synchronize.
          </label>
          <div className="actions">
            <Button disabled={busy} onClick={() => setAutoProposal(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !autoAcknowledged ||
                !connected ||
                !status.data?.settings.active ||
                !status.data.settings.sources.length
              }
              onClick={() =>
                void action(async () => {
                  await api.automation({
                    enabled: true,
                    token: autoProposal.token,
                    acknowledgeDuplicates: true,
                  });
                  setAutoProposal(null);
                  setNotice(
                    'Automatic synchronization enabled for newly completed eligible activity.',
                  );
                  status.refresh();
                })
              }
            >
              Enable Automatic Sync
            </Button>
          </div>
        </Dialog>
      )}
      {connected && (
        <>
          <details
            className={disclosureClassName('quickbooks-accounts')}
            onToggle={(event) => {
              if (
                !event.currentTarget.open ||
                accountsLoaded ||
                accountsLoading.current
              )
                return;
              accountsLoading.current = true;
              setAccountsBusy(true);
              void action(async () => {
                try {
                  setAccounts(await api.accounts());
                  setAccountsLoaded(true);
                } finally {
                  accountsLoading.current = false;
                  setAccountsBusy(false);
                }
              });
            }}
          >
            <summary>Company account connections</summary>
            <div className="ui-disclosure-content">
              {accountsBusy && <p role="status">Loading company accounts...</p>}
              {!accountsBusy && !accountsLoaded && (
                <p>Close and reopen this card to retry loading accounts.</p>
              )}
              {accountsLoaded && accounts.length === 0 && (
                <p>No company accounts are available.</p>
              )}
              {[true, false].map((main) => {
                const fields = mappingKeys
                  .filter((key) => mainKeys.includes(key) === main)
                  .map((key) => (
                    <SelectField
                      key={key}
                      label={labels[key] ?? key.slice(8)}
                      info={
                        key === 'taxLiability'
                          ? 'How collected sales tax is recorded'
                          : undefined
                      }
                      infoOnClick={
                        key === 'taxLiability'
                          ? () => setTaxHelp(true)
                          : undefined
                      }
                      value={settings.mappings[key] ?? ''}
                      disabled={busy || !accounts.length}
                      onChange={(e) =>
                        edit({
                          ...settings,
                          mappings: {
                            ...settings.mappings,
                            [key]: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="">Choose an account</option>
                      {accounts
                        .filter(
                          (a) =>
                            a.Active &&
                            (key === 'taxLiability'
                              ? a.AccountType === 'Other Current Liability' &&
                                a.AccountSubType ===
                                  'OtherCurrentLiabilities' &&
                                a.TaxAccount !== true &&
                                !a.TaxAgencyRef &&
                                !a.AgencyRef
                              : ['revenue', 'discounts', 'refunds'].includes(
                                    key,
                                  )
                                ? a.AccountType === 'Income'
                                : key.startsWith('expense:')
                                  ? ['Expense', 'Cost of Goods Sold'].includes(
                                      a.AccountType,
                                    )
                                  : ['Bank', 'Other Current Asset'].includes(
                                      a.AccountType,
                                    )),
                        )
                        .map((a) => (
                          <option key={a.Id} value={a.Id}>
                            {a.Name}
                          </option>
                        ))}
                    </SelectField>
                  ));
                return main ? (
                  <div key="main" className="quickbooks-account-grid">
                    {fields}
                  </div>
                ) : (
                  <Dropdown key="advanced" label="Show advanced accounts">
                    <div className="quickbooks-account-grid">{fields}</div>
                  </Dropdown>
                );
              })}
              <p>
                Use dedicated clearing accounts for Stripe. Payouts and
                production-cost estimates are never exported. Expense payment
                account must represent how the recorded expenses were paid.
              </p>
              <label htmlFor="qbo-activate">
                <Checkbox
                  id="qbo-activate"
                  aria-label="Activate sandbox exports"
                  checked={settings.active}
                  disabled={busy}
                  onChange={(e) =>
                    edit({ ...settings, active: e.target.checked })
                  }
                />
                Activate sandbox exports
              </label>
              <Button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await api.save({
                      ...settings,
                      mappings: Object.fromEntries(
                        Object.entries(settings.mappings).filter(
                          ([, v]) => !!v,
                        ),
                      ),
                    });
                    setSettings(null);
                    invalidatePreview();
                    setNotice(
                      'Account connections saved for all supported activity. Changes to export settings require renewed acknowledgment before automatic sync can resume.',
                    );
                    status.refresh();
                  })
                }
              >
                Save settings
              </Button>
            </div>
          </details>
          <Card spacing="contained">
            <div className="finance-controls">
              <Field id="qbo-from" label="From">
                <Input
                  id="qbo-from"
                  type="date"
                  value={range.from}
                  disabled={busy}
                  onChange={(e) => {
                    setRange({ ...range, from: e.target.value });
                    invalidatePreview();
                  }}
                />
              </Field>
              <Field id="qbo-through" label="Through">
                <Input
                  id="qbo-through"
                  type="date"
                  value={range.through}
                  disabled={busy}
                  onChange={(e) => {
                    setRange({ ...range, through: e.target.value });
                    invalidatePreview();
                  }}
                />
              </Field>
            </div>
            <p>
              Dates use your finance account time zone. Maximum 100 records per
              load. Records update automatically when both dates are complete.
            </p>
            {settingsDirty && (
              <p>
                Save account connections to load records for all supported
                activity.
              </p>
            )}
            {range.from && range.through && !validDates && (
              <Alert severity="warning">
                Choose an end date on or after the start date.
              </Alert>
            )}
            <ReadState {...previewRead} retry={previewRead.refresh} />
            <div className="actions">
              <Button
                disabled={
                  busy || !preview || !settings.active || eligible === 0
                }
                onClick={() => setConfirm('sync')}
              >
                Sync Now
              </Button>
              {eligible === 0 && recoverable && (
                <Button
                  disabled={busy || !settings.active}
                  onClick={() => setConfirm('sync')}
                >
                  Retry / reconcile records
                </Button>
              )}
            </div>
            {preview && (
              <>
                <p>
                  {eligible} new eligible · {succeeded} already synchronized ·{' '}
                  {excluded} excluded · {attention} need attention
                </p>
                {emptyMessage && <p role="status">{emptyMessage}</p>}
                <DataTable
                  label="QuickBooks records"
                  headings={['Record', 'Status']}
                >
                  {preview.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Button
                          variant="disclosure"
                          aria-label={`View ${recordLabel(item.id, item.adjustment?.kind)} details`}
                          onClick={() =>
                            setDetails({
                              id: item.id,
                              event_id: item.id,
                              event_date: item.date,
                              source: item.source,
                              status: item.status,
                              error: item.reason,
                              payload: item.payload,
                              amounts: item.amounts,
                              adjustment: item.adjustment,
                              entity_type: item.entityType ?? 'JournalEntry',
                            } as QuickBooksRecord)
                          }
                        >
                          {recordLabel(item.id, item.adjustment?.kind)} ·{' '}
                          {new Date(item.date).toLocaleDateString()}
                        </Button>
                      </td>
                      <td>
                        <Badge tone={syncStatusTone(item.status)}>
                          {syncStatusLabel(item.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </>
            )}
          </Card>
        </>
      )}
      {taxHelp && (
        <Dialog
          open
          title="How collected sales tax is recorded"
          onClose={() => setTaxHelp(false)}
        >
          <p>
            Farmers Market Platform sends QuickBooks the sales tax actually
            collected from your customers. That tax is recorded separately from
            your sales revenue as money your business may owe in taxes.
          </p>
          <p>
            These records appear in your QuickBooks accounting reports but do
            not automatically populate QuickBooks' Sales Tax Center or prepare
            sales tax returns. Journal-entry sales may not appear in native
            product-level sales transaction screens and reports. You remain
            responsible for verifying tax obligations, filing, and remittance.
          </p>
          <p>
            Select the account where sales tax collected from customers should
            be recorded. This amount is kept separate from your sales revenue.
            Required only for sales containing collected tax. In QuickBooks,
            create a dedicated Other Current Liability account with the Other
            Current Liabilities detail type if needed, then reopen this page and
            select it. Tax-agency accounts are unsupported. No customer, item,
            tax code, agency, or matching QuickBooks tax rate is required for
            new journal exports. Discounts require a contra-income account when
            present. Stored legacy receipt mappings and history are retained.
          </p>
        </Dialog>
      )}
      {history && (
        <Dialog
          open
          title="Synchronization history"
          onClose={() => setHistory(null)}
        >
          <DataTable
            label="QuickBooks records"
            headings={['Activity', 'Status', 'Date', 'Amount']}
          >
            {history.map((record) => (
              <tr key={record.id}>
                <td>
                  <Button
                    variant="disclosure"
                    aria-label={`View ${recordLabel(record.event_id)} details`}
                    onClick={() => setDetails(record)}
                  >
                    {recordLabel(
                      record.event_id,
                      (
                        record.payload as {
                          _fmp?: { adjustment?: QuickBooksAdjustment };
                        }
                      )?._fmp?.adjustment?.kind,
                    )}{' '}
                  </Button>
                </td>
                <td>
                  <Badge tone={syncStatusTone(record.status)}>
                    {syncStatusLabel(record.status)}
                  </Badge>
                </td>
                <td>{new Date(record.event_date).toLocaleDateString()}</td>
                <td>{recordSummary(record).amount}</td>
              </tr>
            ))}
          </DataTable>
          <div className="actions">
            <Button
              disabled={busy || offset === 0}
              onClick={() =>
                void action(async () => {
                  const next = Math.max(0, offset - 25);
                  setHistory(await api.history(next));
                  setOffset(next);
                })
              }
            >
              Previous
            </Button>
            <Button
              disabled={busy || history.length < 25}
              onClick={() =>
                void action(async () => {
                  setHistory(await api.history(offset + 25));
                  setOffset(offset + 25);
                })
              }
            >
              Next
            </Button>
          </div>
          <p>
            To retry eligible failures, choose their dates again, then Sync Now.
            Uncertain writes are reconciled without creating another entry.
          </p>
        </Dialog>
      )}
      {details && (
        <Dialog
          open
          title={recordLabel(details.event_id, details.adjustment?.kind)}
          onClose={() => setDetails(null)}
        >
          <dl className="ui-record-facts">
            {[
              [
                'Action',
                recordLabel(details.event_id, details.adjustment?.kind),
              ],
              [
                'Status',
                <Badge key="status" tone={syncStatusTone(details.status)}>
                  {syncStatusLabel(details.status)}
                </Badge>,
              ],
              ['Date', new Date(details.event_date).toLocaleString()],
              ['Item', recordSummary(details).item],
              ['Amount', recordSummary(details).amount],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {details.error && (
            <Alert severity="warning">{quickBooksError(details.error)}</Alert>
          )}
          <Dropdown label="Advanced details">
            <p>
              {details.status} · {details.source} · {details.event_date}
            </p>
            <p>{details.error}</p>
            {details.error === 'QBO_TAX_REVIEW_REQUIRED' && (
              <Alert severity="warning">
                QuickBooks tax treatment or amounts differ from checkout. Review
                the retained remote record. This accounting record will not be
                retried automatically.
              </Alert>
            )}
            <p>Transaction type: {details.entity_type ?? 'JournalEntry'}</p>
            {(() => {
              const adjustment =
                details.adjustment ??
                (
                  details.payload as
                    { _fmp?: { adjustment?: QuickBooksAdjustment } } | undefined
                )?._fmp?.adjustment;
              if (!adjustment) return null;
              return (
                <>
                  <p>{recordLabel(details.event_id, adjustment.kind)}</p>
                  <p>
                    Original record: {adjustment.original.eventId} ·{' '}
                    {adjustment.original.entityType}{' '}
                    {adjustment.original.entityId} · {adjustment.original.date}
                  </p>
                  {adjustment.kind === 'REFUND' ? (
                    <>
                      <p>
                        Original order: {adjustment.orderId} · Refund date:{' '}
                        {details.event_date} · Refund event:{' '}
                        {adjustment.refundOperationId}
                      </p>
                      <p>
                        This records a financially confirmed refund. It does not
                        return money to the customer.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Original expense amount:{' '}
                        {formatMoney(adjustment.originalAmount ?? 0)} ·
                        Corrected amount:{' '}
                        {formatMoney(adjustment.correctedAmount ?? 0)}
                      </p>
                      <p>
                        Reverse the previously exported expense using its saved
                        accounts
                        {adjustment.kind === 'EXPENSE_VOID'
                          ? '.'
                          : ' and record the corrected expense in the same balanced journal.'}
                      </p>
                      <p>
                        Previous accounting record:{' '}
                        {adjustment.previous?.entityId} · Expense version:{' '}
                        {adjustment.version}
                      </p>
                    </>
                  )}
                </>
              );
            })()}
            {(() => {
              const amounts =
                details.amounts ??
                (
                  details.payload as
                    { _fmp?: { amounts?: QuickBooksAmounts } } | undefined
                )?._fmp?.amounts;
              if (!amounts) return null;
              const money = (n: number) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(n / 100);
              return (
                <dl>
                  {(
                    [
                      [
                        details.event_id.startsWith('refund:')
                          ? 'Merchandise refunded'
                          : 'Merchandise',
                        amounts.merchandise,
                      ],
                      ['Discounts', amounts.discount],
                      [
                        details.event_id.startsWith('refund:')
                          ? 'Tax refunded'
                          : 'Sales tax',
                        amounts.tax,
                      ],
                      [
                        details.event_id.startsWith('refund:')
                          ? 'Total refunded'
                          : 'Customer payment',
                        amounts.payment,
                      ],
                    ] as const
                  ).map(([label, amount]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{money(amount)}</dd>
                    </div>
                  ))}
                </dl>
              );
            })()}
            {details.entity_id && (
              <p>
                {details.entity_type} {details.entity_id} · Company{' '}
                {details.realm}
              </p>
            )}
            <p>
              Attempts: {details.attempts ?? 0} · Last attempt:{' '}
              {details.last_attempt ?? 'None'} · Success:{' '}
              {details.success_at ?? 'None'}
            </p>
            <pre>{JSON.stringify(details.payload, null, 2)}</pre>
          </Dropdown>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          open
          title={
            confirm === 'sync'
              ? 'Export to QuickBooks sandbox?'
              : 'Disconnect QuickBooks?'
          }
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p>
            {confirm === 'sync'
              ? `Export eligible records from ${range.from} through ${range.through}? This includes the refunds and expense corrections shown in the preview. Expense corrections reverse the saved previous expense and record the replacement in one balanced journal. Confirm these historical records and adjustments are not already in QuickBooks through another integration. Excluded records will remain unexported.`
              : 'Revoke access and stop exports. Existing accounting records and synchronization history are retained.'}
          </p>
          <div className="actions">
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                (confirm === 'sync' &&
                  (!preview || (eligible === 0 && !recoverable)))
              }
              onClick={() =>
                void action(async () => {
                  if (confirm === 'sync' && preview) {
                    const result = await api.sync({
                      range,
                      previewToken: preview.previewToken,
                      confirmHistorical: true,
                    });
                    invalidatePreview();
                    const created = result.created ?? 0;
                    const reconciled = result.reconciled ?? 0;
                    const failed = result.failed ?? 0;
                    setSyncOutcome({
                      severity:
                        failed > 0 || !result.completed
                          ? 'warning'
                          : created > 0
                            ? 'success'
                            : 'info',
                      message:
                        failed > 0 || !result.completed
                          ? `${created} new records synchronized. Some records require attention. Review history for details.`
                          : created > 0
                            ? `${created} new ${created === 1 ? 'record' : 'records'} synchronized.${reconciled > 0 ? ` ${reconciled} existing records reconciled.` : ''}`
                            : reconciled > 0
                              ? `No new records exported. ${reconciled} existing ${reconciled === 1 ? 'record reconciled' : 'records reconciled'}.`
                              : 'No new records were synchronized. Review the refreshed records for exclusions or activity requiring attention.',
                    });
                  } else {
                    await api.disconnect();
                    invalidatePreview();
                    setAccounts([]);
                    setAccountsLoaded(false);
                  }
                  setConfirm(null);
                  status.refresh();
                })
              }
            >
              {confirm === 'sync'
                ? 'Confirm sandbox export'
                : 'Confirm disconnect'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function settingsKey(settings: QuickBooksSettings) {
  return JSON.stringify({
    sources: [...settings.sources].sort(),
    mappings: Object.entries(settings.mappings)
      .filter(([, value]) => !!value)
      .sort(([a], [b]) => a.localeCompare(b)),
    active: settings.active,
    sales: settings.sales,
  });
}
function syncStatusTone(
  status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'SUCCEEDED') return 'success';
  if (['FAILED', 'NEEDS_ATTENTION'].includes(status)) return 'danger';
  if (['RETRY', 'UNCERTAIN'].includes(status)) return 'warning';
  if (['ELIGIBLE', 'SENDING'].includes(status)) return 'info';
  return 'neutral';
}

function syncStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SUCCEEDED: 'Synchronized',
    ELIGIBLE: 'Ready to sync',
    EXCLUDED: 'Not included',
    RETRY: 'Waiting to retry',
    UNCERTAIN: 'Needs review',
    SENDING: 'Sync in progress',
    NEEDS_ATTENTION: 'Needs your attention',
    FAILED: 'Could not synchronize',
  };
  return labels[status] ?? status.toLowerCase().replaceAll('_', ' ');
}
function recordSummary(record: QuickBooksRecord) {
  const payload = record.payload as {
    _fmp?: { amounts?: QuickBooksAmounts };
    PrivateNote?: string;
    TotalAmt?: number;
    Line?: Array<{
      Description?: string;
      Amount?: number;
      JournalEntryLineDetail?: { PostingType?: string };
    }>;
  } | null;
  const amounts = record.amounts ?? payload?._fmp?.amounts;
  const debits = payload?.Line?.filter(
    (line) => line.JournalEntryLineDetail?.PostingType === 'Debit',
  );
  const adjustment =
    record.adjustment ??
    (payload as { _fmp?: { adjustment?: QuickBooksAdjustment } } | null)?._fmp
      ?.adjustment;
  const adjustmentAmount =
    adjustment?.kind === 'EXPENSE_VOID'
      ? adjustment.originalAmount
      : adjustment?.correctedAmount;
  const amount =
    adjustmentAmount ??
    amounts?.payment ??
    (payload?.TotalAmt !== undefined
      ? Math.round(payload.TotalAmt * 100)
      : debits?.length
        ? Math.round(
            debits.reduce((sum, line) => sum + (line.Amount ?? 0), 0) * 100,
          )
        : null);
  return {
    item:
      payload?.Line?.find((line) => line.Description)?.Description ||
      payload?.PrivateNote ||
      recordLabel(record.event_id, record.adjustment?.kind),
    amount: amount === null ? 'Amount unavailable' : formatMoney(amount),
  };
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100);
}
function recordLabel(id: string, kind?: QuickBooksAdjustment['kind']) {
  return id.startsWith('refund:')
    ? 'Refund'
    : id.startsWith('expense-correction:')
      ? kind === 'EXPENSE_VOID'
        ? 'Expense void adjustment'
        : 'Expense correction'
      : id.startsWith('sale:')
        ? 'New sale'
        : 'Expense';
}

export function automaticSyncNotice(status: QuickBooksStatus): string | null {
  const auto = status.automation;
  const review = status.counts.some(
    (c) =>
      ['SENDING', 'UNCERTAIN', 'NEEDS_ATTENTION'].includes(c.status) &&
      c.count > 0,
  );
  if (review)
    return (
      (auto?.enabled ? 'Automatic sync is paused' : 'Automatic sync is off') +
      ' because synchronization history contains uncertain or Needs Attention records. Open Sync History and reconcile or review those records before resuming. Do not create replacement entries for uncertain writes.'
    );
  if (!auto?.enabled)
    return auto?.state === 'AWAITING_CONSENT' ||
      auto?.error === 'QBO_AUTOMATION_RECONSENT_REQUIRED'
      ? 'Automatic sync is off because selected export settings changed. Review the saved sources and mappings, then enable it and acknowledge the duplicate risk again. A new cutoff will exclude older purchases.'
      : status.status !== 'CONNECTED'
        ? 'Connect your own Intuit sandbox company before enabling automatic synchronization.'
        : null;
  if (status.status !== 'CONNECTED' || auto.state === 'RECONNECT')
    return 'Automatic sync is paused. Reconnect the original QuickBooks company to resume.';
  if (status.counts.some((c) => c.status === 'RETRY' && c.count > 0))
    return 'Some records are waiting for a safe retry. The worker will respect the retry delay. Open Sync History for details.';
  if (
    !auto.error ||
    ['QBO_REVIEW_REQUIRED', 'QBO_RETRY_PENDING'].includes(auto.error)
  )
    return null;
  if (auto.error === 'QBO_AUTHORITY_CHANGED')
    return 'The last automatic check could not authorize the business owner and channel. Restart the updated demo worker. If this continues, review the owner�s current business access.';
  return (
    'The last automatic check could not proceed. ' + quickBooksError(auto.error)
  );
}

export function quickBooksError(code: string) {
  const accountLabels: Record<string, string> = {
    REVENUE: 'Revenue',
    DISCOUNTS: 'Discounts',
    REFUNDS: 'Refunds',
    CASH: 'Cash on hand',
    STRIPE: 'Stripe clearing',
    COLLECTIONS: 'Cash collections',
    SPENDING: 'Expense payment',
  };
  const account = code.replace('QBO_MAPPING_INVALID_', '');
  if (code === 'QBO_MAPPING_INVALID_TAXLIABILITY')
    return 'Collected Sales Tax Liability: choose an active ordinary Other Current Liability account with the Other Current Liabilities detail type. Create one in QuickBooks if needed, then load company accounts. Tax-agency accounts are unsupported.';
  if (code.startsWith('QBO_MAPPING_INVALID_') && accountLabels[account])
    return `${accountLabels[account]} account is missing, inactive, or has an incompatible type. Choose an active ${['REVENUE', 'DISCOUNTS', 'REFUNDS'].includes(account) ? 'Income' : 'Bank or Other Current Asset'} account from this company.`;
  if (code === 'QBO_MAPPING_INVALID_EXPENSE_CATEGORY')
    return 'Choose at least one expense category account for the selected Expenses source.';
  if (code.startsWith('QBO_MAPPING_INVALID_EXPENSE_')) {
    const category = code
      .slice('QBO_MAPPING_INVALID_EXPENSE_'.length)
      .replaceAll('_', ' ')
      .toLowerCase();
    return `Expense category ${category}: choose an active Expense or Cost of Goods Sold account from this company.`;
  }
  const salesErrors: Record<string, string> = {
    ITEM: 'Sales item must be an active taxable Service or NonInventory item.',
    ITEM_REVENUE:
      'The sales item�s income account must match the selected Revenue account. Choose a matching item or correct Revenue.',
    CUSTOMER: 'Choose the active taxable USD FMP Walk-in customer.',
    TAX_CODE:
      'Choose an active taxable tax code with exactly one supported rate. CustomSalesTax is unsupported.',
    TAX_RATE:
      'The tax code must reference an active positive tax rate linked to a tax agency.',
    TAX_DISABLED:
      'Enable sales tax in the connected company before configuring taxable exports. Tax-free cash exports do not require these mappings.',
    RESPONSIBILITY: 'Review the vendor tax responsibility selection.',
  };
  if (code.startsWith('QBO_SALES_MAPPING_INVALID_'))
    return (
      salesErrors[code.slice('QBO_SALES_MAPPING_INVALID_'.length)] ??
      'Review the optional taxable sales mappings.'
    );
  const messages: Record<string, string> = {
    QBO_SOURCES_REQUIRED:
      'Select and save at least one supported financial source before enabling automatic sync.',
    QBO_AUTOMATION_CONFIRM_REQUIRED:
      'Review your saved sources and duplicate warning again. The confirmation expired or your settings changed.',
    QBO_BUSY: 'Another QuickBooks operation is running. Try again shortly.',
    QBO_PREVIEW_EXPIRED:
      'The preview expired or its records changed. Preview again.',
    QBO_USE_SMALLER_RANGE:
      'Choose a smaller date range with at most 100 records.',
    QBO_MAPPING_INVALID:
      'Choose active company accounts with the correct accounting types.',
    QBO_RECONNECT:
      'Reconnect your QuickBooks sandbox company, then preview again.',
    QBO_ACTIVATION_REQUIRED:
      'Save settings with sandbox exports activated first.',
    QBO_COMPANY_CHANGE_BLOCKED:
      'Reconnect the original sandbox company. Company changes require a separate migration.',
    QBO_COMPANY_ALREADY_ASSIGNED:
      'That sandbox company is already assigned to another business.',
    QBO_STATE_INVALID:
      'Authorization expired or belongs to another account or business. Connect again from the original business.',
    QBO_US_COMPANY_REQUIRED: 'Use a US QuickBooks sandbox company.',
    QBO_USD_COMPANY_REQUIRED:
      'Use a USD sandbox company with multicurrency disabled.',
    QBO_SALES_MAPPING_INVALID:
      'Choose an active taxable non-inventory item using the mapped income account, FMP Walk-in customer, and an agency-backed single-rate tax code.',
    QBO_RATE_LIMIT:
      'QuickBooks is limiting requests. Wait at least a minute, then preview and retry.',
  };
  return (
    messages[code] ??
    'QuickBooks could not complete this action. Check configuration and connection status, then preview again.'
  );
}
