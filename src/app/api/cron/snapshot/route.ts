import { NextResponse } from 'next/server';
import { REGISTRY } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import { writeSnapshot } from '@/lib/vintages';

export const dynamic = 'force-dynamic';
// Allow the full featured set to fetch sequentially without the route timing out.
export const maxDuration = 300;

function authorized(req: Request): boolean {
  // Vercel's own cron sends x-vercel-cron; manual/CI invocations use the
  // bearer token. Either one is accepted.
  if (req.headers.get('x-vercel-cron') === 'true') return true;
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Snapshots need durable storage. On Vercel the filesystem is read-only
  // outside /tmp, so without BLOB_READ_WRITE_TOKEN every write below would
  // fail; say so plainly instead of recording 104 doomed EROFS errors.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          'BLOB_READ_WRITE_TOKEN is not set: connect a Vercel Blob store to this project so snapshots persist.',
      },
      { status: 503 }
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  // Featured series, plus every energy series: the energy category must
  // never blank out wholesale when StatCan is down (learned Oct 21, 2026,
  // when www150 went offline in the federal PHP-vulnerability takedown).
  const targets = REGISTRY.filter((s) => s.featured || s.category === 'energy');
  const results: { series: string; stored: boolean; observations: number; error?: string }[] = [];
  for (const series of targets) {
    try {
      const { observations, fallback } = await getObservations(series.id);
      if (fallback) {
        // Never archive fallback data as if it were a fresh pull.
        results.push({
          series: series.id,
          stored: false,
          observations: observations.length,
          error: `source unavailable; served ${fallback} fallback, snapshot skipped`,
        });
        continue;
      }
      const stored = await writeSnapshot({
        snapshot: today,
        series: series.id,
        source: series.sourceLabel,
        observations,
      });
      results.push({
        series: series.id,
        stored: true,
        observations: observations.length,
      });
      void stored;
    } catch (err) {
      results.push({
        series: series.id,
        stored: false,
        observations: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return NextResponse.json({ snapshot: today, results });
}
