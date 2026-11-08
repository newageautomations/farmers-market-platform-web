import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  applicationQuestionVisible,
  safeStorefrontUrl,
  type ApplicantApplicationDetail,
  type ApplicantApplicationsApi,
  type ApplicationQuestion,
} from '@market/api';
import {
  Alert,
  ApplicationInformationResponse,
  ApplicationOnboarding,
  applicationStatusLabel,
  Badge,
  Dialog,
  formatPublicPhone,
  UtilityIcon,
} from '@market/ui';
import { DocumentStatus } from '@market/ui/documents';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandTable,
  type FarmstandIconName,
} from '@market/ui/farmstand';
import type { StatusTone } from '@market/ui/presentation';
import { formatMoney } from '@market/config';
import { ReadState, useRead } from './common';
import { ApplicationStatusBadge, navigate } from './MarketApplications';
import { applicationLocation } from './market-applications-data';
import './application-detail.css';

/**
 * Vendor application detail. Composes Farmstand panels, tables, badges and the
 * shared information-request, onboarding and Dialog contracts; the customer
 * account route keeps the shared ApplicantApplications presentation.
 */
type Detail = ApplicantApplicationDetail;
export type Icon =
  | { farmstand: FarmstandIconName }
  | { utility: ComponentProps<typeof UtilityIcon>['name'] };

export function Glyph({ icon }: { icon: Icon }) {
  return 'farmstand' in icon ? (
    <FarmstandIcon name={icon.farmstand} />
  ) : (
    <UtilityIcon name={icon.utility} />
  );
}

const dateTime = (value?: string, timeZone?: string) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      })
    : 'Date unavailable';
const marketDay = (value: string, timeZone?: string) =>
  new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  });
const marketTime = (value: string, timeZone?: string) =>
  new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  });
/** Browser-local fallback when the snapshot omits its market timezone or it is invalid. */
function validZone(zone?: string) {
  if (!zone) return undefined;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

const dateDecisions: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Requested', tone: 'info' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  WAITLISTED: { label: 'Waitlisted', tone: 'warning' },
  DECLINED: { label: 'Declined', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};
const decision = (value: string) =>
  dateDecisions[value] ?? {
    label: applicationStatusLabel(value),
    tone: 'neutral',
  };

function answerText(question: ApplicationQuestion, value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null || value === '') return 'No answer';
  return question.type === 'PHONE'
    ? formatPublicPhone(String(value))
    : String(value);
}
function answerIcon(question: ApplicationQuestion): Icon {
  switch (question.type) {
    case 'EMAIL':
      return { utility: 'email' };
    case 'PHONE':
      return { utility: 'phone' };
    case 'URL':
      return { farmstand: 'arrow-up-right' };
    case 'NUMBER':
      return { farmstand: 'hash' };
    case 'BOOLEAN':
      return { farmstand: 'circle-check' };
    case 'LONG_TEXT':
      return { farmstand: 'receipt-text' };
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
      return { farmstand: 'layers' };
    default:
      return { farmstand: 'tag' };
  }
}

