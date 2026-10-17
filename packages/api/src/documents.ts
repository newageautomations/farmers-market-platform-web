import type { DocumentNode } from 'graphql';
import { uploadDocumentFile } from './document-upload';
import * as g from './generated/admin';
import { AppError } from './errors';
import { transport } from './transport';

export interface DocumentMetadata {
  title: string;
  category: string;
  notes: string;
  issuedOn: string | null;
  expiresOn: string | null;
  noExpiration: boolean;
}
export interface ComplianceFile {
  id: string;
  status: 'Scanning' | 'Available' | 'Rejected' | 'Scan Failed';
  mime: string;
  filename: string;
  size: number;
  metadata: DocumentMetadata;
  created_at: string;
}
export interface ComplianceDocument {
  id: string;
  metadata: DocumentMetadata;
  revision: number;
  expiration: string;
  created_at: string;
  updated_at: string;
  files: ComplianceFile[];
  version_count: number;
  shares: {
    id: string;
    file_id: string;
    market_id: number;
    market_name: string;
    revoked_at: string | null;
    created_at: string;
  }[];
}
export interface ComplianceRequirement {
  automatic?: boolean;
  submission_blocking?: boolean;
  id: string;
  title: string;
  category: string;
  instructions: string;
  required: boolean;
  stage: string;
  due_on: string | null;
  approval_required: boolean;
  expiration_required: boolean;
  market_wide: boolean;
}
export interface ComplianceRequest extends ComplianceRequirement {
  source?: string;
  created_at?: string;
  requirement_id: string;
  market_id: number;
  vendor_id: number;
  market_name: string;
  vendor_name: string;
  revision: number;
  waived: boolean;
  status: string;
  expiration: string | null;
  submission: {
    id: string;
    file_id: string;
    document_id: string;
    metadata: DocumentMetadata;
    status: string;
    created_at: string;
  } | null;
  reviews: {
    decision: string;
    reason: string;
    actor_id: number;
    created_at: string;
  }[];
}
export interface ComplianceData {
  agreement_requirements?: Array<{ id: string; title: string }>;
  settings?: { automation_enabled: boolean; revision: number };
  readiness?: Array<DocumentationReadiness & { vendor_id: number }>;
  market_readiness?: Array<
    DocumentationReadiness & { market_id: number; market_name: string }
  >;
  documents: ComplianceDocument[];
  total: number;
  requirements: ComplianceRequirement[];
  requests: ComplianceRequest[];
  vendors: { id: number; name: string }[];
  categories: string[];
  timezone: string;
  truncated: boolean;
}
export type ComplianceAction =
  | 'SAVE_AGREEMENT'
  | 'PUBLISH_PREVIEW'
  | 'PUBLISH_AGREEMENT'
  | 'ARCHIVE_AGREEMENT'
  | 'ASSIGN_AGREEMENT'
  | 'ACKNOWLEDGE'
  | 'GRANT_EXCEPTION'
  | 'REVOKE_EXCEPTION'
  | 'START'
  | 'SET_AUTOMATION'
  | 'CONFIGURE_REQUIREMENT'
  | 'SYNC_PREVIEW'
  | 'EDIT'
  | 'DELETE'
  | 'REVOKE'
  | 'CREATE_REQUIREMENT'
  | 'ASSIGN'
  | 'SYNC'
  | 'SUBMIT'
  | 'REVIEW'
  | 'WAIVE';
