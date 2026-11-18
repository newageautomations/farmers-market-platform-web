import type { ComponentProps } from 'react';
import { Button } from '@market/ui';
import './animated-cart-button.css';

/** Market-only animation adapter for BTN-01, retaining native button semantics. */
export function AnimatedCartButton({
  enabled,
  feedback,
  className = '',
  children,
  ...props
}: ComponentProps<typeof Button> & {
  enabled: boolean;
  feedback: { added: boolean; cycle: number };
}) {
  if (!enabled)
    return (
      <Button {...props} className={className}>
        {children}
      </Button>
    );

  return (
    <Button
      {...props}
      className={`${className} market-cart-button${feedback.added ? ' is-added' : ''}`}
    >
      <span className="market-cart-button__label">{children}</span>
      <span
        key={feedback.cycle}
        className="market-cart-button__check"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="m5 12 4.2 4.2L19 6.5" />
        </svg>
      </span>
    </Button>
  );
}
