import Link from 'next/link';
import type { Metadata } from 'next';
import { searchSeries } from '@/lib/registry';

export const metadata: Metadata = {
  title: 'Search | CRED',
  description:
    'Search 104 verified Canadian economic series from Statistics Canada and the Bank of Canada. One search box, consistent units, recession shading on every chart.',
  openGraph: {
    title: 'Search | CRED',
    description:
      'Search 104 verified Canadian economic series from Statistics Canada and the Bank of Canada.',
    url: '/search',
    images: [{ url: '/og/home.png', width: 1200, height: 630, alt: 'Search CRED data' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search | CRED',
    description:
      'Search 104 verified Canadian economic series from Statistics Canada and the Bank of Canada.',
    images: ['/og/home.png'],
  },
};
export const dynamic = 'force-dynamic';

export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? '';
  const results = query ? searchSeries(query) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0a0f1e]">Search CRED data</h1>
      <form action="/search" method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search CRED Data..."
          className="w-full rounded-full border hairline bg-white px-6 py-3 text-base shadow-sm focus:border-[#d80621] focus:outline-none"
          aria-label="Search CRED data"
        />
      </form>
      {query === '' ? (
        <p className="mt-6 text-gray-600">
          Search across series IDs, titles, and descriptions. One search box
          covers both Statistics Canada and Bank of Canada series.
        </p>
      ) : (
        <div className="mt-6">
          <p className="text-sm text-gray-600">
            {results.length} result{results.length === 1 ? '' : 's'} for
            &ldquo;{query}&rdquo;
          </p>
          <ul className="mt-3 space-y-3">
            {results.map((s) => (
              <li key={s.id} className="rounded-xl border hairline bg-white p-4">
                <Link
                  href={`/series/${s.id}`}
                  className="text-lg font-medium text-[#0a0f1e] hover:text-[#d80621] hover:underline"
                >
                  {s.title}
                </Link>
                <span className="ml-2 text-sm text-gray-500">({s.id})</span>
                <p className="mt-1 text-sm text-gray-600">{s.description}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {s.sourceLabel} · {s.frequency} · {s.units}
                </p>
              </li>
            ))}
            {results.length === 0 && (
              <li className="text-gray-600">
                No series match yet. The verified registry (in progress) will add
                roughly 200-300 curated series; try &ldquo;cpi&rdquo; or &ldquo;unemployment&rdquo; for now.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
