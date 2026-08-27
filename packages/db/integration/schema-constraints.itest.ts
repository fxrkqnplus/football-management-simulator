/**
 * ŞEMA KISITLARININ GERÇEK VERİTABANINDA SINANMASI — Faz 3.4, 3.5'te genişledi.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN AYRI BİR DOSYA, `round-trip.itest.ts`E EKLENMEK YERİNE
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Round-trip **migration'ın doğruluğunu** kanıtlıyor: `down`/`up` çevriminden
 * sonra şema aynı mı. Burada sorulan başka bir şey: **şema doğru olanı yapıyor
 * mu.** Bir CHECK kısıtı yazılmış olabilir ve yine de hiçbir şeyi reddetmiyor
 * olabilir; bir `UNIQUE` yanlış kapsamda olabilir. İkisi karıştırılırsa
 * "migration çalışıyor" cümlesi "şema sağlam" gibi okunur.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HEPSİ NEGATİF — ve bu bilinçli
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `docs/spec/09-quality-protocol.md` §11.5'te ölçülmüş oran var: bir kontrol
 * köreltildiğinde 16 testin **yalnızca 1'i** kırıldı, o da tek negatif testti.
 * Bir kısıtın var olduğunu `pg_constraint`ten okumak onun **çalıştığını**
 * göstermez — sadece yazıldığını gösterir. Burada her kısıt, ihlal eden bir
 * `INSERT` ile sınanıyor: veritabanı REDDEDİYOR mu?
 *
 * Karşı örnek de var: geçerli değerler KABUL ediliyor. İkisi olmadan
 * "her şeyi reddeden" bir kısıttan ayırt edilemezdi (nöbetçi iki yönlü).
 *
 * ⚠️ **TESTLER AYNI VERİTABANINI PAYLAŞIYOR** — `afterEach` temizliği yok
 * (bilinçli: konteyner bir kez kalkıyor, migration bir kez uygulanıyor).
 * Sonucu 3.5'te ölçüldü: global bir `count(*)` iddiası başka bir testin
 * bıraktığı satırı görüp kırıldı. **Kural: bir sayım iddiası her zaman o
 * testin kendi satırlarına daraltılır** (kimlik ya da benzersiz bir anahtar
 * üzerinden), yoksa test sırası bir davranış hâline gelir.
 */
import { fileURLToPath } from 'node:url';

import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorldDb, type WorldDbHandle } from '../src/client/index.js';
import type { SqlExecutor } from '../src/migrate/executor.js';
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { createPostgresExecutor } from '../src/migrate/postgres-executor.js';
import { migrateUp } from '../src/migrate/runner.js';
import { clubFinancesBase } from '../src/schema/club-finances-base.js';
import { COMPETITION_TYPES } from '../src/schema/competitions.js';
import { WORK_PERMIT_RULES } from '../src/schema/countries.js';
import { DATA_SOURCES } from '../src/schema/data-pack-columns.js';
import {
  clubFacilitiesInsertSql,
  clubFinancesInsertSql,
  clubInsertSql,
  type CountryFixture,
  countryInsertSql,
  rivalryInsertSql,
  stadiumInsertSql,
} from './fixtures.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;
/** Drizzle istemcisi — `bigint` eşlemesi yalnızca ORM üzerinden ölçülebilir. */
let world: WorldDbHandle;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:18')
    .withDatabase('fms_test')
    .withUsername('fms')
    .withPassword('fms')
    .start();
  const handle = createPostgresExecutor(container.getConnectionUri());
  executor = handle.executor;
  world = createWorldDb(container.getConnectionUri());
  close = async (): Promise<void> => {
    await handle.close();
    await world.close();
  };
  await migrateUp({ executor, source: createFileMigrationSource(DRIZZLE_DIR), logger });
}, 180_000);

afterAll(async () => {
  await close();
  await container.stop();
}, 60_000);

/**
 * Bir ülke satırı yazar. Yalnızca sınanan sütun değiştirilir — geri kalanı
 * geçerli kalır ki reddin sebebi TEK olsun (3.2b günlük #17).
 */
async function insertCountry(overrides: CountryFixture): Promise<void> {
  await executor.run(countryInsertSql([overrides]));
}

