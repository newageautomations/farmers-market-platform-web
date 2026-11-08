/**
 * Local browser fixture for the Market Applications list and builder. In-memory
 * data only, no backend; never imported by the application entry point.
 */
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import type {
  ApplicationDefinition,
  ApplicationTemplate,
  ApplicationVersion,
  MarketOperationsData,
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
  occurrences: [11, 12, 13, 14].map((id, index) => ({
    id,
    startsAt: iso(7 * (index + 1)),
    endsAt: iso(7 * (index + 1) + 0.2),
    venue: 'Main Plaza',
    status: 'scheduled',
  })),
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
};

const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketApplications',
  'ManageOwnMarketApplications',
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
              { id: 2, businessName: 'Synthetic Bakery B', status: 'NEEDS_INFO' },
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
