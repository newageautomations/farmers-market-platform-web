/**
 * Local browser fixture for the Market directory. In-memory data only, no
 * backend; never imported by the application entry point.
 */
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import type {
  ComplianceData,
  ComplianceRequest,
  ComplianceSummaryData,
  DirectoryEntry,
  MarketOperationsData,
} from '@market/api';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';

const businesses: Array<[string, string, string, number | null, string]> = [
  ['Orchard Farm', 'Alex Green', 'Produce', 10, 'LINK_VERIFIED'],
  ['Meadow Flowers', 'Sam Rivera', 'Flowers', 11, 'LINK_VERIFIED'],
  ['Hill Country Honey', 'Jo Park', 'Pantry', 12, 'LINK_VERIFIED'],
  ['Stone Oven Bakery', 'Lee Chen', 'Bakery', null, 'EXTERNAL'],
  ['Cypress Crafts', 'Dana Cruz', 'Crafts', 13, 'LINK_PENDING'],
  ['Prairie Eggs', 'Kim Ortiz', 'Dairy & eggs', null, 'EXTERNAL'],
];
const operations: MarketOperationsData = {
  marketId: 1,
  providerState: 'NOT_CONFIGURED',
  fundsFlowPolicy: 'NOT_CONFIGURED',
  occurrences: [],
  directory: businesses.map(([name, person, category, vendor, link], i) => {
    const [firstName, lastName] = person.split(' ');
    return {
      id: i + 1,
      marketId: 1,
      revision: 1,
      kind: vendor ? 'PLATFORM_LINKED' : 'EXTERNAL',
      linkState: link as DirectoryEntry['linkState'],
      linkedVendorId: link === 'LINK_VERIFIED' ? vendor : null,
      managerNotes: i === 0 ? 'Prefers a corner booth near the entrance.' : '',
      contact: {
        businessName: name,
        firstName: firstName!,
        lastName: lastName!,
        email: `${firstName!.toLowerCase()}@example.invalid`,
        phone: i % 2 ? '' : '(830) 555-01' + String(10 + i),
        description: '',
        category,
      },
    };
  }),
  linkRequests: [
    {
      id: 1,
      marketId: 1,
      revision: 1,
      directoryId: 5,
      vendorId: 13,
      status: 'PENDING',
      reason: '',
    },
  ],
  eligibleVendors: [
    { id: 10, name: 'Orchard Farm', slug: 'orchard' },
    { id: 14, name: 'Stone Oven Bakery LLC', slug: 'stone-oven' },
  ],
};
const counts = (
  total: number,
  done: number,
  missing: number,
  pending: number,
  rejected: number,
  expired: number,
  status: string,
) => ({
  total,
  complete: done,
  missing,
  pending,
  rejected,
  expired,
  expiringSoon: 0,
  outstandingRequired: total - done,
  status,
});
const summary: ComplianceSummaryData = {
  scope: 'market',
  totals: counts(9, 4, 2, 1, 1, 1, ''),
  marketTotals: { ready: 1, incomplete: 2, noRequirements: 0, vendors: 3 },
  library: null,
  vendorReadiness: [
    { vendor_id: 10, ...counts(4, 1, 1, 0, 1, 1, 'Incomplete') },
    { vendor_id: 11, ...counts(3, 3, 0, 0, 0, 0, 'Ready') },
    { vendor_id: 12, ...counts(2, 1, 1, 1, 0, 0, 'Incomplete') },
  ],
  markets: [],
  truncated: false,
};
const request = (
  id: number,
  vendor: number,
  title: string,
  category: string,
  status: string,
  extra: Partial<ComplianceRequest> = {},
): ComplianceRequest => ({
  id: String(id),
  requirement_id: String(id),
  title,
  category,
  instructions: '',
  required: true,
  stage: 'Membership',
  due_on: null,
  approval_required: true,
  expiration_required: true,
  market_wide: true,
  market_id: 1,
  vendor_id: vendor,
  market_name: 'Boerne Market',
  vendor_name: '',
  revision: 1,
  waived: false,
  status,
  expiration: null,
  submission: null,
  reviews: [],
  ...extra,
});
const documents: ComplianceData = {
  documents: [],
  total: 0,
  requirements: [],
  vendors: [],
  categories: [],
  timezone: 'America/Chicago',
  truncated: false,
  requests: [
    request(1, 10, 'Certificate of insurance', 'Insurance', 'Missing', {
      due_on: '2026-11-20',
    }),
    request(2, 10, 'Food handler permit', 'Permit', 'Rejected'),
    request(3, 10, 'Sales tax permit', 'Permit', 'Expired'),
    request(4, 10, 'Vendor agreement', 'Agreement', 'Approved', {
      expiration: 'Expiring Soon',
    }),
    request(5, 11, 'Certificate of insurance', 'Insurance', 'Approved'),
    request(6, 12, 'Certificate of insurance', 'Insurance', 'Pending review'),
    request(7, 12, 'Cottage food label', 'Labeling', 'Missing', {
      required: false,
    }),
  ],
};

