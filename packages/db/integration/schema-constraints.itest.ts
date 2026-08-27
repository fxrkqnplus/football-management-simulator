/**
 * ŞEMA KISITLARININ GERÇEK VERİTABANINDA SINANMASI — Faz 3.4.
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
 */
import { fileURLToPath } from 'node:url';

import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { SqlExecutor } from '../src/migrate/executor.js';
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { createPostgresExecutor } from '../src/migrate/postgres-executor.js';
import { migrateUp } from '../src/migrate/runner.js';
import { COMPETITION_TYPES } from '../src/schema/competitions.js';
import { WORK_PERMIT_RULES } from '../src/schema/countries.js';
import { DATA_SOURCES } from '../src/schema/data-pack-columns.js';
import { type CountryFixture, countryInsertSql } from './fixtures.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:18')
    .withDatabase('fms_test')
    .withUsername('fms')
    .withPassword('fms')
    .start();
  const handle = createPostgresExecutor(container.getConnectionUri());
  executor = handle.executor;
  close = async (): Promise<void> => {
    await handle.close();
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
      'competitions:competitions_key_unique',
      'countries:countries_key_unique',
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
  it('iki FK tanımlı ve davranışları AYRIŞIYOR', async () => {
    const rows = await executor.rows<{ conname: string; def: string }>(`
      SELECT conname, pg_get_constraintdef(oid) AS def
        FROM pg_constraint
       WHERE contype = 'f' AND connamespace = 'public'::regnamespace
       ORDER BY conname
    `);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.def).toContain('ON DELETE RESTRICT'); // competitions → bağımsız
    expect(rows[1]?.def).toContain('ON DELETE CASCADE'); // federations → uydu
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