/** Plain-language history from the backend's applicant-visible audit events. */
function historyEntry(entry: Detail['history'][number], detail: Detail) {
  const status = applicationStatusLabel(entry.status);
  const date = detail.dates.find((d) => d.id === entry.occurrenceId);
  const zone = validZone(detail.definition.schedule?.timeZone);
  switch (entry.event) {
    case 'SUBMITTED':
      return {
        title: 'Application submitted',
        text: `You submitted your application to ${detail.marketName}.`,
        icon: 'receipt-text' as const,
        tone: 'neutral',
      };
    case 'APPLICATION_STATUS_CHANGED':
      return {
        title: status,
        text:
          {
            ACCEPTED: 'The market accepted your application.',
            DECLINED: 'The market declined your application.',
            WAITLISTED: 'The market placed your application on its waitlist.',
            UNDER_REVIEW: 'The market started reviewing your application.',
            NEEDS_INFO: 'The market needs more information from you.',
            SUBMITTED: 'Your application returned to submitted.',
          }[entry.status] ?? `The application status changed to ${status}.`,
        icon:
          entry.status === 'ACCEPTED'
            ? ('circle-check' as const)
            : entry.status === 'DECLINED'
              ? ('triangle-alert' as const)
              : ('info' as const),
        tone:
          entry.status === 'ACCEPTED'
            ? 'success'
            : entry.status === 'DECLINED'
              ? 'danger'
              : 'warning',
      };
    case 'APPLICANT_WITHDREW':
      return {
        title: 'Application withdrawn',
        text: 'You withdrew this application.',
        icon: 'archive' as const,
        tone: 'neutral',
      };
    case 'APPLICATION_DATE_DECISION_CHANGED':
      return {
        title: `Market date ${decision(entry.status).label.toLocaleLowerCase()}`,
        text: date?.startsAt
          ? `${marketDay(date.startsAt, zone)} was marked ${decision(entry.status).label.toLocaleLowerCase()}.`
          : 'The market updated a requested date.',
        icon: 'calendar-days' as const,
        tone: decision(entry.status).tone,
      };
    case 'INFORMATION_REQUEST_SENT':
      return {
        title: 'Information requested',
        text: 'The market requested more information.',
        icon: 'info' as const,
        tone: 'warning',
      };
    case 'INFORMATION_RESPONSE_SUBMITTED':
      return {
        title: 'Information submitted',
        text: 'You submitted the requested information.',
        icon: 'receipt-text' as const,
        tone: 'neutral',
      };
    case 'INFORMATION_REQUEST_RESOLVED':
      return {
        title: 'Information request resolved',
        text: 'The market marked its information request as resolved.',
        icon: 'circle-check' as const,
        tone: 'success',
      };
    case 'INFORMATION_REQUEST_CANCELLED':
      return {
        title: 'Information request cancelled',
        text: 'The information request was cancelled.',
        icon: 'archive' as const,
        tone: 'neutral',
      };
    default:
      return {
        title: entry.event
          ? entry.event.toLowerCase().replaceAll('_', ' ')
          : status,
        text: entry.status ? `Status: ${status}.` : 'Application updated.',
        icon: 'info' as const,
        tone: 'neutral',
      };
  }
}

