import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  AgreementDetail,
  ComplianceCatalog,
  ComplianceData,
  DocumentsApi,
} from '@market/api';
import {
  AgreementEditor,
  AgreementReader,
} from '../apps/admin/src/documents/Agreements';
import {
  ComplianceReports,
  UpcomingReadiness,
} from '../apps/admin/src/documents/ComplianceReports';
import { ComplianceGuidance } from '../apps/admin/src/documents/ComplianceGuidance';

const policy = {
  id: 'policy',
  title: 'Market Rules',
  kind: 'Rules',
  required: true,
  affects_readiness: true,
  automatic: false,
  stage: 'On request',
  due_on: null,
  revision: 3,
  current_version: 2,
  archived: false,
  market_name: 'Market A',
  draft: 'Draft',
};
const detail: AgreementDetail = {
  policy,
  version: {
    id: 'version2',
    number: 2,
    title: 'Market Rules',
    content: '<script>alert("unsafe")</script>\nRead the full policy.',
    hash: 'abc',
    published_at: '2026-10-15T12:00:00Z',
  },
  versions: [
    {
      id: 'version2',
      number: 2,
      title: 'Market Rules',
      hash: 'abc',
      published_at: '2026-10-15T12:00:00Z',
    },
  ],
  assignments: [
    {
      id: 'assignment',
      vendor_id: 1,
      vendor_name: 'Farm A',
      version_id: 'version2',
      version: 2,
      acknowledged_at: null,
      actor_id: null,
    },
  ],
  history: [],
  hasMore: false,
};
const catalog: ComplianceCatalog = {
  documentTemplates: [],
  agreementTemplates: [
    {
      title: 'Setup',
      kind: 'Setup',
      content: 'Arrive at the assigned time.',
      limitation: 'Operational template',
    },
  ],
  guidance: [
    {
      id: 'tx',
      jurisdiction: 'Texas',
      topic: 'Permits',
      summary: 'Review official guidance.',
      sourceName: 'Official source',
      sourceUrl:
        'https://www.dshs.texas.gov/retail-food-establishments/texas-farmers-market',
      verifiedOn: '2026-10-15',
      limitations: 'Texas only',
      category: 'Health Department Permit',
    },
  ],
  coverage: ['Texas'],
  limitation: 'Informational guidance',
};
const compliance = {
  vendors: [],
  requirements: [],
  categories: [],
  requests: [],
} as unknown as ComplianceData;
function api() {
  return {
    advanced: vi
      .fn()
      .mockImplementation((i: Record<string, unknown>) =>
        Promise.resolve(
          i.view === 'catalog'
            ? catalog
            : i.view === 'agreement'
              ? detail
              : { items: [], hasMore: false },
        ),
      ),
    command: vi
      .fn()
      .mockResolvedValue({ assigned: 1, acknowledged: 1, nextVersion: 3 }),
    read: vi.fn().mockResolvedValue(compliance),
    download: vi.fn(),
    upload: vi.fn(),
  } as unknown as DocumentsApi;
}

