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
  const padL = 52;
  const padR = 16;
  const padT = 12;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

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

  const tMin = new Date(minD + 'T00:00:00Z').getTime();
  const tMax = new Date(maxD + 'T00:00:00Z').getTime();
  const span = Math.max(tMax - tMin, 1);

  const x = (date: string) =>
    padL + ((new Date(date + 'T00:00:00Z').getTime() - tMin) / span) * plotW;
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * plotH;

  const ticks = niceTicks(lo, hi, 6);

  // Year ticks: one per year, thinned so labels don't collide.
  const years = [...new Set(dates.map((d) => d.slice(0, 4)))];
  const thin = Math.max(1, Math.ceil(years.length / 10));
  const yearTicks = years.filter((_, i) => i % thin === 0);

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
      {yearTicks.map((yr) => (
        <text
          key={`${id}-y${yr}`}
          x={x(`${yr}-01-01`) < padL ? padL : x(`${yr}-01-01`)}
          y={H - 12}
          fontSize={11}
          fill="#8a93a6"
        >
          {yr}
        </text>
      ))}
      {yLabel && (
        <text
          x={12}
          y={padT + plotH / 2}
          fontSize={11}
          fill="#8a93a6"
          transform={`rotate(-90 12 ${padT + plotH / 2})`}
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
