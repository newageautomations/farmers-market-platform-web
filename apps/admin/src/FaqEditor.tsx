import { StorefrontReorderControls } from './StorefrontReorderControls';
import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Dialog, Field, Input, Textarea } from '@market/ui';
import { disclosureClassName } from '@market/ui/presentation';
import {
  faqQuestionLimit,
  type FaqConfig,
  type StorefrontEditorSection,
} from '@market/theme/storefront';

/** FAQ composition reusing About disclosure, reorder rail and switch presentation. */
export function FaqEditor({
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
      const input = root.current?.querySelector<HTMLInputElement>(
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
  const move = (id: string, delta: number) => {
    const next = [...value.questions];
    const i = next.findIndex((q) => q.id === id);
    if (i < 0 || i + delta < 0 || i + delta >= next.length) return;
    [next[i], next[i + delta]] = [next[i + delta]!, next[i]!];
    patch({ questions: next });
  };
  const entries: Array<{
    id: StorefrontEditorSection;
    label: string;
    question?: FaqConfig['questions'][number];
  }> = [
    { id: 'faq-settings', label: 'FAQ page' },
    ...value.questions.map((question) => ({
      id: `faq:${question.id}` as const,
      label: question.question || 'Untitled question',
      question,
    })),
    { id: 'faq-cta', label: 'Closing invitation' },
  ];
  return (
    <fieldset
      ref={root}
      disabled={busy}
      className="faq-editor story-editor-list"
    >
      <div className="story-editor-add-row">
        <Button
          variant="secondary"
          disabled={value.questions.length >= faqQuestionLimit}
          onClick={() => {
            const id = `question-${crypto.randomUUID()}`;
            focusNew.current = id;
            patch({
              questions: [
                ...value.questions,
                { id, question: '', answer: '', visible: true },
              ],
            });
            choose(`faq:${id}`);
          }}
        >
          Add Question
        </Button>
        <label className="story-page-toggle">
          <Checkbox
            id="faq-enabled"
            role="switch"
            className="sr-only"
            aria-label="Enable FAQ page"
            checked={value.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          <span className="story-switch-track" aria-hidden="true" />
          <span>{value.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>
      {value.questions.length >= faqQuestionLimit && (
        <p role="status">Maximum 30 questions. Delete one to add another.</p>
      )}
      {entries.map(({ id, label, question: q }) => {
        const open =
          !collapsed &&
          (selected === id ||
            (id === 'faq-settings' && selected === 'faq-intro'));
        const index = q
          ? value.questions.findIndex((item) => item.id === q.id)
          : -1;
        return (
          <div
            key={id}
            className={`story-editor-row${q ? ' story-editor-movable faq-editor-question' : ''}`}
            data-faq-id={q?.id}
          >
            {q && (
              <StorefrontReorderControls
                item="question"
                label={label}
                index={index}
                count={value.questions.length}
                busy={busy}
                onMove={(delta) => move(q.id, delta)}
              />
            )}
            <details className={disclosureClassName('dropdown')} open={open}>
              <summary
                role="button"
                aria-expanded={open}
                onClick={(event) => {
                  event.preventDefault();
                  if (open) collapse();
                  else choose(id);
                }}
              >
                {q ? (
                  <span className="faq-editor-question-label" title={label}>
                    {label}
                  </span>
                ) : (
                  label
                )}
              </summary>
              {open && (
                <div className="ui-disclosure-content visual-editor-section-content">
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
                  {q && (
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
                      <p>
                        Use internal links such as [Find Us](/find-us).
                        Supported destinations: /, /products, /about, /find-us,
                        /contact, /faq and /policies.
                      </p>
                      <Field id={`faq-visible-${q.id}`} label="Show question">
                        <Checkbox
                          id={`faq-visible-${q.id}`}
                          checked={q.visible}
                          onChange={(e) =>
                            updateQuestion(q.id, { visible: e.target.checked })
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
                  )}
                  {id === 'faq-cta' && (
                    <>
                      {(['heading', 'text', 'label'] as const).map((key) => (
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
          </div>
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
