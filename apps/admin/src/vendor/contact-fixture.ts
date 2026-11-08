// Development-only contact submissions for FixtureAdmin. Mirrors the backend's
// newest-first 20-row pages, status filter and summary counts.
import type {
  ContactStatusFilter,
  ContactSubmission,
  VendorContactApi,
} from '@market/api';

const samples: [string, string, string, string, string, number, boolean][] = [
  [
    'Rebecca Lindqvist',
    'rebecca@example.test',
    '+12105550141',
    'Product Question',
    'Are your microgreens grown without pesticides? My daughter has a sensitivity.',
    3,
    false,
  ],
  [
    'Marcus Delgado',
    'mdelgado@example.test',
    '',
    'Existing Order',
    'My bag was missing the pea shoots I paid for. Could you hold them for next market?\n\nThanks,\nMarcus',
    9,
    false,
  ],
  [
    'Hill Country Bistro',
    'kitchen@bistro.example.test',
    '+18305550177',
    'Wholesale / Business Inquiry',
    'We would like a standing weekly order of radish and pea microgreens. Do you offer wholesale pricing?',
    26,
    false,
  ],
  [
    'Janet Okonkwo',
    'janet@example.test',
    '+12105550199',
    'Market / Pickup Question',
    'Will you be at the market this Saturday even with the rain forecast?',
    50,
    true,
  ],
  [
    'Tom Whitaker',
    'tom@example.test',
    '',
    'General Question',
    'Do you sell grow kits or seeds for home growing?',
    75,
    true,
  ],
  [
    'Alicia Ramirez',
    'alicia@example.test',
    '+12105550123',
    'Existing Order',
    'Can I change my pickup from Saturday to Wednesday?',
    120,
    true,
  ],
  [
    'Priscilla Huang',
    'phuang@example.test',
    '',
    'Product Question',
    'How long do your microgreens stay fresh in the fridge?',
    170,
    false,
  ],
  [
    'Boerne ISD Nutrition',
    'nutrition@isd.example.test',
    '+18305550110',
    'Wholesale / Business Inquiry',
    'Could you supply microgreens for a farm-to-school tasting day?',
    240,
    true,
  ],
  [
    'Daniel Fischer',
    'dfischer@example.test',
    '+12105550164',
    'Other',
    'Your spicy mix has completely changed my sandwiches!',
    330,
    true,
  ],
  [
    'Grace Mbeki',
    'grace@example.test',
    '',
    'Market / Pickup Question',
    'Do you accept SNAP/EBT at your market booth?',
    410,
    true,
  ],
  [
    'Samuel Ortiz',
    'sam@example.test',
    '+12105550188',
    'Existing Order',
    'My receipt shows I was charged twice for broccoli microgreens.',
    520,
    true,
  ],
  [
    'Emily Carter',
    'emily@example.test',
    '',
    'General Question',
    'Are you hiring any seasonal help?',
    700,
    true,
  ],
];

export function createFixtureContactApi(): VendorContactApi {
  const rows: ContactSubmission[] = samples.map(
    ([full_name, email, phone, subject, message, hoursAgo, read], i) => {
      const created = Date.now() - hoursAgo * 3600_000;
      return {
        id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        full_name,
        email,
        phone,
        subject,
        message,
        order_number: subject === 'Existing Order' ? `MR-${10480 - i}` : '',
        created_at: new Date(created).toISOString(),
        read_at: read ? new Date(created + 7200_000).toISOString() : null,
      };
    },
  );
  const find = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error('Contact submission not found');
    return row;
  };
  return {
    list: async (skip = 0, status?: ContactStatusFilter) => {
      const matching = rows.filter(
        (r) => !status || (status === 'read') === !!r.read_at,
      );
      return structuredClone({
        items: matching.slice(skip, skip + 20),
        totalItems: matching.length,
        allItems: rows.length,
        unreadItems: rows.filter((r) => !r.read_at).length,
        recentItems: rows.filter(
          (r) => Date.parse(r.created_at) >= Date.now() - 7 * 86400_000,
        ).length,
      });
    },
    detail: async (id: string) => structuredClone(find(id)),
    read: async (id: string, read: boolean) => {
      const row = find(id);
      row.read_at = read ? (row.read_at ?? new Date().toISOString()) : null;
      return structuredClone(row);
    },
  };
}
