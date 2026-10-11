// Pure data transforms for CRED charts (transformation engine) and the MCP
// get_observations tool. No dependencies, no DOM: safe to import from client
// components, server components, and API/MCP routes.

export type TransformKind =
  | 'levels'
  | 'change'
  | 'change_yoy'
  | 'pct_change'
  | 'yoy'
  | 'index'
  | 'log';

export type FrequencyKind = 'native' | 'quarterly' | 'annual';

export interface DataPoint {
  /** ISO YYYY-MM-DD, ascending */
  date: string;
  value: number;
}

export interface TransformResult {
  data: DataPoint[];
  /**
   * Appended to the series units for the y-axis label,
   * e.g. units + ", percent change from year ago".
   */
  unitSuffix: string;
  /**
   * Human caveat shown when points were dropped or the result is empty,
   * e.g. log omissions or insufficient history for a year-ago comparison.
   */
  note?: string;
}

export const TRANSFORM_KINDS: TransformKind[] = [
  'levels',
  'change',
  'change_yoy',
  'pct_change',
  'yoy',
  'index',
  'log',
];

export const TRANSFORM_OPTIONS: { kind: TransformKind; label: string }[] = [
  { kind: 'levels', label: 'Levels' },
  { kind: 'change', label: 'Change' },
  { kind: 'change_yoy', label: 'Change from year ago' },
  { kind: 'pct_change', label: 'Percent change' },
  { kind: 'yoy', label: 'Percent change from year ago' },
  { kind: 'index', label: 'Index (base = 100)' },
  { kind: 'log', label: 'Natural log' },
];

export const FREQUENCY_OPTIONS: { kind: FrequencyKind; label: string }[] = [
  { kind: 'native', label: 'Native' },
  { kind: 'quarterly', label: 'Quarterly' },
  { kind: 'annual', label: 'Annual' },
];

