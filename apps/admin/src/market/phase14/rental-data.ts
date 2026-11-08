export function usdToMinor(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Enter a price with up to two decimal places.');
  const [dollars, cents = ''] = value.split('.');
  const minor = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor > 100000000)
    throw new Error('Price must be between $0.00 and $1,000,000.00.');
  return minor;
}
