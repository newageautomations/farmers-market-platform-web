import { useCallback, useState } from 'react';
import type { CatalogRecord, CatalogSection } from '@market/api';
import { AppError } from '@market/api';
import { Card } from '@market/ui';
import { formatMoney } from '@market/config';
import type { ManagementService } from './service';
import {
  CommandForm,
  ReadState,
  RouteLink,
  TextField,
  integer,
  text,
  useRead,
  date,
} from '../vendor/common';
import { Choice, Pager } from './common';

export const catalogSections: readonly {
  path: string;
  section: CatalogSection;
  label: string;
}[] = [
  { path: 'plans', section: 'PLANS', label: 'Plans' },
  { path: 'versions', section: 'VERSIONS', label: 'Plan versions' },
  { path: 'rules', section: 'RULES', label: 'Entitlement rules' },
  { path: 'offers', section: 'OFFERS', label: 'Billing offers' },
  { path: 'features', section: 'FEATURES', label: 'Feature definitions' },
  { path: 'metrics', section: 'METRICS', label: 'Usage metrics' },
  { path: 'policies', section: 'ACCESS_POLICIES', label: 'Access policies' },
  {
    path: 'change-policies',
    section: 'CHANGE_POLICIES',
    label: 'Change policies',
  },
  {
    path: 'provider-mappings',
    section: 'PROVIDER_MAPPINGS',
    label: 'Provider mappings',
  },
  { path: 'overrides', section: 'OVERRIDES', label: 'Overrides' },
];
const selectRecords = (
  rows: readonly CatalogRecord[],
  label: (row: CatalogRecord) => string,
) =>
  rows.map((r) => (
    <option key={r.id} value={r.id}>
      {label(r)}
    </option>
  ));
