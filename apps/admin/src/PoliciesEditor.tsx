import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Dialog, Field, Input, Textarea } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import {
  policiesSchema,
  policyLimit,
  policyContentLimit,
  policyTitleLimit,
  type PoliciesConfig,
  type StorefrontEditorSection,
} from '@market/theme/storefront';
import { StorefrontReorderControls } from './StorefrontReorderControls';

/** Feature composition: shared disclosures and fields inside the shared Dialog. */
export function PoliciesEditor({
  value,
  selected,
  collapsed,
  collapse,
  choose,
  onChange,
  busy,
  validationError,
  selectionRequest = 0,
}: {
  value: PoliciesConfig;
  selected: StorefrontEditorSection;
  collapsed: boolean;
  collapse: () => void;
  choose: (id: StorefrontEditorSection) => void;
  onChange: (value: PoliciesConfig) => void;
  busy: boolean;
  validationError?: string;
  selectionRequest?: number;
}) {
  const [managing, setManaging] = useState(
    selected.startsWith('policy:') && !collapsed,
  );
  const [expanded, setExpanded] = useState<string | undefined>(
    selected.startsWith('policy:') && !collapsed
      ? selected.slice(7)
      : undefined,
  );
  const [deleting, setDeleting] = useState<string>();
  const focusNew = useRef<string | undefined>(undefined);
  const root = useRef<HTMLFieldSetElement>(null);
  // Preview inspection selects a policy through the parent's existing section state.
  // Adjust local disclosure state only when that external selection changes.
  const [selection, setSelection] = useState({
    selected,
    collapsed,
    selectionRequest,
  });
  if (
    selection.selected !== selected ||
    selection.collapsed !== collapsed ||
    selection.selectionRequest !== selectionRequest
  ) {
    setSelection({ selected, collapsed, selectionRequest });
    if (selected.startsWith('policy:') && !collapsed) {
      setManaging(true);
      setExpanded(selected.slice(7));
    }
  }
  useEffect(() => {
    if (focusNew.current && managing) {
      root.current
        ?.querySelector<HTMLInputElement>(`#policy-title-${focusNew.current}`)
        ?.focus();
      focusNew.current = undefined;
    }
  }, [value.policies.length, managing, expanded]);
  const patch = (next: Partial<PoliciesConfig>) =>
    onChange({ ...value, ...next });
  const update = (
    id: string,
    next: Partial<PoliciesConfig['policies'][number]>,
  ) =>
    patch({
      policies: value.policies.map((p) =>
        p.id === id ? { ...p, ...next } : p,
      ),
    });
  const move = (id: string, delta: number) => {
    const policies = [...value.policies];
    const index = policies.findIndex((p) => p.id === id);
    if (index < 0 || index + delta < 0 || index + delta >= policies.length)
      return;
    [policies[index], policies[index + delta]] = [
      policies[index + delta]!,
      policies[index]!,
    ];
    patch({ policies });
  };
  const validation = policiesSchema.safeParse(value);
  return (
    <fieldset
      ref={root}
      disabled={busy}
      className="policies-editor story-editor-list"
    >
      <label className="story-page-toggle">
        <Checkbox
          id="policies-enabled"
          role="switch"
          className="sr-only"
          aria-label="Enable Policies page"
          checked={value.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        <span className="story-switch-track" aria-hidden="true" />
        <span>{value.enabled ? 'Enabled' : 'Disabled'}</span>
      </label>
      {(['policies-settings', 'policies-list', 'policies-cta'] as const).map(
        (id) => {
          const open =
            !collapsed &&
            (selected === id ||
              (id === 'policies-settings' && selected === 'policies-intro'));
          return (
            <details
              key={id}
              className={disclosureClassName('dropdown')}
              open={open}
            >
              <summary
                role="button"
                aria-expanded={open}
                onClick={(event) => {
                  event.preventDefault();
                  if (open) collapse();
                  else choose(id);
                }}
              >
                {
                  {
                    'policies-settings': 'Policies page',
                    'policies-list': 'Policies',
                    'policies-cta': 'Closing invitation',
                  }[id]
                }
              </summary>
              {open && (
                <div className="ui-disclosure-content visual-editor-section-content">
                  {id === 'policies-settings' && (
                    <>
                      {(['title', 'heading', 'description'] as const).map(
                        (key) => (
                          <Field
                            key={key}
                            id={`policies-${key}`}
                            label={
                              {
                                title: 'Page title',
                                heading: 'Introductory heading',
                                description: 'Introductory description',
                              }[key]
                            }
                          >
                            {key === 'description' ? (
                              <Textarea
                                id={`policies-${key}`}
                                maxLength={600}
                                value={value[key]}
                                onChange={(e) =>
                                  patch({ [key]: e.target.value })
                                }
                              />
                            ) : (
                              <Input
                                id={`policies-${key}`}
                                maxLength={160}
                                value={value[key]}
                                onChange={(e) =>
                                  patch({ [key]: e.target.value })
                                }
                              />
                            )}
                          </Field>
                        ),
                      )}
                    </>
                  )}
                  {id === 'policies-list' && (
                    <Button
                      variant="secondary"
                      onClick={() => setManaging(true)}
                    >
                      Edit Policies
                    </Button>
                  )}
                  {id === 'policies-cta' && (
                    <>
                      {(['heading', 'text', 'label'] as const).map((key) => (
                        <Field
                          key={key}
                          id={`policies-cta-${key}`}
                          label={
                            {
                              heading: 'Invitation heading',
                              text: 'Invitation text',
                              label: 'Button label',
                            }[key]
                          }
                        >
                          <Input
                            id={`policies-cta-${key}`}
                            maxLength={
                              key === 'heading'
                                ? 160
                                : key === 'text'
                                  ? 600
                                  : 80
                            }
                            value={value.cta[key]}
                            onChange={(e) =>
                              patch({
                                cta: { ...value.cta, [key]: e.target.value },
                              })
                            }
                          />
                        </Field>
                      ))}
                      <p>
                        The invitation links to Contact and appears when that
                        page is enabled.
                      </p>
                    </>
                  )}
                </div>
              )}
            </details>
          );
        },
      )}
      <Dialog
        open={managing}
        onClose={() => setManaging(false)}
        title="Manage Policies"
        size="wide"
        busy={busy}
        description="Edits stay in your unsaved storefront when you close this window. Use Save draft, then Publish saved changes in the editor to make them public."
      >
        <div className="story-editor-list policies-manager">
          {(validationError || !validation.success) && (
            <p role="alert">
              {validationError ??
                (!validation.success
                  ? validation.error.issues
                      .map(
                        (issue) => `${issue.path.join('.')}: ${issue.message}`,
                      )
                      .join(' ')
                  : '')}
            </p>
          )}
          <p>
            Write the policies that apply to your business. Blank or hidden
            policies do not appear publicly. Each title supports 160 characters
            and each policy supports 20,000 characters, within the shared
            storefront size limit.
          </p>
          {value.policies.map((policy, index) => {
            const open = expanded === policy.id;
            const label = policy.title || 'Untitled policy';
            return (
              <div
                key={policy.id}
                data-policy-id={policy.id}
                className="story-editor-row story-editor-movable faq-editor-question"
              >
                <StorefrontReorderControls
                  item="policy"
                  label={label}
                  index={index}
                  count={value.policies.length}
                  busy={busy}
                  onMove={(delta) => move(policy.id, delta)}
                />
                <details
                  className={disclosureClassName('dropdown')}
                  open={open}
                >
                  <summary
                    role="button"
                    aria-expanded={open}
                    onClick={(event) => {
                      event.preventDefault();
                      setExpanded(open ? undefined : policy.id);
                    }}
                  >
                    <span className="faq-editor-question-label" title={label}>
                      {label}
                    </span>
                  </summary>
                  {open && (
                    <div className="ui-disclosure-content visual-editor-section-content">
                      <Field
                        id={`policy-title-${policy.id}`}
                        label="Policy Title"
                      >
                        <Input
                          id={`policy-title-${policy.id}`}
                          maxLength={policyTitleLimit}
                          value={policy.title}
                          onChange={(e) =>
                            update(policy.id, { title: e.target.value })
                          }
                        />
                      </Field>
                      <Field
                        id={`policy-content-${policy.id}`}
                        label="Policy Content"
                      >
                        <Textarea
                          id={`policy-content-${policy.id}`}
                          rows={12}
                          maxLength={policyContentLimit}
                          value={policy.content}
                          onChange={(e) =>
                            update(policy.id, { content: e.target.value })
                          }
                        />
                      </Field>
                      <p>
                        Use internal links such as [Contact Us](/contact).
                        Supported destinations: /, /products, /about, /find-us,
                        /contact, /faq and /policies. HTML is displayed as text.
                      </p>
                      <Field
                        id={`policy-visible-${policy.id}`}
                        label="Show policy"
                      >
                        <Checkbox
                          id={`policy-visible-${policy.id}`}
                          checked={policy.visible}
                          onChange={(e) =>
                            update(policy.id, { visible: e.target.checked })
                          }
                        />
                      </Field>
                      <div className="ui-actions">
                        <Button
                          variant="destructive-outline"
                          onClick={() => setDeleting(policy.id)}
                        >
                          Delete Policy
                        </Button>
                      </div>
                    </div>
                  )}
                </details>
              </div>
            );
          })}
          <div className="ui-actions">
            <Button
              variant="secondary"
              disabled={busy || value.policies.length >= policyLimit}
              onClick={() => {
                const id = `policy-${crypto.randomUUID()}`;
                focusNew.current = id;
                setExpanded(id);
                patch({
                  policies: [
                    ...value.policies,
                    { id, title: '', content: '', visible: true },
                  ],
                });
              }}
            >
              Add Policy
            </Button>
          </div>
          {value.policies.length >= policyLimit && (
            <p role="status">Maximum 20 policies. Delete one to add another.</p>
          )}
        </div>
        <Dialog
          open={!!deleting}
          onClose={() => setDeleting(undefined)}
          title="Delete this policy?"
          busy={busy}
          actions={
            <>
              <Button variant="tertiary" onClick={() => setDeleting(undefined)}>
                Cancel
              </Button>
              <Button
                variant="destructive-outline"
                onClick={() => {
                  patch({
                    policies: value.policies.filter((p) => p.id !== deleting),
                  });
                  setDeleting(undefined);
                }}
              >
                Delete Policy
              </Button>
            </>
          }
        >
          <p>
            Remove{' '}
            {value.policies.find((p) => p.id === deleting)?.title ||
              'Untitled policy'}{' '}
            from your draft? You can undo this change before saving.
          </p>
        </Dialog>
      </Dialog>
    </fieldset>
  );
}
