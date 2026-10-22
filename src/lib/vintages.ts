// Vintage archive store: Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
// otherwise local NDJSON files under ./data/vintages/ (gitignored).
// Each snapshot is one NDJSON file per series per day:
//   {"snapshot":"2026-10-09","series":"UNRATE_CA","source":"..."}
//   {"date":"2026-09-01","value":7.0}
// Append-only in spirit: each daily file is overwritten once, never merged.

import { put, list, get } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';

export interface VintageSnapshot {
  snapshot: string; // yyyy-mm-dd
  series: string;
  source: string;
  observations: { date: string; value: number }[];
}

const LOCAL_DIR = path.join(process.cwd(), 'data', 'vintages');

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function blobPath(series: string, snapshot: string): string {
  return `vintages/${series}/${snapshot}.ndjson`;
}

function toNDJSON(s: VintageSnapshot): string {
  const lines = [
    JSON.stringify({ snapshot: s.snapshot, series: s.series, source: s.source }),
    ...s.observations.map((o) =>
      JSON.stringify({ date: o.date, value: o.value })
    ),
  ];
  return lines.join('\n');
}

export async function writeSnapshot(s: VintageSnapshot): Promise<string> {
  const ndjson = toNDJSON(s);
  if (useBlob()) {
    const { url } = await put(blobPath(s.series, s.snapshot), ndjson, {
      access: 'private', // store is private: Vercel rejects public puts on private stores
      contentType: 'application/x-ndjson',
      allowOverwrite: true,
    });
    return url;
  }
  await fs.mkdir(path.join(LOCAL_DIR, s.series), { recursive: true });
  const file = path.join(LOCAL_DIR, s.series, `${s.snapshot}.ndjson`);
  await fs.writeFile(file, ndjson, 'utf8');
  return file;
}

export async function listSnapshots(series: string): Promise<string[]> {
  if (useBlob()) {
    const { blobs } = await list({ prefix: `vintages/${series}/` });
    return blobs
      .map((b) => {
        const m = /(\d{4}-\d{2}-\d{2})\.ndjson$/.exec(b.pathname);
        return m ? m[1] : null;
      })
      .filter((d): d is string => d !== null)
      .sort();
  }
  try {
    const files = await fs.readdir(path.join(LOCAL_DIR, series));
    return files
      .filter((f) => f.endsWith('.ndjson'))
      .map((f) => f.replace(/\.ndjson$/, ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Newest stored snapshot for a series, parsed back into observations.
 * Returns null when no snapshot exists or the store is unreachable, so
 * callers can treat it purely as a fallback (see getObservations).
 */
export async function readLatestSnapshot(
  series: string
): Promise<VintageSnapshot | null> {
  try {
    const dates = await listSnapshots(series);
    if (dates.length === 0) return null;
    const latest = dates[dates.length - 1];
    let text: string;
    if (useBlob()) {
      const res = await get(blobPath(series, latest), { access: 'private' });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      text = await new Response(res.stream).text();
    } else {
      text = await fs.readFile(
        path.join(LOCAL_DIR, series, `${latest}.ndjson`),
        'utf8'
      );
    }
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) return null;
    const header = JSON.parse(lines[0]) as {
      snapshot?: string;
      source?: string;
    };
    const observations = lines.slice(1).map((l) => {
      const o = JSON.parse(l) as { date: string; value: number };
      return { date: o.date, value: o.value };
    });
    if (observations.length === 0) return null;
    return {
      snapshot: header.snapshot ?? latest,
      series,
      source: header.source ?? '',
      observations,
    };
  } catch {
    return null;
  }
}
