/** Explicit local qualification data, never imported by the production entry point. */
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { boothData } from './phase15b-data';
const data = structuredClone(boothData);
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
service.phase14 = {
  vendorAssignments: async () => [],
  read: async () => structuredClone(data),
  command: async (command) => {
    if (command.action === 'APPROVE_OCCURRENCE') {
      const approval = {
        ...data.approvals![0]!,
        id: data.approvals!.length + 1,
        directoryId: Number(command.data.directoryId),
      };
      data.approvals!.push(approval);
      return approval;
    }
    if (command.action === 'ASSIGN') {
      const business = data.directory!.find(
          (d) => d.id === Number(command.data.directoryId),
        )!,
        space = data.spaces!.find(
          (s) => s.id === Number(command.data.spaceId),
        )!;
      const approval = data.approvals!.find(
        (a) => a.directoryId === business.id,
      )!;
      const existing = data.assignments!.find((a) => a.id === command.id);
      const assignment = {
        ...data.assignments![0]!,
        id: existing?.id ?? data.assignments!.length + 1,
        revision: (existing?.revision ?? 0) + 1,
        directoryId: business.id,
        approvalId: approval.id,
        spaceId: space.id,
        spaceSnapshot: space.details,
        businessSnapshot: business.contact,
      };
      data.assignments = [
        ...data.assignments!.filter((a) => a.id !== assignment.id),
        assignment,
      ];
      return assignment;
    }
    throw new Error(
      'Command is outside this explicit browser qualification fixture.',
    );
  },
};
createRoot(document.getElementById('root')!).render(
  <AdminShell
    context={context}
    marketService={service}
    onLogout={() => undefined}
  />,
);
