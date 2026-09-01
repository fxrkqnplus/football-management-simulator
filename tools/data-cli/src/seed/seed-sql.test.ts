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
import { competitions, countries, people, players } from '@fms/db';
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { generatePlayerSeeds } from './player-generator.js';
import {
  boolLiteral,
  buildCompetitionsUpsertSql,
  buildCountriesUpsertSql,
  buildPeopleUpsertSql,
  buildPlayersUpsertSql,
  buildUpsertSql,
  COMPETITION_BINDINGS,
  COUNTRY_BINDINGS,
  dateLiteral,
  dateOrNull,
  intOrNull,
  jsonbLiteral,
  numericLiteral,
  PEOPLE_BINDINGS,
  PLAYER_BINDINGS,
  quote,
  scalarIdByKey,
  textArrayLiteral,
  textOrNull,
} from './seed-sql.js';
import type { CountrySeed } from './world-seed-data.js';
import { SEED_COMPETITIONS, SEED_COUNTRIES } from './world-seed-data.js';

/** Küçük bir küme yeter: iddialar biçim hakkında, hacim hakkında değil. */
const PLAYER_SAMPLE = generatePlayerSeeds(25);

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
const peopleSql = buildPeopleUpsertSql(PLAYER_SAMPLE.people);
const playersSql = buildPlayersUpsertSql(PLAYER_SAMPLE.players);

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

  it('`people`: seed`in yazdığı her sütun tabloda GERÇEKTEN var', () => {
    const actual = new Set(dbColumnNames(people));
    for (const binding of PEOPLE_BINDINGS) {
      expect(actual.has(binding.column)).toBe(true);
    }
  });

  it('`players`: seed`in yazdığı her sütun tabloda GERÇEKTEN var', () => {
    const actual = new Set(dbColumnNames(players));
    for (const binding of PLAYER_BINDINGS) {
      expect(actual.has(binding.column)).toBe(true);
    }
  });

  it('`people`: NOT NULL + varsayılansız her sütunu seed YAZIYOR', () => {
    const written = new Set(PEOPLE_BINDINGS.map((binding) => binding.column));
    expect(requiredColumnNames(people).filter((name) => !written.has(name))).toEqual([]);
  });

  it('`players`: NOT NULL + varsayılansız her sütunu seed YAZIYOR', () => {
    // ⚠️ ASIL NÖBETÇİ BU. `players` on bir zorunlu sütun taşıyor ve hiçbiri
    // varsayılanlı değil (`is_newgen` bilerek DEFAULT'suz — `players.ts`).
    // Faz 12 buraya bir `NOT NULL` sütun eklerse test kırılır, seed sessizce
    // eksik yazmaya devam etmez.
    const written = new Set(PLAYER_BINDINGS.map((binding) => binding.column));
    expect(requiredColumnNames(players).filter((name) => !written.has(name))).toEqual([]);
  });

  it('⚠️ KARŞI KONTROL: nöbetçi BOŞ bir listeye bakmıyor', () => {
    // `requiredColumnNames` her zaman boş dönseydi yukarıdaki dört iddia da
    // "kör" geçerdi (D3). Listenin gerçekten dolu olduğu ayrıca ölçülüyor.
    expect(requiredColumnNames(players).length).toBeGreaterThan(0);
    expect(requiredColumnNames(people)).toContain('portrait_seed');
    expect(requiredColumnNames(players)).toContain('current_ability');
  });

  it('denetim zaman damgaları INSERT listesine GİRMİYOR — `defaultNow()` yazsın', () => {
    for (const bindings of [COUNTRY_BINDINGS, COMPETITION_BINDINGS, PEOPLE_BINDINGS]) {
      const names = bindings.map((binding) => binding.column);
      expect(names).not.toContain('created_at');
      expect(names).not.toContain('updated_at');
      expect(names).not.toContain('id');
    }
    const playerNames = PLAYER_BINDINGS.map((binding) => binding.column);
    expect(playerNames).not.toContain('created_at');
    expect(playerNames).not.toContain('updated_at');
    expect(playerNames).not.toContain('id');
  });

  it('⚠️ `players` §3.1.0 SÜTUNLARINI TAŞIMIYOR — `key`/`source`/`external_ids` yok', () => {
    // `data-pack-columns.ts`in ölçülmüş listesi. Bu, çakışma sütununun neden
    // `person_id` olduğunun da gerekçesi.
    const names = PLAYER_BINDINGS.map((binding) => binding.column);
    expect(names).not.toContain('key');
    expect(names).not.toContain('source');
    expect(names).not.toContain('external_ids');
    // Karşı örnek: `people` üçünü de taşıyor.
    const peopleNames = PEOPLE_BINDINGS.map((binding) => binding.column);
    expect(peopleNames).toContain('key');
    expect(peopleNames).toContain('source');
    expect(peopleNames).toContain('external_ids');
  });
});

