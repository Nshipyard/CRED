// Pure server-safe SVG line chart: gridlines, year ticks, recession bands,
// data line, per-point <title> tooltips. No client JS.

import { RECESSIONS, type Recession } from '@/lib/recessions';

export interface ChartPoint {
  date: string;
  value: number;
}

interface ChartSVGProps {
  data: ChartPoint[];
  recessions?: Recession[];
  yLabel?: string;
  color?: string;
  id?: string;
  height?: number;
}

function niceTicks(min: number, max: number, count = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min];
  }
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm >= 5 ? 5 * mag : norm >= 2 ? 2 * mag : mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 0.5; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
}

// Left-margin geometry for the y axis, shared with overlays that must align
// with this chart (e.g. the compare series). Layout, left to right:
// dedicated title lane, gap, tick-label column right-aligned at the plot edge.
export const Y_TITLE_LANE_W = 18;
export const Y_TITLE_GAP = 10;

export function chartLeftPad(minV: number, maxV: number): number {
  const vPad = (maxV - minV || Math.abs(maxV) || 1) * 0.08;
  const ticks = niceTicks(minV - vPad, maxV + vPad, 6);
  const maxLen = Math.max(...ticks.map((t) => String(t).length), 1);
  const tickColW = maxLen * 6.8 + 4; // estimated label width at 11px
  return Math.ceil(Y_TITLE_LANE_W + Y_TITLE_GAP + tickColW + 8);
}

export default function ChartSVG({
  data,
  recessions = RECESSIONS,
  yLabel = '',
  color = '#d80621',
  id = 'chart',
  height = 320,
}: ChartSVGProps) {
  const W = 800;
  const H = height;
  const padR = 16;
  const padT = 12;
  const padB = 34;

  if (data.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="No data">
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#8a93a6" fontSize={14}>
          No observations for this range
        </text>
      </svg>
    );
  }

  const dates = data.map((d) => d.date);
  const values = data.map((d) => d.value);
  const minD = dates[0];
  const maxD = dates[dates.length - 1];
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const vPad = (maxV - minV || Math.abs(maxV) || 1) * 0.08;
  const lo = minV - vPad;
  const hi = maxV + vPad;

  // padL depends on the tick labels, so ticks are computed before geometry.
  const ticks = niceTicks(lo, hi, 6);
  const padL = chartLeftPad(minV, maxV);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const tMin = new Date(minD + 'T00:00:00Z').getTime();
  const tMax = new Date(maxD + 'T00:00:00Z').getTime();
  const span = Math.max(tMax - tMin, 1);

  const x = (date: string) =>
    padL + ((new Date(date + 'T00:00:00Z').getTime() - tMin) / span) * plotW;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * plotH;

  // Year ticks: one per year, thinned so labels don't collide.
  // The final year is always labeled so the axis never looks stale
  // when thinning drops it (e.g. data runs to 2026 but ticks stop at 2024).
  const years = [...new Set(dates.map((d) => d.slice(0, 4)))];
  const thin = Math.max(1, Math.ceil(years.length / 10));
  const yearTicks = years.filter((_, i) => i % thin === 0);
  const lastYear = years[years.length - 1];
  if (yearTicks[yearTicks.length - 1] !== lastYear) {
    if (Number(lastYear) - Number(yearTicks[yearTicks.length - 1]) < thin) {
      yearTicks.pop();
    }
    yearTicks.push(lastYear);
  }

  const visibleRecessions = recessions.filter(
    (r) => r.end >= minD && r.start <= maxD
  );

  const path = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.date).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel} line chart`}>
      {visibleRecessions.map((r) => {
        const rx = x(r.start < minD ? minD : r.start);
        const rx2 = x(r.end > maxD ? maxD : r.end);
        return (
          <g key={`${id}-${r.start}`}>
            <rect
              x={rx}
              y={padT}
              width={Math.max(rx2 - rx, 1)}
              height={plotH}
              fill="#dfe3ea"
              opacity={0.55}
            >
              <title>{r.label}</title>
            </rect>
          </g>
        );
      })}
      {ticks.map((t) => (
        <g key={`${id}-g${t}`}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke="rgba(10,15,30,0.12)"
            strokeWidth={1}
          />
          <text
            x={padL - 8}
            y={y(t) + 4}
            textAnchor="end"
            fontSize={11}
            fill="#8a93a6"
          >
            {t}
          </text>
        </g>
      ))}
      {yearTicks.map((yr, yi) => {
        const pos = x(`${yr}-01-01`) < padL ? padL : x(`${yr}-01-01`);
        // The final-year label sits near the right edge; anchor it inward
        // so it never clips off the chart.
        const anchorEnd = yi === yearTicks.length - 1 && pos + 30 > W;
        return (
          <text
            key={`${id}-y${yr}`}
            x={anchorEnd ? W - 6 : pos}
            y={H - 12}
            fontSize={11}
            fill="#8a93a6"
            textAnchor={anchorEnd ? 'end' : 'start'}
          >
            {yr}
          </text>
        );
      })}
      {yLabel && (
        <text
          x={Y_TITLE_LANE_W / 2}
          y={padT + plotH / 2}
          fontSize={11}
          fill="#8a93a6"
          transform={`rotate(-90 ${Y_TITLE_LANE_W / 2} ${padT + plotH / 2})`}
          textAnchor="middle"
        >
          {yLabel}
        </text>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Hover: invisible dots with native <title> tooltips, server-safe */}
      {data.map((d, i) =>
        i % Math.max(1, Math.floor(data.length / 400)) === 0 ? (
          <circle key={`${id}-p${i}`} cx={x(d.date)} cy={y(d.value)} r={6} fill="transparent">
            <title>{`${d.date}: ${d.value}`}</title>
          </circle>
        ) : null
      )}
    </svg>
  );
}
