import Link from 'next/link';
import type { Metadata } from 'next';

// Branded 404 boundary: unknown series IDs (via notFound()) and any other
// bad URL land here instead of a blank page.

export const metadata: Metadata = {
  title: 'Page not found | CRED',
  description:
    'This CRED page does not exist. Search 100+ Canadian economic series from Statistics Canada and the Bank of Canada.',
};

const LINKS = [
  { href: '/', label: 'Home', blurb: 'Start over from the landing page.' },
  { href: '/search', label: 'Search', blurb: 'Find a series by keyword.' },
  {
    href: '/categories',
    label: 'Categories',
    blurb: 'Browse all eight data categories.',
  },
  {
    href: '/news',
    label: 'Latest',
    blurb: 'The newest reading of every flagship series.',
  },
  {
    href: '/api-docs',
    label: 'API docs',
    blurb: 'Pull CRED data into your own tools.',
  },
];

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="font-display text-lg tracking-wide">CRED</span>
        <span
          className="inline-block h-1 w-10 rounded bg-[#d80621]"
          aria-hidden
        />
      </div>
      <p className="mt-8 font-display text-7xl text-[#0a0f1e]">404</p>
      <h1 className="mt-4 text-2xl font-bold text-[#0a0f1e]">
        This page does not exist
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-gray-600">
        The link may be mistyped, or the series ID may have changed. Pick up
        where you left off:
      </p>
      <div className="mx-auto mt-8 grid max-w-3xl gap-4 text-left sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border hairline bg-white p-5 transition-shadow hover:shadow-md"
          >
            <span className="font-bold text-[#d80621]">{l.label}</span>
            <span className="mt-1 block text-sm text-gray-600">{l.blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
