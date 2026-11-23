import { WebsiteInspectorContent } from './WebsiteEditorContext';
import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Dialog, Field, Input, Textarea } from '@market/ui';
import { WebsiteRailList } from './WebsiteRailList';
import { disclosureClassName } from '@market/ui/presentation';
import {
  policiesSchema,
  policyLimit,
  policyContentLimit,
  policyTitleLimit,
  type PoliciesConfig,
  type StorefrontEditorSection,
} from '@market/theme/storefront';

const policyLabels = {
  page: 'Policies page',
  list: 'Policies',
  noun: 'policy',
  title: 'Policy',
  add: 'Add Policy',
};
export const termsLabels: typeof policyLabels = {
  page: 'Terms & Conditions page',
  list: 'Terms',
  noun: 'term',
  title: 'Term',
  add: 'Add Term',
};

/** Feature composition: policies are rail items (drag to reorder) edited in the website inspector. */
export function PoliciesEditor({
  onlyClosing = false,
  hideClosing = false,
  sectionHero = false,
  value,
  selected,
  collapsed,
  collapse,
  choose,
  onChange,
  busy,
  validationError,
  labels = policyLabels,
  starterText,
}: {
  value: PoliciesConfig;
  selected: StorefrontEditorSection;
  collapsed: boolean;
  collapse: () => void;
  choose: (id: StorefrontEditorSection) => void;
  onChange: (value: PoliciesConfig) => void;
  sectionHero?: boolean;
  onlyClosing?: boolean;
  hideClosing?: boolean;
  busy: boolean;
  validationError?: string;
  /** Wording for reuse on list pages shaped like Policies, such as Terms & Conditions. */
  labels?: typeof policyLabels;
  /** Example text by item id, offered for items that are still blank. */
  starterText?: Record<string, string>;
  /** Preview inspection re-requests a selection; selection state lives in the parent. */
  selectionRequest?: number;
}) {
  const [deleting, setDeleting] = useState<string>();
  const focusNew = useRef<string | undefined>(undefined);
  const selectedPolicy =
    !collapsed && selected.startsWith('policy:')
      ? value.policies.find((p) => `policy:${p.id}` === selected)
      : undefined;
  useEffect(() => {
    if (focusNew.current && selectedPolicy?.id === focusNew.current) {
      document
        .querySelector<HTMLInputElement>(`#policy-title-${focusNew.current}`)
        ?.focus();
      focusNew.current = undefined;
    }
  }, [selectedPolicy?.id]);
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
  const validation = policiesSchema.safeParse(value);
  const problem =
    validationError ??
    (!validation.success
      ? validation.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(' ')
      : undefined);
  const listOpen =
    !collapsed && (selected === 'policies-list' || !!selectedPolicy);
  return (
    <fieldset disabled={busy} className="policies-editor story-editor-list">
      {(['policies-settings', 'policies-list', 'policies-cta'] as const)
        .filter((id) =>
          onlyClosing
            ? id === 'policies-cta'
            : !hideClosing || id !== 'policies-cta',
        )
        .filter((id) => !sectionHero || id !== 'policies-settings')
        .map((id) => {
          const open =
            id === 'policies-list'
              ? listOpen
              : !collapsed &&
                (selected === id ||
                  (id === 'policies-settings' &&
                    selected === 'policies-intro'));
          return (
            <details
              key={id}
              className={disclosureClassName('dropdown')}
              data-expandable={id === 'policies-list' || undefined}
              data-selected={
                (id === 'policies-list' ? selected === id && open : open) ||
                undefined
              }
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
                    'policies-settings': labels.page,
                    'policies-list': labels.list,
                    'policies-cta': 'Closing invitation',
                  }[id]
                }
              </summary>
              {id === 'policies-list' && open && (
                <WebsiteRailList
                  items={value.policies}
                  label={labels.list}
                  noun={labels.noun}
                  itemAttribute="data-policy-id"
                  itemLabel={(policy) =>
                    (policy.title || `Untitled ${labels.noun}`) +
                    (policy.visible ? '' : ' (hidden)')
                  }
                  selectedId={selectedPolicy?.id}
                  busy={busy}
                  onSelect={(policy) => choose(`policy:${policy.id}`)}
                  onReorder={(policies) => patch({ policies })}
                  addLabel={labels.add}
                  addDisabled={value.policies.length >= policyLimit}
                  onAdd={() => {
                    const policyId = `policy-${crypto.randomUUID()}`;
                    focusNew.current = policyId;
                    patch({
                      policies: [
                        ...value.policies,
                        {
                          id: policyId,
                          title: '',
                          content: '',
                          visible: true,
                        },
                      ],
                    });
                    choose(`policy:${policyId}`);
                  }}
                />
              )}
              {open && (
                <WebsiteInspectorContent>
                  {id === 'policies-settings' &&
                    (['title', 'heading', 'description'] as const)
                      .filter((key) => !sectionHero || key === 'title')
                      .map((key) => (
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
                              onChange={(e) => patch({ [key]: e.target.value })}
                            />
                          ) : (
                            <Input
                              id={`policies-${key}`}
                              maxLength={160}
                              value={value[key]}
                              onChange={(e) => patch({ [key]: e.target.value })}
                            />
                          )}
                        </Field>
                      ))}
                  {id === 'policies-list' && !selectedPolicy && (
                    <p className="website-inspector-empty">
                      Select a {labels.noun} to edit it.
                    </p>
                  )}
                  {id === 'policies-list' && selectedPolicy && (
                    <>
                      {problem && <p role="alert">{problem}</p>}
                      <label
                        className="story-page-toggle"
                        htmlFor={`policy-visible-${selectedPolicy.id}`}
                      >
                        <Checkbox
                          id={`policy-visible-${selectedPolicy.id}`}
                          role="switch"
                          className="sr-only"
                          aria-label={`Show ${labels.noun}`}
                          checked={selectedPolicy.visible}
                          onChange={(e) =>
                            update(selectedPolicy.id, {
                              visible: e.target.checked,
                            })
                          }
                        />
                        <span
                          className="story-switch-track"
                          aria-hidden="true"
                        />
                        <span>Show {labels.noun}</span>
                      </label>
                      <Field
                        id={`policy-title-${selectedPolicy.id}`}
                        label={`${labels.title} Title`}
                      >
                        <Input
                          id={`policy-title-${selectedPolicy.id}`}
                          maxLength={policyTitleLimit}
                          value={selectedPolicy.title}
                          onChange={(e) =>
                            update(selectedPolicy.id, { title: e.target.value })
                          }
                        />
                      </Field>
                      <Field
                        id={`policy-content-${selectedPolicy.id}`}
                        label={`${labels.title} Content`}
                      >
                        <Textarea
                          id={`policy-content-${selectedPolicy.id}`}
                          rows={16}
                          maxLength={policyContentLimit}
                          value={selectedPolicy.content}
                          onChange={(e) =>
                            update(selectedPolicy.id, {
                              content: e.target.value,
                            })
                          }
                        />
                      </Field>
                      {!selectedPolicy.content.trim() &&
                        starterText?.[selectedPolicy.id] && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              update(selectedPolicy.id, {
                                content: starterText[selectedPolicy.id]!,
                              })
                            }
                          >
                            Use example text
                          </Button>
                        )}
                      <div className="ui-actions">
                        <Button
                          variant="destructive-outline"
                          onClick={() => setDeleting(selectedPolicy.id)}
                        >
                          Delete {labels.title}
                        </Button>
                      </div>
                    </>
                  )}
                  {id === 'policies-cta' &&
                    (['heading', 'text', 'label'] as const).map((key) => (
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
                            key === 'heading' ? 160 : key === 'text' ? 600 : 80
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
                </WebsiteInspectorContent>
              )}
            </details>
          );
        })}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(undefined)}
        title={`Delete this ${labels.noun}?`}
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
                choose('policies-list');
              }}
            >
              Delete {labels.title}
            </Button>
          </>
        }
      >
        <p>
          Remove{' '}
          {value.policies.find((p) => p.id === deleting)?.title ||
            `Untitled ${labels.noun}`}{' '}
          from your draft? You can undo this change before saving.
        </p>
      </Dialog>
    </fieldset>
  );
}
