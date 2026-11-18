import type {
  ComplianceSummaryData,
  MarketDayChecklist,
  MarketOperationsApi,
  MarketOperationsData,
} from '@market/api';

/**
 * In-memory Market operations reads for the Market Overview: the first
 * fixture date (101) has a layout with eight booths, five assigned (two
 * paid) and one confirmed vendor still without a booth; the second (102)
 * has no layout. Billing has open, past-due, draft and paid invoices.
 */
const DAY = 86400000;
const day = (offset: number) =>
  new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
const record = { revision: 1, marketId: 1 };
const contact = (businessName: string, category = 'Produce') => ({
  businessName,
  firstName: 'Sam',
  lastName: 'Grower',
  email: 'sam@example.invalid',
  phone: '',
  description: '',
  category,
});
const vendors = [
  'Orchard Farm',
  'Meadow Flowers',
  'Hill Country Honey',
  'Rio Bakery',
  'Cypress Creek Eggs',
  'Bluebonnet Soap',
];

export function managerOverviewData() {
  const occurrences = [
    {
      id: 101,
      scheduleDate: day(5),
      startsAt: `${day(5)}T15:00:00.000Z`,
      endsAt: `${day(5)}T19:00:00.000Z`,
      venue: 'Synthetic Venue',
      status: 'scheduled',
    },
    {
      id: 102,
      scheduleDate: day(12),
      startsAt: `${day(12)}T15:00:00.000Z`,
      endsAt: `${day(12)}T19:00:00.000Z`,
      venue: 'Synthetic Venue',
      status: 'scheduled',
    },
  ];
  const spaces = Array.from({ length: 8 }, (_, i) => ({
    ...record,
    id: i + 1,
    layoutVersionId: 1,
    elementId: `booth-${i + 1}`,
    details: { label: `A${i + 1}`, widthFeet: 10, depthFeet: 10 },
  }));
  const approvals = vendors.map((_, i) => ({
    ...record,
    id: i + 1,
    occurrenceId: 101,
    directoryId: i + 1,
    submissionId: null,
    decision: 'CONFIRMED',
    checkIn: 'NOT_CHECKED_IN',
    attendance: 'NOT_RECORDED',
    managerNotes: '',
  }));
  const assignments = vendors.slice(0, 5).map((name, i) => ({
    ...record,
    id: i + 1,
    occurrenceId: 101,
    spaceId: i + 1,
    directoryId: i + 1,
    approvalId: i + 1,
    spaceSnapshot: spaces[i]!.details,
    businessSnapshot: { businessName: name, description: '', category: '' },
  }));
  const invoice = (
    id: number,
    assignmentId: number,
    status: 'DRAFT' | 'OPEN' | 'PAID',
    dueOffset: number,
    totalMinor = 4500,
    paidMinor = status === 'PAID' ? totalMinor : 0,
  ) => ({
    ...record,
    id,
    assignmentId,
    occurrenceId: 101,
    directoryId: assignmentId,
    status,
    billingStatus:
      status === 'OPEN' && dueOffset < 0 ? ('PAST_DUE' as const) : status,
    lines: [],
    currency: 'USD',
    totalMinor,
    paidMinor,
    dueAt: new Date(Date.now() + dueOffset * DAY).toISOString(),
    recipientSnapshot: contact(vendors[assignmentId - 1]!),
  });
  const invoices = [
    invoice(1, 1, 'PAID', -10),
    invoice(2, 2, 'PAID', -4),
    invoice(3, 3, 'OPEN', -2),
    invoice(4, 4, 'OPEN', 3, 6000, 1500),
    invoice(5, 5, 'DRAFT', 6),
  ];
  const base = {
    marketId: 1,
    providerState: 'NOT_CONFIGURED',
    fundsFlowPolicy: 'NOT_CONFIGURED',
    occurrences,
    plans: [
      {
        ...record,
        id: 1,
        occurrenceId: 101,
        layoutVersionId: 1,
        state: 'PUBLISHED',
        operationsComplete: false,
        publicInstructions: '',
      },
    ],
    spaces,
    layoutVersions: [
      {
        ...record,
        id: 1,
        layoutId: 1,
        occurrenceId: null,
        versionNumber: 1,
        status: 'PUBLISHED',
        definition: { elements: [] },
      },
    ],
    assignments,
    approvals,
  };
  const applicationPage = {
    items: [
      {
        id: 31,
        businessName: 'Pecan Grove Orchard',
        status: 'SUBMITTED',
        category: 'Produce',
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: 30,
        businessName: 'Guadalupe Tamales',
        status: 'SUBMITTED',
        category: 'Prepared food',
        createdAt: new Date(Date.now() - 1 * DAY).toISOString(),
      },
      {
        id: 27,
        businessName: 'Limestone Pottery',
        status: 'UNDER_REVIEW',
        category: 'Crafts',
        createdAt: new Date(Date.now() - 6 * DAY).toISOString(),
      },
    ],
    totalItems: 3,
    skip: 0,
    take: 10,
    templates: [],
    categories: [],
    dates: [],
  };
  const compliance = {
    scope: 'market',
    totals: {
      total: 40,
      complete: 30,
      missing: 4,
      pending: 3,
      rejected: 0,
      expired: 1,
      expiringSoon: 2,
      outstandingRequired: 4,
    },
    marketTotals: { ready: 7, incomplete: 3, noRequirements: 0, vendors: 10 },
    library: null,
    vendorReadiness: [],
    markets: [],
    truncated: false,
  } as ComplianceSummaryData;
  const checklist = (occurrenceId: string): MarketDayChecklist => ({
    occurrenceId,
    market: 'Synthetic Market',
    status: 'future',
    localDate: day(5),
    today: day(0),
    timezone: 'America/Chicago',
    generatedAt: new Date().toISOString(),
    items: [
      {
        title: 'Participation confirmations',
        status: 'Complete',
        count: 0,
        explanation: 'Every invited vendor has answered.',
        href: `/market/assignments/${occurrenceId}`,
        action: 'Review',
      },
      {
        title: 'Required Vendor documents',
        status: 'Missing documents',
        count: 2,
        explanation: 'Two vendors are missing required documents.',
        href: '/market/documents',
        action: 'Review documents',
      },
      {
        title: 'Required policy acknowledgments',
        status: 'Complete',
        count: 0,
        explanation: 'Every vendor acknowledged the market policies.',
        href: '/market/documents',
        action: 'Review',
      },
    ],
  });
  const read = async (
    section: string,
    occurrenceId?: number,
    input?: { mode?: string },
  ) => {
    if (section === 'APPLICATIONS' && input?.mode === 'PAGE')
      return structuredClone({
        marketId: 1,
        occurrences: [],
        applicationPage,
      }) as unknown as MarketOperationsData;
    const scoped = <T extends { occurrenceId: number }>(rows: T[]) =>
      occurrenceId ? rows.filter((r) => r.occurrenceId === occurrenceId) : rows;
    return structuredClone({
      ...base,
      selectedOccurrenceId: occurrenceId ?? null,
      assignments: scoped(base.assignments),
      approvals: scoped(base.approvals),
      ...(section === 'SCHEDULE' ? {} : { invoices: scoped(invoices) }),
    }) as unknown as MarketOperationsData;
  };
  const operations = {
    read,
    command: async () => ({}),
    vendorAssignments: async () => [],
  } as unknown as MarketOperationsApi;
  return { operations, compliance, checklist };
}
