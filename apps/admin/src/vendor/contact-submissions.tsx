import { useCallback, useEffect, useState } from 'react';
import type {
  ContactStatusFilter,
  ContactSubmission,
  ContactSummary,
  VendorContactApi,
} from '@market/api';
import {
  Alert,
  Badge,
  EmptyState,
  Field,
  scrollToPaginatedTable,
  UtilityIcon,
} from '@market/ui';
import {
  FarmstandButton,
  FarmstandIcon,
  FarmstandLink,
  FarmstandPanel,
  FarmstandSelect,
  FarmstandTable,
} from '@market/ui/farmstand';
import { ReadState, useRead } from './common';
import { withContactSubjects } from './contact-subjects';
import '@market/ui/farmstand.css';
import './order-detail.css';
import './orders.css';
import './customers.css';
import './contact-submissions.css';

const pageSize = 10;
/** The backend returns fixed 20-row pages; each holds two 10-row display pages. */
const serverPageSize = 20;

function submissionFromUrl() {
  return (
    new URLSearchParams(window.location.search).get('submission') ?? undefined
  );
}

function receivedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function receivedTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusBadge({ row }: { row: Pick<ContactSummary, 'read_at'> }) {
  return (
    <Badge tone={row.read_at ? 'neutral' : 'info'}>
      {row.read_at ? 'Read' : 'Unread'}
    </Badge>
  );
}

/**
 * Feature composition of the Customers workspace presentation (Farmstand panels,
 * table, select and preview facts). No shared inbox composition supplies a
 * paged contact list with an always-open message preview.
 */
