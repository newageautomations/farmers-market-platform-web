import { z } from 'zod';
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v))
    .transform((v) => v.trim());
export const contactEntryTypes = [
  'email',
  'phone',
  'address',
  'facebook',
  'instagram',
] as const;
export const contactSubjects = [
  'General Question',
  'Product Question',
  'Existing Order',
  'Market / Pickup Question',
  'Wholesale / Business Inquiry',
  'Other',
] as const;
/** Formatting and recommended lengths are editor advice; structural bounds remain enforced. */
export const contactSchema = z
  .object({
    enabled: z.boolean(),
    title: text(20000),
    heading: text(20000),
    description: text(20000),
    informationHeading: text(20000),
    socialHeading: text(20000),
    entries: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
            type: z.enum(contactEntryTypes),
            value: text(20000),
            visible: z.boolean(),
          })
          .strict(),
      )
      .max(12),
    cta: z
      .object({ heading: text(20000), text: text(20000), label: text(20000) })
      .strict(),
  })
  .strict()
  .refine(
    (v) => new Set(v.entries.map((e) => e.id)).size === v.entries.length,
    { message: 'Contact entries must be unique.' },
  );
export function contactTextAdvice(
  value: string,
  max: number,
  required = false,
) {
  if (value.length > max)
    return `Recommended maximum: ${max} characters. Your text is kept as entered.`;
  if (required && !value.trim()) return 'Add text here when you are ready.';
  return '';
}
export function contactValueAdvice(
  type: (typeof contactEntryTypes)[number],
  value: string,
) {
  if (!value.trim()) return '';
  const length = contactTextAdvice(
    value,
    type === 'email'
      ? 254
      : type === 'phone'
        ? 64
        : type === 'address'
          ? 500
          : 2048,
  );
  if (length) return length;
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return 'Enter a complete email address, such as hello@example.com.';
  if (
    (type === 'facebook' || type === 'instagram') &&
    !contactHref(type, value)
  )
    return `Use a complete HTTPS ${type === 'facebook' ? 'Facebook' : 'Instagram'} link.`;
  return '';
}
/** Unformatted public values remain readable text, never unsafe links. */
export function contactHref(
  type: (typeof contactEntryTypes)[number],
  value: string,
): string | undefined {
  value = value.trim();
  if (type === 'email')
    return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? `mailto:${encodeURIComponent(value)}`
      : undefined;
  if (type === 'phone')
    return /^\+[1-9][0-9]{6,14}$/.test(value) ? `tel:${value}` : undefined;
  if (type === 'facebook' || type === 'instagram') {
    try {
      const url = new URL(value);
      if (
        value.length <= 2048 &&
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.port &&
        [`${type}.com`, `www.${type}.com`].includes(url.hostname)
      )
        return value;
    } catch {
      /* Incomplete input stays plain text. */
    }
  }
  return undefined;
}
export type ContactConfig = z.infer<typeof contactSchema>;
export const defaultContact: ContactConfig = {
  enabled: false,
  title: 'Contact',
  heading: 'Get in touch.',
  description:
    "Have a question about our products, your preorder, or where to find us? We'd love to hear from you.",
  informationHeading: 'Contact information',
  socialHeading: 'Follow along',
  entries: [],
  cta: {
    heading: 'Prefer to say hello in person?',
    text: 'Come visit us at one of our upcoming farmers markets.',
    label: 'Find Us',
  },
};

/** Keep legacy hidden values private and select one public value per fixed field. */
export function contactDetails(
  config: Pick<ContactConfig, 'entries'>,
): Record<(typeof contactEntryTypes)[number], string> {
  return Object.fromEntries(
    contactEntryTypes.map((type) => [
      type,
      config.entries.find(
        (entry) => entry.type === type && entry.visible && entry.value.trim(),
      )?.value ?? '',
    ]),
  ) as Record<(typeof contactEntryTypes)[number], string>;
}
