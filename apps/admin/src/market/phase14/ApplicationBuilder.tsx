import { Button, Select, Input } from '@market/ui';
import { buttonClassName } from '@market/ui/presentation';
import { date, StatusBadge } from '../presentation';
import { useState } from 'react';
import {
  applicationQuestionTypes,
  eligibleApplicationTriggers,
  applicationConditionIssues,
  applicationScheduleIssue,
  type ApplicationDefinition,
  type ApplicationQuestion,
  type ApplicationVersion,
  type MarketOperationsData,
  type OperationsCommand,
} from '@market/api';
import { ApplicationFields } from '@market/ui';
import { platformName } from '@market/config';
import { Check, Control, Entry, moneyLabel } from './common';

const typeLabels: Record<ApplicationQuestion['type'], string> = {
  SHORT_TEXT: 'Short answer',
  LONG_TEXT: 'Paragraph',
  SINGLE_SELECT: 'Multiple choice',
  MULTI_SELECT: 'Checkboxes',
  DROPDOWN: 'Dropdown',
  DATE: 'Date',
  TIME: 'Time',
  BOOLEAN: 'Yes/No',
  NUMBER: 'Number',
  EMAIL: 'Email',
  PHONE: 'Phone',
  URL: 'Website',
  INFO: 'Description',
};
const choiceTypes = ['SINGLE_SELECT', 'MULTI_SELECT', 'DROPDOWN'];
const protectedField = (q: ApplicationQuestion) =>
  ['businessName', 'firstName', 'lastName', 'email'].includes(q.semantic ?? '');

