import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertGalleryEnvironment } from '../scripts/ui-gallery-policy';
import {
  candidatesForCategory,
  categories,
  readCandidates,
  stateDescription,
} from './fixtures/ui-component-gallery/candidates';
import {
  additionalCandidates,
  additionalCategoryCounts,
} from './fixtures/ui-component-gallery/additional-candidates';

const fixture = resolve('tests/fixtures/ui-component-gallery');
const allowed = { NODE_ENV: 'development', UI_COMPONENT_GALLERY: 'local-only' };
describe('isolated UI component gallery', () => {
  it('requires explicit development opt-in and rejects every build/preview mode', () => {
    expect(() => assertGalleryEnvironment('dev', allowed)).not.toThrow();
    expect(() => assertGalleryEnvironment('sync', allowed)).not.toThrow();
    for (const command of ['build', 'preview']) {
      expect(() => assertGalleryEnvironment(command, allowed)).toThrow(
        'forbidden',
      );
    }
    for (const NODE_ENV of ['production', 'test', undefined]) {
      expect(() =>
        assertGalleryEnvironment('dev', { ...allowed, NODE_ENV }),
      ).toThrow();
    }
    for (const UI_COMPONENT_GALLERY of ['true', '', undefined]) {
      expect(() =>
        assertGalleryEnvironment('dev', { ...allowed, UI_COMPONENT_GALLERY }),
      ).toThrow();
    }
  });

  it.each(['build', 'preview'])(
    'rejects the real Astro %s command even with the opt-in set',
    (command) => {
      let output = '';
      try {
        execFileSync(
          process.execPath,
          [
            resolve('node_modules/astro/bin/astro.mjs'),
            command,
            '--root',
            fixture,
          ],
          {
            encoding: 'utf8',
            timeout: 20000,
            env: { ...process.env, ...allowed, ASTRO_TELEMETRY_DISABLED: '1' },
            stdio: 'pipe',
          },
        );
      } catch (error) {
        const failure = error as {
          stdout?: string;
          stderr?: string;
          status?: number;
        };
        expect(failure.status).not.toBe(0);
        output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
      }
      expect(output).toContain('Build and preview are forbidden');
      expect(existsSync(resolve(fixture, 'dist'))).toBe(false);
    },
    25000,
  );

  it('rejects the production launcher before it can start a server', () => {
    expect(() =>
      execFileSync(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/dev-ui-gallery.ts',
          '--enable-local-gallery',
        ],
        {
          env: { ...process.env, NODE_ENV: 'production' },
          timeout: 10000,
          stdio: 'pipe',
        },
      ),
    ).toThrow();
  });

  it('preserves all 31 original IDs and covers all 48 requested IDs without duplicating MOB', () => {
    const expected = Object.entries({
      BTN: 5,
      INP: 3,
      SEL: 7,
      CRD: 5,
      DLG: 2,
      DSH: 2,
      SID: 2,
      HDR: 3,
      MOB: 2,
    }).flatMap(([prefix, count]) =>
      Array.from(
        { length: count },
        (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`,
      ),
    );
    const requested = Object.entries(additionalCategoryCounts).flatMap(
      ([prefix, count]) =>
        Array.from(
          { length: count },
          (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`,
        ),
    );
    expect(requested).toHaveLength(48);
    const candidates = readCandidates();
    expect(candidates.map((c) => c.id).sort()).toEqual(
      [...new Set([...expected, ...requested])].sort(),
    );
    expect(candidates).toHaveLength(77);
    const audit = readFileSync(
      'docs/UI_COMPONENTS/UI_COMPONENT_AUDIT.md',
      'utf8',
    );
    for (const candidate of candidates) {
      expect(audit).toContain(candidate.id);
      expect(existsSync(candidate.source.replace(/:\d+$/, ''))).toBe(true);
      expect(candidate.limitation).not.toBe('');
    }
  });

  it('adds exactly 13 dropdown categories while keeping the original DSH comparisons', () => {
    expect(Object.keys(categories)).toEqual([
      'BTN',
      'INP',
      'SEL',
      'CRD',
      'DLG',
      'DSH',
      ...Object.keys(additionalCategoryCounts),
    ]);
    for (const [category, count] of Object.entries(additionalCategoryCounts)) {
      const candidates = candidatesForCategory(
        category as keyof typeof categories,
      );
      expect(candidates).toHaveLength(count);
      expect(candidates.every((c) => c.id.startsWith(`${category}-`))).toBe(
        true,
      );
    }
    expect(candidatesForCategory('DSH').map((c) => c.id)).toEqual([
      'DSH-01',
      'DSH-02',
      'SID-01',
      'SID-02',
      'HDR-01',
      'HDR-02',
      'HDR-03',
      'MOB-01',
      'MOB-02',
    ]);
  });

  it('discloses imported, partial and evidence-only specimens and unsupported states', () => {
    expect(Object.keys(additionalCandidates)).toHaveLength(46);
    for (const [id, presentation] of Object.entries(additionalCandidates)) {
      const candidate = readCandidates().find((c) => c.id === id)!;
      expect(candidate.rendering).toBe(presentation.rendering);
      expect(candidate.css).toBeTruthy();
      expect(candidate.route).toBeTruthy();
      expect(candidate.limitation).toBeTruthy();
      for (const state of [
        'default',
        'disabled',
        'loading',
        'error',
        'selected',
        'expanded',
      ] as const)
        expect(stateDescription(id, state)).toBeTruthy();
    }
    expect(additionalCandidates['PGH-04']?.rendering).toBe('evidence');
    expect(stateDescription('FIL-01', 'error')).toContain('validation');
    expect(stateDescription('TBL-02', 'selected')).toContain(
      'no sorting controller',
    );
    expect(stateDescription('TAB-01', 'selected')).toContain(
      'no initial-selected',
    );
    const sample = readFileSync(
      resolve(fixture, 'src/components/AdditionalSample.tsx'),
      'utf8',
    );
    expect(sample).not.toMatch(/\b(fetch|useRead|create\w*Api)\s*\(/);
    expect(sample).toContain('canManage={false}');
    const index = readFileSync(
      resolve(fixture, 'src/pages/index.astro'),
      'utf8',
    );
    expect(index).toContain('data-candidate-details');
    expect(index).toContain('sandbox="allow-scripts allow-same-origin"');
  });

  it('has no production route, config or entry-point references', () => {
    function sourceFiles(directory: string): string[] {
      return readdirSync(directory, { withFileTypes: true }).flatMap(
        (entry) => {
          const path = resolve(directory, entry.name);
          if (entry.isDirectory())
            return ['dist', '.astro', 'node_modules'].includes(entry.name)
              ? []
              : sourceFiles(path);
          return /\.(tsx?|astro|mjs|json|html|css)$/.test(entry.name)
            ? [path]
            : [];
        },
      );
    }
    for (const file of [...sourceFiles('apps'), ...sourceFiles('packages')]) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /ui-component-gallery|dev-ui-gallery|UI_COMPONENT_GALLERY/,
      );
    }
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
      workspaces: string[];
      scripts: Record<string, string>;
    };
    expect(manifest.workspaces).toEqual(['apps/*', 'packages/*']);
    expect(manifest.scripts.build).not.toContain('gallery');
    for (const directory of ['apps/storefront/dist', 'apps/admin/dist']) {
      if (!existsSync(directory)) continue;
      for (const file of sourceFiles(directory)) {
        expect(readFileSync(file, 'utf8'), file).not.toMatch(
          /UI component comparison gallery|ui-component-gallery|UI_COMPONENT_GALLERY|\/sample\/(base|admin|storefront|customer)/,
        );
      }
    }
  });
});
