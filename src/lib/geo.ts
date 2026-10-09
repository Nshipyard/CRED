// Geographic families: series that share a Canada choropleth map view.
// Each family maps province/territory codes to the registry series id that
// carries that region's data. Regions with no series render grey (no data).

export type GeoFamily = 'unemployment-by-province' | 'cpi-by-province';

export interface GeoFamilyMeta {
  title: string;
  units: string;
  source: string;
  members: Record<string, string>;
}

export const GEO_FAMILIES: Record<GeoFamily, GeoFamilyMeta> = {
  'unemployment-by-province': {
    title: 'Unemployment Rate',
    units: 'Percent',
    source: 'Statistics Canada',
    members: {
      NL: 'UNRATE_NL',
      PE: 'UNRATE_PEI',
      NS: 'UNRATE_NS',
      NB: 'UNRATE_NB',
      QC: 'UNRATE_QC',
      ON: 'UNRATE_ON',
      MB: 'UNRATE_MB',
      SK: 'UNRATE_SK',
      AB: 'UNRATE_AB',
      BC: 'UNRATE_BC',
    },
  },
  'cpi-by-province': {
    title: 'Consumer Price Index',
    units: 'Index, 2002=100',
    source: 'Statistics Canada',
    members: {
      QC: 'CPI_QC',
      ON: 'CPI_ON',
      AB: 'CPI_AB',
      BC: 'CPI_BC',
    },
  },
};

export const PROVINCE_NAMES: Record<string, string> = {
  NL: 'Newfoundland and Labrador',
  PE: 'Prince Edward Island',
  NS: 'Nova Scotia',
  NB: 'New Brunswick',
  QC: 'Quebec',
  ON: 'Ontario',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  AB: 'Alberta',
  BC: 'British Columbia',
  YT: 'Yukon',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
};
