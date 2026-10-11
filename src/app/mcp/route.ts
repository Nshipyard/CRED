import { NextResponse } from 'next/server';
import { REGISTRY, CATEGORIES, searchSeries, getSeries } from '@/lib/registry';
import { getObservations } from '@/lib/data';
import {
  applyTransform,
  aggregateFrequency,
  periodsPerYearFor,
  TRANSFORM_KINDS,
  type TransformKind,
  type FrequencyKind,
} from '@/lib/transforms';

// CRED MCP server over streamable HTTP (JSON-RPC 2.0 via POST).
// Tools: search_series, get_observations, list_categories.
// Backed by the same registry and observation proxy as the REST API.
// Stateless. CORS open like the other Nshipyard MCP servers.

export const dynamic = 'force-dynamic';

const SERVER = { name: 'cred', version: '1.0.0' };

const TOOLS = [
  {
    name: 'search_series',
    description:
      'Search CRED series by keyword across titles, descriptions and series IDs. Returns registry metadata for matching series.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search text, e.g. "unemployment", "CPI", "GDP"',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_observations',
    description:
      'Get observations for a CRED series ID, optionally bounded by from/to dates (YYYY-MM-DD). ' +
      'Optional transform reshapes the values the way the site charts do: levels (default), change (period-over-period), ' +
      'change_yoy (change from year ago), pct_change (percent change from previous period), ' +
      'yoy (percent change from year ago), index (rebased to 100 at the first observation), log (natural log). ' +
      'Optional frequency aggregates to a lower calendar frequency first: native (default), quarterly, annual ' +
      '(calendar-period means). Transforms apply before the 500-point cap. ' +
      'Long histories are capped at the most recent 500 points.',
    inputSchema: {
      type: 'object',
      properties: {
        series: {
          type: 'string',
          description: 'Series ID, e.g. CPI_ALLITEMS_SA',
        },
        from: {
          type: 'string',
          description: 'Start date YYYY-MM-DD (optional)',
        },
        to: {
          type: 'string',
          description: 'End date YYYY-MM-DD (optional)',
        },
        transform: {
          type: 'string',
          enum: [...TRANSFORM_KINDS],
          description:
            'Unit transform: levels, change, change_yoy, pct_change, yoy, index, log (optional, default levels)',
        },
        frequency: {
          type: 'string',
          enum: ['native', 'quarterly', 'annual'],
          description:
            'Lower-frequency aggregation as calendar-period means (optional, default native)',
        },
      },
      required: ['series'],
    },
  },
  {
    name: 'list_categories',
    description: 'List CRED data categories with the number of series in each.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function ok(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}
function err(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}
function toText(obj: unknown) {
  return {
    content: [
      {
        type: 'text',
        text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2),
      },
    ],
  };
}

async function handle(msg: any) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return err(msg?.id ?? null, -32600, 'Invalid Request');
  }
  const id = msg.id ?? null;
  switch (msg.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: SERVER,
      });
    case 'notifications/initialized':
      return null;
    case 'tools/list':
      return ok(id, { tools: TOOLS });
    case 'tools/call': {
      const name = String(msg.params?.name ?? '');
      const args = msg.params?.arguments ?? {};
      try {
        if (name === 'search_series') {
          const hits = searchSeries(String(args.query ?? ''))
            .slice(0, 25)
            .map((s) => ({
              id: s.id,
              title: s.title,
              source: s.sourceLabel,
              release: s.release,
              units: s.units,
              frequency: s.frequency,
              category: s.category,
            }));
          return ok(id, toText({ count: hits.length, series: hits }));
        }
        if (name === 'get_observations') {
          const sid = String(args.series ?? '');
          const series = getSeries(sid);
          if (!series) return err(id, -32602, `Unknown series: ${sid}`);
          const r = await getObservations(
            sid,
            args.from ? String(args.from) : undefined,
            args.to ? String(args.to) : undefined
          );
          const rawTransform = String(args.transform ?? 'levels');
          const transform: TransformKind = (
            TRANSFORM_KINDS as string[]
          ).includes(rawTransform)
            ? (rawTransform as TransformKind)
            : 'levels';
          const rawFrequency = String(args.frequency ?? 'native');
          const frequency: FrequencyKind = ['native', 'quarterly', 'annual'].includes(
            rawFrequency
          )
            ? (rawFrequency as FrequencyKind)
            : 'native';
          // Frequency aggregation first, then the unit transform, exactly
          // like the site chart pipeline. The year-ago lookback follows the
          // effective frequency (4 for quarterly, 1 for annual).
          let obs = r.observations;
          if (frequency !== 'native')
            obs = aggregateFrequency(obs, frequency);
          const periodsPerYear =
            frequency === 'quarterly'
              ? 4
              : frequency === 'annual'
                ? 1
                : periodsPerYearFor(series.frequency);
          const tres = applyTransform(obs, transform, periodsPerYear);
          const capped = tres.data.length > 500;
          return ok(
            id,
            toText({
              series: sid,
              title: series.title,
              units: series.units,
              source: series.sourceLabel,
              asOf: r.asOf,
              cached: r.cached,
              transform,
              frequency,
              ...(tres.note ? { note: tres.note } : {}),
              count: tres.data.length,
              truncated: capped,
              observations: capped
                ? tres.data.slice(-500)
                : tres.data,
            })
          );
        }
        if (name === 'list_categories') {
          const cats = CATEGORIES.map((c) => ({
            slug: c.slug,
            title: c.title,
            series: REGISTRY.filter((s) => s.category === c.slug).length,
          }));
          return ok(id, toText({ count: cats.length, categories: cats }));
        }
        return err(id, -32602, `Unknown tool: ${name}`);
      } catch (e) {
        return err(id, -32000, `Tool failed: ${(e as Error).message}`);
      }
    }
    default:
      return err(id, -32601, `Method not found: ${msg.method}`);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err(null, -32700, 'Parse error'), {
      status: 400,
      headers: CORS,
    });
  }
  try {
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map(handle))).filter(
        (r) => r !== null
      );
      return NextResponse.json(out, { headers: CORS });
    }
    const out = await handle(body);
    if (out === null)
      return new NextResponse(null, { status: 202, headers: CORS });
    return NextResponse.json(out, { headers: CORS });
  } catch (e) {
    return NextResponse.json(
      err(null, -32000, `MCP error: ${(e as Error).message}`),
      { status: 502, headers: CORS }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      name: SERVER.name,
      description:
        'CRED MCP server: Canadian economic data tools (search_series, get_observations, list_categories). This endpoint accepts JSON-RPC 2.0 via POST only.',
    },
    { status: 405, headers: CORS }
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: CORS });
}
