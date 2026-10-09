import Link from 'next/link';
import type { Metadata } from 'next';
import { REGISTRY, CATEGORY_LABELS, type CategorySlug } from '@/lib/registry';

export const metadata: Metadata = {
  title: 'Browse categories | CRED',
  description:
    'Eight top-level categories cover the whole CRED registry, from money and banking to provincial data. 104 verified Canadian economic series from Statistics Canada and the Bank of Canada.',
  openGraph: {
    title: 'Browse categories | CRED',
    description:
      'Eight top-level categories cover the whole CRED registry, from money and banking to provincial data.',
    url: '/categories',
    images: [{ url: '/og/home.png', width: 1200, height: 630, alt: 'CRED categories' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse categories | CRED',
    description:
      'Eight top-level categories cover the whole CRED registry, from money and banking to provincial data.',
    images: ['/og/home.png'],
  },
};

const SOURCE_TAGS: Record<CategorySlug, string> = {
  'money-banking-finance': 'Bank of Canada',
  'population-employment-labour': 'Statistics Canada',
  'national-accounts': 'Statistics Canada',
  'production-business-activity': 'Statistics Canada',
  prices: 'Statistics Canada',
  'housing-construction': 'Statistics Canada / CMHC',
  'international-trade-investment': 'Statistics Canada',
  'provinces-territories-cities': 'Statistics Canada',
};

export default function Categories() {
  const slugs = Object.keys(CATEGORY_LABELS) as CategorySlug[];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0a0f1e]">Browse categories</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Eight top-level categories cover the whole registry, from money and
        banking to provincial data. Series counts below are live counts from
        the current registry, not targets.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {slugs.map((slug) => {
          const series = REGISTRY.filter((s) => s.category === slug);
          const examples = series.slice(0, 3);
          return (
            <div
              key={slug}
              id={slug}
              className="scroll-mt-20 rounded-xl border hairline bg-white p-5"
            >
              <h2 className="text-base font-bold text-[#0a0f1e]">
                {CATEGORY_LABELS[slug]}
              </h2>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {SOURCE_TAGS[slug]}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#d80621]">
                {series.length}
                <span className="ml-1 text-sm font-normal text-gray-500">series</span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {examples.map((s) => (
                  <li key={s.id}>
                    <Link href={`/series/${s.id}`} className="text-[#0a0f1e] hover:text-[#d80621] hover:underline">
                      {s.title}
                    </Link>
                  </li>
                ))}
                {examples.length === 0 && (
                  <li className="text-gray-500">Series arrive with the verified registry.</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
