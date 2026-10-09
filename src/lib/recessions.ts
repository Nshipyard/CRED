// Canadian recession shading, per the C.D. Howe Institute Business Cycle Council.
// Start is the first day of the peak month; end is the last day of the trough month.

export interface Recession {
  start: string;
  end: string;
  label: string;
}

export const RECESSIONS: Recession[] = [
  { start: '2020-02-01', end: '2020-04-30', label: 'COVID-19 recession' },
  { start: '2008-10-01', end: '2009-05-31', label: 'Global Financial Crisis' },
  { start: '1990-03-01', end: '1992-04-30', label: 'Early 1990s recession' },
  { start: '1981-06-01', end: '1982-10-31', label: 'Early 1980s recession' },
  { start: '1974-10-01', end: '1975-03-31', label: '1974 recession' },
];
