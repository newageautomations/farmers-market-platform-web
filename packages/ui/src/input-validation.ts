import type { ComponentProps } from 'react';

// Kept identical to the backend contract; parity is checked by test:phone-validation.
export const fieldLimits = {
  firstName: 100,
  lastName: 100,
  contactName: 100,
  email: 254,
  emailAddress: 254,
  phone: 64,
  phoneNumber: 64,
  name: 200,
  businessName: 500,
  marketName: 200,
  location: 500,
  streetLine1: 255,
  streetLine2: 255,
  city: 255,
  province: 255,
  postalCode: 32,
  slug: 120,
  url: 2048,
  website: 2048,
  timezone: 100,
  search: 200,
  password: 1024,
  description: 10000,
  sku: 200,
  code: 120,
  venue: 500,
  pickupInstructions: 2000,
  note: 5000,
  reason: 2000,
  label: 200,
  'variant-name': 200,
  'listing-search': 200,
  accountHint: 200,
  localCode: 2000,
  policyVersion: 80,
  q: 200,
  provisioningKey: 120,
  operationKey: 120,
  'order-id': 80,
  currency: 3,
  currencyCode: 3,
  managerNotes: 5000,
  publicInstructions: 5000,
  help: 2000,
  category: 500,
  businessType: 500,
  social: 2048,
  unit: 80,
  aggregation: 30,
  route: 120,
  hostname: 253,
  identifier: 254,
} as const;

export function inputContract(
  props: ComponentProps<'input'>,
): ComponentProps<'input'> {
  const key = props.name ?? props.id?.split('-').at(-1) ?? '';
  const type =
    props.type ??
    (['email', 'emailAddress'].includes(key)
      ? 'email'
      : key.toLowerCase().includes('password')
        ? 'password'
        : 'text');
  if (
    [
      'hidden',
      'checkbox',
      'radio',
      'file',
      'button',
      'submit',
      'range',
      'color',
    ].includes(type)
  )
    return props;
  if (type === 'number')
    return {
      ...props,
      type,
      min: props.min ?? -2147483648,
      max: props.max ?? 2147483647,
      step: props.step ?? 1,
    };
  if (['date', 'datetime-local', 'time', 'month', 'week'].includes(type))
    return { ...props, type };
  const maximum =
    props.maxLength ??
    (type === 'email'
      ? 254
      : type === 'password'
        ? 1024
        : type === 'url'
          ? 2048
          : (fieldLimits[key as keyof typeof fieldLimits] ?? 500));
  return {
    ...props,
    type,
    maxLength: maximum,
    pattern:
      props.pattern ??
      (props.required && ['text', 'search'].includes(type)
        ? '.*\\S.*'
        : undefined),
  };
}
