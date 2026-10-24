import { useCallback, useRef, useState, type FormEvent } from 'react';
import { parsePrice } from '@market/config';
import {
  safeError,
  type MarketChallenge,
  type MarketChallengeTerms,
  type MarketLoyaltyApi,
  type MarketLoyaltyOverview,
  type MarketRewardClaim,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  Input,
  RecordCard,
  SelectField,
  Textarea,
} from '@market/ui';
import {
  challengeAmount,
  challengeKindLabels,
  MarketChallengeCard,
  MarketChallengeTermsView,
} from '@market/ui/loyalty';
import '@market/ui/loyalty.css';
import type { MarketService } from './service';
import { go, RouteLink, useRead } from './common';
import { ReadState } from '../vendor/common';

const initial: MarketChallengeTerms = {
  title: '',
  description: '',
  kind: 'DISCOVERY',
  target: 3,
  minimum: 1000,
  occurrenceCount: null,
  startOccurrenceId: null,
  reward: '',
  instructions: '',
};
const ideas = [
  'Market-branded tote bag',
  'Market-branded T-shirt',
  'Market-branded hat',
  'Gift basket from participating vendors',
  'Special market merchandise',
  'Other market-defined reward',
];
const steps = [
  'Choose challenge type',
  'Configure requirements',
  'Describe the reward',
  'Review and publish',
];

