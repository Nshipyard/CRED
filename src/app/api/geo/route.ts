import { NextResponse } from 'next/server';
import { GEO_FAMILIES, PROVINCE_NAMES, type GeoFamily } from '@/lib/geo';
import { getObservations } from '@/lib/data';

// Latest value per province/territory for a geo family, for the choropleth.
//   /api/geo?family=unemployment-by-province
// Regions without a series are returned with value null (rendered grey).

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FAMILIES = Object.keys(GEO_FAMILIES) as GeoFamily[];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const family = searchParams.get('family') as GeoFamily | null;
  if (!family || !FAMILIES.includes(family)) {
    return NextResponse.json(
      { error: `unknown family (expected one of ${FAMILIES.join(', ')})` },
      { status: 400 }
    );
  }
  const meta = GEO_FAMILIES[family];
  const provinces: {
    code: string;
    name: string;
    value: number | null;
    date: string | null;
    seriesId: string | null;
  }[] = [];

  await Promise.all(
    Object.entries(PROVINCE_NAMES).map(async ([code, name]) => {
      const seriesId = meta.members[code] ?? null;
      if (!seriesId) {
        provinces.push({ code, name, value: null, date: null, seriesId: null });
        return;
      }
      try {
        const { observations } = await getObservations(seriesId);
        const last = observations[observations.length - 1];
        provinces.push({
          code,
          name,
          value: last ? last.value : null,
          date: last ? last.date : null,
          seriesId,
        });
      } catch {
        provinces.push({ code, name, value: null, date: null, seriesId });
      }
    })
  );

  // Reference date: the most common latest observation date across members.
  const counts = new Map<string, number>();
  for (const p of provinces) {
    if (p.date) counts.set(p.date, (counts.get(p.date) ?? 0) + 1);
  }
  let asOf: string | null = null;
  let best = 0;
  for (const [date, c] of counts) {
    if (c > best) {
      best = c;
      asOf = date;
    }
  }

  provinces.sort((a, b) => a.code.localeCompare(b.code));
  return NextResponse.json(
    {
      family,
      title: meta.title,
      units: meta.units,
      source: meta.source,
      asOf,
      provinces,
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}
