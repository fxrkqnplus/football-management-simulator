export type { SchemaComparison } from './compare.js';
export { compareSchemas, summarizeDifferences } from './compare.js';
export type { ComparableFact, DrizzleSnapshot, FactComparison } from './drizzle-snapshot.js';
export {
  compareSnapshotToReal,
  parseDrizzleSnapshot,
  realSchemaToFacts,
  snapshotToFacts,
} from './drizzle-snapshot.js';
export type { ErDiagramCounts } from './er-diagram.js';
export {
  countErDiagram,
  extractMermaidBlock,
  mermaidTypeName,
  renderErDiagram,
} from './er-diagram.js';
export type { ForeignKeyNullability } from './foreign-key-nullability.js';
export { foreignKeyNullability } from './foreign-key-nullability.js';
export { introspectSchema, readSequencePosition } from './introspect.js';
export type {
  ColumnFacts,
  ConstraintFacts,
  IndexFacts,
  SchemaDifference,
  SchemaFacts,
  SequenceFacts,
  TableFacts,
} from './types.js';
