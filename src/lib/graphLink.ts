// Shareable graph links: base64url-encoded chart configs.
// Isomorphic: works in the browser (btoa/atob) and on the server (Buffer).

export type GraphMode = 'full' | 'lastN' | 'static';

export interface GraphConfig {
  v: 1;
  series: string;
  mode: GraphMode;
  /** for mode 'lastN': how many of the latest observations to chart */
  n?: number;
  /** for mode 'static': fixed range */
  from?: string;
  /** for mode 'static': fixed range */
  to?: string;
}

function b64urlEncode(s: string): string {
  const b64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(s, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }
  return decodeURIComponent(escape(atob(padded)));
}

export function encodeGraphConfig(cfg: GraphConfig): string {
  return b64urlEncode(JSON.stringify(cfg));
}

export function decodeGraphConfig(g: string): GraphConfig | null {
  try {
    const cfg = JSON.parse(b64urlDecode(g)) as GraphConfig;
    if (
      !cfg ||
      cfg.v !== 1 ||
      typeof cfg.series !== 'string' ||
      !['full', 'lastN', 'static'].includes(cfg.mode)
    ) {
      return null;
    }
    if (cfg.mode === 'lastN' && (!cfg.n || cfg.n < 1)) return null;
    if (cfg.mode === 'static' && !cfg.from && !cfg.to) return null;
    return cfg;
  } catch {
    return null;
  }
}

export function graphUrl(origin: string, cfg: GraphConfig): string {
  return `${origin}/graph/?g=${encodeGraphConfig(cfg)}`;
}
