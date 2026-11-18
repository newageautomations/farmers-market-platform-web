import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import {
  createWebsiteSection,
  harvestExpandedSectionManifest,
  effectiveWebsiteBlocks,
  withWebsiteBlocks,
  type WebsiteSection,
  type SectionTarget,
} from '@market/theme/storefront';

type Theme = 'harvest' | 'modern-farmhouse' | 'editorial-market';
/** Exercises the real SSR adapters and production styles without a running API or database. */
export async function verifyWebsiteSectionStyles(
  render: (theme: Theme, section: WebsiteSection) => Promise<string>,
) {
  const browser = await chromium.launch({
    headless: true,
    channel: existsSync(chromium.executablePath()) ? undefined : 'msedge',
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.route('**/*', (route) => route.abort());
    const shared = readFileSync(
      'apps/storefront/src/styles/website-sections.css',
      'utf8',
    );
    const library = [
      'apps/storefront/src/styles/harvest-sections.css',
      'apps/storefront/src/styles/theme-section-library.css',
      'apps/storefront/src/styles/section-backgrounds.css',
    ]
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    const base = [
      'packages/ui/src/styles.css',
      'packages/theme/src/storefront.css',
      'apps/storefront/src/styles/homepage.css',
      'apps/storefront/src/styles/vendor.css',
    ]
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    let checks = 0;
    for (const theme of [
      'harvest',
      'modern-farmhouse',
      'editorial-market',
    ] as const) {
      const target: SectionTarget = {
        theme,
        themeVersion: theme === 'modern-farmhouse' ? 2 : 1,
        page: 'home',
      };
      const styles = readFileSync(
        `apps/storefront/src/styles/${theme === 'harvest' ? 'harvest-sections' : theme === 'modern-farmhouse' ? 'farmhouse-v2' : 'editorial-market'}.css`,
        'utf8',
      );
      const outer =
        theme === 'modern-farmhouse'
          ? 'farmhouse-site'
          : theme === 'editorial-market'
            ? 'editorial-market-site'
            : 'harvest-home container';
      const home =
        theme === 'modern-farmhouse'
          ? 'farmhouse-home'
          : theme === 'editorial-market'
            ? 'em-home'
            : '';
      const region =
        theme === 'modern-farmhouse'
          ? 'farmhouse-page-sections'
          : theme === 'editorial-market'
            ? 'em-page-sections'
            : '';
      const mount = async (
        html: string,
        sharedFirst = false,
        inPage = false,
      ) => {
        await page.setContent(
          `<html data-storefront-theme="${theme}" data-template-version="${theme === 'modern-farmhouse' ? 2 : 1}"><head><style>*{box-sizing:border-box}body{margin:0}${base}\n${sharedFirst ? shared + styles : styles + shared}\n${library}</style></head><body><main class="${outer}"><div class="${inPage ? region : home}">${html}</div></main></body></html>`,
        );
      };
      for (const definition of Object.values(harvestExpandedSectionManifest)) {
        const section = createWebsiteSection(
          definition.type,
          `${definition.type}-browser-expanded`,
          target,
        );
        if (section.type === 'image-gallery')
          section.content.images = Array.from({ length: 4 }, (_, i) => ({
            id: `photo-${i}`,
            image: {
              assetId: String(501 + i),
              url: `http://localhost:3000/assets/photo-${i}.jpg`,
              alt: 'Farm photograph',
            },
            caption: 'At the farm',
          }));
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
          Object.assign(section.presentation, {
            [section.type === 'feature-grid' ? 'cardStyle' : 'layout']: layout,
          });
          for (const width of [1440, 390, 1920]) {
            await page.setViewportSize({ width, height: 1000 });
            await mount(await render(theme, section));
            assert.equal(
              await page
                .locator('.harvest-library')
                .getAttribute('data-library-theme'),
              theme,
            );
            if (theme !== 'harvest') {
              const containedWidth = await page
                .locator('.harvest-library')
                .evaluate((node) => node.getBoundingClientRect().width);
              await page.locator('.harvest-library').evaluate((node) => {
                node.setAttribute('data-background', 'surface');
                node.setAttribute('data-background-type', 'full');
              });
              const surface = await page
                .locator('.harvest-library')
                .evaluate((node) => ({
                  border: getComputedStyle(node).borderTopWidth,
                  width: node.getBoundingClientRect().width,
                  backgroundWidth: parseFloat(
                    getComputedStyle(node, '::before').width,
                  ),
                }));
              assert.equal(surface.border, '0px');
              assert.ok(Math.abs(surface.backgroundWidth - width) <= 1);
              assert.ok(surface.width <= width);
              assert.ok(
                Math.abs(surface.width - containedWidth) <= 1,
                `${theme}: full background must retain container width`,
              );
              await mount(await render(theme, section));
            }
            const geometry = await page
              .locator('.harvest-library')
              .evaluate((node) => ({
                width: node.getBoundingClientRect().width,
                scroll: document.documentElement.scrollWidth,
                viewport: innerWidth,
              }));
            assert.ok(
              geometry.width > 0 &&
                ((theme === 'harvest' && layout === 'carousel') ||
                  geometry.scroll <= geometry.viewport + 1),
              `${theme} ${section.type} ${layout} ${width}: horizontal overflow ${JSON.stringify(geometry)}`,
            );
            if (layout === 'carousel' && section.type === 'product-showcase') {
              const track = page.locator(
                '.catalog-grid, .farmhouse-product-grid',
              );
              assert.equal(
                await track.evaluate((node) => getComputedStyle(node).display),
                'flex',
              );
              assert.equal(
                await page
                  .getByRole('button', { name: 'Next products' })
                  .count(),
                1,
              );
            }
            if (theme === 'modern-farmhouse')
              assert.equal(
                await page
                  .locator('.harvest-library')
                  .evaluate((node) => getComputedStyle(node).borderRadius),
                '0px',
              );
            checks++;
          }
        }
      }
      if (theme === 'editorial-market') {
        await page.setViewportSize({ width: 1440, height: 1000 });
        for (const count of [1, 2, 6]) {
          await mount(
            `<section class="em-section"><div class="em-categories">${Array.from({ length: count }, () => '<a href="/products"><span class="em-category-image"></span><span>Vegetables</span></a>').join('')}</div></section>`,
          );
          const widths = await page
            .locator('.em-category-image')
            .evaluateAll((nodes) =>
              nodes.map((node) => node.getBoundingClientRect().width),
            );
          assert.ok(
            widths.every((width) => width >= 100 && width <= 160),
            `Category sizing with ${count} categories: ${widths}`,
          );
          checks++;
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (process.argv.includes('--screenshots') && theme !== 'harvest') {
        const banner = createWebsiteSection(
          'image-banner',
          'image-banner-preview',
          target,
        );
        banner.presentation.layout = 'split-editorial';
        const features = createWebsiteSection(
          'feature-grid',
          'feature-grid-preview',
          target,
        );
        features.presentation.cardStyle = 'highlighted';
        const product = createWebsiteSection(
          'product-showcase',
          'product-showcase-preview',
          target,
        );
        await mount(
          (
            await Promise.all(
              [banner, features, product].map((section) =>
                render(theme, section),
              ),
            )
          ).join(''),
        );
        await page.screenshot({
          path: `tests/.theme-library-${theme}.png`,
          fullPage: true,
        });
      }
      const story = () => {
        const section = createWebsiteSection(
          'image-with-text',
          'image-with-text-browser',
          target,
        );
        section.content.heading = 'From our farm';
        section.content.body = 'Food grown with care.';
        section.content.label = 'Visit our shop';
        section.content.destination = '/products';
        return withWebsiteBlocks(section, effectiveWebsiteBlocks(section));
      };
      // Styles must work regardless of stylesheet bundling order and page-region wrapper.
      for (const sharedFirst of [false, true]) {
        for (const inPage of [false, true]) {
          for (const type of [
            'text',
            'image-with-text',
            'cta-banner',
          ] as const) {
            const signatures: string[] = [];
            for (const variant of ['standard', 'featured', 'framed'] as const) {
              const section = createWebsiteSection(
                type,
                `${type}-variant`,
                target,
              );
              section.presentation.variant = variant;
              await mount(await render(theme, section), sharedFirst, inPage);
              signatures.push(
                await page.locator('.website-section').evaluate((node) => {
                  const root = getComputedStyle(node);
                  const heading = getComputedStyle(node.querySelector('h2')!);
                  return JSON.stringify([
                    root.borderWidth,
                    root.boxShadow,
                    root.backgroundColor,
                    heading.fontSize,
                    heading.fontStyle,
                    heading.fontWeight,
                  ]);
                }),
              );
              checks++;
            }
            assert.equal(
              new Set(signatures).size,
              3,
              `${theme} ${type}: presentations must differ (${sharedFirst}, ${inPage})`,
            );
          }
        }
      }
      for (const side of ['left', 'right', 'background'] as const) {
        const offsets: number[] = [];
        for (const alignment of ['top', 'center', 'bottom'] as const) {
          const section = story();
          section.presentation = {
            ...section.presentation,
            imageSide: side,
            verticalAlignment: alignment,
            sizing: { imageHeight: 600, height: 700 },
          };
          await mount(await render(theme, section), true);
          offsets.push(
            await page
              .locator('.website-section h2')
              .evaluate(
                (node) =>
                  node.getBoundingClientRect().top -
                  node.closest('.website-section')!.getBoundingClientRect().top,
              ),
          );
          checks++;
        }
        assert.ok(
          offsets[0]! + 20 < offsets[1]! && offsets[1]! + 20 < offsets[2]!,
          `${theme} ${side}: top/center/bottom positions ${offsets}`,
        );
        const gaps: number[] = [];
        for (const spacing of ['compact', 'balanced', 'spacious'] as const) {
          const section = story();
          section.presentation = {
            ...section.presentation,
            imageSide: side,
            spacing,
          };
          await mount(await render(theme, section), true);
          gaps.push(
            await page
              .locator('.website-copy')
              .evaluate((node) => parseFloat(getComputedStyle(node).rowGap)),
          );
          checks++;
        }
        assert.ok(
          gaps[0]! < gaps[1]! && gaps[1]! < gaps[2]!,
          `${theme} ${side}: spacing ${gaps}`,
        );
        for (const background of ['paper', 'surface', 'ink'] as const) {
          const colors: string[] = [];
          for (const style of ['primary', 'secondary'] as const) {
            const section = story();
            section.presentation = {
              ...section.presentation,
              imageSide: side,
              background,
            };
            section.content.blocks!.forEach((b) => {
              if (b.type === 'button') b.presentation.style = style;
            });
            await mount(await render(theme, section), true);
            colors.push(
              await page
                .locator('.website-copy a')
                .evaluate((node) => getComputedStyle(node).backgroundColor),
            );
            checks++;
          }
          assert.notEqual(
            colors[0],
            colors[1],
            `${theme} ${side} ${background}: button styles`,
          );
        }
      }
      for (const type of ['text', 'image-with-text', 'cta-banner'] as const) {
        const section =
          type === 'image-with-text'
            ? story()
            : createWebsiteSection(type, `${type}-sliders`, target);
        section.presentation.sizing = {
          heading: 100,
          paragraph: 100,
          button: 100,
          gap: 12,
          padding: 24,
          width: 100,
          height: 350,
          imageHeight: 320,
          imageWidth: 35,
        };
        await mount(await render(theme, section));
        const before = await page
          .locator('h2')
          .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
        const beforeParagraph = await page
          .locator('.website-copy p')
          .evaluateAll((nodes) =>
            nodes[0]
              ? parseFloat(getComputedStyle(nodes[0]).fontSize)
              : undefined,
          );
        const beforeButton = await page
          .locator('a')
          .evaluateAll((nodes) =>
            nodes[0]
              ? parseFloat(getComputedStyle(nodes[0]).fontSize)
              : undefined,
          );
        section.presentation.sizing = {
          ...section.presentation.sizing,
          heading: 150,
          paragraph: 130,
          button: 140,
          gap: 38,
          padding: 64,
          width: 70,
          height: 500,
          imageHeight: 460,
          imageWidth: 65,
        };
        if (section.type === 'image-with-text')
          section.presentation.imageSide = 'right';
        await mount(await render(theme, section));
        const result = await page
          .locator('.website-section')
          .evaluate((node) => {
            const copy = node.querySelector('.website-copy')!;
            const layout = node.querySelector('.website-layout') ?? node;
            const image = node.querySelector('.website-image');
            const parentStyle = getComputedStyle(copy.parentElement!);
            const parentColumns = parentStyle.gridTemplateColumns
              .split(' ')
              .map(parseFloat);
            const copyColumn =
              node.getAttribute('data-website-section') === 'image-with-text' &&
              node.getAttribute('data-image-side') !== 'right'
                ? 1
                : 0;
            return {
              heading: parseFloat(
                getComputedStyle(node.querySelector('h2')!).fontSize,
              ),
              gap: parseFloat(getComputedStyle(copy).rowGap),
              padding: parseFloat(getComputedStyle(node).paddingTop),
              imageHeight: image?.getBoundingClientRect().height,
              columns: getComputedStyle(layout).gridTemplateColumns,
              copyWidth: copy.getBoundingClientRect().width,
              rootWidth: node.getBoundingClientRect().width,
              paragraph: node.querySelector('.website-copy p')
                ? parseFloat(
                    getComputedStyle(node.querySelector('.website-copy p')!)
                      .fontSize,
                  )
                : undefined,
              button: node.querySelector('a')
                ? parseFloat(
                    getComputedStyle(node.querySelector('a')!).fontSize,
                  )
                : undefined,
              contentWidth:
                parentStyle.display === 'grid' && parentColumns.length > 1
                  ? parentColumns[copyColumn]!
                  : copy.parentElement!.clientWidth -
                    parseFloat(parentStyle.paddingLeft) -
                    parseFloat(parentStyle.paddingRight),
            };
          });
        assert.ok(
          Math.abs(result.heading / before - 1.5) < 0.02,
          `${theme} ${type}: heading slider`,
        );
        assert.equal(result.gap, 38, `${theme} ${type}: gap slider`);
        assert.equal(result.padding, 64, `${theme} ${type}: padding slider`);
        if (beforeParagraph)
          assert.ok(
            Math.abs(result.paragraph! / beforeParagraph - 1.3) < 0.02,
            `${theme} ${type}: paragraph slider`,
          );
        if (beforeButton)
          assert.ok(
            Math.abs(result.button! / beforeButton - 1.4) < 0.02,
            `${theme} ${type}: button slider`,
          );
        assert.ok(
          Math.abs(result.copyWidth / result.contentWidth - 0.7) < 0.02,
          `${theme} ${type}: content width slider ${result.copyWidth} / ${result.contentWidth}`,
        );
        if (type === 'image-with-text') {
          assert.ok(
            Math.abs(result.imageHeight! - 460) < 1,
            `${theme}: image height ${result.imageHeight}`,
          );
          const columns = result.columns.split(' ').map(parseFloat);
          assert.ok(
            Math.abs(columns[1]! / (columns[0]! + columns[1]!) - 0.65) < 0.02,
            `${theme}: image width slider mirrors on right`,
          );
          const block =
            section.type === 'image-with-text'
              ? section.content.blocks!.find((b) => b.type === 'heading')!
              : undefined;
          if (block && 'scale' in block.presentation)
            delete block.presentation.scale;
          if (block && block.type !== 'image')
            block.presentation = { ...block.presentation, scale: 132 };
          await mount(await render(theme, section));
          const blockFont = await page
            .locator('h2')
            .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
          assert.ok(
            Math.abs(blockFont / result.heading - 1.32) < 0.02,
            `${theme}: individual block slider`,
          );
        }
        checks++;
        for (const width of [768, 390]) {
          await page.setViewportSize({ width, height: 900 });
          await mount(await render(theme, section));
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${theme} ${type}: overflow at ${width}`,
          );
          if (type === 'image-with-text') {
            const rects = await page
              .locator('.website-section')
              .evaluate((node) => ({
                image: node
                  .querySelector('.website-image')!
                  .getBoundingClientRect()
                  .toJSON(),
                copy: node
                  .querySelector('.website-copy')!
                  .getBoundingClientRect()
                  .toJSON(),
              }));
            if (width === 390)
              assert.ok(
                rects.copy.top >= rects.image.bottom - 1,
                `${theme}: mobile must stack image before copy`,
              );
          }
          checks++;
        }
        section.presentation.sizing = {
          heading: 250,
          paragraph: 200,
          button: 180,
          gap: 128,
          padding: 160,
          width: 40,
          height: 1000,
          imageHeight: 900,
          imageWidth: 80,
        };
        await mount(await render(theme, section));
        assert.ok(
          await page.locator('.website-section').evaluate((node) =>
            [...node.querySelectorAll('h2, p, a')].every((item) => {
              const rect = item.getBoundingClientRect();
              return (
                rect.left >= -1 &&
                rect.right <= innerWidth + 1 &&
                item.scrollWidth <= item.clientWidth + 1
              );
            }),
          ),
          `${theme} ${type}: maximum sizes must wrap inside mobile viewport`,
        );
        checks++;
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
    }
    console.log(
      `PASS: ${checks} browser checks across all three themes, all section types, presentations, alignment, spacing, buttons, sliders, stylesheet orders and mobile widths.`,
    );
  } finally {
    await browser.close();
  }
}
