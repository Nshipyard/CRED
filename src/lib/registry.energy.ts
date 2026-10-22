// GENERATED FILE — do not edit by hand.
// Produced by the energy ingestion run (cred-energy-ingest/06-codegen.mjs)
// from 4030 verified StatCan WDS vectors in subject 25 (energy).
// Every entry passed the live verification gate. Re-running the energy
// pipeline overwrites these registry.energy files (never registry.generated).
import type { SeriesMeta } from './registry';

import { ENERGY_GENERATED_SERIES_PART0 } from './registry.energy.0';
import { ENERGY_GENERATED_SERIES_PART1 } from './registry.energy.1';
import { ENERGY_GENERATED_SERIES_PART2 } from './registry.energy.2';
import { ENERGY_GENERATED_SERIES_PART3 } from './registry.energy.3';

export const ENERGY_GENERATED_SERIES: SeriesMeta[] = [
  ...ENERGY_GENERATED_SERIES_PART0,
  ...ENERGY_GENERATED_SERIES_PART1,
  ...ENERGY_GENERATED_SERIES_PART2,
  ...ENERGY_GENERATED_SERIES_PART3,
];
