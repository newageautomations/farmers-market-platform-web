import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import { OccurrenceMap } from '../../apps/admin/src/market/OccurrenceMap';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { managerData } from './market-dashboard-data';
import '@market/ui/styles.css';
import '../../apps/admin/src/market/dashboard.css';
import type { MapDefinition, SpaceDetails } from '@market/api';
import { MarketApplication } from '../../apps/storefront/src/components/MarketApplication';

const data = managerData();
data.layouts!.push({ ...data.layouts![0]!, id: 2, name: 'South Lot' });
data.layoutVersions!.push({
  ...structuredClone(data.layoutVersions![0]!),
  id: 2,
  layoutId: 2,
});
data.spaces!.push({
  ...structuredClone(data.spaces![0]!),
  id: 2,
  layoutVersionId: 2,
});
if (new URLSearchParams(location.search).has('crowded')) {
  const booth = data.spaces![0]!;
  const vendor = data.directory![0]!;
  const approval = {
    marketId: 1,
    revision: 1,
    occurrenceId: 101,
    submissionId: null,
    checkIn: 'NOT_CHECKED_IN' as const,
    attendance: 'NOT_RECORDED' as const,
    managerNotes: '',
  };
  data.spaces = Array.from({ length: 12 }, (_, i) => ({
    ...structuredClone(booth),
    id: i + 1,
    elementId: `booth-${i + 1}`,
    details: { ...booth.details, label: `A${i + 1}` },
  }));
  data.layoutVersions![0]!.definition.elements = data.spaces.map(
    (space, i) => ({
      ...data.layoutVersions![0]!.definition.elements[0]!,
      id: space.elementId,
      x: 100 + (i % 4) * 130,
      y: 100 + Math.floor(i / 4) * 130,
    }),
  );
  data.directory = Array.from({ length: 12 }, (_, i) => ({
    ...structuredClone(vendor),
    id: i + 1,
    contact: { ...vendor.contact, businessName: `Vendor ${i + 1}` },
  }));
  data.approvals = data.directory.map((vendor) => ({
    ...approval,
    id: vendor.id,
    directoryId: vendor.id,
  }));
  data.assignments = [];
  data.invoices = [];
  data.daySummary = {
    expected: 12,
    assigned: 0,
    unassigned: 12,
    checkedIn: 0,
    notCheckedIn: 12,
    attendance: { NOT_RECORDED: 12 },
    rentalQuantities: { Table: 2 },
    notes: 0,
  };
  data.billingSummary = {
    paid: 0,
    open: 0,
    draft: 0,
    complimentary: 0,
    pastDue: 0,
    byCurrency: {},
  };
}
const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketAssignments',
  'ManageOwnMarketAssignments',
  'ManageOwnMarketLayouts',
  'ReadOwnMarketLayouts',
  'OperateOwnMarketDay',
];
const service = createFixtureMarketService(context);
service.phase14 = {
  read: async () => structuredClone(data),
  vendorAssignments: async () => [],
  command: async (command) => {
    const plan = data.plans![0]!;
    if (command.action === 'DAY_UPDATE') {
      const approval = data.approvals!.find((a) => a.id === command.id)!;
      Object.assign(approval, command.data);
      approval.revision++;
      return approval;
    }
    if (command.action === 'CLONE_LAYOUT') {
      const prior = data.layoutVersions!.find((v) => v.id === command.id)!;
      const original = data.layouts!.find((l) => l.id === prior.layoutId)!;
      const layoutId = Math.max(...data.layouts!.map((l) => l.id)) + 1;
      const id = Math.max(...data.layoutVersions!.map((v) => v.id)) + 1;
      data.layouts!.push({
        ...original,
        id: layoutId,
        name: `Copy - ${original.name}`,
      });
      const version = {
        ...structuredClone(prior),
        id,
        layoutId,
        occurrenceId: null,
        status: 'DRAFT' as const,
        versionNumber: 1,
      };
      data.layoutVersions!.push(version);
      for (const space of data.spaces!.filter(
        (s) => s.layoutVersionId === prior.id,
      ))
        data.spaces!.push({
          ...structuredClone(space),
          id: Math.max(...data.spaces!.map((s) => s.id)) + 1,
          layoutVersionId: id,
        });
      return version;
    }
    if (command.action === 'ARCHIVE_LAYOUT') {
      const layout = data.layouts!.find((l) => l.id === command.id)!;
      layout.deletedAt = new Date().toISOString();
      layout.revision++;
      data.archivedLayouts = [...(data.archivedLayouts ?? []), layout];
      data.layouts = data.layouts!.filter((l) => l.id !== command.id);
      return { id: command.id, archived: true };
    }
    if (command.action === 'UNARCHIVE_LAYOUT') {
      const layout = data.archivedLayouts!.find((l) => l.id === command.id)!;
      layout.deletedAt = null;
      layout.revision++;
      data.layouts!.push(layout);
      data.archivedLayouts = data.archivedLayouts!.filter(
        (l) => l.id !== command.id,
      );
      return layout;
    }
    if (command.action === 'PUBLISH_LAYOUT') {
      const version = data.layoutVersions!.find((v) => v.id === command.id)!;
      version.status = 'PUBLISHED';
      version.revision++;
      return version;
    }
    if (command.action === 'SAVE_LAYOUT') {
      const prior = data.layoutVersions!.find((v) => v.id === command.id)!;
      const id = Math.max(...data.layoutVersions!.map((v) => v.id)) + 1;
      const version = {
        ...prior,
        id,
        occurrenceId: command.data.occurrenceId ? 101 : null,
        versionNumber: prior.versionNumber + 1,
        definition: command.data.definition as MapDefinition,
      };
      data.layoutVersions!.push(version);
      for (const old of data.spaces!.filter(
        (s) => s.layoutVersionId === prior.id,
      )) {
        const spaceId = Math.max(...data.spaces!.map((s) => s.id)) + 1;
        data.spaces!.push({
          ...old,
          id: spaceId,
          layoutVersionId: id,
          details: (command.data.spaces as Record<string, SpaceDetails>)[
            old.elementId
          ]!,
        });
        data
          .assignments!.filter(
            (a) => a.spaceId === old.id && a.occurrenceId === 101,
          )
          .forEach((a) => {
            a.spaceId = spaceId;
          });
      }
      if (command.data.occurrenceId) {
        plan.layoutVersionId = id;
        plan.revision++;
      } else {
        prior.status = 'RETIRED';
        data.layouts!.find((l) => l.id === prior.layoutId)!.name = String(
          command.data.name,
        );
      }
      return version;
    }
    if (command.action === 'SET_PLAN') {
      plan.layoutVersionId = Number(command.data.layoutVersionId);
      plan.revision++;
      plan.state = 'DRAFT';
      data.assignments = [];
      data.allocations = [];
      return plan;
    }
    throw new Error('Unsupported preview command');
  },
};
function Preview() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  if (path === '/apply')
    return (
      <MarketApplication
        application={{
          slug: 'season',
          name: 'Season application',
          versionId: 1,
          definition: {
            sections: ['Business'],
            questions: [
              {
                id: 'name',
                section: 'Business',
                label: 'Business name',
                help: '',
                type: 'SHORT_TEXT',
                required: true,
                hidden: false,
                options: [],
              },
              {
                id: 'optional',
                section: 'Business',
                label: 'Website',
                help: '',
                type: 'URL',
                required: false,
                hidden: false,
                options: [],
              },
            ],
            occurrenceIds: [101],
            rentalIds: [],
          },
          occurrences: data.occurrences,
          rentals: [],
        }}
      />
    );
  if (
    path.startsWith('/market/layouts') ||
    path.endsWith('/edit-layout') ||
    path.startsWith('/market/assignments') ||
    path.startsWith('/market/day')
  )
    return (
      <AdminShell
        context={context}
        marketService={service}
        onLogout={() => {}}
      />
    );
  return (
    <div className="market-dashboard">
      <main className="admin-content" id="main" tabIndex={-1}>
        <h1>Market occurrence</h1>
        <OccurrenceMap key={path} service={service} occurrenceId="101" />
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
