import Link from 'next/link';
import { REGISTRY } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import ChartSVG from '@/components/ChartSVG';

export const dynamic = 'force-dynamic';

const TRENDING = [
  'gdp',
  'cpi',
  'inflation',
  'unemployment rate',
  'housing starts',
  'policy rate',
  'retail sales',
  'loonie',
];

const BROWSE_BY = [
  { label: 'Category', href: '/categories' },
  { label: 'Release', href: '/news' },
  { label: 'Source', href: '/about#sources' },
  { label: 'Popular Series', href: '/search' },
];

async function FeaturedChart({ seriesId }: { seriesId: string }) {
  const series = REGISTRY.find((s) => s.id === seriesId)!;
  let data: { date: string; value: number }[] = [];
  let failed = false;
  try {
    const r = await getObservations(seriesId);
    data = r.observations;
  } catch {
    failed = true;
  }
  const latest = data.length ? data[data.length - 1] : null;
  const recent = data.slice(-120);
  return (
    <Link
      href={`/series/${series.id}`}
      className="block rounded-xl border hairline bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-medium text-[#0a0f1e]">
          {series.title}{' '}
          <span className="text-sm text-gray-500">({series.id})</span>
        </h3>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {series.sourceLabel} · {series.frequency}
      </p>
      {latest && (
        <p className="mt-2 text-2xl font-bold text-[#0a0f1e]">
          {latest.value}
          <span className="ml-2 text-sm font-normal text-gray-500">
            {latest.date.slice(0, 7)} · {series.units}
          </span>
        </p>
      )}
      <div className="mt-3 rounded-lg bg-[#f4f6f9] p-2">
        {failed ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500">
            Live data unavailable right now; the series page retries on load.
          </p>
        ) : (
          <ChartSVG data={recent} yLabel={series.units} id={`home-${series.id}`} height={200} />
        )}
      </div>
    </Link>
  );
}

export default function Home() {
  const featured = REGISTRY.filter((s) => s.featured);
  return (
    <div>
      {/* Hero */}
      <section className="border-b hairline">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex items-center gap-4">
            <span className="eyebrow whitespace-nowrap text-[#0a0f1e]">
              Canadian Research Economic Data
            </span>
            <span className="h-px flex-1 bg-[rgba(10,15,30,0.1)]" aria-hidden />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0a0f1e]"
              aria-hidden
            >
              <svg width="40" height="40" viewBox="0 0 22 22">
                <polyline
                  points="3,15 8,15 11,9 14,12 19,6"
                  fill="none"
                  stroke="#d80621"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h1 className="font-display text-6xl tracking-tight text-[#0a0f1e] md:text-7xl">
              CRED
            </h1>
          </div>
          <p className="mt-4 max-w-xl text-lg text-gray-700">
            Your trusted source for Canadian economic data.
          </p>
          <form action="/search" method="get" className="mt-6 max-w-2xl">
            <input
              type="search"
              name="q"
              placeholder="Search CRED Data..."
              className="w-full rounded-full border hairline bg-white px-6 py-3.5 text-base shadow-sm focus:border-[#d80621] focus:outline-none"
              aria-label="Search CRED data"
            />
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-gray-600">Trending Search Terms:</span>
            {TRENDING.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="rounded-full border hairline bg-white px-3 py-1 text-[#0a0f1e] hover:border-[#d80621]"
              >
                {t}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-gray-600">Browse Data By:</span>
            {BROWSE_BY.map((b) => (
              <Link key={b.label} href={b.href} className="text-[#d80621] hover:underline">
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* At a Glance */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold text-[#0a0f1e]">At a Glance</h2>
        <p className="mt-1 text-sm text-gray-600">
          Flagship series, fetched live from Statistics Canada and the Bank of
          Canada when this page loads.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {featured.map((s) => (
            <FeaturedChart key={s.id} seriesId={s.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
