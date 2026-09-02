/**
 * SEED'İN GERÇEK VERİTABANI KANITI — Faz 3.8, gerçek PostgreSQL 18 konteyneri.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * NEDEN BU DOSYA `packages/db/integration/` ALTINDA DEĞİL
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Oraya konsaydı test `@fms/data-cli`yi import etmek zorunda kalırdı ve
 * `packages/db` katmanının tek izinli bağı `@fms/shared`. **Ölçüldü**, tahmin
 * edilmedi: bir sonda dosyası konup `pnpm arch:check` koşuldu →
 *   `[layer-direction]` katman ihlali · `[undeclared-dependency]`
 * yani iki kural birden ötüyor. Bu yüzden `vitest.integration.config.ts` çok
 * projeli hâle getirildi ve test kendi paketinin altında duruyor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * *"İKİNCİ KOŞU PATLAMADI"* İDEMPOTENTLİK KANITI DEĞİLDİR
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `DO UPDATE` seçildiğine göre iddia şu: **seed bozuk bir satırı ONARIR.**
 * Aşağıdaki negatif test bunu iddia ediyor — satır kasten bozuluyor, seed
 * yeniden koşuyor, hem satır sayısının değişmediği hem değerin **onarıldığı**
 * okunuyor. Üçüncü adım olmadan test yalnızca *"patlamadı"* derdi ve bu, 3.2b'de
 * ölçülen kör karşılaştırıcı boşluğuyla aynı sınıf olurdu (on beş pozitif test
 * kör bir karşılaştırıcıyla da geçiyordu).
 */
import { fileURLToPath } from 'node:url';

import {
  ageRangeToBirthDateRange,
  createFileMigrationSource,
  createPostgresExecutor,
  migrateUp,
  type SqlExecutor,
} from '@fms/db';
import { createNoopLogger } from '@fms/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  competitionNameKey,
  countryNameKey,
  generatePlayerSeeds,
  SEED_COMPETITIONS,
  SEED_COUNTRIES,
  SEED_PLAYER_COUNT,
  SEED_PLAYER_KEY_PREFIX,
  SEED_REFERENCE_DATE,
  SEED_SOURCE,
  seedWorld,
} from '../src/seed/index.js';

const logger = createNoopLogger();

/**
 * Migration dosyaları `packages/db/drizzle` altında ve o dizin paketin
 * `exports` haritasında **yok** (yalnızca `dist/` yayınlanıyor). Göreli yol
 * bilinçli: paket düzeni değişirse test **gürültülü** kırılır, sessizce başka
 * bir dizini okumaz.
 */
const DRIZZLE_DIR = fileURLToPath(new URL('../../../packages/db/drizzle', import.meta.url));

/**
 * Bir koşudan diğerine BİREBİR aynı kalması gereken sütunlar. Denetim zaman
 * damgaları burada **yok** ve bu dışlama sessiz değil: aşağıda kendi testi var,
 * `created_at` sabitliği ve `updated_at` ilerlemesi ayrıca **okunup iddia**
 * ediliyor. 3.2b'nin sequence kararıyla aynı biçim — *tanım karşılaştırılır,
 * konum karşılaştırılmaz*, ama konum yine de raporlanır.
 */
const EXCLUDED_FROM_COMPARISON = ['created_at', 'updated_at'] as const;

interface CountryRow {
  readonly id: number;
  readonly key: string;
  readonly code: string;
  readonly name_key: string;
  readonly source: string;
  readonly external_ids: Record<string, unknown>;
  readonly confederation: string;
  readonly flag_asset_id: string | null;
  readonly football_level: number;
  readonly uefa_coefficient: string;
  readonly currency_code: string;
  readonly work_permit_rule_key: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface CompetitionRow {
  readonly id: number;
  readonly key: string;
  readonly country_id: number | null;
  readonly code: string;
  readonly name_key: string;
  readonly type: string;
  readonly tier: number | null;
  readonly reputation: number;
  readonly logo_asset_id: string | null;
  readonly rules: Record<string, unknown>;
  readonly season_start_month: number;
  readonly season_end_month: number;
  readonly created_at: Date;
  readonly updated_at: Date;
}

let container: StartedPostgreSqlContainer;
let close: () => Promise<void>;
let executor: SqlExecutor;

/**
 * 3.8'in iddialarını koşan çağrı — **oyuncu hattı olmadan**.
 *
 * ⚠️ 4.9'da eklendi ve bir **kapsam korumasıdır**, bir hızlandırma değil: bu
 * bloktaki testler ülke/yarışma hakkında ve 5.000 satırı her çağrıda yeniden
 * yazmak onların iddiasını değiştirmezdi ama süresini on katlardı. Oyuncu
 * hattının kendi bloğu aşağıda ve orada **varsayılan** küme koşuyor.
 */
const seedCore = async (): ReturnType<typeof seedWorld> =>
  seedWorld({ executor, logger, people: [], players: [] });

const readCountries = async (): Promise<readonly CountryRow[]> =>
  executor.rows<CountryRow>('SELECT * FROM "countries" ORDER BY "key"');

const readCompetitions = async (): Promise<readonly CompetitionRow[]> =>
  executor.rows<CompetitionRow>('SELECT * FROM "competitions" ORDER BY "key"');

const countOf = async (table: string): Promise<number> => {
  const rows = await executor.rows<{ n: string }>(`SELECT count(*)::text AS n FROM "${table}"`);
  return Number(rows[0]?.n);
};

/**
 * Karşılaştırmadan denetim zaman damgalarını çıkarır — dışlama TEK yerde.
 *
 * `delete` yerine filtreli yeniden kurma: `no-dynamic-delete` kuralı açık ve
 * haklı — dinamik `delete` nesnenin gizli sınıfını bozar ve tip sistemi
 * anahtarın var olduğunu doğrulayamaz.
 */
function withoutTimestamps(row: object): Record<string, unknown> {
  const excluded = new Set<string>(EXCLUDED_FROM_COMPARISON);
  return Object.fromEntries(Object.entries(row).filter(([field]) => !excluded.has(field)));
}

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
});

