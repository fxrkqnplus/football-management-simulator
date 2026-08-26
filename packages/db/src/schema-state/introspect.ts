/**
 * Canlı veritabanından derin şema durumu okuma — I/O katmanı, bilerek ince.
 *
 * Karar veren hiçbir şey burada değil; tek iş `information_schema` ve
 * `pg_catalog`'u okuyup `SchemaFacts` üretmek. Karşılaştırma `compare.ts`'te ve
 * saf, çünkü karar mantığının her dallanmasını gerçek bir veritabanıyla sınamak
 * her denemede bir konteyner açılışı (5.592 ms) ederdi.
 *
 * **Neden `pg_get_constraintdef` / `pg_get_indexdef`:** kısıtı ve indeksi elle
 * parçalamak yerine Postgres'in kendi metinsel gösterimi alınıyor. Tek dizge
 * `FOREIGN KEY (x) REFERENCES y(z) ON DELETE CASCADE` hem sütunları hem **`ON
 * DELETE` davranışını** taşıyor; elle çıkarılan bir gösterimde o davranışı
 * unutmak mümkün ve unutulduğu fark edilmez (D3).
 */
import type { SqlExecutor } from '../migrate/executor.js';
import type { ColumnFacts, ConstraintFacts, IndexFacts, SchemaFacts, TableFacts } from './types.js';

/** Karşılaştırmadan çıkarılan şemalar. */
const EXCLUDED_SCHEMAS = ['pg_catalog', 'information_schema'];

interface RawColumn {
  readonly table_name: string;
  readonly column_name: string;
  readonly ordinal_position: number | string;
  readonly data_type: string;
  readonly character_maximum_length: number | string | null;
  readonly numeric_precision: number | string | null;
  readonly numeric_scale: number | string | null;
  readonly is_nullable: string;
  readonly column_default: string | null;
}

interface RawConstraint {
  readonly table_name: string;
  readonly conname: string;
  readonly contype: string;
  readonly definition: string;
}

interface RawIndex {
  readonly table_name: string;
  readonly indexname: string;
  readonly indexdef: string;
}

interface RawSequence {
  readonly sequence_name: string;
  readonly data_type: string;
  readonly start_value: string;
  readonly minimum_value: string;
  readonly maximum_value: string;
  readonly increment: string;
  readonly cycle_option: string;
}

const asText = (value: number | string | null): string | null =>
  value === null ? null : String(value);

/**
 * Verilen şemanın derin durumunu okur.
 *
 * `schemaName` varsayılanı `public`: koşucunun takip tablosu bilerek `fms_meta`
 * altında duruyor (`runner.ts`), yani bu okuma onu **hiç görmüyor** ve her
 * karşılaştırmada elle dışlamak gerekmiyor. O dışlama bir gün unutulurdu.
 */
export async function introspectSchema(
  executor: SqlExecutor,
  schemaName = 'public',
): Promise<SchemaFacts> {
  const schema = schemaName.replace(/'/g, "''");

  const columns = await executor.rows<RawColumn>(`
    SELECT table_name, column_name, ordinal_position, data_type,
           character_maximum_length, numeric_precision, numeric_scale,
           is_nullable, column_default
      FROM information_schema.columns
     WHERE table_schema = '${schema}'
       AND table_schema NOT IN ('${EXCLUDED_SCHEMAS.join("','")}')
     ORDER BY table_name, ordinal_position
  `);

  const constraints = await executor.rows<RawConstraint>(`
    SELECT c.relname AS table_name,
           con.conname,
           con.contype::text AS contype,
           pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = '${schema}'
     ORDER BY c.relname, con.conname
  `);

  const indexes = await executor.rows<RawIndex>(`
    SELECT tablename AS table_name, indexname, indexdef
      FROM pg_indexes
     WHERE schemaname = '${schema}'
     ORDER BY tablename, indexname
  `);

  const sequences = await executor.rows<RawSequence>(`
    SELECT sequence_name, data_type, start_value, minimum_value,
           maximum_value, increment, cycle_option
      FROM information_schema.sequences
     WHERE sequence_schema = '${schema}'
     ORDER BY sequence_name
  `);

  const tableNames = [...new Set(columns.map((column) => column.table_name))].sort();

  const tables: TableFacts[] = tableNames.map((name) => {
    const tableColumns: ColumnFacts[] = columns
      .filter((column) => column.table_name === name)
      .map((column) => ({
        name: column.column_name,
        position: Number(column.ordinal_position),
        dataType: column.data_type,
        maxLength: asText(column.character_maximum_length),
        numericPrecision: asText(column.numeric_precision),
        numericScale: asText(column.numeric_scale),
        nullable: column.is_nullable === 'YES',
        columnDefault: column.column_default,
      }));

    const tableConstraints: ConstraintFacts[] = constraints
      .filter((constraint) => constraint.table_name === name)
      .map((constraint) => ({
        name: constraint.conname,
        type: constraint.contype,
        definition: constraint.definition,
      }));

    const tableIndexes: IndexFacts[] = indexes
      .filter((index) => index.table_name === name)
      .map((index) => ({ name: index.indexname, definition: index.indexdef }));

    return { name, columns: tableColumns, constraints: tableConstraints, indexes: tableIndexes };
  });

  return {
    tables,
    sequences: sequences.map((sequence) => ({
      name: sequence.sequence_name,
      dataType: sequence.data_type,
      startValue: sequence.start_value,
      minimumValue: sequence.minimum_value,
      maximumValue: sequence.maximum_value,
      increment: sequence.increment,
      cycle: sequence.cycle_option,
    })),
  };
}

/**
 * Sequence'ın KONUMUNU okur — karşılaştırmaya girmez, RAPORLANIR.
 *
 * `types.ts` başlığındaki karar: konum veridir, şema değil. Ama dışlanan şeyin
 * **ölçülmemesi** ile **ölçülüp karşılaştırılmaması** ayrı şeyler; bu fonksiyon
 * ikincisini mümkün kılıyor. Entegrasyon testi çevrimin sequence'ı sıfırladığını
 * bu yolla gösteriyor — sessizce geçiştirmek yerine.
 */
export async function readSequencePosition(
  executor: SqlExecutor,
  sequenceName: string,
): Promise<{ lastValue: string; isCalled: boolean } | null> {
  const rows = await executor.rows<{ last_value: number | string; is_called: boolean }>(
    `SELECT last_value, is_called FROM "public"."${sequenceName.replace(/"/g, '""')}"`,
  );
  const row = rows[0];
  if (row === undefined) return null;
  return { lastValue: String(row.last_value), isCalled: row.is_called };
}
