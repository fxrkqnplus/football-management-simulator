/**
 * HAM SQL'İN NÖBETÇİSİ — decision ①'in bedelini ölçülebilir hâle getiren dosya.
 *
 * Seed `SqlExecutor` üzerinden ham SQL yazıyor (§3.4.1'in AÇIK istisnası) ve
 * bunun dürüstçe kabul edilen bedeli şu: **sütun adları tip denetimi görmez.**
 * `"uefa_coeficient"` yazılsaydı `pnpm typecheck` exit 0 verirdi ve hata ancak
 * gerçek veritabanında ortaya çıkardı.
 *
 * Bu dosya o deliği Drizzle'ın **kendi metadatasıyla** kapatıyor: sütun listesi
 * `getTableColumns()`ten okunuyor, elle yazılmıyor. İki yön de sınanıyor —
 * fazla sütun (tabloda yok) ve eksik sütun (`NOT NULL` ama seed yazmıyor).
 *
 * ⚠️ **Asıl değer ikinci yönde ve GELECEĞE dönük:** Faz 4 bu tablolara
 * `NOT NULL` bir sütun eklerse test **kırılır**. 3.7 günlük #37'de bir `sed`
 * `.notNull()`ı sildi ve `typecheck` **exit 0** verdi — çünkü kaybolan şey bir
 * tip değil bir **kısıttı**. Kısıtın nöbetçisi derleyici olamaz; bu test o
 * nöbetçi.
 */
import { competitions, countries } from '@fms/db';
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
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
import type { CountrySeed } from './world-seed-data.js';
import { SEED_COMPETITIONS, SEED_COUNTRIES } from './world-seed-data.js';

/** Bir Drizzle tablosunun veritabanı sütun adları. */
function dbColumnNames(table: Parameters<typeof getTableColumns>[0]): string[] {
  return Object.values(getTableColumns(table)).map((column) => column.name);
}

/**
 * Değer verilmesi ZORUNLU sütunlar: `NOT NULL`, varsayılansız, birincil anahtar
 * olmayan. `external_ids` bu listede **yok** (varsayılanı `'{}'`) ama seed onu
 * yine de yazıyor — gate "en az bunları yaz" diyor, "yalnızca bunları" değil.
 */
function requiredColumnNames(table: Parameters<typeof getTableColumns>[0]): string[] {
  return Object.values(getTableColumns(table))
    .filter((column) => column.notNull && !column.hasDefault && !column.primary)
    .map((column) => column.name);
}

const countriesSql = buildCountriesUpsertSql(SEED_COUNTRIES);
const competitionsSql = buildCompetitionsUpsertSql(SEED_COMPETITIONS);

describe('sütun listesi ŞEMAYLA eşleşiyor — ham SQL`in tip denetimi', () => {
  it('`countries`: seed`in yazdığı her sütun tabloda GERÇEKTEN var', () => {
    const actual = new Set(dbColumnNames(countries));
    for (const binding of COUNTRY_BINDINGS) {
      expect(actual.has(binding.column)).toBe(true);
    }
  });

  it('`competitions`: seed`in yazdığı her sütun tabloda GERÇEKTEN var', () => {
    const actual = new Set(dbColumnNames(competitions));
    for (const binding of COMPETITION_BINDINGS) {
      expect(actual.has(binding.column)).toBe(true);
    }
  });

  it('`countries`: NOT NULL + varsayılansız her sütunu seed YAZIYOR', () => {
    const written = new Set(COUNTRY_BINDINGS.map((binding) => binding.column));
    expect(requiredColumnNames(countries).filter((name) => !written.has(name))).toEqual([]);
  });

  it('`competitions`: NOT NULL + varsayılansız her sütunu seed YAZIYOR', () => {
    const written = new Set(COMPETITION_BINDINGS.map((binding) => binding.column));
    expect(requiredColumnNames(competitions).filter((name) => !written.has(name))).toEqual([]);
  });

  it('denetim zaman damgaları INSERT listesine GİRMİYOR — `defaultNow()` yazsın', () => {
    for (const bindings of [COUNTRY_BINDINGS, COMPETITION_BINDINGS]) {
      const names = bindings.map((binding) => binding.column);
      expect(names).not.toContain('created_at');
      expect(names).not.toContain('updated_at');
      expect(names).not.toContain('id');
    }
  });
});

