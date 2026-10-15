import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
// JSDOM qualifies semantic companion UI; actual canvas gestures run in Chromium.
vi.mock('react-konva', () => ({
  Stage: () => null,
  Layer: () => null,
  Group: () => null,
  Rect: () => null,
  Ellipse: () => null,
  Circle: () => null,
  Line: () => null,
  Text: () => null,
  Image: () => null,
  Transformer: () => null,
}));
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
afterEach(() => cleanup());
// DOM-only component tests. Native dialog behavior is exercised in Chromium.
if (!HTMLDialogElement.prototype.showModal)
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
if (!HTMLDialogElement.prototype.close)
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
