// Manager Documents workspace with in-memory compliance data (browser preview only).
import { createRoot } from 'react-dom/client';
import type { ComplianceData, DocumentsApi } from '@market/api';
import '@market/ui/styles.css';
import '../../apps/admin/src/AdminShell';
import { Workspace } from '../../apps/admin/src/documents/DocumentsWorkspace';

const category = 'General Liability Insurance';
const names = [
  'Blue Bonnet Bakery',
  'Manna Roots',
  'Hill Country Honey',
  'Cypress Creek Eggs',
  'Sunrise Flowers',
  'Guadalupe Goat Dairy',
];
const statuses = [
  'Ready',
  'Incomplete',
  'Pending review',
  'Ready',
  'Incomplete',
  'No requirements',
];
const vendors = names.map((name, i) => ({ id: i + 1, name }));
const reqStatus = [
  'Approved',
  'Missing',
  'Pending review',
  'Approved',
  'Rejected',
];
const data: ComplianceData = {
  documents: [],
  total: 0,
  requirements: [
    [
      'req',
      'Liability insurance',
      category,
      'Participation insurance only',
      true,
      'Before participation',
    ],
    [
      'req2',
      'Food handler permit',
      'Food Handler Permit',
      '',
      false,
      'After acceptance',
    ],
    [
      'req3',
      'Signed vendor handbook',
      'Market Rules Acknowledgment',
      'Sign and return.',
      true,
      'Application',
    ],
  ].map(([id, title, cat, instructions, required, stage]) => ({
    id,
    title,
    category: cat,
    instructions,
    required,
    stage,
    due_on: null,
    approval_required: true,
    expiration_required: false,
    market_wide: id !== 'req3',
    automatic: false,
    submission_blocking: false,
  })) as never,
  requests: vendors.slice(0, 5).flatMap((v, i) => [
    {
      id: 'r' + v.id,
      requirement_id: 'req',
      market_id: 1,
      vendor_id: v.id,
      market_name: 'Boerne Market',
      vendor_name: v.name,
      title: 'Liability insurance',
      category,
      instructions: 'Participation insurance only',
      required: true,
      stage: 'Before participation',
      due_on: '2026-12-01',
      approval_required: true,
      expiration_required: true,
      market_wide: true,
      revision: 1,
      waived: false,
      status: reqStatus[i],
      expiration: null,
      submission:
        reqStatus[i] === 'Pending review'
          ? {
              id: 'sub' + v.id,
              file_id: 'file' + v.id,
              created_at: '2026-11-05T15:00:00Z',
              metadata: {
                title: 'COI 2026',
                category,
                expiresOn: '2027-06-30',
                noExpiration: false,
              },
            }
          : null,
      reviews: [],
    },
    {
      id: 'p' + v.id,
      requirement_id: 'req2',
      market_id: 1,
      vendor_id: v.id,
      market_name: 'Boerne Market',
      vendor_name: v.name,
      title: 'Food handler permit',
      category: 'Food Handler Permit',
      instructions: '',
      required: i !== 0,
      stage: 'After acceptance',
      due_on: null,
      approval_required: true,
      expiration_required: false,
      market_wide: true,
      revision: 1,
      waived: false,
      status: i === 4 ? 'Expired' : 'Approved',
      expiration: i === 3 ? 'Expiring Soon' : null,
      submission: null,
      reviews: [],
    },
  ]) as never,
  vendors,
  readiness: vendors.map((v, i) => ({
    vendor_id: v.id,
    status: statuses[i]!,
    total: i === 5 ? 0 : 2,
    complete: [2, 1, 1, 2, 0, 0][i]!,
    missing: i === 1 ? 1 : 0,
    pending: i === 2 ? 1 : 0,
    expired: i === 4 ? 1 : 0,
    rejected: i === 4 ? 1 : 0,
    expiringSoon: i === 3 ? 1 : 0,
    outstandingRequired: [0, 1, 0, 0, 2, 0][i]!,
    outstanding: [],
  })),
  categories: [category],
  timezone: 'America/Chicago',
  truncated: false,
};
const api: DocumentsApi = {
  advanced: async (input) =>
    ({
      documentTemplates: [],
      agreementTemplates: [],
      guidance: [],
      coverage: [],
      items: [],
      columns: [],
      dates: { start: '2026-11-09', end: '2026-11-09', historical: false },
      total: 0,
      exportLimit: 5000,
      ...(input.view === 'report' && {
        columns: ['vendor', 'status', 'reasons'],
        context: 'Boerne Market · current date',
        generatedAt: new Date().toISOString(),
        total: vendors.length,
        counts: { ready: 2, incomplete: 2, pending: 1, unknown: 0 },
        items: vendors.map((v) => {
          const mine = data.requests.filter((r) => r.vendor_id === v.id),
            count = (status: string) =>
              mine.filter((r) => r.status === status).length;
          return {
            vendor_id: v.id,
            vendor: v.name,
            participation: 'Associated vendor',
            status: data.readiness!.find((r) => r.vendor_id === v.id)!.status,
            reasons: mine.length
              ? mine.map((r) => `${r.title}: ${r.status}`).join('; ')
              : 'No requirements assigned',
            required: mine.filter((r) => r.required).length,
            approved: count('Approved'),
            missing: count('Missing'),
            pending: count('Pending review'),
            rejected: count('Rejected'),
            expired: count('Expired'),
            expiring_soon: 0,
            outstanding_acknowledgments: 0,
            exceptions: 0,
            waivers: 0,
          };
        }),
      }),
    }) as never,
  read: async () => ({ ...data }),
  upload: async () => ({ id: 'x' }) as never,
  command: async (action, payload, id) => {
    if (action === 'REVIEW') {
      const request = data.requests.find((r) => r.id === id)!;
      request.status = String(payload.decision);
    }
    if (action === 'REMOVE_REQUIREMENT') {
      data.requirements = data.requirements.filter((r) => r.id !== id);
      data.requests = data.requests.filter((r) => r.requirement_id !== id);
    }
    if (action === 'ASSIGN') {
      const requirement = data.requirements.find((r) => r.id === id)!;
      for (const vendorId of payload.vendorIds as number[])
        data.requests.push({
          ...requirement,
          id: `${id}-${vendorId}`,
          requirement_id: id!,
          market_id: 1,
          vendor_id: vendorId,
          market_name: 'Boerne Market',
          vendor_name: data.vendors.find((v) => v.id === vendorId)!.name,
          revision: 1,
          waived: false,
          status: 'Missing',
          expiration: null,
          submission: null,
          reviews: [],
        } as never);
    }
    return {} as never;
  },
  download: async () => ({}) as never,
};
createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, background: '#f6f7f5', minHeight: '100vh' }}>
    <Workspace api={api} manager canWrite />
  </div>,
);
