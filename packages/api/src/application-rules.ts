import type {
  ApplicationDefinition,
  ApplicationQuestion,
  PublicApplication,
} from './market-operations';

export function applicationQuestionVisible(
  q: ApplicationQuestion,
  answers: Record<string, unknown>,
): boolean {
  if (q.hidden) return false;
  const c = q.condition;
  if (!c) return true;
  const value = answers[c.questionId];
  return c.comparison === 'INCLUDES'
    ? Array.isArray(value) && value.includes(c.value)
    : value === c.value;
}
export function activeApplicationAnswers(
  d: ApplicationDefinition,
  answers: Record<string, unknown>,
) {
  return Object.fromEntries(
    d.questions
      .filter(
        (q) =>
          q.type !== 'INFO' &&
          applicationQuestionVisible(q, answers) &&
          Object.hasOwn(answers, q.id),
      )
      .map((q) => [q.id, answers[q.id]]),
  );
}
export function eligibleApplicationTriggers(
  d: ApplicationDefinition,
  id: string,
) {
  const ordered = d.sections.flatMap((s) =>
    d.questions.filter((q) => q.section === s),
  );
  return ordered
    .slice(
      0,
      ordered.findIndex((q) => q.id === id),
    )
    .filter(
      (q) =>
        !q.hidden &&
        !q.condition &&
        ['BOOLEAN', 'SINGLE_SELECT', 'DROPDOWN', 'MULTI_SELECT'].includes(
          q.type,
        ),
    );
}
export function applicationConditionIssues(d: ApplicationDefinition): string[] {
  return d.questions.flatMap((q) => {
    const c = q.condition;
    if (!c) return [];
    const trigger = eligibleApplicationTriggers(d, q.id).find(
      (p) => p.id === c.questionId,
    );
    const valid =
      trigger &&
      !q.hidden &&
      (trigger.type === 'BOOLEAN'
        ? c.comparison === 'IS' && typeof c.value === 'boolean'
        : c.comparison ===
            (trigger.type === 'MULTI_SELECT' ? 'INCLUDES' : 'IS') &&
          typeof c.value === 'string' &&
          trigger.options.includes(c.value));
    return valid
      ? []
      : [
          `Fix question visibility for "${q.label}": choose an earlier always-visible Yes/No or choice question and an available answer.`,
        ];
  });
}
export function applicationScheduleIssue(
  d: ApplicationDefinition,
): string | undefined {
  const s = d.schedule;
  if (s?.opensAt && s.closesAt && s.opensAt >= s.closesAt)
    return 'Opening must be before closing.';
}
export function applicationAvailabilityMessage(
  a: PublicApplication['availability'],
) {
  if (!a || a.state === 'OPEN') return '';
  const instant = a.state === 'CLOSED' ? a.closesAt : a.opensAt;
  if (!instant) return 'This application is unavailable.';
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: a.timeZone,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(instant));
  return `This application ${a.state === 'CLOSED' ? 'closed' : 'opens'} on ${date} (${a.timeZone}).`;
}
export const applicationErrorMessages: Record<string, string> = {
  APPLICATION_CLOSED:
    'This application has closed. Your saved draft remains available in Vendor Applications.',
  APPLICATION_NOT_YET_OPEN:
    'This application has not opened yet. Check the opening time and try again then.',
  APPLICATION_VERSION_CHANGED:
    'This application has changed. Your saved draft is preserved. Open the current form to start a new application.',
  APPLICATION_REQUIRED_ANSWER:
    'Please answer every required question currently shown on the form.',
  MARKET_OPERATIONS_INPUT_INVALID:
    'An answer is invalid. Check the questions, selected dates, and rentals, then try again.',
  STALE_DOMAIN_VERSION:
    'This draft changed in another session. Resume the latest copy from Vendor Applications.',
  APPLICATION_CONDITION_INVALID:
    'Fix question visibility: choose an earlier always-visible question and one of its current answers. Check dependent questions after deleting, changing, or reordering questions.',
  APPLICATION_SCHEDULE_INVALID:
    'Check the market timezone and schedule. Opening must precede closing. Choose a time outside the daylight-saving clock change if the time is ambiguous or does not exist.',
};
/** Common market error codes get application wording only at application endpoints. */
export function applicationErrorMessage(error: {
  code?: string;
  message: string;
}) {
  if (
    ['APPLICATION_CLOSED', 'APPLICATION_NOT_YET_OPEN'].includes(
      error.code ?? '',
    )
  )
    return error.message;
  return applicationErrorMessages[error.code ?? ''];
}