describe('upsert biçimi', () => {
  it('`ON CONFLICT ("key") DO UPDATE` — `DO NOTHING` DEĞİL', () => {
    expect(countriesSql).toContain('ON CONFLICT ("key") DO UPDATE SET');
    expect(competitionsSql).toContain('ON CONFLICT ("key") DO UPDATE SET');
    expect(countriesSql).not.toContain('DO NOTHING');
    expect(competitionsSql).not.toContain('DO NOTHING');
  });

  it('`updated_at` AÇIKÇA `now()` ile set ediliyor', () => {
    // `defaultNow()` yalnızca INSERT`te işler; DO UPDATE yolunda dokunulmazsa
    // zaman damgası bayat kalır ve "en son ne zaman seed edildi" yanlış cevaplanır.
    expect(countriesSql).toContain('"updated_at" = now()');
    expect(competitionsSql).toContain('"updated_at" = now()');
  });

  it('`updated_at` `EXCLUDED`den GELMİYOR — o, INSERT`in varsayılanını taşırdı', () => {
    expect(countriesSql).not.toContain('EXCLUDED."updated_at"');
    expect(competitionsSql).not.toContain('EXCLUDED."updated_at"');
  });

  it('`created_at` HİÇ güncellenmiyor — satırın doğuş anı bir kez yazılır', () => {
    expect(countriesSql).not.toContain('"created_at"');
    expect(competitionsSql).not.toContain('"created_at"');
  });

  it('çakışma sütununun kendisi güncellenmiyor', () => {
    expect(countriesSql).not.toContain('"key" = EXCLUDED."key"');
  });

  it('`RETURNING "key"` var — yazılan satır sayısı VERİTABANINDAN okunuyor', () => {
    expect(countriesSql.trimEnd().endsWith('RETURNING "key"')).toBe(true);
    expect(competitionsSql.trimEnd().endsWith('RETURNING "key"')).toBe(true);
  });

  it('SET listesi INSERT listesinden TÜRETİLİYOR — ikisi ayrışamaz', () => {
    // Elle yazılsalardı yeni bir sütun birinde unutulabilirdi ve sonuç SESSİZ
    // olurdu: satır eklenir, güncellenmez, seed ikinci koşuda onarmaz.
    const assigned = [...countriesSql.matchAll(/"(\w+)" = EXCLUDED\."\w+"/g)].map(
      (match) => match[1],
    );
    const expected = COUNTRY_BINDINGS.map((binding) => binding.column).filter(
      (name) => name !== 'key',
    );
    expect(assigned).toEqual(expected);
  });

  it('satır sayısı girdiyle aynı', () => {
    expect(countriesSql.split('\n').filter((line) => line.startsWith('    ('))).toHaveLength(6);
    expect(competitionsSql.split('\n').filter((line) => line.startsWith('    ('))).toHaveLength(11);
  });
});