export interface DocumentationReadiness {
  total: number;
  complete: number;
  missing: number;
  pending: number;
  rejected: number;
  expired: number;
  expiringSoon: number;
  outstandingRequired: number;
  outstanding: string[];
  status: string;
}
export const documentErrorMessages: Record<string, string> = {
  COMPLIANCE_EXPORT_LIMIT:
    'More than 5,000 rows match. Narrow the report filters before exporting.',
  DOCUMENT_INPUT_INVALID: 'Check the document information and dates.',
  DOCUMENT_FORMAT_INVALID:
    'Choose a PDF, JPG, PNG or WebP file with a matching file extension.',
  DOCUMENT_TOO_LARGE: 'Documents must be 10 MB or smaller.',
  DOCUMENT_SENSITIVE_TYPE_PROHIBITED:
    'Sensitive personal and financial documents are prohibited. Use only the supported participation categories.',
  DOCUMENT_SCAN_FAILED:
    'The scanner could not verify this file. It is unavailable. Try again after the scanner is healthy.',
  DOCUMENT_MALWARE_DETECTED:
    'The scanner rejected this file. It is unavailable.',
  DOCUMENT_SCANNER_BUSY: 'The scanner is busy. Wait a moment and try again.',
  DOCUMENT_RATE_LIMIT: 'Too many document requests. Wait before trying again.',
  DOCUMENT_VERSION_CONFLICT:
    'This document or request changed. Refresh before trying again.',
  DOCUMENT_FILE_UNAVAILABLE:
    'This file has not passed scanning and cannot be shared.',
  DOCUMENT_SERVICE_UNAVAILABLE:
    'Document storage or scanning is unavailable. The file has not been made available.',
  DOCUMENT_EXPIRED:
    'An expired document cannot be approved. Ask the vendor for a replacement.',
  DOCUMENT_REQUIREMENT_LIMIT:
    'This market has reached the Phase 1 limit of 100 requirements.',
  DOCUMENT_ASSIGNMENT_LIMIT:
    'This request exceeds the Phase 1 limit of 500 vendors.',
  APPLICATION_DOCUMENTS_REQUIRED:
    'Select an authorized Vendor business and share each document required before submission. Pending manager review is allowed.',
};
export function createDocumentsApi(options: {
  endpoint: string;
  channelToken: string;
  onAuthorityFailure?: () => void;
  fetch?: typeof fetch;
}) {
  const run = transport('admin', options);
  function handle(error: unknown): never {
    if (
      error instanceof AppError &&
      ['authentication', 'forbidden'].includes(error.kind)
    )
      options.onAuthorityFailure?.();
    throw error;
  }
  return {
    advanced: <T>(input: Record<string, unknown>) =>
      run(
        { api: 'admin', document: g.OwnAdvancedComplianceDocument },
        { input },
      )
        .then((r) => r.ownAdvancedCompliance as T)
        .catch(handle),
    read: (skip = 0) =>
      run(
        { api: 'admin', document: g.OwnComplianceDocumentsDocument },
        { skip },
      )
        .then((r) => r.ownComplianceDocuments as ComplianceData)
        .catch(handle),
    command: (
      action: ComplianceAction,
      data: Record<string, unknown>,
      id?: string,
      expectedRevision?: number,
    ) =>
      run(
        { api: 'admin', document: g.ComplianceDocumentCommandDocument },
        { input: { action, data, id, expectedRevision } },
      )
        .then((r) => r.complianceDocumentCommand)
        .catch(handle),
    download: (fileId: string) =>
      run(
        { api: 'admin', document: g.DownloadComplianceDocumentDocument },
        { fileId },
      )
        .then(
          (r) =>
            r.downloadComplianceDocument as {
              filename: string;
              mime: string;
              bytesBase64: string;
            },
        )
        .catch(handle),
    async upload(
      file: File,
      metadata: DocumentMetadata,
      id?: string,
      expectedRevision?: number,
    ) {
      return uploadDocumentFile(
        options,
        g.UploadComplianceDocumentDocument as DocumentNode,
        'uploadComplianceDocument',
        file,
        { ...metadata, id, expectedRevision },
      ).catch(handle);
    },
  };
}
export type DocumentsApi = ReturnType<typeof createDocumentsApi>;
export type DocumentFileApi = Pick<
  DocumentsApi,
  'read' | 'command' | 'download' | 'upload'
>;