describe('kabul kriteri 2 — seed gerçek PostgreSQL 18`e yazıyor', () => {
  it('ilk koşu 6 ülke + 11 yarışma yazıyor', async () => {
    const result = await seedCore();

    // `RETURNING` — veritabanının bildirdiği, girdinin sayılmadığı rakam.
    expect(result.countryKeys).toHaveLength(6);
    expect(result.competitionKeys).toHaveLength(11);

    // Ve tablodan bağımsız olarak sayılıyor.
    expect(await countOf('countries')).toBe(6);
    expect(await countOf('competitions')).toBe(11);
  });

  it('6 lig + 5 kupa ayrımı veritabanında da geçerli', async () => {
    const rows = await readCompetitions();
    expect(rows.filter((row) => row.type === 'league')).toHaveLength(6);
    expect(rows.filter((row) => row.type === 'continental')).toHaveLength(3);
    expect(rows.filter((row) => row.type === 'domestic_cup')).toHaveLength(2);
  });

  it('yabancı anahtar ANAHTARLA çözüldü — doğru ülkeye bağlandı', async () => {
    const countries = await readCountries();
    const idToKey = new Map(countries.map((row) => [row.id, row.key]));
    const competitions = await readCompetitions();
    const seedByKey = new Map(SEED_COMPETITIONS.map((row) => [row.key, row]));

    for (const row of competitions) {
      const expectedKey = seedByKey.get(row.key)?.countryKey ?? null;
      const actualKey = row.country_id === null ? null : (idToKey.get(row.country_id) ?? null);
      expect(actualKey).toBe(expectedKey);
    }
  });

  it('üç kıta turnuvası `country_id` NULL, `tier` NULL ile yazıldı', async () => {
    const rows = (await readCompetitions()).filter((row) => row.type === 'continental');
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.country_id).toBeNull();
      expect(row.tier).toBeNull();
    }
  });

  it('K5 — tabloda görünen ad değil i18n ANAHTARI duruyor', async () => {
    for (const row of await readCountries()) {
      expect(row.name_key).toBe(countryNameKey(row.code));
    }
    for (const row of await readCompetitions()) {
      expect(row.name_key).toBe(competitionNameKey(row.code));
    }
    // Karşı örnek: Türkçe görünen ad tabloya HİÇ girmedi.
    const hits = await executor.rows<{ n: string }>(
      `SELECT count(*)::text AS n FROM "competitions" WHERE "name_key" LIKE '%Süper%'`,
    );
    expect(Number(hits[0]?.n)).toBe(0);
  });

  it('`rules` jsonb`i kayıpsız gidip geliyor — iç içe nesne ve diziler dahil', async () => {
    const rows = await readCompetitions();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    for (const seed of SEED_COMPETITIONS) {
      expect(byKey.get(seed.key)?.rules).toEqual(seed.rules);
    }

    // Boş dizi ve `null` alanlar da korunuyor — jsonb`in sessizce
    // normalleştirmediğini gösteren iki uç.
    expect(byKey.get('facup')?.rules).toMatchObject({
      transferWindows: [],
      squadRegistration: { maxSquadSize: null, maxForeign: null, homegrownMin: null },
      extraTimeSubstitution: true,
    });
    expect(byKey.get('superlig')?.rules).toMatchObject({
      playoffSpots: 0,
      extraTimeSubstitution: false,
    });
  });

  it('her satır `source` taşıyor ve CHECK kısıtından geçti', async () => {
    for (const row of await readCountries()) expect(row.source).toBe(SEED_SOURCE);
    const rows = await executor.rows<{ source: string }>('SELECT "source" FROM "competitions"');
    for (const row of rows) expect(row.source).toBe(SEED_SOURCE);
  });

  it('varlık kimlikleri NULL kaldı — K9, prosedürel yedek beklenen durum', async () => {
    for (const row of await readCountries()) expect(row.flag_asset_id).toBeNull();
    for (const row of await readCompetitions()) expect(row.logo_asset_id).toBeNull();
  });
});

