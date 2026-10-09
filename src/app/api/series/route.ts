import { NextResponse } from 'next/server';
import { REGISTRY, searchSeries } from '@/lib/registry';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const series = q ? searchSeries(q) : REGISTRY;
  return NextResponse.json(series);
}
