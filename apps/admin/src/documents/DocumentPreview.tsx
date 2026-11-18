import { useEffect, useState } from 'react';
import type { DocumentsApi } from '@market/api';
import { Dialog, Spinner, Tooltip } from '@market/ui';
import { FarmstandButton as Button, FarmstandIcon } from '@market/ui/farmstand';
import { DocumentFeedback } from '@market/ui/documents';

// Feature controller: shared Dialog owns modality; the existing document API
// owns permission, share revocation and scan checks for the submitted version.
export function DocumentPreview({
  api,
  fileId,
  title,
  onClose,
  onDownload,
  downloading,
}: {
  api: Pick<DocumentsApi, 'download'>;
  fileId: string;
  title: string;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    url?: string;
    mime?: string;
    filename?: string;
    error?: unknown;
    unsupported?: boolean;
  }>();

  useEffect(() => {
    let active = true;
    let url: string | undefined;
    void api
      .download(fileId)
      .then((file) => {
        if (!active) return;
        // Never embed executable uploads such as HTML or SVG in the admin origin.
        if (
          ![
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
          ].includes(file.mime)
        ) {
          setResult({ unsupported: true, filename: file.filename });
          return;
        }
        const binary = atob(file.bytesBase64);
        const bytes = Uint8Array.from(binary, (character) =>
          character.charCodeAt(0),
        );
        url = URL.createObjectURL(new Blob([bytes], { type: file.mime }));
        setResult({ url, mime: file.mime, filename: file.filename });
      })
      .catch((error: unknown) => {
        if (active) setResult({ error });
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [api, fileId, attempt]);

  return (
    <Dialog
      open
      title={`Preview: ${title}`}
      onClose={onClose}
      className="document-preview-dialog"
      actions={
        result && !result.error ? (
          <Tooltip label="Download">
            <Button
              variant="secondary"
              iconOnly
              aria-label="Download"
              disabled={downloading}
              onClick={onDownload}
            >
              <FarmstandIcon name="download" />
            </Button>
          </Tooltip>
        ) : undefined
      }
    >
      {!result && <Spinner label="Loading document preview" />}
      {!!result?.error && (
        <>
          <DocumentFeedback error={result.error} />
          <Button
            variant="secondary"
            onClick={() => {
              setResult(undefined);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </>
      )}
      {result?.unsupported && (
        <p>This file type cannot be previewed. Download it to read it.</p>
      )}
      {result?.url && (
        <>
          <p className="documents-note">{result.filename}</p>
          {result.mime === 'application/pdf' ? (
            <>
              <p className="documents-note">
                Scroll through the document or use the PDF controls to change
                pages and zoom. If your browser cannot display it, use Download.
              </p>
              <iframe
                className="document-preview-pdf"
                src={result.url}
                title={`Document: ${result.filename}`}
              />
            </>
          ) : (
            <div className="document-preview-image">
              <img src={result.url} alt={result.filename} />
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
