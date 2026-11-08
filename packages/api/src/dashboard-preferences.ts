import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import * as g from './generated/admin';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';
export function createDashboardPreferencesApi(options: TransportOptions) {
  const run = transport('admin', options);
  return {
    read: async () =>
      (await run({ api: 'admin', document: g.OwnDashboardPaletteDocument }, {}))
        .getSettingsStoreValue,
    save: async (value: unknown) => {
      const result = await run(
        { api: 'admin', document: g.SaveOwnDashboardPaletteDocument },
        { input: { key: 'marketDashboard.palette', value } },
      );
      if (!result.setSettingsStoreValue.result)
        throw new AppError('validation');
    },
  };
}
export type DashboardPreferencesApi = ReturnType<
  typeof createDashboardPreferencesApi
>;

/** Saved vendor dashboard arrangement; widget data stays separately authorized. */
export interface VendorDashboardLayout {
  order: string[];
  hidden: string[];
  period: '7' | '30' | '90';
  /** Grid cells in grid units: column, row, width and height. */
  grid?: Array<{ id: string; x: number; y: number; w: number; h: number }>;
}
const vendorLayoutRead = parse(
  'query OwnVendorDashboardLayout { getSettingsStoreValue(key: "vendorDashboard.layout") }',
) as TypedDocumentNode<
  { getSettingsStoreValue: unknown },
  Record<string, never>
>;
const vendorLayoutSave = parse(
  'mutation SaveOwnVendorDashboardLayout($input: SettingsStoreInput!) { setSettingsStoreValue(input: $input) { key result error } }',
) as TypedDocumentNode<
  {
    setSettingsStoreValue: {
      key: string;
      result: boolean;
      error?: string | null;
    };
  },
  { input: { key: string; value: unknown } }
>;
export function createVendorDashboardLayoutApi(options: TransportOptions) {
  const run = transport('admin', options);
  return {
    read: async () =>
      (await run({ api: 'admin', document: vendorLayoutRead }, {}))
        .getSettingsStoreValue as Partial<VendorDashboardLayout> | null,
    save: async (value: VendorDashboardLayout) => {
      const result = await run(
        { api: 'admin', document: vendorLayoutSave },
        { input: { key: 'vendorDashboard.layout', value } },
      );
      if (!result.setSettingsStoreValue.result)
        throw new AppError('validation');
    },
  };
}
export type VendorDashboardLayoutApi = ReturnType<
  typeof createVendorDashboardLayoutApi
>;
