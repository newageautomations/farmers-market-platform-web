import { WebsiteInspectorContent } from './WebsiteEditorContext';
import { WebsiteRailList } from './WebsiteRailList';
import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Dialog, Field, Input, Textarea } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import {
  faqQuestionLimit,
  type FaqConfig,
  type StorefrontEditorSection,
} from '@market/theme/storefront';

/** FAQ composition: questions are rail rows (drag to reorder within the list) edited in the inspector, like Policies. */
export function FaqEditor({
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
}: {
  value: FaqConfig;
  selected: StorefrontEditorSection;
  collapsed: boolean;
  collapse: () => void;
  choose: (id: StorefrontEditorSection) => void;
  onChange: (v: FaqConfig) => void;
  sectionHero?: boolean;
  onlyClosing?: boolean;
  hideClosing?: boolean;
  busy: boolean;
}) {
  const [deleting, setDeleting] = useState<string>();
  const focusNew = useRef<string | undefined>(undefined);
  const root = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (collapsed) return;
    const id =
      focusNew.current ??
      (selected.startsWith('faq:') ? selected.slice(4) : undefined);
    if (id) {
      // The question's fields render in the inspector, outside this fieldset.
      const input = document.querySelector<HTMLInputElement>(
        `#faq-question-${id}`,
      );
      input?.focus();
      focusNew.current = undefined;
    }
  }, [collapsed, selected, value.questions.length]);
  const patch = (next: Partial<FaqConfig>) => onChange({ ...value, ...next });
  const updateQuestion = (
    id: string,
    next: Partial<FaqConfig['questions'][number]>,
  ) =>
    patch({
      questions: value.questions.map((q) =>
        q.id === id ? { ...q, ...next } : q,
      ),
    });
  const selectedQuestion =
    !collapsed && selected.startsWith('faq:')
      ? value.questions.find((q) => `faq:${q.id}` === selected)
      : undefined;
  const addQuestion = () => {
    const id = `question-${crypto.randomUUID()}`;
    focusNew.current = id;
    patch({
      questions: [
        ...value.questions,
        { id, question: '', answer: '', visible: true },
      ],
    });
    choose(`faq:${id}`);
  };
  const rows = (['faq-settings', 'faq-questions', 'faq-cta'] as const)
    .filter((id) =>
      onlyClosing ? id === 'faq-cta' : !hideClosing || id !== 'faq-cta',
    )
    .filter((id) => !sectionHero || id !== 'faq-settings');
  return (
    <fieldset
      ref={root}
      disabled={busy}
      className="faq-editor story-editor-list"
    >
      {rows.map((id) => {
        const open =
          id === 'faq-questions'
            ? !collapsed && (selected === id || !!selectedQuestion)
            : !collapsed &&
              (selected === id ||
                (id === 'faq-settings' && selected === 'faq-intro'));
        return (
          <details
            key={id}
            className={disclosureClassName('dropdown')}
            data-expandable={id === 'faq-questions' || undefined}
            data-selected={
              (id === 'faq-questions' ? selected === id && open : open) ||
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
                  'faq-settings': 'FAQ page',
                  'faq-questions': 'Questions',
                  'faq-cta': 'Closing invitation',
                }[id]
              }
            </summary>
            {id === 'faq-questions' && open && (
              <WebsiteRailList
                items={value.questions}
                label="Questions"
                noun="question"
                itemAttribute="data-faq-id"
                itemLabel={(q) =>
                  (q.question || 'Untitled question') +
                  (q.visible ? '' : ' (hidden)')
                }
                selectedId={selectedQuestion?.id}
                busy={busy}
                onSelect={(q) => choose(`faq:${q.id}`)}
                onReorder={(questions) => patch({ questions })}
                addLabel="Add Question"
                addDisabled={value.questions.length >= faqQuestionLimit}
                onAdd={addQuestion}
              />
            )}
            {id === 'faq-questions' &&
              open &&
              value.questions.length >= faqQuestionLimit && (
                <p role="status">
                  Maximum 30 questions. Delete one to add another.
                </p>
              )}
            {open && (
              <WebsiteInspectorContent>
                {id === 'faq-settings' && (
                  <>
                    <Field id="faq-title" label="Page title">
                      <Input
                        id="faq-title"
                        maxLength={160}
                        value={value.title}
                        onChange={(e) => patch({ title: e.target.value })}
                      />
                    </Field>
                    {!sectionHero && (
                      <>
                        <Field id="faq-heading" label="Heading">
                          <Input
                            id="faq-heading"
                            maxLength={160}
                            value={value.heading}
                            onChange={(e) => patch({ heading: e.target.value })}
                          />
                        </Field>
                        <Field id="faq-description" label="Introduction">
                          <Textarea
                            id="faq-description"
                            maxLength={600}
                            value={value.description}
                            onChange={(e) =>
                              patch({ description: e.target.value })
                            }
                          />
                        </Field>
                      </>
                    )}
                  </>
                )}
                {id === 'faq-questions' && !selectedQuestion && (
                  <p className="website-inspector-empty">
                    Select a question to edit it.
                  </p>
                )}
                {id === 'faq-questions' &&
                  selectedQuestion &&
                  (() => {
                    const q = selectedQuestion;
                    return (
                      <>
                        <Field id={`faq-question-${q.id}`} label="Question">
                          <Input
                            id={`faq-question-${q.id}`}
                            maxLength={300}
                            value={q.question}
                            onChange={(e) =>
                              updateQuestion(q.id, { question: e.target.value })
                            }
                          />
                        </Field>
                        <Field id={`faq-answer-${q.id}`} label="Answer">
                          <Textarea
                            id={`faq-answer-${q.id}`}
                            maxLength={5000}
                            rows={5}
                            value={q.answer}
                            onChange={(e) =>
                              updateQuestion(q.id, { answer: e.target.value })
                            }
                          />
                        </Field>
                        <Field id={`faq-visible-${q.id}`} label="Show question">
                          <Checkbox
                            id={`faq-visible-${q.id}`}
                            checked={q.visible}
                            onChange={(e) =>
                              updateQuestion(q.id, {
                                visible: e.target.checked,
                              })
                            }
                          />
                        </Field>
                        <div className="ui-actions">
                          <Button
                            variant="destructive-outline"
                            onClick={() => setDeleting(q.id)}
                          >
                            Delete question
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                {id === 'faq-cta' &&
                  (['heading', 'text', 'label'] as const).map((key) => (
                    <Field
                      key={key}
                      id={`faq-cta-${key}`}
                      label={
                        {
                          heading: 'Invitation heading',
                          text: 'Invitation text',
                          label: 'Button label',
                        }[key]
                      }
                    >
                      <Input
                        id={`faq-cta-${key}`}
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
        title="Delete this question?"
        onClose={() => setDeleting(undefined)}
        actions={
          <>
            <Button variant="tertiary" onClick={() => setDeleting(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive-outline"
              onClick={() => {
                patch({
                  questions: value.questions.filter((q) => q.id !== deleting),
                });
                setDeleting(undefined);
                choose('faq-questions');
              }}
            >
              Delete question
            </Button>
          </>
        }
      >
        <p>
          This removes the question from your draft. You can undo this change
          before saving.
        </p>
      </Dialog>
    </fieldset>
  );
}
