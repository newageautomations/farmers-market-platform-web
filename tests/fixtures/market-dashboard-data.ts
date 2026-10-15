import type { MarketOperationsData } from '@market/api';

export function managerData(): MarketOperationsData {
  const contact = {
    businessName: 'Orchard Farm',
    firstName: 'Alex',
    lastName: 'Green',
    email: 'alex@example.invalid',
    phone: '',
    description: 'Seasonal fruit',
    category: 'Produce',
  };
  const record = { marketId: 1, revision: 1 };
  const definition = {
    sections: [],
    questions: [],
    occurrenceIds: [101],
    rentalIds: [1],
  };
  return {
    marketId: 1,
    providerState: 'NOT_CONFIGURED',
    fundsFlowPolicy: 'NOT_CONFIGURED',
    occurrences: [101, 102].map((id, i) => ({
      id,
      startsAt: `2027-05-${15 + i * 7}T14:00:00Z`,
      endsAt: `2027-05-${15 + i * 7}T18:00:00Z`,
      venue: 'Town Square',
      status: 'scheduled',
    })),
    templates: [
      {
        ...record,
        id: 1,
        name: 'Spring Market Application',
        slug: 'spring',
        visibility: 'PUBLIC',
        advertised: true,
      },
    ],
    versions: [
      {
        ...record,
        id: 1,
        templateId: 1,
        versionNumber: 1,
        status: 'DRAFT',
        definition,
      },
    ],
    submissions: [
      {
        ...record,
        id: 1,
        status: 'UNDER_REVIEW',
        applicant: contact,
        answers: {},
        definitionSnapshot: definition,
        requestedOccurrenceIds: [101, 102],
        approvedOccurrenceIds: [],
        rentalRequests: [],
        managerNotes: '',
        directoryId: null,
        requirements: {
          widthFeet: 10,
          depthFeet: 10,
          electricity: false,
          vehicle: false,
          foodTruck: false,
        },
      },
    ],
    directory: [
      contact,
      {
        ...contact,
        businessName: 'Meadow Flowers',
        email: 'flowers@example.invalid',
      },
    ].map((c, i) => ({
      ...record,
      id: i + 1,
      kind: 'EXTERNAL',
      linkedVendorId: null,
      contact: c,
      managerNotes: '',
    })),
    eligibleVendors: [
      { id: 10, name: 'Orchard Farm', slug: 'orchard' },
      { id: 11, name: 'Meadow Flowers', slug: 'flowers' },
    ],
    rentals: ['Folding Table', 'Market Tent', 'Chair', 'Extension Cable'].map(
      (name, i) => ({
        ...record,
        id: i + 1,
        details: {
          name,
          description: '',
          enabled: true,
          priceMinor: 500,
          currency: 'USD',
          defaultQuantity: 0,
          maxQuantity: 4,
          capacity: 10,
          requiredAmenity: null,
          sortOrder: i,
        },
      }),
    ),
    allocations: [
      {
        ...record,
        id: 1,
        occurrenceId: 101,
        assignmentId: 1,
        optionId: 1,
        quantity: 3,
        snapshot: {
          optionId: 1,
          name: 'Folding Table',
          quantity: 3,
          unitMinor: 500,
          currency: 'USD',
          requiredAmenity: null,
        },
      },
    ],
    layouts: [{ ...record, id: 1, name: 'Town Square' }],
    layoutVersions: [
      {
        ...record,
        id: 1,
        layoutId: 1,
        versionNumber: 1,
        status: 'PUBLISHED',
        definition: {
          pixelsPerFoot: 10,
          areas: [{ id: 'main', name: 'Main' }],
          elements: [
            {
              id: 'booth-a',
              areaId: 'main',
              type: 'SPACE',
              x: 100,
              y: 100,
              width: 100,
              height: 100,
              rotation: 0,
              zIndex: 0,
              text: 'A1',
              fill: '#e0ebd9',
            },
          ],
        },
      },
    ],
    spaces: [
      {
        ...record,
        id: 1,
        layoutVersionId: 1,
        elementId: 'booth-a',
        details: {
          label: 'A1',
          widthFeet: 10,
          depthFeet: 10,
          amenities: [],
          feeMinor: 2500,
          currency: 'USD',
          spaceType: 'BOOTH',
          description: '',
          managerNotes: '',
          preferredDirectoryId: null,
        },
      },
    ],
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
    assignments: [
      {
        ...record,
        id: 1,
        occurrenceId: 101,
        spaceId: 1,
        directoryId: 1,
        approvalId: 1,
        businessSnapshot: {
          businessName: contact.businessName,
          description: contact.description,
          category: contact.category,
        },
        spaceSnapshot: {
          label: 'A1',
          widthFeet: 10,
          depthFeet: 10,
          amenities: [],
          feeMinor: 2500,
          currency: 'USD',
          spaceType: 'BOOTH',
          description: '',
          managerNotes: '',
          preferredDirectoryId: null,
        },
      },
    ],
  };
}
