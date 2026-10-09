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

export default function Header() {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <header className="border-b hairline bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <CredLockup />
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/news" className="hover:text-[#d80621]">
            Release Calendar
          </Link>
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
                <Link
                  href="/about"
                  className="block rounded px-3 py-2 hover:bg-[#f7f7f7]"
                  onClick={() => setAboutOpen(false)}
                >
                  About CRED
                </Link>
                <Link
                  href="/about#naming"
                  className="block rounded px-3 py-2 hover:bg-[#f7f7f7]"
                  onClick={() => setAboutOpen(false)}
                >
                  Naming
                </Link>
                <Link
                  href="/api-docs"
                  className="block rounded px-3 py-2 hover:bg-[#f7f7f7]"
                  onClick={() => setAboutOpen(false)}
                >
                  Build plan
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
