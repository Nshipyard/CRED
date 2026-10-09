# CRED Series Registry: Verification Report

Verified live on 2026-10-09 against Statistics Canada Web Data Service (WDS)
and Bank of Canada Valet. No FRED data was used at any point.

## Summary

- 45 series in the registry, across all 8 categories.
- 38 mappings verified by live API calls returning recent values (WDS
  getDataFromVectorsAndLatestNPeriods / getDataFromVectorByReferencePeriodRange,
  Valet /observations).
- 7 mappings (all Labour Force Survey, table 14-10-0287-01) verified against
  StatCan's official full-table CSV for the 2026-09-04 release. WDS data and
  metadata endpoints return HTTP 409 ("table locked") or "The product is not
  released yet" for every LFS survey-3701 table during the nightly refresh
  window (observed 00:45 to 02:30 EDT). The vector IDs are confirmed present in
  the official CSV with August 2026 values. verify.mjs re-checks them live and
  reports the lock reason instead of silently passing.

## Verified series

| id | title | source | mapping | latest value (date) |
|---|---|---|---|---|
| POLICY_RATE | Bank of Canada Policy Interest Rate | BoC ATABLE_POLICY_INSTRUMENT | STATIC_ATABLE_V39079 | 2.25% (2026-09) |
| OVERNIGHT_RATE | Overnight Money Market Rate | BoC ATABLE_POLICY_INSTRUMENT | V122514 | 2.2789% (2026-09) |
| CORRA | CORRA | BoC CORRA | AVG.INTWO | 2.29% (2026-10-07) |
| BOND_2Y | 2-Year GoC Bond Yield | BoC bond_yields_benchmark | BD.CDN.2YR.DQ.YLD | 3.23% (2026-10-07) |
| BOND_5Y | 5-Year GoC Bond Yield | BoC bond_yields_benchmark | BD.CDN.5YR.DQ.YLD | 3.60% (2026-10-07) |
| BOND_10Y | 10-Year GoC Bond Yield | BoC bond_yields_benchmark | BD.CDN.10YR.DQ.YLD | 3.94% (2026-10-07) |
| TBILL_3M | 3-Month Treasury Bill Yield | BoC MONEY_MARKET | TB.CDN.90D.MID | 2.39% (2026-10-07) |
| M2_PP | M2++ Money Supply | StatCan 10-10-0116-01 | vector 41552801 | $5,323,673M (2026-07) |
| USDCAD | USD/CAD Exchange Rate | BoC FX_RATES_DAILY | FXUSDCAD | 1.4240 (2026-10-08) |
| UNRATE_CA | Unemployment Rate | StatCan 14-10-0287-01 | vector 2062815 (CSV) | 6.4% (2026-08) |
| EMPLOYMENT_CA | Employment | StatCan 14-10-0287-01 | vector 2062811 (CSV) | 21,173.1k (2026-08) |
| PARTRATE_CA | Participation Rate | StatCan 14-10-0287-01 | vector 2062816 (CSV) | 65.0% (2026-08) |
| AVG_HOURLY_EARNINGS | Average Hourly Earnings | StatCan 14-10-0205-01 | vector 1592156 | $32.88/hr (2026-07) |
| JOB_VACANCY_RATE | Job Vacancy Rate | StatCan 14-10-0371-01 | vector 1212389365 | 2.8% (2026-07) |
| EI_BENEFICIARIES | EI Beneficiaries | StatCan 14-10-0009-01 | vector 64540902 | 954,210 (2026-07) |
| GDP_REAL | Real GDP | StatCan 36-10-0104-01 | vector 62305752 | $2,524,127M chained 2017 (2026-Q2) |
| GDP_NOMINAL | Nominal GDP | StatCan 36-10-0104-01 | vector 62305783 | $3,437,720M (2026-Q2) |
| GDP_MONTHLY | Monthly GDP by Industry | StatCan 36-10-0434-02 | vector 65201210 | $2,371,771M SAAR (2026-07) |
| GDP_PER_CAPITA | Real GDP per Capita | StatCan 36-10-0706-01 | vector 1645315579 | $60,944 (2026-Q2) |
| DISP_INCOME_PC | Disposable Income per Capita | StatCan 36-10-0706-01 | vector 1645315586 | $44,914 (2026-Q2) |
| CURRENT_ACCOUNT | Current Account Balance | StatCan 36-10-0018-01 | vector 61915304 | +$8,836M SA (2026-Q2) |
| MFG_SALES_REAL | Real Manufacturing Sales | StatCan 16-10-0013-01 | vector 123263908 | $54,000M (2026-07) |
| RETAIL_SALES | Retail Sales | StatCan 20-10-0056-01 | vector 1446859483 | $73,696,547k SA (2026-07) |
| WHOLESALE_SALES | Wholesale Sales | StatCan 20-10-0074-01 | vector 52367637 | $137,297,173k SA (2026-07) |
| CAP_UTILIZATION | Capacity Utilization | StatCan 16-10-0109-01 | vector 4331081 | 78.5% (2025-Q4) |
| CPI_ALLITEMS_NSA | CPI All-items | StatCan 18-10-0004-01 | vector 41690973 | 169.8 (2026-08) |
| CPI_ALLITEMS_SA | CPI All-items SA | StatCan 18-10-0006-01 | vector 41690914 | 169.3 (2026-08) |
| CPI_SHELTER_SA | CPI: Shelter | StatCan 18-10-0006-01 | vector 41690916 | 190.9 (2026-08) |
| CPI_EXFOODENERGY_SA | CPI ex Food and Energy | StatCan 18-10-0006-01 | vector 41690924 | 158.6 (2026-08) |
| IPPI | Industrial Product Price Index | StatCan 18-10-0265-01 | vector 1230995983 | 148.2 (2026-08) |
| NHPI | New Housing Price Index | StatCan 18-10-0205-01 | vector 111955442 | 120.4 (2026-08) |
| HOUSING_STARTS | Housing Starts | StatCan 34-10-0158-01 | vector 52300157 | 229.0k SAAR (2026-08) |
| BUILDING_PERMITS | Building Permits | StatCan 34-10-0292-01 | vector 1675119645 | $12,190,901k SA (2026-07) |
| EXPORTS | Merchandise Exports | StatCan 12-10-0174-01 | vector 1566934494 | $73,826,334k (2026-08) |
| IMPORTS | Merchandise Imports | StatCan 12-10-0174-01 | vector 1566929544 | $71,736,904k (2026-08) |
| TRADE_BALANCE | Merchandise Trade Balance | StatCan 12-10-0174-01 | vectors 1566934494 minus 1566929544 | +$2,089,430k (2026-08) |
| UNRATE_QC | Unemployment Rate: Quebec | StatCan 14-10-0287-01 | vector 2063760 (CSV) | 5.6% (2026-08) |
| UNRATE_ON | Unemployment Rate: Ontario | StatCan 14-10-0287-01 | vector 2063949 (CSV) | 6.9% (2026-08) |
| UNRATE_AB | Unemployment Rate: Alberta | StatCan 14-10-0287-01 | vector 2064516 (CSV) | 6.8% (2026-08) |
| UNRATE_BC | Unemployment Rate: BC | StatCan 14-10-0287-01 | vector 2064705 (CSV) | 6.5% (2026-08) |
| CPI_QC | CPI: Quebec | StatCan 18-10-0004-01 | vector 41691783 | 166.9 (2026-08) |
| CPI_ON | CPI: Ontario | StatCan 18-10-0004-01 | vector 41691919 | 170.0 (2026-08) |
| CPI_AB | CPI: Alberta | StatCan 18-10-0004-01 | vector 41692327 | 179.2 (2026-08) |
| CPI_BC | CPI: British Columbia | StatCan 18-10-0004-01 | vector 41692462 | 163.8 (2026-08) |
| POPULATION | Population | StatCan 17-10-0009-01 | vector 1 | 41,798,407 (2026-07-01) |

