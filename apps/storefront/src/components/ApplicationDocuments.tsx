import { useEffect, useMemo, useState } from 'react';
import {
  AppError,
  type ComplianceData,
  type ComplianceRequest,
  type DocumentFileApi,
  type PublicApplication,
} from '@market/api';
import { Alert, Button, Card, Spinner } from '@market/ui';
import {
  DocumentFeedback,
  DocumentStatus,
  DocumentShareDialog,
  DocumentUploadDialog,
} from '@market/ui/documents';

export function ApplicationDocuments({
  application,
  vendorId,
}: {
  application: PublicApplication;
  vendorId: number | null;
}) {
  const [data, setData] = useState<ComplianceData>(),
    [error, setError] = useState<unknown>(),
    [revision, setRevision] = useState(0);
  const [share, setShare] = useState<ComplianceRequest>(),
    [upload, setUpload] = useState<ComplianceRequest>();
  const api = useMemo<DocumentFileApi>(() => {
    async function send(input: Record<string, unknown>, file?: File) {
      let body: FormData | string;
      if (file) {
        body = new FormData();
        body.append(
          'input',
          JSON.stringify({ ...input, slug: application.slug, vendorId }),
        );
        body.append('file', file);
      } else
        body = JSON.stringify({ ...input, slug: application.slug, vendorId });
      const response = await fetch('/api/application-documents', {
        method: 'POST',
        headers: file ? undefined : { 'content-type': 'application/json' },
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new AppError('validation', result.error);
      return result;
    }
    return {
      read: (skip = 0) => send({ action: 'READ', skip }),
      command: (action, data, id, expectedRevision) =>
        send({ action, data, id, expectedRevision }),
      upload: (file, metadata) => send({ metadata }, file),
      download: () => Promise.reject(new AppError('forbidden')),
    };
  }, [application.slug, vendorId]);
  useEffect(() => {
    if (!vendorId || !application.documentRequirements?.length) return;
    let current = true;
    void api
      .command('START', {})
      .then((result) => {
        if (current) {
          setData(result as ComplianceData);
          setError(undefined);
        }
      })
      .catch((e) => {
        if (current) setError(e);
      });
    return () => {
      current = false;
    };
  }, [api, vendorId, revision, application.documentRequirements?.length]);
  const requirements = application.documentRequirements ?? [];
  if (!requirements.length) return null;
  return (
    <Card as="section" aria-label="Application documents">
      <p>
        Choose a saved document or upload a new one, then explicitly share it
        with this market. Manager review may remain pending when you apply.
      </p>
      {!vendorId && (
        <Alert
          severity={
            requirements.some((r) => r.submission_blocking) ? 'warning' : 'info'
          }
        >
          Sign in and choose a Vendor business to share documents.{' '}
          {requirements.some((r) => r.submission_blocking)
            ? 'This market requires documents before submission. Account-only and anonymous applicants must first establish an authorized Vendor business.'
            : 'You may submit with these requests outstanding.'}
        </Alert>
      )}
      {!!error && <DocumentFeedback error={error} />}
      {vendorId && !data && !error && (
        <Spinner label="Loading application documents" />
      )}
      {requirements.map((r) => {
        const request = data?.requests.find((a) => a.requirement_id === r.id);
        return (
          <Card key={r.id} surface="embedded">
            <p>
              <strong>{r.title}</strong>
            </p>
            <p>{r.instructions}</p>
            <p>
              {r.required ? 'Required' : 'Optional'} ·{' '}
              {r.submission_blocking
                ? 'Must be shared before submitting'
                : 'May remain outstanding'}
            </p>
            <DocumentStatus value={request?.status ?? 'Missing'} />
            {request?.expiration && (
              <DocumentStatus value={request.expiration} />
            )}
            {request?.reviews
              .filter((review) => review.decision === 'Rejected')
              .slice(-1)
              .map((review, i) => (
                <p key={i}>Rejection reason: {review.reason}</p>
              ))}
            {request && !request.waived && (
              <div className="ui-actions">
                <Button type="button" onClick={() => setShare(request)}>
                  Choose saved document
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setUpload(request)}
                >
                  Upload for request
                </Button>
              </div>
            )}
          </Card>
        );
      })}
      {!!error && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setRevision((r) => r + 1)}
        >
          Retry documents
        </Button>
      )}
      {share && data && (
        <DocumentShareDialog
          api={api}
          data={data}
          request={share}
          onSaved={() => setRevision((r) => r + 1)}
          onClose={() => setShare(undefined)}
        />
      )}
      {upload && data && (
        <DocumentUploadDialog
          api={api}
          categories={data.categories}
          assignment={upload}
          onSaved={() => setRevision((r) => r + 1)}
          onClose={() => setUpload(undefined)}
        />
      )}
    </Card>
  );
}
