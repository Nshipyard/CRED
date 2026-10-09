import Link from 'next/link';
import {
  REGISTRY,
  CATEGORIES,
  CATEGORY_LABELS,
  type SeriesMeta,
} from '@/lib/registry';
import { getObservations } from '@/lib/data';
import ChartFigure from './ChartFigure';
import ChartSVG from './ChartSVG';

// FRED-style discovery sections below the chart/notes on series pages:
// Release Tables, then Related Data and Content (data suggestions,
// content suggestions, other formats, related categories, releases, tags).
// Every subsection renders only real content; empty ones are omitted.

function normalizeTitle(title: string): string {
  return title.replace(' (Seasonally Adjusted)', '').trim();
}

function variantLabel(s: SeriesMeta): string {
  const parts: string[] = [];
  const ud = (s.unitsDetail ?? '').toLowerCase();
  if (ud.includes('not seasonally adjusted')) parts.push('Not Seasonally Adjusted');
  else if (ud.includes('seasonally adjusted')) parts.push('Seasonally Adjusted');
  return parts.join(' · ') || s.frequency;
}

function geographyTag(s: SeriesMeta): string {
  const after = s.title.split(':')[1];
  if (after) return after.trim();
  return 'Canada';
}

function topicTag(s: SeriesMeta): string {
  return normalizeTitle(s.title.split(':')[0].split(',')[0]).trim();
}

function saTag(s: SeriesMeta): string | null {
  const ud = (s.unitsDetail ?? '').toLowerCase();
  if (ud.includes('not seasonally adjusted')) return 'Not Seasonally Adjusted';
  if (ud.includes('seasonally adjusted')) return 'Seasonally Adjusted';
  return null;
}

function Pill({ href, children, current }: { href: string; children: React.ReactNode; current?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm ${
        current
          ? 'border-[#0a0f1e] bg-[#0a0f1e] text-white'
          : 'border-[rgba(10,15,30,0.2)] text-[#0a0f1e] hover:border-[#d80621] hover:text-[#d80621]'
      }`}
    >
      {children}
    </Link>
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

async function SuggestionCard({
  series,
  data,
}: {
  series: SeriesMeta;
  data: { date: string; value: number }[];
}) {
  return (
    <Link href={`/series/${series.id}`} className="block">
      <ChartFigure seriesTitle={series.title} sourceLabel={series.sourceLabel}>
        <ChartSVG data={data.slice(-120)} yLabel={series.units} id={`rel-${series.id}`} height={180} />
      </ChartFigure>
      <h4 className="mt-2 text-sm font-bold text-[#0a0f1e]">{series.title}</h4>
    </Link>
  );
}

async function loadSuggestions(
  related: SeriesMeta[]
): Promise<{ series: SeriesMeta; data: { date: string; value: number }[] }[]> {
  const out: { series: SeriesMeta; data: { date: string; value: number }[] }[] = [];
  await Promise.all(
    related.map(async (series) => {
      try {
        const { observations } = await getObservations(series.id);
        if (observations.length) out.push({ series, data: observations });
      } catch {
        // Omit cards that cannot load live data; never show placeholders.
      }
    })
  );
  // Preserve related ordering.
  const order = new Map(related.map((s, i) => [s.id, i]));
  out.sort((a, b) => (order.get(a.series.id) ?? 0) - (order.get(b.series.id) ?? 0));
  return out;
}

export default async function SeriesDiscovery({ series }: { series: SeriesMeta }) {
  // Related: same category first, then same release.
  const sameCat = REGISTRY.filter((s) => s.id !== series.id && s.category === series.category);
  const sameRel = REGISTRY.filter(
    (s) => s.id !== series.id && s.category !== series.category && s.release === series.release
  );
  const related = [...sameCat, ...sameRel].slice(0, 4);

  // Other formats: same normalized title (SA/NSA, frequency variants).
  const base = normalizeTitle(series.title);
  const variants = REGISTRY.filter(
    (s) => s.id !== series.id && normalizeTitle(s.title) === base
  );

  // Content suggestions: related series with a news card (/news#news-<id>).
  const withData = await loadSuggestions(related);
  const newsLinked = withData.map((w) => w.series).filter((s) => s.featured);

  const tags: string[] = [
    geographyTag(series),
    topicTag(series),
    series.source === 'statcan' ? 'Statistics Canada' : 'Bank of Canada',
    series.frequency,
  ];
  const sa = saTag(series);
  if (sa) tags.push(sa);

  const tableLinks: { label: string; href: string }[] = [
    { label: series.release, href: series.releaseUrl },
  ];
  if (series.sourceUrl && series.sourceUrl !== series.releaseUrl) {
    tableLinks.push({ label: series.sourceLabel, href: series.sourceUrl });
  }

  return (
    <div className="mt-10 space-y-10">
      {/* Release Tables */}
      <section>
        <h2 className="font-display text-xl text-[#0a0f1e]">Release Tables</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {tableLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#d80621] hover:underline"
              >
                {l.label}
                <ExternalIcon />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Related Data and Content */}
      <section>
        <h2 className="font-display text-xl text-[#0a0f1e]">Related Data and Content</h2>

        {withData.length > 0 && (
          <div className="mt-5">
            <h3 className="text-base font-bold text-[#0a0f1e]">
              Data Suggestions Based On Your Search
            </h3>
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {withData.map(({ series, data }) => (
                <SuggestionCard key={series.id} series={series} data={data} />
              ))}
            </div>
            <p className="mt-3 text-sm">
              <Link
                href={`/search?q=${encodeURIComponent(series.release)}`}
                className="text-[#d80621] hover:underline"
              >
                See More...
              </Link>
            </p>
          </div>
        )}

        {newsLinked.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-bold text-[#0a0f1e]">Content Suggestions</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {newsLinked.map((s) => (
                <li key={s.id}>
                  <Link href={`/news#news-${s.id}`} className="text-[#d80621] hover:underline">
                    Latest: {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {variants.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-bold text-[#0a0f1e]">Other Formats</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {variants.map((s) => (
                <Pill key={s.id} href={`/series/${s.id}`}>
                  {variantLabel(s)}
                </Pill>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-base font-bold text-[#0a0f1e]">Related Categories</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[series.category, ...CATEGORIES.map((c) => c.slug).filter((s) => s !== series.category)].map(
              (slug) => (
                <Pill key={slug} href={`/categories#${slug}`} current={slug === series.category}>
                  {CATEGORY_LABELS[slug]}
                </Pill>
              )
            )}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-base font-bold text-[#0a0f1e]">Releases</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill href={`/search?q=${encodeURIComponent(series.release)}`}>
              More Series from {series.release}
            </Pill>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-base font-bold text-[#0a0f1e]">Tags</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Pill key={t} href={`/search?q=${encodeURIComponent(t)}`}>
                {t}
              </Pill>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
