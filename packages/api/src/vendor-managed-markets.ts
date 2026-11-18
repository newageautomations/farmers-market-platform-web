import * as g from './generated/admin';
import { transport, type TransportOptions } from './transport';
import { createMarketApi } from './market';

/** Only scheduling commands. Backend checks the explicit owner on every call. */
export function createVendorManagedMarketsApi(
  options: TransportOptions & { channelToken: string },
) {
  const run = transport('admin', options);
  const scheduling = createMarketApi(options);
  return {
    list: () =>
      run({ api: 'admin', document: g.VendorManagedMarketsDocument }, {}).then(
        (r) => r.ownVendorManagedMarkets,
      ),
    create: (input: g.CreateVendorManagedMarketMutationVariables['input']) =>
      run(
        { api: 'admin', document: g.CreateVendorManagedMarketDocument },
        { input },
      ).then((r) => r.createVendorManagedMarket),
    configuration: scheduling.configuration,
    occurrences: scheduling.occurrences,
    saveSchedule: scheduling.saveSchedule,
    deleteSchedule: scheduling.deleteSchedule,
    generate: scheduling.generate,
    manual: scheduling.manual,
    reviseOccurrence: scheduling.reviseOccurrence,
    cancelOccurrence: scheduling.cancelOccurrence,
  };
}
export type VendorManagedMarketsApi = ReturnType<
  typeof createVendorManagedMarketsApi
>;
