import type { Page } from 'playwright';
export async function mapPoint(page: Page, x: number, y: number) {
  const viewport = page.getByTestId('market-map-canvas').first();
  await viewport.scrollIntoViewIfNeeded();
  const box = await viewport.boundingBox();
  if (!box) throw new Error('Map viewport absent');
  const view = JSON.parse((await viewport.getAttribute('data-view'))!);
  return {
    x: box.x + view.x + x * view.scale,
    y: box.y + view.y + y * view.scale,
  };
}
export async function dragMap(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}
