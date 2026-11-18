/**
 * Dashboard grid engine: whole-unit cells on a fixed number of columns with
 * vertical gravity. Moving an item pushes the items it lands on; resizing an
 * item first squeezes the neighbours beside it (down to their minimum width)
 * and pushes the rest. Pure functions; callers own state and persistence.
 */
export interface GridItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface GridLimits {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
}

export const GRID_COLUMNS = 8;
/** Page row height and gap in pixels; one unit is one row. */
export const GRID_ROW = 156;
export const GRID_GAP = 18;

export function overlaps(a: GridItem, b: GridItem) {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

export function bottom(items: readonly GridItem[]) {
  return items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

/** Keep a cell inside the grid and within its own size limits. */
export function clampItem(
  item: GridItem,
  limits: GridLimits,
  columns = GRID_COLUMNS,
): GridItem {
  const w = Math.max(limits.minW, Math.min(limits.maxW, columns, item.w));
  const h = Math.max(limits.minH, Math.min(limits.maxH, item.h));
  return {
    id: item.id,
    w,
    h,
    x: Math.max(0, Math.min(columns - w, Math.round(item.x))),
    y: Math.max(0, Math.round(item.y)),
  };
}

/**
 * Vertical gravity: each item rises to the highest free row it can occupy,
 * in reading order. A `pinned` item keeps its exact position and the others
 * settle around it, which lets a dragged item take a spot others vacate.
 */
export function compact(items: readonly GridItem[], pinned?: string) {
  const placed: GridItem[] = items
    .filter((item) => item.id === pinned)
    .map((item) => ({ ...item }));
  const rest = items
    .filter((item) => item.id !== pinned)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  for (const item of rest) {
    const next = { ...item, y: 0 };
    while (placed.some((other) => overlaps(other, next))) next.y += 1;
    placed.push(next);
  }
  return order(placed);
}

/** Reading order: top to bottom, then left to right. */
export function order(items: readonly GridItem[]) {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Move an item to a cell; anything it lands on moves down around it. */
export function moveItem(
  items: readonly GridItem[],
  id: string,
  x: number,
  y: number,
  columns = GRID_COLUMNS,
) {
  return compact(
    items.map((item) =>
      item.id === id
        ? {
            ...item,
            x: Math.max(0, Math.min(columns - item.w, x)),
            y: Math.max(0, y),
          }
        : item,
    ),
    id,
  );
}

export type GridCorner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Resize an item from one corner by a whole number of columns (`dx`) and
 * rows (`dy`), keeping the opposite corner fixed and the size within limits.
 */
export function cornerResize(
  origin: GridItem,
  corner: GridCorner,
  dx: number,
  dy: number,
  limits: GridLimits,
  columns = GRID_COLUMNS,
): GridItem {
  const right = origin.x + origin.w,
    lower = origin.y + origin.h;
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));
  const w = corner.endsWith('w')
    ? clamp(origin.w - dx, limits.minW, Math.min(limits.maxW, right))
    : clamp(
        origin.w + dx,
        limits.minW,
        Math.min(limits.maxW, columns - origin.x),
      );
  const h = corner.startsWith('n')
    ? clamp(origin.h - dy, limits.minH, Math.min(limits.maxH, lower))
    : clamp(origin.h + dy, limits.minH, limits.maxH);
  return {
    id: origin.id,
    x: corner.endsWith('w') ? right - w : origin.x,
    y: corner.startsWith('n') ? lower - h : origin.y,
    w,
    h,
  };
}

/**
 * Give an item a new cell after a resize. Neighbours it grows into from the
 * side are squeezed narrower when their limits allow; everything else that
 * now overlaps moves down.
 */
export function resizeTo(
  items: readonly GridItem[],
  resized: GridItem,
  limits: (id: string) => GridLimits,
) {
  const target = items.find((item) => item.id === resized.id);
  if (!target) return [...items];
  const next = items.map((item) => {
    if (item.id === resized.id) return resized;
    if (!overlaps(item, resized)) return item;
    const min = limits(item.id).minW;
    if (item.x >= target.x + target.w) {
      // Was to the right: give up its left columns.
      const x = resized.x + resized.w,
        width = item.x + item.w - x;
      return width >= min ? { ...item, x, w: width } : item;
    }
    if (item.x + item.w <= target.x) {
      // Was to the left: give up its right columns.
      const width = resized.x - item.x;
      return width >= min ? { ...item, w: width } : item;
    }
    return item;
  });
  return compact(next, resized.id);
}

/** Resize from the bottom-right corner to a width and height. */
export function resizeItem(
  items: readonly GridItem[],
  id: string,
  w: number,
  h: number,
  limits: (id: string) => GridLimits,
  columns = GRID_COLUMNS,
) {
  const target = items.find((item) => item.id === id);
  if (!target) return [...items];
  return resizeTo(
    items,
    cornerResize(target, 'se', w - target.w, h - target.h, limits(id), columns),
    limits,
  );
}

/** First free cell, scanning rows top to bottom, for an item of this size. */
export function freeCell(
  items: readonly GridItem[],
  w: number,
  h: number,
  columns = GRID_COLUMNS,
) {
  for (let y = 0; ; y += 1)
    for (let x = 0; x + w <= columns; x += 1) {
      const cell = { id: '', x, y, w, h };
      if (!items.some((item) => overlaps(item, cell))) return { x, y };
    }
}
