import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationFields, MarketMap } from '@market/ui';
import type { ApplicationDefinition, MapDefinition } from '@market/api';
import { drawingHistory } from '../apps/admin/src/market/phase14/Layouts';
import { Applications } from '../apps/admin/src/market/phase14/Applications';
const definition: ApplicationDefinition = {
  sections: ['Business'],
  questions: [
    {
      id: 'email',
      semantic: 'email',
      section: 'Business',
      label: 'Contact email',
      help: 'Used for your application',
      type: 'EMAIL',
      required: true,
      hidden: false,
      options: [],
    },
  ],
  occurrenceIds: [],
  rentalIds: [],
};
const map: MapDefinition = {
  pixelsPerFoot: 10,
  areas: [{ id: 'main', name: 'Main Street' }],
  elements: [
    {
      id: 'a',
      areaId: 'main',
      type: 'SPACE',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: 0,
      text: 'A12',
      fill: '#e0ebd9',
    },
  ],
};
test('application email retains semantic input and associated help', () => {
  render(<ApplicationFields definition={definition} answers={{}} />);
  const email = screen.getByLabelText('Contact email (required)');
  expect(email).toHaveAttribute('type', 'email');
  expect(email).toBeRequired();
  expect(email).toHaveAccessibleDescription('Used for your application');
});
test('historical answers render their snapshotted label and value', () => {
  render(
    <ApplicationFields
      definition={definition}
      answers={{ email: 'grower@test.invalid' }}
      readOnly
    />,
  );
  expect(screen.getByText('Contact email')).toBeInTheDocument();
  expect(screen.getByText('grower@test.invalid')).toBeInTheDocument();
});
test('public map has a semantic searchable Vendor alternative and selection', async () => {
  const user = userEvent.setup();
  render(
    <MarketMap
      definition={map}
      spaces={[
        {
          elementId: 'a',
          label: 'A12',
          widthFeet: 10,
          depthFeet: 10,
          amenities: ['ELECTRICITY'],
          vendor: {
            businessName: 'Local Orchard',
            description: 'Apples',
            category: 'Fruit',
          },
        },
      ]}
    />,
  );
  await user.type(screen.getByLabelText('Search Vendor or booth'), 'orchard');
  const booth = screen
    .getByText('A12', { selector: 'summary span' })
    .closest('details')!;
  await user.click(screen.getByText('A12', { selector: 'summary span' }));
  expect(booth).toHaveAttribute('open');
  expect(screen.getByText('Apples')).toBeInTheDocument();
});
test('map viewport operations do not mutate saved geometry', async () => {
  const before = structuredClone(map);
  const user = userEvent.setup();
  render(<MarketMap definition={map} />);
  await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  await user.click(screen.getByRole('button', { name: 'Fit map' }));
  expect(map).toEqual(before);
});
test('editor undo and redo restore both geometry and physical details', () => {
  const present = { definition: map, spaces: {} };
  const initial = { present, past: [], future: [] };
  const changed = {
    ...present,
    definition: {
      ...map,
      elements: map.elements.map((e) => ({ ...e, x: 500 })),
    },
  };
  const edited = drawingHistory(initial, { type: 'EDIT', value: changed });
  const undone = drawingHistory(edited, { type: 'UNDO' });
  expect(undone.present).toEqual(present);
  expect(drawingHistory(undone, { type: 'REDO' }).present).toEqual(changed);
});
test('published application offers a new version and preserves typed inspector', async () => {
  const user = userEvent.setup();
  render(
    <Applications
      data={{
        marketId: 1,
        providerState: 'NOT_CONFIGURED',
        fundsFlowPolicy: 'NOT_CONFIGURED',
        occurrences: [],
        templates: [
          {
            id: 1,
            marketId: 1,
            revision: 1,
            name: 'Season application',
            slug: 'opaque',
            visibility: 'PUBLIC',
            advertised: true,
          },
        ],
        versions: [
          {
            id: 1,
            marketId: 1,
            revision: 1,
            templateId: 1,
            versionNumber: 1,
            status: 'PUBLISHED',
            definition,
          },
        ],
      }}
      run={async () => undefined}
      canManage
    />,
  );
  await user.click(
    screen.getByRole('button', { name: 'Version 1 · published' }),
  );
  expect(
    screen.getByRole('button', { name: 'Create new draft version' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Save draft' }),
  ).not.toBeInTheDocument();
});
