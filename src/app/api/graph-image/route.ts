import { NextResponse } from 'next/server';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSeries } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import ChartSVG from '@/components/ChartSVG';

// Returns a real PNG of the chart with CRED branding, rendered server-side:
// the exact SVG the chart component produces, rasterized with resvg-js
// (no browser dependency; runs on Vercel serverless).
//   /api/graph-image?series=CPI_ALLITEMS_SA&from=2020-01-01&to=2026-01-01

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FONT = 'DejaVu Sans';
let fontPath: string | null = null;
function getFontPath(): string {
  if (!fontPath) fontPath = join(process.cwd(), 'src', 'lib', 'fonts', 'DejaVuSans.ttf');
  return fontPath;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seriesId = searchParams.get('series');
  if (!seriesId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: series' },
      { status: 400 }
    );
  }
  const series = getSeries(seriesId);
  if (!series) {
    return NextResponse.json(
      { error: `Unknown series: ${seriesId}` },
      { status: 404 }
    );
  }
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  let observations: { date: string; value: number }[];
  try {
    observations = (await getObservations(seriesId, from, to)).observations;
  } catch (err) {
    return NextResponse.json(
      { error: `Upstream unavailable for ${seriesId}` },
      { status: 502 }
    );
  }
  if (!observations.length) {
    return NextResponse.json(
      { error: `No observations for ${seriesId} in this range` },
      { status: 404 }
    );
  }

  // The exact SVG the chart component produces, nested into a branded frame.
  // react-dom/server is imported dynamically: static imports of it are
  // rejected in App Router routes.
  const { renderToStaticMarkup } = await import('react-dom/server');
  const chartInner = renderToStaticMarkup(
    ChartSVG({ data: observations, yLabel: series.units, id: seriesId })
  )
    .replace(/<svg[^>]*>/, '<svg x="0" y="52" width="800" height="320" viewBox="0 0 800 320">')
    .replace(/<text/g, `<text font-family="${FONT}"`);

  const W = 800;
  const H = 420;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#f4f6f9" rx="12"/>` +
    `<text x="24" y="35" font-family="${FONT}" font-size="15" font-weight="bold" fill="#0a0f1e">CRED</text>` +
    `<rect x="72" y="29" width="40" height="5" rx="2.5" fill="#d80621"/>` +
    `<text x="122" y="35" font-family="${FONT}" font-size="14" fill="#0a0f1e">${escapeXml(series.title)}</text>` +
    chartInner +
    `<text x="24" y="392" font-family="${FONT}" font-size="11" fill="#4b5563">Source: ${escapeXml(series.sourceLabel)} via CRED</text>` +
    `<text x="24" y="408" font-family="${FONT}" font-size="10" font-style="italic" fill="#6b7280">Shaded areas indicate Canadian recessions (C.D. Howe Institute).</text>` +
    `</svg>`;

  try {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1600 },
      font: { fontFiles: [getFontPath()], loadSystemFonts: false },
    });
    const png = resvg.render().asPng();
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="${seriesId}.png"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'PNG render failed' },
      { status: 500 }
    );
  }
}
