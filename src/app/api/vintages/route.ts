import { NextResponse } from 'next/server';
import { getSeries } from '@/lib/registry';
import { listSnapshots } from '@/lib/vintages';

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
  if (!getSeries(seriesId)) {
    return NextResponse.json(
      { error: `Unknown series: ${seriesId}` },
      { status: 404 }
    );
  }
  const snapshots = await listSnapshots(seriesId);
  return NextResponse.json({ series: seriesId, snapshots });
}
