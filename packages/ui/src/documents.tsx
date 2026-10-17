import { useId, useState, type FormEvent } from 'react';
import {
  documentErrorMessages,
  safeError,
  type ComplianceData,
  type ComplianceDocument,
  type ComplianceRequest,
  type DocumentMetadata,
  type DocumentFileApi,
} from '@market/api';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Pagination,
  SelectField,
  SearchSelect,
  Spinner,
} from './index';
import { documentStatusTone } from './document-status';
export function DocumentUploadWarning() {
  return (
    <Alert severity="warning">
      <strong>Warning: Do not upload sensitive information</strong>
      <p>
        Only upload documents required for farmers market participation. Do not
        upload Social Security numbers, tax forms (including W-9s), driver's
        licenses, passports, bank statements, payment information, medical
        records, or other sensitive personal or financial information.
      </p>
      <p>
        Documents shared with a market may be viewed by authorized market
        management personnel.
      </p>
    </Alert>
  );
}
export function DocumentFeedback({ error }: { error: unknown }) {
  const safe = safeError(error);
  return (
    <Alert severity="error" role="alert">
      {documentErrorMessages[safe.code ?? ''] ?? safe.message}
    </Alert>
  );
}
export function DocumentStatus({ value }: { value: string }) {
  return <Badge tone={documentStatusTone(value)}>{value}</Badge>;
}
export function MetadataFields({
  categories,
  value,
}: {
  categories: readonly string[];
  value?: DocumentMetadata;
}) {
  const id = useId(),
    [noExpiration, setNoExpiration] = useState(value?.noExpiration ?? false);
  return (
    <>
      <Field id={`${id}-title`} label="Document title">
        <Input
          id={`${id}-title`}
          name="documentTitle"
          required
          maxLength={200}
          defaultValue={value?.title}
        />
      </Field>
      <SelectField
        id={`${id}-category`}
        label="Document type"
        name="category"
        defaultValue={value?.category ?? categories[0]}
        required
      >
        {categories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </SelectField>
      <Field id={`${id}-notes`} label="Notes (optional)">
        <Input
          id={`${id}-notes`}
          name="notes"
          maxLength={2000}
          defaultValue={value?.notes}
        />
      </Field>
      <Field id={`${id}-issued`} label="Issue date (optional)">
        <Input
          id={`${id}-issued`}
          name="issuedOn"
          type="date"
          defaultValue={value?.issuedOn ?? ''}
        />
      </Field>
      <label className="document-checkbox">
        <input
          type="checkbox"
          name="noExpiration"
          checked={noExpiration}
          onChange={(e) => setNoExpiration(e.target.checked)}
        />{' '}
        This document does not expire
      </label>
      <Field id={`${id}-expires`} label="Expiration date">
        <Input
          id={`${id}-expires`}
          name="expiresOn"
          type="date"
          required={!noExpiration}
          disabled={noExpiration}
          defaultValue={value?.expiresOn ?? ''}
        />
      </Field>
      <p>
        Enter the date shown on the document. This date has not been
        independently verified.
      </p>
    </>
  );
}
export function formMetadata(form: HTMLFormElement): DocumentMetadata {
  const data = new FormData(form);
  return {
    title: String(data.get('documentTitle') ?? ''),
    category: String(data.get('category') ?? ''),
    notes: String(data.get('notes') ?? ''),
    issuedOn: String(data.get('issuedOn') ?? '') || null,
    noExpiration: data.has('noExpiration'),
    expiresOn: data.has('noExpiration')
      ? null
      : String(data.get('expiresOn') ?? '') || null,
  };
}
export function DocumentUploadDialog({
  api,
  categories,
  document,
  assignment,
  onClose,
  onSaved,
}: {
  api: DocumentFileApi;
  categories: string[];
  document?: ComplianceDocument;
  assignment?: ComplianceRequest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [uploaded, setUploaded] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const form = event.currentTarget,
      file = new FormData(form).get('file');
    try {
      let documentId = uploaded;
      if (!documentId) {
        if (!(file instanceof File)) return;
        const result = (await api.upload(
          file,
          formMetadata(form),
          document?.id,
          document?.revision,
        )) as { id: string };
        documentId = result.id;
        setUploaded(result.id);
      }
      if (assignment)
        await api.command(
          'SUBMIT',
          { documentId },
          assignment.id,
          assignment.revision,
        );
      onSaved();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title={
        document
          ? 'Replace document'
          : assignment
            ? 'Upload for this request'
            : 'Upload document'
      }
      busy={busy}
      onClose={onClose}
      actions={
        <Button type="submit" form={id} loading={busy}>
          {uploaded ? 'Share uploaded document' : 'Upload and scan'}
        </Button>
      }
    >
      <DocumentUploadWarning />
      {assignment && (
        <p>
          Sharing with {assignment.market_name} for {assignment.title}.
        </p>
      )}
      {!!error && <DocumentFeedback error={error} />}
      {uploaded && (
        <Alert severity="info">
          The document is saved in your private library. Sharing did not finish.
          Retry sharing or close and use the saved document.
        </Alert>
      )}
      <form id={id} onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy || !!uploaded}>
          <MetadataFields
            categories={assignment ? [assignment.category] : categories}
            value={document?.metadata}
          />
          <Field
            id={`${id}-file`}
            label="File (PDF, JPG, PNG or WebP; up to 10 MB)"
          >
            <Input
              id={`${id}-file`}
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required={!uploaded}
            />
          </Field>
        </fieldset>
      </form>
      {busy && (
        <Spinner label="Uploading and scanning. The file remains private until scanning succeeds." />
      )}
    </Dialog>
  );
}
export function DocumentShareDialog({
  api,
  request,
  data,
  onClose,
  onSaved,
}: {
  api: DocumentFileApi;
  request: ComplianceRequest;
  data: ComplianceData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [skip, setSkip] = useState(0),
    [page, setPage] = useState(data),
    [loading, setLoading] = useState(false);
  async function load(next: number) {
    setLoading(true);
    try {
      setPage(await api.read(next));
      setSkip(next);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.command(
        'SUBMIT',
        { documentId: new FormData(event.currentTarget).get('documentId') },
        request.id,
        request.revision,
      );
      onSaved();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const available = page.documents.filter(
    (d) =>
      d.metadata.category === request.category &&
      d.files.some((f) => f.status === 'Available') &&
      (!request.expiration_required || !d.metadata.noExpiration),
  );
  return (
    <Dialog
      open
      title="Share a saved document"
      busy={busy || loading}
      onClose={onClose}
      actions={
        <Button
          type="submit"
          form={id}
          loading={busy}
          disabled={!available.length || loading}
        >
          Share with {request.market_name}
        </Button>
      }
    >
      <p>
        You authorize this market's management personnel to download the
        selected version for {request.title}. Other markets do not receive
        access.
      </p>
      {!!error && <DocumentFeedback error={error} />}
      <form id={id} onSubmit={(e) => void submit(e)}>
        <SelectField
          key={skip}
          label="Saved document"
          id={`${id}-document`}
          name="documentId"
          required
          disabled={busy || loading}
        >
          <option value="">Choose a matching document</option>
          {available.map((d) => (
            <option value={d.id} key={d.id}>
              {d.metadata.title} ({d.expiration})
            </option>
          ))}
        </SelectField>
      </form>
      {!available.length && (
        <p>No matching available documents on this library page.</p>
      )}
      <Pagination
        summary={`${page.total} library documents`}
        hasPrevious={skip > 0}
        hasNext={skip + 20 < page.total}
        onPrevious={() => void load(Math.max(0, skip - 20))}
        onNext={() => void load(skip + 20)}
      />
    </Dialog>
  );
}

/** Read-only version selection never publishes or mutates the document. */
export function DocumentVersionPicker({
  document,
  busy,
  onDownload,
}: {
  document: ComplianceDocument;
  busy: boolean;
  onDownload: (id: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const file =
    document.files.find((f) => f.id === selected) ??
    document.files.find((f) => f.status === 'Available') ??
    document.files[0];
  return (
    <>
      <p>
        {document.version_count} versions. The most recent 50 versions and 100
        shares are shown. Each submitted version keeps its original review
        history.
      </p>
      <SearchSelect
        label="File version"
        value={file?.id ?? ''}
        onChange={setSelected}
        options={document.files.map((f, i) => ({
          value: f.id,
          label:
            (i === 0 ? 'Latest · ' : '') +
            f.filename +
            ' · ' +
            new Date(f.created_at).toLocaleString() +
            ' · ' +
            f.status,
        }))}
        placeholder="Choose a version"
        disabled={busy}
      />
      {file ? (
        <>
          <div
            className="document-placeholder"
            aria-label="Selected version file type"
          >
            {file.mime === 'application/pdf'
              ? 'PDF'
              : file.mime.startsWith('image/')
                ? 'Image'
                : 'File'}
          </div>
          <dl className="ui-record-facts">
            <div>
              <dt>File</dt>
              <dd>
                {file.filename} · {file.size.toLocaleString()} bytes
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <DocumentStatus value={file.status} />
              </dd>
            </div>
            <div>
              <dt>Saved version information</dt>
              <dd>
                {file.metadata.title} · {file.metadata.category}
                <p>{file.metadata.notes}</p>
                <p>
                  {file.metadata.issuedOn
                    ? 'Issued ' + file.metadata.issuedOn
                    : ''}
                </p>
                <p>
                  {file.metadata.noExpiration
                    ? 'No expiration'
                    : 'Expires ' + file.metadata.expiresOn}
                </p>
              </dd>
            </div>
          </dl>
          <Button
            variant="secondary"
            disabled={busy || file.status !== 'Available'}
            onClick={() => onDownload(file.id)}
          >
            Download
          </Button>
        </>
      ) : (
        <p>No file versions available.</p>
      )}
    </>
  );
}
