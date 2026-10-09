import * as g from './generated/shop';
import { transport, type TransportOptions } from './transport';
export type CommunicationSettings = g.ScopedPreferencesFragment;
export type CommunicationMedium = g.CommunicationMedium;
export type CommunicationPurpose = g.CommunicationPurpose;
export function createPreferenceApi(
  options: TransportOptions & { channelToken: string },
) {
  const execute = transport('shop', options);
  return {
    read: async () =>
      (
        await execute(
          { api: 'shop', document: g.CommunicationSettingsDocument },
          {},
        )
      ).myStorefrontCommunicationPreferences,
    change: async (variables: g.ChangeCommunicationSettingMutationVariables) =>
      (
        await execute(
          { api: 'shop', document: g.ChangeCommunicationSettingDocument },
          variables,
        )
      ).setMyStorefrontCommunicationPreference,
  };
}
