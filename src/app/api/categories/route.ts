import { NextResponse } from 'next/server';
import { REGISTRY, CATEGORY_LABELS, type CategorySlug } from '@/lib/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const slugs = Object.keys(CATEGORY_LABELS) as CategorySlug[];
  return NextResponse.json(
    slugs.map((slug) => {
      const series = REGISTRY.filter((s) => s.category === slug);
      return {
        slug,
        name: CATEGORY_LABELS[slug],
        seriesCount: series.length,
        examples: series.slice(0, 3).map((s) => s.title),
      };
    })
  );
}
