/**
 * ŞEMA KISITLARININ GERÇEK VERİTABANINDA SINANMASI — 3.4'te açıldı, 3.5 ve
 * 3.6'da genişledi. **3.6 ile Faz 3'ün 11 tablosu tamamlandı** ve envanter
 * sayısı burada `information_schema`'dan **ölçülerek** iddia ediliyor.
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
import { KIT_TYPES } from '../src/schema/club-kits.js';
import { COMPETITION_TYPES } from '../src/schema/competitions.js';
import { WORK_PERMIT_RULES } from '../src/schema/countries.js';
import { DATA_SOURCES } from '../src/schema/data-pack-columns.js';
import type { DeleteAction, TableClass } from '../src/schema/fk-policy.js';
import { classifyTable, expectedDeleteAction } from '../src/schema/fk-policy.js';
import { KIT_COLOR_SLOTS } from '../src/schema/kit-templates.js';
import { GENDERS, PERSON_TYPES } from '../src/schema/people.js';
import { VISIBLE_ATTRIBUTES } from '../src/schema/player-attributes.js';
import { HIDDEN_ATTRIBUTES } from '../src/schema/player-hidden-attributes.js';
import { PLAYER_POSITIONS } from '../src/schema/players.js';
import { foreignKeyNullability } from '../src/schema-state/foreign-key-nullability.js';
import {
  clubFacilitiesInsertSql,
  clubFinancesInsertSql,
  clubInsertSql,
  clubKitInsertSql,
  type CountryFixture,
  countryInsertSql,
  federationInsertSql,
  kitTemplateInsertSql,
  managerInsertSql,
  personInsertSql,
  playerAttributesInsertSql,
  playerHiddenAttributesInsertSql,
  playerInsertSql,
  playerStatsHistoryInsertSql,
  refereeInsertSql,
  rivalryInsertSql,
  stadiumInsertSql,
  staffAttributesInsertSql,
  staffInsertSql,
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
      // 🆕 4.3 — `people` §3.1.0'ın altıncı taşıyıcısı.
      'people:people_key_unique',
      'referees:referees_key_unique',
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
  it('`key` sütununu §3.1.0’ın saydığı ALTI tablonun tamamı taşıyor', async () => {
    const rows = await executor.rows<{ table_name: string }>(`
      SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'key'
       ORDER BY table_name
    `);
    // §3.1.0: countries · competitions · clubs · stadiums · referees · people.
    // 3.5'te dörttü ve testin başlığı beşincinin 3.6'da geleceğini yazıyordu;
    // `referees` gelince test **beklendiği gibi kırıldı** ve sayı güncellendi.
    // 🆕 4.3'te ALTINCI geldi: `people`. ⚠️ `players` bilerek YOK — Karar 3
    // (4.0b) ölçümle verildi: `key`i `people` taşırsa FK kuralı Faz 4'ün 20
    // planlanan FK'sında 20/20, `players` taşırsa 17/20 doğru cevap veriyor.
    expect(rows.map((row) => row.table_name)).toEqual([
      'clubs',
      'competitions',
      'countries',
      'people',
      'referees',
      'stadiums',
    ]);
    expect(rows.map((row) => row.table_name)).not.toContain('players');
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
      // 🆕 4.4 — `ALTER TABLE ADD COLUMN` fiziksel sona ekledi (§3.1.2 ④).
      // ⚠️ Yeni sütun bir FK ama §3.1.0 sütunu DEĞİL: `federations` hâlâ bir
      // uydu ve `key`/`source`/`external_ids` taşımıyor. İki soru ayrı.
      'president_person_id',
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
   * yani Faz 4'ün eklediği `chairman_person_id` FK'sı burayı güncellemeyi
   * unutamadı — **4.4'te tam olarak öyle oldu** (16 → 19).
   */
  it('OTUZ İKİ FK ve her birinin ON DELETE davranışı — tam envanter', async () => {
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
      'club_kits_club_id_clubs_id_fk → CASCADE',
      // ⚠️ SÖZLÜK TABLOSU → RESTRICT. `kit_templates` ne uydu ne paket varlığı;
      // §3.1.2 ③'ün ikili ayrımı bu vakayı kapsamıyor. CASCADE, bir şablon
      // silinince kulübün forma satırını ALAKASIZ bir sebeple yok ederdi.
      'club_kits_template_id_kit_templates_id_fk → RESTRICT',
      // 🆕 4.4 — İLERİ FK #2. `clubs` `independent` (kendi `key`i var) → kural ②
      // ③'ten ÖNCE çalışıyor, yani sütun NULLABLE olduğu hâlde SET NULL DEĞİL.
      'clubs_chairman_person_id_people_id_fk → RESTRICT',
      // kulüp bağımsız varlıklara bakıyor → RESTRICT
      'clubs_competition_id_competitions_id_fk → RESTRICT',
      'clubs_country_id_countries_id_fk → RESTRICT',
      'clubs_stadium_id_stadiums_id_fk → RESTRICT',
      'competitions_country_id_countries_id_fk → RESTRICT',
      // ⚠️ AYNI TABLODAN İKİ FK, İKİ FARKLI CEVAP — kuralın sahipliği referanstan
      // ayırdığının ilk canlı kanıtı. `country_id` NOT NULL → ④ CASCADE
      // (sahiplik); `president_person_id` nullable → ③ SET NULL (referans).
      'federations_country_id_countries_id_fk → CASCADE',
      // 🆕 4.4 — İLERİ FK #1 ve şemanın İKİNCİ `SET NULL`ı.
      'federations_president_person_id_people_id_fk → SET NULL',
      // 🆕 4.7 — DÖRT TABLO, ALTI FK, İKİ FARKLI CEVAP. Kural yine KOŞTURULDU
      // (derlenmiş `fk-policy.js`, gerçek olgularla) ve üretilen migration
      // SQL'inin `ON DELETE` satırlarıyla karşılaştırıldı → **6/6**.
      // ⚠️ Karar bir KARŞI-ÖLÇÜMLE de desteklendi: `staff`/`managers` §3.1.0
      // sütunlarını taşısaydı bu altının **dördü** RESTRICT'e dönerdi
      // (`spec/01` §3.1.0'ın 4.7 kutusu).
      'manager_attributes_manager_id_managers_id_fk → CASCADE',
      // ⚠️ `players_club_id` ile aynı sınıf: uydu + nullable → ③ SET NULL.
      // İşsiz menajer geçerli bir durum, silme reddedilmemeli.
      'managers_club_id_clubs_id_fk → SET NULL',
      'managers_person_id_people_id_fk → CASCADE',
      // 🆕 4.3 — `people` kendi `key`ini taşıyor → bağımsız varlık → RESTRICT.
      // ⚠️ İKİNCİSİ NULLABLE VE YİNE DE `SET NULL` DEĞİL: kural ② (kaynak
      // `independent`) ③'ten (nullable → SET NULL) ÖNCE geliyor. Sıranın
      // koşan kanıtı bu satır.
      'people_nationality_country_id_countries_id_fk → RESTRICT',
      'people_second_nationality_country_id_countries_id_fk → RESTRICT',
      // 🆕 4.5 — İKİ NİTELİK TABLOSU, İKİ AYNI CEVAP. Kural KOŞTURULDU
      // (hafızadan uygulanmadı, günlük #11): kaynak `satellite` (`key` yok +
      // giden FK var), hedef `players` sözlük değil, sütun `NOT NULL` (PK) →
      // kural ④ **CASCADE**. `drizzle-kit` çıktısı da `ON DELETE cascade` dedi
      // → 2/2.
      // ⚠️ Hemen alttaki `players_club_id` ile karşılaştır: **aynı kaynak
      // sınıfı** (`satellite`), farklı cevap. Ayraç nullability — orada sütun
      // NULLABLE olduğu için kural ③'te duruyor ve `SET NULL` alıyor.
      'player_attributes_player_id_players_id_fk → CASCADE',
      'player_hidden_attributes_player_id_players_id_fk → CASCADE',
      // 🆕 4.6 — ÜÇ TABLO, BEŞ FK, İKİ FARKLI CEVAP. Kural yine KOŞTURULDU ve
      // üretilen migration SQL'iyle karşılaştırıldı → **5/5**.
      'player_positions_player_id_players_id_fk → CASCADE',
      // ⚠️ ŞEMANIN ÜÇÜNCÜ `SET NULL`I — ve aynı tablodan çıkan diğer ikisiyle
      // yan yana okunmalı: aynı kaynak (`player_stats_history`), aynı sınıf
      // (`satellite`), farklı cevap. Ayraç yine nullability: `club_id` nullable
      // (*"o sezon hangi kulüpte"* bilinmeyebilir), diğer ikisi değil.
      'player_stats_history_club_id_clubs_id_fk → SET NULL',
      // ⚠️ **`competition_id`in CASCADE ALMASI SEZGİYE AYKIRI — ve tam olarak
      // 4.3'ün 4.4 için yaptığı YANLIŞ TAHMİNİN sınıfı.** Refleks *"hedef
      // bağımsız bir varlık, o hâlde RESTRICT"* demek olurdu; kural ② **hedefin
      // değil KAYNAĞIN** sınıfına bakıyor. Hedefin sınıfı yalnızca ①'de (sözlük
      // mü) soruluyor ve `competitions` sözlük değil.
      'player_stats_history_competition_id_competitions_id_fk → CASCADE',
      'player_stats_history_player_id_players_id_fk → CASCADE',
      'player_traits_player_id_players_id_fk → CASCADE',
      // 🆕 4.3 — `players` bir uydu (`key` yok, giden FK var).
      // `club_id` NULLABLE → **ŞEMANIN İLK `SET NULL`I** (4.2'nin ③ dalı).
      'players_club_id_clubs_id_fk → SET NULL',
      // `person_id` NOT NULL → ④ CASCADE. Kimliği sahibinin kimliğidir.
      'players_person_id_people_id_fk → CASCADE',
      // hakem kendi `key`ini taşıyor → bağımsız varlık → RESTRICT
      'referees_country_id_countries_id_fk → RESTRICT',
      // 🆕 4.4 — İLERİ FK #3, üçün TEK `NOT NULL`u. Kaynak `independent` → ②
      // RESTRICT; `SET NULL` zaten uygulanamazdı (sütun `NOT NULL`).
      'referees_person_id_people_id_fk → RESTRICT',
      // aynı tabloya İKİ FK — adlar sütundan ayrışıyor, çakışma yok
      'rivalries_club_a_id_clubs_id_fk → CASCADE',
      'rivalries_club_b_id_clubs_id_fk → CASCADE',
      // 🆕 4.7 — `staff` zinciri. `staff_attributes` → `staff` → (`people`,
      // `clubs`): şemanın ilk İKİ KATMANLI uydu zinciri, ve `down`un sırasını
      // zorunlu kılan şey tam olarak bu (`drizzle/down/0010_staff_managers.sql`).
      'staff_attributes_staff_id_staff_id_fk → CASCADE',
      'staff_club_id_clubs_id_fk → SET NULL',
      'staff_person_id_people_id_fk → CASCADE',
    ]);
  });

  /**
   * ────────────────────────────────────────────────────────────────────────
   * KABUL KRİTERİ 3 — envanter LİSTEDEN değil KURALDAN doğrulanıyor (Faz 3.9)
   * ────────────────────────────────────────────────────────────────────────
   *
   * Yukarıdaki test on iki FK'yı **adıyla** sayıyor ve iki kez güncellenmeyi
   * unuttu (günlük #30, #36). Buradaki test beklentiyi `spec/01` §3.1.2 ③ + ⑧
   * kuralından **türetiyor**; girdilerin ikisi de katalogdan okunuyor, yani
   * Faz 4'ün ekleyeceği FK'lar hiçbir liste güncellenmeden denetlenir.
   *
   * ⚠️ **Liste testi SİLİNMİYOR ve bu bir tekrar değil.** İkisi farklı şey
   * söylüyor: liste *"bugün şunlar var"*, kural *"olması gereken bu"*. Yalnızca
   * kural kalsaydı, kuralın kendisi yanlış olduğunda hiçbir şey ötmezdi.
   */
  it('KRİTER 3: her FK`nın `ON DELETE`i KURALDAN türetiliyor — liste yok', async () => {
    const tables = await executor.rows<{
      table_name: string;
      has_key: boolean;
      has_outgoing_fk: boolean;
    }>(`
      SELECT t.relname AS table_name,
             EXISTS (SELECT 1 FROM information_schema.columns c
                      WHERE c.table_schema = 'public'
                        AND c.table_name = t.relname
                        AND c.column_name = 'key')                       AS has_key,
             EXISTS (SELECT 1 FROM pg_constraint fk
                      WHERE fk.contype = 'f' AND fk.conrelid = t.oid)    AS has_outgoing_fk
        FROM pg_class t
        JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relkind = 'r'
       ORDER BY t.relname
    `);

    const classes = new Map<string, TableClass>(
      tables.map((row) => [
        row.table_name,
        classifyTable({
          hasKeyColumn: row.has_key,
          hasOutgoingForeignKey: row.has_outgoing_fk,
        }),
      ]),
    );

    // ⚠️ Sınıflandırma ÖNCE iddia ediliyor. Yalnızca son karşılaştırma
    // yapılsaydı, iki yanlışın birbirini götürdüğü bir kural yeşil geçebilirdi.
    expect(Object.fromEntries([...classes].sort())).toEqual({
      club_facilities: 'satellite',
      club_finances_base: 'satellite',
      club_kits: 'satellite',
      clubs: 'independent',
      competitions: 'independent',
      countries: 'independent',
      federations: 'satellite',
      // ⑧'in üçüncü sınıfı — adı hiçbir yerde YAZILI DEĞİL, katalogdan çıktı.
      kit_templates: 'dictionary',
      // 🆕 4.7 — dördü de `key` taşımıyor ve giden FK'sı var → **satellite**.
      // ⚠️ `staff` ve `managers` `dictionary` OLMADIKLARI için `staff_roles`
      // tartışmasıyla karışmasın: sözlük koşulu *"`key` yok **ve giden FK
      // yok**"* ve ikisi de o ikinci yarıda eleniyor. Sınıf katalogdan çıkıyor.
      manager_attributes: 'satellite',
      managers: 'satellite',
      // 🆕 4.3 — `people` `key` taşıyor → independent; `players` taşımıyor ama
      // giden FK'sı var → satellite. İkisi de katalogdan çıkıyor.
      people: 'independent',
      // 🆕 4.5 — iki nitelik tablosu da `key` taşımıyor ve `players`a giden bir
      // FK'sı var → **satellite**. ⚠️ `dictionary` OLMADIKLARI önemli: sözlük
      // koşulu *"`key` yok **ve giden FK yok**"* ve ikisi de o ikinci yarıda
      // eleniyor. Sınıf katalogdan çıkıyor, hiçbir liste güncellenmeden.
      player_attributes: 'satellite',
      player_hidden_attributes: 'satellite',
      // 🆕 4.6 — üçü de `key` taşımıyor ve `players`a giden bir FK'sı var →
      // **satellite**. `player_stats_history` üç giden FK taşıyor ve sınıfı
      // değişmiyor: koşul *"giden FK VAR MI"*, kaç tane olduğu değil.
      player_positions: 'satellite',
      player_stats_history: 'satellite',
      player_traits: 'satellite',
      players: 'satellite',
      referees: 'independent',
      rivalries: 'satellite',
      stadiums: 'independent',
      // 🆕 4.7 — `staff` şemanın ilk İKİ KATMANLI uydusu: hem giden FK'sı var
      // (`people`, `clubs`) hem de kendisine gelen bir FK (`staff_attributes`).
      // Sınıf yine değişmiyor — koşul yalnızca GİDEN FK'ya bakıyor.
      staff: 'satellite',
      staff_attributes: 'satellite',
    });

    // ⚠️ ÜÇÜNCÜ OLGU 4.2'DE EKLENDİ: FK'nın kaynak sütunlarının nullability'si.
    // `conkey` sütun numaralarını taşıyor; `pg_attribute.attnotnull` her birinin
    // NOT NULL olup olmadığını. Dizi olarak dönüyor ki yüklem TS tarafında,
    // TEK BİR TANIMDAN (`foreignKeyNullability`) türetilsin — SQL'de `bool_and`
    // yazmak ikinci bir tanım açardı ve ER diyagramınınkiyle ayrışabilirdi.
    const foreignKeys = await executor.rows<{
      name: string;
      source_table: string;
      target_table: string;
      action: DeleteAction;
      column_nullability: boolean[];
    }>(`
      SELECT c.conname                     AS name,
             src.relname                   AS source_table,
             tgt.relname                   AS target_table,
             CASE c.confdeltype
               WHEN 'c' THEN 'CASCADE'  WHEN 'r' THEN 'RESTRICT'
               WHEN 'n' THEN 'SET NULL' ELSE 'NO ACTION'
             END                           AS action,
             ARRAY(
               SELECT NOT a.attnotnull
                 FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
                 JOIN pg_attribute a
                   ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                ORDER BY k.ord
             )                             AS column_nullability
        FROM pg_constraint c
        JOIN pg_class src ON src.oid = c.conrelid
        JOIN pg_class tgt ON tgt.oid = c.confrelid
       WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
       ORDER BY c.conname
    `);

    // Boş bir sonuç "hiç uyumsuzluk yok" diye okunurdu — bakacak bir şey
    // bulamayan kapı (SAPMA-024). Sayı ayrıca iddia ediliyor.
    expect(foreignKeys).toHaveLength(32);

    // Nullability GERÇEKTEN okundu mu — boş dizi sessizce "SET NULL uygulanamaz"
    // derdi ve üçüncü olgu hiç sınanmamış olurdu (D3).
    expect(foreignKeys.every((fk) => fk.column_nullability.length > 0)).toBe(true);

    // ⚠️ **BU LİSTE 4.3'TE ÜÇTEN BEŞE, 4.4'TE BEŞTEN YEDİYE ÇIKTI.** 4.2 onu
    // *"`players.club_id` gelince kırılsın"* diye koymuştu; iki kez kırıldı ve
    // iki kez güncellendi — kural hiç değişmedi.
    //
    // ⚠️ **LİSTE `allNullable` HAKKINDA, ALDIKLARI EYLEM HAKKINDA DEĞİL.**
    // Yedinin yalnızca İKİSİ `SET NULL` alıyor (`players_club_id` ve
    // `federations_president_person_id`); diğer beşi RESTRICT, çünkü kaynakları
    // `independent` ve kural ② ③'ten önce geliyor.
    //
    // 🆕 **4.4 BU AYRIMIN EN KESKİN ÇİFTİNİ GETİRDİ:**
    // `clubs_chairman_person_id` ve `federations_president_person_id` **aynı
    // migration**'da, **aynı hedefe** (`people`), **aynı nullability** ile
    // eklendi — biri listede ve `SET NULL` **almıyor**, diğeri listede ve
    // **alıyor**. Tek fark kaynağın sınıfı. İki liste ayrı ayrı iddia edilmese
    // bu fark görünmezdi.
    const nullableForeignKeys = foreignKeys
      .filter((fk) => foreignKeyNullability(fk.column_nullability).allNullable)
      .map((fk) => fk.name);
    expect(nullableForeignKeys.sort()).toEqual([
      'clubs_chairman_person_id_people_id_fk',
      'clubs_competition_id_competitions_id_fk',
      'clubs_stadium_id_stadiums_id_fk',
      'competitions_country_id_countries_id_fk',
      'federations_president_person_id_people_id_fk',
      // 🆕 4.7 — dokuzuncu nullable FK. Dört yeni tablonun altı FK'sından
      // **ikisi** nullable ve ikisi de `club_id`: işsiz personel ve işsiz
      // menajer geçerli durumlar, kişisiz olanları değil.
      'managers_club_id_clubs_id_fk',
      'people_second_nationality_country_id_countries_id_fk',
      // 🆕 4.6 — sekizinci nullable FK. Üç yeni tablonun beş FK'sından
      // **yalnızca biri** nullable: mevki, özel yetenek ve istatistik satırının
      // oyuncusu bilinmek zorunda, o sezon hangi kulüpte oynandığı değil.
      'player_stats_history_club_id_clubs_id_fk',
      'players_club_id_clubs_id_fk',
      'staff_club_id_clubs_id_fk',
    ]);

    // ⚠️ `SET NULL` alan FK'lar AYRICA iddia ediliyor: 4.2 kuralı yazdı ama
    // canlı katalogda o dala düşen TEK BİR FK YOKTU (dal entegrasyonda
    // erişilmiyordu). 4.3 ilk vakayı getirdi, 4.4 ikincisini; sayı burada
    // sabitleniyor ki dal bir gün sessizce boşalırsa fark edilsin.
    const setNullForeignKeys = foreignKeys
      .filter((fk) => fk.action === 'SET NULL')
      .map((fk) => fk.name);
    expect(setNullForeignKeys).toEqual([
      'federations_president_person_id_people_id_fk',
      // 🆕 4.7 — dalın DÖRDÜNCÜ ve BEŞİNCİ vakaları. `staff` ve `managers` da
      // `player_stats_history` gibi aynı tablodan hem `SET NULL` hem `CASCADE`
      // üretiyor (`club_id` ↔ `person_id`) — ayraç yine yalnızca nullability.
      'managers_club_id_clubs_id_fk',
      // 🆕 4.6 — dalın ÜÇÜNCÜ vakası ve ilk kez bir tablo hem `SET NULL` hem
      // `CASCADE` üretiyor (`player_stats_history`: `club_id` ↔ `player_id`).
      // Aynı kaynak, aynı sınıf, farklı cevap — ayraç yalnızca nullability.
      'player_stats_history_club_id_clubs_id_fk',
      'players_club_id_clubs_id_fk',
      'staff_club_id_clubs_id_fk',
    ]);

    const classLookup = (table: string): TableClass => classes.get(table) ?? 'independent';
    const mismatches = foreignKeys
      .filter((fk) => {
        const expectedAction = expectedDeleteAction(
          {
            name: fk.name,
            sourceTable: fk.source_table,
            targetTable: fk.target_table,
            allSourceColumnsNullable: foreignKeyNullability(fk.column_nullability).allNullable,
          },
          classLookup,
        );
        return expectedAction !== fk.action;
      })
      .map((fk) => `${fk.name}: gerçek ${fk.action}`);

    expect(mismatches).toEqual([]);
  });

  it('CASCADE: ülke silinince federasyonu da gidiyor', async () => {
    await insertCountry({ key: 'k-cascade', code: 'CC1' });
    // 🆕 4.4 — ham `INSERT` yerine fixture. `0006` tabloya bir sütun daha
    // ekledi ve o an bu dosyadaki ham kopya ile `round-trip`teki kopya AYNI
    // ANDA güncellenmek zorunda kalırdı; sınıf tek yere indirildi
    // (`fixtures.ts` başlığındaki #23 kuralı).
    await executor.run(federationInsertSql([{ countryCode: 'CC1', name: 'Sonda Federasyonu' }]));
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

// ═══════════════════════════════════════════════════════════════════════════
// FAZ 3.6 — GÖRSEL VARLIKLAR VE HAKEMLER (şema envanteri 11/11 kapanıyor)
// ═══════════════════════════════════════════════════════════════════════════

describe('⑤ KAPALI değer kümeleri — 3.6’nın iki yeni CHECK’i', () => {
  it('geçersiz `club_kits.kit_type` REDDEDİLİYOR — `Home` yazım hatası sınıfı', async () => {
    await executor.run(countryInsertSql([{ key: 'k-kit', code: 'KT1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-kit' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-kit', countryCode: 'KT1', stadiumKey: 's-kit', abbreviation: 'KIT' },
      ]),
    );
    await executor.run(kitTemplateInsertSql([{ code: 'tpl-kit' }]));

    await expect(
      executor.run(
        clubKitInsertSql([{ clubKey: 'c-kit', templateCode: 'tpl-kit', kitType: 'Home' }]),
      ),
    ).rejects.toThrow(/club_kits_kit_type_check/);
  });

  it('KARŞI ÖRNEK: üç geçerli `kit_type` da kabul ediliyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-kit-ok', code: 'KT2' }]));
    await executor.run(stadiumInsertSql([{ key: 's-kit-ok' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-kit-ok', countryCode: 'KT2', stadiumKey: 's-kit-ok', abbreviation: 'KTO' },
      ]),
    );
    await executor.run(kitTemplateInsertSql([{ code: 'tpl-kit-ok' }]));

    for (const kitType of KIT_TYPES) {
      await executor.run(
        clubKitInsertSql([{ clubKey: 'c-kit-ok', templateCode: 'tpl-kit-ok', kitType }]),
      );
    }

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "club_kits"
       WHERE "club_id" = (SELECT "id" FROM "clubs" WHERE "key" = 'c-kit-ok')
    `);
    expect(Number(rows[0]?.n)).toBe(KIT_TYPES.length);
  });

  /**
   * ⚠️ SAYISAL AMA ARALIK DEĞİL — §3.1.2 ②'nin sınır vakası.
   *
   * `reputation` (0-200) ve `pitch_quality` (1-20) CHECK **almıyor** çünkü
   * onlar kalibrasyon. `color_slots` alıyor çünkü spec onu `// 2 veya 3` diye,
   * yani bir **sıralama** olarak yazıyor ve slot sayısı SVG sisteminin yapısı.
   * Bu test ayrımın gerçek olduğunu gösteriyor.
   */
  it('geçersiz `kit_templates.color_slots` (4) REDDEDİLİYOR', async () => {
    await expect(
      executor.run(kitTemplateInsertSql([{ code: 'tpl-bad-slots', colorSlots: 4 }])),
    ).rejects.toThrow(/kit_templates_color_slots_check/);
  });

  it('KARŞI ÖRNEK: 2 ve 3 kabul ediliyor', async () => {
    for (const slots of KIT_COLOR_SLOTS) {
      await executor.run(
        kitTemplateInsertSql([{ code: `tpl-ok-${String(slots)}`, colorSlots: slots }]),
      );
    }
    const rows = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "kit_templates" WHERE "code" LIKE 'tpl-ok-%'`,
    );
    expect(Number(rows[0]?.n)).toBe(KIT_COLOR_SLOTS.length);
  });

  it('kısıt tanımları sabit tablolarla AYNI değerleri taşıyor', async () => {
    const kitType = await constraintDefinition('club_kits_kit_type_check');
    for (const value of KIT_TYPES) expect(kitType).toContain(`'${value}'`);
    expect(kitType.match(/'[a-z]+'/g)).toHaveLength(KIT_TYPES.length);

    const slots = await constraintDefinition('kit_templates_color_slots_check');
    for (const value of KIT_COLOR_SLOTS) expect(slots).toContain(String(value));

    const source = await constraintDefinition('referees_source_check');
    for (const value of DATA_SOURCES) expect(source).toContain(`'${value}'`);
    expect(source.match(/'[a-z]+'/g)).toHaveLength(DATA_SOURCES.length);
  });

  it('geçersiz `referees.source` REDDEDİLİYOR', async () => {
    await executor.run(countryInsertSql([{ key: 'k-ref-src', code: 'RF1' }]));
    // 🆕 4.4 — `person_id` `NOT NULL`, yani hakem satırı bir kişi olmadan
    // yazılamıyor. Kişi ÖNCE yazılıyor ki reddin sebebi TEK olsun (dosya
    // başlığındaki kural): burada sınanan şey `source` CHECK'i, FK değil.
    await executor.run(
      personInsertSql([{ key: 'p-ref-src', countryCode: 'RF1', personType: ['referee'] }]),
    );
    await expect(
      executor.run(
        refereeInsertSql([
          { key: 'r-bad-source', countryCode: 'RF1', personKey: 'p-ref-src', source: 'manual' },
        ]),
      ),
    ).rejects.toThrow(/referees_source_check/);
  });
});

describe('⑥ TEKLİK KISITLARI — 3.6’da karar YENİDEN verildi', () => {
  /**
   * ⚠️ `rivalries` KARARI KOPYALANMADI.
   *
   * 3.5'te `rivalries` için teklik Faz 11'e bırakılmıştı; gerekçe kısmi bir
   * `UNIQUE`in `(B,A)` ters çiftini sessizce geçirmesiydi (D3). **O gerekçe
   * burada geçersiz:** `kit_type` kapalı bir küme, sıralama belirsizliği yok,
   * kısıt TAM. Bu test kısıtın gerçekten reddettiğini gösteriyor — kısıtın
   * `pg_constraint`te görünmesi çalıştığını göstermezdi.
   */
  it('aynı kulübe İKİNCİ bir `home` forması yazılamıyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-uniq', code: 'UQ1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-uniq' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-uniq', countryCode: 'UQ1', stadiumKey: 's-uniq', abbreviation: 'UQA' },
      ]),
    );
    await executor.run(kitTemplateInsertSql([{ code: 'tpl-uniq' }]));
    await executor.run(
      clubKitInsertSql([{ clubKey: 'c-uniq', templateCode: 'tpl-uniq', kitType: 'home' }]),
    );

    await expect(
      executor.run(
        clubKitInsertSql([{ clubKey: 'c-uniq', templateCode: 'tpl-uniq', kitType: 'home' }]),
      ),
    ).rejects.toThrow(/club_kits_club_id_kit_type_unique/);
  });

  /**
   * KARŞI ÖRNEK — kısıtın KAPSAMI doğru: kulüp başına, global değil.
   *
   * Bu satır olmasaydı *"her `home` reddediliyor"* durumundan ayırt edilemezdi
   * (nöbetçi iki yönlü).
   */
  it('FARKLI kulüpler aynı `kit_type`ı taşıyabiliyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-uniq2', code: 'UQ2' }]));
    await executor.run(stadiumInsertSql([{ key: 's-uniq2' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-uniq-a', countryCode: 'UQ2', stadiumKey: 's-uniq2', abbreviation: 'UQB' },
        { key: 'c-uniq-b', countryCode: 'UQ2', stadiumKey: 's-uniq2', abbreviation: 'UQC' },
      ]),
    );
    await executor.run(kitTemplateInsertSql([{ code: 'tpl-uniq2' }]));
    await executor.run(
      clubKitInsertSql([
        { clubKey: 'c-uniq-a', templateCode: 'tpl-uniq2', kitType: 'home' },
        { clubKey: 'c-uniq-b', templateCode: 'tpl-uniq2', kitType: 'home' },
      ]),
    );

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "club_kits"
       WHERE "club_id" IN (SELECT "id" FROM "clubs" WHERE "key" IN ('c-uniq-a','c-uniq-b'))
    `);
    expect(Number(rows[0]?.n)).toBe(2);
  });

  it('`kit_templates.code` benzersiz — `key`in yerine geçiyor', async () => {
    await executor.run(kitTemplateInsertSql([{ code: 'tpl-tekil' }]));
    await expect(executor.run(kitTemplateInsertSql([{ code: 'tpl-tekil' }]))).rejects.toThrow(
      /kit_templates_code_unique/,
    );
  });
});

