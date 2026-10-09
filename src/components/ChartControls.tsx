'use client';

// Client island on the series page: range pills, date inputs, Edit Graph
// popover (recession shading toggle + compare series), CSV download,
// fullscreen, share link. The chart itself renders through the shared
// ChartFigure so thumbnails elsewhere stay pixel-identical in structure.

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ChartSVG, { type ChartPoint, chartLeftPad } from './ChartSVG';
import ChartFigure from './ChartFigure';
import ShareGraph from './ShareGraph';
import { RECESSIONS } from '@/lib/recessions';
import type { GeoFamily } from '@/lib/geo';

// The choropleth (plus its 127KB province paths) loads only when requested.
const GeoMap = dynamic(() => import('./GeoMap'), {
  loading: () => (
    <div className="flex items-center justify-center rounded-xl bg-[#f4f6f9] p-16">
      <span className="text-sm text-gray-500">Loading map…</span>
    </div>
  ),
});

interface SeriesOption {
  id: string;
  title: string;
}

interface ChartControlsProps {
  seriesId: string;
  seriesTitle: string;
  units: string;
  sourceLabel: string;
  initial: ChartPoint[];
  compareOptions: SeriesOption[];
  geoFamily?: GeoFamily;
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
  sourceLabel,
  initial,
  compareOptions,
  geoFamily,
}: ChartControlsProps) {
  const latest = initial.length ? initial[initial.length - 1].date : '';
  const [data, setData] = useState<ChartPoint[]>(initial);
  const [range, setRange] = useState<RangeKey>('MAX');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const [showRecessions, setShowRecessions] = useState(true);
  const [compareId, setCompareId] = useState('');
  const [compareData, setCompareData] = useState<ChartPoint[] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [mapView, setMapView] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);

  async function load(fromDate?: string, toDate?: string) {
    setLoading(true);
    setSourceError(false);
    try {
      const params = new URLSearchParams({ series: seriesId });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await fetch(`/api/observations?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.observations ?? []);
    } catch {
      setSourceError(true);
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    load(from || undefined, to || undefined);
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
    setDownloadOpen(false);
  }

  async function downloadExcel() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(
      data.map((d) => ({ date: d.date, value: d.value }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, seriesId.slice(0, 31));
    XLSX.writeFile(wb, `${seriesId}.xlsx`);
    setDownloadOpen(false);
  }

  function escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Rasterize the rendered chart SVG to a branded PNG data URL (2x).
  // FRED-style chrome so the file is self-contained: top-left CRED logo +
  // series title, bottom-left source line and recession note, bottom-right
  // domain. The chart itself is whatever the user currently sees (range,
  // recession shading, compare series).
  async function renderChartPng(): Promise<string> {
    const svgEl = chartWrapRef.current?.querySelector('svg');
    if (!svgEl) throw new Error('chart not rendered');
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = 'text { font-family: Roboto, Arial, sans-serif; }';
    clone.insertBefore(style, clone.firstChild);
    const chartInner = new XMLSerializer()
      .serializeToString(clone)
      .replace(/<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '');

    const W = 1600;
    const HEADER_H = 110;
    const CHART_H = 640; // chart is 800x320, rendered at 2x
    const FOOTER_H = 130;
    const H = HEADER_H + CHART_H + FOOTER_H;
    const title =
      seriesTitle.length > 52 ? seriesTitle.slice(0, 51).trimEnd() + '…' : seriesTitle;
    const logo =
      `<rect x="40" y="23" width="64" height="64" rx="14" fill="#0a0f1e"/>` +
      `<polyline points="48,63 61,63 69,47 77,55 91,39" fill="none" stroke="#d80621" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    const header =
      logo +
      `<text x="122" y="70" font-size="44" font-weight="900" letter-spacing="2" fill="#0a0f1e">${'CRED'}</text>` +
      `<text x="280" y="70" font-size="36" fill="#0a0f1e">${escapeXml(title)}</text>`;
    const footerY = HEADER_H + CHART_H;
    const footer =
      `<text x="40" y="${footerY + 52}" font-size="26" fill="#3a4152">Source: ${escapeXml(sourceLabel)} via CRED</text>` +
      (showRecessions
        ? `<text x="40" y="${footerY + 92}" font-size="24" font-style="italic" fill="#6b7280">Shaded areas indicate Canadian recessions (C.D. Howe Institute).</text>`
        : '') +
      `<text x="1560" y="${footerY + 52}" text-anchor="end" font-size="26" fill="#8a93a6">cred.nshipyard.com</text>`;
    const svgData =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
      header +
      `<g transform="translate(0,${HEADER_H}) scale(2)">${chartInner}</g>` +
      footer +
      `</svg>`;
    const url = URL.createObjectURL(
      new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    );
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('svg raster failed'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function downloadImage() {
    try {
      const dataUrl = await renderChartPng();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${seriesId}.png`;
      a.click();
    } finally {
      setDownloadOpen(false);
    }
  }

  async function downloadPowerPoint() {
    try {
      const { default: PptxGenJS } = await import('pptxgenjs');
      const dataUrl = await renderChartPng();
      const pptx = new PptxGenJS();
      const slide = pptx.addSlide();
      slide.addText(seriesTitle, {
        x: 0.5,
        y: 0.3,
        w: 9,
        fontSize: 20,
        bold: true,
        color: '0A0F1E',
      });
      slide.addText(`${seriesId} · ${units} · Source: ${sourceLabel} via CRED`, {
        x: 0.5,
        y: 0.9,
        w: 9,
        fontSize: 12,
        color: '666666',
      });
      slide.addImage({ data: dataUrl, x: 0.5, y: 1.4, w: 9, h: 3.6 });
      await pptx.writeFile({ fileName: `${seriesId}.pptx` });
    } finally {
      setDownloadOpen(false);
    }
  }

  function toggleFullscreen() {
    const el = panelRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
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

  // Same left margin as the main chart so the overlay aligns exactly.
  const overlayPadL = data.length
    ? chartLeftPad(
        Math.min(...data.map((d) => d.value)),
        Math.max(...data.map((d) => d.value))
      )
    : 52;

  return (
    <div ref={panelRef}>
      {geoFamily && mapView ? (
        <GeoMap
          family={geoFamily}
          seriesId={seriesId}
          seriesTitle={seriesTitle}
          toggle={
            <div
              className="flex items-center overflow-hidden rounded border border-[rgba(10,15,30,0.2)] text-sm"
              role="tablist"
              aria-label="View"
            >
              <button
                role="tab"
                aria-selected={false}
                onClick={() => setMapView(false)}
                className="px-3 py-1 text-[#0a0f1e] hover:bg-white"
              >
                View Graph
              </button>
              <button
                role="tab"
                aria-selected={true}
                className="bg-[#0a0f1e] px-3 py-1 font-medium text-white"
              >
                View Map
              </button>
            </div>
          }
        />
      ) : (
      <ChartFigure
        seriesTitle={seriesTitle}
        sourceLabel={sourceLabel}
        compareLegend={
          compareId && compareData ? (
            <>
              <span className="inline-block h-0 w-10 border-t-2 border-dashed border-gray-500" />
              <span className="text-sm text-gray-600">
                {compareOptions.find((o) => o.id === compareId)?.title}
              </span>
            </>
          ) : undefined
        }
        headerRight={
          <div className="flex flex-wrap items-center gap-2">
            {geoFamily && (
              <div
                className="flex items-center overflow-hidden rounded border border-[rgba(10,15,30,0.2)] text-sm"
                role="tablist"
                aria-label="View"
              >
                <button
                  role="tab"
                  aria-selected={true}
                  className="bg-[#0a0f1e] px-3 py-1 font-medium text-white"
                >
                  View Graph
                </button>
                <button
                  role="tab"
                  aria-selected={false}
                  onClick={() => setMapView(true)}
                  className="px-3 py-1 text-[#0a0f1e] hover:bg-white"
                >
                  View Map
                </button>
              </div>
            )}
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
        }
        footerActions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setEditOpen((v) => !v)}
                className="whitespace-nowrap rounded bg-[#d80621] px-4 py-1.5 text-sm font-medium text-white"
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
            <div className="relative">
              <button
                onClick={() => setDownloadOpen((v) => !v)}
                className="whitespace-nowrap rounded border border-[#0a0f1e] px-4 py-1.5 text-sm font-medium text-[#0a0f1e]"
                aria-haspopup="menu"
                aria-expanded={downloadOpen}
              >
                Download ▾
              </button>
              {downloadOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full right-0 z-20 mb-2 w-48 overflow-hidden rounded-lg border border-[rgba(10,15,30,0.1)] bg-white shadow-lg"
                >
                  {[
                    { label: 'CSV (data)', fn: downloadCSV },
                    { label: 'Excel (data)', fn: downloadExcel },
                    { label: 'Image (graph)', fn: downloadImage },
                    { label: 'PowerPoint (graph)', fn: downloadPowerPoint },
                  ].map((item) => (
                    <button
                      key={item.label}
                      role="menuitem"
                      onClick={item.fn}
                      className="block w-full px-4 py-2 text-left text-sm text-[#0a0f1e] hover:bg-[#f4f6f9]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={toggleFullscreen}
              className="whitespace-nowrap rounded border border-[rgba(10,15,30,0.2)] px-4 py-1.5 text-sm text-[#0a0f1e]"
            >
              Fullscreen
            </button>
            <ShareGraph
              seriesId={seriesId}
              seriesTitle={seriesTitle}
              data={data}
              from={from}
              to={to}
            />
          </div>
        }
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <span className="text-sm text-gray-500">Loading observations…</span>
          </div>
        )}
        {sourceError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="max-w-md text-sm text-gray-600">
              Statistics Canada is refreshing this table right now. Data returns
              automatically.
            </p>
            <button
              onClick={retry}
              className="rounded bg-[#d80621] px-4 py-1.5 text-sm font-medium text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div ref={chartWrapRef}>
            <ChartSVG
              data={data}
              recessions={showRecessions ? RECESSIONS : []}
              yLabel={units}
              color="#d80621"
              id={seriesId}
            />
          </div>
        )}
        {comparePath && (
          <div className="pointer-events-none absolute inset-0">
            <CompareOverlay
              data={comparePath.data}
              domain={data.length ? [data[0].date, data[data.length - 1].date] : ['2020-01-01', '2020-01-02']}
              allMin={comparePath.minV}
              allMax={comparePath.maxV}
              padL={overlayPadL}
            />
          </div>
        )}
      </ChartFigure>
      )}
    </div>
  );
}

// Renders the compare series with the same geometry as the main chart
// (same viewBox, same value scale, same left margin) as a gray dashed line.
function CompareOverlay({
  data,
  domain,
  allMin,
  allMax,
  padL,
}: {
  data: ChartPoint[];
  domain: [string, string];
  allMin: number;
  allMax: number;
  padL: number;
}) {
  const W = 800;
  const H = 320;
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
