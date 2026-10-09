import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
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
