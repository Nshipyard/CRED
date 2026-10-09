import { NextResponse } from 'next/server';
import { getSeries } from '@/lib/registry';
import { getObservations } from '@/lib/data';

export const dynamic = 'force-dynamic';

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
  try {
    const { observations, cached, asOf } = await getObservations(
      seriesId,
      from,
      to
    );
    return NextResponse.json({
      series: seriesId,
      observations,
      source: series.sourceLabel,
      cached,
      asOf,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to fetch observations for ${seriesId}`,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
