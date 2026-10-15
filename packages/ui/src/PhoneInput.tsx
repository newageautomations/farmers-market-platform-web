import { inputClassName } from './presentation';
import { SearchSelect } from './SearchSelect';
import { countryNames } from './phone-countries';
import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/max';

const names = { of: (c: string) => countryNames[c] ?? c };
const countries = getCountries().sort((a, b) =>
  (names.of(a) ?? a).localeCompare(names.of(b) ?? b),
);
const subscribeHydration = () => () => {};
const clientHydration = () => true;
const serverHydration = () => false;
function display(value: string, country: CountryCode) {
  if (!value) return '';
  if (!/^[+\d () .-]+$/.test(value)) return value;
  const parsed = value.startsWith('+')
    ? parsePhoneNumberFromString(value)
    : undefined;
  if (parsed?.country === country && parsed.isValid())
    return parsed.formatNational();
  const national =
    parsed?.country === country ? String(parsed.nationalNumber) : value;
  return /^[\d () .-]+$/.test(national)
    ? new AsYouType(country).input(national)
    : national;
}

/** The submitted value is E.164 when valid. Invalid pasted digits remain visible and cannot submit. */
export function PhoneInput({
  id,
  name,
  label,
  value,
  defaultValue = '',
  onChange,
  required = false,
  disabled = false,
  'aria-describedby': describedBy,
}: {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientHydration,
    serverHydration,
  );
  const generated = useId(),
    inputId = id ?? `phone-${generated}`;
  const initial = value ?? defaultValue,
    parsed = parsePhoneNumberFromString(initial);
  const [country, setCountry] = useState<CountryCode>(parsed?.country ?? 'US');
  const [national, setNational] = useState(
    display(initial, parsed?.country ?? 'US'),
  );
  const [rejected, setRejected] = useState('');
  const nextCursor = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null),
    emitted = useRef(initial),
    deleting = useRef(false);
  const parsedNational = parsePhoneNumberFromString(national, country);
  const valid = !national
    ? !required
    : /^[\d () .-]+$/.test(national) &&
      !rejected &&
      (!['US', 'CA'].includes(country) ||
        national.replace(/\D/g, '').length === 10) &&
      !!parsedNational?.isValid() &&
      parsedNational.country === country &&
      !parsedNational.ext;
  const canonical = national
    ? valid
      ? String(parsedNational!.number)
      : rejected
        ? ''
        : `+${getCountryCallingCode(country)}${national.replace(/\D/g, '')}`
    : '';
  const message =
    rejected ||
    (valid
      ? ''
      : !national
        ? 'Enter a phone number.'
        : 'Enter a valid phone number for the selected country.');
  useEffect(() => {
    if (value === undefined || value === emitted.current) return;
    emitted.current = value;
    const p = parsePhoneNumberFromString(value),
      c = p?.country ?? country;
    setCountry(c);
    setNational(display(value, c));
  }, [value, country]);
  useEffect(() => {
    input.current?.setCustomValidity(message);
  }, [message]);
  useLayoutEffect(() => {
    if (nextCursor.current !== null) {
      input.current?.setSelectionRange(nextCursor.current, nextCursor.current);
      nextCursor.current = null;
    }
  }, [national]);
  function publish(text: string, c: CountryCode) {
    setRejected('');
    setNational(text);
    setCountry(c);
    const p = parsePhoneNumberFromString(text, c);
    const v = !text
      ? ''
      : /^[\d () .-]+$/.test(text) && p?.isValid() && p.country === c && !p.ext
        ? String(p.number)
        : `+${getCountryCallingCode(c)}${text.replace(/\D/g, '')}`;
    emitted.current = v;
    onChange?.(v);
  }
  return (
    <div className="phone-field" data-ready={hydrated}>
      {label && (
        <label htmlFor={inputId}>
          {label}
          {required ? ' (required)' : ''}
        </label>
      )}
      <div className="phone-controls">
        <SearchSelect
          id={`${inputId}-country`}
          label={`Country calling code${label ? ` for ${label}` : ''}`}
          placeholder="Choose country"
          selectedLabel={`+${getCountryCallingCode(country)}`}
          value={country}
          disabled={disabled || !hydrated}
          onChange={(c) => publish(national, c as CountryCode)}
          options={countries.map((c) => ({
            value: c,
            label: `${names.of(c) ?? c} +${getCountryCallingCode(c)}`,
          }))}
        />
        <input
          className={inputClassName('tel')}
          ref={input}
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={national}
          required={required}
          disabled={disabled || !hydrated}
          aria-label={label ? undefined : 'National phone number'}
          aria-invalid={!valid && !!national}
          aria-describedby={[describedBy, `${inputId}-feedback`]
            .filter(Boolean)
            .join(' ')}
          onBeforeInput={(e) => {
            const native = e.nativeEvent as InputEvent;
            if (
              native.inputType === 'insertText' &&
              native.data &&
              !/^[0-9]+$/.test(native.data)
            )
              e.preventDefault();
            deleting.current =
              (e.nativeEvent as InputEvent).inputType?.startsWith('delete') ??
              false;
          }}
          onKeyDown={(e) => {
            if (
              !e.ctrlKey &&
              !e.metaKey &&
              !e.altKey &&
              e.key.length === 1 &&
              !/^[0-9]$/.test(e.key)
            )
              e.preventDefault();
            deleting.current = e.key === 'Backspace' || e.key === 'Delete';
          }}
          onChange={(e) => {
            let raw = e.target.value,
              caret = e.target.selectionStart ?? raw.length,
              c = country;
            if (
              !/^[+\d () .-]*$/.test(raw) ||
              (raw.includes('+') && !/^\+[^+]*$/.test(raw))
            ) {
              e.target.value = national;
              setRejected(
                'Enter digits only. Alphabetic phone numbers and unsupported symbols are not accepted.',
              );
              return;
            }
            const pasted =
              raw.startsWith('+') && /^[+\d () .-]+$/.test(raw)
                ? parsePhoneNumberFromString(raw)
                : undefined;
            if (
              raw.startsWith('+') &&
              (!pasted?.country || !pasted.isValid() || pasted.ext)
            ) {
              e.target.value = national;
              setRejected(
                'Paste a complete valid phone number. The number was not shortened.',
              );
              return;
            }
            if (pasted?.country) {
              c = pasted.country;
              raw = pasted.formatNational();
              caret = raw.length;
            }
            let digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
            if (
              deleting.current &&
              raw.replace(/\D/g, '') === national.replace(/\D/g, '')
            ) {
              const digits = raw.replace(/\D/g, '');
              raw =
                digits.slice(0, Math.max(0, digitsBefore - 1)) +
                digits.slice(digitsBefore);
              digitsBefore = Math.max(0, digitsBefore - 1);
            }
            deleting.current = false;
            if (
              ['US', 'CA'].includes(c) &&
              raw.replace(/\D/g, '').length > 10
            ) {
              e.target.value = national;
              setRejected(
                'US and Canada numbers must have exactly ten national digits. The number was not shortened.',
              );
              return;
            }
            const formatted = display(raw, c);
            {
              let n = 0,
                position = 0;
              while (position < formatted.length && n < digitsBefore) {
                if (/\d/.test(formatted[position]!)) n++;
                position++;
              }
              nextCursor.current = position;
            }
            publish(formatted, c);
          }}
        />
        {name && (
          <input
            type="hidden"
            name={name}
            value={canonical}
            disabled={disabled}
          />
        )}
      </div>
      <small
        id={`${inputId}-feedback`}
        aria-live="polite"
        hidden={!!national && valid}
      >
        {rejected || (national && !valid)
          ? message
          : national
            ? ''
            : `Include a complete national number. Country code +${getCountryCallingCode(country)}.`}
      </small>
    </div>
  );
}
