import type { DocumentNode } from 'graphql';
import * as shop from './generated/shop';
import { transport } from './transport';
import { uploadDocumentFile } from './document-upload';
import { AppError } from './errors';
import type { ComplianceData, DocumentFileApi } from './documents';

/** Shop-only adapter. Authorization derives from the current market and verified applicant owner. */
export function createApplicationDocumentsApi(options: {
  endpoint: string;
  channelToken: string;
  fetch?: typeof fetch;
  application: { slug: string; vendorId: number };
}): DocumentFileApi {
  const execute = transport('shop', options),
    scope = options.application;
  async function run(action: string, input: Record<string, unknown> = {}) {
    return (
      await execute(
        { api: 'shop', document: shop.ApplicationComplianceDocument },
        { input: { ...input, ...scope, action } },
      )
    ).applicationCompliance;
  }
  return {
    read: (skip = 0) =>
      run('READ', { skip }).then((data) => data as ComplianceData),
    command: (action, data, id, expectedRevision) =>
      ['START', 'SUBMIT'].includes(action)
        ? run(action, { data, id, expectedRevision })
        : Promise.reject(new AppError('forbidden')),
    upload: (file, metadata) =>
      uploadDocumentFile(
        options,
        shop.UploadApplicationComplianceDocument as DocumentNode,
        'uploadApplicationCompliance',
        file,
        { ...metadata, ...scope },
      ),
    download: () => Promise.reject(new AppError('forbidden')),
  };
}
