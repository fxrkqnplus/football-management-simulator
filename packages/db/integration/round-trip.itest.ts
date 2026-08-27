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
 *
 * ────────────────────────────────────────────────────────────────────────────
 * FAZ 3.5'TE NE DEĞİŞTİ
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Zincir üçüncü migration'ını aldı (`0002_club_core`, beş tablo) ve bu, `down`
 * disiplininin **yeni bir sınıfını** getirdi: 0000 ve 0001'in geri almalarında
 * düşürme sırası bir okunabilirlik tercihiydi; burada **iki katmanlı bir FK
 * zinciri** var (`rivalries`/`club_facilities`/`club_finances_base` → `clubs` →
 * `stadiums`) ve yanlış sıra `down`u gerçekten patlatıyor. Sıranın gerekliliği
 * varsayılmıyor: aşağıda **yanlış sıralı bir fixture `down`u** ile ölçülüyor.
 *
 * Ayrıca 0002 **yalnızca `CREATE TABLE` içeriyor**, `ALTER` içermiyor — yani
 * 0001'in `attnum` deliği (§3.1.2 ⑤) burada oluşmuyor ve tek başına 0002
 * çevriminde `identical: true` **beklenebilir**. İki migration'ın iki farklı
 * beklentisi ayrı testlerle sabitlendi; birleştirilselerdi 0002'nin `down`u
 * 0001'in bilinen sekiz farkının arkasında **görünmez** olurdu.
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
import {
  clubFacilitiesInsertSql,
  clubFinancesInsertSql,
  clubInsertSql,
  countryInsertSql,
  rivalryInsertSql,
  stadiumInsertSql,
} from './fixtures.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

/** Zincirin son migration'ı — snapshot karşılaştırması bunu okur. */
const LATEST_SNAPSHOT = '0002_snapshot.json';
const CHAIN_TAGS = [
  '0000_countries_initial',
  '0001_geography_institutions',
  '0002_club_core',
] as const;

/** Zincirin tamamını geri almak için gereken adım sayısı. */
const FULL_CHAIN_STEPS = CHAIN_TAGS.length;

/** Şemanın tam tablo listesi — açıkça yazılıyor, journal'dan okunmuyor (fixtures.ts başlığı). */
const ALL_TABLES = [
  'club_facilities',
  'club_finances_base',
  'clubs',
  'competitions',
  'countries',
  'federations',
  'rivalries',
  'stadiums',
] as const;

/**
 * `comparedFacts` ALT SINIRI — D3 önlemi, her migration'da YENİDEN ÖLÇÜLÜR.
 *
 * "Fark yok" ancak gerçekten bir şeye bakıldıysa anlamlı. Sayaç ölçülmüş
 * değerlerden geliyor: 3.2b'de `countries` tek başına **89**, 3.4'te üç tabloda
 * **466**, 3.5'te sekiz tabloda **1.223** (gerçek PG 18.6 koşumundan okundu,
 * tahmin edilmedi — ilk yazılan 1.246 bir tahmindi ve test onu reddetti).
 * Sınır yükseltilmezse test "fark yok" demeye devam eder ama **kaç şeye
 * baktığı** sabitlenmemiş olur — D3'ün ta kendisi.
 */
