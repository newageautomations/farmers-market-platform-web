import { Card } from './index';
import { selectClassName } from './presentation';
import { Textarea, Input } from './form-controls';
import { PhoneInput } from './PhoneInput';
import { fieldLimits } from './input-validation';
import { useId } from 'react';
import type { ApplicationDefinition } from '@market/api';
import { applicationQuestionVisible } from '@market/api';
export function ApplicationFields({
  definition,
  answers,
  onAnswer,
  readOnly = false,
  compact = false,
}: {
  definition: ApplicationDefinition;
  answers: Record<string, unknown>;
  onAnswer?: (id: string, value: unknown) => void;
  readOnly?: boolean;
  /** Compact read-only layout; editable consumers retain their fieldsets. */
  compact?: boolean;
}) {
  const prefix = useId();
  const visibleQuestions = definition.questions.filter(
    (q) =>
      applicationQuestionVisible(q, answers) &&
      !(
        readOnly &&
        !q.required &&
        q.type !== 'INFO' &&
        (answers[q.id] == null ||
          answers[q.id] === '' ||
          (typeof answers[q.id] === 'string' &&
            !String(answers[q.id]).trim()) ||
          (Array.isArray(answers[q.id]) &&
            !(answers[q.id] as unknown[]).length))
      ),
  );
  if (readOnly && compact)
    return (
      <div className="application-answer-sections">
        {definition.sections
          .filter((section) =>
            visibleQuestions.some((q) => q.section === section),
          )
          .map((section) => (
            <Card as="section" key={section} aria-label={section}>
              <h3>{section}</h3>
              <dl className="application-answer-grid">
                {visibleQuestions
                  .filter((q) => q.section === section)
                  .map((q) => {
                    const value = answers[q.id];
                    return (
                      <div
                        key={q.id}
                        className={
                          q.type === 'LONG_TEXT' || q.type === 'INFO'
                            ? 'application-answer-wide'
                            : undefined
                        }
                      >
                        <dt>{q.label}</dt>
                        <dd>
                          {q.type !== 'INFO' && (
                            <span>
                              {Array.isArray(value)
                                ? value.join(', ')
                                : typeof value === 'boolean'
                                  ? value
                                    ? 'Yes'
                                    : 'No'
                                  : String(value ?? 'No answer')}
                            </span>
                          )}
                          {q.help && <p className="field-help">{q.help}</p>}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </Card>
          ))}
      </div>
    );
  return (
    <>
      {definition.sections
        .filter((section) =>
          visibleQuestions.some((q) => q.section === section),
        )
        .map((section) => (
          <fieldset key={section} className="ops-section">
            <legend>{section}</legend>
            {visibleQuestions
              .filter((q) => q.section === section)
              .map((q) => {
                const id = `${prefix}-${q.id}`,
                  help = `${id}-help`,
                  value = answers[q.id];
                return (
                  <div className="ops-field" key={q.id}>
                    {q.type === 'INFO' ? (
                      <p>{q.label}</p>
                    ) : readOnly ? (
                      <>
                        <strong>{q.label}</strong>
                        <p>
                          {Array.isArray(value)
                            ? value.join(', ')
                            : typeof value === 'boolean'
                              ? value
                                ? 'Yes'
                                : 'No'
                              : String(value ?? 'No answer')}
                        </p>
                      </>
                    ) : (
                      <>
                        {!['SINGLE_SELECT', 'MULTI_SELECT', 'PHONE'].includes(
                          q.type,
                        ) && (
                          <label htmlFor={id}>
                            {q.label}
                            {q.required ? ' (required)' : ''}
                          </label>
                        )}
                        {q.type === 'LONG_TEXT' ? (
                          <Textarea
                            id={id}
                            aria-describedby={q.help ? help : undefined}
                            required={q.required}
                            maxLength={q.maxLength ?? 5000}
                            value={String(value ?? '')}
                            onChange={(e) => onAnswer?.(q.id, e.target.value)}
                          />
                        ) : q.type === 'PHONE' ? (
                          <PhoneInput
                            id={id}
                            label={q.label}
                            required={q.required}
                            value={String(value ?? '')}
                            aria-describedby={q.help ? help : undefined}
                            onChange={(v) => onAnswer?.(q.id, v)}
                          />
                        ) : q.type === 'BOOLEAN' ? (
                          <select
                            className={selectClassName()}
                            id={id}
                            aria-describedby={q.help ? help : undefined}
                            required={q.required}
                            value={value === undefined ? '' : String(value)}
                            onChange={(e) =>
                              onAnswer?.(
                                q.id,
                                e.target.value === ''
                                  ? undefined
                                  : e.target.value === 'true',
                              )
                            }
                          >
                            <option value="">Choose</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : ['SINGLE_SELECT', 'MULTI_SELECT'].includes(
                            q.type,
                          ) ? (
                          <fieldset
                            className="application-choice-group"
                            aria-describedby={q.help ? help : undefined}
                          >
                            <legend>
                              {q.label}
                              {q.required ? ' (required)' : ''}
                            </legend>
                            {q.options.map((option, index) => (
                              <label key={option} htmlFor={`${id}-${index}`}>
                                <Input
                                  id={`${id}-${index}`}
                                  type={
                                    q.type === 'MULTI_SELECT'
                                      ? 'checkbox'
                                      : 'radio'
                                  }
                                  name={id}
                                  required={
                                    q.type === 'SINGLE_SELECT'
                                      ? q.required
                                      : q.required &&
                                        index === 0 &&
                                        !(Array.isArray(value) && value.length)
                                  }
                                  checked={
                                    q.type === 'MULTI_SELECT'
                                      ? Array.isArray(value) &&
                                        value.includes(option)
                                      : value === option
                                  }
                                  onChange={(e) =>
                                    onAnswer?.(
                                      q.id,
                                      q.type === 'MULTI_SELECT'
                                        ? e.target.checked
                                          ? [
                                              ...(Array.isArray(value)
                                                ? value
                                                : []),
                                              option,
                                            ]
                                          : (Array.isArray(value)
                                              ? value
                                              : []
                                            ).filter((v) => v !== option)
                                        : option,
                                    )
                                  }
                                />
                                {option}
                              </label>
                            ))}
                          </fieldset>
                        ) : q.type === 'DROPDOWN' ? (
                          <select
                            className={selectClassName()}
                            id={id}
                            aria-describedby={q.help ? help : undefined}
                            required={q.required}
                            value={String(value ?? '')}
                            onChange={(e) => onAnswer?.(q.id, e.target.value)}
                          >
                            <option value="">Choose</option>
                            {q.options.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={id}
                            aria-describedby={q.help ? help : undefined}
                            required={q.required}
                            maxLength={Math.min(
                              q.type === 'EMAIL'
                                ? 254
                                : q.type === 'URL'
                                  ? 2048
                                  : (q.maxLength ?? 500),
                              fieldLimits[
                                q.semantic as keyof typeof fieldLimits
                              ] ?? 50000,
                            )}
                            min={
                              q.type === 'NUMBER'
                                ? (q.minimum ?? -1000000)
                                : undefined
                            }
                            max={
                              q.type === 'NUMBER'
                                ? (q.maximum ?? 1000000)
                                : undefined
                            }
                            type={
                              q.type === 'NUMBER'
                                ? 'number'
                                : q.type === 'DATE'
                                  ? 'date'
                                  : q.type === 'TIME'
                                    ? 'time'
                                    : q.type === 'EMAIL'
                                      ? 'email'
                                      : q.type === 'URL'
                                        ? 'url'
                                        : 'text'
                            }
                            value={String(value ?? '')}
                            step={q.type === 'NUMBER' ? 'any' : undefined}
                            onChange={(e) =>
                              onAnswer?.(
                                q.id,
                                q.type === 'NUMBER'
                                  ? e.target.value === ''
                                    ? undefined
                                    : Number(e.target.value)
                                  : e.target.value,
                              )
                            }
                          />
                        )}
                      </>
                    )}
                    {q.help && <p id={help}>{q.help}</p>}
                  </div>
                );
              })}
          </fieldset>
        ))}
    </>
  );
}
