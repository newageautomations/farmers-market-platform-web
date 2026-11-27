/**
 * Local browser fixture for the Market Applications list and builder. In-memory
 * data only, no backend; never imported by the application entry point.
 */
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import type {
  ApplicationDefinition,
  ApplicationSubmission,
  ApplicationTemplate,
  ApplicationVersion,
  MarketOperationsData,
  OccurrenceApproval,
} from '@market/api';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { definition } from './phase15-data';

const day = 86400000;
const iso = (days: number) => new Date(Date.now() + days * day).toISOString();
const defaults: ApplicationDefinition = {
  sections: ['Business'],
  questions: [
    ['businessName', 'Business name', 'SHORT_TEXT', true],
    ['firstName', 'Contact first name', 'SHORT_TEXT', true],
    ['lastName', 'Contact last name', 'SHORT_TEXT', true],
    ['email', 'Email', 'EMAIL', true],
    ['phone', 'Phone', 'PHONE', false],
    ['description', 'Business description', 'LONG_TEXT', false],
  ].map(([semantic, label, type, required]) => ({
    id: String(semantic),
    semantic: String(semantic),
    section: 'Business',
    label: String(label),
    help: '',
    type: type as 'SHORT_TEXT',
    required: Boolean(required),
    hidden: false,
    options: [],
  })),
  occurrenceIds: [],
  rentalIds: [],
};
const template = (
  id: number,
  name: string,
  extra: Partial<ApplicationTemplate> = {},
): ApplicationTemplate => ({
  id,
  marketId: 1,
  revision: 1,
  name,
  slug: `slug-${id}`,
  visibility: 'PUBLIC',
  advertised: false,
  archivedAt: null,
  updatedAt: iso(-id),
  ...extra,
});
const version = (
  id: number,
  templateId: number,
  status: ApplicationVersion['status'],
  versionNumber = 1,
): ApplicationVersion => ({
  id,
  marketId: 1,
  revision: 1,
  templateId,
  versionNumber,
  status,
  definition: structuredClone({ ...definition, occurrenceIds: [11, 12] }),
  updatedAt: iso(-templateId),
});
const operations: MarketOperationsData = {
  marketId: 1,
  providerState: 'NOT_CONFIGURED',
  fundsFlowPolicy: 'NOT_CONFIGURED',
  timeZone: 'America/Chicago',
  occurrences: [
    ...[11, 12, 13, 14].map((id, index) => ({
      id,
      startsAt: iso(7 * (index + 1)),
      endsAt: iso(7 * (index + 1) + 0.2),
      venue: 'Main Plaza',
      status: 'scheduled',
    })),
    // A daily season: two past dates, then 26 upcoming ones.
    ...Array.from({ length: 28 }, (_, index) => ({
      id: 100 + index,
      startsAt: iso(index - 1.5),
      endsAt: iso(index - 1.3),
      venue: 'Main Plaza',
      status: 'scheduled',
    })),
  ],
  rentals: [
    {
      id: 1,
      marketId: 1,
      revision: 1,
      details: {
        name: 'Tent rental',
        description: '',
        enabled: true,
        priceMinor: 2500,
        currency: 'USD',
        defaultQuantity: 1,
        maxQuantity: 1,
        capacity: null,
        requiredAmenity: null,
        sortOrder: 0,
      },
    },
  ],
  templates: [
    template(1, 'Summer season vendors', { advertised: true }),
    template(2, 'Holiday market 2026'),
    template(3, 'Food truck application', { visibility: 'PRIVATE' }),
    template(4, 'Spring 2026 season', {
      archivedAt: iso(-30),
    }),
  ],
  versions: [
    version(1, 1, 'PUBLISHED'),
    version(2, 1, 'DRAFT', 2),
    version(3, 2, 'DRAFT'),
    version(4, 3, 'PUBLISHED'),
    version(5, 4, 'PUBLISHED'),
  ],
  applicationDefaults: defaults,
  applicationActivity: [
    { templateId: 1, total: 14, awaiting: 3, latestSubmittedAt: iso(-1) },
    { templateId: 3, total: 2, awaiting: 0, latestSubmittedAt: iso(-9) },
    { templateId: 4, total: 21, awaiting: 0, latestSubmittedAt: iso(-60) },
  ],
  submissions: [],
  directory: [],
  approvals: [],
};
// Submitted applications with many requested dates (Requested dates table).
const record = { marketId: 1, revision: 1 };
const submission = (
  id: number,
  businessName: string,
  status: string,
): ApplicationSubmission => ({
  ...record,
  id,
  createdAt: iso(-3),
  templateName: 'Summer season vendors',
  status,
  identityMode: 'AUTHORIZED_VENDOR',
  applicantVendorId: 40 + id,
  applicant: {
    businessName,
    firstName: 'Avery',
    lastName: 'Grower',
    email: `vendor${id}@example.invalid`,
    phone: '+1 210 555 0100',
    description: 'Seasonal produce',
    category: 'Fruits & Vegetables',
  },
  answers: { businessName, email: `vendor${id}@example.invalid` },
  definitionSnapshot: structuredClone(definition),
  requestedOccurrenceIds: Array.from({ length: 24 }, (_, i) => 100 + i),
  approvedOccurrenceIds: [],
  rentalRequests: [
    {
      optionId: 1,
      name: 'Tent rental',
      currency: 'USD',
      quantity: 1,
      unitMinor: 2500,
      requiredAmenity: null,
    },
  ],
  managerNotes: '',
  directoryId: status === 'ACCEPTED' ? 1 : null,
  requirements: {
    widthFeet: 10,
    depthFeet: 10,
    electricity: false,
    vehicle: false,
    foodTruck: false,
  },
  history: [],
  informationRequests: [],
  documentation: {
    status: 'Missing',
    total: 2,
    complete: 1,
    missing: 1,
    pending: 0,
    expired: 0,
    rejected: 0,
    outstanding: ['Liability insurance'],
    expiringSoon: 0,
    outstandingRequired: 1,
  },
});
operations.submissions = [
  submission(7, 'Synthetic Orchard D', 'ACCEPTED'),
  submission(8, 'Synthetic Dairy E', 'UNDER_REVIEW'),
];
operations.directory = [
  {
    ...record,
    id: 1,
    kind: 'PLATFORM_LINKED',
    linkState: 'LINK_VERIFIED',
    linkedVendorId: 47,
    contact: operations.submissions[0]!.applicant,
    managerNotes: '',
  } as NonNullable<MarketOperationsData['directory']>[number],
];
const approval = (
  occurrenceId: number,
  decision: OccurrenceApproval['decision'],
): OccurrenceApproval => ({
  ...record,
  id: occurrenceId,
  occurrenceId,
  directoryId: 1,
  submissionId: 7,
  participationId: decision === 'CONFIRMED' ? occurrenceId : null,
  decision,
  checkIn: 'NOT_CHECKED_IN',
  attendance: 'NOT_RECORDED',
  managerNotes: decision === 'DECLINED' ? 'Booth row full that day' : '',
});
operations.approvals = [
  approval(100, 'CONFIRMED'),
  approval(103, 'CONFIRMED'),
  approval(104, 'WAITLISTED'),
  approval(106, 'DECLINED'),
];