describe('§3.1.0 — 3.6’nın tabloları doğru tarafta', () => {
  it.each([
    [
      'kit_templates',
      ['id', 'code', 'name_key', 'svg_path', 'color_slots', 'created_at', 'updated_at'],
    ],
    [
      'club_kits',
      [
        'id',
        'club_id',
        'kit_type',
        'template_id',
        'color1',
        'color2',
        'color3',
        'asset_id',
        'created_at',
        'updated_at',
      ],
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

  it('referees ÜÇÜNÜ DE taşıyor ve `person_id` ARTIK VAR (Faz 4.4)', async () => {
    const rows = await executor.rows<{ column_name: string; is_nullable: string }>(`
      SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'referees'
       ORDER BY ordinal_position
    `);
    const names = rows.map((row) => row.column_name);

    expect(names).toContain('key');
    expect(names).toContain('source');
    expect(names).toContain('external_ids');
    // ⚠️ 4.3'e kadar bu satır `not.toContain('person_id')` diyordu ve o gün
    // DOĞRUYDU — üçüncü ve son ileri FK henüz yazılmamıştı. 4.4 sütunu ve FK'yı
    // BİRLİKTE ekledi; iddia tersine döndü ve nullability'si de ayrıca
    // sabitleniyor (üçün TEK `NOT NULL`u).
    expect(names).toContain('person_id');
    expect(rows.find((row) => row.column_name === 'person_id')?.is_nullable).toBe('NO');
  });

  /**
   * 🆕 4.4 — İKİ NULLABLE İLERİ FK, aynı §3.1.0 sorusunun diğer yarısı.
   *
   * `federations` veri paketi sütunlarını taşımıyor (uydu) ama `clubs` taşıyor
   * (bağımsız varlık) — ikisi de aynı gün `people`a bakan bir sütun aldı ve
   * ikisinin de nullability'si `spec/01`'de **açıkça** yazılı (`FK?` ve
   * `FK nullable`). Türetme kuralına (SAPMA-026) düşülmedi, spec doğrudan
   * söylüyor.
   */
  it.each([
    ['federations', 'president_person_id'],
    ['clubs', 'chairman_person_id'],
  ])('%s.%s NULLABLE — `spec/01` açıkça öyle yazıyor', async (table, column) => {
    const rows = await executor.rows<{ is_nullable: string }>(`
      SELECT is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.is_nullable).toBe('YES');
  });
});

describe('`ON DELETE` — sözlük tablosu vakası', () => {
  it('RESTRICT: kullanılan bir ŞABLON silinemiyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-tpl-del', code: 'TD1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-tpl-del' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-tpl-del', countryCode: 'TD1', stadiumKey: 's-tpl-del', abbreviation: 'TDA' },
      ]),
    );
    await executor.run(kitTemplateInsertSql([{ code: 'tpl-kullanilan' }]));
    await executor.run(
      clubKitInsertSql([{ clubKey: 'c-tpl-del', templateCode: 'tpl-kullanilan' }]),
    );

    await expect(
      executor.run(`DELETE FROM "kit_templates" WHERE "code" = 'tpl-kullanilan'`),
    ).rejects.toThrow(/club_kits_template_id_kit_templates_id_fk/);
  });

  it('CASCADE: kulüp silinince formaları da gidiyor — şablon KALIYOR', async () => {
    await executor.run(countryInsertSql([{ key: 'k-kit-casc', code: 'KC1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-kit-casc' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-kit-casc', countryCode: 'KC1', stadiumKey: 's-kit-casc', abbreviation: 'KCA' },
      ]),
    );
    await executor.run(kitTemplateInsertSql([{ code: 'tpl-casc' }]));
    await executor.run(clubKitInsertSql([{ clubKey: 'c-kit-casc', templateCode: 'tpl-casc' }]));

    const before = await executor.rows<{ id: number }>(
      `SELECT "id" FROM "clubs" WHERE "key" = 'c-kit-casc'`,
    );
    const clubId = before[0]?.id ?? -1;

    await executor.run(`DELETE FROM "clubs" WHERE "key" = 'c-kit-casc'`);

    const kits = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "club_kits" WHERE "club_id" = ${String(clubId)}`,
    );
    expect(Number(kits[0]?.n)).toBe(0);

    // Şablon bir SÖZLÜK girdisi — kulüple birlikte gitmemeli.
    const template = await executor.rows<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM "kit_templates" WHERE "code" = 'tpl-casc'`,
    );
    expect(Number(template[0]?.n)).toBe(1);
  });

  it('RESTRICT: hakemi olan bir ÜLKE silinemiyor', async () => {
    await executor.run(
      countryInsertSql([
        { key: 'k-ref-del', code: 'RD1' },
        { key: 'k-ref-del-uyruk', code: 'RD2' },
      ]),
    );
    // ⚠️ **KİŞİ BAŞKA BİR ÜLKENİN VATANDAŞI VE BU KASITLI (4.4).** Hakemin
    // kişisi de RD1'li olsaydı, RD1'i silme girişimi `people` FK'sına da
    // takılırdı ve hangi kısıtın önce öttüğü PostgreSQL'in denetim sırasına
    // kalırdı. Test burada `referees_country_id`i sınıyor; reddin sebebi TEK
    // olmalı (dosya başlığındaki #17 kuralı).
    await executor.run(
      personInsertSql([{ key: 'p-ref-del', countryCode: 'RD2', personType: ['referee'] }]),
    );
    await executor.run(
      refereeInsertSql([{ key: 'r-del', countryCode: 'RD1', personKey: 'p-ref-del' }]),
    );

    await expect(executor.run(`DELETE FROM "countries" WHERE "key" = 'k-ref-del'`)).rejects.toThrow(
      /referees_country_id_countries_id_fk/,
    );
  });
});

describe('`club_kits.asset_id` — iki durumu da temsil edebiliyor', () => {
  /**
   * Sütunun VAR OLMA SEBEBİ: `spec/12` §17.4 iki durumu ayırıyor — görsel var /
   * *"görsel yoksa `kit_templates` sisteminden üretilir"*. Sütun olmadan bu ayrım
   * şemada ifade edilemezdi (SAPMA-026 EK, 3.6).
   */
  it('gerçek görsel ve prosedürel yedek AYNI tabloda yan yana duruyor', async () => {
    await executor.run(countryInsertSql([{ key: 'k-asset', code: 'AS1' }]));
    await executor.run(stadiumInsertSql([{ key: 's-asset' }]));
    await executor.run(
      clubInsertSql([
        { key: 'c-asset', countryCode: 'AS1', stadiumKey: 's-asset', abbreviation: 'ASA' },
      ]),
    );
    await executor.run(kitTemplateInsertSql([{ code: 'tpl-asset' }]));
    await executor.run(
      clubKitInsertSql([
        { clubKey: 'c-asset', templateCode: 'tpl-asset', kitType: 'home', assetId: 'kit/real' },
        { clubKey: 'c-asset', templateCode: 'tpl-asset', kitType: 'away' },
      ]),
    );

    const rows = await executor.rows<{ kit_type: string; asset_id: string | null }>(`
      SELECT "kit_type", "asset_id" FROM "club_kits"
       WHERE "club_id" = (SELECT "id" FROM "clubs" WHERE "key" = 'c-asset')
       ORDER BY "kit_type"
    `);
    expect(rows.map((row) => [row.kit_type, row.asset_id])).toEqual([
      ['away', null],
      ['home', 'kit/real'],
    ]);
  });

  /**
   * KARŞI ÖRNEK — `template_id` NOT NULL kaldı ve bu bir tercih değil.
   *
   * K9 gereği prosedürel yedek HER ZAMAN kurulabilir olmalı. İkisi de nullable
   * olsaydı hiçbir şeyi render edemeyen bir satır temsil edilebilir olurdu.
   */
  it('`template_id` hâlâ ZORUNLU — şablonsuz forma satırı yazılamıyor', async () => {
    await expect(
      executor.run(`
        INSERT INTO "club_kits" ("club_id","kit_type","template_id","color1","color2")
        SELECT "id",'third',NULL,'#000000','#FFFFFF' FROM "clubs" WHERE "key" = 'c-asset'
      `),
    ).rejects.toThrow(/null value in column "template_id"/);
  });
});

describe('ŞEMA ENVANTERİ — 4.3’te 11 → 13, 4.5’te → 15; sayı ÖLÇÜLÜYOR', () => {
  /**
   * SAPMA-021 envanteri **11**'de mutabakata bağlamıştı; sayı o gün üç ayrı
   * yerde üç farklı şekilde yazılıydı (ROADMAP 15, `spec/01` 11, Faz 2 kaydı 16).
   *
   * Bu test o iddianın kapanışı ve **gözle sayılmıyor**: tablo adları gerçek
   * `information_schema`'dan okunuyor. `fms_meta` şeması bilerek dışarıda —
   * migration takip tablosu bir master tablo değil (3.2a'nın tavuk-yumurta
   * çözümü).
   */
  it('public şemasında TAM OLARAK 18 master tablo var', async () => {
    const rows = await executor.rows<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name
    `);

    expect(rows.map((row) => row.table_name)).toEqual([
      'club_facilities',
      'club_finances_base',
      'club_kits',
      'clubs',
      'competitions',
      'countries',
      'federations',
      'kit_templates',
      // 🆕 4.7 — sekizinci ve dokuzuncu; `managers` ve 1:1 uydusu.
      'manager_attributes',
      'managers',
      // 🆕 4.3 — Faz 4’ün on bir master tablosunun ilk ikisi.
      'people',
      // 🆕 4.5 — üçüncü ve dördüncü. Kalan yedi tablo 4.6–4.7’de.
      'player_attributes',
      'player_hidden_attributes',
      // 🆕 4.6 — beşinci, altıncı ve yedinci. Kalan dört tablo 4.7’de
      // (`staff` · `staff_attributes` · `managers` · `manager_attributes`).
      'player_positions',
      'player_stats_history',
      'player_traits',
      'players',
      'referees',
      'rivalries',
      'stadiums',
      // 🆕 4.7 — onuncu ve on birinci. **Faz 4’ün master tablo envanteri
      // BURADA KAPANDI: 11/11.**
      'staff',
      'staff_attributes',
    ]);
    expect(rows).toHaveLength(22);
  });

  it('takip tablosu KENDİ şemasında — master sayımını kirletmiyor', async () => {
    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM information_schema.tables
       WHERE table_schema = 'fms_meta'
    `);
    expect(Number(rows[0]?.n)).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAZ 3.7 — ÇİFT TEKLİĞİ (3.5'in kararı geri alındı, gerekçesi rivalries.ts'te)
// ═══════════════════════════════════════════════════════════════════════════

describe('rivalries çift tekliği — SIRADAN BAĞIMSIZ', () => {
  async function seedPair(prefix: string, code: string): Promise<void> {
    await executor.run(countryInsertSql([{ key: `k-${prefix}`, code }]));
    await executor.run(stadiumInsertSql([{ key: `s-${prefix}` }]));
    await executor.run(
      clubInsertSql([
        { key: `${prefix}-a`, countryCode: code, stadiumKey: `s-${prefix}`, abbreviation: 'PA1' },
        { key: `${prefix}-b`, countryCode: code, stadiumKey: `s-${prefix}`, abbreviation: 'PB1' },
      ]),
    );
  }

  it('aynı çift İKİNCİ kez yazılamıyor', async () => {
    await seedPair('pair1', 'PR1');
    await executor.run(rivalryInsertSql([{ clubAKey: 'pair1-a', clubBKey: 'pair1-b' }]));

    await expect(
      executor.run(rivalryInsertSql([{ clubAKey: 'pair1-a', clubBKey: 'pair1-b' }])),
    ).rejects.toThrow(/rivalries_pair_unique_idx/);
  });

  /**
   * ⚠️ ASIL İDDİA — 3.5'te bu vaka kısmi bir `UNIQUE (a,b)` ile SESSİZCE
   * geçerdi (D3) ve karar tam da bu yüzden Faz 11'e bırakılmıştı.
   * `LEAST/GREATEST` ifade indeksi onu kapatıyor.
   */
  it('TERS çift (B,A) da reddediliyor — kısmi UNIQUE bunu geçirirdi', async () => {
    await seedPair('pair2', 'PR2');
    await executor.run(rivalryInsertSql([{ clubAKey: 'pair2-a', clubBKey: 'pair2-b' }]));

    await expect(
      executor.run(rivalryInsertSql([{ clubAKey: 'pair2-b', clubBKey: 'pair2-a' }])),
    ).rejects.toThrow(/rivalries_pair_unique_idx/);
  });

  it('KARŞI ÖRNEK: FARKLI çiftler yan yana durabiliyor', async () => {
    await seedPair('pair3', 'PR3');
    await executor.run(
      clubInsertSql([
        { key: 'pair3-c', countryCode: 'PR3', stadiumKey: 's-pair3', abbreviation: 'PC1' },
      ]),
    );
    await executor.run(
      rivalryInsertSql([
        { clubAKey: 'pair3-a', clubBKey: 'pair3-b' },
        { clubAKey: 'pair3-b', clubBKey: 'pair3-c' },
      ]),
    );

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "rivalries"
       WHERE "club_a_id" IN (SELECT "id" FROM "clubs" WHERE "key" LIKE 'pair3-%')
    `);
    expect(Number(rows[0]?.n)).toBe(2);
  });

  /**
   * ⚠️ NE KAPANMADI — G-11 daraldı, kapanmadı.
   *
   * `(A,A)` bir ifade indeksiyle engellenemez: tek satır olarak geçerli bir
   * anahtar üretir. Bu test o deliği **görünür** tutuyor; yazılmasaydı indeksin
   * varlığı "rekabetler korunuyor" izlenimi verirdi (D3).
   */
  it('KALAN DELİK: kendine-referans HÂLÂ kabul ediliyor → Faz 11 (G-11)', async () => {
    await seedPair('pair4', 'PR4');
    await executor.run(rivalryInsertSql([{ clubAKey: 'pair4-a', clubBKey: 'pair4-a' }]));

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "rivalries"
       WHERE "club_a_id" = "club_b_id"
    `);
    expect(Number(rows[0]?.n)).toBe(1);
  });
});

/**
 * ────────────────────────────────────────────────────────────────────────────
 * FAZ 4.3 — `ON DELETE SET NULL` DAVRANIŞI, GERÇEK PG18'E KARŞI
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **KURALIN KATALOGLA UYUŞMASI, VERİTABANININ ÖYLE DAVRANDIĞINI GÖSTERMEZ.**
 * Yukarıdaki envanter testleri `pg_constraint`ten *"bu FK `SET NULL` taşıyor"*
 * diye okuyor — bu, kısıtın **yazıldığını** gösterir, **çalıştığını** değil.
 * `source` CHECK'i için 3.4'te verilen kararın aynısı: her kısıt onu ihlal eden
 * (ya da tetikleyen) bir işlemle sınanır.
 *
 * 4.2 `SET NULL` dalını yazdı ama canlı katalogda o dala düşen **tek bir FK
 * yoktu**, yani dal entegrasyonda hiç koşmamıştı. Bu blok o boşluğun karşılığı
 * ve **iki yönlü**: `SET NULL` beklenen yerde çalışıyor, CASCADE beklenen yerde
 * çalışıyor. Tek yönlü olsaydı *"her silme oyuncuyu bırakıyor"* diyen bozuk bir
 * şemadan ayırt edilemezdi.
 */
describe('FAZ 4.3 — `players` `ON DELETE` DAVRANIŞI (iki yönlü)', () => {
  /** Bir ülke + bir kulüp + bir kişi + bir oyuncu yazar; hepsi `slug` önekli. */
  async function seedPlayerAt(slug: string, code: string): Promise<void> {
    await insertCountry({ key: `${slug}-ulke`, code });
    await executor.run(clubInsertSql([{ key: `${slug}-kulup`, countryCode: code }]));
    await executor.run(personInsertSql([{ key: `${slug}-kisi`, countryCode: code }]));
    await executor.run(playerInsertSql([{ personKey: `${slug}-kisi`, clubKey: `${slug}-kulup` }]));
  }

  async function playerRow(
    slug: string,
  ): Promise<{ n: number; club_id: number | null } | undefined> {
    const rows = await executor.rows<{ n: number | string; club_id: number | null }>(`
      SELECT count(*)::int AS n, min("club_id")::int AS club_id
        FROM "players"
       WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = '${slug}-kisi')
    `);
    const row = rows[0];
    return row === undefined ? undefined : { n: Number(row.n), club_id: row.club_id };
  }

  it('SET NULL: kulüp silinince oyuncu DURUYOR ve `club_id` NULL oluyor', async () => {
    await seedPlayerAt('setnull', 'Q41');

    // Önce bağ gerçekten kurulmuş olmalı — yoksa test hiçbir şey ölçmez (D3).
    expect((await playerRow('setnull'))?.club_id).not.toBeNull();

    await executor.run(`DELETE FROM "clubs" WHERE "key" = 'setnull-kulup'`);

    const after = await playerRow('setnull');
    // Oyuncu DURUYOR — `spec/01`'in *"null = serbest oyuncu"* durumu.
    expect(after?.n).toBe(1);
    expect(after?.club_id).toBeNull();
  });

  it('KARŞI ÖRNEK — CASCADE: kişi silinince oyuncu GİDİYOR', async () => {
    await seedPlayerAt('cascade', 'Q42');
    expect((await playerRow('cascade'))?.n).toBe(1);

    await executor.run(`DELETE FROM "people" WHERE "key" = 'cascade-kisi'`);

    // Nöbetçi iki yönlü: `SET NULL` her silmeye uygulanmıyor.
    expect((await playerRow('cascade'))?.n).toBe(0);
  });

  it('RESTRICT: vatandaşı olan bir ÜLKE silinemiyor — `people` bağımsız varlık', async () => {
    await insertCountry({ key: 'restrict-ulke', code: 'Q43' });
    await executor.run(personInsertSql([{ key: 'restrict-kisi', countryCode: 'Q43' }]));

    await expect(
      executor.run(`DELETE FROM "countries" WHERE "key" = 'restrict-ulke'`),
    ).rejects.toThrow(/people_nationality_country_id_countries_id_fk/);
  });

  it('RESTRICT: İKİNCİ uyruk da koruyor — nullable olması SET NULL demek değil', async () => {
    await insertCountry({ key: 'ikinci-a', code: 'Q44' });
    await insertCountry({ key: 'ikinci-b', code: 'Q45' });
    await executor.run(
      personInsertSql([{ key: 'ikinci-kisi', countryCode: 'Q44', secondCountryCode: 'Q45' }]),
    );

    // ⚠️ Sütun NULLABLE ve yine de silme REDDEDİLİYOR. Kural ②'nin (kaynak
    // `independent` → RESTRICT) ③'ten (nullable → SET NULL) önce gelmesinin
    // DAVRANIŞ tarafındaki kanıtı: sezgi "nullable ise boşaltılır" derdi.
    await expect(executor.run(`DELETE FROM "countries" WHERE "key" = 'ikinci-b'`)).rejects.toThrow(
      /people_second_nationality_country_id_countries_id_fk/,
    );
  });

  it('`person_id` BENZERSİZ — bir kişinin İKİNCİ oyuncu kaydı olamıyor', async () => {
    await insertCountry({ key: 'tekil-ulke', code: 'Q46' });
    await executor.run(personInsertSql([{ key: 'tekil-kisi', countryCode: 'Q46' }]));
    await executor.run(playerInsertSql([{ personKey: 'tekil-kisi', clubKey: null }]));

    // ⚠️ 1:0..1 ilişkinin TEK koruması bu. `players.id` ayrı bir `serial`
    // olduğu için (gerekçe `players.ts` başlığında: ona bakan 13 tablo var)
    // ikinci bir satır teknik olarak mümkün — ve tam da bu yüzden kısıt gerekli.
    await expect(
      executor.run(playerInsertSql([{ personKey: 'tekil-kisi', clubKey: null }])),
    ).rejects.toThrow(/players_person_id_unique/);
  });
});

describe('FAZ 4.3 — `people` KAPALI DEĞER KÜMELERİ (§3.1.2 ②)', () => {
  it('geçersiz `gender` REDDEDİLİYOR', async () => {
    await insertCountry({ key: 'g-ulke', code: 'Q47' });
    await expect(
      executor.run(personInsertSql([{ key: 'g-kisi', countryCode: 'Q47', gender: 'other' }])),
    ).rejects.toThrow(/people_gender_check/);
  });

  it('geçersiz `person_type` ELEMANI REDDEDİLİYOR — `coach` kümede yok', async () => {
    await insertCountry({ key: 'pt-ulke', code: 'Q48' });
    await expect(
      executor.run(
        personInsertSql([{ key: 'pt-kisi', countryCode: 'Q48', personType: ['player', 'coach'] }]),
      ),
    ).rejects.toThrow(/people_person_type_check/);
  });

  /**
   * ⚠️ BOŞ DİZİ — kısıtın İKİNCİ yarısı ve tek başına ölçülmesi gerekiyor.
   *
   * `<@` (alt küme) boş diziyi **kabul ediyor** (PG 18.6'da ölçüldü), yani
   * yalnızca `<@` yazılsaydı *"hiçbir şey olmayan bir kişi"* sessizce girerdi —
   * G-11'in *"kısmi koruma D3 yanılsaması üretir"* dersi. `cardinality(...) > 0`
   * o yarıyı kapatıyor ve bu test onun **ayrı** nöbetçisi: kısıtın yalnızca bir
   * yarısı silinirse bu test kırılır, diğeri geçmeye devam ederdi.
   */
  it('BOŞ `person_type` REDDEDİLİYOR — `<@` tek başına bunu geçirirdi', async () => {
    await insertCountry({ key: 'bos-ulke', code: 'Q49' });
    await expect(
      executor.run(personInsertSql([{ key: 'bos-kisi', countryCode: 'Q49', personType: [] }])),
    ).rejects.toThrow(/people_person_type_check/);
  });

  it('KARŞI ÖRNEK: dört rolün hepsi ve ÇOK ROLLÜ dizi kabul ediliyor', async () => {
    await insertCountry({ key: 'ok-ulke', code: 'Q4A' });
    await executor.run(
      personInsertSql([
        { key: 'ok-oyuncu', countryCode: 'Q4A', personType: ['player'] },
        { key: 'ok-personel', countryCode: 'Q4A', personType: ['staff'] },
        { key: 'ok-menajer', countryCode: 'Q4A', personType: ['manager'] },
        { key: 'ok-baskan', countryCode: 'Q4A', personType: ['chairman'] },
        // Oyuncu-menajer: dizinin var olma sebebi.
        { key: 'ok-ikili', countryCode: 'Q4A', personType: ['player', 'manager'] },
      ]),
    );

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "people" WHERE "key" LIKE 'ok-%'
    `);
    expect(Number(rows[0]?.n)).toBe(5);
  });

  it('kısıt tanımı PERSON_TYPES ve GENDERS sabitleriyle AYNI değerleri taşıyor', async () => {
    // Sabit tablo ile veritabanı ayrışabilir; eşitlik VARSAYILMIYOR, ölçülüyor.
    const personTypeDef = await constraintDefinition('people_person_type_check');
    for (const value of PERSON_TYPES) {
      expect(personTypeDef).toContain(`'${value}'`);
    }
    // Boş dizi yasağı kısıtın parçası — tanımda görünmezse yarısı kaybolmuş demektir.
    expect(personTypeDef).toContain('cardinality');

    const genderDef = await constraintDefinition('people_gender_check');
    for (const value of GENDERS) {
      expect(genderDef).toContain(`'${value}'`);
    }
  });
});