export function Panel({
  icon,
  title,
  className = '',
  children,
  aside,
}: {
  icon: Icon;
  title: string;
  className?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <FarmstandPanel
      as="section"
      aria-label={title}
      className={`application-detail-panel ${className}`}
    >
      <header className="application-detail-panel-header">
        <h2>
          <Glyph icon={icon} />
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </FarmstandPanel>
  );
}
export function Fact({
  icon,
  label,
  children,
}: {
  icon: Icon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt>
        <Glyph icon={icon} />
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
/** Same-origin vendor link with the arrow motion shared by arrowed actions. */
export function VendorLink({
  href,
  children,
  variant = 'secondary',
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary';
  className?: string;
}) {
  return (
    <FarmstandLink
      href={href}
      variant={variant}
      onClick={navigate}
      className={`application-detail-arrow ${className}`}
    >
      {children}
      <FarmstandIcon name="arrow-right" />
    </FarmstandLink>
  );
}
export function VisitMarket({
  origin,
  className = '',
}: {
  origin: string | null;
  className?: string;
}) {
  const url = safeStorefrontUrl(origin);
  return url ? (
    <FarmstandLink
      href={url}
      variant="secondary"
      target="_blank"
      rel="noopener noreferrer"
      className={`application-detail-arrow ${className}`}
    >
      <FarmstandIcon name="store" />
      Visit market
      <UtilityIcon name="external" />
      <span className="sr-only"> (opens in a new tab)</span>
    </FarmstandLink>
  ) : (
    <FarmstandButton
      variant="secondary"
      disabled
      title="Market website unavailable"
      className={className}
    >
      <FarmstandIcon name="store" />
      Visit market
      <UtilityIcon name="external" />
    </FarmstandButton>
  );
}
function WithdrawButton({
  onClick,
  disabled,
  className = '',
}: {
  onClick: () => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <FarmstandButton
      variant="destructive-outline"
      disabled={disabled}
      onClick={onClick}
      className={`application-detail-withdraw ${className}`}
    >
      <UtilityIcon name="trash" />
      Withdraw application
    </FarmstandButton>
  );
}

export function SubmittedInformation({
  detail,
}: {
  detail: Pick<Detail, 'definition' | 'answers'>;
}) {
  const visible = detail.definition.questions.filter(
    (q) =>
      q.type !== 'INFO' &&
      applicationQuestionVisible(q, detail.answers) &&
      !(
        !q.required &&
        (detail.answers[q.id] == null ||
          (typeof detail.answers[q.id] === 'string' &&
            !String(detail.answers[q.id]).trim()) ||
          (Array.isArray(detail.answers[q.id]) &&
            !(detail.answers[q.id] as unknown[]).length))
      ),
  );
  const sections = detail.definition.sections.filter((section) =>
    visible.some((q) => q.section === section),
  );
  return (
    <Panel icon={{ farmstand: 'receipt-text' }} title="Submitted information">
      {visible.length ? (
        sections.map((section) => (
          <div className="application-detail-answers" key={section}>
            {sections.length > 1 && <h3>{section}</h3>}
            <dl>
              {visible
                .filter((q) => q.section === section)
                .map((q) => (
                  <Fact key={q.id} icon={answerIcon(q)} label={q.label}>
                    {answerText(q, detail.answers[q.id])}
                  </Fact>
                ))}
            </dl>
          </div>
        ))
      ) : (
        <p className="application-detail-empty">No answers were submitted.</p>
      )}
    </Panel>
  );
}

function RequestedDates({ detail }: { detail: Detail }) {
  const zone = validZone(detail.definition.schedule?.timeZone);
  return (
    <Panel icon={{ farmstand: 'calendar-days' }} title="Requested dates">
      {detail.dates.length ? (
        <FarmstandTable
          label="Requested dates"
          headings={['Date', 'Time', 'Attendance request']}
        >
          {detail.dates.map((d) => {
            const state = decision(d.decision);
            return (
              <tr key={d.id}>
                <th scope="row">
                  <span className="application-detail-cell">
                    <FarmstandIcon name="calendar-days" />
                    <span>
                      {d.startsAt
                        ? marketDay(d.startsAt, zone)
                        : 'Date unavailable'}
                      {(d.venue || (d.status && d.status !== 'scheduled')) && (
                        <small>
                          {[
                            d.venue,
                            d.status && d.status !== 'scheduled'
                              ? `Market date ${d.status}`
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      )}
                    </span>
                  </span>
                </th>
                <td>
                  <span className="application-detail-cell">
                    <UtilityIcon name="clock" />
                    {d.startsAt ? marketTime(d.startsAt, zone) : '—'}
                  </span>
                </td>
                <td>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </td>
              </tr>
            );
          })}
        </FarmstandTable>
      ) : (
        <p className="application-detail-empty">No dates requested.</p>
      )}
      <p className="application-detail-note">
        A date decision does not reserve a booth.
      </p>
    </Panel>
  );
}

function RequestedRentals({ detail }: { detail: Detail }) {
  const rentals = detail.rentalRequests.filter((r) => r.quantity > 0);
  return (
    <Panel icon={{ farmstand: 'package' }} title="Requested rental items">
      {rentals.length ? (
        <FarmstandTable
          label="Requested rental items"
          headings={['Rental item', 'Quantity', 'Price per date', 'Status']}
        >
          {rentals.map((r) => (
            <tr key={r.optionId}>
              <th scope="row">
                <span className="application-detail-cell">
                  <FarmstandIcon name="package" />
                  {r.name}
                </span>
              </th>
              <td>{r.quantity}</td>
              <td>{formatMoney(r.unitMinor, r.currency)} each</td>
              <td>
                <Badge tone="info">Requested</Badge>
              </td>
            </tr>
          ))}
        </FarmstandTable>
      ) : (
        <p className="application-detail-empty">No rentals requested.</p>
      )}
    </Panel>
  );
}

function ApplicationHistory({ detail }: { detail: Detail }) {
  const entries = [...detail.history].reverse();
  return (
    <Panel icon={{ utility: 'clock' }} title="Application history">
      {entries.length ? (
        <ol className="application-detail-timeline">
          {entries.map((entry, index) => {
            const view = historyEntry(entry, detail);
            return (
              <li key={`${entry.at}:${index}`}>
                <span
                  className={`application-detail-timeline-icon application-detail-tone-${view.tone}`}
                >
                  <FarmstandIcon name={view.icon} />
                </span>
                <div>
                  <strong>{view.title}</strong>
                  <p>{view.text}</p>
                </div>
                <time dateTime={entry.at}>{dateTime(entry.at)}</time>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="application-detail-empty">No history recorded yet.</p>
      )}
    </Panel>
  );
}

function ApplicationSummary({ detail }: { detail: Detail }) {
  const rentals = detail.rentalRequests.filter((r) => r.quantity > 0).length;
  return (
    <Panel icon={{ farmstand: 'info' }} title="Application summary">
      <dl className="application-detail-summary">
        <Fact icon={{ farmstand: 'store' }} label="Market">
          {detail.marketName}
        </Fact>
        <Fact icon={{ farmstand: 'map-pin' }} label="Location">
          {applicationLocation(detail)}
        </Fact>
        <Fact icon={{ farmstand: 'calendar-days' }} label="Submitted on">
          {dateTime(detail.createdAt)}
        </Fact>
        <Fact icon={{ farmstand: 'circle-check' }} label="Status">
          <ApplicationStatusBadge value={detail.status} />
        </Fact>
        <Fact icon={{ farmstand: 'receipt-text' }} label="Application form">
          {detail.name}
        </Fact>
        <Fact icon={{ farmstand: 'calendar-days' }} label="Requested dates">
          {detail.dates.length} {detail.dates.length === 1 ? 'date' : 'dates'}
        </Fact>
        <Fact icon={{ farmstand: 'package' }} label="Rental items">
          {rentals ? `${rentals} requested` : 'None requested'}
        </Fact>
      </dl>
    </Panel>
  );
}

function DocumentCompliance({
  detail,
  documentsHref,
  requestsHref,
}: {
  detail: Detail;
  documentsHref: string;
  requestsHref: string;
}) {
  const readiness = detail.documentation;
  const counts = readiness
    ? (
        [
          ['Complete', readiness.complete, 'success'],
          ['Pending review', readiness.pending, 'warning'],
          ['Expiring soon', readiness.expiringSoon, 'warning'],
          ['Expired', readiness.expired, 'danger'],
          ['Missing', readiness.missing, 'danger'],
          ['Rejected', readiness.rejected, 'danger'],
        ] as const
      ).filter(([, count]) => count > 0)
    : [];
  return (
    <Panel
      icon={{ farmstand: 'circle-check' }}
      title="Document compliance"
      aside={readiness && <DocumentStatus value={readiness.status} />}
    >
      {readiness ? (
        <>
          {readiness.outstanding.length > 0 ? (
            <ul className="application-detail-documents">
              {readiness.outstanding.map((item, index) => (
                <li key={`${item}:${index}`}>
                  <span className="application-detail-document-icon">
                    <FarmstandIcon name="receipt-text" />
                  </span>
                  <span>
                    <strong>{item}</strong>
                    <small>Required by this market</small>
                  </span>
                  <Badge tone="danger">Action needed</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="application-detail-empty">
              {readiness.total
                ? 'All required documents are on file for this market.'
                : 'This market has not requested any documents.'}
            </p>
          )}
          {counts.length > 0 && (
            <dl className="application-detail-counts">
              {counts.map(([label, count, tone]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <Badge tone={tone}>{count}</Badge>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </>
      ) : (
        <p className="application-detail-empty">
          Application documents require an authorized Vendor identity. Contact
          the market for requirements and next steps.
        </p>
      )}
      <div className="application-detail-panel-actions">
        <VendorLink href={requestsHref}>View document requests</VendorLink>
        <VendorLink href={documentsHref} variant="tertiary">
          Open document library
        </VendorLink>
      </div>
    </Panel>
  );
}

export function VendorApplicationDetail({
  api,
  id,
  vendorId,
}: {
  api: ApplicantApplicationsApi;
  id: number;
  vendorId: number;
}) {
  const read = useCallback(async () => {
    const detail = await api.read<Detail>({ id, vendorId });
    if (Number(detail.id) !== id)
      throw new Error('Application identity changed');
    return detail;
  }, [api, id, vendorId]);
  const query = useRead(`vendor-application:${vendorId}:${id}`, read);
  const [confirming, setConfirming] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const detail = query.data;
  const channel = detail?.vendorChannelId
    ? `channel=${encodeURIComponent(detail.vendorChannelId)}`
    : '';
  const scoped = (path: string) =>
    channel ? `${path}${path.includes('?') ? '&' : '?'}${channel}` : path;
  const documentsHref = scoped('/vendor/documents');
  const requestsHref = detail
    ? scoped(`/vendor/documents?view=requests&market=${detail.marketId}`)
    : documentsHref;
  const withdraw = () => {
    if (!detail) return;
    setPending(true);
    setError('');
    void api
      .command('WITHDRAW', {
        id: detail.id,
        revision: detail.revision,
        cancelInformationRequests: true,
      })
      .then(() => {
        setConfirming(false);
        query.refresh();
      })
      .catch(() => {
        setConfirming(false);
        setError(
          'The application could not be withdrawn. Reload to check the current status, then try again.',
        );
      })
      .finally(() => setPending(false));
  };
  return (
    <div className="application-detail" aria-busy={pending}>
      <FarmstandLink
        href={scoped('/vendor/applications')}
        variant="secondary"
        onClick={navigate}
        className="application-detail-back application-detail-arrow"
      >
        <FarmstandIcon name="arrow-left" />
        Back to all applications
      </FarmstandLink>
      <ReadState {...query} retry={query.refresh} />
      {detail && (
        <>
          <header className="application-detail-heading">
            <div className="application-detail-title">
              <h1>{detail.marketName} application</h1>
              <ApplicationStatusBadge value={detail.status} />
            </div>
            {detail.canWithdraw && (
              <WithdrawButton
                disabled={pending}
                onClick={() => setConfirming(true)}
              />
            )}
          </header>
          {error && <Alert severity="error">{error}</Alert>}
          <FarmstandPanel
            as="section"
            aria-label="Application overview"
            className="application-detail-overview"
          >
            <dl>
              <Fact
                icon={{ farmstand: 'receipt-text' }}
                label="Application name"
              >
                {detail.name}
              </Fact>
              <Fact icon={{ farmstand: 'store' }} label="Market name">
                {detail.marketName}
              </Fact>
              <Fact
                icon={{ farmstand: 'calendar-days' }}
                label="Submission date and time"
              >
                {dateTime(detail.createdAt)}
              </Fact>
              <Fact icon={{ farmstand: 'map-pin' }} label="Location">
                {applicationLocation(detail)}
              </Fact>
            </dl>
            <VisitMarket origin={detail.origin} />
          </FarmstandPanel>
          {detail.status === 'NEEDS_INFO' &&
            !detail.informationRequests?.length && (
              <Alert severity="warning">
                The market needs more information. Contact the market for
                guidance. Submitted answers cannot be changed here.
              </Alert>
            )}
          <div className="application-detail-columns">
            <div className="application-detail-main">
              {detail.informationRequests?.map((request) => (
                <ApplicationInformationResponse
                  key={request.id}
                  request={request}
                  original={detail.answers}
                  api={api}
                  submissionId={detail.id}
                  vendorId={detail.vendorId}
                  eligible={[
                    'SUBMITTED',
                    'UNDER_REVIEW',
                    'NEEDS_INFO',
                    'WAITLISTED',
                  ].includes(detail.status)}
                  documentHref={documentsHref}
                  onSubmitted={query.refresh}
                />
              ))}
              <SubmittedInformation detail={detail} />
              <RequestedDates detail={detail} />
              <RequestedRentals detail={detail} />
              <ApplicationHistory detail={detail} />
            </div>
            <aside
              className="application-detail-sidebar"
              aria-label="Application status and actions"
            >
              <ApplicationSummary detail={detail} />
              <DocumentCompliance
                detail={detail}
                documentsHref={documentsHref}
                requestsHref={requestsHref}
              />
              {detail.onboarding && (
                <ApplicationOnboarding
                  summary={detail.onboarding}
                  origin={window.location.origin}
                />
              )}
              <Panel icon={{ farmstand: 'layers' }} title="Quick actions">
                <div className="application-detail-quick-actions">
                  <VisitMarket origin={detail.origin} />
                  {detail.status === 'ACCEPTED' && (
                    <>
                      <VendorLink href={scoped('/vendor/markets')}>
                        Market relationships
                      </VendorLink>
                      <VendorLink href={scoped('/vendor/booths')}>
                        Booth assignments
                      </VendorLink>
                    </>
                  )}
                  {detail.canWithdraw && (
                    <WithdrawButton
                      disabled={pending}
                      onClick={() => setConfirming(true)}
                    />
                  )}
                </div>
              </Panel>
            </aside>
          </div>
        </>
      )}
      <Dialog
        open={confirming}
        size="standard"
        title="Withdraw application?"
        busy={pending}
        onClose={() => {
          if (!pending) setConfirming(false);
        }}
        actions={
          <>
            <FarmstandButton
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Keep application
            </FarmstandButton>
            <FarmstandButton
              variant="destructive-outline"
              loading={pending}
              onClick={withdraw}
            >
              Withdraw application
            </FarmstandButton>
          </>
        }
      >
        <p>
          Withdrawal cancels any outstanding information requests and ends this
          application. It does not reverse separate memberships, participation,
          invoices, or booth records. You cannot edit or reopen this submission
          here.
        </p>
      </Dialog>
    </div>
  );
}
