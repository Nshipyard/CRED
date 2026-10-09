import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSeries, REGISTRY, CATEGORY_LABELS } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import ChartControls from '@/components/ChartControls';

export const dynamic = 'force-dynamic';

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

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      <div className="mt-3 flex items-center gap-2">
        <button
          className="text-2xl text-gray-400 hover:text-[#d80621]"
          title="Save to account (ships with accounts)"
          aria-label="Star this series"
        >
          ☆
        </button>
        <h1 className="text-3xl font-bold text-[#0a0f1e]">{series.title}</h1>
        <span className="text-lg text-gray-500">({series.id})</span>
      </div>
      <p className="mt-2 max-w-3xl text-gray-700">{series.description}</p>

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
          <div className="rounded-xl bg-[#f4f6f9] p-8 text-center text-sm text-gray-600">
            The live fetch from {series.source === 'statcan' ? 'Statistics Canada' : 'the Bank of Canada'} failed.
            Reload the page to retry; the 24h cache means this happens at most once a day per series.
          </div>
        ) : (
          <ChartControls
            seriesId={series.id}
            seriesTitle={series.title}
            units={series.units}
            initial={observations}
            compareOptions={compareOptions}
          />
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span>Source: {series.sourceLabel} via CRED</span>
          <span>cred.nshipyard.com</span>
        </div>
      </div>

      {/* Share + account tools */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Link
            href="/api-docs"
            className="rounded border border-[rgba(10,15,30,0.2)] px-4 py-1.5 text-sm text-[#0a0f1e]"
          >
            Share Graph
          </Link>
          <button
            className="rounded border border-[rgba(10,15,30,0.2)] px-4 py-1.5 text-sm text-gray-500"
            title="Accounts ship in a later release"
          >
            Account Tools
          </button>
        </div>
        <div className="flex gap-2 text-gray-400" aria-label="Social">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border hairline text-xs">X</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border hairline text-xs">f</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border hairline text-xs">ig</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border hairline text-xs">in</span>
        </div>
      </div>

      {/* Notes */}
      <section className="mt-8 max-w-3xl">
        <h2 className="font-display text-xl text-[#0a0f1e]">Notes</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            {series.title} ({series.id}) measures {series.description.charAt(0).toLowerCase() + series.description.slice(1)}
          </li>
          {series.unitsDetail && (
            <li>Published {series.unitsDetail.toLowerCase()} at {series.frequency.toLowerCase()} frequency.</li>
          )}
          <li>
            Statistics Canada overwrites past revisions in place, so CRED snapshots this series
            daily into an append-only vintage archive. Use /api/vintages?series={series.id} to list snapshots.
          </li>
          <li>
            This registry entry was last verified {series.lastVerified}. CRED never invents observations:
            every point on this chart came from {series.sourceLabel}.
          </li>
        </ul>
      </section>
    </div>
  );
}
