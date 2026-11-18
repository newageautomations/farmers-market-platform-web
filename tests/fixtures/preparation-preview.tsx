import { createRoot } from 'react-dom/client';
import { PreparationPage } from '../../apps/admin/src/preparation/PreparationPage';
import '@market/ui/styles.css';
import '../../apps/admin/src/market.css';
import type { PreparationView } from '@market/api';
const view: PreparationView = {
  occurrence: {
    id: 10,
    marketName: 'Boerne market',
    startsAt: '2026-11-13T15:00:00Z',
    endsAt: '2026-11-13T19:00:00Z',
    timezone: 'America/Chicago',
    venue: 'Town square',
    status: 'scheduled',
  },
  privateMarket: false,
  participation: 'confirmed',
  revision: 0,
  sourceVersion: 'preview',
  tasks: [
    {
      id: 'a',
      title: 'Pack signs and table covers',
      completedAt: null,
      createdAt: '',
      updatedAt: '',
    },
  ],
  templates: [
    {
      id: 1,
      revision: 0,
      name: 'Weekly essentials',
      titles: ['Charge card reader', 'Pack signs'],
    },
  ],
  appliedTemplates: [],
  readiness: 'Not Reported',
  confirmedAt: null,
  editable: true,
  assignments: [],
  vendors: [
    {
      vendorId: 1,
      name: 'Manna Roots',
      participation: 'confirmed',
      readiness: 'Needs Reconfirmation',
      confirmedAt: null,
      booths: ['B1'],
      invoices: [
        { status: 'OPEN', totalMinor: 1000, paidMinor: 0, currency: 'USD' },
      ],
      rentals: [],
    },
  ],
};
createRoot(document.getElementById('root')!).render(
  <main className="admin-content" style={{ padding: '24px' }}>
    <PreparationPage
      scope={
        new URLSearchParams(location.search).has('manager')
          ? 'MANAGER'
          : 'VENDOR'
      }
      occurrenceId={10}
      api={{ read: async () => view, command: async () => view }}
      canManage
      selector={<p>Boerne market · November 13</p>}
    />
  </main>,
);