describe('idempotentlik — "patlamadı" değil, ONARDI', () => {
  it('ikinci koşu satır sayısını DEĞİŞTİRMİYOR ve bozulan satırı ONARIYOR', async () => {
    const before = await countOf('countries');
    const original = (await readCountries()).find((row) => row.key === 'turkiye');
    expect(original).toBeDefined();

    // ── Satır KASTEN bozuluyor: iki farklı tipte alan birden.
    await executor.run(
      `UPDATE "countries"
          SET "uefa_coefficient" = 0,
              "football_level"   = 1,
              "confederation"    = 'BOZUK'
        WHERE "key" = 'turkiye'`,
    );
    const corrupted = (await readCountries()).find((row) => row.key === 'turkiye');
    expect(corrupted?.confederation).toBe('BOZUK');

    await seedCore();

    const repaired = (await readCountries()).find((row) => row.key === 'turkiye');
    expect(await countOf('countries')).toBe(before);
    expect(repaired?.confederation).toBe(original?.confederation);
    expect(repaired?.uefa_coefficient).toBe(original?.uefa_coefficient);
    expect(repaired?.football_level).toBe(original?.football_level);
  });

  it('`DO UPDATE` satırı YENİDEN YARATMIYOR — kimlikler sabit', async () => {
    // Kimlik değişseydi Faz 4`ün yabancı anahtarları her seed koşusunda kopardı.
    const idsBefore = (await readCountries()).map((row) => `${row.key}:${String(row.id)}`);
    await seedCore();
    expect((await readCountries()).map((row) => `${row.key}:${String(row.id)}`)).toEqual(idsBefore);
  });

  it('yarışma tarafı da idempotent — 11 satır sabit', async () => {
    await seedCore();
    await seedCore();
    expect(await countOf('competitions')).toBe(11);
  });
});

describe('K2 — determinizm, ve zaman damgalarının DIŞLANMASI sessiz değil', () => {
  it('iki koşu, zaman damgaları dışında BİREBİR aynı satırları bırakıyor', async () => {
    await seedCore();
    const countriesFirst = (await readCountries()).map(withoutTimestamps);
    const competitionsFirst = (await readCompetitions()).map(withoutTimestamps);

    await seedCore();

    expect((await readCountries()).map(withoutTimestamps)).toEqual(countriesFirst);
    expect((await readCompetitions()).map(withoutTimestamps)).toEqual(competitionsFirst);
  });

  it('dışlanan alanlar AÇIKÇA ikisi — liste büyürse bu test kırılır', () => {
    expect([...EXCLUDED_FROM_COMPARISON]).toEqual(['created_at', 'updated_at']);
  });

  it('`created_at` SABİT, `updated_at` İLERLİYOR — ölçülüp iddia ediliyor', async () => {
    const before = (await readCountries()).find((row) => row.key === 'turkiye');
    expect(before).toBeDefined();

    await seedCore();
    const after = (await readCountries()).find((row) => row.key === 'turkiye');

    // `created_at` DO UPDATE listesinde yok → satırın doğuş anı korunuyor.
    expect(after?.created_at.getTime()).toBe(before?.created_at.getTime());
    // `updated_at` açıkça `now()` alıyor → `defaultNow()` yalnızca INSERT`te
    // işlediği için bu satır olmasa damga BAYAT kalırdı.
    expect(after?.updated_at.getTime()).toBeGreaterThan(before?.updated_at.getTime() ?? 0);
  });
});

describe('KAPATILMAYAN DELİK, KOŞAN BİR TESTLE GÖRÜNÜR', () => {
  it('`ON CONFLICT (key)` `code` çakışmasını GÖRMÜYOR — 23505 ile ölüyor', async () => {
    // Delik bilerek kapatılmadı: `key`i yeni ama `code`u mevcut bir satır, seed
    // verisinin KENDİSİNİN yanlış olduğu anlamına gelir (anahtar yeniden
    // adlandırılmış, kod bırakılmış). O durumda gürültülü ölmek, sessizce yanlış
    // satırı güncellemekten iyidir. Test hatanın HANGİ kısıttan geldiğini
    // adıyla iddia ediyor — "bir şey patladı" yeterli bir kanıt değil.
    const failure = await seedWorld({
      executor,
      logger,
      people: [],
      players: [],
      countries: [
        {
          key: 'yeni-anahtar-ayni-kod',
          code: 'TUR', // `turkiye` satırı bu kodu zaten taşıyor.
          confederation: 'UEFA',
          footballLevel: 1,
          uefaCoefficient: '0.000',
          currencyCode: 'TRY',
          workPermitRuleKey: 'none',
          externalIds: {},
        },
      ],
      competitions: [],
    }).then(
      () => null,
      (error: unknown) => error as { code?: string; constraint_name?: string; message?: string },
    );

    expect(failure).not.toBeNull();
    expect(failure?.code).toBe('23505');
    expect(failure?.constraint_name).toBe('countries_code_unique');

    // Ve işlem geri alındı: yarım satır kalmadı.
    expect(await countOf('countries')).toBe(6);
  });
});

