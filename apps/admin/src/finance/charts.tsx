import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
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
type HintRow = { label: string; value: string; series?: FinanceMetric };
type Hint = {
  label: string;
  value: string;
  share?: string;
  rows?: HintRow[];
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
        Math.min(a.left - box.left + a.width / 2 + 14, box.width - 230),
      ),
      y: Math.max(
        8,
        Math.min(a.top - box.top + a.height / 2 - 40, box.height - 110),
      ),
    });
  }
  return { hint, show, hide: () => setHint(undefined) };
}
function ChartHint({ hint, flow = false }: { hint?: Hint; flow?: boolean }) {
  return hint ? (
    <div
      role="tooltip"
      className="ui-tooltip-surface finance-chart-tooltip"
      style={flow ? undefined : { left: hint.x, top: hint.y }}
    >
      <strong>{hint.label}</strong>
      {hint.rows ? (
        <dl className="finance-tooltip-rows">
          {hint.rows.map((row) => (
            <div
              key={row.label}
              className={row.series ? 'finance-series-' + row.series : ''}
            >
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <span>{hint.value}</span>
      )}
      {hint.share && <span>{hint.share}</span>}
    </div>
  ) : null;
}

/** Rounded 1/2/2.5/5 × 10ⁿ step for readable axis ticks. */
function niceStep(span: number, count: number) {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (
    (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) *
    power
  );
}
export function financeScale(values: readonly number[]) {
  let min = Math.min(0, ...values),
    max = Math.max(0, ...values);
  if (min === max) max = min + 100;
  const step = niceStep(max - min, 4);
  min = Math.floor(min / step) * step;
  max = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = min; tick <= max + step / 2; tick += step)
    ticks.push(Math.round(tick));
  return { min, max, ticks };
}
function compactMoney(value: number, currency: string) {
  const digits =
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value / 10 ** digits);
}
/** Monotone cubic path: smooth without overshooting between points. */
function smoothPath(points: Array<[number, number]>) {
  if (points.length < 3)
    return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const slopes = points.slice(1).map(([x, y], i) => {
    const [px, py] = points[i]!;
    return (y - py) / (x - px || 1);
  });
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0]!;
    if (i === points.length - 1) return slopes[i - 1]!;
    const a = slopes[i - 1]!,
      b = slopes[i]!;
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!,
      [x1, y1] = points[i]!,
      dx = (x1 - x0) / 3;
    d += ` C${x0 + dx},${y0 + tangents[i - 1]! * dx} ${x1 - dx},${y1 - tangents[i]! * dx} ${x1},${y1}`;
  }
  return d;
}
/** Bar rounded only at its far end, growing up or down from the baseline. */
function barPath(x: number, base: number, end: number, width: number) {
  const height = Math.abs(end - base);
  const r = Math.min(5, width / 2, height);
  const up = end < base;
  const top = up ? end : base,
    bottom = up ? base : end;
  return up
    ? `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${bottom} Z`
    : `M${x},${top} H${x + width} V${bottom - r} Q${x + width},${bottom} ${x + width - r},${bottom} H${x + r} Q${x},${bottom} ${x},${bottom - r} Z`;
}
function dateLabel(date: string, group: string, long = false) {
  const value = new Date(date + 'T12:00:00Z');
  if (group === 'monthly')
    return value.toLocaleDateString(undefined, {
      month: long ? 'long' : 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const day = value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(long ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
  return group === 'weekly' && long ? `Week of ${day}` : day;
}

const TOP = 18,
  BOTTOM = 44,
  LEFT = 64,
  RIGHT = 16;
export function FinancialGraph({
  report,
  series,
  group,
  lines = false,
  height: HEIGHT = 320,
}: {
  report: FinanceReport;
  series: FinanceMetric[];
  group: string;
  /** Opt-in: draw every series as a line with an area fill, not bars. */
  lines?: boolean;
  /** Opt-in SVG height in pixels; the finance overview keeps 320. */
  height?: number;
}) {
  const graph = useRef<SVGSVGElement>(null),
    [chartWidth, setChartWidth] = useState(900),
    [active, setActive] = useState<number>(),
    tip = useChartHint(),
    title = useId(),
    gradient = useId();
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
  const scale = financeScale(
    data.flatMap((d) => series.map((metric) => displayValue(d, metric))),
  );
  const plotWidth = chartWidth - LEFT - RIGHT,
    slot = plotWidth / Math.max(1, data.length);
  const y = (value: number) =>
    TOP +
    ((scale.max - value) / (scale.max - scale.min)) * (HEIGHT - TOP - BOTTOM);
  const x = (i: number) => LEFT + (i + 0.5) * slot;
  const barWidth = Math.max(3, Math.min(28, slot * 0.62));
  const money = (n: number) => formatMoney(n, report.scope.currency);
  const labelStep = Math.max(
    1,
    Math.ceil(data.length / Math.max(2, Math.floor(plotWidth / 90))),
  );
  const ordered = [...series].sort(
    (a, b) => Number(a === 'profit') - Number(b === 'profit'),
  );
  const isLine = (metric: FinanceMetric) => lines || metric === 'profit';
  const linePath = (metric: FinanceMetric) =>
    smoothPath(
      data.map(
        (d, i) => [x(i), y(displayValue(d, metric))] as [number, number],
      ),
    );
  // One tooltip lists every visible series for the date under the pointer.
  const columnHint = (d: FinanceBucket) => ({
    label: dateLabel(d.date, group, true),
    rows: ordered.map((m) => ({
      label: financeMetrics[m],
      value: money(displayValue(d, m)),
      series: m,
    })),
    value: '',
  });
  const hide = () => {
    tip.hide();
    setActive(undefined);
  };
  return (
    <div
      role="group"
      aria-label="Chart interaction"
      className="finance-chart"
      onMouseLeave={hide}
    >
      <svg
        ref={graph}
        className="finance-main-graph"
        viewBox={`0 0 ${chartWidth} ${HEIGHT}`}
        role="group"
        aria-labelledby={title}
      >
        <title id={title}>
          Financial activity, {report.scope.from} to {report.scope.through}.{' '}
          {report.scope.timezone}. Focus or hover a bar or profit point for its
          date and amounts.
        </title>
        <defs>
          {(['gross', 'totalExpenses'] as const).map((metric) => (
            <linearGradient
              key={metric}
              id={`${gradient}-${metric}`}
              x1="0"
              x2="0"
              y1={metric === 'gross' ? '0' : '1'}
              y2={metric === 'gross' ? '1' : '0'}
              className={`finance-series-${metric}`}
            >
              <stop offset="0%" className="finance-gradient-strong" />
              <stop offset="100%" className="finance-gradient-soft" />
            </linearGradient>
          ))}
          {(['gross', 'profit'] as const).map((metric) => (
            <linearGradient
              key={metric}
              id={`${gradient}-${metric}-area`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
              className={`finance-series-${metric}`}
            >
              <stop offset="0%" className="finance-area-strong" />
              <stop offset="100%" className="finance-area-soft" />
            </linearGradient>
          ))}
        </defs>
        {scale.ticks.map((tick) => (
          <g key={tick} className="finance-axis">
            <line
              x1={LEFT}
              x2={chartWidth - RIGHT}
              y1={y(tick)}
              y2={y(tick)}
              className={tick === 0 ? 'finance-zero' : 'finance-grid-line'}
            />
            <text x={LEFT - 10} y={y(tick) + 4} textAnchor="end">
              {compactMoney(tick, report.scope.currency)}
            </text>
          </g>
        ))}
        {active !== undefined && (
          <rect
            className="finance-column-highlight"
            x={LEFT + active * slot + 2}
            y={TOP - 6}
            width={Math.max(0, slot - 4)}
            height={HEIGHT - TOP - BOTTOM + 12}
            rx="8"
          />
        )}
        {ordered.map((metric) => (
          <g
            key={metric}
            className={`finance-series finance-series-${metric}`}
            data-series={metric}
          >
            {isLine(metric) && data.length > 0 && (
              <>
                <path
                  className="finance-series-area"
                  d={`${linePath(metric)} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                  fill={`url(#${gradient}-${metric === 'totalExpenses' ? 'gross' : metric}-area)`}
                />
                <path className="finance-series-line" d={linePath(metric)} />
              </>
            )}
            {data.map((d, i) => {
              const value = displayValue(d, metric),
                label = dateLabel(d.date, group, true);
              const hint = {
                ...columnHint(d),
                value: `${financeMetrics[metric]}: ${money(value)}`,
              };
              const show = (e: SyntheticEvent<SVGElement>) => {
                setActive(i);
                tip.show(e, hint);
              };
              const interaction = {
                'data-value': value,
                tabIndex: 0,
                role: 'button' as const,
                'aria-label': `${label}, ${hint.value}`,
                onMouseEnter: show,
                onFocus: show,
                onBlur: hide,
                onClick: show,
                onKeyDown: (e: KeyboardEvent<SVGElement>) => {
                  if (e.key === 'Escape') hide();
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    show(e);
                  }
                },
              };
              const dimmed = active !== undefined && active !== i;
              return isLine(metric) ? (
                <circle
                  key={d.date}
                  cx={x(i)}
                  cy={y(value)}
                  r={active === i ? 5.5 : slot < 16 ? 2.5 : 3.5}
                  className={
                    value < 0 ? 'finance-negative-point' : 'finance-point'
                  }
                  {...interaction}
                />
              ) : (
                <path
                  key={d.date}
                  d={
                    value === 0
                      ? `M${x(i) - barWidth / 2},${y(0) - 1} h${barWidth} v2 h${-barWidth} Z`
                      : barPath(x(i) - barWidth / 2, y(0), y(value), barWidth)
                  }
                  fill={`url(#${gradient}-${metric})`}
                  className={
                    'finance-series-bar' + (dimmed ? ' finance-dimmed' : '')
                  }
                  {...interaction}
                />
              );
            })}
          </g>
        ))}
        {/* Pointer-only column targets so gaps between bars still respond;
            keyboard focus stays on the bars and profit points. */}
        {series.length > 0 &&
          data.map((d, i) => (
            <rect
              key={'hit:' + d.date}
              aria-hidden="true"
              className="finance-column-hit"
              x={LEFT + i * slot}
              y={TOP}
              width={slot}
              height={HEIGHT - TOP - BOTTOM}
              onMouseEnter={(e) => {
                setActive(i);
                tip.show(e, columnHint(d));
              }}
            />
          ))}
        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <text
              key={d.date}
              x={x(i)}
              y={HEIGHT - 16}
              textAnchor="middle"
              className={
                'finance-x-label' + (active === i ? ' finance-x-active' : '')
              }
            >
              {dateLabel(d.date, group)}
            </text>
          ) : null,
        )}
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

const OUTER = 104,
  INNER = 74,
  CORNER = 4,
  GAP = 4,
  GROW = 5,
  // Smallest visible share of the ring, so tiny slices keep their gaps.
  MIN_SHARE = 0.026;
type Point = [number, number];
/** Angle in radians, clockwise from 12 o'clock. */
const polar = (angle: number, radius: number): Point => [
  120 + radius * Math.sin(angle),
  120 - radius * Math.cos(angle),
];
const fmt = ([x, y]: Point) => `${x.toFixed(3)} ${y.toFixed(3)}`;
/**
 * Ring segment between two boundary angles. Each straight edge is offset
 * half a gap from its radial boundary, so neighbouring edges are parallel
 * and the gap has the same width from the inner to the outer edge. Corners
 * are true fillets whose radius shrinks to fit narrow slices.
 */
export function donutArc(from: number, to: number, grow = 0) {
  const outer = OUTER + grow,
    inner = INNER,
    a0 = from * 2 * Math.PI,
    a1 = to * 2 * Math.PI;
  if (to - from >= 0.99999)
    return (
      `M ${fmt(polar(0, outer))} A ${outer} ${outer} 0 1 1 ${fmt(polar(Math.PI, outer))} A ${outer} ${outer} 0 1 1 ${fmt(polar(2 * Math.PI, outer))} Z ` +
      `M ${fmt(polar(0, inner))} A ${inner} ${inner} 0 1 0 ${fmt(polar(Math.PI, inner))} A ${inner} ${inner} 0 1 0 ${fmt(polar(2 * Math.PI, inner))} Z`
    );
  const h = GAP / 2;
  // Narrow slices get smaller corners (inner arc width is the tightest).
  const innerWidth = (a1 - a0) * inner - 2 * h;
  const r = Math.max(
    0,
    Math.min(CORNER, innerWidth / 2 - 0.2, (outer - inner) / 2),
  );
  // Side s=+1 is the start edge (offset clockwise), s=-1 the end edge.
  const edge = (angle: number, s: 1 | -1) => {
    const unit: Point = [Math.sin(angle), -Math.cos(angle)],
      normal: Point = [s * Math.cos(angle), s * Math.sin(angle)];
    const along = (radius: number) =>
      Math.sqrt(radius * radius - (h + r) * (h + r));
    const onLine = (d: number): Point => [
      120 + unit[0] * d + normal[0] * h,
      120 + unit[1] * d + normal[1] * h,
    ];
    return {
      outerLine: onLine(along(outer - r)),
      outerArc: polar(angle + s * Math.asin((h + r) / (outer - r)), outer),
      innerLine: onLine(along(inner + r)),
      innerArc: polar(angle + s * Math.asin((h + r) / (inner + r)), inner),
    };
  };
  const start = edge(a0, 1),
    end = edge(a1, -1);
  const large = (outerAngle: number) => (outerAngle > Math.PI ? 1 : 0);
  const outerSpan = a1 - a0 - 2 * Math.asin((h + r) / (outer - r)),
    innerSpan = a1 - a0 - 2 * Math.asin((h + r) / (inner + r));
  return [
    `M ${fmt(start.outerLine)}`,
    `A ${r} ${r} 0 0 1 ${fmt(start.outerArc)}`,
    `A ${outer} ${outer} 0 ${large(outerSpan)} 1 ${fmt(end.outerArc)}`,
    `A ${r} ${r} 0 0 1 ${fmt(end.outerLine)}`,
    `L ${fmt(end.innerLine)}`,
    `A ${r} ${r} 0 0 1 ${fmt(end.innerArc)}`,
    `A ${inner} ${inner} 0 ${large(innerSpan)} 0 ${fmt(start.innerArc)}`,
    `A ${r} ${r} 0 0 1 ${fmt(start.innerLine)}`,
    'Z',
  ].join(' ');
}
const colors = [
  'var(--brand-primary)',
  'var(--brand-accent)',
  'color-mix(in srgb, var(--brand-primary) 55%, var(--brand-surface))',
  'var(--brand-secondary)',
  'color-mix(in srgb, var(--brand-accent) 55%, var(--brand-surface))',
  'color-mix(in srgb, var(--brand-primary) 30%, var(--brand-surface))',
];
/**
 * Display shares (0–1) for the ring. Tiny slices are raised to a minimum
 * visible share, taken proportionally from the larger ones; tooltips and
 * labels keep the true values.
 */
export function donutSegments<T extends { value: number }>(
  items: readonly T[],
  total: number,
) {
  const raw = items.map((item) => Math.abs(item.value) / total);
  const min = items.length > 1 ? Math.min(MIN_SHARE, 1 / items.length) : 0;
  const small = raw.filter((share) => share < min).length,
    largeTotal = raw.filter((share) => share >= min).reduce((a, b) => a + b, 0);
  const scale = largeTotal > 0 ? (1 - small * min) / largeTotal : 1;
  const shares = raw.map((share) => (share < min ? min : share * scale));
  let start = 0;
  return items.map((item, index) => {
    const segment = { ...item, start, end: start + shares[index]! };
    start = segment.end;
    return segment;
  });
}
/** Starts entrance animations only once the element is on screen. */
function useInView<T extends Element>() {
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );
  const observer = useRef<IntersectionObserver | null>(null);
  // A callback ref attaches the observer the moment the element mounts.
  const ref = useCallback((element: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          watcher.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    watcher.observe(element);
    observer.current = watcher;
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, visible] as const;
}
export function FinanceDonut({
  items,
  currency,
  onSelect,
  units = false,
  unitLabel = 'units',
  legend = false,
  controls,
}: {
  items: Array<{ id: string; name: string; value: number }>;
  currency: string;
  onSelect?: (id: string) => void;
  units?: boolean;
  /** Count noun when `units` is set, for example `customers`. */
  unitLabel?: string;
  /** Opt-in key listing each slice's value and share beside the ring. */
  legend?: boolean;
  controls?: ReactNode;
}) {
  const [active, setActive] = useState<string>(),
    [plot, visible] = useInView<HTMLDivElement>(),
    title = useId();
  const slices = items.filter((i) => i.value !== 0),
    total = slices.reduce((sum, i) => sum + Math.abs(i.value), 0),
    signed = slices.some((i) => i.value < 0);
  const formatted = (value: number) =>
    units
      ? `${value.toLocaleString()} ${unitLabel}`
      : formatMoney(value, currency);
  const percent = (value: number) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format((Math.abs(value) / total) * 100)}%${signed ? ' of absolute total' : ' of total'}`;
  const segments = donutSegments(slices, total);
  const focused = segments.find((s) => s.id === active);
  // Leader line from the focused slice's outer edge to a card beside the ring.
  const leader = focused
    ? (() => {
        const angle = ((focused.start + focused.end) / 2) * 2 * Math.PI,
          right = Math.sin(angle) >= 0,
          from = polar(angle, OUTER + GROW + 2),
          elbow = polar(angle, OUTER + GROW + 14),
          to: Point = [elbow[0] + (right ? 16 : -16), elbow[1]];
        return { from, elbow, to, right };
      })()
    : undefined;
  const clear = () => setActive(undefined);

  return (
    <div
      role="group"
      aria-label="Chart interaction"
      className={
        'finance-chart finance-donut' +
        (visible ? ' finance-donut-visible' : '')
      }
      onMouseLeave={clear}
    >
      <div className="finance-donut-plot" ref={plot}>
        {total > 0 ? (
          <svg
            viewBox="0 0 240 240"
            role="group"
            aria-labelledby={title}
            className="finance-donut-graph"
          >
            <title id={title}>
              {units
                ? unitLabel === 'units'
                  ? 'Product quantities'
                  : `Distribution of ${unitLabel}`
                : 'Financial distribution'}
              .{' '}
              {signed
                ? 'Slices represent absolute amounts; losses retain their negative value.'
                : 'Slices show share of the total.'}
            </title>
            <circle
              cx="120"
              cy="120"
              r={(OUTER + INNER) / 2}
              className="finance-donut-track"
              strokeWidth={OUTER - INNER}
            />
            {segments.map((item, index) => {
              const show = () => setActive(item.id);
              const color =
                item.value < 0
                  ? 'var(--status-danger-fg)'
                  : colors[index % colors.length];
              return (
                <path
                  key={item.id}
                  d={donutArc(
                    item.start,
                    item.end,
                    active === item.id ? GROW : 0,
                  )}
                  className="finance-donut-slice"
                  data-active={active === item.id || undefined}
                  fill={color}
                  fillRule="evenodd"
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.name}: ${formatted(item.value)}, ${percent(item.value)}`}
                  onMouseEnter={show}
                  onFocus={show}
                  onBlur={clear}
                  onClick={() => {
                    show();
                    onSelect?.(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') clear();
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      show();
                      onSelect?.(item.id);
                    }
                  }}
                  style={
                    {
                      '--finance-slice-delay': `${index * 70}ms`,
                      opacity: active && active !== item.id ? 0.45 : undefined,
                    } as CSSProperties
                  }
                />
              );
            })}
            {leader && (
              <polyline
                className="finance-donut-leader"
                points={[leader.from, leader.elbow, leader.to]
                  .map((p) => p.join(','))
                  .join(' ')}
              />
            )}
            <text
              x="120"
              y="114"
              textAnchor="middle"
              className="finance-donut-total"
            >
              {focused ? formatted(focused.value) : formatted(total)}
            </text>
            <text
              x="120"
              y="138"
              textAnchor="middle"
              className="finance-donut-caption"
            >
              {focused
                ? focused.name.length > 20
                  ? focused.name.slice(0, 19) + '…'
                  : focused.name
                : signed
                  ? 'Absolute total'
                  : 'Total'}
            </text>
          </svg>
        ) : (
          <EmptyState title="No matching activity" />
        )}
        {focused && leader && (
          <div
            role="tooltip"
            className={
              'ui-tooltip-surface finance-chart-tooltip finance-donut-tooltip ' +
              (leader.right
                ? 'finance-donut-tooltip-right'
                : 'finance-donut-tooltip-left')
            }
            style={{
              left: `${(leader.to[0] / 240) * 100}%`,
              top: `${(leader.to[1] / 240) * 100}%`,
            }}
          >
            <strong>{focused.name}</strong>
            <span>{formatted(focused.value)}</span>
            <span>{percent(focused.value)}</span>
          </div>
        )}
      </div>
      {legend && total > 0 && (
        <ul className="finance-donut-legend">
          {segments.map((item, index) => (
            <li
              key={item.id}
              style={
                {
                  '--finance-legend-color':
                    item.value < 0
                      ? 'var(--status-danger-fg)'
                      : colors[index % colors.length],
                } as CSSProperties
              }
            >
              <span>{item.name}</span>
              <strong>{formatted(item.value)}</strong>
              <small>
                {new Intl.NumberFormat(undefined, {
                  maximumFractionDigits: 0,
                }).format((Math.abs(item.value) / total) * 100)}
                %
              </small>
            </li>
          ))}
        </ul>
      )}
      <div className="finance-donut-controls">{controls}</div>
      {signed && (
        <small>Slices use absolute amounts; losses retain their sign.</small>
      )}
    </div>
  );
}
