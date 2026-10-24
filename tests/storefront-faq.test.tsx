import { describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { FaqEditor } from '../apps/admin/src/FaqEditor';
import { StorefrontAppearanceSettings } from '../apps/admin/src/StorefrontAppearance';
import {
  defaultFaq,
  defaultStorefrontAppearance,
  faqSchema,
  faqAnswerParts,
  storefrontAppearanceSchema,
  type FaqConfig,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
import type { StorefrontAppearanceRecord } from '@market/api';

describe('FAQ configuration', () => {
  it('keeps starter questions private and distinguishes deliberate emptiness', () => {
    expect(defaultFaq.enabled).toBe(false);
    expect(faqSchema.parse(defaultFaq).questions).toHaveLength(4);
    expect(
      storefrontAppearanceSchema.parse(defaultStorefrontAppearance).faq,
    ).toBeUndefined();
    expect(faqSchema.parse({ ...defaultFaq, questions: [] }).questions).toEqual(
      [],
    );
    const saved = {
      ...defaultFaq,
      questions: [
        { ...defaultFaq.questions[2]!, answer: 'My answer', visible: false },
      ],
    };
    expect(faqSchema.parse(saved)).toEqual(saved);
  });
  it('rejects count, identity, field, visibility and total size violations', () => {
    const q = defaultFaq.questions[0]!;
    for (const patch of [
      {
        questions: Array.from({ length: 31 }, (_, i) => ({
          ...q,
          id: `q-${i}`,
        })),
      },
      { questions: [q, q] },
      { questions: [{ ...q, id: '../escape' }] },
      { questions: [{ ...q, id: 'trailing\n' }] },
      { questions: [{ ...q, question: 'x'.repeat(301) }] },
      { questions: [{ ...q, answer: 'x'.repeat(5001) }] },
      { questions: [{ ...q, visible: 'yes' }] },
      { version: 2 },
      { extra: true },
    ])
      expect(faqSchema.safeParse({ ...defaultFaq, ...patch }).success).toBe(
        false,
      );
    expect(
      storefrontAppearanceSchema.safeParse({
        ...defaultStorefrontAppearance,
        faq: {
          ...defaultFaq,
          questions: Array.from({ length: 30 }, (_, i) => ({
            ...q,
            id: `q-${i}`,
            answer: 'x'.repeat(5000),
          })),
        },
      }).success,
    ).toBe(false);
  });
  it('only accepts exact storefront links and treats raw HTML as text', () => {
    for (const href of [
      'javascript:alert(1)',
      '//evil.test',
      'https://evil.test',
      '/find-us?next=https://evil.test',
      '/api/shop',
      '/account',
      '/find-us/../contact',
      '/%2f%2fevil',
    ]) {
      expect(
        faqSchema.safeParse({
          ...defaultFaq,
          questions: [{ ...defaultFaq.questions[0], answer: `[go](${href})` }],
        }).success,
      ).toBe(false);
      expect(faqAnswerParts(`[go](${href})`).some((p) => p.href)).toBe(false);
    }
    expect(faqAnswerParts('First\n\n[Find Us](/find-us) <script>')).toEqual([
      { text: 'First\n\n' },
      { text: 'Find Us', href: '/find-us' },
      { text: ' <script>' },
    ]);
  });
});
function Editor({ initial = defaultFaq }: { initial?: FaqConfig }) {
  const [value, setValue] = useState(structuredClone(initial));
  const [selected, setSelected] =
    useState<StorefrontEditorSection>('faq-settings');
  const [collapsed, setCollapsed] = useState(false);
  const choose = (id: StorefrontEditorSection) => {
    setSelected(id);
    setCollapsed(false);
  };
  return (
    <FaqEditor
      value={value}
      onChange={setValue}
      selected={selected}
      collapsed={collapsed}
      collapse={() => setCollapsed(true)}
      choose={choose}
      busy={false}
    />
  );
}
describe('FAQ ordered form', () => {
  it('uses compact question disclosures, About reorder rails and switches, with confirmed deletion inside', () => {
    const { container } = render(<Editor />);
    const settings = screen.getByLabelText('Page title').closest('details');
    expect(settings).toContainElement(screen.getByLabelText('Heading'));
    expect(settings).toContainElement(screen.getByLabelText('Introduction'));
    expect(screen.queryByLabelText('Question')).not.toBeInTheDocument();
    const first = screen.getByRole('button', {
      name: defaultFaq.questions[0]!.question,
    });
    expect(first).toHaveTextContent(defaultFaq.questions[0]!.question);
    expect(first.querySelector('.faq-editor-question-label')).toHaveAttribute(
      'title',
      defaultFaq.questions[0]!.question,
    );
    expect(first.textContent).not.toContain(defaultFaq.questions[0]!.answer);
    expect(
      first
        .closest('.story-editor-row')
        ?.querySelector('.story-editor-reorder'),
    ).not.toBeNull();
    expect(
      screen.getByRole('switch', { name: 'Enable FAQ page' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Add Question' }).parentElement,
    ).toContainElement(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toBeChecked();
    fireEvent.click(first);
    expect(screen.getByLabelText('Question')).toHaveValue(
      defaultFaq.questions[0]!.question,
    );
    expect(screen.getByLabelText('Answer')).toHaveValue(
      defaultFaq.questions[0]!.answer,
    );
    expect(screen.queryByLabelText('Page title')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show question'));
    expect(screen.getByLabelText('Show question')).not.toBeChecked();
    expect(
      screen.queryByRole('button', { name: 'Hide question' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show question'));
    fireEvent.click(first);
    expect(screen.queryByLabelText('Question')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete question' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }));
    const added = screen.getByLabelText('Question');
    expect(added).toHaveFocus();
    fireEvent.change(added, { target: { value: 'New question' } });
    expect(container.querySelectorAll('[data-faq-id]')).toHaveLength(5);
    fireEvent.click(
      screen.getByRole('button', { name: 'Move question up: New question' }),
    );
    expect(container.querySelectorAll('[data-faq-id]')[3]).toContainElement(
      added,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Move question down: New question' }),
    );
    expect(container.querySelectorAll('[data-faq-id]')[4]).toContainElement(
      added,
    );
    const deleting = screen.getByRole('button', { name: 'Delete question' });
    expect(added.closest('details')).toContainElement(deleting);
    fireEvent.click(deleting);
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel',
      }),
    );
    expect(container.querySelectorAll('[data-faq-id]')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Delete question' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete question',
      }),
    );
    expect(container.querySelectorAll('[data-faq-id]')).toHaveLength(4);
  });
  it('disables adding at 30 questions', () => {
    render(
      <Editor
        initial={{
          ...defaultFaq,
          questions: Array.from({ length: 30 }, (_, i) => ({
            ...defaultFaq.questions[0]!,
            id: `q-${i}`,
          })),
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add Question' })).toBeDisabled();
    expect(screen.getByText(/Maximum 30/)).toBeInTheDocument();
  });
  it('uses editor history, trusted stable selection, draft save and saved publish', async () => {
    let record: StorefrontAppearanceRecord = {
      id: '11',
      name: 'Test farm',
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
        url: 'http://preview-vendor.localhost:4321',
        expiresAt: Date.now() + 300000,
      })),
      save: vi.fn(
        async (_id: string, _version: number, draft: typeof record.draft) =>
          (record = { ...record, draft, version: 2 }),
      ),
      publish: vi.fn(
        async () =>
          (record = { ...record, published: record.draft, version: 3 }),
      ),
    };
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    fireEvent.change(await screen.findByLabelText('Preview page'), {
      target: { value: 'faq' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Enable FAQ page' }));
    fireEvent.click(
      screen.getByRole('button', { name: defaultFaq.questions[0]!.question }),
    );
    fireEvent.change(screen.getAllByLabelText('Answer')[0]!, {
      target: { value: 'Saved answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getAllByLabelText('Answer')[0]).toHaveValue(
      defaultFaq.questions[0]!.answer,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getAllByLabelText('Answer')[0]).toHaveValue('Saved answer');
    const frame = (await screen.findByTitle(
      'Actual storefront preview',
    )) as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    const message = (section: string) =>
      act(() =>
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'http://preview-vendor.localhost:4321',
            source: frame.contentWindow,
            data: { protocol: 'storefront-editor-v1', type: 'select', section },
          }),
        ),
      );
    message('faq:pickup');
    expect(screen.getByLabelText('Question')).toHaveFocus();
    message('faq:missing');
    expect(screen.getByLabelText('Question')).toHaveFocus();
    act(() =>
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'http://preview-vendor.localhost:4321',
          source: frame.contentWindow,
          data: { protocol: 'storefront-editor-v1', type: 'ready' },
        }),
      ),
    );
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls.at(-1)?.[0].config.faq.questions[0].answer).toBe(
      'Saved answer',
    );
    expect(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(record.published).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(api.publish).toHaveBeenCalled());
    expect(record.published?.faq?.questions[0]?.answer).toBe('Saved answer');
  });
});
