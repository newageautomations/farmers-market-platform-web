import { expect, it } from 'vitest';
import { editorPreviewConnectSource } from '../apps/storefront/src/lib/editor-preview-server';

it('permits only the exact local HMR WebSocket in development', () => {
  expect(
    editorPreviewConnectSource(
      new URL('http://homepage-vendor.localhost:4321/'),
      true,
    ),
  ).toBe('connect-src ws://homepage-vendor.localhost:4321');
  expect(
    editorPreviewConnectSource(new URL('https://localhost:4321/'), true),
  ).toBe('connect-src wss://localhost:4321');
  expect(
    editorPreviewConnectSource(new URL('https://store.example/'), true),
  ).toBe("connect-src 'none'");
});
it('keeps production preview connections disabled, including local hosts', () => {
  for (const origin of [
    'http://homepage-vendor.localhost:4321',
    'https://store.example',
  ])
    expect(editorPreviewConnectSource(new URL(origin), false)).toBe(
      "connect-src 'none'",
    );
});
