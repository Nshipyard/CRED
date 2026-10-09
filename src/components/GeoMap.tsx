'use client';

// Canada choropleth for geo families (unemployment / CPI by province).
// Lazy-loaded by ChartControls so the 127KB province paths stay out of the
// main bundle. Provinces with no series render grey ("no data").

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PROVINCES from '@/lib/canada-provinces.json';
import type { GeoFamily } from '@/lib/geo';
import ShareGraph from './ShareGraph';
import type { ChartPoint } from './ChartSVG';

interface ProvinceValue {
  code: string;
  name: string;
  value: number | null;
  date: string | null;
  seriesId: string | null;
}

interface GeoResponse {
  family: string;
  title: string;
  units: string;
  source: string;
  asOf: string | null;
  provinces: ProvinceValue[];
}

// FRED-style sequential buckets (light to dark red).
const BUCKET_COLORS = ['#fee5d9', '#fcae91', '#fb6a4a', '#ef3b2c', '#a50f15'];
const NO_DATA_COLOR = '#d1d5db';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function bucketize(values: number[]): { min: number; max: number; edges: number[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const edges = BUCKET_COLORS.map((_, i) => min + (span * (i + 1)) / BUCKET_COLORS.length);
  return { min, max, edges };
}

function colorFor(value: number | null, edges: number[]): string {
  if (value === null) return NO_DATA_COLOR;
  for (let i = 0; i < edges.length; i++) {
    if (value <= edges[i]) return BUCKET_COLORS[i];
  }
  return BUCKET_COLORS[BUCKET_COLORS.length - 1];
}

function fmtRange(lo: number, hi: number): string {
  const f = (v: number) => (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1));
  return `${f(lo)} – ${f(hi)}`;
}

export default function GeoMap({
  family,
  seriesId,
  seriesTitle,
  toggle,
}: {
  family: GeoFamily;
  seriesId: string;
  seriesTitle: string;
  toggle?: React.ReactNode;
}) {
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [obs, setObs] = useState<ChartPoint[]>([]);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [g, o] = await Promise.all([
          fetch(`/api/geo?family=${family}`).then((r) => {
            if (!r.ok) throw new Error('geo');
            return r.json();
          }),
          fetch(`/api/observations?series=${seriesId}`).then((r) =>
            r.ok ? r.json() : { observations: [] }
          ),
        ]);
        if (alive) {
          setGeo(g);
          setObs(g && o.observations ? o.observations : []);
        }
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [family, seriesId]);

  function toggleFullscreen() {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[#f4f6f9] p-8 text-center">
        <p className="max-w-md text-sm text-gray-600">
          Statistics Canada is refreshing this table right now. Data returns
          automatically.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded bg-[#d80621] px-4 py-1.5 text-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!geo) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-[#f4f6f9] p-16">
        <span className="text-sm text-gray-500">Loading map…</span>
      </div>
    );
  }

  const dated = geo.asOf ? new Date(geo.asOf + 'T00:00:00Z') : null;
  const title = dated
    ? `${dated.getUTCFullYear()} ${MONTHS[dated.getUTCMonth()]} ${geo.title} by Province (${geo.units})`
    : `${geo.title} by Province (${geo.units})`;

  const vals = geo.provinces
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const { min, edges } = vals.length ? bucketize(vals) : { min: 0, edges: [] };
  const byCode = new Map(geo.provinces.map((p) => [p.code, p]));

  const cx = 396.5;
  const cy = 516;

  return (
    <div ref={wrapRef} className="rounded-xl bg-[#f4f6f9] p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold text-[#0a0f1e] md:text-lg">{title}</h3>
        <div className="flex items-center gap-2">
          {toggle}
          <div className="flex items-center overflow-hidden rounded border border-[rgba(10,15,30,0.2)]">
            <button
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
              className="px-3 py-1 text-sm text-[#0a0f1e] hover:bg-white disabled:opacity-40"
              disabled={zoom <= 1}
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="border-x border-[rgba(10,15,30,0.2)] px-2 py-1 text-xs text-gray-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))}
              className="px-3 py-1 text-sm text-[#0a0f1e] hover:bg-white disabled:opacity-40"
              disabled={zoom >= 4}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          <button
            onClick={toggleFullscreen}
            className="rounded border border-[rgba(10,15,30,0.2)] px-3 py-1 text-sm text-[#0a0f1e]"
          >
            Fullscreen
          </button>
          <ShareGraph
            seriesId={seriesId}
            seriesTitle={seriesTitle}
            data={obs}
            from=""
            to=""
          />
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-2xl">
        <svg viewBox="0 0 793 1032" className="h-auto w-full" role="img" aria-label={title}>
          <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
            {(PROVINCES as { code: string; name: string; d: string }[]).map((p) => {
              const v = byCode.get(p.code);
              const fill = colorFor(v?.value ?? null, edges);
              const label = v?.value !== null && v?.value !== undefined
                ? `${v.name}: ${v.value} ${geo.units}`
                : `${p.name}: no data`;
              const inner = (
                <path
                  key={p.code}
                  d={p.d}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth={1.5 / zoom}
                >
                  <title>{label}</title>
                </path>
              );
              return v?.seriesId ? (
                <Link key={p.code} href={`/series/${v.seriesId}`} aria-label={label}>
                  {inner}
                </Link>
              ) : (
                inner
              );
            })}
          </g>
        </svg>
      </div>

      {vals.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {BUCKET_COLORS.map((c, i) => {
            const lo = i === 0 ? min : edges[i - 1];
            const hi = edges[i];
            return (
              <span key={c} className="flex items-center gap-1 text-xs text-gray-600">
                <span
                  className="inline-block h-3 w-6 rounded-sm border border-[rgba(10,15,30,0.15)]"
                  style={{ backgroundColor: c }}
                />
                {fmtRange(lo, hi)}
              </span>
            );
          })}
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <span
              className="inline-block h-3 w-6 rounded-sm border border-[rgba(10,15,30,0.15)]"
              style={{ backgroundColor: NO_DATA_COLOR }}
            />
            no data
          </span>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-gray-500">
        Source: {geo.source} via CRED
      </p>
    </div>
  );
}
