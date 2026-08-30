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

  /**
   * ⚠️ **BİLEŞİK PK — 4.6'DA AÇILAN KÖRLÜĞÜN NEGATİF TESTİ.**
   *
   * `drizzle-kit` tek sütunlu bir PK'yi sütunun `primaryKey: true` alanında
   * yazıyor, **bileşik** olanı ayrı bir `compositePrimaryKeys` nesnesinde — ve o
   * durumda her sütunun `primaryKey`i **`false`**. Genişletmeden önce
   * `snapshotToFacts` bileşik PK taşıyan bir tabloda **sıfır** anahtar olgusu
   * üretiyordu ve gerçek şema tarafı iki olgu üretiyordu.
   *
   * ⚠️ **Bu test o genişletmeyi KANITLIYOR, varsaymıyor** (D3). 4.3'ün `udtName`
   * deseninin birebir tekrarı: yeni bir yapı türü şemaya girdiğinde
   * karşılaştırıcının onu gerçekten okuduğu ancak koşan bir iddiayla bilinir.
   */
  it('BİLEŞİK PK snapshot tarafında OKUNUYOR — `compositePrimaryKeys` alanı', () => {
    const composite = JSON.stringify({
      version: '7',
      dialect: 'postgresql',
      tables: {
        'public.player_traits': {
          name: 'player_traits',
          schema: '',
          columns: {
            player_id: { name: 'player_id', type: 'integer', primaryKey: false, notNull: true },
            trait_code: { name: 'trait_code', type: 'text', primaryKey: false, notNull: true },
          },
          compositePrimaryKeys: {
            player_traits_player_id_trait_code_pk: {
              name: 'player_traits_player_id_trait_code_pk',
              columns: ['player_id', 'trait_code'],
            },
          },
        },
      },
    });

    const facts = snapshotToFacts(parseDrizzleSnapshot(composite));
    const keyFacts = facts.filter((fact) => fact.path === 'table.player_traits.primaryKeyColumns');
    // Hiçbir sütunun `primaryKey`i true DEĞİL — olgu yalnızca
    // `compositePrimaryKeys`ten gelebilir.
    //
    // ⚠️ **TEK OLGU, sütun başına bir tane DEĞİL** — ve bu ayrım 4.6'da
    // ölçülerek bulundu: `compareSnapshotToReal` yolları bir `Map`e koyuyor,
    // yani tekrarlanan bir yolda **sonuncusu kazanıyor** ve öncekiler sessizce
    // kayboluyor. Sütun listesi bu yüzden `columnNames` gibi tek bir değerde
    // birleştiriliyor.
    expect(keyFacts).toHaveLength(1);
    expect(keyFacts[0]?.value).toBe('player_id,trait_code');
  });

  it('BİLEŞİK PK iki tarafta AYNI dili konuşuyor — snapshot ↔ gerçek TUTARLI', () => {
    const composite = JSON.stringify({
      version: '7',
      dialect: 'postgresql',
      tables: {
        'public.player_traits': {
          name: 'player_traits',
          schema: '',
          columns: {
            player_id: { name: 'player_id', type: 'integer', primaryKey: false, notNull: true },
            trait_code: { name: 'trait_code', type: 'text', primaryKey: false, notNull: true },
          },
          compositePrimaryKeys: {
            player_traits_player_id_trait_code_pk: {
              name: 'player_traits_player_id_trait_code_pk',
              columns: ['player_id', 'trait_code'],
            },
          },
        },
      },
    });

    const realComposite: SchemaFacts = {
      tables: [
        {
          name: 'player_traits',
          columns: [
            { ...ID_COLUMN, name: 'player_id', columnDefault: null },
            { ...KEY_COLUMN, name: 'trait_code' },
          ],
          constraints: [
            {
              name: 'player_traits_player_id_trait_code_pk',
              type: 'p',
              definition: 'PRIMARY KEY (player_id, trait_code)',
            },
          ],
          indexes: [],
        },
      ],
      sequences: [],
    };

    const result = compareSnapshotToReal(
      snapshotToFacts(parseDrizzleSnapshot(composite)),
      realSchemaToFacts(realComposite),
    );
    expect(result.mismatched).toEqual([]);
    expect(result.missingInSnapshot).toEqual([]);
    expect(result.missingInReal).toEqual([]);
    expect(result.consistent).toBe(true);
  });

  /**
   * ⚠️ **VE KAPSAM İKİ YÖNLÜ SINANIYOR: bileşik PK'nin bir SÜTUNU kaybolursa
   * tutarsızlık görünüyor.** Yukarıdaki iki test pozitif; tek başlarına
   * *"karşılaştırıcı her şeyi tutarlı sayıyor"* durumundan ayırt edilemezlerdi.
   */
  it('NEGATİF — bileşik PK`nin bir sütunu snapshot`ta eksikse TUTARSIZ', () => {
    const truncated = JSON.stringify({
      version: '7',
      dialect: 'postgresql',
      tables: {
        'public.player_traits': {
          name: 'player_traits',
          schema: '',
          columns: {
            player_id: { name: 'player_id', type: 'integer', primaryKey: false, notNull: true },
            trait_code: { name: 'trait_code', type: 'text', primaryKey: false, notNull: true },
          },
          compositePrimaryKeys: {
            player_traits_player_id_trait_code_pk: {
              name: 'player_traits_player_id_trait_code_pk',
              // `trait_code` BİLEREK eksik — sessiz bir daralma.
              columns: ['player_id'],
            },
          },
        },
      },
    });

    const realComposite: SchemaFacts = {
      tables: [
        {
          name: 'player_traits',
          columns: [
            { ...ID_COLUMN, name: 'player_id', columnDefault: null },
            { ...KEY_COLUMN, name: 'trait_code' },
          ],
          constraints: [
            {
              name: 'player_traits_player_id_trait_code_pk',
              type: 'p',
              definition: 'PRIMARY KEY (player_id, trait_code)',
            },
          ],
          indexes: [],
        },
      ],
      sequences: [],
    };

    const result = compareSnapshotToReal(
      snapshotToFacts(parseDrizzleSnapshot(truncated)),
      realSchemaToFacts(realComposite),
    );
    expect(result.consistent).toBe(false);
    // Fark artık bir **uyuşmazlık** (aynı yol, farklı değer), bir eksiklik
    // değil — tek olguya geçmenin doğrudan sonucu ve daha keskin bir teşhis:
    // hangi sütunun kaybolduğu iki listenin farkından okunuyor.
    expect(result.mismatched).toEqual([
      {
        path: 'table.player_traits.primaryKeyColumns',
        snapshot: 'player_id',
        real: 'player_id,trait_code',
      },
    ]);
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
