import { NextResponse } from 'next/server';
import { getSeries } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import { decodeGraphConfig } from '@/lib/graphLink';
import ChartSVG from '@/components/ChartSVG';

// Standalone shared-graph page: renders the exact chart (CRED logo, axes,
// recession shading, source line) with no site chrome, for share links and
// iframe embeds. Returns raw HTML so no root layout is applied.
//   /graph?g=<base64url config>

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function errorHtml(title: string, message: string): string {
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeXml(title)} | CRED</title></head>` +
    `<body style="margin:0;background:#fff;font-family:Roboto,Arial,sans-serif;">` +
    `<div style="max-width:640px;margin:0 auto;padding:64px 16px;text-align:center;">` +
    `<p style="font-size:24px;color:#0a0f1e;margin:0 0 16px;">CRED</p>` +
    `<p style="font-size:14px;color:#4b5563;">${escapeXml(message)}</p>` +
    `</div></body></html>`
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cfg = decodeGraphConfig(searchParams.get('g') ?? '');
  if (!cfg) {
    return new NextResponse(
      errorHtml(
        'Shared graph',
        'This graph link is missing or invalid. Ask the sender for a fresh link from the series page.'
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
  const series = getSeries(cfg.series);
  if (!series) {
    return new NextResponse(errorHtml('Shared graph', 'Unknown series.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  let observations: { date: string; value: number }[] = [];
  try {
    if (cfg.mode === 'static') {
      observations = (
        await getObservations(cfg.series, cfg.from, cfg.to)
      ).observations;
    } else {
      const all = (await getObservations(cfg.series)).observations;
      observations = cfg.mode === 'lastN' && cfg.n ? all.slice(-cfg.n) : all;
    }
  } catch {
    return new NextResponse(
      errorHtml(
        series.title,
        'Statistics Canada is refreshing this table right now. The chart returns automatically; try reloading in a few minutes.'
      ),
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // The exact SVG the chart component produces (dynamic import: static
  // react-dom/server imports are rejected in App Router routes).
  const { renderToStaticMarkup } = await import('react-dom/server');
  const chartSvg = renderToStaticMarkup(
    ChartSVG({ data: observations, yLabel: series.units, id: `graph-${series.id}` })
  );

  const html =
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeXml(series.title)} | CRED</title>` +
    `<style>body{margin:0;background:#fff;font-family:Roboto,Arial,Helvetica,sans-serif;}</style>` +
    `</head><body>` +
    `<div style="max-width:1024px;margin:0 auto;padding:24px 16px;">` +
    `<div style="border-radius:12px;background:#f4f6f9;padding:24px;">` +
    `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">` +
    `<span style="font-size:14px;letter-spacing:0.08em;color:#0a0f1e;font-weight:700;">CRED</span>` +
    `<span style="display:inline-block;height:4px;width:40px;border-radius:2px;background:#d80621;"></span>` +
    `<span style="font-size:14px;color:#0a0f1e;">${escapeXml(series.title)}</span>` +
    `</div>` +
    `<div style="margin-top:12px;">${chartSvg}</div>` +
    `<div style="margin-top:12px;font-size:12px;color:#4b5563;">` +
    `<span>Source: ${escapeXml(series.sourceLabel)} via CRED</span><br>` +
    `<em>Shaded areas indicate Canadian recessions (C.D. Howe Institute).</em>` +
    `</div></div>` +
    `<p style="margin:12px 0 0;text-align:center;font-size:12px;color:#6b7280;">Shared from CRED, Canadian Research Economic Data</p>` +
    `</div></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
