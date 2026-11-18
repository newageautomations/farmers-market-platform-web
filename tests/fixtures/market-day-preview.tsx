/**
 * Explicit local qualification data, never imported by the production entry
 * point: Market Day for a manager (/market/day/1) and a vendor (/vendor/day/1,
 * add ?booths=2 for two booths) with in-memory preparation, booth map and
 * attendance. Commands change memory only; a full reload resets them.
 */
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import type {
  AttendanceApi,
  AttendanceCommand,
  AttendancePage,
  AttendanceRow,
  MarketOperationsData,
  PreparationCommand,
  PreparationView,
  VendorBoothAssignment,
} from '@market/api';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import { fixtureContexts } from '../../apps/admin/src/FixtureAdmin';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { createFixtureVendorService } from '../../apps/admin/src/vendor/fixture';
import { boothData } from './phase15b-data';

const startsAt = '2026-11-14T15:00:00Z';
const endsAt = '2026-11-14T20:00:00Z';
const occurrence = {
  id: 1,
  marketName: 'Boerne Market',
  startsAt,
  endsAt,
  timezone: 'America/Chicago',
  venue: 'Town square, 100 Main Street',
  status: 'scheduled',
};
const names = ['Local Orchard', 'River Bakery', 'Hill Honey', 'Canyon Greens'];
const record = { marketId: 1, revision: 1 };

const map: MarketOperationsData = structuredClone(boothData);
map.occurrences = [
  { id: 1, startsAt, endsAt, venue: occurrence.venue, status: 'scheduled' },
];
const elements = [0, 1, 2, 3, 4, 5].map((i) => ({
  id: `booth-${i + 1}`,
  areaId: 'main',
  type: 'SPACE',
  x: 40 + (i % 3) * 170,
  y: 60 + Math.floor(i / 3) * 150,
  width: 130,
  height: 100,
  rotation: 0,
  zIndex: i,
  text: `A${i + 1}`,
  fill: '#e0ebd9',
}));
map.layoutVersions![0]!.definition = {
  ...map.layoutVersions![0]!.definition,
  elements,
} as never;
map.spaces = elements.map((e, i) => ({
  ...record,
  id: i + 1,
  layoutVersionId: 1,
  elementId: e.id,
  details: {
    ...map.spaces![0]!.details,
    label: e.text,
    amenities: i < 2 ? ['ELECTRICITY'] : [],
  },
}));
map.plans![0]!.state = 'PUBLISHED';
map.directory = names.map((businessName, i) => ({
  ...map.directory![0]!,
  id: i + 1,
  contact: { ...map.directory![0]!.contact, businessName },
}));
map.approvals = names.map((_, i) => ({
  ...map.approvals![0]!,
  id: i + 1,
  directoryId: i + 1,
}));
const boothOf = [2, null, 3, 1];
map.assignments = names.flatMap((businessName, i) =>
  boothOf[i]
    ? [
        {
          ...map.assignments![0]!,
          id: i + 1,
          spaceId: boothOf[i]!,
          directoryId: i + 1,
          approvalId: i + 1,
          spaceSnapshot: {
            ...map.assignments![0]!.spaceSnapshot,
            label: `A${boothOf[i]}`,
          },
          businessSnapshot: { businessName, description: '', category: '' },
        },
      ]
    : [],
);
map.invoices = [
  { id: 1, assignmentId: 1, directoryId: 1, status: 'PAID', paidMinor: 2500 },
  { id: 3, assignmentId: 3, directoryId: 3, status: 'DRAFT', paidMinor: 0 },
].map((i) => ({
  ...map.invoices![0]!,
  ...i,
  billingStatus: i.status,
})) as never;