describe('FAZ 4.3 — `players` KAPALI KÜME ve VARSAYILANSIZ BAYRAK', () => {
  async function seedPerson(slug: string, code: string): Promise<void> {
    await insertCountry({ key: `${slug}-ulke`, code });
    await executor.run(personInsertSql([{ key: `${slug}-kisi`, countryCode: code }]));
  }

  it('geçersiz `primary_position` REDDEDİLİYOR — `CB` bu kümede yok', async () => {
    await seedPerson('mevki', 'Q4B');
    await expect(
      executor.run(
        playerInsertSql([{ personKey: 'mevki-kisi', clubKey: null, primaryPosition: 'CB' }]),
      ),
    ).rejects.toThrow(/players_primary_position_check/);
  });

  it('KARŞI ÖRNEK: on iki mevkinin hepsi kabul ediliyor', async () => {
    await insertCountry({ key: 'tum-ulke', code: 'Q4C' });
    await executor.run(
      personInsertSql(
        PLAYER_POSITIONS.map((position) => ({ key: `tum-${position}`, countryCode: 'Q4C' })),
      ),
    );
    await executor.run(
      playerInsertSql(
        PLAYER_POSITIONS.map((position) => ({
          personKey: `tum-${position}`,
          clubKey: null,
          primaryPosition: position,
        })),
      ),
    );

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(DISTINCT "primary_position")::int AS n FROM "players"
       WHERE "person_id" IN (SELECT "id" FROM "people" WHERE "key" LIKE 'tum-%')
    `);
    expect(Number(rows[0]?.n)).toBe(PLAYER_POSITIONS.length);
  });

  it('`is_newgen` VARSAYILAN ALMIYOR — belirtilmezse INSERT patlıyor', async () => {
    await seedPerson('newgen', 'Q4D');

    // `clubs.is_national` ile aynı ilke: bir varsayılan, kimsenin belirtmediği
    // satıra "gerçek oyuncu" bilgisini UYDURURDU. Unutmak gürültülü olmalı.
    await expect(
      executor.run(`
        INSERT INTO "players"
          ("person_id","primary_position","height_cm","weight_kg","preferred_foot_right",
           "preferred_foot_left","current_ability","potential_ability","pa_range_min","pa_range_max")
        SELECT "id",'MC',180,75,18,8,130,150,140,160 FROM "people" WHERE "key" = 'newgen-kisi'
      `),
    ).rejects.toThrow(/is_newgen/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAZ 4.4 — ÜÇ İLERİ FK'NIN DAVRANIŞI (kabul kriteri 2)
//
// ⚠️ **KURALIN KATALOGLA UYUŞMASI, VERİTABANININ ÖYLE DAVRANDIĞINI GÖSTERMEZ.**
// Yukarıdaki envanter testi `pg_constraint`ten `SET NULL`/`RESTRICT` okuyor —
// yani kısıtın YAZILDIĞINI. Buradaki testler onun İŞLEDİĞİNİ ölçüyor: gerçek
// satırlar yazılıyor, gerçek `DELETE` çalıştırılıyor, sonuç okunuyor.
//
// Üç FK üç FARKLI cevap taşıyor ve üçü de ayrı ayrı sınanıyor. Yalnızca
// `SET NULL` sınansaydı, ② kuralının ③'ten önce gelmesi (bu fazın en kolay
// karışan yeri) davranış tarafında hiç görünmezdi.
//
// ⚠️ Ülke kodları var olan kümeyle **programatik olarak** karşılaştırıldı
// (günlük #10): paylaşılan veritabanına yazan her fixture, benzersiz olması
// gereken değerlerini var olan kümeye karşı doğrular.
// ═══════════════════════════════════════════════════════════════════════════

describe('FAZ 4.4 — üç ileri FK, ÜÇ FARKLI `ON DELETE` DAVRANIŞI', () => {
  /** Bir ülke + bir kişi yazar; ikisi de `slug` önekli. */
  /**
   * ⚠️ `personType` 4.5'te PARAMETRİK oldu ve varsayılanı `['chairman']` kaldı.
   * Sebep: bu yardımcıyı kullanan dört testin üçü bir **başkanı** yazıyor
   * (federasyon/kulüp), biri bir **hakemi**. `0008`den önce hakem için doğru
   * bir değer yoktu (G-18) ve o test de `['chairman']` kullanıyordu — yani
   * fixture bir yalan taşıyordu. Artık taşımıyor.
   */
  async function seedCountryAndPerson(
    slug: string,
    code: string,
    personType: readonly string[] = ['chairman'],
  ): Promise<void> {
    await insertCountry({ key: `${slug}-ulke`, code });
    await executor.run(personInsertSql([{ key: `${slug}-kisi`, countryCode: code, personType }]));
  }

  it('SET NULL: federasyon BAŞKANI silinince federasyon DURUYOR, sütun NULL oluyor', async () => {
    await seedCountryAndPerson('fedset', 'Q50');
    await executor.run(
      federationInsertSql([{ countryCode: 'Q50', presidentPersonKey: 'fedset-kisi' }]),
    );

    // Önce bağ gerçekten kurulmuş olmalı — yoksa test hiçbir şey ölçmez (D3).
    const linked = await executor.rows<{ n: number | string; president: number | null }>(`
      SELECT count(*)::int AS n, min("president_person_id")::int AS president
        FROM "federations"
       WHERE "country_id" = (SELECT "id" FROM "countries" WHERE "key" = 'fedset-ulke')
    `);
    expect(Number(linked[0]?.n)).toBe(1);
    expect(linked[0]?.president).not.toBeNull();

    await executor.run(`DELETE FROM "people" WHERE "key" = 'fedset-kisi'`);

    const after = await executor.rows<{ n: number | string; president: number | null }>(`
      SELECT count(*)::int AS n, min("president_person_id")::int AS president
        FROM "federations"
       WHERE "country_id" = (SELECT "id" FROM "countries" WHERE "key" = 'fedset-ulke')
    `);
    // Federasyon DURUYOR — CASCADE olsaydı gitmişti, RESTRICT olsaydı silme
    // reddedilirdi. Doğru sonuç: *"başkanı bilinmiyor"*.
    expect(Number(after[0]?.n)).toBe(1);
    expect(after[0]?.president).toBeNull();
  });

  it('KARŞI ÖRNEK — aynı federasyon satırı ÜLKESİ silinince GİDİYOR (CASCADE)', async () => {
    // ⚠️ **BAŞKAN BAŞKA BİR ÜLKENİN VATANDAŞI VE BU ÖLÇÜLEREK ÖĞRENİLDİ.** İlk
    // yazımda kişi de Q51'liydi ve `DELETE` `people_nationality_country_id`
    // RESTRICT'ine takıldı — yani test CASCADE'i değil, alakasız bir kısıtı
    // ölçüyordu. Reddin (ya da geçişin) sebebi TEK olmalı.
    await insertCountry({ key: 'fedcas-ulke', code: 'Q51' });
    await seedCountryAndPerson('fedcas-baskan', 'Q56');
    await executor.run(
      federationInsertSql([{ countryCode: 'Q51', presidentPersonKey: 'fedcas-baskan-kisi' }]),
    );

    // ⚠️ Nöbetçi iki yönlü VE aynı tablo üzerinde: `SET NULL` her silmeye
    // uygulanmıyor. `country_id` NOT NULL → sahiplik → CASCADE. Bir tablo, iki
    // FK, iki farklı cevap.
    await executor.run(`DELETE FROM "countries" WHERE "key" = 'fedcas-ulke'`);

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "federations"
       WHERE "name" = 'Q51 Futbol Federasyonu'
    `);
    expect(Number(rows[0]?.n)).toBe(0);
  });

  it('RESTRICT: KULÜP BAŞKANININ kişisi silinemiyor — nullable ≠ SET NULL', async () => {
    await seedCountryAndPerson('clubchair', 'Q52');
    await executor.run(
      clubInsertSql([
        { key: 'clubchair-kulup', countryCode: 'Q52', chairmanPersonKey: 'clubchair-kisi' },
      ]),
    );

    // ⚠️ **BU FAZIN EN KESKİN KARŞILAŞTIRMASI.** Sütun `federations`ınkiyle
    // AYNI migration'da, AYNI hedefe, AYNI nullability ile eklendi — ve silme
    // burada REDDEDİLİYOR. Tek fark kaynağın sınıfı: `clubs` kendi `key`ini
    // taşıyor (`independent`), yani kural ② ③'ten önce çalışıyor. Sezgi
    // ("nullable ise boşaltılır") burada yanlış cevabı verirdi.
    await expect(
      executor.run(`DELETE FROM "people" WHERE "key" = 'clubchair-kisi'`),
    ).rejects.toThrow(/clubs_chairman_person_id_people_id_fk/);
  });

  it('RESTRICT: HAKEMİN kişisi silinemiyor — üçün tek `NOT NULL`u', async () => {
    await seedCountryAndPerson('refperson', 'Q53', ['referee']);
    await executor.run(
      refereeInsertSql([
        { key: 'refperson-hakem', countryCode: 'Q53', personKey: 'refperson-kisi' },
      ]),
    );

    await expect(
      executor.run(`DELETE FROM "people" WHERE "key" = 'refperson-kisi'`),
    ).rejects.toThrow(/referees_person_id_people_id_fk/);
  });

  it('`referees.person_id` ZORUNLU — kişisiz hakem satırı yazılamıyor', async () => {
    await insertCountry({ key: 'refnull-ulke', code: 'Q54' });

    // Hakemler Faz 4'e kadar isimsizdi; 4.4'ten sonra isimsiz bir hakem satırı
    // TEMSİL EDİLEMİYOR. Bu, `clubs.chairman_person_id`in tam tersi sözleşme ve
    // ayrım `spec/01`'in kendi yazımından geliyor (`personId FK` işaretsiz).
    await expect(
      executor.run(`
        INSERT INTO "referees"
          ("key","source","external_ids","country_id","strictness","foul_tolerance",
           "home_bias","consistency","advantage_play","big_game_experience")
        SELECT 'refnull-hakem','procedural','{}'::jsonb,"id",12,11,10,14,13,9
          FROM "countries" WHERE "key" = 'refnull-ulke'
      `),
    ).rejects.toThrow(/person_id/);
  });

  it('KARŞI ÖRNEK: başkansız kulüp ve başkansız federasyon KABUL EDİLİYOR', async () => {
    await insertCountry({ key: 'nochair-ulke', code: 'Q55' });
    await executor.run(federationInsertSql([{ countryCode: 'Q55' }]));
    await executor.run(clubInsertSql([{ key: 'nochair-kulup', countryCode: 'Q55' }]));

    // İki sütun da nullable: *"başkanı bilinmiyor"* geçerli bir durum ve
    // uydurulmuş bir kimlik, eksik bir kimlikten kötüdür (SAPMA-026 ③).
    const rows = await executor.rows<{ chairman: number | null; president: number | null }>(`
      SELECT
        (SELECT "chairman_person_id" FROM "clubs" WHERE "key" = 'nochair-kulup')   AS chairman,
        (SELECT "president_person_id" FROM "federations"
          WHERE "country_id" = (SELECT "id" FROM "countries" WHERE "key" = 'nochair-ulke')) AS president
    `);
    expect(rows[0]?.chairman).toBeNull();
    expect(rows[0]?.president).toBeNull();
  });
});

