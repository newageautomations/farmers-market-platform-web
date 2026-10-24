import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from '../apps/storefront/src/components/ContactForm';
import { ContactSubmissions } from '../apps/admin/src/vendor/contact-submissions';
import { StorefrontAppearanceSettings } from '../apps/admin/src/StorefrontAppearance';
import {
  contactSchema,
  contactDetails,
  contactValueAdvice,
  contactHref,
  defaultContact,
  defaultStorefrontAppearance,
  storefrontPreviewPath,
} from '@market/theme/storefront';
import type { StorefrontAppearanceRecord } from '@market/api';
function fill() {
  fireEvent.change(screen.getByLabelText('Full name (required)'), {
    target: { value: "Zoë O'Neill 李" },
  });
  fireEvent.change(screen.getByLabelText('Email address (required)'), {
    target: { value: 'zoe@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Subject (required)'), {
    target: { value: 'General Question' },
  });
  fireEvent.change(screen.getByLabelText('Message (required)'), {
    target: { value: 'Hello\nA question' },
  });
}
describe('Contact form', () => {
  it('shows errors on submit, focuses the first field and preserves valid input', () => {
    render(<ContactForm />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(screen.getByLabelText('Full name (required)')).toHaveFocus();
    fill();
    fireEvent.change(screen.getByLabelText('Email address (required)'), {
      target: { value: 'bad' },
    });
    fireEvent.blur(screen.getByLabelText('Email address (required)'));
    expect(
      screen.getByText('Enter a valid email address.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Full name (required)')).toHaveValue(
      "Zoë O'Neill 李",
    );
  });
  it('accepts guests, prevents concurrent clicks and reuses the key after a failed response', async () => {
    let complete: (v: Response) => void = () => {};
    const fetcher = vi.fn(
      (_url: unknown, _init?: RequestInit) =>
        new Promise<Response>((r) => {
          complete = r;
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<ContactForm />);
    fill();
    const form = screen.getByRole('form', { name: 'Contact the vendor' });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const first = JSON.parse(fetcher.mock.calls[0]![1]!.body as string);
    complete(new Response(null, { status: 503 }));
    await screen.findByText(/We could not accept/);
    expect(document.querySelector('.contact-success-mark')).toBeNull();
    fireEvent.submit(form);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(fetcher.mock.calls[1]![1]!.body as string).idempotencyKey,
    ).toBe(first.idempotencyKey);
    complete(new Response(JSON.stringify({ accepted: true }), { status: 200 }));
    await screen.findByText('Thank you for getting in touch.');
    expect(document.querySelector('.contact-success-mark svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(first.phone).toBe('');
    expect(first.orderNumber).toBe('');
    vi.unstubAllGlobals();
  });
  it('keeps order references optional and blocks invalid international phone numbers', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    render(<ContactForm />);
    fill();
    expect(
      screen.queryByLabelText('Order number (optional)'),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Subject (required)'), {
      target: { value: 'Existing Order' },
    });
    expect(screen.getByLabelText('Order number (optional)')).not.toBeRequired();
    fireEvent.change(screen.getByLabelText('Phone number (optional)'), {
      target: { value: '123' },
    });
    fireEvent.submit(screen.getByRole('form'));
    expect(fetcher).not.toHaveBeenCalled();
    await screen.findByText(/Enter a valid phone number/);
    vi.unstubAllGlobals();
  });
  it('rejects overlong values and oversized pastes without truncating them silently', () => {
    render(<ContactForm />);
    fill();
    const name = screen.getByLabelText('Full name (required)');
    fireEvent.paste(name, {
      clipboardData: { getData: () => 'x'.repeat(101) },
    });
    expect(name).toHaveValue("Zoë O'Neill 李");
    expect(screen.getByText(/pasted text exceeds/)).toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'x'.repeat(101) } });
    fireEvent.blur(name);
    expect(
      screen.getByText('This field is too long. Please shorten it.'),
    ).toBeInTheDocument();
  });
  it('prefills profile details and never sends in preview', () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    render(
      <ContactForm
        preview
        initial={{
          firstName: 'Jane',
          lastName: 'Doe',
          emailAddress: 'jane@example.test',
        }}
      />,
    );
    expect(screen.getByLabelText('Full name (required)')).toHaveValue(
      'Jane Doe',
    );
    fireEvent.submit(screen.getByRole('form'));
    expect(fetcher).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
describe('Contact editor', () => {
  it('keeps formatting advisory while bounding structure and protecting links', () => {
    expect(contactSchema.safeParse(defaultContact).success).toBe(true);
    expect(
      contactSchema.safeParse({
        ...defaultContact,
        entries: [
          {
            id: 'address',
            type: 'address',
            value: '123 Market Street',
            visible: true,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({
        ...defaultContact,
        entries: [
          {
            id: 'address',
            type: 'address',
            value: 'x'.repeat(501),
            visible: true,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      contactDetails({
        ...defaultContact,
        entries: [
          {
            id: 'hidden',
            type: 'email',
            value: 'private@example.test',
            visible: false,
          },
          {
            id: 'public',
            type: 'email',
            value: 'public@example.test',
            visible: true,
          },
        ],
      }).email,
    ).toBe('public@example.test');

    expect(storefrontPreviewPath('/contact')).toBe(true);
    expect(storefrontPreviewPath('/contact/orders')).toBe(false);
    for (const value of [
      'javascript:alert(1)',
      'https://instagram.com.evil.test/a',
      'https://user@instagram.com/a',
    ])
      expect(
        contactSchema.safeParse({
          ...defaultContact,
          entries: [{ id: 'a', type: 'instagram', value, visible: true }],
        }).success,
      ).toBe(true);
    expect(
      contactSchema.safeParse({
        ...defaultContact,
        entries: Array.from({ length: 13 }, (_, i) => ({
          id: String(i),
          type: 'email',
          value: '',
          visible: false,
        })),
      }).success,
    ).toBe(false);
  });
  it('gives nonblocking advice and safe link destinations', () => {
    expect(contactValueAdvice('email', 'unfinished')).toContain(
      'complete email',
    );
    expect(contactValueAdvice('address', 'x'.repeat(501))).toContain('500');
    expect(contactValueAdvice('instagram', 'https://instagram')).toContain(
      'HTTPS',
    );
    expect(contactHref('instagram', 'javascript:alert(1)')).toBeUndefined();
    expect(
      contactHref('facebook', 'https://facebook.com.evil.test/x'),
    ).toBeUndefined();
    expect(contactHref('email', 'unfinished')).toBeUndefined();
    expect(contactHref('email', 'hello@example.test')).toBe(
      'mailto:hello%40example.test',
    );
  });
  it('uses five fixed fields, blank omission, history, draft and publish', async () => {
    const record: StorefrontAppearanceRecord = {
      id: '11',
      name: 'Farm',
      version: 1,
      draft: structuredClone(defaultStorefrontAppearance),
      published: null,
      publishedAt: null,
    };
    const api = {
      read: vi.fn(async () => [record]),
      links: vi.fn(async () => []),
      preview: vi.fn(async () => ({
        token: 'x'.repeat(43),
        url: 'http://preview.localhost:4321',
        expiresAt: Date.now() + 300000,
      })),
      save: vi.fn(async (_id, _version, draft) => ({
        ...record,
        draft,
        version: 2,
      })),
      publish: vi.fn(async () => ({ ...record, version: 3 })),
    };
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    fireEvent.change(await screen.findByLabelText('Preview page'), {
      target: { value: 'contact' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Contact page' }));
    fireEvent.click(screen.getByLabelText('Enable Contact page'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Public contact information' }),
    );
    for (const label of ['Email', 'Phone', 'Address', 'Facebook', 'Instagram'])
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Contact Information' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Show publicly')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'public@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '123 Market Street' },
    });
    fireEvent.change(screen.getByLabelText('Facebook'), {
      target: { value: 'https://www.facebook.com/test-farm' },
    });
    fireEvent.change(screen.getByLabelText('Instagram'), {
      target: { value: 'https://www.instagram.com/test-farm' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '' },
    });
    expect(screen.getByLabelText('Address')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Address')).toHaveValue('123 Market Street');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByLabelText('Address')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'unfinished' },
    });
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: 'phone still being typed' },
    });
    fireEvent.change(screen.getByLabelText('Facebook'), {
      target: { value: 'https://facebook' },
    });
    fireEvent.change(screen.getByLabelText('Instagram'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: 'x'.repeat(501) },
    });
    expect(screen.getByText(/complete email address/)).toBeInTheDocument();
    expect(screen.getByText(/Recommended maximum: 500/)).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toHaveValue(
      'phone still being typed',
    );
    expect(
      (screen.getByLabelText('Phone') as HTMLInputElement).validationMessage,
    ).toBe('');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![2].contact.entries[0]).toMatchObject({
      value: 'unfinished',
      visible: true,
    });
    expect(
      api.save.mock.calls[0]![2].contact.entries.some(
        (e: { type: string }) => e.type === 'address',
      ),
    ).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(api.publish).toHaveBeenCalled());
  });
});
describe('Contact dashboard', () => {
  it('opens the requested modal, escapes text, marks read and supports external contact actions', async () => {
    window.history.replaceState(
      null,
      '',
      '/vendor/contact-submissions?submission=abc',
    );
    const row = {
      id: 'abc',
      full_name: 'Emily',
      email: 'emily@example.test',
      phone: '+14155552671',
      subject: 'Product Question',
      message: '<script>hello</script>\nSecond line',
      order_number: '',
      created_at: '2026-10-24T12:00:00Z',
      read_at: null,
    };
    const api = {
      list: vi.fn(async () => ({ items: [row], totalItems: 1 })),
      detail: vi.fn(async () => row),
      read: vi.fn(async (_id, read) => ({
        ...row,
        read_at: read ? '2026-10-24T13:00:00Z' : null,
      })),
    };
    render(<ContactSubmissions api={api} />);
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Message from Emily',
    );
    await screen.findByText(/<script>hello<\/script>/);
    expect(document.querySelector('script')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'emily@example.test' }),
    ).toHaveAttribute('href', 'mailto:emily%40example.test');
    expect(api.read).toHaveBeenCalledWith('abc', true);
    fireEvent.click(screen.getByRole('button', { name: 'Mark unread' }));
    await waitFor(() => expect(api.read).toHaveBeenCalledWith('abc', false));
    expect(
      screen.queryByRole('button', { name: 'Send Reply' }),
    ).not.toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });
});
