'use client';

import { useState } from 'react';
import Link from 'next/link';

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

const ABOUT_ITEMS = [
  { label: 'About CRED', href: '/about' },
  { label: 'Tutorials', href: '/about#tutorials' },
  { label: 'Digital Badges', href: '/about#digital-badges' },
  { label: 'Contact Us', href: '/about#contact' },
];

export default function Header() {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <CredLockup />
          <nav className="flex items-center gap-5 text-sm font-medium">
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
                  <Link
                    href="/api-docs"
                    className="block rounded px-3 py-2 hover:bg-[#f7f7f7]"
                    onClick={() => setToolsOpen(false)}
                  >
                    API
                  </Link>
                  <Link
                    href="/api-docs#mcp"
                    className="block rounded px-3 py-2 hover:bg-[#f7f7f7]"
                    onClick={() => setToolsOpen(false)}
                  >
                    MCP Connector
                  </Link>
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
          </nav>
        </div>
      </div>
    </header>
  );
}
