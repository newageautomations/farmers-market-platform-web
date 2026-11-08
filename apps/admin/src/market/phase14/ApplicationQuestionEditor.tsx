import { Button, Select } from '@market/ui';
import {
  applicationQuestionTypes,
  eligibleApplicationTriggers,
  type ApplicationDefinition,
  type ApplicationQuestion,
} from '@market/api';
import { Check, Control, Entry } from './common';

export const questionTypeLabels: Record<ApplicationQuestion['type'], string> = {
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
export const protectedField = (q: ApplicationQuestion) =>
  ['businessName', 'firstName', 'lastName', 'email'].includes(q.semantic ?? '');

/** Expanded editor for one question card. The builder owns the definition. */
export function ApplicationQuestionEditor({
  question: q,
  definition,
  edit,
  onDelete,
  onDuplicate,
  onDone,
}: {
  question: ApplicationQuestion;
  definition: ApplicationDefinition;
  edit: (patch: Partial<ApplicationQuestion>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDone: () => void;
}) {
  const triggers = eligibleApplicationTriggers(definition, q.id);
  const trigger = q.condition
    ? triggers.find((p) => p.id === q.condition!.questionId)
    : undefined;
  return (
    <div className="question-editor">
      <div className="question-heading">
        <Entry
          label="Question"
          value={q.label}
          onChange={(v) => edit({ label: v })}
          required
        />
        <Control label="Question type">
          {(id) => (
            <Select
              id={id}
              value={q.type}
              disabled={!!q.semantic}
              onChange={(e) =>
                edit({
                  type: e.target.value as ApplicationQuestion['type'],
                  maxLength: undefined,
                  minimum: undefined,
                  maximum: undefined,
                  options: choiceTypes.includes(e.target.value)
                    ? q.options.length
                      ? q.options
                      : ['Option 1']
                    : [],
                })
              }
            >
              {applicationQuestionTypes.map((type) => (
                <option key={type} value={type}>
                  {questionTypeLabels[type]}
                </option>
              ))}
            </Select>
          )}
        </Control>
      </div>
      <Entry
        label="Help text"
        value={q.help}
        onChange={(v) => edit({ help: v })}
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
                  edit({
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
                  edit({
                    options: q.options.filter((_, i) => i !== optionIndex),
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
              edit({
                options: [...q.options, `Option ${q.options.length + 1}`],
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
          value={q.maxLength ?? (q.type === 'LONG_TEXT' ? 5000 : 500)}
          onChange={(v) => edit({ maxLength: Number(v) })}
        />
      )}
      {q.type === 'NUMBER' && (
        <div className="question-heading">
          <Entry
            label="Minimum answer value"
            type="number"
            min={-1000000}
            max={q.maximum ?? 1000000}
            value={q.minimum ?? -1000000}
            onChange={(v) => edit({ minimum: Number(v) })}
          />
          <Entry
            label="Maximum answer value"
            type="number"
            min={q.minimum ?? -1000000}
            max={1000000}
            value={q.maximum ?? 1000000}
            onChange={(v) => edit({ maximum: Number(v) })}
          />
        </div>
      )}
      <div className="question-heading">
        <Control label="Section">
          {(id) => (
            <Select
              id={id}
              value={q.section}
              onChange={(e) => edit({ section: e.target.value })}
            >
              {definition.sections.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          )}
        </Control>
        <Control label="Question visibility">
          {(id) => (
            <Select
              id={id}
              disabled={protectedField(q)}
              value={
                q.hidden ? 'HIDDEN' : q.condition ? 'CONDITIONAL' : 'ALWAYS'
              }
              onChange={(e) =>
                edit({
                  hidden: e.target.value === 'HIDDEN',
                  condition:
                    e.target.value === 'CONDITIONAL'
                      ? { questionId: '', comparison: 'IS', value: '' }
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
      </div>
      {q.semantic && (
        <p className="field-help">
          {protectedField(q)
            ? 'The system needs this identity field. Its type and required status are fixed.'
            : 'This field supplies business or booth details. Its type is fixed; you can remove it or make it optional.'}
        </p>
      )}
      {q.condition && (
        <div className="question-condition">
          <Control label="Show this question when">
            {(id) => (
              <Select
                id={id}
                value={q.condition!.questionId}
                onChange={(e) => {
                  const next = definition.questions.find(
                    (p) => p.id === e.target.value,
                  );
                  edit({
                    condition: {
                      questionId: e.target.value,
                      comparison:
                        next?.type === 'MULTI_SELECT' ? 'INCLUDES' : 'IS',
                      value:
                        next?.type === 'BOOLEAN'
                          ? true
                          : (next?.options[0] ?? ''),
                    },
                  });
                }}
              >
                <option value="">Choose an earlier question</option>
                {triggers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            )}
          </Control>
          {!trigger ? (
            <p>
              Choose an earlier always-visible Yes/No or choice question.
              Conditional and hidden questions cannot trigger other questions.
            </p>
          ) : (
            <>
              <div className="question-heading">
                <Control label="Comparison">
                  {(id) => (
                    <Select
                      id={id}
                      value={q.condition!.comparison}
                      onChange={() => {}}
                    >
                      <option
                        value={
                          trigger.type === 'MULTI_SELECT' ? 'INCLUDES' : 'IS'
                        }
                      >
                        {trigger.type === 'MULTI_SELECT' ? 'Includes' : 'Is'}
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
                        edit({
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
              </div>
              <p>
                This question will only appear when the applicant’s answer to “
                {trigger.label}”{' '}
                {q.condition!.comparison === 'INCLUDES' ? 'includes' : 'is'}{' '}
                {typeof q.condition!.value === 'boolean'
                  ? q.condition!.value
                    ? 'Yes'
                    : 'No'
                  : q.condition!.value}
                . Required validation applies only while visible.
              </p>
            </>
          )}
        </div>
      )}
      <div className="question-footer">
        <fieldset disabled={protectedField(q)}>
          <Check
            animated
            label="Required"
            checked={q.required}
            onChange={(v) => edit({ required: v })}
          />
        </fieldset>
        <span className="question-footer-actions">
          {!q.semantic && (
            <Button
              variant="secondary"
              size="compact"
              type="button"
              onClick={onDuplicate}
            >
              Duplicate
            </Button>
          )}
          {!protectedField(q) && (
            <Button
              variant="destructive-outline"
              size="compact"
              type="button"
              onClick={onDelete}
            >
              Delete question
            </Button>
          )}
          <Button size="compact" type="button" onClick={onDone}>
            Done
          </Button>
        </span>
      </div>
    </div>
  );
}
