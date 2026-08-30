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
  clubKitInsertSql,
  countryInsertSql,
  federationInsertSql,
  kitTemplateInsertSql,
  personInsertSql,
  playerAttributesInsertSql,
  playerHiddenAttributesInsertSql,
  playerInsertSql,
  playerPositionInsertSql,
  playerStatsHistoryInsertSql,
  playerTraitInsertSql,
  refereeInsertSql,
  rivalryInsertSql,
  stadiumInsertSql,
} from './fixtures.js';

const logger = createNoopLogger();
const DRIZZLE_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

/** Zincirin son migration'ı — snapshot karşılaştırması bunu okur. */
const LATEST_SNAPSHOT = '0009_snapshot.json';
const CHAIN_TAGS = [
  '0000_countries_initial',
  '0001_geography_institutions',
  '0002_club_core',
  '0003_visual_assets_referees',
  '0004_search_indexes',
  '0005_people_players',
  '0006_forward_person_fks',
  // 🆕 4.5 — İKİ migration, tek alt görev. Ayrı olmaları bir İDDİA AYRIMI
  // kararı: 0007 iki tablo yaratıp `players`a iki kısıt ekliyor, 0008 yalnızca
  // `people`ın CHECK tanımını genişletiyor (G-18). Tek migration'da
  // birleştirilselerdi birinin fazla giden bir `down`u diğerinin arkasında
  // saklanabilirdi — §3.1.2 ⑤'in kendi notu. Gerekçenin tamamı
  // `drizzle/down/0008_person_type_referee.sql` başlığında.
  '0007_player_attributes',
  '0008_person_type_referee',
  // 🆕 4.6 — üç tablo, TEK migration. 4.5'in çift-migration kararı burada
  // TEKRARLANMADI ve ayraç aynı: *"iki farklı `down` hata sınıfı var mı?"*
  // Üçü de saf `CREATE TABLE`, üçü de aynı sınıf, üçü de aynı `down`da
  // düşüyor — bölmek üç ayrı çevrim testi üretir ve hiçbiri diğerinin
  // göremediği bir şeyi göremezdi.
  '0009_player_positions_traits_stats',
] as const;

/** Zincirin tamamını geri almak için gereken adım sayısı. */
const FULL_CHAIN_STEPS = CHAIN_TAGS.length;

/**
 * `tag`'i (ve ondan SONRAKİLERİ) geri almak için gereken adım sayısı.
 *
 * ⚠️ **ELLE YAZILAN SAYILAR BİR KEZ KAYDI — ölçüldü (Faz 4.3).** Bu testler
 * `steps`i sabit yazıyordu ve 3.7 zincire `0004`ü eklerken **kodu artırdı ama
 * yorumları güncellemedi**: dosyada "steps: 2" yazan bir yorumun
 * altında `{ steps: 3 }` duruyordu — üç yerde birden. Yorum ile kod arasındaki
 * bu boşluk sessiz değil ama **yanıltıcı**: sonraki oturum hangisinin doğru
 * olduğunu bilemez.
 *
 * Sayı artık zincirin **kendisinden** türetiliyor. Yeni bir migration
 * eklendiğinde hiçbir `steps` elle düzeltilmiyor — ve *"hangi migration geri
 * alınıyor"* sorusu çağrı yerinde **adıyla** okunuyor.
 */
function stepsBackTo(tag: (typeof CHAIN_TAGS)[number]): number {
  return CHAIN_TAGS.length - CHAIN_TAGS.indexOf(tag);
}

/**
 * Şemanın tam tablo listesi — açıkça yazılıyor, journal'dan okunmuyor
 * (`fixtures.ts` başlığındaki ayrım).
 *
 * ⚠️ **Faz 3'ün envanteri burada TAMAMLANMIŞTI: 11 tablo.** Sayı üç ayrı yerde
 * üç farklı şekilde yazılıydı ve 3.1'de 11'de mutabakata bağlanmıştı
 * (SAPMA-021). Bu liste o iddianın **koşan** hâli: gerçek veritabanından
 * okunuyor ve adıyla karşılaştırılıyor.
 */
const ALL_TABLES = [
  'club_facilities',
  'club_finances_base',
  'club_kits',
  'clubs',
  'competitions',
  'countries',
  'federations',
  'kit_templates',
  // 🆕 Faz 4.3 — `0005`in iki tablosu. Faz 4'ün envanteri 11 master
  // (ROADMAP, SAPMA-030); bu ikisiyle 13'e çıkıyor ve dokuzu daha 4.5–4.7'de
  // gelecek.
  'people',
  // 🆕 Faz 4.5 — `0007`nin iki tablosu. 47 görünür + 10 gizli nitelik, ikisi de
  // `players` ile 1:1 (`player_id` PK **ve** FK). Kalan yedi tablo 4.6–4.7'de.
  'player_attributes',
  'player_hidden_attributes',
  // 🆕 Faz 4.6 — `0009`un üç tablosu. Üçü de `players`a bakıyor ve üçü de 1:N
  // (ikisi bileşik PK, biri `serial id`). Kalan dört master tablo 4.7'de.
  'player_positions',
  'player_stats_history',
  'player_traits',
  'players',
  'referees',
  'rivalries',
  'stadiums',
] as const;

/** SAPMA-021'in envanter sayısı — listeyle ayrışamaz. 4.3'te 11 → 13, 4.5'te → 15, 4.6'da → 18. */
const MASTER_TABLE_COUNT = 18;

/**
 * `0009` geri alındığında geriye kalan on beş tablo — 4.5'in sonundaki şema.
 *
 * `ALL_TABLES`ten türetilmiyor (aynı gerekçe `PHASE_3_TABLES`teki gibi): şema
 * içeriğini sınayan testlerde beklenen adlar AÇIK yazılır.
 */
const THROUGH_0008_TABLES = [
  'club_facilities',
  'club_finances_base',
  'club_kits',
  'clubs',
  'competitions',
  'countries',
  'federations',
  'kit_templates',
  'people',
  'player_attributes',
  'player_hidden_attributes',
  'players',
  'referees',
  'rivalries',
  'stadiums',
] as const;

/**
 * `0007` geri alındığında geriye kalan on üç tablo — 4.4'ün sonundaki şema.
 *
 * `ALL_TABLES`ten türetilmiyor (aynı gerekçe `PHASE_3_TABLES`teki gibi): şema
 * içeriğini sınayan testlerde beklenen adlar AÇIK yazılır.
 */
const THROUGH_0006_TABLES = [
  'club_facilities',
  'club_finances_base',
  'club_kits',
  'clubs',
  'competitions',
  'countries',
  'federations',
  'kit_templates',
  'people',
  'players',
  'referees',
  'rivalries',
  'stadiums',
] as const;

/**
 * Faz 3'ün on bir tablosu — `0005` geri alındığında geriye kalan.
 *
 * `ALL_TABLES`ten türetilmiyor, **açıkça** yazılıyor: dosyanın kendi kuralı
 * (`fixtures.ts` başlığı) şema İÇERİĞİNİ sınayan testlerde beklenen adların
 * açık olmasını istiyor. Türetilseydi `ALL_TABLES`e yanlış bir tablo eklendiğinde
 * bu liste de sessizce onu yansıtırdı.
 */
const PHASE_3_TABLES = [
  'club_facilities',
  'club_finances_base',
  'club_kits',
  'clubs',
  'competitions',
  'countries',
  'federations',
  'kit_templates',
  'referees',
  'rivalries',
  'stadiums',
] as const;

/**
 * `comparedFacts` ALT SINIRI — D3 önlemi, her migration'da YENİDEN ÖLÇÜLÜR.
 *
 * "Fark yok" ancak gerçekten bir şeye bakıldıysa anlamlı. Sayaç ölçülmüş
 * değerlerden geliyor: 3.2b'de `countries` tek başına **89**, 3.4'te üç tabloda
 * **466**, 3.5'te sekiz tabloda **1.223**, 3.6'da on bir tabloda **1.619**,
 * 3.7'de dört indeksle **1.627**, 4.3'te on üç tabloda **2.204**, 4.4'te üç yeni
 * sütun ve üç yeni FK ile **2.243**, 4.5'te iki yeni tablo ve 57 yeni sütunla
 * **3.023**, 4.6'da üç yeni tablo ve 42 yeni sütunla **3.570**. Sınır
 * yükseltilmezse test "fark yok" demeye devam eder ama **kaç şeye baktığı**
 * sabitlenmemiş olur — D3.
 *
 * ℹ️ **4.6'nın artışı +547 ve 4.5'inkinden (+780) KÜÇÜK — sütun sayısı öyle
 * diyor.** 4.5 63 yeni sütun getirdi (57 nitelik + 2 `player_id` + 4 zaman
 * damgası), 4.6 **42** getiriyor (5 + 33 + 4). Buna karşılık 4.6 daha fazla
 * kısıt ekliyor: üç PK, **beş** FK ve iki CHECK. Artışın sütun sayısıyla
 * orantılı gitmesi, `ColumnFacts` alanlarının olgu sayısındaki ağırlığını
 * gösteriyor — kısıtlar tablo başına birkaç olgu, sütunlar her biri için bir
 * demet.
 *
 * ℹ️ **4.5'in artışı +780 ve serinin en büyük ikinci sıçraması.** Kaynağı adıyla
 * belli: 57 nitelik sütunu + iki `player_id` + dört zaman damgası = **63 yeni
 * sütun**, her biri `ColumnFacts` alanları kadar olgu (`udtName` dahil, 4.3'ün
 * ölçümü), artı iki tablo, iki PK, iki FK ve `players`ın iki yeni CHECK'i.
 * `0008` bu sayıya **hiç katkı yapmıyor** — bir CHECK'in tanımını değiştirmek
 * yeni bir olgu üretmiyor, var olanı güncelliyor. Sayı yine **ölçüldü**: sınır
 * `9_999_999`a kondu ve gerçek değer testin reddettiği çıktıdan okundu.
 *
 * ℹ️ **4.4'ün artışı yalnızca +39 ve bu BEKLENEN.** 4.3 +577 getirmişti çünkü
 * iki yeni TABLO ve her sütuna bir olgu ekleyen `udtName` vardı; 4.4 yeni tablo
 * yaratmıyor. Üç sütun (her biri `ColumnFacts` alanları kadar olgu) ve üç FK
 * kısıtı — küçük artış, migration'ın **şeklinin** doğrulaması.
 *
 * ⚠️ **4.3'ün artışı (+577) İKİ kaynaktan geliyor ve ikincisi bütün tabloları
 * etkiliyor:** ① `people` + `players` (17 + 17 sütun, iki sequence, altı kısıt) ·
 * ② `udtName` alanı **her sütuna** bir olgu ekliyor (`types.ts`teki gerekçe),
 * yani tek başına şemadaki sütun sayısı kadar artış. Sayı yine **ölçüldü**:
 * sınır `9_999_999`a kondu ve gerçek değer testin reddettiği çıktıdan okundu.
 *
 * ℹ️ **3.7'nin artışı yalnızca +8 ve bu BEKLENEN:** indeksler tablo/sütun
 * eklemiyor, yalnızca dört indeks olgusu (ad + tanım) getiriyor. Küçük artış,
 * karşılaştırmanın indekslere *baktığının* kanıtı değil — onu yukarıdaki
 * `DROP INDEX` mutasyon testleri kanıtlıyor.
 *
 * ⚠️ **Sayı TAHMİN EDİLMEZ.** 3.5'te 1.246 yazıldı, gerçek 1.223 çıktı ve test
 * onu reddetti (günlük #34). 3.6'dan beri yöntem: sınır kasıtlı olarak
 * erişilemeyecek bir değere (`9_999_999`) konur ve gerçek değer testin
 * reddettiği çıktıdan okunur. **Tahmin hiç yazılmaz.**
 */
