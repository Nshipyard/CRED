'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function CredLockup() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0a0f1e]"
        aria-hidden
      >
        <svg width="22" height="22" viewBox="0 0 22 22">
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
      <span className="flex flex-col leading-none">
        <span className="eyebrow text-[#0a0f1e]">
          Canadian Research Economic Data
        </span>
        <span className="font-display text-[26px] tracking-tight text-[#0a0f1e]">
          CRED
        </span>
      </span>
    </Link>
  );
}

// Compact mark for the mobile bar: small logo square + wordmark, no lockup.
function CompactMark() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="CRED home">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0a0f1e]"
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 22 22">
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
      <span className="font-display text-xl tracking-tight text-[#0a0f1e]">
        CRED
      </span>
    </Link>
  );
}

const ABOUT_ITEMS = [
  { label: 'About CRED', href: '/about' },
  { label: 'Tutorials', href: '/about#tutorials' },
  { label: 'Digital Badges', href: '/about#digital-badges' },
  { label: 'Contact Us', href: '/about#contact' },
];

const TOOLS_ITEMS = [
  { label: 'API', href: '/api-docs' },
  { label: 'MCP Connector', href: '/api-docs#mcp' },
];

function Hamburger({ open }: { open: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </>
      ) : (
        <>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </>
      )}
    </svg>
  );
}

export default function Header() {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="bg-white">
      {/* Institution brand, in the position FRED puts its reserve-bank line */}
      <div className="border-b hairline">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-1.5">
          <a
            href="https://canada.nshipyard.com"
            className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0a0f1e] hover:text-[#d80621]"
          >
            Open Nshipyard
          </a>
        </div>
      </div>
      <div className="border-b hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:py-3">
          {/* Mobile: compact mark (hidden on the landing page, the hero carries it) */}
          <div className="md:hidden">{isHome ? null : <CompactMark />}</div>
          {/* Desktop: full lockup */}
          <div className="hidden md:block">
            <CredLockup />
          </div>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            <div className="relative">
              <button
                onClick={() => {
                  setToolsOpen((v) => !v);
                  setAboutOpen(false);
                }}
                className="hover:text-[#d80621]"
              >
                Tools ▾
              </button>
              {toolsOpen && (
                <div className="absolute right-0 z-30 mt-2 w-44 rounded-lg border hairline bg-white p-2 shadow-lg">
                  {TOOLS_ITEMS.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block rounded px-3 py-2 hover:bg-[#f7f7f7]"
                      onClick={() => setToolsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/news" className="hover:text-[#d80621]">
              News
            </Link>
            <div className="relative">
              <button
                onClick={() => {
                  setAboutOpen((v) => !v);
                  setToolsOpen(false);
                }}
                className="hover:text-[#d80621]"
              >
                About ▾
              </button>
              {aboutOpen && (
                <div className="absolute right-0 z-30 mt-2 w-48 rounded-lg border hairline bg-white p-2 shadow-lg">
                  {ABOUT_ITEMS.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block rounded px-3 py-2 hover:bg-[#f7f7f7]"
                      onClick={() => setAboutOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <a
              href="https://canada.nshipyard.com"
              className="hover:text-[#d80621]"
            >
              ← All projects
            </a>
          </nav>
          {/* Mobile: hamburger */}
          <button
            className="-mr-2 p-2 text-[#0a0f1e] md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Hamburger open={menuOpen} />
          </button>
        </div>
        {/* Mobile menu panel */}
        {menuOpen && (
          <nav
            className="border-t hairline bg-white md:hidden"
            aria-label="Mobile"
          >
            <div className="mx-auto max-w-6xl px-4 py-2">
              <a
                href="https://canada.nshipyard.com"
                onClick={closeMenu}
                className="block border-b hairline py-3 text-base font-medium text-[#0a0f1e]"
              >
                ← All projects
              </a>
              <Link
                href="/"
                onClick={closeMenu}
                className="block border-b hairline py-3 text-base font-medium text-[#0a0f1e]"
              >
                Home
              </Link>
              <p className="pt-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                Tools
              </p>
              {TOOLS_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  className="block py-2.5 text-base text-[#0a0f1e]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/news"
                onClick={closeMenu}
                className="block border-t hairline py-3 text-base font-medium text-[#0a0f1e]"
              >
                News
              </Link>
              <p className="border-t hairline pt-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                About
              </p>
              {ABOUT_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  className="block py-2.5 text-base text-[#0a0f1e]"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pb-2" />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
