// Monthly CER harvest for CRED Energy.
//
// CER publishes whole-history CSV files on cer-rec.gc.ca and replaces them
// monthly. The files are too large and too messy to parse per request
// (dual-unit duplicates, latin-1 bytes, the literal string "Confidential"
// in numeric columns, totals embedded as rows in every dimension), so this
// script extracts only the series registered in src/lib/registry.ts with
// source 'cer' and writes them to src/lib/cer-data.json.
//
// Run monthly: node scripts/harvest-cer.mjs
// Output: one line per series with row count, range and latest value so a
// bad extraction is visible in the run log before anything is committed.

import { writeFileSync } from 'node:fs';

const FILES = {
  electricity:
    'https://www.cer-rec.gc.ca/open/imports-exports/electricity-exports-and-imports-monthly.csv',
  natgas:
    'https://www.cer-rec.gc.ca/open/imports-exports/natural-gas-exports-monthly.csv',
  lng: 'https://www.cer-rec.gc.ca/open/imports-exports/liquefied-natural-gas-exports-monthly.csv',
  crudeByType:
    'https://www.cer-rec.gc.ca/open/imports-exports/crude-oil-exports-by-type-monthly.csv',
  refined:
    'https://www.cer-rec.gc.ca/open/imports-exports/refined-petroleum-products-exports-monthly.csv',
  ngl: 'https://www.cer-rec.gc.ca/open/imports-exports/natural-gas-liquids-exports-monthly.csv',
};

async function fetchText(url, encoding = 'utf-8') {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CRED-harvest/1.0 (open-data project)' },
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder(encoding).decode(buf);
}

// Small CSV parser: handles quoted fields with commas and escaped quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i].trim()])));
}

function num(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).replace(/,/g, '').trim();
  if (!t || t.toLowerCase() === 'confidential') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// "7/1/2026" or "07/01/2026" -> "2026-07-01"
function mdyToISO(v) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v).trim());
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