const COMPARED_FACTS_FLOOR = 3_570;

/**
 * `0006`NIN ÇEVRİMDE BIRAKTIĞI `attnum` KAYMALARI — §3.1.2 ⑤.
 *
 * ⚠️ **4.4'ün en geniş yankısı bu ve beklenen bir şeydi.** `0006` zincirin
 * 0001'den beri ilk `ALTER`-only migration'ı; `down` sütunu düşürüyor, `up`
 * yeniden ekliyor ve `pg_attribute.attnum` **geri kazanılmıyor**. Sonuç:
 * 0006'nın içinden geçen **her** kısmi geri alma artık bu kaymaları taşıyor,
 * yalnızca 0006'nın kendi testi değil.
 *
 * Hangi kaymanın görüneceği, o geri almada tablonun **ayakta kalıp kalmadığına**
 * bağlı — düşen bir tablo yeniden yaratılınca `attnum` 1'den başlar ve delik
 * kalmaz:
 *
 * | Geri alma | `federations` | `clubs` | `referees` | Kayma |
 * |---|---|---|---|---|
 * | 0006 | ayakta | ayakta | ayakta | **3** |
 * | 0005 · 0004 | ayakta | ayakta | ayakta | **3** |
 * | 0003 | ayakta | ayakta | **düşüyor** | **2** |
 * | 0002 | ayakta | **düşüyor** | düşüyor | **1** |
 * | 0001 | **düşüyor** | düşüyor | düşüyor | 0 (yerine `countries`in sekizi) |
 * | tam zincir | düşüyor | düşüyor | düşüyor | **0** → `identical: true` |
 *
 * ⚠️ **`identical: true` YERİNE TAM LİSTE — ve bu bir GEVŞETME DEĞİL.** 3.4'te
 * 0001 için verilen kararın aynısı: beklenen kaymaların dışında **tek bir fark**
 * çıkarsa test kırılır, yani 0005'in ya da 0003'ün fazla giden bir `down`u yine
 * yakalanır. Gevşetme, *"zaten fark bekliyorduk"* diye **sayısız** bir beklenti
 * yazmak olurdu; burada her farkın yolu, öncesi ve sonrası sabit.
 */
const ALTER_0006_SHIFTS = {
  clubs: ['table.clubs.column.chairman_person_id.position', '24', '25'],
  federations: ['table.federations.column.president_person_id.position', '8', '9'],
  referees: ['table.referees.column.person_id.position', '14', '15'],
} as const;

