import { describe, expect, it } from 'vitest';

import {
  compareSnapshotToReal,
  parseDrizzleSnapshot,
  realSchemaToFacts,
  snapshotToFacts,
} from './drizzle-snapshot.js';
import type { ColumnFacts, SchemaFacts, TableFacts } from './types.js';

const SNAPSHOT = JSON.stringify({
  version: '7',
  dialect: 'postgresql',
  tables: {
    'public.countries': {
      name: 'countries',
      schema: '',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        key: { name: 'key', type: 'text', primaryKey: false, notNull: true },
      },
      uniqueConstraints: {
        countries_key_unique: {
          name: 'countries_key_unique',
          nullsNotDistinct: false,
          columns: ['key'],
        },
      },
    },
  },
});

/** Gerçek şemanın `serial` karşılığı: `integer` + `nextval(...)` (3.2b'de ölçüldü). */
const ID_COLUMN: ColumnFacts = {
  name: 'id',
  position: 1,
  dataType: 'integer',
  udtName: 'int4',
  maxLength: null,
  numericPrecision: '32',
  numericScale: '0',
  nullable: false,
  columnDefault: "nextval('countries_id_seq'::regclass)",
};

const KEY_COLUMN: ColumnFacts = {
  name: 'key',
  position: 2,
  dataType: 'text',
  udtName: 'text',
  maxLength: null,
  numericPrecision: null,
  numericScale: null,
  nullable: false,
  columnDefault: null,
};

const REAL_TABLE: TableFacts = {
  name: 'countries',
  columns: [ID_COLUMN, KEY_COLUMN],
  constraints: [
    { name: 'countries_pkey', type: 'p', definition: 'PRIMARY KEY (id)' },
    { name: 'countries_key_unique', type: 'u', definition: 'UNIQUE (key)' },
  ],
  indexes: [],
};

const REAL: SchemaFacts = {
  tables: [REAL_TABLE],
  sequences: [
    {
      name: 'countries_id_seq',
      dataType: 'integer',
      startValue: '1',
      minimumValue: '1',
      maximumValue: '2147483647',
      increment: '1',
      cycle: 'NO',
    },
  ],
};

describe('parseDrizzleSnapshot', () => {
  it('geçerli snapshot’ı ayrıştırır', () => {
    expect(Object.keys(parseDrizzleSnapshot(SNAPSHOT).tables)).toEqual(['public.countries']);
  });

  it('JSON olmayan girdiyi tipli hatayla reddeder', () => {
    expect(() => parseDrizzleSnapshot('{bozuk')).toThrow(
      expect.objectContaining({ code: 'schemaState.snapshotNotJson' }),
    );
  });

  it('postgresql olmayan lehçeyi reddeder', () => {
    const foreign = JSON.stringify({ version: '7', dialect: 'mysql', tables: {} });
    expect(() => parseDrizzleSnapshot(foreign)).toThrow(
      expect.objectContaining({ code: 'schemaState.snapshotInvalid' }),
    );
  });
});

describe('snapshot ↔ gerçek şema tutarlılığı', () => {
  it('aynı şemayı anlatan snapshot ve gerçek durum TUTARLI çıkar', () => {
    const result = compareSnapshotToReal(
      snapshotToFacts(parseDrizzleSnapshot(SNAPSHOT)),
      realSchemaToFacts(REAL),
    );
    expect(result.consistent).toBe(true);
    // Yine D3: "tutarlı" ancak bir şey üzerinde anlaşıldıysa anlamlı.
    expect(result.agreed).toBeGreaterThan(0);
  });

  // ⚠️ KAPSAM KANITI. Snapshot `serial` diyor, gerçek `integer` — ve bu fark
  // BİLEREK karşılaştırmaya girmiyor (drizzle-snapshot.ts başlığındaki tablo).
  // Test bunu sabitliyor: kapsam sessizce genişler veya daralırsa kırılır.
  it('SQL tipi karşılaştırmaya GİRMİYOR — serial ↔ integer tutarsızlık saymaz', () => {
    const facts = snapshotToFacts(parseDrizzleSnapshot(SNAPSHOT));
    expect(facts.some((fact) => fact.path.includes('.type'))).toBe(false);
    expect(facts.some((fact) => fact.value === 'serial')).toBe(false);
  });

  it('snapshot sequence taşımıyor — gerçek şemadaki sequence de olgulara girmiyor', () => {
    const realFacts = realSchemaToFacts(REAL);
    expect(realFacts.some((fact) => fact.path.startsWith('sequence'))).toBe(false);
  });

  it('gerçek şemada EKSİK bir sütunu tutarsızlık sayar', () => {
    const missing: SchemaFacts = {
      ...REAL,
      tables: [{ ...REAL_TABLE, columns: [ID_COLUMN] }],
    };
    const result = compareSnapshotToReal(
      snapshotToFacts(parseDrizzleSnapshot(SNAPSHOT)),
      realSchemaToFacts(missing),
    );
    expect(result.consistent).toBe(false);
  });

  it('NOT NULL uyuşmazlığını yakalar', () => {
    const relaxed: SchemaFacts = {
      ...REAL,
      tables: [
        {
          ...REAL_TABLE,
          columns: [ID_COLUMN, { ...KEY_COLUMN, nullable: true }],
        },
      ],
    };
    const result = compareSnapshotToReal(
      snapshotToFacts(parseDrizzleSnapshot(SNAPSHOT)),
      realSchemaToFacts(relaxed),
    );
    expect(result.mismatched.map((item) => item.path)).toContain(
      'table.countries.column.key.notNull',
    );
  });

  it('benzersizlik kısıtının sütunlarını karşılaştırır', () => {
    const wrongUnique: SchemaFacts = {
      ...REAL,
      tables: [
        {
          ...REAL_TABLE,
          constraints: [
            { name: 'countries_pkey', type: 'p', definition: 'PRIMARY KEY (id)' },
            { name: 'countries_key_unique', type: 'u', definition: 'UNIQUE (id)' },
          ],
        },
      ],
    };
    const result = compareSnapshotToReal(
      snapshotToFacts(parseDrizzleSnapshot(SNAPSHOT)),
      realSchemaToFacts(wrongUnique),
    );
    expect(result.mismatched.map((item) => item.path)).toContain(
      'table.countries.unique.countries_key_unique',
    );
  });
});
