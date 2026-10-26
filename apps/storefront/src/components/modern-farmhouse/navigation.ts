import type { StorefrontContext } from '@market/storefront-core';
export function farmhouseLinks(context: StorefrontContext) {
  const a = context.appearance;
  const h = a?.template?.settings.header;
  return [
    { href: '/products', label: h?.shopLabel || 'The shop', enabled: true },
    {
      href: '/about',
      label: h?.storyLabel || a?.about.title || 'Our story',
      enabled: a?.about.enabled,
    },
    {
      href: '/find-us',
      label: a?.findUs?.title || 'Find us',
      enabled: a?.findUs?.enabled,
    },
    {
      href: '/contact',
      label: a?.contact?.title || 'Contact',
      enabled: a?.contact?.enabled,
    },
    {
      href: '/faq',
      label: a?.faq?.title || 'Questions',
      enabled: a?.faq?.enabled,
    },
    {
      href: '/policies',
      label: a?.policies?.title || 'Policies',
      enabled: a?.policies?.enabled,
    },
  ].filter((link) => link.enabled);
}
export function farmhouseDestination(context: StorefrontContext, href: string) {
  return (
    href === '/' ||
    href.startsWith('/products') ||
    farmhouseLinks(context).some((link) => link.href === href)
  );
}