/** Ayakta kalan tabloların kaymaları — katalog sırası (tablo adına göre). */
function expectedShifts(...tables: readonly (keyof typeof ALTER_0006_SHIFTS)[]): {
  paths: string[];
  values: string[][];
} {
  const rows = [...tables].sort().map((table) => ALTER_0006_SHIFTS[table]);
  return {
    paths: rows.map((row) => row[0]),
    values: rows.map((row) => [row[1], row[2]]),
  };
}

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

  /**
   * 🆕 Faz 4.4 — `people` ARTIK EN BAŞTA, `countries`in hemen ardında.
   *
   * 4.3'te bu blok dosyanın **sonundaydı** ve orada doğruydu: hiçbir Faz 3
   * tablosu `people`a bakmıyordu. `0006` üç ileri FK'yı ekleyince yön değişti —
   * `federations`, `clubs` ve `referees` artık `people`a bakıyor, yani kişiler
   * onlardan **önce** yazılmak zorunda. `referees.person_id` `NOT NULL` olduğu
   * için bu bir tercih değil: sıra yanlışsa seed gürültülü patlar.
   *
   * ⚠️ **Altı kişi ALTI FARKLI ŞEKLİ temsil ediyor ve bu kasıtlı:** tek uyruklu ·
   * **çift uyruklu** (`second_nationality_country_id` dolu — nullable FK'nın
   * `null` OLMAYAN hâli) · **iki rollü** (`person_type` iki elemanlı) · iki
   * **başkan** (biri kulüp, biri federasyon — 4.4'ün iki nullable ileri FK'sının
   * dolu hâli) · iki **hakem kişisi** (4.4'ün `NOT NULL` ileri FK'sı). Tek
   * şekilli bir fixture, çevrimi o şekilden başka bir şeyle hiç sınamazdı.
   *
   * ℹ️ Hakem kişilerinin `person_type`ı fixture varsayılanı — kapalı küme hakemi
   * ifade etmiyor (G-18) ve bu testlerin konusu o değil.
   */
  await executor.run(
    personInsertSql([
      { key: 'kisi-1', countryCode: 'TUR', firstName: 'Arda', lastName: 'Güler' },
      {
        key: 'kisi-2',
        countryCode: 'ENG',
        secondCountryCode: 'TUR',
        commonName: 'Jimmy',
        birthCity: null,
        personType: ['player', 'manager'],
      },
      {
        key: 'kisi-3',
        countryCode: 'ESP',
        gender: 'female',
        personType: ['chairman'],
        portraitAssetId: 'portrait/kisi-3',
      },
      { key: 'kisi-4', countryCode: 'TUR', personType: ['chairman'] },
      // ⚠️ **`['referee']` — 4.5'te `['player']` VARSAYILANINDAN ÇIKARILDI.**
      // 4.4'te bu iki kişi `person_type = ['player']` taşıyordu, çünkü kapalı
      // küme hakemi ifade etmiyordu (G-18). Yani entegrasyon testlerindeki her
      // hakem **oyuncu** olarak kayıtlıydı — SAPMA-026'nın yasakladığı şey.
      // `0008` kümeye `'referee'` ekledi; varsayılana düşmedikleri ayrıca
      // iddia ediliyor (`schema-constraints.itest.ts`).
      { key: 'hakem-kisi-1', countryCode: 'TUR', source: 'procedural', personType: ['referee'] },
      { key: 'hakem-kisi-2', countryCode: 'ENG', source: 'procedural', personType: ['referee'] },
    ]),
  );

  /**
   * ⚠️ **İki federasyondan yalnızca BİRİNİN başkanı var** — `president_person_id`
   * nullable ve `ON DELETE SET NULL` alan tek FK. Dolu ve boş hâlin ikisi de
   * çevrimden geçiyor; yalnızca dolu hâl yazılsaydı `null` yolu hiç sınanmazdı.
   */
  await executor.run(
    federationInsertSql([
      {
        countryCode: 'TUR',
        name: 'Türkiye Futbol Federasyonu',
        foundedYear: 1923,
        presidentPersonKey: 'kisi-4',
      },
      { countryCode: 'ENG', name: 'The Football Association', foundedYear: 1863 },
    ]),
  );

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
        // 🆕 4.4 — üç kulüpten YALNIZCA BİRİNİN başkanı var. `chairman_person_id`
        // nullable; dolu ve boş hâlin ikisi de çevrimden geçiyor.
        chairmanPersonKey: 'kisi-3',
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

  // 0003 — şablonlar önce: `club_kits.template_id` onlara bakıyor.
  await executor.run(
    kitTemplateInsertSql([
      { code: 'stripes_vertical', colorSlots: 2 },
      { code: 'sash', colorSlots: 3 },
    ]),
  );

  await executor.run(
    clubKitInsertSql([
      // Gerçek görseli OLAN forma — `asset_id` dolu.
      {
        clubKey: 'galatasaray',
        templateCode: 'stripes_vertical',
        kitType: 'home',
        assetId: 'kit/galatasaray-home',
      },
      // Görseli OLMAYAN forma — `asset_id` null, şablondan üretilecek (K9).
      { clubKey: 'galatasaray', templateCode: 'sash', kitType: 'away', color3: '#FFFFFF' },
      { clubKey: 'fenerbahce', templateCode: 'stripes_vertical', kitType: 'home' },
    ]),
  );

  await executor.run(
    refereeInsertSql([
      { key: 'hakem-1', countryCode: 'TUR', personKey: 'hakem-kisi-1' },
      {
        key: 'hakem-2',
        countryCode: 'ENG',
        personKey: 'hakem-kisi-2',
        source: 'pack',
        strictness: 17,
      },
    ]),
  );

  /**
   * ⚠️ **İkinci oyuncu SERBEST (`club_id IS NULL`) ve bu da kasıtlı:** ilk
   * oyuncu `SET NULL`ın kaynağını, ikincisi **hedef durumunu** taşıyor. Çevrim
   * ikisinin de üzerinden geçiyor.
   */
  await executor.run(
    playerInsertSql([
      { personKey: 'kisi-1', clubKey: 'galatasaray', primaryPosition: 'AMC' },
      { personKey: 'kisi-2', clubKey: null, squadNumber: null, retiredAt: '2019-06-30' },
    ]),
  );

  /**
   * 0007 — nitelikler. ⚠️ **YALNIZCA BİR OYUNCUNUN nitelikleri yazılıyor.**
   *
   * İkinci oyuncu (emekli, serbest) bilerek niteliksiz: `player_attributes`
   * `players` ile 1:1 **ama 1:0..1** — PK/FK olmak *"her oyuncunun bir satırı
   * var"* demek değil, *"en fazla bir satırı var"* demek. İki oyuncunun ikisine
   * de yazılsaydı bu ayrım çevrimden hiç geçmezdi ve boş tarafın bir gün
   * `NOT NULL`a çevrilmesi sessiz kalırdı.
   *
   * ⚠️ İki tablo AYNI oyuncuya yazılıyor: görünür ve gizli nitelikler aynı
   * satırın iki yüzü, ayrı oyunculara dağıtmak yanlış bir model önerirdi.
   */
  await executor.run(playerAttributesInsertSql([{ personKey: 'kisi-1' }]));
  await executor.run(playerHiddenAttributesInsertSql([{ personKey: 'kisi-1' }]));

  /**
   * 🆕 0009 — mevki matrisi, özel yetenekler, istatistik geçmişi.
   *
   * ⚠️ **ÜÇÜ DE 1:N ve fixture bunu GÖSTERİYOR:** aynı oyuncuya üç mevki, iki
   * özel yetenek ve iki sezon yazılıyor. Her tabloya tek satır konsaydı çevrim
   * *"birden çok satır"* durumundan hiç geçmezdi ve bileşik PK'nin ikinci
   * bileşeni hiçbir şey ölçmezdi (`player_attributes`ın 1:0..1 notunun kardeşi).
   *
   * ⚠️ **İKİNCİ OYUNCU YİNE BOŞ** — 1:N *"en az bir satır"* demek değil,
   * *"sıfır veya daha çok"* demek. Bu ayrım bir gün `NOT NULL`a ya da zorunlu
   * bir ilişkiye çevrilirse sessiz kalmasın.
   *
   * ⚠️ **`club_id`nin İKİ HÂLİ de temsil ediliyor** — biri dolu, biri `NULL`.
   * `SET NULL` davranışının çevrimden geçmesi ve *"kulüp bilinmiyor"* durumunun
   * gerçekten yazılabildiği ancak böyle ölçülüyor (4.4'ün çift uyruk kararıyla
   * aynı biçim: nullable bir FK'nın `null` OLMAYAN hâli de fixture'da olmalı).
   */
  await executor.run(
    playerPositionInsertSql([
      { personKey: 'kisi-1', position: 'MC', level: 'natural' },
      { personKey: 'kisi-1', position: 'AMC', level: 'accomplished' },
      { personKey: 'kisi-1', position: 'ST', level: 'ineffectual' },
    ]),
  );
  await executor.run(
    playerTraitInsertSql([
      { personKey: 'kisi-1', traitCode: 'runs_with_ball_through_centre' },
      { personKey: 'kisi-1', traitCode: 'tries_long_range_passes' },
    ]),
  );
  await executor.run(
    playerStatsHistoryInsertSql([
      {
        personKey: 'kisi-1',
        seasonYear: 2024,
        competitionKey: 'super-lig',
        clubKey: 'galatasaray',
      },
      // Kulüp BİLİNMİYOR — nullable FK'nın `null` hâli, ve `SET NULL`ın hedefi.
      { personKey: 'kisi-1', seasonYear: 2023, competitionKey: 'super-lig', goals: 7 },
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
  kit_templates: 2,
  club_kits: 3,
  referees: 2,
  // 🆕 4.4: 3 → 6. Üç yeni kişi üç yeni rolü dolduruyor — federasyon başkanı
  // (`kisi-4`) ve iki hakem kişisi. Kulüp başkanı için var olan `kisi-3`
  // kullanılıyor (`person_type` zaten `['chairman']`).
  people: 6,
  players: 2,
  // 🆕 4.5 — iki oyuncudan YALNIZCA BİRİNİN nitelikleri var. 1:1 değil
  // **1:0..1**; boş taraf bilerek temsil ediliyor (`seedAllTables` notu).
  player_attributes: 1,
  player_hidden_attributes: 1,
  // 🆕 4.6 — üçü de 1:N ve fixture bunu gösteriyor: tek oyuncuya üç mevki, iki
  // özel yetenek, iki sezon. İkinci oyuncu bilerek boş (1:N "en az bir" demek
  // değil).
  player_positions: 3,
  player_traits: 2,
  player_stats_history: 2,
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

/**
 * 🆕 Faz 4.4 — `referees` satırlarını siler, ÇÜNKÜ `0006` YENİDEN UYGULANAMAZ.
 *
 * ⚠️ **Bu bir gevşetme değil, ölçülmüş bir SINIR** ve gerekçesi
 * `src/schema/referees.ts` başlığında: `0006` `referees`e `person_id`i
 * **`NOT NULL` ve varsayılansız** ekliyor; `down` sütunu düşürüyor ama
 * **satırları düşürmüyor**. Dolu bir tabloda `up` yeniden koştuğunda
 * `column "person_id" ... contains null values` ile patlar.
 *
 * Bu, `countries.source`un 0001'de yarattığı durumun birebir aynısı ve o gün
 * verilen kararla aynı biçimde ele alınıyor: **davranışın kendi testi var**
 * (*"0006 geri alınıp VERİ VARKEN yeniden uygulanırsa GÜRÜLTÜLÜ patlıyor"*).
 * Yani engel bu yardımcıyla **gizlenmiyor**, başka bir testte açıkça iddia
 * ediliyor.
 *
 * ⚠️ **Neden `seedAllTables()` çağrısını kaldırmak DEĞİL:** 0005/0004 çevrim
 * testlerinin ölçtüğü şey *"dolu tablolarla down/up"*. Seed tamamen
 * kaldırılsaydı on üç tablonun on üçü boş kalır ve bu testler veri kaybı yolunu
 * hiç sınamazdı. Burada yalnızca **tek bir engel** kaldırılıyor ve adı yazılı.
 * 0001'in aynı sınıftaki testi (*"TEK fark sütun NUMARALARI"*) seed'i baştan
 * hiç çağırmıyor — orada engel `countries`ti, yani seed'in **tamamı**.
 */
async function clearRefereesForReup(): Promise<void> {
  await executor.run(`DELETE FROM "referees"`);
}

/**
 * ⚠️ **0008'İN SINIRI — VE BU SINIR YUKARIDAKİNDEN DAHA GENİŞ (Faz 4.5'te ölçüldü).**
 *
 * `0008`in `down`u `people_person_type_check`i **daraltıyor** (5 değer → 4) ve
 * `ALTER TABLE … ADD CONSTRAINT … CHECK` var olan satırları **doğruluyor**.
 * `seedAllTables()` iki hakem kişisi yazıyor ve ikisi de `'referee'` taşıyor →
 * dar kısıt onları reddediyor → `down` **gürültülü patlıyor**.
 *
 * ⚠️ **VE ETKİSİ 0006'NINKİNDEN YAPISAL OLARAK FARKLI.** 0006'nın sınırı
 * yalnızca **kendi** yeniden `up`ını engelliyordu; 0008 zincirin **en üstünde**
 * ve `down` LIFO çalışıyor, yani dolu bir veritabanında **hiçbir** geri alma
 * başlayamıyor — kısmi olanlar da, tam zincir de. Bir migration'ın `down`u ilk
 * kez zincirin tamamını bloke ediyor.
 *
 * **Bu bir kusur değil, `'referee'` eklemenin ölçülmemiş bedeli** ve kısıtın
 * kendi amacının doğal sonucu: bir kümeyi daraltmak, veriyi doğrulamak demektir.
 * Alternatifler tek tek elendi:
 * - `NOT VALID` ile eklemek → geri alınmış şemada kümenin dışında bir değer
 *   sessizce kalırdı; kısıtın var olma sebebinin tersi.
 * - `down`un `'referee'` taşıyan satırları silmesi → `loss.ts` **satır** kaybını
 *   ölçmüyor (yalnızca tablo ve sütun), yani `allowDataLoss` korumasının
 *   dışında sessiz bir veri kaybı olurdu — 3.2b'nin *"fazla giden down"* sınıfı.
 * - `'referee'`yi 0007'ye koymak → aynı sonuç; sorun migration'ın yerinden
 *   değil, kümenin daralmasından geliyor.
 *
 * **Engel gizlenmiyor:** davranışın kendi testi var (*"0008 DOWN`u `referee`
 * taşıyan bir satır varken GÜRÜLTÜLÜ patlıyor"*), tıpkı 0006 ve 0001'de
 * olduğu gibi.
 *
 * ⚠️ **SATIRLAR SİLİNMİYOR, `person_type` DARALTILIYOR** — ve bu tercih
 * ölçülebilir bir sebeple: silme `SEEDED_ROWS`u değiştirir ve kayıp ölçümü
 * testlerinin zeminini kaydırırdı. Burada değişen şey iki hücre; on beş
 * tablonun satır sayıları **aynı** kalıyor.
 */
async function narrowRefereePersonTypesForDown(): Promise<void> {
  await executor.run(`
    UPDATE "people" SET "person_type" = ARRAY['staff']::text[]
     WHERE 'referee' = ANY("person_type")
  `);
}

describe('round-trip — gerçek migration zinciri (0000 → 0009)', () => {
  it('up → ON SEKİZ tabloya da veri yaz → down → up sonrası şema BİREBİR aynı', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    // ⚠️ Bu adım atlanamaz: boş şemada down/up çevrimi veri kaybı yolunu hiç
    // sınamaz ve `NOT NULL`/FK ihlallerini görmez.
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

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
    // SAPMA-021'in envanter sayısı — liste ile ayrı ayrı iddia ediliyor ki
    // biri güncellenip diğeri unutulduğunda test kırılsın.
    expect(after.tables).toHaveLength(MASTER_TABLE_COUNT);
  });

  /**
   * 0009 TEK BAŞINA — `identical: true` **BEKLENİYOR**, ve KAYMA SINIFI ADIYLA:
   * **saf `CREATE TABLE`** (§3.1.2 ⑤'in simetrik sonucu).
   *
   * Üç tablo düşüyor ve yeniden yaratılıyor, yani `attnum`lar 1'den başlıyor ve
   * delik kalmıyor. Hiçbir sütun eklenmiyor, hiçbiri düşürülmüyor.
   *
   * ⚠️ **VE ZİNCİRDEKİ `0006` BU TESTİ ETKİLEMİYOR — 4.5'in ölçtüğü ayrım.**
   * `ALTER_0006_SHIFTS` yalnızca 0006'nın **içinden geçen** geri almalarda
   * görünüyor; bu geri alma zincirin en üstünde ve 0006'ya hiç dokunmuyor, yani
   * kaymalar çevrimin iki ucunda da aynı. Kayma bir **zincir** özelliği değil,
   * bir **geri alma derinliği** özelliği — sezgi tersini söylediği için her
   * çevrim testinde sınıf adıyla yazılıyor.
   *
   * ⚠️ `seedAllTables()` çağrılıyor **ve** `narrowRefereePersonTypesForDown()`
   * ile 0008'in engeli kaldırılıyor. İkisi de gerekli: seed olmadan `down` veri
   * kaybı yolunu hiç sınamaz, engel kaldırılmadan `down` hiç başlayamaz.
   */
  it('yalnızca 0009 geri alınınca şema BİREBİR aynı — SAF CREATE TABLE, kayma YOK', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0009_player_positions_traits_stats'), allowDataLoss: true },
    );

    // Tam olarak ÜÇ tablo düştü, ne eksik ne fazla — `down`un fazla gitmesi
    // (örneğin `players`ı da düşürmesi) burada görülür.
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([...THROUGH_0008_TABLES]);

    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    expect(comparison.differences).toEqual([]);
    expect(comparison.identical).toBe(true);
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);
  });

  /**
   * ⚠️ **0009'UN KAYIP SINIFI: ÜÇ TABLO BİRDEN — ve bu `loss.ts`in en geniş
   * vakası.** 0007 iki tablo düşürüyordu, 0008 sıfır. Burada üçü birden düşüyor
   * ve üçünün de satırı var (3 + 2 + 2), yani `allowDataLoss` koruması gerçekten
   * ısırıyor.
   *
   * ⚠️ **VE KORUMANIN İKİ YÖNÜ DE ÖLÇÜLÜYOR:** bayraksız çağrı **reddediliyor**,
   * bayraklı çağrı üç tabloyu da adıyla rapor ediyor. Yalnızca ikincisi
   * yazılsaydı korumanın var olduğu **varsayılmış** olurdu (D3).
   */
  it('0009 geri alınınca ÜÇ tablo birden düşüyor — kayıp bayraksız REDDEDİLİYOR', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    await narrowRefereePersonTypesForDown();

    // NEGATİF — `allowDataLoss` olmadan geri alma başlamıyor.
    await expect(
      migrateDown(
        { executor, source, logger },
        { steps: stepsBackTo('0009_player_positions_traits_stats') },
      ),
    ).rejects.toMatchObject({ code: 'migration.downWouldLoseData' });

    // Reddedilen geri alma HİÇBİR ŞEY yapmadı — üç tablo hâlâ ayakta ve dolu.
    const untouched = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "player_positions"`,
    );
    expect(Number(untouched[0]?.n)).toBe(SEEDED_ROWS.player_positions);

    // POZİTİF — bayrakla geri alma üç tabloyu da adıyla rapor ediyor.
    const result = await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0009_player_positions_traits_stats'), allowDataLoss: true },
    );
    const droppedTables = result.loss.items
      .filter((item) => item.kind === 'table')
      .map((item) => item.table)
      .sort();
    expect(droppedTables).toEqual(['player_positions', 'player_stats_history', 'player_traits']);
    // Risk altındaki satır sayısı da AYRICA iddia ediliyor: tablo listesi doğru
    // olup satır sayımı bozuk olsaydı `allowDataLoss` eşiği sessizce yalan
    // söylerdi (`loss.ts` satır sayısını ölçüyor, yalnızca tablo adını değil).
    expect(result.loss.totalRowsAtRisk).toBe(
      SEEDED_ROWS.player_positions + SEEDED_ROWS.player_traits + SEEDED_ROWS.player_stats_history,
    );
  });

  /**
   * 0008 TEK BAŞINA — `identical: true` **BEKLENİYOR** ve sebebi §3.1.2 ⑤'in
   * ayracının kendisi.
   *
   * ⚠️ **BU MIGRATION BİR `ALTER` — AMA KAYMA ÜRETMİYOR.** 0006'nın dersi
   * *"`ALTER` migration kayma üretir"* diye okunabilirdi ve **yanlış olurdu**:
   * kaymayı üreten şey `ALTER`ın kendisi değil, `ADD COLUMN` + `DROP COLUMN`
   * çiftinin `pg_attribute.attnum`da bıraktığı deliktir. 0008 yalnızca bir
   * CHECK'in tanımını değiştiriyor — hiçbir sütun eklenmiyor, hiçbiri düşmüyor.
   *
   * Bu, bir kuralın **örneklerinden geriye okunursa yanlış öğrenileceğinin**
   * (desen F3) yeni bir vakası: 0006 tek `ALTER` örneğiydi ve o örnek *"ALTER →
   * kayma"* genellemesini davet ediyordu. Ayraç `ALTER` değil **sütun**.
   *
   * ℹ️ `seedAllTables()` çağrılmıyor: `people` içinde `'referee'` taşıyan bir
   * satır varken `down` dar kısıtı geri koyamaz ve gürültülü patlar. O davranış
   * kendi testinde ölçülüyor (hemen aşağıda) — burada ölçülen şey **şema**.
   */
  it('yalnızca 0008 geri alınınca şema BİREBİR aynı — CHECK değişimi kayma ÜRETMİYOR', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0008_person_type_referee'), allowDataLoss: true },
    );

    // ⚠️ **4.6'DA DEĞİŞTİ VE DEĞİŞİM TESTİN KENDİ KONUSUNU ETKİLEMİYOR — #16'nın
    // tekrarı.** `stepsBackTo` zincirden türetiliyor, yani bu geri alma artık
    // `0009`u da kapsıyor ve **üç tablo düşüyor**. `0008`in KENDİ katkısı hâlâ
    // sıfır tablo, sıfır sütun: beklenen liste `ALL_TABLES` değil
    // `THROUGH_0008_TABLES` ve fark tam olarak 0009'un üçü. Testin ölçtüğü şey
    // değişmedi (CHECK değişiminin kayma üretmemesi); **zemini** değişti.
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([...THROUGH_0008_TABLES]);

    // Dar kısıt gerçekten geri geldi — yoksa test hiçbir şey ölçmez (D3).
    const narrow = await executor.rows<{ def: string }>(`
      SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
       WHERE conname = 'people_person_type_check'
    `);
    expect(narrow[0]?.def).not.toContain("'referee'");

    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    expect(comparison.differences).toEqual([]);
    expect(comparison.identical).toBe(true);
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);

    // Ve geniş kısıt döndü — `'referee'` yeniden kümede.
    const wide = await executor.rows<{ def: string }>(`
      SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
       WHERE conname = 'people_person_type_check'
    `);
    expect(wide[0]?.def).toContain("'referee'");
  });

  /**
   * ⚠️ 0008'İN ÖLÇÜLMÜŞ SINIRI — DAR KISIT DOLU BİR TABLOYA GERİ KONAMAZ.
   *
   * `ALTER TABLE … ADD CONSTRAINT … CHECK` var olan satırları **doğruluyor**.
   * `people` içinde `'referee'` taşıyan bir satır varken `down` koşarsa dar
   * kısıt onu reddeder. Bu bir kusur değil, kısıtın var olma sebebi: sessizce
   * geçseydi, geri alınmış bir şemada kümenin dışında bir değer kalırdı.
   *
   * ⚠️ **VE BU 0006'NIN SINIRINDAN FARKLI BİR SINIF.** 0006'da patlayan şey
   * `up`tı (`ADD COLUMN … NOT NULL` boş hücre bulamıyordu); burada patlayan şey
   * **`down`**. İkisi ayrılmasaydı *"dolu tabloda migration patlar"* diye fazla
   * genel bir kural öğrenilirdi.
   */
  it('0008 DOWN`u `referee` taşıyan bir satır varken GÜRÜLTÜLÜ patlıyor', async () => {
    await migrateUp({ executor, source, logger });
    // ⚠️ **BU TESTTE `narrowRefereePersonTypesForDown()` ÇAĞRILMIYOR** ve
    // sebebi testin kendi konusu: ölçülen şey tam olarak o yardımcının
    // kaldırdığı engel. Çağrılsaydı test hiçbir şey ölçmezdi (D3).
    await seedAllTables();

    // Seed iki hakem kişisi yazıyor ve ikisi de `['referee']` taşıyor — yani
    // engel test kurgusundan değil, gerçek fixture'dan geliyor.
    const referees = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "people" WHERE 'referee' = ANY("person_type")
    `);
    expect(Number(referees[0]?.n)).toBe(2);

    await expect(
      migrateDown(
        { executor, source, logger },
        { steps: stepsBackTo('0008_person_type_referee'), allowDataLoss: true },
      ),
    ).rejects.toThrow(/people_person_type_check|violated by some row/);
  });

  /**
   * 0007 TEK BAŞINA — `identical: true` **BEKLENİYOR** (§3.1.2 ⑤'in simetrik
   * sonucu): iki tablo düşüp yeniden yaratılıyor, `attnum`lar 1'den başlıyor.
   *
   * ⚠️ **AMA `0006` HÂLÂ ZİNCİRDE VE BU TESTİ ETKİLEMİYOR — ölçülen ayrım bu.**
   * `ALTER_0006_SHIFTS` yalnızca 0006'nın **içinden geçen** geri almalarda
   * görünüyor. 0007 zincirin daha ÜSTÜNDE: geri alma 0006'ya hiç dokunmuyor,
   * yani 0006'nın kaymaları çevrimin öncesinde de sonrasında da **aynı** ve
   * karşılaştırma onları hiç görmüyor.
   *
   * Bunu ayrıca yazmak gerekiyor çünkü sezgi tersini söylüyor: *"zincirde bir
   * `ALTER` var, o hâlde her çevrim kayma taşır."* Kayma bir **zincir** özelliği
   * değil, bir **geri alma derinliği** özelliği.
   *
   * ⚠️ `0007`nin `down`u `players`ın İKİ CHECK'ini de kaldırıyor ve yeniden
   * `up` onları geri koyuyor — kısıt tanımları da karşılaştırmanın kapsamında,
   * yani eksik geri konan bir CHECK burada görülür.
   */
  it('yalnızca 0007 geri alınınca şema BİREBİR aynı — 0006 kaymaları GÖRÜNMÜYOR', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();
    const before = await introspectSchema(executor);

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0007_player_attributes'), allowDataLoss: true },
    );

    // Geri alma İKİ TABLO düşürdü — geriye 4.4'ün on üç tablosu kalıyor.
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([...THROUGH_0006_TABLES]);

    // İki CHECK de gitti — `players` ayakta kaldığı için bunlar AÇIKÇA
    // düşürülmek zorundaydı; örtük bir temizlik yoktu.
    const checks = await executor.rows<{ conname: string }>(`
      SELECT conname FROM pg_constraint
       WHERE contype = 'c' AND conrelid = '"players"'::regclass
       ORDER BY conname
    `);
    expect(checks.map((row) => row.conname)).toEqual(['players_primary_position_check']);

    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    expect(comparison.differences).toEqual([]);
    expect(comparison.identical).toBe(true);
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);

    // İki CHECK geri geldi.
    const restored = await executor.rows<{ conname: string }>(`
      SELECT conname FROM pg_constraint
       WHERE contype = 'c' AND conrelid = '"players"'::regclass
       ORDER BY conname
    `);
    expect(restored.map((row) => row.conname)).toEqual([
      'players_ca_le_pa_check',
      'players_pa_range_check',
      'players_primary_position_check',
    ]);
  });

  /**
   * ⚠️ 0007'NİN ÖLÇÜLMÜŞ SINIRI — CHECK GERİ KONARKEN VAR OLAN SATIRLARI
   * DOĞRULUYOR.
   *
   * `0007`nin `down`u iki ilişki değişmezini kaldırıyor. O pencerede geçersiz
   * bir satır yazılırsa (`current_ability > potential_ability`) yeniden `up`
   * **gürültülü patlar**. 0006'nın sınırıyla aynı aile (dolu tabloda yeniden
   * `up`) ama farklı mekanizma: orada eksik olan bir **değer**di, burada var
   * olan bir **ihlal**.
   *
   * Bu testin asıl söylediği şey: kısıt bir belge değil, koşan bir nöbetçi.
   */
  it('0007 geri alınıp GEÇERSİZ satır yazılınca yeniden up GÜRÜLTÜLÜ patlıyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0007_player_attributes'), allowDataLoss: true },
    );

    // Kısıt yokken CA > PA yazılabiliyor — pencere gerçekten açık (D3 önlemi).
    await executor.run(`
      UPDATE "players" SET "current_ability" = 190, "potential_ability" = 100
       WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 'kisi-1')
    `);

    await expect(migrateUp({ executor, source, logger })).rejects.toThrow(
      /players_ca_le_pa_check|violated by some row/,
    );
  });

  /**
   * 0006 TEK BAŞINA — ve burada `identical: true` **BEKLENMİYOR**.
   *
   * ⚠️ **Zincirin 0001'den beri İLK `ALTER`-only migration'ı.** 0002, 0003 ve
   * 0005 yalnızca `CREATE TABLE` içeriyordu: tablolar düşüp yeniden yaratılıyor,
   * `attnum`lar 1'den başlıyor, delik kalmıyor → `identical: true`. 0006 ise üç
   * var olan tabloya `ADD COLUMN` yapıyor ve §3.1.2 ⑤ devreye giriyor:
   * `DROP COLUMN` sütun NUMARASINI geri kazanmaz, delik bırakır.
   *
   * Doğru iddia biçimi 3.4'te seçilmişti ve burada aynen tekrarlanıyor:
   * farkların **TAM listesini** sabitlemek. Bu, `identical: true`dan **daha
   * güçlü** — beklenen üç farkın dışında tek bir fark çıkarsa test kırılır,
   * yani fazla giden bir `down` yine yakalanır.
   *
   * ⚠️ **İKİ ÇEVRİM SINIFI AYRI TESTLERDE KALIYOR ve bu bilinçli.** Bu test
   * 0005'in testiyle birleştirilseydi, 0005'in fazla giden bir `down`u 0006'nın
   * bilinen üç farkının **arkasında** *"zaten fark bekliyorduk"* diye okunurdu —
   * 3.5'te 0002/0001 için verilen kararın aynısı.
   *
   * ℹ️ **`seedAllTables()` çağrılmıyor** ve sebebi 0001'in aynı sınıftaki
   * testiyle birebir aynı: `referees.person_id` `NOT NULL` ve varsayılansız,
   * yani dolu bir tabloda `up` yeniden koşamaz. O davranışın kendi testi var
   * (hemen aşağıda).
   */
  it('yalnızca 0006 geri alınınca TEK fark sütun NUMARALARI — başka hiçbir şey', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0006_forward_person_fks'), allowDataLoss: true },
    );

    // ⚠️ **4.5'TE DEĞİŞTİ VE DEĞİŞİM TESTİN KENDİ KONUSUNU ETKİLEMİYOR.**
    // `stepsBackTo` zincirden türetildiği için geri alma artık 0008 ve 0007'yi
    // de kapsıyor — yani iki tablo DÜŞÜYOR. Testin ölçtüğü şey hâlâ 0006'nın
    // kendi davranışı: üç sütunun kaybı ve `attnum` deliği. Beklenen liste
    // `ALL_TABLES` değil `THROUGH_0006_TABLES` (0007'nin iki tablosu olmadan).
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([...THROUGH_0006_TABLES]);
    const columnsOf = (table: string): string[] =>
      rolledBack.tables.find((row) => row.name === table)?.columns.map((column) => column.name) ??
      [];
    expect(columnsOf('clubs')).not.toContain('chairman_person_id');
    expect(columnsOf('federations')).not.toContain('president_person_id');
    expect(columnsOf('referees')).not.toContain('person_id');

    // Üç FK de gitti — sütunla birlikte kısıt da düşmüş olmalı.
    const rolledBackForeignKeys = await executor.rows<{ conname: string }>(`
      SELECT conname FROM pg_constraint
       WHERE contype = 'f' AND connamespace = 'public'::regnamespace
       ORDER BY conname
    `);
    expect(rolledBackForeignKeys.map((row) => row.conname)).not.toContain(
      'referees_person_id_people_id_fk',
    );
    expect(rolledBackForeignKeys).toHaveLength(16);

    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    // Farkların TAM listesi. Fazlası = `down` fazla gidiyor; eksiği = `attnum`
    // davranışı değişmiş (yeni bir PG sürümü) ve not güncellenmeli.
    expect(comparison.differences.map((difference) => difference.path)).toEqual([
      'table.clubs.column.chairman_person_id.position',
      'table.federations.column.president_person_id.position',
      'table.referees.column.person_id.position',
    ]);
    expect(
      comparison.differences.map((difference) => [difference.before, difference.after]),
    ).toEqual([
      ['24', '25'],
      ['8', '9'],
      ['14', '15'],
    ]);
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);

    // SIRA korunuyor — kayan yalnızca numara. Sütun hâlâ SONDA (§3.1.2 ④).
    const federationsAfter = after.tables.find((table) => table.name === 'federations');
    expect(federationsAfter?.columns.at(-1)?.name).toBe('president_person_id');
  });

  /**
   * ⚠️ 0006'NIN ÖLÇÜLMÜŞ SINIRI — `ADD COLUMN … NOT NULL` DOLU BİR TABLOYA
   * UYGULANAMAZ.
   *
   * `DROP COLUMN` satırları silmez, yalnızca hücreleri götürür. Yeniden `up`
   * `ALTER TABLE "referees" ADD COLUMN "person_id" integer NOT NULL` çalıştırıyor
   * ve var olan hakem satırlarına değer bulamıyor → **PATLIYOR**.
   *
   * Bu, 0001'in `countries.source` vakasının **birebir aynısı** ve aynı sebeple
   * bir kusur değil: varsayılan konsaydı, kimsenin belirlemediği hakem
   * satırlarına bir kimlik **uydurulurdu** (SAPMA-026). Alternatif (nullable)
   * `spec/01`'i ihlal ederdi — bir hakem her zaman bir kişidir.
   *
   * Davranış **gürültülü**: sessizce yanlış veri değil, açık bir hata. Test onu
   * sabitliyor ki sonraki bir oturum bunu yeni bir regresyon sanmasın.
   *
   * ⚠️ **Karşı örnek aynı testte:** iki nullable sütun (`chairman_person_id`,
   * `president_person_id`) aynı `up` içinde dolu tablolara sorunsuz ekleniyor.
   * Yani patlayan şey *"var olan tabloya sütun eklemek"* değil, **`NOT NULL`
   * eklemek**. İkisi ayrılmasaydı sınır yanlış öğrenilirdi.
   */
  it('0006 geri alınıp VERİ VARKEN yeniden uygulanırsa GÜRÜLTÜLÜ patlıyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0006_forward_person_fks'), allowDataLoss: true },
    );

    // Satırlar duruyor — kaybolan yalnızca sütunlar.
    const remaining = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "referees"`,
    );
    expect(Number(remaining[0]?.n)).toBe(SEEDED_ROWS.referees);

    await expect(migrateUp({ executor, source, logger })).rejects.toThrow(/contains null values/);

    // KARŞI ÖRNEK: engel yalnızca `referees`. Satırları silince aynı `up`
    // sorunsuz koşuyor ve iki NULLABLE sütun dolu `clubs`/`federations`
    // tablolarına eklenebiliyor.
    await clearRefereesForReup();
    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const clubsColumns = after.tables
      .find((table) => table.name === 'clubs')
      ?.columns.map((column) => column.name);
    expect(clubsColumns).toContain('chairman_person_id');
    expect(
      Number(
        (await executor.rows<{ n: number | string }>(`SELECT count(*)::int AS n FROM "clubs"`))[0]
          ?.n,
      ),
    ).toBe(SEEDED_ROWS.clubs);
  });

  /**
   * 0003 TEK BAŞINA — Faz 3'ün SON migration'ının kendi kanıtı.
   *
   * 0002'nin testiyle aynı sınıf (yalnızca `CREATE TABLE`, dolayısıyla
   * `identical: true` beklenir) ama ayrı: tek bir birleşik test 0003'ün
   * `down`unu 0002'nin arkasında görünmez kılardı — 0002 zaten `club_kits`in
   * baktığı `clubs`ı düşürüyor.
   */
  /**
   * 0005 TEK BAŞINA — Faz 4'ün İLK migration'ının kendi kanıtı.
   *
   * 0002 ve 0003 ile aynı sınıf (yalnızca `CREATE TABLE`, dolayısıyla
   * `identical: true` beklenir — §3.1.2 ⑤'in simetrik sonucu) ama ayrı bir test
   * olmak zorunda: birleşik bir testte 0005'in `down`u 0004'ün arkasında
   * görünmez olurdu.
   *
   * ⚠️ **Bu testin ayrıca ölçtüğü şey: `down`un SIRASI.** `players` `people`a
   * bakıyor; `people` önce düşürülseydi `down` **gürültülü** patlardı
   * (`cannot drop table people because other objects depend on it`). Yani test
   * yeşilse `drizzle/down/0005_people_players.sql`in sırası doğrudur — ve bu,
   * §3.1.2 ⑦'nin dördüncü koşan uygulaması.
   */
  it('yalnızca 0005 geri alınınca TEK fark 0006’nın ÜÇ kayması — dizi tipi korunuyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();
    const before = await introspectSchema(executor);

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0005_people_players'), allowDataLoss: true },
    );

    // Geri alma tam olarak İKİ tabloyu düşürdü — Faz 3'ün on biri ayakta.
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([...PHASE_3_TABLES]);

    await clearRefereesForReup();
    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    // ⚠️ 4.4'TE DEĞİŞTİ: `identical: true` ARTIK BEKLENMİYOR. Geri alma 0006'nın
    // içinden geçiyor ve üç tablo da ayakta kalıyor, yani üç `attnum` kayması
    // kaçınılmaz (`ALTER_0006_SHIFTS`). **0005'in kendi `down`u hâlâ tam olarak
    // sınanıyor:** beklenen üç kaymanın dışında tek bir fark çıkarsa test kırılır.
    const shifts = expectedShifts('clubs', 'federations', 'referees');
    expect(comparison.differences.map((difference) => difference.path)).toEqual(shifts.paths);
    expect(
      comparison.differences.map((difference) => [difference.before, difference.after]),
    ).toEqual(shifts.values);
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);

    // ⚠️ DİZİ SÜTUNU ÇEVRİMDEN GEÇTİ — ve eleman tipi korundu. `dataType` tek
    // başına bunu söyleyemez (`text[]` ve `integer[]` ikisi de `ARRAY`), o
    // yüzden `udtName` ayrıca iddia ediliyor. Şemanın ilk dizi sütunu.
    const personType = after.tables
      .find((table) => table.name === 'people')
      ?.columns.find((column) => column.name === 'person_type');
    expect(personType?.dataType).toBe('ARRAY');
    expect(personType?.udtName).toBe('_text');
  });

  /**
   * 0004 TEK BAŞINA — ve bu, zincirin İLK "tablo yaratmayan" migration'ı.
   *
   * Öncekiler tablo/sütun getiriyordu; 0004 yalnızca **uzantı, fonksiyon ve
   * indeks**. Çevrimin `identical: true` vermesi burada ayrıca anlamlı: indeks
   * tanımları karşılaştırmanın kapsamında (`introspect.ts` → `IndexFacts`), yani
   * `down`un bir indeksi geri getirmeyi unutması **yakalanır**.
   */
  it('yalnızca 0004 geri alınınca TEK fark 0006’nın ÜÇ kayması — indeksler geri geliyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();
    const before = await introspectSchema(executor);

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0004_search_indexes'), allowDataLoss: true },
    );

    // ⚠️ 4.3'te bu iddia DEĞİŞTİ: 0005 de geri alındığı için `people`/`players`
    // artık YOK. Tabloların kalanı duruyor — kaybolan yalnızca indeksler
    // (ve uzantı + fonksiyon).
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([...PHASE_3_TABLES]);
    const indexNames = rolledBack.tables.flatMap((table) =>
      table.indexes.map((index) => index.name),
    );
    expect(indexNames).not.toContain('clubs_name_trgm_idx');
    expect(indexNames).not.toContain('rivalries_pair_unique_idx');

    await clearRefereesForReup();
    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    // 4.4 — üç tablo da ayakta, üç kayma (bkz. `ALTER_0006_SHIFTS`).
    const shifts = expectedShifts('clubs', 'federations', 'referees');
    expect(comparison.differences.map((difference) => difference.path)).toEqual(shifts.paths);
    expect(
      comparison.differences.map((difference) => [difference.before, difference.after]),
    ).toEqual(shifts.values);
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);
  });

  it('yalnızca 0003 geri alınınca TEK fark 0006’nın İKİ kayması — referees SIFIRLANIYOR', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();
    const before = await introspectSchema(executor);

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0003_visual_assets_referees'), allowDataLoss: true },
    );

    // Geri alma tam olarak ÜÇ tabloyu düşürdü — 0002'nin sekizi ayakta.
    // (0005'in ikisi ve 0004'ün indeksleri de gitti; onların kendi testleri var.)
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([
      'club_facilities',
      'club_finances_base',
      'clubs',
      'competitions',
      'countries',
      'federations',
      'rivalries',
      'stadiums',
    ]);

    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    // ⚠️ **BURADA KAYMA İKİ, ÜÇ DEĞİL — ve fark tam olarak bilgilendirici.**
    // 0003'ün `down`u `referees` TABLOSUNU düşürüyor; yeniden yaratılınca
    // `attnum` 1'den başlıyor ve `person_id` deliği kalmıyor. `clubs` ve
    // `federations` ayakta kaldığı için onların kayması duruyor. Yani liste,
    // *"hangi tablonun düştüğünü"* de söylüyor.
    const shifts = expectedShifts('clubs', 'federations');
    expect(comparison.differences.map((difference) => difference.path)).toEqual(shifts.paths);
    expect(
      comparison.differences.map((difference) => [difference.before, difference.after]),
    ).toEqual(shifts.values);
    expect(comparison.comparedFacts).toBeGreaterThanOrEqual(COMPARED_FACTS_FLOOR);
  });

  /**
   * 0002 TEK BAŞINA — ve 4.4'e kadar burada `identical: true` BEKLENİYORDU.
   *
   * 0001'in çevriminde `attnum` deliği kaçınılmazdı (§3.1.2 ⑤) çünkü orada
   * `ALTER TABLE … DROP COLUMN` vardı. 0002 **yalnızca `CREATE TABLE`**
   * içeriyor: tablolar düşüp yeniden yaratılıyor, yani sütun numaraları
   * 1'den başlıyor ve hiçbir delik kalmıyor.
   *
   * Bu ayrımın ayrı bir test olması gerekiyor. Tek bir birleşik testte 0002'nin
   * `down`u 0001'in bilinen sekiz farkının **arkasında** kalırdı: fazla giden
   * bir `down` "zaten fark bekliyorduk" diye okunurdu.
   *
   * ⚠️ **4.4'TE BEKLENTİ DEĞİŞTİ VE SEBEBİ 0002 DEĞİL.** Geri alma artık
   * 0006'nın da içinden geçiyor ve `federations` bu derinlikte hâlâ ayakta —
   * yani **tek** bir kayma kalıyor. `clubs` ve `referees` düşüp yeniden
   * yaratıldığı için onlarınki yok. 0002'nin kendi `down`u hakkındaki iddia
   * zayıflamadı: o tek kaymanın dışında bir fark çıkarsa test yine kırılır.
   */
  it('0003+0002 geri alınınca TEK fark 0006’nın BİR kayması — 0002 hâlâ temiz', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();
    const before = await introspectSchema(executor);

    // ⚠️ Sayı `stepsBackTo`'dan geliyor, elle yazılmıyor — gerekçesi o
    // fonksiyonun başlığında (elle yazılan sayılar 3.7'de yorumlarından kaydı).
    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0002_club_core'), allowDataLoss: true },
    );

    // Geri alma gerçekten sekiz tabloyu düşürdü — 0001'in üçü ayakta.
    const rolledBack = await introspectSchema(executor);
    expect(rolledBack.tables.map((table) => table.name).sort()).toEqual([
      'competitions',
      'countries',
      'federations',
    ]);

    await migrateUp({ executor, source, logger });

    const after = await introspectSchema(executor);
    const comparison = compareSchemas(before, after);

    // Yalnızca `federations` ayakta kaldı → yalnızca onun kayması var.
    const shifts = expectedShifts('federations');
    expect(comparison.differences.map((difference) => difference.path)).toEqual(shifts.paths);
    expect(
      comparison.differences.map((difference) => [difference.before, difference.after]),
    ).toEqual(shifts.values);
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
  it('0003+0002+0001 geri alınınca TEK fark sütun NUMARALARI — başka hiçbir şey', async () => {
    await migrateUp({ executor, source, logger });
    const before = await introspectSchema(executor);

    // 0005 → 0004 → 0003 → 0002 → 0001 sırayla geri alınıyor; `countries`
    // ayakta kalıyor ve `attnum` deliği ölçülebilir hâlde duruyor.
    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0001_geography_institutions'), allowDataLoss: true },
    );

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
   * Tam zincir veriyle sorunsuz çalışıyor — yukarıdaki ilk test.
   */
  it('0001 geri alınıp VERİ VARKEN yeniden uygulanırsa GÜRÜLTÜLÜ patlıyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

    await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0001_geography_institutions'), allowDataLoss: true },
    );

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
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

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
    // ⚠️ ON İKİ sequence, ON SEKİZ tablo — ve fark **`serial id` taşıyıp
    // taşımamaktan** geliyor, tablo sayısından değil. `club_facilities`,
    // `club_finances_base` ve iki nitelik tablosu PK olarak bir FK kullanıyor;
    // `player_positions` ve `player_traits` **bileşik PK** taşıyor. Altısı da
    // sequence üretmiyor.
    // 🆕 4.6 — yalnızca `player_stats_history` `serial id` aldı ve gerekçesi
    // ölçülmüş: doğal anahtar adayının bir bileşeni (`club_id`) **nullable**,
    // yani bileşik PK taşıyamaz (`player-stats-history.ts` başlığı).
    expect(schemaAfter.sequences.map((sequence) => sequence.name).sort()).toEqual([
      'club_kits_id_seq',
      'clubs_id_seq',
      'competitions_id_seq',
      'countries_id_seq',
      'federations_id_seq',
      'kit_templates_id_seq',
      'people_id_seq',
      'player_stats_history_id_seq',
      'players_id_seq',
      'referees_id_seq',
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
    // ── 3.6'nın üç yeni tablosu ────────────────────────────────────────────
    ['club_kits', 'ALTER TABLE "club_kits" DROP COLUMN "asset_id"', 'asset_id'],
    [
      'club_kits',
      'ALTER TABLE "club_kits" DROP CONSTRAINT "club_kits_club_id_kit_type_unique"',
      'club_kits_club_id_kit_type_unique',
    ],
    [
      'kit_templates',
      'ALTER TABLE "kit_templates" DROP CONSTRAINT "kit_templates_color_slots_check"',
      'kit_templates_color_slots_check',
    ],
    ['referees', 'ALTER TABLE "referees" DROP COLUMN "home_bias"', 'home_bias'],
    // ── 3.7'nin indeksleri: SESSİZ bir bozulma sınıfı ──────────────────────
    // Bir indeksin düşmesi sorgunun cevabını DEĞİŞTİRMEZ, yalnızca yavaşlatır.
    // Karşılaştırma bunu gördüğü için `down`un bir indeksi geri getirmeyi
    // unutması yakalanır — yoksa hiçbir kapı ötmezdi.
    ['clubs', 'DROP INDEX "clubs_name_trgm_idx"', 'clubs_name_trgm_idx'],
    ['clubs', 'DROP INDEX "clubs_competition_id_idx"', 'clubs_competition_id_idx'],
    ['rivalries', 'DROP INDEX "rivalries_pair_unique_idx"', 'rivalries_pair_unique_idx'],
    [
      'referees',
      'ALTER TABLE "referees" DROP CONSTRAINT "referees_country_id_countries_id_fk"',
      'referees_country_id_countries_id_fk',
    ],
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
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

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
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

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

    // ON ÜÇ tablo da düşüyor (0000'in `down`u `countries`i de götürüyor).
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

  it('SÜTUN kaybı ayrı bir kalem olarak görünüyor — 0003+0002+0001 geri alınınca', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

    const result = await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0001_geography_institutions'), dryRun: true, allowDataLoss: true },
    );

    const byKind = {
      table: result.loss.items.filter((item) => item.kind === 'table').map((item) => item.table),
      column: result.loss.items
        .filter((item) => item.kind === 'column')
        .map((item) => `${item.table}.${item.column ?? '?'}`),
    };

    // ON YEDİ tablo düşüyor: 0009'un üçü + 0007'nin ikisi + 0005'in ikisi +
    // 0003'ün üçü + 0002'nin beşi + 0001'in ikisi. `countries` ayakta kalıyor, o
    // yüzden sütun kalemleri burada GÖRÜNÜR (yukarıdaki testte değil).
    expect(byKind.table.sort()).toEqual([
      'club_facilities',
      'club_finances_base',
      'club_kits',
      'clubs',
      'competitions',
      'federations',
      'kit_templates',
      'people',
      'player_attributes',
      'player_hidden_attributes',
      'player_positions',
      'player_stats_history',
      'player_traits',
      'players',
      'referees',
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
    // 10 tablonun satırları + 8 sütun × `countries` satır sayısı.
    const droppedTableRows = Object.entries(SEEDED_ROWS)
      .filter(([table]) => table !== 'countries')
      .reduce((total, [, rows]) => total + rows, 0);
    expect(result.loss.totalRowsAtRisk).toBe(droppedTableRows + 8 * SEEDED_ROWS.countries);
  });

  /**
   * 🆕 Faz 4.4 — SAF SÜTUN VAKASI, karışık vakanın TERSİ.
   *
   * 0001'in geri alması karışıktı: `DROP TABLE` ve `DROP COLUMN` bir aradaydı ve
   * sütun kalemleri yalnızca `countries` **ayakta kaldığı için** görünüyordu.
   * `0006` tek başına geri alındığında **hiçbir tablo düşmüyor** — üçü de ayakta
   * ve kaybolan yalnızca üç sütun. Yani bu, `LossItem.kind === 'table'`
   * listesinin **boş** olduğu ilk vaka.
   *
   * Boş bir liste tek başına *"kayıp yok"* diye okunurdu (SAPMA-024); o yüzden
   * sütun listesi ayrıca ve **tam** iddia ediliyor.
   */
  /**
   * ⚠️ **BU TEST 4.5'TE SINIF DEĞİŞTİRDİ — ve değişimin kendisi bir ölçüm.**
   *
   * 4.4'te başlığı *"SAF SÜTUN kaybı — 0006 tek başına"* idi ve doğruydu: o gün
   * `stepsBackTo('0006')` tek bir adımdı. `0007` zincire eklenince aynı çağrı
   * **üç adım** oldu ve `0007` iki tablo düşürüyor — yani vaka kendiliğinden
   * *saf sütun*tan *karışık*a döndü, hiçbir satır değişmeden.
   *
   * **Genel biçim:** bir testin ölçtüğü SINIF, testin kendi kodundan değil
   * zincirdeki YERİNDEN gelebilir. `stepsBackTo` sayıyı doğru tutuyor (4.3'ün
   * kazancı) ama testin **adı ve iddiası** sayıyla birlikte kaymıyor — onu
   * güncellemek elle bir iş. Günlük #12'nin (*"bir ALTER migration'ın etkisi
   * kendi testiyle sınırlı değildir"*) kayıp ölçümü tarafındaki kardeşi.
   *
   * Saf sütun vakası kaybolmadı, **yeri değişti**: aşağıdaki `0008` testi artık
   * ondan da saf bir vakayı ölçüyor — **sıfır kayıp**.
   */
  it('KARIŞIK kayıp — 0006`ya kadar geri alınınca 0007`nin iki tablosu da düşüyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    // 0008'in sınırı — gerekçe `narrowRefereePersonTypesForDown` başlığında.
    await narrowRefereePersonTypesForDown();

    const result = await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0006_forward_person_fks'), dryRun: true, allowDataLoss: true },
    );

    const byKind = {
      table: result.loss.items.filter((item) => item.kind === 'table').map((item) => item.table),
      column: result.loss.items
        .filter((item) => item.kind === 'column')
        .map((item) => `${item.table}.${item.column ?? '?'}`),
    };

    // 🆕 4.6 — liste ikiden BEŞE çıktı ve testin adı yine bayatladı: `0009`
    // zincirin üstüne eklendiği için bu geri alma artık onun üç tablosunu da
    // kapsıyor. #16'nın üçüncü tekrarı.
    expect(byKind.table.sort()).toEqual([
      'player_attributes',
      'player_hidden_attributes',
      'player_positions',
      'player_stats_history',
      'player_traits',
    ]);
    expect(byKind.column.sort()).toEqual([
      'clubs.chairman_person_id',
      'federations.president_person_id',
      'referees.person_id',
    ]);

    // Sütun kaybında TABLONUN TAMAMI sayılır (`loss.ts`: üst sınır, bilerek).
    // 4.5'te iki tablo kaybı eklendi, 4.6'da üç tane daha.
    expect(result.loss.totalRowsAtRisk).toBe(
      SEEDED_ROWS.clubs +
        SEEDED_ROWS.federations +
        SEEDED_ROWS.referees +
        SEEDED_ROWS.player_attributes +
        SEEDED_ROWS.player_hidden_attributes +
        SEEDED_ROWS.player_positions +
        SEEDED_ROWS.player_stats_history +
        SEEDED_ROWS.player_traits,
    );

    // Kuru çalıştırma hiçbir şey kaybetmedi.
    expect(await trackedCount()).toBe(FULL_CHAIN_STEPS);
  });

  /**
   * ⚠️ **SIFIR KAYIP — 4.5'TE ZİNCİRDE VARDI, 4.6'DA ERİŞİLEMEZ OLDU.**
   *
   * `loss.ts` dört sınıf tanıyor: tablo kaybı, sütun kaybı, ikisinin karışımı ve
   * **hiçbiri**. 4.5'te dördüncüsünün gerçek zincirde bir vakası vardı:
   * `stepsBackTo('0008')` **tek** adımdı ve bir CHECK tanımını değiştirmek ne
   * tablo ne sütun düşürüyordu.
   *
   * ⚠️ **`0009` o vakayı YOK ETTİ ve bunun sessiz kalmaması önemli.** Geri alma
   * LIFO: `0008`e ulaşmak için önce `0009` düşmek zorunda ve o üç tablo
   * götürüyor. Yani gerçek zincirde artık **sıfır kayıp üreten hiçbir geri alma
   * yok** — sınıf kaybolmadı, **erişilemez** oldu.
   *
   * **Bu, #16'nın en keskin biçimi:** orada bir testin SINIFI değişmişti
   * (*saf sütun* → *karışık*); burada bir sınıfın **zincirdeki tek örneği
   * ortadan kalktı**. Vaka bir `fixtureChain` ile korunuyor — dosyanın kendi
   * deseni (bkz. `fixtureChain` başlığı: gerçek zincire test migration'ı
   * eklemek yerine geçici bir zincir yazılır).
   *
   * ⚠️ **VE BOŞ BİR LİSTE TEK BAŞINA "YOK" DİYE OKUNUR** — o yüzden
   * `allowDataLoss` verilmeden de geçtiği ayrıca iddia ediliyor. `items: []` bir
   * hesaplama sonucu olabileceği gibi bir ölçüm hatası da olabilirdi; ikinci
   * iddia koşucunun o boşluğu gerçekten *"kayıp yok"* diye okuduğunu gösteriyor.
   */
  it('SIFIR kayıp — kısıt-only bir `down` `allowDataLoss` bile gerektirmiyor', async () => {
    const chain = await fixtureChain([
      {
        tag: '0000_zero_loss_base',
        up: `CREATE TABLE "zl" ("id" integer PRIMARY KEY, "kind" text NOT NULL);`,
        down: `DROP TABLE "zl";`,
      },
      {
        // Yalnızca bir CHECK ekleyip kaldıran adım — `0008`in şeklinin aynısı.
        tag: '0001_zero_loss_check',
        up: `ALTER TABLE "zl" ADD CONSTRAINT "zl_kind_check" CHECK ("kind" IN ('a','b'));`,
        down: `ALTER TABLE "zl" DROP CONSTRAINT "zl_kind_check";`,
      },
    ]);

    await migrateUp({ executor, source: chain, logger });
    await executor.run(`INSERT INTO "zl" ("id","kind") VALUES (1,'a'), (2,'b')`);

    // `allowDataLoss` BİLEREK verilmiyor — kayıp yoksa gerekmemeli.
    const result = await migrateDown({ executor, source: chain, logger }, { steps: 1 });

    expect(result.loss.items).toEqual([]);
    expect(result.loss.totalRowsAtRisk).toBe(0);

    // Ve satırlar yerinde: kısıt gitti, veri kalmadı diye bir şey olmadı.
    const rows = await executor.rows<{ n: number | string }>(`SELECT count(*)::int AS n FROM "zl"`);
    expect(Number(rows[0]?.n)).toBe(2);
  });

  /**
   * ⚠️ **VE `0009`UN KENDİ SINIFI: SAF TABLO KAYBI.** Yukarıdaki vakanın tam
   * tersi — üç tablo düşüyor, hiçbir sütun kalemi yok. `0008`e kadar giden geri
   * alma da aynı sonucu veriyor çünkü `0008` hiçbir şey eklemiyor: bu test
   * **`0008`in katkısının sıfır olduğunu** üç tablonun sabitliğiyle iddia ediyor.
   */
  it('0008`in KENDİ katkısı sıfır — 0008`e kadar geri alma 0009`un üçünü düşürüyor', async () => {
    await migrateUp({ executor, source, logger });
    await seedAllTables();
    await narrowRefereePersonTypesForDown();

    const result = await migrateDown(
      { executor, source, logger },
      { steps: stepsBackTo('0008_person_type_referee'), dryRun: true, allowDataLoss: true },
    );

    const byKind = {
      table: result.loss.items.filter((item) => item.kind === 'table').map((item) => item.table),
      column: result.loss.items.filter((item) => item.kind === 'column').map((item) => item.table),
    };
    // Üç tablo — `0009`un tamamı. Sütun kalemi YOK: `0008` bir sütuna dokunmuyor.
    expect(byKind.table.sort()).toEqual([
      'player_positions',
      'player_stats_history',
      'player_traits',
    ]);
    expect(byKind.column).toEqual([]);
    expect(await trackedCount()).toBe(FULL_CHAIN_STEPS);
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
   * `clubs` FİZİKSEL SÜTUN SIRASI — 3.5'te yazılan nöbetçi 4.4'te ÖTTÜ.
   *
   * 3.5'te sıra bedava doğruydu (0002 `CREATE TABLE` yazıyor, fiziksel sıra =
   * TS sırası) ve bu test *"Faz 4 bu tabloya `chairman_person_id`i `ALTER TABLE
   * ADD COLUMN` ile ekleyecek"* diye bir gün için yazılmıştı. O gün 4.4'te geldi:
   * sütun TS tanımının da SONUNA yazılmasaydı snapshot ↔ gerçek şema
   * karşılaştırması kırılırdı (§3.1.2 ④).
   *
   * Listeyi buraya yazmak, kırılmanın **neden** olduğunu da yazmak demek. Sırası
   * olmayan bir iddia, kırıldığında yalnızca "bir şey değişti" der.
   */
  it('clubs fiziksel sütun sırası 0006 snapshot’ıyla AYNI', async () => {
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
      // 🆕 4.4 — `ALTER TABLE ADD COLUMN` sütunu FİZİKSEL sona koydu ve TS
      // tanımı da onu sona yazdı. Nöbetçi işini yaptı: bu satır, 3.5'te
      // yazılmış bir beklentinin **karşılığı**.
      'chairman_person_id',
    ]);
  });

  /**
   * 🆕 `federations` FİZİKSEL SÜTUN SIRASI — 4.4'te eklendi.
   *
   * ⚠️ **Bu test 3.4'te YAZILMAMIŞTI ve eksikliği 4.4'te görüldü.** `clubs`
   * (3.5) ve `referees` (3.6) için nöbetçiler kurulmuştu; `federations` üç ileri
   * FK'nın **birincisiydi** ve kendi nöbetçisi yoktu. Yani üç `ALTER` hedefinden
   * ikisi korunuyordu, üçüncüsü değil — bir envanterin değeri hatırlanmasında
   * değil **tamlığında** (3.5'in dersi).
   *
   * `president_person_id` bu tablonun ilk `ADD COLUMN`u ve §3.1.2 ④'ün üçüncü
   * koşan uygulaması.
   */
  it('federations fiziksel sütun sırası 0006 snapshot’ıyla AYNI', async () => {
    await migrateUp({ executor, source, logger });
    const real = await introspectSchema(executor);
    const federationsTable = real.tables.find((table) => table.name === 'federations');

    expect(federationsTable?.columns.map((column) => column.name)).toEqual([
      'id',
      'country_id',
      'name',
      'founded_year',
      'asset_id',
      'created_at',
      'updated_at',
      'president_person_id',
    ]);
  });

  /**
   * `referees` FİZİKSEL SÜTUN SIRASI — Faz 4'ün ÜÇÜNCÜ ve son ALTER hedefi.
   *
   * `clubs` testiyle aynı gerekçe ve 4.4'te **karşılığı ödendi**: `person_id`
   * `ALTER TABLE ADD COLUMN` ile eklendi ve §3.1.2 ④ gereği TS tanımının da
   * **sonuna** yazıldı. Üç ileri FK'nın üçü de (`federations` · `clubs` ·
   * `referees`) aynı sınıf; üçünün sırası artık burada sabit.
   */
  it('referees fiziksel sütun sırası 0006 snapshot’ıyla AYNI', async () => {
    await migrateUp({ executor, source, logger });
    const real = await introspectSchema(executor);
    const refereesTable = real.tables.find((table) => table.name === 'referees');

    expect(refereesTable?.columns.map((column) => column.name)).toEqual([
      'id',
      'key',
      'source',
      'external_ids',
      'country_id',
      'strictness',
      'foul_tolerance',
      'home_bias',
      'consistency',
      'advantage_play',
      'big_game_experience',
      'created_at',
      'updated_at',
      // 🆕 4.4 — üçün TEK `NOT NULL`u, yine SONDA.
      'person_id',
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

  /**
   * ⚠️ ③ DİZİ ELEMAN TİPİ — ②'NİN SINIFI AMA `data_type` ONU GÖREMİYOR (Faz 4.3).
   *
   * `people.person_type` şemanın ilk dizi sütunu ve onu eklerken bir **körlük**
   * ölçüldü: `introspect.ts` yalnızca `information_schema.columns.data_type`
   * okuyordu, ve PostgreSQL 18.6 `text[]` ile `integer[]` için **aynı** değeri
   * (`ARRAY`) döndürüyor. Eleman tipi yalnızca `udt_name`de (`_text` / `_int4`).
   *
   * Yani bir sütunu `text[]`'ten `integer[]`'a çeviren bir `down` ②'nin sessiz
   * sınıfına giriyordu **ve karşılaştırma da onu görmüyordu** — iki savunmanın
   * ikisi de kör. Bu test o boşluğun kapandığının kanıtı.
   *
   * ⚠️ **Testin can alıcı satırı `dataType` iddiası:** fark üretilirken
   * `data_type` **değişmiyor**. Eğer `udtName` karşılaştırmadan çıkarılırsa bu
   * test kırılır ve alanın gerekliliği varsayılmaz, **gösterilir**.
   */
  it('③ SESSİZ bozuk down (DİZİ ELEMAN TİPİ) — `data_type` kör, `udt_name` yakalıyor', async () => {
    const broken = await fixtureChain([
      {
        tag: '0000_arr_base',
        up: 'CREATE TABLE "arr_probe" ("id" serial PRIMARY KEY, "tags" text[] NOT NULL);',
        down: 'DROP TABLE "arr_probe";',
      },
      {
        tag: '0001_arr_extend',
        up: 'ALTER TABLE "arr_probe" ADD COLUMN "codes" integer[];',
        // BOZUK: kendi sütununu düşürüyor AMA 0000'in `tags` sütununu da
        // `integer[]`e çeviriyor. Sonraki `up` yalnızca `codes`u geri getirir;
        // `tags`ın eleman tipini kimse geri almaz.
        down: [
          'ALTER TABLE "arr_probe" DROP COLUMN "codes";',
          `ALTER TABLE "arr_probe" ALTER COLUMN "tags" TYPE integer[] USING '{}'::integer[];`,
        ].join('\n'),
      },
    ]);

    await migrateUp({ executor, source: broken, logger });
    const before = await introspectSchema(executor);

    await migrateDown({ executor, source: broken, logger }, { steps: 1, allowDataLoss: true });
    // Hiçbir hata YOK — ②'yle aynı sessiz sınıf.
    await migrateUp({ executor, source: broken, logger });

    const after = await introspectSchema(executor);

    const tagsBefore = before.tables[0]?.columns.find((column) => column.name === 'tags');
    const tagsAfter = after.tables[0]?.columns.find((column) => column.name === 'tags');
    // ⚠️ ESKİ ALAN HİÇBİR ŞEY SÖYLEMİYOR — körlüğün kendisi burada iddia ediliyor.
    expect(tagsBefore?.dataType).toBe('ARRAY');
    expect(tagsAfter?.dataType).toBe('ARRAY');
    // Farkı YALNIZCA yeni alan gösteriyor.
    expect(tagsBefore?.udtName).toBe('_text');
    expect(tagsAfter?.udtName).toBe('_int4');

    const comparison = compareSchemas(before, after);
    expect(comparison.identical).toBe(false);
    expect(summarizeDifferences(comparison)).toContain('tags.udtName');
  });

  /**
   * ⚠️ ④ KISIT TANIMI — ②'NİN SINIFI, YENİ BİR OLGU ÜZERİNDE (Faz 4.5).
   *
   * `0007` zincire ilk kez **başka bir tablonun kısıtını** ekleyen bir migration
   * getirdi (`players`ın iki ilişki değişmezi) ve `0008` ilk kez bir kısıtın
   * **tanımını** değiştirdi. İkisi de aynı riski taşıyor: `DROP TABLE` kendi
   * tablosunun kısıtlarını götürür, ama ayakta kalan bir tablonun kısıtını
   * götürmez — o yüzden `down` onu **açıkça** kaldırmak ve `up` geri koymak
   * zorunda. Bir `down` kısıtı **daha dar** geri koyarsa ne olur?
   *
   * Hiçbir şey. Sonraki `up` patlamaz (kısıt adı aynı), veri geçerli kalır,
   * hiçbir kapı ötmez — ②'nin sessiz sınıfı. Yakalayan tek şey karşılaştırma.
   *
   * ⚠️ **BU TESTİN VARLIK SEBEBİ MUTASYON ÖLÇÜMÜ (4.5'te bulundu).** `0007` ve
   * `0008`in çevrim testleri `differences: []` iddia ediyor ve körelen bir
   * karşılaştırıcı **tam olarak onu üretiyor** — yani iki yeni pozitif test paya
   * hiç katkı yapmadı ve seri 25'te kaldı. *Boş bir liste tek başına "yok" diye
   * okunur*: fark BEKLEYEN bir test körlükten çıkarır, fark BEKLEMEYEN bir test
   * çıkarmaz. 4.3'te payı artıran şey de tam olarak bir negatif testti.
   *
   * **Genel biçim:** yeni bir OLGU TÜRÜ (burada `constraint.definition`) şemaya
   * girdiğinde, onu ölçen bir **negatif** test olmadan karşılaştırıcının o
   * alanı gerçekten okuduğu gösterilmiş olmaz — yalnızca varsayılmış olur (D3).
   */
  it('④ SESSİZ bozuk down (KISIT TANIMI) — dar geri konan CHECK`i yalnızca karşılaştırma yakalıyor', async () => {
    const broken = await fixtureChain([
      {
        tag: '0000_chk_base',
        up: [
          'CREATE TABLE "chk_probe" ("id" serial PRIMARY KEY, "rol" text NOT NULL);',
          `ALTER TABLE "chk_probe" ADD CONSTRAINT "chk_probe_rol_check" CHECK ("rol" IN ('a', 'b'));`,
        ].join('\n'),
        down: 'DROP TABLE "chk_probe";',
      },
      {
        tag: '0001_chk_widen',
        // `0008`in birebir şekli: kısıtı düşür, GENİŞ hâlini koy.
        up: [
          'ALTER TABLE "chk_probe" DROP CONSTRAINT "chk_probe_rol_check";',
          `ALTER TABLE "chk_probe" ADD CONSTRAINT "chk_probe_rol_check" CHECK ("rol" IN ('a', 'b', 'c'));`,
        ].join('\n'),
        // BOZUK: kısıtı geri daraltırken ÜÇÜNCÜ değeri değil İKİNCİYİ düşürüyor.
        // Sonraki `up` kısıtı yine genişletiyor, yani son durum GEÇERLİ görünüyor
        // — ama aradaki daralma yanlış bir kümeye gidiyordu.
        down: [
          'ALTER TABLE "chk_probe" DROP CONSTRAINT "chk_probe_rol_check";',
          `ALTER TABLE "chk_probe" ADD CONSTRAINT "chk_probe_rol_check" CHECK ("rol" IN ('a', 'z'));`,
        ].join('\n'),
      },
    ]);

    await migrateUp({ executor, source: broken, logger });
    const before = await introspectSchema(executor);

    await migrateDown({ executor, source: broken, logger }, { steps: 1, allowDataLoss: true });

    // ⚠️ ARADAKİ DURUM YANLIŞ VE HİÇBİR HATA YOK — sessiz sınıfın kendisi.
    const midway = await introspectSchema(executor);
    const midwayCheck = midway.tables[0]?.constraints.find(
      (constraint) => constraint.name === 'chk_probe_rol_check',
    );
    expect(midwayCheck?.definition).toContain("'z'");

    const comparison = compareSchemas(before, midway);
    expect(comparison.identical).toBe(false);
    expect(summarizeDifferences(comparison)).toContain('chk_probe_rol_check');

    // ⚠️ VE `definition` ALANI ÇIKARILIRSA BU TEST KIRILIR: kısıt ADI iki
    // durumda da aynı, TİPİ de aynı (`c`). Farkı yalnızca tanım gösteriyor —
    // alanın gerekliliği varsayılmıyor, GÖSTERİLİYOR (③'ün `udtName` deseni).
    const beforeCheck = before.tables[0]?.constraints.find(
      (constraint) => constraint.name === 'chk_probe_rol_check',
    );
    expect(beforeCheck?.name).toBe(midwayCheck?.name);
    expect(beforeCheck?.type).toBe(midwayCheck?.type);
    expect(beforeCheck?.definition).not.toBe(midwayCheck?.definition);
  });

  /**
   * ⚠️ ⑤ BİLEŞİK BİRİNCİL ANAHTAR — ④'ÜN SINIFI, YENİ BİR YAPI ÜZERİNDE (Faz 4.6).
   *
   * `0009` zincire ilk kez **bileşik PK** getirdi (`(player_id, position)` ve
   * `(player_id, trait_code)`) ve bu, karşılaştırmaya yeni bir **yapı türü**
   * sokuyor — 4.3'ün dizi tipi (`udtName`) ve 4.5'in kısıt tanımı vakalarının
   * üçüncüsü.
   *
   * **Sessiz vaka:** bir `down` bileşik PK'yi **tek sütunlu** geri koyarsa ne
   * olur? Sonraki `up` patlamaz (kısıt adı aynı kalabilir), `INSERT`ler geçerli
   * kalır, hiçbir kapı ötmez. Ama aradaki şema **yanlış**: tekliği koruyan
   * anahtar daralmış ve aynı oyuncuya aynı mevkiyi iki kez yazmak mümkün hâle
   * gelmiş olurdu.
   *
   * ⚠️ **BU TESTİN VARLIK SEBEBİ YİNE MUTASYON ÖLÇÜMÜ — VE ALARM 4.5'İN
   * BİREBİR TEKRARIYDI.** `0009`un çevrim testi `differences: []` iddia ediyor
   * ve körelen karşılaştırıcı tam olarak onu üretiyor; ilk ölçüm **26 / 229**
   * verdi, yani pay 4.5'in değerinde **sabit**. *Payı artıran şey fark BEKLEYEN
   * bir testtir* — ve fark bekleyen test, yeni olgu türünü hedefleyen negatif
   * testtir.
   *
   * ℹ️ Bu, aynı gün `drizzle-snapshot.ts`te bulunan körlükten **ayrı bir
   * mekanizma**: orada snapshot tarafı bileşik PK'yi hiç okumuyordu (birim
   * testiyle kapatıldı); burada karşılaştırılan şey **iki gerçek şema durumu** ve
   * ölçen şey `compareSchemas`. İkisi farklı temsil, iki ayrı nöbetçi.
   */
  it('⑤ SESSİZ bozuk down (BİLEŞİK PK) — daralan anahtarı yalnızca karşılaştırma yakalıyor', async () => {
    const broken = await fixtureChain([
      {
        tag: '0000_pk_base',
        up: 'CREATE TABLE "pk_probe" ("a" integer NOT NULL, "b" text NOT NULL);',
        down: 'DROP TABLE "pk_probe";',
      },
      {
        tag: '0001_pk_composite',
        up: 'ALTER TABLE "pk_probe" ADD CONSTRAINT "pk_probe_pk" PRIMARY KEY ("a","b");',
        // BOZUK: anahtarı kaldırmıyor, TEK SÜTUNLU geri koyuyor. Sonraki `up`
        // için sorun yok gibi görünür — ama teklik garantisi daralmış olur.
        down: [
          'ALTER TABLE "pk_probe" DROP CONSTRAINT "pk_probe_pk";',
          'ALTER TABLE "pk_probe" ADD CONSTRAINT "pk_probe_pk" PRIMARY KEY ("a");',
        ].join('\n'),
      },
    ]);

    await migrateUp({ executor, source: broken, logger });
    const before = await introspectSchema(executor);

    await migrateDown({ executor, source: broken, logger }, { steps: 1, allowDataLoss: true });

    // ⚠️ ARADAKİ DURUM YANLIŞ VE HİÇBİR HATA YOK.
    const midway = await introspectSchema(executor);
    const midwayKey = midway.tables[0]?.constraints.find(
      (constraint) => constraint.name === 'pk_probe_pk',
    );
    expect(midwayKey?.definition).toBe('PRIMARY KEY (a)');

    const comparison = compareSchemas(before, midway);
    expect(comparison.identical).toBe(false);
    expect(summarizeDifferences(comparison)).toContain('pk_probe_pk');

    // Ad ve tip iki durumda da aynı — farkı yalnızca `definition` gösteriyor.
    const beforeKey = before.tables[0]?.constraints.find(
      (constraint) => constraint.name === 'pk_probe_pk',
    );
    expect(beforeKey?.name).toBe(midwayKey?.name);
    expect(beforeKey?.type).toBe(midwayKey?.type);
    expect(beforeKey?.definition).toBe('PRIMARY KEY (a, b)');
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
