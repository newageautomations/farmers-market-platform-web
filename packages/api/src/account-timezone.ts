import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { transport, type TransportOptions } from './transport';
import { AppError } from './errors';
export function createAccountTimezoneApi(options: TransportOptions) {
  const run = transport('admin', options);
  return {
    read: async () =>
      (
        await run(
          {
            api: 'admin',
            document: parse(
              'query OwnAccountTimezone { getSettingsStoreValue(key:"platformAccount.timezone") }',
            ) as TypedDocumentNode<
              { getSettingsStoreValue: string | null },
              Record<string, never>
            >,
          },
          {},
        )
      ).getSettingsStoreValue,
    save: async (timezone: string) => {
      const r = await run(
        {
          api: 'admin',
          document: parse(
            'mutation SaveOwnAccountTimezone($input:SettingsStoreInput!){setSettingsStoreValue(input:$input){result}}',
          ) as TypedDocumentNode<
            { setSettingsStoreValue: { result: boolean } },
            { input: { key: string; value: string } }
          >,
        },
        { input: { key: 'platformAccount.timezone', value: timezone } },
      );
      if (!r.setSettingsStoreValue.result) throw new AppError('validation');
    },
  };
}