export function MarketChallengeWizard({
  data,
  original,
  replacement,
  onSave,
}: {
  data: MarketLoyaltyOverview;
  original?: MarketChallenge;
  replacement?: boolean;
  onSave: (terms: MarketChallengeTerms, publish: boolean) => Promise<unknown>;
}) {
  const [terms, setTerms] = useState<MarketChallengeTerms>(
    original?.terms ?? initial,
  );
  const [targetDraft, setTargetDraft] = useState(() =>
    String(
      (original?.terms ?? initial).target /
        ((original?.terms ?? initial).kind === 'SPENDING' ? 100 : 1),
    ),
  );
  const [minimumDraft, setMinimumDraft] = useState(() =>
    String((original?.terms ?? initial).minimum / 100),
  );
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [rewardsOpen, setRewardsOpen] = useState(false);
  const lock = useRef(false);
  const set = <K extends keyof MarketChallengeTerms>(
    key: K,
    value: MarketChallengeTerms[K],
  ) => setTerms((t) => ({ ...t, [key]: value }));
  const [openedAt] = useState(() => Date.now());
  const upcoming = data.occurrences.filter(
    (o) => o.status === 'scheduled' && Date.parse(o.endsAt) > openedAt,
  );
  const start = data.occurrences.findIndex(
    (o) => o.id === terms.startOccurrenceId,
  );
  const window =
    start < 0
      ? []
      : data.occurrences
          .slice(start)
          .filter((o) => o.status === 'scheduled')
          .slice(0, terms.occurrenceCount ?? 0)
          .map((o) => ({
            occurrence_id: o.id,
            label: o.label,
            starts_at: o.startsAt,
            ends_at: o.endsAt,
            skipped: false,
          }));
  async function save(publish: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await onSave(terms, publish);
    } catch (e) {
      setError(safeError(e).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function next(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (step === 1) {
      try {
        const target =
          terms.kind === 'SPENDING'
            ? parsePrice(targetDraft, 'USD')
            : Number(targetDraft);
        const minimum =
          terms.kind === 'SPENDING' ? 0 : parsePrice(minimumDraft, 'USD');
        if (
          !Number.isSafeInteger(target) ||
          target <= 0 ||
          (terms.kind !== 'SPENDING' && target > 1000)
        )
          throw new Error();
        setTerms((t) => ({ ...t, target, minimum }));
      } catch {
        setError(
          'Enter a whole-number objective and exact dollar amounts with at most two decimal places.',
        );
        return;
      }
    }
    if (step < 3) setStep(step + 1);
    else void save(true);
  }
  return (
    <Card className="market-challenge-wizard">
      <h2>
        {replacement
          ? 'Create a replacement challenge'
          : original
            ? 'Edit draft challenge'
            : 'Create challenge'}
      </h2>
      <p role="status">{steps[step]}</p>
      {replacement && (
        <p>
          This creates a separate campaign. Existing progress and promised
          rewards stay with the original challenge.
        </p>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <form onSubmit={next}>
        <fieldset disabled={busy}>
          {step === 0 && (
            <div className="loyalty-wallet-grid">
              {(['DISCOVERY', 'VISITS', 'SPENDING'] as const).map((kind) => (
                <Card key={kind}>
                  <label className="loyalty-type-option">
                    <input
                      type="radio"
                      name="challenge-kind"
                      value={kind}
                      checked={terms.kind === kind}
                      onChange={() => {
                        setTargetDraft(kind === 'SPENDING' ? '100' : '3');
                        setMinimumDraft(kind === 'SPENDING' ? '0' : '10');
                        setTerms((t) => ({
                          ...t,
                          kind,
                          target: kind === 'SPENDING' ? 10000 : 3,
                          minimum: kind === 'SPENDING' ? 0 : 1000,
                          occurrenceCount: kind === 'SPENDING' ? 3 : null,
                          startOccurrenceId:
                            kind === 'SPENDING'
                              ? (upcoming[0]?.id ?? null)
                              : null,
                        }));
                      }}
                    />
                    <span>{challengeKindLabels[kind]}</span>
                  </label>
                  <p>
                    {kind === 'DISCOVERY'
                      ? 'Encourage purchases from different market vendors.'
                      : kind === 'VISITS'
                        ? 'Encourage purchases across different market occurrences.'
                        : 'Set a spending goal across consecutive market occurrences.'}
                  </p>
                </Card>
              ))}
            </div>
          )}
          {step === 1 && (
            <>
              <Field id="challenge-title" label="Challenge title">
                <Input
                  id="challenge-title"
                  required
                  maxLength={120}
                  value={terms.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </Field>
              <Field id="challenge-description" label="Description (optional)">
                <Textarea
                  id="challenge-description"
                  maxLength={2000}
                  value={terms.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>
              <Field
                id="challenge-target"
                label={
                  terms.kind === 'SPENDING'
                    ? 'Target spending (USD)'
                    : terms.kind === 'DISCOVERY'
                      ? 'Number of different vendors required'
                      : 'Number of different occurrences required'
                }
              >
                <Input
                  id="challenge-target"
                  type="number"
                  min={terms.kind === 'SPENDING' ? '0.01' : '1'}
                  max={terms.kind === 'SPENDING' ? '21474836.47' : '1000'}
                  step={terms.kind === 'SPENDING' ? '0.01' : '1'}
                  required
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                />
              </Field>
              {terms.kind !== 'SPENDING' && (
                <Field
                  id="challenge-minimum"
                  label={
                    terms.kind === 'DISCOVERY'
                      ? 'Minimum product spending per vendor (USD)'
                      : 'Minimum product spending in one order (USD)'
                  }
                >
                  <Input
                    id="challenge-minimum"
                    type="number"
                    min="0"
                    max="21474836.47"
                    step="0.01"
                    required
                    value={minimumDraft}
                    onChange={(e) => setMinimumDraft(e.target.value)}
                  />
                  <p>
                    Taxes and fees do not count. Separate below-minimum orders
                    are not combined.
                  </p>
                </Field>
              )}
              {terms.kind !== 'SPENDING' && (
                <SelectField
                  id="challenge-window"
                  label="Occurrence window"
                  value={terms.occurrenceCount === null ? 'open' : 'bounded'}
                  onChange={(e) =>
                    setTerms((t) => ({
                      ...t,
                      occurrenceCount: e.target.value === 'open' ? null : 3,
                      startOccurrenceId:
                        e.target.value === 'open'
                          ? null
                          : (upcoming[0]?.id ?? null),
                    }))
                  }
                >
                  <option value="open">While published</option>
                  <option value="bounded">A set number of occurrences</option>
                </SelectField>
              )}
              {terms.occurrenceCount !== null && (
                <>
                  <Field
                    id="challenge-occurrences"
                    label="Number of consecutive market occurrences"
                  >
                    <Input
                      id="challenge-occurrences"
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={terms.occurrenceCount}
                      onChange={(e) =>
                        set('occurrenceCount', Number(e.target.value))
                      }
                    />
                  </Field>
                  <SelectField
                    id="challenge-start"
                    label="Starting market occurrence"
                    required
                    value={terms.startOccurrenceId ?? ''}
                    onChange={(e) =>
                      set('startOccurrenceId', Number(e.target.value))
                    }
                  >
                    <option value="">Choose an occurrence</option>
                    {upcoming.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} · Occurrence {o.id}
                      </option>
                    ))}
                  </SelectField>
                  <p>
                    Uses actual scheduled opportunities, including irregular
                    dates. Cancelled occurrences do not consume an opportunity.
                    Future slots can fill as the schedule is published.
                  </p>
                </>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <Field id="challenge-reward" label="Reward Description">
                <Textarea
                  id="challenge-reward"
                  required
                  rows={6}
                  maxLength={4000}
                  value={terms.reward}
                  onChange={(e) => set('reward', e.target.value)}
                />
              </Field>
              <p>
                Describe what you will provide and where customers can collect
                it. Your market is responsible for fulfillment.
              </p>
              <p>
                Don't know what to give?{' '}
                <a
                  href="#common-rewards"
                  className="market-loyalty-help-link"
                  aria-haspopup="dialog"
                  onClick={(e) => {
                    e.preventDefault();
                    setRewardsOpen(true);
                  }}
                >
                  See common rewards
                </a>
                .
              </p>
              <Field
                id="challenge-instructions"
                label="Pickup instructions (optional)"
              >
                <Textarea
                  id="challenge-instructions"
                  rows={3}
                  maxLength={2000}
                  value={terms.instructions}
                  onChange={(e) => set('instructions', e.target.value)}
                />
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <p>
                {challengeKindLabels[terms.kind]}.{' '}
                {data.enabled
                  ? 'The program is enabled.'
                  : 'The program is disabled. You can publish, then enable it when ready.'}
              </p>
              <p>
                Publication locks the requirements and promised reward. Material
                changes require a separate campaign.
              </p>
              <MarketChallengeCard
                challenge={{
                  id: 0,
                  market_id: 0,
                  market_name: 'Customer preview',
                  status: 'ACTIVE',
                  availability: 'ACTIVE',
                  terms,
                  published_at: null,
                  closed_at: null,
                  window,
                  stats: { participants: 0, completions: 0 },
                }}
              />
              <MarketChallengeTermsView terms={terms} window={window} />
            </>
          )}
          <div className="actions market-challenge-wizard-actions">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step === 3 && (
              <Button variant="secondary" onClick={() => void save(false)}>
                Save draft
              </Button>
            )}
            <Button type="submit" loading={busy}>
              {step === 3 ? 'Publish challenge' : 'Continue'}
            </Button>
          </div>
        </fieldset>
      </form>
      <Dialog
        open={rewardsOpen}
        title="Common rewards"
        onClose={() => setRewardsOpen(false)}
      >
        <p>Use these ideas as inspiration for your own reward description.</p>
        <ul>
          {ideas.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      </Dialog>
    </Card>
  );
}

/** Occurrence adapter of the existing vendor loyalty graph/card presentation. */
export function MarketOccurrenceActivityCard({
  data,
  metric,
  title,
}: {
  data: MarketLoyaltyOverview['trend'];
  metric: 'customers' | 'orders' | 'spending';
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const format = (value: number) =>
    metric === 'spending'
      ? challengeAmount(value, 'SPENDING')
      : value.toLocaleString('en-US');
  const series = data
    .slice(-12)
    .map((row) => ({ ...row, value: Number(row[metric]) }));
  const maximum = Math.max(1, ...series.map((row) => row.value));
  const total = data.reduce((sum, row) => sum + Number(row[metric]), 0);
  const step = 270 / Math.max(1, series.length);
  const barWidth = Math.min(18, step * 0.65);
  return (
    <Card as="article" aria-label={`${title} by market occurrence`}>
      <h2>{title}</h2>
      <p>
        <strong>{format(total)}</strong>
        {metric === 'customers'
          ? ' customer participations'
          : metric === 'orders'
            ? ' orders'
            : ' in eligible spending'}{' '}
        across {data.length} market occurrences.
      </p>
      {metric === 'customers' && (
        <p>Customers are counted once per occurrence.</p>
      )}
      <svg
        className="loyalty-trend"
        viewBox="0 0 330 180"
        role="img"
        aria-label={`${title} by market occurrence. ${series.map((row) => `${row.label}, occurrence ${row.id}: ${format(row.value)}`).join('. ')}`}
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1="48"
              x2="318"
              y1={140 - 112 * ratio}
              y2={140 - 112 * ratio}
            />
            <text x="42" y={144 - 112 * ratio} textAnchor="end">
              {new Intl.NumberFormat('en-US', {
                notation: 'compact',
                maximumFractionDigits: 1,
                ...(metric === 'spending'
                  ? { style: 'currency', currency: 'USD' }
                  : {}),
              }).format((maximum * ratio) / (metric === 'spending' ? 100 : 1))}
            </text>
          </g>
        ))}
        {series.map(
          (row, i) =>
            row.value > 0 && (
              <rect
                key={row.id}
                x={48 + i * step + (step - barWidth) / 2}
                y={140 - (row.value / maximum) * 112}
                width={barWidth}
                height={(row.value / maximum) * 112}
                rx="2"
              >
                <title>{`${row.label}, occurrence ${row.id}: ${format(row.value)}`}</title>
              </rect>
            ),
        )}
        <text x="48" y="165">
          {series[0]?.label.slice(5)}
        </text>
        <text x="318" y="165" textAnchor="end">
          {series.at(-1)?.label.slice(5)}
        </text>
      </svg>
      {data.length > 12 && <p>The graph shows the latest 12 occurrences.</p>}
      {total === 0 && <p>No verified activity yet.</p>}
      <Button variant="secondary" onClick={() => setOpen(true)}>
        View occurrence values
      </Button>
      <Dialog
        open={open}
        title={`${title} by market occurrence`}
        onClose={() => setOpen(false)}
      >
        <dl className="loyalty-daily-values">
          {data.map((row) => (
            <div key={row.id}>
              <dt>
                {row.label} · Occurrence {row.id}
              </dt>
              <dd>{format(Number(row[metric]))}</dd>
            </div>
          ))}
        </dl>
        {!data.length && <p>No market occurrences yet.</p>}
      </Dialog>
    </Card>
  );
}

function ClaimDetails({
  claim,
  api,
  writable,
  busy,
  run,
}: {
  claim: MarketRewardClaim;
  api: MarketLoyaltyApi;
  writable: boolean;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [note, setNote] = useState(''),
    [resolution, setResolution] = useState('');
  return (
    <>
      <MarketChallengeTermsView terms={claim.terms} />
      <dl className="ui-record-facts">
        <div>
          <dt>Customer</dt>
          <dd>{claim.customer}</dd>
        </div>
        <div>
          <dt>Claimed</dt>
          <dd>{new Date(claim.claimed_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Completion</dt>
          <dd>
            {claim.evidence &&
              `${challengeAmount(claim.evidence.confirmed, claim.terms.kind)} / ${challengeAmount(claim.evidence.target, claim.terms.kind)}`}
            . {claim.valid ? 'Currently qualified' : 'Qualification reversed'}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            {claim.status.toLowerCase()}
            {claim.review === 'REQUIRED' ? ', needs review' : ''}
          </dd>
        </div>
        {claim.fulfilled_at && (
          <div>
            <dt>Fulfilled</dt>
            <dd>
              {new Date(claim.fulfilled_at).toLocaleString()}. {claim.note}
            </dd>
          </div>
        )}
      </dl>
      {writable && claim.status === 'CLAIMED' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              api.fulfill(
                claim.id,
                note,
                claim.review === 'REQUIRED' ? resolution : undefined,
              ),
            );
          }}
        >
          {claim.review === 'REQUIRED' && (
            <>
              <Alert severity="warning">
                A refund or cancellation reversed this qualification. Explain
                your decision before fulfilling the reward.
              </Alert>
              <Field id="claim-resolution" label="Review resolution">
                <Textarea
                  id="claim-resolution"
                  required
                  maxLength={2000}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field id="claim-note" label="Fulfillment note (optional)">
            <Textarea
              id="claim-note"
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={busy}>
            Mark fulfilled
          </Button>
        </form>
      )}
      <ul aria-label="Claim history">
        {claim.history?.map((event, i) => (
          <li key={i}>
            {event.event.toLowerCase().replaceAll('_', ' ')} ·{' '}
            {new Date(event.created_at).toLocaleString()}
            {typeof event.detail.resolution === 'string'
              ? ` · ${event.detail.resolution}`
              : ''}
          </li>
        ))}
      </ul>
    </>
  );
}

export function MarketLoyalty({
  service,
  path,
}: {
  service: MarketService;
  path: string;
}) {
  const api = service.loyalty;
  const read = useCallback(() => api!.overview(), [api]);
  const query = useRead('market-loyalty:' + service.readKey, read, !!api),
    data = query.data;
  const [selected, setSelected] = useState<number>(),
    [claimId, setClaimId] = useState<number>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false),
    writable = service.context.permissions.includes('ManageOwnMarketSchedule');
  async function run(action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      setSelected(undefined);
      setClaimId(undefined);
      query.refresh();
    } catch (e) {
      setError(safeError(e).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!api)
    return (
      <Alert severity="info">
        Market loyalty is unavailable in this environment.
      </Alert>
    );
  const routeId = Number(path.split('/')[4]),
    original = data?.challenges.find((c) => c.id === routeId),
    replacement = path.endsWith('/replace');
  const challenge = data?.challenges.find(
      (c) =>
        c.id === selected ||
        (c.id === routeId && !path.endsWith('/edit') && !replacement),
    ),
    claim = data?.claims.find((c) => c.id === claimId);
  const section = path.split('/')[3] ?? '';
  return (
    <>
      <nav className="ui-tabs" aria-label="Market loyalty">
        {[
          ['Overview', ''],
          ['Manage challenges', '/challenges'],
          ['Reward claims', '/rewards'],
        ].map(([label, suffix]) => (
          <RouteLink
            key={label}
            to={'/market/loyalty' + suffix}
            variant="tab"
            current={path === '/market/loyalty' + suffix}
          >
            {label}
          </RouteLink>
        ))}
      </nav>
      <ReadState {...query} retry={query.refresh} />
      {error && <Alert severity="error">{error}</Alert>}
      {data &&
        (path.endsWith('/new') || path.endsWith('/edit') || replacement ? (
          writable ? (
            <MarketChallengeWizard
              data={data}
              original={original}
              replacement={replacement}
              onSave={async (terms, publish) => {
                await api.save(
                  terms,
                  publish,
                  replacement ? undefined : original?.id,
                );
                go('/market/loyalty/challenges');
              }}
            />
          ) : (
            <Alert severity="warning">
              Challenge management requires market schedule permission.
            </Alert>
          )
        ) : (
          <>
            {section === '' && (
              <>
                <Card>
                  <div className="actions">
                    <Badge tone={data.enabled ? 'success' : 'neutral'}>
                      {data.enabled ? 'Program enabled' : 'Program disabled'}
                    </Badge>
                    {writable && (
                      <Button
                        loading={busy}
                        onClick={() =>
                          void run(() => api.program(!data.enabled))
                        }
                      >
                        {data.enabled
                          ? 'Disable program'
                          : 'Enable market loyalty'}
                      </Button>
                    )}
                  </div>
                  <p>
                    Disabling stops new purchase contributions. Already admitted
                    purchases can finish fulfillment. Completed rewards, claims
                    and history remain available.
                  </p>
                </Card>
                <div className="ui-kpi-grid">
                  {[
                    ['Active challenges', data.metrics.active],
                    ['Participating customers', data.metrics.participants],
                    ['Completed challenges', data.metrics.completed],
                    ['Rewards claimed', data.metrics.claimed],
                    ['Awaiting fulfillment', data.metrics.awaiting],
                  ].map(([label, value]) => (
                    <Card key={label}>
                      <dl>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </dl>
                    </Card>
                  ))}
                </div>
                <div className="loyalty-wallet-grid">
                  <MarketOccurrenceActivityCard
                    data={data.trend}
                    metric="customers"
                    title="Customers"
                  />
                  <MarketOccurrenceActivityCard
                    data={data.trend}
                    metric="orders"
                    title="Orders"
                  />
                  <MarketOccurrenceActivityCard
                    data={data.trend}
                    metric="spending"
                    title="Eligible spending"
                  />
                </div>
                <div className="loyalty-wallet-grid">
                  {data.challenges
                    .filter((c) => c.status === 'ACTIVE')
                    .map((c) => (
                      <RecordCard
                        key={c.id}
                        title={c.terms.title}
                        label={c.terms.title}
                        className="market-loyalty-record"
                        header={<h2>{c.terms.title}</h2>}
                        onOpen={() => setSelected(c.id)}
                        renderTrigger={(props) => (
                          <Button
                            {...props}
                            className={`${props.className} sr-only`}
                          >
                            Open {c.terms.title}
                          </Button>
                        )}
                        summary={
                          <p>
                            {c.stats.participants} participating customers ·{' '}
                            {c.stats.completions} completed ·{' '}
                            {c.stats.participants
                              ? Math.round(
                                  (c.stats.completions / c.stats.participants) *
                                    100,
                                )
                              : 0}
                            % completion
                          </p>
                        }
                      />
                    ))}
                </div>
              </>
            )}
            {section === 'challenges' && (
              <>
                {writable && (
                  <RouteLink to="/market/loyalty/challenges/new">
                    Create challenge
                  </RouteLink>
                )}
                {data.challenges.length ? (
                  <DataTable
                    label="Market challenges"
                    headings={['Challenge', 'Status']}
                    recordDetails={{
                      identifier: 0,
                      status: 1,
                      onOpen: (i) => setSelected(data.challenges[i]!.id),
                    }}
                  >
                    {data.challenges.map((c) => (
                      <tr key={c.id}>
                        <th scope="row">{c.terms.title}</th>
                        <td>
                          <Badge>{c.availability.toLowerCase()}</Badge>
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                ) : (
                  <EmptyState title="No challenges yet">
                    <p>
                      Prepare a draft or publish your first market challenge.
                    </p>
                  </EmptyState>
                )}
              </>
            )}
            {section === 'rewards' &&
              (data.claims.length ? (
                <DataTable
                  label="Market reward claims"
                  headings={['Customer and challenge', 'Status']}
                  recordDetails={{
                    identifier: 0,
                    status: 1,
                    onOpen: (i) => setClaimId(data.claims[i]!.id),
                  }}
                >
                  {data.claims.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">
                        {r.customer} · {r.terms.title}
                      </th>
                      <td>
                        <Badge
                          tone={
                            r.review === 'REQUIRED'
                              ? 'warning'
                              : r.status === 'FULFILLED'
                                ? 'success'
                                : 'neutral'
                          }
                        >
                          {r.review === 'REQUIRED'
                            ? 'Needs review'
                            : r.status.toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState title="No reward claims yet">
                  <p>Customers can claim rewards after verified completion.</p>
                </EmptyState>
              ))}
            <Dialog
              open={!!challenge}
              title={challenge?.terms.title ?? 'Challenge details'}
              busy={busy}
              onClose={() => {
                setSelected(undefined);
                if (routeId) go('/market/loyalty/challenges');
              }}
            >
              {challenge && (
                <>
                  <MarketChallengeTermsView
                    terms={challenge.terms}
                    window={challenge.window}
                  />
                  <p>
                    {challenge.stats.participants} participants ·{' '}
                    {challenge.stats.completions} completions
                  </p>
                  {writable && (
                    <div className="actions">
                      {challenge.status === 'DRAFT' ? (
                        <>
                          <RouteLink
                            to={`/market/loyalty/challenges/${challenge.id}/edit`}
                          >
                            Edit draft
                          </RouteLink>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                api.save(challenge.terms, true, challenge.id),
                              )
                            }
                          >
                            Publish challenge
                          </Button>
                        </>
                      ) : (
                        <>
                          <RouteLink
                            to={`/market/loyalty/challenges/${challenge.id}/replace`}
                          >
                            Create replacement
                          </RouteLink>
                          {['ACTIVE', 'PAUSED'].includes(challenge.status) && (
                            <>
                              <Button
                                disabled={busy}
                                onClick={() =>
                                  void run(() =>
                                    api.status(
                                      challenge.id,
                                      challenge.status === 'ACTIVE'
                                        ? 'PAUSED'
                                        : 'ACTIVE',
                                    ),
                                  )
                                }
                              >
                                {challenge.status === 'ACTIVE'
                                  ? 'Pause challenge'
                                  : 'Resume challenge'}
                              </Button>
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() =>
                                  void run(() =>
                                    api.status(challenge.id, 'CLOSED'),
                                  )
                                }
                              >
                                Close challenge
                              </Button>
                            </>
                          )}
                          {challenge.status !== 'ARCHIVED' && (
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  api.status(challenge.id, 'ARCHIVED'),
                                )
                              }
                            >
                              Archive challenge
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </Dialog>
            <Dialog
              open={!!claim}
              title="Reward fulfillment"
              busy={busy}
              onClose={() => setClaimId(undefined)}
            >
              {claim && (
                <ClaimDetails
                  claim={claim}
                  api={api}
                  writable={writable}
                  busy={busy}
                  run={run}
                />
              )}
            </Dialog>
          </>
        ))}
    </>
  );
}
