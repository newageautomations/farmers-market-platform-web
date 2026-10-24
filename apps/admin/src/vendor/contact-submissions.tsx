import { useCallback, useEffect, useState } from 'react';
import type { ContactSubmission, VendorContactApi } from '@market/api';
import {
  Badge,
  Button,
  Dialog,
  DataTable,
  EmptyState,
  Pagination,
  Alert,
} from '@market/ui';
import { ReadState, useRead } from './common';
export function ContactSubmissions({ api }: { api?: VendorContactApi }) {
  const [skip, setSkip] = useState(0),
    [selected, setSelected] = useState<string | undefined>(
      () =>
        new URLSearchParams(window.location.search).get('submission') ??
        undefined,
    );
  useEffect(() => {
    const selectFromUrl = () =>
      setSelected(
        new URLSearchParams(window.location.search).get('submission') ??
          undefined,
      );
    window.addEventListener('popstate', selectFromUrl);
    return () => window.removeEventListener('popstate', selectFromUrl);
  }, []);
  const read = useCallback(() => api!.list(skip), [api, skip]);
  const query = useRead(`contact:${skip}`, read, !!api);
  if (!api)
    return (
      <Alert severity="warning">
        Contact submissions are unavailable in this environment.
      </Alert>
    );
  return (
    <>
      <p>
        Review customer inquiries here. Use the supplied email or phone number
        to contact the customer outside the platform.
      </p>
      <ReadState {...query} retry={query.refresh} />
      {query.data && (
        <>
          <DataTable
            label="Contact submissions, newest first"
            headings={['Sender', 'Status']}
            recordDetails={{
              status: 1,
              onOpen: (index) => setSelected(query.data!.items[index]!.id),
            }}
          >
            {query.data.items.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.full_name}</th>
                <td>
                  <Badge tone={row.read_at ? 'neutral' : 'info'}>
                    {row.read_at ? 'Read' : 'Unread'}
                  </Badge>
                </td>
              </tr>
            ))}
          </DataTable>
          {!query.data.items.length && (
            <EmptyState title="No contact submissions">
              <p>
                Messages sent through your published Contact page will appear
                here.
              </p>
            </EmptyState>
          )}
          <Pagination
            summary={`${query.data.totalItems} submissions`}
            hasPrevious={skip > 0}
            hasNext={skip + 20 < query.data.totalItems}
            onPrevious={() => setSkip((v) => Math.max(0, v - 20))}
            onNext={() => setSkip((v) => v + 20)}
          />
        </>
      )}
      {selected && (
        <ContactDetails
          key={selected}
          api={api}
          id={selected}
          onChange={query.refresh}
          close={() => {
            setSelected(undefined);
            const url = new URL(window.location.href);
            url.searchParams.delete('submission');
            window.history.replaceState(null, '', url);
          }}
        />
      )}
    </>
  );
}
function ContactDetails({
  api,
  id,
  close,
  onChange,
}: {
  api: VendorContactApi;
  id: string;
  close: () => void;
  onChange: () => void;
}) {
  const [row, setRow] = useState<ContactSubmission>(),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    api
      .read(id, true)
      .then((value) => {
        if (current) {
          setRow(value);
          setFailed(false);
          onChange();
        }
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [api, id, onChange, revision]);
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied.`);
    } catch {
      setCopied(
        'Copy was unavailable. Select and copy the displayed contact detail.',
      );
    }
  }
  return (
    <Dialog
      open
      title={row ? `Message from ${row.full_name}` : 'Contact submission'}
      onClose={close}
      busy={busy}
    >
      {failed ? (
        <Alert severity="error">
          This submission could not be opened.{' '}
          <Button
            onClick={() => {
              setFailed(false);
              setRevision((v) => v + 1);
            }}
          >
            Try again
          </Button>
        </Alert>
      ) : !row ? (
        <p role="status">Loading submission…</p>
      ) : (
        <>
          <Badge tone={row.read_at ? 'neutral' : 'info'}>
            {row.read_at ? 'Read' : 'Unread'}
          </Badge>
          <dl
            className="contact-submission-details"
            style={{ overflowWrap: 'anywhere' }}
          >
            <dt>Name</dt>
            <dd>{row.full_name}</dd>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${encodeURIComponent(row.email)}`}>
                {row.email}
              </a>{' '}
              <Button
                variant="secondary"
                onClick={() => void copy(row.email, 'Email address')}
              >
                Copy email
              </Button>
            </dd>
            {row.phone && (
              <>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${row.phone}`}>{row.phone}</a>{' '}
                  <Button
                    variant="secondary"
                    onClick={() => void copy(row.phone, 'Phone number')}
                  >
                    Copy phone
                  </Button>
                </dd>
              </>
            )}
            <dt>Subject</dt>
            <dd>{row.subject}</dd>
            {row.order_number && (
              <>
                <dt>Order reference</dt>
                <dd>{row.order_number}</dd>
              </>
            )}
            <dt>Received</dt>
            <dd>{new Date(row.created_at).toLocaleString()}</dd>
            <dt>Message</dt>
            <dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {row.message}
            </dd>
          </dl>
          {copied && <p role="status">{copied}</p>}
          <p>
            Contact this customer using your external email or telephone
            application.
          </p>
          <Button
            variant="secondary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setRow(await api.read(id, !row.read_at));
                onChange();
              } catch {
                setCopied(
                  'The read status could not be updated. Please try again.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {row.read_at ? 'Mark unread' : 'Mark read'}
          </Button>
        </>
      )}
    </Dialog>
  );
}
