import { NextResponse } from 'next/server';
import { getSeries } from '@/lib/registry';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const series = getSeries(id);
  if (!series) {
    return NextResponse.json({ error: `Unknown series: ${id}` }, { status: 404 });
  }
  return NextResponse.json(series);
}