async function constraintDefinition(name: string): Promise<string> {
  const rows = await executor.rows<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = '${name}'`,
  );
  return rows[0]?.def ?? '';
}

describe('⑤ `source` CHECK kısıtı — veritabanı seviyesinde', () => {
  it('kısıt tanımı DATA_SOURCES sabitiyle AYNI değerleri taşıyor', async () => {
    // Sabit tablo ile veritabanı ayrışabilir; eşitlik VARSAYILMIYOR, ölçülüyor.
    const definition = await constraintDefinition('countries_source_check');
    for (const value of DATA_SOURCES) {
      expect(definition).toContain(`'${value}'`);
    }
    // Fazlası da yok: kısıt tam olarak beş literal taşıyor.
    expect(definition.match(/'[a-z]+'/g)).toHaveLength(DATA_SOURCES.length);
  });

  it('GEÇERSİZ source REDDEDİLİYOR', async () => {
    await expect(
      insertCountry({ key: 'k-bad-source', code: 'BS1', source: 'manual' }),
    ).rejects.toThrow(/countries_source_check/);
  });

  it('büyük harfli varyant bile REDDEDİLİYOR — kısıt harf duyarlı', async () => {
    await expect(insertCountry({ key: 'k-bad-case', code: 'BS2', source: 'Pack' })).rejects.toThrow(
      /countries_source_check/,
    );
  });

  it('KARŞI ÖRNEK: beş geçerli değerin hepsi kabul ediliyor', async () => {
    for (const [index, value] of DATA_SOURCES.entries()) {
      await insertCountry({
        key: `k-ok-${value}`,
        code: `O${String(index)}${String(index)}`,
        source: value,
      });
    }
    const rows = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "countries" WHERE "key" LIKE 'k-ok-%'`,
    );
    expect(Number(rows[0]?.n)).toBe(DATA_SOURCES.length);
  });

  it('competitions üzerinde de aynı kısıt var ve reddediyor', async () => {
    await expect(
      executor.run(`
        INSERT INTO "competitions"
          ("key","source","code","name_key","type","reputation","rules",
           "season_start_month","season_end_month")
        VALUES ('c-bad','manual','C_BAD','competition.bad','league',100,'{}'::jsonb,8,5)
      `),
    ).rejects.toThrow(/competitions_source_check/);
  });
});

describe('⑤ diğer KAPALI değer kümeleri', () => {
  it('geçersiz `work_permit_rule_key` REDDEDİLİYOR', async () => {
    await expect(
      insertCountry({ key: 'k-bad-permit', code: 'BP1', workPermitRuleKey: 'schengen' }),
    ).rejects.toThrow(/countries_work_permit_rule_key_check/);
  });

  it('geçersiz `competitions.type` REDDEDİLİYOR — `leauge` yazım hatası sınıfı', async () => {
    await expect(
      executor.run(`
        INSERT INTO "competitions"
          ("key","source","code","name_key","type","reputation","rules",
           "season_start_month","season_end_month")
        VALUES ('c-typo','pack','C_TYPO','competition.typo','leauge',100,'{}'::jsonb,8,5)
      `),
    ).rejects.toThrow(/competitions_type_check/);
  });

  it('kısıt tanımları sabit tablolarla AYNI değerleri taşıyor', async () => {
    const permit = await constraintDefinition('countries_work_permit_rule_key_check');
    for (const value of WORK_PERMIT_RULES) expect(permit).toContain(`'${value}'`);

    const type = await constraintDefinition('competitions_type_check');
    for (const value of COMPETITION_TYPES) expect(type).toContain(`'${value}'`);
  });

  it('`confederation` AÇIK UÇLU — CHECK yok, serbest değer kabul ediliyor', async () => {
    // Karşıt kanıt: kapalı küme ile açık uçlu liste arasındaki ayrım gerçek.
    await executor.run(`
      ${countryInsertSql([
        {
          key: 'k-conmebol',
          code: 'BRA',
          confederation: 'CONMEBOL',
          footballLevel: 88,
          uefaCoefficient: '0.000',
          currencyCode: 'BRL',
        },
      ])}
    `);
    const rows = await executor.rows<{ confederation: string }>(
      `SELECT "confederation" FROM "countries" WHERE "key" = 'k-conmebol'`,
    );
    expect(rows[0]?.confederation).toBe('CONMEBOL');
  });
});

