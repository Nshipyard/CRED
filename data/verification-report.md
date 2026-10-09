# CRED Series Registry: Verification Report

Verified live on 2026-10-09 against Statistics Canada Web Data Service (WDS)
and Bank of Canada Valet. No FRED data was used at any point.

## Summary

- 104 series in the registry, across all 8 categories.
- 87 mappings verified by live API calls returning recent values (WDS
  getDataFromVectorsAndLatestNPeriods / getDataFromVectorByReferencePeriodRange,
  Valet /observations).
- 17 mappings (all Labour Force Survey, table 14-10-0287-01) verified against
  StatCan's official full-table CSV for the 2026-09-04 release. WDS data and
  metadata endpoints return HTTP 409 ("The product is not released yet") for
  every LFS survey-3701 table during the nightly refresh window (observed
  00:45 to past 02:45 EDT on 2026-10-09). The vector IDs are confirmed present
  in the official CSV with August 2026 values. verify.mjs re-checks them live
  and reports the lock reason instead of silently passing.

Round 2 (2026-10-09): expanded 45 to 104 series. All 59 new mappings were
discovered via WDS getCubeMetadata + getSeriesInfoFromCubePidCoord (vector
titles read from the response, never guessed) and verified live before
inclusion, except the 10 new LFS vectors which were verified against the
official full-table CSV (14100287-eng.zip, 2026-09-04 release) by streaming
the CSV from the zip and matching REF_DATE 2026-08, Estimate, Seasonally
adjusted rows.

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
| PRIME_RATE | Chartered Bank Prime Rate | BoC CHARTERED_BANK_INTEREST | V80691311 | 4.45% (2026-10-07) |
| MORTGAGE_5Y | Conventional 5-Year Mortgage Rate | BoC CHARTERED_BANK_INTEREST | V80691335 | 6.19% (2026-10-07) |
| FXEURCAD | Euro / Canadian Dollar Exchange Rate | BoC FX_RATES_DAILY | FXEURCAD | 1.5950 (2026-10-08) |
| BOND_LONG | Long-Term GoC Bond Yield | BoC bond_yields_benchmark | BD.CDN.LONG.DQ.YLD | 4.30% (2026-10-07) |
| CEER | Canadian Effective Exchange Rate Index | BoC CEER_DAILY | CEER_BROADN | 110.38 (2026-10-08) |
| UNRATE_YOUTH | Youth Unemployment Rate | StatCan 14-10-0287-01 | vector 2062842 (CSV) | 12.9% (2026-08) |
| UNRATE_MEN | Unemployment Rate: Men | StatCan 14-10-0287-01 | vector 2062824 (CSV) | 6.9% (2026-08) |
| UNRATE_WOMEN | Unemployment Rate: Women | StatCan 14-10-0287-01 | vector 2062833 (CSV) | 6.0% (2026-08) |
| EMPRATE_CA | Employment Rate | StatCan 14-10-0287-01 | vector 2062817 (CSV) | 60.8% (2026-08) |
| CONS_HOUSEHOLD | Household Final Consumption Expenditure | StatCan 36-10-0104-01 | vector 62305724 | $1,454,690M chained 2017 SAAR (2026-Q2) |
| INVEST_BUSINESS | Business Gross Fixed Capital Formation | StatCan 36-10-0104-01 | vector 62305733 | $427,991M chained 2017 SAAR (2026-Q2) |
| CONS_GOVERNMENT | Government Final Consumption Expenditure | StatCan 36-10-0104-01 | vector 62305731 | $561,381M chained 2017 SAAR (2026-Q2) |
| INVEST_RESIDENTIAL | Residential Structures Investment | StatCan 36-10-0104-01 | vector 62305734 | $154,556M chained 2017 SAAR (2026-Q2) |
| GDP_MFG | GDP: Manufacturing | StatCan 36-10-0434-02 | vector 65201263 | $201,120M chained 2017 SAAR (2026-07) |
| GDP_CONSTRUCTION | GDP: Construction | StatCan 36-10-0434-02 | vector 65201258 | $171,750M chained 2017 SAAR (2026-07) |
| GDP_WHOLESALE | GDP: Wholesale Trade | StatCan 36-10-0434-02 | vector 65201358 | $130,311M chained 2017 SAAR (2026-07) |
| GDP_RETAIL | GDP: Retail Trade | StatCan 36-10-0434-02 | vector 65201368 | $126,084M chained 2017 SAAR (2026-07) |
| GDP_MINING_OILGAS | GDP: Mining, Quarrying, and Oil and Gas Extraction | StatCan 36-10-0434-02 | vector 65201236 | $123,351M chained 2017 SAAR (2026-07) |
| GDP_FINANCE | GDP: Finance and Insurance | StatCan 36-10-0434-02 | vector 65201407 | $182,756M chained 2017 SAAR (2026-07) |
| GDP_PROF_SERVICES | GDP: Professional, Scientific and Technical Services | StatCan 36-10-0434-02 | vector 65201429 | $168,620M chained 2017 SAAR (2026-07) |
| GDP_REALESTATE | GDP: Real Estate and Rental and Leasing | StatCan 36-10-0434-02 | vector 65201419 | $313,345M chained 2017 SAAR (2026-07) |
| RETAIL_MOTOR_VEHICLES | Retail Sales: Motor Vehicle and Parts Dealers | StatCan 20-10-0056-01 | vector 1446859486 | $19,701,140k SA (2026-07) |
| RETAIL_FOOD_BEVERAGE | Retail Sales: Food and Beverage Retailers | StatCan 20-10-0056-01 | vector 1446859500 | $13,245,835k SA (2026-07) |
| RETAIL_GASOLINE | Retail Sales: Gasoline Stations and Fuel Vendors | StatCan 20-10-0056-01 | vector 1446859526 | $7,345,507k SA (2026-07) |
| RETAIL_ECOMMERCE | Retail E-commerce Sales | StatCan 20-10-0056-01 | vector 1446859484 | $5,494,482k SA (2026-07) |
| CPI_MEDIAN | CPI-median (Bank of Canada Core) | StatCan 18-10-0256-01 | vector 1481215115 | 224.5 (1989=100, 2026-08) |
| CPI_TRIM | CPI-trim (Bank of Canada Core) | StatCan 18-10-0256-01 | vector 1481215116 | 220.5 (1989=100, 2026-08) |
| CPI_ENERGY | CPI: Energy | StatCan 18-10-0004-01 | vector 41691239 | 220.5 (2026-08) |
| CPI_GASOLINE | CPI: Gasoline | StatCan 18-10-0004-01 | vector 41691136 | 252.2 (2026-08) |
| CPI_RENT | CPI: Rent | StatCan 18-10-0004-01 | vector 41691052 | 168.3 (2026-08) |
| CPI_SERVICES | CPI: Services | StatCan 18-10-0004-01 | vector 41691230 | 188.7 (2026-08) |
| CPI_FOOD_SA | CPI: Food (Seasonally Adjusted) | StatCan 18-10-0006-01 | vector 41690915 | 202.6 (2026-08) |
| CPI_TRANSPORT_SA | CPI: Transportation (Seasonally Adjusted) | StatCan 18-10-0006-01 | vector 41690919 | 184.2 (2026-08) |
| INV_BUILDING_TOTAL | Investment in Building Construction | StatCan 34-10-0293-01 | vector 1705315926 | $23,598,050,403 SA (2026-07) |
| INV_BUILDING_RES | Investment in Residential Building Construction | StatCan 34-10-0293-01 | vector 1705315946 | $16,243,369,835 SA (2026-07) |
| INV_BUILDING_NONRES | Investment in Non-residential Building Construction | StatCan 34-10-0293-01 | vector 1705316166 | $7,354,680,568 SA (2026-07) |
| INV_BUILDING_SINGLE | Investment in Single-dwelling Construction | StatCan 34-10-0293-01 | vector 1705315966 | $7,800,318,714 SA (2026-07) |
| INV_BUILDING_MULTI | Investment in Multi-dwelling Construction | StatCan 34-10-0293-01 | vector 1705316066 | $8,443,051,121 SA (2026-07) |
| RENT_VACANCY | Rental Vacancy Rate | StatCan 34-10-0127-01 | vector 733334 | 3.3% (2025) |
| EXPORTS_US | Merchandise Exports to the United States | StatCan 12-10-0011-01 | vector 87008898 | $54,458.0M (2026-08) |
| IMPORTS_US | Merchandise Imports from the United States | StatCan 12-10-0011-01 | vector 87008782 | $33,018.6M (2026-08) |
| TRADE_BALANCE_US | Canada-US Merchandise Trade Balance | StatCan 12-10-0011-01 | vectors 87008898 minus 87008782 | +$21,439.4M (2026-08) |
| EXPORTS_CHINA | Merchandise Exports to China | StatCan 12-10-0011-01 | vector 87008907 | $4,199.5M (2026-08) |
| EXPORTS_EU | Merchandise Exports to the European Union | StatCan 12-10-0011-01 | vector 87008899 | $3,676.2M (2026-08) |
| SERVICES_EXPORTS | Services Exports | StatCan 12-10-0144-01 | vector 1105277795 | $21,147.0M SA (2026-08) |
| SERVICES_IMPORTS | Services Imports | StatCan 12-10-0144-01 | vector 1105277805 | $20,713.0M SA (2026-08) |
| SERVICES_BALANCE | Services Trade Balance | StatCan 12-10-0144-01 | vector 1105277815 | +$434.0M SA (2026-08) |
| UNRATE_MB | Unemployment Rate: Manitoba | StatCan 14-10-0287-01 | vector 2064138 (CSV) | 5.0% (2026-08) |
| UNRATE_SK | Unemployment Rate: Saskatchewan | StatCan 14-10-0287-01 | vector 2064327 (CSV) | 6.0% (2026-08) |
| UNRATE_NS | Unemployment Rate: Nova Scotia | StatCan 14-10-0287-01 | vector 2063382 (CSV) | 6.1% (2026-08) |
| UNRATE_NB | Unemployment Rate: New Brunswick | StatCan 14-10-0287-01 | vector 2063571 (CSV) | 7.3% (2026-08) |
| UNRATE_NL | Unemployment Rate: Newfoundland and Labrador | StatCan 14-10-0287-01 | vector 2063004 (CSV) | 8.6% (2026-08) |
| UNRATE_PEI | Unemployment Rate: Prince Edward Island | StatCan 14-10-0287-01 | vector 2063193 (CSV) | 7.9% (2026-08) |
| CPI_MB | CPI: Manitoba | StatCan 18-10-0004-01 | vector 41692055 | 172.1 (2026-08) |
| CPI_SK | CPI: Saskatchewan | StatCan 18-10-0004-01 | vector 41692191 | 172.0 (2026-08) |
| CPI_NS | CPI: Nova Scotia | StatCan 18-10-0004-01 | vector 41691513 | 177.2 (2026-08) |
| CPI_NB | CPI: New Brunswick | StatCan 18-10-0004-01 | vector 41691648 | 171.9 (2026-08) |
| CPI_NL | CPI: Newfoundland and Labrador | StatCan 18-10-0004-01 | vector 41691244 | 172.4 (2026-08) |
| CPI_PEI | CPI: Prince Edward Island | StatCan 18-10-0004-01 | vector 41691379 | 176.1 (2026-08) |

