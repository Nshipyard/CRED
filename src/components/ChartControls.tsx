'use client';

// Client island on the series page: range pills, date inputs, Edit Graph
// popover (recession shading toggle + compare series), CSV download,
// fullscreen, share link. Re-renders the server-safe ChartSVG with new data.

import { useRef, useState } from 'react';
import ChartSVG, { type ChartPoint } from './ChartSVG';
import { RECESSIONS } from '@/lib/recessions';

interface SeriesOption {
  id: string;
  title: string;
}

interface ChartControlsProps {
  seriesId: string;
  seriesTitle: string;
  units: string;
  initial: ChartPoint[];
  compareOptions: SeriesOption[];
}

type RangeKey = '1Y' | '5Y' | '10Y' | 'MAX';

function rangeToFrom(range: RangeKey, latest: string): string | undefined {
  if (range === 'MAX' || !latest) return undefined;
  const years = range === '1Y' ? 1 : range === '5Y' ? 5 : 10;
  const d = new Date(latest + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export default function ChartControls({
  seriesId,
  seriesTitle,
  units,
  initial,
  compareOptions,
}: ChartControlsProps) {
  const latest = initial.length ? initial[initial.length - 1].date : '';
  const [data, setData] = useState<ChartPoint[]>(initial);
  const [range, setRange] = useState<RangeKey>('MAX');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecessions, setShowRecessions] = useState(true);
  const [compareId, setCompareId] = useState('');
  const [compareData, setCompareData] = useState<ChartPoint[] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load(fromDate?: string, toDate?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ series: seriesId });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await fetch(`/api/observations?${params.toString()}`);
      const json = await res.json();
      setData(json.observations ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  function pickRange(r: RangeKey) {
    setRange(r);
    const f = rangeToFrom(r, latest);
    setFrom(f ?? '');
    setTo('');
    load(f, undefined);
  }

  function applyDates() {
    setRange('MAX');
    load(from || undefined, to || undefined);
  }

  async function onCompare(id: string) {
    setCompareId(id);
    if (!id) {
      setCompareData(null);
      return;
    }
    try {
      const params = new URLSearchParams({ series: id });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/observations?${params.toString()}`);
      const json = await res.json();
      setCompareData(json.observations ?? []);
    } catch {
      setCompareData(null);
    }
  }

  function downloadCSV() {
    const rows = ['date,value', ...data.map((d) => `${d.date},${d.value}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${seriesId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleFullscreen() {
    const el = panelRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // Merge compare series as a gray dashed line behind the main series.
  const comparePath = (() => {
    if (!compareData || compareData.length === 0) return null;
    const all = [...data, ...compareData];
    const vals = all.map((d) => d.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const vPad = (maxV - minV || 1) * 0.08;
    return { data: compareData, minV: minV - vPad, maxV: maxV + vPad };
  })();

  return (
    <div ref={panelRef} className="rounded-xl bg-[#f4f6f9] p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm tracking-wide">CRED</span>
          <span className="inline-block h-1 w-10 rounded bg-[#d80621]" />
          <span className="text-sm text-[#0a0f1e]">{seriesTitle}</span>
          {compareId && compareData && (
            <>
              <span className="inline-block h-0 w-10 border-t-2 border-dashed border-gray-500" />
              <span className="text-sm text-gray-600">
                {compareOptions.find((o) => o.id === compareId)?.title}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['1Y', '5Y', '10Y', 'MAX'] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => pickRange(r)}
              className={`rounded-full px-3 py-1 text-sm ${
                range === r
                  ? 'bg-[#d80621] text-white'
                  : 'border border-[rgba(10,15,30,0.2)] text-[#0a0f1e] hover:border-[#d80621]'
              }`}
            >
              {r === 'MAX' ? 'Max' : r}
            </button>
          ))}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            onBlur={applyDates}
            className="rounded border border-[rgba(10,15,30,0.2)] bg-white px-2 py-1 text-sm"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onBlur={applyDates}
            className="rounded border border-[rgba(10,15,30,0.2)] bg-white px-2 py-1 text-sm"
            aria-label="To date"
          />
        </div>
      </div>

      <div className="relative mt-3">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <span className="text-sm text-gray-500">Loading observations…</span>
          </div>
        )}
        <ChartSVG
          data={data}
          recessions={showRecessions ? RECESSIONS : []}
          yLabel={units}
          color="#d80621"
          id={seriesId}
        />
        {comparePath && (
          <div className="pointer-events-none absolute inset-0">
            <CompareOverlay
              data={comparePath.data}
              domain={data.length ? [data[0].date, data[data.length - 1].date] : ['2020-01-01', '2020-01-02']}
              allMin={comparePath.minV}
              allMax={comparePath.maxV}
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-600">
          <span>Source: fetched live via CRED</span>
          <br />
          <em>Shaded areas indicate Canadian recessions (C.D. Howe Institute).</em>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setEditOpen((v) => !v)}
              className="rounded bg-[#d80621] px-4 py-1.5 text-sm font-medium text-white"
            >
              Edit Graph
            </button>
            {editOpen && (
              <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-[rgba(10,15,30,0.1)] bg-white p-4 shadow-lg">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showRecessions}
                    onChange={(e) => setShowRecessions(e.target.checked)}
                  />
                  Shade recessions
                </label>
                <label className="mt-3 block text-sm font-medium">Compare</label>
                <select
                  value={compareId}
                  onChange={(e) => onCompare(e.target.value)}
                  className="mt-1 w-full rounded border border-[rgba(10,15,30,0.2)] px-2 py-1 text-sm"
                >
                  <option value="">None</option>
                  {compareOptions
                    .filter((o) => o.id !== seriesId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} ({o.id})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
          <button
            onClick={downloadCSV}
            className="rounded border border-[#0a0f1e] px-4 py-1.5 text-sm font-medium text-[#0a0f1e]"
          >
            Download
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded border border-[rgba(10,15,30,0.2)] px-4 py-1.5 text-sm text-[#0a0f1e]"
          >
            Fullscreen
          </button>
          <button
            onClick={share}
            className="rounded border border-[rgba(10,15,30,0.2)] px-4 py-1.5 text-sm text-[#0a0f1e]"
          >
            {copied ? 'Copied' : 'Share Graph'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Renders the compare series with the same geometry as the main chart
// (same viewBox, same value scale) as a gray dashed line.
function CompareOverlay({
  data,
  domain,
  allMin,
  allMax,
}: {
  data: ChartPoint[];
  domain: [string, string];
  allMin: number;
  allMax: number;
}) {
  const W = 800;
  const H = 320;
  const padL = 52;
  const padR = 16;
  const padT = 12;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  if (data.length === 0) return null;
  const tMin = new Date(domain[0] + 'T00:00:00Z').getTime();
  const tMax = new Date(domain[1] + 'T00:00:00Z').getTime();
  const span = Math.max(tMax - tMin, 1);
  const x = (date: string) =>
    padL + ((new Date(date + 'T00:00:00Z').getTime() - tMin) / span) * plotW;
  const y = (v: number) => padT + (1 - (v - allMin) / (allMax - allMin)) * plotH;
  const path = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.date).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <path
        d={path}
        fill="none"
        stroke="#6b7280"
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={0.8}
      />
    </svg>
  );
}
