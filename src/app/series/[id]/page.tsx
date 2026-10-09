import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSeries, REGISTRY, CATEGORY_LABELS } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import ChartControls from '@/components/ChartControls';
import SeriesDiscovery from '@/components/SeriesDiscovery';
import RetryButton from '@/components/RetryButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const series = getSeries(id);
  if (!series) return {};
  const title = `${series.title} | CRED`;
  let description =
    `${series.title}: ${series.units}, ${series.frequency}. ` +
    `Source: ${series.sourceLabel} via CRED.`;
  try {
    const { observations } = await getObservations(id);
    const latest = observations.length
      ? observations[observations.length - 1]
      : null;
    if (latest) {
      description =
        `${series.title}: ${latest.value} ${series.units} ` +
        `(${formatObsDate(latest.date, series.frequency)}). ` +
        `Source: ${series.sourceLabel} via CRED.`;
    }
  } catch {
    // Fall through to the static description when the source is refreshing.
  }
  const ogImage = `/og/series/${series.id}.png`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/series/${series.id}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${series.title} chart`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

function formatObsDate(iso: string, frequency: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  if (frequency === 'Annual') return `${d.getUTCFullYear()}`;
  if (frequency === 'Quarterly') {
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    return `Q${q} ${d.getUTCFullYear()}`;
  }
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

interface SeriesLike {
  id: string;
  title: string;
}

const SOCIAL: {
  name: string;
  mark: string;
  href: (s: SeriesLike) => string;
}[] = [
  {
    name: 'X',
    mark: 'X',
    href: (s) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(s.title)}&url=${encodeURIComponent(`https://cred.nshipyard.com/series/${s.id}`)}`,
  },
  {
    name: 'Facebook',
    mark: 'f',
    href: (s) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://cred.nshipyard.com/series/${s.id}`)}`,
  },
  {
    name: 'Reddit',
    mark: 'r',
    href: (s) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(`https://cred.nshipyard.com/series/${s.id}`)}&title=${encodeURIComponent(s.title)}`,
  },
  {
    name: 'LinkedIn',
    mark: 'in',
    href: (s) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://cred.nshipyard.com/series/${s.id}`)}`,
  },
];

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {  const { id } = await params;
  const series = getSeries(id);
  if (!series) notFound();

  let observations: { date: string; value: number }[] = [];
  let asOf = '';
  let fetchError = false;
  try {
    const r = await getObservations(id);
    observations = r.observations;
    asOf = r.asOf;
  } catch {
    fetchError = true;
  }
  const latest = observations.length ? observations[observations.length - 1] : null;

  const compareOptions = REGISTRY.map((s) => ({ id: s.id, title: s.title }));
  const retrievalDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Toronto',
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#d80621]">Home</Link>
        <span className="mx-1">›</span>
        <Link href="/categories" className="hover:text-[#d80621]">Categories</Link>
        <span className="mx-1">›</span>
        <Link
          href={`/categories#${series.category}`}
          className="hover:text-[#d80621]"
        >
          {CATEGORY_LABELS[series.category]}
        </Link>
        <span className="mx-1">›</span>
        <span className="text-[#0a0f1e]">{series.title}</span>
      </nav>

      {/* Title row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          className="text-2xl text-gray-400 hover:text-[#d80621]"
          title="Save to account (ships with accounts)"
          aria-label="Star this series"
        >
          ☆
        </button>
        <h1 className="text-2xl font-bold text-[#0a0f1e] md:text-3xl">{series.title}</h1>
        <span className="whitespace-nowrap text-base text-gray-500 md:text-lg">({series.id})</span>
      </div>

      {/* Meta bar: FRED-style 5 cells */}
      <div className="mt-5 grid grid-cols-2 divide-x divide-[rgba(10,15,30,0.1)] rounded-xl border hairline bg-white md:grid-cols-5">
        <div className="px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Observations</div>
          {latest ? (
            <>
              <div className="mt-1 text-base font-bold text-[#0a0f1e]">
                {formatObsDate(latest.date, series.frequency)}: {latest.value}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Updated: {new Date(asOf).toLocaleString('en-CA', { timeZone: 'America/Toronto' })} ET
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-gray-500">
              {fetchError ? 'Fetch failed; retry by reloading.' : 'Loading…'}
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Units</div>
          <div className="mt-1 text-sm text-[#0a0f1e]">{series.units},</div>
          <div className="text-sm text-[#0a0f1e]">{series.unitsDetail ?? ''}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Frequency</div>
          <div className="mt-1 text-sm text-[#0a0f1e]">{series.frequency}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Source</div>
          <div className="mt-1 text-sm text-[#0a0f1e]">{series.sourceLabel}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Series ID</div>
          <div className="mt-1 text-sm text-[#0a0f1e]">{series.id}</div>
          {series.tableId && (
            <div className="text-xs text-gray-500">Table {series.tableId}</div>
          )}
          {series.valetSeriesKey && (
            <div className="text-xs text-gray-500">Valet {series.valetSeriesKey}</div>
          )}
        </div>
      </div>

      {/* Chart panel */}
      <div className="mt-5">
        {fetchError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[#f4f6f9] p-8 text-center">
            <p className="max-w-md text-sm text-gray-600">
              Statistics Canada is refreshing this table right now. Data returns
              automatically.
            </p>
            <RetryButton />
          </div>
        ) : (
          <ChartControls
            seriesId={series.id}
            seriesTitle={series.title}
            units={series.units}
            sourceLabel={series.sourceLabel}
            initial={observations}
            compareOptions={compareOptions}
            geoFamily={series.geoFamily}
          />
        )}
      </div>

      {/* Share */}
      <div className="mt-4 flex items-center justify-end">
        <div className="flex gap-2" aria-label="Share on social">
          {SOCIAL.map((s) => (
            <a
              key={s.name}
              href={s.href(series)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share on ${s.name}`}
              title={`Share on ${s.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border hairline text-xs text-gray-500 hover:border-[#d80621] hover:text-[#d80621]"
            >
              {s.mark}
            </a>
          ))}
        </div>
      </div>

      {/* Notes: FRED-style */}
      <section className="mt-8 max-w-3xl">
        <h2 className="font-display text-xl text-[#0a0f1e]">Notes</h2>
        <div className="mt-3 space-y-2 text-sm text-gray-700">
          <div className="flex flex-wrap justify-between gap-x-8 gap-y-2">
            <p>
              <span className="font-medium text-[#0a0f1e]">Source: </span>
              <a
                href={series.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#d80621] hover:underline"
              >
                {series.source === 'statcan' ? 'Statistics Canada' : 'Bank of Canada'}
                <ExternalIcon />
              </a>
            </p>
            <p>
              <span className="font-medium text-[#0a0f1e]">Release: </span>
              <a
                href={series.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#d80621] hover:underline"
              >
                {series.release}
                <ExternalIcon />
              </a>
            </p>
          </div>
          <p>
            <span className="font-medium text-[#0a0f1e]">Units: </span>
            {series.units}
            {series.unitsDetail ? `, ${series.unitsDetail}` : ''}
          </p>
          <p>
            <span className="font-medium text-[#0a0f1e]">Frequency: </span>
            {series.frequency}
          </p>
          <p>
            <span className="font-medium text-[#0a0f1e]">Notes: </span>
            {series.description}
          </p>
          <p>
            <span className="font-medium text-[#0a0f1e]">Suggested Citation: </span>
            {series.source === 'statcan' ? 'Statistics Canada' : 'Bank of Canada'},{' '}
            {series.title} {series.id}, retrieved from CRED, Canadian Research
            Economic Data; https://cred.nshipyard.com/series/{series.id},{' '}
            {retrievalDate}.
          </p>
        </div>
      </section>

      {/* Discovery: release tables + related data and content */}
      <SeriesDiscovery series={series} />
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg
      className="ml-0.5 inline h-3 w-3 align-baseline"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M4 2h6v6M10 2L2 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