describe('KAPSAM SINIRI — 3.8 ne YAPMIYOR', () => {
  it('`clubs` BOŞ kaldı — kulüp verisi Faz 8`in işi', async () => {
    // 3.9 `EXPLAIN ANALYZE`ı hangi veriyle ölçeceğine karar verirken bunu
    // bilmek zorunda: `clubs_name_trgm_idx` bugün BOŞ bir tabloyu indeksliyor.
    expect(await countOf('clubs')).toBe(0);
  });

  it('`federations` BOŞ kaldı — kabul kriterinde yok (K12)', async () => {
    expect(await countOf('federations')).toBe(0);
  });

  it('seed YENİ MIGRATION yazmadı — zincir 12 adımda', async () => {
    const rows = await executor.rows<{ n: string }>(
      'SELECT count(*)::text AS n FROM "fms_meta"."migrations"',
    );
    // ⚠️ İDDİA HÂLÂ 3.8 HAKKINDA: *"seed bir migration YAZMADI"*. Sayı zincirin
    // bugünkü uzunluğu ve her yeni migration'da güncellenir — 4.3 `0005`i
    // ekledi (5 → 6), 4.4 `0006`yı ekledi (6 → 7), 4.5 **İKİ** migration ekledi
    // (`0007` + `0008`, 7 → 9), 4.6 `0009`u ekledi (9 → 10), 4.7 `0010`u
    // ekledi (10 → 11), 4.8 `0011`i ekledi (11 → 12). Kırılması istenen
    // davranış: seed bir gün sessizce migration yazarsa bu satır öter.
    expect(Number(rows[0]?.n)).toBe(12);
  });

  it('master tabloların hepsi hâlâ yerinde — 4.3`te 11 → 13, 4.5`te → 15, 4.6`da → 18, 4.7`de → 22', async () => {
    const rows = await executor.rows<{ n: string }>(
      `SELECT count(*)::text AS n FROM "information_schema"."tables"
        WHERE "table_schema" = 'public' AND "table_type" = 'BASE TABLE'`,
    );
    // ⚠️ **Faz 4'ün on bir master tablosu 4.7'de KAPANDI** — 11 (Faz 3) + 11.
    expect(Number(rows[0]?.n)).toBe(22);
  });

  it('seed edilen ülke sayısı, ROADMAP Faz 8`in ülke listesiyle aynı', () => {
    expect(SEED_COUNTRIES.map((row) => row.code).sort()).toEqual([
      'ENG',
      'ESP',
      'FRA',
      'GER',
      'ITA',
      'TUR',
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAZ 4.9 — 5.000 SAHTE OYUNCU. Kabul kriteri 1.
// ═══════════════════════════════════════════════════════════════════════════

/** Seed'den ÖNCE var olan bir kişi — çakışma kontrolünün karşı tarafı. */
const EXISTING_PERSON_KEY = 'oncedenvar-kisi-49';

const readSeedPeople = async (): Promise<readonly Record<string, unknown>[]> =>
  executor.rows(
    `SELECT * FROM "people" WHERE "key" LIKE '${SEED_PLAYER_KEY_PREFIX}%' ORDER BY "key"`,
  );

const readAllPlayers = async (): Promise<readonly Record<string, unknown>[]> =>
  executor.rows('SELECT * FROM "players" ORDER BY "person_id"');

const scalarText = async (sql: string): Promise<string> => {
  const rows = await executor.rows<{ v: string }>(sql);
  return rows[0]?.v ?? '';
};

describe('KABUL KRİTERİ 1 — 5.000 sahte oyuncu gerçek PostgreSQL 18`e yazıyor', () => {
  beforeAll(async () => {
    // ⚠️ ÇAKIŞMA KONTROLÜNÜN ÖN KOŞULU: var olan küme BOŞ OLMAMALI.
    // Boş bir kümeyle kesişim testi körlükten çıkarmaz — "hiçbiriyle
    // çakışmıyor" iddiası hiçbir şeyle çakışmayan bir kümeye karşı bedava
    // geçer. Bu satır o kümeyi doldurup iddiayı anlamlı kılıyor.
    await executor.run(`
      INSERT INTO "people"
        ("key","source","first_name","last_name","birth_date",
         "nationality_country_id","portrait_seed","gender","person_type")
      VALUES
        ('${EXISTING_PERSON_KEY}', 'procedural', 'Onceden', 'Vardi', '1990-01-01'::date,
         (SELECT "id" FROM "countries" WHERE "key" = 'turkiye'), 1, 'male',
         ARRAY['staff']::text[])
    `);
  }, 60_000);

  it('⚠️ ÇAKIŞMA PROGRAMATİK DENETLENDİ — 5.000 anahtar var olan kümeyle kesişmiyor', async () => {
    const existing = await executor.rows<{ key: string }>('SELECT "key" FROM "people"');
    const existingKeys = new Set(existing.map((row) => row.key));

    // Karşı kontrol: küme gerçekten DOLU (yoksa aşağıdaki iddia kör geçerdi).
    expect(existingKeys.size).toBeGreaterThan(0);
    expect(existingKeys.has(EXISTING_PERSON_KEY)).toBe(true);

    const generated = generatePlayerSeeds().people.map((row) => row.key);
    expect(generated).toHaveLength(SEED_PLAYER_COUNT);
    expect(generated.filter((key) => existingKeys.has(key))).toEqual([]);
  });

  it('ilk koşu 5.000 kişi + 5.000 oyuncu yazıyor — sayı VERİTABANINDAN', async () => {
    const result = await seedWorld({ executor, logger });

    // `RETURNING` — girdinin değil, veritabanının bildirdiği rakam.
    expect(result.peopleKeys).toHaveLength(SEED_PLAYER_COUNT);
    expect(result.playerPersonIds).toHaveLength(SEED_PLAYER_COUNT);

    // Ve tablodan bağımsız olarak sayılıyor. `people` 5.001: önceden var olan
    // kişi DURUYOR — seed onu silmedi, ezmedi.
    expect(await countOf('people')).toBe(SEED_PLAYER_COUNT + 1);
    expect(await countOf('players')).toBe(SEED_PLAYER_COUNT);
  });

  it('⚠️ 5.000`in 5.000`i SERBEST OYUNCU — `club_id` NULL, ve karşı kontrol 0', async () => {
    // `clubs` boş (yukarıda koşan bir testle iddia ediliyor) ve kulüp verisi
    // Faz 8'in işi. Bilinçli — ve bir gün kulüp seed'i gelirse bu satır öter.
    expect(
      await scalarText(`SELECT count(*)::text AS v FROM "players" WHERE "club_id" IS NULL`),
    ).toBe(String(SEED_PLAYER_COUNT));
    expect(
      await scalarText(`SELECT count(*)::text AS v FROM "players" WHERE "club_id" IS NOT NULL`),
    ).toBe('0');
  });

  it('`person_type` `{player}`, `gender` `male`, `source` `procedural` — 5.000/5.000', async () => {
    expect(
      await scalarText(
        `SELECT count(*)::text AS v FROM "people"
          WHERE "key" LIKE '${SEED_PLAYER_KEY_PREFIX}%'
            AND "person_type" = ARRAY['player']::text[]
            AND "gender" = 'male'
            AND "source" = '${SEED_SOURCE}'`,
      ),
    ).toBe(String(SEED_PLAYER_COUNT));
  });

  it('`squad_number` · `retired_at` · `common_name` · `birth_city` NULL — dördü de gerekçeli', async () => {
    expect(
      await scalarText(
        `SELECT count(*)::text AS v FROM "players"
          WHERE "squad_number" IS NULL AND "retired_at" IS NULL AND "is_newgen" = false`,
      ),
    ).toBe(String(SEED_PLAYER_COUNT));
    expect(
      await scalarText(
        `SELECT count(*)::text AS v FROM "people"
          WHERE "key" LIKE '${SEED_PLAYER_KEY_PREFIX}%'
            AND "common_name" IS NULL AND "birth_city" IS NULL
            AND "portrait_asset_id" IS NULL`,
      ),
    ).toBe(String(SEED_PLAYER_COUNT));
  });

  it('yabancı anahtarlar ANAHTARLA çözüldü — uyruk gerçekten bağlandı', async () => {
    // `nationality_country_id` NOT NULL, yani çözülemeyen bir anahtar INSERT'i
    // patlatırdı. İkinci uyruk NULLABLE — orada hata SESSİZ geçerdi, o yüzden
    // ayrıca sayılıyor.
    expect(
      await scalarText(
        `SELECT count(*)::text AS v FROM "people"
          WHERE "key" LIKE '${SEED_PLAYER_KEY_PREFIX}%' AND "nationality_country_id" IS NULL`,
      ),
    ).toBe('0');

    const withSecond = Number(
      await scalarText(
        `SELECT count(*)::text AS v FROM "people"
          WHERE "key" LIKE '${SEED_PLAYER_KEY_PREFIX}%'
            AND "second_nationality_country_id" IS NOT NULL`,
      ),
    );
    expect(withSecond).toBeGreaterThan(0);
    expect(withSecond).toBeLessThan(SEED_PLAYER_COUNT);

    // Ve ikisi hiçbir satırda AYNI ülke değil.
    expect(
      await scalarText(
        `SELECT count(*)::text AS v FROM "people"
          WHERE "nationality_country_id" = "second_nationality_country_id"`,
      ),
    ).toBe('0');
  });
});

describe('⚠️ 4.10`UN ZEMİNİ — kriter 3`ün sorgusu GERÇEK VERİDE sayıldı', () => {
  it('20–24 yaş + `DR` + CA>120 → 27 satır (SIFIR değil, tamamı da değil)', async () => {
    // Aralık, sorgunun KENDİ çevriminden geliyor: seed doğum tarihlerini de
    // aynı fonksiyondan üretti, yani iki taraf ayrışamaz.
    const range = ageRangeToBirthDateRange(20, 24, SEED_REFERENCE_DATE);
    const matched = Number(
      await scalarText(
        `SELECT count(*)::text AS v
           FROM "players" p JOIN "people" pe ON pe."id" = p."person_id"
          WHERE pe."birth_date" BETWEEN '${range.from}'::date AND '${range.to}'::date
            AND p."primary_position" = 'DR'
            AND p."current_ability" > 120`,
      ),
    );

    // ⚠️ SAYI ÖLÇÜLDÜ, TAHMİN EDİLMEDİ. Sıfır çıksaydı 4.10 boş bir sonuç
    // kümesini ölçerdi ve *"< 50 ms"* hiçbir şey kanıtlamazdı (3.9'un
    // `< 20 ms` vakası). %90 çıksaydı da ölçmezdi: ayraç hacim değil
    // SEÇİCİLİK. 27 / 5.000 = %0,54.
    expect(matched).toBe(27);
    expect(matched).toBeGreaterThan(0);
    expect(matched).toBeLessThan(SEED_PLAYER_COUNT / 100);
  });

  it('üç yüklemin her biri tek başına ANLAMLI — hiçbiri kümeyi tek başına vermiyor', async () => {
    const range = ageRangeToBirthDateRange(20, 24, SEED_REFERENCE_DATE);
    expect(
      await scalarText(`SELECT count(*)::text AS v FROM "players" WHERE "primary_position" = 'DR'`),
    ).toBe('389');
    expect(
      await scalarText(
        `SELECT count(*)::text AS v FROM "people"
          WHERE "key" LIKE '${SEED_PLAYER_KEY_PREFIX}%'
            AND "birth_date" BETWEEN '${range.from}'::date AND '${range.to}'::date`,
      ),
    ).toBe('1776');
    expect(
      await scalarText(`SELECT count(*)::text AS v FROM "players" WHERE "current_ability" > 120`),
    ).toBe('1106');
  });

  /**
   * ⚠️ **4.9'UN EN PAHALI ÖLÇÜMÜ — `reltuples` BİR YARIŞ, BİR DURUM DEĞİL.**
   *
   * Buraya önce *"`reltuples` = `-1`"* yazıldı (3.9'un `ANALYZE` dersinden
   * kopyalanarak) ve **testcontainers'ta geçti**. Sonra D5 aynı iddiayı gerçek
   * ve uzun ömürlü bir PostgreSQL'e karşı koşturdu ve **`5000` döndü**.
   * Mekanizma tahmin edilmedi, **ölçüldü** (ayrı bir sonda betiğiyle):
   *
   * | An | `reltuples` | `last_autoanalyze` | `last_analyze` |
   * |---|---|---|---|
   * | migration sonrası | `-1` | YOK | YOK |
   * | seed'den hemen sonra | `-1` | YOK | YOK |
   * | **+15 sn** | **`5000`** | **damgalandı** | YOK |
   * | +60 sn | `5000` | (aynı) | YOK |
   *
   * `autovacuum=on`, `autovacuum_naptime=60s`: 5.000 satırlık bir INSERT
   * autoanalyze eşiğini aşıyor ve istatistik **kimse `ANALYZE` çağırmadan**
   * doluyor. Yani `reltuples`ın değeri, ölçümün seed'den **kaç saniye sonra**
   * alındığına bağlı — testcontainers'ta test hızlı bittiği için `-1`, gerçek
   * bir kurulumda 15 saniye sonra `5000`.
   *
   * **Sonuç iki katmanlı:**
   * ① Buraya `-1` yazmak, zamana bağlı olarak kırılabilen bir iddia olurdu —
   *   ve *"bazen yeşil"* bir test, olmayan bir testten kötüdür.
   * ② **4.10 İÇİN DAHA ÖNEMLİ:** ROADMAP 4.10 *"`ANALYZE` şart
   *   (`reltuples != -1` denetlenir)"* diyor. Bu ölçüm o denetimin **tek
   *   başına yetmediğini** gösteriyor: `reltuples != -1` autoanalyze sayesinde
   *   `ANALYZE` hiç çağrılmadan da doğru olur, yani kontrol *"baktım"*
   *   demeden yeşil verebilir (D3'ün ölçüm tarafındaki biçimi). Not ROADMAP
   *   4.10 kapsamına yazıldı.
   *
   * Aşağıda iddia edilen şey **değişmez** olan: seed `ANALYZE` **çağırmıyor**.
   * `last_analyze` yalnızca elle çalıştırılan `ANALYZE` ile dolar ve
   * ölçümde +60 sn'de bile `NULL` kaldı.
   */
  it('⚠️ SEED `ANALYZE` ÇAĞIRMIYOR — plan iddiası 4.10`un işi (`reltuples` bir YARIŞ)', async () => {
    expect(
      await scalarText(
        `SELECT coalesce(last_analyze::text, 'YOK') AS v
           FROM pg_stat_all_tables WHERE relname = 'players'`,
      ),
    ).toBe('YOK');
    // Karşı kontrol: satır gerçekten var, yani "YOK" boş bir tablodan gelmiyor.
    expect(
      await scalarText(
        `SELECT coalesce(n_live_tup::text, '?') AS v
           FROM pg_stat_all_tables WHERE relname = 'players'`,
      ),
    ).toBe(String(SEED_PLAYER_COUNT));
  });
});

describe('K2 — 5.000 satırda determinizm, ve dışlama YİNE sessiz değil', () => {
  it('iki koşu, zaman damgaları dışında BİREBİR aynı 5.000 satırı bırakıyor', async () => {
    const peopleFirst = (await readSeedPeople()).map(withoutTimestamps);
    const playersFirst = (await readAllPlayers()).map(withoutTimestamps);
    expect(peopleFirst).toHaveLength(SEED_PLAYER_COUNT);
    expect(playersFirst).toHaveLength(SEED_PLAYER_COUNT);

    await seedWorld({ executor, logger });

    expect((await readSeedPeople()).map(withoutTimestamps)).toEqual(peopleFirst);
    expect((await readAllPlayers()).map(withoutTimestamps)).toEqual(playersFirst);
  });

  it('dışlama listesi AYNI liste — ikinci bir liste yazılmadı', () => {
    // ⚠️ İki liste bir gün ayrışır ve ayrıştıkları gün hiçbir şey ötmez.
    // `EXCLUDED_FROM_COMPARISON` 3.8'de yazıldı, 4.9 onu YENİDEN KULLANIYOR.
    expect([...EXCLUDED_FROM_COMPARISON]).toEqual(['created_at', 'updated_at']);
  });

  it('`created_at` SABİT, `updated_at` İLERLİYOR — `people` VE `players` için', async () => {
    // ⚠️ `defaultNow()` yalnızca INSERT'te işliyor. `DO UPDATE` listesine
    // `updated_at` konmasaydı damga BAYAT kalırdı — ve iki tablo için ayrı
    // ayrı sorulması gerekiyor, çünkü bağ listeleri ayrı.
    const personKey = `${SEED_PLAYER_KEY_PREFIX}00001`;
    const personCreatedSql = `SELECT "created_at"::text AS v FROM "people" WHERE "key" = '${personKey}'`;
    const playerCreatedSql = `SELECT "created_at"::text AS v FROM "players"
        WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = '${personKey}')`;

    const personCreatedBefore = await scalarText(personCreatedSql);
    const playerCreatedBefore = await scalarText(playerCreatedSql);
    // Karşı kontrol: okunan şey gerçekten bir damga (boş dizge karşılaştırması
    // her zaman geçerdi).
    expect(personCreatedBefore).toMatch(/^\d{4}-\d{2}-\d{2} /);
    expect(playerCreatedBefore).toMatch(/^\d{4}-\d{2}-\d{2} /);

    await seedWorld({ executor, logger });

    // `created_at` DO UPDATE listesinde yok → satırın doğuş anı korunuyor.
    expect(await scalarText(personCreatedSql)).toBe(personCreatedBefore);
    expect(await scalarText(playerCreatedSql)).toBe(playerCreatedBefore);

    // `updated_at` ikisinde de İLERLEDİ.
    expect(
      await scalarText(
        `SELECT (count(*) FILTER (WHERE "updated_at" > "created_at"))::text AS v
           FROM "people" WHERE "key" LIKE '${SEED_PLAYER_KEY_PREFIX}%'`,
      ),
    ).toBe(String(SEED_PLAYER_COUNT));
    expect(
      await scalarText(
        `SELECT (count(*) FILTER (WHERE "updated_at" > "created_at"))::text AS v FROM "players"`,
      ),
    ).toBe(String(SEED_PLAYER_COUNT));
  });

  it('idempotentlik — ikinci koşu satır sayısını değiştirmiyor ve bozulanı ONARIYOR', async () => {
    const personKey = `${SEED_PLAYER_KEY_PREFIX}00042`;
    const original = await scalarText(
      `SELECT "current_ability"::text AS v FROM "players"
        WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = '${personKey}')`,
    );

    // Satır KASTEN bozuluyor. `potential_ability` de yükseltiliyor ki
    // `players_ca_le_pa_check` bozma adımında patlamasın.
    await executor.run(
      `UPDATE "players" SET "current_ability" = 7, "potential_ability" = 199
        WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = '${personKey}')`,
    );

    await seedWorld({ executor, logger });

    expect(
      await scalarText(
        `SELECT "current_ability"::text AS v FROM "players"
          WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = '${personKey}')`,
      ),
    ).toBe(original);
    expect(await countOf('players')).toBe(SEED_PLAYER_COUNT);
    expect(await countOf('people')).toBe(SEED_PLAYER_COUNT + 1);
  });

  it('`DO UPDATE` satırı YENİDEN YARATMIYOR — `players.id` sabit', async () => {
    // Kimlik değişseydi Faz 12'nin save katmanı her seed koşusunda kopardı.
    const before = await executor.rows<{ id: number; person_id: number }>(
      'SELECT "id", "person_id" FROM "players" ORDER BY "person_id" LIMIT 50',
    );
    await seedWorld({ executor, logger });
    expect(
      await executor.rows<{ id: number; person_id: number }>(
        'SELECT "id", "person_id" FROM "players" ORDER BY "person_id" LIMIT 50',
      ),
    ).toEqual(before);
  });
});

describe('⚠️ `0007`NİN CHECK KISITLARI GERÇEKTEN ISIRIYOR — 5.000 satır kör bir kontrol olabilirdi', () => {
  it('NEGATİF: `CA > PA` olan TEK satır reddediliyor', async () => {
    // *"5.000 satır girdi, patlamadı"* tek başına hiçbir şey kanıtlamaz: kısıt
    // hiç ısırmıyorsa da geçerdi. Bu, o kontrolün karşı tarafı.
    const failure = await executor
      .run(
        `INSERT INTO "players"
           ("person_id","primary_position","height_cm","weight_kg","preferred_foot_right",
            "preferred_foot_left","current_ability","potential_ability","pa_range_min",
            "pa_range_max","is_newgen")
         VALUES
           ((SELECT "id" FROM "people" WHERE "key" = '${EXISTING_PERSON_KEY}'),
            'DR', 180, 75, 15, 5, 150, 100, 150, 160, false)`,
      )
      .then(
        () => null,
        (error: unknown) => error as { constraint_name?: string },
      );

    expect(failure).not.toBeNull();
    expect(failure?.constraint_name).toBe('players_ca_le_pa_check');
  });

  it('NEGATİF: `pa_range_min > pa_range_max` olan satır AYRI bir kısıttan reddediliyor', async () => {
    // İki AYRI kısıt (4.5'in kararı): hangi değişmezin ihlal edildiği hata
    // mesajından okunabilsin.
    const failure = await executor
      .run(
        `INSERT INTO "players"
           ("person_id","primary_position","height_cm","weight_kg","preferred_foot_right",
            "preferred_foot_left","current_ability","potential_ability","pa_range_min",
            "pa_range_max","is_newgen")
         VALUES
           ((SELECT "id" FROM "people" WHERE "key" = '${EXISTING_PERSON_KEY}'),
            'DR', 180, 75, 15, 5, 100, 150, 160, 150, false)`,
      )
      .then(
        () => null,
        (error: unknown) => error as { constraint_name?: string },
      );

    expect(failure?.constraint_name).toBe('players_pa_range_check');
  });

  it('KARŞI ÖRNEK: geçerli bir satır KABUL ediliyor — reddin sebebi kısıt, INSERT değil', async () => {
    await executor.run(
      `INSERT INTO "players"
         ("person_id","primary_position","height_cm","weight_kg","preferred_foot_right",
          "preferred_foot_left","current_ability","potential_ability","pa_range_min",
          "pa_range_max","is_newgen")
       VALUES
         ((SELECT "id" FROM "people" WHERE "key" = '${EXISTING_PERSON_KEY}'),
          'DR', 180, 75, 15, 5, 100, 150, 140, 160, false)`,
    );
    expect(await countOf('players')).toBe(SEED_PLAYER_COUNT + 1);

    // Ve temizleniyor — sonraki iddialar 5.000 üzerinden konuşuyor.
    await executor.run(
      `DELETE FROM "players"
        WHERE "person_id" = (SELECT "id" FROM "people" WHERE "key" = '${EXISTING_PERSON_KEY}')`,
    );
    expect(await countOf('players')).toBe(SEED_PLAYER_COUNT);
  });
});

describe('KAPSAM SINIRI — 4.9 ne YAPMIYOR', () => {
  /**
   * ⚠️ **Bu blok 3.8'in `KAPSAM SINIRI` bloğunun 4.9 karşılığı ve sessiz bir
   * atlamayı KOŞAN bir sınıra çeviriyor.** Nitelik tabloları bilerek boş: 47+10
   * sütuna değer yazmak bir **dağılım** kararıdır ve sahibi **Faz 10**. Bir gün
   * biri onları doldurmaya başlarsa bu testler öter.
   */
  it.each([
    'player_attributes',
    'player_hidden_attributes',
    'player_positions',
    'player_traits',
    'player_stats_history',
  ])('`%s` BOŞ kaldı — dağılımın sahibi Faz 10', async (table) => {
    expect(await countOf(table)).toBe(0);
  });

  it('personel ve menajer tabloları da BOŞ — 4.9 yalnızca OYUNCU yazıyor', async () => {
    for (const table of ['staff', 'staff_attributes', 'managers', 'manager_attributes']) {
      expect(await countOf(table)).toBe(0);
    }
  });

  it('⚠️ KARŞI KONTROL: `countOf` gerçekten sayıyor — boş dönen bir sayaç bu bloğu KÖR yapardı', async () => {
    expect(await countOf('players')).toBe(SEED_PLAYER_COUNT);
    expect(await countOf('countries')).toBe(6);
  });

  it('4.9 YENİ MIGRATION yazmadı — zincir HÂLÂ 12 adımda', async () => {
    // KARAR 6: seed bir veri işidir, şema işi değil. Bu satır kırılırsa kapsam
    // taşmış demektir.
    const rows = await executor.rows<{ n: string }>(
      'SELECT count(*)::text AS n FROM "fms_meta"."migrations"',
    );
    expect(Number(rows[0]?.n)).toBe(12);
  });

  it('master tablo sayısı HÂLÂ 22 — seed tablo eklemedi', async () => {
    const rows = await executor.rows<{ n: string }>(
      `SELECT count(*)::text AS n FROM "information_schema"."tables"
        WHERE "table_schema" = 'public' AND "table_type" = 'BASE TABLE'`,
    );
    expect(Number(rows[0]?.n)).toBe(22);
  });
});
