// FRED-style title transform for pipeline-ingested series.
// Human-written, measure-first titles in plain words: adjective classifiers
// fold in front of the measure ("Single-detached housing starts"), age groups
// become "ages X to Y" qualifiers, the survey prefix drops for headline
// measures ("Employment") but stays when it carries the meaning
// ("Employment Insurance Statistics: Other reasons"). Rules only, no LLM:
// no word is ever invented except connectors ("ages") and the ", Canada"
// geography suffix (a fact from the cube). The raw StatCan label is kept as
// originalTitle for provenance and search.
export const NOISE_PARTS = new Set(['Estimate', 'Total - Gender', 'Both sexes', 'Total, both sexes']);

// Headline measures: self-explanatory without a survey prefix
// ("Employment, ages 15 to 24, Canada" needs no "Labour Force Survey: ").
// Deliberately small: heads like "Exports" or "Value of exports" stay
// prefixed, because the prefix often carries the measure ("Contributions to
// Annual Percent Change...: Exports" is not the same as "Exports").
export const HEADLINE_MEASURES = new Set([
  'employment', 'unemployment', 'employment rate', 'unemployment rate',
  'labour force', 'population', 'housing starts',
]);

export function ageQualifier(name) {
  let m = /^(\d+)\s+to\s+(\d+)\s+years?$/i.exec(name);
  if (m) return `ages ${m[1]} to ${m[2]}`;
  m = /^(\d+)\s+years?\s+and\s+over$/i.exec(name);
  if (m) return `ages ${m[1]} and over`;
  return null;
}

const ADJ_STOP = new Set(['units', 'unit', 'number', 'total', 'all']);
export function adjCandidate(dim, name) {
  // A type/kind/class dimension whose value is a single hyphenated-or-plain
  // token reads as an English adjective ("Single-detached housing starts").
  // Totalizers ("Total units", "All sectors") and multi-word values
  // ("Full-time employees") stay as comma qualifiers.
  if (!/^(type|kind|class)(\s|$)/i.test(dim)) return false;
  if (/^(total|all)\b/i.test(name)) return false;
  if (ADJ_STOP.has(name.toLowerCase())) return false;
  if (/[\s,]/.test(name)) return false;
  if (/\d/.test(name)) return false;
  return name.length <= 24;
}

export function sharesStem(a, b) {
  // Longest common prefix >= 5 between any word pair: "Employees" would
  // otherwise fold into "Employment" as "Employees employment".
  const words = (s) => s.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const x of words(a)) for (const y of words(b)) {
    let i = 0;
    while (i < x.length && i < y.length && x[i] === y[i]) i++;
    if (i >= 5) return true;
  }
  return false;
}

export function foldableHead(head) {
  // "X of Y" heads ("Value of sales") don't take a prefixed adjective:
  // the classifier modifies Y, so "Brandy value of sales" misreads.
  return (
    !/^(total|all|other)\b/i.test(head) &&
    !/,/.test(head) &&
    !/\d/.test(head) &&
    !/\bof\b/i.test(head)
  );
}

export function lowerHead(s) {
  const m = /^([A-Z][a-z]+)(.*)$/.exec(s);
  if (!m) return s;
  // Keep proper adjectives capitalized ("Canadian direct investment abroad"
  // must not become "canadian ...").
  if (/(ian|ese|ish)$/.test(m[1].toLowerCase())) return s;
  return m[1].toLowerCase() + m[2];
}

export function needsSurveyPrefix(measureHead, core) {
  if (/^(Other|Total|All)\b/.test(core)) return true;
  if (measureHead && HEADLINE_MEASURES.has(measureHead.toLowerCase())) return false;
  return core.length < 30;
}

export function tidyCore(core) {
  // Drop comma-segments that repeat the previous one verbatim
  // (e.g. "Total employed, Total employed, all industries").
  const segs = core.split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const s of segs) {
    if (out.length && out[out.length - 1].toLowerCase() === s.toLowerCase()) continue;
    out.push(s);
  }
  return out.join(', ');
}

// FRED-style core from member dimensions. Returns the unfolded measure head
// (for the prefix decision), the display core, and the SA flag.
export function fredCore(members) {
  const seen = new Set();
  const kept = [];
  let sa = false;
  for (const m of members) {
    if (m.name === 'Canada' || NOISE_PARTS.has(m.name)) continue;
    if (/^seasonally adjusted/i.test(m.name)) { sa = true; continue; }
    if (seen.has(m.name)) continue;
    seen.add(m.name);
    kept.push(m);
  }
  const items = kept.map((m) => {
    const aq = ageQualifier(m.name);
    if (aq) return { kind: 'qual', text: aq };
    if (adjCandidate(m.dim, m.name)) return { kind: 'adj', text: m.name };
    return { kind: 'core', text: m.name };
  });
  const adjs = items.filter((i) => i.kind === 'adj');
  const headIdx = items.findIndex((i) => i.kind === 'core');
  let measureHead = null;
  if (headIdx >= 0) {
    measureHead = items[headIdx].text;
    if (adjs.length === 1) {
      const a = adjs[0].text;
      const h = items[headIdx].text;
      if (foldableHead(h) && !sharesStem(a, h)) {
        items[headIdx] = { kind: 'core', text: `${a} ${lowerHead(h)}` };
        items.splice(items.indexOf(adjs[0]), 1);
      }
    }
  } else if (adjs.length) {
    // No core member at all: the classifier becomes the head.
    adjs[0].kind = 'core';
    measureHead = adjs[0].text;
  }
  const core = tidyCore(items.map((i) => i.text).join(', '));
  return { measureHead, core, sa };
}