Plausibility checks passed: unemployment 6.4% (band 6-8%), youth 12.9%
(roughly double), CPI index rising low-single-digits YoY, GDP $2.5T real /
$3.4T nominal, household consumption $1.45T real SAAR, policy rate 2.25%,
prime 4.45%, 5-yr mortgage 6.19%, 10Y 3.94%, USDCAD 1.42, services trade
near balance (+$434M), US exports $54.5B vs imports $33.0B (Aug 2026).

## Category breakdown

- money-banking-finance: 14
- population-employment-labour: 10
- national-accounts: 10
- production-business-activity: 16
- prices: 14
- housing-construction: 8
- international-trade-investment: 11
- provinces-territories-cities: 21

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
- Investment in building construction 34-10-0011-01: inactive
  (non-residential only). 34-10-0175-01: inactive (2010-2023). Used the active
  successor 34-10-0293-01 (verified: total $23.6B SA, Jul 2026).
- 34-10-0013-01: not rental vacancy, it is residential property values.
  Rental vacancy comes from CMHC table 34-10-0127-01 (verified: 3.3%, 2025).
- 36-10-0023-01: balance of payments goods by trading partner, not services
  trade. Services trade comes from monthly table 12-10-0144-01 (verified:
  exports $21.1B, imports $20.7B SA, Aug 2026).
