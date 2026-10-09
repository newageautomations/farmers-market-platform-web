import { useCallback } from 'react';
import {
  AppError,
  type MarketConfigureInput,
  type MarketConfiguration,
} from '@market/api';
import { mayMarketCommand } from '@market/admin-core';
import { Alert, Button } from '@market/ui';
import type { MarketService } from './service';
import {
  Choice,
  CommandForm,
  integer,
  ReadState,
  RuleFields,
  ruleInput,
  RuleSummary,
  text,
  TextField,
  Toggle,
  useRead,
  RouteLink,
} from './common';
import { TimezoneField, usTimezones } from './timezones';

export function configurationInput(
  data: FormData,
  market: MarketConfiguration,
): MarketConfigureInput {
  const timezone = text(data, 'timezone');
  if (!usTimezones.some(([zone]) => zone === timezone))
    throw new AppError('validation');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new AppError('validation');
  }
  const status = text(data, 'status'),
    vendorWindowMode = text(data, 'vendorWindowMode');
  if (
    !['active', 'suspended'].includes(status) ||
    !['narrower', 'withinBoundary'].includes(vendorWindowMode)
  )
    throw new AppError('validation');
  return {
    marketId: market.id,
    expectedVersion: market.version,
    name: text(data, 'name'),
    timezone,
    venue: text(data, 'venue'),
    pickupInstructions: text(data, 'pickupInstructions'),
    status: status as MarketConfigureInput['status'],
    defaultPreorderRule: ruleInput(data),
    overridePolicy: {
      membershipAllowed: data.has('membershipAllowed'),
      participationAllowed: data.has('participationAllowed'),
      vendorWindowMode:
        vendorWindowMode as MarketConfigureInput['overridePolicy']['vendorWindowMode'],
      closeMinutesBeforeStart: integer(data.get('closeMinutesBeforeStart'), {
        zero: true,
      }),
    },
  };
}
export function MarketSettings({ service }: { service: MarketService }) {
  const read = useCallback(
    () => service.configuration(service.marketId),
    [service],
  );
  const state = useRead(`${service.marketId}:settings`, read);
  const market = state.data;
  const edit = mayMarketCommand(service.context, 'ManageOwnMarketSchedule');
  return (
    <>
      <ReadState {...state} retry={state.refresh} />
      {market && (
        <>
          <div className="dashboard-card">
            <p>
              {market.name} · {market.status} · {market.timezone} · version{' '}
              {market.version}
            </p>
            <p>
              Set the market's contact details, time zone, and preorder defaults
              here. Manage repeating dates on the occurrences page.
            </p>
          </div>
          {market.status === 'suspended' && (
            <Alert>
              This Market is suspended. Its permitted administration remains
              available. Generation and enabled offerings require an active
              Market.
            </Alert>
          )}
          <Button className="secondary" onClick={state.refresh}>
            Refresh settings
          </Button>
          {edit ? (
            <CommandForm
              key={`config:${market.version}`}
              title="Market configuration"
              onDone={state.refresh}
              run={(data) =>
                service.configure(configurationInput(data, market))
              }
              validate={(data) => {
                configurationInput(data, market);
              }}
              confirm={(data) =>
                text(data, 'status') === 'suspended' &&
                market.status !== 'suspended'
                  ? 'Suspend this Market? Permitted administration remains available; generation and enabled offerings require an active Market.'
                  : undefined
              }
            >
              <div className="form-grid">
                <TextField
                  name="name"
                  label="Market name"
                  value={market.name}
                  maxLength={200}
                />
                <TimezoneField value={market.timezone} />
                <TextField
                  name="venue"
                  label="Default venue"
                  value={market.venue}
                  required={false}
                  maxLength={500}
                />
                <TextField
                  name="pickupInstructions"
                  label="Default pickup instructions"
                  value={market.pickupInstructions}
                  required={false}
                  maxLength={2000}
                />
                <Choice
                  name="status"
                  label="Market status"
                  value={market.status}
                  choices={['active', 'suspended']}
                />
              </div>
              <RuleFields rule={market.defaultPreorderRule} />
              <Toggle
                name="membershipAllowed"
                label="Allow Vendor membership preorder defaults"
                value={market.overridePolicy.membershipAllowed}
              />
              <Toggle
                name="participationAllowed"
                label="Allow participation preorder overrides"
                value={market.overridePolicy.participationAllowed}
              />
              <Choice
                name="vendorWindowMode"
                label="Vendor window policy"
                choices={['narrower', 'withinBoundary']}
                value={market.overridePolicy.vendorWindowMode}
              />
              <TextField
                name="closeMinutesBeforeStart"
                label="Close minutes before start"
                type="number"
                value={market.overridePolicy.closeMinutesBeforeStart}
              />
            </CommandForm>
          ) : (
            <>
              <p>Configuration is read only with your current permissions.</p>
              <dl className="facts">
                <div>
                  <dt>Default venue</dt>
                  <dd>{market.venue || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Pickup instructions</dt>
                  <dd>{market.pickupInstructions || 'Not provided'}</dd>
                </div>
              </dl>
              <RuleSummary rule={market.defaultPreorderRule} />
              <p>
                Membership overrides:{' '}
                {String(market.overridePolicy.membershipAllowed)}; participation
                overrides: {String(market.overridePolicy.participationAllowed)};
                window policy: {market.overridePolicy.vendorWindowMode}; close
                boundary: {market.overridePolicy.closeMinutesBeforeStart}{' '}
                minutes.
              </p>
            </>
          )}
          <RouteLink to="/market/occurrences/generate">
            Manage repeating schedule and generate dates
          </RouteLink>
        </>
      )}
    </>
  );
}
