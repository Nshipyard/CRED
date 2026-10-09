#!/usr/bin/env node
// Generates OG SVG cards for CRED: public/og-svg/home.svg + public/og-svg/series/[id].svg
// Run: node scripts/og/build-svg.mjs
// A second step (scripts/og/svg2png.py) rasterizes these to public/og/*.png via Playwright.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIB = '/home/hatch/cred-og-lib';
const { SERIES, getSeries } = await import(LIB + '/registry.js');
const { getObservations } = await import(LIB + '/data.js');
const { RECESSIONS } = await import(LIB + '/recessions.js');

const OUT = '/home/hatch/cred/public/og-svg';
mkdirSync(join(OUT, 'series'), { recursive: true });

const NAVY = '#0a0f1e';
const RED = '#d80621';
const GRAY = '#8a93a6';
const BAND = '#dfe3ea';
const GRID = 'rgba(10,15,30,0.12)';
const DISPLAY = "Archivo Black, 'Arial Black', sans-serif";
const BODY = "Roboto, Arial, sans-serif";

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm >= 5 ? 5 * mag : norm >= 2 ? 2 * mag : mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 0.5; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
}

function fmtVal(v) {
  if (!Number.isFinite(v)) return 'n/a';
  const a = Math.abs(v);
  if (a >= 1000 || (a >= 1 && a < 1000)) {
    return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return String(Number(v.toPrecision(4)));
}

function fmtObsDate(iso, frequency) {
  const d = new Date(iso + 'T00:00:00Z');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (frequency === 'Annual') return `${d.getUTCFullYear()}`;
  if (frequency === 'Quarterly') return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
  if (frequency === 'Daily' || frequency === 'Weekly')
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function sourceName(series) {
  return series.source === 'statcan' ? 'Statistics Canada' : 'Bank of Canada';
}

// Greedy word wrap with a rough width estimate (Archivo Black ~0.64em/char avg).
function wrapTitle(title, fontSize, maxWidth, maxLines) {
  const cw = fontSize * 0.60;
  const words = title.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (t.length * cw > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = t;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  else if (line && lines.length === maxLines) {
    let last = lines[lines.length - 1] + ' ' + line;
    while (last.length * cw > maxWidth && last.length > 4) last = last.slice(0, -1);
    lines[lines.length - 1] = last.trimEnd() + '...';
  }
  return lines;
}

function logoMark(x, y, s) {
  // Navy rounded square with the red CRED polyline, scaled from the 22x22 mark.
  const k = s / 22;
  return `<g>
    <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.18}" fill="${NAVY}"/>
    <polyline points="3,15 8,15 11,9 14,12 19,6" fill="none" stroke="${RED}"
      stroke-width="${2.4 * k}" stroke-linecap="round" stroke-linejoin="round"
      transform="translate(${x},${y}) scale(${k})"/>
  </g>`;
}

// Chart plot rendered as SVG string. Mirrors ChartSVG geometry and styling.
function chartPlot(data, o) {
  const { x, y, w, h } = o;
  const padL = 64, padR = 12, padT = 8, padB = 36;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  if (!data.length) {
    return `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" font-size="20" fill="${GRAY}" font-family="${BODY}">No observations</text>`;
  }
  const dates = data.map((d) => d.date);
  const values = data.map((d) => d.value);
  const minD = dates[0], maxD = dates[dates.length - 1];
  const minV = Math.min(...values), maxV = Math.max(...values);
  const vPad = (maxV - minV || Math.abs(maxV) || 1) * 0.08;
  const lo = minV - vPad, hi = maxV + vPad;
  const tMin = new Date(minD + 'T00:00:00Z').getTime();
  const tMax = new Date(maxD + 'T00:00:00Z').getTime();
  const span = Math.max(tMax - tMin, 1);
  const X = (date) => x + padL + ((new Date(date + 'T00:00:00Z').getTime() - tMin) / span) * plotW;
  const Y = (v) => y + padT + (1 - (v - lo) / (hi - lo)) * plotH;
  const ticks = niceTicks(lo, hi, 5);
  const years = [...new Set(dates.map((d) => d.slice(0, 4)))];
  const thin = Math.max(1, Math.ceil(years.length / 8));
  const yearTicks = years.filter((_, i) => i % thin === 0);
  const visR = RECESSIONS.filter((r) => r.end >= minD && r.start <= maxD);

  let s = '';
  for (const r of visR) {
    const rx = X(r.start < minD ? minD : r.start);
    const rx2 = X(r.end > maxD ? maxD : r.end);
    s += `<rect x="${rx.toFixed(1)}" y="${y + padT}" width="${Math.max(rx2 - rx, 1).toFixed(1)}" height="${plotH}" fill="${BAND}" opacity="0.55"/>`;
  }
  for (const t of ticks) {
    s += `<line x1="${x + padL}" x2="${x + w - padR}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${GRID}" stroke-width="1"/>`;
    s += `<text x="${x + padL - 10}" y="${(Y(t) + 7).toFixed(1)}" text-anchor="end" font-size="20" fill="${GRAY}" font-family="${BODY}">${t}</text>`;
  }
  for (const yr of yearTicks) {
    const xx = Math.max(X(`${yr}-01-01`), x + padL);
    s += `<text x="${xx.toFixed(1)}" y="${y + h - 10}" font-size="20" fill="${GRAY}" font-family="${BODY}">${yr}</text>`;
  }
  // Downsample very long series for path size sanity (keeps shape).
  const step = Math.max(1, Math.floor(data.length / 1500));
  const path = data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((d, i, arr) => `${i === 0 ? 'M' : 'L'}${X(d.date).toFixed(1)},${Y(d.value).toFixed(1)}`)
    .join(' ');
  s += `<path d="${path}" fill="none" stroke="${RED}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  return s;
}

function seriesCard(series, observations) {
  const latest = observations.length ? observations[observations.length - 1] : null;
  const titleLines = wrapTitle(series.title, 40, 1112, 2);
  let titleSvg = '';
  titleLines.forEach((ln, i) => {
    titleSvg += `<text x="44" y="${158 + i * 48}" font-size="40" fill="${NAVY}" font-family="${DISPLAY}">${esc(ln)}</text>`;
  });
  const chartY = 196 + (titleLines.length - 1) * 48;
  const chartH = 300 - (titleLines.length - 1) * 48;
  const latestLine = latest
    ? `Latest ${fmtObsDate(latest.date, series.frequency)}: ${fmtVal(latest.value)}`
    : 'Data refresh in progress';
  const unitsLine = latest
    ? `${series.units}${series.unitsDetail ? ', ' + series.unitsDetail : ''} · ${series.frequency}`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  ${logoMark(44, 28, 54)}
  <text x="112" y="68" font-size="38" fill="${NAVY}" font-family="${DISPLAY}">CRED</text>
  <text x="1156" y="62" text-anchor="end" font-size="20" fill="${GRAY}" font-family="${BODY}">cred.nshipyard.com</text>
  <line x1="44" x2="1156" y1="104" y2="104" stroke="rgba(10,15,30,0.12)" stroke-width="1"/>
  ${titleSvg}
  ${chartPlot(observations, { x: 44, y: chartY, w: 1112, h: chartH })}
  <text x="44" y="548" font-size="26" font-weight="700" fill="${NAVY}" font-family="${BODY}">${esc(latestLine)}</text>
  <text x="44" y="582" font-size="20" fill="${GRAY}" font-family="${BODY}">${esc(unitsLine)}</text>
  <text x="1156" y="582" text-anchor="end" font-size="20" fill="${GRAY}" font-family="${BODY}">Source: ${esc(sourceName(series))} via CRED</text>
</svg>`;
}

function homeCard(policyObs, count) {
  const stats = [
    [`${count}`, 'verified series'],
    ['2', 'official sources: StatCan, Bank of Canada'],
    ['1', 'free public API'],
  ];
  let statsSvg = '';
  stats.forEach(([n, label], i) => {
    const yy = 424 + i * 62;
    statsSvg += `<text x="80" y="${yy}" font-size="30" font-weight="700" fill="${RED}" font-family="${BODY}">${n}</text>`;
    statsSvg += `<text x="140" y="${yy}" font-size="24" fill="#3a4152" font-family="${BODY}">${esc(label)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect x="620" y="90" width="500" height="450" rx="16" fill="#f4f6f9"/>
  ${logoMark(1040, 72, 72)}
  <text x="80" y="96" font-size="20" letter-spacing="4" fill="${GRAY}" font-family="${BODY}">CANADIAN RESEARCH ECONOMIC DATA</text>
  <text x="76" y="236" font-size="132" fill="${NAVY}" font-family="${DISPLAY}">CRED</text>
  <text x="80" y="288" font-size="27" fill="#3a4152" font-family="${BODY}">Your trusted source for</text>
  <text x="80" y="324" font-size="27" fill="#3a4152" font-family="${BODY}">Canadian economic data.</text>
  <line x1="80" x2="560" y1="356" y2="356" stroke="rgba(10,15,30,0.12)" stroke-width="1"/>
  ${statsSvg}
  <text x="648" y="132" font-size="22" font-weight="700" fill="${NAVY}" font-family="${BODY}">Bank of Canada Policy Interest Rate</text>
  <text x="648" y="160" font-size="18" fill="${GRAY}" font-family="${BODY}">Percent, updated with every rate decision</text>
  ${chartPlot(policyObs, { x: 620, y: 176, w: 500, h: 330 })}
  <text x="1120" y="586" text-anchor="end" font-size="20" fill="${GRAY}" font-family="${BODY}">cred.nshipyard.com</text>
</svg>`;
}

async function main() {
  const arg = process.argv[2];
  const homeOnly = arg === 'home-only';
  const onlyIds = arg && arg !== 'home-only' ? arg.split(',') : null;
  const seriesList = homeOnly
    ? SERIES.filter((s) => s.id === 'POLICY_RATE')
    : onlyIds
      ? SERIES.filter((s) => onlyIds.includes(s.id))
      : SERIES;
  console.log(`Fetching ${seriesList.length} series...`);
  const results = [];
  const failures = [];
  // Polite concurrency: 3 at a time (BoC serializes internally anyway).
  const queue = [...seriesList];
  async function worker() {
    while (queue.length) {
      const s = queue.shift();
      try {
        const r = await getObservations(s.id);
        results.push([s, r.observations]);
        if (results.length % 20 === 0) console.log(`  ${results.length}/${SERIES.length}`);
      } catch (e) {
        failures.push([s.id, String(e).slice(0, 120)]);
        results.push([s, []]);
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  for (const [s, obs] of results) {
    writeFileSync(join(OUT, 'series', `${s.id}.svg`), seriesCard(s, obs));
  }
  if (homeOnly) {
    const policy = results.find(([s]) => s.id === 'POLICY_RATE');
    writeFileSync(join(OUT, 'home.svg'), homeCard(policy ? policy[1] : [], SERIES.length));
    console.log('Wrote home.svg (home-only mode)');
    return;
  }
  if (!onlyIds) {
    const policy = results.find(([s]) => s.id === 'POLICY_RATE');
    writeFileSync(join(OUT, 'home.svg'), homeCard(policy ? policy[1] : [], SERIES.length));
  }
  console.log(`Wrote ${results.length} series SVGs${onlyIds ? '' : ' + home.svg'} to ${OUT}`);
  if (failures.length) {
    console.log('Failures (rendered as fallback cards):');
    for (const [id, err] of failures) console.log(`  ${id}: ${err}`);
  }
}

await main();