const invoice = (status: string, paidMinor: number) => ({
  status,
  totalMinor: 2500,
  paidMinor,
  currency: 'USD',
});
let tasks = [
  ['Charge card reader', true],
  ['Pack signs and table covers', true],
  ['Load canopy and weights', false],
  ['Print price list', false],
  ['[Closing] Pack canopy', false],
].map(([title, done], i) => ({
  id: String(i + 1),
  title: title as string,
  completedAt: done ? '2026-11-13T22:10:00Z' : null,
  createdAt: '2026-11-12T00:00:00Z',
  updatedAt: '2026-11-12T00:00:00Z',
}));
let revision = 1;
const view = (scope: 'MANAGER' | 'VENDOR'): PreparationView => ({
  occurrence,
  privateMarket: false,
  participation: 'confirmed',
  revision,
  sourceVersion: 'preview',
  tasks: structuredClone(tasks),
  templates: [],
  appliedTemplates: [],
  readiness: 'Not Reported',
  confirmedAt: null,
  editable: true,
  operationsSummary: {
    assignedBooths: 3,
    unassignedBooths: 3,
    outstandingInvoices: 2,
  },
  assignments: scope === 'VENDOR' ? vendorBooths() : [],
  vendors:
    scope === 'MANAGER'
      ? [
          {
            vendorId: null,
            directoryId: 1,
            name: names[0]!,
            participation: 'confirmed',
            readiness: 'Ready',
            confirmedAt: null,
            booths: ['A2'],
            invoices: [invoice('PAID', 2500)],
            rentals: [
              { name: 'Folding Table', quantity: 2 },
              { name: 'Market Tent', quantity: 1 },
            ],
          },
          {
            vendorId: null,
            directoryId: 2,
            name: names[1]!,
            participation: 'confirmed',
            readiness: 'Not Reported',
            confirmedAt: null,
            booths: [],
            invoices: [invoice('OPEN', 0)],
            rentals: [],
          },
          {
            vendorId: null,
            directoryId: 3,
            name: names[2]!,
            participation: 'confirmed',
            readiness: 'Needs Reconfirmation',
            confirmedAt: null,
            booths: ['A3'],
            invoices: [invoice('DRAFT', 0)],
            rentals: [],
          },
          {
            vendorId: null,
            directoryId: 4,
            name: names[3]!,
            participation: 'planned',
            readiness: 'Not Reported',
            confirmedAt: null,
            booths: ['A1'],
            invoices: [],
            rentals: [],
          },
        ]
      : undefined,
});
const preparation = {
  read: async (scope: 'MANAGER' | 'VENDOR') => view(scope),
  command: async (
    scope: 'MANAGER' | 'VENDOR',
    _id: number,
    _revision: number,
    command: PreparationCommand,
  ) => {
    const now = new Date().toISOString();
    if (command.action === 'COMPLETE')
      tasks = tasks.map((t) =>
        t.id === command.taskId
          ? { ...t, completedAt: command.complete ? now : null }
          : t,
      );
    if (command.action === 'ADD')
      tasks = [
        ...tasks,
        {
          id: String(Date.now()),
          title: String(command.title),
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ];
    if (command.action === 'EDIT')
      tasks = tasks.map((t) =>
        t.id === command.taskId ? { ...t, title: String(command.title) } : t,
      );
    if (command.action === 'DELETE')
      tasks = tasks.filter((t) => t.id !== command.taskId);
    if (command.action === 'REORDER') {
      const ids = command.taskIds as string[];
      tasks = ids.map((id) => tasks.find((t) => t.id === id)!);
    }
    revision += 1;
    return view(scope);
  },
};

let rows: AttendanceRow[] = names.map((businessName, i) => ({
  id: i + 1,
  occurrenceId: 1,
  vendorId: null,
  directoryId: i + 1,
  revision: 1,
  status: i === 0 ? 'CHECKED_IN' : 'AWAITING',
  checkInSource: i === 0 ? 'manager' : null,
  checkedInAt: i === 0 ? '2026-11-14T14:40:00Z' : null,
  checkedInBy: i === 0 ? 7 : null,
  expected: true,
  note: '',
  canSelfCheckIn: false,
  snapshot: {
    marketName: occurrence.marketName,
    businessName,
    startsAt,
    endsAt,
    timezone: occurrence.timezone,
    venue: occurrence.venue,
    booth: boothOf[i] ? `A${boothOf[i]}` : null,
    bookingStatus: i === 3 ? 'tentative' : 'confirmed',
  },
  finalizedAt: null,
  occurrenceStatus: 'scheduled',
}));
let session = {
  revision: 1,
  finalizedAt: null as string | null,
  finalizedBy: null,
  finalCounts: null,
};
function page(items = rows): AttendancePage {
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return {
    items: structuredClone(items),
    totalItems: items.length,
    counts: {
      expected: rows.length,
      CHECKED_IN: count('CHECKED_IN'),
      AWAITING: count('AWAITING'),
      EXCUSED: count('EXCUSED'),
      NO_SHOW: count('NO_SHOW'),
    },
    session,
    occurrence: { ...occurrence },
    serverNow: '2026-11-14T15:30:00Z',
  } as AttendancePage;
}
const attendance: AttendanceApi = {
  read: async () => page(),
  vendor: async () =>
    page(
      rows
        .slice(0, 1)
        .map((r) => ({ ...r, status: 'AWAITING', canSelfCheckIn: true })),
    ),
  selfCheckIn: async () => ({}) as never,
  command: async (command: AttendanceCommand) => {
    if (command.action === 'FINALIZE')
      session = {
        ...session,
        revision: session.revision + 1,
        finalizedAt: new Date().toISOString(),
      };
    else
      rows = rows.map((r) =>
        r.id === command.id
          ? {
              ...r,
              status: command.status!,
              note: command.note ?? r.note,
              revision: (r.revision ?? 0) + 1,
              checkedInAt:
                command.status === 'CHECKED_IN'
                  ? new Date().toISOString()
                  : r.checkedInAt,
            }
          : r,
      );
    return {} as never;
  },
};

function vendorBooths(): VendorBoothAssignment[] {
  const count = Number(new URLSearchParams(location.search).get('booths') ?? 1);
  const publicMap = {
    occurrenceId: 1,
    publicInstructions: '',
    definition: map.layoutVersions![0]!.definition,
    spaces: map.spaces!.map((s) => ({
      elementId: s.elementId,
      label: s.details.label,
      widthFeet: 12,
      depthFeet: 10,
      amenities: s.details.amenities,
      vendor: null,
    })),
  };
  return [2, 5].slice(0, count).map((space, i) => ({
    occurrenceId: 1,
    startsAt,
    space: {
      label: `A${space}`,
      widthFeet: 12,
      depthFeet: 10,
      amenities: i === 0 ? ['ELECTRICITY'] : [],
    },
    elementId: `booth-${space}`,
    map: publicMap,
    publicInstructions:
      i === 0
        ? 'Unload on Main Street before 7:30 AM, then park in the north lot.'
        : '',
    rentals:
      i === 0
        ? [
            {
              optionId: 1,
              name: 'Folding Table',
              quantity: 2,
              unitMinor: 500,
              currency: 'USD',
              requiredAmenity: null,
            },
            {
              optionId: 2,
              name: 'Market Tent',
              quantity: 1,
              unitMinor: 750,
              currency: 'USD',
              requiredAmenity: null,
            },
          ]
        : [],
    invoices: [
      {
        id: i + 1,
        status: i ? 'OPEN' : 'PAID',
        currency: 'USD',
        totalMinor: 2500,
        paidMinor: i ? 0 : 2500,
      },
    ],
  }));
}

let finished = false;
let completionRevision = 0;
let assistance = [
  {
    id: 1,
    vendor: 'Hill Honey',
    booth: 'A3',
    category: 'Equipment',
    description: 'One tent weight is missing from our allocation.',
    status: 'OPEN' as const,
    revision: 1,
    createdAt: '2026-11-14T15:05:00Z',
    resolvedAt: null as string | null,
    resolvedBy: null as number | null,
  },
  {
    id: 2,
    vendor: 'Local Orchard',
    booth: 'A2',
    category: 'Booth',
    description: 'Power outlet at A2 is not working.',
    status: 'RESOLVED' as 'OPEN' | 'RESOLVED',
    revision: 2,
    createdAt: '2026-11-14T14:20:00Z',
    resolvedAt: '2026-11-14T14:45:00Z' as string | null,
    resolvedBy: 7 as number | null,
  },
] as Array<Record<string, unknown>>;
const dayView = () => ({
  serverNow: '2026-11-14T15:30:00Z',
  canFinish: true,
  canWrite: true,
  completion: {
    finished,
    revision: completionRevision,
    history: completionRevision
      ? [
          {
            action: finished ? 'FINISH' : 'REOPEN',
            actorId: 7,
            at: new Date().toISOString(),
            revision: completionRevision,
          },
        ]
      : [],
  },
  assistance: structuredClone(assistance),
});
const marketDay = {
  read: async () => dayView(),
  recap: async () => ({
    generatedAt: new Date().toISOString(),
    previousOccurrenceId: null,
    coverage: 'Canonical attributed purchases.',
    metrics: [
      {
        key: 'sales',
        label: 'Net merchandise sales',
        value: 184250,
        currency: 'USD',
        previous: 162000,
      },
      { key: 'orders', label: 'Preorders picked up', value: 38, previous: 31 },
      {
        key: 'attendance',
        label: 'Attendance follow-ups',
        value: 2,
        previous: null,
        detail: 'Recorded, not physical presence',
      },
    ],
  }),
  command: async (
    _scope: string,
    _id: number,
    command: Record<string, unknown>,
  ) => {
    if (command.action === 'FINISH') {
      finished = true;
      completionRevision += 1;
    }
    if (command.action === 'REOPEN') {
      finished = false;
      completionRevision += 1;
    }
    if (command.action === 'RESOLVE')
      assistance = assistance.map((r) =>
        r.id === command.requestId
          ? {
              ...r,
              status: 'RESOLVED',
              revision: Number(r.revision) + 1,
              resolvedAt: new Date().toISOString(),
              resolvedBy: 7,
            }
          : r,
      );
    if (command.action === 'REQUEST')
      assistance = [
        {
          id: assistance.length + 1,
          vendor: 'Local Orchard',
          booth: 'A2',
          category: command.category,
          description: command.description,
          status: 'OPEN',
          revision: 1,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolvedBy: null,
        },
        ...assistance,
      ];
    return dayView();
  },
};

const vendorView = location.pathname.startsWith('/vendor');
if (vendorView) {
  const context = fixtureContexts.VENDOR;
  const service = createFixtureVendorService(context);
  service.preparation = preparation as never;
  service.marketAttendance = attendance;
  service.packing = undefined;
  service.marketDay = marketDay as never;
  const source = await service.order('1401');
  const pickups = ['Maria Lopez', 'Sam Carter', 'Priya Shah'].map(
    (customer, i) => ({
      ...source,
      customer,
      orderCode: `M-10${i + 4}`,
      portion: {
        ...source.portion,
        operationalOrderId: `day-${i}`,
        kind: 'MARKET_OCCURRENCE',
        occurrenceId: '1',
        vendorId: service.vendorId,
        nativeState: 'PaymentSettled',
        pickupStatus: 'PENDING',
        remainingQuantity: 1,
        lines: source.portion.lines
          .slice(0, 2)
          .map((l) => ({ ...l, remainingQuantity: l.quantity })),
      },
    }),
  );
  service.orders = (async () => ({
    items: pickups,
    totalItems: pickups.length,
  })) as never;
  service.order = (async (id: string) =>
    pickups.find((o) => o.portion.operationalOrderId === id) ??
    source) as never;
  createRoot(document.getElementById('root')!).render(
    <AdminShell
      context={context}
      vendorService={service}
      onLogout={() => undefined}
    />,
  );
} else {
  const context = marketFixtureContext();
  context.permissions = [
    ...context.permissions,
    'ReadOwnMarketLayouts',
    'ReadOwnMarketAssignments',
    'ManageOwnMarketAssignments',
    'ReadOwnMarketBilling',
    'OperateOwnMarketDay',
  ];
  const service = createFixtureMarketService(context);
  service.preparation = preparation as never;
  service.marketDay = marketDay as never;
  service.phase14 = {
    vendorAssignments: async () => [],
    read: async () => structuredClone(map),
    command: async () => {
      throw new Error('Command is outside this browser qualification fixture.');
    },
    attendance,
  } as never;
  createRoot(document.getElementById('root')!).render(
    <AdminShell
      context={context}
      marketService={service}
      onLogout={() => undefined}
    />,
  );
}
