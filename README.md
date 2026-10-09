# CRED: Canadian Research Economic Data

A Canadian FRED. Searchable, chartable, shareable Canadian economic data,
drawn from Statistics Canada and the Bank of Canada, presented in the chart
language people already share on social media.

## The idea

FRED (Federal Reserve Economic Data) made US economic data explorable: one search
box, one chart layout, recession shading, one-click download and share. Canada has
the data but no equivalent front door. CRED is that front door:

- **Series pages** in the FRED chart layout, recolored Canada red, with C.D. Howe
  recession shading and StatCan/BoC provenance on every chart.
- **8 categories** mirroring FRED's taxonomy, mapped to Canadian sources.
- **CRED News**: a discovery and editorial layer for new series and release-day analysis.
- **Public API + MCP connector** so agents and apps can query Canadian macro data
  the same way they query FRED.

## Data sources (verified, keyless, redistribution-friendly)

| Source | Role |
|---|---|
| Statistics Canada Web Data Service (`www150.statcan.gc.ca/t1/wds/rest/`) | Core: LFS, CPI, GDP, trade, retail (~85% of v1). Open Licence allows reuse with attribution. |
| Bank of Canada Valet API (`bankofcanada.ca/valet/`) | Policy rate, bond yields, FX, monetary aggregates. Free reuse with attribution. |
| C.D. Howe Institute Business Cycle Council | Canadian recession peak/trough dates for chart shading. |

Key tables: `14-10-0287-01` unemployment, `18-10-0004-01` CPI, `36-10-0104-01` /
`36-10-0434-02` GDP, `20-10-0008-01` retail, `34-10-0135-01` housing starts.

Design principle: borrow, don't warehouse. StatCan and BoC are the system of record;
CRED keeps the curated series registry, a hot cache, and a revision archive
(StatCan overwrites revisions, so vintages only exist from the day we start collecting).

## Status

Concept stage. Interactive concept mockup and full research brief live with the team.
Build estimate: ~10-12 weeks to the full vision (API + MCP + news + maps), credible
public v1 in ~5 weeks. Not affiliated with the Government of Canada.

Part of [Open Nshipyard](https://github.com/Nshipyard).
