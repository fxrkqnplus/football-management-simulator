import { describe, expect, it } from 'vitest';

import { compareSchemas, summarizeDifferences } from './compare.js';
import type { ColumnFacts, SchemaFacts, TableFacts } from './types.js';

const column = (name: string, overrides: Partial<ColumnFacts> = {}): ColumnFacts => ({
  name,
  position: 1,
  dataType: 'text',
  maxLength: null,
  numericPrecision: null,
  numericScale: null,
  nullable: false,
  columnDefault: null,
  ...overrides,
});

const table = (name: string, overrides: Partial<TableFacts> = {}): TableFacts => ({
  name,
  columns: [column('id')],
  constraints: [],
  indexes: [],
  ...overrides,
});

const schema = (overrides: Partial<SchemaFacts> = {}): SchemaFacts => ({
  tables: [table('countries')],
  sequences: [],
  ...overrides,
});

describe('compareSchemas', () => {
  it('aynı şemayı özdeş sayar VE bir şeye baktığını gösterir', () => {
    const result = compareSchemas(schema(), schema());
    expect(result.identical).toBe(true);
    // D3 önlemi: "fark yok" ancak bir şeye bakılmışsa anlamlı.
    expect(result.comparedFacts).toBeGreaterThan(0);
  });

  it('boş şemaların karşılaştırması SIFIR olgu bildirir', () => {
    const empty: SchemaFacts = { tables: [], sequences: [] };
    const result = compareSchemas(empty, empty);
    expect(result.identical).toBe(true);
    // Kritik: bu "geçti" değil "hiçbir şeye bakmadı" demektir.
    expect(result.comparedFacts).toBe(0);
  });

  it('kaybolan tabloyu yakalar', () => {
    const result = compareSchemas(schema(), { tables: [], sequences: [] });
    expect(result.identical).toBe(false);
    expect(result.differences).toContainEqual({
      path: 'table.countries',
      before: 'var',
      after: null,
    });
  });

  it('eklenen tabloyu yakalar', () => {
    const result = compareSchemas({ tables: [], sequences: [] }, schema());
    expect(result.differences).toContainEqual({
      path: 'table.countries',
      before: null,
      after: 'var',
    });
  });

  it('kaybolan sütunu yakalar', () => {
    const before = schema({
      tables: [table('countries', { columns: [column('id'), column('key')] })],
    });
    const result = compareSchemas(before, schema());
    expect(result.differences).toContainEqual({
      path: 'table.countries.column.key',
      before: 'var',
      after: null,
    });
  });

  // Sessiz tip kayması: round-trip'in yakalaması gereken en sinsi durum.
  it('değişen sütun TİPİNİ yakalar', () => {
    const after = schema({
      tables: [table('countries', { columns: [column('id', { dataType: 'integer' })] })],
    });
    const result = compareSchemas(schema(), after);
    expect(result.differences).toContainEqual({
      path: 'table.countries.column.id.dataType',
      before: 'text',
      after: 'integer',
    });
  });

  it('düşen NOT NULL kısıtını yakalar', () => {
    const after = schema({
      tables: [table('countries', { columns: [column('id', { nullable: true })] })],
    });
    const result = compareSchemas(schema(), after);
    expect(result.differences).toContainEqual({
      path: 'table.countries.column.id.nullable',
      before: 'false',
      after: 'true',
    });
  });

  it('kaybolan DEFAULT ifadesini yakalar', () => {
    const before = schema({
      tables: [table('countries', { columns: [column('id', { columnDefault: 'now()' })] })],
    });
    const result = compareSchemas(before, schema());
    expect(result.differences).toContainEqual({
      path: 'table.countries.column.id.columnDefault',
      before: 'now()',
      after: null,
    });
  });

  // ON DELETE davranışı kısıt TANIMININ içinde taşınıyor (types.ts gerekçesi).
  it('değişen ON DELETE davranışını yakalar', () => {
    const withCascade = schema({
      tables: [
        table('clubs', {
          constraints: [
            {
              name: 'clubs_country_fk',
              type: 'f',
              definition: 'FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE',
            },
          ],
        }),
      ],
    });
    const withRestrict = schema({
      tables: [
        table('clubs', {
          constraints: [
            {
              name: 'clubs_country_fk',
              type: 'f',
              definition: 'FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT',
            },
          ],
        }),
      ],
    });
    const result = compareSchemas(withCascade, withRestrict);
    expect(result.identical).toBe(false);
    expect(result.differences[0]?.path).toBe('table.clubs.constraint.clubs_country_fk.definition');
  });

  it('kaybolan indeksi yakalar', () => {
    const before = schema({
      tables: [
        table('countries', {
          indexes: [{ name: 'countries_key_idx', definition: 'CREATE INDEX ...' }],
        }),
      ],
    });
    const result = compareSchemas(before, schema());
    expect(result.differences).toContainEqual({
      path: 'table.countries.index.countries_key_idx',
      before: 'var',
      after: null,
    });
  });

  // Sequence TANIMI karşılaştırılır; konumu (last_value) types.ts'te bilerek dışarıda.
  it('değişen sequence tanımını yakalar', () => {
    const seq = {
      name: 'countries_id_seq',
      dataType: 'integer',
      startValue: '1',
      minimumValue: '1',
      maximumValue: '2147483647',
      increment: '1',
      cycle: 'NO',
    };
    const before = schema({ sequences: [seq] });
    const after = schema({ sequences: [{ ...seq, increment: '2' }] });
    const result = compareSchemas(before, after);
    expect(result.differences).toContainEqual({
      path: 'sequence.countries_id_seq.increment',
      before: '1',
      after: '2',
    });
  });

  it('tablo SIRASINDAN etkilenmez, ada göre eşleştirir', () => {
    const a = schema({ tables: [table('a'), table('b')] });
    const b = schema({ tables: [table('b'), table('a')] });
    expect(compareSchemas(a, b).identical).toBe(true);
  });
});

describe('summarizeDifferences', () => {
  it('fark yokken karşılaştırılan olgu sayısını da söyler', () => {
    const summary = summarizeDifferences(compareSchemas(schema(), schema()));
    expect(summary).toMatch(/^fark yok \(\d+ olgu karşılaştırıldı\)$/);
  });

  it('farkları okunabilir biçimde listeler', () => {
    const summary = summarizeDifferences(compareSchemas(schema(), { tables: [], sequences: [] }));
    expect(summary).toContain('table.countries: var → —');
  });
});
