/**
 * İki şema durumunun karşılaştırılması — SAF katman.
 *
 * Round-trip kanıtının kalbi. `up → veri yaz → down → up` çevriminden sonra
 * şemanın **birebir aynı** olduğu iddiası burada sınanır.
 *
 * ⚠️ **Bir karşılaştırıcının "fark yok" demesi, BAKTIĞINI göstermez** (D3). Bu
 * yüzden `compareSchemas` yalnızca farkları değil, **kaç olgu karşılaştırdığını**
 * da döner (`comparedFacts`). Entegrasyon testi o sayının sıfırdan büyük olduğunu
 * ayrıca doğruluyor — aksi hâlde boş bir şemayı boş bir şemayla karşılaştıran bir
 * test de "geçer" ve hiçbir şey kanıtlamaz.
 */
import type {
  ColumnFacts,
  ConstraintFacts,
  IndexFacts,
  SchemaDifference,
  SchemaFacts,
  SequenceFacts,
  TableFacts,
} from './types.js';

export interface SchemaComparison {
  readonly differences: readonly SchemaDifference[];
  readonly identical: boolean;
  /**
   * Karşılaştırılan olgu sayısı — testin gerçekten bir şeye baktığının kanıtı.
   * Sıfırsa karşılaştırma anlamsızdır, "fark yok" sonucu değersizdir.
   */
  readonly comparedFacts: number;
}

interface Counter {
  value: number;
}

function diffMaps<T>(
  before: readonly T[],
  after: readonly T[],
  keyOf: (item: T) => string,
  fieldsOf: (item: T) => Readonly<Record<string, string | number | boolean | null>>,
  pathPrefix: string,
  out: SchemaDifference[],
  counter: Counter,
): void {
  const beforeByKey = new Map(before.map((item) => [keyOf(item), item]));
  const afterByKey = new Map(after.map((item) => [keyOf(item), item]));

  for (const [key, item] of beforeByKey) {
    if (!afterByKey.has(key)) {
      out.push({ path: `${pathPrefix}.${key}`, before: 'var', after: null });
    }
    counter.value += 1;
    void item;
  }
  for (const [key] of afterByKey) {
    if (!beforeByKey.has(key)) {
      out.push({ path: `${pathPrefix}.${key}`, before: null, after: 'var' });
      counter.value += 1;
    }
  }

  for (const [key, beforeItem] of beforeByKey) {
    const afterItem = afterByKey.get(key);
    if (afterItem === undefined) continue;

    const beforeFields = fieldsOf(beforeItem);
    const afterFields = fieldsOf(afterItem);
    for (const field of Object.keys(beforeFields)) {
      const a = beforeFields[field] ?? null;
      const b = afterFields[field] ?? null;
      counter.value += 1;
      if (String(a) !== String(b)) {
        out.push({
          path: `${pathPrefix}.${key}.${field}`,
          before: a === null ? null : String(a),
          after: b === null ? null : String(b),
        });
      }
    }
  }
}

const columnFields = (
  column: ColumnFacts,
): Readonly<Record<string, string | number | boolean | null>> => ({
  position: column.position,
  dataType: column.dataType,
  maxLength: column.maxLength,
  numericPrecision: column.numericPrecision,
  numericScale: column.numericScale,
  nullable: column.nullable,
  columnDefault: column.columnDefault,
});

const constraintFields = (
  constraint: ConstraintFacts,
): Readonly<Record<string, string | number | boolean | null>> => ({
  type: constraint.type,
  definition: constraint.definition,
});

const indexFields = (
  index: IndexFacts,
): Readonly<Record<string, string | number | boolean | null>> => ({
  definition: index.definition,
});

const sequenceFields = (
  sequence: SequenceFacts,
): Readonly<Record<string, string | number | boolean | null>> => ({
  dataType: sequence.dataType,
  startValue: sequence.startValue,
  minimumValue: sequence.minimumValue,
  maximumValue: sequence.maximumValue,
  increment: sequence.increment,
  cycle: sequence.cycle,
});

/**
 * İki şema durumunu karşılaştırır.
 *
 * Sıra duyarsız: tablolar, sütunlar ve kısıtlar **ada göre** eşleştirilir.
 * `information_schema` sıralaması sürüm/istatistik değişimlerinde kayabilir ve
 * bir sıra farkını "şema değişti" sanmak yanlış pozitif üretirdi. Sütunun
 * **sırası** yine de karşılaştırılıyor — ama bir alan olarak (`position`), dizi
 * indisi olarak değil.
 */
export function compareSchemas(before: SchemaFacts, after: SchemaFacts): SchemaComparison {
  const differences: SchemaDifference[] = [];
  const counter: Counter = { value: 0 };

  const beforeTables = new Map(before.tables.map((table) => [table.name, table]));
  const afterTables = new Map(after.tables.map((table) => [table.name, table]));

  for (const [name] of beforeTables) {
    counter.value += 1;
    if (!afterTables.has(name)) {
      differences.push({ path: `table.${name}`, before: 'var', after: null });
    }
  }
  for (const [name] of afterTables) {
    if (!beforeTables.has(name)) {
      counter.value += 1;
      differences.push({ path: `table.${name}`, before: null, after: 'var' });
    }
  }

  for (const [name, beforeTable] of beforeTables) {
    const afterTable: TableFacts | undefined = afterTables.get(name);
    if (afterTable === undefined) continue;

    diffMaps(
      beforeTable.columns,
      afterTable.columns,
      (column) => column.name,
      columnFields,
      `table.${name}.column`,
      differences,
      counter,
    );
    diffMaps(
      beforeTable.constraints,
      afterTable.constraints,
      (constraint) => constraint.name,
      constraintFields,
      `table.${name}.constraint`,
      differences,
      counter,
    );
    diffMaps(
      beforeTable.indexes,
      afterTable.indexes,
      (index) => index.name,
      indexFields,
      `table.${name}.index`,
      differences,
      counter,
    );
  }

  diffMaps(
    before.sequences,
    after.sequences,
    (sequence) => sequence.name,
    sequenceFields,
    'sequence',
    differences,
    counter,
  );

  return {
    differences,
    identical: differences.length === 0,
    comparedFacts: counter.value,
  };
}

/**
 * Farkları tek bir okunabilir dizgeye indirger.
 *
 * Modül **basmaz** (K8) — dizgeyi döner, çağıran `logger`a ya da assert mesajına
 * verir. Boş liste için açıkça "fark yok" der; sessiz boş dizge, testin ne
 * gördüğünü gizlerdi.
 */
export function summarizeDifferences(comparison: SchemaComparison): string {
  if (comparison.differences.length === 0) {
    return `fark yok (${String(comparison.comparedFacts)} olgu karşılaştırıldı)`;
  }
  return comparison.differences
    .map((diff) => `${diff.path}: ${diff.before ?? '—'} → ${diff.after ?? '—'}`)
    .join(' · ');
}
