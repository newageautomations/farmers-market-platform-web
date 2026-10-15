/** Synthetic local qualification only. Never imported by production. */
import { createRoot } from 'react-dom/client';
import '@market/ui/styles.css';
import { MarketMap, baseSpace, type Drawing } from '@market/ui';
import { AdminShell } from '../../apps/admin/src/AdminShell';
import { LayoutEditor } from '../../apps/admin/src/market/phase14/Layouts';
import {
  createFixtureMarketService,
  marketFixtureContext,
} from '../../apps/admin/src/market/fixture';
import { boothData } from './phase15b-data';
import type {
  LayoutVersion,
  MarketOperationsData,
  MapElement,
  SpaceDetails,
} from '@market/api';
const stored = localStorage.getItem('phase15c-data');
const data: MarketOperationsData = stored
  ? JSON.parse(stored)
  : structuredClone(boothData);
const persist = () =>
  localStorage.setItem('phase15c-data', JSON.stringify(data));
const context = marketFixtureContext();
context.permissions = [
  ...context.permissions,
  'ReadOwnMarketLayouts',
  'ManageOwnMarketLayouts',
  'ReadOwnMarketAssignments',
  'ManageOwnMarketAssignments',
  'ReadOwnMarketBilling',
  'OperateOwnMarketDay',
];
const service = createFixtureMarketService(context);
service.phase14 = {
  vendorAssignments: async () => [],
  read: async () => structuredClone(data),
  command: async (c) => {
    const d = c.data;
    if (c.action === 'CREATE_LAYOUT') {
      const id = Math.max(...data.layoutVersions!.map((v) => v.id)) + 1;
      const v: LayoutVersion = {
        id,
        marketId: 1,
        revision: 1,
        layoutId: id,
        versionNumber: 1,
        status: 'DRAFT',
        definition: {
          pixelsPerFoot: 10,
          areas: [{ id: 'main', name: 'Main area' }],
          elements: [],
        },
      };
      data.layouts!.push({
        id,
        marketId: 1,
        revision: 1,
        name: String(d.name),
      });
      data.layoutVersions!.push(v);
      persist();
      return structuredClone(v);
    }
    if (c.action === 'SAVE_LAYOUT') {
      const v = data.layoutVersions!.find((v) => v.id === c.id)!;
      if (v.status !== 'DRAFT' || v.revision !== c.expectedRevision)
        throw new Error('Immutable or stale version');
      v.definition = structuredClone((d as unknown as Drawing).definition);
      v.revision++;
      data.layouts!.find((l) => l.id === v.layoutId)!.name = String(d.name);
      data.spaces = data.spaces!.filter((s) => s.layoutVersionId !== v.id);
      for (const [elementId, details] of Object.entries(
        d.spaces as Record<string, SpaceDetails>,
      ))
        data.spaces.push({
          id: data.spaces.length + 1,
          marketId: 1,
          revision: 1,
          layoutVersionId: v.id,
          elementId,
          details,
        });
      persist();
      return structuredClone(v);
    }
    if (c.action === 'PUBLISH_LAYOUT') {
      const v = data.layoutVersions!.find((v) => v.id === c.id)!;
      if (v.status !== 'DRAFT' || v.revision !== c.expectedRevision)
        throw new Error('Immutable or stale version');
      v.status = 'PUBLISHED';
      v.revision++;
      persist();
      return structuredClone(v);
    }
    if (c.action === 'CLONE_LAYOUT') {
      const prior = data.layoutVersions!.find((v) => v.id === c.id)!,
        id = Math.max(...data.layoutVersions!.map((v) => v.id)) + 1,
        v = {
          ...structuredClone(prior),
          id,
          revision: 1,
          versionNumber: prior.versionNumber + 1,
          status: 'DRAFT' as const,
        };
      data.layoutVersions!.push(v);
      data.spaces!.push(
        ...data
          .spaces!.filter((s) => s.layoutVersionId === prior.id)
          .map((s) => ({
            ...structuredClone(s),
            id: data.spaces!.length + id,
            layoutVersionId: id,
          })),
      );
      persist();
      return v;
    }
    if (c.action === 'APPROVE_OCCURRENCE') {
      const approval = {
        ...data.approvals![0]!,
        id: data.approvals!.length + 1,
        directoryId: Number(d.directoryId),
      };
      data.approvals!.push(approval);
      persist();
      return approval;
    }
    if (c.action === 'ASSIGN') {
      const business = data.directory!.find(
          (v) => v.id === Number(d.directoryId),
        )!,
        space = data.spaces!.find((s) => s.id === Number(d.spaceId))!,
        existing = data.assignments!.find((a) => a.id === c.id);
      const assignment = {
        ...data.assignments![0]!,
        id: existing?.id ?? data.assignments!.length + 1,
        revision: (existing?.revision ?? 0) + 1,
        directoryId: business.id,
        approvalId: data.approvals!.find((a) => a.directoryId === business.id)!
          .id,
        spaceId: space.id,
        spaceSnapshot: space.details,
        businessSnapshot: business.contact,
      };
      data.assignments = [
        ...data.assignments!.filter((a) => a.id !== assignment.id),
        assignment,
      ];
      persist();
      return assignment;
    }
    if (c.action === 'DAY_UPDATE') {
      const a = data.assignments!.find((a) => a.id === c.id);
      if (a) Object.assign(a, d);
      persist();
      return a;
    }
    throw new Error('Command outside Phase15C synthetic qualification');
  },
};
const root = createRoot(document.getElementById('root')!);
if (location.pathname === '/public') {
  const v = data.layoutVersions![0]!,
    spaces = data
      .spaces!.filter((s) => s.layoutVersionId === v.id)
      .map((s) => ({
        elementId: s.elementId,
        label: s.details.label,
        widthFeet: s.details.widthFeet,
        depthFeet: s.details.depthFeet,
        amenities: s.details.amenities,
        vendor:
          data.assignments!.find((a) => a.spaceId === s.id)?.businessSnapshot ??
          null,
      }));
  root.render(
    <main className="ops-public">
      <h1>Market map</h1>
      <MarketMap definition={v.definition} spaces={spaces} />
    </main>,
  );
} else if (location.pathname === '/performance') {
  const elements: MapElement[] = Array.from({ length: 500 }, (_, i) => ({
    id: `synthetic-${i}`,
    areaId: 'main',
    type: i < 200 ? 'SPACE' : 'RECTANGLE',
    x: (i % 25) * 130,
    y: Math.floor(i / 25) * 130,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: i,
    text: i < 200 ? `P${i + 1}` : '',
    fill: i < 200 ? '#e0ebd9' : '#d4dccf',
  }));
  const definition = {
    pixelsPerFoot: 10,
    areas: [{ id: 'main', name: 'Synthetic venue' }],
    elements,
  };
  const spaces = elements.slice(0, 200).map((e, i) => ({
    id: i + 1,
    marketId: 1,
    revision: 1,
    layoutVersionId: 99,
    elementId: e.id,
    details: baseSpace(e.text),
  }));
  const v: LayoutVersion = {
    id: 99,
    marketId: 1,
    revision: 1,
    layoutId: 99,
    versionNumber: 1,
    status: 'DRAFT',
    definition,
  };
  root.render(
    <main>
      <h1>Synthetic 500-object fixture</h1>
      <LayoutEditor
        version={v}
        data={{
          ...data,
          spaces,
          layouts: [
            { id: 99, marketId: 1, revision: 1, name: 'Synthetic venue' },
          ],
        }}
        canManage
        run={async () => undefined}
      />
    </main>,
  );
} else
  root.render(
    <AdminShell
      context={context}
      marketService={service}
      onLogout={() => undefined}
    />,
  );
