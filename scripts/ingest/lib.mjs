// Shared WDS client for the CRED ingestion pipeline.
// Polite: custom UA, delays between requests, backoff on 429/503, 409 = table locked (skip, don't hammer).
import { readFileSync, appendFileSync } from 'node:fs';

const WDS = 'https://www150.statcan.gc.ca/t1/wds/rest';
const UA = 'CRED-ingestion-pilot/1.0 (research prototype; https://cred.nshipyard.com)';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function wdsGet(path, { retries = 3 } = {}) {
  const url = `${WDS}/${path}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 409) return { locked: true, status: 409 };
    if (res.ok) return { ok: true, data: await res.json() };
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    throw new Error(`WDS GET ${path}: HTTP ${res.status}`);
  }
}

export async function wdsPost(path, body, { retries = 3 } = {}) {
  const url = `${WDS}/${path}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 409) return { locked: true, status: 409 };
    if (res.ok) return { ok: true, data: await res.json() };
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const text = await res.text().catch(() => '');
    throw new Error(`WDS POST ${path}: HTTP ${res.status} ${text.slice(0, 120)}`);
  }
}

// HEAD check for releaseUrl validation (no retry; a failure just gets recorded).
export async function wdsHead(url) {
  const res = await fetch(url, {
    method: 'HEAD',
    headers: { 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  return { status: res.status };
}

// Pad a dot-joined member-id coordinate to 10 segments (verified live: unpadded -> HTTP 406).
export function padCoord(memberIds) {
  const parts = [...memberIds];
  while (parts.length < 10) parts.push('0');
  return parts.join('.');
}

export function readJsonl(path) {
  const out = [];
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (t) out.push(JSON.parse(t));
    }
  } catch { /* missing file -> empty */ }
  return out;
}

export function appendJsonl(path, obj) {
  appendFileSync(path, JSON.stringify(obj) + '\n');
}