- 36-10-0024-01 (services by principal trading partners): inactive. Not used.
- Retail by store type from 20-10-0008-01: archived (ended 2022-12), already
  noted. Used active table 20-10-0056-01 NAICS members instead.

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
- Round 2 verifier run (2026-10-09, ~03:00 EDT): 87 passed, 17 failed; all 17
  failures are LFS vectors with "WDS returned no series (table may be
  locked)". The 17 are the same mappings verified against the official CSV.
- getSeriesInfoFromCubePidCoord returns results in arbitrary order when given
  a batch; always pair results by the echoed `coordinate` field on the
  response object, not by request order.
- For 12-10-0011-01 the member titles in the series response are authoritative:
  dim2 member 2 is Export (not Import), and principal trading partner IDs are
  2=United States, 3=European Union, 11=China. The getCubeMetadata member
  listing prints members out of memberId order, so do not infer semantics
  from its print order.
- LFS CSV verification method (round 2): download the official full-table zip
  (https://www150.statcan.gc.ca/n1/tbl/csv/14100287-eng.zip, 60MB), stream the
  CSV from the zip with Python (do not extract to /tmp: tmpfs is 512MB and
  the extracted CSV exceeds it), match REF_DATE=2026-08, Statistics=Estimate,
  Data type=Seasonally adjusted, and the target GEO/Gender/Age group. Member
  values observed: Gender "Total - Gender"/"Men+"/"Women+", Age "15 years and
  over"/"15 to 24 years".
- verify.mjs now parses each series' frequency and widens the WDS lookback to
  1500 days for Annual series (the fixed 400-day window misses annual points
  dated January 1, e.g. CMHC rental vacancy vector 733334, latest 2025-01-01).
- Recommendation for the builder: run verify.mjs outside 00:00-08:30 ET when
  StatCan locks tables for the nightly refresh; the 7 LFS mappings should flip
  to PASS then.
