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