// Collect rows matching a predicate into sorted, de-duplicated observations.
// If the same month appears twice with the same value (CER duplicates some
// Total rows), keep one. If it appears with different values, throw: that
// means the filter is wrong and a human should look.
function collect(rows, dateOf, valueOf, predicate, label) {
  const byDate = new Map();
  for (const r of rows) {
    if (!predicate(r)) continue;
    const date = dateOf(r);
    const value = num(valueOf(r));
    if (!date || value === null) continue;
    if (byDate.has(date) && byDate.get(date) !== value) {
      throw new Error(
        `${label}: conflicting values for ${date}: ${byDate.get(date)} vs ${value}`
      );
    }
    byDate.set(date, value);
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

const out = {};
function report(id, obs) {
  out[id] = obs;
  const last = obs[obs.length - 1];
  console.log(
    `${id}: ${obs.length} points, ${obs[0]?.date} to ${last?.date}, latest ${last?.value}`
  );
  if (obs.length < 12) throw new Error(`${id}: suspiciously few points`);
}

// --- Electricity imports and exports, Canada totals -------------------------
// Long-format Source x Destination table. A 'Total' Source still splits by
// Destination, so the Canada total is the row where BOTH sides are 'Total';
// summing pair rows would double count.
const elec = parseCsv(await fetchText(FILES.electricity));
report(
  'ELEC_EXPORTS_CA_CER',
  collect(
    elec,
    (r) => mdyToISO(r['Period']),
    (r) => r['Energy (MW.h)'],
    (r) =>
      r['Activity'] === 'Exports' &&
      r['Source'] === 'Total' &&
      r['Destination'] === 'Total',
    'ELEC_EXPORTS_CA_CER'
  )
);
report(
  'ELEC_IMPORTS_CA_CER',
  collect(
    elec,
    (r) => mdyToISO(r['Period']),
    (r) => r['Energy (MW.h)'],
    (r) =>
      r['Activity'] === 'Imports' &&
      r['Source'] === 'Total' &&
      r['Destination'] === 'Total',
    'ELEC_IMPORTS_CA_CER'
  )
);

// --- Pipeline natural gas exports, Canada total ------------------------------
// Port x Region cross table; the grand total row is Port=Total, Region=Total.
const gas = parseCsv(await fetchText(FILES.natgas));
report(
  'NATGAS_EXPORTS_CA_CER',
  collect(
    gas,
    (r) => mdyToISO(r['Period']),
    (r) => r['Volume (10^3 m3)'],
    (r) =>
      r['Flow'] === 'Exports' && r['Port'] === 'Total' && r['Region'] === 'Total',
    'NATGAS_EXPORTS_CA_CER'
  )
);

// --- LNG exports, total volume ----------------------------------------------
// KNOWN SOURCE ANOMALY (verified 2026-10-21): CER's file reports Kitimat
// exports for 2026-08 as 101,302,314.902 (10^3 m3), roughly 100x the
// 0.7M to 1.3M range of every surrounding month (Jul 2026: 699,158.741).
// The Total row inherits the error. The point is excluded below and the
// exclusion is disclosed in the series description. If CER republishes a
// corrected value, remove the exclusion and re-run.
const LNG_EXCLUSIONS = new Set(['2026-08-01']);
const lng = parseCsv(await fetchText(FILES.lng));
report(
  'LNG_EXPORTS_CA_CER',
  collect(
    lng,
    (r) => mdyToISO(r['Period']),
    (r) => r['Volume (10^3 m3)'],
    (r) => r['Flow'] === 'Exports' && r['Terminal'] === 'Total',
    'LNG_EXPORTS_CA_CER'
  ).filter((o) => {
    if (LNG_EXCLUSIONS.has(o.date)) {
      console.warn(
        `LNG_EXPORTS_CA_CER: excluded ${o.date} value ${o.value} (CER mis-scaled row, see comment)`
      );
      return false;
    }
    return true;
  })
);

// --- Crude oil exports by type, total ---------------------------------------
const crude = parseCsv(await fetchText(FILES.crudeByType));
report(
  'CRUDE_EXPORTS_CA_CER',
  collect(
    crude,
    (r) => mdyToISO(r['Period']),
    (r) => r['Volume (bbl/d)'],
    (r) => r['Oil Type'] === 'Total',
    'CRUDE_EXPORTS_CA_CER'
  )
);

// --- Refined petroleum product exports, total --------------------------------
// Some months are "Confidential" including recent ones; those months are
// simply absent from the series (collect skips nulls).
const refined = parseCsv(await fetchText(FILES.refined));
report(
  'REFINED_EXPORTS_CA_CER',
  collect(
    refined,
    (r) => mdyToISO(r['Period']),
    (r) => r['Volume (10^3 m3)'],
    (r) => r['Product'] === 'Total',
    'REFINED_EXPORTS_CA_CER'
  )
);

// --- NGL exports by product ---------------------------------------------------
// File is latin-1 (Quebec carries an accented e as a raw byte). Totals sit in
// Origin, Destination and Mode at once; a duplicate Total-mode row exists per
// group, which collect de-duplicates or flags.
const ngl = parseCsv(await fetchText(FILES.ngl, 'windows-1252'));
for (const product of ['Propane', 'Butane']) {
  const id = `NGL_${product.toUpperCase()}_EXPORTS_CA_CER`;
  report(
    id,
    collect(
      ngl,
      (r) => mdyToISO(r['Period']),
      (r) => r['Volume (m3)'],
      (r) =>
        r['Product'] === product &&
        r['Origin'] === 'Total' &&
        r['Destination / PADD'] === 'Total' &&
        r['Mode of Transportation'] === 'Total',
      id
    )
  );
}

writeFileSync(
  new URL('../src/lib/cer-data.json', import.meta.url),
  JSON.stringify(out)
);
console.log('Wrote src/lib/cer-data.json');
