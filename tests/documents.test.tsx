import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Workspace } from '../apps/admin/src/documents/DocumentsWorkspace';
import {
  AppError,
  createDocumentsApi,
  type ComplianceData,
  type DocumentsApi,
} from '@market/api';
import {
  routeAllowed,
  visibleNavigation,
  type AdminContext,
} from '@market/admin-core';
import { DocumentStatus } from '@market/ui/documents';
import { ApplicationDocuments } from '../apps/storefront/src/components/ApplicationDocuments';
import type { PublicApplication } from '@market/api';
const category = 'General Liability Insurance';
afterEach(() => window.history.replaceState(null, '', '/'));
function data(): ComplianceData {
  return {
    documents: [
      {
        id: 'doc',
        metadata: {
          title: 'Insurance certificate',
          category,
          notes: '',
          issuedOn: null,
          expiresOn: '2030-01-01',
          noExpiration: false,
        },
        revision: 2,
        expiration: 'Valid',
        created_at: '2026-10-14',
        updated_at: '2026-10-14',
        files: [
          {
            id: 'file',
            status: 'Available',
            mime: 'application/pdf',
            filename: 'insurance.pdf',
            size: 100,
            metadata: {
              title: 'Insurance certificate',
              category,
              notes: '',
              issuedOn: null,
              expiresOn: '2030-01-01',
              noExpiration: false,
            },
            created_at: '2026-10-14',
          },
        ],
        version_count: 1,
        shares: [],
      },
    ],
    total: 1,
    requirements: [],
    requests: [
      {
        id: 'request',
        requirement_id: 'req',
        market_id: 1,
        vendor_id: 1,
        market_name: 'Market A',
        vendor_name: 'Vendor A',
        title: 'Insurance',
        category,
        instructions: 'Participation insurance only',
        required: true,
        stage: 'Before participation',
        due_on: null,
        approval_required: true,
        expiration_required: false,
        market_wide: false,
        revision: 1,
        waived: false,
        status: 'Missing',
        expiration: null,
        submission: null,
        reviews: [],
      },
    ],
    vendors: [{ id: 1, name: 'Vendor A' }],
    categories: [category, 'Market Rules Acknowledgment'],
    timezone: 'America/Chicago',
    truncated: false,
  };
}
function api(value = data()): DocumentsApi {
  return {
    advanced: vi.fn().mockResolvedValue({
      documentTemplates: [],
      agreementTemplates: [],
      guidance: [],
      coverage: [],
      items: [],
      columns: [],
      dates: { start: '2026-10-15', end: '2026-10-15', historical: false },
      total: 0,
      exportLimit: 5000,
    }),
    read: vi.fn().mockResolvedValue(value),
    upload: vi.fn().mockResolvedValue({ id: 'new-doc' }),
    command: vi.fn().mockResolvedValue({}),
    download: vi.fn(),
  };
}
describe('Documents dashboard', () => {
  it('selects Readiness and reports with Pending review for the manager overview link', async () => {
    window.history.replaceState(
      null,
      '',
      '/market/documents?view=reports&status=Pending+review',
    );
    const service = api();
    render(<Workspace api={service} manager canWrite />);
    await waitFor(() =>
      expect(service.advanced).toHaveBeenCalledWith(
        expect.objectContaining({
          view: 'report',
          report: 'vendors',
          status: 'Pending review',
        }),
      ),
    );
    expect(
      screen.getByRole('tab', { name: 'Readiness and reports' }),
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.getByLabelText('Compliance status')).toHaveValue(
      'Pending review',
    );
  });
  it('opens the exact library document from an overview alert', async () => {
    window.history.replaceState(null, '', '/vendor/documents?document=doc');
    const library = data();
    library.documents[0]!.files[0]!.staging_scan_bypassed = true;
    const service = api(library);
    render(<Workspace api={service} manager={false} canWrite />);
    const dialog = await screen.findByRole('dialog', {
      name: 'Insurance certificate',
    });
    expect(within(dialog).getByText('Available · Unscanned')).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: 'Replace' }),
    ).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(service.command).not.toHaveBeenCalled();
  });
  it('opens the exact market request from an overview alert', async () => {
    window.history.replaceState(
      null,
      '',
      '/vendor/documents?view=requests&market=1&requestId=request',
    );
    const service = api();
    render(<Workspace api={service} manager={false} canWrite />);
    const dialog = await screen.findByRole('dialog', { name: 'Insurance' });
    expect(dialog).toHaveTextContent('Market A');
    expect(
      screen.getByRole('tab', { name: 'Market requests' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(service.command).not.toHaveBeenCalled();
  });
  it('previews the submitted version without downloading and releases its URL on close', async () => {
    const value = data();
    value.requests[0]!.status = 'Pending review';
    value.requests[0]!.submission = {
      id: 'submission',
      file_id: 'submitted-file',
      document_id: 'doc',
      metadata: value.documents[0]!.metadata,
      status: 'Pending review',
      created_at: '2026-10-14',
    };
    const service = api(value);
    vi.mocked(service.download).mockResolvedValue({
      filename: 'submitted.pdf',
      mime: 'application/pdf',
      bytesBase64: btoa('%PDF-1.4'),
    });
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    render(<Workspace api={service} manager canWrite={false} />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Vendor compliance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Insurance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview document' }));
    const frame = await screen.findByTitle('Document: submitted.pdf');
    expect(frame).toHaveAttribute('src', 'blob:preview');
    expect(service.download).toHaveBeenCalledExactlyOnceWith('submitted-file');
    expect(create.mock.calls[0]![0]).toHaveProperty('type', 'application/pdf');
    const dialog = screen.getByRole('dialog', {
      name: 'Preview: Insurance certificate',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:preview'));
    expect(screen.getByRole('dialog', { name: 'Insurance' })).toBeVisible();
    expect(service.command).not.toHaveBeenCalled();
  });
  it('uses the backend readiness including optional requests and expiring-soon validity', async () => {
    const value = data();
    value.readiness = [
      {
        vendor_id: 1,
        status: 'Ready',
        total: 2,
        complete: 1,
        missing: 1,
        pending: 0,
        expired: 0,
        rejected: 0,
        expiringSoon: 1,
        outstandingRequired: 0,
        outstanding: [],
      },
    ];
    render(<Workspace api={api(value)} manager canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Vendor compliance' }));
    const table = screen.getByRole('table', {
      name: 'Vendor documentation readiness',
    });
    expect(
      within(table).getByText('Ready', { selector: '.ui-status' }),
    ).toHaveClass('ui-status-success');
    // The first vendor opens in the side panel, not a modal.
    const panel = screen.getByRole('region', {
      name: 'Vendor compliance details',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      within(panel).getByText('Missing', { selector: '.ui-status' }),
    ).toHaveClass('ui-status-danger');
  });
  it('searches vendor compliance and sorts it by readiness', async () => {
    const value = data();
    value.vendors = [
      { id: 1, name: 'Vendor A' },
      { id: 2, name: 'Vendor B' },
    ];
    const readiness = (vendor_id: number, status: string) => ({
      vendor_id,
      status,
      total: 1,
      complete: status === 'Ready' ? 1 : 0,
      missing: status === 'Ready' ? 0 : 1,
      pending: 0,
      expired: 0,
      rejected: 0,
      expiringSoon: 0,
      outstandingRequired: status === 'Ready' ? 0 : 1,
      outstanding: [],
    });
    value.readiness = [readiness(1, 'Ready'), readiness(2, 'Incomplete')];
    render(<Workspace api={api(value)} manager canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Vendor compliance' }));
    const names = () =>
      within(
        screen.getByRole('table', { name: 'Vendor documentation readiness' }),
      )
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent);
    expect(names()).toEqual(['Vendor B', 'Vendor A']);
    fireEvent.change(screen.getByLabelText('Sort vendors'), {
      target: { value: 'ready' },
    });
    expect(names()).toEqual(['Vendor A', 'Vendor B']);
    fireEvent.change(screen.getByLabelText('Search vendors'), {
      target: { value: 'b' },
    });
    expect(names()).toEqual(['Vendor B']);
    fireEvent.click(screen.getByRole('rowheader', { name: 'Vendor B' }));
    expect(
      within(
        screen.getByRole('region', { name: 'Vendor compliance details' }),
      ).getByRole('heading', { name: 'Vendor B' }),
    ).toBeVisible();
  });
  it('shows collapsible requirements with their assigned vendors and removes one after confirmation', async () => {
    const value = data();
    value.requirements = [
      {
        id: 'req',
        title: 'Insurance requirement',
        category,
        instructions: 'Participation insurance only',
        required: true,
        stage: 'Before participation',
        due_on: null,
        approval_required: true,
        expiration_required: false,
        market_wide: false,
        automatic: false,
        submission_blocking: false,
      },
    ];
    value.vendors = [
      { id: 1, name: 'Vendor A' },
      { id: 2, name: 'Vendor B' },
    ];
    const service = api(value);
    const { container } = render(<Workspace api={service} manager canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Requirements' }));
    const card = container.querySelector('details.documents-requirement')!;
    expect(card).not.toHaveAttribute('open');
    expect(
      within(card as HTMLElement).getByText(/Assigned to 1 vendor ·/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Only an explicit manager request/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Create a market-wide requirement/)).toBeNull();
    (card as HTMLDetailsElement).open = true;
    // Vendor A already has the request, so the card lists them as assigned.
    const assigned = card.querySelector('.documents-assigned') as HTMLElement;
    expect(within(assigned).getByText('Vendor A')).toBeInTheDocument();
    expect(within(assigned).queryByText('Vendor B')).toBeNull();
    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: 'Remove requirement',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Remove document requirement',
    });
    expect(within(dialog).getByText(/stay in their libraries/)).toBeVisible();
    expect(service.command).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(service.command).toHaveBeenCalledWith(
        'REMOVE_REQUIREMENT',
        {},
        'req',
        undefined,
      ),
    );
  });
  it('keeps market automation off by default and saves an explicit scoped opt-in', async () => {
    const service = api();
    render(<Workspace api={service} manager canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Requirements' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable automatic requests' }),
    );
    await waitFor(() =>
      expect(service.command).toHaveBeenCalledWith(
        'SET_AUTOMATION',
        { enabled: true },
        undefined,
        0,
      ),
    );
  });
  it('previews existing-vendor synchronization and waits for the confirmation action', async () => {
    const service = api();
    vi.mocked(service.command).mockResolvedValue({
      vendorCount: 3,
      assignmentCount: 4,
    });
    render(<Workspace api={service} manager canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Requirements' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Assign market-wide requirements to new vendors',
      }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/Create 4 requests for 3 vendors/),
    ).toBeVisible();
    expect(service.command).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(service.command).toHaveBeenCalledWith(
        'SYNC',
        { assignmentCount: 4 },
        undefined,
        undefined,
      ),
    );
  });
  it('shows the sensitive-information warning before choosing files in every upload entry', async () => {
    render(<Workspace api={api()} manager={false} canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('button', { name: 'Upload document' }));
    let dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/Do not upload sensitive information/),
    ).toBeVisible();
    expect(within(dialog).getByText(/Social Security numbers/)).toBeVisible();
    expect(within(dialog).getByLabelText(/File \(/)).toHaveAttribute(
      'accept',
      '.pdf,.jpg,.jpeg,.png,.webp',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Open Insurance certificate' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    dialog = screen.getByRole('dialog', { name: 'Replace document' });
    expect(
      within(dialog).getByText(/Do not upload sensitive information/),
    ).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Insurance certificate' }),
      ).getByRole('button', { name: 'Close' }),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Market requests' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Insurance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload for request' }));
    expect(
      within(
        screen.getByRole('dialog', { name: 'Upload for this request' }),
      ).getByText(/Do not upload sensitive information/),
    ).toBeVisible();
  });
  it('shares an existing document only with the selected market and preserves the requests tab after refresh', async () => {
    const service = api();
    render(<Workspace api={service} manager={false} canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Market requests' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Insurance' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose saved document' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: 'Share a saved document',
    });
    fireEvent.change(within(dialog).getByLabelText('Saved document'), {
      target: { value: 'doc' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Share with Market A' }),
    );
    await waitFor(() =>
      expect(service.command).toHaveBeenCalledWith(
        'SUBMIT',
        { documentId: 'doc' },
        'request',
        1,
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Share a saved document' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('tab', { name: 'Market requests' }),
    ).toHaveAttribute('aria-selected', 'true');
  });
  it('disables download of quarantined files and keeps staff upload controls disabled', async () => {
    const value = data();
    value.documents[0]!.files[0]!.status = 'Scanning';
    render(<Workspace api={api(value)} manager={false} canWrite={false} />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(
      screen.getByRole('button', { name: 'Open Insurance certificate' }),
    );
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Upload document' }),
    ).toBeDisabled();
  });
  it('requires rejection and waiver explanations in manager review', async () => {
    const value = data();
    value.requests[0]!.submission = {
      id: 'submission',
      file_id: 'file',
      document_id: 'doc',
      metadata: value.documents[0]!.metadata,
      status: 'Pending review',
      created_at: '2026-10-14',
    };
    value.requests[0]!.status = 'Pending review';
    render(<Workspace api={api(value)} manager canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Vendor compliance' }));
    fireEvent.click(screen.getByRole('rowheader', { name: 'Vendor A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Insurance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(
      within(
        screen.getByRole('dialog', { name: 'Rejected document requirement' }),
      ).getByLabelText('Reason'),
    ).toBeRequired();
  });
  it('does not claim complete readiness for a truncated result', async () => {
    const value = data();
    value.truncated = true;
    render(<Workspace api={api(value)} manager canWrite />);
    await screen.findByText('Insurance certificate');
    fireEvent.click(screen.getByRole('tab', { name: 'Vendor compliance' }));
    expect(
      within(
        screen.getByRole('table', { name: 'Vendor documentation readiness' }),
      ).getByText('Incomplete view'),
    ).toBeVisible();
  });
  it('adds only authorized vendor and market navigation', () => {
    for (const scope of ['VENDOR', 'MARKET'] as const) {
      const context: AdminContext = {
        scope,
        name: 'Test',
        source: 'backend',
        permissions: [
          scope === 'VENDOR' ? 'ReadOwnVendorIdentity' : 'ReadOwnMarket',
        ],
      };
      expect(
        visibleNavigation(context).find((n) => n.label === 'Documents')?.path,
      ).toBe(`/${scope.toLowerCase()}/documents`);
      expect(routeAllowed(context, `/${scope.toLowerCase()}/documents`)).toBe(
        true,
      );
      expect(
        routeAllowed(
          { ...context, permissions: [] },
          `/${scope.toLowerCase()}/documents`,
        ),
      ).toBe(false);
    }
  });
});
describe('Documentation status semantics', () => {
  it.each([
    ['Ready', 'success'],
    ['Complete', 'success'],
    ['Approved', 'success'],
    ['Missing', 'danger'],
    ['Incomplete', 'danger'],
    ['Expired', 'danger'],
    ['Rejected', 'danger'],
    ['Pending review', 'warning'],
    ['Expiring Soon', 'warning'],
    ['Waived', 'neutral'],
    ['No requirements', 'neutral'],
  ])('%s has a readable label and the approved %s tone', (status, tone) => {
    render(<DocumentStatus value={status} />);
    expect(screen.getByText(status)).toHaveClass(`ui-status-${tone}`);
  });
});
describe('Application document reuse', () => {
  const application = {
    slug: 'application',
    documentRequirements: [
      {
        id: 'req',
        title: 'Insurance',
        instructions: 'Participation only',
        required: true,
        submission_blocking: true,
      },
    ],
  } as PublicApplication;
  it('shows strict requirements to account-only applicants without granting document access', () => {
    render(<ApplicationDocuments application={application} vendorId={null} />);
    expect(
      screen.getByText(/This market requires documents before submission/),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Choose saved document' }),
    ).not.toBeInTheDocument();
  });
  it('reuses the warning and saved-document share dialog without submitting until explicitly chosen', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(data()), { status: 200 }));
    try {
      render(<ApplicationDocuments application={application} vendorId={1} />);
      fireEvent.click(
        await screen.findByRole('button', { name: 'Choose saved document' }),
      );
      expect(
        within(screen.getByRole('dialog')).getByText(
          /Other markets do not receive access/,
        ),
      ).toBeVisible();
      expect(fetcher).toHaveBeenCalledTimes(1);
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Close',
        }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Upload for request' }),
      );
      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByText(/Do not upload sensitive information/),
      ).toBeVisible();
      expect(within(dialog).getByLabelText(/File \(/)).toHaveAttribute(
        'accept',
        '.pdf,.jpg,.jpeg,.png,.webp',
      );
    } finally {
      fetcher.mockRestore();
    }
  });
});
describe('Document API transport', () => {
  it('uses the current channel, cookies, multipart map and preflight header for upload', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { uploadComplianceDocument: { id: 'new' } },
      }),
    });
    const service = createDocumentsApi({
      endpoint: 'http://localhost:3000/admin-api',
      channelToken: 'vendor-channel',
      fetch: fetcher,
    });
    await service.upload(
      new File(['%PDF-1.4'], 'test.pdf'),
      data().documents[0]!.metadata,
    );
    const request = fetcher.mock.calls[0]![1] as RequestInit;
    expect(request.credentials).toBe('include');
    expect(request.headers).toMatchObject({
      'vendure-token': 'vendor-channel',
      'Apollo-Require-Preflight': 'true',
    });
    expect(JSON.parse(String((request.body as FormData).get('map')))).toEqual({
      '0': ['variables.file'],
    });
  });
  it('preserves a safe scan failure code and refreshes authority after a forbidden response', async () => {
    const failure = vi.fn(),
      fetcher = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [{ extensions: { code: 'DOCUMENT_SCAN_FAILED' } }],
        }),
      });
    const service = createDocumentsApi({
      endpoint: 'http://localhost:3000/admin-api',
      channelToken: 'vendor',
      fetch: fetcher,
      onAuthorityFailure: failure,
    });
    const file = new File(['%PDF'], 'test.pdf');
    await expect(
      service.upload(file, data().documents[0]!.metadata),
    ).rejects.toMatchObject({ code: 'DOCUMENT_SCAN_FAILED' });
    expect(failure).not.toHaveBeenCalled();
    fetcher.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ errors: [{ extensions: { code: 'FORBIDDEN' } }] }),
    });
    await expect(
      service.upload(file, data().documents[0]!.metadata),
    ).rejects.toBeInstanceOf(AppError);
    expect(failure).toHaveBeenCalledOnce();
  });
});

it('does not offer "does not expire" when the request needs an expiration date', async () => {
  const { MetadataFields } = await import('@market/ui/documents');
  const { render: draw, screen: view } = await import('@testing-library/react');
  draw(
    <form>
      <MetadataFields categories={['Liability Insurance']} expirationRequired />
    </form>,
  );
  expect(view.queryByLabelText('This document does not expire')).toBeNull();
  expect(view.getByLabelText('Expiration date')).toBeRequired();
  expect(
    view.getByText("This request needs the document's expiration date."),
  ).toBeInTheDocument();
});
