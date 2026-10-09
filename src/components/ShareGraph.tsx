'use client';

// FRED-style share flow for series pages: on phones (and any browser with
// Web Share file support) the Share button opens the native share sheet with
// the branded chart image attached, so saving to photos or sending to an app
// is one tap. The chevron keeps the desktop menu: Custom Graph Link, Embed
// in Website, Graph Image Link (copies a PNG URL).

import { useEffect, useRef, useState } from 'react';
import type { ChartPoint } from './ChartSVG';
import {
  encodeGraphConfig,
  type GraphConfig,
  type GraphMode,
} from '@/lib/graphLink';

// True when the browser can open the native share sheet with an image file
// attached (iOS Safari 15+, Android Chrome, desktop Chrome/Edge/Safari).
// The sheet is where a phone user finds "Save to Photos", Messages, X, etc.,
// which is the intuitive way to keep the chart image. Desktop browsers
// without file-share support keep the link/embed dropdown instead.
function canNativeShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;
  try {
    const probe = new File(['x'], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

interface ShareGraphProps {
  seriesId: string;
  seriesTitle: string;
  data: ChartPoint[];
  from: string;
  to: string;
}

const MODES: { id: GraphMode; label: string; hint: (ctx: { n: number; from: string; to: string }) => string }[] = [
  {
    id: 'full',
    label: 'Always chart from the series start to the last value available',
    hint: () => 'Auto-updating as new data arrives',
  },
  {
    id: 'lastN',
    label: 'Always chart the last N periods of data available',
    hint: ({ n }) => `Auto-updating · N = ${n} from your current view`,
  },
  {
    id: 'static',
    label: 'Static chart of the currently selected range',
    hint: ({ from, to }) => `Fixed range${from || to ? `: ${from || '…'} to ${to || '…'}` : ''}`,
  },
];

export default function ShareGraph({
  seriesId,
  seriesTitle,
  data,
  from,
  to,
}: ShareGraphProps) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'custom' | 'embed' | null>(null);
  const [mode, setMode] = useState<GraphMode>('full');
  const [responsive, setResponsive] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const nativeShare = canNativeShareFiles();
  // Cached PNG so share() is called immediately inside the tap gesture;
  // awaiting a network fetch inside the handler can lose user activation
  // on iOS and the share silently fails.
  const imgCache = useRef<{ href: string; blob: Blob } | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const n = Math.max(data.length, 1);
  const first = data.length ? data[0].date : '';
  const last = data.length ? data[data.length - 1].date : '';

  function buildConfig(m: GraphMode): GraphConfig {
    if (m === 'full') return { v: 1, series: seriesId, mode: 'full' };
    if (m === 'lastN')
      return { v: 1, series: seriesId, mode: 'lastN', n };
    return {
      v: 1,
      series: seriesId,
      mode: 'static',
      from: from || first || undefined,
      to: to || last || undefined,
    };
  }

  const graphHref = `${origin}/graph/?g=${encodeGraphConfig(buildConfig(mode))}`;

  const imageHref =
    `${origin}/api/graph-image?series=${encodeURIComponent(seriesId)}` +
    (from ? `&from=${encodeURIComponent(from)}` : '') +
    (to ? `&to=${encodeURIComponent(to)}` : '');

  // Prefetch the branded PNG on share-capable devices only, so tapping Share
  // can hand the file to the native sheet without a mid-gesture fetch.
  useEffect(() => {
    if (!nativeShare) return;
    let cancelled = false;
    fetch(imageHref)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!cancelled) imgCache.current = { href: imageHref, blob };
      })
      .catch(() => {
        if (!cancelled) imgCache.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, [nativeShare, imageHref]);

  async function shareNative() {
    setSharing(true);
    try {
      let blob = imgCache.current?.href === imageHref ? imgCache.current.blob : null;
      if (!blob) {
        const res = await fetch(imageHref);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
      }
      const file = new File([blob], `${seriesId}.png`, { type: 'image/png' });
      await navigator.share({
        files: [file],
        title: `${seriesTitle} | CRED`,
        text: `${seriesTitle} | CRED`,
        url: window.location.href,
      });
    } catch (err) {
      // The user dismissing the sheet is not an error; anything else falls
      // back to the link/embed menu so the tap still does something useful.
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setOpen(true);
      }
    } finally {
      setSharing(false);
    }
  }

  function embedSnippet(): string {
    const title = `${seriesTitle} | CRED`;
    if (responsive) {
      return `<div style="position:relative;padding-bottom:62.5%;height:0;overflow:hidden;max-width:100%;">\n  <iframe src="${graphHref}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" title="${title}" loading="lazy"></iframe>\n</div>`;
    }
    return `<iframe src="${graphHref}" width="100%" height="480" frameborder="0" title="${title}" loading="lazy"></iframe>`;
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function ModeRadios() {
    return (
      <fieldset>
        <legend className="text-sm font-medium text-[#0a0f1e]">
          Chart range
        </legend>
        <div className="mt-2 space-y-2">
          {MODES.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-start gap-2 rounded-lg border hairline p-3 text-sm hover:border-[#d80621]"
            >
              <input
                type="radio"
                name="share-mode"
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
                className="mt-1"
              />
              <span>
                <span className="block text-[#0a0f1e]">{m.label}</span>
                <span className="block text-xs text-gray-500">
                  {m.hint({ n, from, to })}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <>
      <div className="relative">
        {nativeShare ? (
          <div className="flex items-stretch whitespace-nowrap rounded border border-[rgba(10,15,30,0.2)]">
            <button
              onClick={shareNative}
              disabled={sharing}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-[#0a0f1e] disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M12 15V4m0 0L8 8m4-4l4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8"
                  strokeLinecap="round"
                />
              </svg>
              {sharing ? 'Sharing…' : 'Share'}
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="border-l border-[rgba(10,15,30,0.2)] px-2 text-sm text-[#0a0f1e]"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="More share options"
            >
              ▾
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className="whitespace-nowrap rounded border border-[rgba(10,15,30,0.2)] px-4 py-1.5 text-sm text-[#0a0f1e]"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            Share Graph ▾
          </button>
        )}
        {open && (
          <div
            role="menu"
            className="absolute bottom-full right-0 z-20 mb-2 w-56 overflow-hidden rounded-lg border border-[rgba(10,15,30,0.1)] bg-white shadow-lg"
          >
            <button
              role="menuitem"
              onClick={() => {
                setModal('custom');
                setOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-[#0a0f1e] hover:bg-[#f4f6f9]"
            >
              Custom Graph Link
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setModal('embed');
                setOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-[#0a0f1e] hover:bg-[#f4f6f9]"
            >
              Embed in Website
            </button>
            <button
              role="menuitem"
              onClick={() => {
                copyText(imageHref);
                setOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-[#0a0f1e] hover:bg-[#f4f6f9]"
            >
              {copied ? 'Image Link Copied' : 'Graph Image Link'}
            </button>
          </div>
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={modal === 'custom' ? 'Custom graph link' : 'Embed in website'}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold text-[#0a0f1e]">
                {modal === 'custom' ? 'Custom Graph Link' : 'Embed in Website'}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-xl leading-none text-gray-400 hover:text-[#0a0f1e]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-4">
              <ModeRadios />
            </div>

            {modal === 'custom' ? (
              <div className="mt-4">
                <label className="text-sm font-medium text-[#0a0f1e]">
                  Graph URL
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    readOnly
                    value={graphHref}
                    onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 rounded border hairline bg-[#f4f6f9] px-3 py-2 font-mono text-xs text-gray-700"
                  />
                  <button
                    onClick={() => copyText(graphHref)}
                    className="shrink-0 rounded border border-[#0a0f1e] px-3 py-2 text-sm font-medium text-[#0a0f1e]"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => copyText(graphHref)}
                  className="mt-3 w-full rounded bg-[#d80621] px-4 py-2 text-sm font-medium text-white"
                >
                  {copied ? 'Copied' : 'Copy Graph Link'}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#0a0f1e]">
                  <input
                    type="checkbox"
                    checked={responsive}
                    onChange={(e) => setResponsive(e.target.checked)}
                  />
                  Make it responsive
                </label>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded border hairline bg-[#f4f6f9] p-3 font-mono text-xs text-gray-700">
                  {embedSnippet()}
                </pre>
                <button
                  onClick={() => copyText(embedSnippet())}
                  className="mt-3 w-full rounded bg-[#d80621] px-4 py-2 text-sm font-medium text-white"
                >
                  {copied ? 'Copied' : 'Copy Embed Code'}
                </button>
                <p className="mt-2 text-center text-xs text-gray-500">
                  <a href="/api-docs#embed" className="text-[#d80621] hover:underline">
                    Embedding docs
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

