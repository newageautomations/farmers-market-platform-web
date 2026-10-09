import { useState } from 'react';
import {
  applicationQuestionTypes,
  type ApplicationDefinition,
  type ApplicationQuestion,
  type ApplicationVersion,
  type MarketOperationsData,
  type OperationsCommand,
} from '@market/api';
import { ApplicationFields } from '@market/ui';
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
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [privateLink, setPrivateLink] = useState(
    template?.visibility === 'PRIVATE',
  );
  const [advertised, setAdvertised] = useState(template?.advertised ?? true);
  const editable = canManage && version.status === 'DRAFT';
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
    run({
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
      <fieldset disabled={!editable} className="application-title">
        <Entry
          label="Application name"
          value={name}
          onChange={setName}
          required
        />
      </fieldset>
      <p>
        Version {version.versionNumber} · {version.status.toLowerCase()}.{' '}
        {editable
          ? 'Click a question to edit it. Drag the dots to change the order.'
          : 'Create a new draft version to make changes.'}
      </p>
      <div className="ops-toolbar">
        <button type="button" onClick={() => setPreview((v) => !v)}>
          {preview ? 'Return to builder' : 'Preview application'}
        </button>
        {editable && (
          <button type="button" onClick={save}>
            Save draft
          </button>
        )}
        {canManage && (
          <button
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
            Create new draft version
          </button>
        )}
      </div>
      {preview ? (
        <ApplicationFields
          definition={definition}
          answers={answers}
          onAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
        />
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
                    className="drag-handle"
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
                  <input
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
                    <button
                      type="button"
                      disabled={sectionIndex === 0}
                      onClick={() => moveSection(section, sectionIndex - 1)}
                      aria-label={`Move section ${section} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={sectionIndex === definition.sections.length - 1}
                      onClick={() => moveSection(section, sectionIndex + 1)}
                      aria-label={`Move section ${section} down`}
                    >
                      ↓
                    </button>
                    {definition.sections.length > 1 && (
                      <button
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
                      </button>
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
                          className="drag-handle"
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
                                <select
                                  id={id}
                                  value={q.type}
                                  disabled={!!q.semantic}
                                  onChange={(e) =>
                                    edit(q.id, {
                                      type: e.target
                                        .value as ApplicationQuestion['type'],
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
                                </select>
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
                                  <button
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
                                  </button>
                                </div>
                              ))}
                              <button
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
                              </button>
                            </div>
                          )}
                          <Control label="Section">
                            {(id) => (
                              <select
                                id={id}
                                value={q.section}
                                onChange={(e) =>
                                  edit(q.id, { section: e.target.value })
                                }
                              >
                                {definition.sections.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            )}
                          </Control>
                          {q.semantic && (
                            <p className="field-help">
                              {protectedField(q)
                                ? 'The system needs this identity field. Its type and required status are fixed.'
                                : 'This field supplies business or booth details. Its type is fixed; you can remove it or make it optional.'}
                            </p>
                          )}
                          <div className="question-footer">
                            <fieldset disabled={protectedField(q)}>
                              <Check
                                label="Required"
                                checked={q.required}
                                onChange={(v) =>
                                  edit(q.id, {
                                    required: v,
                                    hidden: v ? false : q.hidden,
                                  })
                                }
                              />
                            </fieldset>
                            {!protectedField(q) && (
                              <button
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
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={index === 0}
                              aria-label={`Move ${q.label} up`}
                              onClick={() =>
                                moveQuestion(q.id, questions[index - 1]!.id)
                              }
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={index === questions.length - 1}
                              aria-label={`Move ${q.label} down`}
                              onClick={() =>
                                moveQuestion(questions[index + 1]!.id, q.id)
                              }
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelected('')}
                            >
                              Done
                            </button>
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
                              className="question-edit-overlay"
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
                <button
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
                </button>
              )}
            </div>
          ))}
          {editable && (
            <button
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
            </button>
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
                  label={new Date(o.startsAt).toLocaleString()}
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
          <button
            type="button"
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
          </button>
        </div>
      )}
    </section>
  );
}
