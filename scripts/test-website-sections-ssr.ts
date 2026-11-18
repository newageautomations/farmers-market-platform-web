import React from 'react';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { resolve, dirname, extname, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire, registerHooks } from 'node:module';
import ts from 'typescript';
import {
  fixtureCatalog,
  resolveFixture,
} from '@market/storefront-core/fixtures';
import type { StorefrontContext } from '@market/storefront-core';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import {
  editorialHomepageTarget,
  harvestExpandedSectionManifest,
  harvestOriginalSections,
  harvestHomepageTarget,
  defaultContact,
  defaultFindUs,
  defaultFaq,
  defaultPolicies,
  type WebsiteEditorialPage,
  type MarketWebsitePage,
  editorialHomepageComposition,
  effectiveWebsiteBlocks,
  createWebsiteBlock,
  withWebsiteBlocks,
  editorialMarketStarterSettings,
  createTextSection,
  createWebsiteSection,
  farmhouseDefaults,
  farmhouseHomepageTarget,
  defaultStorefrontAppearance,
  type FarmhouseSettings,
} from '@market/theme/storefront';

// Compile the actual Astro components in memory and temporary modules, without a browser,
// server, network calls, database access or retained verification artifacts.
const temporary = mkdtempSync(resolve('tests/.website-sections-'));
let hooks: ReturnType<typeof registerHooks> | undefined;
try {
  const require = createRequire(import.meta.url);
  const astroRequire = createRequire(require.resolve('astro/package.json'));
  const { transform } = (await import(
    pathToFileURL(astroRequire.resolve('@astrojs/compiler-rs')).href
  )) as typeof import('@astrojs/compiler-rs');
  const modules = new Map<string, string>();
  function compile(input: string): string {
    const filename = resolve(input);
    const existing = modules.get(filename);
    if (existing) return existing;
    const output = join(temporary, `component-${modules.size}.mjs`);
    modules.set(filename, output);
    const source = readFileSync(filename, 'utf8')
      .replace(/^import ['"][^'"]*\.css['"];?$/gm, '')
      .replace(
        /^import (\w+) from ['"][^'"]*\.css\?url['"];?$/gm,
        'const $1 = "";',
      )
      .replaceAll('import.meta.env.DEV', 'true');
    const code =
      extname(filename) === '.astro'
        ? transform(source, {
            filename: filename.replaceAll('\\', '/'),
            internalURL: 'astro/compiler-runtime',
            resultScopedSlot: true,
            resolvePath: (specifier) => specifier,
          }).code
        : source;
    const transpiled = ts
      .transpileModule(code, {
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
        },
      })
      .outputText.replace(
        /^import ["'].*\?astro&type=style[^"']*["'];?\n/gm,
        '',
      );
    writeFileSync(
      output,
      transpiled.replace(
        /(from\s+['"])(\.[^'"]+)(['"])/g,
        (_match, before, specifier: string, after) => {
          let target = resolve(dirname(filename), specifier);
          if (!extname(target))
            target += existsSync(target + '.ts') ? '.ts' : '.tsx';
          if (
            target.endsWith('.astro') ||
            target.endsWith('section-renderers.ts')
          )
            target = compile(target);
          return before + pathToFileURL(target).href + after;
        },
      ),
    );
    return output;
  }
  const { default: Home } = await import(
    pathToFileURL(
      compile('apps/storefront/src/components/modern-farmhouse/Home.astro'),
    ).href
  );
  Object.assign(globalThis, { React });
  const container = await AstroContainer.create();
  hooks = registerHooks({
    resolve(specifier, context, next) {
      if (/\.css(?:\?url)?$/.test(specifier))
        return {
          url: 'data:text/javascript,export default ""',
          shortCircuit: true,
        };
      if (specifier === 'astro:react:opts')
        return {
          url: 'data:text/javascript,export default {}',
          shortCircuit: true,
        };
      return next(specifier, context);
    },
  });
  const { default: reactRenderer } = await import('@astrojs/react/server.js');
  container.addServerRenderer({
    name: '@astrojs/react',
    renderer: reactRenderer,
  });
  container.addClientRenderer({
    name: '@astrojs/react',
    entrypoint: '@astrojs/react/client.js',
  });
  const settings: FarmhouseSettings = farmhouseDefaults();
  const section = createTextSection('text-ssr', farmhouseHomepageTarget);
  section.content = {
    heading: 'SSR <script>alert(1)</script>',
    body: 'First paragraph.\nSecond paragraph.',
  };
  section.presentation.alignment = 'right';
  settings.sections.splice(1, 0, section);
  settings.sections.push({
    ...structuredClone(section),
    id: 'text-hidden',
    visible: false,
  });
  const image = createWebsiteSection(
    'image-with-text',
    'image-with-text-ssr',
    farmhouseHomepageTarget,
  );
  image.content.heading = 'Image <img src=x onerror=alert(1)>';
  image.content.image = {
    assetId: '501',
    url: 'http://localhost:3000/assets/farm.jpg',
    alt: 'Farm " onload="alert(1)',
  };
  image.content.label = 'Read <script>story</script>';
  image.presentation.imageSide = 'right';
  image.presentation.imageSize = 'small';
  const banner = createWebsiteSection(
    'cta-banner',
    'cta-banner-ssr',
    farmhouseHomepageTarget,
  );
  banner.content.heading = 'Banner <script>alert(2)</script>';
  banner.content.body = 'Seasonal news.\nFrom the farm.';
  settings.sections.splice(2, 0, image, banner);
  settings.sections.push(
    { ...structuredClone(image), id: 'image-with-text-hidden', visible: false },
    { ...structuredClone(banner), id: 'cta-banner-hidden', visible: false },
  );
  const context: StorefrontContext = {
    ...resolveFixture('vendor.localhost')!,
    appearance: {
      ...defaultStorefrontAppearance,
      about: { ...defaultStorefrontAppearance.about, enabled: true },
      theme: 'modern-farmhouse',
      template: { id: 'modern-farmhouse', version: 2, settings },
    },
  };
  const html = await container.renderToString(Home, {
    props: { context },
    locals: { storefront: context },
  });
  assert.ok(
    html.indexOf('farmhouse:cinematic') < html.indexOf('farmhouse:text-ssr'),
  );
  assert.ok(
    html.indexOf('farmhouse:text-ssr') < html.indexOf('farmhouse:discovery'),
  );
  assert.ok(html.includes('data-alignment="right"'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('First paragraph.\nSecond paragraph.'));
  assert.ok(!html.includes('farmhouse:text-hidden'));
  assert.ok(!html.includes('astro-island'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(
    html.indexOf('farmhouse:text-ssr') <
      html.indexOf('farmhouse:image-with-text-ssr'),
  );
  assert.ok(
    html.indexOf('farmhouse:image-with-text-ssr') <
      html.indexOf('farmhouse:cta-banner-ssr'),
  );
  assert.ok(
    html.indexOf('farmhouse:cta-banner-ssr') <
      html.indexOf('farmhouse:discovery'),
  );
  assert.ok(
    html.includes('data-image-side="right"') &&
      html.includes('data-image-size="small"'),
  );
  assert.ok(html.includes('data-background="ink"'));
  assert.ok(html.includes('src="http://localhost:3000/assets/farm.jpg"'));
  assert.ok(html.includes('alt="Farm &quot; onload=&quot;alert(1)"'));
  assert.ok(
    html.includes('href="/products"') && html.includes('href="/about"'),
  );
  assert.ok(html.includes('Banner &lt;script&gt;alert(2)&lt;/script&gt;'));
  assert.ok(html.includes('Image &lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(
    !html.includes('farmhouse:image-with-text-hidden') &&
      !html.includes('farmhouse:cta-banner-hidden'),
  );
  // Disabled informational pages suppress their CTA rather than silently redirecting it.
  context.appearance!.about.enabled = false;
  image.content.destination = '/about';
  const disabled = await container.renderToString(Home, {
    props: { context },
    locals: { storefront: context },
  });
  assert.ok(!disabled.includes('Read &lt;script&gt;story&lt;/script&gt;'));
  const { default: EditorialHome } = await import(
    pathToFileURL(
      compile('apps/storefront/src/components/editorial-market/Home.astro'),
    ).href
  );
  const editorialSettings = editorialMarketStarterSettings();
  editorialSettings.assets.desktopHero = {
    assetId: '501',
    url: 'http://localhost:3000/assets/hero.png',
    alt: '',
  };
  editorialSettings.assets.desktopFooter = {
    assetId: '502',
    url: 'http://localhost:3000/assets/impact.png',
    alt: '',
  };
  const editorialContext: StorefrontContext = {
    ...context,
    appearance: {
      ...defaultStorefrontAppearance,
      theme: 'editorial-market',
      template: {
        id: 'editorial-market',
        version: 1,
        settings: editorialSettings,
      },
    },
  };
  const renderEditorial = () =>
    container.renderToString(EditorialHome, {
      props: { context: editorialContext },
      locals: { storefront: editorialContext },
    });
  const legacyEditorial = await renderEditorial();
  const nativeIds = [
    'hero',
    'category-showcase-homepage',
    'product-showcase-homepage',
    'impact',
  ];
  for (let i = 1; i < nativeIds.length; i++)
    assert.ok(
      legacyEditorial.indexOf(`editorial:${nativeIds[i - 1]}`) <
        legacyEditorial.indexOf(`editorial:${nativeIds[i]}`),
    );
  assert.ok(
    !/class="em-home"[^>]*data-spacing=/.test(legacyEditorial) &&
      !legacyEditorial.includes('data-typography-scale='),
  );
  assert.ok(
    legacyEditorial.includes('src="http://localhost:3000/assets/hero.png"') &&
      legacyEditorial.includes('src="http://localhost:3000/assets/impact.png"'),
  );
  assert.ok(
    legacyEditorial.includes('harvest-showcase') &&
      legacyEditorial.includes('harvest-category-showcase'),
  );
  assert.ok(
    legacyEditorial.includes('em-section-heading') &&
      legacyEditorial.includes('href="/products"'),
  );
  const originals = editorialHomepageComposition(editorialSettings);
  editorialSettings.composition = [
    originals[0]!,
    section,
    originals[1]!,
    image,
    originals[2]!,
    banner,
    originals[3]!,
    { ...section, id: 'text-hidden', visible: false },
  ];
  editorialSettings.homepageDesign = {
    spacing: 'spacious',
    typographyScale: 'expressive',
  };
  for (const variant of ['standard', 'featured', 'framed'] as const) {
    for (const reusable of [section, image, banner])
      reusable.presentation.variant = variant;
    // These settings drive two different static adapter maps, not a shared DOM tree.
    const editorialHtml = await renderEditorial();
    const farmhouseHtml = await container.renderToString(Home, {
      props: { context },
      locals: { storefront: context },
    });
    const order = [
      'hero',
      section.id,
      'category-showcase-homepage',
      image.id,
      'product-showcase-homepage',
      banner.id,
      'impact',
    ];
    for (let i = 1; i < order.length; i++)
      assert.ok(
        editorialHtml.indexOf(`editorial:${order[i - 1]}`) <
          editorialHtml.indexOf(`editorial:${order[i]}`),
      );
    for (const [output, prefix] of [
      [editorialHtml, 'editorial'],
      [farmhouseHtml, 'farmhouse'],
    ] as const) {
      assert.ok(output.includes(`data-variant="${variant}"`));
      assert.ok(output.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
      assert.ok(output.includes('alt="Farm &quot; onload=&quot;alert(1)"'));
      assert.ok(
        !output.includes(`${prefix}:text-hidden`) &&
          !output.includes('astro-island'),
      );
      assert.ok(!output.includes('href="/about"')); // disabled destinations
    }
    assert.ok(
      editorialHtml.includes('em-text-columns') &&
        editorialHtml.includes('em-image-spread') &&
        editorialHtml.includes('em-callout-action'),
    );
    assert.ok(
      !editorialHtml.includes('farmhouse-editorial') &&
        !farmhouseHtml.includes('em-image-spread'),
    );
    assert.ok(
      editorialHtml.includes('data-spacing="spacious"') &&
        editorialHtml.includes('data-typography-scale="expressive"'),
    );
  }
  // Phase D: actual theme section adapters render the same bounded blocks differently.
  const composed = withWebsiteBlocks(image, [
    ...effectiveWebsiteBlocks(image),
    {
      ...createWebsiteBlock('eyebrow', 'block-ssr-intro'),
      type: 'eyebrow',
      content: { text: 'Block <script>intro</script>' },
      presentation: { size: 'large' },
    },
    {
      ...createWebsiteBlock('paragraph', 'block-ssr-hidden'),
      type: 'paragraph',
      visible: false,
      content: { text: 'Invisible block copy' },
      presentation: {},
    },
    {
      ...createWebsiteBlock('button', 'block-ssr-button'),
      type: 'button',
      content: {
        label: 'Browse <script>shop</script>',
        destination: '/products',
      },
      presentation: { style: 'secondary' },
    },
  ]);
  composed.presentation = {
    ...composed.presentation,
    columnRatio: '40-60',
    verticalAlignment: 'bottom',
    spacing: 'compact',
  };
  const outputs: string[] = [];
  for (const theme of ['modern-farmhouse', 'editorial-market']) {
    const { default: ImageText } = await import(
      pathToFileURL(
        compile(`apps/storefront/src/components/${theme}/ImageWithText.astro`),
      ).href
    );
    const html = await container.renderToString(ImageText, {
      props: {
        section: composed,
        context: theme === 'modern-farmhouse' ? context : editorialContext,
      },
    });
    outputs.push(html);
    assert.ok(
      html.includes('data-column-ratio="40-60"') &&
        html.includes('data-vertical-alignment="bottom"') &&
        html.includes('data-internal-spacing="compact"'),
    );
    assert.ok(
      html.includes('Block &lt;script&gt;intro&lt;/script&gt;') &&
        html.includes('Browse &lt;script&gt;shop&lt;/script&gt;'),
    );
    assert.ok(
      html.indexOf('Block &lt;script&gt;intro') <
        html.indexOf('Browse &lt;script&gt;shop'),
    );
    assert.ok(
      !html.includes('Invisible block copy') &&
        !html.includes('astro-island') &&
        !html.includes('href="/about"'),
    );
  }
  assert.ok(
    outputs[0]!.includes('farmhouse-block-eyebrow') &&
      !outputs[0]!.includes('em-block-eyebrow'),
  );
  assert.ok(
    outputs[1]!.includes('em-block-eyebrow') &&
      !outputs[1]!.includes('farmhouse-block-eyebrow'),
  );
  const defaultCategory = editorialSettings.composition?.find(
    (s) => s.id === 'category-showcase-homepage',
  );
  if (defaultCategory && 'type' in defaultCategory)
    defaultCategory.visible = false;
  image.visible = false;
  const hiddenEditorial = await renderEditorial();
  assert.ok(
    !hiddenEditorial.includes('editorial:category-showcase-homepage') &&
      !hiddenEditorial.includes(`editorial:${image.id}`),
  );

  // Phase E: native Harvest fallback and all real page routes, without network or a browser.
  const { default: HarvestHome } = await import(
    pathToFileURL(compile('apps/storefront/src/components/VendorHome.astro'))
      .href
  );
  const harvestContext: StorefrontContext = {
    ...resolveFixture('vendor.localhost')!,
    appearance: {
      ...structuredClone(defaultStorefrontAppearance),
      homepage: {
        ...defaultStorefrontAppearance.homepage,
        story: 'Legacy native story',
      },
      about: {
        enabled: true,
        title: 'Our Story',
        content: 'Existing story content',
      },
    },
  };
  const renderHarvest = () =>
    container.renderToString(HarvestHome, {
      props: { context: harvestContext },
      locals: { storefront: harvestContext },
    });
  const legacyHarvest = await renderHarvest();
  const nativeOrder = (html: string) =>
    Array.from(
      html.matchAll(/data-editor-section="(hero|featured|about|closing)"/g),
      (m) => m[1],
    );
  assert.deepEqual(nativeOrder(legacyHarvest), harvestOriginalSections);
  harvestContext.appearance!.harvestComposition = harvestOriginalSections.map(
    (id) => ({ id }),
  );
  assert.equal(await renderHarvest(), legacyHarvest);
  const harvestText = createTextSection(
    'text-harvest-ssr',
    harvestHomepageTarget,
  );
  harvestText.content.heading = 'Harvest <script>story</script>';
  harvestContext.appearance!.harvestComposition = [
    { id: 'hero' },
    harvestText,
    { id: 'about' },
    { id: 'featured' },
    composed,
    { id: 'closing' },
  ];
  const harvestHtml = await renderHarvest();
  assert.deepEqual(nativeOrder(harvestHtml), [
    'hero',
    'about',
    'featured',
    'closing',
  ]);
  assert.ok(
    harvestHtml.indexOf('harvest:text-harvest-ssr') <
      harvestHtml.indexOf('data-editor-section="about"'),
  );
  assert.ok(
    harvestHtml.includes('Legacy native story') &&
      harvestHtml.includes('Harvest &lt;script&gt;story&lt;/script&gt;'),
  );
  assert.ok(
    harvestHtml.includes('Block &lt;script&gt;intro') &&
      !harvestHtml.includes('Invisible block copy'),
  );
  // Vendor routes; market-only pages are covered by the market website checks.
  type VendorPage = Exclude<WebsiteEditorialPage, MarketWebsitePage>;
  const routeMarkers: Record<VendorPage, string> = {
    about: 'story:legacy-story',
    contact: 'contact-form',
    faq: 'faq-questions',
    policies: 'policies-list',
    'find-us': 'find-markets',
    products: 'shop-catalog',
  };
  for (const current of [harvestContext, context, editorialContext]) {
    current.appearance!.about = {
      enabled: true,
      title: 'Our Story',
      content: 'Existing story content',
    };
    current.appearance!.contact = {
      ...structuredClone(defaultContact),
      enabled: true,
    };
    current.appearance!.findUs = {
      ...structuredClone(defaultFindUs),
      enabled: true,
    };
    current.appearance!.faq = { ...structuredClone(defaultFaq), enabled: true };
    current.appearance!.policies = {
      ...structuredClone(defaultPolicies),
      enabled: true,
    };
    current.appearance!.pageSections = {};
    for (const page of Object.keys(routeMarkers) as VendorPage[]) {
      const before = {
        ...structuredClone(composed),
        id: `image-with-text-before-${page}`,
      };
      const after = {
        ...structuredClone(banner),
        id: `cta-banner-after-${page}`,
      };
      current.appearance!.pageSections[page] = {
        before: [before],
        ...(page === 'products' ? {} : { after: [after] }),
      };
      const { default: Route } = await import(
        pathToFileURL(
          compile(
            `apps/storefront/src/pages/${page === 'products' ? 'products/index' : page}.astro`,
          ),
        ).href
      );
      const options = {
        locals: { storefront: current },
        request: new Request(
          `http://vendor.localhost/${page}?availability=all`,
        ),
      };
      const html = await container.renderToString(Route, options);
      const start = html.indexOf(`page:${page}:before:${before.id}`);
      const native = html.indexOf(
        page === 'products'
          ? current.appearance!.theme === 'modern-farmhouse'
            ? 'data-farmhouse-catalog'
            : current.appearance!.theme === 'editorial-market'
              ? 'class="em-shop-content"'
              : 'class="shop-catalog"'
          : routeMarkers[page],
      );
      assert.ok(
        start >= 0 && native > start,
        `${current.appearance!.theme} ${page}: editorial content must precede native content`,
      );
      if (page === 'products' && current.appearance!.theme !== 'harvest') {
        const hero = html.indexOf(
          current.appearance!.theme === 'modern-farmhouse'
            ? 'data-editor-section="farmhouse:shop-settings"'
            : 'data-editor-section="editorial:shop-settings"',
        );
        assert.ok(
          hero >= 0 && hero < start,
          'Shop hero/header must precede editorial sections',
        );
      }
      if (page !== 'products')
        assert.ok(html.indexOf(`page:${page}:after:${after.id}`) > native);
      assert.ok(
        html.includes('Block &lt;script&gt;intro') &&
          !html.includes('Invisible block copy'),
      );
      // Compositions never enable an optional route.
      if (page !== 'products') {
        if (page === 'find-us') current.appearance!.findUs!.enabled = false;
        else if (page === 'about') current.appearance!.about.enabled = false;
        else current.appearance![page]!.enabled = false;
        const disabled = await container.renderToString(Route, options);
        assert.ok(
          !disabled.includes(`page:${page}:before:`) &&
            !disabled.includes(`page:${page}:after:`),
        );
      }
    }
  }

  // Default page heroes use the actual shared Image with Text renderer and stay deleted on reload.
  for (const base of [harvestContext, context, editorialContext]) {
    for (const page of [
      'about',
      'contact',
      'find-us',
      'faq',
      'policies',
    ] as const) {
      const current = structuredClone(base);
      const appearance = current.appearance!;
      appearance.pageSections = {};
      appearance.about = { ...appearance.about, enabled: true };
      appearance.contact = {
        ...structuredClone(defaultContact),
        enabled: true,
      };
      appearance.findUs = { ...structuredClone(defaultFindUs), enabled: true };
      appearance.faq = { ...structuredClone(defaultFaq), enabled: true };
      appearance.policies = {
        ...structuredClone(defaultPolicies),
        enabled: true,
      };
      const { default: Route } = await import(
        pathToFileURL(compile(`apps/storefront/src/pages/${page}.astro`)).href
      );
      const options = {
        request: new Request(`http://vendor.localhost:4321/${page}`),
        locals: {
          storefront: current,
          editorPreview: {
            config: appearance,
            path: `/${page}`,
            scroll: 0,
            id: 'page-hero',
          },
        },
      };
      const html = await container.renderToString(Route, options);
      const marker = `page:${page}:before:image-with-text-page-hero-${page}`;
      assert.ok(
        html.includes(marker),
        `${current.appearance?.theme} ${page} default hero`,
      );
      if (page !== 'about')
        assert.ok(
          !html.includes(
            `data-editor-section="${page === 'find-us' ? 'find' : page}-intro"`,
          ) || page === 'policies',
        );
      const ending =
        page === 'about'
          ? 'story-cta'
          : page === 'find-us'
            ? 'find-cta'
            : `${page}-cta`;
      assert.equal(
        (html.match(new RegExp(`data-editor-section="${ending}"`, 'g')) ?? [])
          .length,
        1,
        'One closing invitation per page',
      );
      const before = createWebsiteSection(
        'text',
        `text-closing-before-${page}`,
        {
          theme: appearance.theme,
          themeVersion: appearance.template?.version ?? 1,
          page,
        },
      );
      const after = createWebsiteSection('text', `text-closing-after-${page}`, {
        theme: appearance.theme,
        themeVersion: appearance.template?.version ?? 1,
        page,
      });
      for (const closingPosition of [0, 1, 2, 3]) {
        appearance.pageSections = {
          [page]: { before: [before], after: [after], closingPosition },
        };
        const moved = await container.renderToString(Route, options);
        const closingAt = moved.indexOf(`data-editor-section="${ending}"`);
        const first = moved.indexOf(`page:${page}:before:${before.id}`),
          last = moved.indexOf(`page:${page}:after:${after.id}`);
        assert.ok(closingAt >= 0 && first >= 0 && last >= 0);
        assert.equal(closingAt < first, closingPosition === 0);
        assert.equal(closingAt > last, closingPosition === 3);
        const nativeAt = moved.indexOf(routeMarkers[page]);
        assert.ok(nativeAt >= 0, `Expected native content for ${page}`);
        assert.equal(closingAt < nativeAt, closingPosition <= 1);
        assert.equal(
          (
            moved.match(new RegExp(`data-editor-section="${ending}"`, 'g')) ??
            []
          ).length,
          1,
        );
      }
      appearance.pageSections = { [page]: { before: [], after: [] } };
      const deleted = await container.renderToString(Route, options);
      assert.ok(
        !deleted.includes(marker),
        'Explicit deletion must suppress default hero',
      );
    }
  }

  for (const theme of ['home', 'modern-farmhouse', 'editorial-market']) {
    const { default: Overlay } = await import(
      pathToFileURL(
        compile(`apps/storefront/src/components/${theme}/ImageWithText.astro`),
      ).href
    );
    const overlaySection = {
      ...composed,
      presentation: { ...composed.presentation, imageSide: 'background' },
    };
    const html = await container.renderToString(Overlay, {
      props: {
        section: overlaySection,
        context:
          theme === 'home'
            ? harvestContext
            : theme === 'modern-farmhouse'
              ? context
              : editorialContext,
      },
    });
    assert.ok(
      html.includes('data-image-layout="overlay"') &&
        html.includes('Block &lt;script&gt;intro'),
    );
  }
  // Phase F: exercise the actual dispatcher and all Harvest layouts using static Astro SSR.
  const { default: Dispatcher } = await import(
    pathToFileURL(
      compile('apps/storefront/src/components/WebsiteSections.astro'),
    ).href
  );
  for (const [libraryTarget, libraryContext, libraryPrefix] of [
    [harvestHomepageTarget, harvestContext, 'harvest'],
    [farmhouseHomepageTarget, context, 'farmhouse'],
    [editorialHomepageTarget, editorialContext, 'editorial'],
  ] as const) {
    for (const definition of Object.values(harvestExpandedSectionManifest)) {
      const section = createWebsiteSection(
        definition.type,
        `${definition.type}-ssr-f`,
        libraryTarget,
      );
      section.content.heading = 'Harvest <script>escaped</script>';
      if (section.type === 'image-banner') {
        section.content.image = {
          assetId: '501',
          url: 'http://localhost:3000/assets/farm.jpg',
          alt: 'Farm " onload="bad',
        };
        section.content.label = 'Our story';
        section.content.destination = '/about';
      }
      if (section.type === 'image-gallery')
        section.content.images = [
          {
            id: 'image-first',
            image: {
              assetId: '501',
              url: 'http://localhost:3000/assets/first.jpg',
              alt: 'First <photo>',
            },
            caption: 'First <caption>',
          },
          {
            id: 'image-second',
            image: {
              assetId: '502',
              url: 'http://localhost:3000/assets/second.jpg',
              alt: '',
            },
            caption: 'Second caption',
          },
        ];
      const layouts =
        section.type === 'image-banner'
          ? ['photo-overlay', 'split-editorial', 'minimal-centered']
          : section.type === 'image-gallery'
            ? ['grid', 'mosaic', 'strip', 'carousel']
            : section.type === 'feature-grid'
              ? ['standard', 'highlighted', 'bordered']
              : section.type === 'product-showcase'
                ? ['grid', 'featured-product', 'compact-row', 'carousel']
                : ['cards', 'photo-tiles', 'compact'];
      for (const layout of layouts) {
        const key = section.type === 'feature-grid' ? 'cardStyle' : 'layout';
        const rendered = await container.renderToString(Dispatcher, {
          props: {
            context: libraryContext,
            sections: [
              {
                ...section,
                presentation: { ...section.presentation, [key]: layout },
              },
            ],
            target: libraryTarget,
            prefix: libraryPrefix,
          },
          locals: {
            storefront: libraryContext,
            editorPreview: {
              config: libraryContext.appearance!,
              path: '/',
              scroll: 0,
              id: 'phase-f',
            },
          },
        });
        assert.ok(
          rendered.includes(
            `data-editor-section="${libraryPrefix}:${section.id}"`,
          ) &&
            rendered.includes('Harvest &lt;script&gt;escaped&lt;/script&gt;'),
        );
        assert.ok(
          rendered.includes(
            `data-${key === 'cardStyle' ? 'card-style' : 'layout'}="${layout}"`,
          ),
        );
        assert.ok(
          rendered.includes(`data-library-theme="${libraryTarget.theme}"`),
        );
        assert.ok(
          !rendered.includes('<astro-island'),
          `${section.type} ${layout}: ${rendered.slice(0, 1500)}`,
        );
        if (layout === 'carousel' && section.type !== 'product-showcase')
          assert.ok(
            rendered.includes('Previous photographs') &&
              rendered.includes('Next photographs') &&
              rendered.includes('Photo carousel'),
          );
        if (section.type === 'image-gallery')
          assert.ok(
            rendered.indexOf('first.jpg') < rendered.indexOf('second.jpg') &&
              rendered.includes('First &lt;caption&gt;'),
          );
      }
      const hidden = await container.renderToString(Dispatcher, {
        props: {
          context: libraryContext,
          sections: [{ ...section, visible: false }],
          target: libraryTarget,
          prefix: libraryPrefix,
        },
      });
      assert.ok(!hidden.includes(section.id));
    }
  }
  // Network is stubbed at the transport boundary. Real request-local catalog/taxonomy utilities still run.
  const publicContext: StorefrontContext = {
    ...harvestContext,
    source: 'backend',
    channelToken: 'vendor-channel',
    subjectId: '20',
    storefrontId: '10',
  };
  publicContext.appearance!.categoryPresentation = {
    '701': {
      position: 0,
      visible: true,
      imageAssetId: '501',
      image: 'http://localhost:3000/assets/category.jpg',
    },
  };
  const fixture = fixtureCatalog({ search: '', sort: 'asc', skip: 0, take: 3 });
  const names = ['Owned harvest box', 'Owned apples', 'Foreign product'];
  const catalog = {
    ...fixture,
    items: fixture.items.map((item, index) => ({
      ...item,
      id: String(index + 1),
      name: names[index]!,
    })),
  };
  const taxonomy = {
    totalProducts: 2,
    products: catalog.items.slice(0, 2).map((p) => ({
      productId: p.id,
      variantIds: p.variants.map((v) => Number(v.id)),
      primaryCategoryId: '701',
      categoryIds: [701],
      tagIds: [],
    })),
    taxonomy: {
      categories: [
        {
          id: '701',
          name: 'Vegetables',
          code: 'vegetables',
          count: 2,
          position: 0,
          parentId: null,
          pathIds: ['701'],
          pathNames: ['Vegetables'],
          pathCodes: ['vegetables'],
        },
      ],
      tags: [],
    },
  };
  const calls: Array<{
    query: string;
    variables: { options: { filter: { id: { in: string[] } } } };
  }> = [];
  const commerceHtml = new Map<string, string>();
  const originalFetch = globalThis.fetch;
  let missing = false;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    calls.push(body);
    assert.equal(
      new Headers(init?.headers).get('vendure-token'),
      'vendor-channel',
    );
    assert.ok(
      !body.query.includes('mutation'),
      'Preview must remain read-only',
    );
    assert.equal(new Headers(init?.headers).get('cookie'), null);
    const data = body.query.includes('VendorStorefrontTaxonomy')
      ? {
          vendorStorefrontTaxonomy: missing
            ? {
                ...taxonomy,
                products: [],
                taxonomy: { categories: [], tags: [] },
              }
            : taxonomy,
        }
      : body.query.includes('VendorProducts')
        ? { products: { items: catalog.items, totalItems: 3 } }
        : body.query.includes('VendorPreorderOccurrences')
          ? { vendorPreorderOccurrences: [] }
          : null;
    assert.ok(data, body.query);
    return new Response(JSON.stringify({ data }), {
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const product = createWebsiteSection(
      'product-showcase',
      'product-showcase-authority',
      harvestHomepageTarget,
    );
    product.content.productIds = ['2', '3', '1', '999'];
    const category = createWebsiteSection(
      'category-showcase',
      'category-showcase-authority',
      harvestHomepageTarget,
    );
    category.content.categoryIds = ['999', '701'];
    const renderShowcases = (sections: unknown[]) =>
      container.renderToString(Dispatcher, {
        props: {
          context: publicContext,
          sections,
          target: harvestHomepageTarget,
          prefix: 'harvest',
        },
        request: new Request('http://vendor.localhost:4321'),
        locals: {
          storefront: publicContext,
          shopApiUrl: 'http://catalog.local.test/shop-api',
          editorPreview: {
            config: harvestContext.appearance!,
            path: '/',
            scroll: 0,
            id: 'phase-f',
          },
        },
      });
    product.presentation.layout = 'carousel';
    product.presentation.visibleImages = 2;
    const resolved = await renderShowcases([product, category]);
    assert.ok(
      resolved.includes('Product carousel') &&
        resolved.includes('Previous products') &&
        resolved.includes('data-visible-images="2"'),
    );
    assert.ok(
      resolved.includes('Owned apples') &&
        resolved.includes('Owned harvest box') &&
        resolved.indexOf('Owned apples') <
          resolved.indexOf('Owned harvest box'),
      'Owned products should preserve the selected order',
    );
    assert.ok(
      !resolved.includes('Foreign product') &&
        !resolved.includes('category=999'),
    );
    assert.ok(
      resolved.includes('category=701') &&
        resolved.includes('category.jpg') &&
        resolved.includes('$10.00'),
    );
    assert.ok(!resolved.includes('astro-island'));
    const productCall = calls.find((c) => c.query.includes('VendorProducts'))!;
    assert.deepEqual(productCall.variables.options.filter.id.in, ['2', '1']);
    assert.equal(
      calls.filter((c) => c.query.includes('VendorStorefrontTaxonomy')).length,
      1,
      'Share taxonomy within one request',
    );
    for (const target of [
      harvestHomepageTarget,
      farmhouseHomepageTarget,
      editorialHomepageTarget,
    ]) {
      const base =
        target.theme === 'harvest'
          ? harvestContext
          : target.theme === 'modern-farmhouse'
            ? context
            : editorialContext;
      const themedContext = {
        ...publicContext,
        appearance: {
          ...base.appearance!,
          categoryPresentation: publicContext.appearance!.categoryPresentation,
        },
      };
      for (const section of [product, category]) {
        const layouts =
          section.type === 'product-showcase'
            ? ['grid', 'featured-product', 'compact-row', 'carousel']
            : ['cards', 'photo-tiles', 'compact'];
        for (const layout of layouts) {
          const html = await container.renderToString(Dispatcher, {
            props: {
              context: themedContext,
              sections: [
                {
                  ...section,
                  presentation: { ...section.presentation, layout },
                },
              ],
              target,
              prefix: target.theme,
            },
            request: new Request('http://vendor.localhost:4321'),
            locals: {
              storefront: themedContext,
              shopApiUrl: 'http://catalog.local.test/shop-api',
              editorPreview: {
                config: themedContext.appearance,
                path: '/',
                scroll: 0,
                id: 'theme-parity',
              },
            },
          });
          assert.ok(html.includes(`data-library-theme="${target.theme}"`));
          assert.ok(
            !html.includes('Foreign product') && !html.includes('category=999'),
          );
          if (section.type === 'product-showcase') {
            assert.ok(html.includes('Owned apples') && html.includes('$10.00'));
            assert.ok(
              html.includes(
                target.theme === 'modern-farmhouse'
                  ? 'farmhouse-product-card'
                  : target.theme === 'editorial-market'
                    ? 'em-products'
                    : 'harvest-products',
              ),
            );
          } else assert.ok(html.includes('category=701'));
          commerceHtml.set(`${target.theme}:${section.type}:${layout}`, html);
        }
      }
    }
    publicContext.appearance!.categoryPresentation!['701']!.visible = false;
    const hiddenCategory = await renderShowcases([category]);
    assert.ok(!hiddenCategory.includes('category=701'));
    publicContext.appearance!.categoryPresentation!['701']!.visible = true;
    missing = true;
    const unavailable = await renderShowcases([product, category]);
    assert.ok(
      !unavailable.includes('Owned apples') &&
        !unavailable.includes('category=701'),
    );
    assert.ok(unavailable.includes('Select available products'));
  } finally {
    globalThis.fetch = originalFetch;
  }
  banner.content.destination = '/checkout'; // even an unvalidated unsafe route is omitted
  if (process.argv.includes('--browser')) {
    const { verifyWebsiteSectionStyles } =
      await import('./website-section-browser-checks');
    await verifyWebsiteSectionStyles(async (theme, section) => {
      const cached = commerceHtml.get(
        `${theme}:${section.type}:${'layout' in section.presentation ? section.presentation.layout : ''}`,
      );
      if (cached) return cached;
      const current =
        theme === 'harvest'
          ? harvestContext
          : theme === 'modern-farmhouse'
            ? context
            : editorialContext;
      return container.renderToString(Dispatcher, {
        props: {
          sections: [section],
          context: current,
          target: {
            theme,
            themeVersion: theme === 'modern-farmhouse' ? 2 : 1,
            page: 'home',
          },
          prefix: theme,
        },
        locals: {
          storefront: current,
          editorPreview: {
            config: current.appearance!,
            path: '/',
            scroll: 0,
            id: 'browser',
          },
        },
      });
    });
  }
  await assert.rejects(renderEditorial(), /requires its theme configuration/);
  console.log(
    'PASS: legacy and composed homepages, all 18 theme/page route combinations, protected native order, disabled routes, distinct adapters, blocks, escaping, safe links and all expanded layouts on all three themes, vendor-only commerce references and authoritative prices. No new section hydration.',
  );
} finally {
  hooks?.deregister();
  assert.ok(temporary.startsWith(resolve('tests') + sep));
  rmSync(temporary, { recursive: true, force: true });
}