function sectionForPath(path: string): CatalogSection {
  return (
    catalogSections.find((s) => path.split('/')[3] === s.path)?.section ??
    'PLANS'
  );
}
function RuleFields({
  features,
  metrics,
}: {
  features: readonly CatalogRecord[];
  metrics: readonly CatalogRecord[];
}) {
  const [featureId, setFeatureId] = useState(''),
    feature = features.find((f) => f.id === featureId),
    kind = feature?.valueKind;
  return (
    <>
      <Choice
        name="feature"
        label="Feature definition"
        value={featureId}
        onChange={setFeatureId}
      >
        <option value="">Select a defined feature</option>
        {selectRecords(features, (f) => `${f.featureCode} · ${f.valueKind}`)}
      </Choice>
      {kind === 'BOOLEAN' ? (
        <Choice name="enabled" label="Boolean value">
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </Choice>
      ) : (
        kind && (
          <>
            <label>
              <input type="checkbox" name="unlimited" /> Unlimited
            </label>
            <TextField
              name="limit"
              label={
                kind === 'RESOURCE_LIMIT'
                  ? 'Resource limit'
                  : 'Metered allowance'
              }
              type="number"
              required={false}
            />
            {kind === 'METERED_ALLOWANCE' && (
              <>
                <Choice name="metric" label="Usage metric">
                  {selectRecords(metrics, (m) => m.metricCode ?? m.id)}
                </Choice>
                <Choice name="window" label="Usage window policy">
                  <option value="CALENDAR_MONTH:v1">
                    Calendar month, version 1
                  </option>
                  <option value="SUBSCRIPTION_PERIOD:v1">
                    Subscription period, version 1
                  </option>
                </Choice>
              </>
            )}
          </>
        )
      )}
      <TextField
        name="policyVersion"
        label="Rule policy version"
        maxLength={80}
      />
    </>
  );
}
function ruleValues(f: FormData, features: readonly CatalogRecord[]) {
  const feature = features.find((x) => x.id === text(f, 'feature'));
  if (!feature?.valueKind) throw new AppError('validation');
  const unlimited = f.get('unlimited') === 'on';
  return {
    featureId: feature.id,
    valueKind: feature.valueKind,
    enabled:
      feature.valueKind === 'BOOLEAN' ? text(f, 'enabled') === 'true' : null,
    unlimited,
    limitValue:
      feature.valueKind === 'RESOURCE_LIMIT' && !unlimited
        ? integer(f.get('limit'), { zero: true })
        : null,
    allowanceAmount:
      feature.valueKind === 'METERED_ALLOWANCE' && !unlimited
        ? integer(f.get('limit'), { zero: true })
        : null,
    metricId:
      feature.valueKind === 'METERED_ALLOWANCE' ? text(f, 'metric') : null,
    windowPolicy:
      feature.valueKind === 'METERED_ALLOWANCE' ? text(f, 'window') : null,
    policyVersion: text(f, 'policyVersion'),
  };
}
export function Catalog({
  service,
  path,
}: {
  service: ManagementService;
  path: string;
}) {
  const section = sectionForPath(path);
  const [skip, setSkip] = useState(0),
    account = new URLSearchParams(window.location.search).get('account');
  const read = useCallback(
    () =>
      service.catalog(section, {
        skip,
        take: 20,
        ...(section === 'OVERRIDES' && account
          ? { billingAccountId: account }
          : {}),
      }),
    [service, section, skip, account],
  );
  const result = useRead(`catalog:${section}:${skip}:${account}`, read);
  const referencesRead = useCallback(async () => {
    const [plans, versions, features, metrics] = await Promise.all(
      ['PLANS', 'VERSIONS', 'FEATURES', 'METRICS'].map((s) =>
        service.catalog(s as CatalogSection, { take: 50, skip: 0 }),
      ),
    );
    return {
      plans: plans!.items,
      versions: versions!.items,
      features: features!.items,
      metrics: metrics!.items,
    };
  }, [service]);
  const refs = useRead('catalog-references', referencesRead);
  const refresh = () => {
    result.refresh();
    refs.refresh();
  };
  return (
    <>
      <nav className="overview-links" aria-label="Billing catalog">
        {catalogSections.map((s) => (
          <RouteLink key={s.path} to={`/platform/billing/${s.path}`}>
            {s.label}
          </RouteLink>
        ))}
      </nav>
      <p>
        Plans have stable identities. Published versions and offer terms are
        immutable. Production pricing is configured explicitly by platform
        administrators.
      </p>
      <ReadState {...result} retry={refresh} />
      {result.data && (
        <>
          <div className="management-grid">
            {result.data.items.map((r) => (
              <CatalogCard
                key={r.id}
                row={r}
                section={section}
                service={service}
                refresh={refresh}
              />
            ))}
          </div>
          {!result.data.items.length && (
            <p>
              No{' '}
              {catalogSections
                .find((s) => s.section === section)
                ?.label.toLowerCase()}{' '}
              are configured.
            </p>
          )}
          <Pager skip={skip} total={result.data.totalItems} setSkip={setSkip} />
        </>
      )}
      {refs.data && (
        <CatalogCommands
          section={section}
          service={service}
          refs={refs.data}
          registered={result.data?.registeredFeatures ?? []}
          account={account}
          refresh={refresh}
        />
      )}
      <p>
        Selectors show bounded catalog choices. External provider price mapping
        verification is deferred while Stripe Billing is unconfigured.
      </p>
    </>
  );
}
function CatalogCard({
  row: r,
  section,
  service,
  refresh,
}: {
  row: CatalogRecord;
  section: CatalogSection;
  service: ManagementService;
  refresh: () => void;
}) {
  return (
    <Card>
      <h2>
        {r.displayName ??
          r.featureCode ??
          r.metricCode ??
          r.code ??
          `${section === 'VERSIONS' ? 'Version' : 'Record'} ${r.versionNumber ?? r.id}`}
      </h2>
      <p>
        Reference {r.id}
        {r.status ? ` · ${r.status}` : ''}
      </p>
      {r.planId && (
        <p>
          Stable plan {r.planId} · Version {r.versionNumber} · {r.policyVersion}
        </p>
      )}
      {r.defaultPublishedVersionId && (
        <p>Default published version {r.defaultPublishedVersionId}</p>
      )}
      {r.planVersionId && <p>Exact plan version {r.planVersionId}</p>}
      {r.valueKind && (
        <p>
          {r.valueKind} ·{' '}
          {r.valueKind === 'BOOLEAN'
            ? r.enabled
              ? 'Enabled'
              : 'Disabled'
            : r.unlimited
              ? 'Unlimited'
              : (r.limitValue ?? r.allowanceAmount ?? 'Value not assigned')}
          {r.featureId ? ` · Feature ${r.featureId}` : ''}
        </p>
      )}
      {r.semantics && (
        <p>
          {r.semantics} · {r.vendorSupported ? 'Vendor ' : ''}
          {r.marketSupported ? 'Market' : ''}
        </p>
      )}
      {r.amount != null && r.currency && (
        <p>
          {formatMoney(r.amount, r.currency)} per {r.cadenceCount}{' '}
          {r.cadenceInterval} · {r.billingModel}
        </p>
      )}
      {r.windowPolicy && (
        <p>
          Window {r.windowPolicy} · Metric {r.metricId}
        </p>
      )}
      {r.sourceType && (
        <p>
          {r.aggregationKind} · {r.unit} · Source {r.sourceType}
        </p>
      )}
      {r.stateAccess != null && typeof r.stateAccess === 'object' && (
        <ul>
          {Object.entries(r.stateAccess).map(([state, allow]) => (
            <li key={state}>
              {state}: {allow === true ? 'Allowed' : 'Denied'}
            </li>
          ))}
        </ul>
      )}
      {r.timing && (
        <p>
          {r.timing} · Proration {r.proration}
        </p>
      )}
      {r.providerCode && (
        <p>
          {r.providerCode} · {r.mode} · Verified {date(r.validatedAt)}
        </p>
      )}
      {r.billingAccountId && (
        <p>
          Billing account {r.billingAccountId} · {r.reasonCode} · Source{' '}
          {r.source} · {date(r.startsAt)} to {date(r.endsAt)}
          {r.revokedAt ? ` · Revoked ${date(r.revokedAt)}` : ''}
        </p>
      )}
      {section === 'PLANS' && (
        <>
          <CommandForm
            title={`Edit ${r.displayName}`}
            run={(f) =>
              service.editPlan({
                id: r.id,
                displayName: text(f, 'name'),
                status: r.status!,
              })
            }
            onDone={refresh}
          >
            <TextField
              name="name"
              label="Plan display name"
              value={r.displayName!}
              maxLength={200}
            />
          </CommandForm>
          {r.status === 'ACTIVE' && (
            <CommandForm
              title="Archive plan"
              confirm="Archive this stable plan identity? Historical versions and subscribers remain intact."
              run={() =>
                service.editPlan({
                  id: r.id,
                  displayName: r.displayName!,
                  status: 'ARCHIVED',
                })
              }
              onDone={refresh}
            >
              <p>Retain historical versions.</p>
            </CommandForm>
          )}
        </>
      )}
      {section === 'VERSIONS' && r.status === 'DRAFT' && (
        <CommandForm
          title="Publish plan version"
          submitLabel="Publish version"
          confirm="Publish this exact immutable entitlement snapshot? Future edits require a new draft version."
          run={() => service.publishVersion(r.id)}
          onDone={refresh}
        >
          <p>
            Version {r.versionNumber} of stable plan {r.planId}.
          </p>
        </CommandForm>
      )}
      {section === 'VERSIONS' && r.status === 'PUBLISHED' && (
        <>
          <CommandForm
            title="Set default published version"
            confirm="Use this version as the plan default? Existing subscriptions retain their current exact version."
            run={() =>
              service.defaultVersion({ planId: r.planId!, versionId: r.id })
            }
            onDone={refresh}
          >
            <p>Default changes do not migrate subscribers.</p>
          </CommandForm>
          <CommandForm
            title="Retire plan version"
            confirm="Retire this published version? Existing subscription history remains intact."
            run={() => service.retireVersion(r.id)}
            onDone={refresh}
          >
            <p>Immutable rules cannot be edited.</p>
          </CommandForm>
        </>
      )}
      {section === 'OVERRIDES' && !r.revokedAt && (
        <CommandForm
          title="Revoke entitlement override"
          confirm="Revoke this override? Backend overlap and revocation rules remain authoritative."
          run={() => service.revokeOverride(r.id)}
          onDone={refresh}
        >
          <p>
            Scope: account {r.billingAccountId}, feature {r.featureId}.
          </p>
        </CommandForm>
      )}
    </Card>
  );
}
function CatalogCommands({
  section,
  service,
  refs,
  registered,
  account,
  refresh,
}: {
  section: CatalogSection;
  service: ManagementService;
  refs: {
    plans: readonly CatalogRecord[];
    versions: readonly CatalogRecord[];
    features: readonly CatalogRecord[];
    metrics: readonly CatalogRecord[];
  };
  registered: Awaited<
    ReturnType<ManagementService['catalog']>
  >['registeredFeatures'];
  account: string | null;
  refresh: () => void;
}) {
  const draft = refs.versions.filter((v) => v.status === 'DRAFT'),
    published = refs.versions.filter((v) => v.status === 'PUBLISHED');
  if (section === 'PLANS')
    return (
      <CommandForm
        title="Create stable plan"
        run={(f) =>
          service.createPlan({
            code: text(f, 'code'),
            displayName: text(f, 'name'),
            description: text(f, 'description'),
          })
        }
        onDone={refresh}
      >
        <TextField name="code" label="Stable plan code" maxLength={120} />
        <TextField name="name" label="Plan display name" maxLength={200} />
        <TextField name="description" label="Description" required={false} />
      </CommandForm>
    );
  if (section === 'VERSIONS')
    return (
      <CommandForm
        title="Create draft version"
        run={(f) =>
          service.createVersion({
            planId: text(f, 'plan'),
            versionNumber: integer(f.get('version')),
            policyVersion: text(f, 'policyVersion'),
          })
        }
        onDone={refresh}
      >
        <Choice name="plan" label="Stable plan">
          {selectRecords(refs.plans, (p) => p.displayName ?? p.code ?? p.id)}
        </Choice>
        <TextField name="version" label="New version number" type="number" />
        <TextField
          name="policyVersion"
          label="Version policy reference"
          maxLength={80}
        />
        <p>Existing subscribers retain their published entitlement bundle.</p>
      </CommandForm>
    );
  if (section === 'RULES')
    return (
      <CommandForm
        title="Set draft entitlement rule"
        run={(f) =>
          service.rule({
            planVersionId: text(f, 'planVersion'),
            ...ruleValues(f, refs.features),
          })
        }
        onDone={refresh}
      >
        <Choice name="planVersion" label="Draft plan version">
          <option value="">Select a draft version</option>
          {selectRecords(
            draft,
            (v) => `Plan ${v.planId} · draft version ${v.versionNumber}`,
          )}
        </Choice>
        <RuleFields features={refs.features} metrics={refs.metrics} />
        <p>Published and retired versions are excluded from editing.</p>
      </CommandForm>
    );
  if (section === 'OFFERS')
    return (
      <CommandForm
        title="Create billing offer"
        run={(f) =>
          service.createOffer({
            code: text(f, 'code'),
            planVersionId: text(f, 'planVersion'),
            currency: text(f, 'currency'),
            amount: integer(f.get('amount'), { zero: true }),
            cadenceKind: 'RECURRING',
            cadenceInterval: text(f, 'interval'),
            cadenceCount: integer(f.get('count')),
            billingModel: text(f, 'billingModel'),
            trialPolicy: null,
            providerUsagePolicy: null,
          })
        }
        onDone={refresh}
      >
        <TextField name="code" label="New offer code" maxLength={120} />
        <Choice name="planVersion" label="Published plan version">
          {selectRecords(
            published,
            (v) => `Plan ${v.planId} · exact version ${v.versionNumber}`,
          )}
        </Choice>
        <TextField name="currency" label="Currency code" maxLength={3} />
        <TextField
          name="amount"
          label="Exact amount in currency minor units"
          type="number"
        />
        <Choice name="interval" label="Cadence">
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </Choice>
        <TextField name="count" label="Cadence count" type="number" />
        <Choice name="billingModel" label="Billing model">
          <option value="FLAT">Flat</option>
          <option value="METERED">Metered</option>
        </Choice>
        <p>
          Changing price or cadence creates a new offer. Existing terms remain
          unchanged.
        </p>
      </CommandForm>
    );
  if (section === 'FEATURES')
    return (
      <CommandForm
        title="Register feature definition"
        run={(f) => service.registerFeature(text(f, 'code'))}
        onDone={refresh}
      >
        <Choice name="code" label="Server-registered feature">
          <option value="">Select a registered definition</option>
          {registered.map((f) => (
            <option key={f.featureCode} value={f.featureCode}>
              {f.featureCode} · {f.valueKind}
            </option>
          ))}
        </Choice>
        <p>
          Definitions come from the backend feature registry and preserve its
          typed semantics.
        </p>
      </CommandForm>
    );
  if (section === 'METRICS')
    return (
      <CommandForm
        title="Create usage metric"
        run={(f) =>
          service.createMetric({
            metricCode: text(f, 'code'),
            aggregationKind: text(f, 'aggregation'),
            unit: text(f, 'unit'),
            sourceType: text(f, 'source'),
            policyVersion: text(f, 'policyVersion'),
          })
        }
        onDone={refresh}
      >
        <TextField name="code" label="Metric code" maxLength={120} />
        <TextField name="aggregation" label="Aggregation kind" maxLength={30} />
        <TextField name="unit" label="Unit" maxLength={80} />
        <TextField
          name="source"
          label="Registered usage source type"
          maxLength={80}
        />
        <TextField
          name="policyVersion"
          label="Metric policy version"
          maxLength={80}
        />
      </CommandForm>
    );
  if (section === 'ACCESS_POLICIES')
    return (
      <CommandForm
        title="Create subscription access policy"
        run={(f) =>
          service.accessPolicy({
            code: text(f, 'code'),
            version: text(f, 'version'),
            stateAccess: Object.fromEntries(
              [
                'PENDING',
                'TRIALING',
                'ACTIVE',
                'PAST_DUE',
                'PAUSED',
                'CANCELED',
                'ENDED',
                'RECONCILIATION_REQUIRED',
              ].map((s) => [s, f.get(s) === 'on']),
            ),
          })
        }
        onDone={refresh}
      >
        <TextField name="code" label="Access policy code" maxLength={120} />
        <TextField
          name="version"
          label="Access policy version"
          maxLength={80}
        />
        <p>
          Choose explicit optional entitlement access for each subscription
          state.
        </p>
        {[
          'PENDING',
          'TRIALING',
          'ACTIVE',
          'PAST_DUE',
          'PAUSED',
          'CANCELED',
          'ENDED',
          'RECONCILIATION_REQUIRED',
        ].map((s) => (
          <label key={s}>
            <input type="checkbox" name={s} /> {s}
          </label>
        ))}
      </CommandForm>
    );
  if (section === 'CHANGE_POLICIES')
    return (
      <CommandForm
        title="Create subscription change policy"
        run={(f) =>
          service.changePolicy({
            code: text(f, 'code'),
            version: text(f, 'version'),
            timing: text(f, 'timing'),
            proration: text(f, 'proration'),
          })
        }
        onDone={refresh}
      >
        <TextField name="code" label="Change policy code" maxLength={120} />
        <TextField
          name="version"
          label="Change policy version"
          maxLength={80}
        />
        <Choice name="timing" label="Effective timing">
          <option value="IMMEDIATE">Immediate</option>
          <option value="AT_PERIOD_END">At period end</option>
        </Choice>
        <Choice name="proration" label="Proration">
          <option value="none">None</option>
          <option value="create_prorations">Create prorations</option>
          <option value="always_invoice">Always invoice</option>
        </Choice>
      </CommandForm>
    );
  if (section === 'OVERRIDES' && account)
    return (
      <CommandForm
        title="Grant entitlement override"
        validate={(f) => {
          if (!/^[A-Z0-9_]{1,80}$/.test(text(f, 'reason')))
            throw new AppError('validation');
          const starts = Date.parse(text(f, 'starts')),
            ends = text(f, 'ends');
          if (
            !Number.isFinite(starts) ||
            (ends &&
              (!Number.isFinite(Date.parse(ends)) ||
                Date.parse(ends) <= starts))
          )
            throw new AppError('validation');
        }}
        confirm="Grant this explicit feature override for the selected tenant and dates? The plan version will remain unchanged."
        run={(f) =>
          service.grantOverride({
            billingAccountId: account,
            ...ruleValues(f, refs.features),
            startsAt: new Date(text(f, 'starts')).toISOString(),
            endsAt: text(f, 'ends')
              ? new Date(text(f, 'ends')).toISOString()
              : null,
            reasonCode: text(f, 'reason'),
            source: text(f, 'source'),
          })
        }
        onDone={refresh}
      >
        <p>
          Selected billing account {account}. Open this page from tenant detail
          to choose the subject.
        </p>
        <RuleFields features={refs.features} metrics={refs.metrics} />
        <TextField name="starts" label="Starts at" type="datetime-local" />
        <TextField
          name="ends"
          label="Ends at"
          type="datetime-local"
          required={false}
        />
        <TextField name="reason" label="Reason code" maxLength={80} />
        <p>Reason codes use capital letters, numbers and underscores.</p>
        <TextField name="source" label="Override source" maxLength={80} />
      </CommandForm>
    );
  return section === 'OVERRIDES' ? (
    <p>Choose a tenant from the directory to grant a scoped override.</p>
  ) : (
    <p>
      Provider mappings are displayed without provider Product, Price or
      Customer identifiers. External verification is reserved for the final
      Stripe phase.
    </p>
  );
}