/**
 * ════════════════════════════════════════════════════════════════════════════
 * FAZ 4.5 — NİTELİK TABLOLARI: ENVANTER, 1:1 DESENİ, CHECK YOKLUĞU
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **YENİ FIXTURE DEĞERLERİ VAR OLAN KÜMEYE KARŞI PROGRAMATİK DOĞRULANDI**
 * (günlük #10): bu bloğun ülke kodları `A50`…`A57` ve dosyadaki 50 var olan
 * `code` değerinin hiçbiriyle kesişmiyor (`grep -o "'A5x'"` → 0 eşleşme,
 * yedi kod için tek tek). Gözle seçilmiş bir *"herhalde bu boştur"* değeri
 * D3'ün fixture tarafındaki biçimi — 4.3'te tam olarak öyle kırılmıştı.
 */
describe('FAZ 4.5 — nitelik tablolarının SÜTUN ENVANTERİ (katalogdan)', () => {
  const columnsOf = async (table: string): Promise<string[]> => {
    const rows = await executor.rows<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = '${table}'
       ORDER BY ordinal_position
    `);
    return rows.map((row) => row.column_name);
  };

  /** camelCase kod adı → snake_case sütun adı. */
  const toSnake = (name: string): string => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

  /**
   * ⚠️ **BİR SAYI İDDİASI ÖZETTİR, BİR LİSTE İDDİASI ENVANTERDİR** (4.4'ün
   * dersi). `toHaveLength(50)` yanlış adlı bir sütunu geçirirdi; buradaki
   * iddia adları ve **fiziksel sıralarını** sabitliyor.
   *
   * ℹ️ Birim testi (`player-attributes.test.ts`) sabit ile TS alanlarını
   * karşılaştırıyor; **bu** test veritabanının gerçekten o sütunları taşıdığını
   * ölçüyor. İkisi ayrı ayrı gerekiyor (2.3b dersi: birim testi kablolamayı
   * kanıtlamaz) — TS alanı doğru olup `smallint('finising')` yazılmış olabilir.
   */
  it('`player_attributes` 47 GÖRÜNÜR niteliği spec sırasıyla taşıyor', async () => {
    const expected = [
      'player_id',
      ...VISIBLE_ATTRIBUTES.technical.map(toSnake),
      ...VISIBLE_ATTRIBUTES.mental.map(toSnake),
      ...VISIBLE_ATTRIBUTES.physical.map(toSnake),
      ...VISIBLE_ATTRIBUTES.goalkeeping.map(toSnake),
      'created_at',
      'updated_at',
    ];
    expect(await columnsOf('player_attributes')).toEqual(expected);
    // 47 + player_id + iki zaman damgası. Sayı LİSTEDEN sonra iddia ediliyor:
    // liste zaten daha güçlü, sayı yalnızca aritmetiği görünür tutuyor.
    expect(expected).toHaveLength(50);
  });

  it('`player_hidden_attributes` 10 GİZLİ niteliği spec sırasıyla taşıyor', async () => {
    const expected = ['player_id', ...HIDDEN_ATTRIBUTES.map(toSnake), 'created_at', 'updated_at'];
    expect(await columnsOf('player_hidden_attributes')).toEqual(expected);
    expect(expected).toHaveLength(13);
  });

  /**
   * ⚠️ **NEGATİF İDDİA — SAPMA-028'in KOŞAN NÖBETÇİSİ.**
   *
   * *"Kısıt eklemeyi unuttuk"* ile *"kısıt bilerek konmadı"* **aynı şemayı**
   * üretir; ayıran tek şey koşan bir iddiadır (SAPMA-033: bir kuralın kontrol
   * eden adımı yoksa ateşlendiğinde hiçbir şey olmaz). Bir sonraki oturum 57
   * sütunu CHECK'siz görüp *"eksik"* diye eklemek isterse bu test kırılır ve
   * gerekçeyi (`spec/01` §3.1.2 ②) okumaya yönlendirir.
   *
   * Emsal ölçülmüştü: 3.6'da altı hakem niteliği (1-20) de CHECK almadı.
   */
  it('57 nitelik sütununun HİÇBİRİ CHECK almıyor — aralık denetimi Faz 11`in işi', async () => {
    const rows = await executor.rows<{ conname: string; table_name: string }>(`
      SELECT c.conname, t.relname AS table_name
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
       WHERE c.contype = 'c'
         AND t.relname IN ('player_attributes', 'player_hidden_attributes')
       ORDER BY c.conname
    `);
    expect(rows).toEqual([]);
  });
});

