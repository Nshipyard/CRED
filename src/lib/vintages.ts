// Vintage archive store: Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
// otherwise local NDJSON files under ./data/vintages/ (gitignored).
// Each snapshot is one NDJSON file per series per day:
//   {"snapshot":"2026-10-09","series":"UNRATE_CA","source":"..."}
//   {"date":"2026-09-01","value":7.0}
// Append-only in spirit: each daily file is overwritten once, never merged.

import { put, list } from '@vercel/blob';
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
      access: 'public',
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
