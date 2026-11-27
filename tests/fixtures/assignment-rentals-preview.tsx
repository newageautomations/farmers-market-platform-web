/**
 * Explicit local qualification data, never imported by the production entry
 * point: the phase15b Assignments fixture plus rental options, an accepted
 * rental allocation, an application rental request and a draft invoice, so the
 * booth panel's rental and invoice sections render.
 */
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import type { MarketOperationsData } from '@market/api';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { boothData } from './phase15b-data';

const data: MarketOperationsData = structuredClone(boothData);
const audit = {
  createdAt: '2027-01-01T00:00:00.000Z',
  updatedAt: '2027-01-01T00:00:00.000Z',
  revision: 1,
};
data.rentals = [
  'Folding Table',
  'Market Tent',
  'Chair',
  'Extension Cable',
  'Tent Weights',
].map((name, i) => ({
  ...audit,
  id: i + 1,
  marketId: 1,
  details: {
    name,
    description: '',
    enabled: true,
    priceMinor: 500 + i * 250,
    currency: 'USD',
    defaultQuantity: 0,
    maxQuantity: 4,
    capacity: 10,
    requiredAmenity: null,
    sortOrder: i,
  },
})) as unknown as MarketOperationsData['rentals'];
const snapshot = (optionId: number, quantity: number) => ({
  optionId,
  name: data.rentals![optionId - 1]!.details.name,
  quantity,
  unitMinor: data.rentals![optionId - 1]!.details.priceMinor,
  currency: 'USD',
  requiredAmenity: null,
});
data.allocations = [
  [1, 2],
  [2, 1],
].map(([optionId, quantity], i) => ({
  ...audit,
  id: i + 1,
  occurrenceId: data.assignments![0]!.occurrenceId,
  assignmentId: data.assignments![0]!.id,
  optionId,
  quantity,
  snapshot: snapshot(optionId!, quantity!),
})) as unknown as MarketOperationsData['allocations'];
data.invoices = data.invoices!.map((i) => ({
  ...i,
  status: 'DRAFT',
  billingStatus: 'DRAFT',
  paidMinor: 0,
})) as unknown as MarketOperationsData['invoices'];

// The vendor asked for electricity, so booths without it prompt before assigning.
data.approvals = data.approvals!.map((a) => ({
  ...a,
  requirements: {
    widthFeet: 1,
    depthFeet: 1,
    electricity: true,
    vehicle: false,
    foodTruck: false,
  },
}));
/** Commands received, for inspecting the fixture from the browser console. */
const commands: unknown[] = [];
(window as unknown as { assignmentCommands: unknown[] }).assignmentCommands =
  commands;
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
    commands.push(structuredClone(command));
    if (command.action !== 'ASSIGN')
      throw new Error(
        'Command is outside this explicit browser qualification fixture.',
      );
    return {};
  },
};
createRoot(document.getElementById('root')!).render(
  <AdminShell
    context={context}
    marketService={service}
    onLogout={() => undefined}
  />,
);