describe('4.9 — oyuncu hattının upsert biçimi', () => {
  it('`people` `ON CONFLICT ("key")`, `players` `ON CONFLICT ("person_id")`', () => {
    expect(peopleSql).toContain('ON CONFLICT ("key") DO UPDATE SET');
    // `players` `key` taşımıyor; `person_id` UNIQUE (4.3'te ölçüldü).
    expect(playersSql).toContain('ON CONFLICT ("person_id") DO UPDATE SET');
    expect(peopleSql).not.toContain('DO NOTHING');
    expect(playersSql).not.toContain('DO NOTHING');
  });

  it('ikisi de `updated_at` = now() yazıyor, `created_at`e HİÇ dokunmuyor', () => {
    for (const sql of [peopleSql, playersSql]) {
      expect(sql).toContain('"updated_at" = now()');
      expect(sql).not.toContain('EXCLUDED."updated_at"');
      expect(sql).not.toContain('"created_at"');
    }
  });

  it('`RETURNING` çakışma sütununu döndürüyor — sayı VERİTABANINDAN okunsun', () => {
    expect(peopleSql.trimEnd().endsWith('RETURNING "key"')).toBe(true);
    expect(playersSql.trimEnd().endsWith('RETURNING "person_id"')).toBe(true);
  });

  it('satır sayısı girdiyle aynı', () => {
    expect(peopleSql.split('\n').filter((line) => line.startsWith('    ('))).toHaveLength(25);
    expect(playersSql.split('\n').filter((line) => line.startsWith('    ('))).toHaveLength(25);
  });

  it('FK`ler ANAHTARLA çözülüyor — kimlikler `serial`, seed onları bilemez', () => {
    expect(peopleSql).toContain('SELECT "id" FROM "countries" WHERE "key" =');
    expect(playersSql).toContain('SELECT "id" FROM "people" WHERE "key" =');
  });

  it('⚠️ 5.000`in 5.000`i SERBEST OYUNCU — `club_id` tipli NULL', () => {
    expect(playersSql).toContain('NULL::integer');
    // `club_id` hiçbir satırda bir alt sorguyla çözülmüyor.
    expect(playersSql).not.toContain('FROM "clubs"');
  });

  it('`is_newgen` `false` — Faz 40`ın üretmediği 5.000 newgen ima edilmiyor', () => {
    expect(playersSql).toContain('false');
    expect(playersSql).not.toContain('true');
  });

  it('üretilen SQL`de tiplenmemiş çıplak NULL YOK', () => {
    expect(peopleSql).not.toMatch(/[(,]\s*NULL\s*[,)]/);
    expect(playersSql).not.toMatch(/[(,]\s*NULL\s*[,)]/);
  });

  it('K2 — aynı girdi BİREBİR aynı SQL, ve zaman damgası LİTERALİ yok', () => {
    expect(buildPeopleUpsertSql(PLAYER_SAMPLE.people)).toBe(peopleSql);
    expect(buildPlayersUpsertSql(PLAYER_SAMPLE.players)).toBe(playersSql);
    expect(peopleSql).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(playersSql).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('SET listesi INSERT listesinden TÜRETİLİYOR — `players` tarafında da', () => {
    const assigned = [...playersSql.matchAll(/"(\w+)" = EXCLUDED\."\w+"/g)].map(
      (match) => match[1],
    );
    const expected = PLAYER_BINDINGS.map((binding) => binding.column).filter(
      (name) => name !== 'person_id',
    );
    expect(assigned).toEqual(expected);
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

  it('`date` literali cast taşıyor, nullable biçimi tipli NULL dönüyor', () => {
    expect(dateLiteral('2006-07-01')).toBe(`'2006-07-01'::date`);
    expect(dateOrNull(null)).toBe('NULL::date');
    expect(dateOrNull('2026-07-01')).toBe(`'2026-07-01'::date`);
  });

  it('`boolean` literali — `is_newgen` DEFAULT taşımıyor, değer ZORUNLU', () => {
    expect(boolLiteral(false)).toBe('false');
    expect(boolLiteral(true)).toBe('true');
  });

  it('`text[]` literali cast taşıyor ve tek tırnak kaçışı orada da geçerli', () => {
    expect(textArrayLiteral(['player'])).toBe(`ARRAY['player']::text[]`);
    expect(textArrayLiteral(['player', 'manager'])).toBe(`ARRAY['player', 'manager']::text[]`);
  });

  it('⚠️ NEGATİF: boş `person_type` SQL üretimini PATLATIYOR', () => {
    // `people_person_type_check` `cardinality > 0` istiyor (4.3'te bilerek).
    // Nöbetçi burada olduğu için boş dizi veritabanına HİÇ ulaşmıyor.
    expect(() => textArrayLiteral([])).toThrow(RangeError);
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
