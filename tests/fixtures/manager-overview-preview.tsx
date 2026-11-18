import { createRoot } from 'react-dom/client';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { managerOverviewData } from './manager-overview-data';
import '@market/ui/styles.css';

/** Market Overview with booths, invoices, applications and documents. */
const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketApplications',
  'ReadOwnMarketAssignments',
  'ReadOwnMarketBilling',
  'ReadOwnDocuments',
];
const service = createFixtureMarketService(context);
const data = managerOverviewData();
service.phase14 = data.operations;
service.notifications = {
  summary: async () => data.compliance,
} as never;
service.checklist = async (id) => data.checklist(id);
let saved: unknown = null;
service.dashboardLayout = {
  read: async () => saved as never,
  save: async (value) => {
    saved = value;
  },
};
createRoot(document.getElementById('root')!).render(
  <AdminShell context={context} marketService={service} onLogout={() => {}} />,
);