describe('⑥ `key` benzersizliği TABLO BAŞINA (spec/01 §3.1.0)', () => {
  it('aynı `key` iki FARKLI tabloda yan yana durabiliyor', async () => {
    await insertCountry({ key: 'ortak-anahtar', code: 'OA1' });
    await executor.run(`
      INSERT INTO "competitions"
        ("key","source","code","name_key","type","reputation","rules",
         "season_start_month","season_end_month")
      VALUES ('ortak-anahtar','pack','C_ORTAK','competition.ortak','domestic_cup',
              100,'{}'::jsonb,8,5)
    `);

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT (SELECT count(*) FROM "countries"    WHERE "key" = 'ortak-anahtar')
           + (SELECT count(*) FROM "competitions" WHERE "key" = 'ortak-anahtar') AS n
    `);
    expect(Number(rows[0]?.n)).toBe(2);
  });

  it('aynı `key` AYNI tabloda İKİ KEZ olamıyor', async () => {
    await insertCountry({ key: 'tekil-anahtar', code: 'TA1' });
    await expect(insertCountry({ key: 'tekil-anahtar', code: 'TA2' })).rejects.toThrow(
      /countries_key_unique/,
    );
  });

  it('benzersizlik kısıtı tablo adını taşıyor — global DEĞİL', async () => {
    const rows = await executor.rows<{ conname: string; rel: string }>(`
      SELECT conname, conrelid::regclass::text AS rel
        FROM pg_constraint
       WHERE contype = 'u' AND conname LIKE '%_key_unique'
       ORDER BY conname
    `);
    expect(rows.map((row) => `${row.rel}:${row.conname}`)).toEqual([
      'clubs:clubs_key_unique',
      'competitions:competitions_key_unique',
      'countries:countries_key_unique',
      'stadiums:stadiums_key_unique',
    ]);
  });

  /**
   * §3.1.0'ın `key` taşıyan tablo listesi ile şema AYRIŞMAMALI.
   *
   * Yukarıdaki test kısıtları sayıyor; bu test **hangi tabloların** taşıdığını
   * sözleşmeyle karşılaştırıyor. §3.1.0 beş tablo sayıyor — beşincisi
   * (`referees`) Faz 3.6'da geliyor, o yüzden bugün dört. Liste yazılı olduğu
   * için 3.6 onu güncellemeyi unutamaz: test kırılır.
   */
  it('`key` sütununu TAM OLARAK dört tablo taşıyor (5. tablo `referees` → 3.6)', async () => {
    const rows = await executor.rows<{ table_name: string }>(`
      SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'key'
       ORDER BY table_name
    `);
    expect(rows.map((row) => row.table_name)).toEqual([
      'clubs',
      'competitions',
      'countries',
      'stadiums',
    ]);
  });
});

describe('`federations` UYDU TABLO — veri paketi sütunlarını taşımıyor', () => {
  it('key / source / external_ids sütunları YOK', async () => {
    const rows = await executor.rows<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'federations'
       ORDER BY ordinal_position
    `);
    const names = rows.map((row) => row.column_name);
    expect(names).toEqual([
      'id',
      'country_id',
      'name',
      'founded_year',
      'asset_id',
      'created_at',
      'updated_at',
    ]);
    expect(names).not.toContain('key');
    expect(names).not.toContain('source');
    expect(names).not.toContain('external_ids');
  });
});

