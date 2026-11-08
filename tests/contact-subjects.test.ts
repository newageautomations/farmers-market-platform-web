import { describe, expect, it, vi } from 'vitest';
import type { ContactSubmission } from '@market/api';
import { withContactSubjects } from '../apps/admin/src/vendor/contact-subjects';

const full = (id: string, subject: string): ContactSubmission => ({
  id,
  full_name: `Sender ${id}`,
  email: `${id}@example.test`,
  phone: '',
  subject,
  message: 'Hello',
  order_number: '',
  created_at: '2026-11-05T12:00:00.000Z',
  read_at: null,
});

describe('withContactSubjects', () => {
  it('fills subjects from the detail read when an older backend lists names only', async () => {
    const detail = vi.fn(async (id: string) =>
      full(id, id === 'a' ? 'Product Question' : 'Existing Order'),
    );
    const page = await withContactSubjects(
      { detail },
      {
        items: [
          { id: 'a', full_name: 'A', created_at: '', read_at: null },
          { id: 'b', full_name: 'B', created_at: '', read_at: null },
        ],
        totalItems: 2,
      },
    );
    expect(page.items.map((row) => [row.subject, row.email])).toEqual([
      ['Product Question', 'a@example.test'],
      ['Existing Order', 'b@example.test'],
    ]);
    expect(detail).toHaveBeenCalledTimes(2);
  });

  it('does not issue detail reads when the list already has subjects', async () => {
    const detail = vi.fn();
    const listed = {
      items: [
        {
          id: 'a',
          full_name: 'A',
          created_at: '',
          read_at: null,
          subject: 'Other',
        },
      ],
      totalItems: 1,
    };
    expect(await withContactSubjects({ detail }, listed)).toBe(listed);
    expect(detail).not.toHaveBeenCalled();
  });

  it('keeps rows whose detail read fails', async () => {
    const page = await withContactSubjects(
      {
        detail: async (id: string) => {
          if (id === 'b') throw new Error('forbidden');
          return full(id, 'General Question');
        },
      },
      {
        items: [
          { id: 'a', full_name: 'A', created_at: '', read_at: null },
          { id: 'b', full_name: 'B', created_at: '', read_at: null },
        ],
        totalItems: 2,
      },
    );
    expect(page.items.map((row) => row.subject)).toEqual([
      'General Question',
      undefined,
    ]);
  });
});
