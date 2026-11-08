import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Pagination,
  Select,
  scrollToPaginatedTable,
} from './index';
import { buttonClassName } from './presentation';

/** Opt-in Figma appearance. Existing primitives retain behavior and semantics. */
export function FarmstandButton({
  className = '',
  ...props
}: ComponentProps<typeof Button>) {
  return <Button {...props} className={`farmstand-button ${className}`} />;
}

export function FarmstandLink({
  appearance = 'button',
  variant = 'tertiary',
  size,
  iconOnly,
  children,
  className = '',
  ...props
}: ComponentProps<'a'> &
  Pick<ComponentProps<typeof Button>, 'variant' | 'size' | 'iconOnly'> & {
    appearance?: 'button' | 'text';
  }) {
  return (
    <a
      {...props}
      className={
        appearance === 'text'
          ? `farmstand-text-action ${className}`
          : buttonClassName({
              variant,
              size,
              iconOnly,
              className: `farmstand-button ${className}`,
            })
      }
    >
      {children}
    </a>
  );
}

export function FarmstandPanel({
  className = '',
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <Card
      {...props}
      spacing="contained"
      padding="none"
      className={`farmstand-panel ${className}`}
    />
  );
}

/** Catalog table presentation with the existing accessible DataTable semantics. */
export function FarmstandTable(props: ComponentProps<typeof DataTable>) {
  return (
    <DataTable
      {...props}
      className={`farmstand-data-table ${props.className ?? ''}`}
    />
  );
}

export function FarmstandSearch({
  className = '',
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="farmstand-search">
      <FarmstandIcon name="search" />
      <Input
        {...props}
        type="search"
        className={`farmstand-search-input ${className}`}
      />
    </div>
  );
}

export function FarmstandSelect({
  className = '',
  icon,
  ...props
}: ComponentProps<typeof Select> & { icon?: FarmstandIconName }) {
  return (
    <span
      className={`farmstand-select-wrap${icon ? ' farmstand-select-with-icon' : ''}`}
    >
      <FarmstandIcon name={icon ?? 'chevron-down'} />
      <Select {...props} className={`farmstand-select ${className}`} />
    </span>
  );
}

/** Paging footer (first built for vendor Markets as MarketsPagination), with
 * caller-owned paging. Shared so package-level compositions can reuse it. */
export function FarmstandPagination({
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

export type FarmstandIconName =
  | 'shopping-cart'
  | 'layers'
  | 'package'
  | 'store'
  | 'credit-card'
  | 'circle-check'
  | 'hash'
  | 'user-round'
  | 'calendar-days'
  | 'receipt-text'
  | 'map-pin'
  | 'info'
  | 'truck'
  | 'arrow-left'
  | 'tag'
  | 'plus'
  | 'plus-small'
  | 'plus-category'
  | 'search'
  | 'chevron-down'
  | 'chevron-right'
  | 'arrow-up-right'
  | 'carrot'
  | 'apple'
  | 'egg'
  | 'archive'
  | 'arrow-right'
  | 'triangle-alert'
  | 'settings'
  | 'palette'
  | 'bell'
  | 'bell-off'
  | 'inbox'
  | 'trash'
  | 'sliders-horizontal'
  | 'percent'
  | 'plug'
  | 'file-text'
  | 'file-image'
  | 'file-check'
  | 'folder-open'
  | 'clipboard-list'
  | 'shield-check'
  | 'chart-column'
  | 'book-open'
  | 'upload'
  | 'download';
export function FarmstandIcon({ name }: { name: FarmstandIconName }) {
  return (
    <span
      aria-hidden="true"
      className={`farmstand-icon farmstand-icon-${name}`}
    />
  );
}

export type StockStatus = 'in' | 'low' | 'out' | 'unknown';
export const stockStatusLabels: Record<StockStatus, string> = {
  in: 'In stock',
  low: 'Low stock',
  out: 'Out of stock',
  unknown: 'Unavailable',
};
/** Display threshold only. Does not establish sale availability or modify inventory. */
export function stockStatus(quantity: number | undefined): StockStatus {
  return quantity === undefined
    ? 'unknown'
    : quantity <= 0
      ? 'out'
      : quantity <= 10
        ? 'low'
        : 'in';
}
export function FarmstandStockBadge({ status }: { status: StockStatus }) {
  return (
    <Badge
      tone={
        status === 'in'
          ? 'success'
          : status === 'low'
            ? 'warning'
            : status === 'out'
              ? 'danger'
              : 'neutral'
      }
      className={`farmstand-stock-badge farmstand-stock-${status}`}
    >
      {stockStatusLabels[status]}
    </Badge>
  );
}

/** Caller supplies authoritative counts and owns their unit (products or variants). */
export function FarmstandStockSummary({
  counts,
  children,
}: {
  counts: Record<'in' | 'low' | 'out', number>;
  children?: ReactNode;
}) {
  return (
    <div className="farmstand-stock-summary">
      <div
        className="farmstand-stock-distribution"
        role="img"
        aria-label={`${counts.in} in stock, ${counts.low} low stock, ${counts.out} out of stock`}
      >
        {(['in', 'low', 'out'] as const)
          .filter((key) => counts[key] > 0)
          .map((key) => (
            <span
              key={key}
              className={`farmstand-stock-segment farmstand-stock-${key}`}
              style={{ flexGrow: counts[key] } as CSSProperties}
            />
          ))}
      </div>
      <div className="farmstand-stock-legend">
        <span>{counts.in} in stock</span>
        <span>{counts.low} low</span>
        <span>{counts.out} out</span>
      </div>
      {children}
    </div>
  );
}
