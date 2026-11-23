import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { storefrontPreviewPath } from '@market/theme/storefront';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutTermsAcceptance } from '../apps/storefront/src/components/CheckoutTermsAcceptance';

describe('vendor terms', () => {
  it('uses the shared vendor-only link in every theme footer and keeps it out of headers and pickers', () => {
    const root = resolve('apps/storefront/src/components');
    const source = (path: string) => readFileSync(path, 'utf8');
    const link = source(resolve(root, 'VendorTermsLink.astro'));
    expect(link).toContain("context?.kind === 'VENDOR'");
    expect(link).toContain('href="/terms-and-conditions"');
    const themeFooters = [
      'home/HarvestFooter',
      'modern-farmhouse/Footer',
      'legacy-modern-farmhouse/Footer',
      'editorial-market/Footer',
      'hearth/Footer',
      'meadow/Footer',
      'pasture/Footer',
    ];
    for (const footer of themeFooters)
      expect(source(resolve(root, `${footer}.astro`))).toContain(
        '<VendorTermsLink context={context} />',
      );
    for (const path of readdirSync(root, {
      recursive: true,
      encoding: 'utf8',
    }).filter((path) => /Header\.astro$/.test(path))) {
      expect(source(resolve(root, path))).not.toMatch(
        /VendorTermsLink|terms-and-conditions/,
      );
    }
    expect(source('apps/admin/src/WebsiteSectionManagement.tsx')).not.toContain(
      '/terms-and-conditions',
    );
    expect(storefrontPreviewPath('/terms-and-conditions')).toBe(true);
  });

  it.each([1, 2])(
    'shows one market checkbox for %i sellers and provides versioned links and disclosures',
    (count) => {
      const sellers = [
        {
          vendorId: '7',
          vendorName: 'Orchard',
          version: 'b'.repeat(64),
          policies: [
            {
              title: 'Cancellations',
              content: 'Contact us by noon on Friday.',
            },
          ],
          pickupRefundNotice: null,
        },
        {
          vendorId: '8',
          vendorName: 'Garden',
          version: 'c'.repeat(64),
          policies: [],
          pickupRefundNotice: 'Pickup charges are excluded from item refunds.',
        },
      ].slice(0, count);
      render(
        <CheckoutTermsAcceptance
          disclosure={{ token: 'a'.repeat(64), sellers }}
          market
          checked={false}
          disabled={false}
          onChange={vi.fn()}
        />,
      );
      expect(screen.getAllByRole('checkbox')).toHaveLength(1);
      expect(
        screen.getByRole('checkbox', {
          name: `I agree to the Terms & Conditions for my purchases from ${sellers.map((seller) => seller.vendorName).join(', ')}.`,
        }),
      ).not.toBeChecked();
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(count);
      expect(links.map((link) => link.textContent)).toEqual(
        sellers.map((seller) => seller.vendorName),
      );
      expect(
        within(
          screen.getByRole('list', { name: 'Seller policies' }),
        ).queryByRole('link'),
      ).toBeNull();
      expect(links[0]).toHaveAttribute(
        'href',
        `/checkout/seller-terms/${sellers[0]!.version}`,
      );
      expect(
        screen.getByText('Contact us by noon on Friday.'),
      ).toBeInTheDocument();
    },
  );

  it('shows only the inline market terms link for a seller without other disclosures', () => {
    const onChange = vi.fn();
    render(
      <CheckoutTermsAcceptance
        disclosure={{
          token: 'a'.repeat(64),
          sellers: [
            {
              vendorId: '7',
              vendorName: 'Orchard',
              version: 'b'.repeat(64),
              policies: [],
              pickupRefundNotice: null,
            },
          ],
        }}
        market
        checked={false}
        disabled={false}
        onChange={onChange}
      />,
    );
    expect(screen.queryByRole('list')).toBeNull();
    const link = screen.getByRole('link', { name: 'Orchard' });
    expect(link).toHaveAttribute('target', '_blank');
    fireEvent.click(link);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByText(
        'I agree to the Terms & Conditions for my purchases from',
      ),
    );
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
