/**
 * ROUND-TRIP KANITI — Faz 3'ün 1. kabul kriteri.
 *
 * İddia: `up` → **veri yaz** → `down` → `up` çevriminden sonra şema başlangıçtaki
 * hâliyle **birebir aynı**.
 *
 * *"Veri yaz"* adımı atlanamaz. Boş bir veritabanında `down` çalışıyormuş gibi
 * görünen çok sayıda hata, dolu bir tabloda `NOT NULL` veya `FOREIGN KEY`
 * yüzünden patlar (`docs/spec/01-database.md` §3.0). Ayrıca kayıp ölçümü
 * (`loss.ts`) ancak veri varken anlamlı bir şey söyler.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * İKİ AYRI İDDİA, İKİ AYRI KARŞILAŞTIRMA
 * ────────────────────────────────────────────────────────────────────────────
 *
 * **(a) Round-trip:** gerçek `information_schema`/`pg_catalog` durumu, çevrim
 * öncesi vs sonrası. `down`/`up` çiftinin doğruluğunu kanıtlar.
 *
 * **(b) Snapshot güvenilirliği:** drizzle'ın `meta/NNNN_snapshot.json`'ı gerçek
 * şemayı doğru anlatıyor mu. Snapshot bir **temsildir**, gerçeğin kendisi değil;
 * sonraki fazlarda onu doğruluk kaynağı sayacaksak bu ayrıca kanıtlanmalı.
 *
 * İkisi karıştırılırsa "şema doğrulandı" denip yalnızca birine bakılmış olur.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * FAZ 3.4'TE NE DEĞİŞTİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Zincir ikinci migration'ını aldı (`0001_geography_institutions`) ve bu,
 * koşucunun kayıp ölçümünün ilk **KARIŞIK** vakası: `DROP TABLE` (competitions,
 * federations) ile `DROP COLUMN` (countries × 8) aynı geri almada. Kayıp
 * raporunun ikisini **ayrı ayrı** gösterdiği aşağıda ölçülüyor, varsayılmıyor.
 */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { SqlExecutor } from '../src/migrate/executor.js';
import { createFileMigrationSource } from '../src/migrate/file-source.js';
import { createPostgresExecutor } from '../src/migrate/postgres-executor.js';
import type { MigrationSource } from '../src/migrate/runner.js';
import { migrateDown, migrateUp } from '../src/migrate/runner.js';
import { compareSchemas, summarizeDifferences } from '../src/schema-state/compare.js';
import {
  compareSnapshotToReal,
  parseDrizzleSnapshot,
  realSchemaToFacts,
  snapshotToFacts,
} from '../src/schema-state/drizzle-snapshot.js';
import { introspectSchema, readSequencePosition } from '../src/schema-state/introspect.js';
import { countryInsertSql } from './fixtures.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

/** Zincirin son migration'ı — snapshot karşılaştırması bunu okur. */
const LATEST_SNAPSHOT = '0001_snapshot.json';
const CHAIN_TAGS = ['0000_countries_initial', '0001_geography_institutions'] as const;

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
}, 180_000);

afterAll(async () => {
  await close();
  await container.stop();
}, 60_000);

afterEach(async () => {
  await executor.run(`
    DROP SCHEMA IF EXISTS "fms_meta" CASCADE;
    DROP SCHEMA IF EXISTS "public" CASCADE;
    CREATE SCHEMA "public";
  `);
});

const source = createFileMigrationSource(DRIZZLE_DIR);

/** Tek satırlık `CompetitionRules` — şeklin gerçekçi olması yeterli. */
const SAMPLE_RULES = JSON.stringify({
  teamCount: 18,
  format: 'round_robin_double',
  pointsWin: 3,
  pointsDraw: 1,
  relegationCount: 3,
  promotionCount: 0,
  playoffSpots: 0,
  continentalSpots: { ucl: 2, uel: 1, uecl: 1 },
  tiebreakers: ['points', 'head_to_head', 'goal_diff'],
  squadRegistration: { maxSquadSize: 25, maxForeign: 14, homegrownMin: null, u21Exempt: true },
  varEnabled: true,
  substitutionsAllowed: 5,
  substitutionWindows: 3,
  extraTimeSubstitution: true,
  yellowCardSuspensionThresholds: [5, 10, 15],
  transferWindows: [{ start: '06-11', end: '09-08' }],
});