/** Map a registry frequency label to periods per year (for year-ago lookback). */
export function periodsPerYearFor(frequencyLabel: string): number {
  switch (frequencyLabel) {
    case 'Daily':
      return 365;
    case 'Weekly':
      return 52;
    case 'Monthly':
      return 12;
    case 'Quarterly':
      return 4;
    case 'Annual':
      return 1;
    default:
      return 12;
  }
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Apply a unit transform to ascending date/value data.
 *
 * - levels: unchanged.
 * - change: value minus the previous period's value.
 * - pct_change: 100 * (value - prev) / prev, the FRED convention.
 * - change_yoy: value minus the value `periodsPerYear` observations back
 *   (12 back for monthly, 4 for quarterly, 1 for annual, 365 for daily,
 *   52 for weekly).
 * - yoy: 100 * (value - yearAgo) / yearAgo.
 * - index: 100 * value / firstValue, rebased to 100 at the first
 *   observation in view.
 * - log: natural log; points with non-positive values are omitted.
 *
 * Points whose transform is undefined (the leading points for change,
 * pct_change, change_yoy and yoy; non-positive points for log) are dropped
 * from the front of the result, so the returned data stays a clean
 * ascending series for the chart.
 */
export function applyTransform(
  data: DataPoint[],
  kind: TransformKind = 'levels',
  periodsPerYear = 12
): TransformResult {
  const pts = data.map((d) => ({ date: d.date, value: d.value }));

  switch (kind) {
    case 'levels':
      return { data: pts, unitSuffix: '' };

    case 'change': {
      const out: DataPoint[] = [];
      for (let i = 1; i < pts.length; i++) {
        const v = pts[i].value - pts[i - 1].value;
        if (Number.isFinite(v))
          out.push({ date: pts[i].date, value: v });
      }
      return { data: out, unitSuffix: ', change from previous period' };
    }

    case 'pct_change': {
      const out: DataPoint[] = [];
      let skipped = 0;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1].value;
        if (prev === 0 || !Number.isFinite(prev)) {
          skipped++;
          continue;
        }
        out.push({
          date: pts[i].date,
          value: ((pts[i].value - prev) / prev) * 100,
        });
      }
      return {
        data: out,
        unitSuffix: ', percent change from previous period',
        note:
          skipped > 0
            ? `Skipped ${plural(skipped, 'point')} with a zero base value.`
            : undefined,
      };
    }

    case 'change_yoy':
    case 'yoy': {
      const lookback = Math.max(1, Math.round(periodsPerYear));
      const out: DataPoint[] = [];
      let skipped = 0;
      for (let i = lookback; i < pts.length; i++) {
        const base = pts[i - lookback].value;
        if (kind === 'change_yoy') {
          const v = pts[i].value - base;
          if (Number.isFinite(v))
            out.push({ date: pts[i].date, value: v });
        } else {
          if (base === 0 || !Number.isFinite(base)) {
            skipped++;
            continue;
          }
          out.push({
            date: pts[i].date,
            value: ((pts[i].value - base) / base) * 100,
          });
        }
      }
      const suffix =
        kind === 'change_yoy'
          ? ', change from year ago'
          : ', percent change from year ago';
      if (out.length === 0 && pts.length > 0) {
        return {
          data: out,
          unitSuffix: suffix,
          note: `Not enough history in this range for a year-ago comparison (${plural(lookback, 'period')} of history needed).`,
        };
      }
      return {
        data: out,
        unitSuffix: suffix,
        note:
          kind === 'yoy' && skipped > 0
            ? `Skipped ${plural(skipped, 'point')} with a zero base value.`
            : undefined,
      };
    }

    case 'index': {
      if (pts.length === 0)
        return { data: [], unitSuffix: ', index (base = 100)' };
      const base = pts[0].value;
      if (base === 0) {
        return {
          data: [],
          unitSuffix: ', index (base = 100)',
          note: 'The first observation in this range is zero, so the index has no defined base.',
        };
      }
      return {
        data: pts.map((p) => ({ date: p.date, value: (p.value / base) * 100 })),
        unitSuffix: ', index (base = 100)',
        note:
          base < 0
            ? 'The base value is negative, so the index direction is inverted.'
            : undefined,
      };
    }

    case 'log': {
      const out: DataPoint[] = [];
      let omitted = 0;
      for (const p of pts) {
        if (p.value > 0 && Number.isFinite(p.value)) {
          out.push({ date: p.date, value: Math.log(p.value) });
        } else {
          omitted++;
        }
      }
      return {
        data: out,
        unitSuffix: ', natural log',
        note:
          omitted > 0
            ? `Natural log is undefined for non-positive values, ${plural(omitted, 'point')} omitted.`
            : undefined,
      };
    }
  }
}

/**
 * Aggregate ascending observations to a lower calendar frequency.
 * Groups by calendar quarter (or year) and takes the MEAN of the group's
 * values. Mean, not sum or end-of-period: CRED series are rates, indexes
 * and levels, and the mean preserves the series' scale across frequencies
 * (the FRED convention for lower-frequency views). Quarterly dates are
 * quarter-start ISO dates (e.g. 2026-04-01), annual dates are year-start.
 */
export function aggregateFrequency(
  data: DataPoint[],
  target: 'quarterly' | 'annual'
): DataPoint[] {
  const groups = new Map<string, { sum: number; n: number; label: string }>();
  for (const p of data) {
    const y = p.date.slice(0, 4);
    const m = Number(p.date.slice(5, 7));
    let key: string;
    let label: string;
    if (target === 'quarterly') {
      const q = Math.floor((m - 1) / 3); // 0..3
      key = `${y}-Q${q + 1}`;
      label = `${y}-${String(q * 3 + 1).padStart(2, '0')}-01`;
    } else {
      key = y;
      label = `${y}-01-01`;
    }
    const g = groups.get(key);
    if (g) {
      g.sum += p.value;
      g.n += 1;
    } else {
      groups.set(key, { sum: p.value, n: 1, label });
    }
  }
  // Map preserves insertion order, and input is ascending, so output is
  // ascending too.
  return [...groups.values()].map((g) => ({
    date: g.label,
    value: g.sum / g.n,
  }));
}