export function ApplicationBuilder({
  version,
  data,
  run,
  canManage,
  onSelect,
}: {
  version: ApplicationVersion;
  data: MarketOperationsData;
  run: (c: OperationsCommand) => Promise<unknown>;
  canManage: boolean;
  onSelect: (id: number) => void;
}) {
  const template = data.templates?.find((t) => t.id === version.templateId);
  const [definition, setDefinition] = useState<ApplicationDefinition>(
    version.definition,
  );
  const [name, setName] = useState(template?.name ?? 'Untitled application');
  const [selected, setSelected] = useState(
    version.definition.questions[0]?.id ?? '',
  );
  const [preview, setPreview] = useState(false);
  const [previewChecked, setPreviewChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [privateLink, setPrivateLink] = useState(
    template?.visibility === 'PRIVATE',
  );
  const [advertised, setAdvertised] = useState(template?.advertised ?? true);
  const editable = canManage && version.status === 'DRAFT';
  const issues = [
    ...applicationConditionIssues(definition),
    applicationScheduleIssue(definition),
  ].filter(Boolean);
  const timeZone = definition.schedule?.timeZone ?? data.timeZone;
  const edit = (id: string, patch: Partial<ApplicationQuestion>) =>
    setDefinition((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  function moveQuestion(id: string, targetId: string, section?: string) {
    setDefinition((d) => {
      const questions = [...d.questions];
      const from = questions.findIndex((q) => q.id === id);
      if (from < 0) return d;
      const item = questions.splice(from, 1)[0]!;
      const target = questions.findIndex((q) => q.id === targetId);
      questions.splice(target < 0 ? questions.length : target, 0, {
        ...item,
        section: section ?? item.section,
      });
      return { ...d, questions };
    });
  }
  function moveSection(section: string, target: number) {
    setDefinition((d) => {
      const sections = [...d.sections],
        from = sections.indexOf(section);
      if (from < 0 || target < 0 || target >= sections.length) return d;
      sections.splice(from, 1);
      sections.splice(target, 0, section);
      return { ...d, sections };
    });
  }
  function drop(event: React.DragEvent, section: string, targetId = '') {
    event.preventDefault();
    event.stopPropagation();
    const source = event.dataTransfer.getData('text/plain');
    if (source.startsWith('section:'))
      moveSection(source.slice(8), definition.sections.indexOf(section));
    else if (source !== targetId) moveQuestion(source, targetId, section);
  }
  const save = () =>
    issues.length
      ? Promise.resolve(undefined)
      : run({
          action: 'SAVE_APPLICATION',
          id: version.id,
          expectedRevision: version.revision,
          data: { definition, name },
        });
  return (
    <section
      className="ops-editor application-builder"
      aria-label="Application builder"
    >
      <p>
        Every public application starts with the required question: Do you have
        an account with {platformName}? Yes or No. This platform-owned preamble
        is always first and cannot be edited, hidden, or removed.
      </p>
      <fieldset disabled={!editable} className="application-title">
        <Entry
          label="Application name"
          value={name}
          onChange={setName}
          required
        />
      </fieldset>
      <p>
        <StatusBadge>{version.status}</StatusBadge>{' '}
        {editable
          ? 'Click a question to edit it. Drag the dots to change the order.'
          : 'Create a new draft to make changes.'}
      </p>
      {issues.length > 0 && (
        <div role="alert">
          {issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}
      <fieldset className="ops-section" disabled={!editable || !timeZone}>
        <legend>Application schedule</legend>
        <p>
          Times use the market timezone:{' '}
          {timeZone ?? 'Unavailable. Reload the builder.'} These deadlines
          control submissions, separately from market attendance dates. Leave a
          time blank for no restriction. Times during an ambiguous or missing
          daylight-saving hour cannot be saved.
        </p>
        {(['opensAt', 'closesAt'] as const).map((key) => (
          <Control
            key={key}
            label={
              key === 'opensAt'
                ? 'Opening date and time'
                : 'Closing date and time'
            }
          >
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={definition.schedule?.[key] ?? ''}
                onChange={(e) =>
                  setDefinition((d) => ({
                    ...d,
                    schedule: {
                      ...d.schedule,
                      timeZone: data.timeZone!,
                      [key]: e.target.value || undefined,
                    },
                  }))
                }
              />
            )}
          </Control>
        ))}
        <p>
          {definition.schedule?.closesAt &&
          definition.schedule.closesAt <=
            new Intl.DateTimeFormat('sv-SE', {
              timeZone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
              .format(new Date())
              .replace(' ', 'T')
            ? 'Currently closed.'
            : definition.schedule?.opensAt &&
                definition.schedule.opensAt >
                  new Intl.DateTimeFormat('sv-SE', {
                    timeZone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                    .format(new Date())
                    .replace(' ', 'T')
              ? `Opens on ${definition.schedule.opensAt.replace('T', ' at ')}.`
              : 'Open for submissions.'}{' '}
          {definition.schedule?.closesAt
            ? `Closes on ${definition.schedule.closesAt.replace('T', ' at ')} (${timeZone}).`
            : 'No closing restriction.'}
        </p>
      </fieldset>
      <div className="ops-toolbar">
        <Button
          variant="secondary"
          size="compact"
          type="button"
          onClick={() => setPreview((v) => !v)}
        >
          {preview ? 'Return to builder' : 'Preview application'}
        </Button>
        {editable && (
          <Button
            variant="secondary"
            size="compact"
            type="button"
            onClick={save}
            disabled={issues.length > 0}
          >
            Save draft
          </Button>
        )}
        {canManage && (
          <Button
            variant="secondary"
            size="compact"
            type="button"
            onClick={async () => {
              const cloned = (await run({
                action: 'CLONE_APPLICATION',
                id: version.id,
                data: {},
              })) as ApplicationVersion;
              if (cloned) onSelect(cloned.id);
            }}
          >
            Create new draft
          </Button>
        )}
      </div>
      {preview ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPreviewChecked(true);
          }}
        >
          <ApplicationFields
            definition={definition}
            answers={answers}
            onAnswer={(id, v) => {
              setPreviewChecked(false);
              setAnswers((a) => ({ ...a, [id]: v }));
            }}
          />
          <Button type="submit" variant="secondary">
            Check preview answers
          </Button>
          {previewChecked && (
            <p role="status">
              Visible required questions are answered. This preview creates no
              application or draft.
            </p>
          )}
        </form>
      ) : (
        <div className="application-cards">
          {definition.sections.map((section, sectionIndex) => (
            <div className="application-section" key={section}>
              <div
                className="application-section-title"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(e, section)}
              >
                {editable && (
                  <button
                    type="button"
                    className={buttonClassName({
                      variant: 'tertiary',
                      className: 'drag-handle',
                    })}
                    draggable
                    aria-label={`Drag section ${section}`}
                    onDragStart={(e) =>
                      e.dataTransfer.setData('text/plain', `section:${section}`)
                    }
                  >
                    ⠿
                  </button>
                )}
                {editable ? (
                  <Input
                    aria-label={`Section name: ${section}`}
                    defaultValue={section}
                    maxLength={200}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (
                        !next ||
                        (next !== section && definition.sections.includes(next))
                      ) {
                        e.target.value = section;
                        return;
                      }
                      setDefinition((d) => ({
                        ...d,
                        sections: d.sections.map((s) =>
                          s === section ? next : s,
                        ),
                        questions: d.questions.map((q) =>
                          q.section === section ? { ...q, section: next } : q,
                        ),
                      }));
                    }}
                  />
                ) : (
                  <h3>{section}</h3>
                )}
                {editable && (
                  <div className="ops-toolbar">
                    <Button
                      variant="secondary"
                      size="compact"
                      iconOnly
                      type="button"
                      disabled={sectionIndex === 0}
                      onClick={() => moveSection(section, sectionIndex - 1)}
                      aria-label={`Move section ${section} up`}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      iconOnly
                      type="button"
                      disabled={sectionIndex === definition.sections.length - 1}
                      onClick={() => moveSection(section, sectionIndex + 1)}
                      aria-label={`Move section ${section} down`}
                    >
                      ↓
                    </Button>
                    {definition.sections.length > 1 && (
                      <Button
                        variant="destructive"
                        size="compact"
                        type="button"
                        onClick={() =>
                          setDefinition((d) => ({
                            ...d,
                            sections: d.sections.filter((s) => s !== section),
                            questions: d.questions.map((q) =>
                              q.section === section
                                ? {
                                    ...q,
                                    section: d.sections.find(
                                      (s) => s !== section,
                                    )!,
                                  }
                                : q,
                            ),
                          }))
                        }
                      >
                        Remove section
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <ol
                className="application-question-cards"
                aria-label={`${section} questions`}
              >
                {definition.questions
                  .filter((q) => q.section === section)
                  .map((q, index, questions) => (
                    <li
                      key={q.id}
                      className={`application-question ${editable && selected === q.id ? 'editing' : ''}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => drop(e, section, q.id)}
                    >
                      {editable && (
                        <button
                          type="button"
                          className={buttonClassName({
                            variant: 'tertiary',
                            className: 'drag-handle',
                          })}
                          draggable
                          aria-label={`Drag ${q.label}`}
                          onDragStart={(e) =>
                            e.dataTransfer.setData('text/plain', q.id)
                          }
                        >
                          ⠿
                        </button>
                      )}
                      {editable && selected === q.id ? (
                        <>
                          <div className="question-heading">
                            <Entry
                              label="Question"
                              value={q.label}
                              onChange={(v) => edit(q.id, { label: v })}
                              required
                            />
                            <Control label="Question type">
                              {(id) => (
                                <Select
                                  id={id}
                                  value={q.type}
                                  disabled={!!q.semantic}
                                  onChange={(e) =>
                                    edit(q.id, {
                                      type: e.target
                                        .value as ApplicationQuestion['type'],
                                      maxLength: undefined,
                                      minimum: undefined,
                                      maximum: undefined,
                                      options: choiceTypes.includes(
                                        e.target.value,
                                      )
                                        ? q.options.length
                                          ? q.options
                                          : ['Option 1']
                                        : [],
                                    })
                                  }
                                >
                                  {applicationQuestionTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {typeLabels[type]}
                                    </option>
                                  ))}
                                </Select>
                              )}
                            </Control>
                          </div>
                          <Entry
                            label="Help text"
                            value={q.help}
                            onChange={(v) => edit(q.id, { help: v })}
                          />
                          {choiceTypes.includes(q.type) && (
                            <div className="question-options">
                              {q.options.map((option, optionIndex) => (
                                <div className="option-row" key={optionIndex}>
                                  <span aria-hidden="true">
                                    {q.type === 'MULTI_SELECT' ? '□' : '○'}
                                  </span>
                                  <Entry
                                    label={`Option ${optionIndex + 1}`}
                                    value={option}
                                    onChange={(v) =>
                                      edit(q.id, {
                                        options: q.options.map((o, i) =>
                                          i === optionIndex ? v : o,
                                        ),
                                      })
                                    }
                                  />
                                  <Button
                                    variant="secondary"
                                    size="compact"
                                    type="button"
                                    aria-label={`Remove option ${optionIndex + 1}`}
                                    disabled={q.options.length === 1}
                                    onClick={() =>
                                      edit(q.id, {
                                        options: q.options.filter(
                                          (_, i) => i !== optionIndex,
                                        ),
                                      })
                                    }
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="secondary"
                                size="compact"
                                type="button"
                                onClick={() =>
                                  edit(q.id, {
                                    options: [
                                      ...q.options,
                                      `Option ${q.options.length + 1}`,
                                    ],
                                  })
                                }
                              >
                                Add option
                              </Button>
                            </div>
                          )}
                          {['SHORT_TEXT', 'LONG_TEXT'].includes(q.type) && (
                            <Entry
                              label="Maximum answer length"
                              type="number"
                              min={1}
                              max={q.type === 'LONG_TEXT' ? 5000 : 500}
                              step={1}
                              value={
                                q.maxLength ??
                                (q.type === 'LONG_TEXT' ? 5000 : 500)
                              }
                              onChange={(v) =>
                                edit(q.id, { maxLength: Number(v) })
                              }
                            />
                          )}
                          {q.type === 'NUMBER' && (
                            <>
                              <Entry
                                label="Minimum answer value"
                                type="number"
                                min={-1000000}
                                max={q.maximum ?? 1000000}
                                value={q.minimum ?? -1000000}
                                onChange={(v) =>
                                  edit(q.id, { minimum: Number(v) })
                                }
                              />
                              <Entry
                                label="Maximum answer value"
                                type="number"
                                min={q.minimum ?? -1000000}
                                max={1000000}
                                value={q.maximum ?? 1000000}
                                onChange={(v) =>
                                  edit(q.id, { maximum: Number(v) })
                                }
                              />
                            </>
                          )}
                          <Control label="Section">
                            {(id) => (
                              <Select
                                id={id}
                                value={q.section}
                                onChange={(e) =>
                                  edit(q.id, { section: e.target.value })
                                }
                              >
                                {definition.sections.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </Select>
                            )}
                          </Control>
                          {q.semantic && (
                            <p className="field-help">
                              {protectedField(q)
                                ? 'The system needs this identity field. Its type and required status are fixed.'
                                : 'This field supplies business or booth details. Its type is fixed; you can remove it or make it optional.'}
                            </p>
                          )}
                          <Control label="Question visibility">
                            {(id) => (
                              <Select
                                id={id}
                                disabled={protectedField(q)}
                                value={
                                  q.hidden
                                    ? 'HIDDEN'
                                    : q.condition
                                      ? 'CONDITIONAL'
                                      : 'ALWAYS'
                                }
                                onChange={(e) =>
                                  edit(q.id, {
                                    hidden: e.target.value === 'HIDDEN',
                                    condition:
                                      e.target.value === 'CONDITIONAL'
                                        ? {
                                            questionId: '',
                                            comparison: 'IS',
                                            value: '',
                                          }
                                        : undefined,
                                  })
                                }
                              >
                                <option value="ALWAYS">Always show</option>
                                <option value="CONDITIONAL">
                                  Show only when a condition is met
                                </option>
                                <option value="HIDDEN">Hidden</option>
                              </Select>
                            )}
                          </Control>
                          {q.condition && (
                            <>
                              <Control label="Show this question when">
                                {(id) => (
                                  <Select
                                    id={id}
                                    value={q.condition!.questionId}
                                    onChange={(e) => {
                                      const trigger = definition.questions.find(
                                        (p) => p.id === e.target.value,
                                      );
                                      edit(q.id, {
                                        condition: {
                                          questionId: e.target.value,
                                          comparison:
                                            trigger?.type === 'MULTI_SELECT'
                                              ? 'INCLUDES'
                                              : 'IS',
                                          value:
                                            trigger?.type === 'BOOLEAN'
                                              ? true
                                              : (trigger?.options[0] ?? ''),
                                        },
                                      });
                                    }}
                                  >
                                    <option value="">
                                      Choose an earlier question
                                    </option>
                                    {eligibleApplicationTriggers(
                                      definition,
                                      q.id,
                                    ).map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.label}
                                      </option>
                                    ))}
                                  </Select>
                                )}
                              </Control>
                              {(() => {
                                const trigger = eligibleApplicationTriggers(
                                  definition,
                                  q.id,
                                ).find((p) => p.id === q.condition!.questionId);
                                if (!trigger)
                                  return (
                                    <p>
                                      Choose an earlier always-visible Yes/No or
                                      choice question. Conditional and hidden
                                      questions cannot trigger other questions.
                                    </p>
                                  );
                                return (
                                  <>
                                    <Control label="Comparison">
                                      {(id) => (
                                        <Select
                                          id={id}
                                          value={q.condition!.comparison}
                                          onChange={() => {}}
                                        >
                                          <option
                                            value={
                                              trigger.type === 'MULTI_SELECT'
                                                ? 'INCLUDES'
                                                : 'IS'
                                            }
                                          >
                                            {trigger.type === 'MULTI_SELECT'
                                              ? 'Includes'
                                              : 'Is'}
                                          </option>
                                        </Select>
                                      )}
                                    </Control>
                                    <Control label="Expected answer">
                                      {(id) => (
                                        <Select
                                          id={id}
                                          value={String(q.condition!.value)}
                                          onChange={(e) =>
                                            edit(q.id, {
                                              condition: {
                                                ...q.condition!,
                                                value:
                                                  trigger.type === 'BOOLEAN'
                                                    ? e.target.value === 'true'
                                                    : e.target.value,
                                              },
                                            })
                                          }
                                        >
                                          {(trigger.type === 'BOOLEAN'
                                            ? ['true', 'false']
                                            : trigger.options
                                          ).map((value) => (
                                            <option key={value} value={value}>
                                              {trigger.type === 'BOOLEAN'
                                                ? value === 'true'
                                                  ? 'Yes'
                                                  : 'No'
                                                : value}
                                            </option>
                                          ))}
                                        </Select>
                                      )}
                                    </Control>
                                    <p>
                                      This question will only appear when the
                                      applicant’s answer to “{trigger.label}”{' '}
                                      {q.condition!.comparison === 'INCLUDES'
                                        ? 'includes'
                                        : 'is'}{' '}
                                      {typeof q.condition!.value === 'boolean'
                                        ? q.condition!.value
                                          ? 'Yes'
                                          : 'No'
                                        : q.condition!.value}
                                      . Required validation applies only while
                                      visible.
                                    </p>
                                  </>
                                );
                              })()}
                            </>
                          )}
                          <div className="question-footer">
                            <fieldset disabled={protectedField(q)}>
                              <Check
                                label="Required"
                                checked={q.required}
                                onChange={(v) =>
                                  edit(q.id, {
                                    required: v,
                                  })
                                }
                              />
                            </fieldset>
                            {!protectedField(q) && (
                              <Button
                                variant="destructive"
                                size="compact"
                                type="button"
                                onClick={() => {
                                  setDefinition((d) => ({
                                    ...d,
                                    questions: d.questions.filter(
                                      (item) => item.id !== q.id,
                                    ),
                                  }));
                                  setSelected('');
                                }}
                              >
                                Delete question
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="compact"
                              iconOnly
                              type="button"
                              disabled={index === 0}
                              aria-label={`Move ${q.label} up`}
                              onClick={() =>
                                moveQuestion(q.id, questions[index - 1]!.id)
                              }
                            >
                              ↑
                            </Button>
                            <Button
                              variant="secondary"
                              size="compact"
                              iconOnly
                              type="button"
                              disabled={index === questions.length - 1}
                              aria-label={`Move ${q.label} down`}
                              onClick={() =>
                                moveQuestion(questions[index + 1]!.id, q.id)
                              }
                            >
                              ↓
                            </Button>
                            <Button
                              variant="secondary"
                              size="compact"
                              type="button"
                              onClick={() => setSelected('')}
                            >
                              Done
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="question-preview">
                          <fieldset disabled>
                            <ApplicationFields
                              definition={{
                                ...definition,
                                sections: [section],
                                questions: [{ ...q, hidden: false }],
                              }}
                              answers={{}}
                            />
                          </fieldset>
                          {q.hidden && <p>Hidden from applicants</p>}
                          {editable && (
                            <button
                              className={buttonClassName({
                                variant: 'tertiary',
                                className: 'question-edit-overlay',
                              })}
                              type="button"
                              onClick={() => setSelected(q.id)}
                            >
                              <span className="sr-only">Edit {q.label}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
              </ol>
              {editable && (
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  onClick={() => {
                    const id = crypto.randomUUID();
                    setDefinition((d) => ({
                      ...d,
                      questions: [
                        ...d.questions,
                        {
                          id,
                          section,
                          label: 'Untitled question',
                          help: '',
                          type: 'SHORT_TEXT',
                          required: false,
                          hidden: false,
                          options: [],
                        },
                      ],
                    }));
                    setSelected(id);
                  }}
                >
                  Add question to {section}
                </Button>
              )}
            </div>
          ))}
          {editable && (
            <Button
              variant="secondary"
              size="compact"
              type="button"
              onClick={() => {
                let number = definition.sections.length + 1;
                while (definition.sections.includes(`Section ${number}`))
                  number++;
                const section = `Section ${number}`;
                setDefinition((d) => {
                  const sections = [...d.sections];
                  const activeSection = d.questions.find(
                    (q) => q.id === selected,
                  )?.section;
                  sections.splice(
                    activeSection
                      ? sections.indexOf(activeSection) + 1
                      : sections.length,
                    0,
                    section,
                  );
                  return { ...d, sections };
                });
              }}
            >
              Add section
            </Button>
          )}
        </div>
      )}
      {editable && (
        <div className="application-publishing">
          <fieldset className="ops-section">
            <legend>Dates applicants may request</legend>
            {data.occurrences
              .filter(
                (o) =>
                  o.status === 'scheduled' && new Date(o.startsAt) > new Date(),
              )
              .map((o) => (
                <Check
                  key={o.id}
                  label={date(o.startsAt)}
                  checked={definition.occurrenceIds.includes(o.id)}
                  onChange={(v) =>
                    setDefinition((d) => ({
                      ...d,
                      occurrenceIds: v
                        ? [...d.occurrenceIds, o.id]
                        : d.occurrenceIds.filter((id) => id !== o.id),
                    }))
                  }
                />
              ))}
          </fieldset>
          <fieldset className="ops-section">
            <legend>Available rentals and add-ons</legend>
            {data.rentals
              ?.filter((r) => r.details.enabled)
              .map((r) => (
                <Check
                  key={r.id}
                  label={`${r.details.name} · ${moneyLabel(r.details.priceMinor, r.details.currency)}`}
                  checked={definition.rentalIds.includes(r.id)}
                  onChange={(v) =>
                    setDefinition((d) => ({
                      ...d,
                      rentalIds: v
                        ? [...d.rentalIds, r.id]
                        : d.rentalIds.filter((id) => id !== r.id),
                    }))
                  }
                />
              ))}
          </fieldset>
          <Check
            label="Private direct-link application"
            checked={privateLink}
            onChange={setPrivateLink}
          />
          <Check
            label="Advertise on Market storefront"
            checked={advertised}
            onChange={setAdvertised}
          />
          <Button
            variant="secondary"
            size="compact"
            type="button"
            disabled={issues.length > 0}
            onClick={async () => {
              const saved = (await save()) as ApplicationVersion;
              if (saved)
                await run({
                  action: 'PUBLISH_APPLICATION',
                  id: saved.id,
                  expectedRevision: saved.revision,
                  data: {
                    visibility: privateLink ? 'PRIVATE' : 'PUBLIC',
                    advertised,
                  },
                });
            }}
          >
            Save and publish
          </Button>
        </div>
      )}
    </section>
  );
}
