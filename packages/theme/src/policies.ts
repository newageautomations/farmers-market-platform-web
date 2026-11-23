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
/**
 * Written starter text for a market's Policies and Terms & Conditions pages,
 * keyed by item id. It is plain, general wording a market can publish as is
 * or adjust, with no em dashes and no platform terms.
 */
export const marketStarterText: Record<string, string> = {
  'preordering-pickup': `You can preorder from our vendors online and collect your order at the market. When you shop, choose the market date you plan to attend. Each item you order is held for that date.

On market day, bring your order confirmation on your phone or printed, and pick up your items from each vendor's stall during market hours. If you can't make it, please contact us before market day so we can let the vendors know.

Orders that aren't collected by the end of the market may not be held for a later date.`,
  'changes-cancellations': `Need to change or cancel an order? Contact us as soon as you can, and no later than the day before your market date. We'll pass your request on to the vendor.

Vendors start preparing orders before market day, so changes made close to the market can't always be accepted. If a vendor can't fill part of your order, you'll only pay for what you receive.`,
  'refunds-returns': `Most of what's sold at our market is fresh food grown or made by local vendors, so we can't take items back once they've been collected.

If something isn't right with your order, please tell the vendor at the market, or contact us within two days of your pickup. We'll work with the vendor to make it right, which may mean a replacement or a refund for the affected item.

Refunds go back to the card you paid with and can take a few business days to appear.`,
  'product-information': `Each vendor is responsible for the description, ingredients and allergen information of what they sell. Many items are made in kitchens that also handle common allergens such as wheat, milk, eggs, tree nuts, peanuts and soy.

If you have an allergy or a dietary need, please ask the vendor before you buy. Photos are for illustration only, and fresh produce can vary in size, color and weight from week to week.`,
  'terms-using-site': `By using this website, you agree to these terms. The website lets you learn about our market, see upcoming market dates and vendors, and preorder items to pick up at the market.

Please use the website for your own shopping and keep your account details private. We may close an account that is used to misuse the website or to mistreat our vendors or shoppers.`,
  'terms-preorders': `When you place a preorder, you are buying directly from the vendor who sells the item. Prices and any fees are shown before you pay, and payment is taken when you place your order.

Your preorder is held for the market date you chose. Please collect it during market hours on that date.`,
  'terms-vendors': `Our vendors are independent local businesses. Each vendor is responsible for the quality, safety and labeling of their products, and for keeping their listings accurate.

We choose vendors we trust, but we can't promise that a particular product will be available on a given market day.`,
  'terms-market-dates': `Market dates, hours and locations can change, and a market is sometimes cancelled because of weather or other events outside our control.

If a market you preordered for is cancelled, we'll let you know as soon as we can and refund your payment, or move your order to another date if you agree.`,
  'terms-privacy': `We use your name, email address and phone number to manage your orders and to contact you about them. We share only the details a vendor needs to prepare your order. We never sell your personal information.`,
  'terms-changes': `We may update these terms from time to time. The date at the top of this page shows when they last changed. If you have a question about these terms, please contact us.`,
};
/** Policies for a new market website: the standard topics, already written. */
export const defaultMarketPolicies: PoliciesConfig = {
  ...defaultPolicies,
  heading: 'Our policies',
  description: '',
  policies: defaultPolicies.policies.map((policy) => ({
    ...policy,
    content: marketStarterText[policy.id] ?? '',
  })),
};
/** Starter Terms & Conditions for a market website, already written. */
export const defaultMarketTerms: PoliciesConfig = {
  version: 1,
  enabled: false,
  title: 'Terms & Conditions',
  heading: 'Terms & Conditions',
  description: '',
  policies: [
    ['terms-using-site', 'Using this website'],
    ['terms-preorders', 'Preorders and payment'],
    ['terms-vendors', 'Our vendors and their products'],
    ['terms-market-dates', 'Market dates and cancellations'],
    ['terms-privacy', 'Your information'],
    ['terms-changes', 'Changes to these terms'],
  ].map(([id, title]) => ({
    id: id!,
    title: title!,
    content: marketStarterText[id!] ?? '',
    visible: true,
  })),
  // Required by the shared policies contract; Terms pages never show it.
  cta: {
    heading: 'Questions about these terms?',
    text: '',
    label: 'Contact Us',
  },
};
