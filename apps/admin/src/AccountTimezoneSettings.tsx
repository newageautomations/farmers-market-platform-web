import { useCallback, useMemo, useState } from 'react';
import { createAccountTimezoneApi } from '@market/api';
import { Card, SearchSelect } from '@market/ui';
import { CommandForm, ReadState, useRead } from './vendor/common';

/** Personal preference, independent of the selected vendor or market business. */
export function AccountTimezoneSettings({
  connection,
  embedded = false,
}: {
  connection: { endpoint: string; channelToken: string };
  /** Host panel supplies the heading and surface. */
  embedded?: boolean;
}) {
  const api = useMemo(
    () =>
      createAccountTimezoneApi({
        endpoint: connection.endpoint,
        channelToken: connection.channelToken,
      }),
    [connection.endpoint, connection.channelToken],
  );
  const read = useCallback(() => api.read(), [api]),
    saved = useRead('account-timezone', read);
  const [choice, setChoice] = useState<string>();
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezone = choice ?? saved.data ?? detected;
  const zones = [
    ...new Set([
      detected,
      timezone,
      'UTC',
      ...Intl.supportedValuesOf('timeZone'),
    ]),
  ];
  return (
    <Card spacing="contained" surface={embedded ? 'embedded' : 'card'}>
      {!embedded && <h2>Account time zone</h2>}
      <ReadState {...saved} retry={saved.refresh} />
      {saved.data !== undefined && (
        <CommandForm
          title="Account time zone"
          hideTitle={embedded}
          submitLabel="Save time zone"
          embedded
          run={async () => {
            await api.save(timezone);
          }}
          onDone={saved.refresh}
        >
          <SearchSelect
            label="Time zone"
            value={timezone}
            options={zones.map((value) => ({
              value,
              label: value.replaceAll('_', ' '),
            }))}
            onChange={setChoice}
          />
        </CommandForm>
      )}
    </Card>
  );
}
