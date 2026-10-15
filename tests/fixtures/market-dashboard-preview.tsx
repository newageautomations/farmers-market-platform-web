import { createRoot } from 'react-dom/client';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { managerData } from './market-dashboard-data';
import '@market/ui/styles.css';

const data = managerData();
const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketApplications',
  'ManageOwnMarketApplications',
  'ReadOwnMarketAssignments',
  'ReadOwnMarketLayouts',
  'ManageOwnMarketLayouts',
];
const service = createFixtureMarketService(context);
service.phase14 = {
  read: async () => structuredClone(data),
  vendorAssignments: async () => [],
  command: async (command) => {
    if (command.action === 'REVIEW_APPLICATION') {
      Object.assign(data.submissions![0]!, command.data);
      data.submissions![0]!.revision++;
    }
    if (command.action === 'SAVE_DIRECTORY') {
      Object.assign(
        data.directory!.find((d) => d.id === command.id)!,
        command.data,
      );
    }
    return { id: command.id ?? 1 };
  },
};
createRoot(document.getElementById('root')!).render(
  <AdminShell
    context={context}
    marketService={service}
    onLogout={() => {}}
    controls={
      <button type="button" onClick={() => location.reload()}>
        Refresh Workspace
      </button>
    }
  />,
);
