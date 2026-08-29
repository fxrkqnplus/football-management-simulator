/**
 * Drizzle'ın `meta/NNNN_snapshot.json` dosyasının okunması ve GERÇEK şemayla
 * karşılaştırılabilir hâle getirilmesi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BU, ROUND-TRIP'TEN FARKLI BİR İDDİA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Round-trip (`compare.ts`) şunu kanıtlar: *çevrimden sonra şema, çevrimden
 * öncekiyle aynı.* Buradaki karşılaştırma başka bir şey kanıtlar: *drizzle'ın
 * snapshot'ı gerçek şemayı doğru anlatıyor.* İkincisi olmadan snapshot'ı sonraki
 * fazlarda bir **doğruluk kaynağı** olarak kullanmak temenniye dayanırdı.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⚠️ SNAPSHOT KAYIPLI BİR TEMSİLDİR — kapsam AÇIKÇA yazılıyor
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Ölçüldü (Faz 3.2b, `0000_snapshot.json` ile gerçek PG 18.6 yan yana):
 *
 * | Olgu | Snapshot | Gerçek Postgres |
 * |---|---|---|
 * | `id` sütun tipi | `"serial"` | `integer` + `DEFAULT nextval(...)` |
 * | `countries_id_seq` | **`sequences: {}` — YOK** | var, tam tanımıyla |
 * | `code` tipi | `"varchar(3)"` | `character varying`, `maxLength = 3` |
 * | `NOT NULL` | sütunda `notNull: true` | ayrıca `pg_constraint`te (PG17+) |
 *
 * Yani snapshot **drizzle'ın soyutlaması**, Postgres'in gerçeği değil. Bu
 * karşılaştırmanın kapsamı bu yüzden dar tutuldu ve darlığı **yazılı**:
 *
 *   ✅ tablo adları · ✅ sütun adları · ✅ sütun sırası · ✅ `NOT NULL` ·
 *   ✅ birincil anahtar sütunu · ✅ benzersizlik kısıtlarının adı ve sütunları
 *   ❌ SQL tipleri (soyutlama farkı) · ❌ sequence'lar (snapshot taşımıyor) ·
 *   ❌ `DEFAULT` ifadeleri (`now()` ↔ `now()` tutar ama `serial` tutmaz) ·
 *   ❌ indeks tanımları
 *
 * **Kapsamın yazılı olmaması, bu karşılaştırmayı D3'e çevirirdi:** kapsamlı
 * görünen ama azına bakan bir denetim, "snapshot doğrulandı" izlenimi verirken
 * tipin sessizce kaymasını kaçırırdı.
 */
import { ValidationError } from '@fms/shared';
import { z } from 'zod';

import type { SchemaFacts } from './types.js';

const columnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  primaryKey: z.boolean(),
  notNull: z.boolean(),
  default: z.unknown().optional(),
});

const uniqueSchema = z.object({
  name: z.string().min(1),
  columns: z.array(z.string().min(1)),
});

const tableSchema = z.object({
  name: z.string().min(1),
  schema: z.string(),
  columns: z.record(z.string(), columnSchema),
  uniqueConstraints: z.record(z.string(), uniqueSchema).default({}),
});

const snapshotSchema = z.object({
  version: z.string().min(1),
  dialect: z.literal('postgresql'),
  tables: z.record(z.string(), tableSchema),
});

export type DrizzleSnapshot = z.infer<typeof snapshotSchema>;

/** Snapshot DIŞ GİRDİDİR (diskten okunur) — Zod ile doğrulanır (CLAUDE.md §1.3). */
export function parseDrizzleSnapshot(raw: string): DrizzleSnapshot {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    throw new ValidationError({
      message: 'Drizzle snapshot geçerli JSON değil',
      code: 'schemaState.snapshotNotJson',
      cause,
    });
  }
  const result = snapshotSchema.safeParse(json);
  if (!result.success) {
    throw new ValidationError({
      message: 'Drizzle snapshot şemaya uymuyor',
      code: 'schemaState.snapshotInvalid',
      context: { issue: result.error.issues[0]?.message ?? 'bilinmeyen' },
    });
  }
  return result.data;
}

/** Snapshot'ın ve gerçek şemanın ORTAK dilinde bir olgu. */
export interface ComparableFact {
  readonly path: string;
  readonly value: string;
}

