import {
  useEffect,
  useId,
  useRef,
  useState,
  type SyntheticEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { EmptyState } from '@market/ui';
import { formatMoney } from '@market/config';
import type { FinanceReport, FinanceTotals } from '@market/api';
export type FinanceBucket = FinanceTotals & { date: string };
export type FinanceMetric = 'gross' | 'totalExpenses' | 'profit';
export const financeMetrics: Record<FinanceMetric, string> = {
  gross: 'Gross sales',
  totalExpenses: 'Expenses',
  profit: 'Net profit (estimated)',
};
export function buckets(daily: FinanceBucket[], group: string) {
  const map = new Map<string, FinanceBucket>();
  for (const d of daily) {
    let key = d.date;
    if (group === 'monthly') key = key.slice(0, 7) + '-01';
    if (group === 'weekly') {
      const date = new Date(key);
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      key = date.toISOString().slice(0, 10);
    }
    const existing = map.get(key);
    if (!existing) map.set(key, { ...d, date: key });
    else
      for (const field of Object.keys(d) as (keyof FinanceTotals)[])
        if (field in existing && typeof d[field] === 'number')
          existing[field] += d[field];
  }
  return [...map.values()];
}
type Hint = {
  label: string;
  value: string;
  share?: string;
  series?: FinanceMetric;
  x: number;
  y: number;
};
/** SVG virtual anchors reuse the approved tooltip surface without invalid HTML inside SVG. */
function useChartHint() {
  const [hint, setHint] = useState<Hint>();
  function show(
    event: SyntheticEvent<SVGElement | HTMLElement>,
    value: Omit<Hint, 'x' | 'y'>,
  ) {
    const a = event.currentTarget.getBoundingClientRect(),
      box = event.currentTarget
        .closest('.finance-chart')!
        .getBoundingClientRect();
    setHint({
      ...value,
      x: Math.max(
        8,
        Math.min(a.left - box.left + a.width / 2 + 10, box.width - 220),
      ),
      y: Math.max(
        8,
        Math.min(a.top - box.top + a.height / 2 - 30, box.height - 85),
      ),
    });
  }
  return { hint, show, hide: () => setHint(undefined) };
}
function ChartHint({ hint, flow = false }: { hint?: Hint; flow?: boolean }) {
  return hint ? (
    <div
      role="tooltip"
      className={
        'ui-tooltip-surface finance-chart-tooltip' +
        (hint.series
          ? ' finance-series-' + hint.series + ' finance-series-tooltip'
          : '')
      }
      style={flow ? undefined : { left: hint.x, top: hint.y }}
    >
      <strong>{hint.label}</strong>
      <span>{hint.value}</span>
      {hint.share && <span>{hint.share}</span>}
    </div>
  ) : null;
}
export function FinancialGraph({
  report,
  series,
  group,
}: {
  report: FinanceReport;
  series: FinanceMetric[];
  group: string;
}) {
  const graph = useRef<SVGSVGElement>(null),
    [chartWidth, setChartWidth] = useState(900),
    tip = useChartHint(),
    title = useId();
  useEffect(() => {
    const element = graph.current;
    if (!element) return;
    const measure = () =>
      setChartWidth(
        Math.max(280, Math.round(element.getBoundingClientRect().width) || 900),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const data = buckets(report.daily, group);
  // Expenses are outflows only in the chart presentation; report totals stay unchanged.
  const displayValue = (d: FinanceBucket, metric: FinanceMetric) =>
    metric === 'totalExpenses' ? -d.totalExpenses : d[metric];
  const values = data.flatMap((d) => [
    0,
    ...series.map((metric) => displayValue(d, metric)),
  ]);
  const min = Math.min(...values, 0),
    max = Math.max(...values, 100),
    span = max - min || 1,
    pad = span * 0.12;
  const y = (value: number) =>
    290 - ((value - min + pad) / (span + pad * 2)) * 260;
  const x = (i: number) =>
    82 + ((i + 0.5) * (chartWidth - 100)) / Math.max(1, data.length);
  const barWidth = Math.min(
    24,
    ((chartWidth - 100) / Math.max(1, data.length)) * 0.65,
  );
  const money = (n: number) => formatMoney(n, report.scope.currency);
  return (
    <div
      role="group"
      aria-label="Chart interaction"
      className="finance-chart"
      onMouseLeave={tip.hide}
    >
      <svg
        ref={graph}
        className="finance-main-graph"
        viewBox={`0 0 ${chartWidth} 340`}
        role="group"
        aria-labelledby={title}
      >
        <title id={title}>
          Financial activity, {report.scope.from} to {report.scope.through}.{' '}
          {report.scope.timezone}. Focus or hover a bar or profit point for its
          date and amount.
        </title>
        {[min, 0, max]
          .filter((n, i, a) => a.indexOf(n) === i)
          .map((n) => (
            <g key={n}>
              <line
                x1="78"
                x2={chartWidth - 10}
                y1={y(n)}
                y2={y(n)}
                className={n === 0 ? 'finance-zero' : 'finance-grid-line'}
              />
              <text x="72" y={y(n) + 4} textAnchor="end">
                {money(n)}
              </text>
            </g>
          ))}
        {[...series]
          .sort((a, b) => Number(a === 'profit') - Number(b === 'profit'))
          .map((metric) => (
            <g
              key={metric}
              className={`finance-series finance-series-${metric}`}
              data-series={metric}
            >
              {metric === 'profit' && (
                <polyline
                  className="finance-series-line"
                  points={data
                    .map((d, i) => `${x(i)},${y(d.profit)}`)
                    .join(' ')}
                />
              )}
              {data.map((d, i) => {
                const value = displayValue(d, metric),
                  label =
                    group === 'weekly'
                      ? `Week of ${d.date}`
                      : group === 'monthly'
                        ? d.date.slice(0, 7)
                        : d.date;
                const hint = {
                  label,
                  series: metric,
                  value: `${financeMetrics[metric]}: ${money(value)}`,
                };
                const interaction = {
                  'data-value': value,
                  tabIndex: 0,
                  role: 'button' as const,
                  'aria-label': `${label}, ${hint.value}`,
                  onMouseEnter: (e: SyntheticEvent<SVGElement>) =>
                    tip.show(e, hint),
                  onFocus: (e: SyntheticEvent<SVGElement>) => tip.show(e, hint),
                  onBlur: tip.hide,
                  onClick: (e: SyntheticEvent<SVGElement>) => tip.show(e, hint),
                  onKeyDown: (e: KeyboardEvent<SVGElement>) => {
                    if (e.key === 'Escape') tip.hide();
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      tip.show(e, hint);
                    }
                  },
                };
                return metric === 'profit' ? (
                  <circle
                    key={d.date}
                    cx={x(i)}
                    cy={y(value)}
                    r="5"
                    className={
                      value < 0 ? 'finance-negative-point' : 'finance-point'
                    }
                    {...interaction}
                  />
                ) : (
                  <rect
                    key={d.date}
                    x={x(i) - barWidth / 2}
                    y={value === 0 ? y(0) - 1 : Math.min(y(value), y(0))}
                    width={barWidth}
                    height={value === 0 ? 2 : Math.abs(y(value) - y(0))}
                    className="finance-series-bar"
                    {...interaction}
                  />
                );
              })}
            </g>
          ))}
        {data
          .filter(
            (_, i) =>
              i %
                Math.max(
                  1,
                  Math.ceil(data.length / (chartWidth < 500 ? 3 : 7)),
                ) ===
                0 || i === data.length - 1,
          )
          .map((d) => (
            <text
              key={d.date}
              x={x(data.indexOf(d))}
              y="330"
              textAnchor="middle"
            >
              {d.date.slice(5)}
            </text>
          ))}
      </svg>
      {!series.length && (
        <p className="finance-chart-empty">
          Select a metric to show it on the graph.
        </p>
      )}
      <ChartHint hint={tip.hint} />
    </div>
  );
}
export function donutArc(start: number, length: number) {
  const point = (percent: number) => {
    const angle = (((percent / 100) * 360 - 90) * Math.PI) / 180;
    return [120 + 82 * Math.cos(angle), 120 + 82 * Math.sin(angle)].join(' ');
  };
  if (length >= 99.999999)
    return (
      'M ' +
      point(start) +
      ' A 82 82 0 1 1 ' +
      point(start + 50) +
      ' A 82 82 0 1 1 ' +
      point(start + 100)
    );
  return (
    'M ' +
    point(start) +
    ' A 82 82 0 ' +
    (length > 50 ? 1 : 0) +
    ' 1 ' +
    point(start + length)
  );
}
const colors = [
  'var(--brand-primary)',
  'var(--brand-accent)',
  'var(--brand-secondary)',
  'color-mix(in srgb, var(--brand-primary) 55%, var(--brand-surface))',
  'color-mix(in srgb, var(--brand-accent) 60%, var(--brand-secondary))',
  'color-mix(in srgb, var(--brand-secondary) 55%, var(--brand-surface))',
];
function donutSegments(
  items: Array<{ id: string; name: string; value: number }>,
  total: number,
) {
  const result = [];
  let start = 0;
  for (const item of items) {
    const length = (Math.abs(item.value) / total) * 100;
    result.push({ ...item, start, length });
    start += length;
  }
  return result;
}
export function FinanceDonut({
  items,
  currency,
  onSelect,
  units = false,
  controls,
}: {
  items: Array<{ id: string; name: string; value: number }>;
  currency: string;
  onSelect?: (id: string) => void;
  units?: boolean;
  controls?: ReactNode;
}) {
  const tip = useChartHint(),
    [active, setActive] = useState<string>(),
    title = useId();
  const slices = items.filter((i) => i.value !== 0),
    total = slices.reduce((sum, i) => sum + Math.abs(i.value), 0),
    signed = slices.some((i) => i.value < 0);
  const formatted = (value: number) =>
    units ? `${value} units` : formatMoney(value, currency);
  const percent = (value: number) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format((Math.abs(value) / total) * 100)}%${signed ? ' of absolute total' : ' of total'}`;
  const segments = donutSegments(slices, total);

  return (
    <div
      role="group"
      aria-label="Chart interaction"
      className="finance-chart finance-donut"
      onMouseLeave={() => {
        tip.hide();
        setActive(undefined);
      }}
    >
      <div className="finance-donut-plot">
        {total > 0 ? (
          <svg
            viewBox="0 0 240 240"
            role="group"
            aria-labelledby={title}
            className="finance-donut-graph"
          >
            <title id={title}>
              {units ? 'Product quantities' : 'Financial distribution'}.{' '}
              {signed
                ? 'Slices represent absolute amounts; losses retain their negative value.'
                : 'Slices show share of the total.'}
            </title>
            {segments.map((item, index) => {
              const { length, start } = item;
              const show = (
                event: SyntheticEvent<SVGElement | HTMLElement>,
              ) => {
                setActive(item.id);
                tip.show(event, {
                  label: item.name,
                  value: formatted(item.value),
                  share: percent(item.value),
                });
              };
              return (
                <path
                  key={item.id}
                  d={donutArc(start, length)}
                  className="finance-donut-slice"
                  fill="none"
                  stroke={
                    item.value < 0
                      ? 'var(--status-danger-fg)'
                      : colors[index % colors.length]
                  }
                  strokeWidth={active === item.id ? 40 : 32}
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.name}: ${formatted(item.value)}, ${percent(item.value)}`}
                  onMouseEnter={show}
                  onFocus={show}
                  onBlur={() => {
                    setActive(undefined);
                    tip.hide();
                  }}
                  onClick={(e) => {
                    show(e);
                    onSelect?.(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      tip.hide();
                      setActive(undefined);
                    }
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      show(e);
                      onSelect?.(item.id);
                    }
                  }}
                  style={{ opacity: active && active !== item.id ? 0.55 : 1 }}
                />
              );
            })}
            <text
              x="120"
              y="116"
              textAnchor="middle"
              className="finance-donut-total"
            >
              {formatted(total)}
            </text>
            <text x="120" y="139" textAnchor="middle">
              {signed ? 'Absolute total' : 'Total'}
            </text>
          </svg>
        ) : (
          <EmptyState title="No matching activity" />
        )}
      </div>
      <div className="finance-donut-tooltip-slot">
        <ChartHint hint={tip.hint} flow />
      </div>
      <div className="finance-donut-controls">{controls}</div>
      {signed && (
        <small>Slices use absolute amounts; losses retain their sign.</small>
      )}
    </div>
  );
}