describe('FAZ 4.5 — 1:1 DESENİ: `player_id` hem PK hem FK', () => {
  async function seedPlayer(slug: string, code: string): Promise<void> {
    await executor.run(countryInsertSql([{ key: `${slug}-ulke`, code }]));
    await executor.run(
      personInsertSql([{ key: `${slug}-kisi`, countryCode: code, personType: ['player'] }]),
    );
    await executor.run(playerInsertSql([{ personKey: `${slug}-kisi`, clubKey: null }]));
  }

  /**
   * ⚠️ **AYRAÇ KOŞTURULDU, KOPYALANMADI.** 4.3 `players`i 3.5'in PK=FK
   * kuralından ayırmıştı; ayraç *"tabloya GELEN yabancı anahtar sayısı"*.
   * `player_attributes` için ölçüm **0** (spec/01 tamamında `attributesId` /
   * `attribute_id` → 0 eşleşme), yani ayraç 3.5'i gösteriyor. Bu test o
   * kararın veritabanındaki sonucunu sabitliyor: ayrı bir `serial id` YOK ve
   * teklik veritabanı seviyesinde garanti.
   */
  it('ayrı bir `id` sütunu YOK — kimlik yalnızca `player_id`', async () => {
    for (const table of ['player_attributes', 'player_hidden_attributes']) {
      const rows = await executor.rows<{ column_name: string }>(`
        SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = 'id'
      `);
      expect(rows).toEqual([]);
    }
  });

  it('`player_id` PRIMARY KEY ve aynı anda FOREIGN KEY', async () => {
    const rows = await executor.rows<{ conname: string; contype: string }>(`
      SELECT conname, contype FROM pg_constraint
       WHERE conrelid = '"player_attributes"'::regclass AND contype IN ('p', 'f')
       ORDER BY contype
    `);
    expect(rows.map((row) => row.contype)).toEqual(['f', 'p']);
  });

  it('aynı oyuncuya İKİNCİ bir nitelik satırı yazılamıyor', async () => {
    await seedPlayer('attr-tekil', 'A50');
    await executor.run(playerAttributesInsertSql([{ personKey: 'attr-tekil-kisi' }]));

    await expect(
      executor.run(playerAttributesInsertSql([{ personKey: 'attr-tekil-kisi' }])),
    ).rejects.toThrow(/player_attributes_pkey/);
  });

  it('aynı oyuncuya İKİNCİ bir GİZLİ nitelik satırı da yazılamıyor', async () => {
    await seedPlayer('attr-htekil', 'A51');
    await executor.run(playerHiddenAttributesInsertSql([{ personKey: 'attr-htekil-kisi' }]));

    await expect(
      executor.run(playerHiddenAttributesInsertSql([{ personKey: 'attr-htekil-kisi' }])),
    ).rejects.toThrow(/player_hidden_attributes_pkey/);
  });

  /**
   * ⚠️ **FK KURALI ÖNCE KOŞTURULDU, SONRA ÖLÇÜLDÜ** (4.4'ün yöntemi, günlük #11).
   * `fk-policy.js` derlenmiş hâliyle çağrıldı: kaynak `satellite` (`key` yok +
   * giden FK var), hedef sözlük değil, sütun `NOT NULL` (PK) → kural ④
   * **CASCADE**. `drizzle-kit` çıktısı da `ON DELETE cascade` dedi → 2/2.
   *
   * Ama *"kuralın katalogla uyuşması, veritabanının öyle DAVRANDIĞINI
   * göstermez"* — davranış burada gerçek PG 18.6'ya karşı ölçülüyor.
   */
  it('CASCADE: oyuncu silinince nitelikleri de gidiyor — İKİ tablo birden', async () => {
    await seedPlayer('attr-casc', 'A52');
    await executor.run(playerAttributesInsertSql([{ personKey: 'attr-casc-kisi' }]));
    await executor.run(playerHiddenAttributesInsertSql([{ personKey: 'attr-casc-kisi' }]));

    // Bağ gerçekten kuruldu mu — yoksa test hiçbir şey ölçmez (D3).
    const before = await executor.rows<{ visible: number | string; hidden: number | string }>(`
      SELECT
        (SELECT count(*)::int FROM "player_attributes") AS visible,
        (SELECT count(*)::int FROM "player_hidden_attributes") AS hidden
    `);
    expect(Number(before[0]?.visible)).toBeGreaterThanOrEqual(1);
    expect(Number(before[0]?.hidden)).toBeGreaterThanOrEqual(1);

    await executor.run(`
      DELETE FROM "players"
       WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 'attr-casc-kisi')
    `);

    const after = await executor.rows<{ visible: number | string; hidden: number | string }>(`
      SELECT
        (SELECT count(*)::int FROM "player_attributes" pa
          JOIN "players" p ON p."id" = pa."player_id"
          JOIN "people" pe ON pe."id" = p."person_id"
         WHERE pe."key" = 'attr-casc-kisi') AS visible,
        (SELECT count(*)::int FROM "player_hidden_attributes" ph
          JOIN "players" p ON p."id" = ph."player_id"
          JOIN "people" pe ON pe."id" = p."person_id"
         WHERE pe."key" = 'attr-casc-kisi') AS hidden
    `);
    expect(Number(after[0]?.visible)).toBe(0);
    expect(Number(after[0]?.hidden)).toBe(0);
  });

  /**
   * ⚠️ **1:1 DEĞİL 1:0..1 — ve bu ayrım ayrıca iddia ediliyor.**
   *
   * PK/FK olmak *"her oyuncunun bir nitelik satırı var"* demek **değil**,
   * *"en fazla bir satırı var"* demek. Niteliksiz bir oyuncu bugün geçerli ve
   * olmak zorunda: 4.9'un seed'i önce `players`, sonra nitelikleri yazacak.
   * Bir gün bu boşluğun kapatılması istenirse (Faz 11 doğrulayıcısı) bu test
   * kırılır ve kararı görünür kılar.
   */
  it('NİTELİKSİZ bir oyuncu geçerli — ilişki 1:0..1', async () => {
    await seedPlayer('attr-bos', 'A53');
    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "players" p
       WHERE p."person_id" = (SELECT "id" FROM "people" WHERE "key" = 'attr-bos-kisi')
         AND NOT EXISTS (SELECT 1 FROM "player_attributes" pa WHERE pa."player_id" = p."id")
    `);
    expect(Number(rows[0]?.n)).toBe(1);
  });
});

describe('FAZ 4.5 — `players` İLİŞKİ DEĞİŞMEZLERİ (kabul kriteri 5)', () => {
  async function seedPersonFor(slug: string, code: string): Promise<void> {
    await executor.run(countryInsertSql([{ key: `${slug}-ulke`, code }]));
    await executor.run(
      personInsertSql([{ key: `${slug}-kisi`, countryCode: code, personType: ['player'] }]),
    );
  }

  /**
   * ⚠️ **POZİTİF TESTLER KÖR BİR KONTROLLE DE GEÇER** (§11.5, ölçülmüş oran).
   * Bir CHECK'in *"var olduğunu"* `pg_constraint`ten okumak, onun **reddettiğini**
   * göstermez — kısıt `CHECK (true)` da olabilirdi. Reddi ölçen testler bunlar.
   */
  it('CA > PA REDDEDİLİYOR — mevcut yetenek potansiyeli aşamaz', async () => {
    await seedPersonFor('inv-capa', 'A54');
    await expect(
      executor.run(
        playerInsertSql([
          { personKey: 'inv-capa-kisi', clubKey: null, currentAbility: 190, potentialAbility: 120 },
        ]),
      ),
    ).rejects.toThrow(/players_ca_le_pa_check/);
  });

  it('pa_range_min > pa_range_max REDDEDİLİYOR — bant ters çevrilemez', async () => {
    await seedPersonFor('inv-band', 'A55');
    await expect(
      executor.run(
        playerInsertSql([
          { personKey: 'inv-band-kisi', clubKey: null, paRangeMin: 180, paRangeMax: 140 },
        ]),
      ),
    ).rejects.toThrow(/players_pa_range_check/);
  });

  /**
   * ⚠️ SINIR DEĞERİ — `<=` mi `<` mü? İkisi de bir CHECK üretir ve *"reddediyor"*
   * testi ikisinde de geçer. `CA = PA` (potansiyeline ulaşmış oyuncu) ve
   * `min = max` (belirsizliği sıfır) **geçerli** durumlar; `<` yazılsaydı
   * ikisi de reddedilir ve hata ancak Faz 9 ingest'inde görülürdü.
   */
  it('KARŞI ÖRNEK: CA = PA ve min = max KABUL EDİLİYOR — sınır dahil', async () => {
    await seedPersonFor('inv-esit', 'A56');
    await executor.run(
      playerInsertSql([
        {
          personKey: 'inv-esit-kisi',
          clubKey: null,
          currentAbility: 150,
          potentialAbility: 150,
          paRangeMin: 150,
          paRangeMax: 150,
        },
      ]),
    );

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "players"
       WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 'inv-esit-kisi')
    `);
    expect(Number(rows[0]?.n)).toBe(1);
  });

  it('İKİ AYRI KISIT — hangi değişmezin ihlal edildiği ADIYLA okunuyor', async () => {
    const rows = await executor.rows<{ conname: string }>(`
      SELECT conname FROM pg_constraint
       WHERE contype = 'c' AND conrelid = '"players"'::regclass
       ORDER BY conname
    `);
    // Birleşik tek bir CHECK yazılsaydı bu liste iki elemanlı olmazdı ve hata
    // mesajı hangi değişmezin ihlal edildiğini söylemezdi.
    expect(rows.map((row) => row.conname)).toEqual([
      'players_ca_le_pa_check',
      'players_pa_range_check',
      'players_primary_position_check',
    ]);
  });

  /**
   * ⚠️ **NİTELİK ARALIKLARI `players`TA DA CHECK ALMIYOR** — SAPMA-028'in
   * ikinci yüzü. Aynı tabloda iki grup var ve ayraç onları **farklı taraflara**
   * koyuyor: `current_ability` (1-200) bir kalibrasyon, `CA <= PA` bir tanım.
   * Bu test kalibrasyon tarafının kısıtsız kaldığını sabitliyor.
   */
  it('CA/PA/boy/kilo/ayak ARALIKLARI kısıtsız — 250 CA kabul ediliyor', async () => {
    await seedPersonFor('inv-aralik', 'A57');
    await executor.run(
      playerInsertSql([
        {
          personKey: 'inv-aralik-kisi',
          clubKey: null,
          currentAbility: 250,
          potentialAbility: 250,
          paRangeMin: 250,
          paRangeMax: 250,
          preferredFootRight: 99,
        },
      ]),
    );

    const rows = await executor.rows<{ ca: number | string }>(`
      SELECT "current_ability"::int AS ca FROM "players"
       WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 'inv-aralik-kisi')
    `);
    expect(Number(rows[0]?.ca)).toBe(250);
  });
});

