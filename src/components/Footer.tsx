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
      </div>
    </footer>
  );
}