describe('yabancı anahtarlar ve `ON DELETE` davranışı (kabul kriteri 3’ün zemini)', () => {
  /**
   * FK ENVANTERİ — adı adına, davranışı davranışına.
   *
   * "İki FK var ve biri RESTRICT biri CASCADE" iddiası üç tabloda yeterliydi.
   * Sekiz tabloda dokuz FK var ve **hangisinin hangi davranışı aldığı** artık
   * bir liste — §3.1.2 ③'ün (uydu CASCADE, bağımsız varlık RESTRICT) tam
   * uygulaması. Tam liste iddia ediliyor: fazlası da eksiği de testi kırar,
   * yani Faz 4'ün ekleyeceği `chairman_person_id` FK'sı burayı güncellemeyi
   * unutamaz.
   */
  it('DOKUZ FK ve her birinin ON DELETE davranışı — tam envanter', async () => {
    const rows = await executor.rows<{ conname: string; def: string }>(`
      SELECT conname, pg_get_constraintdef(oid) AS def
        FROM pg_constraint
       WHERE contype = 'f' AND connamespace = 'public'::regnamespace
       ORDER BY conname
    `);

    const actionOf = (definition: string): string =>
      /ON DELETE (CASCADE|RESTRICT|SET NULL|SET DEFAULT)/.exec(definition)?.[1] ?? 'NO ACTION';

    expect(rows.map((row) => `${row.conname} → ${actionOf(row.def)}`)).toEqual([
      // uydular → CASCADE
      'club_facilities_club_id_clubs_id_fk → CASCADE',
      'club_finances_base_club_id_clubs_id_fk → CASCADE',
      // kulüp bağımsız varlıklara bakıyor → RESTRICT
      'clubs_competition_id_competitions_id_fk → RESTRICT',
      'clubs_country_id_countries_id_fk → RESTRICT',
      'clubs_stadium_id_stadiums_id_fk → RESTRICT',
      'competitions_country_id_countries_id_fk → RESTRICT',
      'federations_country_id_countries_id_fk → CASCADE',
      // aynı tabloya İKİ FK — adlar sütundan ayrışıyor, çakışma yok
      'rivalries_club_a_id_clubs_id_fk → CASCADE',
      'rivalries_club_b_id_clubs_id_fk → CASCADE',
    ]);
  });

  it('CASCADE: ülke silinince federasyonu da gidiyor', async () => {
    await insertCountry({ key: 'k-cascade', code: 'CC1' });
    await executor.run(`
      INSERT INTO "federations" ("country_id","name")
      SELECT "id", 'Sonda Federasyonu' FROM "countries" WHERE "key" = 'k-cascade'
    `);
    await executor.run(`DELETE FROM "countries" WHERE "key" = 'k-cascade'`);

    const rows = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "federations" WHERE "name" = 'Sonda Federasyonu'`,
    );
    expect(Number(rows[0]?.n)).toBe(0);
  });

  it('RESTRICT: yarışması olan bir ülke SİLİNEMİYOR', async () => {
    await insertCountry({ key: 'k-restrict', code: 'RR1' });
    await executor.run(`
      INSERT INTO "competitions"
        ("key","source","country_id","code","name_key","type","reputation","rules",
         "season_start_month","season_end_month")
      SELECT 'c-restrict','pack',"id",'C_RESTRICT','competition.restrict','league',
             100,'{}'::jsonb,8,5
        FROM "countries" WHERE "key" = 'k-restrict'
    `);

    await expect(
      executor.run(`DELETE FROM "countries" WHERE "key" = 'k-restrict'`),
    ).rejects.toThrow(/competitions_country_id_countries_id_fk/);
  });

  it('`competitions.country_id` NULL olabiliyor — uluslararası yarışma', async () => {
    await executor.run(`
      INSERT INTO "competitions"
        ("key","source","country_id","code","name_key","type","reputation","rules",
         "season_start_month","season_end_month")
      VALUES ('c-uluslararasi','pack',NULL,'C_INTL','competition.intl','continental',
              190,'{}'::jsonb,9,5)
    `);
    const rows = await executor.rows<{ country_id: number | null }>(
      `SELECT "country_id" FROM "competitions" WHERE "key" = 'c-uluslararasi'`,
    );
    expect(rows[0]?.country_id).toBeNull();
  });

  it('var olmayan bir ülkeye bağlı federasyon REDDEDİLİYOR', async () => {
    await expect(
      executor.run(`INSERT INTO "federations" ("country_id","name") VALUES (999999,'Hayalet')`),
    ).rejects.toThrow(/federations_country_id_countries_id_fk/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAZ 3.5 — KULÜP ÇEKİRDEĞİ
// ═══════════════════════════════════════════════════════════════════════════

/** Bu bölümün kendi ülkesi — dosyadaki testler aynı veritabanını paylaşıyor. */
const CLUB_COUNTRY = 'k-club-core';

async function seedClubCore(): Promise<void> {
  await executor.run(countryInsertSql([{ key: CLUB_COUNTRY, code: 'CCX' }]));
  await executor.run(stadiumInsertSql([{ key: 's-core', name: 'Çekirdek Stadı' }]));
  await executor.run(
    clubInsertSql([
      { key: 'c-core', countryCode: 'CCX', stadiumKey: 's-core', abbreviation: 'CCA' },
      { key: 'c-core-rakip', countryCode: 'CCX', stadiumKey: 's-core', abbreviation: 'CCB' },
    ]),
  );
}

describe('⑤ `source` CHECK — 3.5’in iki yeni bağımsız varlığında', () => {
  it('geçersiz `clubs.source` REDDEDİLİYOR', async () => {
    await executor.run(countryInsertSql([{ key: 'k-clubsrc', code: 'CS1' }]));
    await expect(
      executor.run(clubInsertSql([{ key: 'c-bad-source', countryCode: 'CS1', source: 'manual' }])),
    ).rejects.toThrow(/clubs_source_check/);
  });

  it('geçersiz `stadiums.source` REDDEDİLİYOR', async () => {
    await expect(
      executor.run(stadiumInsertSql([{ key: 's-bad-source', source: 'manual' }])),
    ).rejects.toThrow(/stadiums_source_check/);
  });

  it('kısıt tanımları DATA_SOURCES ile AYNI değerleri taşıyor', async () => {
    for (const name of ['clubs_source_check', 'stadiums_source_check']) {
      const definition = await constraintDefinition(name);
      for (const value of DATA_SOURCES) expect(definition).toContain(`'${value}'`);
      expect(definition.match(/'[a-z]+'/g)).toHaveLength(DATA_SOURCES.length);
    }
  });
});

describe('UYDU TABLOLAR — veri paketi sütunlarını taşımıyor (§3.1.0)', () => {
  it.each([
    [
      'club_facilities',
      [
        'club_id',
        'training_ground',
        'youth_academy',
        'youth_recruitment',
        'medical_centre',
        'data_analysis',
        'stadium_quality',
        'created_at',
        'updated_at',
      ],
    ],
    [
      'club_finances_base',
      [
        'club_id',
        'balance',
        'transfer_budget',
        'wage_budget',
        'matchday_income_annual',
        'tv_income_annual',
        'sponsor_income_annual',
        'merchandise_income_annual',
        'currency_code',
        'created_at',
        'updated_at',
      ],
    ],
    [
      'rivalries',
      ['id', 'club_a_id', 'club_b_id', 'intensity', 'name_key', 'created_at', 'updated_at'],
    ],
  ])('%s: key / source / external_ids YOK', async (table, expectedColumns) => {
    const rows = await executor.rows<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = '${table}'
       ORDER BY ordinal_position
    `);
    const names = rows.map((row) => row.column_name);

    expect(names).toEqual(expectedColumns);
    expect(names).not.toContain('key');
    expect(names).not.toContain('source');
    expect(names).not.toContain('external_ids');
  });

  /**
   * 1:1 uyduların birincil anahtarı `club_id` — ayrı bir `id` YOK.
   *
   * Ayrı bir `serial id` olsaydı aynı kulüp için iki tesis satırı yaratmak
   * mümkün olurdu ve "hangisi geçerli?" sorusu şemada cevapsız kalırdı.
   * Teklik veritabanı seviyesinde: ikinci `INSERT` reddediliyor.
   */
  it('aynı kulübe İKİNCİ bir tesis satırı yazılamıyor', async () => {
    await seedClubCore();
    await executor.run(clubFacilitiesInsertSql([{ clubKey: 'c-core' }]));

    await expect(executor.run(clubFacilitiesInsertSql([{ clubKey: 'c-core' }]))).rejects.toThrow(
      /club_facilities_pkey/,
    );
  });
});