/**
 * Üç tabloya da veri yazar — FK sırasına uyarak.
 *
 * `countries` sekiz yeni sütununun hepsini dolduruyor: `NOT NULL` bir sütunu
 * atlamak testi kendi kurgusundan patlatırdı ve *çevrimin* değil *fixture'ın*
 * hatası olurdu (3.2b günlük #17'nin dersi).
 */
async function seedAllTables(): Promise<void> {
  await executor.run(
    countryInsertSql([
      {
        key: 'turkiye',
        code: 'TUR',
        externalIds: '{"wikidata":"Q43"}',
        flagAssetId: 'flag/tur',
        footballLevel: 72,
        uefaCoefficient: '38.400',
        currencyCode: 'TRY',
        workPermitRuleKey: 'tr_quota',
      },
      {
        key: 'ingiltere',
        code: 'ENG',
        footballLevel: 95,
        uefaCoefficient: '94.303',
        currencyCode: 'GBP',
        workPermitRuleKey: 'gbe',
      },
      {
        key: 'ispanya',
        code: 'ESP',
        source: 'wikidata',
        footballLevel: 93,
        uefaCoefficient: '88.310',
        workPermitRuleKey: 'eu_quota',
      },
    ]),
  );

  await executor.run(`
    INSERT INTO "federations" ("country_id","name","founded_year","asset_id")
    SELECT "id", 'Türkiye Futbol Federasyonu', 1923, NULL FROM "countries" WHERE "code" = 'TUR'
    UNION ALL
    SELECT "id", 'The Football Association', 1863, NULL FROM "countries" WHERE "code" = 'ENG'
  `);

  const rules = SAMPLE_RULES.replace(/'/g, "''");
  await executor.run(`
    INSERT INTO "competitions"
      ("key","source","external_ids","country_id","code","name_key","type","tier","reputation",
       "logo_asset_id","rules","season_start_month","season_end_month")
    SELECT 'super-lig','pack','{}'::jsonb, "id", 'TUR_SUPERLIG','competition.tur.superlig',
           'league', 1, 118, NULL, '${rules}'::jsonb, 8, 5
      FROM "countries" WHERE "code" = 'TUR'
    UNION ALL
    SELECT 'sampiyonlar-ligi','pack','{}'::jsonb, NULL, 'UEFA_UCL','competition.uefa.ucl',
           'continental', NULL, 195, NULL, '${rules}'::jsonb, 9, 5
  `);
}

/**
 * Geçici bir migration zinciri yazar.
 *
 * **Neden geçici dizin, gerçek zincire ikinci bir migration EKLEMEK yerine:**
 * `packages/db/drizzle/` pratikte append-only — oraya konan bir test
 * migration'ı sonsuza kadar kalır ve gerçek migration'ların numaralandırmasını
 * kirletir. Fixture zinciri aynı kanıtı üretir, hiçbir kalıntı bırakmaz.
 */
async function fixtureChain(
  steps: { tag: string; up: string; down: string }[],
): Promise<MigrationSource> {
  const dir = await mkdtemp(path.join(tmpdir(), 'fms-rt-'));
  await mkdir(path.join(dir, 'meta'), { recursive: true });
  await mkdir(path.join(dir, 'down'), { recursive: true });
  await writeFile(
    path.join(dir, 'meta', '_journal.json'),
    JSON.stringify({
      version: '7',
      dialect: 'postgresql',
      entries: steps.map((step, idx) => ({
        idx,
        version: '7',
        when: idx + 1,
        tag: step.tag,
        breakpoints: true,
      })),
    }),
    'utf8',
  );
  for (const step of steps) {
    await writeFile(path.join(dir, `${step.tag}.sql`), step.up, 'utf8');
    await writeFile(path.join(dir, 'down', `${step.tag}.sql`), step.down, 'utf8');
  }
  return createFileMigrationSource(dir);
}

async function trackedCount(): Promise<number> {
  const rows = await executor.rows<{ n: number | string }>(
    `SELECT count(*)::int AS n FROM "fms_meta"."migrations"`,
  );
  return Number(rows[0]?.n ?? 0);
}

describe('round-trip — gerçek migration zinciri (0000 + 0001)', () => {
  it('up → ÜÇ tabloya da veri yaz → down → up sonrası şema BİREBİR aynı', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    // ⚠️ Bu adım atlanamaz: boş şemada down/up çevrimi veri kaybı yolunu hiç
    // sınamaz ve `NOT NULL`/FK ihlallerini görmez.
    await seedAllTables();

    await migrateDown({ executor, source, logger }, { steps: 2, allowDataLoss: true });
    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    expect(summarizeDifferences(comparison)).toMatch(/^fark yok/);
    expect(comparison.identical).toBe(true);
    // D3 önlemi: "fark yok" ancak gerçekten bir şeye bakıldıysa anlamlı.
    // Alt sınır 3.4'te ÖLÇÜLDÜ: üç tablo → **466 olgu** (3.2b'de `countries`
    // tek başına 89'du). Sınır 20'de bırakılsaydı test "fark yok" demeye devam
    // eder ama KAÇ ŞEYE baktığı sabitlenmemiş olurdu — D3'ün ta kendisi.
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(466);
    expect(after.tables.map((table) => table.name).sort()).toEqual([
      'competitions',
      'countries',
      'federations',
    ]);
  });

  /**
   * 0001 TEK BAŞINA — `ALTER TABLE` çevriminin KENDİ kanıtı, ve neden gerekli.
   *
   * Yukarıdaki tam zincir testi `countries`i **düşürüp yeniden yaratıyor**. Bu,
   * 0001'in `down`undaki bir **fazla gidişi MASKELER**: 0001'in geri alması
   * 0000'in bir kısıtını da götürseydi, hemen ardından gelen `DROP TABLE
   * countries` zaten her şeyi silerdi ve yeniden `up` temiz bir tablo kurardı.
   * Yani tam zincir yeşil kalırken 0001 bozuk olabilirdi. Bu test o boşluğu
   * kapatıyor: yalnızca 0001 geri alınıyor, `countries` ayakta kalıyor.
   *
   * ────────────────────────────────────────────────────────────────────────
   * ⚠️ ÖLÇÜLDÜ (Faz 3.4): `identical` BURADA `true` OLAMAZ — ve bu bir kusur değil
   * ────────────────────────────────────────────────────────────────────────
   *
   * `ColumnFacts.position` `information_schema.columns.ordinal_position`tan
   * geliyor ve PostgreSQL'de bu değer `pg_attribute.attnum`dur. `DROP COLUMN`
   * numarayı **geri kazanmaz**, delik bırakır: sekiz sütun düşüp yeniden
   * eklenince numaraları 7…14 → **15…22** oluyor (ölçüldü, tahmin değil).
   * Sütunların **sırası** değişmiyor, yalnızca numaraları kayıyor.
   *
   * İki yol vardı: ① `position`ı göreli sıraya çevirmek — 3.2b'nin ölçülmüş bir
   * kararını 3.4'te sessizce daraltmak olurdu ve attnum kayması gerçek bir
   * bilgidir (tablonun ALTER edildiğini söyler) ② farkı **tam liste hâlinde**
   * iddia etmek. ② seçildi ve aslında `identical: true`dan **daha güçlü**:
   * beklenen sekiz farkın dışında tek bir fark çıkarsa test kırılır, yani
   * fazla giden bir `down` yine yakalanır.
   */
  it('yalnızca 0001 geri alınınca TEK fark sütun NUMARALARI — başka hiçbir şey', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    await migrateDown({ executor, source, logger }, { steps: 1, allowDataLoss: true });

    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name)).toEqual(['countries']);
    expect(rolledBack.tables[0]?.columns.map((column) => column.name)).toEqual([
      'id',
      'key',
      'code',
      'name_key',
      'created_at',
      'updated_at',
    ]);

    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    // Farkların TAM listesi. Fazlası = `down` fazla gidiyor; eksiği = attnum
    // davranışı değişmiş (yeni bir PG sürümü) ve not güncellenmeli.
    expect(comparison.differences.map((difference) => difference.path)).toEqual([
      'table.countries.column.source.position',
      'table.countries.column.external_ids.position',
      'table.countries.column.confederation.position',
      'table.countries.column.flag_asset_id.position',
      'table.countries.column.football_level.position',
      'table.countries.column.uefa_coefficient.position',
      'table.countries.column.currency_code.position',
      'table.countries.column.work_permit_rule_key.position',
    ]);
    expect(
      comparison.differences.map((difference) => [difference.before, difference.after]),
    ).toEqual([
      ['7', '15'],
      ['8', '16'],
      ['9', '17'],
      ['10', '18'],
      ['11', '19'],
      ['12', '20'],
      ['13', '21'],
      ['14', '22'],
    ]);

    // SIRA korunuyor — kayan yalnızca numara.
    const countriesAfter = after.tables.find((table) => table.name === 'countries');
    expect(countriesAfter?.columns.map((column) => column.name)).toEqual([
      'id',
      'key',
      'code',
      'name_key',
      'created_at',
      'updated_at',
      'source',
      'external_ids',
      'confederation',
      'flag_asset_id',
      'football_level',
      'uefa_coefficient',
      'currency_code',
      'work_permit_rule_key',
    ]);
  });

  /**
   * ⚠️ ÖLÇÜLMÜŞ SINIR — 0001 tek başına geri alınınca `countries` SATIRLARI KALIR.
   *
   * `DROP COLUMN` satırları silmez, yalnızca hücreleri götürür. Yeniden `up`
   * `ADD COLUMN … NOT NULL` (varsayılansız) çalıştırıyor ve var olan satırlara
   * değer bulamıyor → **PATLIYOR**.
   *
   * Bu bir kusur değil, `source` sütununun VARSAYILAN ALMAMA kararının doğal
   * sonucu: bir varsayılan, kimsenin belirlemediği satırlara köken **uydururdu**
   * ve §3.1.0'ın tüm amacı kökeni kaydetmek. Alternatif (nullable) spec'i ihlal
   * ederdi.
   *
   * Davranış **gürültülü**: sessizce yanlış veri değil, açık bir hata. Test onu
   * sabitliyor ki sonraki bir oturum bunu yeni bir regresyon sanmasın.
   * Tam zincir (`steps: 2`) veriyle sorunsuz çalışıyor — yukarıdaki ilk test.
   */
  it('0001 tek başına geri alınıp VERİ VARKEN yeniden uygulanırsa GÜRÜLTÜLÜ patlıyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();

    await migrateDown({ executor, source, logger }, { steps: 1, allowDataLoss: true });

    // Satırlar duruyor — kaybolan yalnızca sütunlar.
    const remaining = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "countries"`,
    );
    expect(Number(remaining[0]?.n)).toBe(3);

    await expect(migrateUp({ executor, source, logger })).rejects.toThrow(/contains null values/);
  });

  /**
   * SEQUENCE KONUMU — karşılaştırmaya girmiyor ama ÖLÇÜLÜP raporlanıyor.
   *
   * Karar `src/schema-state/types.ts` başlığında: tanım şemadır, konum veridir.
   */
  it('çevrim sequence KONUMUNU sıfırlıyor — tanımı ise değişmiyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();

    const positionBefore = await readSequencePosition(executor, 'countries_id_seq');
    const schemaBefore = await introspectSchema(executor);

    await migrateDown({ executor, source, logger }, { steps: 2, allowDataLoss: true });
    await migrateUp({ executor, source, logger });

    const positionAfter = await readSequencePosition(executor, 'countries_id_seq');
    const schemaAfter = await introspectSchema(executor);

    // Konum: veri ile birlikte gitti.
    expect(positionBefore).toEqual({ lastValue: '3', isCalled: true });
    expect(positionAfter).toEqual({ lastValue: '1', isCalled: false });

    // Tanım: birebir aynı — ve karşılaştırma bunu görüyor.
    expect(compareSchemas(schemaBefore, schemaAfter).identical).toBe(true);
    expect(schemaAfter.sequences.map((sequence) => sequence.name).sort()).toEqual([
      'competitions_id_seq',
      'countries_id_seq',
      'federations_id_seq',
    ]);
  });

  /**
   * TAKİP TABLOSU — `down` satırı silmezse ikinci `up` SESSİZCE hiçbir şey yapmaz.
   * Bu, en tehlikeli başarısızlık biçimi: hata yok, şema eksik.
   */
  it('down takip satırlarını siliyor, sonraki up gerçekten uyguluyor', async () => {
    await migrateUp({ executor, source, logger });
    expect(await trackedCount()).toBe(2);

    await migrateDown({ executor, source, logger }, { steps: 2, allowDataLoss: true });
    expect(await trackedCount()).toBe(0);

    const again = await migrateUp({ executor, source, logger });
    // Sessiz no-op OLMADI: migration'lar gerçekten yeniden uygulandı.
    expect(again.applied).toEqual([...CHAIN_TAGS]);
    expect(await trackedCount()).toBe(2);
  });

  /**
   * ⚠️ NEGATİF — KARŞILAŞTIRMA 3.4'ÜN YENİ TABLOLARINA DA BAKIYOR.
   *
   * `comparedFacts` alt sınırı sayının büyüdüğünü söyler ama **hangi** tablolara
   * bakıldığını söylemez. Bu test onu doğrudan ölçüyor: yeni tablolarda bilerek
   * yaratılan bir fark yakalanıyor mu. Yakalanmıyorsa yukarıdaki bütün pozitif
   * "fark yok" iddiaları bu tablolar için değersizdir (D3).
   */
  it.each([
    ['competitions', 'ALTER TABLE "competitions" DROP COLUMN "tier"', 'tier'],
    [
      'competitions',
      'ALTER TABLE "competitions" DROP CONSTRAINT "competitions_type_check"',
      'competitions_type_check',
    ],
    ['federations', 'DROP TABLE "federations"', 'federations'],
  ])('%s üzerindeki bozulma yakalanıyor (%s)', async (_table, mutation, needle) => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    await executor.run(mutation);

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    expect(comparison.identical).toBe(false);
    expect(summarizeDifferences(comparison)).toContain(needle);
  });
});

describe('kayıp ölçümü — ilk KARIŞIK vaka (DROP TABLE + DROP COLUMN)', () => {
  it('allowDataLoss VERİLMEDEN geri alma REDDEDİLİYOR', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();

    await expect(migrateDown({ executor, source, logger }, { steps: 2 })).rejects.toMatchObject({
      code: 'migration.downWouldLoseData',
    });

    // Reddedilen işlem GERİ ALINDI: şema ve veri yerinde.
    const state = await introspectSchema(executor);
    expect(state.tables.map((table) => table.name).sort()).toEqual([
      'competitions',
      'countries',
      'federations',
    ]);
    expect(await trackedCount()).toBe(2);
  });

  it('kayıp raporu TABLO ve SÜTUN kaybını AYRI AYRI gösteriyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();

    // Kuru çalıştırma: gerçekten uygular, ölçer, geri alır.
    const result = await migrateDown(
      { executor, source, logger },
      { steps: 2, dryRun: true, allowDataLoss: true },
    );

    expect(result.dryRun).toBe(true);

    const droppedTables = result.loss.items
      .filter((item) => item.kind === 'table')
      .map((item) => item.table)
      .sort();
    const droppedColumns = result.loss.items
      .filter((item) => item.kind === 'column')
      .map((item) => `${item.table}.${item.column ?? '?'}`)
      .sort();

    // ÜÇ tablo da düşüyor (0000'in `down`u `countries`i de götürüyor).
    expect(droppedTables).toEqual(['competitions', 'countries', 'federations']);
    // `countries` tablo olarak düştüğü için sütunları AYRICA sayılmıyor —
    // `computeLoss` tabloyu bir bütün olarak raporluyor. Yani karışık vakada
    // sütun kalemi ancak tablo AYAKTA kalırsa görünür (aşağıdaki test).
    expect(droppedColumns).toEqual([]);
    expect(result.loss.totalRowsAtRisk).toBe(3 + 2 + 2);

    // Kuru çalıştırma hiçbir şey kaybetmedi.
    expect(await trackedCount()).toBe(2);
  });

  it('SÜTUN kaybı ayrı bir kalem olarak görünüyor — yalnızca 0001 geri alınınca', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();

    const result = await migrateDown(
      { executor, source, logger },
      { steps: 1, dryRun: true, allowDataLoss: true },
    );

    const byKind = {
      table: result.loss.items.filter((item) => item.kind === 'table').map((item) => item.table),
      column: result.loss.items
        .filter((item) => item.kind === 'column')
        .map((item) => `${item.table}.${item.column ?? '?'}`),
    };

    expect(byKind.table.sort()).toEqual(['competitions', 'federations']);
    expect(byKind.column.sort()).toEqual([
      'countries.confederation',
      'countries.currency_code',
      'countries.external_ids',
      'countries.flag_asset_id',
      'countries.football_level',
      'countries.source',
      'countries.uefa_coefficient',
      'countries.work_permit_rule_key',
    ]);

    // Sütun kaybında TABLONUN TAMAMI sayılır (`loss.ts`: üst sınır, bilerek).
    // 2 tablo (2 + 2 satır) + 8 sütun × 3 satır = 28.
    expect(result.loss.totalRowsAtRisk).toBe(2 + 2 + 8 * 3);
  });
});

describe('snapshot ↔ gerçek şema (ikinci ve ayrı iddia)', () => {
  it('drizzle snapshot’ı gerçek şemayı doğru anlatıyor — SÜTUN SIRASI dahil', async () => {
    await migrateUp({ executor, source, logger });

    const snapshotRaw = await readFile(path.join(DRIZZLE_DIR, 'meta', LATEST_SNAPSHOT), 'utf8');
    const real = await introspectSchema(executor);

    const result = compareSnapshotToReal(
      snapshotToFacts(parseDrizzleSnapshot(snapshotRaw)),
      realSchemaToFacts(real),
    );

    expect(result.mismatched).toEqual([]);
    expect(result.missingInReal).toEqual([]);
    expect(result.missingInSnapshot).toEqual([]);
    expect(result.agreed).toBeGreaterThan(0);
  });

  /**
   * ⚠️ SÜTUN SIRASI, 3.4'TE ÖLÇÜLEN GERÇEK BİR TUZAK.
   *
   * `ALTER TABLE ADD COLUMN` sütunu tablonun SONUNA ekler; `drizzle-kit` ise
   * snapshot'a **TS tanımındaki** sırayı yazar. `countries.ts` bu yüzden
   * mantıksal değil FİZİKSEL sırada yazıldı (dosya başlığındaki gerekçe).
   * Bu test o hizalamayı sabitliyor: biri kaydırılırsa yukarıdaki karşılaştırma
   * kırılır, ama neden kırıldığı ancak burada okunur.
   */
  it('countries fiziksel sütun sırası 0001 snapshot’ıyla AYNI', async () => {
    await migrateUp({ executor, source, logger });
    const real = await introspectSchema(executor);
    const countries = real.tables.find((table) => table.name === 'countries');

    expect(countries?.columns.map((column) => column.name)).toEqual([
      'id',
      'key',
      'code',
      'name_key',
      'created_at',
      'updated_at',
      'source',
      'external_ids',
      'confederation',
      'flag_asset_id',
      'football_level',
      'uefa_coefficient',
      'currency_code',
      'work_permit_rule_key',
    ]);
  });
});

describe('çok adımlı çevrim (fixture zinciri)', () => {
  const CHAIN = [
    {
      tag: '0000_probe_base',
      up: 'CREATE TABLE "probe" ("id" serial PRIMARY KEY, "name" text NOT NULL);',
      down: 'DROP TABLE "probe";',
    },
    {
      tag: '0001_probe_extend',
      up: 'ALTER TABLE "probe" ADD COLUMN "country" varchar(3) NOT NULL DEFAULT \'TUR\';\nCREATE INDEX "probe_country_idx" ON "probe" ("country");',
      down: 'DROP INDEX "probe_country_idx";\nALTER TABLE "probe" DROP COLUMN "country";',
    },
  ];

  it('iki adım geri alınıp yeniden uygulanınca şema birebir aynı', async () => {
    const chain = await fixtureChain(CHAIN);

    await migrateUp({ executor, source: chain, logger });
    const before = await introspectSchema(executor);

    await executor.run(`INSERT INTO "probe" ("name") VALUES ('a'),('b')`);

    const down = await migrateDown(
      { executor, source: chain, logger },
      { steps: 2, allowDataLoss: true },
    );
    // Sıra: en yeniden en eskiye.
    expect(down.reverted).toEqual(['0001_probe_extend', '0000_probe_base']);
    expect(await trackedCount()).toBe(0);

    await migrateUp({ executor, source: chain, logger });
    const after = await introspectSchema(executor);

    const comparison = compareSchemas(before, after);
    expect(summarizeDifferences(comparison)).toMatch(/^fark yok/);
    expect(comparison.comparedFacts).toBeGreaterThan(20);
  });

  it('tek adım geri alma yalnızca en yeniyi kaldırır', async () => {
    const chain = await fixtureChain(CHAIN);
    await migrateUp({ executor, source: chain, logger });

    await migrateDown({ executor, source: chain, logger }, { steps: 1, allowDataLoss: true });

    const state = await introspectSchema(executor);
    const probe = state.tables.find((table) => table.name === 'probe');
    expect(probe).toBeDefined();
    expect(probe?.columns.map((column) => column.name)).toEqual(['id', 'name']);
    expect(await trackedCount()).toBe(1);
  });

  /**
   * ⚠️ NEGATİF TESTLER — ZORUNLU, ve bozuk `down`un İKİ SINIFI var.
   *
   * Yeşil bir round-trip testi, karşılaştırmanın gerçekten BAKTIĞINI kanıtlamaz
   * (D3). Ama ilk deneme bunu yanlış kurguladı ve ölçüm sınıf ayrımını ortaya
   * çıkardı:
   *
   * **① Eksik kalan `down` (under-reach)** — kendi eklediği bir şeyi düşürmeyi
   * unutur. Sonraki `up` aynı şeyi yeniden yaratmaya çalışır ve **PATLAR**
   * (`relation already exists`). Bu sınıf **gürültülüdür**, karşılaştırmaya
   * gerek kalmadan yakalanır.
   *
   * **② Fazla giden `down` (over-reach)** — kendi yaratmadığı bir şeyi de
   * düşürür. Sonraki `up` onu geri getirmez çünkü onu o yaratmamıştı. Hiçbir
   * hata çıkmaz, şema **sessizce eksilir**. Bu sınıfı yalnızca karşılaştırma
   * yakalar — ve karşılaştırmanın var olma sebebi budur.
   *
   * İkisi de sınanıyor; ② asıl kanıt.
   */
  it('② SESSİZ bozuk down (fazla giden) — yalnızca karşılaştırma yakalıyor', async () => {
    const broken = await fixtureChain([
      {
        tag: '0000_probe_base',
        up: 'CREATE TABLE "probe" ("id" serial PRIMARY KEY, "name" text NOT NULL);\nCREATE INDEX "probe_name_idx" ON "probe" ("name");',
        down: 'DROP TABLE "probe";',
      },
      {
        tag: '0001_probe_extend',
        up: 'ALTER TABLE "probe" ADD COLUMN "country" varchar(3);',
        // BOZUK: kendi sütununu düşürüyor AMA 0000'in indeksini de götürüyor.
        // Sonraki `up` o indeksi geri getirmez — onu 0000 yaratmıştı.
        down: 'ALTER TABLE "probe" DROP COLUMN "country";\nDROP INDEX "probe_name_idx";',
      },
    ]);

    await migrateUp({ executor, source: broken, logger });
    const before = await introspectSchema(executor);
    expect(before.tables[0]?.indexes.map((index) => index.name)).toContain('probe_name_idx');

    await migrateDown({ executor, source: broken, logger }, { steps: 1, allowDataLoss: true });
    // Hiçbir hata YOK — çevrim sorunsuz tamamlanıyor. Sessiz sınıf tam da bu.
    await migrateUp({ executor, source: broken, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    expect(comparison.identical).toBe(false);
    expect(summarizeDifferences(comparison)).toContain('probe_name_idx');
  });

  it('① GÜRÜLTÜLÜ bozuk down (eksik kalan) — sonraki up patlıyor', async () => {
    const broken = await fixtureChain([
      {
        tag: '0000_probe_base',
        up: 'CREATE TABLE "probe" ("id" serial PRIMARY KEY);',
        down: 'DROP TABLE "probe";',
      },
      {
        tag: '0001_probe_extend',
        up: 'ALTER TABLE "probe" ADD COLUMN "country" varchar(3);',
        // BOZUK: sütunu düşürmüyor.
        down: '-- bilerek eksik: DROP COLUMN yok',
      },
    ]);

    await migrateUp({ executor, source: broken, logger });
    await migrateDown({ executor, source: broken, logger }, { steps: 1, allowDataLoss: true });

    await expect(migrateUp({ executor, source: broken, logger })).rejects.toThrow(/already exists/);
  });
});
