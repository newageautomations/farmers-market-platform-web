import { useId } from 'react';
import type { ApplicationDefinition } from '@market/api';
export function ApplicationFields({
  definition,
  answers,
  onAnswer,
  readOnly = false,
}: {
  definition: ApplicationDefinition;
  answers: Record<string, unknown>;
  onAnswer?: (id: string, value: unknown) => void;
  readOnly?: boolean;
}) {
  const prefix = useId();
  const visibleQuestions = definition.questions.filter(
    (q) =>
      !q.hidden &&
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
  return (
    <>
      {definition.sections
        .filter(
          (section) =>
            visibleQuestions.some((q) => q.section === section) || !readOnly,
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
                        {!['SINGLE_SELECT', 'MULTI_SELECT'].includes(
                          q.type,
                        ) && (
                          <label htmlFor={id}>
                            {q.label}
                            {q.required ? ' (required)' : ''}
                          </label>
                        )}
                        {q.type === 'LONG_TEXT' ? (
                          <textarea
                            id={id}
                            aria-describedby={q.help ? help : undefined}
                            required={q.required}
                            maxLength={5000}
                            value={String(value ?? '')}
                            onChange={(e) => onAnswer?.(q.id, e.target.value)}
                          />
                        ) : q.type === 'BOOLEAN' ? (
                          <select
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
                                <input
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
                          <input
                            id={id}
                            aria-describedby={q.help ? help : undefined}
                            required={q.required}
                            maxLength={500}
                            type={
                              q.type === 'NUMBER'
                                ? 'number'
                                : q.type === 'DATE'
                                  ? 'date'
                                  : q.type === 'TIME'
                                    ? 'time'
                                    : q.type === 'EMAIL'
                                      ? 'email'
                                      : q.type === 'PHONE'
                                        ? 'tel'
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