describe('`ON DELETE` davranışı — kulüp ekseninde iki yön', () => {
  it('CASCADE: kulüp silinince tesis, finans ve rekabet de gidiyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-cascade-club', code: 'CD1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-cascade' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-cascade-a', countryCode: 'CD1', stadiumKey: 's-cascade', abbreviation: 'CA1' },
        { key: 'c-cascade-b', countryCode: 'CD1', stadiumKey: 's-cascade', abbreviation: 'CB1' },
      ]),
    );
    await executor.run(clubFacilitiesInsertSql([{ clubKey: 'c-cascade-a' }]));
    await executor.run(clubFinancesInsertSql([{ clubKey: 'c-cascade-a' }]));
    await executor.run(
      rivalryInsertSql([{ clubAKey: 'c-cascade-a', clubBKey: 'c-cascade-b', intensity: 9 }]),
    );

    // ⚠️ Kimlik SİLMEDEN ÖNCE alınıyor ve sayımlar ona daraltılıyor. Global
    // `count(*)` yazılmıştı ve kırıldı: bu dosyadaki testler AYNI veritabanını
    // paylaşıyor (`afterEach` temizliği yok), yani başka bir testin bıraktığı
    // satır sayıma giriyordu. Kırmızı olan koddu değil, testin kendisiydi (D6).
    const before = await executor.rows<{ id: number }>(
      `SELECT "id" FROM "clubs" WHERE "key" = 'c-cascade-a'`,
    );
    const clubId = before[0]?.id ?? -1;

    // Satırlar gerçekten VARDI — yoksa "silindi" iddiası bedavaya sağlanırdı.
    const seeded = await executor.rows<{
      facilities: number;
      finances: number;
      rivalries: number;
    }>(`
      SELECT (SELECT count(*)::int FROM "club_facilities"    WHERE "club_id" = ${String(clubId)}) AS facilities,
             (SELECT count(*)::int FROM "club_finances_base" WHERE "club_id" = ${String(clubId)}) AS finances,
             (SELECT count(*)::int FROM "rivalries"
               WHERE "club_a_id" = ${String(clubId)} OR "club_b_id" = ${String(clubId)})          AS rivalries
    `);
    expect(seeded[0]).toEqual({ facilities: 1, finances: 1, rivalries: 1 });

    await executor.run(`DELETE FROM "clubs" WHERE "key" = 'c-cascade-a'`);

    const rows = await executor.rows<{ facilities: number; finances: number; rivalries: number }>(`
      SELECT (SELECT count(*)::int FROM "club_facilities"    WHERE "club_id" = ${String(clubId)}) AS facilities,
             (SELECT count(*)::int FROM "club_finances_base" WHERE "club_id" = ${String(clubId)}) AS finances,
             (SELECT count(*)::int FROM "rivalries"
               WHERE "club_a_id" = ${String(clubId)} OR "club_b_id" = ${String(clubId)})          AS rivalries
    `);
    expect(rows[0]).toEqual({ facilities: 0, finances: 0, rivalries: 0 });
  });

  /**
   * ⚠️ İKİ FK'NIN AYRI AYRI ÇALIŞTIĞI — `club_b_id` üzerinden de siliniyor.
   *
   * Yukarıdaki test `club_a_id`yi siliyor. İkisi aynı tabloya baktığı için
   * "biri çalışıyorsa ikisi de çalışır" varsayımı yapılabilirdi — ama o bir
   * varsayım olurdu: yanlış sütuna bağlanmış bir FK ilk testte yakalanmaz.
   */
  it('CASCADE: rekabetin B tarafı silinince de rekabet gidiyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-cascade-b', code: 'CD2' }]));
    await executor.run(stadiumInsertSql([{ key: 's-cascade-b' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-side-a', countryCode: 'CD2', stadiumKey: 's-cascade-b', abbreviation: 'SA1' },
        { key: 'c-side-b', countryCode: 'CD2', stadiumKey: 's-cascade-b', abbreviation: 'SB1' },
      ]),
    );
    await executor.run(
      rivalryInsertSql([{ clubAKey: 'c-side-a', clubBKey: 'c-side-b', intensity: 7 }]),
    );

    await executor.run(`DELETE FROM "clubs" WHERE "key" = 'c-side-b'`);

    const rows = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "rivalries" WHERE "intensity" = 7`,
    );
    expect(Number(rows[0]?.n)).toBe(0);
  });

  it('RESTRICT: kulübü olan bir STADYUM silinemiyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-restrict-st', code: 'RS1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-restrict' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-restrict-st', countryCode: 'RS1', stadiumKey: 's-restrict', abbreviation: 'RS2' },
      ]),
    );

    await expect(executor.run(`DELETE FROM "stadiums" WHERE "key" = 's-restrict'`)).rejects.toThrow(
      /clubs_stadium_id_stadiums_id_fk/,
    );
  });

  it('RESTRICT: kulübü olan bir YARIŞMA silinemiyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-restrict-cp', code: 'RC1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-restrict-cp' }]));
    await executor.run(`
      INSERT INTO "competitions"
        ("key","source","code","name_key","type","reputation","rules",
         "season_start_month","season_end_month")
      VALUES ('cp-restrict','pack','CP_RESTRICT','competition.cp','league',100,'{}'::jsonb,8,5)
    `);
    await executor.run(
      clubInsertSql([
        {
          key: 'c-restrict-cp',
          countryCode: 'RC1',
          competitionKey: 'cp-restrict',
          stadiumKey: 's-restrict-cp',
          abbreviation: 'RC2',
        },
      ]),
    );

    await expect(
      executor.run(`DELETE FROM "competitions" WHERE "key" = 'cp-restrict'`),
    ).rejects.toThrow(/clubs_competition_id_competitions_id_fk/);
  });
});

describe('MİLLİ TAKIM VAKASI — `competition_id` ve `stadium_id` NULL olabiliyor', () => {
  /**
   * Nullable kararının koşan kanıtı (SAPMA-026'nın türetme kuralı, 2. uygulama).
   *
   * Şema `NOT NULL` olsaydı bu `INSERT` patlardı ve Faz 41 ya uydurma bir lig
   * ve stadyum yazmak ya da `ALTER TABLE … DROP NOT NULL` yazmak zorunda
   * kalırdı. Test, o kararın gerçekten uygulandığını gösteriyor — yorumun
   * kendisi bir kanıt değil.
   */
  it('ligsiz ve sahasız bir milli takım satırı KABUL EDİLİYOR', async () => {
    await executor.run(countryInsertSql([{ key: 'k-national', code: 'NT1' }]));
    await executor.run(
      clubInsertSql([
        {
          key: 'nt-turkiye',
          countryCode: 'NT1',
          competitionKey: null,
          stadiumKey: null,
          isNational: true,
          abbreviation: 'NTR',
        },
      ]),
    );

    const rows = await executor.rows<{
      competition_id: number | null;
      stadium_id: number | null;
      is_national: boolean;
    }>(
      `SELECT "competition_id","stadium_id","is_national" FROM "clubs" WHERE "key" = 'nt-turkiye'`,
    );
    expect(rows[0]?.competition_id).toBeNull();
    expect(rows[0]?.stadium_id).toBeNull();
    expect(rows[0]?.is_national).toBe(true);
  });

  /**
   * KARŞI ÖRNEK — nöbetçi iki yönlü.
   *
   * `country_id` NOT NULL kaldı ve bu bir tercih değil: her kulübün (milli
   * takım dâhil) bir ülkesi vardır. Bu satır olmasaydı yukarıdaki test
   * "clubs'ta hiçbir şey zorunlu değil" durumundan ayırt edilemezdi.
   */
  it('`country_id` hâlâ ZORUNLU — milli takım bile ülkesiz olamıyor', async () => {
    await expect(
      executor.run(`
        INSERT INTO "clubs"
          ("key","source","country_id","name","short_name","abbreviation","city","reputation",
           "color_primary","color_secondary","crest_seed","supporter_count",
           "supporter_expectation","is_national")
        VALUES ('nt-ulkesiz','pack',NULL,'Ülkesiz','Ülkesiz','NUL','—',100,
                '#000000','#FFFFFF',1,0,50,true)
      `),
    ).rejects.toThrow(/null value in column "country_id"/);
  });

  it('`is_national` VARSAYILAN ALMIYOR — belirtilmezse INSERT patlıyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-nodefault', code: 'ND1' }]));
    await expect(
      executor.run(`
        INSERT INTO "clubs"
          ("key","source","country_id","name","short_name","abbreviation","city","reputation",
           "color_primary","color_secondary","crest_seed","supporter_count","supporter_expectation")
        SELECT 'c-nodefault','pack',"id",'Bayraksız','Bayraksız','NDF','—',100,
               '#000000','#FFFFFF',1,0,50
          FROM "countries" WHERE "key" = 'k-nodefault'
      `),
    ).rejects.toThrow(/null value in column "is_national"/);
  });
});

describe('⚠️ `bigint` HASSASİYETİ — mod kararının koşan kanıtı', () => {
  /** 2⁵³ + 1: `Number` ile temsil edilemeyen EN KÜÇÜK tamsayı. */
  const HUGE = 9_007_199_254_740_993n;

  beforeAll(async () => {
    await executor.run(countryInsertSql([{ key: 'k-money', code: 'MN1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-money' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-money', countryCode: 'MN1', stadiumKey: 's-money', abbreviation: 'MNY' },
      ]),
    );
    await executor.run(
      clubFinancesInsertSql([
        { clubKey: 'c-money', balance: HUGE, transferBudget: -HUGE, wageBudget: HUGE },
      ]),
    );
  });

  it('sütun tipi gerçekten `bigint` — `integer` değil', async () => {
    const rows = await executor.rows<{ column_name: string; data_type: string }>(`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'club_finances_base'
         AND data_type = 'bigint'
       ORDER BY column_name
    `);
    expect(rows.map((row) => row.column_name)).toEqual([
      'balance',
      'matchday_income_annual',
      'merchandise_income_annual',
      'sponsor_income_annual',
      'transfer_budget',
      'tv_income_annual',
      'wage_budget',
    ]);
  });

  it('DRIZZLE üzerinden geri okunan değer BİREBİR aynı — 2⁵³+1 korunuyor', async () => {
    const clubId = await executor.rows<{ id: number }>(
      `SELECT "id" FROM "clubs" WHERE "key" = 'c-money'`,
    );
    const id = clubId[0]?.id ?? -1;

    const rows = await world.master
      .select({
        balance: clubFinancesBase.balance,
        transferBudget: clubFinancesBase.transferBudget,
      })
      .from(clubFinancesBase)
      .where(eq(clubFinancesBase.clubId, id));

    expect(typeof rows[0]?.balance).toBe('bigint');
    expect(rows[0]?.balance).toBe(HUGE);
    // Negatif taraf da sınanıyor: borçlu kulüp gerçek bir durum.
    expect(rows[0]?.transferBudget).toBe(-HUGE);
  });

  /**
   * ⚠️ KARŞI ÖRNEK — `mode: 'number'` SEÇİLSEYDİ NE OLURDU.
   *
   * Yukarıdaki test tek başına *"bigint çalışıyor"* der ama *"öteki mod
   * çalışmazdı"* demez; ikisi olmadan mod kararı gerekçesiz kalır. Burada
   * sürücünün ham dizgesi alınıp `Number`'a düşürülüyor — `mode: 'number'`in
   * `mapFromDriverValue`'sunun yaptığının aynısı (kaynaktan okundu).
   *
   * Karşılaştırma **dizge üzerinden** yapılıyor ve bu zorunlu: JS'te
   * `9007199254740993` literali zaten `9007199254740992`ye yuvarlanır, yani
   * sayı karşılaştırması kaybı GÖREMEZDİ.
   */
  it('KARŞI ÖRNEK: aynı değer `Number`a düşürülünce SESSİZCE kayboluyor', async () => {
    const rows = await executor.rows<{ balance: string }>(
      `SELECT "balance"::text AS balance FROM "club_finances_base"
        WHERE "club_id" = (SELECT "id" FROM "clubs" WHERE "key" = 'c-money')`,
    );
    const raw = rows[0]?.balance ?? '';

    // Sürücü dizgesi kayıpsız.
    expect(raw).toBe('9007199254740993');
    // `Number` dönüşümü SESSİZ: hata yok, yalnızca yanlış sayı.
    expect(String(Number(raw))).toBe('9007199254740992');
    expect(String(Number(raw))).not.toBe(raw);
  });
});
