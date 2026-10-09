export const metadata = { title: 'API docs | CRED' };

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
    </div>
  );
}
