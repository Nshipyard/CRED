'use client';

// Smooth MCP setup UX: prominent endpoint with one-click copy, tabbed
// client configs (Claude Desktop, Muse, generic) each with one-click
// copy JSON, and the tool list.

import { useEffect, useState } from 'react';

type TabId = 'claude-desktop' | 'claude-code' | 'generic';

const TABS: { id: TabId; label: string }[] = [
  { id: 'claude-desktop', label: 'Claude Desktop' },
  { id: 'claude-code', label: 'Muse' },
  { id: 'generic', label: 'Generic' },
];

const TOOL_DOCS = [
  {
    name: 'search_series',
    desc: 'Search series by keyword across titles, descriptions and IDs. Argument: query (string).',
  },
  {
    name: 'get_observations',
    desc: 'Get date/value observations for a series ID. Arguments: series (string), from? (YYYY-MM-DD), to? (YYYY-MM-DD).',
  },
  {
    name: 'list_categories',
    desc: 'List the eight data categories with series counts. No arguments.',
  },
];

export default function McpSetup() {
  const [tab, setTab] = useState<TabId>('claude-desktop');
  const [origin, setOrigin] = useState('https://cred.nshipyard.com');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const endpoint = `${origin}/mcp`;

  const configs: Record<TabId, { title: string; body: string }> = {
    'claude-desktop': {
      title: 'Claude Desktop: paste into Settings → Connectors (or claude_desktop_config.json)',
      body: JSON.stringify(
        { mcpServers: { cred: { url: endpoint } } },
        null,
        2
      ),
    },
    'claude-code': {
      title: 'Muse: paste into .mcp.json in your project root',
      body: JSON.stringify(
        { mcpServers: { cred: { type: 'http', url: endpoint } } },
        null,
        2
      ),
    },
    generic: {
      title: 'Any MCP client: streamable HTTP endpoint',
      body: [
        `Endpoint: ${endpoint}`,
        '',
        'Example JSON-RPC calls:',
        '',
        '# initialize',
        JSON.stringify(
          { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
          null,
          2
        ),
        '',
        '# tools/list',
        JSON.stringify(
          { jsonrpc: '2.0', id: 2, method: 'tools/list' },
          null,
          2
        ),
        '',
        '# tools/call',
        JSON.stringify(
          {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'get_observations',
              arguments: { series: 'CPI_ALLITEMS_SA', from: '2020-01-01' },
            },
          },
          null,
          2
        ),
      ].join('\n'),
    },
  };

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  const active = configs[tab];

  return (
    <div>
      {/* Endpoint */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border hairline bg-white p-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            MCP endpoint
          </p>
          <code className="mt-1 block truncate font-mono text-base text-[#0a0f1e]">
            {endpoint}
          </code>
        </div>
        <button
          onClick={() => copy(endpoint, 'endpoint')}
          className="shrink-0 rounded bg-[#d80621] px-4 py-2 text-sm font-medium text-white"
        >
          {copied === 'endpoint' ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? 'bg-[#0a0f1e] text-white'
                : 'border hairline bg-white text-[#0a0f1e] hover:border-[#d80621]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border hairline bg-white">
        <div className="flex items-center justify-between gap-4 border-b hairline px-5 py-3">
          <h3 className="text-sm font-medium text-[#0a0f1e]">{active.title}</h3>
          <button
            onClick={() => copy(active.body, tab)}
            className="shrink-0 rounded border border-[#0a0f1e] px-3 py-1.5 text-sm font-medium text-[#0a0f1e]"
          >
            {copied === tab ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto whitespace-pre px-5 py-4 font-mono text-[13px] leading-relaxed text-gray-800">
          {active.body}
        </pre>
      </div>

      {/* Tool list */}
      <div className="mt-5 space-y-3">
        {TOOL_DOCS.map((t) => (
          <div key={t.name} className="rounded-xl border hairline bg-white p-5">
            <code className="text-sm font-bold text-[#0a0f1e]">{t.name}</code>
            <p className="mt-1 text-sm text-gray-700">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
