import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContactForm } from '../apps/storefront/src/components/ContactForm';
import {
  defaultMarketContactForm,
  type ContactFormField,
} from '@market/theme/storefront';

const fields: ContactFormField[] = [
  ...defaultMarketContactForm.fields,
  {
    id: 'stall',
    type: 'select',
    label: 'Stall size',
    required: true,
    options: ['10x10', '10x20'],
  },
  { id: 'farm', type: 'text', label: 'Farm name', required: false },
];

describe('Market contact form', () => {
  it("renders the manager's fields and sends custom answers with the message", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ accepted: true })),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<ContactForm fields={fields} recipient="market" />);
    expect(
      screen.getByRole('form', { name: 'Contact the market' }),
    ).toBeInTheDocument();
    // Long answers span both columns; the rest share a row.
    expect(
      screen.getByLabelText('Message (required)').closest('[data-wide]'),
    ).not.toBeNull();
    expect(
      screen.getByLabelText('Farm name (optional)').closest('[data-wide]'),
    ).toBeNull();
    // Empty required fields are reported and nothing is sent.
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getAllByText('Please complete this field.').length).toBe(5);

    fireEvent.change(screen.getByLabelText('Full name (required)'), {
      target: { value: 'Ann Visitor' },
    });
    fireEvent.change(screen.getByLabelText('Email (required)'), {
      target: { value: 'ann@example.test' },
    });
    // A market subject that is not one of the vendor subjects is accepted.
    fireEvent.change(screen.getByLabelText('Subject (required)'), {
      target: { value: 'Vendor Inquiry' },
    });
    fireEvent.change(screen.getByLabelText('Message (required)'), {
      target: { value: 'Can I join?' },
    });
    fireEvent.change(screen.getByLabelText('Stall size (required)'), {
      target: { value: '10x20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    );
    expect(body).toMatchObject({
      fullName: 'Ann Visitor',
      email: 'ann@example.test',
      subject: 'Vendor Inquiry',
      message: 'Can I join?',
      orderNumber: '',
    });
    expect(body.answers).toEqual([
      { id: 'stall', value: '10x20' },
      { id: 'farm', value: '' },
    ]);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'The market can contact you',
    );
    vi.unstubAllGlobals();
  });
});
