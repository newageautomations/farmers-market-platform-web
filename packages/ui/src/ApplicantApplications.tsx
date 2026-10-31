import { ApplicationInformationResponse } from './ApplicationInformation';
import { ApplicationOnboarding } from './ApplicationOnboarding';
import { useEffect, useState, type ReactNode } from 'react';
import type {
  ApplicantApplicationsApi,
  ApplicantApplicationList,
  ApplicantApplicationRow,
  ApplicantApplicationDetail,
} from '@market/api';
import {
  ApplicationFields,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Spinner,
} from './index';
import { buttonClassName } from './presentation';
import { formatMoney } from '@market/config';
export const applicationStatusLabel = (status: string) =>
  ({
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under review',
    NEEDS_INFO: 'Needs information',
    WAITLISTED: 'Waitlisted',
    ACCEPTED: 'Accepted',
    DECLINED: 'Declined',
    WITHDRAWN: 'Withdrawn',
  })[status] ?? status;
const dateLabel = (value?: string) =>
  value ? new Date(value).toLocaleString() : 'Date unavailable';
/** Shared applicant presentation. APIs and destinations remain renderer-owned. */
export function ApplicantApplications({
  api,
  id,
  basePath,
  vendorOrigin,
  vendorId,
  renderLink,
}: {
  api: ApplicantApplicationsApi;
  id?: number;
  basePath: string;
  vendorOrigin?: string;
  vendorId?: number;
  renderLink?: (href: string, label: string) => ReactNode;
}) {
  const [list, setList] = useState<ApplicantApplicationList | null>(null),
    [detail, setDetail] = useState<ApplicantApplicationDetail | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [confirmation, setConfirmation] = useState<ApplicantApplicationRow | null>(
      null,
    ),
    [revision, setRevision] = useState(0),
    [skip, setSkip] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError('');
      try {
        if (id) {
          const value = await api.read<ApplicantApplicationDetail>({
            id,
            vendorId,
          });
          if (active) setDetail(value);
        } else {
          const value = await api.read<ApplicantApplicationList>({
            skip,
            vendorId,
          });
          if (active) setList(value);
        }
      } catch {
        if (active)
          setError(
            'Applications could not be loaded. Sign in as the owner and select the correct Vendor business, then reload.',
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, id, revision, skip, vendorId]);
  useEffect(() => {
    if (!detail) return;
    const anchor = /^#information-request-[1-9]\d*$/.exec(window.location.hash);
    if (anchor) document.getElementById(anchor[0].slice(1))?.scrollIntoView?.();
  }, [detail]);
  const linkClass = buttonClassName({ variant: 'secondary' });
  const selectedChannel = detail?.vendorChannelId ?? list?.vendorChannelId;
  const routeLink = (href: string, label: string) => {
    const target = selectedChannel
      ? href +
        (href.includes('?') ? '&' : '?') +
        'channel=' +
        encodeURIComponent(selectedChannel)
      : href;
    return renderLink ? (
      renderLink(target, label)
    ) : (
      <a className={linkClass} href={target}>
        {label}
      </a>
    );
  };
  const rows = (items: ApplicantApplicationRow[]) =>
    items.map((row) => (
      <Card key={`${row.status}:${row.id}`}>
        <h2 className="ui-section-title-consumer">{row.name}</h2>
        <p>{row.marketName}</p>
        <Badge>{applicationStatusLabel(row.status)}</Badge>
        <p>
          {row.status === 'DRAFT' ? 'Last saved' : 'Submitted'}:{' '}
          {dateLabel(row.updatedAt ?? row.createdAt)}
        </p>
        <div className="actions">
          {row.status === 'DRAFT' ? (
            <>
              {row.origin && row.current ? (
                <a
                  className={linkClass}
                  href={`${row.origin}/vendor/application-continue?draft=${row.id}&vendor=${vendorId}&channel=${row.vendorChannelId ?? ''}`}
                >
                  Resume Application
                </a>
              ) : (
                <>
                  <p>
                    This form has changed or is unavailable. Your saved work is
                    retained. Contact the market before starting again.
                  </p>
                  <a
                    className={linkClass}
                    href={`${basePath}/drafts/${row.id}`}
                  >
                    View saved draft
                  </a>
                </>
              )}
              <Button
                variant="destructive-outline"
                onClick={() => setConfirmation(row)}
              >
                Discard draft
              </Button>
            </>
          ) : (
            routeLink(`${basePath}/${row.id}`, 'View application')
          )}
        </div>
      </Card>
    ));
  return (
    <div className="applicant-applications" aria-busy={pending}>
      {loading ? (
        <Spinner label="Loading applications" />
      ) : error ? (
        <>
          <p role="alert">{error}</p>
          <Button onClick={() => setRevision((v) => v + 1)}>Try again</Button>
        </>
      ) : detail ? (
        <>
          {routeLink(basePath, 'All applications')}
          <Card>
            <h2 className="ui-section-title-consumer">{detail.name}</h2>
            <p>{detail.marketName}</p>
            <Badge>{applicationStatusLabel(detail.status)}</Badge>
            <p>Submitted {dateLabel(detail.createdAt)}</p>
            {detail.origin && <a href={detail.origin}>Visit market</a>}
          </Card>
          {detail.status === 'NEEDS_INFO' &&
            !detail.informationRequests?.length && (
              <p role="status">
                The market needs more information. Contact the market for
                guidance. Submitted answers cannot be changed here.
              </p>
            )}
          {detail.status === 'ACCEPTED' && (
            <Card>
              <p>
                Your application is accepted. Market membership, date
                participation, and booth assignments each require separate
                approval.
              </p>
              {detail.vendorId && vendorOrigin ? (
                <div className="actions">
                  <a
                    className={linkClass}
                    href={`${vendorOrigin}/vendor/markets?channel=${detail.vendorChannelId}`}
                  >
                    Market relationships and participation
                  </a>
                  <a
                    className={linkClass}
                    href={`${vendorOrigin}/vendor/documents?channel=${detail.vendorChannelId}`}
                  >
                    Documents and onboarding
                  </a>
                  <a
                    className={linkClass}
                    href={`${vendorOrigin}/vendor/booths?channel=${detail.vendorChannelId}`}
                  >
                    Booth assignments
                  </a>
                </div>
              ) : (
                <p>
                  Contact the market for onboarding. You can add your business
                  through your account when ready.
                </p>
              )}
            </Card>
          )}
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
              documentHref={`${vendorOrigin ?? ''}/vendor/documents?channel=${detail.vendorChannelId}`}
              onSubmitted={() => setRevision((v) => v + 1)}
            />
          ))}
          <ApplicationFields
            definition={detail.definition}
            answers={detail.answers}
            readOnly
          />
          <Card>
            <h2 className="ui-section-title-consumer">Requested dates</h2>
            {detail.dates.length ? (
              <ul>
                {detail.dates.map((d) => (
                  <li key={d.id}>
                    {dateLabel(d.startsAt)} · {d.venue ?? 'Market date'} ·{' '}
                    {applicationStatusLabel(d.decision)}
                    {d.status && d.status !== 'scheduled'
                      ? ` · ${d.status}`
                      : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No dates requested.</p>
            )}
            <p>A date decision does not reserve a booth.</p>
          </Card>
          <Card>
            <h2 className="ui-section-title-consumer">Requested rentals</h2>
            {detail.rentalRequests.some((r) => r.quantity > 0) ? (
              <ul>
                {detail.rentalRequests
                  .filter((r) => r.quantity > 0)
                  .map((r) => (
                    <li key={r.optionId}>
                      {r.name}: {r.quantity} at{' '}
                      {formatMoney(r.unitMinor, r.currency)} each per requested
                      date
                    </li>
                  ))}
              </ul>
            ) : (
              <p>No rentals requested.</p>
            )}
          </Card>
          <Card>
            <h2 className="ui-section-title-consumer">Compliance</h2>
            {detail.documentation ? (
              <>
                <p>{detail.documentation.status}</p>
                {detail.documentation.outstanding.length > 0 && (
                  <ul>
                    {detail.documentation.outstanding.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p>
                Application documents require an authorized Vendor identity.
                Contact the market for requirements and next steps.
              </p>
            )}
            {detail.vendorId && vendorOrigin && (
              <a
                href={`${vendorOrigin}/vendor/documents?channel=${detail.vendorChannelId}`}
              >
                View requirements and documents
              </a>
            )}
          </Card>
          {detail.onboarding && (
            <ApplicationOnboarding
              summary={detail.onboarding}
              origin={vendorOrigin ?? ''}
            />
          )}
          <Card>
            <h2 className="ui-section-title-consumer">Application history</h2>
            <ul>
              {detail.history.map((h, i) => (
                <li key={i}>
                  {dateLabel(h.at)} ·{' '}
                  {h.event
                    ? h.event.toLowerCase().replaceAll('_', ' ')
                    : applicationStatusLabel(h.status)}
                  {h.event && h.status && h.event !== h.status
                    ? ` · ${applicationStatusLabel(h.status)}`
                    : ''}
                  {h.occurrenceId ? ` · Market date ${h.occurrenceId}` : ''}
                </li>
              ))}
            </ul>
          </Card>
          {detail.canWithdraw && (
            <Button
              variant="destructive-outline"
              disabled={pending}
              onClick={() => setConfirmation(detail)}
            >
              Withdraw application
            </Button>
          )}
        </>
      ) : (
        list && (
          <>
            {!list.drafts.length && !list.items.length ? (
              <EmptyState title="No applications yet">
                <p>
                  Visit a market and apply to get started. Sign in before
                  applying to save drafts and track progress here.
                </p>
              </EmptyState>
            ) : (
              <>
                {list.drafts.length > 0 && (
                  <section
                    className="applicant-application-list"
                    aria-label="Draft applications"
                  >
                    {rows(list.drafts)}
                  </section>
                )}
                <section
                  className="applicant-application-list"
                  aria-label="Submitted applications"
                >
                  {rows(list.items)}
                </section>
                <div className="actions">
                  {skip > 0 && (
                    <Button onClick={() => setSkip((v) => Math.max(0, v - 30))}>
                      Previous
                    </Button>
                  )}
                  {skip + 30 < list.totalItems && (
                    <Button onClick={() => setSkip((v) => v + 30)}>Next</Button>
                  )}
                </div>
              </>
            )}
          </>
        )
      )}
      <Dialog
        open={!!confirmation}
        onClose={() => {
          if (!pending) setConfirmation(null);
        }}
        busy={pending}
        title={
          confirmation?.status === 'DRAFT'
            ? 'Discard draft?'
            : 'Withdraw application?'
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirmation(null)}
            >
              Keep application
            </Button>
            <Button
              variant="destructive-outline"
              disabled={pending}
              onClick={() => {
                if (!confirmation) return;
                setPending(true);
                void api
                  .command(
                    confirmation.status === 'DRAFT'
                      ? 'DISCARD_DRAFT'
                      : 'WITHDRAW',
                    {
                      id: confirmation.id,
                      revision: confirmation.revision,
                      cancelInformationRequests: true,
                    },
                  )
                  .then(() => {
                    setConfirmation(null);
                    setRevision((v) => v + 1);
                  })
                  .catch(() => {
                    setConfirmation(null);
                    setError(
                      'The action could not be completed. Reload to check the current status, then try again.',
                    );
                  })
                  .finally(() => setPending(false));
              }}
            >
              {pending
                ? 'Saving'
                : confirmation?.status === 'DRAFT'
                  ? 'Discard draft'
                  : 'Withdraw application'}
            </Button>
          </>
        }
      >
        <p>
          {confirmation?.status === 'DRAFT'
            ? 'This permanently removes your saved draft.'
            : 'Withdrawal cancels any outstanding information requests and ends this application. It does not reverse separate memberships, participation, invoices, or booth records. You cannot edit or reopen this submission here.'}
        </p>
      </Dialog>
    </div>
  );
}