export function ContactSubmissions({ api }: { api?: VendorContactApi }) {
  const [skip, setSkip] = useState(0),
    [status, setStatus] = useState<ContactStatusFilter | ''>(''),
    // An explicit selection (row click or ?submission= link) marks the message read;
    // the default first-row preview does not.
    [selected, setSelected] = useState<string | undefined>(submissionFromUrl),
    [opened, setOpened] = useState<string | undefined>(submissionFromUrl);
  useEffect(() => {
    const selectFromUrl = () => {
      const id = submissionFromUrl();
      setSelected(id);
      setOpened(id);
    };
    window.addEventListener('popstate', selectFromUrl);
    return () => window.removeEventListener('popstate', selectFromUrl);
  }, []);
  const serverSkip = Math.floor(skip / serverPageSize) * serverPageSize;
  const read = useCallback(
    async () =>
      // Tag the page so retained data from another offset or filter is never shown.
      ({
        ...(await withContactSubjects(
          api!,
          await api!.list(serverSkip, status || undefined),
        )),
        loadedFor: `${status}:${serverSkip}`,
      }),
    [api, serverSkip, status],
  );
  const query = useRead(`contact:${status}:${serverSkip}`, read, !!api, {
    retainPreviousData: true,
  });
  if (!api)
    return (
      <Alert severity="warning">
        Contact submissions are unavailable in this environment.
      </Alert>
    );
  const switching =
    !!query.data && query.data.loadedFor !== `${status}:${serverSkip}`;
  const items = (switching ? [] : (query.data?.items ?? [])).slice(
    skip - serverSkip,
    skip - serverSkip + pageSize,
  );
  const total = query.data?.totalItems ?? 0;
  function turn(next: number) {
    setSkip(next);
    setSelected(undefined);
  }
  const current = selected ?? items[0]?.id;
  function choose(id: string) {
    setSelected(id);
    setOpened(id);
    const url = new URL(window.location.href);
    url.searchParams.set('submission', id);
    window.history.replaceState(null, '', url);
  }
  function filter(value: string) {
    setStatus(value as ContactStatusFilter | '');
    setSkip(0);
    setSelected(undefined);
  }
  return (
    <div className="order-detail customers-page contact-page">
      <header className="order-page-heading">
        <div className="order-heading-title">
          <span className="order-heading-icon">
            <UtilityIcon name="email" />
          </span>
          <div>
            <h1>Contact Submissions</h1>
            <p>
              Review messages sent through your website&rsquo;s Contact page.
              Reply using your own email or phone.
            </p>
          </div>
        </div>
        <FarmstandButton
          variant="secondary"
          onClick={query.refresh}
          disabled={query.loading}
        >
          <UtilityIcon name="refresh" />
          Refresh
        </FarmstandButton>
      </header>
      <ReadState
        loading={query.loading && !query.data}
        error={query.error}
        retry={query.refresh}
      />
      <div className="customers-workspace">
        {query.data && (
          <>
            <div className="customers-columns">
              <FarmstandPanel className="customers-table-panel contact-table-panel">
                <div className="contact-table-toolbar">
                  <Field id="contact-status" label="Status">
                    <FarmstandSelect
                      id="contact-status"
                      icon="bell"
                      value={status}
                      onChange={(event) => filter(event.target.value)}
                    >
                      <option value="">All messages</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                    </FarmstandSelect>
                  </Field>
                </div>
                <FarmstandTable
                  label="Contact submissions, newest first"
                  headings={['Sender', 'Subject', 'Received', 'Status']}
                >
                  {items.map((row) => {
                    const active = row.id === current;
                    return (
                      <tr
                        key={row.id}
                        className={[
                          active ? 'customers-selected' : '',
                          row.read_at ? '' : 'contact-unread',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={(event) => {
                          if (
                            event.target instanceof Element &&
                            event.target.closest('button, a')
                          )
                            return;
                          choose(row.id);
                        }}
                      >
                        <th scope="row">
                          <button
                            type="button"
                            className="farmstand-text-action customers-name contact-sender"
                            aria-current={active ? 'true' : undefined}
                            aria-controls="contact-preview"
                            onClick={() => choose(row.id)}
                          >
                            <span className="farmstand-text-link">
                              {row.full_name}
                            </span>
                          </button>
                          {row.email && <small>{row.email}</small>}
                        </th>
                        <td className="contact-subject">
                          <span title={row.subject || undefined}>
                            {row.subject || '—'}
                          </span>
                        </td>
                        <td>
                          <time dateTime={row.created_at}>
                            {receivedDate(row.created_at)}
                          </time>
                        </td>
                        <td>
                          <StatusBadge row={row} />
                        </td>
                      </tr>
                    );
                  })}
                </FarmstandTable>
                {switching && (
                  <ReadState loading error={undefined} retry={query.refresh} />
                )}
                {!items.length && !switching && (
                  <EmptyState
                    title={
                      status ? 'No matching messages' : 'No contact submissions'
                    }
                  >
                    <p>
                      {status
                        ? 'Try another status filter.'
                        : 'Messages sent through your published Contact page will appear here.'}
                    </p>
                  </EmptyState>
                )}
                {!!total && (
                  <div className="orders-footer contact-footer">
                    <span>
                      {total <= pageSize
                        ? `Showing all ${total} ${total === 1 ? 'message' : 'messages'}`
                        : `Showing ${skip + 1} to ${Math.min(skip + pageSize, total)} of ${total} messages`}
                    </span>
                    {total > pageSize ? (
                      <nav
                        className="orders-pagination"
                        aria-label="Contact submissions pagination"
                        onClickCapture={(event) =>
                          scrollToPaginatedTable(event.currentTarget)
                        }
                      >
                        <FarmstandButton
                          variant="secondary"
                          size="compact"
                          disabled={!skip || switching}
                          onClick={() => turn(Math.max(0, skip - pageSize))}
                        >
                          Previous
                        </FarmstandButton>
                        <FarmstandButton
                          variant="secondary"
                          size="compact"
                          disabled={skip + pageSize >= total || switching}
                          onClick={() => turn(skip + pageSize)}
                        >
                          Next
                        </FarmstandButton>
                      </nav>
                    ) : (
                      <span>
                        Select a message to read it{' '}
                        <FarmstandIcon name="arrow-up-right" />
                      </span>
                    )}
                  </div>
                )}
              </FarmstandPanel>
              {current ? (
                <ContactPreview
                  key={current}
                  api={api}
                  id={current}
                  markRead={opened === current}
                  onChange={query.refresh}
                />
              ) : (
                <FarmstandPanel className="customers-preview">
                  <EmptyState title="No message selected">
                    <p>Select a message to read it here.</p>
                  </EmptyState>
                </FarmstandPanel>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ContactPreview({
  api,
  id,
  markRead,
  onChange,
}: {
  api: VendorContactApi;
  id: string;
  markRead: boolean;
  onChange: () => void;
}) {
  const [row, setRow] = useState<ContactSubmission>(),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    (markRead ? api.read(id, true) : api.detail(id))
      .then((value) => {
        if (!live) return;
        setRow(value);
        setFailed(false);
        if (markRead) onChange();
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [api, id, markRead, onChange, revision]);
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setNotice(
        'Copy was unavailable. Select and copy the displayed contact detail.',
      );
    }
  }
  async function toggleRead(current: ContactSubmission) {
    setBusy(true);
    setNotice('');
    try {
      setRow(await api.read(id, !current.read_at));
      onChange();
    } catch {
      setNotice('The read status could not be updated. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  if (failed)
    return (
      <FarmstandPanel className="customers-preview contact-preview">
        <Alert severity="error">
          This submission could not be opened.{' '}
          <FarmstandButton
            variant="secondary"
            onClick={() => {
              setFailed(false);
              setRevision((v) => v + 1);
            }}
          >
            Try again
          </FarmstandButton>
        </Alert>
      </FarmstandPanel>
    );
  if (!row)
    return (
      <FarmstandPanel className="customers-preview contact-preview contact-preview-pending">
        <ReadState loading error={undefined} retry={() => undefined} />
      </FarmstandPanel>
    );
  return (
    <FarmstandPanel
      as="section"
      id="contact-preview"
      className="customers-preview contact-preview contact-preview-enter"
      aria-label={`Message from ${row.full_name}`}
      aria-busy={busy || undefined}
    >
      <div className="customers-identity">
        <span className="customers-avatar">
          <FarmstandIcon name="user-round" />
        </span>
        <div>
          <h2>{row.full_name}</h2>
          <p>
            <UtilityIcon name="email" />
            {row.email}
          </p>
        </div>
        <StatusBadge row={row} />
      </div>
      <FarmstandPanel className="customers-facts-panel">
        <h3>Contact details</h3>
        <dl className="customers-facts contact-facts">
          <div>
            <dt>
              <UtilityIcon name="email" />
              Email
            </dt>
            <dd>
              <a href={`mailto:${row.email}`}>{row.email}</a>
              <FarmstandButton
                variant="tertiary"
                size="compact"
                onClick={() => void copy(row.email, 'Email address')}
              >
                Copy
              </FarmstandButton>
            </dd>
          </div>
          <div>
            <dt>
              <UtilityIcon name="phone" />
              Phone
            </dt>
            <dd>
              {row.phone ? (
                <>
                  <a href={`tel:${row.phone}`}>{row.phone}</a>
                  <FarmstandButton
                    variant="tertiary"
                    size="compact"
                    onClick={() => void copy(row.phone, 'Phone number')}
                  >
                    Copy
                  </FarmstandButton>
                </>
              ) : (
                'Not provided'
              )}
            </dd>
          </div>
          <div>
            <dt>
              <FarmstandIcon name="tag" />
              Subject
            </dt>
            <dd>{row.subject}</dd>
          </div>
          {row.order_number && (
            <div>
              <dt>
                <FarmstandIcon name="hash" />
                Order
              </dt>
              <dd>{row.order_number}</dd>
            </div>
          )}
          <div>
            <dt>
              <FarmstandIcon name="calendar-days" />
              Received
            </dt>
            <dd>
              <time dateTime={row.created_at}>
                {receivedTime(row.created_at)}
              </time>
            </dd>
          </div>
        </dl>
      </FarmstandPanel>
      <FarmstandPanel className="customers-recent-panel contact-message-panel">
        <h3>Message</h3>
        <p className="contact-message">{row.message}</p>
      </FarmstandPanel>
      {notice && (
        <p role="status" className="contact-notice">
          {notice}
        </p>
      )}
      <div className="contact-actions">
        <FarmstandLink
          variant="primary"
          href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject}`)}`}
        >
          <UtilityIcon name="email" />
          Reply by Email
        </FarmstandLink>
        <FarmstandButton
          variant="secondary"
          loading={busy}
          onClick={() => void toggleRead(row)}
        >
          {row.read_at ? 'Mark Unread' : 'Mark Read'}
        </FarmstandButton>
      </div>
    </FarmstandPanel>
  );
}