/** Snapshot'ı karşılaştırılabilir olgulara indirger (kapsam: başlıktaki tablo). */
export function snapshotToFacts(snapshot: DrizzleSnapshot): readonly ComparableFact[] {
  const facts: ComparableFact[] = [];

  for (const table of Object.values(snapshot.tables)) {
    facts.push({ path: `table.${table.name}`, value: 'var' });

    const columnNames = Object.values(table.columns).map((column) => column.name);
    facts.push({
      path: `table.${table.name}.columnNames`,
      value: [...columnNames].sort().join(','),
    });

    for (const column of Object.values(table.columns)) {
      facts.push({
        path: `table.${table.name}.column.${column.name}.notNull`,
        value: String(column.notNull),
      });
      if (column.primaryKey) {
        facts.push({ path: `table.${table.name}.primaryKeyColumn`, value: column.name });
      }
    }

    for (const unique of Object.values(table.uniqueConstraints)) {
      facts.push({
        path: `table.${table.name}.unique.${unique.name}`,
        value: [...unique.columns].sort().join(','),
      });
    }
  }

  return facts.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Gerçek şemayı AYNI dilde olgulara indirger.
 *
 * `serial` sorunu burada çözülüyor: gerçek şemada `id` `integer`dır ve tip
 * karşılaştırmaya **hiç girmiyor** (başlıktaki kapsam tablosu). Karşılaştırılan
 * şey sütunun **varlığı, sırası, `NOT NULL`u ve anahtar rolü**.
 */
export function realSchemaToFacts(real: SchemaFacts): readonly ComparableFact[] {
  const facts: ComparableFact[] = [];

  for (const table of real.tables) {
    facts.push({ path: `table.${table.name}`, value: 'var' });
    facts.push({
      path: `table.${table.name}.columnNames`,
      value: table.columns
        .map((column) => column.name)
        .sort()
        .join(','),
    });

    for (const column of table.columns) {
      facts.push({
        path: `table.${table.name}.column.${column.name}.notNull`,
        value: String(!column.nullable),
      });
    }

    for (const constraint of table.constraints) {
      if (constraint.type === 'p') {
        const match = /PRIMARY KEY \(([^)]+)\)/.exec(constraint.definition);
        if (match?.[1] !== undefined) {
          for (const column of match[1].split(',')) {
            facts.push({
              path: `table.${table.name}.primaryKeyColumn`,
              value: column.trim().replace(/"/g, ''),
            });
          }
        }
      }
      if (constraint.type === 'u') {
        const match = /UNIQUE \(([^)]+)\)/.exec(constraint.definition);
        if (match?.[1] !== undefined) {
          facts.push({
            path: `table.${table.name}.unique.${constraint.name}`,
            value: match[1]
              .split(',')
              .map((column) => column.trim().replace(/"/g, ''))
              .sort()
              .join(','),
          });
        }
      }
    }
  }

  return facts.sort((a, b) => a.path.localeCompare(b.path));
}

export interface FactComparison {
  readonly missingInReal: readonly ComparableFact[];
  readonly missingInSnapshot: readonly ComparableFact[];
  readonly mismatched: readonly { path: string; snapshot: string; real: string }[];
  readonly agreed: number;
  readonly consistent: boolean;
}

/** İki olgu kümesini karşılaştırır. `agreed` sıfırsa karşılaştırma değersizdir. */
export function compareSnapshotToReal(
  snapshotFacts: readonly ComparableFact[],
  realFacts: readonly ComparableFact[],
): FactComparison {
  const realByPath = new Map(realFacts.map((fact) => [fact.path, fact]));
  const snapshotByPath = new Map(snapshotFacts.map((fact) => [fact.path, fact]));

  const missingInReal: ComparableFact[] = [];
  const mismatched: { path: string; snapshot: string; real: string }[] = [];
  let agreed = 0;

  for (const fact of snapshotFacts) {
    const real = realByPath.get(fact.path);
    if (real === undefined) {
      missingInReal.push(fact);
      continue;
    }
    if (real.value !== fact.value) {
      mismatched.push({ path: fact.path, snapshot: fact.value, real: real.value });
      continue;
    }
    agreed += 1;
  }

  const missingInSnapshot = realFacts.filter((fact) => !snapshotByPath.has(fact.path));

  return {
    missingInReal,
    missingInSnapshot,
    mismatched,
    agreed,
    consistent:
      missingInReal.length === 0 && missingInSnapshot.length === 0 && mismatched.length === 0,
  };
}
