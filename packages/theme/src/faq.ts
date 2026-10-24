import { z } from 'zod';

export const faqQuestionLimit = 30;
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v))
    .transform((v) => v.trim());
export const faqRoutes = [
  '/',
  '/products',
  '/about',
  '/find-us',
  '/contact',
  '/faq',
  '/policies',
] as const;
/** Deliberately small syntax: only exact, known storefront paths are linkable. */
export function faqAnswerParts(answer: string) {
  const parts: Array<{ text: string; href?: string }> = [];
  const links = /\[([^\]\n]+)\]\(([^)\n]*)\)/g;
  let end = 0;
  for (const match of answer.matchAll(links)) {
    parts.push({ text: answer.slice(end, match.index) });
    parts.push({
      text: match[1]!,
      ...(faqRoutes.includes(match[2] as (typeof faqRoutes)[number])
        ? { href: match[2] }
        : {}),
    });
    end = match.index! + match[0].length;
  }
  parts.push({ text: answer.slice(end) });
  return parts;
}
export const faqSchema = z
  .object({
    version: z.literal(1),
    enabled: z.boolean(),
    title: text(160).refine(Boolean),
    heading: text(160).refine(Boolean),
    description: text(600),
    questions: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/)
              .refine((id) => id === id.trim()),
            question: text(300),
            answer: text(5000).refine(
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
      .max(faqQuestionLimit)
      .refine(
        (items) => new Set(items.map((q) => q.id)).size === items.length,
        'Question IDs must be unique.',
      ),
    cta: z
      .object({
        heading: text(160).refine(Boolean),
        text: text(600),
        label: text(80).refine(Boolean),
      })
      .strict(),
  })
  .strict();
export type FaqConfig = z.infer<typeof faqSchema>;
export const defaultFaq: FaqConfig = {
  version: 1,
  enabled: false,
  title: 'FAQ',
  heading: 'Frequently Asked Questions',
  description:
    'Find answers to common questions about our products, upcoming markets, and preorders.',
  questions: [
    {
      id: 'upcoming-markets',
      question: 'Where can I find your upcoming markets?',
      answer:
        'You can view our confirmed upcoming market dates, locations, and directions on our [Find Us](/find-us) page.',
      visible: true,
    },
    {
      id: 'selected-market',
      question: 'How do I know my preorder is going to the right market?',
      answer:
        'When shopping, look for the "Preordering for [Market Name]" banner near the top of the page. It shows the market you are currently shopping for. Your Cart and Checkout also display your selected market so you can confirm the location and date before placing an order. Items already in your cart stay tied to their selected market.',
      visible: true,
    },
    {
      id: 'availability',
      question: 'Can I preorder every product in your shop?',
      answer:
        'Not always. Product availability depends on the market you have selected. You can still browse products that are not available for that market, but they cannot be added to your preorder.',
      visible: true,
    },
    {
      id: 'pickup',
      question: 'Where do I pick up my preorder?',
      answer:
        'Your selected market and available pickup instructions are displayed during checkout and in your order details. Review those details before your market visit.',
      visible: true,
    },
  ],
  cta: {
    heading: 'Still have questions?',
    text: "We're happy to help. Send us a message and we'll get back to you.",
    label: 'Contact Us',
  },
};
