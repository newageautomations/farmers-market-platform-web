import type { CSSProperties } from 'react';
import './providers.css';

/**
 * Display names and marks for payment and POS providers. Backend provider
 * codes stay authoritative; this only presents them. Marks are Simple Icons
 * (CC0) and the supplied Clover image, see ./brands/LICENSE.md; providers
 * without a mark get a lettered tile.
 */
const providers: Record<
  string,
  {
    name: string;
    color: string;
    mark?: 'square' | 'stripe' | 'shopify' | 'clover' | 'toast' | 'lightspeed';
  }
> = {
  square: { name: 'Square', color: '#3e4348', mark: 'square' },
  stripe: { name: 'Stripe', color: '#635bff', mark: 'stripe' },
  shopify: { name: 'Shopify', color: '#5e8e3e', mark: 'shopify' },
  clover: { name: 'Clover', color: '#228800', mark: 'clover' },
  toast: { name: 'Toast', color: '#ff4c00', mark: 'toast' },
  'lightspeed-x': {
    name: 'Lightspeed X-Series',
    color: '#e81c1c',
    mark: 'lightspeed',
  },
};
const known = (code: string) => providers[code.toLowerCase()];

/** "lightspeed-x" → "Lightspeed X-Series"; unknown codes become title case. */
export function providerName(code: string) {
  return (
    known(code)?.name ??
    code
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  );
}

/** "NOT_CONFIGURED" → "Not configured"; "catalogRead" → "Catalog read". */
export function codeLabel(value: string) {
  if (/^oauth$/i.test(value)) return 'OAuth';
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) =>
      /^(API|POS|ID|SKU|OAUTH)$/i.test(word)
        ? word.toUpperCase().replace('OAUTH', 'OAuth')
        : word.toLowerCase(),
    )
    .join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ProviderLogo({ code }: { code: string }) {
  const provider = known(code);
  const name = providerName(code);
  return (
    <span
      aria-hidden="true"
      className={`provider-logo${provider?.mark ? ' provider-logo-mark' : ''}`}
      style={
        {
          '--provider-color': provider?.color ?? 'var(--brand-primary)',
        } as CSSProperties
      }
    >
      {provider?.mark ? (
        <span
          className={`provider-logo-glyph provider-logo-${provider.mark}`}
        />
      ) : (
        name.charAt(0)
      )}
    </span>
  );
}
