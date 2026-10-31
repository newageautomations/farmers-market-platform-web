import type { ApplicationOnboardingSummary } from '@market/api';
import { Badge, Card } from './index';
import { buttonClassName } from './presentation';

/** Shared read-only feature composition. The authorized API supplies states and destinations. */
export function ApplicationOnboarding({
  summary,
  origin = '',
}: {
  summary: ApplicationOnboardingSummary;
  origin?: string;
}) {
  return (
    <Card as="section" aria-label="Next steps after acceptance">
      <h2 className="ui-section-title-dashboard">
        Next steps after acceptance
      </h2>
      {summary.steps.map((step) => (
        <div className="ops-section" key={step.key}>
          <p>
            <strong>{step.label}</strong>{' '}
            <Badge
              tone={
                step.state === 'Complete'
                  ? 'success'
                  : step.state === 'Action needed'
                    ? 'warning'
                    : 'neutral'
              }
            >
              {step.state}
            </Badge>
          </p>
          <p>{step.detail}</p>
          {step.href && (
            <a
              className={buttonClassName({
                variant: 'secondary',
                size: 'compact',
              })}
              href={`${origin}${step.href}`}
            >
              Open {step.label.toLowerCase()}
            </a>
          )}
        </div>
      ))}
    </Card>
  );
}