describe('Phase 3 Documents UI', () => {
  it('renders malicious agreement markup as text and requires an unchecked explicit action', async () => {
    const service = api(),
      changed = vi.fn();
    const { container } = render(
      <AgreementReader
        api={service}
        id="policy"
        manager={false}
        canWrite
        onClose={() => {}}
        onChanged={changed}
        onEdit={() => {}}
      />,
    );
    await screen.findByLabelText('Agreement version 2');
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByLabelText('Agreement version 2')).toHaveTextContent(
      '<script>',
    );
    const confirm = screen.getByRole('checkbox');
    expect(confirm).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Acknowledge agreement' }),
    ).toBeDisabled();
    expect(service.command).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    fireEvent.click(
      screen.getByRole('button', { name: 'Acknowledge agreement' }),
    );
    await waitFor(() =>
      expect(service.command).toHaveBeenCalledWith(
        'ACKNOWLEDGE',
        { confirm: true, versionId: 'version2' },
        'assignment',
        3,
      ),
    );
    expect(changed).toHaveBeenCalled();
  });
  it('does not offer an action for a superseded displayed version or read-only Vendor', async () => {
    const service = api();
    vi.mocked(service.advanced).mockResolvedValue({
      ...detail,
      version: { ...detail.version!, id: 'version1', number: 1 },
    });
    render(
      <AgreementReader
        api={service}
        id="policy"
        manager={false}
        canWrite={false}
        onClose={() => {}}
        onChanged={() => {}}
        onEdit={() => {}}
      />,
    );
    await screen.findByLabelText('Agreement version 1');
    expect(
      screen.queryByRole('button', { name: 'Acknowledge agreement' }),
    ).not.toBeInTheDocument();
  });
  it('previews publication effects and leaves re-acknowledgment off until selected', async () => {
    const service = api();
    render(
      <AgreementReader
        api={service}
        id="policy"
        manager
        canWrite
        onClose={() => {}}
        onChanged={() => {}}
        onEdit={() => {}}
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Preview publication' }),
    );
    const again = await screen.findByRole('checkbox', {
      name: 'Request this version again from existing assigned vendors',
    });
    expect(again).not.toBeChecked();
    fireEvent.click(again);
    fireEvent.click(screen.getByRole('button', { name: 'Publish version 3' }));
    await waitFor(() =>
      expect(service.command).toHaveBeenCalledWith(
        'PUBLISH_AGREEMENT',
        { requestAgain: true, affectedCount: 1 },
        'policy',
        3,
      ),
    );
  });
  it('uses editable templates without publishing or assigning automatically', async () => {
    const service = api();
    render(
      <AgreementEditor
        api={service}
        policy={null}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    );
    await screen.findByRole('option', { name: 'Setup' });
    fireEvent.change(screen.getByLabelText('Starting template'), {
      target: { value: 'Setup' },
    });
    expect(screen.getByLabelText('Agreement title')).toHaveValue('Setup');
    expect(screen.getByLabelText('Agreement contents')).toHaveValue(
      'Arrive at the assigned time.',
    );
    expect(
      screen.getByRole('checkbox', { name: /Automatically assign/ }),
    ).not.toBeChecked();
    expect(service.command).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(service.command).toHaveBeenCalledWith(
        'SAVE_AGREEMENT',
        expect.objectContaining({
          title: 'Setup',
          automatic: false,
          required: false,
        }),
        undefined,
        undefined,
      ),
    );
  });
  it('keeps jurisdiction coverage explicit and follows source provenance', async () => {
    const service = api();
    render(
      <ComplianceGuidance
        api={service}
        data={compliance}
        canWrite
        onChanged={() => {}}
      />,
    );
    const jurisdiction = await screen.findByLabelText('Guidance jurisdiction');
    fireEvent.change(jurisdiction, { target: { value: 'unavailable' } });
    expect(
      screen.queryByRole('link', { name: 'Official source' }),
    ).not.toBeInTheDocument();
    fireEvent.change(jurisdiction, { target: { value: 'Texas' } });
    expect(
      screen.getByRole('link', { name: 'Official source' }),
    ).toHaveAttribute('href', catalog.guidance[0]!.sourceUrl);
    expect(screen.getByText(/Verified 2026-10-15/)).toBeInTheDocument();
    expect(service.command).not.toHaveBeenCalled();
  });
  it('displays server Unknown forecasts and unconfirmed association without inferring enrollment', async () => {
    const load = vi.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          market_name: 'Market A',
          market_id: 2,
          starts_on: '2026-11-01',
          ends_on: '2026-11-01',
          forecast: {
            status: 'Unknown',
            participation: 'Associated, participation unconfirmed',
            reasons: 'Required dates unavailable',
          },
        },
      ],
      hasMore: false,
    });
    render(<UpcomingReadiness load={load} />);
    expect(await screen.findByText('Unknown')).toHaveClass('ui-status-neutral');
    fireEvent.click(screen.getByRole('button', { name: /Open Market A/ }));
    expect(
      screen.getByText('Associated, participation unconfirmed'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Fulfill Market requests' }),
    ).toHaveAttribute('href', '/vendor/documents?view=requests&market=2');
  });
  it('sends report filters to the backend and uses approved selection controls', async () => {
    const service = api();
    vi.mocked(service.advanced).mockImplementation(
      async <T,>(i: Record<string, unknown>) =>
        (i.view === 'report'
          ? {
              items: [],
              total: 0,
              columns: [],
              context: 'Market A',
              dates: { historical: false },
              generatedAt: '2026-10-15T12:00:00Z',
              exportLimit: 5000,
            }
          : { items: [], hasMore: false }) as T,
    );
    const { container } = render(
      <ComplianceReports api={service} data={compliance} canWrite />,
    );
    await screen.findByText(/Generated/);
    fireEvent.change(screen.getByLabelText('Compliance status'), {
      target: { value: 'Incomplete' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(service.advanced).toHaveBeenCalledWith(
        expect.objectContaining({
          view: 'report',
          status: 'Incomplete',
          skip: 0,
        }),
      ),
    );
    expect(container.querySelector('select:not(.ui-select)')).toBeNull();
  });
});
