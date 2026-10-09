import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t hairline bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-600">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Link href="/categories" className="hover:text-[#d80621]">
            Categories
          </Link>
          <Link href="/search" className="hover:text-[#d80621]">
            Search
          </Link>
          <Link href="/news" className="hover:text-[#d80621]">
            News
          </Link>
          <Link href="/about" className="hover:text-[#d80621]">
            About
          </Link>
          <Link href="/api-docs" className="hover:text-[#d80621]">
            API docs
          </Link>
        </div>
        <p className="mt-4">
          An Open Nshipyard project. Not affiliated with the Government of
          Canada.
        </p>
        <p className="mt-1">
          Data: Statistics Canada Web Data Service (Statistics Canada Open
          Licence) and the Bank of Canada Valet API. Recession dates from the
          C.D. Howe Institute Business Cycle Council.
        </p>
        <a
          href="https://x.com/richardsondx"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-[#0a0f1e]"
        >
          <span>Built by</span>
          <img
            src="/richardson-avatar.jpg"
            alt="Richardson Dackam"
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
          <span className="font-semibold text-[#0a0f1e]">Richardson Dackam</span>
        </a>
      </div>
    </footer>
  );
}