const COMPARED_FACTS_FLOOR = 1_223;

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
 * SEKİZ tabloya da veri yazar — FK sırasına uyarak.
 *
 * Her tablonun `NOT NULL` sütunlarının hepsi doluyor: bir sütunu atlamak testi
 * kendi kurgusundan patlatırdı ve *çevrimin* değil *fixture'ın* hatası olurdu
 * (3.2b günlük #17'nin dersi).
 *
 * ⚠️ **Üçüncü kulüp bir MİLLİ TAKIM ve bu kasıtlı.** `competition_id` ve
 * `stadium_id` nullable yapıldı çünkü milli takımın ne ligi ne sabit sahası var
 * (SAPMA-026'nın türetme kuralı, ikinci uygulaması). Bir karar, onu kullanan bir
 * satır olmadan yalnızca bir yorumdur — bu satır kararı **koşulur** hâle
 * getiriyor ve `down`/`up` çevrimi de onun üzerinden geçiyor.
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

  // 0002 — stadyumlar önce: `clubs.stadium_id` onlara bakıyor.
  await executor.run(
    stadiumInsertSql([
      { key: 'rams-park', name: 'Rams Park', capacity: 52_223, seatedCapacity: 52_223 },
      {
        key: 'ulker-stadyumu',
        name: 'Ülker Stadyumu',
        capacity: 47_834,
        seatedCapacity: 47_834,
        builtYear: null,
        assetId: 'stadium/ulker',
      },
    ]),
  );

  await executor.run(
    clubInsertSql([
      {
        key: 'galatasaray',
        countryCode: 'TUR',
        competitionKey: 'super-lig',
        stadiumKey: 'rams-park',
        name: 'Galatasaray',
        abbreviation: 'GAL',
        externalIds: '{"wikidata":"Q170084"}',
        colorTertiary: '#FFFFFF',
        crestAssetId: 'crest/gal',
        reputation: 148,
      },
      {
        key: 'fenerbahce',
        countryCode: 'TUR',
        competitionKey: 'super-lig',
        stadiumKey: 'ulker-stadyumu',
        name: 'Fenerbahçe',
        abbreviation: 'FEN',
        source: 'wikidata',
        reputation: 146,
      },
      // ⚠️ Milli takım: ligsiz VE sahasız. Nullable kararının koşan kanıtı.
      {
        key: 'turkiye-milli',
        countryCode: 'TUR',
        competitionKey: null,
        stadiumKey: null,
        name: 'Türkiye',
        abbreviation: 'TUR',
        foundedYear: null,
        isNational: true,
        source: 'procedural',
      },
    ]),
  );

  await executor.run(
    clubFacilitiesInsertSql([{ clubKey: 'galatasaray' }, { clubKey: 'fenerbahce' }]),
  );
  await executor.run(
    clubFinancesInsertSql([
      { clubKey: 'galatasaray' },
      { clubKey: 'fenerbahce', currencyCode: 'EUR' },
    ]),
  );
  await executor.run(
    rivalryInsertSql([
      {
        clubAKey: 'galatasaray',
        clubBKey: 'fenerbahce',
        intensity: 10,
        nameKey: 'rivalry.kitalar',
      },
    ]),
  );
}

/** Seed'in yazdığı toplam satır sayısı — kayıp ölçümü testlerinin dayanağı. */
const SEEDED_ROWS = {
  countries: 3,
  federations: 2,
  competitions: 2,
  stadiums: 2,
  clubs: 3,
  club_facilities: 2,
  club_finances_base: 2,
  rivalries: 1,
} as const;

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

describe('round-trip — gerçek migration zinciri (0000 + 0001 + 0002)', () => {
  it('up → SEKİZ tabloya da veri yaz → down → up sonrası şema BİREBİR aynı', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    // ⚠️ Bu adım atlanamaz: boş şemada down/up çevrimi veri kaybı yolunu hiç
    // sınamaz ve `NOT NULL`/FK ihlallerini görmez.
    await seedAllTables();

    await migrateDown(
      { executor, source, logger },
      { steps: FULL_CHAIN_STEPS, allowDataLoss: true },
    );
    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    expect(summarizeDifferences(comparison)).toMatch(/^fark yok/);
    expect(comparison.identical).toBe(true);
    // D3 önlemi — sınır her migration'da yeniden ölçülüyor (bkz. sabitin başlığı).
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);
    expect(after.tables.map((table) => table.name).sort()).toEqual([...ALL_TABLES]);
  });

  /**
   * 0002 TEK BAŞINA — ve burada `identical: true` BEKLENİYOR.
   *
   * 0001'in çevriminde `attnum` deliği kaçınılmazdı (§3.1.2 ⑤) çünkü orada
   * `ALTER TABLE … DROP COLUMN` vardı. 0002 **yalnızca `CREATE TABLE`**
   * içeriyor: tablolar düşüp yeniden yaratılıyor, yani sütun numaraları
   * 1'den başlıyor ve hiçbir delik kalmıyor.
   *
   * Bu ayrımın ayrı bir test olması gerekiyor. Tek bir birleşik testte 0002'nin
   * `down`u 0001'in bilinen sekiz farkının **arkasında** kalırdı: fazla giden
   * bir `down` "zaten fark bekliyorduk" diye okunurdu.
   */
  it('yalnızca 0002 geri alınıp yeniden uygulanınca şema BİREBİR aynı', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    const before = await introspectSchema(executor);

    await migrateDown({ executor, source, logger }, { steps: 1, allowDataLoss: true });

    // Geri alma gerçekten beş tabloyu düşürdü — 0001'in üçü ayakta.
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([
      'competitions',
      'countries',
      'federations',
    ]);

    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    expect(summarizeDifferences(comparison)).toMatch(/^fark yok/);
    expect(comparison.identical).toBe(true);
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);
  });

  /**
   * ⚠️ `down`UN SIRASI GERÇEKTEN GEREKLİ — varsayılmıyor, ÖLÇÜLÜYOR.
   *
   * `drizzle/down/0002_club_core.sql` bağımlılık zincirini tersten sökmek
   * zorunda (uydular → `clubs` → `stadiums`) ve dosya bunu yazıyor. Ama yazılı
   * bir gerekçe, sınanmadığı sürece bir **temennidir**: gerçekten patlıyor mu?
   *
   * Fixture zinciri gerçek şemayı taklit ediyor (iki katmanlı FK) ve `down`u
   * bilerek YANLIŞ sırada yazıyor. Gerçek `down` aynı yapıyı doğru sırada
   * söküyor ve yukarıdaki testlerde dolu tablolarla sorunsuz koşuyor — yani
   * nöbetçi iki yönlü.
   */
  it('YANLIŞ sıralı down FK ihlaliyle patlıyor — sıra bir tercih değil', async () => {
    const broken = await fixtureChain([
      {
        tag: '0000_venue',
        up: 'CREATE TABLE "venue" ("id" serial PRIMARY KEY);',
        down: 'DROP TABLE "venue";',
      },
      {
        tag: '0001_team_and_kit',
        up: [
          'CREATE TABLE "team" ("id" serial PRIMARY KEY, "venue_id" integer);',
          'ALTER TABLE "team" ADD CONSTRAINT "team_venue_fk" FOREIGN KEY ("venue_id") REFERENCES "venue"("id");',
          'CREATE TABLE "kit" ("id" serial PRIMARY KEY, "team_id" integer NOT NULL);',
          'ALTER TABLE "kit" ADD CONSTRAINT "kit_team_fk" FOREIGN KEY ("team_id") REFERENCES "team"("id");',
        ].join('\n'),
        // BOZUK: `team`i, ona bakan `kit` hâlâ dururken düşürüyor.
        down: 'DROP TABLE "team";\nDROP TABLE "kit";',
      },
    ]);

    await migrateUp({ executor, source: broken, logger });

    await expect(
      migrateDown({ executor, source: broken, logger }, { steps: 1, allowDataLoss: true }),
      // ⚠️ Desen tırnaksız: PostgreSQL 18.6 bu mesajda tablo adını tırnak
      // İÇİNE ALMIYOR (ölçüldü — ilk yazılan tırnaklı desen eşleşmedi).
    ).rejects.toThrow(/cannot drop table team because other objects depend on it/);
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
  it('0002+0001 geri alınınca TEK fark sütun NUMARALARI — başka hiçbir şey', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    // ⚠️ `steps: 2` — 3.5'te zincir uzadı. 0002 önce, 0001 sonra geri alınıyor;
    // `countries` ayakta kalıyor ve `attnum` deliği ölçülebilir hâlde duruyor.
    await migrateDown({ executor, source, logger }, { steps: 2, allowDataLoss: true });

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
  it('0001 geri alınıp VERİ VARKEN yeniden uygulanırsa GÜRÜLTÜLÜ patlıyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();

    await migrateDown({ executor, source, logger }, { steps: 2, allowDataLoss: true });

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

    await migrateDown(
      { executor, source, logger },
      { steps: FULL_CHAIN_STEPS, allowDataLoss: true },
    );
    await migrateUp({ executor, source, logger });

    const positionAfter = await readSequencePosition(executor, 'countries_id_seq');
    const schemaAfter = await introspectSchema(executor);

    // Konum: veri ile birlikte gitti.
    expect(positionBefore).toEqual({ lastValue: '3', isCalled: true });
    expect(positionAfter).toEqual({ lastValue: '1', isCalled: false });

    // Tanım: birebir aynı — ve karşılaştırma bunu görüyor.
    expect(compareSchemas(schemaBefore, schemaAfter).identical).toBe(true);
    // ⚠️ ALTI sequence, SEKİZ tablo: `club_facilities` ve `club_finances_base`
    // `serial id` TAŞIMIYOR (`club_id` hem PK hem FK), yani sequence üretmiyorlar.
    expect(schemaAfter.sequences.map((sequence) => sequence.name).sort()).toEqual([
      'clubs_id_seq',
      'competitions_id_seq',
      'countries_id_seq',
      'federations_id_seq',
      'rivalries_id_seq',
      'stadiums_id_seq',
    ]);
  });

  /**
   * TAKİP TABLOSU — `down` satırı silmezse ikinci `up` SESSİZCE hiçbir şey yapmaz.
   * Bu, en tehlikeli başarısızlık biçimi: hata yok, şema eksik.
   */
  it('down takip satırlarını siliyor, sonraki up gerçekten uyguluyor', async () => {
    await migrateUp({ executor, source, logger });
    expect(await trackedCount()).toBe(FULL_CHAIN_STEPS);

    await migrateDown(
      { executor, source, logger },
      { steps: FULL_CHAIN_STEPS, allowDataLoss: true },
    );
    expect(await trackedCount()).toBe(0);

    const again = await migrateUp({ executor, source, logger });
    // Sessiz no-op OLMADI: migration'lar gerçekten yeniden uygulandı.
    expect(again.applied).toEqual([...CHAIN_TAGS]);
    expect(await trackedCount()).toBe(FULL_CHAIN_STEPS);
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
    // ── 3.5'in beş yeni tablosu ────────────────────────────────────────────
    ['clubs', 'ALTER TABLE "clubs" DROP COLUMN "is_national"', 'is_national'],
    [
      'clubs',
      'ALTER TABLE "clubs" DROP CONSTRAINT "clubs_stadium_id_stadiums_id_fk"',
      'clubs_stadium_id_stadiums_id_fk',
    ],
    [
      'stadiums',
      'ALTER TABLE "stadiums" DROP CONSTRAINT "stadiums_source_check"',
      'stadiums_source_check',
    ],
    ['club_finances_base', 'ALTER TABLE "club_finances_base" DROP COLUMN "balance"', 'balance'],
    ['club_facilities', 'DROP TABLE "club_facilities"', 'club_facilities'],
    ['rivalries', 'DROP TABLE "rivalries"', 'rivalries'],
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

    await expect(
      migrateDown({ executor, source, logger }, { steps: FULL_CHAIN_STEPS }),
    ).rejects.toMatchObject({
      code: 'migration.downWouldLoseData',
    });

    // Reddedilen işlem GERİ ALINDI: şema ve veri yerinde.
    const state = await introspectSchema(executor);
    expect(state.tables.map((table) => table.name).sort()).toEqual([...ALL_TABLES]);
    expect(await trackedCount()).toBe(FULL_CHAIN_STEPS);
  });

  it('kayıp raporu TABLO ve SÜTUN kaybını AYRI AYRI gösteriyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();

    // Kuru çalıştırma: gerçekten uygular, ölçer, geri alır.
    const result = await migrateDown(
      { executor, source, logger },
      { steps: FULL_CHAIN_STEPS, dryRun: true, allowDataLoss: true },
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

    // SEKİZ tablo da düşüyor (0000'in `down`u `countries`i de götürüyor).
    expect(droppedTables).toEqual([...ALL_TABLES]);
    // `countries` tablo olarak düştüğü için sütunları AYRICA sayılmıyor —
    // `computeLoss` tabloyu bir bütün olarak raporluyor. Yani karışık vakada
    // sütun kalemi ancak tablo AYAKTA kalırsa görünür (aşağıdaki test).
    expect(droppedColumns).toEqual([]);
    expect(result.loss.totalRowsAtRisk).toBe(
      Object.values(SEEDED_ROWS).reduce((total, rows) => total + rows, 0),
    );

    // Kuru çalıştırma hiçbir şey kaybetmedi.
    expect(await trackedCount()).toBe(FULL_CHAIN_STEPS);
  });

  it('SÜTUN kaybı ayrı bir kalem olarak görünüyor — 0002+0001 geri alınınca', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();

    const result = await migrateDown(
      { executor, source, logger },
      { steps: 2, dryRun: true, allowDataLoss: true },
    );

    const byKind = {
      table: result.loss.items.filter((item) => item.kind === 'table').map((item) => item.table),
      column: result.loss.items
        .filter((item) => item.kind === 'column')
        .map((item) => `${item.table}.${item.column ?? '?'}`),
    };

    // YEDİ tablo düşüyor: 0002'nin beşi + 0001'in ikisi. `countries` ayakta
    // kalıyor, o yüzden sütun kalemleri burada GÖRÜNÜR (yukarıdaki testte değil).
    expect(byKind.table.sort()).toEqual([
      'club_facilities',
      'club_finances_base',
      'clubs',
      'competitions',
      'federations',
      'rivalries',
      'stadiums',
    ]);
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
    // 7 tablonun satırları + 8 sütun × `countries` satır sayısı.
    const droppedTableRows =
      SEEDED_ROWS.club_facilities +
      SEEDED_ROWS.club_finances_base +
      SEEDED_ROWS.clubs +
      SEEDED_ROWS.competitions +
      SEEDED_ROWS.federations +
      SEEDED_ROWS.rivalries +
      SEEDED_ROWS.stadiums;
    expect(result.loss.totalRowsAtRisk).toBe(droppedTableRows + 8 * SEEDED_ROWS.countries);
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

  /**
   * `clubs` FİZİKSEL SÜTUN SIRASI — Faz 4'ün uyacağı sözleşme.
   *
   * Bugün sıra bedava doğru: 0002 `CREATE TABLE` yazıyor, yani fiziksel sıra =
   * TS sırası. Ama **Faz 4 bu tabloya `chairman_person_id`i `ALTER TABLE ADD
   * COLUMN` ile ekleyecek** ve o an §3.1.2 ④ devreye giriyor: sütun TS tanımının
   * da SONUNA yazılmazsa snapshot ↔ gerçek şema karşılaştırması kırılır.
   *
   * Bu test o günün nöbetçisi: listeyi buraya yazmak, kırılmanın **neden**
   * olduğunu da yazmak demek. Sırası olmayan bir iddia, kırıldığında yalnızca
   * "bir şey değişti" der.
   */
  it('clubs fiziksel sütun sırası 0002 snapshot’ıyla AYNI — Faz 4 sona ekleyecek', async () => {
    await migrateUp({ executor, source, logger });
    const real = await introspectSchema(executor);
    const clubsTable = real.tables.find((table) => table.name === 'clubs');

    expect(clubsTable?.columns.map((column) => column.name)).toEqual([
      'id',
      'key',
      'source',
      'external_ids',
      'competition_id',
      'country_id',
      'name',
      'short_name',
      'abbreviation',
      'founded_year',
      'city',
      'stadium_id',
      'reputation',
      'color_primary',
      'color_secondary',
      'color_tertiary',
      'crest_asset_id',
      'crest_seed',
      'supporter_count',
      'supporter_expectation',
      'is_national',
      'created_at',
      'updated_at',
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
