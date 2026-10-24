import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

/** Match the existing country-aware phone input without altering the saved value. */
export function formatPublicPhone(value: string) {
  const phone = parsePhoneNumberFromString(value.trim(), 'US');
  if (!phone?.isValid() || phone.ext) return value;
  return phone.countryCallingCode === '1'
    ? `+1 ${phone.formatNational()}`
    : phone.formatInternational();
}