Plausibility checks passed: unemployment 6.4% (band 6-8%), CPI index rising
low-single-digits YoY, GDP $2.5T real / $3.4T nominal, policy rate 2.25%,
10Y 3.94%, USDCAD 1.42.

## Category breakdown

- money-banking-finance: 9
- population-employment-labour: 6
- national-accounts: 6
- production-business-activity: 4
- prices: 6
- housing-construction: 2
- international-trade-investment: 3
- provinces-territories-cities: 9

Featured (At a Glance candidates): UNRATE_CA, CPI_ALLITEMS_SA, GDP_REAL,
POLICY_RATE, USDCAD, BOND_10Y.

## Dropped or corrected

- New motor vehicle sales (20-10-0085-01): series resolves but every value is
  null for Units/SA and the Dollars/SA coordinate 406s. Dropped, no verified data.
- Merchandise trade via 12-10-0099-01: the table's third dimension is US states
  and values match Canada-US bilateral trade, not world trade. Not used; world
  trade comes from 12-10-0174-01 (verified: exports $73.8B, imports $71.7B,
  Aug 2026).
- Retail sales 20-10-0008-01: archived/inactive (ended 2022-12). Used the active
  successor 20-10-0056-01.
- Housing starts 34-10-0135-01: superseded. Used active monthly SAAR table
  34-10-0158-01.
- CPI SA: the suggested PID 18-10-0060-01 does not exist in WDS. The correct
  table is 18-10-0006-01 (verified live).
- Manufacturing sales 16-10-0048-01: has no Canada member (provinces only).
  Used 16-10-0013-01 (real manufacturing sales, Canada-level) instead.
- Job vacancies 14-10-0325-01: archived (ended 2023-07). Used active table
  14-10-0371-01.
- Building permits 34-10-0006-01: archived (ended 2017-12). Used active table
  34-10-0292-01.

## Method notes

- WDS productId is the 8-digit PID without dashes (14-10-0287-01 becomes
  14100287). Coordinates are 10 segments, zero-padded
  (e.g. 1.7.1.1.1.1.0.0.0.0); unpadded coordinates return HTTP 406.
- Coordinate discovery: getCubeMetadata, then pick Canada-level,
  seasonally-adjusted (where offered), headline members by memberId.
- Vector confirmation: getSeriesInfoFromCubePidCoord, then
  getDataFromVectorsAndLatestNPeriods with latestN=3, checking the latest
  value is plausible.
- verify.mjs uses GET getDataFromVectorByReferencePeriodRange with quoted
  comma-joined IDs (per the app builder's verified shape) and Valet
  /observations/<key>/json?recent=3. Second run: 38 passed, 7 failed, all 7
  failures are the LFS vectors with "WDS returned no series (table may be
  locked)".
- Recommendation for the builder: run verify.mjs outside 00:00-08:30 ET when
  StatCan locks tables for the nightly refresh; the 7 LFS mappings should flip
  to PASS then.
