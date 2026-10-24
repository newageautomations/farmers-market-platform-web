import { z } from 'zod';
import { faqAnswerParts, faqRoutes } from './faq';

export const policyLimit = 20;
export const policyTitleLimit = 160;
export const policyContentLimit = 20000;
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v));
const required = (max: number) =>
  text(max)
    .transform((v) => v.trim())
    .refine(Boolean);
export const policiesSchema = z
  .object({
    version: z.literal(1),
    enabled: z.boolean(),
    title: required(160),
    heading: required(160),
    description: text(600),
    policies: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/)
              .refine((id) => id === id.trim()),
            title: text(policyTitleLimit),
            content: text(policyContentLimit).refine(
              (v) =>
                [...v.matchAll(/\[[^\]\n]+\]\(([^)\n]*)\)/g)].every((m) =>
                  faqRoutes.includes(m[1] as (typeof faqRoutes)[number]),
                ),
              'Use only supported internal storefront links.',
            ),
            visible: z.boolean(),
          })
          .strict(),
      )
      .max(policyLimit)
      .refine(
        (items) => new Set(items.map((p) => p.id)).size === items.length,
        'Policy IDs must be unique.',
      ),
    cta: z
      .object({ heading: required(160), text: text(600), label: required(80) })
      .strict(),
  })
  .strict();
export type PoliciesConfig = z.infer<typeof policiesSchema>;
export const defaultPolicies: PoliciesConfig = {
  version: 1,
  enabled: false,
  title: 'Policies',
  heading: 'Our Policies',
  description:
    'Important information about preorders, market pickups, cancellations, returns, and purchases.',
  policies: [
    ['preordering-pickup', 'Preordering & Pickup'],
    ['changes-cancellations', 'Order Changes & Cancellations'],
    ['refunds-returns', 'Refunds & Returns'],
    ['product-information', 'Product Information & Allergens'],
  ].map(([id, title]) => ({
    id: id!,
    title: title!,
    content: '',
    visible: true,
  })),
  cta: {
    heading: 'Have a question about our policies?',
    text: "Contact us before placing your order and we'll be happy to help.",
    label: 'Contact Us',
  },
};
export const policyContentParts = faqAnswerParts;
export function publishedPolicyEntries(config: PoliciesConfig) {
  return config.policies.filter(
    (p) => p.visible && p.title.trim() && p.content.trim(),
  );
}
