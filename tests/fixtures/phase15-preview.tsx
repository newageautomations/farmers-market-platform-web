/** Local browser qualification fixture. Never imported by the application entry point. */
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import { type ApplicationDefinition, type RentalDetails } from '@market/api';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { data } from './phase15-data';

const operations = structuredClone(data);
const submission = operations.submissions![0]!;
for (const label of [
  'Years in business',
  'Product description',
  'Growing practices',
  'Certifications',
  'Insurance',
  'Experience at markets',
  'Equipment',
  'Setup requirements',
  'Pickup arrangements',
  'Food handling',
  'Staffing',
  'Availability',
]) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  submission.definitionSnapshot.questions.push({
    id,
    section: 'Products',
    label,
    help: '',
    type: 'LONG_TEXT',
    required: false,
    hidden: false,
    options: [],
  });
  submission.answers[id] =
    'Details supplied by the applicant for the market manager to review before assigning a booth.';
}
const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketApplications',
  'ManageOwnMarketApplications',
  'ReadOwnMarketLayouts',
  'ManageOwnMarketLayouts',
];
const service = createFixtureMarketService(context);
service.phase14 = {
  vendorAssignments: async () => [],
  read: async () => structuredClone(operations),
  command: async (command) => {
    const version = operations.versions?.find((v) => v.id === command.id);
    if (command.action === 'SAVE_APPLICATION' && version) {
      version.definition = structuredClone(
        command.data.definition as ApplicationDefinition,
      );
      version.revision++;
      operations.templates!.find((t) => t.id === version.templateId)!.name =
        String(command.data.name);
      return structuredClone(version);
    }
    if (command.action === 'CREATE_APPLICATION') {
      const id = (operations.versions?.length ?? 0) + 1;
      operations.templates!.push({
        ...operations.templates![0]!,
        id,
        name: String(command.data.name),
      });
      const row = {
        ...operations.versions![0]!,
        id,
        templateId: id,
        revision: 1,
      };
      operations.versions!.push(row);
      return row;
    }
    if (command.action === 'SAVE_RENTAL') {
      operations.rentals ??= [];
      const row = {
        id: operations.rentals.length + 1,
        revision: 1,
        marketId: 1,
        details: command.data.details as RentalDetails,
      };
      operations.rentals.push(row);
      return row;
    }
    throw new Error(
      'This local qualification fixture only implements the commands used by Phase 15 browser tests.',
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
