import { cardClassName } from '@market/ui/presentation';
import { CommandForm as SharedCommandForm } from './CommandForm';
import {
  useId,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  AppError,
  type MarketConfiguration,
  type MarketSessionInput,
} from '@market/api';
import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  SelectField as SharedSelectField,
  InfoTip,
  ErrorState,
  Spinner,
} from '@market/ui';
import { localParts, localToInstant, TimezoneField } from './timezones';
import { clockTime, friendlyLabel, statusTone } from './presentation';
export { date, StatusBadge, MarketDialog } from './presentation';
// Existing common primitives are shared without changing Vendor module behavior.
export {
  DataTable,
  RouteLink,
  Unavailable,
  go,
  integer,
  text,
  TextField,
  useRead,
} from '../vendor/common';
import { integer, text, TextField } from '../vendor/common';
export function CommandForm({
  danger = false,
  ...props
}: ComponentProps<typeof SharedCommandForm> & { danger?: boolean }) {
  const [dirty, setDirty] = useState(false);
  return (
    <div className={danger ? 'market-danger-command' : undefined}>
      <SharedCommandForm
        {...props}
        submitVariant={danger ? 'destructive' : props.submitVariant}
        run={async (data, key) => {
          const result = await props.run(data, key);
          setDirty(false);
          return result;
        }}
      >
        <div onChange={() => setDirty(true)}>{props.children}</div>
        {dirty && <p role="status">Unsaved changes</p>}
      </SharedCommandForm>
    </div>
  );
}
export function Choice({
  name,
  label,
  value,
  choices,
  info,
  labels,
}: {
  name: string;
  label: string;
  value?: string;
  choices: readonly string[];
  info?: string;
  labels?: Record<string, string>;
}) {
  const id = useId();
  const [selected, setSelected] = useState(value ?? choices[0] ?? '');
  return (
    <Field id={id} label={label} info={info}>
      <Select
        id={id}
        variant={name === 'status' ? 'status' : 'ordinary'}
        name={name}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className={
          name === 'status'
            ? `input market-status-select market-status-${statusTone(selected)}`
            : undefined
        }
      >
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {labels?.[choice] ?? friendlyLabel(choice)}
          </option>
        ))}
      </Select>
    </Field>
  );
}
export function Toggle({
  name,
  label,
  value,
  info,
  onChange,
}: {
  name: string;
  label: string;
  value: boolean;
  info?: string;
  onChange?: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="market-toggle">
      <label className="market-toggle" htmlFor={id}>
        <Checkbox
          id={id}
          name={name}
          defaultChecked={onChange ? undefined : value}
          checked={onChange ? value : undefined}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        />
        {label}
      </label>
      {info && <InfoTip label={label} text={info} />}
    </div>
  );
}
export function calendarDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw new AppError('validation');
  return value;
}
export function dateBounds(from: string, through: string) {
  calendarDate(from);
  calendarDate(through);
  const span =
    Date.parse(`${through}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  if (span <= 0 || span > 366 * 86400000) throw new AppError('validation');
  return { from: `${from}T00:00:00.000Z`, through: `${through}T00:00:00.000Z` };
}
export function initialRange() {
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  return {
    from,
    through: new Date(Date.parse(`${from}T00:00:00Z`) + 31 * 86400000)
      .toISOString()
      .slice(0, 10),
  };
}
export function RangeForm({
  range,
  onChange,
  children,
}: {
  range: { from: string; through: string };
  onChange: (range: { from: string; through: string }) => void;
  children?: ReactNode;
}) {
  const [invalid, setInvalid] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const next = { from: text(data, 'from'), through: text(data, 'through') };
      dateBounds(next.from, next.through);
      setInvalid(false);
      onChange(next);
    } catch {
      setInvalid(true);
    }
  }
  return (
    <>
      <form
        className={cardClassName({ className: 'filter-bar ui-control-row' })}
        onSubmit={submit}
      >
        <TextField
          name="from"
          label="From Date"
          type="date"
          value={range.from}
        />
        <TextField
          name="through"
          label="Through Date"
          type="date"
          value={range.through}
        />
        {children}
        <div className="ui-field-action">
          <Button type="submit">Apply dates</Button>
        </div>
      </form>
      {invalid && (
        <p className="alert ui-alert ui-alert-error" role="alert">
          Choose a valid date range of 1 to 366 days.
        </p>
      )}
    </>
  );
}
export type PreorderRule = MarketConfiguration['defaultPreorderRule'];
export function RuleFields({
  rule,
  prefix = '',
  optional = false,
}: {
  rule?: PreorderRule | null;
  prefix?: string;
  optional?: boolean;
}) {
  const [enabled, setEnabled] = useState(!!rule);
  return (
    <>
      {optional && (
        <Toggle
          name={`${prefix}useOverride`}
          label="Use a preorder override"
          info="Choose different preorder opening and closing times for this market date or vendor instead of the market defaults."
          value={enabled}
          onChange={setEnabled}
        />
      )}
      {(!optional || enabled) && (
        <div className="form-grid">
          <TextField
            name={`${prefix}opensDaysBefore`}
            label="Days before market day that preorders open"
            info="For a Saturday market, 7 days before means the previous Saturday; 0 means market day."
            type="number"
            value={rule?.opensDaysBefore ?? 7}
          />
          <TextField
            name={`${prefix}opensTime`}
            label="Preorders open at (local time)"
            info="The time on the opening day, using the market's time zone."
            type="time"
            value={rule?.opensTime ?? '09:00'}
          />
          <TextField
            name={`${prefix}closesDaysBefore`}
            label="Days before market day that preorders close"
            info="For a Saturday market, 1 day before means Friday; 0 means market day."
            type="number"
            value={rule?.closesDaysBefore ?? 1}
          />
          <TextField
            name={`${prefix}closesTime`}
            label="Preorders close at (local time)"
            info="The time on the closing day, using the market's time zone."
            type="time"
            value={rule?.closesTime ?? '18:00'}
          />
        </div>
      )}
    </>
  );
}
export function ruleInput(data: FormData, prefix = ''): PreorderRule {
  const opensTime = text(data, `${prefix}opensTime`),
    closesTime = text(data, `${prefix}closesTime`);
  if (
    ![opensTime, closesTime].every((time) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(time),
    )
  )
    throw new AppError('validation');
  return {
    opensDaysBefore: integer(data.get(`${prefix}opensDaysBefore`), {
      zero: true,
    }),
    closesDaysBefore: integer(data.get(`${prefix}closesDaysBefore`), {
      zero: true,
    }),
    opensTime,
    closesTime,
  };
}
export function instant(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new AppError('validation');
  return value;
}
export function sessionInput(data: FormData): MarketSessionInput {
  const startsAt = data.has('startDate')
      ? localToInstant(
          text(data, 'startDate'),
          text(data, 'startTime'),
          text(data, 'sessionTimezone'),
        )
      : instant(text(data, 'startsAt')),
    endsAt = data.has('endDate')
      ? localToInstant(
          text(data, 'endDate'),
          text(data, 'endTime'),
          text(data, 'sessionTimezone'),
        )
      : instant(text(data, 'endsAt'));
  if (Date.parse(startsAt) >= Date.parse(endsAt))
    throw new AppError('validation');
  return {
    startsAt,
    endsAt,
    venue: text(data, 'venue'),
    pickupInstructions: text(data, 'pickupInstructions'),
    preorderOverride: data.has('useOverride') ? ruleInput(data) : null,
  };
}
export function SessionFields({
  value,
  timezone = 'America/Chicago',
}: {
  value: Pick<
    MarketSessionInput,
    'startsAt' | 'endsAt' | 'venue' | 'pickupInstructions' | 'preorderOverride'
  >;
  timezone?: string;
}) {
  const start = localParts(value.startsAt, timezone),
    end = localParts(value.endsAt, timezone);
  return (
    <>
      <p>
        Choose dates and times in the selected US time zone. Times skipped or
        repeated when clocks change cannot be used; choose another time.
      </p>
      <div className="form-grid">
        <TextField
          name="startDate"
          label="Start date"
          type="date"
          value={start.date}
        />
        <TextField
          name="startTime"
          label="Start time"
          type="time"
          value={start.time}
        />
        <TextField
          name="endDate"
          label="End date"
          type="date"
          value={end.date}
        />
        <TextField
          name="endTime"
          label="End time"
          type="time"
          value={end.time}
        />
        <TimezoneField name="sessionTimezone" value={timezone} />
        <TextField
          name="venue"
          label="Venue"
          info="The saved venue for this date, kept even if the market's default venue changes later."
          value={value.venue}
          required={false}
          maxLength={500}
        />
        <TextField
          name="pickupInstructions"
          label="Pickup Instructions"
          info="The saved pickup directions for this date, kept even if the market's default instructions change later."
          value={value.pickupInstructions}
          required={false}
          maxLength={2000}
        />
      </div>
      <RuleFields rule={value.preorderOverride} optional />
    </>
  );
}
export function RuleSummary({ rule }: { rule: PreorderRule | null }) {
  return rule ? (
    <p>
      Preorders open {rule.opensDaysBefore} days before at{' '}
      {clockTime(rule.opensTime)} and close {rule.closesDaysBefore} days before
      at {clockTime(rule.closesTime)}, in the market's time zone.
    </p>
  ) : null;
}
export function SelectField({
  required = true,
  ...props
}: ComponentProps<typeof SharedSelectField>) {
  return <SharedSelectField {...props} required={required} />;
}
export function Weekdays({ values }: { values: readonly number[] }) {
  const id = useId();
  return (
    <fieldset className="weekday-options">
      <legend>Market weekdays</legend>
      {[
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ].map((day, index) => (
        <label key={day} htmlFor={`${id}-${index}`}>
          <Input
            id={`${id}-${index}`}
            type="checkbox"
            name="weekdays"
            value={index}
            defaultChecked={values.includes(index)}
          />
          {day}
        </label>
      ))}
    </fieldset>
  );
}

export function ReadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: AppError;
  retry: () => void;
}) {
  return loading ? (
    <Spinner label="Loading current records" />
  ) : error ? (
    <>
      <ErrorState error={error} />
      <Button className="secondary" onClick={retry}>
        Try Again
      </Button>
    </>
  ) : null;
}
