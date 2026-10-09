import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API docs | CRED',
  description:
    'The CRED public API: series metadata, observations, vintages, and an MCP server over Statistics Canada and Bank of Canada data. No key required.',
  openGraph: {
    title: 'API docs | CRED',
    description:
      'The CRED public API: series metadata, observations, vintages, and an MCP server over Statistics Canada and Bank of Canada data. No key required.',
    url: '/api-docs',
    images: [{ url: '/og/home.png', width: 1200, height: 630, alt: 'CRED API docs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API docs | CRED',
    description:
      'The CRED public API: series metadata, observations, vintages, and an MCP server over Statistics Canada and Bank of Canada data. No key required.',
    images: ['/og/home.png'],
  },
};

import McpSetup from '@/components/McpSetup';

function Endpoint({
  method,
  path,
  desc,
  example,
  response,
}: {
  method: string;
  path: string;
  desc: string;
  example: string;
  response: string;
}) {
  return (
    <div className="rounded-xl border hairline bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded bg-[#0a0f1e] px-2 py-0.5 text-xs font-bold text-white">
          {method}
        </span>
        <code className="text-sm font-medium text-[#0a0f1e]">{path}</code>
      </div>
      <p className="mt-2 text-sm text-gray-700">{desc}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Request</p>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-[#0a0f1e] p-3 text-xs text-white">
        {example}
      </pre>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Response</p>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-[#f7f7f7] p-3 text-xs text-[#0a0f1e]">
        {response}
      </pre>
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0a0f1e]">CRED API</h1>
      <p className="mt-2 text-gray-700">
        A read API over Canadian economic data. No key required for
        reads. Responses are JSON. Observations come from the same 24h-cached
        live fetch as the charts, so each series is pulled from its source at
        most once per day.
      </p>

      <div className="mt-6 space-y-5">
        <Endpoint
          method="GET"
          path="/api/series?q=cpi"
          desc="Search the series registry by ID, title, or description. Omit q to list all series."
          example={`curl "https://cred.nshipyard.com/api/series?q=cpi"`}
          response={`[
  {
    "id": "CPI_CA",
    "title": "Consumer Price Index, All-items",
    "source": "statcan",
    "sourceLabel": "Statistics Canada, Consumer Price Index",
    "tableId": "18-10-0004-01",
    "units": "Index",
    "frequency": "Monthly",
    "category": "prices",
    "description": "The all-items Consumer Price Index..."
  }
]`}
        />
        <Endpoint
          method="GET"
          path="/api/series/UNRATE_CA"
          desc="Full metadata for one series, including its StatCan table or BoC Valet mapping."
          example={`curl "https://cred.nshipyard.com/api/series/UNRATE_CA"`}
          response={`{
  "id": "UNRATE_CA",
  "title": "Unemployment Rate",
  "source": "statcan",
  "sourceLabel": "Statistics Canada, Labour Force Survey",
  "tableId": "14-10-0287-01",
  "vectorIds": [2062815],
  "units": "Percent",
  "unitsDetail": "Seasonally Adjusted",
  "frequency": "Monthly",
  "category": "population-employment-labour",
  "description": "...",
  "lastVerified": "2026-10-09"
}`}
        />
        <Endpoint
          method="GET"
          path="/api/observations?series=UNRATE_CA&from=2020-01-01&to=2026-09-01"
          desc="Observations for a series, ascending by date. from and to are optional ISO dates."
          example={`curl "https://cred.nshipyard.com/api/observations?series=UNRATE_CA&from=2020-01-01&to=2020-04-01"`}
          response={`{
  "series": "UNRATE_CA",
  "observations": [
    { "date": "2020-01-01", "value": 5.5 },
    { "date": "2020-02-01", "value": 5.6 },
    { "date": "2020-03-01", "value": 7.8 },
    { "date": "2020-04-01", "value": 13.0 }
  ],
  "source": "Statistics Canada, Labour Force Survey",
  "cached": true,
  "asOf": "2026-10-09T12:00:00.000Z"
}`}
        />
        <Endpoint
          method="GET"
          path="/api/categories"
          desc="The 8 top-level categories with live series counts from the registry."
          example={`curl "https://cred.nshipyard.com/api/categories"`}
          response={`[
  {
    "slug": "prices",
    "name": "Prices",
    "seriesCount": 1,
    "examples": ["Consumer Price Index, All-items"]
  }
]`}
        />
        <Endpoint
          method="GET"
          path="/api/vintages?series=UNRATE_CA"
          desc="List daily snapshot dates for a series from the vintage archive (Phase 2)."
          example={`curl "https://cred.nshipyard.com/api/vintages?series=UNRATE_CA"`}
          response={`{
  "series": "UNRATE_CA",
  "snapshots": ["2026-10-09", "2026-10-08"]
}`}
        />
      </div>

      <section className="mt-10 scroll-mt-20" id="mcp">
        <h2 className="text-2xl font-bold text-[#0a0f1e]">MCP Connector</h2>
        <p className="mt-2 max-w-2xl text-gray-700">
          The MCP server exposes CRED to AI agents over streamable HTTP
          (JSON-RPC 2.0). It is live at <code>/mcp</code> and backed by the
          same registry and observation proxy as the REST API, so tools never
          drift from the site. Pick your client below and copy the config.
        </p>
        <div className="mt-5">
          <McpSetup />
        </div>
      </section>

      <section className="mt-10 scroll-mt-20" id="embed">
        <h2 className="text-2xl font-bold text-[#0a0f1e]">Embed a Graph</h2>
        <p className="mt-2 max-w-2xl text-gray-700">
          Any series page has a Share Graph button with an Embed in Website
          option. It generates a link to a standalone chart page
          (<code>/graph/?g=…</code>) that carries the series, range mode, and
          range in a base64url config, and an <code>&lt;iframe&gt;</code>{' '}
          snippet pointing at it. The embedded chart is the same figure as the
          series page: CRED logo, axes, recession shading, and source line,
          with no site chrome.
        </p>
        <div className="mt-4 rounded-xl border hairline bg-white p-5">
          <p className="text-sm font-medium text-[#0a0f1e]">Fixed size</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre rounded bg-[#f4f6f9] p-3 font-mono text-xs text-gray-700">
{`<iframe src="https://cred.nshipyard.com/graph/?g=CONFIG" width="100%" height="480" frameborder="0" title="Series title | CRED" loading="lazy"></iframe>`}
          </pre>
          <p className="mt-4 text-sm font-medium text-[#0a0f1e]">Responsive</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre rounded bg-[#f4f6f9] p-3 font-mono text-xs text-gray-700">
{`<div style="position:relative;padding-bottom:62.5%;height:0;overflow:hidden;max-width:100%;">
  <iframe src="https://cred.nshipyard.com/graph/?g=CONFIG" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" title="Series title | CRED" loading="lazy"></iframe>
</div>`}
          </pre>
          <p className="mt-4 text-sm text-gray-700">
            Replace <code>CONFIG</code> with the config from the series
            page&apos;s Share Graph dialog. Range modes: <code>full</code>{' '}
            (series start to latest, auto-updating), <code>lastN</code> (last N
            periods, auto-updating), <code>static</code> (fixed from/to).
            Attribution is built into the embedded chart; keep the source
            line visible.
          </p>
        </div>
      </section>
    </div>
  );
}
