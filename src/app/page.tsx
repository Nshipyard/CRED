import Link from 'next/link';
import { REGISTRY } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import ChartSVG from '@/components/ChartSVG';
import ChartFigure from '@/components/ChartFigure';

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
  { label: 'Source', href: '/about#sources' },
  { label: 'Popular Series', href: '/search' },
];

// At a Glance card: the same chart figure as the series page, at thumbnail
// scale, with the bold title below. No value callouts, no extra metadata.
async function FeaturedChart({ seriesId }: { seriesId: string }) {
  const series = REGISTRY.find((s) => s.id === seriesId)!;
  let data: { date: string; value: number }[] = [];
  try {
    data = (await getObservations(seriesId)).observations;
  } catch {
    return null;
  }
  if (!data.length) return null;
  const recent = data.slice(-120);
  return (
    <Link href={`/series/${series.id}`} className="block">
      <ChartFigure seriesTitle={series.title} sourceLabel={series.sourceLabel}>
        <ChartSVG
          data={recent}
          yLabel={series.units}
          id={`home-${series.id}`}
          height={220}
        />
      </ChartFigure>
      <h3 className="mt-3 text-base font-bold text-[#0a0f1e]">
        {series.title}
      </h3>
    </Link>
  );
}

export default function Home() {
  const featured = REGISTRY.filter((s) => s.featured);
  return (
    <div>
      {/* Hero: centered like FRED's homepage */}
      <section className="border-b hairline">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center md:py-14">
          <span className="eyebrow text-[#0a0f1e]">
            Canadian Research Economic Data
          </span>
          <div className="mt-4 flex items-center justify-center gap-4">
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
          <p className="mt-4 text-lg text-gray-700">
            Your trusted source for Canadian economic data.
          </p>
          <form action="/search" method="get" className="mx-auto mt-6 w-full max-w-[640px]">
            <input
              type="search"
              name="q"
              placeholder="Search CRED Data..."
              className="w-full rounded-full border hairline bg-white px-6 py-3.5 text-left text-base shadow-sm focus:border-[#d80621] focus:outline-none"
              aria-label="Search CRED data"
            />
          </form>
          <div className="mt-6 flex flex-col items-center gap-5 md:flex-row md:items-start md:justify-center md:gap-0">
            <div className="md:pr-8">
              <span className="font-medium text-gray-600">Trending Search Terms:</span>
              <div className="mt-2 flex flex-wrap justify-center gap-2 text-sm">
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
            </div>
            <div className="md:border-l md:border-[rgba(10,15,30,0.1)] md:pl-8">
              <span className="font-medium text-gray-600">Browse Data By:</span>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-sm">
                {BROWSE_BY.map((b) => (
                  <Link key={b.label} href={b.href} className="text-[#d80621] hover:underline">
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
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
