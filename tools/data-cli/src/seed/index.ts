/** Seed hattının dışa açık yüzeyi — Faz 3.8. */
export type { ColumnBinding } from './seed-sql.js';
export {
  buildCompetitionsUpsertSql,
  buildCountriesUpsertSql,
  buildUpsertSql,
  COMPETITION_BINDINGS,
  COUNTRY_BINDINGS,
  intOrNull,
  jsonbLiteral,
  numericLiteral,
  quote,
  scalarIdByKey,
  textOrNull,
} from './seed-sql.js';
export type { SeedWorldOptions, SeedWorldResult } from './seed-world.js';
export { seedWorld } from './seed-world.js';
export type { CompetitionSeed, CountrySeed } from './world-seed-data.js';
export {
  competitionNameKey,
  countryNameKey,
  SEED_COMPETITIONS,
  SEED_COUNTRIES,
  SEED_SOURCE,
} from './world-seed-data.js';
