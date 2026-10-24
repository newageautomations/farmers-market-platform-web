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
import { PoliciesEditor } from '../apps/admin/src/PoliciesEditor';
import { StorefrontAppearanceSettings } from '../apps/admin/src/StorefrontAppearance';
import {
  defaultPolicies,
  defaultStorefrontAppearance,
  policiesSchema,
  policyContentParts,
  publishedPolicyEntries,
  storefrontAppearanceSchema,
  storefrontPreviewPath,
  type PoliciesConfig,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
import type { StorefrontAppearanceRecord } from '@market/api';

describe('Policies contract', () => {
  it('keeps blank starters private and preserves deliberately empty saved configuration', () => {
    expect(defaultPolicies.enabled).toBe(false);
    expect(defaultPolicies.policies).toHaveLength(4);
    expect(publishedPolicyEntries(defaultPolicies)).toEqual([]);
    expect(
      storefrontAppearanceSchema.parse(defaultStorefrontAppearance).policies,
    ).toBeUndefined();
    expect(
      policiesSchema.parse({ ...defaultPolicies, policies: [] }).policies,
    ).toEqual([]);
    expect(storefrontPreviewPath('/policies')).toBe(true);
    const policies = [
      {
        ...defaultPolicies.policies[0]!,
        content: '  First\n\nSecond\n  Third  ',
      },
    ];
    expect(
      policiesSchema.parse({ ...defaultPolicies, policies }).policies,
    ).toEqual(policies);
  });
  it('bounds count, identity, types, strings, links and aggregate size without truncation', () => {
    const p = defaultPolicies.policies[0]!;
    for (const patch of [
      { policies: [p, p] },
      { version: 2 },
      { enabled: 'yes' },
      { extra: true },
      { policies: [{ ...p, id: '../bad' }] },
      { policies: [{ ...p, id: 'bad\n' }] },
      { policies: [{ ...p, visible: 'yes' }] },
      { policies: [{ ...p, title: 'x'.repeat(161) }] },
      { policies: [{ ...p, content: 'x'.repeat(20001) }] },
      {
        policies: Array.from({ length: 21 }, (_, i) => ({ ...p, id: `p${i}` })),
      },
      ...[
        'javascript:alert(1)',
        '//evil.test',
        'https://evil.test',
        '/api/shop',
        '/account',
        '/contact?next=x',
        '/%2f%2fevil',
      ].map((href) => ({ policies: [{ ...p, content: `[Bad](${href})` }] })),
    ])
      expect(
        policiesSchema.safeParse({ ...defaultPolicies, ...patch }).success,
      ).toBe(false);
    expect(
      storefrontAppearanceSchema.safeParse({
        ...defaultStorefrontAppearance,
        policies: {
          ...defaultPolicies,
          policies: Array.from({ length: 5 }, (_, i) => ({
            ...p,
            id: `p${i}`,
            content: 'x'.repeat(20000),
          })),
        },
      }).success,
    ).toBe(false);
    expect(policyContentParts('First\n\n[Contact](/contact) <script>')).toEqual(
      [
        { text: 'First\n\n' },
        { text: 'Contact', href: '/contact' },
        { text: ' <script>' },
      ],
    );
    expect(
      policyContentParts('[Bad](javascript:alert(1))').some((p) => p.href),
    ).toBe(false);
  });
  it('filters only hidden and incomplete rows while preserving order and content', () => {
    const p = defaultPolicies.policies[0]!;
    const rows = [
      { ...p, id: 'last', content: 'First\n\nSecond' },
      { ...p, id: 'hidden', content: 'Private', visible: false },
      { ...p, id: 'blank', content: '  ' },
      { ...p, id: 'first', content: 'End' },
    ];
    expect(
      publishedPolicyEntries({ ...defaultPolicies, policies: rows }).map(
        (p) => p.id,
      ),
    ).toEqual(['last', 'first']);
  });
});
function Editor({ initial = defaultPolicies }: { initial?: PoliciesConfig }) {
  const [value, setValue] = useState(structuredClone(initial));
  const [selected, choose] = useState<StorefrontEditorSection>('policies-list');
  const [collapsed, collapse] = useState(false);
  return (
    <PoliciesEditor
      value={value}
      onChange={setValue}
      selected={selected}
      choose={(id) => {
        choose(id);
        collapse(false);
      }}
      collapsed={collapsed}
      collapse={() => collapse(true)}
      busy={false}
    />
  );
}
const openManager = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Edit Policies' }));
describe('Policies modal', () => {
  it('uses shared Dialog, collapsed entries, exact FAQ arrows, stable editing, visibility, add focus and confirmed deletion', async () => {
    const { container } = render(<Editor />);
    expect(screen.queryByLabelText('Policy Content')).not.toBeInTheDocument();
    openManager();
    const manager = screen.getByRole('dialog', { name: 'Manage Policies' });
    expect(manager).toHaveClass('ui-dialog');
    expect(screen.queryByLabelText('Policy Content')).not.toBeInTheDocument();
    const first = defaultPolicies.policies[0]!;
    expect(
      screen.getByRole('button', { name: `Move policy up: ${first.title}` }),
    ).toBeDisabled();
    const row = container.querySelector(`[data-policy-id="${first.id}"]`)!;
    expect(
      row.querySelector('.story-editor-reorder')?.nextElementSibling?.tagName,
    ).toBe('DETAILS');
    fireEvent.click(screen.getByRole('button', { name: first.title }));
    const content = 'Paragraph\n\n' + 'Long policy text. '.repeat(600);
    fireEvent.change(screen.getByLabelText('Policy Content'), {
      target: { value: content },
    });
    fireEvent.click(screen.getByLabelText('Show policy'));
    fireEvent.click(
      screen.getByRole('button', { name: `Move policy down: ${first.title}` }),
    );
    expect(container.querySelectorAll('[data-policy-id]')[1]).toBe(row);
    expect(screen.getByLabelText('Policy Content')).toHaveValue(content);
    expect(screen.getByLabelText('Show policy')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Policy' }));
    expect(
      screen.getByRole('dialog', { name: 'Delete this policy?' }),
    ).toHaveTextContent(first.title);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Delete this policy?' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Policy Content')).toHaveValue(content);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Policy' }));
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete this policy?' }),
      ).getByRole('button', { name: 'Delete Policy' }),
    );
    expect(container.querySelectorAll('[data-policy-id]')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Add Policy' }));
    expect(screen.getByLabelText('Policy Title')).toHaveFocus();
    expect(screen.getByLabelText('Policy Content')).toHaveAttribute(
      'maxlength',
      '20000',
    );
    fireEvent.change(screen.getByLabelText('Policy Title'), {
      target: { value: 'New policy' },
    });
    fireEvent.change(screen.getByLabelText('Policy Content'), {
      target: { value: 'Retained content' },
    });
    fireEvent.click(within(manager).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Manage Policies' }),
      ).not.toBeInTheDocument(),
    );
    openManager();
    expect(screen.getByLabelText('Policy Content')).toHaveValue(
      'Retained content',
    );
  });
  it('disables adding at 20 and shows unsafe link feedback without discarding text', () => {
    render(
      <Editor
        initial={{
          ...defaultPolicies,
          policies: Array.from({ length: 20 }, (_, i) => ({
            ...defaultPolicies.policies[0]!,
            id: `p${i}`,
            title: `Policy ${i}`,
          })),
        }}
      />,
    );
    openManager();
    expect(screen.getByRole('button', { name: 'Add Policy' })).toBeDisabled();
    expect(screen.getByText(/Maximum 20/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Policy 0' }));
    fireEvent.change(screen.getByLabelText('Policy Content'), {
      target: { value: '[Bad](javascript:alert(1))' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('supported internal');
    expect(screen.getByLabelText('Policy Content')).toHaveValue(
      '[Bad](javascript:alert(1))',
    );
  });
  it('uses existing history, Astro messages and saved publishing without changing the public draft date', async () => {
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
          (record = {
            ...record,
            published: record.draft,
            publishedAt: '2026-10-24T16:00:00Z',
            version: 3,
          }),
      ),
    };
    render(<StorefrontAppearanceSettings market={false} api={api} />);
    fireEvent.change(await screen.findByLabelText('Preview page'), {
      target: { value: 'policies' },
    });
    fireEvent.click(
      screen.getByRole('switch', { name: 'Enable Policies page' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Policies' }));
    openManager();
    fireEvent.click(
      screen.getByRole('button', { name: defaultPolicies.policies[0]!.title }),
    );
    fireEvent.change(screen.getByLabelText('Policy Content'), {
      target: { value: 'Vendor authored policy' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Manage Policies' })).getByRole(
        'button',
        { name: 'Close' },
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Manage Policies' }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    openManager();
    expect(screen.getByLabelText('Policy Content')).toHaveValue('');
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Manage Policies' })).getByRole(
        'button',
        { name: 'Close' },
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Manage Policies' }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    const frame = (await screen.findByTitle(
      'Actual storefront preview',
    )) as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
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
    expect(post.mock.calls.at(-1)?.[0].path).toBe('/policies');
    expect(
      post.mock.calls.at(-1)?.[0].config.policies.policies[0].content,
    ).toBe('Vendor authored policy');
    const selectPolicy = (section: string) =>
      act(() =>
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'http://preview-vendor.localhost:4321',
            source: frame.contentWindow,
            data: { protocol: 'storefront-editor-v1', type: 'select', section },
          }),
        ),
      );
    selectPolicy('policy:missing');
    expect(
      screen.queryByRole('dialog', { name: 'Manage Policies' }),
    ).not.toBeInTheDocument();
    selectPolicy(`policy:${defaultPolicies.policies[0]!.id}`);
    expect(
      screen.getByRole('dialog', { name: 'Manage Policies' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Policy Content')).toHaveValue(
      'Vendor authored policy',
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Manage Policies' })).getByRole(
        'button',
        { name: 'Close' },
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Manage Policies' }),
      ).not.toBeInTheDocument(),
    );
    selectPolicy(`policy:${defaultPolicies.policies[0]!.id}`);
    expect(
      screen.getByRole('dialog', { name: 'Manage Policies' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Policy' }));
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Delete this policy?' }),
      ).getByRole('button', { name: 'Delete Policy' }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Manage Policies' })).getByRole(
        'button',
        { name: 'Close' },
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Manage Policies' }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    // Reopen from the sidebar after undo restores the same stable policy identity.
    fireEvent.click(screen.getByRole('button', { name: 'Policies' }));
    openManager();
    expect(screen.getByLabelText('Policy Content')).toHaveValue(
      'Vendor authored policy',
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Manage Policies' })).getByRole(
        'button',
        { name: 'Close' },
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Manage Policies' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(record.published).toBeNull();
    expect(record.publishedAt).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish saved changes' }),
    );
    await waitFor(() => expect(api.publish).toHaveBeenCalled());
    expect(record.published?.policies?.policies[0]?.content).toBe(
      'Vendor authored policy',
    );
  });
});
