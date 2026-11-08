import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import {
  boothRow,
  createMapLegend,
  applyMapStyle,
  insertArrangement,
  mapArrangements,
  mapStylePresets,
} from '../packages/ui/src/map/smart-design';
import type { Drawing } from '../packages/ui/src/map/model';

// Exercise the actual existing server validator and public serializer without
// bootstrapping Vendure or connecting to any database. No backend files change.
test('smart objects survive the existing backend validator and public JSON projection', () => {
  let id = 0;
  const nextId = () => `smart-${++id}`;
  let d: Drawing = {
    definition: {
      pixelsPerFoot: 10,
      areas: [{ id: 'main', name: 'Main' }],
      elements: [],
    },
    spaces: {},
  };
  d = boothRow(
    d,
    'main',
    { x: 0, y: 0 },
    {
      count: 4,
      widthFeet: 12,
      depthFeet: 8,
      gapFeet: 2,
      orientation: 'horizontal',
      prefix: 'Q',
      start: 1,
      rotation: 30,
    },
    nextId,
  ).drawing;
  for (const key of Object.keys(mapArrangements) as Array<
    keyof typeof mapArrangements
  >)
    d = insertArrangement(d, 'main', { x: 500, y: 500 }, key, nextId).drawing;
  d = createMapLegend(
    d,
    'main',
    { x: 900, y: 500 },
    'Market guide',
    nextId,
  ).drawing;
  const drawings = [
    d,
    ...Object.keys(mapStylePresets).map((key) =>
      applyMapStyle(d, key as keyof typeof mapStylePresets),
    ),
  ];
  const backend = resolve('../farmers-market-platform');
  const result = spawnSync(
    process.execPath,
    [
      '-r',
      resolve(backend, 'node_modules/ts-node/register/transpile-only'),
      '-e',
      `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const model = require(process.argv[1]);
    const drawings = JSON.parse(fs.readFileSync(0, 'utf8'));
    for (const drawing of drawings) {
      const saved = model.validateLayout(drawing.definition);
      for (const space of Object.values(drawing.spaces)) model.validateSpace(space);
      const published = JSON.parse(JSON.stringify(model.publicLayout(saved)));
      model.validateLayout(published);
      assert.equal(published.elements.length, saved.elements.length);
      const legend = published.elements.find(e => e.text.startsWith('{{map-legend}}\\n'));
      assert.ok(legend);
      assert.equal(legend.text, '{{map-legend}}\\nMarket guide');
      assert.equal(legend.labelBackground, saved.elements.find(e => e.id === legend.id).labelBackground);
      for (const e of published.elements) {
        const source = saved.elements.find(s => s.id === e.id);
        for (const key of ['x', 'y', 'width', 'height', 'rotation', 'fill', 'assetId', 'fontFamily']) assert.equal(e[key], source[key]);
        assert.equal(e.groupId, undefined);
      }
    }
    process.stdout.write('Validated ' + drawings.length + ' save/publish JSON contracts');
  `,
      resolve(backend, 'src/plugins/market-operations/model.ts'),
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        TS_NODE_PROJECT: resolve(
          backend,
          'test/market-operations/tsconfig.json',
        ),
      },
      input: JSON.stringify(drawings),
    },
  );
  expect(result.error, result.error?.message).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('Validated 4 save/publish JSON contracts');
}, 35000);
