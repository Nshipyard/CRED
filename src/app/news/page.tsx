import Link from 'next/link';

export const metadata = { title: 'CRED News' };

const ARTICLES = [
  {
    title: '40 new rental-market series from CMHC',
    date: 'Oct 5, 2026',
    topic: 'New data',
    excerpt:
      'CRED ingests the Canada Mortgage and Housing Corporation rental-market survey for the first time: 40 CMA-level series on vacancy, rents, and completions. (Illustrative article; CMHC series land with the verified registry.)',
  },
  {
    title: 'Teaching with CRED: reading the yield curve',
    date: 'Oct 2, 2026',
    topic: 'Analysis',
    excerpt:
      'The 10-year Government of Canada bond yield minus the policy rate tells you what the market thinks the Bank of Canada does next. Here is how to build that spread as a CRED comparison graph in two clicks.',
  },
  {
    title: 'September labour data: what moved and what didn\'t',
    date: 'Oct 1, 2026',
    topic: 'Analysis',
    excerpt:
      'The Labour Force Survey reference week lands on the CRED chart the morning of release. This week: participation held, youth unemployment did not. (Illustrative; read the current release at statcan.gc.ca.)',
  },
  {
    title: 'How we date Canadian recessions',
    date: 'Sep 28, 2026',
    topic: 'Methodology',
    excerpt:
      'CRED shades every chart with peak and trough dates from the C.D. Howe Institute Business Cycle Council, not US NBER dates. Five post-1970 episodes are in v1: 1974, 1981-82, 1990-92, 2008-09, and 2020.',
  },
];

const INDICATORS = [
  { label: 'CPI', value: '+2.1% Aug 2026' },
  { label: 'Unemployment', value: '7.0% Sep 2026' },
  { label: 'Policy rate', value: '2.50%' },
  { label: 'Real GDP', value: '+1.8% Q2 2026' },
];

function Sparkline({ seed }: { seed: number }) {
  const pts = Array.from({ length: 20 }, (_, i) => {
    const v = 30 + ((seed * (i + 3)) % 17) * 1.6 - i * 0.4;
    return `${i * 5},${Math.max(6, Math.min(44, v))}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 50" className="h-12 w-24" aria-hidden>
      <polyline points={pts} fill="none" stroke="#d80621" strokeWidth="2" />
    </svg>
  );
}

export default function News() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0a0f1e]">CRED News</h1>
      <p className="mt-2 text-gray-600">
        New data, analysis, notices, and methodology. Indicator values marked
        illustrative are examples of the layout, not live data.
      </p>
      <div className="mt-6 grid gap-8 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-6">
          <div>
            <label className="text-sm font-medium">Search</label>
            <input
              type="search"
              placeholder="Search articles..."
              className="mt-1 w-full rounded border hairline px-3 py-2 text-sm"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Filter by</legend>
            <div className="mt-2 space-y-1 text-sm">
              {['New data', 'Analysis', 'Notices', 'Methodology'].map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked /> {t}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2 text-sm">
            <div>
              <label className="text-sm font-medium">From</label>
              <input type="date" className="mt-1 w-full rounded border hairline px-2 py-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <input type="date" className="mt-1 w-full rounded border hairline px-2 py-1.5" />
            </div>
          </div>
          <div className="rounded-xl border hairline bg-white p-4">
            <h2 className="text-sm font-bold text-[#0a0f1e]">Latest indicators</h2>
            <p className="text-xs text-gray-500">(illustrative)</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {INDICATORS.map((i) => (
                <li key={i.label} className="flex justify-between">
                  <span className="text-gray-600">{i.label}</span>
                  <span className="font-medium text-[#0a0f1e]">{i.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        {/* Articles */}
        <div className="space-y-5">
          {ARTICLES.map((a, i) => (
            <article
              key={a.title}
              className="flex gap-4 rounded-xl border hairline bg-white p-5"
            >
              <Sparkline seed={i * 7 + 3} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#d80621]">
                  {a.topic}
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#0a0f1e]">{a.title}</h2>
                <p className="text-xs text-gray-500">{a.date}</p>
                <p className="mt-2 text-sm text-gray-700">{a.excerpt}</p>
              </div>
            </article>
          ))}
          <p className="text-sm text-gray-500">
            Article bodies are illustrative scaffolding; the CRED news desk
            launches in Phase 1. Release-calendar dates come from Statistics
            Canada's key-indicator schedule: <Link href="https://www.statcan.gc.ca" className="text-[#d80621] hover:underline">statcan.gc.ca</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
