import Link from 'next/link';
import { REGISTRY, type SeriesMeta } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import ChartSVG from '@/components/ChartSVG';

export const metadata = { title: 'Latest' };

// Rebuilt as an automated desk: no writers, no static articles. Every card
// is generated at request time from live observations. A card whose series
// cannot load is omitted rather than shown with placeholders.

export const dynamic = 'force-dynamic';

function formatValue(v: number, units: string): string {
  if (units.includes('%'))
    return `${v.toLocaleString('en-CA', { maximumFractionDigits: 2 })}%`;
  if (Math.abs(v) >= 1000)
    return v.toLocaleString('en-CA', { maximumFractionDigits: 1 });
  return v.toLocaleString('en-CA', { maximumFractionDigits: 3 });
}

function formatChange(diff: number, units: string): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const abs = Math.abs(diff);
  const body = units.includes('%')
    ? abs.toLocaleString('en-CA', { maximumFractionDigits: 2 })
    : abs >= 1000
      ? abs.toLocaleString('en-CA', { maximumFractionDigits: 1 })
      : abs.toLocaleString('en-CA', { maximumFractionDigits: 3 });
  return `${sign}${body}${units.includes('%') ? ' pts' : ''}`;
}

function formatDate(iso: string, frequency: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const month = d.toLocaleString('en-CA', { month: 'short', timeZone: 'UTC' });
  const year = d.getUTCFullYear();
  if (frequency === 'quarterly') {
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    return `Q${q} ${year}`;
  }
  if (frequency === 'annual') return `${year}`;
  if (frequency === 'daily')
    return d.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  return `${month} ${year}`;
}

interface CardData {
  series: SeriesMeta;
  latest: { date: string; value: number };
  prev: { date: string; value: number };
  data: { date: string; value: number }[];
}

async function loadCard(series: SeriesMeta): Promise<CardData | null> {
  try {
    const { observations } = await getObservations(series.id);
    if (observations.length < 2) return null;
    return {
      series,
      latest: observations[observations.length - 1],
      prev: observations[observations.length - 2],
      data: observations.slice(-90),
    };
  } catch {
    return null;
  }
}

export default async function News() {
  const featured = REGISTRY.filter((s) => s.featured);
  const cards = (
    await Promise.all(featured.map((s) => loadCard(s)))
  ).filter((c): c is CardData => c !== null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0a0f1e]">Latest</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The newest reading of every flagship series, generated from live data
        when this page loads. No writers, no placeholders: a series that
        cannot be reached is left out until its next refresh.
      </p>
      {cards.length === 0 ? (
        <div className="mt-8 rounded-xl bg-[#f4f6f9] p-8 text-center text-sm text-gray-600">
          Statistics Canada is refreshing its tables right now. The latest
          readings return automatically.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const diff = c.latest.value - c.prev.value;
            const up = diff > 0;
            const down = diff < 0;
            return (
              <Link
                key={c.series.id}
                href={`/series/${c.series.id}`}
                className="block rounded-xl border hairline bg-white p-5 transition-shadow hover:shadow-md"
              >
                <h2 className="text-base font-bold text-[#0a0f1e]">
                  {c.series.title}
                </h2>
                <p className="mt-3 font-display text-4xl text-[#0a0f1e]">
                  {formatValue(c.latest.value, c.series.units)}
                </p>
                <p className="mt-1 text-sm">
                  <span
                    className={
                      up
                        ? 'font-medium text-green-700'
                        : down
                          ? 'font-medium text-red-700'
                          : 'font-medium text-gray-500'
                    }
                  >
                    {up ? '▲' : down ? '▼' : '■'}{' '}
                    {formatChange(diff, c.series.units)}
                  </span>{' '}
                  <span className="text-gray-500">vs previous period</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Released {formatDate(c.latest.date, c.series.frequency)} ·{' '}
                  {c.series.sourceLabel}
                </p>
                <div className="mt-3 rounded-lg bg-[#f4f6f9] p-2">
                  <ChartSVG
                    data={c.data}
                    yLabel={c.series.units}
                    id={`news-${c.series.id}`}
                    height={140}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