describe('K2 — determinizm', () => {
  it('aynı girdi BİREBİR aynı SQL üretiyor', () => {
    // `Math.random()` veya `Date.now()` olsaydı bu test kırılırdı. Zaman
    // damgası SQL`de `now()` olarak duruyor, yani JS tarafında değil
    // PostgreSQL tarafında değerleniyor — dizge sabit kalıyor.
    expect(buildCountriesUpsertSql(SEED_COUNTRIES)).toBe(countriesSql);
    expect(buildCompetitionsUpsertSql(SEED_COMPETITIONS)).toBe(competitionsSql);
  });

  it('üretilen SQL bir zaman damgası LİTERALİ taşımıyor', () => {
    // Karşı örnek: `now()` geçmesi gerekiyor ama ISO tarih geçmemeli.
    expect(countriesSql).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(competitionsSql).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe('tipli literal üreticileri (günlük #24)', () => {
  it('tek tırnak ikileniyor', () => {
    expect(quote("Türkiye'nin")).toBe("'Türkiye''nin'");
  });

  it('`jsonb` literali cast taşıyor', () => {
    expect(jsonbLiteral({})).toBe(`'{}'::jsonb`);
    expect(jsonbLiteral({ ucl: 4 })).toBe(`'{"ucl":4}'::jsonb`);
  });

  it('`numeric` literali cast taşıyor ve DİZGE kalıyor', () => {
    expect(numericLiteral('94.303')).toBe(`'94.303'::numeric`);
  });

  it('nullable tamsayı TİPLİ NULL dönüyor', () => {
    expect(intOrNull(null)).toBe('NULL::integer');
    expect(intOrNull(1)).toBe('1');
  });

  it('nullable dize TİPLİ NULL dönüyor', () => {
    expect(textOrNull(null)).toBe('NULL::text');
    expect(textOrNull('a')).toBe("'a'");
  });

  it('skaler alt sorgu anahtarla çözüyor, `null` girdide tipli NULL dönüyor', () => {
    expect(scalarIdByKey('countries', 'turkiye')).toBe(
      `(SELECT "id" FROM "countries" WHERE "key" = 'turkiye')`,
    );
    expect(scalarIdByKey('countries', null)).toBe('NULL::integer');
  });

  it('üretilen SQL`de tiplenmemiş çıplak NULL YOK', () => {
    // Çok satırlı VALUES`ta çıplak `NULL` sütun tipini `text`e düşürür ve
    // `integer` hedefte INSERT patlar. Kural: kaybolabilecek her tipe cast.
    expect(countriesSql).not.toMatch(/[(,]\s*NULL\s*[,)]/);
    expect(competitionsSql).not.toMatch(/[(,]\s*NULL\s*[,)]/);
  });
});

describe('Zod, yazan yolun ÜSTÜNDE', () => {
  it('geçersiz `rules` SQL üretimini PATLATIYOR', () => {
    // `competitions.ts` başlığının şartı: *"yazan her yol parse()ten geçer"*.
    // Nöbetçi buradaysa, bozuk bir kural nesnesi veritabanına HİÇ ulaşmaz.
    const [first] = SEED_COMPETITIONS;
    expect(first).toBeDefined();
    expect(() =>
      buildCompetitionsUpsertSql([
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        { ...first!, rules: { ...first!.rules, teamCount: 0 } },
      ]),
    ).toThrow();
  });

  it('geçersiz `externalIds` SQL üretimini PATLATIYOR', () => {
    const [first] = SEED_COUNTRIES;
    expect(first).toBeDefined();
    const broken = { ...first, externalIds: { wikidatta: 'Q1' } } as unknown as CountrySeed;
    expect(() => buildCountriesUpsertSql([broken])).toThrow();
  });
});

describe('`buildUpsertSql` genel sözleşmesi', () => {
  it('tek bağlı ve tek satırlı bir tabloda da doğru biçim üretiyor', () => {
    const sql = buildUpsertSql<{ readonly k: string }>({
      table: 'demo',
      conflictColumn: 'key',
      bindings: [
        { column: 'key', value: (row) => quote(row.k) },
        { column: 'label', value: (row) => quote(row.k.toUpperCase()) },
      ],
      rows: [{ k: 'a' }],
    });

    expect(sql).toBe(
      [
        'INSERT INTO "demo" ("key", "label")',
        'VALUES',
        `    ('a', 'A')`,
        'ON CONFLICT ("key") DO UPDATE SET',
        '    "label" = EXCLUDED."label",',
        '    "updated_at" = now()',
        'RETURNING "key"',
      ].join('\n'),
    );
  });
});