const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketApplications',
  'ManageOwnMarketApplications',
  'ReadOwnDocuments',
  'ManageOwnMarketMemberships',
];
const service = createFixtureMarketService(context);
const members = (await service.relationshipPage({ take: 20 })).items.map((m) =>
  Number(m.vendorId),
);
const [v1, v2, v3] = members;
for (const [i, vendorId] of [v1, v2, v3].entries())
  summary.vendorReadiness[i]!.vendor_id = vendorId!;
for (const r of documents.requests)
  r.vendor_id = { 10: v1, 11: v2, 12: v3 }[r.vendor_id as 10 | 11 | 12]!;
// One external record is a verified link to a member, so it merges into that row.
operations.directory![1]!.linkedVendorId = v2!;
operations.vendorNotes = [
  { id: 1, marketId: 1, revision: 1, vendorId: v1!, notes: 'Prefers a corner booth. Pays by check.' },
];
const wait = () => new Promise((resolve) => setTimeout(resolve, 400));
service.notifications = {
  ...service.notifications!,
  summary: async () => (await wait(), structuredClone(summary)),
};
service.documents = { read: async () => (await wait(), structuredClone(documents)) };
service.phase14 = {
  vendorAssignments: async () => [],
  read: async () => structuredClone(operations),
  command: async (command) => {
    await wait();
    const list = operations.directory!;
    if (command.action === 'SAVE_DIRECTORY') {
      const contact = command.data.contact as DirectoryEntry['contact'];
      const row = list.find((d) => d.id === command.id);
      if (row) {
        row.contact = contact;
        row.managerNotes = String(command.data.managerNotes ?? '');
        row.revision++;
        return structuredClone(row);
      }
      const added: DirectoryEntry = {
        id: Math.max(...list.map((d) => d.id)) + 1,
        marketId: 1,
        revision: 1,
        kind: 'EXTERNAL',
        linkState: 'EXTERNAL',
        linkedVendorId: null,
        managerNotes: String(command.data.managerNotes ?? ''),
        contact,
      };
      list.push(added);
      return structuredClone(added);
    }
    if (command.action === 'SAVE_VENDOR_NOTES') {
      const vendorId = Number(command.data.vendorId);
      const notes = (operations.vendorNotes ??= []);
      const row = notes.find((n) => n.vendorId === vendorId);
      if (row) {
        row.notes = String(command.data.notes);
        row.revision++;
        return structuredClone(row);
      }
      const added = { id: notes.length + 1, marketId: 1, revision: 1, vendorId, notes: String(command.data.notes) };
      notes.push(added);
      return structuredClone(added);
    }
    if (command.action === 'REQUEST_VENDOR_LINK') {
      const row = list.find((d) => d.id === command.id)!;
      row.linkState = 'LINK_PENDING';
      return structuredClone(row);
    }
    throw new Error(`Fixture does not implement ${command.action}.`);
  },
} as typeof service.phase14;
createRoot(document.getElementById('root')!).render(
  <AdminShell
    context={context}
    marketService={service}
    onLogout={() => undefined}
  />,
);
