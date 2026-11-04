import type { ComponentProps } from 'react';
import { Pagination, scrollToPaginatedTable } from '@market/ui';
import { FarmstandButton } from '@market/ui/farmstand';
import './markets-pagination.css';
/** Redemptions footer presentation, with caller-owned paging. */
export function MarketsPagination({
  summary,
  label = 'Pagination',
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: ComponentProps<typeof Pagination>) {
  return (
    <div className="markets-pagination-footer">
      <span>{summary}</span>
      {(hasPrevious || hasNext) && (
        <nav
          aria-label={label}
          onClickCapture={(event) =>
            scrollToPaginatedTable(event.currentTarget)
          }
        >
          <FarmstandButton
            variant="secondary"
            size="compact"
            disabled={!hasPrevious}
            onClick={onPrevious}
          >
            Previous
          </FarmstandButton>
          <FarmstandButton
            variant="secondary"
            size="compact"
            disabled={!hasNext}
            onClick={onNext}
          >
            Next
          </FarmstandButton>
        </nav>
      )}
    </div>
  );
}
