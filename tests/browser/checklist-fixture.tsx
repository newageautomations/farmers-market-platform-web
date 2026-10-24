import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { MarketDayChecklist } from '@market/api';
import type { MarketService } from '../../apps/admin/src/market/service';
import { ReadinessChecklist } from '../../apps/admin/src/market/ReadinessChecklist';

// Renderer qualification only. The real source/authority lifecycle runs in the guarded backend suite.
let root: Root | undefined, latest: MarketDayChecklist;
export function mountChecklist(data: MarketDayChecklist) {
  root?.unmount();
  document.getElementById('browser-checklist')?.remove();
  latest = data;
  const target = document.createElement('div');
  target.id = 'browser-checklist';
  document.querySelector('main')!.append(target);
  const service = {
    readKey: 'disposable-browser-checklist',
    checklist: async () => latest,
  } as unknown as MarketService;
  root = createRoot(target);
  root.render(
    createElement(ReadinessChecklist, {
      service,
      occurrenceId: data.occurrenceId,
    }),
  );
}
export function setChecklist(data: MarketDayChecklist) {
  latest = data;
}