describe('FAZ 4.5 — `person_type` kümesi `referee` TAŞIYOR (G-18 kapandı)', () => {
  it('`referee` taşıyan bir kişi KABUL EDİLİYOR', async () => {
    await executor.run(countryInsertSql([{ key: 'refok-ulke', code: 'RK1' }]));
    await executor.run(
      personInsertSql([{ key: 'refok-kisi', countryCode: 'RK1', personType: ['referee'] }]),
    );

    const rows = await executor.rows<{ types: string[] }>(`
      SELECT "person_type" AS types FROM "people" WHERE "key" = 'refok-kisi'
    `);
    expect(rows[0]?.types).toEqual(['referee']);
  });

  it('ÇOK ROLLÜ dizi de kabul ediliyor — hakem aynı zamanda personel olabilir', async () => {
    await executor.run(countryInsertSql([{ key: 'refcok-ulke', code: 'RK2' }]));
    await executor.run(
      personInsertSql([
        { key: 'refcok-kisi', countryCode: 'RK2', personType: ['referee', 'staff'] },
      ]),
    );

    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "people"
       WHERE "key" = 'refcok-kisi' AND 'referee' = ANY("person_type")
    `);
    expect(Number(rows[0]?.n)).toBe(1);
  });

  /**
   * ⚠️ KÜME **BEŞ** DEĞER TAŞIYOR VE ALTINCI HÂLÂ REDDEDİLİYOR.
   *
   * Bir kümeye değer eklemenin sessiz riski, kısıtın **genişlemesi** değil
   * **kaybolması**: `<@` kaldırılsaydı her değer geçerdi ve *"'referee' artık
   * kabul ediliyor"* testi yine geçerdi. Bu test kapalılığın korunduğunu
   * ölçüyor — `people_person_type_check`in iki yarısı da yerinde.
   */
  it('kapalılık KORUNDU — `coach` hâlâ REDDEDİLİYOR', async () => {
    await executor.run(countryInsertSql([{ key: 'refkapali-ulke', code: 'RK3' }]));
    await expect(
      executor.run(
        personInsertSql([
          { key: 'refkapali-kisi', countryCode: 'RK3', personType: ['referee', 'coach'] },
        ]),
      ),
    ).rejects.toThrow(/people_person_type_check/);
  });

  it('BOŞ dizi hâlâ REDDEDİLİYOR — `cardinality` yarısı da yerinde', async () => {
    await executor.run(countryInsertSql([{ key: 'refbos-ulke', code: 'RK4' }]));
    await expect(
      executor.run(personInsertSql([{ key: 'refbos-kisi', countryCode: 'RK4', personType: [] }])),
    ).rejects.toThrow(/people_person_type_check/);
  });

  it('kısıt tanımı BEŞ değeri de taşıyor — sabitle ayrışmıyor', async () => {
    const definition = await constraintDefinition('people_person_type_check');
    for (const value of PERSON_TYPES) {
      expect(definition).toContain(`'${value}'`);
    }
    expect(definition).toContain("'referee'");
    expect(PERSON_TYPES).toHaveLength(5);
  });

  /**
   * ⚠️ **BU TESTİN VARLIK SEBEBİ BİR KONVANSİYONUN NÖBETÇİSİ OLMASI**
   * (SAPMA-033: bir kuralın kontrol eden adımı yoksa ateşlendiğinde hiçbir şey
   * olmaz).
   *
   * 4.4'te bu dosyadaki **her** hakem kişisi `person_type = ['player']`
   * taşıyordu — `personInsertSql`in varsayılanı, çünkü kümede hakem yoktu.
   * `0008`den sonra hakem kişileri `['referee']` yazıyor ama bu bir
   * **konvansiyon**: yeni bir hakem fixture'ı varsayılana düşerse hiçbir kapı
   * ötmez. Burada `referees ⋈ people` join'i onu koşan bir iddiaya çeviriyor.
   */
  it('HİÇBİR hakemin kişisi `player` TAŞIMIYOR — varsayılana düşen yok', async () => {
    await executor.run(countryInsertSql([{ key: 'refjoin-ulke', code: 'RK5' }]));
    await executor.run(
      personInsertSql([{ key: 'refjoin-kisi', countryCode: 'RK5', personType: ['referee'] }]),
    );
    await executor.run(
      refereeInsertSql([{ key: 'refjoin-hakem', countryCode: 'RK5', personKey: 'refjoin-kisi' }]),
    );

    const rows = await executor.rows<{ referee_key: string; types: string[] }>(`
      SELECT r."key" AS referee_key, p."person_type" AS types
        FROM "referees" r JOIN "people" p ON p."id" = r."person_id"
       ORDER BY r."key"
    `);

    // Dosyadaki TÜM hakemler taranıyor, yalnızca bu testin yazdığı değil —
    // bir envanter iddiası, bir örnek iddiası değil (4.4: "özetler körlenebilir").
    expect(rows.length).toBeGreaterThan(0);
    const wrong = rows.filter((row) => !row.types.includes('referee'));
    expect(wrong).toEqual([]);
  });
});

describe('FAZ 4.6 — 1:N DESENİ, İKİ CHECK VE ÜÇ FK DAVRANIŞI', () => {
  /**
   * ⚠️ **KODLAR VAR OLAN KÜMEYE KARŞI PROGRAMATİK DOĞRULANDI** — günlük #10.
   * Bu dosyadaki `code:` değerleri toplandı (45 kod) ve `P61…P66` ile kesişim
   * **boş** çıktı. Gözle seçilmiş bir *"herhalde bu boştur"* 4.3'te
   * `countries_code_unique` ile patlamıştı; testler aynı veritabanını
   * paylaşıyor ve `afterEach` temizliği yok.
   */
  async function seedPlayerFor(slug: string, code: string): Promise<void> {
    await executor.run(countryInsertSql([{ key: `${slug}-ulke`, code }]));
    await executor.run(
      personInsertSql([{ key: `${slug}-kisi`, countryCode: code, personType: ['player'] }]),
    );
    await executor.run(playerInsertSql([{ personKey: `${slug}-kisi`, clubKey: null }]));
  }

  const playerIdSql = (slug: string): string =>
    `(SELECT "id" FROM "players" WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = '${slug}-kisi'))`;

  /**
   * Her testin KENDİ yarışması — paylaşılan bir yarışmaya bağlanmak, `DELETE`
   * testlerini birbirine bağlardı (#13'ün aynı ailesi: silinen satıra bakan
   * FK'lar testler arasında da birikir).
   */
  async function seedCompetitionFor(slug: string, code: string): Promise<void> {
    await executor.run(`
      INSERT INTO "competitions"
        ("key","source","country_id","code","name_key","type","reputation","rules",
         "season_start_month","season_end_month")
      SELECT '${slug}-lig','procedural',"id",'${code}_LIG','competition.${code.toLowerCase()}.lig',
             'league',100,'{}'::jsonb,8,5
        FROM "countries" WHERE "code" = '${code}'
    `);
  }

  // ── 1:N — bileşik PK ────────────────────────────────────────────────────

  /**
   * ⚠️ **POZİTİF TARAF ÖNCE, VE O DA ZORUNLU.** Bir sonraki test tekrarın
   * reddedildiğini ölçüyor; tek başına yazılsaydı *"kısıt her şeyi reddediyor"*
   * durumundan ayırt edilemezdi. 1:N'in kendisi ancak **farklı** ikinci bir
   * satırın kabul edilmesiyle kanıtlanıyor.
   */
  it('AYNI oyuncuya FARKLI mevkiler yazılabiliyor — 1:N, 1:1 değil', async () => {
    await seedPlayerFor('p46-cok', 'P61');
    await executor.run(`
      INSERT INTO "player_positions" ("player_id","position","level")
      VALUES (${playerIdSql('p46-cok')}, 'MC', 'natural'),
             (${playerIdSql('p46-cok')}, 'DM', 'competent'),
             (${playerIdSql('p46-cok')}, 'AMC', 'awkward')
    `);
    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "player_positions"
       WHERE "player_id" = ${playerIdSql('p46-cok')}
    `);
    expect(Number(rows[0]?.n)).toBe(3);
  });

  it('NEGATİF — aynı (oyuncu, mevki) çifti İKİ KEZ yazılamıyor', async () => {
    await seedPlayerFor('p46-tekrar', 'P62');
    await executor.run(`
      INSERT INTO "player_positions" ("player_id","position","level")
      VALUES (${playerIdSql('p46-tekrar')}, 'ST', 'natural')
    `);
    await expect(
      executor.run(`
        INSERT INTO "player_positions" ("player_id","position","level")
        VALUES (${playerIdSql('p46-tekrar')}, 'ST', 'ineffectual')
      `),
    ).rejects.toThrow(/player_positions_player_id_position_pk/);
  });

  it('AYNI oyuncuya FARKLI özel yetenekler yazılabiliyor, AYNISI iki kez YAZILAMIYOR', async () => {
    await seedPlayerFor('p46-trait', 'P63');
    await executor.run(`
      INSERT INTO "player_traits" ("player_id","trait_code")
      VALUES (${playerIdSql('p46-trait')}, 'runs_with_ball_through_centre'),
             (${playerIdSql('p46-trait')}, 'attempts_overhead_kicks')
    `);
    await expect(
      executor.run(`
        INSERT INTO "player_traits" ("player_id","trait_code")
        VALUES (${playerIdSql('p46-trait')}, 'attempts_overhead_kicks')
      `),
    ).rejects.toThrow(/player_traits_player_id_trait_code_pk/);
  });

  // ── İki CHECK — reddi ÖLÇÜLÜYOR, varlığı değil ──────────────────────────

  /**
   * ⚠️ **POZİTİF TESTLER KÖR BİR KONTROLLE DE GEÇER** (§11.5). Bir CHECK'in
   * `pg_constraint`te *"var olduğunu"* okumak reddettiğini göstermez — kısıt
   * `CHECK (true)` da olabilirdi.
   */
  it('NEGATİF — kümede olmayan bir MEVKİ reddediliyor', async () => {
    await seedPlayerFor('p46-mevki', 'P64');
    await expect(
      executor.run(`
        INSERT INTO "player_positions" ("player_id","position","level")
        VALUES (${playerIdSql('p46-mevki')}, 'SW', 'natural')
      `),
    ).rejects.toThrow(/player_positions_position_check/);
  });

  it('NEGATİF — kümede olmayan bir YETKİNLİK DERECESİ reddediliyor', async () => {
    await seedPlayerFor('p46-seviye', 'P65');
    await expect(
      executor.run(`
        INSERT INTO "player_positions" ("player_id","position","level")
        VALUES (${playerIdSql('p46-seviye')}, 'GK', 'world_class')
      `),
    ).rejects.toThrow(/player_positions_level_check/);
  });

  /**
   * ⚠️ **CHECK'İN YOKLUĞU DA KOŞAN BİR İDDİA — ve iki yönlü.** Katalogda kısıt
   * olmadığını okumak *"kısıt eklemeyi unuttuk"* ile *"bilerek konmadı"*yı
   * ayırmaz; uydurma bir kodun **gerçekten kabul edildiğini** göstermek ayırır.
   * Gerekçe `src/schema/player-traits.ts` başlığında: küme `spec/02`'de
   * tanımlı değil, ROADMAP *"~30"* diyor — sayılabilir bir liste yok.
   */
  it('`trait_code` HİÇBİR CHECK taşımıyor — küme açık uçlu, denetimi Faz 11`de', async () => {
    const rows = await executor.rows<{ conname: string }>(`
      SELECT conname FROM pg_constraint
       WHERE contype = 'c' AND conrelid = '"player_traits"'::regclass
       ORDER BY conname
    `);
    expect(rows).toEqual([]);

    // Ve yokluk DAVRANIŞTA da görünüyor: hiçbir listede olmayan bir kod geçiyor.
    await seedPlayerFor('p46-serbest', 'P66');
    await executor.run(`
      INSERT INTO "player_traits" ("player_id","trait_code")
      VALUES (${playerIdSql('p46-serbest')}, 'bu_kod_hicbir_listede_yok')
    `);
    const stored = await executor.rows<{ trait_code: string }>(`
      SELECT "trait_code" FROM "player_traits"
       WHERE "player_id" = ${playerIdSql('p46-serbest')}
    `);
    expect(stored.map((row) => row.trait_code)).toEqual(['bu_kod_hicbir_listede_yok']);
  });

  /**
   * `player_stats_history`nin 22 sayacı da kısıtsız — `player_attributes`ın
   * 47 niteliğiyle aynı gerekçe (§3.1.2 ②: aralık bir kalibrasyon). Aykırı
   * değer denetimi (*"17 yaşında 40 maçlık kariyer"*) ROADMAP Faz 9'un veri
   * kalite raporunun işi, şemanın değil.
   */
  it('`player_stats_history` HİÇBİR CHECK taşımıyor — sayaçlar kısıtsız', async () => {
    const rows = await executor.rows<{ conname: string }>(`
      SELECT conname FROM pg_constraint
       WHERE contype = 'c' AND conrelid = '"player_stats_history"'::regclass
       ORDER BY conname
    `);
    expect(rows).toEqual([]);
  });

  // ── FK DAVRANIŞI — kural katalogla uyuşuyor, DAVRANIŞ ayrı bir soru ──────

  /**
   * ⚠️ **KURALIN KATALOGLA UYUŞMASI, VERİTABANININ ÖYLE DAVRANDIĞINI
   * GÖSTERMEZ.** Yukarıdaki envanter `confdeltype`'ı okuyor; bu test silmeyi
   * gerçekten yapıyor.
   *
   * ⚠️ **VE #13'ÜN KURALI UYGULANDI: bir `DELETE` testi, silinecek satıra bakan
   * BÜTÜN FK'ları hesaba katar.** Silinen oyuncuya bugün **beş** tablo bakıyor
   * (`player_attributes`, `player_hidden_attributes` ve 4.6'nın üçü) ve beşi de
   * CASCADE; test üçünü ölçüyor ama silmenin **tek sebepli** olması için
   * oyuncu izole (kendi ülkesi, kendi kişisi, kulüpsüz).
   */
  it('CASCADE — oyuncu silinince ÜÇ tablodaki satırları da gidiyor', async () => {
    await seedPlayerFor('p46-cascade', 'P67');
    await seedCompetitionFor('p46-cascade', 'P67');
    await executor.run(`
      INSERT INTO "player_positions" ("player_id","position","level")
      VALUES (${playerIdSql('p46-cascade')}, 'MC', 'natural')
    `);
    await executor.run(`
      INSERT INTO "player_traits" ("player_id","trait_code")
      VALUES (${playerIdSql('p46-cascade')}, 'plays_one_twos')
    `);
    await executor.run(
      playerStatsHistoryInsertSql([
        { personKey: 'p46-cascade-kisi', seasonYear: 2024, competitionKey: 'p46-cascade-lig' },
      ]),
    );

    const before = await executor.rows<{ pos: number; tra: number; sta: number }>(`
      SELECT (SELECT count(*)::int FROM "player_positions"
               WHERE "player_id" = ${playerIdSql('p46-cascade')}) AS pos,
             (SELECT count(*)::int FROM "player_traits"
               WHERE "player_id" = ${playerIdSql('p46-cascade')}) AS tra,
             (SELECT count(*)::int FROM "player_stats_history"
               WHERE "player_id" = ${playerIdSql('p46-cascade')}) AS sta
    `);
    expect(before[0]).toEqual({ pos: 1, tra: 1, sta: 1 });

    await executor.run(`DELETE FROM "people" WHERE "key" = 'p46-cascade-kisi'`);

    // ⚠️ Sayım oyuncuya DEĞİL, tabloların tamamına bakamaz: bu dosyadaki başka
    // testler de satır yazıyor ve `afterEach` temizliği yok. Silinen kişinin
    // anahtarı üzerinden sayılıyor — sıfır olması gereken şey tam olarak o.
    const after = await executor.rows<{ pos: number; tra: number; sta: number }>(`
      SELECT (SELECT count(*)::int FROM "player_positions" pp
               JOIN "players" pl ON pl."id" = pp."player_id"
               JOIN "people" pe ON pe."id" = pl."person_id"
              WHERE pe."key" = 'p46-cascade-kisi') AS pos,
             (SELECT count(*)::int FROM "player_traits" pt
               JOIN "players" pl ON pl."id" = pt."player_id"
               JOIN "people" pe ON pe."id" = pl."person_id"
              WHERE pe."key" = 'p46-cascade-kisi') AS tra,
             (SELECT count(*)::int FROM "player_stats_history" ps
               JOIN "players" pl ON pl."id" = ps."player_id"
               JOIN "people" pe ON pe."id" = pl."person_id"
              WHERE pe."key" = 'p46-cascade-kisi') AS sta
    `);
    // Kişi → oyuncu → üç uydu: iki kademeli CASCADE zinciri.
    expect(after[0]).toEqual({ pos: 0, tra: 0, sta: 0 });
  });

  /**
   * ⚠️ **`SET NULL`IN İKİ YÖNÜ: satır DURUYOR, sütun BOŞALIYOR.** Yalnızca
   * *"satır duruyor"* iddia edilseydi RESTRICT'ten ayırt edilemezdi; yalnızca
   * *"sütun null"* iddia edilseydi CASCADE'den. İkisi birlikte davranışı
   * tekilleştiriyor — `players.club_id` için 4.3'te verilen kararın aynısı.
   */
  it('SET NULL — kulüp silinince istatistik satırı DURUYOR, `club_id` BOŞALIYOR', async () => {
    await seedPlayerFor('p46-setnull', 'P68');
    await seedCompetitionFor('p46-setnull', 'P68');
    // ⚠️ Elle `INSERT` YAZILMIYOR — `clubs` 24 sütunlu ve `NOT NULL` listesi
    // fazlar boyunca büyüdü (günlük #28). Fixture tek yer.
    await executor.run(
      clubInsertSql([
        {
          key: 'p46-setnull-kulup',
          countryCode: 'P68',
          competitionKey: null,
          stadiumKey: null,
          isNational: false,
        },
      ]),
    );
    await executor.run(
      playerStatsHistoryInsertSql([
        {
          personKey: 'p46-setnull-kisi',
          seasonYear: 2022,
          competitionKey: 'p46-setnull-lig',
          clubKey: 'p46-setnull-kulup',
        },
      ]),
    );

    const before = await executor.rows<{ club_id: number | null }>(`
      SELECT "club_id" FROM "player_stats_history"
       WHERE "player_id" = ${playerIdSql('p46-setnull')}
    `);
    expect(before[0]?.club_id).not.toBeNull();

    await executor.run(`DELETE FROM "clubs" WHERE "key" = 'p46-setnull-kulup'`);

    const after = await executor.rows<{ club_id: number | null }>(`
      SELECT "club_id" FROM "player_stats_history"
       WHERE "player_id" = ${playerIdSql('p46-setnull')}
    `);
    expect(after).toHaveLength(1);
    expect(after[0]?.club_id).toBeNull();
  });

  /**
   * ⚠️ **BU TESTİN KONUSU SEZGİYE AYKIRI OLAN CEVAP.** `competitions` bağımsız
   * bir varlık ve refleks *"RESTRICT"* derdi; kural ② **kaynağın** sınıfına
   * bakıyor ve `player_stats_history` bir uydu → ④ CASCADE.
   *
   * ⚠️ #13: `competitions`a bakan diğer FK `clubs.competition_id` ve o
   * **RESTRICT** — silinecek yarışmanın kulübü olsaydı silme alakasız bir
   * sebeple reddedilir ve test ölçmek istediği şeyi hiç göremezdi (4.4'ün
   * `people_nationality_country_id` vakası). Bu yüzden yarışma bu teste özel.
   */
  it('CASCADE — yarışma silinince istatistik satırı da GİDİYOR', async () => {
    await seedPlayerFor('p46-comp', 'P69');
    await seedCompetitionFor('p46-comp', 'P69');
    await executor.run(
      playerStatsHistoryInsertSql([
        { personKey: 'p46-comp-kisi', seasonYear: 2021, competitionKey: 'p46-comp-lig' },
      ]),
    );

    const before = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "player_stats_history"
       WHERE "player_id" = ${playerIdSql('p46-comp')}
    `);
    expect(Number(before[0]?.n)).toBe(1);

    await executor.run(`DELETE FROM "competitions" WHERE "key" = 'p46-comp-lig'`);

    const after = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "player_stats_history"
       WHERE "player_id" = ${playerIdSql('p46-comp')}
    `);
    expect(Number(after[0]?.n)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAZ 4.7 — `staff` · `staff_attributes` · `managers` · `manager_attributes`
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ **ÜLKE KODLARI VAR OLAN KÜMEYE KARŞI PROGRAMATİK DOĞRULANDI (#10).**
 *
 * Bu dosyadaki testler **aynı veritabanını paylaşıyor** ve `afterEach`
 * temizliği yok. 4.3'te gözle seçilmiş bir *"herhalde bu boştur"* kodu
 * `countries_code_unique` ile patlamıştı. Bu tur ölçüldü: dosyada **100
 * benzersiz** kod kullanılıyor ve `S71`…`S79` aralığının dokuzunun da eşleşme
 * sayısı **0** (tüm `integration/` klasöründe de 0).
 */
describe('personel ve menajerler — Faz 4.7', () => {
  async function seedStaffFor(slug: string, code: string, role: string): Promise<void> {
    await executor.run(countryInsertSql([{ key: `${slug}-ulke`, code }]));
    await executor.run(
      personInsertSql([{ key: `${slug}-kisi`, countryCode: code, personType: ['staff'] }]),
    );
    await executor.run(staffInsertSql([{ personKey: `${slug}-kisi`, role, clubKey: null }]));
  }

  async function seedManagerFor(slug: string, code: string): Promise<void> {
    await executor.run(countryInsertSql([{ key: `${slug}-ulke`, code }]));
    await executor.run(
      personInsertSql([{ key: `${slug}-kisi`, countryCode: code, personType: ['manager'] }]),
    );
    await executor.run(managerInsertSql([{ personKey: `${slug}-kisi`, clubKey: null }]));
  }

  const staffIdSql = (slug: string, role: string): string =>
    `(SELECT "id" FROM "staff" WHERE "role" = '${role}' AND "person_id" = (SELECT "id" FROM "people" WHERE "key" = '${slug}-kisi'))`;

  // ── `person_id` UNIQUE DEĞİL — pozitif taraf ─────────────────────────────

  /**
   * ⚠️ **POZİTİF TARAF ZORUNLU.** `players.person_id` UNIQUE, `staff.person_id`
   * değil — ve bu fark yalnızca **aynı kişiye ikinci bir satır yazılabildiği**
   * gösterilerek kanıtlanıyor. Katalogda *"unique kısıt yok"* okumak yetmez:
   * bir gün UNIQUE eklenirse bu test öter, katalog okuması ötmeyebilirdi.
   */
  it('AYNI kişiye FARKLI personel rolleri yazılabiliyor — `person_id` UNIQUE DEĞİL', async () => {
    await seedStaffFor('s47-cok', 'S71', 'fitness_coach');
    await executor.run(
      staffInsertSql([
        { personKey: 's47-cok-kisi', role: 'scout', clubKey: null },
        { personKey: 's47-cok-kisi', role: 'physio', clubKey: null },
      ]),
    );
    const rows = await executor.rows<{ n: number | string }>(`
      SELECT count(*)::int AS n FROM "staff"
       WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-cok-kisi')
    `);
    expect(Number(rows[0]?.n)).toBe(3);
  });

  // ── ÜÇ CHECK — reddi ÖLÇÜLÜYOR, varlığı değil ───────────────────────────

  /**
   * ⚠️ **POZİTİF TESTLER KÖR BİR KONTROLLE DE GEÇER** (§11.5). Bir CHECK'in
   * `pg_constraint`te *"var olduğunu"* okumak reddettiğini göstermez — kısıt
   * `CHECK (true)` da olabilirdi. Üç kapalı kümenin üçü de reddiyle sınanıyor.
   */
  it('NEGATİF — kümede olmayan bir ROL reddediliyor (13. değer)', async () => {
    await executor.run(countryInsertSql([{ key: 's47-rol-ulke', code: 'S72' }]));
    await executor.run(
      personInsertSql([{ key: 's47-rol-kisi', countryCode: 'S72', personType: ['staff'] }]),
    );
    await expect(
      executor.run(`
        INSERT INTO "staff" ("person_id","club_id","role")
        VALUES ((SELECT "id" FROM "people" WHERE "key" = 's47-rol-kisi'), NULL, 'head_of_vibes')
      `),
    ).rejects.toThrow(/staff_role_check/);
  });

  it('NEGATİF — kümede olmayan bir ANTRENÖRLÜK LİSANSI reddediliyor (6. değer)', async () => {
    await executor.run(countryInsertSql([{ key: 's47-rozet-ulke', code: 'S73' }]));
    await executor.run(
      personInsertSql([{ key: 's47-rozet-kisi', countryCode: 'S73', personType: ['manager'] }]),
    );
    await expect(
      executor.run(`
        INSERT INTO "managers"
          ("person_id","club_id","is_user_manager","coaching_badge","experience_level",
           "philosophy","reputation","experience_points","spoken_languages")
        VALUES ((SELECT "id" FROM "people" WHERE "key" = 's47-rozet-kisi'), NULL, false,
                'uefa_elite', 'professional', 'balanced', 100, 0, ARRAY['tr']::text[])
      `),
    ).rejects.toThrow(/managers_coaching_badge_check/);
  });

  it('NEGATİF — kümede olmayan bir DENEYİM SEVİYESİ reddediliyor', async () => {
    await executor.run(countryInsertSql([{ key: 's47-seviye-ulke', code: 'S74' }]));
    await executor.run(
      personInsertSql([{ key: 's47-seviye-kisi', countryCode: 'S74', personType: ['manager'] }]),
    );
    await expect(
      executor.run(`
        INSERT INTO "managers"
          ("person_id","club_id","is_user_manager","coaching_badge","experience_level",
           "philosophy","reputation","experience_points","spoken_languages")
        VALUES ((SELECT "id" FROM "people" WHERE "key" = 's47-seviye-kisi'), NULL, false,
                'pro', 'legendary', 'balanced', 100, 0, ARRAY['tr']::text[])
      `),
    ).rejects.toThrow(/managers_experience_level_check/);
  });

  /**
   * ⚠️ **KARŞI ÖRNEK — ÜÇ KÜMENİN DE GEÇERLİ DEĞERLERİ KABUL EDİLİYOR.**
   * Yalnızca ret ölçülseydi *"kısıt her şeyi reddediyor"* durumundan ayırt
   * edilemezdi (`players`ın `CA=PA` sınır testinin aynı biçimi).
   */
  it('KARŞI ÖRNEK — kümedeki değerler KABUL ediliyor', async () => {
    await seedStaffFor('s47-gecerli', 'S75', 'data_analyst');
    await seedManagerFor('s47-mgr-gecerli', 'S76');
    const rows = await executor.rows<{ role: string }>(`
      SELECT "role" FROM "staff"
       WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-gecerli-kisi')
    `);
    expect(rows.map((row) => row.role)).toEqual(['data_analyst']);
  });

  // ── CHECK YOKLUĞU — iki yönlü, `philosophy` ve nitelikler ────────────────

  /**
   * ⚠️ **YOKLUK DA KOŞAN BİR İDDİA — VE İKİ YÖNLÜ.** Katalogda kısıt olmadığını
   * okumak *"eklemeyi unuttuk"* ile *"bilerek konmadı"*yı ayırmaz; uydurma bir
   * değerin **gerçekten kabul edildiğini** göstermek ayırır.
   *
   * Gerekçe `src/schema/managers.ts` başlığında: `spec/01` felsefe kümesini
   * `...` ile bitiriyor, yani küme **sayılamıyor** — 4.6'nın `trait_code`
   * gerekçesinin aynısı.
   */
  it('`philosophy` HİÇBİR CHECK taşımıyor — küme `...` ile açık uçlu', async () => {
    const rows = await executor.rows<{ conname: string }>(`
      SELECT conname FROM pg_constraint
       WHERE contype = 'c' AND conrelid = '"managers"'::regclass
       ORDER BY conname
    `);
    // İKİ CHECK var ve ikisi de `philosophy` hakkında DEĞİL.
    expect(rows.map((row) => row.conname)).toEqual([
      'managers_coaching_badge_check',
      'managers_experience_level_check',
    ]);

    // Ve yokluk DAVRANIŞTA da görünüyor: hiçbir listede olmayan bir felsefe geçiyor.
    await executor.run(countryInsertSql([{ key: 's47-fel-ulke', code: 'S77' }]));
    await executor.run(
      personInsertSql([{ key: 's47-fel-kisi', countryCode: 'S77', personType: ['manager'] }]),
    );
    await executor.run(
      managerInsertSql([
        { personKey: 's47-fel-kisi', clubKey: null, philosophy: 'bu_felsefe_hicbir_listede_yok' },
      ]),
    );
    const stored = await executor.rows<{ philosophy: string }>(`
      SELECT "philosophy" FROM "managers"
       WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-fel-kisi')
    `);
    expect(stored.map((row) => row.philosophy)).toEqual(['bu_felsefe_hicbir_listede_yok']);
  });

  /**
   * SAPMA-028 — nitelik aralıkları (1-20) CHECK **ALMIYOR**; denetim Faz 11'in
   * (`pnpm validate:world`). 4.5'in 57 nitelik sütunu ve 3.6'nın altı hakem
   * niteliğiyle aynı sınıf. `managers.reputation` (0-200) da aynı gerekçeyle
   * kısıtsız — ama o `managers` tablosunda ve yukarıdaki testte ölçülüyor.
   */
  it('nitelik tablolarının HİÇBİRİ CHECK taşımıyor — aralık bir kalibrasyon', async () => {
    for (const table of ['staff_attributes', 'manager_attributes']) {
      const rows = await executor.rows<{ conname: string }>(`
        SELECT conname FROM pg_constraint
         WHERE contype = 'c' AND conrelid = '"${table}"'::regclass
         ORDER BY conname
      `);
      expect(rows).toEqual([]);
    }

    // Ve yokluk DAVRANIŞTA: aralık dışı bir değer kabul ediliyor.
    await seedStaffFor('s47-aralik', 'S78', 'gk_coach');
    await executor.run(
      staffAttributesInsertSql([{ personKey: 's47-aralik-kisi', role: 'gk_coach', override: 250 }]),
    );
    const stored = await executor.rows<{ attacking: number }>(`
      SELECT "attacking" FROM "staff_attributes"
       WHERE "staff_id" = ${staffIdSql('s47-aralik', 'gk_coach')}
    `);
    expect(stored[0]?.attacking).toBe(250);
  });

  // ── FK DAVRANIŞI — kural katalogla uyuşuyor, DAVRANIŞ ayrı bir soru ──────

  /**
   * ⚠️ **#13'ÜN KURALI UYGULANDI:** bir `DELETE` testi, silinecek satıra bakan
   * BÜTÜN FK'ları hesaba katar. Kişi izole (kendi ülkesi, kulüpsüz personel)
   * ki reddin/silmenin sebebi **tek** olsun.
   *
   * İki kademeli CASCADE: kişi → personel → nitelikler.
   */
  it('CASCADE — kişi silinince personeli VE niteliklerini de götürüyor', async () => {
    await seedStaffFor('s47-cascade', 'S79', 'youth_coach');
    await executor.run(
      staffAttributesInsertSql([{ personKey: 's47-cascade-kisi', role: 'youth_coach' }]),
    );

    const before = await executor.rows<{ st: number; at: number }>(`
      SELECT (SELECT count(*)::int FROM "staff"
               WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-cascade-kisi')) AS st,
             (SELECT count(*)::int FROM "staff_attributes"
               WHERE "staff_id" = ${staffIdSql('s47-cascade', 'youth_coach')}) AS at
    `);
    expect(before[0]).toEqual({ st: 1, at: 1 });

    await executor.run(`DELETE FROM "people" WHERE "key" = 's47-cascade-kisi'`);

    // ⚠️ Sayım anahtar üzerinden: dosyadaki başka testler de satır yazıyor.
    const after = await executor.rows<{ st: number; at: number }>(`
      SELECT (SELECT count(*)::int FROM "staff" s
               JOIN "people" p ON p."id" = s."person_id"
              WHERE p."key" = 's47-cascade-kisi') AS st,
             (SELECT count(*)::int FROM "staff_attributes" sa
               JOIN "staff" s ON s."id" = sa."staff_id"
               JOIN "people" p ON p."id" = s."person_id"
              WHERE p."key" = 's47-cascade-kisi') AS at
    `);
    expect(after[0]).toEqual({ st: 0, at: 0 });
  });

  /**
   * ⚠️ **`SET NULL`IN İKİ YÖNÜ: satır DURUYOR, sütun BOŞALIYOR.** Yalnızca
   * *"satır duruyor"* iddia edilseydi RESTRICT'ten, yalnızca *"sütun null"*
   * iddia edilseydi CASCADE'den ayırt edilemezdi.
   *
   * ⚠️ Ve bu davranış §3.1.0 kararının **görünen sonucu**: `staff` `key`
   * taşısaydı kural RESTRICT üretirdi ve bu silme **reddedilirdi**.
   */
  it('SET NULL — kulüp silinince personel ve menajer DURUYOR, `club_id` BOŞALIYOR', async () => {
    await executor.run(countryInsertSql([{ key: 's47-sn-ulke', code: 'S7A' }]));
    await executor.run(
      clubInsertSql([
        {
          key: 's47-sn-kulup',
          countryCode: 'S7A',
          competitionKey: null,
          stadiumKey: null,
          isNational: false,
        },
      ]),
    );
    await executor.run(
      personInsertSql([
        { key: 's47-sn-kisi', countryCode: 'S7A', personType: ['staff'] },
        { key: 's47-sn-mgr', countryCode: 'S7A', personType: ['manager'] },
      ]),
    );
    await executor.run(
      staffInsertSql([{ personKey: 's47-sn-kisi', role: 'physio', clubKey: 's47-sn-kulup' }]),
    );
    await executor.run(managerInsertSql([{ personKey: 's47-sn-mgr', clubKey: 's47-sn-kulup' }]));

    const before = await executor.rows<{ s: number | null; m: number | null }>(`
      SELECT (SELECT "club_id" FROM "staff"
               WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-sn-kisi')) AS s,
             (SELECT "club_id" FROM "managers"
               WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-sn-mgr')) AS m
    `);
    expect(before[0]?.s).not.toBeNull();
    expect(before[0]?.m).not.toBeNull();

    await executor.run(`DELETE FROM "clubs" WHERE "key" = 's47-sn-kulup'`);

    const after = await executor.rows<{
      s: number | null;
      m: number | null;
      sn: number;
      mn: number;
    }>(`
      SELECT (SELECT "club_id" FROM "staff"
               WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-sn-kisi')) AS s,
             (SELECT "club_id" FROM "managers"
               WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-sn-mgr')) AS m,
             (SELECT count(*)::int FROM "staff"
               WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-sn-kisi')) AS sn,
             (SELECT count(*)::int FROM "managers"
               WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = 's47-sn-mgr')) AS mn
    `);
    // Satırlar DURUYOR…
    expect(after[0]?.sn).toBe(1);
    expect(after[0]?.mn).toBe(1);
    // …ve sütunlar BOŞALDI.
    expect(after[0]?.s).toBeNull();
    expect(after[0]?.m).toBeNull();
  });
});