const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketApplications',
  'ManageOwnMarketApplications',
  'ManageOwnMarketAssignments',
  'ManageOwnMarketBilling',
  'ManageOwnMarketMemberships',
];
const service = createFixtureMarketService(context);
const wait = () => new Promise((resolve) => setTimeout(resolve, 350));
/** Commands received, for inspecting the fixture from the browser console. */
const log: unknown[] = [];
(window as unknown as { applicationCommands: unknown[] }).applicationCommands =
  log;
service.phase14 = {
  vendorAssignments: async () => [],
  read: async (_section, _occurrence, input) =>
    input && 'mode' in input && input.mode === 'PAGE'
      ? {
          ...structuredClone(operations),
          applicationPage: {
            items: [
              { id: 1, businessName: 'Synthetic Farm A', status: 'SUBMITTED' },
              {
                id: 2,
                businessName: 'Synthetic Bakery B',
                status: 'NEEDS_INFO',
              },
              { id: 3, businessName: 'Synthetic Crafts C', status: 'ACCEPTED' },
            ],
            totalItems: 3,
            skip: 0,
            take: 20,
            templates: operations.templates ?? [],
            categories: ['Produce'],
            dates: operations.occurrences,
          },
        }
      : input && 'mode' in input && input.mode === 'DETAIL'
        ? {
            ...structuredClone(operations),
            submissionDetail: structuredClone(
              operations.submissions!.find((s) => s.id === input.submissionId),
            ),
          }
        : structuredClone(operations),
  command: async (command) => {
    log.push(structuredClone(command));
    await wait();
    const templates = operations.templates!,
      versions = operations.versions!;
    const touch = <T extends { revision: number; updatedAt?: string }>(
      row: T,
    ) => {
      row.revision++;
      row.updatedAt = new Date().toISOString();
      return structuredClone(row);
    };
    switch (command.action) {
      case 'REVIEW_OCCURRENCE': {
        // A note containing "fail" rejects the even-numbered dates.
        const occurrenceId = Number(command.data.occurrenceId),
          decision = command.data.decision as OccurrenceApproval['decision'];
        if (
          String(command.data.reason).includes('fail') &&
          occurrenceId % 2 === 0
        )
          throw new Error('PLATFORM_PARTICIPATION_CANCELLED');
        let row = operations.approvals!.find(
          (a) =>
            a.submissionId === command.data.submissionId &&
            a.occurrenceId === occurrenceId,
        );
        if (row && row.revision !== command.expectedRevision)
          throw new Error('conflict');
        if (!row) {
          row = approval(occurrenceId, 'PENDING');
          operations.approvals!.push(row);
        }
        row.decision = decision;
        // The backend confirms the linked vendor's participation.
        if (decision === 'CONFIRMED') row.participationId ??= occurrenceId;
        row.managerNotes = String(command.data.reason ?? '');
        return touch(row);
      }
      case 'REVIEW_APPLICATION': {
        const row = operations.submissions!.find((s) => s.id === command.id)!;
        row.status = String(command.data.status);
        if (row.status === 'ACCEPTED') row.directoryId = 1;
        return touch(row);
      }
      case 'CREATE_APPLICATION': {
        const id = Math.max(...templates.map((t) => t.id)) + 1;
        templates.push(template(id, String(command.data.name)));
        const row = {
          ...version(Math.max(...versions.map((v) => v.id)) + 1, id, 'DRAFT'),
          definition: structuredClone(defaults),
        };
        versions.push(row);
        return structuredClone(row);
      }
      case 'CLONE_APPLICATION': {
        const prior = versions.find((v) => v.id === command.id)!;
        const row = {
          ...structuredClone(prior),
          id: Math.max(...versions.map((v) => v.id)) + 1,
          revision: 1,
          status: 'DRAFT' as const,
          versionNumber: prior.versionNumber + 1,
        };
        versions.push(row);
        return structuredClone(row);
      }
      case 'SAVE_APPLICATION': {
        const row = versions.find((v) => v.id === command.id)!;
        if (row.revision !== command.expectedRevision)
          throw new Error('conflict');
        row.definition = structuredClone(
          command.data.definition as ApplicationDefinition,
        );
        const t = templates.find((t) => t.id === row.templateId)!;
        t.name = String(command.data.name);
        touch(t);
        return touch(row);
      }
      case 'PUBLISH_APPLICATION': {
        const row = versions.find((v) => v.id === command.id)!;
        for (const v of versions)
          if (v.templateId === row.templateId && v.status === 'PUBLISHED')
            v.status = 'RETIRED';
        row.status = 'PUBLISHED';
        const t = templates.find((t) => t.id === row.templateId)!;
        t.visibility = command.data.visibility as 'PUBLIC';
        if (command.data.advertised)
          for (const other of templates) other.advertised = false;
        t.advertised = command.data.advertised === true;
        touch(t);
        return touch(row);
      }
      case 'ARCHIVE_APPLICATION':
      case 'UNARCHIVE_APPLICATION': {
        const t = templates.find((t) => t.id === command.id)!;
        if (t.revision !== command.expectedRevision)
          throw new Error('conflict');
        t.archivedAt =
          command.action === 'ARCHIVE_APPLICATION'
            ? new Date().toISOString()
            : null;
        if (t.archivedAt) t.advertised = false;
        return touch(t);
      }
    }
    throw new Error(`Fixture does not implement ${command.action}.`);
  },
};
createRoot(document.getElementById('root')!).render(
  <AdminShell
    context={context}
    marketService={service}
    onLogout={() => undefined}
  />,
);
